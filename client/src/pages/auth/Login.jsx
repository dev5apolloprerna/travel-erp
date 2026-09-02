import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui';
import PasswordInput from '../../components/ui/PasswordInput';

// One component drives all four login URLs via :portal param.
const PORTALS = {
  superadmin: { role: 'SUPER_ADMIN', title: 'Super Admin', to: '/app', hint: 'admin@travel.com / admin123' },
  employee:   { role: 'EMPLOYEE', title: 'Employee', to: '/app', hint: 'employee@travel.com / emp123' },
  retail:     { role: 'RETAIL_CUSTOMER', title: 'Customer', to: '/portal/customer', hint: 'rahul@mail.com / cust123' },
  b2b:        { role: 'B2B_MEMBER', title: 'B2B Member', to: '/portal/member', hint: 'karan@nexora.com / member123' },
  companyowner: { role: 'COMPANY_OWNER', title: 'Company Owner', to: '/owner', hint: 'owner@travel.com / owner123' },
};

export default function Login() {
  const { portal = 'employee' } = useParams();
  const cfg = PORTALS[portal] || PORTALS.employee;
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(email, password, cfg.role);
      nav(cfg.to);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand side */}
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <div className="absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(600px circle at 30% 20%, #4583fe, transparent), radial-gradient(500px circle at 70% 80%, #35a1fc, transparent)' }} />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
          <img src="/logo.png" alt="360 Travel Concierge" className="h-14 w-auto object-contain brightness-0 invert" />
          <div>
            <h2 className="font-display text-4xl font-extrabold leading-tight">One desk for every<br />booking you make.</h2>
            <p className="mt-4 max-w-sm text-white/70">Retail, B2B and Society travel operations — flights, hotels, transfers and more, managed end to end.</p>
          </div>
          <div className="text-xs text-white/40">© {new Date().getFullYear()} 360 Travel Concierge</div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center bg-canvas px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="text-xs font-semibold uppercase tracking-widest text-accent-dark">{cfg.title} Portal</div>
          <h1 className="mt-1 text-2xl font-bold text-ink">Sign in to continue</h1>

          {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
            </div>
            <div>
              <label className="label">Password</label>
              <PasswordInput  value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
          </div>

          <button className="btn-primary mt-6 w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>

          <div className="mt-4 rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink-muted">
            Demo login: <span className="font-medium text-ink-soft">{cfg.hint}</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
            <Link to="/login/superadmin" className="hover:text-brand">Super Admin</Link>
            <Link to="/login/employee" className="hover:text-brand">Employee</Link>
            <Link to="/login/retail" className="hover:text-brand">Customer</Link>
            <Link to="/login/b2b" className="hover:text-brand">B2B Member</Link>
            <Link to="/login/companyowner" className="hover:text-brand">Company Owner</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
