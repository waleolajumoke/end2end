pipeline {
  agent any
  options {
    timestamps(); disableConcurrentBuilds(); timeout(time: 45, unit: 'MINUTES')
  }
  environment {
    DATABASE_URL = credentials('database-url')
    JWT_SECRET = credentials('jwt-secret')
    AWS_REGION = 'us-east-1'
    EKS_CLUSTER = 'tech365-fullstack-devsecops'
    ECR_REGISTRY = '418272776333.dkr.ecr.us-east-1.amazonaws.com'
    FRONTEND_REPOSITORY = 'tech365-fullstack-devsecops/frontend'
    BACKEND_REPOSITORY = 'tech365-fullstack-devsecops/backend'
    KUBE_NAMESPACE = 'fullstack'
  }
  stages {
    stage('Checkout') {
      steps {
        checkout scm; script {
          env.TAG = sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim(); 
          env.FRONTEND_IMAGE = "${ECR_REGISTRY}/${FRONTEND_REPOSITORY}:${TAG}"; 
          env.BACKEND_IMAGE  = "${ECR_REGISTRY}/${BACKEND_REPOSITORY}:${TAG}"
          }
        }
      }
      stage('Tests') {
        steps {
          sh 'cd backend && npm install && npm test'; sh 'cd frontend && npm install && npm run build'
        }
      }
      stage('Trivy filesystem scan') {
        steps {
          sh 'trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --exit-code 1 .'
        }
      }
      stage('SonarQube Cloud') {
        steps {
          withSonarQubeEnv('sonar-cloud') {
            sh 'sonar-scanner'
          }
        }
      }
      stage('Quality gate') {
        steps {
          timeout(time: 10, unit: 'MINUTES') {
            waitForQualityGate abortPipeline: true
          }
        }
      }
      stage('Build images') {
        steps {
          sh 'docker build --pull -t "$FRONTEND_IMAGE" frontend && docker build --pull -t "$BACKEND_IMAGE" backend'
        }
      }
      stage('Trivy image scan') {
        steps {
          sh 'trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 "$FRONTEND_IMAGE" && trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 "$BACKEND_IMAGE"'
        }
      }
      stage('Push to ECR') {
        steps {
          sh 'aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY" && docker push "$FRONTEND_IMAGE" && docker push "$BACKEND_IMAGE"'
        }
      }
      stage('Deploy to EKS') {
        steps {
          withCredentials([string(credentialsId: 'database-url', variable: 'DATABASE_URL'), string(credentialsId: 'jwt-secret', variable: 'JWT_SECRET')]) {
            sh '''aws eks update-kubeconfig --region "$AWS_REGION" --name "$EKS_CLUSTER"; kubectl apply -f k8s/namespace.yaml; kubectl apply -f k8s/configmap.yaml; kubectl apply -f k8s/postgres.yaml; kubectl create secret generic backend-secrets -n "$KUBE_NAMESPACE" --from-literal=DATABASE_URL="$DATABASE_URL" --from-literal=JWT_SECRET="$JWT_SECRET" --dry-run=client -o yaml | kubectl apply -f -; sed "s|BACKEND_IMAGE|$BACKEND_IMAGE|g" k8s/backend-deployment.yaml | kubectl apply -f -; sed "s|FRONTEND_IMAGE|$FRONTEND_IMAGE|g" k8s/frontend-deployment.yaml | kubectl apply -f -; kubectl apply -f k8s/backend-service.yaml -f k8s/frontend-service.yaml -f k8s/ingress.yaml; kubectl rollout status deployment/postgres -n "$KUBE_NAMESPACE" --timeout=180s; kubectl rollout status deployment/backend -n "$KUBE_NAMESPACE" --timeout=180s; kubectl rollout status deployment/frontend -n "$KUBE_NAMESPACE" --timeout=180s'''
          }
        }
      }
      stage('Smoke test') {
        steps {
          sh 'kubectl run smoke-test --rm --restart=Never --image=curlimages/curl:8.10.1 -n "$KUBE_NAMESPACE" -- curl --fail http://backend-service:5000/health'
        }
      }
    }
    post {
      always {
        sh 'docker logout "$ECR_REGISTRY" || true; docker system prune -f || true'
      }
    }
  }