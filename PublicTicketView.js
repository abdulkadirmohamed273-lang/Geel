import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';

function PublicTicketView({ ticketCode, db }) {
    const [ticket, setTicket] = useState(null);
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadTicket = useCallback(async () => {
        try {
            setLoading(true);
            const ticketData = await db.getTicketWithPatient(ticketCode);
            
            if (ticketData) {
                setTicket(ticketData);
                setPatient(ticketData.patient);
            } else {
                setError('Ticket not found. Please check the ticket code and try again.');
            }
        } catch (err) {
            console.error('Error loading ticket:', err);
            setError('Failed to load ticket. Please try again later.');
        } finally {
            setLoading(false);
        }
    }, [ticketCode, db]);

    useEffect(() => {
        loadTicket();
    }, [loadTicket]);

    const openWhatsApp = (number) => {
        const whatsappNumber = number.replace(/\D/g, '');
        const message = `Hello, I'm ${patient?.name}. I have a ticket for Beergeel Clinic (Code: ${ticket?.ticket_code}).`;
        const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappLink, '_blank');
    };

    const getStatusBadge = (status) => {
        const badges = {
            'active': { color: 'success', text: 'Active' },
            'used': { color: 'info', text: 'Used' },
            'expired': { color: 'warning', text: 'Expired' },
            'cancelled': { color: 'danger', text: 'Cancelled' }
        };
        const badge = badges[status] || { color: 'secondary', text: status };
        return <span className={`badge bg-${badge.color}`}>{badge.text}</span>;
    };

    const isExpired = () => {
        if (!ticket || !ticket.expires_date) return false;
        return new Date(ticket.expires_date) < new Date();
    };

    const downloadTicketPDF = () => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Blue gradient header
            doc.setFillColor(30, 60, 114);
            doc.rect(0, 0, pageWidth, 50, 'F');
            
            // Clinic name
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('Beergeel Obstetrics and Gynecology Clinic', pageWidth / 2, 20, { align: 'center' });
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text('Takhasusuka sare ee xanuunada dumarka', pageWidth / 2, 28, { align: 'center' });
            doc.text('Xero awr kasoo horjeedka Ayuub Restaurant inyar ka xiga dhanka Masjid Nuur', pageWidth / 2, 35, { align: 'center' });
            doc.text('Contact: 04026635 (Mobile/WhatsApp)', pageWidth / 2, 42, { align: 'center' });

            // Ticket Code Section
            doc.setFillColor(248, 249, 250);
            doc.roundedRect(20, 60, pageWidth - 40, 40, 5, 5, 'F');
            
            doc.setTextColor(108, 117, 125);
            doc.setFontSize(10);
            doc.text('TICKET CODE', pageWidth / 2, 70, { align: 'center' });
            
            doc.setTextColor(44, 62, 80);
            doc.setFontSize(28);
            doc.setFont('courier', 'bold');
            doc.text(ticket.ticket_code, pageWidth / 2, 85, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(108, 117, 125);
            doc.text(ticket.ticket_number, pageWidth / 2, 95, { align: 'center' });

            // Status badge
            const statusColors = {
                'active': [46, 204, 113],
                'used': [52, 152, 219],
                'expired': [243, 156, 18],
                'cancelled': [231, 76, 60]
            };
            const statusColor = statusColors[ticket.status] || [108, 117, 125];
            doc.setFillColor(...statusColor);
            doc.roundedRect(pageWidth - 45, 65, 30, 10, 2, 2, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(ticket.status.toUpperCase(), pageWidth - 30, 72, { align: 'center' });

            // Patient Information
            doc.setTextColor(44, 62, 80);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Patient Information', 20, 115);
            
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            let y = 125;
            doc.text(`Name: ${patient?.name || 'N/A'}`, 25, y);
            y += 8;
            doc.text(`Age: ${patient?.age || 'N/A'} years`, 25, y);
            doc.text(`Sex: ${patient?.sex || 'N/A'}`, 100, y);
            y += 8;
            doc.text(`Mobile: ${patient?.mobile || 'N/A'}`, 25, y);

            // Appointment Details
            y += 15;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Appointment Details', 20, y);
            
            y += 10;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(`Purpose: ${ticket.purpose || 'General Consultation'}`, 25, y);
            
            if (ticket.appointment_date) {
                y += 8;
                const appointmentDate = new Date(ticket.appointment_date);
                doc.text(`Date & Time: ${appointmentDate.toLocaleDateString()} at ${appointmentDate.toLocaleTimeString()}`, 25, y);
            }
            
            if (ticket.notes) {
                y += 8;
                doc.text('Notes:', 25, y);
                y += 6;
                const splitNotes = doc.splitTextToSize(ticket.notes, pageWidth - 50);
                doc.setFontSize(10);
                doc.text(splitNotes, 25, y);
                y += splitNotes.length * 5;
            }

            // Instructions Box
            y += 15;
            doc.setFillColor(255, 243, 205);
            doc.roundedRect(20, y, pageWidth - 40, 45, 3, 3, 'F');
            
            y += 7;
            doc.setTextColor(133, 100, 4);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Instructions:', 25, y);
            
            y += 8;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text('• Arrive 15 minutes before your appointment time', 25, y);
            y += 6;
            doc.text(`• Bring this ticket code: ${ticket.ticket_code}`, 25, y);
            y += 6;
            doc.text('• For rescheduling, contact us via phone or WhatsApp', 25, y);
            y += 6;
            doc.text('• For emergencies, call immediately: 04026635', 25, y);

            // Clinic Hours
            y += 18;
            doc.setTextColor(44, 62, 80);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Clinic Hours:', 20, y);
            
            y += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Saturday - Thursday: 5:00 PM - 10:00 PM', 25, y);
            y += 6;
            doc.text('Emergency services available 24/7', 25, y);

            // Footer
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text('This is an official appointment ticket from Beergeel Clinic', pageWidth / 2, pageHeight - 20, { align: 'center' });
            doc.text(`Generated: ${new Date().toLocaleDateString()} | © ${new Date().getFullYear()} Beergeel Clinic`, pageWidth / 2, pageHeight - 15, { align: 'center' });

            // Save PDF
            doc.save(`Ticket_${ticket.ticket_code}_${patient?.name || 'patient'}.pdf`);
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Error generating PDF. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="public-ticket-view">
                <div className="ticket-container">
                    <div className="text-center p-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-3">Loading ticket information...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !ticket) {
        return (
            <div className="public-ticket-view">
                <div className="ticket-container">
                    <div className="alert alert-danger m-4">
                        <i className="fas fa-exclamation-triangle"></i>
                        <h4 className="alert-heading">Ticket Not Found</h4>
                        <p>{error || 'The ticket you are looking for does not exist.'}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="public-ticket-view">
            <div className="ticket-container">
                {/* Header */}
                <div className="ticket-header">
                    <button 
                        className="btn btn-danger btn-sm"
                        onClick={downloadTicketPDF}
                        style={{
                            position: 'absolute',
                            top: '15px',
                            right: '15px',
                            zIndex: 10,
                            borderRadius: '25px',
                            padding: '8px 20px',
                            fontWeight: '600',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                        }}
                    >
                        <i className="fas fa-download me-2"></i>
                        Download PDF
                    </button>
                    
                    <img 
                        src="/logo.png" 
                        alt="Beergeel Clinic Logo" 
                        className="ticket-logo"
                        onError={(e) => {
                            e.target.src = "https://via.placeholder.com/80x80/1e3c72/ffffff?text=OBGYN";
                        }}
                    />
                    <h3 className="clinic-name" style={{ color: '#000000', fontWeight: 'bold' }}>Beergeel Obstetrics and Gynecology Clinic</h3>
                    <p className="clinic-tagline">Takhasusuka sare ee xanuunada dumarka</p>
                </div>

                {/* Ticket Card */}
                <div className="ticket-card">
                    <div className="ticket-status-header">
                        {isExpired() ? (
                            <span className="badge bg-warning">Expired</span>
                        ) : (
                            getStatusBadge(ticket.status)
                        )}
                    </div>

                    <div className="ticket-code-section">
                        <div className="ticket-code-label">Ticket Code</div>
                        <div className="ticket-code-value">{ticket.ticket_code}</div>
                        <div className="ticket-number">{ticket.ticket_number}</div>
                    </div>

                    <div className="ticket-divider"></div>

                    {/* Patient Information */}
                    <div className="ticket-section">
                        <h5 className="section-title">
                            <i className="fas fa-user"></i> Patient Information
                        </h5>
                        <div className="info-grid">
                            <div className="info-item">
                                <label>Name:</label>
                                <span>{patient?.name}</span>
                            </div>
                            <div className="info-item">
                                <label>Age:</label>
                                <span>{patient?.age} years</span>
                            </div>
                            <div className="info-item">
                                <label>Sex:</label>
                                <span>{patient?.sex}</span>
                            </div>
                            <div className="info-item">
                                <label>Mobile:</label>
                                <span>{patient?.mobile}</span>
                            </div>
                        </div>
                    </div>

                    {/* Appointment Details */}
                    <div className="ticket-section">
                        <h5 className="section-title">
                            <i className="fas fa-calendar-check"></i> Appointment Details
                        </h5>
                        <div className="info-grid">
                            <div className="info-item">
                                <label>Purpose:</label>
                                <span className="purpose-badge">{ticket.purpose || 'General Consultation'}</span>
                            </div>
                            {ticket.appointment_date && (
                                <div className="info-item full-width">
                                    <label>Scheduled Date & Time:</label>
                                    <span className="appointment-datetime">
                                        <i className="fas fa-clock"></i>
                                        {new Date(ticket.appointment_date).toLocaleString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            )}
                            {ticket.notes && (
                                <div className="info-item full-width">
                                    <label>Notes:</label>
                                    <p className="notes-text">{ticket.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="ticket-section contact-section">
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
                                onClick={() => openWhatsApp(ticket.whatsapp_number || '2524026635')}
                            >
                                <i className="fab fa-whatsapp"></i> WhatsApp
                            </button>
                        </div>

                        <div className="clinic-address">
                            <i className="fas fa-map-marker-alt"></i>
                            <span>Xero awr kasoo horjeedka Ayuub Restaurant inyar ka xiga dhanka Masjid Nuur</span>
                        </div>
                    </div>

                    {/* QR Code Placeholder (optional) */}
                    <div className="ticket-footer">
                        <small className="text-muted">
                            Created on {new Date(ticket.created_date).toLocaleDateString()}
                        </small>
                        {ticket.expires_date && (
                            <small className="text-muted">
                                | Expires: {new Date(ticket.expires_date).toLocaleDateString()}
                            </small>
                        )}
                    </div>
                </div>

                {/* Instructions */}
                <div className="ticket-instructions">
                    <h6><i className="fas fa-info-circle"></i> Instructions</h6>
                    <ul>
                        <li>Please arrive 15 minutes before your scheduled appointment time</li>
                        <li>Bring this ticket code with you: <strong>{ticket.ticket_code}</strong></li>
                        <li>If you need to reschedule, contact us via phone or WhatsApp</li>
                        <li>For emergencies, call us immediately</li>
                    </ul>
                </div>

                {/* Clinic Hours */}
                <div className="clinic-hours">
                    <h6><i className="fas fa-clock"></i> Clinic Hours</h6>
                    <p>Saturday - Thursday: 5:00 PM - 10:00 PM</p>
                    <p>Emergency services available 24/7</p>
                </div>
            </div>
        </div>
    );
}

export default PublicTicketView;

