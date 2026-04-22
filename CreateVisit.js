import React, { useState, useEffect } from 'react';

function CreateVisit({ currentUser, db, setActiveView }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [formData, setFormData] = useState({
        bp: '',
        pr: '',
        temperature: '',
        weight: '',
        height: '',
        bmi: '',
        spo: '',
        addToDoctorQueue: true
    });
    const [searchResults, setSearchResults] = useState([]);

    useEffect(() => {
        const loadInitialData = async () => {
            const selectedPatientId = sessionStorage.getItem('selectedPatientId');
            if (selectedPatientId) {
                try {
                    const patient = await db.getById('patients', parseInt(selectedPatientId));
                    if (patient) {
                        setSelectedPatient(patient);
                        sessionStorage.removeItem('selectedPatientId');
                    }
                } catch (err) {
                    console.error('Error loading patient:', err);
                }
            }
            await searchPatients();
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        searchPatients();
    }, [searchTerm]);

    const searchPatients = async () => {
        try {
            const patients = await db.getAll('patients');
            const filtered = patients.filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.mobile.includes(searchTerm)
            ).slice(0, 10);
            setSearchResults(filtered);
        } catch (err) {
            console.error('Error searching patients:', err);
            setSearchResults([]);
        }
    };

    const selectPatient = (patient) => {
        setSelectedPatient(patient);
        setSearchTerm('');
    };

    const calculateBMI = () => {
        const weight = parseFloat(formData.weight);
        const height = parseFloat(formData.height);
        
        if (weight && height && height > 0) {
            const heightM = height / 100;
            const bmi = weight / (heightM * heightM);
            setFormData({ ...formData, bmi: bmi.toFixed(2) });
        } else {
            setFormData({ ...formData, bmi: '' });
        }
    };

    useEffect(() => {
        calculateBMI();
    }, [formData.weight, formData.height]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSave = async () => {
        if (!selectedPatient) {
            alert('Please select a patient');
            return;
        }

        try {
            // Build visit data object with only fields that have values
            const visitData = {
                patient_id: selectedPatient.id,
                bp: formData.bp || null,
                pulse: formData.pr || null,
                temp: formData.temperature || null,
                weight: formData.weight ? String(formData.weight) : null,
                complaint: formData.complaint || ''
            };
            
            // Only add optional columns if they have values (to avoid errors if columns don't exist)
            if (formData.height) {
                visitData.height = String(formData.height);
            }
            if (formData.bmi) {
                visitData.bmi = String(formData.bmi);
            }
            if (formData.spo) {
                visitData.spo = String(formData.spo);
            }
            
            const visit = await db.add('visits', visitData);

            if (!visit) {
                alert('Error creating visit. Please try again.');
                return;
            }

            if (formData.addToDoctorQueue) {
                await db.add('queue', {
                    visit_id: visit.id,
                    department: 'doctor',
                    status: 'pending'
                });
                alert('Visit created and patient added to doctor queue!');
            } else {
                alert('Visit created successfully!');
            }

            setActiveView('dashboard');
        } catch (err) {
            console.error('Error creating visit:', err);
            let errorMessage = 'Error creating visit. ';
            
            if (err.message && err.message.includes('bmi')) {
                errorMessage += 'The database is missing the BMI column. Please run the SQL script FIX_VISITS_TABLE_BMI.sql in Supabase to add the required columns.';
            } else if (err.message) {
                errorMessage += err.message;
            } else {
                errorMessage += 'Please check the console for more information.';
            }
            
            alert(errorMessage);
        }
    };

    const handleSaveAndAddPayment = async () => {
        await handleSave();
        setActiveView('financial');
    };

    const clearSelection = () => {
        setSelectedPatient(null);
        setFormData({
            bp: '',
            pr: '',
            temperature: '',
            weight: '',
            height: '',
            bmi: '',
            spo: '',
            addToDoctorQueue: true
        });
    };

    return (
        <div className="row g-4">
            <div className="col-lg-4">
                <div className="card create-visit-search-card">
                    <div className="card-header">
                        <i className="fas fa-search me-2"></i> Search Patient
                    </div>
                    <div className="card-body">
                        <div className="search-input-wrapper mb-4">
                            <i className="fas fa-search search-icon"></i>
                            <input 
                                type="text" 
                                className="form-control search-input" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name or mobile number..."
                            />
                        </div>
                        
                        <div className="patient-list-container">
                            {searchResults.length === 0 ? (
                                <div className="empty-state">
                                    <i className="fas fa-user-injured"></i>
                                    <p className="text-muted mt-3">No patients found</p>
                                    <small className="text-muted">Try a different search term</small>
                                </div>
                            ) : (
                                <div className="patient-list">
                                    {searchResults.map(patient => (
                                        <div 
                                            key={patient.id}
                                            className={`patient-item ${selectedPatient?.id === patient.id ? 'selected' : ''}`}
                                            onClick={() => selectPatient(patient)}
                                        >
                                            <div className="patient-avatar">
                                                <i className={`fas ${patient.sex === 'Female' ? 'fa-venus' : 'fa-mars'}`}></i>
                                            </div>
                                            <div className="patient-info">
                                                <h6 className="patient-name">{patient.name}</h6>
                                                <div className="patient-details">
                                                    <span className="patient-detail-item">
                                                        <i className="fas fa-phone"></i>
                                                        {patient.mobile}
                                                    </span>
                                                    <span className="patient-detail-item">
                                                        <i className="fas fa-user"></i>
                                                        {patient.sex}, {patient.age} yrs
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="patient-action">
                                                <button className="btn btn-sm btn-primary btn-select">
                                                    <i className="fas fa-plus"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="col-lg-8">
                {selectedPatient ? (
                    <div className="card create-visit-form-card">
                        <div className="card-header">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <i className="fas fa-stethoscope me-2"></i> Create Visit
                                </div>
                                <button 
                                    className="btn btn-sm btn-outline-light" 
                                    onClick={clearSelection}
                                    title="Select different patient"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="patient-info-card mb-4">
                                <div className="d-flex align-items-center">
                                    <div className="patient-avatar-large">
                                        <i className={`fas fa-user ${selectedPatient.sex === 'Female' ? 'fa-venus' : 'fa-mars'}`}></i>
                                    </div>
                                    <div className="ms-3">
                                        <h5 className="mb-1">{selectedPatient.name}</h5>
                                        <div className="text-muted">
                                            <span className="me-3">
                                                <i className="fas fa-phone me-1"></i>
                                                {selectedPatient.mobile}
                                            </span>
                                            <span>
                                                <i className="fas fa-user me-1"></i>
                                                {selectedPatient.sex}, {selectedPatient.age} yrs
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">
                                            <i className="fas fa-heartbeat me-2"></i> Blood Pressure
                                        </label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            name="bp"
                                            value={formData.bp}
                                            onChange={handleChange}
                                            placeholder="e.g., 120/80"
                                        />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">
                                            <i className="fas fa-heart me-2"></i> Pulse Rate
                                        </label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            name="pr"
                                            value={formData.pr}
                                            onChange={handleChange}
                                            placeholder="e.g., 72 bpm"
                                        />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">
                                            <i className="fas fa-thermometer-half me-2"></i> Temperature
                                        </label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            name="temperature"
                                            value={formData.temperature}
                                            onChange={handleChange}
                                            placeholder="e.g., 36.5°C"
                                        />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">
                                            <i className="fas fa-weight me-2"></i> Weight (kg)
                                        </label>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            className="form-control" 
                                            name="weight"
                                            value={formData.weight}
                                            onChange={handleChange}
                                            placeholder="e.g., 70"
                                        />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">
                                            <i className="fas fa-ruler-vertical me-2"></i> Height (cm)
                                        </label>
                                        <input 
                                            type="number" 
                                            step="0.1"
                                            className="form-control" 
                                            name="height"
                                            value={formData.height}
                                            onChange={handleChange}
                                            placeholder="e.g., 170"
                                        />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">
                                            <i className="fas fa-calculator me-2"></i> BMI
                                        </label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            name="bmi"
                                            value={formData.bmi}
                                            onChange={handleChange}
                                            placeholder="Auto-calculated or enter manually"
                                            readOnly={formData.weight && formData.height}
                                        />
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">
                                            <i className="fas fa-lungs me-2"></i> SPO₂ (%)
                                        </label>
                                        <input 
                                            type="text" 
                                            className="form-control" 
                                            name="spo"
                                            value={formData.spo}
                                            onChange={handleChange}
                                            placeholder="e.g., 98"
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <div className="form-check">
                                        <input 
                                            className="form-check-input" 
                                            type="checkbox" 
                                            name="addToDoctorQueue"
                                            checked={formData.addToDoctorQueue}
                                            onChange={handleChange}
                                            id="addToQueue"
                                        />
                                        <label className="form-check-label" htmlFor="addToQueue">
                                            Add patient to doctor queue
                                        </label>
                                    </div>
                                </div>

                                <div className="d-flex gap-2">
                                    <button type="submit" className="btn btn-primary">
                                        <i className="fas fa-save me-2"></i> Save Visit
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn btn-success"
                                        onClick={handleSaveAndAddPayment}
                                    >
                                        <i className="fas fa-money-bill me-2"></i> Save & Add Payment
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        onClick={() => setActiveView('dashboard')}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : (
                    <div className="card">
                        <div className="card-body text-center p-5">
                            <i className="fas fa-user-injured fa-4x text-muted mb-3"></i>
                            <h5 className="text-muted">Select a patient to create a visit</h5>
                            <p className="text-muted">Search and select a patient from the list on the left</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CreateVisit;
