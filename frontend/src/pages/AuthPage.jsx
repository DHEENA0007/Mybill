import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
    billingCycle: 'monthly'
  });
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded bg-white p-6 shadow">
        <h2 className="text-2xl font-bold text-indigo-900">{isLogin ? 'Welcome back' : 'Start your workspace'}</h2>
        {!isLogin && (
          <>
            <input className="w-full rounded border p-2" placeholder="Company Name" onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            <input className="w-full rounded border p-2" placeholder="Owner Name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </>
        )}
        <input className="w-full rounded border p-2" placeholder="Email" type="email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="w-full rounded border p-2" placeholder="Password" type="password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {!isLogin && (
          <select className="w-full rounded border p-2" onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full rounded bg-indigo-700 p-2 text-white">{isLogin ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="w-full text-sm" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
        </button>
      </form>
    </div>
  );
};

export default AuthPage;
