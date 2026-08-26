// supabase/functions/verify-otp/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SB_URL = Deno.env.get('SB_URL')!;
const SB_KEY = Deno.env.get('SB_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

function normalizePhone(raw: string): string | null {
  const d = String(raw).replace(/\D/g, '');
  if (d.length === 9 && d.startsWith('5')) return '995' + d;
  if (d.length === 12 && d.startsWith('995')) return d;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { phone, code, purpose } = await req.json();

    const num = normalizePhone(phone ?? '');
    if (!num) return json({ error: 'ნომრის ფორმატი არასწორია' }, 400);
    if (!/^\d{6}$/.test(String(code ?? ''))) {
      return json({ error: 'კოდი 6 ციფრისგან უნდა შედგებოდეს' }, 400);
    }

    const db = createClient(SB_URL, SB_KEY);

    const { data: row } = await db
      .from('otp_codes')
      .select('*')
      .eq('phone', num)
      .eq('purpose', purpose)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return json({ error: 'კოდი ვერ მოიძებნა, მოითხოვე ხელახლა' }, 404);

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error: 'კოდს ვადა გაუვიდა' }, 410);
    }

    if (row.attempts >= 5) {
      return json({ error: 'მცდელობების ლიმიტი ამოიწურა' }, 429);
    }

    if (row.code !== String(code)) {
      await db
        .from('otp_codes')
        .update({ attempts: row.attempts + 1 })
        .eq('id', row.id);
      return json({ error: 'კოდი არასწორია' }, 400);
    }

    await db.from('otp_codes').update({ verified: true }).eq('id', row.id);

    return json({ ok: true, token: row.id });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});