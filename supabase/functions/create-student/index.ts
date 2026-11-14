import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateTempPassword(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `247-${digits}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await userClient.auth.getUser();

    if (!caller) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Solo administradores pueden crear usuarios' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      email,
      full_name,
      phone,
      birth_date,
      belt = 'Blanco',
      role = 'client',
      plan_id,
      month_year,
      paid_now = false,
      payment_method = 'Efectivo',
      first_training_at = null,
      trial_guest_id = null,
    } = body;

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios (nombre y email)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tempPassword = generateTempPassword();

    const { data: createdAuth, error: authErr } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authErr || !createdAuth.user) {
      return new Response(JSON.stringify({ error: authErr?.message ?? 'Error al crear Auth' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = createdAuth.user.id;

    const { error: profErr } = await adminClient.from('profiles').insert({
      id: newUserId,
      email,
      full_name,
      phone: phone || null,
      birth_date: birth_date || null,
      belt,
      role,
      status: 'active',
      must_change_password: true,
      first_training_at: first_training_at ? new Date(first_training_at).toISOString() : null,
    });

    if (profErr) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: profErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (plan_id && month_year) {
      const { data: subData } = await adminClient
        .from('subscriptions')
        .insert({
          user_id: newUserId,
          plan_id,
          month_year,
          status: 'active',
        })
        .select('id')
        .single();

      if (paid_now) {
        const { data: planRow } = await adminClient
          .from('plans')
          .select('price_eur')
          .eq('id', plan_id)
          .single();

        await adminClient.from('payments').insert({
          user_id: newUserId,
          subscription_id: subData?.id ?? null,
          month_year,
          amount_eur: planRow?.price_eur ?? 0,
          status: 'paid_ok',
          payment_method,
          paid_at: new Date().toISOString(),
        });
      }
    }

    if (trial_guest_id) {
      await adminClient
        .from('trial_guests')
        .update({ converted_user_id: newUserId })
        .eq('id', trial_guest_id);
    }

    return new Response(JSON.stringify({ id: newUserId, email, tempPassword }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
