import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import MainApp from './components/MainApp';
import PublicTicketView from './components/PublicTicketView';
import PublicPatientView from './components/PublicPatientView';
import SupabaseDB from './utils/supabaseDB';
import { readTabSession, writeTabSession, clearTabSession } from './utils/authHelper';
import { AlertProvider } from './components/AlertModal';

const db = new SupabaseDB();

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentRole, setCurrentRole] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [ticketCode, setTicketCode] = useState(null);
    const [patientId, setPatientId] = useState(null);
    const [isLoadingSession, setIsLoadingSession] = useState(true);

    useEffect(() => {
        // Check if URL contains a ticket code or patient ID
        const path = window.location.pathname;
        const ticketMatch = path.match(/\/ticket\/([A-Z0-9]+)/i);
        const patientMatch = path.match(/\/patient\/(\d+)/i);
        
        if (ticketMatch) {
            setTicketCode(ticketMatch[1].toUpperCase());
            setIsLoadingSession(false);
        } else if (patientMatch) {
            setPatientId(parseInt(patientMatch[1]));
            // For patient view, check session after setting patientId
            restoreSession();
        } else {
            // Restore session on app mount
            restoreSession();
        }
    }, []);

    const restoreSession = async () => {
        try {
            const saved = readTabSession();
            const savedUserId = saved?.userId;
            const savedRole = saved?.userRole;
            const savedUserType = saved?.userType;

            if (savedUserId && savedRole && savedUserType) {
                // Restore user from database
                if (savedUserType === 'patient') {
                    const patient = await db.getById('patients', parseInt(savedUserId));
                    if (patient) {
                        setCurrentUser(patient);
                        setCurrentRole(savedRole);
                        setIsLoggedIn(true);
                    } else {
                        // User not found, clear session
                        clearTabSession();
                    }
                } else {
                    // Staff user
                    const user = await db.getById('users', parseInt(savedUserId));
                    if (user && user.role === savedRole) {
                        setCurrentUser(user);
                        setCurrentRole(savedRole);
                        setIsLoggedIn(true);
                    } else {
                        // User not found or role changed, clear session
                        clearTabSession();
                    }
                }
            }
        } catch (err) {
            console.error('Error restoring session:', err);
            clearTabSession();
        } finally {
            setIsLoadingSession(false);
        }
    };

    const clearSession = () => {
        clearTabSession();
    };

    const handleLogin = (user, role) => {
        setCurrentUser(user);
        setCurrentRole(role);
        setIsLoggedIn(true);
        
        const userType = role === 'patient' ? 'patient' : 'staff';
        writeTabSession(user.id, role, userType);
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentRole(null);
        setIsLoggedIn(false);
        
        // Clear session from localStorage
        clearSession();
        
        // Redirect to home page if on a patient view
        if (patientId) {
            window.history.pushState({}, '', '/');
            setPatientId(null);
        }
    };

    // Show loading while restoring session
    if (isLoadingSession) {
        return (
            <AlertProvider>
                <div className="App">
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        height: '100vh',
                        flexDirection: 'column'
                    }}>
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-3 text-muted">Loading...</p>
                    </div>
                </div>
            </AlertProvider>
        );
    }

    // If viewing a ticket, show PublicTicketView
    if (ticketCode) {
        return (
            <AlertProvider>
            <div className="App">
                <PublicTicketView ticketCode={ticketCode} db={db} />
            </div>
            </AlertProvider>
        );
    }

    // If viewing a patient, require login first
    if (patientId) {
        if (!isLoggedIn) {
            return (
                <AlertProvider>
                <div className="App">
                    <HomePage 
                        onLogin={handleLogin} 
                        db={db}
                        redirectToPatient={patientId}
                    />
                </div>
                </AlertProvider>
            );
        }
        return (
            <AlertProvider>
            <div className="App">
                <PublicPatientView 
                    patientId={patientId} 
                    db={db}
                    currentUser={currentUser}
                    currentRole={currentRole}
                    onLogout={handleLogout}
                />
            </div>
            </AlertProvider>
        );
    }

    return (
        <AlertProvider>
        <div className="App">
            {!isLoggedIn ? (
                <HomePage onLogin={handleLogin} db={db} />
            ) : (
                <MainApp 
                    currentUser={currentUser} 
                    currentRole={currentRole} 
                    onLogout={handleLogout}
                    db={db}
                />
            )}
        </div>
        </AlertProvider>
    );
}

export default App;

