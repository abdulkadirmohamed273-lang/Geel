import React, { useState, useEffect } from 'react';

function PharmacyQueue({ currentUser, db, setActiveView }) {
    const [queue, setQueue] = useState([]);
    const [dispensedToday, setDispensedToday] = useState(0);
    const [prescriptions, setPrescriptions] = useState([]);
    const [quantities, setQuantities] = useState({}); // Store quantities for each visit

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        await Promise.all([
            loadQueue(),
            updateStats(),
            loadPrescriptions()
        ]);
    };

    const loadQueue = async () => {
        try {
            const queueData = await db.getQueueForDepartment('pharmacy');
            setQueue(queueData);
        } catch (err) {
            console.error('Error loading queue:', err);
        }
    };

    const loadPrescriptions = async () => {
        try {
            const allPrescriptions = await db.getAll('prescriptions');
            console.log('=== PHARMACY: Loading prescriptions ===');
            console.log('Prescriptions found:', allPrescriptions);
            setPrescriptions(allPrescriptions || []);
        } catch (err) {
            console.error('Error loading prescriptions:', err);
            setPrescriptions([]);
        }
    };

    const updateStats = async () => {
        try {
            const today = new Date().toDateString();
            const allPrescriptions = await db.getAll('prescriptions');
            const dispensed = allPrescriptions.filter(p => {
                if (p.status === 'dispensed' && p.dispensed_date) {
                    return new Date(p.dispensed_date).toDateString() === today;
                }
                return false;
            }).length;
            setDispensedToday(dispensed);
        } catch (err) {
            console.error('Error updating stats:', err);
        }
    };

    // Extract quantity from dosage or medication text
    const extractQuantity = (prescription) => {
        if (!prescription) return { quantity: 2, unit: 'tablets' };
        
        // Try to find quantity in dosage field first
        const dosage = (prescription.dosage || '').toLowerCase();
        const medication = (prescription.medication || '').toLowerCase();
        const instructions = (prescription.instructions || '').toLowerCase();
        const combined = `${dosage} ${medication} ${instructions}`;
        
        // Look for patterns like "2 tablets", "10 pills", "1 bottle", "2x", "x2", etc.
        // Pattern 1: "2 tablets", "10 pills", etc.
        let quantityMatch = combined.match(/(\d+)\s*(tablets?|pills?|capsules?|bottles?|boxes?|units?|vials?|ml|mg|g|pcs?|pieces?)/i);
        
        // Pattern 2: "2x", "x2", "2 x"
        if (!quantityMatch) {
            quantityMatch = combined.match(/(\d+)\s*x\s*(tablets?|pills?|capsules?|bottles?|boxes?|units?|vials?)/i) ||
                          combined.match(/x\s*(\d+)\s*(tablets?|pills?|capsules?|bottles?|boxes?|units?|vials?)/i);
        }
        
        // Pattern 3: Just a number at the start
        if (!quantityMatch) {
            quantityMatch = combined.match(/^(\d+)\s*(tablets?|pills?|capsules?|bottles?|boxes?|units?|vials?)/i);
        }
        
        // Pattern 4: Any number followed by unit words
        if (!quantityMatch) {
            quantityMatch = combined.match(/(\d+)\s+(tablets?|pills?|capsules?|bottles?|boxes?|units?|vials?)/i);
        }
        
        if (quantityMatch) {
            const qty = parseInt(quantityMatch[1]) || 2;
            const unit = quantityMatch[2] || 'tablets';
            return {
                quantity: qty > 0 ? qty : 2,
                unit: unit.toLowerCase()
            };
        }
        
        // Default values - show 2 tablets (matching the design)
        return { quantity: 2, unit: 'tablets' };
    };

    const handleQuantityChange = (visitId, newQuantity) => {
        setQuantities(prev => ({
            ...prev,
            [visitId]: Math.max(1, parseInt(newQuantity) || 2)
        }));
    };

    const handleQuantityIncrement = (visitId, currentQuantity) => {
        handleQuantityChange(visitId, currentQuantity + 1);
    };

    const handleQuantityDecrement = (visitId, currentQuantity) => {
        handleQuantityChange(visitId, Math.max(0, currentQuantity - 1));
    };

    const dispensePrescription = async (visitId) => {
        try {
            console.log('=== PHARMACY: Dispensing prescription ===');
            console.log('Visit ID:', visitId, 'Type:', typeof visitId);
            
            const allPrescriptions = await db.getAll('prescriptions');
            console.log('All prescriptions:', allPrescriptions);
            
            // Try multiple matching strategies
            const prescription = allPrescriptions.find(p => {
                if (p.visit_id === visitId) return true;
                if (p.visit_id == visitId) return true;
                if (String(p.visit_id) === String(visitId)) return true;
                return false;
            });
            
            console.log('Found prescription:', prescription);
            console.log('Prescription visit_id:', prescription?.visit_id, 'Type:', typeof prescription?.visit_id);
            
            if (prescription) {
                // Get the quantity to dispense
                const extracted = extractQuantity(prescription);
                const quantityToDispense = quantities[visitId] !== undefined 
                    ? quantities[visitId] 
                    : extracted.quantity;
                
                console.log('Quantity to dispense:', quantityToDispense, extracted.unit);
                
                // Check stock availability BEFORE dispensing
                if (quantityToDispense > 0) {
                    try {
                        const allStock = await db.getAll('pharmacy_stock');
                        const medicationText = (prescription.medication || prescription.drugs || '').toLowerCase();
                        
                        // Try to find matching medication in stock
                        // First try exact match, then partial match
                        let stockItem = allStock.find(item => {
                            const stockName = (item.medication_name || '').toLowerCase();
                            return stockName === medicationText || 
                                   medicationText.includes(stockName) || 
                                   stockName.includes(medicationText);
                        });
                        
                        // If not found, try matching by generic name
                        if (!stockItem) {
                            stockItem = allStock.find(item => {
                                const genericName = (item.generic_name || '').toLowerCase();
                                return medicationText.includes(genericName) || 
                                       genericName.includes(medicationText);
                            });
                        }
                        
                        // Check if medication is available in stock
                        if (!stockItem) {
                            alert('Not available');
                            return; // Stop here, don't dispense
                        }
                        
                        // Check if sufficient quantity is available
                        const currentStock = parseInt(stockItem.quantity) || 0;
                        if (currentStock < quantityToDispense) {
                            alert('Not available');
                            return; // Stop here, don't dispense
                        }
                        
                        // Stock is available and sufficient, proceed with deduction and dispensing
                        const newQuantity = currentStock - quantityToDispense;
                        await db.update('pharmacy_stock', stockItem.id, { 
                            quantity: newQuantity 
                        });
                        console.log(`Stock reduced: ${stockItem.medication_name} from ${currentStock} to ${newQuantity}`);
                        
                        // Update prescription status
                        await db.update('prescriptions', prescription.id, { 
                            status: 'dispensed',
                            dispensed_by: currentUser.id,
                            dispensed_date: new Date().toISOString()
                        });
                        
                        const allQueue = await db.getAll('queue');
                        const queueItems = allQueue.filter(q => {
                            if (q.visit_id === visitId) return true;
                            if (q.visit_id == visitId) return true;
                            if (String(q.visit_id) === String(visitId)) return true;
                            return false;
                        }).filter(q => q.department === 'pharmacy');
                        
                        await Promise.all(
                            queueItems.map(item => db.update('queue', item.id, { status: 'completed' }))
                        );
                        
                        // Show warnings if stock is low after dispensing
                        if (newQuantity === 0) {
                            alert(`Prescription dispensed successfully! Warning: ${stockItem.medication_name} is now out of stock.`);
                        } else if (newQuantity <= (stockItem.reorder_level || 10)) {
                            alert(`Prescription dispensed successfully! Warning: ${stockItem.medication_name} is running low (${newQuantity} remaining).`);
                        } else {
                            alert('Prescription dispensed successfully!');
                        }
                        
                        await loadData();
                    } catch (stockErr) {
                        console.error('Error checking/updating stock:', stockErr);
                        alert('Error checking stock. Please try again.');
                        return; // Stop on error
                    }
                } else {
                    alert('Invalid quantity to dispense.');
                }
            } else {
                console.error('Prescription not found for visit:', visitId);
                console.error('Available prescriptions visit_ids:', allPrescriptions.map(p => ({ id: p.id, visit_id: p.visit_id })));
                alert('Prescription not found! Please make sure the doctor has created a prescription for this visit.');
            }
        } catch (err) {
            console.error('Error dispensing prescription:', err);
            alert('Error dispensing prescription. Please try again.');
        }
    };

    return (
        <div className="row g-4">
            <div className="col-lg-7">
                <div className="card pharmacy-queue-card">
                    <div className="card-header">
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-3">
                                <div className="header-icon-wrapper">
                                    <i className="fas fa-users"></i>
                                </div>
                                <div>
                                    <h5 className="mb-0">Pharmacy Queue</h5>
                                    <small className="text-white-50">Manage prescription dispensing</small>
                                </div>
                            </div>
                            <span className="queue-badge-large">
                                <i className="fas fa-clock me-1"></i>
                                {queue.length} Waiting
                            </span>
                        </div>
                    </div>
                    <div className="card-body">
                        {queue.length === 0 ? (
                            <div className="empty-queue-state">
                                <div className="empty-queue-icon">
                                    <i className="fas fa-prescription-bottle"></i>
                                </div>
                                <h4 className="mt-4 mb-2">No Prescriptions in Queue</h4>
                                <p className="text-muted mb-4">All prescriptions have been processed</p>
                                <div className="empty-queue-features">
                                    <div className="feature-badge">
                                        <i className="fas fa-check-circle"></i>
                                        <span>All caught up!</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="prescription-queue-list">
                                {queue.map(item => {
                                    const patient = item.patient;
                                    const visit = item.visit;
                                    
                                    // Try multiple matching strategies
                                    const prescription = prescriptions.find(p => {
                                        // Try strict equality first
                                        if (p.visit_id === visit.id) return true;
                                        // Try loose equality for type coercion
                                        if (p.visit_id == visit.id) return true;
                                        // Try string comparison
                                        if (String(p.visit_id) === String(visit.id)) return true;
                                        return false;
                                    });
                                    
                                    // Debug logging
                                    if (!prescription) {
                                        console.log('=== PHARMACY QUEUE DEBUG ===');
                                        console.log('Visit ID:', visit.id, 'Type:', typeof visit.id);
                                        console.log('All prescriptions:', prescriptions.map(p => ({ id: p.id, visit_id: p.visit_id, type: typeof p.visit_id })));
                                        console.log('Looking for visit_id:', visit.id);
                                    }
                                    
                                    return (
                                        <div key={visit.id} className="prescription-item">
                                            <div className="prescription-item-header">
                                                <div className="patient-info-section">
                                                    <div className="patient-avatar-pharmacy">
                                                        <i className={`fas ${patient?.sex === 'Female' ? 'fa-venus' : 'fa-mars'}`}></i>
                                                    </div>
                                                    <div className="patient-details-pharmacy">
                                                        <h5 className="patient-name-pharmacy">{patient?.name || 'Unknown Patient'}</h5>
                                                        <div className="patient-meta-pharmacy">
                                                            <span className="meta-item">
                                                                <i className="fas fa-phone"></i>
                                                                {patient?.mobile || 'N/A'}
                                                            </span>
                                                            <span className="meta-divider">•</span>
                                                            <span className="meta-item">
                                                                <i className="fas fa-key"></i>
                                                                <code>{patient?.password || 'N/A'}</code>
                                                            </span>
                                                            <span className="meta-divider">•</span>
                                                            <span className="meta-item">
                                                                <i className="fas fa-user"></i>
                                                                {patient?.sex || 'N/A'}, {patient?.age || 'N/A'} yrs
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="prescription-action">
                                                    <button 
                                                        className="btn btn-success btn-dispense" 
                                                        onClick={() => dispensePrescription(visit.id)}
                                                    >
                                                        <i className="fas fa-check-circle me-2"></i>
                                                        Dispense
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="prescription-content">
                                                <div className="prescription-label">
                                                    <i className="fas fa-pills me-2"></i>
                                                    Prescription:
                                                </div>
                                                <div className="prescription-text">
                                                    {prescription?.medication || prescription?.drugs || 'No prescription found'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="col-lg-5">
                <div className="card pharmacy-stats-card">
                    <div className="card-header">
                        <div className="d-flex align-items-center gap-3">
                            <div className="header-icon-wrapper">
                                <i className="fas fa-chart-bar"></i>
                            </div>
                            <div>
                                <h5 className="mb-0">Pharmacy Statistics</h5>
                                <small className="text-white-50">Today's overview</small>
                            </div>
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="stat-card-enhanced">
                            <div className="stat-icon-wrapper pending">
                                <i className="fas fa-prescription-bottle"></i>
                            </div>
                            <div className="stat-content">
                                <div className="stat-number-enhanced">{queue.length}</div>
                                <div className="stat-label-enhanced">Pending Prescriptions</div>
                            </div>
                        </div>
                        
                        <div className="stat-divider"></div>
                        
                        <div className="stat-card-enhanced">
                            <div className="stat-icon-wrapper completed">
                                <i className="fas fa-check-circle"></i>
                            </div>
                            <div className="stat-content">
                                <div className="stat-number-enhanced">{dispensedToday}</div>
                                <div className="stat-label-enhanced">Dispensed Today</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PharmacyQueue;
