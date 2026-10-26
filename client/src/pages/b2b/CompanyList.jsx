import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Table, EmptyRow, RowActions, money } from '../../components/ui';
import { useShellBase } from '../../hooks/useShellBase';

// Booking a B2B order respects the Orders permission ('retail-orders' is this app's only
// Orders menu/permission key — there is no separate B2B-orders key), applied the same way as
// on the Retail Customer listing so both screens behave consistently.
const ORDER_MENU = 'retail-orders';

export default function CompanyList() {
  const { can } = useAuth();
  const canBookOrder = can(ORDER_MENU, 'CREATE');
  const [companies, setCompanies] = useState([]);
  const nav = useNavigate();
  const confirm = useConfirm();
  const base = useShellBase();

  const load = () => api.get('/b2b/companies').then((r) => setCompanies(r.data));
  useEffect(() => { load(); }, []);

  const del = async (c) => {
    if (await confirm({ title: 'Delete company?', message: `${c.name} and its member logins will be removed.` }))
      { await api.delete(`/b2b/companies/${c._id}`); load(); }
  };

  return (
    <div>
      <PageHeader eyebrow="B2B" title="Companies"
        actions={
          <div className="flex gap-2">
            {canBookOrder && <Link to={`${base}/b2b/orders/new`} className="btn-accent">New booking</Link>}
            <Link to={`${base}/b2b/companies/new`} className="btn-primary">New company</Link>
          </div>
        } />
      <Table head={['Company', 'Members', 'Billed', 'Paid', 'Outstanding', 'Actions']}>
        {companies.length === 0 && <EmptyRow span={6} text="No companies yet." />}
        {companies.map((c) => (
          <tr key={c._id} className="hover:bg-canvas">
            <td className="td font-medium text-ink">{c.name}</td>
            <td className="td">{c.memberCount}</td>
            <td className="td">{money(c.totalBilled)}</td>
            <td className="td">{money(c.totalPaid)}</td>
            <td className="td font-semibold">{money(c.totalBilled - c.totalPaid)}</td>
            <td className="td">
              <RowActions
                onEdit={() => nav(`${base}/b2b/companies/${c._id}?tab=info`)}
                onDelete={() => del(c)}
                extra={
                  <>
                    {canBookOrder && <button onClick={() => nav(`${base}/b2b/orders/new?company=${c._id}`)} className="btn-ghost btn-sm">Book</button>}
                    <button onClick={() => nav(`${base}/b2b/companies/${c._id}`)} className="btn-primary btn-sm">Open</button>
                  </>
                }
              />
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
