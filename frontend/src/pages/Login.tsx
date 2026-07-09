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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 text-xs text-slate-800">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-5">
        <div className="text-center space-y-1">
          <div className="inline-flex bg-red-50 text-red-600 p-2 rounded mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          </div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Welcome to Omni-Campus</h2>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Smart Campus Reservation Console</p>
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
            {loading ? <span>Logging in...</span> : <span>Login with Local Admin</span>}
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">or authenticate with SSO</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        {/* Mock OIDC SSO selectors */}
        <div className="space-y-1.5">
          <button
            onClick={() => handleMockSSO('Student')}
            className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded text-xs transition-all flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222m4 9.722v-7.5l-4-2.222"/></svg>
            <span>Sign in as Mock Student</span>
          </button>

          <button
            onClick={() => handleMockSSO('Faculty')}
            className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded text-xs transition-all flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z"/></svg>
            <span>Sign in as Mock Faculty</span>
          </button>

          <button
            onClick={() => handleMockSSO('Facility_Manager')}
            className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded text-xs transition-all flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>Sign in as Mock Facility Manager</span>
          </button>
        </div>
      </div>
    </div>
  );
}
