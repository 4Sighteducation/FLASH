import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Payload = {
  message: string;
  category?: string | null;
  urgency?: string | null;
  isPriority?: boolean | null;

  contextTitle?: string | null;
  contextHint?: string | null;
  sourceRouteName?: string | null;
  sourceRouteParams?: unknown;

  subjectId?: string | null;
  topicId?: string | null;

  screenshot?: {
    bucket: string;
    path: string;
    mime?: string | null;
    sizeBytes?: number | null;
  } | null;

  app?: {
    platform?: string | null;
    osVersion?: string | null;
    deviceModel?: string | null;
    version?: string | null;
    build?: string | null;
  } | null;

  metadata?: Record<string, unknown> | null;
};

function safeJson(x: unknown) {
  try {
    return JSON.stringify(x ?? null, null, 2);
  } catch {
    return '"<unserializable>"';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sendGridKey = Deno.env.get('SENDGRID_API_KEY') || '';
    const supportEmail = Deno.env.get('SUPPORT_EMAIL') || 'support@fl4shcards.com';
    const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL') || supportEmail;

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Authorization bearer token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const payload = (await req.json()) as Payload;
    const message = (payload.message || '').trim();
    if (message.length < 3) {
      return new Response(JSON.stringify({ success: false, error: 'Message is too short.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate the caller's JWT (but use service role for DB + storage operations).
    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user?.id) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid session.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const userId = authData.user.id;
    const userEmail = authData.user.email ?? null;

    // If screenshot is present, generate a signed URL for support (private bucket).
    let screenshotSignedUrl: string | null = null;
    let screenshotAttachment:
      | null
      | {
          content: string;
          filename: string;
          type: string;
          disposition: 'attachment';
        } = null;
    if (payload.screenshot?.bucket && payload.screenshot?.path) {
      const { data: signed, error: signedErr } = await supabase.storage
        .from(payload.screenshot.bucket)
        .createSignedUrl(payload.screenshot.path, 60 * 60 * 24 * 7); // 7 days
      if (signedErr) {
        console.warn('[submit-feedback] createSignedUrl failed (non-fatal):', signedErr);
      } else {
        screenshotSignedUrl = (signed as any)?.signedUrl ?? null;
      }

      // Best-effort attachment (avoids email-client link issues and SendGrid click tracking).
      // Keep small to avoid bloating emails. (3MB cap here; SendGrid max is higher, but we keep it conservative.)
      try {
        const { data: fileData, error: dlErr } = await supabase.storage
          .from(payload.screenshot.bucket)
          .download(payload.screenshot.path);
        if (dlErr) {
          console.warn('[submit-feedback] screenshot download failed (non-fatal):', dlErr);
        } else if (fileData) {
          const ab = await fileData.arrayBuffer();
          const size = ab.byteLength;
          if (size > 0 && size <= 3_000_000) {
            const bytes = new Uint8Array(ab);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const b64 = btoa(binary);
            const filename = payload.screenshot.path.split('/').slice(-1)[0] || 'screenshot.jpg';
            screenshotAttachment = {
              content: b64,
              filename,
              type: payload.screenshot.mime || 'image/jpeg',
              disposition: 'attachment',
            };
          } else {
            console.warn('[submit-feedback] screenshot too large (skipping attachment):', size);
          }
        }
      } catch (e) {
        console.warn('[submit-feedback] screenshot attach step failed (non-fatal):', e);
      }
    }

    const record = {
      user_id: userId,
      user_email: userEmail,
      tier: (payload.metadata as any)?.tier ?? null,

      source_route_name: payload.sourceRouteName ?? null,
      source_route_params: (payload.sourceRouteParams ?? null) as any,
      context_title: payload.contextTitle ?? null,
      context_hint: payload.contextHint ?? null,
      category: payload.category ?? null,
      urgency: payload.urgency ?? null,
      is_priority: !!payload.isPriority,
      subject_id: payload.subjectId ?? null,
      topic_id: payload.topicId ?? null,
      message,

      screenshot_bucket: payload.screenshot?.bucket ?? null,
      screenshot_path: payload.screenshot?.path ?? null,
      screenshot_mime: payload.screenshot?.mime ?? null,
      screenshot_size_bytes: payload.screenshot?.sizeBytes ?? null,

      platform: payload.app?.platform ?? null,
      os_version: payload.app?.osVersion ?? null,
      device_model: payload.app?.deviceModel ?? null,
      app_version: payload.app?.version ?? null,
      app_build: payload.app?.build ?? null,

      metadata: (payload.metadata ?? {}) as any,
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('user_feedback')
      .insert(record as any)
      .select('id, view_token')
      .single();

    if (insertErr) {
      console.error('[submit-feedback] insert failed:', insertErr);
      return new Response(JSON.stringify({ success: false, error: insertErr.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const feedbackId = inserted?.id as string | undefined;
    const viewToken = (inserted as any)?.view_token as string | undefined;

    // Use a short redirect link (prevents email clients from breaking long signed URLs).
    const screenshotShortUrl =
      screenshotSignedUrl && feedbackId && viewToken
        ? `${supabaseUrl}/functions/v1/feedback-screenshot?id=${encodeURIComponent(feedbackId)}&t=${encodeURIComponent(viewToken)}&download=1`
        : null;

    // Email support (best-effort; DB record is the source of truth).
    if (sendGridKey) {
      const priorityTag = payload.isPriority ? '[PRIORITY] ' : '';
      const urgencyPrefix = payload.urgency ? `[${String(payload.urgency).toUpperCase()}] ` : '';
      const subject = `${priorityTag}${urgencyPrefix}${payload.category ? `${payload.category.toUpperCase()} ` : ''}Feedback — ${userEmail || userId}`;

      const lines = [
        `Feedback ID: ${feedbackId}`,
        `User: ${userEmail || userId}`,
        `Tier: ${(payload.metadata as any)?.tier ?? 'unknown'}`,
        `Priority: ${payload.isPriority ? 'YES' : 'no'}`,
        payload.urgency ? `Urgency: ${payload.urgency}` : null,
        payload.category ? `Category: ${payload.category}` : null,
        payload.contextTitle ? `Context: ${payload.contextTitle}` : null,
        payload.sourceRouteName ? `Route: ${payload.sourceRouteName}` : null,
        payload.subjectId ? `Subject ID: ${payload.subjectId}` : null,
        payload.topicId ? `Topic ID: ${payload.topicId}` : null,
        payload.screenshot?.bucket ? `Screenshot bucket: ${payload.screenshot.bucket}` : null,
        payload.screenshot?.path ? `Screenshot path: ${payload.screenshot.path}` : null,
        screenshotShortUrl ? `Screenshot link: ${screenshotShortUrl}` : screenshotSignedUrl ? `Screenshot link (signed, 7 days): ${screenshotSignedUrl}` : null,
      ].filter((x): x is string => typeof x === 'string' && x.length > 0);

      const plainText = [
        '--- FEEDBACK SUMMARY ---',
        ...lines,
        '',
        '--- MESSAGE ---',
        message,
        '',
        '--- APP / DEVICE ---',
        safeJson(payload.app),
        '',
        '--- ROUTE PARAMS ---',
        safeJson(payload.sourceRouteParams),
        '',
        '--- METADATA ---',
        safeJson(payload.metadata),
      ].join('\n');

      const esc = (s: string) =>
        String(s)
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');

      const urgency = String(payload.urgency || '').toLowerCase();
      const urgencyStyle =
        urgency === 'critical'
          ? { bg: '#7f1d1d', fg: '#fee2e2', br: '#ef4444' }
          : urgency === 'high'
            ? { bg: '#7c2d12', fg: '#ffedd5', br: '#fb923c' }
            : urgency === 'medium'
              ? { bg: '#713f12', fg: '#fef3c7', br: '#f59e0b' }
              : urgency === 'low'
                ? { bg: '#064e3b', fg: '#d1fae5', br: '#10b981' }
                : { bg: '#111827', fg: '#e5e7eb', br: '#374151' };

      const badge = (text: string, style: { bg: string; fg: string; br: string }) =>
        `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${style.bg};color:${style.fg};border:1px solid ${style.br};font-weight:900;font-size:12px;letter-spacing:0.2px;">${esc(
          text
        )}</span>`;

      const priorityBadge = payload.isPriority ? badge('PRIORITY (PRO)', { bg: '#7f1d1d', fg: '#fee2e2', br: '#ef4444' }) : badge('STANDARD', { bg: '#111827', fg: '#e5e7eb', br: '#374151' });
      const urgencyBadge = payload.urgency ? badge(String(payload.urgency).toUpperCase(), urgencyStyle) : badge('UNSPECIFIED', { bg: '#111827', fg: '#e5e7eb', br: '#374151' });

      const priorityBanner = payload.isPriority
        ? `<div style="padding: 10px 12px; border-radius: 12px; background: #7f1d1d; color: #fee2e2; border: 1px solid #ef4444; font-weight: 900; margin: 0 0 14px;">
            🚨 PRIORITY SUPPORT (PRO)
          </div>`
        : '';

      const html = `
<div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.45;">
  ${priorityBanner}
  <h2 style="margin: 0 0 12px; ${payload.isPriority ? 'color:#ef4444;' : ''}">${esc(priorityTag)}${esc(payload.category ? `${payload.category.toUpperCase()} ` : '')}Feedback</h2>

  <div style="display:flex;gap:10px;flex-wrap:wrap;margin: 0 0 10px;">
    ${priorityBadge}
    ${urgencyBadge}
  </div>

  <h3 style="margin: 16px 0 8px;">Summary</h3>
  <table style="border-collapse: collapse; width: 100%;">
    ${lines
      .map((l) => {
        const idx = l.indexOf(':');
        const k = idx >= 0 ? l.slice(0, idx) : 'Info';
        const v = idx >= 0 ? l.slice(idx + 1).trim() : l;
        return `<tr>
          <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: 700; width: 180px; background: #f9fafb;">${esc(k)}</td>
          <td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${esc(v)}</td>
        </tr>`;
      })
      .join('')}
  </table>

  <h3 style="margin: 16px 0 8px;">Message</h3>
  <pre style="white-space: pre-wrap; background: #0b1220; color: #e5e7eb; padding: 12px; border-radius: 10px; border: 1px solid #111827;">${esc(message)}</pre>

  ${
    screenshotShortUrl
      ? `<p><strong>Screenshot:</strong> <a href="${esc(screenshotShortUrl)}">Open screenshot</a></p>`
      : screenshotSignedUrl
        ? `<p><strong>Screenshot:</strong> <a href="${esc(screenshotSignedUrl)}">Open screenshot</a></p>`
        : `<p><strong>Screenshot:</strong> none</p>`
  }

  ${
    screenshotAttachment
      ? `<div style="margin-top: 10px; padding: 10px 12px; border-radius: 12px; background: #f9fafb; border: 1px solid #e5e7eb;">
           <strong>Screenshot attached:</strong> Yes (also shown inline below if your email client supports it)
           <div style="margin-top: 10px;">
             <img src="cid:screenshot" alt="screenshot" style="max-width: 100%; border-radius: 10px; border: 1px solid #e5e7eb;" />
           </div>
         </div>`
      : ''
  }

  <h3 style="margin: 16px 0 8px;">App / Device</h3>
  <pre style="white-space: pre-wrap; background: #f9fafb; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb;">${esc(
    safeJson(payload.app)
  )}</pre>

  <h3 style="margin: 16px 0 8px;">Route params</h3>
  <pre style="white-space: pre-wrap; background: #f9fafb; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb;">${esc(
    safeJson(payload.sourceRouteParams)
  )}</pre>

  <h3 style="margin: 16px 0 8px;">Metadata</h3>
  <pre style="white-space: pre-wrap; background: #f9fafb; padding: 12px; border-radius: 10px; border: 1px solid #e5e7eb;">${esc(
    safeJson(payload.metadata)
  )}</pre>
</div>
      `.trim();

      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendGridKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: supportEmail }] }],
          from: { email: fromEmail },
          subject,
          headers: payload.isPriority
            ? {
                // Make it stand out in more clients
                Importance: 'high',
                'X-Priority': '1 (Highest)',
                Priority: 'urgent',
              }
            : undefined,
          // Prevent SendGrid from rewriting/tracking the signed URL (this commonly breaks in some clients).
          tracking_settings: {
            click_tracking: { enable: false, enable_text: false },
            open_tracking: { enable: true },
          },
          content: [
            { type: 'text/plain', value: plainText },
            { type: 'text/html', value: html },
          ],
          ...(screenshotAttachment
            ? {
                attachments: [
                  {
                    ...screenshotAttachment,
                    // Try to render inline in HTML (still downloadable as attachment in most clients)
                    disposition: 'inline',
                    content_id: 'screenshot',
                  },
                ],
              }
            : {}),
        }),
      });

      if (!sgRes.ok) {
        const text = await sgRes.text();
        console.warn('[submit-feedback] SendGrid send failed (non-fatal):', sgRes.status, text);
      }
    } else {
      console.warn('[submit-feedback] SENDGRID_API_KEY not set; skipping email (DB record was created).');
    }

    return new Response(JSON.stringify({ success: true, id: inserted?.id, screenshotSignedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    console.error('[submit-feedback] Error:', e);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});


