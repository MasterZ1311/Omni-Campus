import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/useAuth';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login/local', { email, password });
      login(res.data.user, res.data.accessToken, res.data.refreshToken);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMockSSO = (role: string) => {
    window.location.href = `http://localhost:5000/auth/login/oidc?role=${role}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <div className="inline-block bg-red-50 text-red-600 p-3 rounded-2xl mb-3 font-bold text-2xl">
            🏫
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome to Omni-Campus</h2>
          <p className="text-sm text-slate-500 mt-2">Smart Campus Resource Reservation</p>
        </div>

        {/* Local Login Fallback */}
        <form onSubmit={handleLocalSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@campus.edu"
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-900 text-sm transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-slate-900 text-sm transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-all duration-300 shadow-lg shadow-red-500/10 text-sm flex items-center justify-center space-x-2"
          >
            {loading ? <span>Logging in...</span> : <span>Login with Local Admin</span>}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-wider">or authenticate with SSO</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Mock OIDC SSO selectors */}
        <div className="space-y-2">
          <button
            onClick={() => handleMockSSO('Student')}
            className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-300 text-sm flex items-center justify-center space-x-2"
          >
            <span>🎓</span>
            <span>Sign in as Mock Student</span>
          </button>

          <button
            onClick={() => handleMockSSO('Faculty')}
            className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-300 text-sm flex items-center justify-center space-x-2"
          >
            <span>👨‍🏫</span>
            <span>Sign in as Mock Faculty</span>
          </button>

          <button
            onClick={() => handleMockSSO('Facility_Manager')}
            className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-xl transition-all duration-300 text-sm flex items-center justify-center space-x-2"
          >
            <span>🛠️</span>
            <span>Sign in as Mock Facility Manager</span>
          </button>
        </div>
      </div>
    </div>
  );
}
