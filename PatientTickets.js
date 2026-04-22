import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

function PatientTickets({ db, currentUser }) {
    const [tickets, setTickets] = useState([]);
    const [patients, setPatients] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState(null);
    
    // Form fields
    const [purpose, setPurpose] = useState('');
    const [appointmentDate, setAppointmentDate] = useState('');
    const [notes, setNotes] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [expiresDate, setExpiresDate] = useState('');
    
    // Filter
    const [filterStatus, setFilterStatus] = useState('all');
    const [ticketSearchTerm, setTicketSearchTerm] = useState('');
    
    // Delete modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [ticketToDelete, setTicketToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        loadTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadTickets = async () => {
        const allTickets = await db.getAllTickets();
        const ticketsWithPatients = await Promise.all(
            allTickets.map(async (ticket) => {
                const patient = await db.getById('patients', ticket.patient_id);
                return { ...ticket, patient };
            })
        );
        setTickets(ticketsWithPatients);
    };

    const searchPatients = async (term) => {
        setSearchTerm(term);
        if (term.length > 0) {
            const results = await db.searchPatients(term);
            setPatients(results);
        } else {
            setPatients([]);
        }
    };

    const selectPatient = (patient) => {
        setSelectedPatient(patient);
        setWhatsappNumber(patient.mobile || '');
        setSearchTerm('');
        setPatients([]);
    };

    const createTicket = async (e) => {
        e.preventDefault();
        
        if (!selectedPatient) {
            alert('Please select a patient first!');
            document.querySelector('.card-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        if (!purpose) {
            alert('Please select a purpose for the ticket!');
            return;
        }

        // Check daily ticket limit
        try {
            const allTickets = await db.getAll('patient_tickets');
            const today = new Date().toDateString();
            const ticketsToday = allTickets.filter(ticket => {
                const ticketDate = new Date(ticket.created_date).toDateString();
                return ticketDate === today;
            });

            // Get daily limit from settings
            const settings = await db.getAll('clinic_settings');
            const limitSetting = settings.find(s => s.setting_key === 'daily_ticket_limit');
            const dailyLimit = limitSetting ? parseInt(limitSetting.setting_value) : 50;

            // Check if limit reached
            if (ticketsToday.length >= dailyLimit) {
                alert(`Daily ticket limit reached! (${ticketsToday.length}/${dailyLimit})\n\nPlease contact administration to increase the limit or try again tomorrow.`);
                return;
            }

            // Show warning if close to limit
            if (ticketsToday.length >= dailyLimit * 0.9) {
                const remaining = dailyLimit - ticketsToday.length;
                if (!window.confirm(`Warning: Only ${remaining} tickets remaining today (${ticketsToday.length}/${dailyLimit} used).\n\nDo you want to continue?`)) {
                    return;
                }
            }
        } catch (err) {
            console.log('Could not check ticket limit:', err);
            // Continue anyway if settings table doesn't exist
        }

        const ticketData = {
            patient_id: selectedPatient.id,
            purpose: purpose,
            appointment_date: appointmentDate ? new Date(appointmentDate).toISOString() : null,
            notes: notes,
            whatsapp_number: whatsappNumber,
            expires_date: expiresDate ? new Date(expiresDate).toISOString() : null,
            created_by: currentUser.id
        };

        try {
            const newTicket = await db.createTicket(ticketData);
            
            if (newTicket) {
                alert('Ticket created successfully!\n\nTicket Number: ' + newTicket.ticket_number + '\nTicket Code: ' + newTicket.ticket_code);
                resetForm();
                loadTickets();
                setShowCreateForm(false);
            }
        } catch (error) {
            console.error('Create ticket error:', error);
            
            if (error.message && error.message.includes('DATABASE_TABLE_MISSING')) {
                alert('❌ DATABASE ERROR: Patient Tickets table not found!\n\n' +
                      '⚠️ IMPORTANT: You need to create the database table first.\n\n' +
                      'Steps to fix:\n' +
                      '1. Open Supabase Dashboard\n' +
                      '2. Go to SQL Editor\n' +
                      '3. Run the file: CREATE_PATIENT_TICKETS_TABLE.sql\n\n' +
                      'Check the browser console (F12) for more details.');
            } else {
                alert('❌ Failed to create ticket!\n\n' +
                      'Error: ' + (error.message || 'Unknown error') + '\n\n' +
                      'Please check:\n' +
                      '1. Database table exists (run CREATE_PATIENT_TICKETS_TABLE.sql)\n' +
                      '2. Supabase connection is working\n' +
                      '3. Browser console (F12) for details');
            }
        }
    };

    const resetForm = () => {
        setSelectedPatient(null);
        setPurpose('');
        setAppointmentDate('');
        setNotes('');
        setWhatsappNumber('');
        setExpiresDate('');
        setSearchTerm('');
        setPatients([]);
    };

    const updateTicketStatus = async (ticketId, newStatus) => {
        const usedDate = newStatus === 'used' ? new Date().toISOString() : null;
        const success = await db.updateTicketStatus(ticketId, newStatus, usedDate);
        
        if (success) {
            alert(`Ticket ${newStatus} successfully!`);
            loadTickets();
        } else {
            alert('Failed to update ticket status.');
        }
    };

    const copyTicketLink = (ticketCode) => {
        const link = `${window.location.origin}/ticket/${ticketCode}`;
        navigator.clipboard.writeText(link);
        alert('Ticket link copied to clipboard!');
    };

    const shareViaWhatsApp = (ticket) => {
        // Step 1: Generate the ticket link
        const link = `${window.location.origin}/ticket/${ticket.ticket_code}`;
        
        // Step 2: Format appointment date if exists
        const appointmentText = ticket.appointment_date 
            ? new Date(ticket.appointment_date).toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : 'Not scheduled yet';
        
        // Step 3: Get ticket number (already in simple format: 1, 2, 3, etc.)
        const simpleTicketNumber = ticket.ticket_number;
        
        // Step 4: Format ticket status
        const statusText = ticket.status?.toUpperCase() || 'ACTIVE';
        
        // Step 5: Build comprehensive message with all ticket information
        // Using simple characters that work well with WhatsApp encoding
        const message = `*BEERGEEL CLINIC APPOINTMENT TICKET*

*YOUR TICKET NUMBER: ${simpleTicketNumber}*

*Patient Information:*
Name: ${ticket.patient?.name || 'N/A'}
Mobile: ${ticket.patient?.mobile || ticket.whatsapp_number || 'N/A'}

*Appointment Details:*
Purpose: ${ticket.purpose || 'Consultation'}
Appointment: ${appointmentText}
Status: ${statusText}
${ticket.notes ? `\nNotes: ${ticket.notes}` : ''}

*View Your Ticket Online:*
${link}

*Clinic Information:*
Beergeel Obstetrics and Gynecology Clinic
Takhasusuka sare ee xanuunada dumarka

Address: Xero awr kasoo horjeedka Ayuub Restaurant inyar ka xiga dhanka Masjid Nuur

Contact: 04026635
Hours: 5:00 PM - 10:00 PM
Emergency: 24/7

Thank you for choosing Beergeel Clinic!`;
        
        // Step 5: Clean phone number (remove all non-digits)
        const cleanPhoneNumber = ticket.whatsapp_number.replace(/\D/g, '');
        
        // Step 6: Create WhatsApp API link using wa.me
        // Format: https://wa.me/{phone_number}?text={encoded_message}
        const whatsappLink = `https://wa.me/${cleanPhoneNumber}?text=${encodeURIComponent(message)}`;
        
        // Step 7: Open WhatsApp in new tab/window
        // This will open WhatsApp Web on desktop or WhatsApp app on mobile
        window.open(whatsappLink, '_blank');
    };

    const handleDeleteClick = (ticket) => {
        setTicketToDelete(ticket);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!ticketToDelete) return;
        
        try {
            setDeleting(true);
            const result = await db.delete('patient_tickets', ticketToDelete.id);
            
            if (result === false) {
                throw new Error('Delete operation returned false. Check database permissions.');
            }
            
            // Remove ticket from local state
            setTickets(tickets.filter(t => t.id !== ticketToDelete.id));
            
            // Close modal and reset state
            setShowDeleteModal(false);
            const deletedCode = ticketToDelete.ticket_code;
            setTicketToDelete(null);
            
            // Show success message
            alert(`Ticket "${deletedCode}" has been deleted successfully.`);
        } catch (err) {
            console.error('Error deleting ticket:', err);
            const errorMessage = err.message || 'Unknown error occurred';
            alert(`Error deleting ticket: ${errorMessage}\n\nPlease check:\n1. Database permissions (RLS policies)\n2. Console for detailed error information`);
        } finally {
            setDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteModal(false);
        setTicketToDelete(null);
    };

    const filteredTickets = tickets.filter(ticket => {
        // Filter by status
        const statusMatch = filterStatus === 'all' || ticket.status === filterStatus;
        
        // Filter by search term (if provided)
        if (!ticketSearchTerm.trim()) {
            return statusMatch;
        }
        
        const searchLower = ticketSearchTerm.toLowerCase().trim();
        const matchesSearch = 
            (ticket.ticket_code && ticket.ticket_code.toLowerCase().includes(searchLower)) ||
            (ticket.ticket_number && ticket.ticket_number.toLowerCase().includes(searchLower)) ||
            (ticket.patient?.name && ticket.patient.name.toLowerCase().includes(searchLower)) ||
            (ticket.patient?.mobile && ticket.patient.mobile.includes(searchLower)) ||
            (ticket.purpose && ticket.purpose.toLowerCase().includes(searchLower));
        
        return statusMatch && matchesSearch;
    });

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
            doc.text('Patient Tickets Report', 14, 50);
            
            // Summary info
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 57);
            doc.text(`Total Tickets: ${filteredTickets.length}`, 14, 63);
            doc.text(`Filter: ${filterStatus === 'all' ? 'All Tickets' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}`, 14, 69);
            doc.text(`Generated by: ${currentUser.name}`, 14, 75);

            // Prepare table data
            const tableData = filteredTickets.map(ticket => [
                ticket.ticket_code || 'N/A',
                ticket.ticket_number || 'N/A',
                ticket.patient?.name || 'Unknown',
                ticket.patient?.mobile || 'N/A',
                ticket.purpose || 'N/A',
                ticket.appointment_date ? new Date(ticket.appointment_date).toLocaleDateString() : 'N/A',
                ticket.status || 'active',
                new Date(ticket.created_date).toLocaleDateString()
            ]);

            // Create table
            doc.autoTable({
                startY: 82,
                head: [['Code', 'Number', 'Patient', 'Mobile', 'Purpose', 'Appointment', 'Status', 'Created']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center',
                    fontSize: 9
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                columnStyles: {
                    0: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
                    1: { cellWidth: 25, halign: 'center' },
                    2: { cellWidth: 28 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 22 },
                    5: { cellWidth: 25, halign: 'center' },
                    6: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
                    7: { cellWidth: 22, halign: 'center' }
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                didParseCell: (data) => {
                    // Color code status column
                    if (data.column.index === 6 && data.section === 'body') {
                        const status = data.cell.text[0];
                        switch(status.toLowerCase()) {
                            case 'active':
                                data.cell.styles.textColor = [46, 204, 113];
                                break;
                            case 'used':
                                data.cell.styles.textColor = [52, 152, 219];
                                break;
                            case 'expired':
                                data.cell.styles.textColor = [243, 156, 18];
                                break;
                            case 'cancelled':
                                data.cell.styles.textColor = [231, 76, 60];
                                break;
                        }
                    }
                }
            });

            // Footer
            const finalY = doc.lastAutoTable.finalY || 82;
            if (finalY < pageHeight - 30) {
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text('This is an official document from Beergeel Obstetrics and Gynecology Clinic', pageWidth / 2, pageHeight - 20, { align: 'center' });
                doc.text(`© ${new Date().getFullYear()} Beergeel Clinic. All rights reserved.`, pageWidth / 2, pageHeight - 15, { align: 'center' });
            }

            // Save the PDF
            const filterText = filterStatus === 'all' ? 'All' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1);
            const fileName = `Patient_Tickets_${filterText}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
        } catch (err) {
            console.error('Error generating PDF:', err);
            alert('Error generating PDF. Please try again.');
        }
    };

    return (
        <>
        <div className="container-fluid p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><i className="fas fa-ticket-alt"></i> Patient Tickets</h2>
                <div className="d-flex gap-2">
                    <button 
                        className="btn btn-danger"
                        onClick={downloadPDF}
                        title="Download Tickets as PDF"
                    >
                        <i className="fas fa-file-pdf"></i> Download PDF
                    </button>
                    <button 
                        className="btn btn-primary"
                        onClick={() => setShowCreateForm(!showCreateForm)}
                    >
                        <i className="fas fa-plus"></i> Create New Ticket
                    </button>
                </div>
            </div>

            {/* Create Ticket Form */}
            {showCreateForm && (
                <div className="card mb-4 shadow-lg">
                    <div className="card-header bg-primary text-white">
                        <h5 className="card-title mb-0">
                            <i className="fas fa-plus-circle"></i> Create New Ticket
                        </h5>
                    </div>
                    <div className="card-body">
                        <form onSubmit={createTicket}>
                            {/* Patient Search - STEP 1 */}
                            <div className="mb-4 p-3" style={{
                                backgroundColor: selectedPatient ? '#d1ecf1' : '#fff3cd',
                                border: `2px solid ${selectedPatient ? '#0c5460' : '#856404'}`,
                                borderRadius: '8px'
                            }}>
                                <label className="form-label fw-bold">
                                    <span className="badge bg-danger me-2">STEP 1</span>
                                    Select Patient (Required) *
                                </label>
                                {selectedPatient ? (
                                    <div className="alert alert-success mb-0">
                                        <i className="fas fa-check-circle me-2"></i>
                                        <strong>Selected Patient:</strong> {selectedPatient.name} - {selectedPatient.mobile}
                                        <button 
                                            type="button" 
                                            className="btn btn-sm btn-outline-secondary ms-3"
                                            onClick={() => setSelectedPatient(null)}
                                        >
                                            <i className="fas fa-exchange-alt"></i> Change Patient
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="alert alert-warning mb-2">
                                            <i className="fas fa-info-circle me-2"></i>
                                            <strong>First, search and select a patient below:</strong>
                                        </div>
                                        <input 
                                            type="text"
                                            className="form-control form-control-lg"
                                            placeholder="🔍 Type patient name or mobile number to search..."
                                            value={searchTerm}
                                            onChange={(e) => searchPatients(e.target.value)}
                                            autoFocus
                                        />
                                        {searchTerm && patients.length === 0 && (
                                            <div className="text-muted mt-2">
                                                <i className="fas fa-search"></i> Type to search patients...
                                            </div>
                                        )}
                                        {patients.length > 0 && (
                                            <div className="list-group mt-2 shadow" style={{maxHeight: '200px', overflowY: 'auto'}}>
                                                {patients.map(patient => (
                                                    <button
                                                        key={patient.id}
                                                        type="button"
                                                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                                        onClick={() => selectPatient(patient)}
                                                    >
                                                        <div>
                                                            <i className="fas fa-user me-2"></i>
                                                            <strong>{patient.name}</strong>
                                                            <span className="text-muted ms-2">({patient.age} yrs, {patient.sex})</span>
                                                        </div>
                                                        <span className="badge bg-primary">{patient.mobile}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Show rest of form only if patient is selected */}
                            {selectedPatient && (
                                <>
                                    <div className="alert alert-info">
                                        <i className="fas fa-arrow-down me-2"></i>
                                        <strong>Great! Now fill in the ticket details below:</strong>
                                    </div>
                                </>
                            )}

                            {/* Purpose */}
                            <div className="mb-3">
                                <label className="form-label fw-bold">
                                    <span className="badge bg-primary me-2">STEP 2</span>
                                    Purpose (Required) *
                                </label>
                                <select 
                                    className="form-select"
                                    value={purpose}
                                    onChange={(e) => setPurpose(e.target.value)}
                                    required
                                    disabled={!selectedPatient}
                                >
                                    <option value="">Select purpose...</option>
                                    <option value="Consultation">Consultation</option>
                                    <option value="Follow-up">Follow-up Visit</option>
                                    <option value="Lab Test">Lab Test</option>
                                    <option value="Ultrasound">Ultrasound</option>
                                    <option value="Prenatal Checkup">Prenatal Checkup</option>
                                    <option value="General Checkup">General Checkup</option>
                                    <option value="Emergency">Emergency</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Appointment Date */}
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="fas fa-calendar me-2"></i>
                                    Appointment Date & Time (Optional)
                                </label>
                                <input 
                                    type="datetime-local"
                                    className="form-control"
                                    value={appointmentDate}
                                    onChange={(e) => setAppointmentDate(e.target.value)}
                                    disabled={!selectedPatient}
                                />
                            </div>

                            {/* WhatsApp Number */}
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="fab fa-whatsapp me-2 text-success"></i>
                                    WhatsApp Number (Optional)
                                </label>
                                <input 
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g., 2524026635"
                                    value={whatsappNumber}
                                    onChange={(e) => setWhatsappNumber(e.target.value)}
                                    disabled={!selectedPatient}
                                />
                                <small className="text-muted">
                                    <i className="fas fa-info-circle me-1"></i>
                                    Include country code (252 for Somalia). This enables WhatsApp sharing.
                                </small>
                            </div>

                            {/* Notes */}
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="fas fa-sticky-note me-2"></i>
                                    Notes (Optional)
                                </label>
                                <textarea 
                                    className="form-control"
                                    rows="3"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Additional notes or instructions..."
                                    disabled={!selectedPatient}
                                />
                            </div>

                            {/* Expiry Date */}
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="fas fa-clock me-2"></i>
                                    Expiry Date (Optional)
                                </label>
                                <input 
                                    type="datetime-local"
                                    className="form-control"
                                    value={expiresDate}
                                    onChange={(e) => setExpiresDate(e.target.value)}
                                    disabled={!selectedPatient}
                                />
                                <small className="text-muted">
                                    <i className="fas fa-info-circle me-1"></i>
                                    Leave empty for no expiration
                                </small>
                            </div>

                            <div className="d-flex gap-2 mt-4">
                                <button 
                                    type="submit" 
                                    className="btn btn-success btn-lg"
                                    disabled={!selectedPatient || !purpose}
                                >
                                    <i className="fas fa-ticket-alt me-2"></i>
                                    Create Ticket
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary btn-lg"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        resetForm();
                                    }}
                                >
                                    <i className="fas fa-times me-2"></i>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Search Tickets */}
            <div className="mb-3">
                <label className="form-label">
                    <i className="fas fa-search me-2"></i>
                    Search Tickets:
                </label>
                <div className="input-group">
                    <input 
                        type="text"
                        className="form-control"
                        placeholder="Search by ticket code, ticket number, patient name, mobile, or purpose..."
                        value={ticketSearchTerm}
                        onChange={(e) => setTicketSearchTerm(e.target.value)}
                    />
                    {ticketSearchTerm && (
                        <button 
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => setTicketSearchTerm('')}
                            title="Clear search"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>
                {ticketSearchTerm && (
                    <small className="text-muted d-block mt-1">
                        <i className="fas fa-info-circle me-1"></i>
                        Showing {filteredTickets.length} ticket(s) matching "{ticketSearchTerm}"
                    </small>
                )}
            </div>

            {/* Filter */}
            <div className="mb-3">
                <label className="form-label">Filter by Status:</label>
                <div className="btn-group">
                    <button 
                        className={`btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setFilterStatus('all')}
                    >
                        All
                    </button>
                    <button 
                        className={`btn btn-sm ${filterStatus === 'active' ? 'btn-success' : 'btn-outline-success'}`}
                        onClick={() => setFilterStatus('active')}
                    >
                        Active
                    </button>
                    <button 
                        className={`btn btn-sm ${filterStatus === 'used' ? 'btn-info' : 'btn-outline-info'}`}
                        onClick={() => setFilterStatus('used')}
                    >
                        Used
                    </button>
                    <button 
                        className={`btn btn-sm ${filterStatus === 'expired' ? 'btn-warning' : 'btn-outline-warning'}`}
                        onClick={() => setFilterStatus('expired')}
                    >
                        Expired
                    </button>
                    <button 
                        className={`btn btn-sm ${filterStatus === 'cancelled' ? 'btn-danger' : 'btn-outline-danger'}`}
                        onClick={() => setFilterStatus('cancelled')}
                    >
                        Cancelled
                    </button>
                </div>
            </div>

            {/* Tickets List */}
            <div className="table-responsive">
                <table className="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>Ticket Code</th>
                            <th>Ticket Number</th>
                            <th>Patient</th>
                            <th>Purpose</th>
                            <th>Appointment</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTickets.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="text-center">No tickets found</td>
                            </tr>
                        ) : (
                            filteredTickets.map(ticket => (
                                <tr key={ticket.id}>
                                    <td>
                                        <strong className="text-primary">{ticket.ticket_code}</strong>
                                    </td>
                                    <td><small>{ticket.ticket_number}</small></td>
                                    <td>
                                        {ticket.patient?.name}
                                        <br />
                                        <small className="text-muted">
                                            <i className="fas fa-phone"></i> {ticket.patient?.mobile || 'N/A'}
                                            <br />
                                            <i className="fas fa-key"></i> <code>{ticket.patient?.password || 'N/A'}</code>
                                        </small>
                                    </td>
                                    <td>{ticket.purpose}</td>
                                    <td>
                                        {ticket.appointment_date ? (
                                            <small>{new Date(ticket.appointment_date).toLocaleString()}</small>
                                        ) : (
                                            <span className="text-muted">N/A</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge ${
                                            ticket.status === 'active' ? 'bg-success' :
                                            ticket.status === 'used' ? 'bg-info' :
                                            ticket.status === 'expired' ? 'bg-warning' :
                                            'bg-danger'
                                        }`}>
                                            {ticket.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        <small>{new Date(ticket.created_date).toLocaleDateString()}</small>
                                    </td>
                                    <td>
                                        <div className="btn-group btn-group-sm">
                                            <button 
                                                className="btn btn-info"
                                                onClick={() => copyTicketLink(ticket.ticket_code)}
                                                title="Copy Link"
                                            >
                                                <i className="fas fa-link"></i>
                                            </button>
                                            {ticket.whatsapp_number && (
                                                <button 
                                                    className="btn btn-success"
                                                    onClick={() => shareViaWhatsApp(ticket)}
                                                    title="Share via WhatsApp"
                                                >
                                                    <i className="fab fa-whatsapp"></i>
                                                </button>
                                            )}
                                            {ticket.status === 'active' && (
                                                <>
                                                    <button 
                                                        className="btn btn-primary"
                                                        onClick={() => updateTicketStatus(ticket.id, 'used')}
                                                        title="Mark as Used"
                                                    >
                                                        <i className="fas fa-check"></i>
                                                    </button>
                                                    <button 
                                                        className="btn btn-warning"
                                                        onClick={() => updateTicketStatus(ticket.id, 'cancelled')}
                                                        title="Cancel Ticket"
                                                    >
                                                        <i className="fas fa-times"></i>
                                                    </button>
                                                </>
                                            )}
                                            <button 
                                                className="btn btn-danger"
                                                onClick={() => handleDeleteClick(ticket)}
                                                title="Delete Ticket"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Delete Confirmation Modal - Outside the container */}
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
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h5 style={{ marginBottom: '20px', color: '#d32f2f' }}>
                            <i className="fas fa-exclamation-triangle text-danger me-2"></i>
                            Confirm Delete Ticket
                        </h5>
                        {ticketToDelete && (
                            <div style={{ marginBottom: '25px' }}>
                                <p>Are you sure you want to delete this ticket?</p>
                                <div style={{ 
                                    backgroundColor: '#f5f5f5', 
                                    padding: '15px', 
                                    borderRadius: '5px',
                                    marginTop: '10px'
                                }}>
                                    <strong>Ticket Code:</strong> {ticketToDelete.ticket_code}<br />
                                    <strong>Ticket Number:</strong> {ticketToDelete.ticket_number}<br />
                                    <strong>Patient:</strong> {ticketToDelete.patient?.name || 'Unknown'}<br />
                                    <strong>Purpose:</strong> {ticketToDelete.purpose || 'N/A'}<br />
                                    <strong>Status:</strong> <span className={`badge ${
                                        ticketToDelete.status === 'active' ? 'bg-success' :
                                        ticketToDelete.status === 'used' ? 'bg-info' :
                                        ticketToDelete.status === 'expired' ? 'bg-warning' :
                                        'bg-danger'
                                    }`}>{ticketToDelete.status.toUpperCase()}</span>
                                </div>
                                <p className="text-danger mt-3" style={{ fontSize: '14px' }}>
                                    <i className="fas fa-exclamation-circle me-1"></i>
                                    This action cannot be undone. The ticket will be permanently deleted.
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
                                        Delete Ticket
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

export default PatientTickets;

