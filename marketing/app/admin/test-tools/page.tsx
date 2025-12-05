'use client';

import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

export default function TestTools() {
  const [testDomain, setTestDomain] = useState('@vespa.academy');
  const [loading, setLoading] = useState(false);
  const [lastCreatedEmail, setLastCreatedEmail] = useState('');
  const [lastCreatedPassword, setLastCreatedPassword] = useState('');

  const createTestAccount = async () => {
    const randomId = Math.floor(Math.random() * 10000);
    const email = `test${randomId}@vespa.academy`;
    const password = 'Test123!';

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setLastCreatedEmail(email);
      setLastCreatedPassword(password);
      
      alert(`✅ Test account created!\n\nEmail: ${email}\nPassword: ${password}\n\nCredentials shown below.`);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTestUsers = async () => {
    if (!confirm(`⚠️ DELETE ALL users with email ending in "${testDomain}"?\n\nThis CANNOT be undone!`)) {
      return;
    }

    setLoading(true);
    try {
      // Get all users
      const { data: authData } = await supabase.auth.admin.listUsers();
      
      if (!authData) {
        alert('Could not fetch users');
        return;
      }

      // Filter by domain
      const testUsers = authData.users.filter(u => 
        u.email?.toLowerCase().endsWith(testDomain.toLowerCase())
      );

      if (testUsers.length === 0) {
        alert('No test users found with that domain');
        return;
      }

      if (!confirm(`Found ${testUsers.length} users to delete. Continue?`)) {
        return;
      }

      let deleted = 0;
      for (const user of testUsers) {
        try {
          // Delete flashcards
          await supabase.from('flashcards').delete().eq('user_id', user.id);
          // Delete profile
          await supabase.from('user_profiles').delete().eq('user_id', user.id);
          // Delete auth
          await supabase.auth.admin.deleteUser(user.id);
          deleted++;
        } catch (err) {
          console.error('Error deleting user:', err);
        }
      }

      alert(`✅ Deleted ${deleted} test users`);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetAllOnboarding = async () => {
    if (!confirm('⚠️ Reset onboarding for ALL users?\n\nThey will see the wizard again!')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_onboarded: false })
        .neq('user_id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      alert('✅ All users onboarding reset');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div>
      <h2 className="section-title">🧪 Test Tools</h2>

      {/* Warning */}
      <div style={{
        background: 'rgba(255, 0, 110, 0.1)',
        border: '1px solid rgba(255, 0, 110, 0.3)',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '32px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '24px' }}>⚠️</span>
        <p style={{ color: '#FF006E', fontWeight: 600, margin: 0 }}>
          These tools modify production data. Use carefully!
        </p>
      </div>

      {/* Create Test Account */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ color: '#E2E8F0', fontSize: '20px', marginBottom: '12px' }}>
          🧪 Create Test Account
        </h3>
        <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '16px' }}>
          Creates a random test account with @vespa.academy email
        </p>
        <button 
          onClick={createTestAccount} 
          disabled={loading}
          className="action-button"
        >
          ➕ Create Test User
        </button>

        {lastCreatedEmail && (
          <div style={{ 
            marginTop: '16px', 
            background: 'rgba(0, 245, 255, 0.05)',
            padding: '16px',
            borderRadius: '8px',
          }}>
            <p style={{ color: '#00F5FF', fontWeight: 'bold', marginBottom: '8px' }}>
              Last Created Account:
            </p>
            <div style={{ color: '#E2E8F0', fontSize: '14px' }}>
              <div style={{ marginBottom: '4px' }}>
                Email: <strong>{lastCreatedEmail}</strong>
                <button 
                  onClick={() => copyToClipboard(lastCreatedEmail)}
                  style={{ 
                    marginLeft: '8px',
                    background: 'none',
                    border: 'none',
                    color: '#00F5FF',
                    cursor: 'pointer',
                  }}
                >
                  📋 Copy
                </button>
              </div>
              <div>
                Password: <strong>{lastCreatedPassword}</strong>
                <button 
                  onClick={() => copyToClipboard(lastCreatedPassword)}
                  style={{ 
                    marginLeft: '8px',
                    background: 'none',
                    border: 'none',
                    color: '#00F5FF',
                    cursor: 'pointer',
                  }}
                >
                  📋 Copy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Test Users */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ color: '#E2E8F0', fontSize: '20px', marginBottom: '12px' }}>
          🗑️ Delete Test Users
        </h3>
        <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '16px' }}>
          Delete all users with emails ending in:
        </p>
        <input
          type="text"
          className="search-input"
          value={testDomain}
          onChange={(e) => setTestDomain(e.target.value)}
          placeholder="@vespa.academy"
          style={{ marginBottom: '16px' }}
        />
        <button 
          onClick={deleteTestUsers} 
          disabled={loading}
          className="danger-button"
        >
          🗑️ Delete Test Users
        </button>
      </div>

      {/* Reset Onboarding */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
      }}>
        <h3 style={{ color: '#E2E8F0', fontSize: '20px', marginBottom: '12px' }}>
          🔄 Reset All Onboarding
        </h3>
        <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '16px' }}>
          Forces ALL users back through the onboarding wizard
        </p>
        <button 
          onClick={resetAllOnboarding} 
          disabled={loading}
          className="action-button"
          style={{ background: 'rgba(245, 158, 11, 0.2)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#F59E0B' }}
        >
          🔄 Reset All Onboarding
        </button>
      </div>

      {/* Quick Links */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
      }}>
        <h3 style={{ color: '#E2E8F0', fontSize: '20px', marginBottom: '12px' }}>
          💻 Database Access
        </h3>
        <a 
          href="https://qkapwhyxcpgzahuemucg.supabase.co/project/default/editor" 
          target="_blank" 
          rel="noopener noreferrer"
          className="action-button"
          style={{ display: 'inline-block', textDecoration: 'none' }}
        >
          Open Supabase SQL Editor →
        </a>
      </div>
    </div>
  );
}

