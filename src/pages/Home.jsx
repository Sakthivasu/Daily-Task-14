import React, { useState, useEffect } from 'react';
import api from '../api';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [sort, setSort] = useState('newest');

  // Fetch categories on mount
  useEffect(() => {
    api.get('/categories')
      .then(res => setCategories(res.data))
      .catch(err => console.error("Error fetching categories:", err));
  }, []);

  // Fetch products when filters change (with debounce)
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      // Build query string dynamically to handle empty "All Categories" properly
      let url = `/products?search=${search}&sort=${sort}`;
      if (selectedCat) {
        url += `&category=${selectedCat}`;
      }

      api.get(url)
        .then(res => setProducts(res.data))
        .catch(err => console.error("Error fetching products:", err));
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, selectedCat, sort]);

  return (
    <div className="container">
      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)' }}>
        <input 
          type="text" 
          placeholder="Search product catalogue..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="form-control" 
          style={{ flex: 2, minWidth: '200px' }} 
        />
        
        <select 
          value={selectedCat} 
          onChange={e => setSelectedCat(e.target.value)} 
          className="form-control" 
          style={{ flex: 1, minWidth: '150px' }}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <select 
          value={sort} 
          onChange={e => setSort(e.target.value)} 
          className="form-control" 
          style={{ flex: 1, minWidth: '150px' }}
        >
          <option value="newest">Sort by: Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      {/* Products Display */}
      <h2 style={{ marginBottom: '1rem' }}>Our Products</h2>
      {products.length === 0 ? (
        <p style={{ color: '#64748b' }}>No catalog records matched your criteria.</p>
      ) : (
        <div className="product-grid">
          {products.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}