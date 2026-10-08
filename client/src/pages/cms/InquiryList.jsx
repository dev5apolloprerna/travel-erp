import { useEffect, useState } from 'react';
import api from '../../api/client';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { PageHeader, Table, EmptyRow, RowActions } from '../../components/ui';

/** Website inquiries submitted from the public contact form. List + delete. */
export default function InquiryList() {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    return api.get('/cms/inquiries').then((r) => setRows(r.data)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const del = async (row) => {
    if (await confirm({ title: 'Delete inquiry?', message: `Inquiry from ${row.fullName} will be removed.` })) {
      await api.delete(`/cms/inquiries/${row._id}`); load();
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Website" title="Inquiries" />

      <div className="-mx-1 overflow-x-auto">
        <div className="min-w-[720px] px-1">
          <Table head={['Date', 'Full Name', 'Phone', 'Email', 'Travel Requirement', 'Actions']}>
            {loading && <EmptyRow span={6} text="Loading…" />}
            {!loading && rows.length === 0 && <EmptyRow span={6} text="No inquiries yet." />}
            {!loading && rows.map((r) => (
              <tr key={r._id} className="hover:bg-faint">
                <td className="td whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString('en-IN')}</td>
                <td className="td font-medium text-ink">{r.fullName}</td>
                <td className="td whitespace-nowrap">{r.phone}</td>
                <td className="td">{r.email}</td>
                <td className="td max-w-[280px]">{r.travelRequirement}</td>
                <td className="td"><RowActions onDelete={() => del(r)} /></td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
    </div>
  );
}
