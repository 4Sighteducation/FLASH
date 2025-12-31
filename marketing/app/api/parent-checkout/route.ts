import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const childEmail = String(body?.childEmail || '').trim();
    if (!childEmail) {
      return NextResponse.json({ ok: false, error: 'Missing childEmail' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return NextResponse.json({ ok: false, error: 'NEXT_PUBLIC_SUPABASE_URL not configured' }, { status: 500 });
    }

    const fnUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/parent-checkout`;

    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childEmail }),
      // Don’t cache checkout creation
      cache: 'no-store',
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // ignore
    }

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: json?.error || `Checkout failed (${res.status})` },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, url: json?.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Server error' }, { status: 500 });
  }
}
