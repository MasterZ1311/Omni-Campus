import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/useAuth';
import { format, addHours } from 'date-fns';
import io from 'socket.io-client';

export default function ResourceDiscovery() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Top level tabs
  const [activeTab, setActiveTab] = useState<'resources' | 'classrooms' | 'transport'>('resources');

  // Search/Filter states for Rooms & Equipment
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedResource, setSelectedResource] = useState<any>(null);

  // QR state
  const [showQrModal, setShowQrModal] = useState(false);
  const [mockQrList, setMockQrList] = useState<any[]>([]);

  // Socket.IO real-time status update subscription
  useEffect(() => {
    const socket = io('http://localhost:5000');
    socket.emit('join_room', 'resources:all');
    
    socket.on('resource:status_change', (data: any) => {
      toast.success(`📢 Real-time update: Resource statuses refreshed!`);
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['vacant-classrooms'] });
    });
    
    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const fetchMockQrResources = async () => {
    try {
      const res = await api.get('/api/resources?type=Equipment');
      setMockQrList(res.data.resources || []);
    } catch (err) {
      toast.error('Failed to load equipment catalog for QR simulation');
    }
  };

  const handleSimulateQrScan = async (resourceId: string) => {
    try {
      // Step 1: Generate signed QR parameters from backend
      const qrRes = await api.get(`/api/qr/equipment/${resourceId}`);
      const { signature, expiresAt } = qrRes.data;

      // Extract expiresAt Unix timestamp
      const expTimestamp = Math.floor(new Date(expiresAt).getTime() / 1000);

      // Step 2: Call verification endpoint to simulate scanning and unlocking
      const verifyRes = await api.post('/api/qr/verify', {
        resourceId,
        expiresAt: expTimestamp,
        signature,
      });

      if (verifyRes.data.valid) {
        toast.success('QR Code verified successfully!');
        
        // Find resource object in catalog
        const resObj = mockQrList.find((r) => r.id === resourceId);
        if (resObj) {
          setSelectedResource(resObj);
          const now = new Date();
          now.setMinutes(0);
          now.setSeconds(0);
          now.setMilliseconds(0);
          setExpectedReturn(format(addHours(now, 24), "yyyy-MM-dd'T'HH:mm"));
          setShowQrModal(false);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'QR Verification failed');
    }
  };

  const getRoomStatusColor = (roomName: string) => {
    const room = resourceData.resources.find((r: any) => r.name === roomName);
    if (!room) return 'fill-slate-50 stroke-slate-200 hover:fill-slate-100';
    if (room.status === 'Maintenance') return 'fill-amber-50 stroke-amber-300 hover:fill-amber-100';
    if (room.isOccupiedNow) return 'fill-rose-50 stroke-rose-300 hover:fill-rose-100';
    return 'fill-emerald-50 stroke-emerald-300 hover:fill-emerald-100';
  };

  const getRoomStatusLabel = (roomName: string) => {
    const room = resourceData.resources.find((r: any) => r.name === roomName);
    if (!room) return 'OFFLINE';
    if (room.status === 'Maintenance') return 'MAINTENANCE';
    if (room.isOccupiedNow) return 'OCCUPIED';
    return 'AVAILABLE';
  };

  const getRoomStatusTextColor = (roomName: string) => {
    const room = resourceData.resources.find((r: any) => r.name === roomName);
    if (!room) return '#64748b'; // slate-500
    if (room.status === 'Maintenance') return '#d97706'; // amber-600
    if (room.isOccupiedNow) return '#e11d48'; // rose-600
    return '#059669'; // emerald-600
  };

  const handleRoomClick = (roomName: string) => {
    if (user?.role === 'Student') {
      toast.error('👁️ View only — Students cannot book rooms. Contact Faculty or staff.');
      return;
    }
    const room = resourceData.resources.find((r: any) => r.name === roomName);
    if (room) {
      setSelectedResource(room);
      const now = new Date();
      now.setMinutes(0);
      now.setSeconds(0);
      now.setMilliseconds(0);
      setStartTime(format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm"));
      setEndTime(format(addHours(now, 2), "yyyy-MM-dd'T'HH:mm"));
      setPurpose('Immediate Study / Research Session');
    } else {
      toast.error(`Room "${roomName}" not currently found in active list`);
    }
  };

  // Booking Form states
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [recurrence, setRecurrence] = useState('None');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');

  // Equipment checkout state
  const [expectedReturn, setExpectedReturn] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');

  // Transport state
  const [routeFilter, setRouteFilter] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [requestedTime, setRequestedTime] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);

  // Queries - Rooms & Equipment
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
    enabled: activeTab === 'resources',
  });

  // Queries - Vacant Classrooms
  const { data: vacantClassrooms = [], isLoading: loadingVacant } = useQuery({
    queryKey: ['vacant-classrooms'],
    queryFn: async () => {
      const res = await api.get('/api/resources/classrooms/vacant');
      return res.data;
    },
    enabled: activeTab === 'classrooms',
    refetchInterval: 30000, // Update countdowns every 30 seconds
  });

  // Queries - Transport
  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await api.get('/api/transport/vehicles');
      return res.data;
    },
    enabled: activeTab === 'transport',
  });

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const res = await api.get('/api/transport/schedules');
      return res.data;
    },
    enabled: activeTab === 'transport',
  });

  const { data: availability = null } = useQuery({
    queryKey: ['availability', selectedResource?.id],
    queryFn: async () => {
      if (!selectedResource) return null;
      const res = await api.get(`/api/resources/${selectedResource.id}/availability`);
      return res.data;
    },
    enabled: !!selectedResource && activeTab !== 'transport',
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
      queryClient.invalidateQueries({ queryKey: ['vacant-classrooms'] });
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

  const requestTransportMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/api/transport/request', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Transport request processed');
      setShowRequestModal(false);
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Transport request failed');
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

  const handleTransportRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestTransportMutation.mutate({
      pickupLocation: pickup,
      dropoffLocation: dropoff,
      requestedTime: new Date(requestedTime).toISOString(),
      passengerCount,
    });
  };

  const allAmenities = ['Projector', 'Whiteboard', 'AC', 'Wi-Fi', 'Smart Board', 'Video Conference', 'Printer'];

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Campus Services & Resources</h1>
          {user?.role === 'Student' ? (
            <p className="text-slate-500 mt-2">View available classrooms, equipment, and campus schedules.</p>
          ) : (
            <p className="text-slate-500 mt-2">Book classrooms, borrow equipment, view vacant schedules, or request staff transport.</p>
          )}
        </div>
        {user?.role !== 'Student' && (
          <button
            onClick={() => {
              fetchMockQrResources();
              setShowQrModal(true);
            }}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-red-500/10 flex items-center space-x-2"
          >
            <span>📷</span>
            <span>Scan Equipment QR</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab('resources')}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'resources' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🏢 Rooms & Equipment
        </button>
        <button
          onClick={() => setActiveTab('classrooms')}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'classrooms' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🔍 Classroom Finder
        </button>
        <button
          onClick={() => setActiveTab('transport')}
          className={`pb-4 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'transport' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🚌 Staff Transport
        </button>
      </div>

      {/* View Panels */}
      {activeTab === 'resources' && (
        <>
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

          {/* Interactive SVG Floor Map */}
          {!loadingResources && (type === '' || type === 'Classroom' || type === 'Lab') && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Interactive Floor Map Layout</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Click any room block to configure booking reservations immediately.</p>
                </div>
                <div className="flex items-center space-x-4 text-[11px] font-bold uppercase tracking-wider">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                    <span className="text-emerald-700">Available</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 bg-rose-500 rounded-full"></span>
                    <span className="text-rose-700">Occupied</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
                    <span className="text-amber-700">Maintenance</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center bg-slate-50 border border-slate-100 rounded-xl p-4 overflow-x-auto">
                <svg width="100%" height="220" viewBox="0 0 800 220" className="max-w-3xl min-w-[600px] select-none font-sans">
                  {/* Outer Wall */}
                  <rect x="5" y="5" width="790" height="210" rx="16" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 4" />

                  {/* Room 101 Block */}
                  <g className="cursor-pointer" onClick={() => handleRoomClick('Engineering Hall Room 101')}>
                    <rect
                      x="20"
                      y="20"
                      width="220"
                      height="120"
                      rx="12"
                      className={`transition-all duration-300 stroke-2 ${getRoomStatusColor('Engineering Hall Room 101')}`}
                    />
                    <text x="130" y="65" textAnchor="middle" className="font-bold text-sm fill-slate-800">Room 101</text>
                    <text x="130" y="85" textAnchor="middle" className="font-semibold text-[10px] tracking-wider fill-slate-400">ENGINEERING HALL</text>
                    <text x="130" y="110" textAnchor="middle" className="font-bold text-[9px] tracking-widest" fill={getRoomStatusTextColor('Engineering Hall Room 101')}>
                      {getRoomStatusLabel('Engineering Hall Room 101')}
                    </text>
                  </g>

                  {/* Room 205 Block */}
                  <g className="cursor-pointer" onClick={() => handleRoomClick('Science Block Room 205')}>
                    <rect
                      x="260"
                      y="20"
                      width="220"
                      height="120"
                      rx="12"
                      className={`transition-all duration-300 stroke-2 ${getRoomStatusColor('Science Block Room 205')}`}
                    />
                    <text x="370" y="65" textAnchor="middle" className="font-bold text-sm fill-slate-800">Room 205</text>
                    <text x="370" y="85" textAnchor="middle" className="font-semibold text-[10px] tracking-wider fill-slate-400">SCIENCE BLOCK</text>
                    <text x="370" y="110" textAnchor="middle" className="font-bold text-[9px] tracking-widest" fill={getRoomStatusTextColor('Science Block Room 205')}>
                      {getRoomStatusLabel('Science Block Room 205')}
                    </text>
                  </g>

                  {/* Computer Lab A Block */}
                  <g className="cursor-pointer" onClick={() => handleRoomClick('Computer Lab A')}>
                    <rect
                      x="500"
                      y="20"
                      width="280"
                      height="120"
                      rx="12"
                      className={`transition-all duration-300 stroke-2 ${getRoomStatusColor('Computer Lab A')}`}
                    />
                    <text x="640" y="65" textAnchor="middle" className="font-bold text-sm fill-slate-800">Computer Lab A</text>
                    <text x="640" y="85" textAnchor="middle" className="font-semibold text-[10px] tracking-wider fill-slate-400">IT BUILDING</text>
                    <text x="640" y="110" textAnchor="middle" className="font-bold text-[9px] tracking-widest" fill={getRoomStatusTextColor('Computer Lab A')}>
                      {getRoomStatusLabel('Computer Lab A')}
                    </text>
                  </g>

                  {/* Corridor / Hallway */}
                  <g>
                    <rect x="20" y="160" width="760" height="40" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
                    <text x="400" y="185" textAnchor="middle" className="font-semibold text-[10px] tracking-widest fill-slate-400">MAIN TRANSIT CORRIDOR</text>
                  </g>
                </svg>
              </div>
            </div>
          )}

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
                    {user?.role === 'Student' ? (
                      <div className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-500 font-semibold rounded-xl text-sm flex items-center justify-center space-x-2 cursor-default">
                        <span>👁️</span>
                        <span>View Only — Contact Faculty to Book</span>
                      </div>
                    ) : (
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
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Classroom Finder */}
      {activeTab === 'classrooms' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-slate-800">Classroom Finder & Timetable Scanner</h2>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['vacant-classrooms'] })}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-all"
            >
              🔄 Refresh Vacancies
            </button>
          </div>

          {loadingVacant ? (
            <div className="text-slate-400">Scanning real-time schedules...</div>
          ) : vacantClassrooms.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
              No classrooms registered in the system.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vacantClassrooms.map((room: any) => (
                <div key={room.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-64 glass-card">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-800 text-lg truncate w-3/4">{room.name}</h3>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                        room.isVacant 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {room.currentStatus}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">📍 {room.location}</p>
                    <p className="text-xs text-slate-400 mt-1">Capacity: {room.capacity} seats</p>
                    
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className={`text-sm font-semibold ${room.isVacant ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {room.message}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setSelectedResource(room);
                        const now = new Date();
                        now.setMinutes(0);
                        now.setSeconds(0);
                        now.setMilliseconds(0);
                        setStartTime(format(addHours(now, 1), "yyyy-MM-dd'T'HH:mm"));
                        setEndTime(format(addHours(now, 2), "yyyy-MM-dd'T'HH:mm"));
                        setPurpose('Immediate Study / Lecture Session');
                      }}
                      className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition-all duration-300 flex items-center justify-center space-x-1"
                    >
                      <span>⚡ One-Click Quick Book</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Staff Transport Hub */}
      {activeTab === 'transport' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Schedules list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-bold text-slate-800">Fixed Routes Timetables</h2>
              <input
                type="text"
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
                placeholder="Filter route stop..."
                className="px-4 py-2 text-xs rounded-lg bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-red-500/20 focus:outline-none"
              />
            </div>

            {loadingSchedules ? (
              <div className="text-slate-400">Loading timetables...</div>
            ) : (
              <div className="space-y-4">
                {schedules
                  .filter((s: any) => {
                    const stops: string[] = JSON.parse(s.route || '[]');
                    return stops.some(stop => stop.toLowerCase().includes(routeFilter.toLowerCase()));
                  })
                  .map((sched: any) => {
                    const stops: string[] = JSON.parse(sched.route || '[]');
                    return (
                      <div key={sched.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-slate-800">{sched.vehicle.name}</h3>
                          <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-100 font-semibold uppercase">
                            {sched.vehicle.type}
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center text-sm text-slate-600 font-medium">
                            <span className="mr-2">⏰</span>
                            <span>
                              {format(new Date(sched.startTime), 'h:mm a')} - {format(new Date(sched.endTime), 'h:mm a')}
                            </span>
                          </div>
                          <div className="flex items-start text-xs text-slate-500">
                            <span className="mr-2">📍</span>
                            <span>Stops: {stops.join(' ➔ ')}</span>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                          <span>Driver: {sched.vehicle.driverName || 'N/A'}</span>
                          <span>Plate: {sched.vehicle.licensePlate || 'N/A'}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* On-Demand dispatches & Roster availability */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">On-Demand Dispatch</h2>

            {user?.role === 'Student' ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500">
                ⚠️ On-demand vehicle dispatch requests are restricted to authorized Faculty and System Staff profiles.
              </div>
            ) : (
              <button
                onClick={() => {
                  setPickup('');
                  setDropoff('');
                  setRequestedTime(format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
                  setPassengerCount(1);
                  setShowRequestModal(true);
                }}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-red-500/10 flex justify-center items-center space-x-2"
              >
                <span>➕</span>
                <span>Request On-Demand Dispatch</span>
              </button>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Fleet Status & Available Seats</h3>
              {loadingVehicles ? (
                <div className="text-slate-400 text-xs">Loading fleet...</div>
              ) : (
                vehicles.map((v: any) => (
                  <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{v.name}</h4>
                      <p className="text-xs text-slate-400">Plate: {v.licensePlate ?? 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                        v.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {v.status.replace(/_/g, ' ')}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1">{v.remainingSeats} / {v.capacity} seats free</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Booking / Checkout Modal overlay */}
      {selectedResource && activeTab !== 'transport' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 space-y-6 my-8 animate-in fade-in-50 duration-200">
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
                  {user?.role !== 'Student' && (
                    <button
                      type="button"
                      onClick={handleJoinWaitlist}
                      className="px-6 py-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                    >
                      Join Waitlist
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* On-Demand Transport Dispatch Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Request On-Demand Dispatch</h2>
                <p className="text-xs text-slate-400 mt-1">Submit pickup/dropoff requirements for campus staff fleet.</p>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-slate-500 hover:text-slate-700 font-bold p-2 bg-slate-100 rounded-full text-xs"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleTransportRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pickup Location</label>
                <input
                  type="text"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Main Gate, Library..."
                  className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-red-500/20 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Dropoff Location</label>
                <input
                  type="text"
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder="Engineering Building, Dean Office..."
                  className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-red-500/20 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Requested Time</label>
                  <input
                    type="datetime-local"
                    value={requestedTime}
                    onChange={(e) => setRequestedTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-red-500/20 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Passenger Count</label>
                  <input
                    type="number"
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(parseInt(e.target.value, 10))}
                    min={1}
                    className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-red-500/20 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={requestTransportMutation.isPending}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-red-500/10"
              >
                {requestTransportMutation.isPending ? 'Requesting...' : 'Request Dispatch'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Equipment QR Scanner Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 space-y-6 animate-in fade-in-50 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Scan Equipment QR Code</h2>
                <p className="text-xs text-slate-400 mt-1">Select a mocked active RFID/QR physical label to simulate checking out.</p>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-500 hover:text-slate-700 font-bold p-2 bg-slate-100 rounded-full text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Equipment QR Label</label>
              {mockQrList.length === 0 ? (
                <p className="text-xs text-slate-400">Loading equipment list...</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {mockQrList.map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => handleSimulateQrScan(item.id)}
                      className="w-full text-left p-3.5 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-all duration-200 group flex justify-between items-center"
                    >
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs group-hover:text-red-700">{item.name}</h4>
                        <span className="text-[10px] text-slate-400">📍 {item.location}</span>
                      </div>
                      <span className="text-xs font-semibold text-red-600 bg-red-50 group-hover:bg-red-600 group-hover:text-white px-2 py-0.5 rounded transition-all">
                        Scan QR ➔
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
