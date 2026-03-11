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

  logout() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/citizen/login';
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  getAuthHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  requireAuth(role = 'citizen') {
    const user = this.getUser();
    if (!this.isLoggedIn() || (role && user.role !== role && !(role === 'admin' && user.role === 'superadmin') && !(role === 'citizen' && !user.role))) {
      const redirect = role === 'admin' ? '/admin/login' : '/citizen/login';
      window.location.href = redirect;
    }
  }
};

window.Auth = Auth;
