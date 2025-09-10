// src/components/ProductManagement.js
import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [networkStatus, setNetworkStatus] = useState('online');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subtitle: '',
    price: '',
    currency: 'VND',
    unit: 'each',
    quantity: '',
    barcode: ''
  });

  useEffect(() => {
    fetchProducts();
    
    // Add network status listeners
    const handleOnline = () => {
      setNetworkStatus('online');
      console.log('Network status: online');
      // Refresh data when coming back online
      fetchProducts(false);
    };
    
    const handleOffline = () => {
      setNetworkStatus('offline');
      console.log('Network status: offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchProducts = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    setError('');
    
    try {
      const result = await productService.getAllProducts();
      if (result.success) {
        setProducts(result.data);
        console.log(`Fetched ${result.data.length} products`);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to fetch products');
      setNetworkStatus('error');
      console.error('Fetch products error:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    console.log('Form submit started', { editingProduct, formData });

    // Validate required fields
    if (!formData.name || !formData.subtitle || !formData.price || !formData.quantity) {
      setError('Please fill in all required fields');
      return;
    }

    // Prepare data for API
    const productData = {
      name: formData.name.trim(),
      subtitle: formData.subtitle.trim(),
      price: parseFloat(formData.price),
      currency: formData.currency,
      unit: formData.unit,
      quantity: parseInt(formData.quantity),
      barcode: formData.barcode?.trim() || null
    };

    console.log('Product data prepared', productData);

    let result;
    if (editingProduct) {
      // Optimistic update for edit
      const updatedProduct = { ...editingProduct, ...productData };
      const originalProducts = [...products];
      setProducts(products.map(p => p.id === editingProduct.id ? updatedProduct : p));
      
      console.log('Updating product ID:', editingProduct.id);
      result = await productService.updateProduct(editingProduct.id, productData);
      
      if (!result.success) {
        // Revert on error
        setProducts(originalProducts);
      }
    } else {
      // Create new product
      console.log('Creating new product');
      result = await productService.createProduct(productData);
      
      if (result.success) {
        // Add new product to list immediately
        setProducts(prev => [...prev, result.data]);
      }
    }

    console.log('API result:', result);

    if (result.success) {
      const action = editingProduct ? 'updated' : 'created';
      setSuccess(`Product ${action} successfully!`);
      resetForm();
      
      // Light refresh to ensure consistency (no loading spinner)
      setTimeout(() => fetchProducts(false), 500);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError(result.error);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      subtitle: product.subtitle,
      price: product.price.toString(),
      currency: product.currency,
      unit: product.unit,
      quantity: product.quantity.toString(),
      barcode: product.barcode || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to delete "${productName}"?`)) {
      return;
    }

    setError('');
    setSuccess('');
    
    // Show loading state
    const originalProducts = [...products];
    // Optimistically remove from UI
    setProducts(products.filter(p => p.id !== productId));
    
    try {
      const result = await productService.deleteProduct(productId);
      if (result.success) {
        setSuccess(`Product "${productName}" deleted successfully!`);
        // Force refresh to ensure consistency
        await fetchProducts(false);
      } else {
        // Revert optimistic update on error
        setProducts(originalProducts);
        setError(result.error);
      }
    } catch (error) {
      // Revert optimistic update on error
      setProducts(originalProducts);
      setError('Failed to delete product');
      console.error('Delete error:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subtitle: '',
      price: '',
      currency: 'VND',
      unit: 'each',
      quantity: '',
      barcode: ''
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchTerm))
  );

  const exportToCSV = () => {
    const csvContent = [
      // Header row
      ['ID', 'Name', 'Subtitle', 'Price', 'Currency', 'Quantity', 'Unit', 'Barcode'].join(','),
      // Data rows
      ...products.map(product => [
        product.id,
        `"${product.name}"`,
        `"${product.subtitle}"`,
        product.price,
        product.currency,
        product.quantity,
        product.unit,
        product.barcode || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete all ${products.length} products? This action cannot be undone!`)) {
      return;
    }

    setError('');
    setSuccess('');
    
    let deleteCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
      const result = await productService.deleteProduct(product.id);
      if (result.success) {
        deleteCount++;
      } else {
        errorCount++;
      }
    }
    
    if (errorCount === 0) {
      setSuccess(`Successfully deleted all ${deleteCount} products`);
    } else {
      setError(`Deleted ${deleteCount} products, but ${errorCount} failed`);
    }
    
    fetchProducts(false); // Refresh the list without loading spinner
  };

  const createSampleProducts = async () => {
    const sampleProducts = [
      {
        name: "Coca Cola Classic",
        subtitle: "Refreshing cola drink - 330ml can",
        price: 15000,
        currency: "VND",
        unit: "each",
        quantity: 50,
        barcode: "8934673123456"
      },
      {
        name: "Oreo Cookies",
        subtitle: "Chocolate cream cookies - 274g pack",
        price: 35000,
        currency: "VND", 
        unit: "pack",
        quantity: 30,
        barcode: "8901030827266"
      },
      {
        name: "Lay's Potato Chips",
        subtitle: "Classic salted potato chips - 60g",
        price: 12000,
        currency: "VND",
        unit: "pack",
        quantity: 75,
        barcode: "8934563187456"
      }
    ];

    setError('');
    setSuccess('');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const product of sampleProducts) {
      const result = await productService.createProduct(product);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }
    
    if (errorCount === 0) {
      setSuccess(`Successfully created ${successCount} sample products`);
    } else {
      setError(`Created ${successCount} products, but ${errorCount} failed`);
    }
    
    fetchProducts(false); // Refresh the list without loading spinner
  };

  const formatPrice = (price, currency) => {
    // Thêm 3 chữ số 0 (nhân với 1000) để hiển thị
    const adjustedPrice = price * 1000;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: currency === 'VND' ? 'VND' : 'USD'
    }).format(adjustedPrice);
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="h3 mb-0">
              <i className="fas fa-box text-primary me-2"></i>
              Product Management
              {networkStatus === 'offline' && (
                <span className="badge bg-warning ms-2">
                  <i className="fas fa-wifi me-1"></i>
                  Offline
                </span>
              )}
              {networkStatus === 'error' && (
                <span className="badge bg-danger ms-2">
                  <i className="fas fa-exclamation-triangle me-1"></i>
                  Connection Error
                </span>
              )}
            </h2>
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(!showForm)}
              disabled={networkStatus === 'offline'}
            >
              <i className="fas fa-plus me-2"></i>
              {showForm ? 'Cancel' : 'Add Product'}
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {success && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              <i className="fas fa-check-circle me-2"></i>
              {success}
              <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
            </div>
          )}

          {/* Product Form */}
          {showForm && (
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="card-title mb-0">
                  <i className="fas fa-edit me-2"></i>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Product Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter product name"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">
                        Subtitle <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="subtitle"
                        value={formData.subtitle}
                        onChange={handleInputChange}
                        placeholder="Enter product subtitle"
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">
                        Price <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Currency</label>
                      <select
                        className="form-control"
                        name="currency"
                        value={formData.currency}
                        onChange={handleInputChange}
                      >
                        <option value="VND">VND</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">
                        Quantity <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Unit</label>
                      <input
                        type="text"
                        className="form-control"
                        name="unit"
                        value={formData.unit}
                        onChange={handleInputChange}
                        placeholder="e.g. each, kg, pack, liter, piece, gram, ml"
                        list="unit-suggestions"
                      />
                      <datalist id="unit-suggestions">
                        <option value="each">Each</option>
                        <option value="kg">Kilogram</option>
                        <option value="pack">Pack</option>
                        <option value="liter">Liter</option>
                        <option value="piece">Piece</option>
                        <option value="gram">Gram</option>
                        <option value="ml">Milliliter</option>
                        <option value="box">Box</option>
                        <option value="bottle">Bottle</option>
                        <option value="can">Can</option>
                      </datalist>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Barcode</label>
                      <input
                        type="text"
                        className="form-control"
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleInputChange}
                        placeholder="Enter barcode (optional)"
                      />
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-success">
                      <i className="fas fa-save me-2"></i>
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={resetForm}>
                      <i className="fas fa-times me-2"></i>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          {!loading && products.length > 0 && (
            <div className="row mb-4">
              <div className="col-md-3">
                <div className="card bg-primary text-white">
                  <div className="card-body text-center">
                    <h4>{products.length}</h4>
                    <small>Total Products</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-success text-white">
                  <div className="card-body text-center">
                    <h4>{products.filter(p => p.quantity > 10).length}</h4>
                    <small>In Stock (&gt;10)</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-warning text-white">
                  <div className="card-body text-center">
                    <h4>{products.filter(p => p.quantity > 0 && p.quantity <= 10).length}</h4>
                    <small>Low Stock (≤10)</small>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-danger text-white">
                  <div className="card-body text-center">
                    <h4>{products.filter(p => p.quantity === 0).length}</h4>
                    <small>Out of Stock</small>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="input-group">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search products by name, subtitle, or barcode..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6 text-end">
                  <div className="btn-group">
                    <button className="btn btn-outline-success" onClick={exportToCSV}>
                      <i className="fas fa-download me-2"></i>
                      Export CSV
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => fetchProducts(true)}>
                      <i className="fas fa-sync-alt me-2"></i>
                      Refresh
                    </button>
                    {products.length > 0 && (
                      <button 
                        className="btn btn-outline-danger" 
                        onClick={handleBulkDelete}
                        title="Delete all products"
                      >
                        <i className="fas fa-trash me-2"></i>
                        Clear All
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                Products List ({filteredProducts.length} items)
              </h5>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center p-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2">Loading products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center p-4">
                  <i className="fas fa-box-open fa-3x text-muted mb-3"></i>
                  <p className="text-muted mb-3">No products found</p>
                  {products.length === 0 && (
                    <button 
                      className="btn btn-primary"
                      onClick={createSampleProducts}
                    >
                      <i className="fas fa-magic me-2"></i>
                      Create Sample Products
                    </button>
                  )}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Subtitle</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Unit</th>
                        <th>Barcode</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td>
                            <span className="badge bg-primary">{product.id}</span>
                          </td>
                          <td>
                            <strong>{product.name}</strong>
                          </td>
                          <td>{product.subtitle}</td>
                          <td>
                            <span className="text-success fw-bold">
                              {formatPrice(product.price, product.currency)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${product.quantity > 10 ? 'bg-success' : product.quantity > 0 ? 'bg-warning' : 'bg-danger'}`}>
                              {product.quantity}
                            </span>
                          </td>
                          <td>{product.unit}</td>
                          <td>
                            {product.barcode ? (
                              <code className="small">{product.barcode}</code>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <div className="btn-group btn-group-sm">
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => handleEdit(product)}
                                title="Edit"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => handleDelete(product.id, product.name)}
                                title="Delete"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductManagement;
