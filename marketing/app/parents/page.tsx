'use client';

import { useMemo, useState } from 'react';

export default function ParentsPage() {
  const [childEmail, setChildEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => childEmail.trim().length > 3 && childEmail.includes('@'), [childEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/parent-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childEmail }),
      });
      const json = await res.json();
      if (!res.ok || !json?.url) {
        setError(json?.error || 'Could not start checkout.');
        return;
      }
      window.location.href = json.url;
    } catch (err: any) {
      setError(err?.message || 'Could not start checkout.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ fontSize: 36, marginBottom: 8 }}>Unlock FL4SH Pro for your child</h1>
      <p style={{ opacity: 0.85, marginBottom: 28 }}>
        Pay once and your child gets full Pro access for a year.
      </p>

      <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 20 }}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Parent Revision Pass</h2>
        <p style={{ margin: '6px 0 18px 0', opacity: 0.85 }}>£39.99 / year (auto-renewing)</p>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Child’s email address</span>
            <input
              value={childEmail}
              onChange={(e) => setChildEmail(e.target.value)}
              placeholder="child@example.com"
              type="email"
              required
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(0,0,0,0.25)',
                color: 'white',
                fontSize: 16,
              }}
            />
          </label>

          {error ? (
            <div style={{ color: '#ffb4b4', fontSize: 14 }}>{error}</div>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              border: 'none',
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              background: 'linear-gradient(90deg, #00e5ff, #ff4fd8)',
              color: '#111',
            }}
          >
            {loading ? 'Redirecting…' : 'Continue to secure checkout'}
          </button>
        </form>

        <p style={{ fontSize: 13, opacity: 0.75, marginTop: 14 }}>
          After payment, we’ll email your child a redeem link and code. They’ll sign in (including Sign in with Apple)
          and unlock Pro.
        </p>
      </div>
    </main>
  );
}
