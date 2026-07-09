import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../store/useAuth';
import { format, addHours } from 'date-fns';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

export default function ResourceDiscovery() {
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Top level tabs
  const [activeTab, setActiveTab] = useState<'resources' | 'classrooms' | 'transport' | 'map'>('resources');

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
      toast.success('Real-time update: Resource statuses refreshed');
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
      const qrRes = await api.get(`/api/qr/equipment/${resourceId}`);
      const { signature, expiresAt } = qrRes.data;
      const expTimestamp = Math.floor(new Date(expiresAt).getTime() / 1000);

      const verifyRes = await api.post('/api/qr/verify', {
        resourceId,
        expiresAt: expTimestamp,
        signature,
      });

      if (verifyRes.data.valid) {
        toast.success('QR Code verified successfully');
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
    if (!room) return '#64748b'; 
    if (room.status === 'Maintenance') return '#d97706'; 
    if (room.isOccupiedNow) return '#e11d48'; 
    return '#059669'; 
  };

  const handleRoomClick = (roomName: string) => {
    if (user?.role === 'Student') {
      toast.error('View only: Students cannot book rooms directly. Contact Faculty.');
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

  const handleBuildingClick = (buildingName: string) => {
    setSearch(buildingName);
    setActiveTab('resources');
    toast.success(`Navigating to ${buildingName} resources`);
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
      const res = await api.get(`/api/resources?type=${type}&search=${search}&amenities=${amenitiesParam}`);
      return res.data;
    },
  });

  const { data: vacantClassrooms = [], isLoading: loadingVacant } = useQuery({
    queryKey: ['vacant-classrooms'],
    queryFn: async () => {
      const res = await api.get('/api/resources/classrooms/vacant');
      return res.data;
    },
    enabled: activeTab === 'classrooms',
  });

  const { data: availability, isLoading: loadingAvailability } = useQuery({
    queryKey: ['resource-availability', selectedResource?.id],
    queryFn: async () => {
      const res = await api.get(`/api/resources/${selectedResource.id}/availability`);
      return res.data;
    },
    enabled: !!selectedResource,
  });

  // Queries - Transport
  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['transport-vehicles'],
    queryFn: async () => {
      const res = await api.get('/api/transport/vehicles');
      return res.data;
    },
    enabled: activeTab === 'transport' && user?.role !== 'Student',
  });

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['transport-schedules'],
    queryFn: async () => {
      const res = await api.get('/api/transport/schedules');
      return res.data;
    },
    enabled: activeTab === 'transport',
  });

  // Mutations
  const createBookingMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/api/bookings', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Resource booked successfully');
      setSelectedResource(null);
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create booking');
    },
  });

  const createRecurringBookingMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/api/bookings/recurring', payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(`Recurring series created: ${data.created.length} bookings confirmed`);
      setSelectedResource(null);
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to create recurring series');
    },
  });

  const checkoutEquipmentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/api/equipment/checkout', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Equipment checkout approved');
      setSelectedResource(null);
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to checkout equipment');
    },
  });

  const joinWaitlistMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/api/waitlist', payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(`Joined waitlist at position #${data.position}`);
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
    onSuccess: (data: any) => {
      toast.success(data.message || 'Transport request processed');
      setShowRequestModal(false);
      queryClient.invalidateQueries({ queryKey: ['transport-vehicles'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Transport request failed');
    },
  });

  // Submit handlers
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime || !purpose) return;

    if (recurrence !== 'None') {
      createRecurringBookingMutation.mutate({
        resourceId: selectedResource.id,
        startTime,
        endTime,
        purpose,
        recurrencePattern: recurrence,
        recurrenceEndDate: recurrenceEnd || undefined,
      });
    } else {
      createBookingMutation.mutate({
        resourceId: selectedResource.id,
        startTime,
        endTime,
        purpose,
      });
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expectedReturn) return;

    checkoutEquipmentMutation.mutate({
      equipmentId: selectedResource.id,
      expectedReturnTime: expectedReturn,
      conditionNotes: checkoutNotes,
    });
  };

  const handleJoinWaitlist = () => {
    if (!startTime || !endTime) {
      toast.error('Select target times before joining waitlist');
      return;
    }
    joinWaitlistMutation.mutate({
      resourceId: selectedResource.id,
      desiredStartTime: startTime,
      desiredEndTime: endTime,
    });
  };

  const handleTransportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup || !dropoff || !requestedTime) return;

    requestTransportMutation.mutate({
      pickupLocation: pickup,
      dropoffLocation: dropoff,
      requestedTime,
      passengerCount,
    });
  };

  const allAmenities = ['Projector', 'Whiteboard', 'Webcam', 'Audio system', 'AC', 'Lab equipment'];

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  return (
    <div className="space-y-5 text-slate-800 text-xs">
      {/* Top Bar with Logout Option */}
      <header className="flex justify-between items-center pb-2.5 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resource Catalog</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-600">Discover</span>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">Campus Services & Resources</h1>
          {user?.role === 'Student' ? (
            <p className="text-slate-500 mt-0.5 text-xs">View available classrooms, equipment, and campus timetables.</p>
          ) : (
            <p className="text-slate-500 mt-0.5 text-xs">Book classrooms, borrow equipment, view vacant schedules, or request staff transport.</p>
          )}
        </div>
        {user?.role !== 'Student' && (
          <button
            onClick={() => {
              fetchMockQrResources();
              setShowQrModal(true);
            }}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs transition-all shadow-sm flex items-center space-x-1.5"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-16v3m9 8a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span>Scan Equipment QR</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveTab('resources')}
          className={`pb-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === 'resources' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Rooms & Equipment
        </button>
        <button
          onClick={() => setActiveTab('classrooms')}
          className={`pb-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === 'classrooms' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Classroom Finder
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`pb-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
            activeTab === 'map' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Campus Map
        </button>
        {user?.role !== 'Student' && (
          <button
            onClick={() => setActiveTab('transport')}
            className={`pb-2 text-xs font-bold transition-all border-b-2 uppercase tracking-wider ${
              activeTab === 'transport' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}
          >
            Staff Transport
          </button>
        )}
      </div>

      {/* View Panels */}
      {activeTab === 'resources' && (
        <>
          {/* Catalog Filters */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-sm">
            <div>
              <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Search Catalog</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Room 101, Computer Lab..."
                className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 focus:outline-none focus:border-red-500 text-slate-900 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Category Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 focus:outline-none focus:border-red-500 text-slate-900 text-xs font-medium"
              >
                <option value="">All Categories</option>
                <option value="Classroom">Classroom</option>
                <option value="Lab">Lab</option>
                <option value="Equipment">Equipment</option>
                <option value="Meeting_Room">Meeting Room</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Amenities</label>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {allAmenities.map(amenity => (
                  <button
                    key={amenity}
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-2 py-1 rounded text-[10px] font-semibold transition-all border ${
                      selectedAmenities.includes(amenity)
                        ? 'bg-red-600 border-red-500 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
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
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm mb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Campus Layout Blocks</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Click a room to start configured details booking options.</p>
                </div>
                <div className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-wider">
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span>
                    <span className="text-emerald-700">Available</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span>
                    <span className="text-rose-700">Occupied</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span>
                    <span className="text-amber-700">Maintenance</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center bg-slate-50 border border-slate-100 rounded-lg p-3 overflow-x-auto">
                <svg width="100%" height="160" viewBox="0 0 800 220" className="max-w-2xl min-w-[500px] select-none font-sans">
                  <rect x="5" y="5" width="790" height="210" rx="6" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
                  <g className="cursor-pointer" onClick={() => handleRoomClick('Engineering Hall Room 101')}>
                    <rect x="20" y="20" width="220" height="120" rx="6" className={`transition-all duration-300 stroke-2 ${getRoomStatusColor('Engineering Hall Room 101')}`} />
                    <text x="130" y="65" textAnchor="middle" className="font-bold text-xs fill-slate-800">Room 101</text>
                    <text x="130" y="85" textAnchor="middle" className="font-semibold text-[9px] tracking-wider fill-slate-400">ENGINEERING HALL</text>
                    <text x="130" y="110" textAnchor="middle" className="font-bold text-[8px] tracking-widest" fill={getRoomStatusTextColor('Engineering Hall Room 101')}>{getRoomStatusLabel('Engineering Hall Room 101')}</text>
                  </g>
                  <g className="cursor-pointer" onClick={() => handleRoomClick('Science Block Room 205')}>
                    <rect x="260" y="20" width="220" height="120" rx="6" className={`transition-all duration-300 stroke-2 ${getRoomStatusColor('Science Block Room 205')}`} />
                    <text x="370" y="65" textAnchor="middle" className="font-bold text-xs fill-slate-800">Room 205</text>
                    <text x="370" y="85" textAnchor="middle" className="font-semibold text-[9px] tracking-wider fill-slate-400">SCIENCE BLOCK</text>
                    <text x="370" y="110" textAnchor="middle" className="font-bold text-[8px] tracking-widest" fill={getRoomStatusTextColor('Science Block Room 205')}>{getRoomStatusLabel('Science Block Room 205')}</text>
                  </g>
                  <g className="cursor-pointer" onClick={() => handleRoomClick('Computer Lab A')}>
                    <rect x="500" y="20" width="280" height="120" rx="6" className={`transition-all duration-300 stroke-2 ${getRoomStatusColor('Computer Lab A')}`} />
                    <text x="640" y="65" textAnchor="middle" className="font-bold text-xs fill-slate-800">Computer Lab A</text>
                    <text x="640" y="85" textAnchor="middle" className="font-semibold text-[9px] tracking-wider fill-slate-400">IT BUILDING</text>
                    <text x="640" y="110" textAnchor="middle" className="font-bold text-[8px] tracking-widest" fill={getRoomStatusTextColor('Computer Lab A')}>{getRoomStatusLabel('Computer Lab A')}</text>
                  </g>
                  <g>
                    <rect x="20" y="160" width="760" height="40" rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
                    <text x="400" y="185" textAnchor="middle" className="font-semibold text-[9px] tracking-widest fill-slate-450 uppercase">Central Access Transit Corridor</text>
                  </g>
                </svg>
              </div>
            </div>
          )}

          {/* Grid List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingResources ? (
              <div className="text-slate-400 col-span-full">Loading catalog items...</div>
            ) : resourceData.resources.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-500 col-span-full shadow-sm">
                No resources match the selected search filters.
              </div>
            ) : (
              resourceData.resources.map((resource: any) => (
                <div key={resource.id} className="p-4 rounded-lg flex flex-col justify-between h-56 shadow-sm border border-slate-200 bg-white">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-800 text-sm truncate w-3/4">{resource.name}</h3>
                      <span className="bg-slate-50 border border-slate-200 text-slate-500 text-[10px] px-2 py-0.5 rounded font-semibold uppercase">
                        {resource.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Location: {resource.location}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Capacity: {resource.capacity ?? 'N/A'} people</p>
                    
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {resource.amenities?.slice(0, 3).map((a: string) => (
                        <span key={a} className="bg-slate-50 border border-slate-200 text-slate-600 text-[9px] px-1.5 py-0.5 rounded font-medium">
                          {a}
                        </span>
                      ))}
                      {resource.amenities?.length > 3 && (
                        <span className="text-[9px] text-slate-400 self-center font-bold">+{resource.amenities.length - 3} more</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {user?.role === 'Student' ? (
                      <div className="w-full py-1.5 bg-slate-50 border border-slate-200 text-slate-400 font-semibold rounded text-[11px] flex items-center justify-center space-x-1 cursor-default font-mono">
                        <span>VIEW ONLY</span>
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
                        className="w-full py-1.5 bg-red-50 hover:bg-red-600 text-red-655 hover:text-white border border-red-100 hover:border-transparent font-semibold rounded text-xs transition-all flex items-center justify-center space-x-1"
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
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800">Classroom Finder & Timetable Scanner</h2>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['vacant-classrooms'] })}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10px] font-bold rounded transition-all uppercase tracking-wider"
            >
              Refresh Vacancies
            </button>
          </div>

          {loadingVacant ? (
            <div className="text-slate-400 py-1">Scanning real-time schedules...</div>
          ) : vacantClassrooms.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-500 shadow-sm">
              No classrooms registered in the system.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vacantClassrooms.map((room: any) => (
                <div key={room.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between h-52">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-800 text-sm truncate w-3/4">{room.name}</h3>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        room.isVacant 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {room.currentStatus}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-505 mt-1">Location: {room.location}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Capacity: {room.capacity} seats</p>
                    
                    <div className="mt-3 p-2 bg-slate-50 rounded border border-slate-100">
                      <p className={`text-[11px] font-semibold leading-relaxed ${room.isVacant ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {room.message}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {user?.role === 'Student' ? (
                      <div className="w-full py-1.5 bg-slate-50 border border-slate-200 text-slate-400 font-semibold rounded text-[11px] flex items-center justify-center space-x-1 cursor-default font-mono">
                        <span>VIEW ONLY</span>
                      </div>
                    ) : (
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
                        className="w-full py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs transition-all duration-300 flex items-center justify-center space-x-1"
                      >
                        <span>⚡ One-Click Quick Book</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campus Interactive Map Tab */}
      {activeTab === 'map' && (
        <div className="space-y-4 text-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Campus Interactive Navigation Map</h2>
            <p className="text-slate-400 font-medium">Click any major building block on the map to filter and locate resource rooms in that facility.</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row items-center gap-5 shadow-sm">
            {/* SVG Interactive Map */}
            <div className="w-full md:w-2/3 bg-slate-50 border border-slate-100 rounded-lg p-3 flex justify-center">
              <svg width="100%" height="240" viewBox="0 0 600 320" className="max-w-xl select-none font-sans">
                {/* Main Campus Grounds */}
                <rect x="5" y="5" width="590" height="310" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                <path d="M 50 160 Q 300 20 550 160 T 550 280" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
                
                {/* Building: Engineering Hall */}
                <g className="cursor-pointer group" onClick={() => handleBuildingClick('Engineering Hall')}>
                  <rect x="30" y="30" width="130" height="70" rx="6" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" className="transition-all hover:fill-blue-100" />
                  <text x="95" y="65" textAnchor="middle" className="font-bold text-xs fill-blue-900">Engineering Hall</text>
                  <text x="95" y="82" textAnchor="middle" className="text-[8px] fill-blue-500 font-semibold uppercase tracking-wider">Rooms 101-110</text>
                </g>

                {/* Building: Science Block */}
                <g className="cursor-pointer group" onClick={() => handleBuildingClick('Science Block')}>
                  <rect x="420" y="30" width="140" height="70" rx="6" fill="#f0fdf4" stroke="#22c55e" strokeWidth="2" className="transition-all hover:fill-green-100" />
                  <text x="490" y="65" textAnchor="middle" className="font-bold text-xs fill-green-900">Science Block</text>
                  <text x="490" y="82" textAnchor="middle" className="text-[8px] fill-green-500 font-semibold uppercase tracking-wider">Rooms 201-215</text>
                </g>

                {/* Building: IT Building */}
                <g className="cursor-pointer group" onClick={() => handleBuildingClick('IT Building')}>
                  <rect x="220" y="110" width="160" height="90" rx="6" fill="#faf5ff" stroke="#a855f7" strokeWidth="2" className="transition-all hover:fill-purple-100" />
                  <text x="300" y="155" textAnchor="middle" className="font-bold text-xs fill-purple-900">IT Building & Labs</text>
                  <text x="300" y="172" textAnchor="middle" className="text-[8px] fill-purple-500 font-semibold uppercase tracking-wider">Computer Labs A-D</text>
                </g>

                {/* Building: Main Administration */}
                <g className="cursor-pointer group" onClick={() => handleBuildingClick('Administration')}>
                  <rect x="30" y="210" width="150" height="70" rx="6" fill="#fcf8f2" stroke="#f97316" strokeWidth="2" className="transition-all hover:fill-orange-100" />
                  <text x="105" y="245" textAnchor="middle" className="font-bold text-xs fill-orange-900">Administration</text>
                  <text x="105" y="262" textAnchor="middle" className="text-[8px] fill-orange-500 font-semibold uppercase tracking-wider">Offices & Conf</text>
                </g>

                {/* Building: Sports Complex */}
                <g className="cursor-pointer group" onClick={() => handleBuildingClick('Sports')}>
                  <rect x="420" y="210" width="140" height="70" rx="6" fill="#fdf2f8" stroke="#ec4899" strokeWidth="2" className="transition-all hover:fill-pink-100" />
                  <text x="490" y="245" textAnchor="middle" className="font-bold text-xs fill-pink-900">Sports Complex</text>
                  <text x="490" y="262" textAnchor="middle" className="text-[8px] fill-pink-500 font-semibold uppercase tracking-wider">Gym & Courts</text>
                </g>

                {/* Main transit paths indicator */}
                <text x="300" y="280" textAnchor="middle" className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Central Transit Avenue</text>
              </svg>
            </div>

            {/* Information panel */}
            <div className="w-full md:w-1/3 space-y-3">
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <h3 className="font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[9px]">Building Directory</h3>
                <ul className="space-y-1 text-[10px] text-slate-600 font-semibold">
                  <li>Engineering Hall: classrooms & lecture venues</li>
                  <li>Science Block: lab spaces & multimedia rooms</li>
                  <li>IT Building: central hardware labs & systems</li>
                  <li>Administration: meeting spaces & core offices</li>
                  <li>Sports Complex: training courts & equipment</li>
                </ul>
              </div>
              <div className="text-[10px] text-slate-500 bg-red-50/20 border border-red-100 rounded-lg p-2.5 leading-relaxed font-semibold">
                Interactive: Click any building block on the map to instantly search and isolate listed venues in that sector.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Staff Transport Hub */}
      {activeTab === 'transport' && user?.role !== 'Student' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedules list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-sm font-bold text-slate-800">Fixed Routes Timetables</h2>
              <input
                type="text"
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
                placeholder="Filter route stop..."
                className="px-3 py-1.5 text-xs rounded bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-red-500"
              />
            </div>

            {loadingSchedules ? (
              <div className="text-slate-400 py-1">Loading timetables...</div>
            ) : (
              <div className="space-y-2">
                {schedules
                  .filter((s: any) => {
                    const stops: string[] = JSON.parse(s.route || '[]');
                    return stops.some(stop => stop.toLowerCase().includes(routeFilter.toLowerCase()));
                  })
                  .map((sched: any) => {
                    const stops: string[] = JSON.parse(sched.route || '[]');
                    return (
                      <div key={sched.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 text-xs">{sched.vehicle.name}</h3>
                          <span className="text-[9px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100 font-bold uppercase">
                            {sched.vehicle.type}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1.5">
                          <div className="flex items-center text-xs text-slate-600 font-medium">
                            <span className="mr-1.5">Clock:</span>
                            <span>
                              {format(new Date(sched.startTime), 'h:mm a')} - {format(new Date(sched.endTime), 'h:mm a')}
                            </span>
                          </div>
                          <div className="flex items-start text-[10px] text-slate-500 font-medium">
                            <span className="mr-1.5">Route stops:</span>
                            <span className="flex flex-wrap gap-1">
                              {stops.map((stop, idx) => (
                                <span key={idx} className="bg-slate-50 border border-slate-200 text-slate-505 px-1.5 py-0.5 rounded">
                                  {stop}
                                </span>
                              ))}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* On-Demand dispatches & Roster availability */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800">On-Demand Dispatch</h2>

            <button
              onClick={() => {
                setPickup('');
                setDropoff('');
                setRequestedTime(format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
                setPassengerCount(1);
                setShowRequestModal(true);
              }}
              className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs transition-all shadow-sm flex justify-center items-center space-x-1.5"
            >
              <span>+</span>
              <span>Request On-Demand Dispatch</span>
            </button>

            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fleet Status & Available Seats</h3>
              {loadingVehicles ? (
                <div className="text-slate-400 text-xs">Loading fleet...</div>
              ) : (
                vehicles.map((v: any) => (
                  <div key={v.id} className="border border-slate-200 bg-white p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{v.name}</h4>
                      <p className="text-[10px] text-slate-450 mt-0.5">Plate: {v.licensePlate} | Driver: {v.driverName}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        v.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-505'
                      }`}>
                        {v.status}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">{v.remainingSeats} seats free</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Resource Detail Modal (Drawer) */}
      {selectedResource && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex justify-end z-50">
          <div className="w-full max-w-sm bg-white border-l border-slate-200 h-full p-5 flex flex-col justify-between shadow-2xl overflow-y-auto space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm leading-tight">{selectedResource.name}</h3>
                  <p className="text-[10px] text-slate-450 mt-0.5 font-bold uppercase">{selectedResource.type} | {selectedResource.location}</p>
                </div>
                <button
                  onClick={() => setSelectedResource(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-all"
                >
                  Close
                </button>
              </div>

              {/* Availability details */}
              {availability && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Booked Slots & Maintenance</h4>
                  {availability.bookedSlots.length === 0 && availability.maintenanceSlots.length === 0 ? (
                    <p className="text-slate-400 text-[10px]">No active blockouts found.</p>
                  ) : (
                    <div className="max-h-24 overflow-y-auto space-y-1 font-mono text-[9px]">
                      {availability.bookedSlots.map((b: any) => (
                        <div key={b.bookingId} className="text-rose-700 font-semibold">
                          🚫 Booked: {format(new Date(b.startTime), 'MMM d, h:mm a')} - {format(new Date(b.endTime), 'h:mm a')}
                        </div>
                      ))}
                      {availability.maintenanceSlots.map((m: any) => (
                        <div key={m.maintenanceId} className="text-amber-700 font-semibold">
                          🛠️ Maint: {format(new Date(m.startTime), 'MMM d, h:mm a')} - {format(new Date(m.endTime), 'h:mm a')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Conditional Booking vs Checkout Form */}
              {user?.role === 'Student' ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center space-y-2.5 mt-3">
                  <span className="text-lg">👁️</span>
                  <h4 className="font-bold text-slate-800 text-xs">Student View-Only Mode</h4>
                  <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                    Students are not authorized to check out equipment or book rooms directly. Please coordinate with an authorized Faculty member or Facility Administrator.
                  </p>
                </div>
              ) : selectedResource.type === 'Equipment' ? (
                <form onSubmit={handleCheckoutSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Expected Return Time</label>
                    <input
                      type="datetime-local"
                      value={expectedReturn}
                      onChange={(e) => setExpectedReturn(e.target.value)}
                      className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Checkout Condition Notes</label>
                    <textarea
                      value={checkoutNotes}
                      onChange={(e) => setCheckoutNotes(e.target.value)}
                      placeholder="Good working order, minor screen scratch..."
                      className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none"
                      rows={3}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs transition-all shadow-sm"
                  >
                    Checkout Equipment
                  </button>
                </form>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Start Date & Time</label>
                      <input
                        type="datetime-local"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">End Date & Time</label>
                      <input
                        type="datetime-local"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Booking Purpose</label>
                    <input
                      type="text"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="Semester lecture, exam, study group..."
                      className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none"
                      required
                    />
                  </div>

                  {/* Recurrence (Faculty/Admin only) */}
                  {(user?.role === 'Faculty' || user?.role === 'Administrator') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Recurrence</label>
                        <select
                          value={recurrence}
                          onChange={(e) => setRecurrence(e.target.value)}
                          className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none"
                        >
                          <option value="None">None</option>
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                        </select>
                      </div>
                      {recurrence !== 'None' && (
                        <div>
                          <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">End Date</label>
                          <input
                            type="date"
                            value={recurrenceEnd}
                            onChange={(e) => setRecurrenceEnd(e.target.value)}
                            className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none"
                            required
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-3 border-t border-slate-200">
                    <button
                      type="submit"
                      className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs transition-all shadow-sm"
                    >
                      Confirm Booking
                    </button>
                    {user?.role !== 'Student' && (
                      <button
                        type="button"
                        onClick={handleJoinWaitlist}
                        className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 font-semibold rounded text-xs transition-all"
                      >
                        Join Waitlist
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* On-Demand Transport Dispatch Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex justify-center items-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Request On-Demand Dispatch</h2>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 transition-all font-semibold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleTransportSubmit} className="space-y-3">
              <div>
                <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Pickup Location</label>
                <input
                  type="text"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="e.g. Engineering Hall Lobbies"
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Dropoff Location</label>
                <input
                  type="text"
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder="e.g. Sports Complex Entry"
                  className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Requested Time</label>
                  <input
                    type="datetime-local"
                    value={requestedTime}
                    onChange={(e) => setRequestedTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Passengers</label>
                  <input
                    type="number"
                    value={passengerCount}
                    onChange={(e) => setPassengerCount(parseInt(e.target.value, 10))}
                    min={1}
                    max={10}
                    className="w-full px-3 py-1.5 rounded bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs transition-all shadow-sm"
              >
                {requestTransportMutation.isPending ? 'Requesting...' : 'Request Dispatch'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Equipment QR Scanner Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] flex justify-center items-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Scan Equipment QR Code</h2>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 transition-all font-semibold"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Select Equipment QR Label</label>
              {mockQrList.length === 0 ? (
                <p className="text-slate-450 text-[10px]">No loanable equipments found in the catalog.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {mockQrList.map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => handleSimulateQrScan(item.id)}
                      className="p-2.5 rounded bg-slate-50 border border-slate-200 text-left hover:bg-slate-100 transition-all font-medium text-slate-700"
                    >
                      <div className="font-bold text-[11px] text-slate-800">{item.name}</div>
                      <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Location: {item.location}</div>
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
