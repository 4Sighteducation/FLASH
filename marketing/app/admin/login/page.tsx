'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isAdminEmail } from '../../../lib/supabase';

const AdminLogin = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isAdminEmail(email)) {
      setError('Not an admin email');
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (!data.user || !isAdminEmail(data.user.email)) {
        setError('Access denied');
        await supabase.auth.signOut();
        return;
      }

      router.push('/admin');
    } catch (error: any) {
      setError(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccess('');

    if (!isAdminEmail(resetEmail)) {
      setError('Not an admin email');
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/admin/login`,
      });

      if (resetError) throw resetError;

      setResetSuccess(`Password reset email sent to ${resetEmail}! Check your inbox.`);
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSuccess('');
      }, 3000);
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const createAdminAccount = async () => {
    const adminEmail = 'admin@vespa.academy';
    const tempPassword = 'AdminTemp123!';

    if (!confirm(`Create admin account?\n\nEmail: ${adminEmail}\nTemporary Password: ${tempPassword}\n\nYou can change the password after logging in.`)) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: adminEmail,
        password: tempPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/admin/login`,
        }
      });

      if (signupError) throw signupError;

      alert(`✅ Admin account created!\n\nEmail: ${adminEmail}\nPassword: ${tempPassword}\n\nCheck your email to confirm, then login!`);
      
      // Pre-fill the login form
      setEmail(adminEmail);
      setPassword(tempPassword);
    } catch (error: any) {
      setError(error.message || 'Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0f1e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: `
        linear-gradient(rgba(0, 245, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 245, 255, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: '50px 50px',
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        padding: '48px',
        maxWidth: '400px',
        width: '100%',
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#00F5FF',
          textAlign: 'center',
          marginBottom: '8px',
          letterSpacing: '2px',
        }}>
          FLASH ADMIN
        </h1>
        <p style={{
          textAlign: 'center',
          color: '#94A3B8',
          fontSize: '14px',
          marginBottom: '32px',
        }}>
          Admin access only
        </p>

        {!showForgotPassword ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: '#94A3B8', 
              fontSize: '14px', 
              marginBottom: '8px',
              fontWeight: 600,
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@vespa.academy"
              required
              style={{ 
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                color: '#FFFFFF',
                fontSize: '16px',
              }}
            />
            </div>

            <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              color: '#94A3B8', 
              fontSize: '14px', 
              marginBottom: '8px',
              fontWeight: 600,
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ 
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                color: '#FFFFFF',
                fontSize: '16px',
              }}
            />
            </div>

            {error && (
            <div style={{
              background: 'rgba(255, 0, 110, 0.1)',
              border: '1px solid rgba(255, 0, 110, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              color: '#FF006E',
              fontSize: '14px',
            }}>
              {error}
              </div>
            )}

            <button 
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: '#00F5FF',
              color: '#0a0f1e',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              boxShadow: loading ? 'none' : '0 0 20px rgba(0, 245, 255, 0.4)',
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
            </button>

            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              style={{
                width: '100%',
                background: 'transparent',
                color: '#00F5FF',
                border: 'none',
                padding: '12px',
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '12px',
              }}
            >
              Forgot Password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                color: '#94A3B8', 
                fontSize: '14px', 
                marginBottom: '8px',
                fontWeight: 600,
              }}>
                Admin Email
              </label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="admin@vespa.academy"
                required
                style={{ 
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  color: '#FFFFFF',
                  fontSize: '16px',
                }}
              />
            </div>

            {resetSuccess && (
              <div style={{
                background: 'rgba(0, 245, 255, 0.1)',
                border: '1px solid rgba(0, 245, 255, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px',
                color: '#00F5FF',
                fontSize: '14px',
              }}>
                {resetSuccess}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: '#00F5FF',
                color: '#0a0f1e',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                boxShadow: loading ? 'none' : '0 0 20px rgba(0, 245, 255, 0.4)',
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Email'}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setError('');
                setResetSuccess('');
              }}
              style={{
                width: '100%',
                background: 'transparent',
                color: '#64748B',
                border: 'none',
                padding: '12px',
                fontSize: '14px',
                cursor: 'pointer',
                marginTop: '12px',
              }}
            >
              ← Back to Login
            </button>
          </form>
        )}

        <p style={{
          textAlign: 'center',
          color: '#64748B',
          fontSize: '12px',
          marginTop: '24px',
        }}>
          Only authorized admin emails can access this panel
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;

