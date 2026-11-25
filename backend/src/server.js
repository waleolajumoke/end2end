import express from 'express';
import pg from 'pg';
import client from 'prom-client';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 5000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

client.collectDefaultMetrics();
const requests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

app.use(express.json());
app.use((req, res, next) => {
  res.on('finish', () => requests.inc({
    method: req.method,
    route: req.route?.path || req.path,
    status_code: String(res.statusCode)
  }));
  next();
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/api/products', async (_req, res, next) => {
  try {
    const result = await pool.query('SELECT id, name, price, created_at FROM products ORDER BY id');
    res.json(result.rows);
  } catch (error) { next(error); }
});

app.get('/api/products/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, price, created_at FROM products WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'product not found' });
    return res.json(result.rows[0]);
  } catch (error) { return next(error); }
});

app.post('/api/products', async (req, res, next) => {
  try {
    const { name, price } = req.body;
    const numericPrice = Number(price);
    if (!String(name || '').trim() || !Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: 'name and a non-negative numeric price are required' });
    }
    const result = await pool.query(
      'INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *',
      [String(name).trim(), numericPrice]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) { return next(error); }
});

app.put('/api/products/:id', async (req, res, next) => {
  try {
    const { name, price } = req.body;
    const numericPrice = Number(price);
    if (!String(name || '').trim() || !Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: 'name and a non-negative numeric price are required' });
    }
    const result = await pool.query(
      'UPDATE products SET name = $1, price = $2 WHERE id = $3 RETURNING *',
      [String(name).trim(), numericPrice, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'product not found' });
    return res.json(result.rows[0]);
  } catch (error) { return next(error); }
});

app.delete('/api/products/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'product not found' });
    return res.status(204).send();
  } catch (error) { return next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error.message);
  res.status(500).json({ error: 'internal server error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => console.log(`API listening on port ${port}`));
}

export { app, pool };
