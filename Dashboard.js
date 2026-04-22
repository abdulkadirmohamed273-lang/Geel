import React, { useState, useEffect } from 'react';

function Dashboard({ currentUser, currentRole, db, setActiveView }) {
    const [notice, setNotice] = useState('');
    const [incomeFilter, setIncomeFilter] = useState('day'); // 'day', 'month', 'year'
    const [paymentMethodFilter, setPaymentMethodFilter] = useState('all'); // 'all', 'eDahab USD', 'Zaad USD', 'eDahab Cash', 'Zaad Cash'
    const [dashboardData, setDashboardData] = useState({
        todayVisits: [],
        totalPatients: 0,
        todayPayments: 0,
        monthPayments: 0,
        yearPayments: 0,
        // Payment method breakdowns
        todayPaymentsByMethod: {
            'eDahab USD': 0,
            'Zaad USD': 0,
            'eDahab Cash': 0,
            'Zaad Cash': 0
        },
        monthPaymentsByMethod: {
            'eDahab USD': 0,
            'Zaad USD': 0,
            'eDahab Cash': 0,
            'Zaad Cash': 0
        },
        yearPaymentsByMethod: {
            'eDahab USD': 0,
            'Zaad USD': 0,
            'eDahab Cash': 0,
            'Zaad Cash': 0
        },
        queueCounts: {
            doctor: 0,
            pharmacy: 0,
            lab: 0
        },
        patientVisits: [],
        prescriptionsCount: 0,
        labTestsCount: 0,
        loading: true
    });

    // Helper function to normalize currency to payment method
    const normalizePaymentMethod = (currency) => {
        if (!currency) return null;
        const normalized = currency.toString().trim();
        if (normalized === 'Zaad USD') return 'Zaad USD';
        if (normalized === 'Edahab USD') return 'eDahab USD';
        if (normalized === 'Zaad Shilling') return 'Zaad Cash';
        if (normalized === 'Edahab Shilling') return 'eDahab Cash';
        // For other currencies, try to map them
        if (normalized.includes('Zaad') && normalized.includes('USD')) return 'Zaad USD';
        if (normalized.includes('Edahab') && normalized.includes('USD')) return 'eDahab USD';
        if (normalized.includes('Zaad') && (normalized.includes('Shilling') || normalized.includes('Cash'))) return 'Zaad Cash';
        if (normalized.includes('Edahab') && (normalized.includes('Shilling') || normalized.includes('Cash'))) return 'eDahab Cash';
        return null;
    };

    useEffect(() => {
        updateHomePageNotice();
        loadDashboardData();
    }, [currentRole, currentUser]);

    const updateHomePageNotice = async () => {
        try {
            const notices = await db.getAll('notices');
            if (notices.length > 0) {
                setNotice(notices[0].content);
            } else {
                setNotice('No notice available. Click Edit to add one.');
            }
        } catch (err) {
            console.error('Error loading notices:', err);
            setNotice('No notice available. Click Edit to add one.');
        }
    };

    const loadDashboardData = async () => {
        try {
            setDashboardData(prev => ({ ...prev, loading: true }));

            // Load basic stats for reception
            const [todayVisits, allPatients, allPayments, allExpenses] = await Promise.all([
                db.getTodayVisits(),
                db.getAll('patients'),
                db.getAll('payments'),
                db.getAll('expenses')
            ]);

            // More flexible date comparison
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            
            console.log('=== DASHBOARD: Loading data ===');
            console.log('All payments:', allPayments);
            console.log('Today range:', todayStart, 'to', todayEnd);
            
            // Helper function to calculate payments by method
            const calculatePaymentsByMethod = (paymentsList) => {
                const byMethod = {
                    'eDahab USD': 0,
                    'Zaad USD': 0,
                    'eDahab Cash': 0,
                    'Zaad Cash': 0
                };
                
                paymentsList.forEach(p => {
                    const method = normalizePaymentMethod(p.currency);
                    if (method && byMethod.hasOwnProperty(method)) {
                        byMethod[method] += parseFloat(p.amount) || 0;
                    }
                });
                
                return byMethod;
            };

            const todayPaymentsList = allPayments.filter(p => {
                const paymentDate = new Date(p.created_date);
                const isToday = paymentDate >= todayStart && paymentDate <= todayEnd;
                return isToday;
            });
            
            const todayPayments = todayPaymentsList.reduce((sum, p) => {
                return sum + (parseFloat(p.amount) || 0);
            }, 0);
            const todayPaymentsByMethod = calculatePaymentsByMethod(todayPaymentsList);

            // Calculate month income and expenses
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            const monthPaymentsList = allPayments.filter(p => {
                const paymentDate = new Date(p.created_date);
                return paymentDate >= monthStart && paymentDate <= monthEnd;
            });
            const monthPaymentsTotal = monthPaymentsList.reduce((sum, p) => {
                return sum + (parseFloat(p.amount) || 0);
            }, 0);
            const monthPaymentsByMethod = calculatePaymentsByMethod(monthPaymentsList);
            
            // Calculate month expenses
            const monthExpensesList = allExpenses.filter(e => {
                const expenseDate = new Date(e.created_date);
                return expenseDate >= monthStart && expenseDate <= monthEnd;
            });
            const monthExpensesTotal = monthExpensesList.reduce((sum, e) => {
                return sum + (parseFloat(e.amount) || 0);
            }, 0);
            
            // Net month income (income - expenses)
            const monthPayments = monthPaymentsTotal - monthExpensesTotal;

            // Calculate year income
            const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
            const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            const yearPaymentsList = allPayments.filter(p => {
                const paymentDate = new Date(p.created_date);
                return paymentDate >= yearStart && paymentDate <= yearEnd;
            });
            const yearPayments = yearPaymentsList.reduce((sum, p) => {
                return sum + (parseFloat(p.amount) || 0);
            }, 0);
            const yearPaymentsByMethod = calculatePaymentsByMethod(yearPaymentsList);

            // Load queue counts
            const [doctorQueue, pharmacyQueue, labQueue] = await Promise.all([
                db.getQueueForDepartment('doctor'),
                db.getQueueForDepartment('pharmacy'),
                db.getQueueForDepartment('lab')
            ]);

            // Load patient-specific data if patient role
            let patientVisits = [];
            let prescriptionsCount = 0;
            let labTestsCount = 0;

            if (currentRole === 'patient') {
                patientVisits = await db.getPatientVisits(currentUser.id);
                
                const [allPrescriptions, allLabRequests, allVisits] = await Promise.all([
                    db.getAll('prescriptions'),
                    db.getAll('lab_requests'),
                    db.getAll('visits')
                ]);

                prescriptionsCount = allPrescriptions.filter(p => {
                    const visit = allVisits.find(v => v.id === p.visit_id);
                    return visit && visit.patient_id == currentUser.id;
                }).length;

                labTestsCount = allLabRequests.filter(l => {
                    const visit = allVisits.find(v => v.id === l.visit_id);
                    return visit && visit.patient_id == currentUser.id;
                }).length;
            }

            setDashboardData({
                todayVisits,
                totalPatients: allPatients.length,
                todayPayments,
                monthPayments,
                yearPayments,
                todayPaymentsByMethod,
                monthPaymentsByMethod,
                yearPaymentsByMethod,
                queueCounts: {
                    doctor: doctorQueue.length,
                    pharmacy: pharmacyQueue.length,
                    lab: labQueue.length
                },
                patientVisits,
                prescriptionsCount,
                labTestsCount,
                loading: false
            });
        } catch (err) {
            console.error('Error loading dashboard data:', err);
            setDashboardData(prev => ({ ...prev, loading: false }));
        }
    };

    const editNotice = () => {
        setActiveView('noticeBoard');
    };

    const printPatientReport = async () => {
        try {
            const patient = currentUser;
            const visits = await db.getPatientVisits(patient.id);
            
            if (visits.length === 0) {
                alert('No visit history found');
                return;
            }

            const latestVisit = visits[visits.length - 1];
            
            const [allConsultations, allLabRequests, allPrescriptions] = await Promise.all([
                db.getAll('consultations'),
                db.getAll('lab_requests'),
                db.getAll('prescriptions')
            ]);

            const consultation = allConsultations.find(c => c.visit_id == latestVisit.id);
            const labRequest = allLabRequests.find(l => l.visit_id == latestVisit.id);
            const prescription = allPrescriptions.find(p => p.visit_id == latestVisit.id);

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
                            <tr><th>Visit Date:</th><td>${new Date(latestVisit.created_date).toLocaleDateString()}</td></tr>
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
                                <td>${latestVisit.bp || 'N/A'}</td>
                                <td>${latestVisit.pulse || 'N/A'}</td>
                                <td>${latestVisit.temp || 'N/A'}°C</td>
                                <td>${latestVisit.weight || 'N/A'} kg</td>
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
                    </div>
                    ` : ''}
                    
                    ${prescription ? `
                    <div class="section">
                        <h2>Prescription</h2>
                        <p>${prescription.medication || 'N/A'}</p>
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
            console.error('Error generating report:', err);
            alert('Error generating report. Please try again.');
        }
    };

    const renderDashboard = () => {
        if (dashboardData.loading) {
            return (
                <div className="text-center p-4">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            );
        }

        const { todayVisits, totalPatients, todayPayments, todayPaymentsByMethod, monthPayments, monthPaymentsByMethod, yearPayments, yearPaymentsByMethod, queueCounts, patientVisits, prescriptionsCount, labTestsCount } = dashboardData;

        // Get payments by method based on selected filters
        const getCurrentPaymentsByMethod = () => {
            if (incomeFilter === 'day') return todayPaymentsByMethod;
            if (incomeFilter === 'month') return monthPaymentsByMethod;
            return yearPaymentsByMethod;
        };

        const getCurrentTotalPayment = () => {
            if (incomeFilter === 'day') return todayPayments;
            if (incomeFilter === 'month') return monthPayments;
            return yearPayments;
        };

        // Calculate displayed amount based on payment method filter
        const getDisplayedAmount = () => {
            const byMethod = getCurrentPaymentsByMethod();
            if (paymentMethodFilter === 'all') {
                return getCurrentTotalPayment();
            }
            return byMethod[paymentMethodFilter] || 0;
        };

        // Calculate separate cash and dollar totals
        const getCashAndDollarTotals = () => {
            const byMethod = getCurrentPaymentsByMethod();
            const cashTotal = (byMethod['eDahab Cash'] || 0) + (byMethod['Zaad Cash'] || 0);
            const dollarTotal = (byMethod['eDahab USD'] || 0) + (byMethod['Zaad USD'] || 0);
            return { cashTotal, dollarTotal };
        };

        // Format amount based on payment method (USD shows $, Cash doesn't)
        const formatAmount = (amount, method) => {
            const isCash = method && (method.includes('Cash') || method === 'eDahab Cash' || method === 'Zaad Cash');
            return isCash ? amount.toFixed(2) : `$${amount.toFixed(2)}`;
        };

        switch(currentRole) {
            case 'reception':
                return (
                    <>
                        <div className="row mb-4">
                            <div className="col-md-12">
                                <div className="card">
                                    <div className="card-header">
                                        <i className="fas fa-hospital"></i> Clinic Information
                                    </div>
                                    <div className="card-body">
                                        <h5>Beergeel Obstetrics and Gynecology Clinic</h5>
                                        <p className="mb-1"><i className="fas fa-map-marker-alt"></i> Xero awr kasoo horjeedka Ayuub Restaurant inyar ka xiga dhanka Masjid Nuur</p>
                                        <p className="mb-1"><i className="fas fa-phone"></i> Contact: 0634026635 (Mobile/WhatsApp)</p>
                                        <p className="mb-0">
                                            <strong>Welcome {currentUser.name}</strong> | 
                                            <i className="fas fa-phone ms-2"></i> Mobile: {currentUser.mobile || 'N/A'} | 
                                            <i className="fas fa-key ms-2"></i> Password: <code>{currentUser.password || 'N/A'}</code>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-4">
                                <div 
                                    className="card stat-card" 
                                    style={{ cursor: 'pointer', transition: 'transform 0.2s ease-in-out' }}
                                    onClick={() => setActiveView('todayVisits')}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <i className="fas fa-users fa-2x text-primary"></i>
                                    <div className="stat-number">{todayVisits.length}</div>
                                    <div className="stat-label">Today's Visits</div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div 
                                    className="card stat-card" 
                                    style={{ cursor: 'pointer', transition: 'transform 0.2s ease-in-out' }}
                                    onClick={() => setActiveView('patientList')}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <i className="fas fa-user-injured fa-2x text-success"></i>
                                    <div className="stat-number">{totalPatients}</div>
                                    <div className="stat-label">Total Patients</div>
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div 
                                    className="card income-card" 
                                    style={{ 
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                        border: 'none',
                                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                                        borderRadius: '20px',
                                        padding: '24px',
                                        minHeight: '380px',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Decorative gradient overlay */}
                                    <div style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        width: '150px',
                                        height: '150px',
                                        background: 'linear-gradient(135deg, rgba(52, 152, 219, 0.1) 0%, rgba(155, 89, 182, 0.05) 100%)',
                                        borderRadius: '50%',
                                        transform: 'translate(30%, -30%)',
                                        zIndex: 0
                                    }}></div>

                                    <div style={{ position: 'relative', zIndex: 1 }}>
                                        {/* Time Filter Buttons */}
                                        <div style={{
                                            display: 'flex',
                                            gap: '8px',
                                            justifyContent: 'center',
                                            marginBottom: '20px'
                                        }}>
                                            {[
                                                { key: 'day', label: 'Day', icon: 'fa-calendar-day' },
                                                { key: 'month', label: 'Month', icon: 'fa-calendar-alt' },
                                                { key: 'year', label: 'Year', icon: 'fa-calendar' }
                                            ].map(({ key, label, icon }) => {
                                                const isActive = incomeFilter === key;
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setIncomeFilter(key);
                                                        }}
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px',
                                                            padding: '10px 16px',
                                                            border: isActive ? '2px solid #3498db' : '1px solid #dee2e6',
                                                            borderRadius: '8px',
                                                            backgroundColor: '#ffffff',
                                                            color: '#6c757d',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            boxShadow: 'none',
                                                            minWidth: '70px',
                                                            outline: 'none'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!isActive) {
                                                                e.currentTarget.style.borderColor = '#adb5bd';
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (!isActive) {
                                                                e.currentTarget.style.borderColor = '#dee2e6';
                                                            }
                                                        }}
                                                        onFocus={(e) => {
                                                            e.currentTarget.style.border = '2px solid #3498db';
                                                        }}
                                                        onBlur={(e) => {
                                                            if (!isActive) {
                                                                e.currentTarget.style.border = '1px solid #dee2e6';
                                                            }
                                                        }}
                                                    >
                                                        <i 
                                                            className={`fas ${icon}`} 
                                                            style={{
                                                                fontSize: '1rem',
                                                                color: '#6c757d'
                                                            }}
                                                        ></i>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: '500',
                                                            color: '#6c757d'
                                                        }}>
                                                            {label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        
                                        {/* Payment Method Filter Dropdown */}
                                        <div style={{ 
                                            marginBottom: '20px',
                                            display: 'flex',
                                            justifyContent: 'center'
                                        }}>
                                            <div style={{ position: 'relative', width: '100%', maxWidth: '200px' }}>
                                                <select
                                                    value={paymentMethodFilter}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        setPaymentMethodFilter(e.target.value);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 35px 10px 15px',
                                                        fontSize: '0.85rem',
                                                        fontWeight: '500',
                                                        color: '#495057',
                                                        backgroundColor: '#ffffff',
                                                        border: '1px solid #dee2e6',
                                                        borderRadius: '8px',
                                                        appearance: 'none',
                                                        WebkitAppearance: 'none',
                                                        MozAppearance: 'none',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease',
                                                        outline: 'none',
                                                        boxShadow: 'none'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.borderColor = '#adb5bd';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (document.activeElement !== e.target) {
                                                            e.target.style.borderColor = '#dee2e6';
                                                        }
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.style.border = '2px solid #3498db';
                                                        e.target.style.boxShadow = 'none';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.border = '1px solid #dee2e6';
                                                        e.target.style.boxShadow = 'none';
                                                    }}
                                                >
                                                    <option value="all">All Payment Methods</option>
                                                    <option value="eDahab USD">eDahab USD</option>
                                                    <option value="Zaad USD">Zaad USD</option>
                                                    <option value="eDahab Cash">eDahab Cash</option>
                                                    <option value="Zaad Cash">Zaad Cash</option>
                                                </select>
                                                <div style={{
                                                    position: 'absolute',
                                                    right: '12px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    pointerEvents: 'none',
                                                    color: '#6c757d',
                                                    fontSize: '0.75rem'
                                                }}>
                                                    <i className="fas fa-chevron-down"></i>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Icon */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'center',
                                            marginBottom: '15px'
                                        }}>
                                            <div style={{
                                                width: '70px',
                                                height: '70px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 6px 20px rgba(243, 156, 18, 0.35)'
                                            }}>
                                                <i className="fas fa-money-bill-wave" style={{ fontSize: '2rem', color: 'white' }}></i>
                                            </div>
                                        </div>

                                        {/* Main Amount - Show separate Cash and Dollar when "All" is selected */}
                                        {paymentMethodFilter === 'all' ? (
                                            <div style={{ marginBottom: '10px' }}>
                                                {(() => {
                                                    const { cashTotal, dollarTotal } = getCashAndDollarTotals();
                                                    return (
                                                        <>
                                                            <div style={{
                                                                fontSize: '2.5rem',
                                                                fontWeight: '700',
                                                                background: 'linear-gradient(135deg, #3498db 0%, #9b59b6 100%)',
                                                                WebkitBackgroundClip: 'text',
                                                                WebkitTextFillColor: 'transparent',
                                                                backgroundClip: 'text',
                                                                textAlign: 'center',
                                                                lineHeight: '1',
                                                                marginBottom: '8px'
                                                            }}>
                                                                ${dollarTotal.toFixed(2)}
                                                            </div>
                                                            <div style={{
                                                                fontSize: '1.2rem',
                                                                fontWeight: '600',
                                                                color: '#6c757d',
                                                                textAlign: 'center',
                                                                marginBottom: '4px'
                                                            }}>
                                                                USD
                                                            </div>
                                                            <div style={{
                                                                fontSize: '2.5rem',
                                                                fontWeight: '700',
                                                                background: 'linear-gradient(135deg, #9b59b6 0%, #e74c3c 100%)',
                                                                WebkitBackgroundClip: 'text',
                                                                WebkitTextFillColor: 'transparent',
                                                                backgroundClip: 'text',
                                                                textAlign: 'center',
                                                                lineHeight: '1',
                                                                marginTop: '12px'
                                                            }}>
                                                                {cashTotal.toFixed(2)}
                                                            </div>
                                                            <div style={{
                                                                fontSize: '1.2rem',
                                                                fontWeight: '600',
                                                                color: '#6c757d',
                                                                textAlign: 'center'
                                                            }}>
                                                                Cash
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <div style={{
                                                fontSize: '3rem',
                                                fontWeight: '700',
                                                background: 'linear-gradient(135deg, #3498db 0%, #9b59b6 100%)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                backgroundClip: 'text',
                                                marginBottom: '10px',
                                                textAlign: 'center',
                                                lineHeight: '1'
                                            }}>
                                                {formatAmount(getDisplayedAmount(), paymentMethodFilter)}
                                            </div>
                                        )}

                                        {/* Label */}
                                        <div style={{
                                            textAlign: 'center',
                                            marginBottom: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            flexWrap: 'wrap'
                                        }}>
                                            <span style={{
                                                color: '#7f8c8d',
                                                fontSize: '0.9rem',
                                                textTransform: 'uppercase',
                                                letterSpacing: '1.5px',
                                                fontWeight: '600'
                                            }}>
                                                {incomeFilter === 'day' ? "Today's Income" : 
                                                 incomeFilter === 'month' ? "This Month's Income" : 
                                                 "This Year's Income"}
                                            </span>
                                            {paymentMethodFilter !== 'all' && (
                                                <span className="badge" style={{
                                                    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                                                    padding: '4px 10px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '600'
                                                }}>
                                                    {paymentMethodFilter}
                                                </span>
                                            )}
                                            <button 
                                                className="btn btn-link p-0" 
                                                style={{ 
                                                    color: '#95a5a6',
                                                    padding: '0',
                                                    minWidth: 'auto'
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    loadDashboardData();
                                                }}
                                                title="Refresh"
                                                onMouseEnter={(e) => {
                                                    e.target.style.color = '#3498db';
                                                    e.target.style.transform = 'rotate(180deg)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.target.style.color = '#95a5a6';
                                                    e.target.style.transform = 'rotate(0deg)';
                                                }}
                                            >
                                                <i className="fas fa-sync-alt" style={{ transition: 'transform 0.3s ease' }}></i>
                                            </button>
                                        </div>
                                        
                                        {/* Breakdown by Payment Method */}
                                        {paymentMethodFilter === 'all' && (
                                            <div style={{
                                                marginTop: '20px',
                                                paddingTop: '20px',
                                                borderTop: '2px solid #e9ecef'
                                            }}>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    color: '#95a5a6',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '1px',
                                                    textAlign: 'center',
                                                    marginBottom: '12px'
                                                }}>
                                                    Breakdown by Payment Method
                                                </div>
                                                <div className="row" style={{ gap: '8px 0' }}>
                                                    {[
                                                        { key: 'eDahab USD', icon: 'fa-mobile-alt', color: '#3498db' },
                                                        { key: 'Zaad USD', icon: 'fa-mobile-alt', color: '#2ecc71' },
                                                        { key: 'eDahab Cash', icon: 'fa-money-bill', color: '#9b59b6' },
                                                        { key: 'Zaad Cash', icon: 'fa-money-bill', color: '#e74c3c' }
                                                    ].map(({ key, icon, color }) => (
                                                        <div key={key} className="col-6" style={{ marginBottom: '8px' }}>
                                                            <div style={{
                                                                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                                                padding: '12px 8px',
                                                                borderRadius: '12px',
                                                                border: `2px solid ${color}20`,
                                                                textAlign: 'center',
                                                                transition: 'all 0.2s ease'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                                e.currentTarget.style.boxShadow = `0 4px 12px ${color}30`;
                                                                e.currentTarget.style.borderColor = `${color}40`;
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.transform = 'translateY(0)';
                                                                e.currentTarget.style.boxShadow = 'none';
                                                                e.currentTarget.style.borderColor = `${color}20`;
                                                            }}
                                                            >
                                                                <i className={`fas ${icon}`} style={{ 
                                                                    color: color, 
                                                                    fontSize: '1rem',
                                                                    marginBottom: '6px'
                                                                }}></i>
                                                                <div style={{ 
                                                                    color: '#6c757d', 
                                                                    fontWeight: '600',
                                                                    fontSize: '0.65rem',
                                                                    marginBottom: '4px',
                                                                    lineHeight: '1.2'
                                                                }}>
                                                                    {key}
                                                                </div>
                                                                <div style={{ 
                                                                    color: color, 
                                                                    fontWeight: '700',
                                                                    fontSize: '0.9rem'
                                                                }}>
                                                                    {formatAmount(getCurrentPaymentsByMethod()[key], key)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row mt-4">
                            <div className="col-md-6">
                                <div className="card">
                                    <div className="card-header">
                                        <i className="fas fa-bell"></i> Notice Board
                                    </div>
                                    <div className="card-body notice-board">
                                        <div className="notice-header">
                                            <span>Clinic Notice</span>
                                            <button className="btn btn-sm btn-primary" onClick={editNotice}>
                                                <i className="fas fa-edit"></i> Edit
                                            </button>
                                        </div>
                                        <div>{notice}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="card">
                                    <div className="card-header">
                                        <i className="fas fa-list"></i> Quick Actions
                                    </div>
                                    <div className="card-body">
                                        <button className="btn btn-primary mb-2 w-100" onClick={() => setActiveView('registerPatient')}>
                                            <i className="fas fa-user-plus"></i> Register New Patient
                                        </button>
                                        <button className="btn btn-success mb-2 w-100" onClick={() => setActiveView('createVisit')}>
                                            <i className="fas fa-stethoscope"></i> Create New Visit
                                        </button>
                                        <button className="btn btn-warning mb-2 w-100" onClick={() => setActiveView('financial')}>
                                            <i className="fas fa-money-bill"></i> Record Payment
                                        </button>
                                        <button className="btn btn-info mb-2 w-100" onClick={() => setActiveView('patientList')}>
                                            <i className="fas fa-list"></i> View Patient List
                                        </button>
                                        <button className="btn btn-dark mb-2 w-100" onClick={() => setActiveView('accountManagement')}>
                                            <i className="fas fa-users-cog"></i> Account Management
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                );
            case 'doctor':
                return (
                    <>
                        <div className="row mb-4">
                            <div className="col-md-12">
                                <div className="card">
                                    <div className="card-header">
                                        <i className="fas fa-hospital"></i> Clinic Information
                                    </div>
                                    <div className="card-body">
                                        <h5>Beergeel Obstetrics and Gynecology Clinic</h5>
                                        <p className="mb-1"><i className="fas fa-map-marker-alt"></i> Xero awr kasoo horjeedka Ayuub Restaurant inyar ka xiga dhanka Masjid Nuur</p>
                                        <p className="mb-0"><i className="fas fa-phone"></i> Contact: 0634026635 (Mobile/WhatsApp)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-12">
                                <div className="card">
                                    <div className="card-header">
                                        <i className="fas fa-user-md"></i> Doctor Dashboard
                                    </div>
                                    <div className="card-body">
                                        <h4>Welcome Dr. {currentUser.name?.split(' ')[1] || currentUser.name}</h4>
                                        <p className="mb-2">
                                            <i className="fas fa-phone"></i> Mobile: {currentUser.mobile || 'N/A'} | 
                                            <i className="fas fa-key"></i> Password: <code>{currentUser.password || 'N/A'}</code>
                                        </p>
                                        <p>You have <span className="badge bg-danger">{queueCounts.doctor}</span> patients waiting for consultation.</p>
                                        <div className="d-flex gap-2">
                                            <button className="btn btn-primary" onClick={() => setActiveView('doctorQueue')}>
                                                <i className="fas fa-users"></i> View Patient Queue
                                            </button>
                                            <button className="btn btn-success" onClick={() => setActiveView('patientList')}>
                                                <i className="fas fa-list"></i> View Patient List
                                            </button>
                                            <button className="btn btn-warning" onClick={() => setActiveView('financialView')}>
                                                <i className="fas fa-money-bill"></i> View Financial
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                );
            case 'pharmacy':
                return (
                    <>
                        <div className="row mb-4">
                            <div className="col-md-12">
                                <div className="card">
                                    <div className="card-header">
                                        <i className="fas fa-hospital"></i> Clinic Information
                                    </div>
                                    <div className="card-body">
                                        <h5>Beergeel Obstetrics and Gynecology Clinic</h5>
                                        <p className="mb-1"><i className="fas fa-map-marker-alt"></i> Xero awr kasoo horjeedka Ayuub Restaurant inyar ka xiga dhanka Masjid Nuur</p>
                                        <p className="mb-0"><i className="fas fa-phone"></i> Contact: 0634026635 (Mobile/WhatsApp)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-12">
                                <div className="card">
                                    <div className="card-header">
                                        <i className="fas fa-pills"></i> Pharmacy Dashboard
                                    </div>
                                    <div className="card-body">
                                        <h4>Welcome {currentUser.name}</h4>
                                        <p className="mb-2">
                                            <i className="fas fa-phone"></i> Mobile: {currentUser.mobile || 'N/A'} | 
                                            <i className="fas fa-key"></i> Password: <code>{currentUser.password || 'N/A'}</code>
                                        </p>
                                        <p>You have <span className="badge bg-danger">{queueCounts.pharmacy}</span> prescriptions waiting.</p>
                                        <button className="btn btn-primary" onClick={() => setActiveView('pharmacyQueue')}>
                                            <i className="fas fa-users"></i> View Pharmacy Queue
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                );
            case 'lab':
                return (
                    <>
                        <div className="row mb-4">
                            <div className="col-md-12">
                                <div className="card">
                                    <div className="card-header">
                                        <i className="fas fa-hospital"></i> Clinic Information
                                    </div>
                                    <div className="card-body">
                                        <h5>Beergeel Obstetrics and Gynecology Clinic</h5>
                                        <p className="mb-1"><i className="fas fa-map-marker-alt"></i> Xero awr kasoo horjeedka Ayuub Restaurant inyar ka xiga dhanka Masjid Nuur</p>
                                        <p className="mb-0"><i className="fas fa-phone"></i> Contact: 0634026635 (Mobile/WhatsApp)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-12">
                                <div className="card">
                                    <div className="card-header">
                                        <i className="fas fa-flask"></i> Laboratory Dashboard
                                    </div>
                                    <div className="card-body">
                                        <h4>Welcome {currentUser.name}</h4>
                                        <p className="mb-2">
                                            <i className="fas fa-phone"></i> Mobile: {currentUser.mobile || 'N/A'} | 
                                            <i className="fas fa-key"></i> Password: <code>{currentUser.password || 'N/A'}</code>
                                        </p>
                                        <p>You have <span className="badge bg-danger">{queueCounts.lab}</span> lab tests pending.</p>
                                        <button className="btn btn-primary" onClick={() => setActiveView('labQueue')}>
                                            <i className="fas fa-users"></i> View Lab Queue
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                );
            case 'patient':
                const lastVisit = patientVisits[patientVisits.length - 1];
                return (
                    <>
                        <div className="row mb-4">
                            <div className="col-md-12">
                                <div className="card border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                                    <div className="card-body p-4">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h3 className="mb-2">
                                                    <i className="fas fa-user-circle me-2"></i>
                                                    Welcome, {currentUser.name}!
                                                </h3>
                                                <p className="mb-1 opacity-75">
                                                    <i className="fas fa-hospital me-2"></i>
                                                    Beergeel Obstetrics and Gynecology Clinic
                                                </p>
                                                <p className="mb-0 opacity-90">
                                                    <i className="fas fa-phone me-2"></i> Mobile: {currentUser.mobile || 'N/A'} | 
                                                    <i className="fas fa-key ms-2 me-2"></i> Password: <code style={{background: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '3px'}}>{currentUser.password || 'N/A'}</code>
                                                </p>
                                            </div>
                                            <div className="text-end">
                                                <div className="badge bg-light text-dark px-3 py-2" style={{ fontSize: '0.9rem' }}>
                                                    Patient ID: {currentUser.id}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row mb-4">
                            <div className="col-md-4 mb-3">
                                <div className="card border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #3498db' }}>
                                    <div className="card-body text-center p-4">
                                        <div className="mb-3">
                                            <div style={{ 
                                                width: '70px', 
                                                height: '70px', 
                                                borderRadius: '50%', 
                                                background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                margin: '0 auto'
                                            }}>
                                                <i className="fas fa-calendar-check fa-2x text-white"></i>
                                            </div>
                                        </div>
                                        <h2 className="mb-2" style={{ color: '#2c3e50', fontSize: '2.5rem', fontWeight: 'bold' }}>
                                            {patientVisits.length}
                                        </h2>
                                        <p className="mb-0 text-muted" style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                                            TOTAL VISITS
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4 mb-3">
                                <div className="card border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #27ae60' }}>
                                    <div className="card-body text-center p-4">
                                        <div className="mb-3">
                                            <div style={{ 
                                                width: '70px', 
                                                height: '70px', 
                                                borderRadius: '50%', 
                                                background: 'linear-gradient(135deg, #27ae60 0%, #229954 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                margin: '0 auto'
                                            }}>
                                                <i className="fas fa-file-medical fa-2x text-white"></i>
                                            </div>
                                        </div>
                                        <h2 className="mb-2" style={{ color: '#2c3e50', fontSize: '2.5rem', fontWeight: 'bold' }}>
                                            {prescriptionsCount}
                                        </h2>
                                        <p className="mb-0 text-muted" style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                                            PRESCRIPTIONS
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-4 mb-3">
                                <div className="card border-0 shadow-sm h-100" style={{ borderLeft: '4px solid #f39c12' }}>
                                    <div className="card-body text-center p-4">
                                        <div className="mb-3">
                                            <div style={{ 
                                                width: '70px', 
                                                height: '70px', 
                                                borderRadius: '50%', 
                                                background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                margin: '0 auto'
                                            }}>
                                                <i className="fas fa-flask fa-2x text-white"></i>
                                            </div>
                                        </div>
                                        <h2 className="mb-2" style={{ color: '#2c3e50', fontSize: '2.5rem', fontWeight: 'bold' }}>
                                            {labTestsCount}
                                        </h2>
                                        <p className="mb-0 text-muted" style={{ fontSize: '0.95rem', fontWeight: '500' }}>
                                            LAB TESTS
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {lastVisit ? (
                            <div className="row mb-4">
                                <div className="col-md-12">
                                    <div className="card border-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)' }}>
                                        <div className="card-body p-4">
                                            <div className="d-flex justify-content-between align-items-start mb-3">
                                                <h5 className="mb-0" style={{ color: '#667eea', fontWeight: '600' }}>
                                                    <i className="fas fa-clock me-2"></i>
                                                    Last Visit Summary
                                                </h5>
                                                <span className="badge bg-primary px-3 py-2">
                                                    {new Date(lastVisit.created_date).toLocaleDateString('en-US', { 
                                                        weekday: 'short', 
                                                        year: 'numeric', 
                                                        month: 'short', 
                                                        day: 'numeric' 
                                                    })}
                                                </span>
                                            </div>
                                            <div className="row">
                                                <div className="col-md-6 mb-2">
                                                    <div className="d-flex align-items-center">
                                                        <div style={{ 
                                                            width: '40px', 
                                                            height: '40px', 
                                                            borderRadius: '8px', 
                                                            background: '#e74c3c20',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginRight: '12px'
                                                        }}>
                                                            <i className="fas fa-heartbeat text-danger"></i>
                                                        </div>
                                                        <div>
                                                            <small className="text-muted d-block">Blood Pressure</small>
                                                            <strong>{lastVisit.bp || 'N/A'}</strong>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-6 mb-2">
                                                    <div className="d-flex align-items-center">
                                                        <div style={{ 
                                                            width: '40px', 
                                                            height: '40px', 
                                                            borderRadius: '8px', 
                                                            background: '#3498db20',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginRight: '12px'
                                                        }}>
                                                            <i className="fas fa-heart text-primary"></i>
                                                        </div>
                                                        <div>
                                                            <small className="text-muted d-block">Pulse Rate</small>
                                                            <strong>{lastVisit.pulse || 'N/A'}</strong>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-6 mb-2">
                                                    <div className="d-flex align-items-center">
                                                        <div style={{ 
                                                            width: '40px', 
                                                            height: '40px', 
                                                            borderRadius: '8px', 
                                                            background: '#f39c1220',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginRight: '12px'
                                                        }}>
                                                            <i className="fas fa-thermometer-half text-warning"></i>
                                                        </div>
                                                        <div>
                                                            <small className="text-muted d-block">Temperature</small>
                                                            <strong>{lastVisit.temp || 'N/A'}°C</strong>
                                                        </div>
                                                    </div>
                                                </div>
                                                {lastVisit.weight && (
                                                    <div className="col-md-6 mb-2">
                                                        <div className="d-flex align-items-center">
                                                            <div style={{ 
                                                                width: '40px', 
                                                                height: '40px', 
                                                                borderRadius: '8px', 
                                                                background: '#27ae6020',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                marginRight: '12px'
                                                            }}>
                                                                <i className="fas fa-weight text-success"></i>
                                                            </div>
                                                            <div>
                                                                <small className="text-muted d-block">Weight</small>
                                                                <strong>{lastVisit.weight} kg</strong>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="row mb-4">
                                <div className="col-md-12">
                                    <div className="card border-0 shadow-sm">
                                        <div className="card-body text-center p-4">
                                            <i className="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                                            <h5 className="text-muted">No previous visits found</h5>
                                            <p className="text-muted mb-0">Your visit history will appear here</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="row">
                            <div className="col-md-12">
                                <div className="card border-0 shadow-sm">
                                    <div className="card-body p-4">
                                        <h5 className="mb-4" style={{ color: '#2c3e50', fontWeight: '600' }}>
                                            <i className="fas fa-bolt me-2"></i>
                                            Quick Actions
                                        </h5>
                                        <div className="d-flex flex-wrap gap-3">
                                            <button 
                                                className="btn btn-lg" 
                                                onClick={printPatientReport}
                                                style={{ 
                                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                                    border: 'none',
                                                    color: 'white',
                                                    fontWeight: '500',
                                                    padding: '12px 30px',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                                                }}
                                            >
                                                <i className="fas fa-file-pdf me-2"></i>
                                                Download Medical Report
                                            </button>
                                            <button 
                                                className="btn btn-lg btn-success" 
                                                onClick={() => setActiveView('patientHistory')}
                                                style={{ 
                                                    fontWeight: '500',
                                                    padding: '12px 30px',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)'
                                                }}
                                            >
                                                <i className="fas fa-history me-2"></i>
                                                View Visit History
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    return <div className="dashboard-container">{renderDashboard()}</div>;
}

export default Dashboard;
