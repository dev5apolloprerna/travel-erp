import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const IMP_KEY = 'impersonatorToken';   // admin's own token, kept while viewing as a Company Owner

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(!!sessionStorage.getItem(IMP_KEY));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return setLoading(false);
    api.get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password, expectedRole) => {
    const res = await api.post('/auth/login', { email, password, expectedRole });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    sessionStorage.removeItem(IMP_KEY);
    setImpersonating(false);
    localStorage.removeItem('token');
    setUser(null);
  };

  // Explicit "Login as" — Super Admin opens a Company Owner session, keeping its own
  // token so it can return to the admin panel (req #1).
  const loginAsOwner = async (ownerId) => {
    const res = await api.post(`/auth/company-owners/${ownerId}/login-as`);
    const adminToken = localStorage.getItem('token');
    if (adminToken) sessionStorage.setItem(IMP_KEY, adminToken);
    localStorage.setItem('token', res.data.token);
    setImpersonating(true);
    setUser(res.data.user);
    return res.data.user;
  };

  const returnToAdmin = async () => {
    const adminToken = sessionStorage.getItem(IMP_KEY);
    if (!adminToken) return null;
    sessionStorage.removeItem(IMP_KEY);
    localStorage.setItem('token', adminToken);
    setImpersonating(false);
    const res = await api.get('/auth/me');   // interceptor sends the restored admin token
    setUser(res.data.user);
    return res.data.user;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, loginAsOwner, returnToAdmin, impersonating }}>
      {children}
    </AuthContext.Provider>
  );
}
