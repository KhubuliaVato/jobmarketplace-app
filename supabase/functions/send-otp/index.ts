// supabase/functions/send-otp/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SB_URL')!;
const SB_KEY = Deno.env.get('SB_SERVICE_ROLE_KEY')!;
const UBILL_KEY = (Deno.env.get('UBILL_API_KEY') ?? '').trim();
const BRAND_ID = Number(Deno.env.get('UBILL_BRAND_ID') ?? 2);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

// 995XXXXXXXXX ფორმატამდე მიყვანა
function normalizePhone(raw: string): string | null {
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 9 && d.startsWith('5')) return '995' + d;
  if (d.length === 12 && d.startsWith('995')) return d;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { phone, purpose } = await req.json();

    if (!['register', 'reset'].includes(purpose)) {
      return json({ error: 'არასწორი purpose' }, 400);
    }

    const num = normalizePhone(phone ?? '');
    if (!num) return json({ error: 'ნომრის ფორმატი არასწორია' }, 400);

    const db = createClient(SB_URL, SB_KEY);

    // ნომრის არსებობის შემოწმება
    const { data: existing } = await db
      .from('users')
      .select('id')
      .eq('phone', num)
      .maybeSingle();

    if (purpose === 'register' && existing) {
      return json({ error: 'ეს ნომერი უკვე რეგისტრირებულია' }, 409);
    }
    if (purpose === 'reset' && !existing) {
      return json({ error: 'ამ ნომრით ანგარიში ვერ მოიძებნა' }, 404);
    }

    // rate limit — 60 წამში 1 კოდი
    const { data: last } = await db
      .from('otp_codes')
      .select('created_at')
      .eq('phone', num)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (last && Date.now() - new Date(last.created_at).getTime() < 60_000) {
      return json({ error: 'ახალი კოდის მოთხოვნა 60 წამში ერთხელაა შესაძლებელი' }, 429);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insErr } = await db.from('otp_codes').insert({
      phone: num,
      code,
      purpose,
      expires_at: expiresAt,
    });
    if (insErr) throw insErr;

    // SMS
    const text = `FreeJob: დადასტურების კოდი ${code}. მოქმედებს 5 წუთი.`;

    const res = await fetch('https://api.ubill.dev/v1/sms/send', {
      method: 'POST',
      headers: { 'key': UBILL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brandID: BRAND_ID,
        numbers: [{ number: num, text }],
        otp: true,
        stopList: false,
      }),
    });

    const out = await res.json();
    
    if (out.statusID !== 0) {
      return json({ error: 'SMS ვერ გაიგზავნა', detail: out.message }, 502);
    }

    return json({ ok: true, expiresIn: 300 });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});