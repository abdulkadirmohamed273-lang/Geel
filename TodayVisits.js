import React, { useState, useEffect } from 'react';

function TodayVisits({ currentUser, currentRole, db, setActiveView }) {
    const [todayVisits, setTodayVisits] = useState([]);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [visitsData, patientsData] = await Promise.all([
                db.getTodayVisits(),
                db.getAll('patients')
            ]);
            setTodayVisits(visitsData || []);
            setPatients(patientsData || []);
        } catch (err) {
            console.error('Error loading today visits:', err);
            setTodayVisits([]);
            setPatients([]);
        } finally {
            setLoading(false);
        }
    };

    const getPatientName = (patientId) => {
        const patient = patients.find(p => p.id === patientId);
        return patient?.name || 'Unknown Patient';
    };

    const getPatientMobile = (patientId) => {
        const patient = patients.find(p => p.id === patientId);
        return patient?.mobile || 'N/A';
    };

    const filteredVisits = todayVisits.filter(visit => {
        if (!searchTerm) return true;
        const patient = patients.find(p => p.id === visit.patient_id);
        const patientName = patient?.name?.toLowerCase() || '';
        const patientMobile = patient?.mobile || '';
        return patientName.includes(searchTerm.toLowerCase()) || 
               patientMobile.includes(searchTerm);
    });

    if (loading) {
        return (
            <div className="container-fluid p-4">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                    <i className="fas fa-calendar-day text-primary"></i> Today's Visits
                </h2>
                <button 
                    className="btn btn-secondary" 
                    onClick={() => setActiveView('dashboard')}
                >
                    <i className="fas fa-arrow-left"></i> Back to Dashboard
                </button>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="row align-items-center">
                        <div className="col-md-6">
                            <h5 className="mb-0">
                                <i className="fas fa-list"></i> Visits List
                            </h5>
                        </div>
                        <div className="col-md-6">
                            <div className="input-group">
                                <span className="input-group-text">
                                    <i className="fas fa-search"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Search by patient name or mobile..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    <div className="mb-3">
                        <span className="badge bg-primary">
                            Total: {filteredVisits.length} {filteredVisits.length === 1 ? 'visit' : 'visits'} today
                        </span>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Patient Name</th>
                                    <th>Mobile</th>
                                    <th>Time</th>
                                    <th>Blood Pressure</th>
                                    <th>Pulse Rate</th>
                                    <th>Temperature</th>
                                    <th>Weight</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVisits.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="text-center text-muted py-4">
                                            {searchTerm ? 'No visits found matching your search' : 'No visits today'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVisits.map((visit, index) => {
                                        const patient = patients.find(p => p.id === visit.patient_id);
                                        return (
                                            <tr key={visit.id}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <strong>{patient?.name || 'Unknown Patient'}</strong>
                                                    {patient && (
                                                        <>
                                                            <br />
                                                            <small className="text-muted">
                                                                ID: {patient.id} | 
                                                                <i className="fas fa-key ms-1"></i> <code>{patient.password || 'N/A'}</code>
                                                            </small>
                                                        </>
                                                    )}
                                                </td>
                                                <td>
                                                    <i className="fas fa-phone"></i> {patient?.mobile || 'N/A'}
                                                </td>
                                                <td>
                                                    {new Date(visit.created_date).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                    <br />
                                                    <small className="text-muted">
                                                        {new Date(visit.created_date).toLocaleDateString()}
                                                    </small>
                                                </td>
                                                <td>{visit.bp || 'N/A'}</td>
                                                <td>{visit.pulse || 'N/A'}</td>
                                                <td>{visit.temp ? `${visit.temp}°C` : 'N/A'}</td>
                                                <td>{visit.weight ? `${visit.weight} kg` : 'N/A'}</td>
                                                <td>
                                                    <div className="btn-group" role="group">
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => {
                                                                setActiveView('patientList');
                                                                sessionStorage.setItem('selectedPatientId', visit.patient_id);
                                                            }}
                                                            title="View Patient"
                                                        >
                                                            <i className="fas fa-user"></i>
                                                        </button>
                                                        {currentRole === 'reception' && (
                                                            <button
                                                                className="btn btn-sm btn-success"
                                                                onClick={() => {
                                                                    setActiveView('createVisit');
                                                                    sessionStorage.setItem('selectedPatientId', visit.patient_id);
                                                                }}
                                                                title="Create New Visit"
                                                            >
                                                                <i className="fas fa-plus"></i>
                                                            </button>
                                                        )}
                                                    </div>
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
    );
}

export default TodayVisits;
