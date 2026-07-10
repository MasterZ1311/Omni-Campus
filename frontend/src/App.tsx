import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from './store/useAuth';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import io from 'socket.io-client';

import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import ResourceDiscovery from './pages/ResourceDiscovery';
import AdminPanel from './pages/AdminPanel';
import ConciergeChat from './components/ConciergeChat';
import toast from 'react-hot-toast';

/** Renders children only if the logged-in user has one of the allowed roles.
 *  Otherwise redirects to '/' and shows a permission error toast. */
function RoleGuard({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user } = useAuth();
  const isDenied = !user || !allowedRoles.includes(user.role);

  useEffect(() => {
    if (isDenied) {
      toast.error('⛔ Access denied: You do not have permission to view this page.');
    }
  }, [isDenied]);

  if (isDenied) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    const socket = io('http://localhost:5000');
    socket.emit('join_room', `user:${user.id}`);
    
    socket.on('notification', (data) => {
      const toast = require('react-hot-toast').default;
      toast.success(`🔔 ${data.type.replace(/_/g, ' ').toUpperCase()}: ${JSON.stringify(data.payload)}`, {
        duration: 8000,
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user.id]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="bg-red-600 p-2 rounded-xl text-white font-bold shadow-md shadow-red-500/10">
            SIST
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800 tracking-wider">SATHYABAMA</h1>
            <p className="text-[10px] text-slate-500 font-semibold">Institute of Science and Technology, Chennai</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <Link to="/" className="flex items-center space-x-2.5 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-all text-slate-600 hover:text-slate-900 text-xs font-semibold">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            <span>Dashboard</span>
          </Link>
          <Link to="/discovery" className="flex items-center space-x-2.5 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-all text-slate-600 hover:text-slate-900 text-xs font-semibold">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span>Book Resources</span>
          </Link>
          {(user.role === 'Administrator' || user.role === 'Facility_Manager') && (
            <Link to="/admin" className="flex items-center space-x-2.5 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-all text-slate-600 hover:text-slate-900 text-xs font-semibold">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span>Admin Panel</span>
            </Link>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-200 flex flex-col space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center font-bold text-red-700 text-xs">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800 leading-tight">{user.name}</p>
              <span className="text-[9px] uppercase font-bold text-red-600 tracking-wider leading-none">{user.role.replace(/_/g, ' ')}</span>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center justify-center space-x-1.5 w-full py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold rounded-md transition-all duration-200 text-xs">
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl mx-auto w-full relative">
        {children}
        <ConciergeChat />
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#ffffff',
          color: '#0f172a',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        }
      }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
        <Route path="/discovery" element={<ProtectedLayout><ResourceDiscovery /></ProtectedLayout>} />
        <Route
          path="/admin"
          element={
            <ProtectedLayout>
              <RoleGuard allowedRoles={['Administrator', 'Facility_Manager']}>
                <AdminPanel />
              </RoleGuard>
            </ProtectedLayout>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
