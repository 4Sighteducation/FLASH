'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

function normalizeCode(code: string): string {
  return (code || '').replace(/[^0-9A-Z]/gi, '').toUpperCase();
}

function formatCode(code: string): string {
  const c = normalizeCode(code);
  return c.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

export default function ClaimPage() {
  const sp = useSearchParams();
  const raw = sp.get('code') || '';
  const code = useMemo(() => normalizeCode(raw), [raw]);
  const pretty = useMemo(() => formatCode(raw), [raw]);

  const deepLink = useMemo(() => {
    if (!code) return '';
    return `com.foursighteducation.flash://redeem?code=${encodeURIComponent(code)}`;
  }, [code]);

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ fontSize: 34, marginBottom: 8 }}>Redeem FL4SH Pro</h1>
      <p style={{ opacity: 0.85, marginBottom: 18 }}>
        Open the FL4SH app, sign in, then redeem this code:
      </p>

      <div style={{
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 16,
        padding: 18,
        marginBottom: 18,
        fontSize: 18,
        letterSpacing: 1,
      }}>
        <strong>{pretty || 'Missing code'}</strong>
      </div>

      {code ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a
            href={deepLink}
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'linear-gradient(90deg, #00e5ff, #ff4fd8)',
              color: '#111',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Open the app
          </a>
          <a
            href="https://apps.apple.com/"
            style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', textDecoration: 'none', color: 'white' }}
          >
            Get on iPhone
          </a>
          <a
            href="https://play.google.com/store"
            style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', textDecoration: 'none', color: 'white' }}
          >
            Get on Android
          </a>
        </div>
      ) : null}

      <p style={{ fontSize: 13, opacity: 0.75, marginTop: 18 }}>
        If the “Open the app” button doesn’t work, install FL4SH first, then paste the code inside the app.
      </p>
    </main>
  );
}
