import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import showToast  from '../../hooks/useToast'; 

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  
  // Tracking form inputs
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    price: '', 
    stock: '', 
    category_id: '', 
    image_url: '' 
  });
  
  // File Upload Target States
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Fetch categories on mount
    api.get('/categories')
      .then(res => {
        setCategories(res.data);
        if (res.data.length > 0 && !id) {
          setFormData(p => ({ ...p, category_id: res.data[0].id }));
        }
      })
      .catch(err => console.error("Error loading categories:", err));
    
    // Fetch existing product data if editing
    if (id) {
      api.get(`/products/${id}`)
        .then(res => {
          setFormData(res.data);
          if (res.data.image_url) {
            if (res.data.image_url.startsWith('http')) {
              setPreview(res.data.image_url);
            } else {
              setPreview(`http://localhost:5000${res.data.image_url}`);
            }
          }
        })
        .catch(err => console.error("Error loading product:", err));
    }
  }, [id]);

  // Handle instant browser preview creation
  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    let finalImageUrl = formData.image_url;
    let imageUploadedMessage = ""; 

    try {
      // Step 1: Upload image file to backend if selected
      if (file) {
        const uploadData = new FormData();
        uploadData.append('image', file);

        // FIXED: Removed the duplicate '/api' prefix path to fix the 404 error
        const uploadRes = await api.post('/upload', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        finalImageUrl = uploadRes.data.image_url;
        imageUploadedMessage = "Image file uploaded successfully & ";
      } else if (!finalImageUrl) {
        showToast("Please select a product image asset file first.", "error");
        setIsUploading(false);
        return;
      }

      // Step 2: Push core product payload parameters to database endpoint
      // FIXED: Removed all duplicate '/api' strings from the routes below
      const productPayload = { ...formData, image_url: finalImageUrl };

      if (id) {
        await api.put(`/products/${id}`, productPayload);
        showToast(`${imageUploadedMessage}product specifications modified successfully!`, "success");
      } else {
        await api.post('/products', productPayload);
        showToast(`${imageUploadedMessage}product catalog entry successfully initialized!`, "success");
      }
      
      // Smooth redirect window after notification shows
      setTimeout(() => {
        navigate('/admin/products');
      }, 2000);

    } catch (err) {
      console.error("Submission Failure:", err);
      // Grab direct backend server message if it exists
      const errorMessage = err.response?.data?.error || 'Error processing product file inventory payload sync.';
      showToast(errorMessage, "error");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '600px', background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: 'var(--card-shadow)' }}>
      <h2>{id ? 'Modify Product Specifications' : 'Catalog New Product Entry'}</h2>
      <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
        <div className="form-group">
          <label>Product Name</label>
          <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="form-control" required />
        </div>
        <div className="form-group">
          <label>Detailed Description</label>
          <textarea rows="3" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="form-control" required></textarea>
        </div>
        <div className="form-group">
          <label>Retail Price ($)</label>
          <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} className="form-control" required />
        </div>
        <div className="form-group">
          <label>Initial Inventory Stock Count</label>
          <input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: e.target.value })} className="form-control" required />
        </div>
        <div className="form-group">
          <label>Category Assignment</label>
          <select value={formData.category_id} onChange={e => setFormData({ ...formData, category_id: e.target.value })} className="form-control">
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        
        {/* MULTIPART FILE INPUT ATTACHMENT FIELD */}
        <div className="form-group" style={{ margin: '1.5rem 0' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Product Image File Upload</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            className="form-control" 
            required={!id} 
          />
          {preview ? (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.25rem 0' }}>Image Preview Ledger Reference:</p>
              <img src={preview} alt="Form Target Preview" style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          ) : (
            <div style={{ marginTop: '1rem', width: '150px', height: '150px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', color: '#64748b', fontSize: '0.85rem' }}>
              No image chosen
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-success" style={{ width: '100%', padding: '0.75rem', marginTop: '1rem' }} disabled={isUploading}>
          {isUploading ? 'Uploading & Saving Assets...' : 'Save Changes to Inventory Ledger'}
        </button>
      </form>
    </div>
  );
}