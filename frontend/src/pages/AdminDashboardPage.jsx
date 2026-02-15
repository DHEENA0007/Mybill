import { useEffect, useState } from 'react';
import client from '../api/client';

const AdminDashboardPage = () => {
  const [overview, setOverview] = useState(null);
  useEffect(() => { client.get('/super-admin/overview').then((res) => setOverview(res.data)); }, []);
  if (!overview) return <p>Loading...</p>;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Card t="Subscribers" v={overview.subscribers} />
      <Card t="Active" v={overview.active} />
      <Card t="Expired" v={overview.expired} />
      <Card t="MRR" v={`₹${overview.mrr}`} />
      <Card t="Yearly Revenue" v={`₹${overview.yearlyRevenue}`} />
      <Card t="Failed Payments" v={overview.failedPayments} />
    </div>
  );
};

const Card = ({ t, v }) => <div className="rounded bg-white p-4 shadow-sm"><p className="text-sm">{t}</p><h3 className="text-xl font-bold">{v}</h3></div>;

export default AdminDashboardPage;
