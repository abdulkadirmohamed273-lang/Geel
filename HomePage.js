import React, { useState, useEffect } from 'react';

function HomePage({ onLogin, db, redirectToPatient }) {
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('1234');
    const [role, setRole] = useState('patient');
    const [notice, setNotice] = useState('');

    useEffect(() => {
        updateHomePageNotice();
    }, []);

    const updateHomePageNotice = async () => {
        const notices = await db.getAll('notices');
        if (notices.length > 0) {
            setNotice(notices[0].content);
        } else {
            setNotice('No notice available. Please add a new notice.');
        }
    };

    const handleLogin = async () => {
        // Trim inputs
        const trimmedLoginId = loginId.trim();
        const trimmedPassword = password.trim();
        
        if (!trimmedLoginId || !trimmedPassword) {
            alert('Please enter login ID and password');
            return;
        }

        try {
            // If redirectToPatient is set, only allow patient login
            if (redirectToPatient) {
                const patient = await db.findPatientByMobile(trimmedLoginId);
                const patientPassword = (patient?.password || '').toString().trim();
                if (patient && patientPassword === trimmedPassword) {
                    onLogin(patient, 'patient');
                } else {
                    alert('Invalid credential');
                }
            } else if (role === 'patient') {
                const patient = await db.findPatientByMobile(trimmedLoginId);
                const patientPassword = (patient?.password || '').toString().trim();
                if (patient && patientPassword === trimmedPassword) {
                    onLogin(patient, 'patient');
                } else {
                    alert('Invalid credential');
                }
            } else {
                const users = await db.getAll('users');
                
                // Check if users array is valid
                if (!Array.isArray(users)) {
                    console.error('Users is not an array:', users);
                    alert('Database error: Unable to fetch users. Please check if the users table exists in Supabase.');
                    return;
                }
                
                // Trim and normalize the login ID
                const normalizedLoginId = trimmedLoginId;
                
                // Debug: Log all users to see what's in the database
                console.log('All users in database:', users);
                console.log('Login attempt:', { 
                    loginId: normalizedLoginId, 
                    password: trimmedPassword, 
                    role: role,
                    loginIdType: typeof normalizedLoginId,
                    loginIdLength: normalizedLoginId.length
                });
                
                // Find user with normalized comparison (handle both string and number comparisons)
                // Allow login with either username OR mobile number
                const user = users.find(u => {
                    // Convert to string and trim for comparison
                    let dbUsername = u.username;
                    // Handle if username is stored as number (preserve leading zeros by converting to string)
                    if (typeof dbUsername === 'number') {
                        dbUsername = dbUsername.toString();
                    }
                    const normalizedUsername = (dbUsername || '').toString().trim();
                    
                    // Also check mobile number
                    let dbMobile = u.mobile;
                    if (typeof dbMobile === 'number') {
                        dbMobile = dbMobile.toString();
                    }
                    const normalizedMobile = (dbMobile || '').toString().trim();
                    
                    const normalizedPassword = (u.password || '').toString().trim();
                    const normalizedRole = (u.role || '').toString().trim();
                    const normalizedInputPassword = trimmedPassword;
                    const normalizedInputRole = role.trim().toString();
                    
                    // Check if login ID matches either username OR mobile
                    const usernameMatch = normalizedUsername === normalizedLoginId;
                    const mobileMatch = normalizedMobile === normalizedLoginId;
                    const identifierMatch = usernameMatch || mobileMatch;
                    const passwordMatch = normalizedPassword === normalizedInputPassword;
                    const roleMatch = normalizedRole === normalizedInputRole;
                    
                    if (identifierMatch) {
                        console.log('Identifier match found:', {
                            originalUsername: u.username,
                            dbUsername: normalizedUsername,
                            originalMobile: u.mobile,
                            dbMobile: normalizedMobile,
                            matchedBy: usernameMatch ? 'username' : 'mobile',
                            dbPassword: normalizedPassword,
                            dbRole: normalizedRole,
                            inputPassword: normalizedInputPassword,
                            inputRole: normalizedInputRole,
                            passwordMatch: passwordMatch,
                            roleMatch: roleMatch
                        });
                    }
                    
                    return identifierMatch && passwordMatch && roleMatch;
                });
                
                if (user) {
                    console.log('Login successful for user:', user);
                    onLogin(user, role);
                } else {
                    alert('Invalid credential');
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            alert(`Login error: ${error.message}. Please check if Supabase tables are created.`);
        }
    };

    return (
        <div className="home-page">
            <div className="home-container">
                <div className="clinic-header">
                    <img 
                        src="/logo.png" 
                        alt="Beergeel Clinic Logo" 
                        className="home-logo" 
                        onError={(e) => {
                            e.target.src = "https://via.placeholder.com/120x120/1e3c72/ffffff?text=OBGYN";
                        }}
                    />
                    <h1 className="clinic-title">Beergeel Obstetrics and Gynecology Clinic</h1>
                    <p className="clinic-subtitle">Takhasusuka sare ee xanuunada dumarka</p>
                    <div className="clinic-location">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>Xero awr kasoo horjeedka Ayuub Restaurant inyar ka xiga dhanka Masjid Nuur</span>
                    </div>
                    <p><i className="fas fa-phone"></i> Contact: 0634026635 (Mobile/WhatsApp)</p>
                </div>
                
                <div className="home-content">
                    <div className="notice-section">
                        <h3 className="notice-title">
                            <i className="fas fa-bell"></i> Clinic Notices
                        </h3>
                        <div className="notice-content">
                            {notice}
                        </div>
                    </div>
                    
                    <div className="login-section">
                        <h3 className="login-title">{redirectToPatient ? 'Patient Login' : 'System Login'}</h3>
                        {redirectToPatient && (
                            <div className="alert alert-info mb-3">
                                <i className="fas fa-info-circle"></i> Please login with your patient credentials to view your medical information.
                            </div>
                        )}
                        
                        <div className="mb-3">
                            <label className="form-label">Login ID (Phone Number)</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={loginId}
                                onChange={(e) => setLoginId(e.target.value)}
                                placeholder="e.g., 4026635"
                            />
                        </div>
                        
                        <div className="mb-3">
                            <label className="form-label">Password</label>
                            <input 
                                type="password" 
                                className="form-control" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        
                        {!redirectToPatient && (
                            <div className="mb-3">
                                <label className="form-label">Login As</label>
                                <select 
                                    className="form-select" 
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                >
                                    <option value="patient">Patient</option>
                                    <option value="reception">Reception</option>
                                    <option value="doctor">Doctor</option>
                                    <option value="pharmacy">Pharmacy</option>
                                    <option value="lab">Laboratory</option>
                                </select>
                            </div>
                        )}
                        
                        <button className="btn btn-primary w-100" onClick={handleLogin}>
                            <i className="fas fa-sign-in-alt"></i> {redirectToPatient ? 'Login to View Information' : 'Login to System'}
                        </button>
                    </div>
                </div>
                
                <div className="footer-info">
                    <p>© 2024 Beergeel Obstetrics and Gynecology Clinic. All rights reserved. | Your Health is Our Priority</p>
                </div>
            </div>
        </div>
    );
}

export default HomePage;

