import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/useAuth';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// --- MOCK WIDGET COMPONENTS ---

const ComplaintsWidget = ({ role }: { role: string }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: { title: string; description: string; location: string }) => {
      const res = await api.post('/api/complaints', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Complaint submitted successfully');
      setTitle('');
      setDescription('');
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
    onError: () => {
      toast.error('Failed to submit complaint');
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        <h2 className="text-sm font-bold text-slate-800">File a Complaint</h2>
      </div>
      <div className="border border-slate-200 bg-white p-4 rounded-lg flex flex-col space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Issue Title..."
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-red-500 bg-slate-50"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={`Describe your issue as a ${role}...`}
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-red-500 bg-slate-50"
          rows={3}
        />
        <button 
          onClick={() => {
            if (title && description) {
               mutation.mutate({ title, description, location: 'TBD' });
            } else {
               toast.error('Please enter a title and description');
            }
          }}
          disabled={mutation.isPending}
          className="self-end px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs transition-all shadow-sm disabled:opacity-50"
        >
          {mutation.isPending ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </div>
    </div>
  );
};

const TimetableWidget = () => (
  <div className="space-y-4">
    <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
      <h2 className="text-sm font-bold text-slate-800">Pinned Timetable</h2>
    </div>
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-[10px]">
        <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-left">
          <tr><th className="px-3 py-2">Time</th><th className="px-3 py-2">Class / Subject</th><th className="px-3 py-2">Room</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
          <tr><td className="px-3 py-2">09:00 AM</td><td className="px-3 py-2">Computer Networks</td><td className="px-3 py-2 font-bold text-slate-900">Lab 402</td></tr>
          <tr><td className="px-3 py-2">11:15 AM</td><td className="px-3 py-2">Operating Systems</td><td className="px-3 py-2 font-bold text-slate-900">Hall B</td></tr>
          <tr><td className="px-3 py-2">02:00 PM</td><td className="px-3 py-2">Software Engineering</td><td className="px-3 py-2 font-bold text-slate-900">Room 105</td></tr>
        </tbody>
      </table>
    </div>
  </div>
);

const FacultyAbsenceWidget = () => (
  <div className="space-y-4">
    <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <h2 className="text-sm font-bold text-slate-800">Mark Absence / Substitution</h2>
    </div>
    <div className="border border-slate-200 bg-white p-4 rounded-lg flex flex-col space-y-3">
      <p className="text-[10px] text-slate-500 font-medium">Request a substitute for your scheduled classes today.</p>
      <select className="w-full px-3 py-2 text-xs border border-slate-300 rounded focus:outline-none focus:border-red-500 bg-slate-50">
        <option>Select Class to Substitute...</option>
        <option>09:00 AM - Computer Networks (Lab 402)</option>
        <option>11:15 AM - Operating Systems (Hall B)</option>
      </select>
      <button 
        onClick={() => toast.success('Substitution request sent to Dept. Head')}
        className="w-full px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded text-xs transition-all shadow-sm"
      >
        Request Substitution
      </button>
    </div>
  </div>
);

const EVBookingWidget = () => {
  const queryClient = useQueryClient();
  const { data: vehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get('/api/transport/vehicles');
      return res.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/transport/request', {
        pickupLocation: 'Current Dept',
        dropoffLocation: 'Main Gate',
        requestedTime: new Date().toISOString()
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('EV Buggy Dispatched to your location');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to dispatch EV');
    }
  });

  const availableBuggies = vehicles?.filter((v: any) => v.status === 'Active' && v.remainingSeats > 0)?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        <h2 className="text-sm font-bold text-slate-800">EV Vehicle Booking</h2>
      </div>
      <div className="border border-slate-200 bg-white p-4 rounded-lg flex flex-col space-y-3">
        <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 p-2 rounded">
          <span className="text-[10px] font-bold text-emerald-700 uppercase">Available Vehicles</span>
          <span className="text-sm font-bold text-emerald-800">{availableBuggies} Buggies</span>
        </div>
        <button 
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || availableBuggies === 0}
          className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-xs transition-all shadow-sm disabled:opacity-50"
        >
          {mutation.isPending ? 'Dispatching...' : 'Dispatch to My Department'}
        </button>
      </div>
    </div>
  );
};

