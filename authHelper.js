// Authentication helper functions
// These provide application-level security checks

const SESSION_KEYS = ['beergeel_userId', 'beergeel_userRole', 'beergeel_userType'];

/**
 * Session is stored in sessionStorage so each browser tab has its own login state.
 * On first read after upgrade, falls back to legacy localStorage and copies into this tab.
 */
export const readTabSession = () => {
  let userId = sessionStorage.getItem('beergeel_userId');
  let userRole = sessionStorage.getItem('beergeel_userRole');
  let userType = sessionStorage.getItem('beergeel_userType');

  if (userId && userRole && userType) {
    return { userId, userRole, userType };
  }

  userId = localStorage.getItem('beergeel_userId');
  userRole = localStorage.getItem('beergeel_userRole');
  userType = localStorage.getItem('beergeel_userType');
  if (userId && userRole && userType) {
    sessionStorage.setItem('beergeel_userId', userId);
    sessionStorage.setItem('beergeel_userRole', userRole);
    sessionStorage.setItem('beergeel_userType', userType);
    return { userId, userRole, userType };
  }

  return null;
};

export const writeTabSession = (userId, role, userType) => {
  sessionStorage.setItem('beergeel_userId', String(userId));
  sessionStorage.setItem('beergeel_userRole', role);
  sessionStorage.setItem('beergeel_userType', userType);
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const clearTabSession = () => {
  SESSION_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
};

/**
 * Check if user is currently authenticated
 * @returns {boolean} True if user is logged in
 */
export const isAuthenticated = () => {
  const s = readTabSession();
  return !!(s && s.userId && s.userRole);
};

/**
 * Get current user information from tab session storage
 * @returns {Object|null} User object with id, role, and type, or null if not authenticated
 */
export const getCurrentUser = () => {
  const s = readTabSession();
  if (!s || !s.userId || !s.userRole) return null;

  return {
    id: parseInt(s.userId, 10),
    role: s.userRole,
    type: s.userType
  };
};

/**
 * Require authentication before proceeding
 * Throws error if user is not authenticated
 * @throws {Error} If user is not authenticated
 */
export const requireAuth = () => {
  if (!isAuthenticated()) {
    throw new Error('Authentication required. Please log in.');
  }
};

/**
 * Check if user has a specific role
 * @param {string|string[]} allowedRoles - Role(s) to check against
 * @returns {boolean} True if user has one of the allowed roles
 */
export const hasRole = (allowedRoles) => {
  const user = getCurrentUser();
  if (!user) return false;
  
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return roles.includes(user.role);
};

/**
 * Require specific role(s) before proceeding
 * @param {string|string[]} allowedRoles - Role(s) required
 * @throws {Error} If user doesn't have required role
 */
export const requireRole = (allowedRoles) => {
  requireAuth();
  
  if (!hasRole(allowedRoles)) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles.join(' or ') : allowedRoles;
    throw new Error(`Access denied. Required role: ${roles}`);
  }
};
