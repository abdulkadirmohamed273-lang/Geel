import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AlertContext = createContext();

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within AlertProvider');
    }
    return context;
};

export const AlertProvider = ({ children }) => {
    const [alert, setAlert] = useState(null);

    const showAlert = useCallback((message, type = 'info') => {
        setAlert({ message, type });
    }, []);

    const hideAlert = useCallback(() => {
        setAlert(null);
    }, []);

    // Override window.alert to use our custom modal
    useEffect(() => {
        // Override window.alert
        const originalAlert = window.alert;
        window.alert = function(message) {
            showAlert(message, 'info');
        };
        return () => {
            window.alert = originalAlert;
        };
    }, [showAlert]);


    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            {alert && (
                <AlertModal
                    message={alert.message}
                    type={alert.type}
                    onClose={hideAlert}
                />
            )}
        </AlertContext.Provider>
    );
};

const AlertModal = ({ message, type, onClose }) => {
    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return {
                    headerBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    icon: 'fa-check-circle',
                    title: 'Success'
                };
            case 'error':
                return {
                    headerBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    icon: 'fa-exclamation-circle',
                    title: 'Error'
                };
            case 'warning':
                return {
                    headerBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    icon: 'fa-exclamation-triangle',
                    title: 'Warning'
                };
            default:
                return {
                    headerBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    icon: 'fa-info-circle',
                    title: 'Info'
                };
        }
    };

    const styles = getTypeStyles();

    return (
        <div
            className="modal show d-block"
            tabIndex="-1"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 10000
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="modal-dialog modal-dialog-centered"
                style={{
                    animation: 'fadeIn 0.3s ease',
                    maxWidth: '500px'
                }}
            >
                <div
                    className="modal-content"
                    style={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    }}
                >
                    <div
                        className="modal-header border-0 pb-0"
                        style={{
                            background: styles.headerBg,
                            borderRadius: '12px 12px 0 0',
                            padding: '20px 24px'
                        }}
                    >
                        <h5 className="modal-title text-white mb-0">
                            <i className={`fas ${styles.icon} me-2`}></i>
                            {styles.title}
                        </h5>
                        <button
                            type="button"
                            className="btn-close btn-close-white"
                            onClick={onClose}
                        ></button>
                    </div>
                    <div
                        className="modal-body text-center py-4"
                        style={{ padding: '24px' }}
                    >
                        <p style={{ margin: 0, fontSize: '1rem', color: '#2c3e50' }}>
                            {message}
                        </p>
                    </div>
                    <div
                        className="modal-footer border-0"
                        style={{ padding: '0 24px 24px' }}
                    >
                        <button
                            type="button"
                            className="btn btn-primary px-4"
                            onClick={onClose}
                            style={{
                                background: styles.headerBg,
                                border: 'none',
                                borderRadius: '8px',
                                padding: '10px 30px',
                                fontWeight: '500'
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

