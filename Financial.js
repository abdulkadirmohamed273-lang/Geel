import React, { useState, useEffect } from 'react';

function Financial({ currentUser, db, setActiveView }) {
    const [activeTab, setActiveTab] = useState('receivePayment');
    const [paymentPatientMobile, setPaymentPatientMobile] = useState('');
    const [paymentPatientInfo, setPaymentPatientInfo] = useState(null);
    const [paymentForm, setPaymentForm] = useState({
        amount: '',
        currency: 'Zaad Shilling',
        paymentType: 'consultation',
        description: ''
    });
    const [expenseForm, setExpenseForm] = useState({
        amount: '',
        currency: 'Zaad Shilling',
        category: 'other',
        description: ''
    });
    const [quickPaymentForm, setQuickPaymentForm] = useState({
        name: '',
        mobile: '',
        amount: '',
        currency: 'Zaad Shilling',
        paymentType: 'consultation',
        description: ''
    });
    const [financialSummary, setFinancialSummary] = useState(null);
    const [transactions, setTransactions] = useState([]);

    const currencies = [
        'Zaad Shilling', 'Zaad USD', 'Edahab Shilling', 'Edahab USD',
        'Cash Shilling', 'Cash USD'
    ];

    useEffect(() => {
        const loadInitialData = async () => {
            await Promise.all([
                loadFinancialSummary(),
                loadTransactions()
            ]);
            
            const selectedPatientId = sessionStorage.getItem('selectedPatientId');
            if (selectedPatientId) {
                try {
                    const patient = await db.getById('patients', parseInt(selectedPatientId));
                    if (patient) {
                        setPaymentPatientMobile(patient.mobile);
                        await searchPatientForPayment();
                        sessionStorage.removeItem('selectedPatientId');
                    }
                } catch (err) {
                    console.error('Error loading patient:', err);
                }
            }
        };
        loadInitialData();
    }, []);

    const loadFinancialSummary = async () => {
        try {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            
            const [allPayments, allExpenses] = await Promise.all([
                db.getAll('payments'),
                db.getAll('expenses')
            ]);
            
            console.log('=== FINANCIAL: Loading summary ===');
            console.log('All payments:', allPayments);
            console.log('Today range:', todayStart, 'to', todayEnd);
            
            const payments = allPayments.filter(p => {
                const paymentDate = new Date(p.created_date);
                const isToday = paymentDate >= todayStart && paymentDate <= todayEnd;
                console.log('Payment:', p.id, 'Amount:', p.amount, 'Date:', paymentDate.toLocaleString(), 'Is Today:', isToday);
                return isToday;
            });
            
            const expenses = allExpenses.filter(e => {
                const expenseDate = new Date(e.created_date);
                return expenseDate >= todayStart && expenseDate <= todayEnd;
            });
            
            console.log('Today\'s payments:', payments);
            console.log('Today\'s expenses:', expenses);
            
            const totalIncome = payments.reduce((sum, p) => {
                const amount = parseFloat(p.amount) || 0;
                console.log('Payment amount:', amount);
                return sum + amount;
            }, 0);
            
            const totalExpenses = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
            const netIncome = totalIncome - totalExpenses;

            console.log('FINAL Total Income:', totalIncome);
            console.log('FINAL Total Expenses:', totalExpenses);
            console.log('FINAL Net Income:', netIncome);

            setFinancialSummary({
                totalIncome,
                totalExpenses,
                netIncome
            });
        } catch (err) {
            console.error('Error loading financial summary:', err);
        }
    };

    const loadTransactions = async () => {
        try {
            const [payments, expenses, patients] = await Promise.all([
                db.getAll('payments'),
                db.getAll('expenses'),
                db.getAll('patients')
            ]);
            
            const allTransactions = [
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
            .slice(0, 20);

            setTransactions(allTransactions);
        } catch (err) {
            console.error('Error loading transactions:', err);
        }
    };

    const searchPatientForPayment = async () => {
        try {
            const searchTerm = paymentPatientMobile.trim();
            if (!searchTerm) {
                setPaymentPatientInfo(null);
                return;
            }
            
            // Try searching by mobile first
            let patient = await db.findPatientByMobile(searchTerm);
            
            // If not found by mobile, search by name
            if (!patient) {
                const patients = await db.searchPatients(searchTerm);
                if (patients && patients.length > 0) {
                    // If multiple patients found, take the first one or show selection
                    if (patients.length === 1) {
                        patient = patients[0];
                    } else {
                        // Multiple patients found - show them
                        alert(`Found ${patients.length} patients matching "${searchTerm}":\n\n${patients.map((p, i) => `${i+1}. ${p.name} - ${p.mobile}`).join('\n')}\n\nPlease search using mobile number for exact match.`);
                        return;
                    }
                }
            }
            
            if (patient) {
                setPaymentPatientInfo(patient);
            } else {
                setPaymentPatientInfo(null);
            }
        } catch (err) {
            console.error('Error searching patient:', err);
            setPaymentPatientInfo(null);
        }
    };

    const recordPayment = async () => {
        if (!paymentPatientInfo) {
            alert('Please search and find a valid patient first using the Search button');
            return;
        }

        const amount = parseFloat(paymentForm.amount);
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        try {
            const visits = await db.getPatientVisits(paymentPatientInfo.id);
            const latestVisit = visits[visits.length - 1];

            console.log('Recording payment:', {
                patient_id: paymentPatientInfo.id,
                amount,
                currency: paymentForm.currency,
                payment_type: paymentForm.paymentType
            });

            const result =             await db.add('payments', {
                patient_id: paymentPatientInfo.id,
                visit_id: latestVisit?.id || null,
                amount,
                currency: paymentForm.currency,
                payment_type: paymentForm.paymentType,
                notes: paymentForm.description
            });

            console.log('Payment recorded:', result);

            alert(`✅ Payment of ${amount} ${paymentForm.currency} recorded successfully for ${paymentPatientInfo.name}!\n\nRefreshing summary...`);
            
            setPaymentForm({
                amount: '',
                currency: 'Zaad Shilling',
                paymentType: 'consultation',
                description: ''
            });
            setPaymentPatientMobile('');
            setPaymentPatientInfo(null);
            
            // Force reload
            await Promise.all([
                loadFinancialSummary(),
                loadTransactions()
            ]);
            
            console.log('Summary refreshed!');
        } catch (err) {
            console.error('Error recording payment:', err);
            alert('❌ Error recording payment: ' + err.message);
        }
    };

    const recordExpense = async () => {
        const amount = parseFloat(expenseForm.amount);
        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        try {
            await db.add('expenses', {
                amount,
                currency: expenseForm.currency,
                category: expenseForm.category,
                description: expenseForm.description,
                created_by: currentUser.id
            });

            alert(`Expense of ${amount} ${expenseForm.currency} recorded successfully!`);
            
            setExpenseForm({
                amount: '',
                currency: 'Zaad Shilling',
                category: 'other',
                description: ''
            });
            await Promise.all([
                loadFinancialSummary(),
                loadTransactions()
            ]);
        } catch (err) {
            console.error('Error recording expense:', err);
            alert('Error recording expense. Please try again.');
        }
    };

    const recordQuickPayment = async () => {
        const { name, mobile, amount, currency, paymentType, description } = quickPaymentForm;
        const amountNum = parseFloat(amount);

        if (!name || !amountNum || amountNum <= 0) {
            alert('Please fill all required fields');
            return;
        }

        try {
            let patientId = null;
            if (mobile) {
                let patient = await db.findPatientByMobile(mobile);
                if (!patient) {
                    patient = await db.add('patients', {
                        name,
                        mobile,
                        age: 0,
                        sex: 'Unknown',
                        password: '1234',
                        registered_by: currentUser.id
                    });
                }
                if (patient) {
                    patientId = patient.id;
                }
            }

            await db.add('payments', {
                patient_id: patientId,
                amount: amountNum,
                currency,
                payment_type: paymentType,
                notes: description || `Quick payment - ${name}`
            });

            alert(`Quick payment of ${amountNum} ${currency} recorded for ${name}!`);
            
            setQuickPaymentForm({
                name: '',
                mobile: '',
                amount: '',
                currency: 'Zaad Shilling',
                paymentType: 'consultation',
                description: ''
            });
            await Promise.all([
                loadFinancialSummary(),
                loadTransactions()
            ]);
        } catch (err) {
            console.error('Error recording quick payment:', err);
            alert('Error recording quick payment. Please try again.');
        }
    };

    return (
        <div className="row">
            <div className="col-md-8">
                <div className="card">
                    <div className="card-header">
                        <i className="fas fa-money-bill-wave"></i> Financial Management
                    </div>
                    <div className="card-body">
                        <ul className="nav nav-tabs">
                            <li className="nav-item">
                                <a 
                                    className={`nav-link ${activeTab === 'receivePayment' ? 'active' : ''}`}
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setActiveTab('receivePayment'); }}
                                >
                                    Receive Payment
                                </a>
                            </li>
                            <li className="nav-item">
                                <a 
                                    className={`nav-link ${activeTab === 'recordExpense' ? 'active' : ''}`}
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setActiveTab('recordExpense'); }}
                                >
                                    Record Expense
                                </a>
                            </li>
                            <li className="nav-item">
                                <a 
                                    className={`nav-link ${activeTab === 'quickPatientPayment' ? 'active' : ''}`}
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setActiveTab('quickPatientPayment'); }}
                                >
                                    Quick Patient Payment
                                </a>
                            </li>
                            <li className="nav-item">
                                <a 
                                    className={`nav-link ${activeTab === 'viewTransactions' ? 'active' : ''}`}
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setActiveTab('viewTransactions'); }}
                                >
                                    View Transactions
                                </a>
                            </li>
                        </ul>
                        
                        <div className="tab-content mt-3">
                            {activeTab === 'receivePayment' && (
                                <div className="tab-pane fade show active">
                                    <form>
                                        <div className="mb-3">
                                            <label className="form-label">Select Patient</label>
                                            <div className="input-group">
                                                <input 
                                                    type="text" 
                                                    className="form-control" 
                                                    value={paymentPatientMobile}
                                                    onChange={(e) => {
                                                        setPaymentPatientMobile(e.target.value);
                                                        setPaymentPatientInfo(null);
                                                    }}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            searchPatientForPayment();
                                                        }
                                                    }}
                                                    placeholder="Search by name or mobile number..."
                                                />
                                                <button 
                                                    className="btn btn-outline-secondary" 
                                                    type="button" 
                                                    onClick={searchPatientForPayment}
                                                    disabled={!paymentPatientMobile.trim()}
                                                >
                                                    <i className="fas fa-search"></i> Search
                                                </button>
                                            </div>
                                            <small className="text-muted">
                                                <i className="fas fa-info-circle"></i> 
                                                You can search by patient name or mobile number
                                            </small>
                                            {paymentPatientInfo && (
                                                <div className="alert alert-success py-2 mt-2">
                                                    <i className="fas fa-check-circle"></i> 
                                                    Patient found: <strong>{paymentPatientInfo.name}</strong> ({paymentPatientInfo.sex}, {paymentPatientInfo.age} yrs) - {paymentPatientInfo.mobile}
                                                </div>
                                            )}
                                            {!paymentPatientInfo && paymentPatientMobile && (
                                                <div className="alert alert-warning py-2 mt-2">
                                                    <i className="fas fa-exclamation-triangle"></i> 
                                                    Patient not found. Please check the name or mobile number, or use "Quick Patient Payment" tab.
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Amount *</label>
                                                    <input 
                                                        type="number" 
                                                        className="form-control" 
                                                        value={paymentForm.amount}
                                                        onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Currency *</label>
                                                    <select 
                                                        className="form-select" 
                                                        value={paymentForm.currency}
                                                        onChange={(e) => setPaymentForm({...paymentForm, currency: e.target.value})}
                                                        required
                                                    >
                                                        {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mb-3">
                                            <label className="form-label">Payment Type</label>
                                            <select 
                                                className="form-select" 
                                                value={paymentForm.paymentType}
                                                onChange={(e) => setPaymentForm({...paymentForm, paymentType: e.target.value})}
                                            >
                                                <option value="consultation">Consultation Fee</option>
                                                <option value="ultrasound">Ultrasound</option>
                                                <option value="investigation">Investigation</option>
                                                <option value="drugs">Drugs</option>
                                                <option value="lab_tests">Lab Tests</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        
                                        <div className="mb-3">
                                            <label className="form-label">Description</label>
                                            <textarea 
                                                className="form-control" 
                                                rows="2"
                                                value={paymentForm.description}
                                                onChange={(e) => setPaymentForm({...paymentForm, description: e.target.value})}
                                            />
                                        </div>
                                        
                                        <button 
                                            type="button" 
                                            className="btn btn-primary" 
                                            onClick={recordPayment}
                                            disabled={!paymentPatientInfo}
                                            title={!paymentPatientInfo ? "Please search and find a patient first" : ""}
                                        >
                                            <i className="fas fa-save"></i> Record Payment
                                        </button>
                                        {!paymentPatientInfo && (
                                            <small className="text-danger d-block mt-2">
                                                <i className="fas fa-info-circle"></i> You must find a patient before recording payment
                                            </small>
                                        )}
                                    </form>
                                </div>
                            )}
                            
                            {activeTab === 'recordExpense' && (
                                <div className="tab-pane fade show active">
                                    <form>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Amount *</label>
                                                    <input 
                                                        type="number" 
                                                        className="form-control" 
                                                        value={expenseForm.amount}
                                                        onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Currency *</label>
                                                    <select 
                                                        className="form-select" 
                                                        value={expenseForm.currency}
                                                        onChange={(e) => setExpenseForm({...expenseForm, currency: e.target.value})}
                                                        required
                                                    >
                                                        {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="mb-3">
                                            <label className="form-label">Category</label>
                                            <select 
                                                className="form-select" 
                                                value={expenseForm.category}
                                                onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                                            >
                                                <option value="electricity">Electricity</option>
                                                <option value="rent">Rent</option>
                                                <option value="water">Water</option>
                                                <option value="sanitation">Sanitation</option>
                                                <option value="salary">Salary</option>
                                                <option value="lab_commission">Lab Commission</option>
                                                <option value="doctor_payment">Doctor Payment</option>
                                                <option value="pharmacy_stock">Pharmacy Stock</option>
                                                <option value="maintenance">Maintenance</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                        
                                        <div className="mb-3">
                                            <label className="form-label">Description</label>
                                            <textarea 
                                                className="form-control" 
                                                rows="2"
                                                value={expenseForm.description}
                                                onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                                            />
                                        </div>
                                        
                                        <button type="button" className="btn btn-primary" onClick={recordExpense}>
                                            <i className="fas fa-save"></i> Record Expense
                                        </button>
                                    </form>
                                </div>
                            )}
                            
                            {activeTab === 'quickPatientPayment' && (
                                <div className="tab-pane fade show active">
                                    <div className="alert alert-info">
                                        <i className="fas fa-info-circle"></i> 
                                        Register a quick payment for a patient not in the system
                                    </div>
                                    
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Patient Name *</label>
                                                <input 
                                                    type="text" 
                                                    className="form-control" 
                                                    value={quickPaymentForm.name}
                                                    onChange={(e) => setQuickPaymentForm({...quickPaymentForm, name: e.target.value})}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Mobile Number</label>
                                                <input 
                                                    type="text" 
                                                    className="form-control" 
                                                    value={quickPaymentForm.mobile}
                                                    onChange={(e) => setQuickPaymentForm({...quickPaymentForm, mobile: e.target.value})}
                                                    placeholder="Optional for new patients"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Amount *</label>
                                                <input 
                                                    type="number" 
                                                    className="form-control" 
                                                    value={quickPaymentForm.amount}
                                                    onChange={(e) => setQuickPaymentForm({...quickPaymentForm, amount: e.target.value})}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Currency *</label>
                                                <select 
                                                    className="form-select" 
                                                    value={quickPaymentForm.currency}
                                                    onChange={(e) => setQuickPaymentForm({...quickPaymentForm, currency: e.target.value})}
                                                    required
                                                >
                                                    {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label">Payment Type</label>
                                        <select 
                                            className="form-select" 
                                            value={quickPaymentForm.paymentType}
                                            onChange={(e) => setQuickPaymentForm({...quickPaymentForm, paymentType: e.target.value})}
                                        >
                                            <option value="consultation">Consultation Fee</option>
                                            <option value="ultrasound">Ultrasound</option>
                                            <option value="investigation">Investigation</option>
                                            <option value="drugs">Drugs</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label">Description</label>
                                        <textarea 
                                            className="form-control" 
                                            rows="2"
                                            value={quickPaymentForm.description}
                                            onChange={(e) => setQuickPaymentForm({...quickPaymentForm, description: e.target.value})}
                                        />
                                    </div>
                                    
                                    <button type="button" className="btn btn-success" onClick={recordQuickPayment}>
                                        <i className="fas fa-bolt"></i> Record Quick Payment
                                    </button>
                                </div>
                            )}
                            
                            {activeTab === 'viewTransactions' && (
                                <div className="tab-pane fade show active">
                                    <div className="table-responsive">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Type</th>
                                                    <th>Description</th>
                                                    <th>Patient</th>
                                                    <th>Amount</th>
                                                    <th>Currency</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transactions.map((t, idx) => (
                                                    <tr key={idx} className={t.type === 'Payment' ? 'table-success' : 'table-danger'}>
                                                        <td>{new Date(t.created_date).toLocaleDateString()}</td>
                                                        <td>{t.type}</td>
                                                        <td>{t.description || t.category || t.payment_type || 'No description'}</td>
                                                        <td>{t.patient_name}</td>
                                                        <td>{t.amount}</td>
                                                        <td><span className="currency-badge bg-info">{t.currency}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="col-md-4">
                <div className="card">
                    <div className="card-header">
                        <i className="fas fa-chart-line"></i> Today's Summary
                    </div>
                    <div className="card-body">
                        {financialSummary && (
                            <>
                                <div className="text-center mb-4">
                                    <h3>${financialSummary.totalIncome.toFixed(2)}</h3>
                                    <p className="text-muted">Today's Income</p>
                                </div>
                                
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Total Payments:</span>
                                    <span className="text-success">${financialSummary.totalIncome.toFixed(2)}</span>
                                </div>
                                
                                <div className="d-flex justify-content-between mb-2">
                                    <span>Total Expenses:</span>
                                    <span className="text-danger">${financialSummary.totalExpenses.toFixed(2)}</span>
                                </div>
                                
                                <hr />
                                
                                <div className="d-flex justify-content-between mb-2">
                                    <strong>Net Income:</strong>
                                    <strong className={financialSummary.netIncome >= 0 ? 'text-success' : 'text-danger'}>
                                        ${financialSummary.netIncome.toFixed(2)}
                                    </strong>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                
                <div className="card mt-3">
                    <div className="card-header">
                        <i className="fas fa-exchange-alt"></i> Quick Actions
                    </div>
                    <div className="card-body">
                        <button className="btn btn-primary w-100 mb-2" onClick={() => setActiveView('patientList')}>
                            <i className="fas fa-list"></i> Select from Patient List
                        </button>
                        <button className="btn btn-success w-100 mb-2" onClick={() => setActiveView('registerPatient')}>
                            <i className="fas fa-user-plus"></i> Register New Patient
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Financial;

