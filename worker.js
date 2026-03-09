/**
 * POS-APP Cloudflare Worker — CORS Proxy
 * ทำหน้าที่: ซ่อน APP_SECRET + เพิ่ม CORS headers
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    // ── OPTIONS preflight (browser ส่งมาก่อน POST จริง) ────────
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    // ── ping — health check ไม่ต้องการ token ────────────────────
    if (action === 'ping') {
      return new Response(
        JSON.stringify({ ok: true, version: '1.1' }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ── Forward ไปที่ GAS พร้อมแนบ token ────────────────────────
    const GAS_URL = env.GAS_URL;
    const APP_SECRET = env.APP_SECRET;

    if (!GAS_URL || !APP_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Worker secrets not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    try {
      let gasResponse;

      if (request.method === 'GET') {
        // GET: แนบ token ผ่าน query param
        const gasUrl = new URL(GAS_URL);
        url.searchParams.forEach((v, k) => gasUrl.searchParams.set(k, v));
        gasUrl.searchParams.set('token', APP_SECRET);
        gasResponse = await fetch(gasUrl.toString(), { method: 'GET' });

      } else if (request.method === 'POST') {
        // POST: แนบ token เข้าไปใน body
        const body = await request.json();
        body.token = APP_SECRET;
        gasResponse = await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }

      const data = await gasResponse.text();
      return new Response(data, {
        status: gasResponse.status,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
        },
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Worker error: ' + err.message }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }
  },
};
