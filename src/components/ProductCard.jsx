import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();

  // Helper utility to correctly handle legacy URLs vs local server uploads
  const resolveImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `http://localhost:5000${url}`;
  };

  const imageSrc = resolveImageUrl(product.image_url);

  return (
    <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: 'var(--card-shadow)', display: 'flex', flexDirection: 'column' }}>
      {imageSrc ? (
        <img 
          src={imageSrc} 
          alt={product.name} 
          style={{ width: '100%', height: '200px', objectFit: 'cover' }} 
        />
      ) : (
        <div style={{ width: '100%', height: '200px', background: '#f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
          <span>📦</span>
          <span style={{ fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: '500' }}>No image available</span>
        </div>
      )}
      <div style={{ padding: '1rem', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>{product.category_name}</span>
          <h4 style={{ margin: '0.25rem 0', fontSize: '1.1rem' }}>{product.name}</h4>
          <p style={{ color: '#475569', fontSize: '0.85rem', height: '40px', overflow: 'hidden' }}>{product.description}</p>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>${product.price}</div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to={`/products/${product.id}`} className="btn btn-primary" style={{ flexGrow: 1, background: '#64748b' }}>View</Link>
            {product.stock > 0 ? (
              <button onClick={() => addToCart(product, 1)} className="btn btn-success" style={{ flexGrow: 1 }}>+ Add</button>
            ) : (
              <button className="btn" style={{ background: '#cbd5e1', color: '#64748b', flexGrow: 1, cursor: 'not-allowed' }} disabled>Out of Stock</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}