'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isAdminEmail } from '../../lib/supabase';
import './admin.css';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginPage, setIsLoginPage] = useState(false);

  useEffect(() => {
    // Check if we're on the login page
    const pathname = window.location.pathname;
    setIsLoginPage(pathname.includes('/login'));
    
    if (!pathname.includes('/login')) {
      checkAdminAccess();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !isAdminEmail(user.email)) {
        router.push('/admin/login');
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin access:', error);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  // If on login page, just render children without layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Checking access...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="admin-container">
      <nav className="admin-nav">
        <h1 className="admin-title">⚡ FLASH Admin</h1>
        <div className="admin-nav-links">
          <a href="/admin" className="nav-link">Dashboard</a>
          <a href="/admin/users" className="nav-link">Users</a>
          <a href="/admin/test-tools" className="nav-link">Test Tools</a>
          <a href="/" className="nav-link-back">← Back to Site</a>
          <button onClick={handleLogout} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </nav>
      <main className="admin-content">
        {children}
      </main>
    </div>
  );
}