const AttenderInboxWidget = () => {
  const queryClient = useQueryClient();
  const { data: complaints, isLoading } = useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const res = await api.get('/api/complaints');
      return res.data;
    }
  });

  const routeMutation = useMutation({
    mutationFn: async ({ id, dept }: { id: string; dept: string }) => {
      const res = await api.patch(`/api/complaints/${id}/route`, { assignedToDept: dept });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Complaint routed successfully');
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    },
    onError: () => {
      toast.error('Failed to route complaint');
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        <h2 className="text-sm font-bold text-slate-800">Complaints Routing Inbox</h2>
      </div>
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-slate-500">Loading complaints...</p>
        ) : complaints?.length === 0 ? (
          <p className="text-xs text-slate-500">No pending complaints.</p>
        ) : (
          complaints?.filter((c: any) => c.status === 'Pending').map((c: any) => (
            <div key={c.id} className="border border-slate-200 bg-white p-3 rounded-lg flex flex-col space-y-2">
              <div className="flex justify-between items-start">
                <span className="font-bold text-xs text-slate-800">{c.title}</span>
                <span className="text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase">{c.status}</span>
              </div>
              <p className="text-[10px] text-slate-500">{c.description}</p>
              <p className="text-[10px] text-slate-500">Reported by: {c.reportedBy?.name}</p>
              <button 
                onClick={() => routeMutation.mutate({ id: c.id, dept: 'IT Dept' })}
                disabled={routeMutation.isPending}
                className="self-end px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[10px] font-semibold transition-all disabled:opacity-50"
              >
                {routeMutation.isPending ? 'Routing...' : 'Route to IT'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const SmartAttendanceWidget = () => (
  <div className="space-y-4">
    <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <h2 className="text-sm font-bold text-slate-800">Smart Attendance Scanner</h2>
    </div>
    <div className="border border-slate-200 bg-white p-6 rounded-lg flex flex-col items-center justify-center space-y-3">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-dashed border-slate-300">
        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
      </div>
      <p className="text-xs text-slate-500 font-semibold">Ready to scan NFC/RFID tags for current session</p>
      <button 
        onClick={() => toast.success('Attendance filed for current session')}
        className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs transition-all shadow-sm"
      >
        File Attendance Report
      </button>
    </div>
  </div>
);

const LabStatusWidget = () => {
  const queryClient = useQueryClient();
  const { data: assets, isLoading } = useQuery({
    queryKey: ['labAssets'],
    queryFn: async () => {
      const res = await api.get('/api/inventory/lab-assets');
      return res.data;
    }
  });

  const reportMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/api/inventory/lab-assets/${id}/report`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Asset reported as Fault');
      queryClient.invalidateQueries({ queryKey: ['labAssets'] });
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/api/inventory/lab-assets/${id}/resolve`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Asset marked as Online');
      queryClient.invalidateQueries({ queryKey: ['labAssets'] });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
        <h2 className="text-sm font-bold text-slate-800">Laboratory Asset Tracker</h2>
      </div>
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-[10px]">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-left">
            <tr><th className="px-3 py-2">Asset</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {isLoading ? (
              <tr><td colSpan={3} className="px-3 py-2 text-center text-slate-500">Loading assets...</td></tr>
            ) : assets?.length === 0 ? (
              <tr><td colSpan={3} className="px-3 py-2 text-center text-slate-500">No assets found.</td></tr>
            ) : (
              assets?.map((asset: any) => (
                <tr key={asset.id}>
                  <td className="px-3 py-2 font-bold text-slate-800">{asset.name} ({asset.location})</td>
                  <td className={`px-3 py-2 ${asset.status === 'Online' ? 'text-emerald-600' : 'text-rose-600'}`}>{asset.status}</td>
                  <td className="px-3 py-2">
                    {asset.status === 'Online' ? (
                      <button onClick={() => reportMutation.mutate(asset.id)} className="text-slate-400 hover:text-slate-800 underline">Report Issue</button>
                    ) : (
                      <button onClick={() => resolveMutation.mutate(asset.id)} className="text-slate-400 hover:text-slate-800 underline">Resolve</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const LabMaintenanceWidget = () => {
  const queryClient = useQueryClient();
  const { data: issues, isLoading } = useQuery({
    queryKey: ['complaints', 'lab'],
    queryFn: async () => {
      const res = await api.get('/api/complaints');
      return res.data;
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/api/complaints/${id}/route`, { assignedToDept: 'Resolved' });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Issue marked as Resolved');
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
        <h2 className="text-sm font-bold text-slate-800">Maintenance Queue</h2>
      </div>
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-slate-500">Loading issues...</p>
        ) : issues?.length === 0 ? (
          <p className="text-xs text-slate-500">No maintenance issues.</p>
        ) : (
          issues?.filter((i: any) => i.status !== 'Resolved').map((issue: any) => (
            <div key={issue.id} className="border border-slate-200 bg-white p-3 rounded-lg flex flex-col space-y-2 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="font-bold text-xs text-slate-800">{issue.title}</span>
                <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase border border-amber-100">Action Required</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Location: {issue.location || 'Unknown'} • Reported by: {issue.reportedBy?.name}</p>
              <div className="flex space-x-2 mt-1">
                <button 
                  onClick={() => resolveMutation.mutate(issue.id)}
                  disabled={resolveMutation.isPending}
                  className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-semibold transition-all disabled:opacity-50"
                >
                  {resolveMutation.isPending ? 'Resolving...' : 'Mark Resolved'}
                </button>
                <button className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded text-[10px] font-semibold transition-all">Escalate</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const LabInventoryWidget = () => {
  const { data: inventory, isLoading } = useQuery({
    queryKey: ['peripherals'],
    queryFn: async () => {
      const res = await api.get('/api/inventory/peripherals');
      return res.data;
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
        <h2 className="text-sm font-bold text-slate-800">Peripherals Inventory</h2>
      </div>
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-[10px]">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-left">
            <tr><th className="px-3 py-2">Item</th><th className="px-3 py-2">In Stock</th><th className="px-3 py-2">Out</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {isLoading ? (
              <tr><td colSpan={3} className="px-3 py-2 text-center text-slate-500">Loading inventory...</td></tr>
            ) : inventory?.length === 0 ? (
              <tr><td colSpan={3} className="px-3 py-2 text-center text-slate-500">No inventory found.</td></tr>
            ) : (
              inventory?.map((item: any) => (
                <tr key={item.id}>
                  <td className="px-3 py-2 font-bold text-slate-800">{item.name}</td>
                  <td className={`px-3 py-2 ${item.status === 'Low' || item.status === 'Critical' ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>
                    {item.inStock} {item.status !== 'Good' ? `(${item.status})` : ''}
                  </td>
                  <td className="px-3 py-2">{item.out}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TaskDispatchWidget = () => {
  const queryClient = useQueryClient();
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments', 'my'],
    queryFn: async () => {
      const res = await api.get('/api/staff/my-assignments');
      return res.data;
    }
  });

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/api/staff/assignments/${id}/complete`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Task marked as complete');
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: () => {
      toast.error('Failed to complete task');
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
        <h2 className="text-sm font-bold text-slate-800">Daily Task Dispatch</h2>
      </div>
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-slate-500">Loading tasks...</p>
        ) : assignments?.length === 0 ? (
          <p className="text-xs text-slate-500">No tasks assigned.</p>
        ) : (
          assignments?.filter((a: any) => a.status !== 'Completed').map((task: any) => (
            <div key={task.id} className="border border-slate-200 bg-white p-3 rounded-lg flex flex-col space-y-2 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="font-bold text-xs text-slate-800">{task.taskDescription}</span>
                <span className="text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase border border-red-100">{task.status}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">{task.location}</p>
              <button 
                onClick={() => completeMutation.mutate(task.id)}
                disabled={completeMutation.isPending}
                className="self-end px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-semibold transition-all disabled:opacity-50"
              >
                {completeMutation.isPending ? 'Completing...' : 'Mark Complete'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const FacultyApprovalsWidget = () => {
  const queryClient = useQueryClient();
  const { data: requests, isLoading } = useQuery({
    queryKey: ['pendingVerifications'],
    queryFn: async () => {
      const res = await api.get('/api/bookings/pending-verifications');
      return res.data;
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'decline' }) => {
      const res = await api.patch(`/api/bookings/${id}/verify`, { action });
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Request successfully ${variables.action}d.`);
      queryClient.invalidateQueries({ queryKey: ['pendingVerifications'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update request.');
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <h2 className="text-sm font-bold text-slate-800">Student Booking Requests</h2>
      </div>
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-slate-500">Loading requests...</p>
        ) : requests?.length === 0 ? (
          <p className="text-xs text-slate-400 font-semibold">No pending requests.</p>
        ) : (
          requests?.map((req: any) => (
            <div key={req.id} className="border border-slate-200 bg-white p-3 rounded-lg flex flex-col space-y-2 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="font-bold text-xs text-slate-800">{req.resource.name} ({req.resource.location})</span>
                <span className="text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase border border-red-100">Verification Pending</span>
              </div>
              <div className="text-[10px] text-slate-500 space-y-0.5 font-semibold">
                <p><span className="font-semibold text-slate-700">Requested By:</span> {req.user.name} ({req.user.email})</p>
                <p><span className="font-semibold text-slate-700">Time:</span> {format(new Date(req.startTime), 'MMM d, h:mm a')} - {format(new Date(req.endTime), 'h:mm a')}</p>
                <p><span className="font-semibold text-slate-700">Purpose:</span> {req.purpose}</p>
              </div>
              {req.permissionSlipUrl && (
                <a 
                  href={`http://localhost:5000${req.permissionSlipUrl}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-[10px] text-red-650 hover:underline font-bold"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  <span>Download Permission Slip</span>
                </a>
              )}
              <div className="flex space-x-2 pt-1.5 border-t border-slate-100">
                <button 
                  onClick={() => verifyMutation.mutate({ id: req.id, action: 'approve' })}
                  disabled={verifyMutation.isPending}
                  className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-semibold transition-all disabled:opacity-50"
                >
                  Approve
                </button>
                <button 
                  onClick={() => verifyMutation.mutate({ id: req.id, action: 'decline' })}
                  disabled={verifyMutation.isPending}
                  className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 rounded text-[10px] font-semibold transition-all disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/api/notifications');
      return res.data;
    },
    refetchInterval: 10000 // Poll every 10 seconds for new messages
  });

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Notifications</h3>
            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{notifications.length}</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No new notifications
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notif: any) => {
                  let payload = { message: '' };
                  try { payload = JSON.parse(notif.payload); } catch (e) {}
                  return (
                    <div key={notif.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <p className="text-xs text-slate-800 font-medium">{payload.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{format(new Date(notif.createdAt), 'MMM d, h:mm a')}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Queries
  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['bookings', 'my'],
    queryFn: async () => {
      const res = await api.get('/api/bookings/my');
      return res.data;
    },
  });

  const { data: waitlist = [], isLoading: loadingWaitlist } = useQuery({
    queryKey: ['waitlist', 'my'],
    queryFn: async () => {
      const res = await api.get('/api/waitlist/me');
      return res.data;
    },
    enabled: user?.role === 'Administrator' || user?.role === 'Facility_Manager',
  });

  const { data: checkouts = [], isLoading: loadingCheckouts } = useQuery({
    queryKey: ['checkouts', 'my'],
    queryFn: async () => {
      const res = await api.get('/api/equipment/checkouts/me');
      return res.data;
    },
    enabled: user?.role === 'Administrator' || user?.role === 'Facility_Manager',
  });

  const { data: myAssignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: async () => {
      const res = await api.get('/api/staff/my-assignments');
      return res.data;
    },
    enabled: user?.role === 'Administrator' || user?.role === 'Facility_Manager',
  });

  // Mutations
  const cancelBooking = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.delete(`/api/bookings/${id}`, { data: { reason } });
    },
    onSuccess: () => {
      toast.success('Reservation cancelled successfully');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  const returnEquipment = useMutation({
    mutationFn: async (checkoutId: string) => {
      await api.post(`/api/equipment/checkin/${checkoutId}`, { conditionNotes: 'Returned in good condition' });
    },
    onSuccess: () => {
      toast.success('Equipment returned successfully');
      queryClient.invalidateQueries({ queryKey: ['checkouts'] });
    },
  });

  const handleCancelClick = (id: string) => {
    const reason = prompt('Please enter a cancellation reason:');
    if (reason) cancelBooking.mutate({ id, reason });
  };

  const upcomingBookings = bookings.filter((b: any) => b.status === 'Confirmed' && new Date(b.endTime) > new Date());
  const totalBookingsCount = bookings.length;
  const cancelledCount = bookings.filter((b: any) => b.status === 'Cancelled').length;
  const cancellationRate = totalBookingsCount > 0 ? Math.round((cancelledCount / totalBookingsCount) * 100) : 0;

  return (
    <div className="space-y-5 text-slate-800 text-xs">
      {/* Notion-style Top Bar & Logout Action */}
      <header className="flex justify-between items-center pb-2.5 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dashboard Console</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-600">Home</span>
        </div>
        <div className="flex items-center space-x-3">
          <NotificationBell />
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-[11px] font-semibold transition-all shadow-sm flex items-center space-x-1"
          >
            <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            <span>Log out</span>
          </button>
        </div>
      </header>

      {/* Title */}
      <div>
        <h1 className="text-lg font-bold text-slate-900 leading-tight">Welcome, {user?.name}</h1>
        <p className="text-slate-500 mt-0.5 text-xs font-medium">Your specialized dashboard tailored for {user?.role.replace(/_/g, ' ')}s.</p>
      </div>

      {/* Dynamic Stats Grid based on Role */}
      {user?.role === 'Student' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Enrolled Classes</span>
            <span className="text-sm font-bold text-slate-800 mt-1">6 Courses</span>
          </div>
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Campus Map Navigation</span>
            <span className="text-sm font-bold text-blue-600 mt-1">Enabled</span>
          </div>
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Permissions</span>
            <span className="text-sm font-bold text-slate-800 mt-1">Read-Only</span>
          </div>
        </div>
      ) : user?.role === 'Faculty' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Today's Classes</span>
            <span className="text-sm font-bold text-slate-800 mt-1">3 Sessions</span>
          </div>
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Active Lab Bookings</span>
            <span className="text-sm font-bold text-slate-800 mt-1">{upcomingBookings.length}</span>
          </div>
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">EV Transport Status</span>
            <span className="text-sm font-bold text-emerald-600 mt-1">Ready to Dispatch</span>
          </div>
        </div>
      ) : user?.role === 'Lab_Assistant' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Assigned Labs</span>
            <span className="text-sm font-bold text-slate-800 mt-1">Lab 402, Lab 403</span>
          </div>
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Technical Issues</span>
            <span className="text-sm font-bold text-rose-600 mt-1">1 Pending</span>
          </div>
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Computer Terminals</span>
            <span className="text-sm font-bold text-slate-800 mt-1">45 / 50 Online</span>
          </div>
        </div>
      ) : user?.role === 'Attender' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Attendance Reports Filed</span>
            <span className="text-sm font-bold text-slate-800 mt-1">12 This Week</span>
          </div>
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Pending Complaints</span>
            <span className="text-sm font-bold text-rose-600 mt-1">2 Unrouted</span>
          </div>
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Current Zone</span>
            <span className="text-sm font-bold text-slate-800 mt-1">Block A</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Total System Bookings</span>
            <span className="text-sm font-bold text-slate-800 mt-1">{totalBookingsCount}</span>
          </div>
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Active Checkouts</span>
            <span className="text-sm font-bold text-slate-800 mt-1">
              {checkouts.filter((c: any) => !c.actualReturnTime).length}
            </span>
          </div>
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">System Health</span>
            <span className="text-sm font-bold text-emerald-600 mt-1">Optimal</span>
          </div>
        </div>
      )}

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Left Column */}
        <div className="space-y-6">
          
          {/* Universal Bookings View (if applicable) */}
          {user?.role === 'Faculty' || user?.role === 'Administrator' || user?.role === 'Facility_Manager' ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <h2 className="text-sm font-bold text-slate-800">Your Reservations</h2>
              </div>
              {loadingBookings ? (
                <div className="text-slate-400 py-2">Loading bookings...</div>
              ) : upcomingBookings.length === 0 ? (
                <div className="border border-dashed border-slate-200 p-6 text-center text-slate-400 rounded-lg bg-slate-50/50">
                  No upcoming resource reservations found.
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingBookings.map((booking: any) => (
                    <div key={booking.id} className="border border-slate-200 bg-white p-3 rounded-lg flex justify-between items-start hover:border-slate-300 transition-all">
                      <div className="space-y-0.5">
                        <h3 className="font-bold text-slate-805 text-xs">{booking.resource.name}</h3>
                        <p className="text-slate-405 text-[11px]">Location: {booking.resource.location}</p>
                        <p className="text-red-600 font-semibold text-xs mt-1">
                          {format(new Date(booking.startTime), 'MMM d, yyyy h:mm a')} - {format(new Date(booking.endTime), 'h:mm a')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancelClick(booking.id)}
                        className="px-2 py-1 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 rounded text-xs transition-all font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Role Specific Left Column Widgets */}
          {user?.role === 'Student' && <TimetableWidget />}
          {user?.role === 'Faculty' && <TimetableWidget />}
          {user?.role === 'Lab_Assistant' && (
            <>
              <LabStatusWidget />
              <LabInventoryWidget />
            </>
          )}
          {user?.role === 'Attender' && (
            <>
              <SmartAttendanceWidget />
              <TaskDispatchWidget />
            </>
          )}

        </div>

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Role Specific Right Column Widgets */}
          {user?.role === 'Student' && <ComplaintsWidget role="Student" />}
          
          {user?.role === 'Faculty' && (
            <>
              <FacultyApprovalsWidget />
              <FacultyAbsenceWidget />
              <EVBookingWidget />
              <ComplaintsWidget role="Faculty" />
            </>
          )}

          {user?.role === 'Lab_Assistant' && <LabMaintenanceWidget />}

          {user?.role === 'Attender' && <AttenderInboxWidget />}

          {/* Admin / Facility Manager existing widgets */}
          {(user?.role === 'Administrator' || user?.role === 'Facility_Manager') && (
            <div className="space-y-4">
              <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <h2 className="text-sm font-bold text-slate-800">Campus Access & Role Privileges</h2>
              </div>
              <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-slate-100 text-[10px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-left">
                    <tr><th className="px-3 py-2">Role Group</th><th className="px-3 py-2">Rights</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    <tr><td className="px-3 py-2 font-bold text-slate-800">Student</td><td className="px-3 py-2 text-slate-400">View-Only / Timetable / Map</td></tr>
                    <tr><td className="px-3 py-2 font-bold text-slate-800">Faculty</td><td className="px-3 py-2 text-slate-600">Booking / EV Dispatch / Timetable</td></tr>
                    <tr><td className="px-3 py-2 font-bold text-slate-800">Lab Assistant</td><td className="px-3 py-2 text-slate-600">Asset Mgmt / Issue Resolution</td></tr>
                    <tr><td className="px-3 py-2 font-bold text-slate-800">Attender</td><td className="px-3 py-2 text-slate-600">Smart Attendance / Complaints Routing</td></tr>
                    <tr><td className="px-3 py-2 font-bold text-slate-800">Admin</td><td className="px-3 py-2 text-slate-600">Full System Control</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
