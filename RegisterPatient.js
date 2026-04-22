import React, { useState } from 'react';

function RegisterPatient({ currentUser, db, setActiveView }) {
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        sex: '',
        mobile: '',
        address: '',
        password: '1234'
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { name, age, sex, mobile, address, password } = formData;

        if (!name || !age || !sex || !mobile) {
            alert('Please fill all required fields');
            return;
        }

        try {
            setLoading(true);
            const existingPatient = await db.findPatientByMobile(mobile);
            if (existingPatient) {
                alert('Patient with this mobile number already exists');
                setLoading(false);
                return;
            }

            const patient = await db.add('patients', {
                name,
                age: parseInt(age),
                sex,
                mobile,
                address: address || '',
                password,
                registered_by: currentUser.id
            });

            if (!patient) {
                alert('Error registering patient. Please try again.');
                setLoading(false);
                return;
            }

            alert('Registration successfully');
            setActiveView('dashboard');
        } catch (err) {
            console.error('Error registering patient:', err);
            alert('Error registering patient. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="card">
            <div className="card-header">
                <i className="fas fa-user-plus"></i> Register New Patient
            </div>
            <div className="card-body">
                <form onSubmit={handleSubmit}>
                    <div className="row">
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label className="form-label">Full Name *</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="mb-3">
                                <label className="form-label">Age *</label>
                                <input 
                                    type="number" 
                                    className="form-control" 
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    required 
                                    min="0" 
                                    max="150"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="mb-3">
                                <label className="form-label">Sex *</label>
                                <select 
                                    className="form-select" 
                                    name="sex"
                                    value={formData.sex}
                                    onChange={handleChange}
                                    required
                                    disabled={loading}
                                >
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div className="row">
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label className="form-label">Mobile Number *</label>
                                <input 
                                    type="tel" 
                                    className="form-control" 
                                    name="mobile"
                                    value={formData.mobile}
                                    onChange={handleChange}
                                    required 
                                    placeholder="7-10 digits"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="mb-3">
                                <label className="form-label">Password (Default: 1234)</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="row">
                        <div className="col-md-12">
                            <div className="mb-3">
                                <label className="form-label">Address</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Enter patient address"
                                    disabled={loading}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="alert alert-info">
                        <i className="fas fa-info-circle"></i> 
                        Patient will login using their mobile number as Login ID and the password above.
                    </div>
                    
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                Registering...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save"></i> Register Patient
                            </>
                        )}
                    </button>
                    <button type="button" className="btn btn-secondary ms-2" onClick={() => setActiveView('dashboard')} disabled={loading}>
                        <i className="fas fa-times"></i> Cancel
                    </button>
                </form>
            </div>
        </div>
    );
}

export default RegisterPatient;
