import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

function PatientHistory({ currentUser, db, setActiveView }) {
    const [visits, setVisits] = useState([]);
    const [consultations, setConsultations] = useState([]);
    const [labRequests, setLabRequests] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const patientVisits = await db.getPatientVisits(currentUser.id);
            const [allConsultations, allLabRequests, allPrescriptions] = await Promise.all([
                db.getAll('consultations'),
                db.getAll('lab_requests'),
                db.getAll('prescriptions')
            ]);
            
            setVisits(patientVisits);
            setConsultations(allConsultations);
            setLabRequests(allLabRequests);
            setPrescriptions(allPrescriptions);
        } catch (err) {
            console.error('Error loading patient history:', err);
        } finally {
            setLoading(false);
        }
    };

    const printSingleVisitReport = async (visitId) => {
        try {
            const [visit, allConsultations, allLabRequests, allPrescriptions] = await Promise.all([
                db.getById('visits', visitId),
                db.getAll('consultations'),
                db.getAll('lab_requests'),
                db.getAll('prescriptions')
            ]);
            
            const patient = currentUser;
            const consultation = allConsultations.find(c => c.visit_id == visitId);
            const labRequest = allLabRequests.find(l => l.visit_id == visitId);
            const prescription = allPrescriptions.find(p => p.visit_id == visitId);

            const reportContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Medical Report - ${patient.name}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                        .header h1 { color: #2c3e50; margin: 0; }
                        .section { margin-bottom: 30px; }
                        .section h2 { color: #3498db; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; }
                        .footer { margin-top: 50px; text-align: center; font-size: 0.9em; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Beergeel Obstetrics and Gynecology Clinic</h1>
                        <p>Xero awr kasoo horjeedka Ayuub Restaurant inyar ka xiga dhanka Masjid Nuur</p>
                        <p>Contact: 0634026635 (Mobile/WhatsApp)</p>
                    </div>
                    
                    <div class="section">
                        <h2>Patient Information</h2>
                        <table>
                            <tr><th>Name:</th><td>${patient.name}</td></tr>
                            <tr><th>Age/Sex:</th><td>${patient.age} years / ${patient.sex}</td></tr>
                            <tr><th>Mobile:</th><td>${patient.mobile}</td></tr>
                            <tr><th>Visit Date:</th><td>${new Date(visit.created_date).toLocaleDateString()}</td></tr>
                        </table>
                    </div>
                    
                    <div class="section">
                        <h2>Vital Signs</h2>
                        <table>
                            <tr>
                                <th>Blood Pressure</th>
                                <th>Pulse Rate</th>
                                <th>Temperature</th>
                                <th>Weight</th>
                            </tr>
                            <tr>
                                <td>${visit.bp || 'N/A'}</td>
                                <td>${visit.pulse || 'N/A'}</td>
                                <td>${visit.temp || 'N/A'}°C</td>
                                <td>${visit.weight || 'N/A'} kg</td>
                            </tr>
                        </table>
                    </div>
                    
                    ${consultation ? `
                    <div class="section">
                        <h2>Consultation</h2>
                        <table>
                            <tr><th>Diagnosis:</th><td>${consultation.diagnosis || 'N/A'}</td></tr>
                            <tr><th>Notes:</th><td>${consultation.notes || 'N/A'}</td></tr>
                        </table>
                    </div>
                    ` : ''}
                    
                    ${labRequest ? `
                    <div class="section">
                        <h2>Laboratory Tests</h2>
                        <p><strong>Test Name:</strong> ${labRequest.test_name || 'N/A'}</p>
                        ${labRequest.results ? `<p><strong>Results:</strong> ${labRequest.results}</p>` : ''}
                        ${labRequest.notes ? `<p><strong>Notes:</strong> ${labRequest.notes}</p>` : ''}
                    </div>
                    ` : ''}
                    
                    ${prescription ? `
                    <div class="section">
                        <h2>Prescription</h2>
                        <p><strong>Medication:</strong> ${prescription.medication || 'N/A'}</p>
                        ${prescription.dosage ? `<p><strong>Dosage:</strong> ${prescription.dosage}</p>` : ''}
                        ${prescription.instructions ? `<p><strong>Instructions:</strong> ${prescription.instructions}</p>` : ''}
                    </div>
                    ` : ''}
                    
                    <div class="footer">
                        <p>This report was generated on ${new Date().toLocaleDateString()}</p>
                        <p>Beergeel Obstetrics and Gynecology Clinic - Your Health is Our Priority</p>
                    </div>
                </body>
                </html>
            `;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(reportContent);
            printWindow.document.close();
            
            setTimeout(() => {
                printWindow.print();
            }, 500);
        } catch (err) {
            console.error('Error printing report:', err);
            alert('Error generating report. Please try again.');
        }
    };

    const downloadVisitPDF = async (visitId) => {
        try {
            const [visit, allConsultations, allLabRequests, allPrescriptions] = await Promise.all([
                db.getById('visits', visitId),
                db.getAll('consultations'),
                db.getAll('lab_requests'),
                db.getAll('prescriptions')
            ]);
            
            const patient = currentUser;
            const consultation = allConsultations.find(c => c.visit_id == visitId);
            const labRequest = allLabRequests.find(l => l.visit_id == visitId);
            const prescription = allPrescriptions.find(p => p.visit_id == visitId);

            const doc = new jsPDF();
            let yPos = 20;

            // Header
            doc.setFontSize(18);
            doc.setTextColor(44, 62, 80);
            doc.text('Beergeel Obstetrics and Gynecology Clinic', 105, yPos, { align: 'center' });
            yPos += 8;
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text('Medical Report', 105, yPos, { align: 'center' });
            yPos += 10;

            // Patient Information
            doc.setFontSize(14);
            doc.setTextColor(44, 62, 80);
            doc.text('Patient Information', 14, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Name: ${patient.name}`, 14, yPos);
            yPos += 6;
            doc.text(`Age/Sex: ${patient.age} years / ${patient.sex}`, 14, yPos);
            yPos += 6;
            doc.text(`Mobile: ${patient.mobile}`, 14, yPos);
            yPos += 6;
            doc.text(`Visit Date: ${new Date(visit.created_date).toLocaleDateString()}`, 14, yPos);
            yPos += 10;

            // Vital Signs
            doc.setFontSize(14);
            doc.setTextColor(44, 62, 80);
            doc.text('Vital Signs', 14, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(`Blood Pressure: ${visit.bp || 'N/A'}`, 14, yPos);
            yPos += 6;
            doc.text(`Pulse Rate: ${visit.pulse || 'N/A'}`, 14, yPos);
            yPos += 6;
            doc.text(`Temperature: ${visit.temp || 'N/A'}°C`, 14, yPos);
            yPos += 6;
            doc.text(`Weight: ${visit.weight || 'N/A'} kg`, 14, yPos);
            yPos += 10;

            // Consultation
            if (consultation) {
                doc.setFontSize(14);
                doc.setTextColor(44, 62, 80);
                doc.text('Consultation', 14, yPos);
                yPos += 8;
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                if (consultation.diagnosis) {
                    const diagnosisLines = doc.splitTextToSize(`Diagnosis: ${consultation.diagnosis}`, 180);
                    doc.text(diagnosisLines, 14, yPos);
                    yPos += diagnosisLines.length * 6;
                }
                if (consultation.notes) {
                    const notesLines = doc.splitTextToSize(`Notes: ${consultation.notes}`, 180);
                    doc.text(notesLines, 14, yPos);
                    yPos += notesLines.length * 6;
                }
                yPos += 5;
            }

            // Lab Request
            if (labRequest) {
                doc.setFontSize(14);
                doc.setTextColor(44, 62, 80);
                doc.text('Laboratory Tests', 14, yPos);
                yPos += 8;
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                if (labRequest.test_name) {
                    doc.text(`Test Name: ${labRequest.test_name}`, 14, yPos);
                    yPos += 6;
                }
                if (labRequest.results) {
                    const resultsLines = doc.splitTextToSize(`Results: ${labRequest.results}`, 180);
                    doc.text(resultsLines, 14, yPos);
                    yPos += resultsLines.length * 6;
                }
                if (labRequest.notes) {
                    const notesLines = doc.splitTextToSize(`Notes: ${labRequest.notes}`, 180);
                    doc.text(notesLines, 14, yPos);
                    yPos += notesLines.length * 6;
                }
                yPos += 5;
            }

            // Prescription
            if (prescription) {
                doc.setFontSize(14);
                doc.setTextColor(44, 62, 80);
                doc.text('Prescription', 14, yPos);
                yPos += 8;
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                if (prescription.medication) {
                    const medicationLines = doc.splitTextToSize(`Medication: ${prescription.medication}`, 180);
                    doc.text(medicationLines, 14, yPos);
                    yPos += medicationLines.length * 6;
                }
                if (prescription.dosage) {
                    doc.text(`Dosage: ${prescription.dosage}`, 14, yPos);
                    yPos += 6;
                }
                if (prescription.instructions) {
                    const instructionsLines = doc.splitTextToSize(`Instructions: ${prescription.instructions}`, 180);
                    doc.text(instructionsLines, 14, yPos);
                    yPos += instructionsLines.length * 6;
                }
            }

            // Footer
            yPos = doc.internal.pageSize.height - 20;
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, yPos, { align: 'center' });
            yPos += 5;
            doc.text('Beergeel Obstetrics and Gynecology Clinic - Your Health is Our Priority', 105, yPos, { align: 'center' });

            // Save PDF
            const filename = `Medical_Report_${patient.name}_${new Date(visit.created_date).toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
            alert('PDF downloaded successfully!');
        } catch (err) {
            console.error('Error downloading PDF:', err);
            alert('Error generating PDF. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <i className="fas fa-history"></i> Visit History for {currentUser.name}
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
            <div className="row mb-4">
                <div className="col-md-12">
                    <div className="card border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h3 className="mb-2">
                                        <i className="fas fa-history me-2"></i>
                                        Visit History for {currentUser.name}
                                    </h3>
                                    <p className="mb-0 opacity-75">
                                        <i className="fas fa-calendar-alt me-2"></i>
                                        Track all your medical visits and records
                                    </p>
                                </div>
                                <div className="text-end">
                                    <div className="badge bg-light text-dark px-4 py-2" style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                                        {visits.length} {visits.length === 1 ? 'Visit' : 'Visits'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {visits.length === 0 ? (
                <div className="row">
                    <div className="col-md-12">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body text-center p-5">
                                <div className="mb-4">
                                    <i className="fas fa-calendar-times" style={{ fontSize: '4rem', color: '#bdc3c7' }}></i>
                                </div>
                                <h4 className="text-muted mb-3">No Visit History Found</h4>
                                <p className="text-muted mb-0">Your visit history will appear here once you have appointments</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="row">
                    {visits.map((visit, index) => {
                        const consultation = consultations.find(c => c.visit_id == visit.id);
                        const labRequest = labRequests.find(l => l.visit_id == visit.id);
                        const prescription = prescriptions.find(p => p.visit_id == visit.id);
                        
                        return (
                            <div key={visit.id} className="col-md-12 mb-4">
                                <div className="card border-0 shadow-sm h-100" style={{ 
                                    borderLeft: '5px solid #667eea',
                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                                }}>
                                    <div className="card-body p-4">
                                        <div className="d-flex justify-content-between align-items-start mb-4">
                                            <div>
                                                <div className="d-flex align-items-center mb-2">
                                                    <div style={{ 
                                                        width: '50px', 
                                                        height: '50px', 
                                                        borderRadius: '12px', 
                                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: '15px'
                                                    }}>
                                                        <i className="fas fa-calendar-check fa-lg text-white"></i>
                                                    </div>
                                                    <div>
                                                        <h4 className="mb-1" style={{ color: '#2c3e50', fontWeight: '600' }}>
                                                            Visit #{visits.length - index}
                                                        </h4>
                                                        <p className="mb-0 text-muted">
                                                            <i className="fas fa-clock me-1"></i>
                                                            {new Date(visit.created_date).toLocaleDateString('en-US', { 
                                                                weekday: 'long',
                                                                year: 'numeric', 
                                                                month: 'long', 
                                                                day: 'numeric' 
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="badge bg-primary px-3 py-2" style={{ fontSize: '0.9rem' }}>
                                                {new Date(visit.created_date).toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>

                                        <div className="row mb-4">
                                            <div className="col-md-3 mb-3">
                                                <div className="d-flex align-items-center p-3" style={{ 
                                                    background: '#e74c3c15',
                                                    borderRadius: '10px',
                                                    border: '1px solid #e74c3c30'
                                                }}>
                                                    <div style={{ 
                                                        width: '45px', 
                                                        height: '45px', 
                                                        borderRadius: '10px', 
                                                        background: '#e74c3c20',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: '12px'
                                                    }}>
                                                        <i className="fas fa-heartbeat text-danger fa-lg"></i>
                                                    </div>
                                                    <div>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Blood Pressure</small>
                                                        <strong style={{ color: '#2c3e50' }}>{visit.bp || 'N/A'}</strong>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-3 mb-3">
                                                <div className="d-flex align-items-center p-3" style={{ 
                                                    background: '#3498db15',
                                                    borderRadius: '10px',
                                                    border: '1px solid #3498db30'
                                                }}>
                                                    <div style={{ 
                                                        width: '45px', 
                                                        height: '45px', 
                                                        borderRadius: '10px', 
                                                        background: '#3498db20',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: '12px'
                                                    }}>
                                                        <i className="fas fa-heart text-primary fa-lg"></i>
                                                    </div>
                                                    <div>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Pulse Rate</small>
                                                        <strong style={{ color: '#2c3e50' }}>{visit.pulse || 'N/A'}</strong>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-3 mb-3">
                                                <div className="d-flex align-items-center p-3" style={{ 
                                                    background: '#f39c1215',
                                                    borderRadius: '10px',
                                                    border: '1px solid #f39c1230'
                                                }}>
                                                    <div style={{ 
                                                        width: '45px', 
                                                        height: '45px', 
                                                        borderRadius: '10px', 
                                                        background: '#f39c1220',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: '12px'
                                                    }}>
                                                        <i className="fas fa-thermometer-half text-warning fa-lg"></i>
                                                    </div>
                                                    <div>
                                                        <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Temperature</small>
                                                        <strong style={{ color: '#2c3e50' }}>{visit.temp || 'N/A'}°C</strong>
                                                    </div>
                                                </div>
                                            </div>
                                            {visit.weight && (
                                                <div className="col-md-3 mb-3">
                                                    <div className="d-flex align-items-center p-3" style={{ 
                                                        background: '#27ae6015',
                                                        borderRadius: '10px',
                                                        border: '1px solid #27ae6030'
                                                    }}>
                                                        <div style={{ 
                                                            width: '45px', 
                                                            height: '45px', 
                                                            borderRadius: '10px', 
                                                            background: '#27ae6020',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginRight: '12px'
                                                        }}>
                                                            <i className="fas fa-weight text-success fa-lg"></i>
                                                        </div>
                                                        <div>
                                                            <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Weight</small>
                                                            <strong style={{ color: '#2c3e50' }}>{visit.weight} kg</strong>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {(consultation || labRequest || prescription) && (
                                            <div className="row mb-4">
                                                {consultation && (
                                                    <div className="col-md-4 mb-3">
                                                        <div className="p-3" style={{ 
                                                            background: '#ecf0f1',
                                                            borderRadius: '10px',
                                                            borderLeft: '4px solid #3498db'
                                                        }}>
                                                            <div className="d-flex align-items-center mb-2">
                                                                <i className="fas fa-stethoscope text-primary me-2"></i>
                                                                <strong style={{ color: '#2c3e50' }}>Diagnosis</strong>
                                                            </div>
                                                            <p className="mb-0 text-muted" style={{ fontSize: '0.9rem' }}>
                                                                {consultation.diagnosis || 'N/A'}
                                                            </p>
                                                            {consultation.notes && (
                                                                <p className="mb-0 mt-2 text-muted" style={{ fontSize: '0.85rem' }}>
                                                                    <small>{consultation.notes}</small>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                {labRequest && (
                                                    <div className="col-md-4 mb-3">
                                                        <div className="p-3" style={{ 
                                                            background: '#ecf0f1',
                                                            borderRadius: '10px',
                                                            borderLeft: '4px solid #f39c12'
                                                        }}>
                                                            <div className="d-flex align-items-center mb-2">
                                                                <i className="fas fa-flask text-warning me-2"></i>
                                                                <strong style={{ color: '#2c3e50' }}>Lab Test</strong>
                                                            </div>
                                                            <p className="mb-0 text-muted" style={{ fontSize: '0.9rem' }}>
                                                                {labRequest.test_name || 'N/A'}
                                                            </p>
                                                            {labRequest.results && (
                                                                <div className="mt-2">
                                                                    <strong style={{ fontSize: '0.85rem' }}>Results: </strong>
                                                                    <div style={{ fontSize: '0.85rem' }}>
                                                                        {labRequest.results.split('\n').map((line, index) => {
                                                                            if (!line.trim()) return null;
                                                                            
                                                                            const imageMatch = line.match(/^(.+?)\s*=\s*\[IMAGE:(.+)\]$/);
                                                                            if (imageMatch) {
                                                                                const testName = imageMatch[1].trim();
                                                                                const imageData = imageMatch[2];
                                                                                return (
                                                                                    <div key={index} className="mb-2">
                                                                                        <strong className="text-muted">{testName}:</strong>
                                                                                        <div className="mt-1">
                                                                                            <img 
                                                                                                src={imageData} 
                                                                                                alt={`${testName} result`}
                                                                                                style={{
                                                                                                    maxWidth: '100%',
                                                                                                    maxHeight: '200px',
                                                                                                    borderRadius: '4px',
                                                                                                    border: '1px solid #ddd',
                                                                                                    objectFit: 'contain',
                                                                                                    cursor: 'pointer'
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
                                                                                            <small className="text-muted d-block mt-1">
                                                                                                <i className="fas fa-info-circle"></i> Click to view full size
                                                                                            </small>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            } else {
                                                                                return (
                                                                                    <p key={index} className="mb-1 text-muted">
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
                                                {prescription && (
                                                    <div className="col-md-4 mb-3">
                                                        <div className="p-3" style={{ 
                                                            background: '#ecf0f1',
                                                            borderRadius: '10px',
                                                            borderLeft: '4px solid #27ae60'
                                                        }}>
                                                            <div className="d-flex align-items-center mb-2">
                                                                <i className="fas fa-pills text-success me-2"></i>
                                                                <strong style={{ color: '#2c3e50' }}>Prescription</strong>
                                                            </div>
                                                            <p className="mb-0 text-muted" style={{ fontSize: '0.9rem' }}>
                                                                {prescription.medication || 'N/A'}
                                                            </p>
                                                            {prescription.dosage && (
                                                                <p className="mb-0 mt-2 text-muted" style={{ fontSize: '0.85rem' }}>
                                                                    <small><strong>Dosage:</strong> {prescription.dosage}</small>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="d-flex gap-3 pt-3" style={{ borderTop: '2px solid #ecf0f1' }}>
                                            <button 
                                                className="btn" 
                                                onClick={() => downloadVisitPDF(visit.id)}
                                                style={{ 
                                                    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                                                    border: 'none',
                                                    color: 'white',
                                                    fontWeight: '500',
                                                    padding: '10px 25px',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)'
                                                }}
                                            >
                                                <i className="fas fa-file-pdf me-2"></i>
                                                Download PDF
                                            </button>
                                            <button 
                                                className="btn btn-primary" 
                                                onClick={() => printSingleVisitReport(visit.id)}
                                                style={{ 
                                                    fontWeight: '500',
                                                    padding: '10px 25px',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 15px rgba(52, 152, 219, 0.3)'
                                                }}
                                            >
                                                <i className="fas fa-print me-2"></i>
                                                Print Report
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}

export default PatientHistory;
