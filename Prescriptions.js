import React, { useState, useEffect } from 'react';

function Prescriptions({ currentUser, db, setActiveView }) {
    const [prescriptions, setPrescriptions] = useState([]);
    const [visits, setVisits] = useState([]);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [prescriptionsData, visitsData, patientsData] = await Promise.all([
                db.getAll('prescriptions'),
                db.getAll('visits'),
                db.getAll('patients')
            ]);
            
            setPrescriptions(prescriptionsData);
            setVisits(visitsData);
            setPatients(patientsData);
        } catch (err) {
            console.error('Error loading prescriptions:', err);
        } finally {
            setLoading(false);
        }
    };

    const dispensePrescription = async (visitId) => {
        try {
            const prescription = prescriptions.find(p => p.visit_id == visitId);
            
            if (prescription) {
                await db.update('prescriptions', prescription.id, { 
                    status: 'dispensed',
                    dispensed_by: currentUser.id,
                    dispensed_date: new Date().toISOString()
                });
                
                const allQueue = await db.getAll('queue');
                const queueItems = allQueue.filter(q => 
                    q.visit_id == visitId && q.department === 'pharmacy'
                );
                
                await Promise.all(
                    queueItems.map(item => db.update('queue', item.id, { status: 'completed' }))
                );
                
                alert('Prescription dispensed successfully!');
                await loadData();
            }
        } catch (err) {
            console.error('Error dispensing prescription:', err);
            alert('Error dispensing prescription. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <i className="fas fa-prescription"></i> All Prescriptions
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
                <i className="fas fa-prescription"></i> All Prescriptions
                <span className="badge bg-primary ms-2">{prescriptions.length} Total</span>
            </div>
            <div className="card-body">
                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th>Patient</th>
                                <th>Date</th>
                                <th>Medication</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prescriptions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center text-muted">No prescriptions found</td>
                                </tr>
                            ) : (
                                prescriptions.map(prescription => {
                                    const visit = visits.find(v => v.id == prescription.visit_id);
                                    const patient = patients.find(p => p.id == visit?.patient_id);
                                    
                                    return (
                                        <tr key={prescription.id}>
                                            <td>{patient?.name || 'Unknown'}</td>
                                            <td>{new Date(prescription.created_date).toLocaleDateString()}</td>
                                            <td>{prescription.medication || 'N/A'}</td>
                                            <td>
                                                <span className={`badge ${prescription.status === 'dispensed' ? 'bg-success' : 'bg-warning'}`}>
                                                    {prescription.status || 'pending'}
                                                </span>
                                            </td>
                                            <td>
                                                {prescription.status !== 'dispensed' ? (
                                                    <button 
                                                        className="btn btn-sm btn-success" 
                                                        onClick={() => dispensePrescription(prescription.visit_id)}
                                                    >
                                                        <i className="fas fa-check-circle"></i> Dispense
                                                    </button>
                                                ) : (
                                                    'Completed'
                                                )}
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
    );
}

export default Prescriptions;
