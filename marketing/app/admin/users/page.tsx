'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

interface UserProfile {
  user_id: string;
  email?: string;
  tier: string;
  is_onboarded: boolean;
  created_at: string;
  last_active_at?: string;
  current_streak: number;
}

export default function UserManagement() {
  const [searchEmail, setSearchEmail] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const searchUsers = async () => {
    if (!searchEmail.trim()) {
      alert('Please enter an email to search');
      return;
    }

    setLoading(true);
    try {
      // Get all users from auth (need service role for this in production)
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Auth error:', authError);
        // Fallback: try to find by profile
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('*')
          .limit(50);

        if (profiles) {
          // Get emails for each profile
          const usersWithEmails = await Promise.all(
            profiles.map(async (profile) => {
              try {
                const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
                return {
                  ...profile,
                  email: authUser?.user?.email,
                };
              } catch {
                return { ...profile, email: 'Unknown' };
              }
            })
          );

          const filtered = usersWithEmails.filter(u => 
            u.email?.toLowerCase().includes(searchEmail.toLowerCase())
          );
          setUsers(filtered);
        }
        return;
      }

      // Filter by email
      const matchingAuthUsers = authData.users.filter(u =>
        u.email?.toLowerCase().includes(searchEmail.toLowerCase())
      );

      // Get profiles for matching users
      const userIds = matchingAuthUsers.map(u => u.id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('*')
        .in('user_id', userIds);

      // Merge auth data with profiles
      const merged = matchingAuthUsers.map(authUser => {
        const profile = profiles?.find(p => p.user_id === authUser.id);
        return {
          user_id: authUser.id,
          email: authUser.email,
          tier: profile?.tier || 'starter',
          is_onboarded: profile?.is_onboarded || false,
          created_at: profile?.created_at || authUser.created_at,
          last_active_at: profile?.last_active_at,
          current_streak: profile?.current_streak || 0,
        };
      });

      setUsers(merged);

      if (merged.length === 0) {
        alert('No users found');
      }
    } catch (error: any) {
      console.error('Error searching users:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const changeTier = async (userId: string, newTier: string, email: string) => {
    if (!confirm(`Change ${email} to ${newTier}?`)) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ tier: newTier })
        .eq('user_id', userId);

      if (error) throw error;

      alert('Tier updated successfully!');
      searchUsers(); // Refresh
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const resetOnboarding = async (userId: string, email: string) => {
    if (!confirm(`Reset onboarding for ${email}?`)) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_onboarded: false })
        .eq('user_id', userId);

      if (error) throw error;

      alert('Onboarding reset!');
      searchUsers();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`DELETE ${email}?\n\nThis will delete:\n• Profile\n• All flashcards\n• Auth account\n\nCANNOT BE UNDONE!`)) {
      return;
    }

    try {
      // Delete flashcards
      await supabase.from('flashcards').delete().eq('user_id', userId);
      
      // Delete profile
      await supabase.from('user_profiles').delete().eq('user_id', userId);
      
      // Delete auth user
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      alert('User deleted successfully');
      setUsers(users.filter(u => u.user_id !== userId));
      setExpandedUser(null);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div>
      <h2 className="section-title">👥 User Management</h2>

      {/* Search */}
      <div className="search-container">
        <input
          type="email"
          className="search-input"
          placeholder="Search by email..."
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
        />
        <button 
          onClick={searchUsers} 
          disabled={loading}
          className="search-button"
        >
          {loading ? '...' : '🔍 Search'}
        </button>
      </div>

      {/* Results */}
      {users.length > 0 && (
        <div>
          <p style={{ color: '#94A3B8', marginBottom: '20px', fontSize: '14px' }}>
            {users.length} user{users.length !== 1 ? 's' : ''} found
          </p>

          {users.map((user) => (
            <div key={user.user_id} className="user-card">
              <div 
                className="user-header"
                onClick={() => setExpandedUser(
                  expandedUser === user.user_id ? null : user.user_id
                )}
              >
                <div>
                  <div className="user-email">{user.email}</div>
                  <div style={{ marginTop: '8px' }}>
                    <span className={`tier-badge tier-${user.tier}`}>
                      {user.tier}
                    </span>
                    <span style={{ color: '#64748B', fontSize: '12px' }}>
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span style={{ color: '#94A3B8' }}>
                  {expandedUser === user.user_id ? '▲' : '▼'}
                </span>
              </div>

              {expandedUser === user.user_id && (
                <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* Tier Buttons */}
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '12px' }}>
                      Change Tier:
                    </p>
                    <div className="flex gap-12">
                      {['starter', 'pro', 'ultimate'].map((tier) => (
                        <button
                          key={tier}
                          onClick={() => changeTier(user.user_id, tier, user.email || '')}
                          className="action-button"
                          style={{
                            opacity: user.tier === tier ? 1 : 0.5,
                            borderColor: user.tier === tier ? '#00F5FF' : 'rgba(255,255,255,0.1)',
                          }}
                        >
                          {tier.charAt(0).toUpperCase() + tier.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Other Actions */}
                  <div className="flex gap-12" style={{ marginBottom: '16px' }}>
                    <button
                      onClick={() => resetOnboarding(user.user_id, user.email || '')}
                      className="action-button"
                    >
                      🔄 Reset Onboarding
                    </button>
                    <button
                      onClick={() => deleteUser(user.user_id, user.email || '')}
                      className="danger-button"
                    >
                      🗑️ Delete User
                    </button>
                  </div>

                  {/* User Stats */}
                  <div style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '8px', 
                    padding: '12px',
                    fontSize: '13px',
                    color: '#94A3B8',
                  }}>
                    <div>🔥 Streak: {user.current_streak} days</div>
                    <div>✅ Onboarded: {user.is_onboarded ? 'Yes' : 'No'}</div>
                    <div>
                      📅 Last active: {user.last_active_at 
                        ? new Date(user.last_active_at).toLocaleDateString() 
                        : 'Never'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {users.length === 0 && !loading && (
        <div style={{ 
          textAlign: 'center', 
          color: '#64748B', 
          padding: '60px 20px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '16px',
          border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
          <p>Search for users by email to get started</p>
        </div>
      )}
    </div>
  );
}

