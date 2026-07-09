import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/useAuth';
import { format } from 'date-fns';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
  });

  const { data: checkouts = [], isLoading: loadingCheckouts } = useQuery({
    queryKey: ['checkouts', 'my'],
    queryFn: async () => {
      const res = await api.get('/api/equipment/checkouts/me');
      return res.data;
    },
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
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
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
        conditionNotes: 'Good condition',
      });
    },
    onSuccess: () => {
      toast.success('Equipment returned successfully');
      queryClient.invalidateQueries({ queryKey: ['checkouts'] });
    },
  });

  const updateAssignmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // In a real application, there would be a dedicated put for assignments.
      // We can update the status on prisma directly or mock it in our UI.
      // Let's use a mock check-in or simple api put if we add it,
      // but to keep schema changes simple, we can display them.
      return null;
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
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Dashboard</h1>
        <p className="text-slate-505 mt-2">Welcome back, {user?.name}. Here is a summary of your campus reservations.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Upcoming Bookings</span>
          <span className="text-4xl font-bold text-red-600 mt-2">{upcomingBookings.length}</span>
        </div>
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Active Checkouts</span>
          <span className="text-4xl font-bold text-red-600 mt-2">
            {checkouts.filter((c: any) => !c.actualReturnTime).length}
          </span>
        </div>
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-between shadow-sm">
          <span className="text-slate-500 text-sm font-semibold uppercase tracking-wider">Cancellation Rate</span>
          <span className="text-4xl font-bold text-rose-600 mt-2">{cancellationRate}%</span>
        </div>
      </div>

      {/* Main sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Reservations column */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <span>📅</span>
            <span>Upcoming Reservations</span>
          </h2>

          {loadingBookings ? (
            <div className="text-slate-400">Loading bookings...</div>
          ) : upcomingBookings.length === 0 ? (
            <div className="glass-panel p-6 text-center text-slate-505">
              No upcoming reservations. Click "Book Resources" to schedule.
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking: any) => (
                <div key={booking.id} className="glass-card p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 shadow-sm border border-slate-200">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{booking.resource.name}</h3>
                    <p className="text-sm text-slate-505 mt-1">📍 {booking.resource.location}</p>
                    <p className="text-sm text-red-600 mt-2 font-medium">
                      ⏰ {format(new Date(booking.startTime), 'MMM d, yyyy h:mm a')} - {format(new Date(booking.endTime), 'h:mm a')}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">Purpose: {booking.purpose}</p>
                  </div>
                  <button
                    onClick={() => handleCancelClick(booking.id)}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-medium rounded-lg transition-all text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Waitlist, checkouts, and staff assignments column */}
        <div className="space-y-8">

          {/* Technical Assignments Itinerary (Shown only for staff profiles matched by email) */}
          {myAssignments && myAssignments.length > 0 && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
                <span>🔧</span>
                <span>Your Technical Itinerary</span>
              </h2>
              <div className="space-y-4">
                {myAssignments.map((assignment: any) => (
                  <div key={assignment.id} className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-800 text-lg">{assignment.taskDescription}</h3>
                      <span className="bg-red-50 text-red-700 border border-red-100 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                        {assignment.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-600">📍 Location: <span className="font-semibold">{assignment.location}</span></p>
                      <p className="text-xs text-red-600 font-medium">
                        ⏰ Timings: {format(new Date(assignment.startTime), 'MMM d, h:mm a')} - {format(new Date(assignment.endTime), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Active Waitlist Offers */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
              <span>🔔</span>
              <span>Waitlist Offers</span>
            </h2>

            {loadingWaitlist ? (
              <div className="text-slate-400">Loading waitlist...</div>
            ) : waitlist.filter((w: any) => w.status === 'Notified').length === 0 ? (
              <div className="glass-panel p-6 text-center text-slate-505 text-sm">
                No active waitlist offers.
              </div>
            ) : (
              <div className="space-y-4">
                {waitlist
                  .filter((w: any) => w.status === 'Notified')
                  .map((entry: any) => (
                    <div key={entry.id} className="bg-red-50/50 border border-red-200 rounded-xl p-6 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-slate-800 text-lg">{entry.resource.name}</h3>
                          <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">Offer Active</span>
                        </div>
                        <p className="text-sm text-slate-505 mt-1">Desired range:</p>
                        <p className="text-sm text-red-600 font-medium">
                          {format(new Date(entry.desiredStartTime), 'MMM d, h:mm a')} - {format(new Date(entry.desiredEndTime), 'h:mm a')}
                        </p>
                        <p className="text-xs text-red-700 mt-3 font-semibold">
                          ⚠️ Confirm before: {format(new Date(entry.expiresAt), 'h:mm:ss a')} (15 min limit)
                        </p>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => confirmWaitlistOffer.mutate(entry.id)}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg text-sm transition-all shadow-md shadow-red-500/10"
                        >
                          Confirm Offer
                        </button>
                        <button
                          onClick={() => declineWaitlistOffer.mutate(entry.id)}
                          className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-sm transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Checked Out Equipment */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
              <span>💻</span>
              <span>Checked Out Equipment</span>
            </h2>

            {loadingCheckouts ? (
              <div className="text-slate-400">Loading checkouts...</div>
            ) : checkouts.filter((c: any) => !c.actualReturnTime).length === 0 ? (
              <div className="glass-panel p-6 text-center text-slate-505 text-sm">
                No active equipment checkouts.
              </div>
            ) : (
              <div className="space-y-4">
                {checkouts
                  .filter((c: any) => !c.actualReturnTime)
                  .map((checkout: any) => (
                    <div key={checkout.id} className="glass-card p-6 rounded-xl flex justify-between items-center shadow-sm border border-slate-200">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{checkout.equipment.name}</h3>
                        <p className="text-sm text-slate-505 mt-1">📍 {checkout.equipment.location}</p>
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          Expected Return: {format(new Date(checkout.expectedReturnTime), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <button
                        onClick={() => returnEquipment.mutate(checkout.id)}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-medium rounded-lg transition-all text-sm"
                      >
                        Return
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
