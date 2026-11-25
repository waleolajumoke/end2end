# Tech365 Full-Stack DevSecOps Capstone

This starter project combines React, Node.js, PostgreSQL, Docker, Terraform, Amazon ECR, Amazon EKS, Jenkins, SonarQube Cloud, Trivy, Prometheus and Grafana.

## Local run

```bash
docker compose up --build
```

Open `http://localhost:3000` and test `http://localhost:5000/health`.

## Deployment order

1. Create an S3 backend and DynamoDB lock table for Terraform.
2. Copy `terraform/terraform.tfvars.example` to `terraform/terraform.tfvars`.
3. Run `terraform init`, `terraform validate`, `terraform plan`, and `terraform apply`.
4. Configure kubectl using the Terraform output command.
5. Install the AWS Load Balancer Controller and kube-prometheus-stack.
6. Configure SonarQube Cloud and Jenkins credentials: `database-url` and `jwt-secret`.
7. Replace the ECR registry placeholder in `Jenkinsfile`.
8. Create a Jenkins multibranch pipeline pointing to this repository.

Do not commit AWS keys, Terraform state, `terraform.tfvars`, Kubernetes production secrets, or `.env` files.

The network policy is an advanced exercise. Test and adjust it for the ingress controller and DNS design before applying it.
