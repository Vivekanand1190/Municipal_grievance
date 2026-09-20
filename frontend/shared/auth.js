/* public/shared/auth.js - Auth helpers for Frontend */

const AUTH_KEY = 'mg_auth_token';
const USER_KEY = 'mg_user_data';

const Auth = {
  saveSession(token, user) {
    localStorage.setItem(AUTH_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getToken() {
    return localStorage.getItem(AUTH_KEY);
  },

  getUser() {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  logout(redirectPath = '/citizen/login') {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = redirectPath;
  },

  isLoggedIn() {
    return !!this.getToken() && !!this.getUser();
  },

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  requireAuth(requiredRole = 'citizen') {
    const token = this.getToken();
    const user = this.getUser();
    
    // 1. Check if logged in at all
    if (!token || !user) {
      console.warn('Auth: No session found, redirecting...');
      this.logout(requiredRole === 'admin' ? '/admin/login' : '/citizen/login');
      return;
    }

    // 2. Check Role
    const userRole = user.role || 'citizen';
    let authorized = false;

    if (requiredRole === 'admin') {
      authorized = (userRole === 'admin' || userRole === 'superadmin' || userRole === 'officer');
    } else if (requiredRole === 'citizen') {
      authorized = (userRole === 'citizen' || !user.role); // Citizens might not have role property
    } else {
      authorized = true; // No specific role required, just logged in
    }

    if (!authorized) {
      console.error(`Auth: Unauthorized access. Required: ${requiredRole}, Found: ${userRole}`);
      this.logout(requiredRole === 'admin' ? '/admin/login' : '/citizen/login');
    }
  }
};

window.Auth = Auth;
