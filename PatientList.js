import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function PatientList({ currentUser, currentRole, db, setActiveView }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [patients, setPatients] = useState([]);
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copiedPatientId, setCopiedPatientId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [patientToDelete, setPatientToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        filterPatients();
    }, [searchTerm]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [allPatients, allVisits] = await Promise.all([
                db.getAll('patients'),
                db.getAll('visits')
            ]);
            setPatients(allPatients);
            setVisits(allVisits);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const filterPatients = async () => {
        try {
            const allPatients = await db.getAll('patients');
            if (!searchTerm) {
                setPatients(allPatients);
            } else {
                const filtered = allPatients.filter(p => 
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    p.mobile.includes(searchTerm)
                );
                setPatients(filtered);
            }
        } catch (err) {
            console.error('Error filtering patients:', err);
        }
    };

    const createVisitForPatient = (patientId) => {
        setActiveView('createVisit');
        // Store patient ID in sessionStorage for CreateVisit component
        sessionStorage.setItem('selectedPatientId', patientId);
    };

    const recordPaymentForPatient = (patientId) => {
        setActiveView('financial');
        sessionStorage.setItem('selectedPatientId', patientId);
    };

    const editConsultationFromPatientList = (visitId, patientId) => {
        setActiveView('doctorQueue');
        sessionStorage.setItem('selectedVisitId', visitId);
        sessionStorage.setItem('selectedPatientId', patientId);
    };

    const getPatientVisits = (patientId) => {
        return visits.filter(v => v.patient_id === patientId);
    };

    const copyPatientLink = async (patientId) => {
        try {
            // Get the current origin (localhost in dev, production URL in prod)
            const baseUrl = window.location.origin;
            const patientLink = `${baseUrl}/patient/${patientId}`;
            
            // Copy to clipboard
            await navigator.clipboard.writeText(patientLink);
            
            // Show feedback
            setCopiedPatientId(patientId);
            setTimeout(() => {
                setCopiedPatientId(null);
            }, 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = `${window.location.origin}/patient/${patientId}`;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setCopiedPatientId(patientId);
                setTimeout(() => {
                    setCopiedPatientId(null);
                }, 2000);
            } catch (fallbackErr) {
                alert('Failed to copy link. Please copy manually: ' + `${window.location.origin}/patient/${patientId}`);
            }
            document.body.removeChild(textArea);
        }
    };

    const shareViaWhatsApp = (patientId, patientMobile, patientName) => {
        // Step 1: Generate the patient link
        const baseUrl = window.location.origin;
        const patientLink = `${baseUrl}/patient/${patientId}`;
        
        // Step 2: Convert patient's phone number to international format
        // Remove all non-digits first
        let cleanNumber = patientMobile.replace(/\D/g, '');
        
        // If number starts with 0, remove it and add country code 252 (Somalia)
        if (cleanNumber.startsWith('0')) {
            cleanNumber = '252' + cleanNumber.substring(1);
        }
        // If number doesn't have country code, add 252
        else if (!cleanNumber.startsWith('252')) {
            cleanNumber = '252' + cleanNumber;
        }
        
        // Step 3: Build message (from clinic number 2524026635)
        const message = `Hello ${patientName}, here is your link to view your medical information at Beergeel Clinic:

${patientLink}

Please save this link to access your records anytime.

*Beergeel Obstetrics and Gynecology Clinic*
Contact: 04026635`;
        
        // Step 4: Create WhatsApp link to patient's number (message is from clinic 2524026635)
        const whatsappLink = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
        
        // Step 5: Open WhatsApp
        window.open(whatsappLink, '_blank');
    };

    const handleDeleteClick = (patient) => {
        setPatientToDelete(patient);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!patientToDelete) return;
        
        try {
            setDeleting(true);
            const result = await db.delete('patients', patientToDelete.id);
            
            if (result === false) {
                throw new Error('Delete operation returned false. Check database permissions.');
            }
            
            // Remove patient from local state
            setPatients(patients.filter(p => p.id !== patientToDelete.id));
            
            // Close modal and reset state
            setShowDeleteModal(false);
            const deletedName = patientToDelete.name;
            setPatientToDelete(null);
            
            // Show success message
            alert(`Patient "${deletedName}" has been deleted successfully.`);
        } catch (err) {
            console.error('Error deleting patient:', err);
            const errorMessage = err.message || 'Unknown error occurred';
            alert(`Error deleting patient: ${errorMessage}\n\nPlease check:\n1. Database permissions (RLS policies)\n2. Console for detailed error information\n3. Ensure patient has no related records that prevent deletion`);
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setPatientToDelete(null);
    };

    const downloadPDF = () => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Header
            doc.setFillColor(41, 128, 185);
            doc.rect(0, 0, pageWidth, 40, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('Beergeel Obstetrics & Gynecology Clinic', pageWidth / 2, 15, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Xero awr kasoo horjeedka Ayuub Restaurant inyar ka xiga dhanka Masjid Nuur', pageWidth / 2, 23, { align: 'center' });
            doc.text('Contact: 04026635 (Mobile/WhatsApp)', pageWidth / 2, 30, { align: 'center' });

            // Reset text color
            doc.setTextColor(0, 0, 0);
            
            // Title
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Patient List Report', 14, 50);
            
            // Date
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 57);
            doc.text(`Total Patients: ${patients.length}`, 14, 63);
            doc.text(`Generated by: ${currentUser.name}`, 14, 69);

            // Prepare table data
            const tableData = patients.map(patient => {
                const patientVisits = getPatientVisits(patient.id);
                return [
                    patient.id,
                    patient.name,
                    patient.mobile,
                    patient.password,
                    `${patient.age} / ${patient.sex}`,
                    new Date(patient.created_date).toLocaleDateString(),
                    patientVisits.length
                ];
            });

            // Create table
            doc.autoTable({
                startY: 75,
                head: [['ID', 'Name', 'Mobile', 'Password', 'Age/Sex', 'Registered', 'Visits']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center'
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 3
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 15 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 30 },
                    3: { halign: 'center', cellWidth: 25 },
                    4: { halign: 'center', cellWidth: 25 },
                    5: { halign: 'center', cellWidth: 28 },
                    6: { halign: 'center', cellWidth: 20 }
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                }
            });

            // Footer
            const finalY = doc.lastAutoTable.finalY || 75;
            if (finalY < pageHeight - 30) {
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text('This is an official document from Beergeel Obstetrics and Gynecology Clinic', pageWidth / 2, pageHeight - 20, { align: 'center' });
                doc.text(`© ${new Date().getFullYear()} Beergeel Clinic. All rights reserved.`, pageWidth / 2, pageHeight - 15, { align: 'center' });
            }

            // Save the PDF
            const fileName = `Patient_List_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Error generating PDF. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <i className="fas fa-list"></i> Patient List
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
                <div className="card-header d-flex justify-content-between align-items-center">
                    <div>
                        <i className="fas fa-list"></i> Patient List
                        <span className="badge bg-primary ms-2">{patients.length} Patients</span>
                    </div>
                    <div className="d-flex gap-2">
                        <input 
                            type="text" 
                            className="form-control" 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by name or mobile" 
                            style={{ width: '250px' }}
                        />
                        <button 
                            className="btn btn-danger" 
                            onClick={downloadPDF}
                            title="Download Patient List as PDF"
                        >
                            <i className="fas fa-file-pdf"></i> Download PDF
                        </button>
                        {currentRole === 'reception' && (
                            <button className="btn btn-primary" onClick={() => setActiveView('registerPatient')}>
                                <i className="fas fa-user-plus"></i> Add Patient
                            </button>
                        )}
                    </div>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Mobile</th>
                                    <th>Password</th>
                                    <th>Age/Sex</th>
                                    <th>Registered Date</th>
                                    <th>Visits</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {patients.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center text-muted">No patients found</td>
                                    </tr>
                                ) : (
                                    patients.map(patient => {
                                        const patientVisits = getPatientVisits(patient.id);
                                        const latestVisit = patientVisits[patientVisits.length - 1];
                                        
                                        return (
                                            <tr key={patient.id}>
                                                <td>{patient.id}</td>
                                                <td>{patient.name}</td>
                                                <td>{patient.mobile}</td>
                                                <td><code>{patient.password}</code></td>
                                                <td>{patient.age} yrs / {patient.sex}</td>
                                                <td>{new Date(patient.created_date).toLocaleDateString()}</td>
                                                <td><span className="badge bg-info">{patientVisits.length}</span></td>
                                                <td>
                                                    <div className="btn-group" role="group">
                                                        {currentRole === 'reception' && (
                                                            <>
                                                                <button 
                                                                    className="btn btn-sm btn-primary" 
                                                                    onClick={() => createVisitForPatient(patient.id)}
                                                                    title="Create Visit"
                                                                >
                                                                    <i className="fas fa-stethoscope"></i> Visit
                                                                </button>
                                                                <button 
                                                                    className="btn btn-sm btn-success" 
                                                                    onClick={() => recordPaymentForPatient(patient.id)}
                                                                    title="Record Payment"
                                                                >
                                                                    <i className="fas fa-money-bill"></i> Payment
                                                                </button>
                                                                <button 
                                                                    className={`btn btn-sm ${copiedPatientId === patient.id ? 'btn-success' : 'btn-info'}`}
                                                                    onClick={() => copyPatientLink(patient.id)}
                                                                    title="Copy Patient Link"
                                                                >
                                                                    <i className={`fas ${copiedPatientId === patient.id ? 'fa-check' : 'fa-link'}`}></i> {copiedPatientId === patient.id ? 'Copied!' : 'Link'}
                                                                </button>
                                                                <button 
                                                                    className="btn btn-sm btn-outline-success" 
                                                                    onClick={() => shareViaWhatsApp(patient.id, patient.mobile, patient.name)}
                                                                    title="Share via WhatsApp"
                                                                >
                                                                    <i className="fab fa-whatsapp"></i> Share
                                                                </button>
                                                                <button 
                                                                    className="btn btn-sm btn-danger" 
                                                                    onClick={() => handleDeleteClick(patient)}
                                                                    title="Delete Patient"
                                                                >
                                                                    <i className="fas fa-trash"></i> Delete
                                                                </button>
                                                            </>
                                                        )}
                                                        {currentRole === 'doctor' && (
                                                            <>
                                                                {latestVisit && (
                                                                    <button 
                                                                        className="btn btn-sm btn-warning me-2" 
                                                                        onClick={() => editConsultationFromPatientList(latestVisit.id, patient.id)}
                                                                    >
                                                                        <i className="fas fa-edit"></i> Edit Consultation
                                                                    </button>
                                                                )}
                                                                <button 
                                                                    className="btn btn-sm btn-danger" 
                                                                    onClick={() => handleDeleteClick(patient)}
                                                                    title="Delete Patient"
                                                                >
                                                                    <i className="fas fa-trash"></i> Delete
                                                                </button>
                                                            </>
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

            {/* Delete Confirmation Modal - Outside the card */}
            {showDeleteModal && (
                <div className="modal-backdrop" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999
                }}>
                    <div className="modal-content" style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '30px',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        zIndex: 10000
                    }}>
                        <h5 style={{ marginBottom: '20px', color: '#d32f2f' }}>
                            <i className="fas fa-exclamation-triangle text-danger me-2"></i>
                            Confirm Delete Patient
                        </h5>
                        {patientToDelete && (
                            <div style={{ marginBottom: '25px' }}>
                                <p>Are you sure you want to delete this patient?</p>
                                <div style={{ 
                                    backgroundColor: '#f5f5f5', 
                                    padding: '15px', 
                                    borderRadius: '5px',
                                    marginTop: '10px'
                                }}>
                                    <strong>Name:</strong> {patientToDelete.name}<br />
                                    <strong>Mobile:</strong> {patientToDelete.mobile}<br />
                                    <strong>ID:</strong> {patientToDelete.id}
                                </div>
                                <p className="text-danger mt-3" style={{ fontSize: '14px' }}>
                                    <i className="fas fa-exclamation-circle me-1"></i>
                                    This action cannot be undone. All patient data will be permanently deleted.
                                </p>
                            </div>
                        )}
                        <div className="d-flex justify-content-end gap-2">
                            <button 
                                className="btn btn-secondary" 
                                onClick={handleDeleteCancel}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn btn-danger" 
                                onClick={handleDeleteConfirm}
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-trash me-2"></i>
                                        Delete Patient
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default PatientList;
