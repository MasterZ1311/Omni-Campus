import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/useAuth';

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'configs' | 'users' | 'utilization' | 'audits' | 'staff' | 'predictive'>('configs');

  // Search/Filter states
  const [userSearch, setUserSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Dispatch Form states
  const [dispatchStaffId, setDispatchStaffId] = useState('');
  const [dispatchTask, setDispatchTask] = useState('');
  const [dispatchLocation, setDispatchLocation] = useState('');
  const [dispatchStart, setDispatchStart] = useState('');
  const [dispatchEnd, setDispatchEnd] = useState('');

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
    queryKey: ['admin', 'audit-logs'],
    queryFn: async () => {
      const res = await api.get('/api/admin/audit-logs');
      return res.data;
    },
  });

  const { data: staffRoster = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['admin', 'staff-roster'],
    queryFn: async () => {
      const res = await api.get('/api/staff/roster');
      return res.data;
    },
  });

  const { data: riskData = { data: [], summary: {} }, isLoading: loadingRisks } = useQuery({
    queryKey: ['admin', 'predictive-risks'],
    queryFn: async () => {
      const res = await api.get('/api/predictive/maintenance-risk');
      return res.data;
    },
  });

  const { data: forecastData = [], isLoading: loadingForecast } = useQuery({
    queryKey: ['admin', 'utilization-forecast'],
    queryFn: async () => {
      const res = await api.get('/api/predictive/utilization-forecast');
      return res.data;
    },
    enabled: activeTab === 'utilization',
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
      toast.success('User role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/api/admin/users/${userId}/suspend`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('User account suspension state toggled');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const dispatchStaffMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/api/staff/assignments', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Technician dispatched successfully');
      setDispatchStaffId('');
      setDispatchTask('');
      setDispatchLocation('');
      setDispatchStart('');
      setDispatchEnd('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff-roster'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to dispatch staff');
    },
  });

  const updateStaffStatusMutation = useMutation({
    mutationFn: async ({ staffId, status }: { staffId: string; status: string }) => {
      const res = await api.put(`/api/staff/${staffId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Staff availability status updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'staff-roster'] });
    },
  });

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchStaffId || !dispatchTask || !dispatchLocation || !dispatchStart || !dispatchEnd) {
      toast.error('All dispatch assignment fields are required');
      return;
    }
    dispatchStaffMutation.mutate({
      staffId: dispatchStaffId,
      taskDescription: dispatchTask,
      location: dispatchLocation,
      startTime: dispatchStart,
      endTime: dispatchEnd,
    });
  };

  return (
    <div className="space-y-5 text-slate-800 text-xs">
      {/* Top Bar with Logout */}
      <header className="flex justify-between items-center pb-2.5 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin Roster Control</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-600">Console</span>
        </div>
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[11px] font-semibold transition-all shadow-sm flex items-center space-x-1"
        >
          <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          <span>Log out</span>
        </button>
      </header>

      {/* Title */}
      <div>
        <h1 className="text-lg font-bold text-slate-900 leading-tight">System Administration Panel</h1>
        <p className="text-slate-500 mt-0.5 text-xs font-medium">Configure global rules, adjust user roles, schedule technician dispatches, and monitor telemetry analytics.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('configs')}
          className={`pb-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === 'configs' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          System Config
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === 'users' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`pb-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === 'staff' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Staff Dispatch
        </button>
        <button
          onClick={() => setActiveTab('utilization')}
          className={`pb-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === 'utilization' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Utilization Metrics
        </button>
        <button
          onClick={() => setActiveTab('predictive')}
          className={`pb-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === 'predictive' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Predictive Maintenance
        </button>
        <button
          onClick={() => setActiveTab('audits')}
          className={`pb-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === 'audits' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Audit Logs
        </button>
      </div>

      {/* Configs Panel */}
      {activeTab === 'configs' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800">Global System Parameters</h2>
          {loadingConfigs ? (
            <div className="text-slate-400">Loading system parameters...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configs.map((cfg: any) => (
                <div key={cfg.key} className="border border-slate-200 bg-white p-3.5 rounded-lg flex flex-col justify-between hover:border-slate-350 transition-all">
                  <div>
                    <span className="font-bold text-slate-800 font-mono text-[11px]">{cfg.key}</span>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">{cfg.description || 'No description provided.'}</p>
                  </div>
                  <div className="mt-3 flex items-center space-x-2 pt-3 border-t border-slate-100">
                    <input
                      type="text"
                      defaultValue={typeof cfg.value === 'object' ? JSON.stringify(cfg.value) : String(cfg.value)}
                      onBlur={(e) => {
                        let parsedVal: any = e.target.value;
                        try {
                          parsedVal = JSON.parse(e.target.value);
                        } catch {}
                        updateConfigMutation.mutate({ key: cfg.key, value: parsedVal });
                      }}
                      className="flex-1 px-2.5 py-1 rounded bg-slate-50 border border-slate-300 text-xs font-mono text-slate-700 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Panel */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-sm font-bold text-slate-800">Enrollment & Roster Directory</h2>
            <div className="flex space-x-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search user..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none w-full sm:w-44 font-medium"
              />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none font-medium"
              >
                <option value="">All Roles</option>
                <option value="Student">Student</option>
                <option value="Faculty">Faculty</option>
                <option value="Facility_Manager">Facility Manager</option>
                <option value="Administrator">Administrator</option>
              </select>
            </div>
          </div>

          {loadingUsers ? (
            <div className="text-slate-400">Loading directory...</div>
          ) : (
            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-slate-100 text-left">
                <thead className="bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">SSO Integration</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {users.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-bold text-slate-900">{u.name}</td>
                      <td className="px-4 py-2 text-slate-500">{u.email}</td>
                      <td className="px-4 py-2">
                        <select
                          value={u.role}
                          onChange={(e) => updateRoleMutation.mutate({ userId: u.id, role: e.target.value })}
                          className="bg-transparent border-none p-0 text-xs focus:outline-none font-semibold text-slate-800"
                        >
                          <option value="Student">Student</option>
                          <option value="Faculty">Faculty</option>
                          <option value="Facility_Manager">Facility Manager</option>
                          <option value="Administrator">Administrator</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-[10px] uppercase font-bold text-slate-400 font-mono">{u.ssoProvider}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => suspendUserMutation.mutate(u.id)}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded border border-red-100 text-[10px] font-semibold transition-all"
                        >
                          Toggle Lock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Staff Dispatch Panel */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dispatch form */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Dispatch Assignment</h3>
            <form onSubmit={handleDispatchSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Staff Member</label>
                <select
                  value={dispatchStaffId}
                  onChange={(e) => setDispatchStaffId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none"
                  required
                >
                  <option value="">Choose profile...</option>
                  {staffRoster.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Location Point</label>
                <input
                  type="text"
                  value={dispatchLocation}
                  onChange={(e) => setDispatchLocation(e.target.value)}
                  placeholder="Engineering Hall Room 101"
                  className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Task Description</label>
                <textarea
                  value={dispatchTask}
                  onChange={(e) => setDispatchTask(e.target.value)}
                  placeholder="Set up projector, inspect HVAC system..."
                  className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-xs focus:outline-none"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={dispatchStart}
                    onChange={(e) => setDispatchStart(e.target.value)}
                    className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={dispatchEnd}
                    onChange={(e) => setDispatchEnd(e.target.value)}
                    className="w-full px-2 py-1.5 rounded bg-white border border-slate-300 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={dispatchStaffMutation.isPending}
                className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs transition-all shadow-sm"
              >
                {dispatchStaffMutation.isPending ? 'Dispatching...' : 'Dispatch Technician'}
              </button>
            </form>
          </div>

          {/* Staff list Roster */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-slate-800">Staff Availability Roster</h3>
            {loadingStaff ? (
              <div className="text-slate-400">Loading staff roster...</div>
            ) : staffRoster.length === 0 ? (
              <div className="text-slate-400 bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                No technical staff profiles registered.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {staffRoster.map((staff: any) => (
                  <div key={staff.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">{staff.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">{staff.email}</p>
                        <span className="text-[8px] uppercase font-bold text-red-600 mt-2 block tracking-wider font-mono">
                          {staff.role.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div>
                        <select
                          value={staff.status}
                          onChange={(e) => updateStaffStatusMutation.mutate({ staffId: staff.id, status: e.target.value })}
                          className={`text-[9px] font-bold py-0.5 px-2 rounded-full border focus:outline-none uppercase ${
                            staff.status === 'Available'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : staff.status === 'Assigned'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <option value="Available">Available</option>
                          <option value="Assigned">Assigned</option>
                          <option value="Break">Break</option>
                        </select>
                      </div>
                    </div>

                    {staff.assignments && staff.assignments.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Active Tasks:</span>
                        {staff.assignments.slice(0, 2).map((a: any) => (
                          <div key={a.id} className="text-[10px] text-slate-650 bg-slate-50 border border-slate-100 rounded p-2">
                            <p className="font-semibold">{a.taskDescription}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">Loc: {a.location} | Timings: {format(new Date(a.startTime), 'MMM d, h:mm a')}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Utilization Metrics Panel */}
      {activeTab === 'utilization' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800">Resource Occupancy Indexes</h2>
          </div>

          {loadingUtilization ? (
            <div className="text-slate-400">Loading utilization analytics...</div>
          ) : (
            <div className="space-y-4">
              {/* Summary Panel */}
              {utilizationData.summary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-center font-semibold">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">No Show Rate</p>
                    <h4 className="text-lg font-bold text-rose-600 mt-0.5">{utilizationData.summary.noShowRate}%</h4>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cancellation Rate</p>
                    <h4 className="text-lg font-bold text-amber-600 mt-0.5">{utilizationData.summary.cancellationRate}%</h4>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Booking Actions</p>
                    <h4 className="text-lg font-bold text-red-600 mt-0.5">{utilizationData.summary.totalBookings}</h4>
                  </div>
                </div>
              )}

              {/* Progress bars */}
              <div className="space-y-3 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Historical Load Ratios</span>
                <div className="space-y-3 pt-2">
                  {utilizationData.data.map((r: any) => (
                    <div key={r.resourceId} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-800">{r.resourceName}</span>
                        <span className="text-slate-500">
                          {r.bookedHours}h booked / {r.utilizationRate}% Load
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-red-600 rounded-full transition-all duration-500"
                          style={{ width: `${r.utilizationRate}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7-Day AI Utilization Forecast Chart */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">7-Day AI Utilization Forecast</h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Linear regression projection based on the past 30 days of active campus booking reservations.</p>
                </div>

                {loadingForecast ? (
                  <div className="text-slate-400 py-1">Calculating linear regression projection...</div>
                ) : forecastData.length === 0 ? (
                  <div className="text-slate-400 py-1">No projection data compiled yet.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
                    {forecastData.map((f: any, index: number) => (
                      <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col items-center justify-between text-center hover:bg-slate-100/50 transition-all shadow-sm bg-white">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{f.date}</span>
                        
                        {/* Visual indicator bar */}
                        <div className="w-5 h-16 bg-slate-100 rounded-full overflow-hidden flex flex-col justify-end border border-slate-200 my-2">
                          <div 
                            className={`w-full rounded-b-full transition-all duration-500 ${
                              f.expectedRate > 75 ? 'bg-red-600' :
                              f.expectedRate > 40 ? 'bg-amber-500' :
                              'bg-emerald-500'
                            }`}
                            style={{ height: `${f.expectedRate}%` }}
                          ></div>
                        </div>

                        <span className="text-xs font-extrabold text-slate-800 leading-none">{f.expectedRate}%</span>
                        <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Expected</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Predictive Maintenance Panel */}
      {activeTab === 'predictive' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Predictive Roster & Failure Risk</h2>
            <p className="text-slate-400 font-medium">Auto-generated ranking using live sensors, utilization hours, and check-in conditions.</p>
          </div>

          {loadingRisks ? (
            <div className="text-slate-400">Loading risk parameters...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {riskData.data.map((item: any) => (
                <div key={item.resourceId} className="border border-slate-200 bg-white p-3.5 rounded-lg flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-800 text-xs">{item.resourceName}</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        item.riskLevel === 'Critical'
                          ? 'bg-red-50 text-red-700 border border-red-205'
                          : item.riskLevel === 'High'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {item.riskLevel}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">{item.resourceType} | Location: {item.location}</p>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-[10px]">
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[8px]">Risk Score:</span>
                        <p className="font-bold text-slate-800 mt-0.5">{item.riskScore}/100</p>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[8px]">Util Rate:</span>
                        <p className="font-bold text-slate-800 mt-0.5">{item.utilizationRate}%</p>
                      </div>
                    </div>

                    {item.recommendations && item.recommendations.length > 0 && (
                      <div className="mt-3 p-2 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-600 space-y-1 font-semibold leading-relaxed">
                        {item.recommendations.map((rec: string, idx: number) => (
                          <p key={idx}>🔹 {rec}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit Trails */}
      {activeTab === 'audits' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800">Live System Auditing Logs</h2>
          {loadingAudits ? (
            <div className="text-slate-400">Loading logs...</div>
          ) : (
            <div className="border border-slate-200 bg-white rounded-lg p-3 max-h-[400px] overflow-y-auto divide-y divide-slate-100 font-mono text-[10px] space-y-2">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="pt-2 text-slate-650 flex flex-col sm:flex-row justify-between gap-1">
                  <div>
                    <span className="font-bold text-red-600">{log.action}</span>
                    <span className="text-slate-300 mx-1.5">|</span>
                    <span>Entity: {log.entityType} ({log.entityId.slice(0, 8)})</span>
                    <p className="text-slate-400 mt-0.5 text-[9px]">User: {log.user?.name || 'System / OIDC'} ({log.user?.email || 'N/A'})</p>
                  </div>
                  <div className="text-right text-slate-400 text-[9px]">
                    {format(new Date(log.createdAt), 'MMM d, h:mm:ss a')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
