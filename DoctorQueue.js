import React, { useState, useEffect } from 'react';
import Consultation from './Consultation';
import { getRequestedTestsString } from '../utils/labRequestHelpers';

function DoctorQueue({ currentUser, db, setActiveView }) {
    const [queue, setQueue] = useState([]);
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [queueData, setQueueData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showLabResultsModal, setShowLabResultsModal] = useState(false);
    const [labResultsData, setLabResultsData] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [patientToRemove, setPatientToRemove] = useState(null);
    const [labRequests, setLabRequests] = useState([]);

    const getBestLabRequestForVisit = (visitId, requests) => {
        const visitRequests = (requests || []).filter(r => r.visit_id == visitId);
        if (visitRequests.length === 0) {
            return null;
        }

        return visitRequests.sort((a, b) => {
            const aHasResults = Boolean(a?.results && String(a.results).trim());
            const bHasResults = Boolean(b?.results && String(b.results).trim());
            if (aHasResults !== bHasResults) {
                return bHasResults ? 1 : -1;
            }

            const aCompleted = a?.status === 'completed';
            const bCompleted = b?.status === 'completed';
            if (aCompleted !== bCompleted) {
                return bCompleted ? 1 : -1;
            }

            const aCompletedDate = a?.completed_date ? new Date(a.completed_date).getTime() : 0;
            const bCompletedDate = b?.completed_date ? new Date(b.completed_date).getTime() : 0;
            if (aCompletedDate !== bCompletedDate) {
                return bCompletedDate - aCompletedDate;
            }

            return (Number(b?.id) || 0) - (Number(a?.id) || 0);
        })[0];
    };

    useEffect(() => {
        const loadInitialData = async () => {
            await loadQueue();
            
            const selectedVisitId = sessionStorage.getItem('selectedVisitId');
            const selectedPatientId = sessionStorage.getItem('selectedPatientId');
            if (selectedVisitId && selectedPatientId) {
                try {
                    const [visit, patient] = await Promise.all([
                        db.getById('visits', parseInt(selectedVisitId)),
                        db.getById('patients', parseInt(selectedPatientId))
                    ]);
                    if (visit && patient) {
                        startConsultation(visit.id, patient.id);
                    }
                    sessionStorage.removeItem('selectedVisitId');
                    sessionStorage.removeItem('selectedPatientId');
                } catch (err) {
                    console.error('Error loading selected visit/patient:', err);
                }
            }
        };
        loadInitialData();
    }, []);

    const loadQueue = async () => {
        try {
            setLoading(true);
            const [queueItems, allLabRequests] = await Promise.all([
                db.getQueueForDepartment('doctor'),
                db.getAll('lab_requests')
            ]);
            setQueue(queueItems);
            setLabRequests(allLabRequests || []);
            
            // Also load all queue data for status checking
            const allQueue = await db.getAll('queue');
            setQueueData(allQueue);
        } catch (err) {
            console.error('Error loading queue:', err);
        } finally {
            setLoading(false);
        }
    };

    const startConsultation = (visitId, patientId) => {
        setSelectedVisit(visitId);
        setSelectedPatient(patientId);
    };

    const continueConsultation = (visitId, patientId) => {
        setSelectedVisit(visitId);
        setSelectedPatient(patientId);
    };

    const checkLabResults = async (visitId) => {
        try {
            const [singleLabRequest, allLabRequests] = await Promise.all([
                db.getLabRequestByVisitId(visitId),
                db.getAll('lab_requests')
            ]);
            const bestFromAll = getBestLabRequestForVisit(visitId, allLabRequests);
            const labRequest = bestFromAll?.results ? bestFromAll : singleLabRequest;
            
            if (labRequest?.results) {
                setLabResultsData(labRequest);
                setShowLabResultsModal(true);
            } else {
                alert('Laboratory results are not available yet.');
            }
        } catch (err) {
            console.error('Error checking lab results:', err);
            alert('Error checking lab results. Please try again.');
        }
    };

    const handleBackToQueue = async () => {
        setSelectedVisit(null);
        setSelectedPatient(null);
        await loadQueue();
    };

    const handleRemoveFromQueue = (visitId, patientName) => {
        setPatientToRemove({ visitId, patientName });
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!patientToRemove) return;

        try {
            // Find and delete the queue item
            const allQueue = await db.getAll('queue');
            const queueItem = allQueue.find(q => q.visit_id === patientToRemove.visitId && q.department === 'doctor');
            
            if (queueItem) {
                await db.delete('queue', queueItem.id);
                alert(`${patientToRemove.patientName} has been removed from the doctor queue.`);
                setShowDeleteModal(false);
                setPatientToRemove(null);
                await loadQueue();
            } else {
                alert('Queue item not found.');
                setShowDeleteModal(false);
                setPatientToRemove(null);
            }
        } catch (err) {
            console.error('Error removing from queue:', err);
            alert('Error removing patient from queue. Please try again.');
            setShowDeleteModal(false);
            setPatientToRemove(null);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setPatientToRemove(null);
    };

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <i className="fas fa-users"></i> Doctor Queue
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
                onBack={handleBackToQueue}
            />
        );
    }

    return (
        <>
            <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <i className="fas fa-users"></i> Doctor Queue
                        <span className="badge bg-danger ms-2">{queue.length} Waiting</span>
                    </div>
                    <div className="d-flex gap-2">
                        <button className="btn btn-primary" onClick={() => setActiveView('patientList')}>
                            <i className="fas fa-list"></i> Select from Patient List
                        </button>
                    </div>
                </div>
                <div className="card-body">
                    {queue.length === 0 ? (
                        <p className="text-muted">No patients in queue.</p>
                    ) : (
                        queue.map(item => {
                            const patient = item.patient;
                            const visit = item.visit;
                            const consultation = item.consultation;
                            const queueItem = queueData.find(q => q.visit_id == visit?.id && q.department === 'doctor');
                            const labRequest = getBestLabRequestForVisit(visit?.id, labRequests);
                            const hasLabResults = Boolean(labRequest?.results && String(labRequest.results).trim());
                            
                            let statusText = 'New';
                            let statusClass = 'status-waiting';
                            
                            if (consultation) {
                                if (hasLabResults) {
                                    statusText = 'Results Ready';
                                    statusClass = 'status-results';
                                } else if (queueItem?.status === 'pending') {
                                    statusText = 'Awaiting Results';
                                    statusClass = 'status-results';
                                } else {
                                    statusText = 'In Progress';
                                    statusClass = 'status-inprogress';
                                }
                            }
                            
                            return (
                                <div key={visit?.id} className="patient-queue">
                                    {hasLabResults && (
                                        <div
                                            className="alert alert-success d-flex justify-content-between align-items-center mb-3"
                                            style={{ borderRadius: '10px' }}
                                        >
                                            <div>
                                                <i className="fas fa-check-circle me-2"></i>
                                                <strong>Lab results are ready for this patient</strong>
                                            </div>
                                            <button
                                                className="btn btn-sm btn-success"
                                                onClick={() => checkLabResults(visit.id)}
                                            >
                                                <i className="fas fa-eye me-1"></i> View Results
                                            </button>
                                        </div>
                                    )}
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div style={{ flexGrow: 1 }}>
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <h5>{patient?.name || 'Unknown Patient'}</h5>
                                                    <p className="mb-1">
                                                        <i className="fas fa-phone"></i> {patient?.mobile || 'N/A'} | 
                                                        <i className="fas fa-key"></i> <code>{patient?.password || 'N/A'}</code> | 
                                                        <i className="fas fa-user"></i> {patient?.sex || 'N/A'}, {patient?.age || 'N/A'} yrs
                                                    </p>
                                                    <p className="mb-0">
                                                        <strong>Vitals:</strong> BP: {visit?.bp || 'N/A'}, 
                                                        PR: {visit?.pulse || 'N/A'}, 
                                                        Temp: {visit?.temp || 'N/A'}°C
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className={`queue-status ${statusClass}`}>{statusText}</span>
                                                </div>
                                            </div>
                                            {consultation && (
                                                <div className="mt-2">
                                                    <p className="mb-1"><strong>Previous Consultation:</strong></p>
                                                    <p className="mb-0 text-muted">
                                                        {(consultation.notes || consultation.diagnosis || '').substring(0, 100)}
                                                        {(consultation.notes || consultation.diagnosis || '').length > 100 ? '...' : ''}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="ms-3 d-flex gap-2 align-items-start">
                                            {!consultation ? (
                                                <button 
                                                    className="btn btn-primary" 
                                                    onClick={() => startConsultation(visit.id, patient.id)}
                                                >
                                                    <i className="fas fa-stethoscope"></i> Start Consultation
                                                </button>
                                            ) : (
                                                <div className="d-flex flex-column gap-2">
                                                    <button 
                                                        className="btn btn-success" 
                                                        onClick={() => continueConsultation(visit.id, patient.id)}
                                                    >
                                                        <i className="fas fa-edit"></i> Continue
                                                    </button>
                                                    {(queueItem?.status === 'pending' || hasLabResults) && (
                                                        <button 
                                                            className="btn btn-info" 
                                                            onClick={() => checkLabResults(visit.id)}
                                                        >
                                                            <i className="fas fa-flask"></i> {hasLabResults ? 'View Results' : 'Check Results'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            <button 
                                                className="btn btn-danger" 
                                                onClick={() => handleRemoveFromQueue(visit.id, patient.name)}
                                                title="Remove from queue"
                                            >
                                                <i className="fas fa-trash"></i> Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Lab Results Modal */}
                {showLabResultsModal && labResultsData && (
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
                                setShowLabResultsModal(false);
                                setLabResultsData(null);
                            }
                        }}
                    >
                        <div className="modal-dialog modal-dialog-centered modal-lg" style={{ animation: 'fadeIn 0.3s ease' }}>
                            <div className="modal-content" style={{ 
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                            }}>
                                <div className="modal-header border-0 pb-0" style={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    borderRadius: '12px 12px 0 0',
                                    padding: '20px 24px'
                                }}>
                                    <h5 className="modal-title text-white mb-0">
                                        <i className="fas fa-flask me-2"></i>
                                        Laboratory Results
                                    </h5>
                                    <button 
                                        type="button" 
                                        className="btn-close btn-close-white" 
                                        onClick={() => {
                                            setShowLabResultsModal(false);
                                            setLabResultsData(null);
                                        }}
                                    ></button>
                                </div>
                                <div className="modal-body" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                                    {getRequestedTestsString(labResultsData) && (
                                        <div className="mb-3">
                                            <strong>Test Name:</strong> {getRequestedTestsString(labResultsData)}
                                        </div>
                                    )}
                                    {labResultsData.results && (
                                        <div>
                                            <strong className="mb-2 d-block">Results:</strong>
                                            {labResultsData.results.split('\n').map((line, index) => {
                                                if (!line.trim()) return null;
                                                
                                                const imageMatch = line.match(/^(.+?)\s*=\s*\[IMAGE:(.+)\]$/);
                                                if (imageMatch) {
                                                    const testName = imageMatch[1].trim();
                                                    const imageData = imageMatch[2];
                                                    return (
                                                        <div key={index} className="mb-4">
                                                            <strong style={{ color: '#2c3e50', display: 'block', marginBottom: '10px' }}>
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
                                                            <small className="text-muted d-block mt-2">
                                                                <i className="fas fa-info-circle"></i> Click image to view full size
                                                            </small>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <p key={index} style={{ 
                                                            marginBottom: '10px',
                                                            color: '#2c3e50',
                                                            fontSize: '0.95rem',
                                                            lineHeight: '1.6'
                                                        }}>
                                                            {line}
                                                        </p>
                                                    );
                                                }
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer border-0" style={{ padding: '0 24px 24px' }}>
                                    <button 
                                        type="button" 
                                        className="btn btn-primary px-4"
                                        onClick={() => {
                                            setShowLabResultsModal(false);
                                            setLabResultsData(null);
                                        }}
                                        style={{
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '10px 30px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal - Outside Card Container */}
            {showDeleteModal && patientToRemove && (
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
                            handleDeleteCancel();
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
                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                    borderRadius: '12px 12px 0 0',
                                    padding: '20px 24px'
                                }}
                            >
                                <h5 className="modal-title text-white mb-0">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    Remove from Queue
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={handleDeleteCancel}
                                ></button>
                            </div>
                            <div
                                className="modal-body"
                                style={{ padding: '24px' }}
                            >
                                <p style={{ marginBottom: '15px', color: '#2c3e50', fontSize: '1rem' }}>
                                    Are you sure you want to remove <strong>{patientToRemove.patientName}</strong> from the doctor queue?
                                </p>
                                <div className="alert alert-warning mb-0" style={{ borderRadius: '8px', fontSize: '0.9rem' }}>
                                    <i className="fas fa-exclamation-circle me-2"></i>
                                    This action cannot be undone.
                                </div>
                            </div>
                            <div
                                className="modal-footer border-0"
                                style={{ padding: '0 24px 24px' }}
                            >
                                <button
                                    type="button"
                                    className="btn btn-secondary px-4"
                                    onClick={handleDeleteCancel}
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
                                    className="btn btn-danger px-4"
                                    onClick={handleDeleteConfirm}
                                    style={{
                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '10px 30px',
                                        fontWeight: '500'
                                    }}
                                >
                                    <i className="fas fa-trash me-2"></i>
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default DoctorQueue;
