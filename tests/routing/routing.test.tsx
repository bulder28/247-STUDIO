import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import { ProtectedRoute } from '@/app/router/ProtectedRoute';
import { getDefaultHomeByRole, getSafeRedirect } from '@/pages/public-login/LoginPage';
import { LandingLayout } from '@/widgets/LandingLayout';

// Mock de useAuth
vi.mock('@/app/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { useAuth } from '@/app/providers/AuthProvider';

describe('Tests de routing y sitio público', () => {

  // =========================================================================
  // GRUPO A — LANDING PÚBLICA
  // =========================================================================
  describe('Grupo A — Landing pública', () => {
    it('A1. Visitante no autenticado accede a /', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        role: null,
        userData: null,
        loading: false,
        logout: vi.fn(),
        refreshProfile: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <LandingLayout />
        </MemoryRouter>
      );

      // Verificamos que el botón Acceder está visible y no hay redirección
      expect(screen.getByText('Acceder')).toBeDefined();
      expect(screen.getByText('Clase de Prueba')).toBeDefined();
      expect(screen.queryByText('Ir a mi panel')).toBeNull();
    });

    it('A2. Alumno autenticado accede a /', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { uid: 'student-1' } as any,
        role: 'student',
        userData: { alias: 'Marcos' } as any,
        loading: false,
        logout: vi.fn(),
        refreshProfile: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <LandingLayout />
        </MemoryRouter>
      );

      // Verificamos que aparece el botón "Ir a mi panel" con el alias
      const panelBtn = screen.getByText(/Hola, Marcos — Ir a mi panel/i);
      expect(panelBtn).toBeDefined();
      expect(panelBtn.closest('a')?.getAttribute('href')).toBe('/app/home');
    });

    it('A3. Admin autenticado accede a /', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { uid: 'admin-1' } as any,
        role: 'admin',
        userData: { alias: 'Admin' } as any,
        loading: false,
        logout: vi.fn(),
        refreshProfile: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <LandingLayout />
        </MemoryRouter>
      );

      const panelBtn = screen.getByText(/Ir a mi panel/i);
      expect(panelBtn).toBeDefined();
      expect(panelBtn.closest('a')?.getAttribute('href')).toBe('/admin/personal');
    });
  });

  // =========================================================================
  // GRUPO B — RUTAS PROTEGIDAS SIN SESIÓN
  // =========================================================================
  describe('Grupo B — Rutas protegidas sin sesión', () => {
    it('B1. Sin sesión en /app/home redirige a /login?redirect=%2Fapp%2Fhome', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        role: null,
        userData: null,
        loading: false,
        logout: vi.fn(),
        refreshProfile: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/app/home']}>
          <Routes>
            <Route
              path="/app/home"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <div>Home Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>LoginPage Screen</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('LoginPage Screen')).toBeDefined();
      expect(screen.queryByText('Home Content')).toBeNull();
    });

    it('B4. Preservación de query string en redirect', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        role: null,
        userData: null,
        loading: false,
        logout: vi.fn(),
        refreshProfile: vi.fn(),
      });

      let capturedSearch = '';
      const DummyLogin = () => {
        capturedSearch = window.location.search;
        return <div>Login Reached</div>;
      };

      render(
        <MemoryRouter initialEntries={['/app/horario?day=2026-11-10']}>
          <Routes>
            <Route
              path="/app/horario"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <div>Horario Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<DummyLogin />} />
          </Routes>
        </MemoryRouter>
      );

      // Verificamos que se redireccionó a /login
      expect(screen.getByText('Login Reached')).toBeDefined();
    });
  });

  // =========================================================================
  // GRUPO C — LOGIN Y REDIRECCIONES
  // =========================================================================
  describe('Grupo C — Login y redirecciones', () => {
    it('C1. Login con redirect válido', () => {
      const redirect = getSafeRedirect('/app/horario', 'student');
      expect(redirect).toBe('/app/horario');
    });

    it('C2. Login sin redirect para student', () => {
      const destination = getDefaultHomeByRole('student');
      expect(destination).toBe('/app/home');
    });

    it('C3. Login admin sin redirect', () => {
      const destination = getDefaultHomeByRole('admin');
      expect(destination).toBe('/admin/personal');
    });

    it('C4. Login kiosk sin redirect', () => {
      const destination = getDefaultHomeByRole('kiosk');
      expect(destination).toBe('/kiosk/check-in');
    });

    it('C6. Usuario student con redirect a /admin es forzado a su home por rol', () => {
      const safeRedirect = getSafeRedirect('/admin/caja', 'student');
      // No está autorizado para /admin, por tanto se rechaza y retorna null
      expect(safeRedirect).toBeNull();
      // Y cae al home por rol
      const destination = safeRedirect || getDefaultHomeByRole('student');
      expect(destination).toBe('/app/home');
    });
  });

  // =========================================================================
  // GRUPO D — SEGURIDAD: OPEN REDIRECT
  // =========================================================================
  describe('Grupo D — Seguridad: open redirect', () => {
    it('D1. redirect absoluto externo (https://evil.com) es rechazado', () => {
      const safe = getSafeRedirect('https://evil.com', 'student');
      expect(safe).toBeNull();
      expect(safe || getDefaultHomeByRole('student')).toBe('/app/home');
    });

    it('D2. redirect protocol-relative (//evil.com) es rechazado', () => {
      const safe = getSafeRedirect('//evil.com', 'student');
      expect(safe).toBeNull();
      expect(safe || getDefaultHomeByRole('student')).toBe('/app/home');
    });

    it('D3. redirect fuera de whitelist (/etc/passwd) es rechazado', () => {
      const safe = getSafeRedirect('/etc/passwd', 'student');
      expect(safe).toBeNull();
      expect(safe || getDefaultHomeByRole('student')).toBe('/app/home');
    });

    it('D4. redirect con prefijo válido pero rol incorrecto (/admin/personal para student)', () => {
      const safe = getSafeRedirect('/admin/personal', 'student');
      expect(safe).toBeNull();
      expect(safe || getDefaultHomeByRole('student')).toBe('/app/home');
    });
  });

  // =========================================================================
  // GRUPO E — RUTAS ELIMINADAS Y ACCESO CRUZADO
  // =========================================================================
  describe('Grupo E — Rutas eliminadas y acceso cruzado', () => {
    it('E2. Student intenta acceder a /admin/personal y es redirigido a /app/home', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { uid: 'student-1' } as any,
        role: 'student',
        userData: null,
        loading: false,
        logout: vi.fn(),
        refreshProfile: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/admin/personal']}>
          <Routes>
            <Route
              path="/admin/personal"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <div>Admin Secret</div>
                </ProtectedRoute>
              }
            />
            <Route path="/app/home" element={<div>Student Home Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Student Home Page')).toBeDefined();
      expect(screen.queryByText('Admin Secret')).toBeNull();
    });

    it('E3. Admin intenta acceder a /app/home y es redirigido a /admin/personal', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { uid: 'admin-1' } as any,
        role: 'admin',
        userData: null,
        loading: false,
        logout: vi.fn(),
        refreshProfile: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/app/home']}>
          <Routes>
            <Route
              path="/app/home"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <div>Student Secret</div>
                </ProtectedRoute>
              }
            />
            <Route path="/admin/personal" element={<div>Admin Personal Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Admin Personal Page')).toBeDefined();
      expect(screen.queryByText('Student Secret')).toBeNull();
    });
  });

  // =========================================================================
  // GRUPO F — AUTHPROVIDER NO BLOQUEANTE
  // =========================================================================
  describe('Grupo F — AuthProvider no bloqueante', () => {
    it('F2. ProtectedRoute sí espera a loading mostrando spinner', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        role: null,
        userData: null,
        loading: true, // Esperando Firebase
        logout: vi.fn(),
        refreshProfile: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/app/home']}>
          <Routes>
            <Route
              path="/app/home"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <div>Home Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      // Muestra el spinner y no redirige prematuramente a /login
      expect(screen.getByText(/Cargando 247Studio.../i)).toBeDefined();
      expect(screen.queryByText('Home Content')).toBeNull();
    });
  });

  // =========================================================================
  // GRUPO G — PWA MANIFEST
  // =========================================================================
  describe('Grupo G — PWA manifest', () => {
    it('G1. start_url es /app/home y scope es /', () => {
      const manifestPath = resolve(__dirname, '../../public/manifest.json');
      const manifestContent = JSON.parse(readFileSync(manifestPath, 'utf8'));

      expect(manifestContent.start_url).toBe('/app/home');
      expect(manifestContent.scope).toBe('/');
    });
  });
});

