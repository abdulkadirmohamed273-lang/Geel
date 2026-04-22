import React, { useState } from 'react';

function Navbar({ currentUser, onLogout, db, onToggleSidebar }) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');

    const openPasswordModal = () => {
        setShowPasswordModal(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        setShowDropdown(false);
    };

    const closePasswordModal = () => {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
    };

    const handlePasswordChange = () => {
        setError('');
        
        if (!currentPassword) {
            setError('Please enter your current password');
            return;
        }
        
        // Check current password
        const user = db.getUserByUsername(currentUser.username);
        if (!user || user.password !== currentPassword) {
            // Check if patient
            if (currentUser.password !== currentPassword) {
                setError('Current password is incorrect');
                return;
            }
        }
        
        if (!newPassword) {
            setError('Please enter a new password');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        // Update password
        if (currentUser.role === 'patient') {
            db.update('patients', currentUser.id, { password: newPassword });
        } else {
            db.update('users', currentUser.id, { password: newPassword });
        }
        
        alert('Password changed successfully!');
        closePasswordModal();
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark">
            <div className="container-fluid">
                {/* Mobile Menu Toggle */}
                <button 
                    className="btn btn-outline-light btn-sm d-lg-none me-2" 
                    onClick={onToggleSidebar}
                    style={{ border: 'none' }}
                >
                    <i className="fas fa-bars"></i>
                </button>
                
                <div className="logo-container">
                    <img 
                        src="/logo.png" 
                        alt="Clinic Logo" 
                        className="logo-img" 
                        onError={(e) => {
                            e.target.src = "https://via.placeholder.com/60x60/2c3e50/ffffff?text=OBGYN";
                        }}
                    />
                    <span className="clinic-name">Beergeel Obstetrics & Gynecology Clinic</span>
                </div>
                
                <div className="d-flex align-items-center">
                    <div className="dropdown">
                        <button 
                            className="btn btn-outline-light btn-sm dropdown-toggle" 
                            type="button" 
                            onClick={() => setShowDropdown(!showDropdown)}
                        >
                            <i className="fas fa-user"></i> {currentUser?.name || currentUser?.username}
                        </button>
                        {showDropdown && (
                            <ul className="dropdown-menu dropdown-menu-end show" style={{ display: 'block' }}>
                                <li>
                                    <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); openPasswordModal(); }}>
                                        <i className="fas fa-key"></i> Change Password
                                    </a>
                                </li>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                    <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); onLogout(); }}>
                                        <i className="fas fa-sign-out-alt"></i> Logout
                                    </a>
                                </li>
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
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
                            closePasswordModal();
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
                                    Change Password
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={closePasswordModal}
                                ></button>
                            </div>
                            <div
                                className="modal-body"
                                style={{ padding: '24px' }}
                            >
                                {error && (
                                    <div className="alert alert-danger" role="alert" style={{ borderRadius: '8px', marginBottom: '20px' }}>
                                        <i className="fas fa-exclamation-circle me-2"></i>
                                        {error}
                                    </div>
                                )}
                                
                                <div className="mb-3">
                                    <label htmlFor="currentPassword" className="form-label" style={{ fontWeight: '500', color: '#2c3e50' }}>
                                        Current Password
                                    </label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        id="currentPassword"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                        style={{
                                            borderRadius: '8px',
                                            border: '1px solid #ddd',
                                            padding: '10px 15px'
                                        }}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                document.getElementById('newPassword')?.focus();
                                            }
                                        }}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="newPassword" className="form-label" style={{ fontWeight: '500', color: '#2c3e50' }}>
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        id="newPassword"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        style={{
                                            borderRadius: '8px',
                                            border: '1px solid #ddd',
                                            padding: '10px 15px'
                                        }}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                document.getElementById('confirmPassword')?.focus();
                                            }
                                        }}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="confirmPassword" className="form-label" style={{ fontWeight: '500', color: '#2c3e50' }}>
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        className="form-control"
                                        id="confirmPassword"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        style={{
                                            borderRadius: '8px',
                                            border: '1px solid #ddd',
                                            padding: '10px 15px'
                                        }}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handlePasswordChange();
                                            }
                                        }}
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
                                    onClick={closePasswordModal}
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
                                    onClick={handlePasswordChange}
                                    style={{
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '10px 30px',
                                        fontWeight: '500'
                                    }}
                                >
                                    <i className="fas fa-check me-2"></i>
                                    Change Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}

export default Navbar;

