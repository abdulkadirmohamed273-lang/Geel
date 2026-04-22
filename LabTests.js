import React, { useState, useEffect } from 'react';
import { getRequestedTestsString } from '../utils/labRequestHelpers';

function LabTests({ currentUser, db, setActiveView }) {
    const [labRequests, setLabRequests] = useState([]);
    const [visits, setVisits] = useState([]);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showResultsModal, setShowResultsModal] = useState(false);
    const [selectedResult, setSelectedResult] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackSuccess, setFeedbackSuccess] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [labRequestsData, visitsData, patientsData] = await Promise.all([
                db.getAll('lab_requests'),
                db.getAll('visits'),
                db.getAll('patients')
            ]);
            
            setLabRequests(labRequestsData);
            setVisits(visitsData);
            setPatients(patientsData);
        } catch (err) {
            console.error('Error loading lab tests:', err);
        } finally {
            setLoading(false);
        }
    };

    const openDeleteModal = (request, patientName) => {
        setPendingDelete({
            id: request.id,
            visit_id: request.visit_id,
            test_name: getRequestedTestsString(request),
            patientName: patientName || 'Unknown'
        });
        setShowDeleteModal(true);
    };

    const handleConfirmDeleteLabTest = async () => {
        if (!pendingDelete || isDeleting) return;
        setIsDeleting(true);
        try {
            await db.deleteLabRequestsForVisit(pendingDelete.visit_id);
            await db.deleteLabQueueForVisit(pendingDelete.visit_id);
            setShowDeleteModal(false);
            setPendingDelete(null);
            await loadData();
            setFeedbackMessage('Lab test deleted successfully.');
            setFeedbackSuccess(true);
            setShowFeedbackModal(true);
        } catch (err) {
            console.error('Error deleting lab test:', err);
            setFeedbackMessage(err?.message || 'Could not delete lab test. Please try again.');
            setFeedbackSuccess(false);
            setShowFeedbackModal(true);
            setShowDeleteModal(false);
            setPendingDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <i className="fas fa-flask"></i> All Lab Tests
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
        <>
            <div className="card">
                <div className="card-header">
                    <i className="fas fa-flask"></i> All Lab Tests
                    <span className="badge bg-primary ms-2">{labRequests.length} Total</span>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                    <th>Patient</th>
                                    <th>Date</th>
                                    <th>Tests</th>
                                    <th>Results</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {labRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center text-muted">No lab tests found</td>
                                    </tr>
                                ) : (
                                    labRequests.map(request => {
                                        const visit = visits.find(v => v.id == request.visit_id);
                                        const patient = patients.find(p => p.id == visit?.patient_id);
                                        
                                        return (
                                            <tr key={request.id}>
                                                <td>{patient?.name || 'Unknown'}</td>
                                                <td>{new Date(request.created_date).toLocaleDateString()}</td>
                                                <td>{getRequestedTestsString(request) || 'N/A'}</td>
                                                <td>
                                                    {request.results ? (
                                                        <button 
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => {
                                                                setSelectedResult(request);
                                                                setShowResultsModal(true);
                                                            }}
                                                        >
                                                            <i className="fas fa-file-alt me-1"></i>
                                                            View Results
                                                        </button>
                                                    ) : (
                                                        'Pending'
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`badge ${request.status === 'completed' ? 'bg-success' : 'bg-warning'}`}>
                                                        {request.status || 'pending'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger"
                                                        title="Delete this lab test order"
                                                        onClick={() => openDeleteModal(request, patient?.name)}
                                                    >
                                                        <i className="fas fa-trash me-1"></i>
                                                        Delete
                                                    </button>
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

            {/* Results Modal with Image Support - Outside the card */}
            {showResultsModal && selectedResult && (
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
                            setShowResultsModal(false);
                            setSelectedResult(null);
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
                                        setShowResultsModal(false);
                                        setSelectedResult(null);
                                    }}
                                ></button>
                            </div>
                            <div className="modal-body" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
                                {getRequestedTestsString(selectedResult) && (
                                    <div className="mb-3">
                                        <strong>Test Name:</strong> {getRequestedTestsString(selectedResult)}
                                    </div>
                                )}
                                {selectedResult.results && (
                                    <div>
                                        <strong className="mb-2 d-block">Results:</strong>
                                        {selectedResult.results.split('\n').map((line, index) => {
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
                                        setShowResultsModal(false);
                                        setSelectedResult(null);
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

            {/* Delete confirmation */}
            {showDeleteModal && pendingDelete && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 10000
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !isDeleting) {
                            setShowDeleteModal(false);
                            setPendingDelete(null);
                        }
                    }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content" style={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                        }}>
                            <div className="modal-header border-0 pb-0" style={{
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                borderRadius: '12px 12px 0 0',
                                padding: '20px 24px'
                            }}>
                                <h5 className="modal-title text-white mb-0">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    Delete lab test
                                </h5>
                            </div>
                            <div className="modal-body" style={{ padding: '24px' }}>
                                <p className="mb-2" style={{ fontSize: '16px', color: '#333' }}>
                                    Delete lab test for <strong>{pendingDelete.patientName}</strong>?
                                </p>
                                <p className="mb-0 text-muted small">
                                    Tests: {pendingDelete.test_name || 'N/A'}. This removes the lab order and clears the lab queue for this visit if still pending.
                                </p>
                            </div>
                            <div className="modal-footer border-0" style={{ padding: '0 24px 24px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    disabled={isDeleting}
                                    onClick={() => {
                                        if (!isDeleting) {
                                            setShowDeleteModal(false);
                                            setPendingDelete(null);
                                        }
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    disabled={isDeleting}
                                    onClick={handleConfirmDeleteLabTest}
                                >
                                    <i className="fas fa-trash me-2"></i>
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback after delete */}
            {showFeedbackModal && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 10001
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowFeedbackModal(false);
                        }
                    }}
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content" style={{
                            borderRadius: '12px',
                            border: 'none',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                        }}>
                            <div className="modal-header border-0 pb-0" style={{
                                background: feedbackSuccess
                                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                borderRadius: '12px 12px 0 0',
                                padding: '20px 24px'
                            }}>
                                <h5 className="modal-title text-white mb-0">
                                    <i className={`fas ${feedbackSuccess ? 'fa-check-circle' : 'fa-exclamation-triangle'} me-2`}></i>
                                    {feedbackSuccess ? 'Done' : 'Notice'}
                                </h5>
                            </div>
                            <div className="modal-body text-center py-4" style={{ padding: '24px' }}>
                                <p className="mb-0" style={{ fontSize: '16px', color: '#333' }}>
                                    {feedbackMessage}
                                </p>
                            </div>
                            <div className="modal-footer border-0 justify-content-center pt-0" style={{ padding: '0 24px 24px' }}>
                                <button
                                    type="button"
                                    className="btn btn-primary px-5"
                                    onClick={() => setShowFeedbackModal(false)}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default LabTests;
