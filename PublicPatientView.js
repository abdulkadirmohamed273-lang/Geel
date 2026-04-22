import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

function PublicPatientView({ patientId, db, currentUser, currentRole, onLogout }) {
    const [patient, setPatient] = useState(null);
    const [visits, setVisits] = useState([]);
    const [consultations, setConsultations] = useState([]);
    const [labRequests, setLabRequests] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accessDenied, setAccessDenied] = useState(false);

    useEffect(() => {
        // Check authentication and access
        if (!currentUser || !currentRole) {
            setAccessDenied(true);
            setLoading(false);
            return;
        }

        // If patient role, verify they can only view their own data
        if (currentRole === 'patient' && currentUser.id !== patientId) {
            setAccessDenied(true);
            setError('Access denied. You can only view your own patient information.');
            setLoading(false);
            return;
        }

        // Staff roles (reception, doctor, pharmacy, lab) can view any patient
        loadPatientData();
    }, [patientId, currentUser, currentRole]);

    const loadPatientData = async () => {
        try {
            setLoading(true);
            const patientData = await db.getPatientWithVisits(patientId);
            
            if (patientData && patientData.patient) {
                setPatient(patientData.patient);
                setVisits(patientData.visits || []);
                setConsultations(patientData.consultations || []);
                setLabRequests(patientData.labRequests || []);
                setPrescriptions(patientData.prescriptions || []);
            } else {
                setError('Patient not found. Please check the link and try again.');
            }
        } catch (err) {
            console.error('Error loading patient data:', err);
            setError('Failed to load patient information. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const openWhatsApp = (number) => {
        const whatsappNumber = number.replace(/\D/g, '');
        const message = `Hello, I'm ${patient?.name}. I would like to contact Beergeel Clinic.`;
        const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappLink, '_blank');
    };

    const handleDownload = () => {
        if (!patient) return;

        const doc = new jsPDF();
        let yPos = 15;
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const maxWidth = pageWidth - (margin * 2);
        const primaryColor = [30, 60, 114]; // #1e3c72
        const secondaryColor = [52, 152, 219]; // #3498db
        const accentColor = [102, 126, 234]; // #667eea
        const textColor = [44, 62, 80]; // #2c3e50
        const lightGray = [236, 240, 241]; // #ecf0f1

        // Helper function to add new page if needed
        const checkNewPage = (requiredSpace) => {
            if (yPos + requiredSpace > pageHeight - 30) {
                doc.addPage();
                yPos = 15;
                // Add header line on new page
                doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
                doc.setLineWidth(0.5);
                doc.line(margin, yPos, pageWidth - margin, yPos);
                yPos += 10;
            }
        };

        // Helper function to draw a box/rectangle
        const drawBox = (x, y, width, height, fillColor = null, strokeColor = null) => {
            if (fillColor) {
                if (Array.isArray(fillColor)) {
                    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
                } else {
                    doc.setFillColor(fillColor);
                }
                doc.rect(x, y, width, height, 'F');
            }
            if (strokeColor) {
                if (Array.isArray(strokeColor)) {
                    doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
                } else {
                    doc.setDrawColor(strokeColor);
                }
                doc.setLineWidth(0.3);
                doc.rect(x, y, width, height, 'S');
            }
        };

        // Professional Header with colored background
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 50, 'F');
        
        // White text on colored background
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('Beergeel Obstetrics and Gynecology Clinic', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.text('Takhasusuka sare ee xanuunada dumarka', pageWidth / 2, 30, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setTextColor(220, 220, 220);
        doc.text('Patient Medical Information Report', pageWidth / 2, 40, { align: 'center' });
        
        yPos = 60;
        
        // Report metadata box
        checkNewPage(25);
        drawBox(margin, yPos, maxWidth, 20, lightGray, [200, 200, 200]);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Report Generated: ${new Date().toLocaleString()}`, margin + 5, yPos + 7);
        doc.text(`Report ID: PAT-${patient.id}-${Date.now().toString().slice(-6)}`, margin + 5, yPos + 14);
        yPos += 25;

        // Patient Information Section with styled box
        checkNewPage(50);
        
        // Section header with colored background
        doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.rect(margin, yPos, maxWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('PATIENT INFORMATION', margin + 5, yPos + 6);
        yPos += 12;
        
        // Patient info box
        drawBox(margin, yPos, maxWidth, 28, [255, 255, 255], secondaryColor);
        
        const patientInfoY = yPos + 6;
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Name:', margin + 8, patientInfoY);
        doc.setFont(undefined, 'normal');
        doc.text(patient.name, margin + 35, patientInfoY);
        
        doc.setFont(undefined, 'bold');
        doc.text('Age:', margin + 8, patientInfoY + 6);
        doc.setFont(undefined, 'normal');
        doc.text(`${patient.age} years`, margin + 35, patientInfoY + 6);
        
        doc.setFont(undefined, 'bold');
        doc.text('Sex:', margin + 100, patientInfoY);
        doc.setFont(undefined, 'normal');
        doc.text(patient.sex, margin + 120, patientInfoY);
        
        doc.setFont(undefined, 'bold');
        doc.text('Mobile:', margin + 100, patientInfoY + 6);
        doc.setFont(undefined, 'normal');
        doc.text(patient.mobile, margin + 130, patientInfoY + 6);
        
        yPos += 33;

        // Visit History Section
        if (visits.length > 0) {
            checkNewPage(30);
            
            // Section header
            doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.rect(margin, yPos, maxWidth, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text(`VISIT HISTORY (${visits.length} ${visits.length === 1 ? 'Visit' : 'Visits'})`, margin + 5, yPos + 6);
            yPos += 12;

            visits.forEach((visit, index) => {
                const visitNumber = visits.length - index;
                const visitDate = new Date(visit.created_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                // Calculate content height first
                let contentHeight = 10; // Start with header height
                const consultation = consultations.find(c => c.visit_id == visit.id);
                const labRequest = labRequests.find(l => l.visit_id == visit.id);
                const prescription = prescriptions.find(p => p.visit_id == visit.id);

                // Vitals height
                if (visit.bp || visit.pulse || visit.temp || visit.weight) {
                    contentHeight += 5 + 15 + 3; // Label + box + spacing
                }

                // Consultation height
                if (consultation) {
                    let consultHeight = 5; // Header
                    doc.setFontSize(8);
                    if (consultation.diagnosis) {
                        const diagnosisLines = doc.splitTextToSize(consultation.diagnosis, maxWidth - 45);
                        consultHeight += 3 + (diagnosisLines.length * 4) + 1; // Label + text + spacing
                    }
                    if (consultation.notes) {
                        const notesLines = doc.splitTextToSize(consultation.notes, maxWidth - 45);
                        consultHeight += 3 + (notesLines.length * 4); // Label + text
                    }
                    consultHeight += 2; // Bottom padding
                    contentHeight += consultHeight + 1;
                }

                // Lab height
                if (labRequest) {
                    let labHeight = 5; // Header
                    doc.setFontSize(8);
                    if (labRequest.test_name) {
                        const testLines = doc.splitTextToSize(labRequest.test_name, maxWidth - 45);
                        labHeight += 3 + (testLines.length * 4) + 1; // Label + text + spacing
                    }
                    if (labRequest.results) {
                        const resultsLines = doc.splitTextToSize(labRequest.results, maxWidth - 45);
                        labHeight += 3 + (resultsLines.length * 4); // Label + text
                    }
                    labHeight += 2; // Bottom padding
                    contentHeight += labHeight + 1;
                }

                // Prescription height
                if (prescription) {
                    let prescHeight = 5; // Header
                    doc.setFontSize(8);
                    if (prescription.medication) {
                        const medLines = doc.splitTextToSize(prescription.medication, maxWidth - 50);
                        prescHeight += 3 + (medLines.length * 4) + 1; // Label + text + spacing
                    }
                    if (prescription.dosage) {
                        const dosageLines = doc.splitTextToSize(prescription.dosage, maxWidth - 50);
                        prescHeight += 3 + (dosageLines.length * 4) + 1; // Label + text + spacing
                    }
                    if (prescription.instructions) {
                        const instLines = doc.splitTextToSize(prescription.instructions, maxWidth - 55);
                        prescHeight += 3 + (instLines.length * 4); // Label + text
                    }
                    prescHeight += 2; // Bottom padding
                    contentHeight += prescHeight + 1;
                }

                contentHeight += 5; // Bottom spacing

                checkNewPage(contentHeight + 10);

                // Visit Card with border - draw after calculating height
                drawBox(margin, yPos, maxWidth, contentHeight, [255, 255, 255], accentColor);
                
                // Visit Header with colored background
                doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
                doc.rect(margin, yPos, maxWidth, 7, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.text(`Visit #${visitNumber} - ${visitDate}`, margin + 5, yPos + 5);
                yPos += 10;

                // Vitals in a table format
                if (visit.bp || visit.pulse || visit.temp || visit.weight) {
                    const vitalsStartY = yPos;
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'bold');
                    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                    doc.text('Vital Signs', margin + 5, yPos);
                    yPos += 5;
                    
                    // Vitals table
                    const vitalsBoxWidth = maxWidth - 10;
                    const vitalsBoxHeight = 15;
                    drawBox(margin + 5, yPos, vitalsBoxWidth, vitalsBoxHeight, [248, 249, 250], [200, 200, 200]);
                    
                    const vitalsY = yPos + 4;
                    doc.setFontSize(8);
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                    
                    if (visit.bp) {
                        doc.setFont(undefined, 'bold');
                        doc.text('BP:', margin + 8, vitalsY);
                        doc.setFont(undefined, 'normal');
                        doc.text(visit.bp, margin + 20, vitalsY);
                    }
                    if (visit.pulse) {
                        doc.setFont(undefined, 'bold');
                        doc.text('Pulse:', margin + 8, vitalsY + 5);
                        doc.setFont(undefined, 'normal');
                        doc.text(`${visit.pulse} bpm`, margin + 25, vitalsY + 5);
                    }
                    if (visit.temp) {
                        doc.setFont(undefined, 'bold');
                        doc.text('Temp:', margin + 70, vitalsY);
                        doc.setFont(undefined, 'normal');
                        doc.text(`${visit.temp}°C`, margin + 85, vitalsY);
                    }
                    if (visit.weight) {
                        doc.setFont(undefined, 'bold');
                        doc.text('Weight:', margin + 70, vitalsY + 5);
                        doc.setFont(undefined, 'normal');
                        doc.text(`${visit.weight} kg`, margin + 90, vitalsY + 5);
                    }
                    yPos += vitalsBoxHeight + 3;
                }

                // Consultation box
                if (consultation) {
                    // Calculate box height first
                    doc.setFontSize(8);
                    let consultBoxHeight = 5; // Header space
                    if (consultation.diagnosis) {
                        const diagnosisLines = doc.splitTextToSize(consultation.diagnosis, maxWidth - 45);
                        consultBoxHeight += 3 + (diagnosisLines.length * 4) + 1; // Label + text + spacing
                    }
                    if (consultation.notes) {
                        const notesLines = doc.splitTextToSize(consultation.notes, maxWidth - 45);
                        consultBoxHeight += 3 + (notesLines.length * 4); // Label + text
                    }
                    consultBoxHeight += 2; // Bottom padding

                    drawBox(margin + 5, yPos, maxWidth - 10, consultBoxHeight, [227, 242, 253], [52, 152, 219]);
                    
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'bold');
                    doc.setTextColor(25, 118, 210);
                    doc.text('Diagnosis/Notes', margin + 8, yPos + 4);
                    yPos += 5;
                    
                    doc.setFontSize(8);
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                    if (consultation.diagnosis) {
                        doc.setFont(undefined, 'bold');
                        doc.text('Diagnosis:', margin + 8, yPos);
                        doc.setFont(undefined, 'normal');
                        const diagnosisLines = doc.splitTextToSize(consultation.diagnosis, maxWidth - 45);
                        doc.text(diagnosisLines, margin + 35, yPos);
                        yPos += 3 + (diagnosisLines.length * 4) + 1;
                    }
                    if (consultation.notes) {
                        doc.setFont(undefined, 'bold');
                        doc.text('Notes:', margin + 8, yPos);
                        doc.setFont(undefined, 'normal');
                        const notesLines = doc.splitTextToSize(consultation.notes, maxWidth - 45);
                        doc.text(notesLines, margin + 35, yPos);
                        yPos += 3 + (notesLines.length * 4);
                    }
                    yPos += 1;
                }

                // Laboratory Test box
                if (labRequest) {
                    // Calculate box height first
                    doc.setFontSize(8);
                    let labBoxHeight = 5; // Header space
                    if (labRequest.test_name) {
                        const testLines = doc.splitTextToSize(labRequest.test_name, maxWidth - 45);
                        labBoxHeight += 3 + (testLines.length * 4) + 1; // Label + text + spacing
                    }
                    if (labRequest.results) {
                        const resultsLines = doc.splitTextToSize(labRequest.results, maxWidth - 45);
                        labBoxHeight += 3 + (resultsLines.length * 4); // Label + text
                    }
                    labBoxHeight += 2; // Bottom padding

                    drawBox(margin + 5, yPos, maxWidth - 10, labBoxHeight, [255, 243, 224], [255, 152, 0]);
                    
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'bold');
                    doc.setTextColor(230, 126, 34);
                    doc.text('Laboratory Test', margin + 8, yPos + 4);
                    yPos += 5;
                    
                    doc.setFontSize(8);
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                    if (labRequest.test_name) {
                        doc.setFont(undefined, 'bold');
                        doc.text('Laboratory Test:', margin + 8, yPos);
                        doc.setFont(undefined, 'normal');
                        const testLines = doc.splitTextToSize(labRequest.test_name, maxWidth - 45);
                        doc.text(testLines, margin + 50, yPos);
                        yPos += 3 + (testLines.length * 4) + 1;
                    }
                    if (labRequest.results) {
                        doc.setFont(undefined, 'bold');
                        doc.text('Results:', margin + 8, yPos);
                        doc.setFont(undefined, 'normal');
                        const resultsLines = doc.splitTextToSize(labRequest.results, maxWidth - 45);
                        doc.text(resultsLines, margin + 40, yPos);
                        yPos += 3 + (resultsLines.length * 4);
                    }
                    yPos += 1;
                }

                // Prescription box
                if (prescription) {
                    // Calculate box height first
                    doc.setFontSize(8);
                    let prescBoxHeight = 5; // Header space
                    if (prescription.medication) {
                        const medLines = doc.splitTextToSize(prescription.medication, maxWidth - 50);
                        prescBoxHeight += 3 + (medLines.length * 4) + 1; // Label + text + spacing
                    }
                    if (prescription.dosage) {
                        const dosageLines = doc.splitTextToSize(prescription.dosage, maxWidth - 50);
                        prescBoxHeight += 3 + (dosageLines.length * 4) + 1; // Label + text + spacing
                    }
                    if (prescription.instructions) {
                        const instLines = doc.splitTextToSize(prescription.instructions, maxWidth - 55);
                        prescBoxHeight += 3 + (instLines.length * 4); // Label + text
                    }
                    prescBoxHeight += 2; // Bottom padding

                    drawBox(margin + 5, yPos, maxWidth - 10, prescBoxHeight, [232, 245, 233], [76, 175, 80]);
                    
                    doc.setFontSize(9);
                    doc.setFont(undefined, 'bold');
                    doc.setTextColor(56, 142, 60);
                    doc.text('Prescription', margin + 8, yPos + 4);
                    yPos += 5;
                    
                    doc.setFontSize(8);
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
                    if (prescription.medication) {
                        doc.setFont(undefined, 'bold');
                        doc.text('Medication:', margin + 8, yPos);
                        doc.setFont(undefined, 'normal');
                        const medLines = doc.splitTextToSize(prescription.medication, maxWidth - 50);
                        doc.text(medLines, margin + 40, yPos);
                        yPos += 3 + (medLines.length * 4) + 1;
                    }
                    if (prescription.dosage) {
                        doc.setFont(undefined, 'bold');
                        doc.text('Dosage:', margin + 8, yPos);
                        doc.setFont(undefined, 'normal');
                        const dosageLines = doc.splitTextToSize(prescription.dosage, maxWidth - 50);
                        doc.text(dosageLines, margin + 40, yPos);
                        yPos += 3 + (dosageLines.length * 4) + 1;
                    }
                    if (prescription.instructions) {
                        doc.setFont(undefined, 'bold');
                        doc.text('Instructions:', margin + 8, yPos);
                        doc.setFont(undefined, 'normal');
                        const instLines = doc.splitTextToSize(prescription.instructions, maxWidth - 55);
                        doc.text(instLines, margin + 45, yPos);
                        yPos += 3 + (instLines.length * 4);
                    }
                    yPos += 1;
                }

                yPos += 5; // Space between visits
            });
        } else {
            checkNewPage(25);
            drawBox(margin, yPos, maxWidth, 20, [255, 255, 255], [200, 200, 200]);
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.setFont(undefined, 'normal');
            doc.text('No visit history found.', pageWidth / 2, yPos + 12, { align: 'center' });
            yPos += 25;
        }

        // Contact Information Section
        checkNewPage(40);
        yPos += 5;
        
        // Section header
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(margin, yPos, maxWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('CONTACT INFORMATION', margin + 5, yPos + 6);
        yPos += 12;
        
        // Contact info box
        drawBox(margin, yPos, maxWidth, 25, [255, 255, 255], primaryColor);
        doc.setFontSize(9);
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFont(undefined, 'bold');
        doc.text('Phone:', margin + 8, yPos + 8);
        doc.setFont(undefined, 'normal');
        doc.text('04026635', margin + 30, yPos + 8);
        
        doc.setFont(undefined, 'bold');
        doc.text('Location:', margin + 8, yPos + 15);
        doc.setFont(undefined, 'normal');
        const addressLines = doc.splitTextToSize('Xero awr kasoo horjeedka Ayuub Restaurant inyar ka xiga dhanka Masjid Nuur', maxWidth - 40);
        doc.text(addressLines, margin + 35, yPos + 15);
        yPos += 30;

        // Professional Footer
        const footerY = pageHeight - 25;
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(margin, footerY, pageWidth - margin, footerY);
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined, 'normal');
        doc.text(`© ${new Date().getFullYear()} Beergeel Obstetrics and Gynecology Clinic. All rights reserved.`, pageWidth / 2, footerY + 5, { align: 'center' });
        doc.text('Your Health is Our Priority', pageWidth / 2, footerY + 10, { align: 'center' });

        // Save the PDF
        const fileName = `Patient_Report_${patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    };

    if (loading) {
        return (
            <div className="public-patient-view">
                <div className="patient-container">
                    <div className="text-center p-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-3">Loading patient information...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="public-patient-view">
                <div className="patient-container">
                    <div className="alert alert-danger m-4">
                        <i className="fas fa-lock"></i>
                        <h4 className="alert-heading">Access Denied</h4>
                        <p>{error || 'You must be logged in to view patient information. Please login to continue.'}</p>
                        {onLogout && (
                            <button 
                                className="btn btn-primary mt-3"
                                onClick={() => window.location.href = '/'}
                            >
                                <i className="fas fa-sign-in-alt"></i> Go to Login
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="public-patient-view">
                <div className="patient-container">
                    <div className="alert alert-danger m-4">
                        <i className="fas fa-exclamation-triangle"></i>
                        <h4 className="alert-heading">Patient Not Found</h4>
                        <p>{error || 'The patient information you are looking for does not exist.'}</p>
                        {onLogout && (
                            <button 
                                className="btn btn-secondary mt-3"
                                onClick={onLogout}
                            >
                                <i className="fas fa-sign-out-alt"></i> Logout
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="public-patient-view">
            <style>{`
                .public-patient-view {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                .patient-container {
                    max-width: 900px;
                    margin: 0 auto;
                }
                .patient-header {
                    background: white;
                    border-radius: 15px;
                    padding: 30px;
                    margin-bottom: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                    text-align: center;
                }
                .patient-logo {
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 20px;
                    border-radius: 50%;
                }
                .clinic-name {
                    color: #000000 !important;
                    margin: 0 0 10px 0;
                    font-size: 1.8rem;
                    font-weight: 700;
                }
                .clinic-tagline {
                    color: #7f8c8d;
                    margin: 0;
                    font-size: 1rem;
                }
                .patient-card {
                    background: white;
                    border-radius: 15px;
                    padding: 30px;
                    margin-bottom: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                }
                .patient-section {
                    margin-bottom: 30px;
                }
                .patient-section:last-child {
                    margin-bottom: 0;
                }
                .section-title {
                    color: #2c3e50;
                    font-size: 1.3rem;
                    font-weight: 600;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #ecf0f1;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                    margin-top: 15px;
                }
                .info-item {
                    display: flex;
                    flex-direction: column;
                }
                .info-item label {
                    font-weight: 600;
                    color: #7f8c8d;
                    font-size: 0.9rem;
                    margin-bottom: 5px;
                }
                .info-item span {
                    color: #2c3e50;
                    font-size: 1rem;
                }
                .visit-card {
                    background: #f8f9fa;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 20px;
                    border-left: 4px solid #667eea;
                }
                .visit-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                }
                .visit-date {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #2c3e50;
                }
                .visit-badge {
                    background: #667eea;
                    color: white;
                    padding: 5px 15px;
                    border-radius: 20px;
                    font-size: 0.85rem;
                }
                .visit-details {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 15px;
                    margin-bottom: 15px;
                }
                .detail-item {
                    background: white;
                    padding: 10px;
                    border-radius: 8px;
                }
                .detail-label {
                    font-size: 0.8rem;
                    color: #7f8c8d;
                    margin-bottom: 5px;
                }
                .detail-value {
                    font-size: 1rem;
                    color: #2c3e50;
                    font-weight: 500;
                }
                .consultation-box {
                    background: #e3f2fd;
                    border-left: 4px solid #2196f3;
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 15px;
                }
                .lab-box {
                    background: #fff3e0;
                    border-left: 4px solid #ff9800;
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 15px;
                }
                .prescription-box {
                    background: #e8f5e9;
                    border-left: 4px solid #4caf50;
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 15px;
                }
                .contact-section {
                    background: #f8f9fa;
                    border-radius: 10px;
                    padding: 20px;
                    margin-top: 20px;
                }
                .contact-buttons {
                    display: flex;
                    gap: 15px;
                    margin: 20px 0;
                    flex-wrap: wrap;
                }
                .btn-contact {
                    flex: 1;
                    min-width: 150px;
                    padding: 12px 20px;
                    border-radius: 8px;
                    font-weight: 500;
                    border: none;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .btn-contact:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                }
                .clinic-address {
                    color: #7f8c8d;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-top: 15px;
                }
                @media (max-width: 768px) {
                    .public-patient-view {
                        padding: 10px;
                    }
                    .patient-header, .patient-card {
                        padding: 20px;
                    }
                    .info-grid, .visit-details {
                        grid-template-columns: 1fr;
                    }
                    .contact-buttons {
                        flex-direction: column;
                    }
                    .btn-contact {
                        width: 100%;
                    }
                }
            `}</style>

            <div className="patient-container">
                {/* Header */}
                <div className="patient-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ flex: 1 }}></div>
                        {onLogout && (
                            <button 
                                className="btn btn-outline-danger"
                                onClick={onLogout}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: '1px solid #dc3545',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                <i className="fas fa-sign-out-alt"></i> Logout
                            </button>
                        )}
                    </div>
                    <img 
                        src="/logo.png" 
                        alt="Beergeel Clinic Logo" 
                        className="patient-logo"
                        onError={(e) => {
                            e.target.src = "https://via.placeholder.com/80x80/1e3c72/ffffff?text=OBGYN";
                        }}
                    />
                    <h3 className="clinic-name" style={{ color: '#000000' }}>Beergeel Obstetrics and Gynecology Clinic</h3>
                    <p className="clinic-tagline">Takhasusuka sare ee xanuunada dumarka</p>
                    {currentUser && (
                        <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#7f8c8d' }}>
                            <i className="fas fa-user"></i> Logged in as: {currentUser.name} ({currentRole})
                        </p>
                    )}
                </div>

                {/* Patient Information Card */}
                <div className="patient-card">
                    <div className="patient-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h5 className="section-title" style={{ marginBottom: 0 }}>
                                <i className="fas fa-user"></i> Patient Information
                            </h5>
                            <button 
                                className="btn btn-primary"
                                onClick={handleDownload}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                }}
                            >
                                <i className="fas fa-download"></i> Download Information
                            </button>
                        </div>
                        <div className="info-grid">
                            <div className="info-item">
                                <label>Name:</label>
                                <span>{patient.name}</span>
                            </div>
                            <div className="info-item">
                                <label>Age:</label>
                                <span>{patient.age} years</span>
                            </div>
                            <div className="info-item">
                                <label>Sex:</label>
                                <span>{patient.sex}</span>
                            </div>
                            <div className="info-item">
                                <label>Mobile:</label>
                                <span>{patient.mobile}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Visit History */}
                {visits.length > 0 ? (
                    <div className="patient-card">
                        <div className="patient-section">
                            <h5 className="section-title">
                                <i className="fas fa-history"></i> Visit History ({visits.length} {visits.length === 1 ? 'Visit' : 'Visits'})
                            </h5>
                            {visits.map((visit, index) => {
                                const consultation = consultations.find(c => c.visit_id == visit.id);
                                const labRequest = labRequests.find(l => l.visit_id == visit.id);
                                const prescription = prescriptions.find(p => p.visit_id == visit.id);
                                
                                return (
                                    <div key={visit.id} className="visit-card">
                                        <div className="visit-header">
                                            <div className="visit-date">
                                                Visit #{visits.length - index} - {new Date(visit.created_date).toLocaleDateString('en-US', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                        </div>
                                        
                                        <div className="visit-details">
                                            {visit.bp && (
                                                <div className="detail-item">
                                                    <div className="detail-label">Blood Pressure</div>
                                                    <div className="detail-value">{visit.bp}</div>
                                                </div>
                                            )}
                                            {visit.pulse && (
                                                <div className="detail-item">
                                                    <div className="detail-label">Pulse Rate</div>
                                                    <div className="detail-value">{visit.pulse} bpm</div>
                                                </div>
                                            )}
                                            {visit.temp && (
                                                <div className="detail-item">
                                                    <div className="detail-label">Temperature</div>
                                                    <div className="detail-value">{visit.temp}°C</div>
                                                </div>
                                            )}
                                            {visit.weight && (
                                                <div className="detail-item">
                                                    <div className="detail-label">Weight</div>
                                                    <div className="detail-value">{visit.weight} kg</div>
                                                </div>
                                            )}
                                        </div>

                                        {consultation && (
                                            <div className="consultation-box">
                                                <strong><i className="fas fa-stethoscope"></i> Consultation</strong>
                                                {consultation.diagnosis && (
                                                    <p style={{ marginTop: '10px', marginBottom: '5px' }}>
                                                        <strong>Diagnosis:</strong> {consultation.diagnosis}
                                                    </p>
                                                )}
                                                {consultation.notes && (
                                                    <p style={{ marginTop: '5px', marginBottom: '0' }}>
                                                        <strong>Notes:</strong> {consultation.notes}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {labRequest && (
                                            <div className="lab-box">
                                                <strong><i className="fas fa-flask"></i> Laboratory Test</strong>
                                                {labRequest.test_name && (
                                                    <p style={{ marginTop: '10px', marginBottom: '5px' }}>
                                                        <strong>Test:</strong> {labRequest.test_name}
                                                    </p>
                                                )}
                                                {labRequest.results && (
                                                    <div style={{ marginTop: '5px', marginBottom: '0' }}>
                                                        <strong>Results:</strong>
                                                        <div style={{ marginTop: '8px' }}>
                                                            {labRequest.results.split('\n').map((line, index) => {
                                                                if (!line.trim()) return null;
                                                                
                                                                const imageMatch = line.match(/^(.+?)\s*=\s*\[IMAGE:(.+)\]$/);
                                                                if (imageMatch) {
                                                                    const testName = imageMatch[1].trim();
                                                                    const imageData = imageMatch[2];
                                                                    return (
                                                                        <div key={index} style={{ marginBottom: '10px' }}>
                                                                            <strong>{testName}:</strong>
                                                                            <div style={{ marginTop: '5px' }}>
                                                                                <img 
                                                                                    src={imageData} 
                                                                                    alt={`${testName} result`}
                                                                                    style={{
                                                                                        maxWidth: '100%',
                                                                                        maxHeight: '300px',
                                                                                        borderRadius: '6px',
                                                                                        border: '2px solid #ddd',
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
                                                                                <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                                                                                    <i className="fas fa-info-circle"></i> Click image to view full size
                                                                                </small>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    return (
                                                                        <p key={index} style={{ marginBottom: '5px' }}>
                                                                            {line}
                                                                        </p>
                                                                    );
                                                                }
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {prescription && (
                                            <div className="prescription-box">
                                                <strong><i className="fas fa-pills"></i> Prescription</strong>
                                                {prescription.medication && (
                                                    <p style={{ marginTop: '10px', marginBottom: '5px' }}>
                                                        <strong>Medication:</strong> {prescription.medication}
                                                    </p>
                                                )}
                                                {prescription.dosage && (
                                                    <p style={{ marginTop: '5px', marginBottom: '0' }}>
                                                        <strong>Dosage:</strong> {prescription.dosage}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="patient-card">
                        <div className="patient-section">
                            <p className="text-center text-muted">No visit history found.</p>
                        </div>
                    </div>
                )}

                {/* Contact Information */}
                <div className="patient-card">
                    <div className="contact-section">
                        <h5 className="section-title">
                            <i className="fas fa-phone"></i> Contact Us
                        </h5>
                        
                        <div className="contact-buttons">
                            <a 
                                href="tel:+2524026635" 
                                className="btn btn-outline-primary btn-contact"
                            >
                                <i className="fas fa-phone"></i> Call Clinic
                            </a>
                            
                            <button 
                                className="btn btn-success btn-contact"
                                onClick={() => openWhatsApp('2524026635')}
                            >
                                <i className="fab fa-whatsapp"></i> WhatsApp
                            </button>
                        </div>

                        <div className="clinic-address">
                            <i className="fas fa-map-marker-alt"></i>
                            <span>Xero awr kasoo horjeedka Ayuub Restaurant inyar ka xiga dhanka Masjid Nuur</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PublicPatientView;

