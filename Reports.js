import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

function Reports({ currentUser, db, setActiveView }) {
    const [stats, setStats] = useState({
        todayVisits: 0,
        totalPatients: 0,
        todayPayments: 0,
        todayExpenses: 0,
        totalVisits: 0,
        totalConsultations: 0,
        totalPrescriptions: 0,
        loading: true
    });

    const loadStats = useCallback(async () => {
        try {
            const today = new Date().toDateString();
            
            const [todayVisits, allPatients, allPayments, allExpenses, allVisits, allConsultations, allPrescriptions] = await Promise.all([
                db.getTodayVisits(),
                db.getAll('patients'),
                db.getAll('payments'),
                db.getAll('expenses'),
                db.getAll('visits'),
                db.getAll('consultations'),
                db.getAll('prescriptions')
            ]);

            const todayPaymentsTotal = allPayments
                .filter(p => new Date(p.created_date).toDateString() === today)
                .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            
            const todayExpensesTotal = allExpenses
                .filter(e => new Date(e.created_date).toDateString() === today)
                .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

            setStats({
                todayVisits: todayVisits.length,
                totalPatients: allPatients.length,
                todayPayments: todayPaymentsTotal,
                todayExpenses: todayExpensesTotal,
                totalVisits: allVisits.length,
                totalConsultations: allConsultations.length,
                totalPrescriptions: allPrescriptions.length,
                loading: false
            });
        } catch (err) {
            console.error('Error loading stats:', err);
            setStats(prev => ({ ...prev, loading: false }));
        }
    }, [db]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    // ========== PDF EXPORT FUNCTIONS ==========
    const exportTodayReportPDF = async () => {
        try {
            const today = new Date();
            const todayStr = today.toDateString();
            const [visits, allPayments, allExpenses, patients] = await Promise.all([
                db.getTodayVisits(),
                db.getAll('payments'),
                db.getAll('expenses'),
                db.getAll('patients')
            ]);
            
            const payments = allPayments.filter(p => 
                new Date(p.created_date).toDateString() === todayStr
            );
            const expenses = allExpenses.filter(e => 
                new Date(e.created_date).toDateString() === todayStr
            );

        const doc = new jsPDF();
        let yPos = 20;

        // Header
        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80);
        doc.text('Beergeel Obstetrics and Gynecology Clinic', 105, yPos, { align: 'center' });
        yPos += 8;
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text('Today\'s Report', 105, yPos, { align: 'center' });
        yPos += 6;
        doc.setFontSize(10);
        doc.text(`Generated on: ${today.toLocaleString()}`, 105, yPos, { align: 'center' });
        yPos += 15;

        // Summary Section
        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text('Today\'s Summary', 14, yPos);
        yPos += 8;

        const summaryData = [
            ['Total Visits', visits.length.toString()],
            ['Total Income', `$${payments.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}`],
            ['Total Expenses', `$${expenses.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2)}`],
            ['Net Income', `$${(payments.reduce((sum, p) => sum + (p.amount || 0), 0) - expenses.reduce((sum, e) => sum + (e.amount || 0), 0)).toFixed(2)}`]
        ];

        doc.autoTable({
            startY: yPos,
            head: [['Item', 'Value']],
            body: summaryData,
            theme: 'striped',
            headStyles: { fillColor: [52, 152, 219], textColor: 255 },
            styles: { fontSize: 10 }
        });
        yPos = doc.lastAutoTable.finalY + 15;

        // Today's Visits
        if (visits.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(44, 62, 80);
            doc.text('Today\'s Visits', 14, yPos);
            yPos += 8;

            const visitsData = visits.map(visit => {
                const patient = patients.find(p => p.id === visit.patient_id);
                return [
                    patient ? patient.name : 'Unknown',
                    patient ? patient.age.toString() : 'N/A',
                    patient ? patient.sex : 'N/A',
                    visit.bp || 'N/A',
                    visit.pr || 'N/A',
                    visit.temperature ? `${visit.temperature}°C` : 'N/A',
                    visit.weight ? `${visit.weight}kg` : 'N/A'
                ];
            });

            doc.autoTable({
                startY: yPos,
                head: [['Patient Name', 'Age', 'Sex', 'BP', 'PR', 'Temp', 'Weight']],
                body: visitsData,
                theme: 'striped',
                headStyles: { fillColor: [52, 152, 219], textColor: 255 },
                styles: { fontSize: 9 }
            });
            yPos = doc.lastAutoTable.finalY + 15;
        }

        // Today's Payments
        if (payments.length > 0) {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(44, 62, 80);
            doc.text('Today\'s Payments', 14, yPos);
            yPos += 8;

            const paymentsData = payments.map(payment => {
                const patient = patients.find(p => p.id === payment.patient_id);
                return [
                    patient ? patient.name : 'Unknown',
                    payment.amount.toString(),
                    payment.currency || 'N/A',
                    payment.payment_type || 'N/A',
                    payment.description || ''
                ];
            });

            doc.autoTable({
                startY: yPos,
                head: [['Patient', 'Amount', 'Currency', 'Type', 'Description']],
                body: paymentsData,
                theme: 'striped',
                headStyles: { fillColor: [46, 204, 113], textColor: 255 },
                styles: { fontSize: 9 }
            });
            yPos = doc.lastAutoTable.finalY + 15;
        }

        // Today's Expenses
        if (expenses.length > 0) {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(44, 62, 80);
            doc.text('Today\'s Expenses', 14, yPos);
            yPos += 8;

            const expensesData = expenses.map(expense => [
                expense.amount.toString(),
                expense.currency || 'N/A',
                expense.category || 'N/A',
                expense.description || ''
            ]);

            doc.autoTable({
                startY: yPos,
                head: [['Amount', 'Currency', 'Category', 'Description']],
                body: expensesData,
                theme: 'striped',
                headStyles: { fillColor: [231, 76, 60], textColor: 255 },
                styles: { fontSize: 9 }
            });
        }

        const filename = `Today_Report_${today.toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        alert('Today\'s report exported as PDF successfully!');
        } catch (err) {
            console.error('Error exporting PDF:', err);
            alert('Error exporting PDF. Please try again.');
        }
    };

    const exportPatientListPDF = async () => {
        try {
            const [patients, visits, consultations, prescriptions, labRequests] = await Promise.all([
                db.getAll('patients'),
                db.getAll('visits'),
                db.getAll('consultations'),
                db.getAll('prescriptions'),
                db.getAll('lab_requests')
            ]);

        const doc = new jsPDF();
        let yPos = 20;

        // Header
        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80);
        doc.text('Beergeel Obstetrics and Gynecology Clinic', 105, yPos, { align: 'center' });
        yPos += 8;
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text('Patient List', 105, yPos, { align: 'center' });
        yPos += 6;
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, yPos, { align: 'center' });
        yPos += 15;

        // Summary
        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text(`Total Patients: ${patients.length}`, 14, yPos);
        yPos += 10;

        // Patient List Table
        const patientData = patients.map(patient => {
            const patientVisits = visits.filter(v => v.patient_id === patient.id);
            const patientConsultations = consultations.filter(c => {
                const visit = visits.find(v => v.id === c.visit_id);
                return visit && visit.patient_id === patient.id;
            });
            const patientPrescriptions = prescriptions.filter(p => {
                const visit = visits.find(v => v.id === p.visit_id);
                return visit && visit.patient_id === patient.id;
            });
            const patientLabTests = labRequests.filter(l => {
                const visit = visits.find(v => v.id === l.visit_id);
                return visit && visit.patient_id === patient.id;
            });

            return [
                patient.id.toString(),
                patient.name,
                patient.age.toString(),
                patient.sex,
                patient.mobile,
                patientVisits.length.toString(),
                patientConsultations.length.toString(),
                patientPrescriptions.length.toString(),
                patientLabTests.length.toString(),
                new Date(patient.created_date).toLocaleDateString()
            ];
        });

        doc.autoTable({
            startY: yPos,
            head: [['ID', 'Name', 'Age', 'Sex', 'Mobile', 'Visits', 'Consultations', 'Prescriptions', 'Lab Tests', 'Registered']],
            body: patientData,
            theme: 'striped',
            headStyles: { fillColor: [52, 152, 219], textColor: 255 },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 40 },
                2: { cellWidth: 15 },
                3: { cellWidth: 20 },
                4: { cellWidth: 30 },
                5: { cellWidth: 20 },
                6: { cellWidth: 25 },
                7: { cellWidth: 25 },
                8: { cellWidth: 25 },
                9: { cellWidth: 30 }
            }
        });

        const filename = `Patient_List_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        alert('Patient list exported as PDF successfully!');
        } catch (err) {
            console.error('Error exporting PDF:', err);
            alert('Error exporting PDF. Please try again.');
        }
    };

    const exportFinancialReportPDF = async () => {
        try {
            const [payments, expenses, patients] = await Promise.all([
                db.getAll('payments'),
                db.getAll('expenses'),
                db.getAll('patients')
            ]);

        const doc = new jsPDF();
        let yPos = 20;

        // Header
        doc.setFontSize(18);
        doc.setTextColor(44, 62, 80);
        doc.text('Beergeel Obstetrics and Gynecology Clinic', 105, yPos, { align: 'center' });
        yPos += 8;
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text('Financial Report', 105, yPos, { align: 'center' });
        yPos += 6;
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, yPos, { align: 'center' });
        yPos += 15;

        // Financial Summary
        const totalIncome = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const netIncome = totalIncome - totalExpenses;

        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text('Financial Summary', 14, yPos);
        yPos += 8;

        const summaryData = [
            ['Total Income', `$${totalIncome.toFixed(2)}`],
            ['Total Expenses', `$${totalExpenses.toFixed(2)}`],
            ['Net Income', `$${netIncome.toFixed(2)}`]
        ];

        doc.autoTable({
            startY: yPos,
            head: [['Item', 'Amount']],
            body: summaryData,
            theme: 'striped',
            headStyles: { fillColor: [52, 152, 219], textColor: 255 },
            styles: { fontSize: 10 }
        });
        yPos = doc.lastAutoTable.finalY + 15;

        // Income by Currency
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text('Income by Currency', 14, yPos);
        yPos += 8;

        const incomeByCurrency = {};
        payments.forEach(p => {
            const currency = p.currency || 'Unknown';
            if (!incomeByCurrency[currency]) {
                incomeByCurrency[currency] = { total: 0, count: 0 };
            }
            incomeByCurrency[currency].total += p.amount || 0;
            incomeByCurrency[currency].count += 1;
        });

        const currencyData = Object.keys(incomeByCurrency).map(currency => [
            currency,
            incomeByCurrency[currency].total.toFixed(2),
            incomeByCurrency[currency].count.toString()
        ]);

        if (currencyData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Currency', 'Total Amount', 'Transactions']],
                body: currencyData,
                theme: 'striped',
                headStyles: { fillColor: [46, 204, 113], textColor: 255 },
                styles: { fontSize: 9 }
            });
            yPos = doc.lastAutoTable.finalY + 15;
        }

        // Income by Payment Type
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text('Income by Payment Type', 14, yPos);
        yPos += 8;

        const incomeByType = {};
        payments.forEach(p => {
            const type = p.payment_type || 'Unknown';
            if (!incomeByType[type]) {
                incomeByType[type] = { total: 0, count: 0 };
            }
            incomeByType[type].total += p.amount || 0;
            incomeByType[type].count += 1;
        });

        const typeData = Object.keys(incomeByType).map(type => [
            type,
            incomeByType[type].total.toFixed(2),
            incomeByType[type].count.toString()
        ]);

        if (typeData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Payment Type', 'Total Amount', 'Transactions']],
                body: typeData,
                theme: 'striped',
                headStyles: { fillColor: [241, 196, 15], textColor: 255 },
                styles: { fontSize: 9 }
            });
            yPos = doc.lastAutoTable.finalY + 15;
        }

        // All Payments
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(44, 62, 80);
        doc.text('All Payments', 14, yPos);
        yPos += 8;

        const paymentsData = payments
            .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
            .map(payment => {
                const patient = patients.find(p => p.id === payment.patient_id);
                return [
                    new Date(payment.created_date).toLocaleDateString(),
                    patient ? patient.name : 'Unknown',
                    payment.amount.toString(),
                    payment.currency || 'N/A',
                    payment.payment_type || 'N/A'
                ];
            });

        if (paymentsData.length > 0) {
            doc.autoTable({
                startY: yPos,
                head: [['Date', 'Patient', 'Amount', 'Currency', 'Type']],
                body: paymentsData,
                theme: 'striped',
                headStyles: { fillColor: [46, 204, 113], textColor: 255 },
                styles: { fontSize: 8 }
            });
            yPos = doc.lastAutoTable.finalY + 15;
        }

        // All Expenses
        if (expenses.length > 0) {
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(44, 62, 80);
            doc.text('All Expenses', 14, yPos);
            yPos += 8;

            const expensesData = expenses
                .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                .map(expense => [
                    new Date(expense.created_date).toLocaleDateString(),
                    expense.amount.toString(),
                    expense.currency || 'N/A',
                    expense.category || 'N/A',
                    expense.description || ''
                ]);

            doc.autoTable({
                startY: yPos,
                head: [['Date', 'Amount', 'Currency', 'Category', 'Description']],
                body: expensesData,
                theme: 'striped',
                headStyles: { fillColor: [231, 76, 60], textColor: 255 },
                styles: { fontSize: 8 }
            });
        }

        const filename = `Financial_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        alert('Financial report exported as PDF successfully!');
        } catch (err) {
            console.error('Error exporting PDF:', err);
            alert('Error exporting PDF. Please try again.');
        }
    };

    // ========== EXCEL EXPORT FUNCTIONS ==========
    const exportTodayReportExcel = async () => {
        try {
            const today = new Date();
            const todayStr = today.toDateString();
            const [visits, allPayments, allExpenses, patients] = await Promise.all([
                db.getTodayVisits(),
                db.getAll('payments'),
                db.getAll('expenses'),
                db.getAll('patients')
            ]);
            
            const payments = allPayments.filter(p => 
                new Date(p.created_date).toDateString() === todayStr
            );
            const expenses = allExpenses.filter(e => 
                new Date(e.created_date).toDateString() === todayStr
            );

        const workbook = XLSX.utils.book_new();

        // Summary Sheet
        const summaryData = [
            ['Beergeel Obstetrics and Gynecology Clinic'],
            ['Today\'s Report'],
            [`Generated on: ${today.toLocaleString()}`],
            [],
            ['Today\'s Summary'],
            ['Item', 'Value'],
            ['Total Visits', visits.length],
            ['Total Income', payments.reduce((sum, p) => sum + (p.amount || 0), 0)],
            ['Total Expenses', expenses.reduce((sum, e) => sum + (e.amount || 0), 0)],
            ['Net Income', payments.reduce((sum, p) => sum + (p.amount || 0), 0) - expenses.reduce((sum, e) => sum + (e.amount || 0), 0)]
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // Visits Sheet
        if (visits.length > 0) {
            const visitsData = [
                ['Patient Name', 'Age', 'Sex', 'Mobile', 'BP', 'PR', 'Temperature', 'Weight', 'BMI', 'SPO2', 'Date']
            ];
            visits.forEach(visit => {
                const patient = patients.find(p => p.id === visit.patient_id);
                visitsData.push([
                    patient ? patient.name : 'Unknown',
                    patient ? patient.age : 'N/A',
                    patient ? patient.sex : 'N/A',
                    patient ? patient.mobile : 'N/A',
                    visit.bp || 'N/A',
                    visit.pr || 'N/A',
                    visit.temperature || 'N/A',
                    visit.weight || 'N/A',
                    visit.bmi || 'N/A',
                    visit.spo || 'N/A',
                    new Date(visit.created_date).toLocaleString()
                ]);
            });
            const visitsSheet = XLSX.utils.aoa_to_sheet(visitsData);
            XLSX.utils.book_append_sheet(workbook, visitsSheet, 'Visits');
        }

        // Payments Sheet
        if (payments.length > 0) {
            const paymentsData = [
                ['Date', 'Patient Name', 'Mobile', 'Amount', 'Currency', 'Payment Type', 'Description']
            ];
            payments.forEach(payment => {
                const patient = patients.find(p => p.id === payment.patient_id);
                paymentsData.push([
                    new Date(payment.created_date).toLocaleString(),
                    patient ? patient.name : 'Unknown',
                    patient ? patient.mobile : 'N/A',
                    payment.amount,
                    payment.currency || 'N/A',
                    payment.payment_type || 'N/A',
                    payment.description || ''
                ]);
            });
            const paymentsSheet = XLSX.utils.aoa_to_sheet(paymentsData);
            XLSX.utils.book_append_sheet(workbook, paymentsSheet, 'Payments');
        }

        // Expenses Sheet
        if (expenses.length > 0) {
            const expensesData = [
                ['Date', 'Amount', 'Currency', 'Category', 'Description']
            ];
            expenses.forEach(expense => {
                expensesData.push([
                    new Date(expense.created_date).toLocaleString(),
                    expense.amount,
                    expense.currency || 'N/A',
                    expense.category || 'N/A',
                    expense.description || ''
                ]);
            });
            const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
            XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');
        }

        const filename = `Today_Report_${today.toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);
        alert('Today\'s report exported as Excel successfully!');
        } catch (err) {
            console.error('Error exporting Excel:', err);
            alert('Error exporting Excel. Please try again.');
        }
    };

    const exportPatientListExcel = async () => {
        try {
            const [patients, visits, consultations, prescriptions, labRequests] = await Promise.all([
                db.getAll('patients'),
                db.getAll('visits'),
                db.getAll('consultations'),
                db.getAll('prescriptions'),
                db.getAll('lab_requests')
            ]);

        const patientData = [
            ['ID', 'Name', 'Age', 'Sex', 'Mobile', 'Total Visits', 'Total Consultations', 'Total Prescriptions', 'Total Lab Tests', 'Registration Date']
        ];

        patients.forEach(patient => {
            const patientVisits = visits.filter(v => v.patient_id === patient.id);
            const patientConsultations = consultations.filter(c => {
                const visit = visits.find(v => v.id === c.visit_id);
                return visit && visit.patient_id === patient.id;
            });
            const patientPrescriptions = prescriptions.filter(p => {
                const visit = visits.find(v => v.id === p.visit_id);
                return visit && visit.patient_id === patient.id;
            });
            const patientLabTests = labRequests.filter(l => {
                const visit = visits.find(v => v.id === l.visit_id);
                return visit && visit.patient_id === patient.id;
            });

            patientData.push([
                patient.id,
                patient.name,
                patient.age,
                patient.sex,
                patient.mobile,
                patientVisits.length,
                patientConsultations.length,
                patientPrescriptions.length,
                patientLabTests.length,
                new Date(patient.created_date).toLocaleDateString()
            ]);
        });

        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.aoa_to_sheet(patientData);
        XLSX.utils.book_append_sheet(workbook, sheet, 'Patient List');

        const filename = `Patient_List_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);
        alert('Patient list exported as Excel successfully!');
        } catch (err) {
            console.error('Error exporting Excel:', err);
            alert('Error exporting Excel. Please try again.');
        }
    };

    const exportFinancialReportExcel = async () => {
        try {
            const [payments, expenses, patients] = await Promise.all([
                db.getAll('payments'),
                db.getAll('expenses'),
                db.getAll('patients')
            ]);

        const workbook = XLSX.utils.book_new();

        // Summary Sheet
        const totalIncome = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
        const netIncome = totalIncome - totalExpenses;

        const summaryData = [
            ['Beergeel Obstetrics and Gynecology Clinic'],
            ['Financial Report'],
            [`Generated on: ${new Date().toLocaleString()}`],
            [],
            ['Financial Summary'],
            ['Item', 'Amount'],
            ['Total Income', totalIncome],
            ['Total Expenses', totalExpenses],
            ['Net Income', netIncome]
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

        // Income by Currency
        const incomeByCurrency = {};
        payments.forEach(p => {
            const currency = p.currency || 'Unknown';
            if (!incomeByCurrency[currency]) {
                incomeByCurrency[currency] = { total: 0, count: 0 };
            }
            incomeByCurrency[currency].total += p.amount || 0;
            incomeByCurrency[currency].count += 1;
        });

        const currencyData = [
            ['Currency', 'Total Amount', 'Number of Transactions']
        ];
        Object.keys(incomeByCurrency).forEach(currency => {
            currencyData.push([
                currency,
                incomeByCurrency[currency].total,
                incomeByCurrency[currency].count
            ]);
        });
        const currencySheet = XLSX.utils.aoa_to_sheet(currencyData);
        XLSX.utils.book_append_sheet(workbook, currencySheet, 'Income by Currency');

        // Income by Payment Type
        const incomeByType = {};
        payments.forEach(p => {
            const type = p.payment_type || 'Unknown';
            if (!incomeByType[type]) {
                incomeByType[type] = { total: 0, count: 0 };
            }
            incomeByType[type].total += p.amount || 0;
            incomeByType[type].count += 1;
        });

        const typeData = [
            ['Payment Type', 'Total Amount', 'Number of Transactions']
        ];
        Object.keys(incomeByType).forEach(type => {
            typeData.push([
                type,
                incomeByType[type].total,
                incomeByType[type].count
            ]);
        });
        const typeSheet = XLSX.utils.aoa_to_sheet(typeData);
        XLSX.utils.book_append_sheet(workbook, typeSheet, 'Income by Type');

        // All Payments
        const paymentsData = [
            ['Date', 'Patient Name', 'Mobile', 'Amount', 'Currency', 'Payment Type', 'Description']
        ];
        payments
            .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
            .forEach(payment => {
                const patient = patients.find(p => p.id === payment.patient_id);
                paymentsData.push([
                    new Date(payment.created_date).toLocaleString(),
                    patient ? patient.name : 'Unknown',
                    patient ? patient.mobile : 'N/A',
                    payment.amount,
                    payment.currency || 'N/A',
                    payment.payment_type || 'N/A',
                    payment.description || ''
                ]);
            });
        const paymentsSheet = XLSX.utils.aoa_to_sheet(paymentsData);
        XLSX.utils.book_append_sheet(workbook, paymentsSheet, 'All Payments');

        // All Expenses
        if (expenses.length > 0) {
            const expensesData = [
                ['Date', 'Amount', 'Currency', 'Category', 'Description']
            ];
            expenses
                .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                .forEach(expense => {
                    expensesData.push([
                        new Date(expense.created_date).toLocaleString(),
                        expense.amount,
                        expense.currency || 'N/A',
                        expense.category || 'N/A',
                        expense.description || ''
                    ]);
                });
            const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData);
            XLSX.utils.book_append_sheet(workbook, expensesSheet, 'All Expenses');
        }

        // Monthly Summary
        const monthlyData = {};
        payments.forEach(p => {
            const date = new Date(p.created_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { income: 0, expenses: 0 };
            }
            monthlyData[monthKey].income += p.amount || 0;
        });
        expenses.forEach(e => {
            const date = new Date(e.created_date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { income: 0, expenses: 0 };
            }
            monthlyData[monthKey].expenses += e.amount || 0;
        });

        const monthlySummaryData = [
            ['Month', 'Income', 'Expenses', 'Net Income']
        ];
        Object.keys(monthlyData).sort().forEach(month => {
            const net = monthlyData[month].income - monthlyData[month].expenses;
            monthlySummaryData.push([
                month,
                monthlyData[month].income,
                monthlyData[month].expenses,
                net
            ]);
        });
        const monthlySheet = XLSX.utils.aoa_to_sheet(monthlySummaryData);
        XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Monthly Summary');

        const filename = `Financial_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);
        alert('Financial report exported as Excel successfully!');
        } catch (err) {
            console.error('Error exporting Excel:', err);
            alert('Error exporting Excel. Please try again.');
        }
    };

    if (stats.loading) {
        return (
            <div className="card">
                <div className="card-header">
                    <i className="fas fa-chart-bar"></i> Clinic Reports
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
                <i className="fas fa-chart-bar"></i> Clinic Reports
            </div>
            <div className="card-body">
                <div className="row">
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-header">
                                <i className="fas fa-calendar-day"></i> Today's Summary
                            </div>
                            <div className="card-body">
                                <table className="table">
                                    <tbody>
                                        <tr>
                                            <td>Visits Today</td>
                                            <td className="text-end"><strong>{stats.todayVisits}</strong></td>
                                        </tr>
                                        <tr>
                                            <td>Total Income</td>
                                            <td className="text-end text-success"><strong>${stats.todayPayments.toFixed(2)}</strong></td>
                                        </tr>
                                        <tr>
                                            <td>Total Expenses</td>
                                            <td className="text-end text-danger"><strong>${stats.todayExpenses.toFixed(2)}</strong></td>
                                        </tr>
                                        <tr>
                                            <td>Net Income</td>
                                            <td className={`text-end ${(stats.todayPayments - stats.todayExpenses) >= 0 ? 'text-success' : 'text-danger'}`}>
                                                <strong>${(stats.todayPayments - stats.todayExpenses).toFixed(2)}</strong>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card">
                            <div className="card-header">
                                <i className="fas fa-database"></i> Overall Statistics
                            </div>
                            <div className="card-body">
                                <table className="table">
                                    <tbody>
                                        <tr>
                                            <td>Total Patients</td>
                                            <td className="text-end"><strong>{stats.totalPatients}</strong></td>
                                        </tr>
                                        <tr>
                                            <td>Total Visits</td>
                                            <td className="text-end"><strong>{stats.totalVisits}</strong></td>
                                        </tr>
                                        <tr>
                                            <td>Total Consultations</td>
                                            <td className="text-end"><strong>{stats.totalConsultations}</strong></td>
                                        </tr>
                                        <tr>
                                            <td>Total Prescriptions</td>
                                            <td className="text-end"><strong>{stats.totalPrescriptions}</strong></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="mt-4">
                    <h5>Export Reports</h5>
                    <div className="row g-3">
                        <div className="col-md-6">
                            <h6 className="text-muted mb-3">PDF Exports</h6>
                            <div className="d-flex gap-2 flex-wrap">
                                <button className="btn btn-primary" onClick={exportTodayReportPDF}>
                                    <i className="fas fa-file-pdf"></i> Export Today's Report (PDF)
                                </button>
                                <button className="btn btn-success" onClick={exportPatientListPDF}>
                                    <i className="fas fa-file-pdf"></i> Export Patient List (PDF)
                                </button>
                                <button className="btn btn-warning" onClick={exportFinancialReportPDF}>
                                    <i className="fas fa-file-pdf"></i> Export Financial Report (PDF)
                                </button>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <h6 className="text-muted mb-3">Excel Exports</h6>
                            <div className="d-flex gap-2 flex-wrap">
                                <button className="btn btn-primary" onClick={exportTodayReportExcel}>
                                    <i className="fas fa-file-excel"></i> Export Today's Report (Excel)
                                </button>
                                <button className="btn btn-success" onClick={exportPatientListExcel}>
                                    <i className="fas fa-file-excel"></i> Export Patient List (Excel)
                                </button>
                                <button className="btn btn-warning" onClick={exportFinancialReportExcel}>
                                    <i className="fas fa-file-excel"></i> Export Financial Report (Excel)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Reports;
