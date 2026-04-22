import React, { useState, useEffect } from 'react';

function TicketLimits({ currentUser, db, setActiveView }) {
    const [dailyLimit, setDailyLimit] = useState(50);
    const [todayTickets, setTodayTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [newLimit, setNewLimit] = useState(50);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            
            // Load today's tickets
            const allTickets = await db.getAll('patient_tickets');
            const today = new Date().toDateString();
            const ticketsToday = allTickets.filter(ticket => {
                const ticketDate = new Date(ticket.created_date).toDateString();
                return ticketDate === today;
            });
            
            setTodayTickets(ticketsToday);
            
            // Load ticket limit from settings (or use default)
            const settings = await db.getAll('clinic_settings');
            const limitSetting = settings.find(s => s.setting_key === 'daily_ticket_limit');
            
            if (limitSetting && limitSetting.setting_value) {
                const limitValue = parseInt(limitSetting.setting_value);
                if (!isNaN(limitValue) && limitValue > 0) {
                    setDailyLimit(limitValue);
                    setNewLimit(limitValue);
                } else {
                    // Invalid value, use default
                    setDailyLimit(50);
                    setNewLimit(50);
                }
            } else {
                // No setting found, use default
                setDailyLimit(50);
                setNewLimit(50);
            }
        } catch (err) {
            console.error('Error loading ticket data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateLimit = async () => {
        if (!newLimit || newLimit < 1) {
            alert('Please enter a valid limit (minimum 1).');
            return;
        }

        try {
            const settings = await db.getAll('clinic_settings');
            const limitSetting = settings.find(s => s.setting_key === 'daily_ticket_limit');
            
            if (limitSetting) {
                // Update existing setting
                await db.update('clinic_settings', limitSetting.id, {
                    setting_value: newLimit.toString(),
                    updated_by: currentUser.id,
                    updated_date: new Date().toISOString()
                });
            } else {
                // Create new setting if it doesn't exist
                await db.add('clinic_settings', {
                    setting_key: 'daily_ticket_limit',
                    setting_value: newLimit.toString(),
                    description: 'Maximum number of tickets that can be generated per day',
                    created_by: currentUser.id,
                    updated_by: currentUser.id,
                    created_date: new Date().toISOString(),
                    updated_date: new Date().toISOString()
                });
            }
            
            // Reload data to ensure we have the latest from database
            await loadData();
            
            setEditMode(false);
            alert('Daily ticket limit updated successfully!');
        } catch (err) {
            console.error('Error updating limit:', err);
            alert('Error updating limit. Please try again.');
        }
    };

    const remaining = dailyLimit - todayTickets.length;
    const percentage = (todayTickets.length / dailyLimit) * 100;

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <i className="fas fa-ticket-alt"></i> Ticket Limits Control
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
            <div className="card-header d-flex justify-content-between align-items-center">
                <div>
                    <i className="fas fa-ticket-alt"></i> Ticket Limits Control
                </div>
                <button 
                    className="btn btn-sm btn-outline-light"
                    onClick={loadData}
                >
                    <i className="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
            <div className="card-body">
                {/* Summary Cards */}
                <div className="row g-3 mb-4">
                    <div className="col-md-4">
                        <div className="card bg-primary text-white">
                            <div className="card-body text-center">
                                <i className="fas fa-ticket-alt fa-2x mb-2"></i>
                                <h3 className="mb-0">{todayTickets.length}</h3>
                                <small>Tickets Today</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card bg-success text-white">
                            <div className="card-body text-center">
                                <i className="fas fa-check-circle fa-2x mb-2"></i>
                                <h3 className="mb-0">{remaining}</h3>
                                <small>Remaining</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="card bg-info text-white">
                            <div className="card-body text-center">
                                <i className="fas fa-calculator fa-2x mb-2"></i>
                                <h3 className="mb-0">{dailyLimit}</h3>
                                <small>Daily Limit</small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="d-flex justify-content-between mb-2">
                        <span>Ticket Usage Today</span>
                        <span className="fw-bold">{todayTickets.length} / {dailyLimit} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div className="progress" style={{ height: '25px' }}>
                        <div 
                            className={`progress-bar ${percentage >= 90 ? 'bg-danger' : percentage >= 75 ? 'bg-warning' : 'bg-success'}`}
                            role="progressbar" 
                            style={{ width: `${percentage}%` }}
                        >
                            {percentage.toFixed(0)}%
                        </div>
                    </div>
                    {percentage >= 90 && (
                        <div className="alert alert-danger mt-3">
                            <i className="fas fa-exclamation-triangle"></i> Warning: You've used {percentage.toFixed(0)}% of today's ticket limit!
                        </div>
                    )}
                </div>

                {/* Daily Limit Control */}
                <div className="card bg-light">
                    <div className="card-body">
                        <h5 className="card-title">
                            <i className="fas fa-cog"></i> Daily Limit Settings
                        </h5>
                        
                        {!editMode ? (
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <p className="mb-0">Current daily ticket limit: <strong>{dailyLimit} tickets</strong></p>
                                </div>
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => setEditMode(true)}
                                >
                                    <i className="fas fa-edit"></i> Change Limit
                                </button>
                            </div>
                        ) : (
                            <div>
                                <label className="form-label">Set New Daily Limit</label>
                                <div className="input-group mb-3">
                                    <input 
                                        type="number"
                                        className="form-control"
                                        value={newLimit}
                                        onChange={(e) => setNewLimit(parseInt(e.target.value) || 0)}
                                        min="1"
                                        max="500"
                                    />
                                    <span className="input-group-text">tickets/day</span>
                                </div>
                                <div className="d-flex gap-2">
                                    <button 
                                        className="btn btn-success"
                                        onClick={handleUpdateLimit}
                                    >
                                        <i className="fas fa-save"></i> Save
                                    </button>
                                    <button 
                                        className="btn btn-secondary"
                                        onClick={() => {
                                            setEditMode(false);
                                            setNewLimit(dailyLimit);
                                        }}
                                    >
                                        <i className="fas fa-times"></i> Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Today's Tickets List */}
                <div className="mt-4">
                    <h5>
                        <i className="fas fa-list"></i> Today's Tickets
                    </h5>
                    <div className="table-responsive">
                        <table className="table table-hover table-sm">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Ticket Number</th>
                                    <th>Patient</th>
                                    <th>Time</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todayTickets.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center text-muted">No tickets generated today</td>
                                    </tr>
                                ) : (
                                    todayTickets.map((ticket, index) => (
                                        <tr key={ticket.id}>
                                            <td>{index + 1}</td>
                                            <td>
                                                <code>{ticket.ticket_number}</code>
                                            </td>
                                            <td>{ticket.patient?.name || 'N/A'}</td>
                                            <td>{new Date(ticket.created_date).toLocaleTimeString()}</td>
                                            <td>
                                                <span className={`badge bg-${
                                                    ticket.status === 'active' ? 'success' :
                                                    ticket.status === 'used' ? 'info' :
                                                    ticket.status === 'cancelled' ? 'danger' : 'warning'
                                                }`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TicketLimits;

