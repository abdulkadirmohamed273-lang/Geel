import React from 'react';

function Sidebar({ currentUser, currentRole, activeView, setActiveView, sidebarOpen, onCloseSidebar }) {
    const getMenuItems = () => {
        switch(currentRole) {
            case 'reception':
                return [
                    { icon: 'fa-home', text: 'Dashboard', view: 'dashboard' },
                    { icon: 'fa-user-plus', text: 'Register Patient', view: 'registerPatient' },
                    { icon: 'fa-stethoscope', text: 'Create Visit', view: 'createVisit' },
                    { icon: 'fa-list', text: 'Patient List', view: 'patientList' },
                    { icon: 'fa-ticket-alt', text: 'Patient Tickets', view: 'patientTickets' },
                    { icon: 'fa-calculator', text: 'Ticket Limits', view: 'ticketLimits' },
                    { icon: 'fa-money-bill', text: 'Financial', view: 'financial' },
                    { icon: 'fa-users-cog', text: 'Account Management', view: 'accountManagement' },
                    { icon: 'fa-bell', text: 'Notice Board', view: 'noticeBoard' },
                    { icon: 'fa-chart-bar', text: 'Reports', view: 'reports' }
                ];
            case 'doctor':
                const menuItems = [
                    { icon: 'fa-home', text: 'Dashboard', view: 'dashboard' },
                    { icon: 'fa-users', text: 'Patient Queue', view: 'doctorQueue' },
                    { icon: 'fa-list', text: 'Patient List', view: 'patientList' },
                    { icon: 'fa-clipboard', text: 'Consultations', view: 'consultations' },
                    { icon: 'fa-pills', text: 'Pharmacy Stock', view: 'pharmacyStock' }
                ];
                
                // Only show Financial View for Dr. khaalid
                if (currentUser && (
                    (currentUser.name && currentUser.name.toLowerCase().includes('khaalid')) ||
                    (currentUser.username && currentUser.username.toLowerCase().includes('khaalid')) ||
                    (currentUser.id === 2) // ID 2 is Dr. khaalid based on default users
                )) {
                    menuItems.push({ icon: 'fa-money-bill', text: 'Financial View', view: 'financialView' });
                }
                
                return menuItems;
            case 'pharmacy':
                return [
                    { icon: 'fa-home', text: 'Dashboard', view: 'dashboard' },
                    { icon: 'fa-users', text: 'Pharmacy Queue', view: 'pharmacyQueue' },
                    { icon: 'fa-prescription', text: 'Prescriptions', view: 'prescriptions' },
                    { icon: 'fa-pills', text: 'Pharmacy Stock', view: 'pharmacyStock' }
                ];
            case 'lab':
                return [
                    { icon: 'fa-home', text: 'Dashboard', view: 'dashboard' },
                    { icon: 'fa-users', text: 'Lab Queue', view: 'labQueue' },
                    { icon: 'fa-flask', text: 'Lab Tests', view: 'labTests' }
                ];
            case 'patient':
                return [
                    { icon: 'fa-home', text: 'Dashboard', view: 'dashboard' },
                    { icon: 'fa-history', text: 'Visit History', view: 'patientHistory' },
                    { icon: 'fa-file-pdf', text: 'Print Report', view: 'printReport' }
                ];
            default:
                return [];
        }
    };

    const menuItems = getMenuItems();

    return (
        <>
            {/* Mobile Overlay */}
            <div 
                className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
                onClick={onCloseSidebar}
            ></div>
            
            {/* Sidebar */}
            <div className={`sidebar ${sidebarOpen ? 'show' : ''}`}>
                <nav className="nav flex-column">
                    {menuItems.map((item, index) => (
                        <button 
                            key={index}
                            type="button"
                            className={`nav-link ${activeView === item.view ? 'active' : ''}`}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: 'inherit' }}
                            onClick={() => {
                                setActiveView(item.view);
                                // Close sidebar on mobile after clicking
                                if (window.innerWidth < 992) {
                                    onCloseSidebar();
                                }
                            }}
                        >
                            <i className={`fas ${item.icon}`}></i> {item.text}
                        </button>
                    ))}
                </nav>
            </div>
        </>
    );
}

export default Sidebar;

