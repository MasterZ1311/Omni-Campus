import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/useAuth';
import { format, addHours } from 'date-fns';

export default function ResourceDiscovery() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Search/Filter states
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedResource, setSelectedResource] = useState<any>(null);

  // Booking Form states
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [recurrence, setRecurrence] = useState('None');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');

  // Equipment checkout state
  const [expectedReturn, setExpectedReturn] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');

  // Queries
  const { data: resourceData = { resources: [] }, isLoading: loadingResources } = useQuery({
    queryKey: ['resources', type, search, selectedAmenities],
    queryFn: async () => {
      const amenitiesParam = selectedAmenities.length > 0 ? selectedAmenities.join(',') : '';
      const res = await api.get('/api/resources', {
        params: {
          type: type || undefined,
          search: search || undefined,
          amenities: amenitiesParam || undefined,
        },
      });
      return res.data;
    },
  });

  const { data: availability = null, refetch: refetchAvailability } = useQuery({
    queryKey: ['availability', selectedResource?.id],
    queryFn: async () => {
      if (!selectedResource) return null;
      const res = await api.get(`/api/resources/${selectedResource.id}/availability`);
      return res.data;
    },
    enabled: !!selectedResource,
  });

  // Mutations
  const bookMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.recurrencePattern && payload.recurrencePattern !== 'None') {
        const res = await api.post('/api/bookings/recurring', payload);
        return res.data;
      } else {
        const res = await api.post('/api/bookings', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      if (data.skipped && data.skipped.length > 0) {
        toast.success(`Recurring booking created! Skipped ${data.skipped.length} dates due to conflicts.`);
      } else {
        toast.success('Resource booked successfully!');
      }
      setSelectedResource(null);
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err: any) => {
      const responseData = err.response?.data;
      if (err.response?.status === 409 && responseData.conflicts) {
        toast.error('Booking conflict detected.');
        if (responseData.alternatives && responseData.alternatives.length > 0) {
          const formattedAlts = responseData.alternatives
            .map((a: any) => `${format(new Date(a.startTime), 'h:mm a')} - ${format(new Date(a.endTime), 'h:mm a')}`)
            .join('\n');
          toast(`💡 Suggested Alternative Times:\n${formattedAlts}`, { duration: 6000 });
        }
      } else {
        toast.error(responseData?.error || 'Booking failed');
      }
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/api/equipment/checkout', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Equipment checked out successfully!');
      setSelectedResource(null);
      queryClient.invalidateQueries({ queryKey: ['checkouts'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Checkout failed');
    },
  });

  const joinWaitlistMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/api/waitlist', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Joined waitlist at position #${data.position}!`);
      setSelectedResource(null);
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to join waitlist');
    },
  });

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) return;

    const payload: any = {
      resourceId: selectedResource.id,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      purpose,
    };

    if (recurrence !== 'None') {
      payload.recurrencePattern = recurrence;
      payload.recurrenceEndDate = new Date(recurrenceEnd).toISOString();
    }

    bookMutation.mutate(payload);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) return;

    checkoutMutation.mutate({
      equipmentId: selectedResource.id,
      expectedReturnTime: new Date(expectedReturn).toISOString(),
      conditionNotes: checkoutNotes,
    });
  };

  const handleJoinWaitlist = () => {
    if (!selectedResource || !startTime || !endTime) {
      toast.error('Please enter the desired start and end times above first!');
      return;
    }

    joinWaitlistMutation.mutate({
      resourceId: selectedResource.id,
      desiredStartTime: new Date(startTime).toISOString(),
      desiredEndTime: new Date(endTime).toISOString(),
    });
  };

  const allAmenities = ['Projector', 'Whiteboard', 'AC', 'Wi-Fi', 'Smart Board', 'Video Conference', 'Printer'];

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Book Resources</h1>
        <p className="text-slate-500 mt-2">Search, configure, and secure campus classrooms, laboratories, and equipment.</p>
      </div>

      {/* Catalog Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Search Catalog</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Room 101, Computer Lab..."
            className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-900 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-900 text-sm"
          >
            <option value="">All Categories</option>
            <option value="Classroom">Classroom</option>
            <option value="Lab">Lab</option>
            <option value="Equipment">Equipment</option>
            <option value="Meeting_Room">Meeting Room</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Amenities</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {allAmenities.map(amenity => (
              <button
                key={amenity}
                onClick={() => toggleAmenity(amenity)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  selectedAmenities.includes(amenity)
                    ? 'bg-red-600 border-red-500 text-white shadow-md'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {amenity}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loadingResources ? (
          <div className="text-slate-400 col-span-full">Loading catalog items...</div>
        ) : resourceData.resources.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 col-span-full shadow-sm">
            No resources match the selected search filters.
          </div>
        ) : (
          resourceData.resources.map((resource: any) => (
            <div key={resource.id} className="glass-card p-6 rounded-2xl flex flex-col justify-between h-64 shadow-sm border border-slate-200 bg-white">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-800 text-lg tracking-tight truncate w-3/4">{resource.name}</h3>
                  <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-bold uppercase">
                    {resource.type}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-2">📍 {resource.location}</p>
                <p className="text-xs text-slate-400 mt-1">Capacity: {resource.capacity ?? 'N/A'} people</p>
                
                <div className="flex flex-wrap gap-1 mt-3">
                  {resource.amenities?.slice(0, 3).map((a: string) => (
                    <span key={a} className="bg-slate-50 border border-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-md font-medium">
                      {a}
                    </span>
                  ))}
                  {resource.amenities?.length > 3 && (
                    <span className="text-[10px] text-slate-400 self-center font-bold">+{resource.amenities.length - 3} more</span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedResource(resource);
                    const now = new Date();
                    now.setMinutes(0);
                    now.setSeconds(0);
                    now.setMilliseconds(0);
                    setStartTime(format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm"));
                    setEndTime(format(addHours(now, 2), "yyyy-MM-dd'T'HH:mm"));
                    setExpectedReturn(format(addHours(now, 24), "yyyy-MM-dd'T'HH:mm"));
                  }}
                  className="w-full py-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-transparent font-semibold rounded-xl text-sm transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  <span>Select Item</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Booking / Checkout Modal overlay */}
      {selectedResource && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 space-y-6 my-8">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{selectedResource.name}</h2>
                <p className="text-slate-500 text-sm mt-1">📍 {selectedResource.location} ({selectedResource.type})</p>
              </div>
              <button
                onClick={() => setSelectedResource(null)}
                className="text-slate-500 hover:text-slate-700 font-bold p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-xs"
              >
                ✕ Close
              </button>
            </div>

            {/* Availability details */}
            {availability && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Booked Slots & Maintenance</h4>
                {availability.bookedSlots.length === 0 && availability.maintenanceSlots.length === 0 ? (
                  <p className="text-slate-400 text-xs">No active blockouts found.</p>
                ) : (
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {availability.bookedSlots.map((b: any) => (
                      <div key={b.bookingId} className="text-xs text-rose-700 font-medium">
                        🚫 Booked: {format(new Date(b.startTime), 'MMM d, h:mm a')} - {format(new Date(b.endTime), 'h:mm a')}
                      </div>
                    ))}
                    {availability.maintenanceSlots.map((m: any) => (
                      <div key={m.maintenanceId} className="text-xs text-amber-700 font-medium">
                        🛠️ Maintenance: {format(new Date(m.startTime), 'MMM d, h:mm a')} - {format(new Date(m.endTime), 'h:mm a')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conditional Booking vs Checkout Form */}
            {selectedResource.type === 'Equipment' ? (
              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Expected Return Time</label>
                  <input
                    type="datetime-local"
                    value={expectedReturn}
                    onChange={(e) => setExpectedReturn(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Checkout Condition Notes</label>
                  <textarea
                    value={checkoutNotes}
                    onChange={(e) => setCheckoutNotes(e.target.value)}
                    placeholder="Good working order, minor screen scratch..."
                    className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                    rows={3}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-red-500/10"
                >
                  Checkout Equipment
                </button>
              </form>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Booking Purpose</label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Semester lecture, exam, study group..."
                    className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                    required
                  />
                </div>

                {/* Recurrence (Faculty/Admin only) */}
                {(user?.role === 'Faculty' || user?.role === 'Administrator') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recurrence Pattern</label>
                      <select
                        value={recurrence}
                        onChange={(e) => setRecurrence(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                      >
                        <option value="None">None</option>
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                      </select>
                    </div>
                    {recurrence !== 'None' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recurrence End Date</label>
                        <input
                          type="date"
                          value={recurrenceEnd}
                          onChange={(e) => setRecurrenceEnd(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:outline-none"
                          required
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-slate-200">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-red-500/10"
                  >
                    Confirm Booking Reservation
                  </button>
                  <button
                    type="button"
                    onClick={handleJoinWaitlist}
                    className="px-6 py-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                  >
                    Join Waitlist
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
