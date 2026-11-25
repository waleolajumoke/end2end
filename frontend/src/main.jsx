import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('Loading products...');
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', price: '' });

  async function loadProducts() {
    const response = await fetch('/api/products');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load products');
    setProducts(data);
    setStatus('Connected to the DevSecOps API');
  }

  useEffect(() => {
    loadProducts().catch((err) => { setError(err.message); setStatus('API unavailable'); });
  }, []);

  function updateForm(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function saveProduct(event) {
    event.preventDefault();
    setError('');
    const endpoint = editingId ? `/api/products/${editingId}` : '/api/products';
    const method = editingId ? 'PUT' : 'POST';
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, price: Number(form.price) })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error || 'Unable to save product'); return; }
    setForm({ name: '', price: '' });
    setEditingId(null);
    await loadProducts();
  }

  async function deleteProduct(id) {
    if (!window.confirm('Delete this product?')) return;
    const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!response.ok) { setError('Unable to delete product'); return; }
    await loadProducts();
  }

  function editProduct(product) {
    setEditingId(product.id);
    setForm({ name: product.name, price: product.price });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return <main>
    <header><p className="eyebrow">TECH365 INNOVATION HUB</p><h1>Product Inventory CRUD</h1><p>{status}</p></header>
    <section>
      <h2>{editingId ? 'Edit product' : 'Add product'}</h2>
      <form onSubmit={saveProduct} className="product-form">
        <input name="name" required placeholder="Product name" value={form.name} onChange={updateForm} />
        <input name="price" required min="0" step="0.01" type="number" placeholder="Price" value={form.price} onChange={updateForm} />
        <button type="submit">{editingId ? 'Update' : 'Create'}</button>
        {editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm({ name: '', price: '' }); }}>Cancel</button>}
      </form>
      {error && <p className="error">{error}</p>}
    </section>
    <section><h2>Products</h2>{products.length === 0 ? <p>No products found.</p> : products.map((product) => <article key={product.id}><div><strong>{product.name}</strong><p>₦{Number(product.price).toLocaleString()}</p></div><div><button onClick={() => editProduct(product)}>Edit</button><button className="danger" onClick={() => deleteProduct(product.id)}>Delete</button></div></article>)}</section>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
