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
            OC
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-800 tracking-wider">OMNI-CAMPUS</h1>
            <p className="text-xs text-slate-505 font-medium">Resource Management</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <Link to="/" className="flex items-center space-x-3 px-4 py-2.5 rounded-lg hover:bg-slate-100 transition-all text-slate-600 hover:text-slate-900 font-medium">
            <span>📊</span>
            <span>Dashboard</span>
          </Link>
          <Link to="/discovery" className="flex items-center space-x-3 px-4 py-2.5 rounded-lg hover:bg-slate-100 transition-all text-slate-600 hover:text-slate-900 font-medium">
            <span>🔍</span>
            <span>Book Resources</span>
          </Link>
          {user.role === 'Administrator' && (
            <Link to="/admin" className="flex items-center space-x-3 px-4 py-2.5 rounded-lg hover:bg-slate-100 transition-all text-slate-600 hover:text-slate-900 font-medium">
              <span>⚙️</span>
              <span>Admin Panel</span>
            </Link>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-200 flex flex-col space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center font-bold text-red-700">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{user.name}</p>
              <span className="text-[10px] uppercase font-bold text-red-600 tracking-widest">{user.role.replace(/_/g, ' ')}</span>
            </div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center justify-center space-x-2 w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-medium rounded-lg transition-all duration-200 text-sm">
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
        <Route path="/admin" element={<ProtectedLayout><AdminPanel /></ProtectedLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
