/**
 * Netlify Serverless Function: admin-create-user
 * Permite a los Administradores de 247Studio dar de alta alumnos o staff técnico con cuenta real en Firebase Auth,
 * asignación de Custom Claim y generación de enlace de activación de contraseña.
 */

import { getAdminApp } from './_firebaseAdmin.mjs';

const ALLOWED_ORIGINS = [
  'https://247studio.netlify.app',
  'https://studio-ff8d1.web.app',
  'https://studio-ff8d1.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

function getCorsHeaders(req) {
  const origin = req.headers.get('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);
  const allowOrigin = isAllowed ? origin : 'https://247studio.netlify.app';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export default async function handler(req, context) {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido. Use POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 1. Obtener Admin SDK
  let adminAuth, adminDb;
  try {
    const admin = getAdminApp();
    adminAuth = admin.auth;
    adminDb = admin.db;
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Servicio de administración no disponible: ${err.message}` }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 2. Verificar que el invocador sea Administrador
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'No autorizado. Se requiere token de administrador.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let caller;
  try {
    caller = await adminAuth.verifyIdToken(token);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Token de sesión inválido o expirado.' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (caller.role !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'Acceso denegado. Solo administradores pueden dar de alta usuarios.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 3. Procesar datos del formulario
  try {
    const body = await req.json();
    const {
      email,
      firstName,
      lastName,
      alias,
      phone,
      birthDate,
      belt = 'WHITE',
      stripes = 0,
      isFoundingMember = false,
      targetRole = 'student',
      isMinor = false,
      guardianName,
      guardianPhone,
      guardianDni,
      guardianEmail,
      guardianUid,
      emergencyContactName,
      emergencyContactPhone,
      stats,
      notes,
    } = body;

    const str = (v) => (typeof v === 'string' ? v.trim() : '');
    const cleanFirstName = str(firstName);
    const cleanLastName = str(lastName);
    // Legacy display name: keep `alias` = "first last" so the rest of the app keeps working.
    const cleanAlias = `${cleanFirstName} ${cleanLastName}`.trim() || str(alias);
    const providedEmail = str(email).toLowerCase();
    // Email is optional at enrollment: a placeholder login is used (no reset link is generated for it).
    const hasRealEmail = providedEmail.length > 0;
    const cleanEmail = hasRealEmail
      ? providedEmail
      : `alumno_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}@247studiobjj.com`;

    if (!cleanAlias) {
      return new Response(
        JSON.stringify({ error: 'El nombre del alumno es obligatorio.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Crear o recuperar usuario en Firebase Authentication
    let authUser;
    let isNewUser = false;
    try {
      authUser = await adminAuth.getUserByEmail(cleanEmail);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        authUser = await adminAuth.createUser({
          email: cleanEmail,
          displayName: cleanAlias,
          emailVerified: true,
        });
        isNewUser = true;
      } else {
        throw err;
      }
    }

    const uid = authUser.uid;

    // 5. Asignar Custom Claim de rol ('student' o 'coach')
    const finalRole = ['coach', 'admin', 'kiosk'].includes(targetRole) ? targetRole : 'student';
    await adminAuth.setCustomUserClaims(uid, { role: finalRole });

    // 6. Generar enlace seguro para que el alumno configure su contraseña
    let resetLink = null;
    try {
      if (hasRealEmail) resetLink = await adminAuth.generatePasswordResetLink(cleanEmail);
    } catch (linkErr) {
      console.warn('Aviso generando enlace de contraseña:', linkErr.message);
    }

    // 7. Escribir documento en colección 'users/{uid}'
    const nowIso = new Date().toISOString();
    const userDocData = {
      uid,
      authEmail: cleanEmail,
      contactEmail: hasRealEmail ? cleanEmail : '',
      firstName: cleanFirstName || null,
      lastName: cleanLastName || null,
      alias: cleanAlias,
      phone: str(phone),
      birthDate: str(birthDate),
      isMinor: Boolean(isMinor),
      guardianName: str(guardianName) || null,
      guardianPhone: str(guardianPhone) || null,
      guardianDni: str(guardianDni) || null,
      guardianEmail: str(guardianEmail) || null,
      guardianUid: str(guardianUid) || null,
      isFoundingMember: isFoundingMember === true || isFoundingMember === 'true',
      emergencyContactName: str(emergencyContactName) || (isMinor ? str(guardianName) || null : null),
      emergencyContactPhone: str(emergencyContactPhone) || (isMinor ? str(guardianPhone) || null : null),
      beltSystem: isMinor ? 'KIDS' : 'ADULT',
      belt,
      stripes: Number(stripes) || 0,
      beltDate: nowIso.slice(0, 10),
      // Required by the user model; no tariff is assigned at enrollment (chosen when the first payment is registered).
      pricingTier: 'STD',
      accountStatus: 'ACTIVE',
      paymentStatusCache: 'OK',
      notes: notes?.trim() || null,
      permissions: [finalRole],
      waiverVersion: 'PRESENCIAL_V1',
      waiverSignedAt: nowIso,
      waiverSignedByUid: caller.uid,
      createdAt: nowIso,
      updatedAt: nowIso,
      stats: stats || {
        tecnica: 65,
        fuerza: 60,
        elasticidad: 60,
        guardia: 65,
        pase: 65,
        derribos: 55,
        leglocks: 50,
        finalizacion: 60,
      },
    };

    await adminDb.collection('users').doc(uid).set(userDocData, { merge: true });

    // 8. Escribir directorio seguro 'kiosk_members/{uid}' para acceso rápido en tatami y recepción
    await adminDb.collection('kiosk_members').doc(uid).set(
      {
        uid,
        alias: cleanAlias,
        belt,
        stripes: Number(stripes) || 0,
        accountStatus: 'ACTIVE',
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // 9. Registrar en auditoría
    await adminDb.collection('audit_logs').add({
      action: 'ADMIN_CREATE_USER',
      performedBy: caller.uid,
      targetUid: uid,
      targetEmail: cleanEmail,
      role: finalRole,
      timestamp: nowIso,
    });

    return new Response(
      JSON.stringify({
        success: true,
        uid,
        email: cleanEmail,
        alias: cleanAlias,
        role: finalRole,
        isNewUser,
        resetLink,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error en admin-create-user:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Error interno al crear usuario.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

