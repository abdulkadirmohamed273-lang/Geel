import React, { useState, useEffect } from 'react';

function FinancialView({ currentUser, db, setActiveView }) {
    const [data, setData] = useState({
        todayPayments: 0,
        todayExpenses: 0,
        transactions: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user has access (only Dr. khaalid)
        const hasAccess = currentUser && (
            (currentUser.name && currentUser.name.toLowerCase().includes('khaalid')) ||
            (currentUser.username && currentUser.username.toLowerCase().includes('khaalid')) ||
            (currentUser.id === 2) // ID 2 is Dr. khaalid based on default users
        );
        
        if (!hasAccess) {
            alert('Access denied. Financial View is only available to authorized personnel.');
            setActiveView('dashboard');
            return;
        }
        
        loadData();
    }, [currentUser, setActiveView]);

    const loadData = async () => {
        try {
            setLoading(true);
            const today = new Date().toDateString();
            
            const [payments, expenses, patients] = await Promise.all([
                db.getAll('payments'),
                db.getAll('expenses'),
                db.getAll('patients')
            ]);
            
            const todayPaymentsTotal = payments
                .filter(p => new Date(p.created_date).toDateString() === today)
                .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            
            const todayExpensesTotal = expenses
                .filter(e => new Date(e.created_date).toDateString() === today)
                .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
            
            const transactions = [
                ...payments.map(p => ({
                    ...p, 
                    type: 'Payment',
                    patient_name: patients.find(pat => pat.id == p.patient_id)?.name || 'Unknown'
                })),
                ...expenses.map(e => ({
                    ...e, 
                    type: 'Expense',
                    patient_name: 'N/A'
                }))
            ].sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
            .slice(0, 10);

            setData({
                todayPayments: todayPaymentsTotal,
                todayExpenses: todayExpensesTotal,
                transactions
            });
        } catch (err) {
            console.error('Error loading financial data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <i className="fas fa-money-bill-wave"></i> Financial Overview
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
                <i className="fas fa-money-bill-wave"></i> Financial Overview
            </div>
            <div className="card-body">
                <div className="row mb-4">
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-header">
                                <i className="fas fa-calendar-day"></i> Today's Financial Summary
                            </div>
                            <div className="card-body">
                                <div className="text-center mb-4">
                                    <h3>${data.todayPayments.toFixed(2)}</h3>
                                    <p className="text-muted">Today's Income</p>
                                </div>
                                
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Total Payments:</span>
                                    <span className="text-success">${data.todayPayments.toFixed(2)}</span>
                                </div>
                                
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Total Expenses:</span>
                                    <span className="text-danger">${data.todayExpenses.toFixed(2)}</span>
                                </div>
                                
                                <hr />
                                
                                <div className="d-flex justify-content-between mb-2">
                                    <strong>Net Income:</strong>
                                    <strong className={(data.todayPayments - data.todayExpenses) >= 0 ? 'text-success' : 'text-danger'}>
                                        ${(data.todayPayments - data.todayExpenses).toFixed(2)}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-header">
                                <i className="fas fa-list"></i> Recent Transactions
                            </div>
                            <div className="card-body">
                                <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    <table className="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Time</th>
                                                <th>Type</th>
                                                <th>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.transactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan="3" className="text-center text-muted">No transactions</td>
                                                </tr>
                                            ) : (
                                                data.transactions.map((t, idx) => (
                                                    <tr key={idx} className={t.type === 'Payment' ? 'table-success' : 'table-danger'}>
                                                        <td>{new Date(t.created_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                                        <td>{t.type}</td>
                                                        <td>${parseFloat(t.amount).toFixed(2)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="alert alert-info">
                    <i className="fas fa-info-circle"></i> 
                    Doctor's view only shows financial summaries. For detailed management, please contact reception.
                </div>
            </div>
        </div>
    );
}

export default FinancialView;
