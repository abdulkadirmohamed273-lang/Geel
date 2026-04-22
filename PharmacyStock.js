import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

function PharmacyStock({ currentUser, db, setActiveView }) {
    const [stock, setStock] = useState([]);
    const [allStock, setAllStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeTab, setActiveTab] = useState('stock');
    const [doctors, setDoctors] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [consultations, setConsultations] = useState([]);
    const [visits, setVisits] = useState([]);
    const [patients, setPatients] = useState([]);
    const [viewingItem, setViewingItem] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    
    const [formData, setFormData] = useState({
        medication_name: '',
        generic_name: '',
        category: '',
        quantity: '',
        unit: 'units',
        unit_price: '',
        expiry_date: '',
        batch_number: '',
        supplier: '',
        reorder_level: '10',
        notes: '',
        image_url: ''
    });
    const [uploadingImage, setUploadingImage] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        loadStock();
    }, []);

    useEffect(() => {
        if (activeTab === 'doctors') {
            loadDoctorData();
        }
    }, [activeTab]);

    const loadDoctorData = async () => {
        try {
            console.log('Loading doctor and prescription data...');
            const [doctorsData, prescriptionsData, consultationsData, visitsData, patientsData] = await Promise.all([
                db.getAll('users'),
                db.getAll('prescriptions'),
                db.getAll('consultations'),
                db.getAll('visits'),
                db.getAll('patients')
            ]);

            console.log('Loaded prescriptions:', prescriptionsData?.length || 0);
            console.log('Prescriptions data:', prescriptionsData);

            // Filter only doctors
            const doctorsList = doctorsData.filter(u => u.role === 'doctor');
            setDoctors(doctorsList);
            setPrescriptions(prescriptionsData || []);
            setConsultations(consultationsData || []);
            setVisits(visitsData || []);
            setPatients(patientsData || []);
        } catch (err) {
            console.error('Error loading doctor data:', err);
        }
    };

    useEffect(() => {
        applyFilters(allStock);
    }, [searchTerm, filterCategory, filterStatus]);

    const loadStock = async () => {
        try {
            setLoading(true);
            const stockData = await db.getAll('pharmacy_stock');
            console.log('=== PHARMACY STOCK: Loading data ===');
            console.log('Stock items:', stockData?.length || 0);
            console.log('All stock data:', stockData);
            console.log('Items with images:', stockData?.filter(item => item.image_url).length || 0);
            stockData?.forEach(item => {
                if (item.image_url) {
                    console.log(`${item.medication_name} - Has image:`, item.image_url.substring(0, 50) + '...');
                }
            });
            setAllStock(stockData || []);
            applyFilters(stockData || []);
            console.log('After applyFilters - Displayed items:', stockData?.length || 0);
        } catch (err) {
            console.error('Error loading stock:', err);
            setAllStock([]);
            setStock([]);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = (data) => {
        let filtered = [...data];

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(item =>
                item.medication_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.generic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.batch_number?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Filter by category
        if (filterCategory !== 'all') {
            filtered = filtered.filter(item => item.category === filterCategory);
        }

        // Filter by status
        if (filterStatus !== 'all') {
            if (filterStatus === 'low_stock') {
                filtered = filtered.filter(item => 
                    item.quantity > 0 && item.quantity <= (item.reorder_level || 10)
                );
            } else {
                filtered = filtered.filter(item => {
                    if (filterStatus === 'out_of_stock') {
                        return item.quantity <= 0;
                    } else if (filterStatus === 'expired') {
                        return item.expiry_date && new Date(item.expiry_date) < new Date();
                    } else {
                        return item.status === filterStatus;
                    }
                });
            }
        }

        setStock(filtered);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size should be less than 5MB');
            return;
        }

        try {
            setUploadingImage(true);
            
            // Create preview first
            const previewReader = new FileReader();
            previewReader.onloadend = () => {
                setImagePreview(previewReader.result);
            };
            previewReader.readAsDataURL(file);

            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `pharmacy-stock/${fileName}`;

            // Try to upload to Supabase Storage first
            try {
                const { data, error } = await supabase.storage
                    .from('pharmacy-images')
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) {
                    console.warn('Storage upload failed, using base64 fallback:', error);
                    throw error; // Fall through to base64 method
                }

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('pharmacy-images')
                    .getPublicUrl(filePath);

                // Storage upload succeeded
                setFormData({
                    ...formData,
                    image_url: urlData.publicUrl
                });
                setUploadingImage(false);
            } catch (storageError) {
                // Fallback: Store image as base64 data URL
                console.log('Using base64 storage as fallback - no storage bucket setup required');
                const base64Reader = new FileReader();
                base64Reader.onload = (event) => {
                    const base64DataUrl = event.target.result;
                    setFormData({
                        ...formData,
                        image_url: base64DataUrl
                    });
                    setUploadingImage(false);
                };
                base64Reader.onerror = () => {
                    alert('Error reading image file. Please try again.');
                    setUploadingImage(false);
                    setImagePreview(null);
                    e.target.value = '';
                };
                base64Reader.readAsDataURL(file);
                // Note: Will set formData in onload callback above
                return; // Exit early, formData will be set in onload callback
            }
        } catch (err) {
            // This catch only handles unexpected errors (not storage errors, which are handled above)
            console.error('Unexpected error uploading image:', err);
            alert('Error uploading image: ' + (err.message || 'Unknown error') + '\n\n' +
                  'The system will try to save the image as base64 data.');
            // Try base64 fallback
            const fallbackReader = new FileReader();
            fallbackReader.onload = (event) => {
                setFormData({
                    ...formData,
                    image_url: event.target.result
                });
                setUploadingImage(false);
            };
            fallbackReader.onerror = () => {
                alert('Failed to process image. Please try a different image file.');
                setUploadingImage(false);
                setImagePreview(null);
                e.target.value = '';
            };
            fallbackReader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate required fields
        if (!formData.medication_name?.trim()) {
            alert('Please enter a medication name');
            return;
        }
        
        if (!formData.quantity || parseInt(formData.quantity) < 0) {
            alert('Please enter a valid quantity');
            return;
        }
        
        try {
            const stockData = {
                ...formData,
                quantity: parseInt(formData.quantity) || 0,
                unit_price: parseFloat(formData.unit_price) || 0,
                reorder_level: parseInt(formData.reorder_level) || 10,
                expiry_date: formData.expiry_date || null,
                created_by: currentUser.id
            };

            console.log('=== PHARMACY STOCK: Saving item ===');
            console.log('Data:', stockData);

            if (editingItem) {
                const updated = await db.update('pharmacy_stock', editingItem.id, stockData);
                console.log('Updated item:', updated);
                alert('Stock item updated successfully!');
            } else {
                const added = await db.add('pharmacy_stock', stockData);
                console.log('Added item:', added);
                alert('Stock item added successfully!');
            }

            resetForm();
            await loadStock(); // Make sure to await
            
            console.log('Stock reloaded successfully');
        } catch (err) {
            console.error('Error saving stock:', err);
            alert(`Error saving stock item: ${err.message || 'Please try again.'}`);
        }
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            medication_name: item.medication_name || '',
            generic_name: item.generic_name || '',
            category: item.category || '',
            quantity: item.quantity || '',
            unit: item.unit || 'units',
            unit_price: item.unit_price || '',
            expiry_date: item.expiry_date ? item.expiry_date.split('T')[0] : '',
            batch_number: item.batch_number || '',
            supplier: item.supplier || '',
            reorder_level: item.reorder_level || '10',
            notes: item.notes || '',
            image_url: item.image_url || ''
        });
        setImagePreview(item.image_url || null);
        setShowAddForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this stock item?')) {
            return;
        }

        try {
            await db.delete('pharmacy_stock', id);
            alert('Stock item deleted successfully!');
            loadStock();
        } catch (err) {
            console.error('Error deleting stock:', err);
            alert('Error deleting stock item. Please try again.');
        }
    };

    const handleAdjustQuantity = async (id, adjustment) => {
        try {
            const item = stock.find(s => s.id === id);
            if (!item) return;

            const newQuantity = Math.max(0, item.quantity + adjustment);
            await db.update('pharmacy_stock', id, { quantity: newQuantity });
            loadStock();
        } catch (err) {
            console.error('Error adjusting quantity:', err);
            alert('Error adjusting quantity. Please try again.');
        }
    };

    const handleView = (item) => {
        setViewingItem(item);
        setShowViewModal(true);
    };

    const closeViewModal = () => {
        setShowViewModal(false);
        setViewingItem(null);
    };

    const resetForm = () => {
        setFormData({
            medication_name: '',
            generic_name: '',
            category: '',
            quantity: '',
            unit: 'units',
            unit_price: '',
            expiry_date: '',
            batch_number: '',
            supplier: '',
            reorder_level: '10',
            notes: '',
            image_url: ''
        });
        setImagePreview(null);
        setEditingItem(null);
        setShowAddForm(false);
    };

    const getStatusBadge = (status, quantity, reorderLevel) => {
        if (status === 'expired') {
            return <span className="badge bg-danger">Expired</span>;
        }
        if (quantity <= 0) {
            return <span className="badge bg-danger">Out of Stock</span>;
        }
        if (quantity <= reorderLevel) {
            return <span className="badge bg-warning">Low Stock</span>;
        }
        return <span className="badge bg-success">In Stock</span>;
    };

    const categories = [...new Set(allStock.map(item => item.category).filter(Boolean))];
    const totalItems = allStock.length;
    const lowStockItems = allStock.filter(item => item.quantity > 0 && item.quantity <= (item.reorder_level || 10)).length;
    const outOfStockItems = allStock.filter(item => item.quantity <= 0).length;
    const expiredItems = allStock.filter(item => item.expiry_date && new Date(item.expiry_date) < new Date()).length;

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <i className="fas fa-pills"></i> Pharmacy Stock Management
                </div>
                <div className="card-body text-center p-4">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <div>
                    <i className="fas fa-pills me-2"></i> Pharmacy Stock Management
                </div>
                <div className="d-flex gap-2">
                    {activeTab === 'stock' && currentUser.role === 'pharmacy' && (
                        <button 
                            className="btn btn-primary"
                            onClick={() => setShowAddForm(!showAddForm)}
                        >
                            <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'} me-2`}></i>
                            {showAddForm ? 'Cancel' : 'Add Stock Item'}
                        </button>
                    )}
                </div>
            </div>
            <div className="card-body">
                {/* Tabs - Only show Doctors tab for pharmacy staff */}
                <ul className="nav nav-tabs mb-4">
                    <li className="nav-item">
                        <a 
                            className={`nav-link ${activeTab === 'stock' ? 'active' : ''}`}
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveTab('stock');
                            }}
                        >
                            <i className="fas fa-pills me-2"></i> Stock Management
                        </a>
                    </li>
                    {currentUser.role === 'pharmacy' && (
                        <li className="nav-item">
                            <a 
                                className={`nav-link ${activeTab === 'doctors' ? 'active' : ''}`}
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setActiveTab('doctors');
                                }}
                            >
                                <i className="fas fa-user-md me-2"></i> Doctors & Prescriptions
                            </a>
                        </li>
                    )}
                </ul>

                {/* Stock Management Tab */}
                {activeTab === 'stock' && (
                    <>
                {/* Statistics */}
                <div className="row mb-4">
                    <div className="col-md-3">
                        <div className="card bg-primary text-white">
                            <div className="card-body text-center">
                                <h5>{totalItems}</h5>
                                <small>Total Items</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-warning text-white">
                            <div className="card-body text-center">
                                <h5>{lowStockItems}</h5>
                                <small>Low Stock</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-danger text-white">
                            <div className="card-body text-center">
                                <h5>{outOfStockItems}</h5>
                                <small>Out of Stock</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-secondary text-white">
                            <div className="card-body text-center">
                                <h5>{expiredItems}</h5>
                                <small>Expired</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add/Edit Form - Only for Pharmacy Staff */}
                {showAddForm && currentUser.role === 'pharmacy' && (
                    <div className="card mb-4 border-primary">
                        <div className="card-header bg-primary text-white">
                            <i className="fas fa-plus me-2"></i>
                            {editingItem ? 'Edit Stock Item' : 'Add New Stock Item'}
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Medication Name *</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            name="medication_name"
                                            value={formData.medication_name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Generic Name</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            name="generic_name"
                                            value={formData.generic_name}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                        <label className="form-label">Category</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            placeholder="e.g., Antibiotic, Pain Relief"
                                        />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                        <label className="form-label">Quantity *</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            name="quantity"
                                            value={formData.quantity}
                                            onChange={handleChange}
                                            required
                                            min="0"
                                        />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                        <label className="form-label">Unit</label>
                                        <select 
                                            className="form-control" 
                                            name="unit"
                                            value={formData.unit}
                                            onChange={handleChange}
                                        >
                                            <option value="units">Units</option>
                                            <option value="tablets">Tablets</option>
                                            <option value="bottles">Bottles</option>
                                            <option value="boxes">Boxes</option>
                                            <option value="vials">Vials</option>
                                            <option value="packs">Packs</option>
                                        </select>
                                    </div>
                                    <div className="col-md-4 mb-3">
                                        <label className="form-label">Unit Price</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            className="form-control" 
                                            name="unit_price"
                                            value={formData.unit_price}
                                            onChange={handleChange}
                                            min="0"
                                        />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                        <label className="form-label">Expiry Date</label>
                                        <input 
                                            type="date" 
                                            className="form-control" 
                                            name="expiry_date"
                                            value={formData.expiry_date}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="col-md-4 mb-3">
                                        <label className="form-label">Reorder Level</label>
                                        <input 
                                            type="number" 
                                            className="form-control" 
                                            name="reorder_level"
                                            value={formData.reorder_level}
                                            onChange={handleChange}
                                            min="0"
                                        />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Batch Number</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            name="batch_number"
                                            value={formData.batch_number}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">Supplier</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            name="supplier"
                                            value={formData.supplier}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="col-md-12 mb-3">
                                        <label className="form-label">Notes</label>
                                        <textarea 
                                            className="form-control" 
                                            name="notes"
                                            value={formData.notes}
                                            onChange={handleChange}
                                            rows="2"
                                        ></textarea>
                                    </div>
                                    <div className="col-md-12 mb-3">
                                        <label className="form-label">
                                            <i className="fas fa-image me-2"></i>
                                            Medication Image (Optional)
                                        </label>
                                        <input 
                                            type="file" 
                                            className="form-control" 
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            disabled={uploadingImage}
                                        />
                                        <small className="text-muted">
                                            Supported formats: JPG, PNG, GIF. Max size: 5MB
                                        </small>
                                        {uploadingImage && (
                                            <div className="mt-2">
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Uploading image...
                                            </div>
                                        )}
                                        {(imagePreview || formData.image_url) && (
                                            <div className="mt-3">
                                                <img 
                                                    src={imagePreview || formData.image_url} 
                                                    alt="Preview" 
                                                    style={{
                                                        maxWidth: '200px',
                                                        maxHeight: '200px',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '8px',
                                                        padding: '5px'
                                                    }}
                                                />
                                                {formData.image_url && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger ms-2"
                                                        onClick={() => {
                                                            setFormData({...formData, image_url: ''});
                                                            setImagePreview(null);
                                                        }}
                                                    >
                                                        <i className="fas fa-times"></i> Remove
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <button type="submit" className="btn btn-primary">
                                        <i className="fas fa-save me-2"></i>
                                        {editingItem ? 'Update' : 'Add'} Stock Item
                                    </button>
                                    <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Filters */}
                <div className="row mb-3">
                    <div className="col-md-4">
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Search by name or batch number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="col-md-4">
                        <select 
                            className="form-control" 
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <select 
                            className="form-control" 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">In Stock</option>
                            <option value="low_stock">Low Stock</option>
                            <option value="out_of_stock">Out of Stock</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>
                </div>

                {/* Stock Table */}
                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Medication Name</th>
                                <th>Generic Name</th>
                                <th>Category</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Expiry Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stock.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center text-muted">
                                        No stock items found. Add your first stock item above.
                                    </td>
                                </tr>
                            ) : (
                                stock.map(item => (
                                    <tr key={item.id}>
                                        <td>
                                            {item.image_url ? (
                                                <img 
                                                    src={item.image_url} 
                                                    alt={item.medication_name}
                                                    style={{
                                                        width: '50px',
                                                        height: '50px',
                                                        objectFit: 'cover',
                                                        borderRadius: '4px',
                                                        border: '1px solid #ddd',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => {
                                                        const newWindow = window.open();
                                                        newWindow.document.write(`
                                                            <html>
                                                                <head><title>${item.medication_name} - Image</title></head>
                                                                <body style="margin:0;padding:20px;text-align:center;background:#f5f5f5;">
                                                                    <h2>${item.medication_name}</h2>
                                                                    <img src="${item.image_url}" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 4px 8px rgba(0,0,0,0.1);" />
                                                                </body>
                                                            </html>
                                                        `);
                                                    }}
                                                    onError={(e) => {
                                                        console.error('Image failed to load:', item.medication_name, item.image_url);
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div style={{
                                                width: '50px',
                                                height: '50px',
                                                backgroundColor: '#f0f0f0',
                                                borderRadius: '4px',
                                                display: item.image_url ? 'none' : 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#999'
                                            }}>
                                                <i className="fas fa-image"></i>
                                            </div>
                                        </td>
                                        <td><strong>{item.medication_name}</strong></td>
                                        <td>{item.generic_name || '-'}</td>
                                        <td>{item.category || '-'}</td>
                                        <td>
                                            <span className={item.quantity <= (item.reorder_level || 10) ? 'text-warning fw-bold' : ''}>
                                                {item.quantity} {item.unit}
                                            </span>
                                        </td>
                                        <td>${item.unit_price || '0.00'}</td>
                                        <td>
                                            {item.expiry_date ? (
                                                new Date(item.expiry_date) < new Date() ? (
                                                    <span className="text-danger">
                                                        {new Date(item.expiry_date).toLocaleDateString()} (Expired)
                                                    </span>
                                                ) : (
                                                    <span>{new Date(item.expiry_date).toLocaleDateString()}</span>
                                                )
                                            ) : '-'}
                                        </td>
                                        <td>
                                            {getStatusBadge(item.status, item.quantity, item.reorder_level)}
                                        </td>
                                        <td>
                                            <div className="btn-group btn-group-sm">
                                                <button 
                                                    className="btn btn-info"
                                                    onClick={() => handleView(item)}
                                                    title="View Details"
                                                >
                                                    <i className="fas fa-eye"></i> View
                                                </button>
                                                {currentUser.role === 'pharmacy' && (
                                                    <>
                                                        <button 
                                                            className="btn btn-warning"
                                                            onClick={() => handleEdit(item)}
                                                            title="Edit"
                                                        >
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button 
                                                            className="btn btn-success"
                                                            onClick={() => handleAdjustQuantity(item.id, 1)}
                                                            title="Add 1"
                                                        >
                                                            <i className="fas fa-plus"></i>
                                                        </button>
                                                        <button 
                                                            className="btn btn-info"
                                                            onClick={() => handleAdjustQuantity(item.id, -1)}
                                                            title="Remove 1"
                                                        >
                                                            <i className="fas fa-minus"></i>
                                                        </button>
                                                        <button 
                                                            className="btn btn-danger"
                                                            onClick={() => handleDelete(item.id)}
                                                            title="Delete"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                    </>
                )}

                {/* Doctors & Prescriptions Tab */}
                {activeTab === 'doctors' && (
                    <div>
                        <div className="row mb-4">
                            <div className="col-md-12 d-flex justify-content-between align-items-center">
                                <h5><i className="fas fa-user-md me-2"></i> Doctors Information</h5>
                                <button 
                                    className="btn btn-sm btn-primary"
                                    onClick={() => loadDoctorData()}
                                    title="Refresh prescriptions"
                                >
                                    <i className="fas fa-sync-alt me-2"></i>
                                    Refresh Prescriptions
                                </button>
                            </div>
                        </div>

                        {/* Doctors List */}
                        <div className="row mb-4">
                            {doctors.length === 0 ? (
                                <div className="col-md-12">
                                    <div className="alert alert-info">
                                        <i className="fas fa-info-circle me-2"></i>
                                        No doctors found in the system.
                                    </div>
                                </div>
                            ) : (
                                doctors.map(doctor => {
                                    // Get consultations by this doctor
                                    const doctorConsultations = consultations.filter(c => c.doctor_id === doctor.id);
                                    // Get prescriptions from consultations linked to this doctor
                                    const doctorPrescriptions = prescriptions.filter(p => {
                                        const consultation = consultations.find(c => c.visit_id === p.visit_id && c.doctor_id === doctor.id);
                                        return consultation !== undefined;
                                    });

                                    return (
                                        <div key={doctor.id} className="col-md-6 mb-3">
                                            <div className="card border-primary">
                                                <div className="card-header bg-primary text-white">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <i className="fas fa-user-md me-2"></i>
                                                            <strong>{doctor.name}</strong>
                                                        </div>
                                                        <span className="badge bg-light text-dark">
                                                            {doctorPrescriptions.length} Prescriptions
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="card-body">
                                                    <div className="mb-2">
                                                        <strong>Username:</strong> {doctor.username}
                                                    </div>
                                                    <div className="mb-3">
                                                        <strong>Consultations:</strong> {doctorConsultations.length}
                                                    </div>
                                                    
                                                    {doctorPrescriptions.length > 0 && (
                                                        <div>
                                                            <strong className="d-block mb-2">Recent Prescriptions:</strong>
                                                            <div className="list-group">
                                                                {doctorPrescriptions.slice(0, 5).map(prescription => {
                                                                    const visit = visits.find(v => v.id === prescription.visit_id);
                                                                    const patient = visit ? patients.find(p => p.id === visit.patient_id) : null;
                                                                    const consultation = doctorConsultations.find(c => c.visit_id === prescription.visit_id);
                                                                    
                                                                    return (
                                                                        <div key={prescription.id} className="list-group-item">
                                                                            <div className="d-flex justify-content-between">
                                                                                <div>
                                                                                    <strong>{patient?.name || 'Unknown Patient'}</strong>
                                                                                    <br />
                                                                                    <small className="text-muted">
                                                                                        {(prescription.medication || prescription.drugs || 'N/A')?.substring(0, 50)}
                                                                                        {(prescription.medication || prescription.drugs || '')?.length > 50 ? '...' : ''}
                                                                                    </small>
                                                                                </div>
                                                                                <div className="text-end">
                                                                                    <span className={`badge ${
                                                                                        prescription.status === 'dispensed' ? 'bg-success' : 'bg-warning'
                                                                                    }`}>
                                                                                        {prescription.status}
                                                                                    </span>
                                                                                    <br />
                                                                                    <small className="text-muted">
                                                                                        {prescription.created_date ? 
                                                                                            new Date(prescription.created_date).toLocaleDateString() : 
                                                                                            'N/A'}
                                                                                    </small>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {doctorPrescriptions.length > 5 && (
                                                                <small className="text-muted">
                                                                    ... and {doctorPrescriptions.length - 5} more prescriptions
                                                                </small>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* All Prescriptions Table */}
                        <div className="row mt-4">
                            <div className="col-md-12">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <h5><i className="fas fa-prescription me-2"></i> All Prescriptions ({prescriptions.length})</h5>
                                    <button 
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => loadDoctorData()}
                                        title="Refresh prescriptions"
                                    >
                                        <i className="fas fa-sync-alt me-2"></i>
                                        Refresh
                                    </button>
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Doctor</th>
                                                <th>Patient</th>
                                                <th>Medication</th>
                                                <th>Status</th>
                                                <th>Dispensed By</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prescriptions.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="text-center text-muted">
                                                        No prescriptions found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                prescriptions
                                                    .sort((a, b) => {
                                                        // Sort by created_date if available, otherwise by id (newer first)
                                                        const dateA = a.created_date ? new Date(a.created_date).getTime() : (a.id || 0);
                                                        const dateB = b.created_date ? new Date(b.created_date).getTime() : (b.id || 0);
                                                        return dateB - dateA;
                                                    })
                                                    .map(prescription => {
                                                        const visit = visits.find(v => v.id === prescription.visit_id);
                                                        const patient = visit ? patients.find(p => p.id === visit.patient_id) : null;
                                                        const consultation = consultations.find(c => c.visit_id === prescription.visit_id);
                                                        const doctor = consultation ? doctors.find(d => d.id === consultation.doctor_id) : null;
                                                        const dispensedBy = prescription.dispensed_by ? 
                                                            doctors.find(d => d.id === prescription.dispensed_by) || 
                                                            { name: 'Unknown' } : null;

                                                        return (
                                                            <tr key={prescription.id}>
                                                                <td>
                                                                    {prescription.created_date ? 
                                                                        new Date(prescription.created_date).toLocaleDateString() : 
                                                                        'N/A'}
                                                                </td>
                                                                <td>
                                                                    {doctor ? (
                                                                        <div>
                                                                            <strong>{doctor.name}</strong>
                                                                            <br />
                                                                            <small className="text-muted">{doctor.mobile || doctor.username}</small>
                                                                        </div>
                                                                    ) : 'N/A'}
                                                                </td>
                                                                <td>{patient?.name || 'Unknown'}</td>
                                                                <td>
                                                                    <div style={{ maxWidth: '300px' }}>
                                                                        {prescription.medication || prescription.drugs || 'N/A'}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className={`badge ${
                                                                        prescription.status === 'dispensed' ? 'bg-success' : 'bg-warning'
                                                                    }`}>
                                                                        {prescription.status || 'pending'}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    {dispensedBy ? dispensedBy.name : '-'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* View Stock Item Modal */}
            {showViewModal && viewingItem && (
                <div 
                    className="modal fade show" 
                    style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={closeViewModal}
                >
                    <div 
                        className="modal-dialog modal-lg modal-dialog-centered"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">
                                    <i className="fas fa-pills me-2"></i>
                                    Stock Item Details
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close btn-close-white" 
                                    onClick={closeViewModal}
                                ></button>
                            </div>
                            <div className="modal-body">
                                {/* Image Display */}
                                {viewingItem.image_url && (
                                    <div className="text-center mb-4">
                                        <img 
                                            src={viewingItem.image_url} 
                                            alt={viewingItem.medication_name}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '400px',
                                                border: '2px solid #ddd',
                                                borderRadius: '8px',
                                                padding: '10px',
                                                backgroundColor: '#f9f9f9',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => {
                                                const newWindow = window.open();
                                                newWindow.document.write(`
                                                    <html>
                                                        <head><title>${viewingItem.medication_name} - Image</title></head>
                                                        <body style="margin:0;padding:20px;text-align:center;background:#f5f5f5;">
                                                            <h2>${viewingItem.medication_name}</h2>
                                                            <img src="${viewingItem.image_url}" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 4px 8px rgba(0,0,0,0.1);" />
                                                        </body>
                                                    </html>
                                                `);
                                            }}
                                            onError={(e) => {
                                                console.error('Image failed to load for:', viewingItem.medication_name);
                                                e.target.style.display = 'none';
                                                const errorDiv = document.createElement('div');
                                                errorDiv.className = 'alert alert-warning';
                                                errorDiv.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Image failed to load';
                                                e.target.parentNode.appendChild(errorDiv);
                                            }}
                                        />
                                        <small className="text-muted d-block mt-2">
                                            <i className="fas fa-info-circle"></i> Click image to view full size
                                        </small>
                                    </div>
                                )}
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <strong><i className="fas fa-capsules me-2"></i> Medication Name:</strong>
                                            <p className="mb-0">{viewingItem.medication_name}</p>
                                        </div>
                                        <div className="mb-3">
                                            <strong><i className="fas fa-flask me-2"></i> Generic Name:</strong>
                                            <p className="mb-0">{viewingItem.generic_name || 'N/A'}</p>
                                        </div>
                                        <div className="mb-3">
                                            <strong><i className="fas fa-tags me-2"></i> Category:</strong>
                                            <p className="mb-0">{viewingItem.category || 'N/A'}</p>
                                        </div>
                                        <div className="mb-3">
                                            <strong><i className="fas fa-boxes me-2"></i> Quantity:</strong>
                                            <p className="mb-0">
                                                <span className={viewingItem.quantity <= (viewingItem.reorder_level || 10) ? 'text-warning fw-bold' : ''}>
                                                    {viewingItem.quantity} {viewingItem.unit}
                                                </span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <strong><i className="fas fa-dollar-sign me-2"></i> Unit Price:</strong>
                                            <p className="mb-0">${viewingItem.unit_price || '0.00'}</p>
                                        </div>
                                        <div className="mb-3">
                                            <strong><i className="fas fa-calendar-alt me-2"></i> Expiry Date:</strong>
                                            <p className="mb-0">
                                                {viewingItem.expiry_date ? (
                                                    new Date(viewingItem.expiry_date) < new Date() ? (
                                                        <span className="text-danger">
                                                            {new Date(viewingItem.expiry_date).toLocaleDateString()} (Expired)
                                                        </span>
                                                    ) : (
                                                        <span>{new Date(viewingItem.expiry_date).toLocaleDateString()}</span>
                                                    )
                                                ) : 'N/A'}
                                            </p>
                                        </div>
                                        <div className="mb-3">
                                            <strong><i className="fas fa-barcode me-2"></i> Batch Number:</strong>
                                            <p className="mb-0">{viewingItem.batch_number || 'N/A'}</p>
                                        </div>
                                        <div className="mb-3">
                                            <strong><i className="fas fa-truck me-2"></i> Supplier:</strong>
                                            <p className="mb-0">{viewingItem.supplier || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <strong><i className="fas fa-exclamation-triangle me-2"></i> Reorder Level:</strong>
                                        <p className="mb-0">{viewingItem.reorder_level || 10} {viewingItem.unit}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <strong><i className="fas fa-info-circle me-2"></i> Status:</strong>
                                        <p className="mb-0">
                                            {getStatusBadge(viewingItem.status, viewingItem.quantity, viewingItem.reorder_level)}
                                        </p>
                                    </div>
                                </div>
                                {viewingItem.notes && (
                                    <div className="mb-3">
                                        <strong><i className="fas fa-sticky-note me-2"></i> Notes:</strong>
                                        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{viewingItem.notes}</p>
                                    </div>
                                )}
                                <div className="row">
                                    <div className="col-md-6">
                                        <small className="text-muted">
                                            <i className="fas fa-calendar-plus me-1"></i>
                                            Created: {viewingItem.created_date ? new Date(viewingItem.created_date).toLocaleString() : 'N/A'}
                                        </small>
                                    </div>
                                    <div className="col-md-6">
                                        <small className="text-muted">
                                            <i className="fas fa-calendar-edit me-1"></i>
                                            Updated: {viewingItem.updated_date ? new Date(viewingItem.updated_date).toLocaleString() : 'N/A'}
                                        </small>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                {currentUser.role === 'pharmacy' && (
                                    <button 
                                        className="btn btn-warning"
                                        onClick={() => {
                                            closeViewModal();
                                            handleEdit(viewingItem);
                                        }}
                                    >
                                        <i className="fas fa-edit me-2"></i> Edit
                                    </button>
                                )}
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={closeViewModal}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PharmacyStock;

