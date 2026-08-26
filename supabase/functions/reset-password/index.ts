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
    const { phone, code, newPassword } = await req.json();

    const num = normalizePhone(phone ?? '');
    if (!num) return json({ error: 'ნომრის ფორმატი არასწორია' }, 400);
    if (!/^\d{6}$/.test(String(code ?? ''))) {
      return json({ error: 'კოდი 6 ციფრისგან უნდა შედგებოდეს' }, 400);
    }
    if (!newPassword || String(newPassword).length < 6) {
      return json({ error: 'პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს' }, 400);
    }

    const db = createClient(SB_URL, SB_KEY);

    const { data: otp } = await db
      .from('otp_codes')
      .select('*')
      .eq('phone', num)
      .eq('purpose', 'reset')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) return json({ error: 'კოდი ვერ მოიძებნა, მოითხოვე ხელახლა' }, 404);
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      return json({ error: 'კოდს ვადა გაუვიდა' }, 410);
    }
    if (otp.attempts >= 5) {
      return json({ error: 'მცდელობების ლიმიტი ამოიწურა' }, 429);
    }
    if (otp.code !== String(code)) {
      await db.from('otp_codes').update({ attempts: otp.attempts + 1 }).eq('id', otp.id);
      return json({ error: 'კოდი არასწორია' }, 400);
    }

    const { data: user } = await db
      .from('users')
      .select('id')
      .eq('phone', num)
      .maybeSingle();

    if (!user) return json({ error: 'ამ ნომრით ანგარიში ვერ მოიძებნა' }, 404);

    const { error: updErr } = await db.auth.admin.updateUserById(user.id, {
      password: String(newPassword),
    });
    if (updErr) return json({ error: 'პაროლის განახლება ვერ მოხერხდა', detail: updErr.message }, 500);

    await db.from('otp_codes').update({ verified: true }).eq('id', otp.id);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as any)?.message ?? e) }, 500);
  }
});