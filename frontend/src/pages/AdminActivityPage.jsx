import { useEffect, useState } from 'react';
import client from '../api/client';

const AdminActivityPage = () => {
  const [rows, setRows] = useState([]);
  useEffect(() => { client.get('/super-admin/activity-logs').then((res) => setRows(res.data)); }, []);

  return <div className="rounded bg-white shadow-sm">{rows.map((r) => <div key={r.id} className="border-b p-3 last:border-0">{r.created_at} · {r.action}</div>)}</div>;
};

export default AdminActivityPage;
