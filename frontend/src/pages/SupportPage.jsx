import { useEffect, useState } from 'react';
import client from '../api/client';

const SupportPage = () => {
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const load = () => client.get('/support').then((res) => setTickets(res.data));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await client.post('/support', { subject, message, priority: 'medium' });
    setSubject('');
    setMessage('');
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Support Tickets</h2>
      <form onSubmit={create} className="space-y-2 rounded bg-white p-4 shadow-sm">
        <input className="w-full rounded border p-2" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea className="w-full rounded border p-2" placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
        <button className="rounded bg-indigo-700 px-3 py-2 text-white">Create Ticket</button>
      </form>
      <div className="rounded bg-white shadow-sm">{tickets.map((t) => <div key={t.id} className="border-b p-3 last:border-0">#{t.id} {t.subject} — {t.status}</div>)}</div>
    </div>
  );
};

export default SupportPage;
