import React, { useState, useEffect, useCallback } from 'react';

function AccountManagement({ currentUser, db, setActiveView }) {
    const [activeTab, setActiveTab] = useState('staff');
    const [users, setUsers] = useState([]);
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showAddStaffModal, setShowAddStaffModal] = useState(false);
    const [showEditStaffModal, setShowEditStaffModal] = useState(false);
    const [showEditPatientModal, setShowEditPatientModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [resetPasswordData, setResetPasswordData] = useState({ type: null, id: null, name: '' });
    const [newPassword, setNewPassword] = useState('1234');
    const [editingStaff, setEditingStaff] = useState(null);
    const [editingPatient, setEditingPatient] = useState(null);
    const [newStaff, setNewStaff] = useState({
        name: '',
        username: '',
        role: '',
        mobile: '',
        password: '1234'
    });

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [usersData, patientsData] = await Promise.all([
                db.getAll('users'),
                db.getAll('patients')
            ]);
            setUsers(usersData);
            setPatients(patientsData);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    }, [db]);

    const filterPatients = useCallback(async () => {
        try {
            const allPatients = await db.getAll('patients');
            const filtered = allPatients.filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.mobile.includes(searchTerm)
            );
            setPatients(filtered);
        } catch (err) {
            console.error('Error filtering patients:', err);
        }
    }, [db, searchTerm]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (activeTab === 'patients') {
            filterPatients();
        }
    }, [searchTerm, activeTab, filterPatients]);

    const openResetPasswordModal = async (type, id) => {
        try {
            let name = '';
            if (type === 'staff') {
                const user = await db.getById('users', id);
                if (user) name = user.name;
            } else if (type === 'patient') {
                const patient = await db.getById('patients', id);
                if (patient) name = patient.name;
            }
            
            setResetPasswordData({ type, id, name });
            setNewPassword('1234');
            setShowResetPasswordModal(true);
        } catch (err) {
            console.error('Error opening reset password modal:', err);
            alert('Error loading user information. Please try again.');
        }
    };

    const handleResetPassword = async () => {
        if (!newPassword) {
            alert('Please enter a new password');
            return;
        }
        
        try {
            if (resetPasswordData.type === 'staff') {
                await db.update('users', resetPasswordData.id, { password: newPassword });
                alert(`Password reset for ${resetPasswordData.name}. New password: ${newPassword}`);
                const updatedUsers = await db.getAll('users');
                setUsers(updatedUsers);
            } else if (resetPasswordData.type === 'patient') {
                await db.update('patients', resetPasswordData.id, { password: newPassword });
                alert(`Password reset for ${resetPasswordData.name}. New password: ${newPassword}`);
                const updatedPatients = await db.getAll('patients');
                setPatients(updatedPatients);
            }
            
            setShowResetPasswordModal(false);
            setResetPasswordData({ type: null, id: null, name: '' });
            setNewPassword('1234');
        } catch (err) {
            console.error('Error resetting password:', err);
            alert('Error resetting password. Please try again.');
        }
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        
        // Trim whitespace from inputs
        const trimmedName = newStaff.name.trim();
        const trimmedUsername = newStaff.username.trim();
        const trimmedMobile = newStaff.mobile.trim();
        
        if (!trimmedName || !trimmedUsername || !newStaff.role) {
            alert('Please fill in all required fields (Name, Username, Role)');
            return;
        }

        // Check if username already exists
        const existingUser = users.find(u => u.username === trimmedUsername || u.username === trimmedUsername.toString());
        if (existingUser) {
            alert(`Username "${trimmedUsername}" already exists. Please choose a different username.`);
            return;
        }

        // Check if mobile number already exists (if provided)
        if (trimmedMobile) {
            const existingMobile = users.find(u => u.mobile === trimmedMobile && u.mobile);
            if (existingMobile) {
                alert(`Mobile number "${trimmedMobile}" is already in use. Please use a different mobile number.`);
                return;
            }
        }

        try {
            const result = await db.add('users', {
                name: trimmedName,
                username: trimmedUsername,
                role: newStaff.role,
                mobile: trimmedMobile || trimmedUsername,
                password: (newStaff.password && newStaff.password.trim()) || '1234'
            });
            
            if (!result) {
                alert('Error: Failed to add staff member. Please check if the username is unique and try again.');
                return;
            }
            
            alert(`Staff member "${trimmedName}" added successfully!\n\nLogin Username: ${trimmedUsername}\nPassword: ${(newStaff.password && newStaff.password.trim()) || '1234'}`);
            setShowAddStaffModal(false);
            setNewStaff({
                name: '',
                username: '',
                role: '',
                mobile: '',
                password: '1234'
            });
            await loadData();
        } catch (err) {
            console.error('Error adding staff:', err);
            alert(`Error adding staff member: ${err.message || 'Please try again.'}`);
        }
    };

    const handleEditStaff = (user) => {
        setEditingStaff(user);
        setShowEditStaffModal(true);
    };

    const handleUpdateStaff = async (e) => {
        e.preventDefault();
        
        if (!editingStaff.name || !editingStaff.username || !editingStaff.role) {
            alert('Please fill in all required fields (Name, Username, Role)');
            return;
        }

        // Check if username already exists (excluding current user)
        const existingUser = users.find(u => u.username === editingStaff.username && u.id !== editingStaff.id);
        if (existingUser) {
            alert('Username already exists. Please choose a different username.');
            return;
        }

        try {
            await db.update('users', editingStaff.id, {
                name: editingStaff.name,
                username: editingStaff.username,
                role: editingStaff.role,
                mobile: editingStaff.mobile || editingStaff.username
            });
            
            alert(`Staff member ${editingStaff.name} updated successfully!`);
            setShowEditStaffModal(false);
            setEditingStaff(null);
            loadData();
        } catch (err) {
            console.error('Error updating staff:', err);
            alert('Error updating staff member. Please try again.');
        }
    };

    const handleDeleteStaff = async (user) => {
        // Prevent deleting yourself
        if (user.id === currentUser.id) {
            alert('You cannot delete your own account!');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete ${user.name}?\n\nThis action cannot be undone.`)) {
            return;
        }

        try {
            await db.delete('users', user.id);
            alert(`Staff member ${user.name} deleted successfully!`);
            loadData();
        } catch (err) {
            console.error('Error deleting staff:', err);
            alert('Error deleting staff member. Please try again.');
        }
    };

    const handleEditPatient = (patient) => {
        setEditingPatient(patient);
        setShowEditPatientModal(true);
    };

    const handleUpdatePatient = async (e) => {
        e.preventDefault();
        
        if (!editingPatient.name || !editingPatient.mobile) {
            alert('Please fill in all required fields (Name, Mobile)');
            return;
        }

        try {
            await db.update('patients', editingPatient.id, {
                name: editingPatient.name,
                mobile: editingPatient.mobile,
                age: editingPatient.age,
                sex: editingPatient.sex
            });
            
            alert(`Patient ${editingPatient.name} updated successfully!`);
            setShowEditPatientModal(false);
            setEditingPatient(null);
            loadData();
        } catch (err) {
            console.error('Error updating patient:', err);
            alert('Error updating patient. Please try again.');
        }
    };

    if (currentUser.role !== 'reception') {
        return (
            <div className="card">
                <div className="card-body">
                    <div className="alert alert-danger">
                        Access denied. Only reception can manage accounts.
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <i className="fas fa-users-cog"></i> Account Management
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
            <div className="card-header">
                <i className="fas fa-users-cog"></i> Account Management
            </div>
            <div className="card-body">
                <ul className="nav nav-tabs">
                    <li className="nav-item">
                        <button 
                            type="button"
                            className={`nav-link ${activeTab === 'staff' ? 'active' : ''}`}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                            onClick={() => setActiveTab('staff')}
                        >
                            Staff Accounts
                        </button>
                    </li>
                    <li className="nav-item">
                        <button 
                            type="button"
                            className={`nav-link ${activeTab === 'patients' ? 'active' : ''}`}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
                            onClick={() => setActiveTab('patients')}
                        >
                            Patient Accounts
                        </button>
                    </li>
                </ul>
                
                <div className="tab-content mt-3">
                    {activeTab === 'staff' && (
                        <div className="tab-pane fade show active">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="mb-0">Staff Accounts ({users.length})</h5>
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => setShowAddStaffModal(true)}
                                >
                                    <i className="fas fa-user-plus"></i> Add Staff
                                </button>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Username</th>
                                            <th>Role</th>
                                            <th>Mobile</th>
                                            <th>Password</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="text-center text-muted">No staff accounts found</td>
                                            </tr>
                                        ) : (
                                            users.map(user => (
                                                <tr key={user.id}>
                                                    <td>{user.id}</td>
                                                    <td>{user.name}</td>
                                                    <td>{user.username}</td>
                                                    <td><span className="badge bg-info">{user.role}</span></td>
                                                    <td>{user.mobile || 'N/A'}</td>
                                                    <td><code>{user.password}</code></td>
                                                    <td>
                                                        <button 
                                                            className="btn btn-sm btn-primary me-2" 
                                                            onClick={() => handleEditStaff(user)}
                                                        >
                                                            <i className="fas fa-edit"></i> Edit
                                                        </button>
                                                        <button 
                                                            className="btn btn-sm btn-warning me-2" 
                                                            onClick={() => openResetPasswordModal('staff', user.id)}
                                                        >
                                                            <i className="fas fa-key"></i> Reset Password
                                                        </button>
                                                        <button 
                                                            className="btn btn-sm btn-danger" 
                                                            onClick={() => handleDeleteStaff(user)}
                                                        >
                                                            <i className="fas fa-trash"></i> Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'patients' && (
                        <div className="tab-pane fade show active">
                            <h5>Patient Accounts ({patients.length})</h5>
                            <div className="mb-3">
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by name or mobile"
                                />
                            </div>
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Name</th>
                                            <th>Mobile</th>
                                            <th>Age/Sex</th>
                                            <th>Password</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {patients.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="text-center text-muted">No patients found</td>
                                            </tr>
                                        ) : (
                                            patients.map(patient => (
                                                <tr key={patient.id}>
                                                    <td>{patient.id}</td>
                                                    <td>{patient.name}</td>
                                                    <td>{patient.mobile}</td>
                                                    <td>{patient.age} yrs / {patient.sex}</td>
                                                    <td><code>{patient.password}</code></td>
                                                    <td>
                                                        <button 
                                                            className="btn btn-sm btn-primary me-2" 
                                                            onClick={() => handleEditPatient(patient)}
                                                        >
                                                            <i className="fas fa-edit"></i> Edit
                                                        </button>
                                                        <button 
                                                            className="btn btn-sm btn-warning" 
                                                            onClick={() => openResetPasswordModal('patient', patient.id)}
                                                        >
                                                            <i className="fas fa-key"></i> Reset Password
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Staff Modal */}
            {showAddStaffModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fas fa-user-plus"></i> Add New Staff Member
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => {
                                        setShowAddStaffModal(false);
                                        setNewStaff({
                                            name: '',
                                            username: '',
                                            role: '',
                                            mobile: '',
                                            password: '1234'
                                        });
                                    }}
                                ></button>
                            </div>
                            <form onSubmit={handleAddStaff}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Name <span className="text-danger">*</span></label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={newStaff.name}
                                            onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                                            required
                                            placeholder="Enter staff name"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Username <span className="text-danger">*</span></label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={newStaff.username}
                                            onChange={(e) => setNewStaff({...newStaff, username: e.target.value})}
                                            required
                                            placeholder="Enter username or phone number"
                                            maxLength={50}
                                        />
                                        <small className="form-text text-muted">Can be phone number or any unique identifier</small>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            <i className="fas fa-user-tag text-primary"></i> Role <span className="text-danger">*</span>
                                        </label>
                                        <select 
                                            className="form-select" 
                                            value={newStaff.role}
                                            onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                                            required
                                            style={{ 
                                                fontSize: '1rem',
                                                fontWeight: '500',
                                                border: '2px solid #3498db',
                                                borderRadius: '8px',
                                                padding: '10px',
                                                backgroundColor: newStaff.role ? '#f8f9fa' : '#fff',
                                                minHeight: '45px'
                                            }}
                                        >
                                            <option value="">-- Select Role --</option>
                                            <option value="reception">Reception Staff</option>
                                            <option value="doctor">Doctor</option>
                                            <option value="pharmacy">Pharmacy Staff</option>
                                            <option value="lab">Laboratory Technician</option>
                                        </select>
                                        {newStaff.role && (
                                            <div className="mt-2">
                                                <span className="badge bg-info" style={{ fontSize: '0.9rem' }}>
                                                    Selected: {newStaff.role.charAt(0).toUpperCase() + newStaff.role.slice(1)}
                                                </span>
                                            </div>
                                        )}
                                        <small className="form-text text-muted d-block mt-1">
                                            Select the staff member's role in the clinic
                                        </small>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Mobile</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={newStaff.mobile}
                                            onChange={(e) => setNewStaff({...newStaff, mobile: e.target.value})}
                                            placeholder="Enter mobile number (optional)"
                                            maxLength={20}
                                        />
                                        <small className="form-text text-muted">If not provided, username will be used as mobile</small>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Password</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={newStaff.password}
                                            onChange={(e) => setNewStaff({...newStaff, password: e.target.value})}
                                            placeholder="Default: 1234"
                                        />
                                        <small className="form-text text-muted">Default password is 1234 if left empty</small>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        onClick={() => {
                                            setShowAddStaffModal(false);
                                            setNewStaff({
                                                name: '',
                                                username: '',
                                                role: '',
                                                mobile: '',
                                                password: '1234'
                                            });
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        <i className="fas fa-save"></i> Add Staff
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Staff Modal */}
            {showEditStaffModal && editingStaff && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fas fa-user-edit"></i> Edit Staff Member
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => {
                                        setShowEditStaffModal(false);
                                        setEditingStaff(null);
                                    }}
                                ></button>
                            </div>
                            <form onSubmit={handleUpdateStaff}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Name <span className="text-danger">*</span></label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={editingStaff.name}
                                            onChange={(e) => setEditingStaff({...editingStaff, name: e.target.value})}
                                            required
                                            placeholder="Enter staff name"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Username <span className="text-danger">*</span></label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={editingStaff.username}
                                            onChange={(e) => setEditingStaff({...editingStaff, username: e.target.value})}
                                            required
                                            placeholder="Enter username (usually mobile number)"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-bold">
                                            <i className="fas fa-user-tag text-primary"></i> Role <span className="text-danger">*</span>
                                        </label>
                                        <select 
                                            className="form-select" 
                                            value={editingStaff.role}
                                            onChange={(e) => setEditingStaff({...editingStaff, role: e.target.value})}
                                            required
                                            style={{ 
                                                fontSize: '1rem',
                                                fontWeight: '500',
                                                border: '2px solid #3498db',
                                                borderRadius: '8px',
                                                padding: '10px',
                                                backgroundColor: editingStaff.role ? '#f8f9fa' : '#fff',
                                                minHeight: '45px'
                                            }}
                                        >
                                            <option value="">-- Select Role --</option>
                                            <option value="reception">Reception Staff</option>
                                            <option value="doctor">Doctor</option>
                                            <option value="pharmacy">Pharmacy Staff</option>
                                            <option value="lab">Laboratory Technician</option>
                                        </select>
                                        {editingStaff.role && (
                                            <div className="mt-2">
                                                <span className="badge bg-info" style={{ fontSize: '0.9rem' }}>
                                                    Selected: {editingStaff.role.charAt(0).toUpperCase() + editingStaff.role.slice(1)}
                                                </span>
                                            </div>
                                        )}
                                        <small className="form-text text-muted d-block mt-1">
                                            Select the staff member's role in the clinic
                                        </small>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Mobile</label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={editingStaff.mobile || ''}
                                            onChange={(e) => setEditingStaff({...editingStaff, mobile: e.target.value})}
                                            placeholder="Enter mobile number (optional)"
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        onClick={() => {
                                            setShowEditStaffModal(false);
                                            setEditingStaff(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        <i className="fas fa-save"></i> Update Staff
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Patient Modal */}
            {showEditPatientModal && editingPatient && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="fas fa-user-edit"></i> Edit Patient
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => {
                                        setShowEditPatientModal(false);
                                        setEditingPatient(null);
                                    }}
                                ></button>
                            </div>
                            <form onSubmit={handleUpdatePatient}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Name <span className="text-danger">*</span></label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={editingPatient.name}
                                            onChange={(e) => setEditingPatient({...editingPatient, name: e.target.value})}
                                            required
                                            placeholder="Enter patient name"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Mobile <span className="text-danger">*</span></label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            value={editingPatient.mobile}
                                            onChange={(e) => setEditingPatient({...editingPatient, mobile: e.target.value})}
                                            required
                                            placeholder="Enter mobile number"
                                        />
                                    </div>
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Age</label>
                                                <input 
                                                    type="number" 
                                                    className="form-control" 
                                                    value={editingPatient.age || ''}
                                                    onChange={(e) => setEditingPatient({...editingPatient, age: e.target.value})}
                                                    placeholder="Enter age"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Sex</label>
                                                <select 
                                                    className="form-select" 
                                                    value={editingPatient.sex || ''}
                                                    onChange={(e) => setEditingPatient({...editingPatient, sex: e.target.value})}
                                                >
                                                    <option value="">-- Select --</option>
                                                    <option value="M">Male</option>
                                                    <option value="F">Female</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        onClick={() => {
                                            setShowEditPatientModal(false);
                                            setEditingPatient(null);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        <i className="fas fa-save"></i> Update Patient
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetPasswordModal && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 10000
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowResetPasswordModal(false);
                            setResetPasswordData({ type: null, id: null, name: '' });
                            setNewPassword('1234');
                        }
                    }}
                >
                    <div
                        className="modal-dialog modal-dialog-centered"
                        style={{
                            animation: 'fadeIn 0.3s ease',
                            maxWidth: '500px'
                        }}
                    >
                        <div
                            className="modal-content"
                            style={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                            }}
                        >
                            <div
                                className="modal-header border-0 pb-0"
                                style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    borderRadius: '12px 12px 0 0',
                                    padding: '20px 24px'
                                }}
                            >
                                <h5 className="modal-title text-white mb-0">
                                    <i className="fas fa-key me-2"></i>
                                    Reset Password
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => {
                                        setShowResetPasswordModal(false);
                                        setResetPasswordData({ type: null, id: null, name: '' });
                                        setNewPassword('1234');
                                    }}
                                ></button>
                            </div>
                            <div
                                className="modal-body"
                                style={{ padding: '24px' }}
                            >
                                <p style={{ marginBottom: '20px', color: '#2c3e50' }}>
                                    Reset password for <strong>{resetPasswordData.name}</strong>
                                </p>
                                
                                <div className="mb-3">
                                    <label htmlFor="resetNewPassword" className="form-label" style={{ fontWeight: '500', color: '#2c3e50' }}>
                                        New Password
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="resetNewPassword"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password (default: 1234)"
                                        style={{
                                            borderRadius: '8px',
                                            border: '1px solid #ddd',
                                            padding: '10px 15px'
                                        }}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleResetPassword();
                                            }
                                        }}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div
                                className="modal-footer border-0"
                                style={{ padding: '0 24px 24px' }}
                            >
                                <button
                                    type="button"
                                    className="btn btn-secondary px-4"
                                    onClick={() => {
                                        setShowResetPasswordModal(false);
                                        setResetPasswordData({ type: null, id: null, name: '' });
                                        setNewPassword('1234');
                                    }}
                                    style={{
                                        borderRadius: '8px',
                                        padding: '10px 30px',
                                        fontWeight: '500',
                                        marginRight: '10px'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary px-4"
                                    onClick={handleResetPassword}
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '10px 30px',
                                        fontWeight: '500'
                                    }}
                                >
                                    <i className="fas fa-check me-2"></i>
                                    Reset Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AccountManagement;
