import { useEffect, useState } from 'react';
import client from '../api/client';

const AdminSettingsPage = () => {
  const [form, setForm] = useState(null);

  const load = () => client.get('/super-admin/settings').then((res) => setForm(res.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    await client.patch('/super-admin/settings', {
      maintenanceMode: Boolean(form.maintenance_mode),
      planMonthly: Number(form.plan_monthly),
      planYearly: Number(form.plan_yearly),
      trialDays: Number(form.trial_days)
    });
    load();
  };

  if (!form) return <p>Loading...</p>;

  return (
    <div className="space-y-3 rounded bg-white p-4 shadow-sm">
      <h2 className="text-xl font-semibold">Platform Settings</h2>
      <label className="block">Maintenance Mode
        <select className="ml-2 rounded border p-2" value={String(form.maintenance_mode)} onChange={(e) => setForm({ ...form, maintenance_mode: e.target.value === '1' ? 1 : 0 })}>
          <option value="0">Off</option>
          <option value="1">On</option>
        </select>
      </label>
      <label className="block">Monthly Price <input className="ml-2 rounded border p-2" type="number" value={form.plan_monthly} onChange={(e) => setForm({ ...form, plan_monthly: e.target.value })} /></label>
      <label className="block">Yearly Price <input className="ml-2 rounded border p-2" type="number" value={form.plan_yearly} onChange={(e) => setForm({ ...form, plan_yearly: e.target.value })} /></label>
      <label className="block">Trial Days <input className="ml-2 rounded border p-2" type="number" value={form.trial_days} onChange={(e) => setForm({ ...form, trial_days: e.target.value })} /></label>
      <button className="rounded bg-indigo-700 px-3 py-2 text-white" onClick={save}>Save Settings</button>
    </div>
  );
};

export default AdminSettingsPage;
