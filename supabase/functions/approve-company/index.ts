import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// რანდომ პაროლის გენერატორი
function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { requestId } = await req.json();

    // admin client (service role)
    const supabaseAdmin = createClient(
      Deno.env.get('SB_URL')!,
      Deno.env.get('SB_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        }
      }
    );

    // 1. მოთხოვნის წამოღება
    const { data: request, error: reqError } = await supabaseAdmin
      .from('company_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqError || !request) {
      throw new Error('მოთხოვნა ვერ მოიძებნა');
    }

    if (request.status === 'approved') {
      throw new Error('უკვე დადასტურებულია');
    }

    // 2. რანდომ პაროლი
    const tempPassword = generatePassword();


    // 3. auth ანგარიშის შექმნა — პირდაპ Admin API-ით
    const createRes = await fetch(`${Deno.env.get('SB_URL')}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SB_SERVICE_ROLE_KEY')}`,
        'apikey': Deno.env.get('SB_SERVICE_ROLE_KEY')!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: request.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: request.company_name,
          role: 'company',
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error('Auth error: ' + errText);
    }

    const authUser = await createRes.json();
    const newUserId = authUser.id;


    // 5. companies პროფილის შექმნა
    const { error: compError } = await supabaseAdmin.from('companies').insert([{
      id: newUserId,
      company_name: request.company_name,
      email: request.email,
      hr_phone: request.hr_phone,
      address: request.address,
      must_change_password: true,
    }]);

    if (compError) throw compError;

    // 6. მეილის გაგზავნა Resend-ით
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FreeJob <noreply@freejob.ge>',
        to: [request.email],
        subject: 'თქვენი კომპანიის ანგარიში გააქტიურდა',
        html: `
          <div style="font-family: sans-serif; max-width: 500px;">
            <h2>მოგესალმებით, ${request.company_name}!</h2>
            <p>თქვენი კომპანიის ანგარიში წარმატებით გააქტიურდა FreeJob-ზე.</p>
            <p><b>შესვლის მონაცემები:</b></p>
            <p>ელ-ფოსტა: ${request.email}<br/>
            დროებითი პაროლი: <b style="font-size:18px;">${tempPassword}</b></p>
            <p style="color:#666;">პირველივე შესვლისას სისტემა მოგთხოვთ ახალი პაროლის შექმნას.</p>
            <p>წარმატებები,<br/>FreeJob-ის გუნდი</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Resend error:', errText);
    }

    // 7. სტატუსის განახლება
    await supabaseAdmin
      .from('company_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', requestId);

    return new Response(
      JSON.stringify({ success: true, email: request.email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('ERROR DETAILS:', error);
    return new Response(
      JSON.stringify({ error: error.message, details: String(error) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});