
import React, { useState, useEffect } from 'react';
import Consultation from './Consultation';
import { getRequestedTestsString } from '../utils/labRequestHelpers';

function Consultations({ currentUser, db, setActiveView }) {
    const [consultations, setConsultations] = useState([]);
    const [visits, setVisits] = useState([]);
    const [patients, setPatients] = useState([]);
    const [queue, setQueue] = useState([]);
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [consultationDetails, setConsultationDetails] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [consultationsData, visitsData, patientsData, queueData] = await Promise.all([
                db.getAll('consultations'),
                db.getAll('visits'),
                db.getAll('patients'),
                db.getAll('queue')
            ]);
            
            console.log('=== CONSULTATIONS: Loading data ===');
            console.log('Consultations found:', consultationsData);
            console.log('Visits found:', visitsData);
            console.log('Patients found:', patientsData);
            
            setConsultations(consultationsData || []);
            setVisits(visitsData || []);
            setPatients(patientsData || []);
            setQueue(queueData || []);
        } catch (err) {
            console.error('Error loading data:', err);
            setConsultations([]);
            setVisits([]);
            setPatients([]);
            setQueue([]);
        } finally {
            setLoading(false);
        }
    };

    const viewConsultationDetails = async (consultationId) => {
        try {
            const consultation = consultations.find(c => c.id === consultationId);
            if (!consultation) return;
            
            const visit = visits.find(v => v.id === consultation.visit_id);
            if (!visit) return;
            
            const patient = patients.find(p => p.id === visit.patient_id);
            if (!patient) return;
            
            const [allLabRequests, allPrescriptions] = await Promise.all([
                db.getAll('lab_requests'),
                db.getAll('prescriptions')
            ]);
            
            const labRequest = allLabRequests.find(l => l.visit_id == visit.id);
            const prescription = allPrescriptions.find(p => p.visit_id == visit.id);
            
            setConsultationDetails({
                consultation,
                visit,
                patient,
                labRequest,
                prescription
            });
            setShowDetailsModal(true);
        } catch (err) {
            console.error('Error viewing consultation details:', err);
            alert('Error loading consultation details. Please try again.');
        }
    };

    const editConsultation = (visitId, patientId) => {
        setSelectedVisit(visitId);
        setSelectedPatient(patientId);
    };

    const handleBack = async () => {
        setSelectedVisit(null);
        setSelectedPatient(null);
        // Force reload data after consultation is saved
        console.log('Refreshing consultations list after save...');
        await loadData();
    };

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <i className="fas fa-clipboard"></i> All Consultations
                </div>
                <div className="card-body text-center p-4">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedVisit && selectedPatient) {
        return (
            <Consultation 
                visitId={selectedVisit}
                patientId={selectedPatient}
                currentUser={currentUser}
                db={db}
                onBack={handleBack}
            />
        );
    }

    return (
        <>
            <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <i className="fas fa-clipboard"></i> All Consultations
                        <span className="badge bg-primary ms-2">{consultations.length} Total</span>
                    </div>
                    <button 
                        className="btn btn-sm btn-outline-light" 
                        onClick={loadData}
                        title="Refresh"
                    >
                        <i className="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                    <th>Patient</th>
                                    <th>Date</th>
                                    <th>Chief Complaint</th>
                                    <th>Diagnosis</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {consultations.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center text-muted">No consultations found</td>
                                    </tr>
                                ) : (
                                    consultations.map(consultation => {
                                        const visit = visits.find(v => v.id == consultation.visit_id);
                                        const patient = patients.find(p => p.id == visit?.patient_id);
                                        const queueItem = queue.find(q => q.visit_id == consultation.visit_id && q.department === 'doctor');
                                        const status = queueItem?.status === 'completed' ? 'Completed' : 
                                                     queueItem?.status === 'pending' ? 'In Progress' : 'In Progress';
                                        
                                        return (
                                            <tr key={consultation.id}>
                                                <td>{patient?.name || 'Unknown'}</td>
                                                <td>{new Date(consultation.created_date).toLocaleDateString()}</td>
                                                <td>
                                                    {(() => {
                                                        // Extract chief complaint from notes
                                                        const notes = consultation.notes || '';
                                                        const match = notes.match(/Chief Complaint:\s*(.+?)(?:\n|$)/);
                                                        const chiefComplaint = match ? match[1].trim() : (notes.substring(0, 50) || 'N/A');
                                                        return chiefComplaint.length > 50 ? chiefComplaint.substring(0, 50) + '...' : chiefComplaint;
                                                    })()}
                                                </td>
                                                <td>
                                                    {(consultation.diagnosis || 'Not specified').substring(0, 30)}
                                                    {consultation.diagnosis && consultation.diagnosis.length > 30 ? '...' : ''}
                                                </td>
                                                <td>
                                                    <span className={`badge ${status === 'Completed' ? 'bg-success' : 'bg-info'}`}>
                                                        {status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button 
                                                        className="btn btn-sm btn-info" 
                                                        onClick={() => viewConsultationDetails(consultation.id)}
                                                    >
                                                        <i className="fas fa-eye"></i> View
                                                    </button>
                                                    {status !== 'Completed' && patient && (
                                                        <button 
                                                            className="btn btn-sm btn-warning ms-2" 
                                                            onClick={() => editConsultation(consultation.visit_id, patient.id)}
                                                        >
                                                            <i className="fas fa-edit"></i> Edit
                                                        </button>
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

            {/* Consultation Details Modal - Outside the card */}
            {showDetailsModal && consultationDetails && (
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
                        zIndex: 9999
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowDetailsModal(false);
                            setConsultationDetails(null);
                        }
                    }}
                >
                    <div className="modal-dialog modal-lg modal-dialog-centered" style={{ animation: 'fadeIn 0.3s ease' }}>
                        <div className="modal-content" style={{ 
                            borderRadius: '20px',
                            border: 'none',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                            overflow: 'hidden'
                        }}>
                            {/* Beautiful Gradient Header */}
                            <div style={{
                                background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                                color: 'white',
                                padding: '25px 30px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    top: '-50%',
                                    right: '-50%',
                                    width: '200%',
                                    height: '200%',
                                    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                                    pointerEvents: 'none'
                                }}></div>
                                <div className="d-flex justify-content-between align-items-center" style={{ position: 'relative', zIndex: 1 }}>
                                    <h4 className="mb-0" style={{ 
                                        fontWeight: '600',
                                        fontSize: '1.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        <i className="fas fa-clipboard-list" style={{ fontSize: '1.3rem' }}></i>
                                        Consultation Details
                                    </h4>
                                    <button 
                                        type="button" 
                                        className="btn-close btn-close-white" 
                                        onClick={() => {
                                            setShowDetailsModal(false);
                                            setConsultationDetails(null);
                                        }}
                                        style={{ fontSize: '1.2rem' }}
                                    ></button>
                                </div>
                            </div>

                            {/* Patient Info Card */}
                            <div style={{ 
                                padding: '25px 30px',
                                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                borderBottom: '2px solid #dee2e6'
                            }}>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div style={{
                                            background: 'white',
                                            padding: '15px 20px',
                                            borderRadius: '12px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                            borderLeft: '4px solid #3498db'
                                        }}>
                                            <div style={{ 
                                                fontSize: '0.85rem',
                                                color: '#6c757d',
                                                fontWeight: '600',
                                                marginBottom: '8px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                <i className="fas fa-user me-2" style={{ color: '#3498db' }}></i>
                                                Patient
                                            </div>
                                            <div style={{ 
                                                fontSize: '1.1rem',
                                                color: '#2c3e50',
                                                fontWeight: '600'
                                            }}>
                                                {consultationDetails.patient.name}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div style={{
                                            background: 'white',
                                            padding: '15px 20px',
                                            borderRadius: '12px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                            borderLeft: '4px solid #27ae60'
                                        }}>
                                            <div style={{ 
                                                fontSize: '0.85rem',
                                                color: '#6c757d',
                                                fontWeight: '600',
                                                marginBottom: '8px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                <i className="fas fa-calendar me-2" style={{ color: '#27ae60' }}></i>
                                                Date
                                            </div>
                                            <div style={{ 
                                                fontSize: '1.1rem',
                                                color: '#2c3e50',
                                                fontWeight: '600'
                                            }}>
                                                {new Date(consultationDetails.consultation.created_date).toLocaleDateString('en-US', { 
                                                    year: 'numeric', 
                                                    month: 'long', 
                                                    day: 'numeric' 
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content */}
                            <div className="modal-body" style={{ padding: '30px', background: '#ffffff' }}>
                                {/* Chief Complaint */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%)',
                                    padding: '20px',
                                    borderRadius: '15px',
                                    marginBottom: '20px',
                                    borderLeft: '5px solid #e74c3c',
                                    boxShadow: '0 4px 12px rgba(231, 76, 60, 0.1)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginBottom: '12px',
                                        gap: '10px'
                                    }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontSize: '1.1rem'
                                        }}>
                                            <i className="fas fa-comment-medical"></i>
                                        </div>
                                        <h6 style={{ 
                                            margin: 0,
                                            color: '#c0392b',
                                            fontWeight: '700',
                                            fontSize: '1rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            Chief Complaint
                                        </h6>
                                    </div>
                                    <p style={{ 
                                        margin: 0,
                                        color: '#2c3e50',
                                        fontSize: '1rem',
                                        lineHeight: '1.6',
                                        paddingLeft: '50px'
                                    }}>
                                        {consultationDetails.consultation.chief_complaint || <span style={{ color: '#95a5a6', fontStyle: 'italic' }}>Not specified</span>}
                                    </p>
                                </div>

                                {/* Diagnosis */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                                    padding: '20px',
                                    borderRadius: '15px',
                                    marginBottom: '20px',
                                    borderLeft: '5px solid #3498db',
                                    boxShadow: '0 4px 12px rgba(52, 152, 219, 0.1)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginBottom: '12px',
                                        gap: '10px'
                                    }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontSize: '1.1rem'
                                        }}>
                                            <i className="fas fa-stethoscope"></i>
                                        </div>
                                        <h6 style={{ 
                                            margin: 0,
                                            color: '#2980b9',
                                            fontWeight: '700',
                                            fontSize: '1rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            Diagnosis
                                        </h6>
                                    </div>
                                    <p style={{ 
                                        margin: 0,
                                        color: '#2c3e50',
                                        fontSize: '1rem',
                                        lineHeight: '1.6',
                                        paddingLeft: '50px',
                                        fontWeight: '500'
                                    }}>
                                        {consultationDetails.consultation.diagnosis || <span style={{ color: '#95a5a6', fontStyle: 'italic' }}>Not specified</span>}
                                    </p>
                                </div>

                                {/* Treatment Plan */}
                                <div style={{
                                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                    padding: '20px',
                                    borderRadius: '15px',
                                    marginBottom: '20px',
                                    borderLeft: '5px solid #27ae60',
                                    boxShadow: '0 4px 12px rgba(39, 174, 96, 0.1)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginBottom: '12px',
                                        gap: '10px'
                                    }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontSize: '1.1rem'
                                        }}>
                                            <i className="fas fa-prescription-bottle-alt"></i>
                                        </div>
                                        <h6 style={{ 
                                            margin: 0,
                                            color: '#229954',
                                            fontWeight: '700',
                                            fontSize: '1rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                        }}>
                                            Treatment Plan
                                        </h6>
                                    </div>
                                    <p style={{ 
                                        margin: 0,
                                        color: '#2c3e50',
                                        fontSize: '1rem',
                                        lineHeight: '1.6',
                                        paddingLeft: '50px'
                                    }}>
                                        {consultationDetails.consultation.plan || <span style={{ color: '#95a5a6', fontStyle: 'italic' }}>Not specified</span>}
                                    </p>
                                </div>

                                {/* Notes */}
                                {consultationDetails.consultation.notes && (
                                    <div style={{
                                        background: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                                        padding: '20px',
                                        borderRadius: '15px',
                                        marginBottom: '20px',
                                        borderLeft: '5px solid #f59e0b',
                                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            marginBottom: '12px',
                                            gap: '10px'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '1.1rem'
                                            }}>
                                                <i className="fas fa-notes-medical"></i>
                                            </div>
                                            <h6 style={{ 
                                                margin: 0,
                                                color: '#d97706',
                                                fontWeight: '700',
                                                fontSize: '1rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                Clinical Notes
                                            </h6>
                                        </div>
                                        <div style={{ 
                                            margin: 0,
                                            color: '#2c3e50',
                                            fontSize: '0.95rem',
                                            lineHeight: '1.8',
                                            paddingLeft: '50px',
                                            whiteSpace: 'pre-wrap',
                                            background: 'white',
                                            padding: '15px',
                                            borderRadius: '8px',
                                            border: '1px solid #fde68a'
                                        }}>
                                            {consultationDetails.consultation.notes}
                                        </div>
                                    </div>
                                )}

                                {/* Lab Request */}
                                {consultationDetails.labRequest && (
                                    <div style={{
                                        background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                                        padding: '20px',
                                        borderRadius: '15px',
                                        marginBottom: '20px',
                                        borderLeft: '5px solid #9b59b6',
                                        boxShadow: '0 4px 12px rgba(155, 89, 182, 0.1)'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            marginBottom: '12px',
                                            gap: '10px'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '1.1rem'
                                            }}>
                                                <i className="fas fa-vial"></i>
                                            </div>
                                            <h6 style={{ 
                                                margin: 0,
                                                color: '#8e44ad',
                                                fontWeight: '700',
                                                fontSize: '1rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                Laboratory Tests
                                            </h6>
                                        </div>
                                        <div style={{ paddingLeft: '50px' }}>
                                            <p style={{ 
                                                margin: '0 0 15px 0',
                                                color: '#2c3e50',
                                                fontSize: '1rem',
                                                lineHeight: '1.6'
                                            }}>
                                                <strong>Test Name:</strong> {getRequestedTestsString(consultationDetails.labRequest) || <span style={{ color: '#95a5a6', fontStyle: 'italic' }}>Not specified</span>}
                                            </p>
                                            {consultationDetails.labRequest.results && (
                                                <div style={{
                                                    background: 'white',
                                                    padding: '15px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #ddd6fe'
                                                }}>
                                                    <strong style={{ color: '#8e44ad', display: 'block', marginBottom: '8px' }}>
                                                        <i className="fas fa-file-medical me-2"></i>Results:
                                                    </strong>
                                                    <div>
                                                        {consultationDetails.labRequest.results.split('\n').map((line, index) => {
                                                            if (!line.trim()) return null;
                                                            
                                                            // Check if line contains image
                                                            const imageMatch = line.match(/^(.+?)\s*=\s*\[IMAGE:(.+)\]$/);
                                                            if (imageMatch) {
                                                                const testName = imageMatch[1].trim();
                                                                const imageData = imageMatch[2];
                                                                return (
                                                                    <div key={index} style={{ marginBottom: '15px' }}>
                                                                        <strong style={{ color: '#2c3e50', display: 'block', marginBottom: '8px' }}>
                                                                            {testName}:
                                                                        </strong>
                                                                        <img 
                                                                            src={imageData} 
                                                                            alt={`${testName} result`}
                                                                            style={{
                                                                                maxWidth: '100%',
                                                                                maxHeight: '400px',
                                                                                borderRadius: '8px',
                                                                                border: '2px solid #ddd',
                                                                                objectFit: 'contain',
                                                                                cursor: 'pointer',
                                                                                display: 'block'
                                                                            }}
                                                                            onClick={() => {
                                                                                const newWindow = window.open();
                                                                                newWindow.document.write(`
                                                                                    <html>
                                                                                        <head><title>${testName} - Lab Result</title></head>
                                                                                        <body style="margin:0;padding:20px;text-align:center;background:#f5f5f5;">
                                                                                            <h2>${testName}</h2>
                                                                                            <img src="${imageData}" style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 4px 8px rgba(0,0,0,0.1);" />
                                                                                        </body>
                                                                                    </html>
                                                                                `);
                                                                            }}
                                                                        />
                                                                        <small style={{ color: '#7f8c8d', display: 'block', marginTop: '5px' }}>
                                                                            <i className="fas fa-info-circle"></i> Click image to view full size
                                                                        </small>
                                                                    </div>
                                                                );
                                                            } else {
                                                                return (
                                                                    <p key={index} style={{ 
                                                                        margin: 0,
                                                                        marginBottom: '8px',
                                                                        color: '#2c3e50',
                                                                        fontSize: '0.95rem',
                                                                        lineHeight: '1.8'
                                                                    }}>
                                                                        {line}
                                                                    </p>
                                                                );
                                                            }
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Prescription */}
                                {consultationDetails.prescription && (
                                    <div style={{
                                        background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
                                        padding: '20px',
                                        borderRadius: '15px',
                                        marginBottom: '20px',
                                        borderLeft: '5px solid #e91e63',
                                        boxShadow: '0 4px 12px rgba(233, 30, 99, 0.1)'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            marginBottom: '12px',
                                            gap: '10px'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                background: 'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: '1.1rem'
                                            }}>
                                                <i className="fas fa-pills"></i>
                                            </div>
                                            <h6 style={{ 
                                                margin: 0,
                                                color: '#c2185b',
                                                fontWeight: '700',
                                                fontSize: '1rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px'
                                            }}>
                                                Prescription
                                            </h6>
                                        </div>
                                        <p style={{ 
                                            margin: 0,
                                            color: '#2c3e50',
                                            fontSize: '1rem',
                                            lineHeight: '1.6',
                                            paddingLeft: '50px',
                                            background: 'white',
                                            padding: '15px',
                                            borderRadius: '8px',
                                            border: '1px solid #fbcfe8'
                                        }}>
                                            {consultationDetails.prescription.medication || <span style={{ color: '#95a5a6', fontStyle: 'italic' }}>Not specified</span>}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="modal-footer" style={{
                                padding: '20px 30px',
                                background: '#f8f9fa',
                                borderTop: '1px solid #dee2e6',
                                borderRadius: '0 0 20px 20px'
                            }}>
                                <button 
                                    type="button" 
                                    className="btn btn-primary" 
                                    onClick={() => {
                                        setShowDetailsModal(false);
                                        setConsultationDetails(null);
                                    }}
                                    style={{
                                        background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '12px 30px',
                                        fontWeight: '600',
                                        fontSize: '1rem',
                                        boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.target.style.transform = 'translateY(-2px)';
                                        e.target.style.boxShadow = '0 6px 16px rgba(52, 152, 219, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.target.style.transform = 'translateY(0)';
                                        e.target.style.boxShadow = '0 4px 12px rgba(52, 152, 219, 0.3)';
                                    }}
                                >
                                    <i className="fas fa-check me-2"></i>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default Consultations;
