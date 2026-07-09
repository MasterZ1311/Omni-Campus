import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/useAuth';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

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
    enabled: user?.role !== 'Student',
  });

  const { data: checkouts = [], isLoading: loadingCheckouts } = useQuery({
    queryKey: ['checkouts', 'my'],
    queryFn: async () => {
      const res = await api.get('/api/equipment/checkouts/me');
      return res.data;
    },
    enabled: user?.role !== 'Student',
  });

  const { data: myAssignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: async () => {
      const res = await api.get('/api/staff/my-assignments');
      return res.data;
    },
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

  const confirmWaitlistOffer = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/api/waitlist/${id}/confirm`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Waitlist reservation confirmed!');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to confirm offer');
    },
  });

  const declineWaitlistOffer = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/waitlist/${id}/decline`);
    },
    onSuccess: () => {
      toast.success('Offer declined');
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    },
  });

  const returnEquipment = useMutation({
    mutationFn: async (checkoutId: string) => {
      await api.post(`/api/equipment/checkin/${checkoutId}`, {
        conditionNotes: 'Returned in good condition',
      });
    },
    onSuccess: () => {
      toast.success('Equipment returned successfully');
      queryClient.invalidateQueries({ queryKey: ['checkouts'] });
    },
  });

  const handleCancelClick = (id: string) => {
    const reason = prompt('Please enter a cancellation reason:');
    if (reason) {
      cancelBooking.mutate({ id, reason });
    }
  };

  const upcomingBookings = bookings.filter((b: any) => b.status === 'Confirmed' && new Date(b.endTime) > new Date());
  
  // Calculate cancellation stats
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
        <h1 className="text-lg font-bold text-slate-900 leading-tight">Welcome, {user?.name}</h1>
        <p className="text-slate-500 mt-0.5 text-xs font-medium">Manage resources, view vacant slots, and verify active assignments below.</p>
      </div>

      {/* Dynamic Stats Grid */}
      {user?.role === 'Student' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Roster Role Group</span>
            <span className="text-sm font-bold text-slate-800 mt-1">Student (Read-Only)</span>
          </div>
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Authorized Campus Buildings</span>
            <span className="text-sm font-bold text-slate-800 mt-1">All Facilities</span>
          </div>
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">OIDC Profile Status</span>
            <span className="text-sm font-bold text-emerald-600 mt-1">Active / Local SSO</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Upcoming Bookings</span>
            <span className="text-sm font-bold text-slate-800 mt-1">{upcomingBookings.length}</span>
          </div>
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Active Checkouts</span>
            <span className="text-sm font-bold text-slate-800 mt-1">
              {checkouts.filter((c: any) => !c.actualReturnTime).length}
            </span>
          </div>
          <div className="border border-slate-200 bg-white p-3.5 rounded-lg shadow-sm flex flex-col justify-between">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Cancellation Rate</span>
            <span className="text-sm font-bold text-rose-600 mt-1">{cancellationRate}%</span>
          </div>
        </div>
      )}

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Reservations column */}
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
                    <p className="text-slate-400 text-[10px] italic mt-0.5">Purpose: {booking.purpose}</p>
                  </div>
                  {user?.role !== 'Student' && (
                    <button
                      onClick={() => handleCancelClick(booking.id)}
                      className="px-2 py-1 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 rounded text-xs transition-all font-semibold"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Waitlist, Checkouts, and Role Permissions info column */}
        <div className="space-y-5">

          {/* Technical Assignments Itinerary */}
          {myAssignments && myAssignments.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <h2 className="text-sm font-bold text-slate-800">Your Technical Itinerary</h2>
              </div>
              <div className="space-y-2">
                {myAssignments.map((assignment: any) => (
                  <div key={assignment.id} className="border border-slate-200 bg-slate-50/50 rounded-lg p-3 flex flex-col space-y-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-slate-800">{assignment.taskDescription}</h3>
                      <span className="text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-bold uppercase border border-red-100">
                        {assignment.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Location: {assignment.location}</p>
                    <p className="text-[10px] text-red-600 font-semibold">
                      Timings: {format(new Date(assignment.startTime), 'MMM d, h:mm a')} - {format(new Date(assignment.endTime), 'h:mm a')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Waitlist Offers (Gated for Faculty/FM/Admin) */}
          {user?.role !== 'Student' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                <h2 className="text-sm font-bold text-slate-800">Waitlist Offers</h2>
              </div>

              {loadingWaitlist ? (
                <div className="text-slate-400 py-1">Loading waitlist...</div>
              ) : waitlist.filter((w: any) => w.status === 'Notified').length === 0 ? (
                <div className="border border-dashed border-slate-200 p-4 text-center text-slate-400 rounded-lg text-xs">
                  No active waitlist offers.
                </div>
              ) : (
                <div className="space-y-2">
                  {waitlist
                    .filter((w: any) => w.status === 'Notified')
                    .map((entry: any) => (
                      <div key={entry.id} className="bg-red-50/30 border border-red-200 rounded-lg p-3.5 space-y-3">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-slate-800">{entry.resource.name}</h3>
                          <span className="bg-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Active Offer</span>
                        </div>
                        <p className="text-slate-505 text-[10px]">Desired range:</p>
                        <p className="text-red-600 font-semibold">
                          {format(new Date(entry.desiredStartTime), 'MMM d, h:mm a')} - {format(new Date(entry.desiredEndTime), 'h:mm a')}
                        </p>
                        <p className="text-rose-700 text-[10px] font-bold">
                          Confirm before: {format(new Date(entry.expiresAt), 'h:mm:ss a')}
                        </p>
                        <div className="flex space-x-2 pt-2">
                          <button
                            onClick={() => confirmWaitlistOffer.mutate(entry.id)}
                            className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs transition-all shadow-sm"
                          >
                            Confirm Offer
                          </button>
                          <button
                            onClick={() => declineWaitlistOffer.mutate(entry.id)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-xs transition-all"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Checked Out Equipment (Gated for Faculty/FM/Admin) */}
          {user?.role !== 'Student' && (
            <div className="space-y-4">
              <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                <h2 className="text-sm font-bold text-slate-800">Checked Out Equipment</h2>
              </div>

              {loadingCheckouts ? (
                <div className="text-slate-400 py-1">Loading checkouts...</div>
              ) : checkouts.filter((c: any) => !c.actualReturnTime).length === 0 ? (
                <div className="border border-dashed border-slate-200 p-4 text-center text-slate-400 rounded-lg text-xs">
                  No active equipment checkouts.
                </div>
              ) : (
                <div className="space-y-2">
                  {checkouts
                    .filter((c: any) => !c.actualReturnTime)
                    .map((checkout: any) => (
                      <div key={checkout.id} className="border border-slate-200 bg-white p-3 rounded-lg flex justify-between items-center hover:border-slate-300 transition-all">
                        <div>
                          <h3 className="font-semibold text-slate-800">{checkout.equipment.name}</h3>
                          <p className="text-slate-400 text-[10px]">Location: {checkout.equipment.location}</p>
                          <p className="text-red-600 font-medium text-[10px] mt-0.5">
                            Expected: {format(new Date(checkout.expectedReturnTime), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <button
                          onClick={() => returnEquipment.mutate(checkout.id)}
                          className="px-2 py-1.5 hover:bg-slate-50 border border-slate-200 text-slate-600 rounded text-xs font-semibold transition-all"
                        >
                          Return
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* College Roles & Access Privileges Roster */}
          <div className="space-y-4">
            <div className="flex items-center space-x-1.5 pb-2 border-b border-slate-200">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <h2 className="text-sm font-bold text-slate-800">Campus Access & Role Privileges</h2>
            </div>
            
            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-slate-100 text-[10px]">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-left">
                  <tr>
                    <th className="px-3 py-2">Role Group</th>
                    <th className="px-3 py-2">Booking rights</th>
                    <th className="px-3 py-2">Dispatch rights</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  <tr className={user?.role === 'Student' ? 'bg-red-50/40' : ''}>
                    <td className="px-3 py-2 font-bold text-slate-800">Student</td>
                    <td className="px-3 py-2 text-slate-400">View-Only (Read-Only)</td>
                    <td className="px-3 py-2 text-slate-400">Timetables Only</td>
                  </tr>
                  <tr className={user?.role === 'Faculty' ? 'bg-red-50/40' : ''}>
                    <td className="px-3 py-2 font-bold text-slate-800">Faculty</td>
                    <td className="px-3 py-2 text-slate-600">90d Advance Booking</td>
                    <td className="px-3 py-2 text-slate-600">On-Demand Dispatch</td>
                  </tr>
                  <tr className={user?.role === 'Facility_Manager' ? 'bg-red-50/40' : ''}>
                    <td className="px-3 py-2 font-bold text-slate-800">Facility Mgr</td>
                    <td className="px-3 py-2 text-slate-600">Full Access + Maintenance</td>
                    <td className="px-3 py-2 text-slate-600">Vehicle Dispatch + Roster</td>
                  </tr>
                  <tr className={user?.role === 'Administrator' ? 'bg-red-50/40' : ''}>
                    <td className="px-3 py-2 font-bold text-slate-800">Admin</td>
                    <td className="px-3 py-2 text-slate-600">Full System Control</td>
                    <td className="px-3 py-2 text-slate-600">Full System Dispatch</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
