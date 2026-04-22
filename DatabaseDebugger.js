import React, { useState } from 'react';

function DatabaseDebugger({ db }) {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const addResult = (test, status, message, data = null) => {
        setResults(prev => [...prev, { test, status, message, data, time: new Date().toLocaleTimeString() }]);
    };

    const runDiagnostics = async () => {
        setResults([]);
        setLoading(true);

        try {
            // Test 1: Check database connection
            addResult('Database Connection', 'running', 'Testing connection...');
            try {
                const users = await db.getAll('users');
                addResult('Database Connection', 'success', `Connected! Found ${users?.length || 0} users`, users);
            } catch (err) {
                addResult('Database Connection', 'error', `Connection failed: ${err.message}`, err);
                setLoading(false);
                return;
            }

            // Test 2: Check if pharmacy_stock table exists
            addResult('Pharmacy Stock Table', 'running', 'Checking if table exists...');
            try {
                const stock = await db.getAll('pharmacy_stock');
                addResult('Pharmacy Stock Table', 'success', `Table exists! Found ${stock?.length || 0} items`, stock);
            } catch (err) {
                addResult('Pharmacy Stock Table', 'error', `Table issue: ${err.message}`, err);
            }

            // Test 3: Try to insert a test item
            addResult('Insert Test', 'running', 'Trying to insert test item...');
            try {
                const testItem = {
                    medication_name: 'DEBUG_TEST_ITEM',
                    generic_name: 'Test Generic',
                    category: 'Test',
                    quantity: 1,
                    unit: 'units',
                    unit_price: 1.00,
                    reorder_level: 1,
                    notes: 'This is a test item created by debugger',
                    image_url: null,
                    created_by: 1
                };

                const result = await db.add('pharmacy_stock', testItem);
                if (result) {
                    addResult('Insert Test', 'success', 'Successfully inserted test item!', result);
                    
                    // Test 4: Try to read it back
                    addResult('Read Test', 'running', 'Reading back the test item...');
                    const allStock = await db.getAll('pharmacy_stock');
                    const foundItem = allStock.find(item => item.medication_name === 'DEBUG_TEST_ITEM');
                    
                    if (foundItem) {
                        addResult('Read Test', 'success', 'Successfully read back test item!', foundItem);
                        
                        // Test 5: Try to delete it
                        addResult('Delete Test', 'running', 'Deleting test item...');
                        const deleted = await db.delete('pharmacy_stock', foundItem.id);
                        if (deleted) {
                            addResult('Delete Test', 'success', 'Successfully deleted test item!');
                        } else {
                            addResult('Delete Test', 'error', 'Failed to delete test item');
                        }
                    } else {
                        addResult('Read Test', 'error', 'Could not find test item after insert');
                    }
                } else {
                    addResult('Insert Test', 'error', 'Insert returned null/false', result);
                }
            } catch (err) {
                addResult('Insert Test', 'error', `Insert failed: ${err.message}`, err);
            }

            // Test 6: Check other tables
            addResult('Other Tables', 'running', 'Checking other tables...');
            const tableTests = ['patients', 'visits', 'consultations', 'prescriptions', 'lab_requests'];
            for (const table of tableTests) {
                try {
                    const data = await db.getAll(table);
                    addResult('Other Tables', 'success', `${table}: ${data?.length || 0} records`);
                } catch (err) {
                    addResult('Other Tables', 'error', `${table}: ${err.message}`);
                }
            }

        } catch (err) {
            addResult('Diagnostics', 'error', `Unexpected error: ${err.message}`, err);
        }

        setLoading(false);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'running': return '⏳';
            default: return 'ℹ️';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'success': return '#28a745';
            case 'error': return '#dc3545';
            case 'running': return '#ffc107';
            default: return '#17a2b8';
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div className="card">
                <div className="card-header bg-primary text-white">
                    <h3 className="mb-0">
                        <i className="fas fa-bug me-2"></i>
                        Database Debugger
                    </h3>
                </div>
                <div className="card-body">
                    <div className="alert alert-info">
                        <strong>Purpose:</strong> This tool will diagnose database issues with pharmacy_stock table.
                        <br />
                        <strong>What it does:</strong>
                        <ul className="mb-0 mt-2">
                            <li>Tests database connection</li>
                            <li>Checks if pharmacy_stock table exists</li>
                            <li>Attempts to insert, read, and delete a test item</li>
                            <li>Checks other tables for comparison</li>
                        </ul>
                    </div>

                    <button 
                        className="btn btn-primary btn-lg mb-4" 
                        onClick={runDiagnostics}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Running Diagnostics...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-play me-2"></i>
                                Run Diagnostics
                            </>
                        )}
                    </button>

                    {results.length > 0 && (
                        <div className="results">
                            <h4>Results:</h4>
                            <div className="list-group">
                                {results.map((result, index) => (
                                    <div 
                                        key={index} 
                                        className="list-group-item"
                                        style={{ borderLeft: `4px solid ${getStatusColor(result.status)}` }}
                                    >
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div style={{ flex: 1 }}>
                                                <h6 className="mb-1">
                                                    {getStatusIcon(result.status)} {result.test}
                                                </h6>
                                                <p className="mb-1">{result.message}</p>
                                                {result.data && (
                                                    <details className="mt-2">
                                                        <summary style={{ cursor: 'pointer', color: '#0066cc' }}>
                                                            View Details
                                                        </summary>
                                                        <pre className="mt-2 p-2 bg-light" style={{ 
                                                            fontSize: '12px', 
                                                            maxHeight: '200px', 
                                                            overflow: 'auto',
                                                            borderRadius: '4px'
                                                        }}>
                                                            {JSON.stringify(result.data, null, 2)}
                                                        </pre>
                                                    </details>
                                                )}
                                            </div>
                                            <small className="text-muted">{result.time}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="alert alert-warning mt-4">
                                <h5>Next Steps:</h5>
                                {results.some(r => r.status === 'error') ? (
                                    <>
                                        <p>Errors detected! Here's what to do:</p>
                                        <ol>
                                            <li>Go to your Supabase Dashboard</li>
                                            <li>Open SQL Editor</li>
                                            <li>Run the file: <code>FIX_PHARMACY_STOCK_TABLE.sql</code></li>
                                            <li>Come back and click "Run Diagnostics" again</li>
                                        </ol>
                                    </>
                                ) : (
                                    <p className="mb-0">
                                        ✅ All tests passed! The database is working correctly.
                                        If items still don't show in Pharmacy Stock, check for:
                                        <ul className="mt-2">
                                            <li>Active filters (category, status, search)</li>
                                            <li>Browser console errors (Press F12)</li>
                                            <li>Network errors in DevTools</li>
                                        </ul>
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DatabaseDebugger;

