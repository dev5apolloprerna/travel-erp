import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import { PageHeader, Table, EmptyRow, RowActions, Chip } from '../../components/ui';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';

// Super Admin → Company Owners: list + manage Company Owner logins, and explicitly
// "Login as" a Company Owner (req #1). Opening this page stays in the Super Admin panel.
export default function CompanyOwnerList() {
  const nav = useNavigate();
  const confirm = useConfirm();
  const { loginAsOwner } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/auth/company-owners').then((r) => setRows(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const del = async (row) => {
    if (await confirm({ title: 'Delete Company Owner?', message: `${row.name} will lose access.` })) {
      await api.delete(`/auth/company-owners/${row.id}`); load();
    }
  };

  const loginAs = async (row) => {
    if (await confirm({ title: `Login as ${row.name}?`, message: 'You will view the app as this Company Owner. A banner lets you return to Super Admin.' })) {
      await loginAsOwner(row.id);
      nav('/owner');
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Administration" title="Company Owners"
        actions={<Link to="/app/admin/company-owners/new" className="btn-primary btn-sm">+ Add Company Owner</Link>}
      />
      <p className="mb-5 text-sm text-ink-muted">Company Owner logins own the 360 master data and can manage their company's bookings, invoices and employees. Each is isolated to its own company.</p>

      <div className="-mx-1 overflow-x-auto">
        <div className="min-w-[640px] px-1">
          <Table head={['Name', 'Email', 'Phone', 'Status', 'Actions']}>
            {loading && <EmptyRow span={5} text="Loading…" />}
            {!loading && rows.length === 0 && <EmptyRow span={5} text="No Company Owners yet." />}
            {!loading && rows.map((o) => (
              <tr key={o.id} className="hover:bg-faint">
                <td className="td font-medium text-ink">{o.name}</td>
                <td className="td">{o.email}</td>
                <td className="td">{o.phone || '—'}</td>
                <td className="td"><Chip yes={o.isActive}>{o.isActive ? 'Active' : 'Inactive'}</Chip></td>
                <td className="td whitespace-nowrap">
                  <RowActions
                    onEdit={() => nav(`/app/admin/company-owners/${o.id}`)}
                    onDelete={() => del(o)}
                    extra={<button onClick={() => loginAs(o)} className="btn-ghost btn-sm" disabled={!o.isActive}>Login as</button>}
                  />
                </td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
    </div>
  );
}
