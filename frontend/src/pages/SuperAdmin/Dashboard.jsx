import { useQuery } from '@tanstack/react-query';
import { Building2, Users, UserCheck, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCompanyStats } from '../../api/superadmin';
import { PageLoader } from '../../components/UI/LoadingSpinner';

const statCards = [
  { key: 'total_companies', label: 'Total Companies', icon: Building2, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
  { key: 'active_companies', label: 'Active Companies', icon: TrendingUp, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
  { key: 'total_admins', label: 'Company Admins', icon: UserCheck, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20' },
  { key: 'total_users', label: 'Total Users', icon: Users, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
];

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: () => getCompanyStats().then(r => r.data),
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-violet-500/10">
        <h2 className="text-xl sm:text-2xl font-bold">Welcome to Super Admin Portal</h2>
        <p className="text-violet-200 mt-1 text-sm sm:text-base">Manage your multi-tenant billing platform from here.</p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => navigate('/superadmin/companies')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
          >
            <Building2 className="w-4 h-4" /> Manage Companies
          </button>
          <button
            onClick={() => navigate('/superadmin/admins')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
          >
            <Users className="w-4 h-4" /> Manage Admins
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ key, label, icon: Icon, gradient, shadow }) => (
          <div key={key} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.[key] || 0}</p>
              </div>
              <div className={`w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg ${shadow}`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Companies */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Recent Companies</h3>
            <p className="text-xs text-gray-500 mt-0.5">Latest registered companies</p>
          </div>
          <button
            onClick={() => navigate('/superadmin/companies')}
            className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {(stats?.recent_companies || []).map((company) => (
            <div key={company.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-fuchsia-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{company.name}</p>
                  <p className="text-xs text-gray-500">{company.email || company.city || 'No details'}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{company.user_count || 0} users</p>
                    <p className="text-xs text-gray-400">{company.admin_count || 0} admins</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    company.is_active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {company.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {!(stats?.recent_companies?.length) && (
            <div className="px-6 py-12 text-center">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No companies yet</p>
              <button
                onClick={() => navigate('/superadmin/companies')}
                className="mt-2 text-sm text-violet-600 hover:text-violet-700 font-medium"
              >
                Create your first company →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
