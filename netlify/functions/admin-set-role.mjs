/**
 * Netlify Serverless Function: admin-set-role
 * Gestión autónoma de permisos, asignación de roles (admin, coach, student, kiosk) y listado de staff.
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export default async function handler(req, context) {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
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

  // 2. Verificar que el llamador sea Administrador
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
      JSON.stringify({ error: 'Acceso denegado. Se requieren permisos de Administrador.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 3. Acción GET: Listar usuarios con sus claims de rol
  if (req.method === 'GET') {
    try {
      const list = await adminAuth.listUsers(100);
      const users = list.users.map((u) => ({
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || '',
        role: u.customClaims?.role || 'student',
        emailVerified: u.emailVerified,
        disabled: u.disabled,
        createdAt: u.metadata?.creationTime,
        lastSignInTime: u.metadata?.lastSignInTime,
      }));

      return new Response(JSON.stringify({ users }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: `Error listando usuarios: ${err.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // 4. Acción POST: Asignar o actualizar rol
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { email, uid: targetUid, role, generateInvite = true } = body;

      const targetRole = String(role || '').toLowerCase();
      const VALID_ROLES = ['admin', 'coach', 'student', 'kiosk'];

      if (!VALID_ROLES.includes(targetRole)) {
        return new Response(
          JSON.stringify({ error: `Rol inválido. Roles válidos: ${VALID_ROLES.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let userRecord;
      let cleanEmail = email?.trim().toLowerCase();

      if (targetUid) {
        userRecord = await adminAuth.getUser(targetUid);
      } else if (cleanEmail) {
        try {
          userRecord = await adminAuth.getUserByEmail(cleanEmail);
        } catch (notFound) {
          if (notFound.code === 'auth/user-not-found') {
            // Si el usuario aún no existe, lo creamos para invitarlo al staff
            userRecord = await adminAuth.createUser({
              email: cleanEmail,
              emailVerified: true,
            });
          } else {
            throw notFound;
          }
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Se requiere indicar email o UID del usuario.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const uid = userRecord.uid;
      cleanEmail = userRecord.email || cleanEmail;

      // Asignar el Custom Claim en Firebase Auth
      await adminAuth.setCustomUserClaims(uid, { role: targetRole });

      // Generar enlace de contraseña / invitación
      let resetLink = null;
      if (generateInvite && cleanEmail) {
        try {
          resetLink = await adminAuth.generatePasswordResetLink(cleanEmail);
        } catch (e) {
          console.warn('Aviso generando enlace:', e.message);
        }
      }

      // Sincronizar campo en Firestore 'users/{uid}'
      const nowIso = new Date().toISOString();
      await adminDb.collection('users').doc(uid).set(
        {
          permissions: [targetRole],
          updatedAt: nowIso,
        },
        { merge: true }
      );

      // Registrar auditoría estricta
      await adminDb.collection('audit_logs').add({
        action: 'ADMIN_SET_ROLE',
        performedBy: caller.uid,
        targetUid: uid,
        targetEmail: cleanEmail,
        newRole: targetRole,
        timestamp: nowIso,
      });

      return new Response(
        JSON.stringify({
          success: true,
          uid,
          email: cleanEmail,
          role: targetRole,
          resetLink,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      console.error('Error en admin-set-role:', err);
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : 'Error interno al actualizar rol.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(JSON.stringify({ error: 'Método no soportado.' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
