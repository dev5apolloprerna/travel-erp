import { useEffect, useState } from 'react';
import api from '../../api/client';
import { PageHeader, Table, EmptyRow } from '../../components/ui';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function MySalarySlips() {
  const [slips, setSlips] = useState([]);
  const apiBase = api.defaults.baseURL.replace(/\/api$/, '');

  useEffect(() => { api.get('/hr/my-salary-slips').then((r) => setSlips(r.data)); }, []);

  return (
    <div>
      <PageHeader eyebrow="HR" title="My Salary Slips" />
      <p className="-mt-3 mb-4 text-sm text-ink-muted">You can only see salary slips issued to you.</p>
      <Table head={['Period', 'File', 'Remark', 'Issued on']}>
        {slips.length === 0 && <EmptyRow span={4} text="No salary slips available yet." />}
        {slips.map((s) => (
          <tr key={s._id}>
            <td className="td font-medium text-ink">{MONTHS[s.month - 1]} {s.year}</td>
            <td className="td"><a href={`${apiBase}${s.fileUrl}`} target="_blank" rel="noreferrer" className="text-brand hover:underline">Download</a></td>
            <td className="td">{s.remark || '—'}</td>
            <td className="td">{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
