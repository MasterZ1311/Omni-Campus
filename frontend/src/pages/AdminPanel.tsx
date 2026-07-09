import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'configs' | 'users' | 'utilization' | 'audits'>('configs');

  // Search/Filter states
  const [userSearch, setUserSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Queries
  const { data: configs = [], isLoading: loadingConfigs } = useQuery({
    queryKey: ['admin', 'configs'],
    queryFn: async () => {
      const res = await api.get('/api/admin/config');
      return res.data;
    },
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['admin', 'users', userSearch, selectedRole],
    queryFn: async () => {
      const res = await api.get('/api/admin/users', {
        params: {
          search: userSearch || undefined,
          role: selectedRole || undefined,
        },
      });
      return res.data;
    },
  });

  const { data: utilizationData = { data: [], summary: {} }, isLoading: loadingUtilization } = useQuery({
    queryKey: ['admin', 'utilization'],
    queryFn: async () => {
      const res = await api.get('/api/admin/analytics/utilization');
      return res.data;
    },
  });

  const { data: auditLogs = [], isLoading: loadingAudits } = useQuery({
    queryKey: ['admin', 'audits'],
    queryFn: async () => {
      const res = await api.get('/api/admin/audit-logs');
      return res.data;
    },
  });

  // Mutations
  const updateConfigMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const res = await api.put(`/api/admin/config/${key}`, { value });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Configuration updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'configs'] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await api.put(`/api/admin/users/${userId}/role`, { role });
      return res.data;
    },
    onSuccess: () => {
      toast.success('User role updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/api/admin/users/${userId}/suspend`, { reason: 'Suspended by admin' });
      return res.data;
    },
    onSuccess: () => {
      toast.success('User suspended successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const handleConfigChange = (key: string, currentValue: any) => {
    const newVal = prompt(`Enter new value for config [${key}]:`, JSON.stringify(currentValue));
    if (newVal !== null) {
      try {
        const parsed = JSON.parse(newVal);
        updateConfigMutation.mutate({ key, value: parsed });
      } catch {
        updateConfigMutation.mutate({ key, value: newVal });
      }
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    if (confirm(`Change user role to ${newRole}?`)) {
      updateRoleMutation.mutate({ userId, role: newRole });
    }
  };

  const handleSuspend = (userId: string) => {
    if (confirm('Are you sure you want to suspend this user? They will lose access to reservations.')) {
      suspendUserMutation.mutate(userId);
    }
  };

  const handleExportCSV = () => {
    if (!utilizationData?.data) return;
    
    const headers = ['Resource Name', 'Booked Hours', 'Available Hours', 'Utilization Rate (%)'];
    const rows = (utilizationData.data as any[]).map(r => [
      r.resourceName,
      r.bookedHours,
      r.availableHours,
      r.utilizationRate,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `utilization_report_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Admin Panel</h1>
        <p className="text-slate-505 mt-2">Manage campus system settings, role profiles, audit trails, and utilization rates.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab('configs')}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'configs' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🔧 System Configs
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'users' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          👥 User Roles
        </button>
        <button
          onClick={() => setActiveTab('utilization')}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'utilization' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📊 Utilization Metrics
        </button>
        <button
          onClick={() => setActiveTab('audits')}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'audits' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📜 Audit Trails
        </button>
      </div>

      {/* Tab Content Panels */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        
        {/* System Configs */}
        {activeTab === 'configs' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">System Configuration</h2>
            {loadingConfigs ? (
              <div className="text-slate-400">Loading configurations...</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {configs.map((c: any) => (
                  <div key={c.id} className="py-4 flex justify-between items-center">
                    <div>
                      <span className="font-mono text-red-600 text-sm font-semibold">{c.key}</span>
                      <p className="text-xs text-slate-500 mt-1">Value: {JSON.stringify(c.value)}</p>
                    </div>
                    <button
                      onClick={() => handleConfigChange(c.key, c.value)}
                      className="px-4 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg text-xs transition-all"
                    >
                      Modify
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* User Roles */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-bold text-slate-800">User Settings</h2>
              <div className="flex space-x-3 w-full sm:w-auto">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter users..."
                  className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-red-500/20 focus:outline-none"
                />
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:ring-2 focus:ring-red-500/20 focus:outline-none"
                >
                  <option value="">All Roles</option>
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Facility_Manager">Facility Manager</option>
                  <option value="Administrator">Administrator</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            {loadingUsers ? (
              <div className="text-slate-400">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-medium text-xs">
                      <th className="py-3">Name</th>
                      <th className="py-3">Email</th>
                      <th className="py-3">Role</th>
                      <th className="py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u: any) => (
                      <tr key={u.id} className="text-slate-700">
                        <td className="py-3 font-semibold text-slate-800">{u.name || 'N/A'}</td>
                        <td className="py-3 text-slate-500">{u.email}</td>
                        <td className="py-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="bg-white border border-slate-300 text-slate-900 text-xs py-1 px-2 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                          >
                            <option value="Student">Student</option>
                            <option value="Faculty">Faculty</option>
                            <option value="Facility_Manager">Facility Manager</option>
                            <option value="Administrator">Administrator</option>
                            <option value="Suspended">Suspended</option>
                          </select>
                        </td>
                        <td className="py-3 text-right">
                          {u.role !== 'Suspended' && (
                            <button
                              onClick={() => handleSuspend(u.id)}
                              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded text-xs transition-all"
                            >
                              Suspend
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Utilization Metrics */}
        {activeTab === 'utilization' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Utilization Rate (%)</h2>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center space-x-1"
              >
                <span>💾</span>
                <span>Export CSV Report</span>
              </button>
            </div>

            {loadingUtilization ? (
              <div className="text-slate-400">Loading utilization analytics...</div>
            ) : (
              <div className="space-y-6">
                {/* Summary Panel */}
                {utilizationData.summary && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">No Show Rate</p>
                      <h4 className="text-2xl font-bold text-rose-600 mt-1">{utilizationData.summary.noShowRate}%</h4>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cancellation Rate</p>
                      <h4 className="text-2xl font-bold text-amber-600 mt-1">{utilizationData.summary.cancellationRate}%</h4>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Booking Actions</p>
                      <h4 className="text-2xl font-bold text-red-600 mt-1">{utilizationData.summary.totalBookings}</h4>
                    </div>
                  </div>
                )}

                {/* Progress bars */}
                <div className="space-y-4">
                  {utilizationData.data.map((r: any) => (
                    <div key={r.resourceId} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-slate-800">{r.resourceName}</span>
                        <span className="text-slate-500 font-medium">
                          {r.bookedHours}h booked / {r.utilizationRate}% Utilization
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                        <div
                          className="h-full bg-red-600 rounded-full transition-all duration-500"
                          style={{ width: `${r.utilizationRate}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Audit Trails */}
        {activeTab === 'audits' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Live System Auditing Logs</h2>
            {loadingAudits ? (
              <div className="text-slate-400">Loading logs...</div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto space-y-2 divide-y divide-slate-100">
                {auditLogs.map((log: any) => (
                  <div key={log.id} className="pt-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-mono text-red-600 font-semibold">{log.action}</span>
                      <span className="text-slate-400">{format(new Date(log.createdAt), 'MMM d, h:mm:ss a')}</span>
                    </div>
                    <p className="text-slate-600">
                      User: <span className="font-semibold text-slate-700">{log.user?.name || 'System / OIDC'}</span> ({log.user?.email || 'N/A'})
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      Metadata: {JSON.stringify(log.changes)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
