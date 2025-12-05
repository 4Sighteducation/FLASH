'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  totalUsers: number;
  todaySignups: number;
  activeUsers: number;
  starterUsers: number;
  proUsers: number;
  ultimateUsers: number;
  totalCards: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get total users
      const { count: totalUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Get today's signups
      const { count: todaySignups } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Get active users (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { count: activeUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_active_at', sevenDaysAgo.toISOString());

      // Get tier counts
      const { count: starterUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tier', 'starter');

      const { count: proUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tier', 'pro');

      const { count: ultimateUsers } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tier', 'ultimate');

      // Get total cards
      const { count: totalCards } = await supabase
        .from('flashcards')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: totalUsers || 0,
        todaySignups: todaySignups || 0,
        activeUsers: activeUsers || 0,
        starterUsers: starterUsers || 0,
        proUsers: proUsers || 0,
        ultimateUsers: ultimateUsers || 0,
        totalCards: totalCards || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="admin-loading"><div className="spinner"></div><p>Loading stats...</p></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 className="section-title">📊 Dashboard Overview</h2>
        <button onClick={fetchStats} className="action-button">
          🔄 Refresh
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card stat-card-cyan">
          <div className="stat-number">{stats?.totalUsers || 0}</div>
          <div className="stat-label">Total Users</div>
        </div>

        <div className="stat-card stat-card-pink">
          <div className="stat-number">{stats?.todaySignups || 0}</div>
          <div className="stat-label">Signups Today</div>
        </div>

        <div className="stat-card stat-card-cyan">
          <div className="stat-number">{stats?.activeUsers || 0}</div>
          <div className="stat-label">Active (7d)</div>
        </div>

        <div className="stat-card stat-card-pink">
          <div className="stat-number">{stats?.totalCards || 0}</div>
          <div className="stat-label">Total Cards</div>
        </div>
      </div>

      <h3 className="section-title" style={{ marginTop: '48px' }}>💎 User Tiers</h3>
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-number">{stats?.starterUsers || 0}</div>
          <div className="stat-label">Starter (Free)</div>
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#64748B' }}>
            {stats?.totalUsers ? Math.round((stats.starterUsers / stats.totalUsers) * 100) : 0}%
          </div>
        </div>

        <div className="stat-card stat-card-cyan">
          <div className="stat-number">{stats?.proUsers || 0}</div>
          <div className="stat-label">Pro</div>
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#64748B' }}>
            {stats?.totalUsers ? Math.round((stats.proUsers / stats.totalUsers) * 100) : 0}%
          </div>
        </div>

        <div className="stat-card stat-card-pink">
          <div className="stat-number">{stats?.ultimateUsers || 0}</div>
          <div className="stat-label">Ultimate</div>
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#64748B' }}>
            {stats?.totalUsers ? Math.round((stats.ultimateUsers / stats.totalUsers) * 100) : 0}%
          </div>
        </div>
      </div>

      <h3 className="section-title" style={{ marginTop: '48px' }}>⚡ Quick Actions</h3>
      <div style={{ display: 'flex', gap: '12px' }}>
        <a href="/admin/users" className="action-button">
          👥 Manage Users
        </a>
        <a href="/admin/test-tools" className="action-button">
          🧪 Test Tools
        </a>
        <a 
          href="https://qkapwhyxcpgzahuemucg.supabase.co/project/default/editor" 
          target="_blank" 
          rel="noopener noreferrer"
          className="action-button"
        >
          💻 Supabase Dashboard →
        </a>
      </div>
    </div>
  );
}

