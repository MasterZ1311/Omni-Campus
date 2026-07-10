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


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 text-xs text-slate-800">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-5">
        <div className="text-center space-y-1">
          <div className="inline-flex bg-red-50 text-red-600 p-2 rounded mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          </div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Welcome to Sathyabama</h2>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Institute of Science and Technology, Chennai</p>
        </div>

        {/* Local Login Fallback */}
        <form onSubmit={handleLocalSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@campus.edu"
              className="w-full px-3 py-2 rounded bg-white border border-slate-300 focus:outline-none focus:border-red-500 text-slate-900 text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded bg-white border border-slate-300 focus:outline-none focus:border-red-500 text-slate-900 text-xs font-semibold"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-xs transition-all shadow-sm flex items-center justify-center space-x-1.5"
          >
            {loading ? <span>Logging in...</span> : <span>Login to Dashboard</span>}
          </button>
        </form>


      </div>
    </div>
  );
}
