import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateTempPassword(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const digits = 1000 + (arr[0] % 9000);
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
      alias = null,
      phone,
      birth_date,
      gender = null,
      belt = 'Blanco',
      role = 'client',
      guardian_user_id = null,
      plan_id,
      month_year,
      paid_now = false,
      payment_method = 'Efectivo',
      first_training_at = null,
      trial_guest_id = null,
      is_founder = false,
      father_name = null,
      father_phone = null,
      mother_name = null,
      mother_phone = null,
    } = body;

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedName = typeof full_name === 'string' ? full_name.trim() : '';

    if (!normalizedEmail || !normalizedName) {
      return new Response(JSON.stringify({ error: 'Faltan campos obligatorios (nombre y email)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tempPassword = generateTempPassword();

    const { data: createdAuth, error: authErr } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true,
    });

    if (authErr || !createdAuth.user) {
      const rawMsg = authErr?.message ?? 'Error al crear Auth';
      const friendlyMsg = rawMsg.toLowerCase().includes('already')
        ? 'Ya existe un usuario registrado con ese correo electrónico.'
        : rawMsg;
      return new Response(JSON.stringify({ error: friendlyMsg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newUserId = createdAuth.user.id;

    const { error: profErr } = await adminClient.from('profiles').insert({
      id: newUserId,
      email: normalizedEmail,
      full_name: normalizedName,
      alias: alias ? String(alias).trim() : null,
      phone: phone || null,
      birth_date: birth_date || null,
      gender: gender === 'hombre' || gender === 'mujer' ? gender : null,
      belt,
      role,
      guardian_user_id: guardian_user_id || null,
      father_name: father_name ? String(father_name).trim() : null,
      father_phone: father_phone ? String(father_phone).trim() : null,
      mother_name: mother_name ? String(mother_name).trim() : null,
      mother_phone: mother_phone ? String(mother_phone).trim() : null,
      is_founder: Boolean(is_founder),
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

    if (role === 'client') {
      await adminClient.from('fighter_stats').upsert({ user_id: newUserId }, { onConflict: 'user_id' });
    }

    if (plan_id && month_year) {
      const { data: planRow } = await adminClient
        .from('plans')
        .select('price_eur, is_class_pack, pack_credits')
        .eq('id', plan_id)
        .single();

      const { data: subData } = await adminClient
        .from('subscriptions')
        .insert({
          user_id: newUserId,
          plan_id,
          month_year,
          remaining_credits: planRow?.is_class_pack ? (planRow.pack_credits ?? 1) : null,
          status: 'active',
        })
        .select('id')
        .single();

      if (paid_now) {
        const safeMethod = payment_method === 'Bizum' ? 'Bizum' : 'Efectivo';
        const basePrice = Number(planRow?.price_eur ?? 0);
        const finalAmount = is_founder ? Math.round(basePrice * 0.9) : basePrice;
        await adminClient.from('payments').insert({
          user_id: newUserId,
          subscription_id: subData?.id ?? null,
          month_year,
          amount_eur: finalAmount,
          status: 'paid_ok',
          payment_method: safeMethod,
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

    return new Response(JSON.stringify({ id: newUserId, email: normalizedEmail, tempPassword }), {
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
