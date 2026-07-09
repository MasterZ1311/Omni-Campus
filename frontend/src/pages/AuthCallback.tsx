import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../store/useAuth';
import toast from 'react-hot-toast';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refresh');

    if (token && refreshToken) {
      try {
        // Decode JWT payload without external library
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          window
            .atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );

        const decoded = JSON.parse(jsonPayload);
        
        login(
          {
            id: decoded.userId,
            email: decoded.email,
            name: decoded.email.split('@')[0], // Mock name from email
            role: decoded.role,
          },
          token,
          refreshToken
        );

        toast.success('Successfully authenticated via OIDC!');
        navigate('/');
      } catch (error) {
        console.error('Failed to decode OIDC token:', error);
        toast.error('OIDC SSO authentication failed.');
        navigate('/login');
      }
    } else {
      toast.error('Invalid token payload received.');
      navigate('/login');
    }
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
      <div className="text-violet-500 font-medium text-lg animate-pulse">
        Completing OIDC Authentication...
      </div>
    </div>
  );
}
