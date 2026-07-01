import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);

  const fetchItems = () => api.get('/products').then(res => setProducts(res.data));
  useEffect(() => { fetchItems(); }, []);

  const handlePurge = async (id) => {
    if (!window.confirm("Confirm deletion of this product?")) return;
    await api.delete(`/products/${id}`);
    fetchItems();
  };

  return (
    <div className="container" style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)', marginTop: '2rem' }}>
      {/* Dynamic Sub-Navigation Bar for Admins */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <Link to="/admin/products" style={{ fontWeight: 'bold', color: 'var(--primary)', textDecoration: 'none' }}>📦 Products Catalog</Link>
        <Link to="/admin/orders" style={{ fontWeight: '500', color: '#64748b', textDecoration: 'none' }}>📋 Customer Order Ledger</Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2>Product Inventory Catalog Control</h2>
        <Link to="/admin/products/add" className="btn btn-success">+ Add New Product</Link>
      </div>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <th>ID</th>
            <th>Item Preview</th>
            <th>Product Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td>{p.id}</td>
              
              {/* FIXED 1: Wrapped the image inside <td> tags */}
              {/* FIXED 2: Changed 'product' variables to 'p' to match the loop context */}
              <td>
                <img 
                  src={
                    p.image_url && p.image_url.startsWith('http') 
                      ? p.image_url 
                      : `http://localhost:5000${p.image_url || ''}`
                  } 
                  alt={p.name || 'Product'} 
                  style={{ 
                    width: '50px', 
                    height: '50px', 
                    objectFit: 'cover', 
                    borderRadius: '4px' 
                  }} 
                  onError={(e) => {
                    // Prevent infinite loops safely
                    e.target.onerror = null; 
                    e.target.src = 'https://picsum.photos/50'; 
                  }}
                />
              </td>

              {/* FIXED 3: Added the missing Product Name cell */}
              <td>{p.name}</td>
              
              <td>{p.category_name}</td>
              <td>${p.price}</td>
              <td style={{ color: p.stock === 0 ? 'var(--danger)' : 'inherit', fontWeight: p.stock === 0 ? 'bold' : 'normal' }}>
                {p.stock} units
              </td>
              <td>
                <Link to={`/admin/products/edit/${p.id}`} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem', marginRight: '0.5rem', background: '#475569' }}>Edit</Link>
                <button onClick={() => handlePurge(p.id)} className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}