#!/usr/bin/env node

/**
 * Script de siembra (seed) de 30 alumnos ficticios realistas para 247 STUDIO
 * Crea perfiles completos en 'users', proyecciones en 'kiosk_members',
 * pagos en 'payments' y asistencias/reservas en 'bookings'.
 *
 * Sin datos médicos ni consentimientos sanitarios (conforme a la directriz).
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// 1. Conexión Admin SDK
const keyPath = resolve(process.cwd(), 'studio-ff8d1-firebase-adminsdk-fbsvc-b730cf5be9.json');
if (!existsSync(keyPath)) {
  console.error('[ERROR] No se encontró el archivo de clave de servicio:', keyPath);
  process.exit(1);
}

const credential = cert(JSON.parse(readFileSync(keyPath, 'utf8')));
if (getApps().length === 0) {
  initializeApp({ credential });
}

const db = getFirestore();

// 30 alumnos ficticios realistas para la academia en Pinto (Madrid)
const MOCK_STUDENTS = [
  // 1. Adultos cinturón blanco
  {
    alias: 'Carlos Gómez',
    email: 'carlos.gomez.bjj@gmail.com',
    phone: '612345001',
    birthDate: '1995-04-12',
    isMinor: false,
    belt: 'WHITE',
    stripes: 2,
    beltSystem: 'ADULT',
    beltDate: '2026-05-10',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_7500',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Laura Gómez (Hermana)',
    emergencyContactPhone: '612345101',
    stats: { tecnica: 58, fuerza: 72, elasticidad: 50, guardia: 55, pase: 65, derribos: 60, leglocks: 40, finalizacion: 55 },
  },
  {
    alias: 'Alejandro Morales',
    email: 'alex.morales@outlook.es',
    phone: '612345002',
    birthDate: '1998-09-23',
    isMinor: false,
    belt: 'WHITE',
    stripes: 3,
    beltSystem: 'ADULT',
    beltDate: '2026-03-15',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_7500',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Marta Ruiz (Pareja)',
    emergencyContactPhone: '612345102',
    stats: { tecnica: 62, fuerza: 70, elasticidad: 55, guardia: 60, pase: 68, derribos: 65, leglocks: 45, finalizacion: 58 },
  },
  {
    alias: 'Lucía Fernández',
    email: 'lucia.fdez.grappling@gmail.com',
    phone: '612345003',
    birthDate: '2001-11-05',
    isMinor: false,
    belt: 'WHITE',
    stripes: 1,
    beltSystem: 'ADULT',
    beltDate: '2026-08-01',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_7500',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Elena Fernández (Madre)',
    emergencyContactPhone: '612345103',
    stats: { tecnica: 64, fuerza: 55, elasticidad: 78, guardia: 72, pase: 58, derribos: 50, leglocks: 40, finalizacion: 60 },
  },
  {
    alias: 'Sergio Navas',
    email: 's.navas.pinto@hotmail.com',
    phone: '612345004',
    birthDate: '1992-02-18',
    isMinor: false,
    belt: 'WHITE',
    stripes: 4,
    beltSystem: 'ADULT',
    beltDate: '2025-10-14',
    pricingTier: 'SF',
    activeTariffId: 'tariff_sf_monthly_6000',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Pedro Navas (Padre)',
    emergencyContactPhone: '612345104',
    stats: { tecnica: 68, fuerza: 75, elasticidad: 52, guardia: 65, pase: 74, derribos: 66, leglocks: 50, finalizacion: 65 },
  },
  {
    alias: 'Daniela Castro',
    email: 'daniela.castro.bjj@gmail.com',
    phone: '612345005',
    birthDate: '1999-07-30',
    isMinor: false,
    belt: 'WHITE',
    stripes: 0,
    beltSystem: 'ADULT',
    beltDate: '2026-10-01',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_7500',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Roberto Castro (Hermano)',
    emergencyContactPhone: '612345105',
    stats: { tecnica: 50, fuerza: 52, elasticidad: 68, guardia: 52, pase: 50, derribos: 48, leglocks: 35, finalizacion: 45 },
  },
  {
    alias: 'Marcos Benítez',
    email: 'm.benitez.mma@gmail.com',
    phone: '612345006',
    birthDate: '1996-12-08',
    isMinor: false,
    belt: 'WHITE',
    stripes: 2,
    beltSystem: 'ADULT',
    beltDate: '2026-06-20',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_7500',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Sandra Soler (Esposa)',
    emergencyContactPhone: '612345106',
    stats: { tecnica: 60, fuerza: 78, elasticidad: 50, guardia: 56, pase: 70, derribos: 75, leglocks: 55, finalizacion: 60 },
  },

  // 2. Adultos cinturón azul
  {
    alias: 'Javier Ramos',
    email: 'javi.ramos.bjj@gmail.com',
    phone: '612345007',
    birthDate: '1990-03-14',
    isMinor: false,
    belt: 'BLUE',
    stripes: 3,
    beltSystem: 'ADULT',
    beltDate: '2025-06-18',
    pricingTier: 'SF',
    activeTariffId: 'tariff_sf_monthly_6000',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Beatriz Ramos (Hermana)',
    emergencyContactPhone: '612345107',
    stats: { tecnica: 76, fuerza: 72, elasticidad: 65, guardia: 78, pase: 75, derribos: 68, leglocks: 65, finalizacion: 74 },
  },
  {
    alias: 'Álvaro Martín',
    email: 'alvaro.martin.tatami@gmail.com',
    phone: '612345008',
    birthDate: '1994-08-27',
    isMinor: false,
    belt: 'BLUE',
    stripes: 1,
    beltSystem: 'ADULT',
    beltDate: '2026-01-20',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_7500',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Carmen Ortiz (Madre)',
    emergencyContactPhone: '612345108',
    stats: { tecnica: 72, fuerza: 68, elasticidad: 62, guardia: 74, pase: 70, derribos: 62, leglocks: 60, finalizacion: 70 },
  },
  {
    alias: 'Sara Domínguez',
    email: 'sara.dominguez.nogi@gmail.com',
    phone: '612345009',
    birthDate: '1997-05-16',
    isMinor: false,
    belt: 'BLUE',
    stripes: 2,
    beltSystem: 'ADULT',
    beltDate: '2025-11-10',
    pricingTier: 'FAM',
    activeTariffId: 'tariff_fam_monthly_5500',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Jorge Domínguez (Hermano)',
    emergencyContactPhone: '612345109',
    stats: { tecnica: 75, fuerza: 62, elasticidad: 82, guardia: 80, pase: 70, derribos: 58, leglocks: 64, finalizacion: 75 },
  },
  {
    alias: 'Rubén Gil',
    email: 'ruben.gil.247@gmail.com',
    phone: '612345010',
    birthDate: '1989-10-03',
    isMinor: false,
    belt: 'BLUE',
    stripes: 4,
    beltSystem: 'ADULT',
    beltDate: '2025-03-12',
    pricingTier: 'SF',
    activeTariffId: 'tariff_sf_monthly_6000',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Patricia Gil (Esposa)',
    emergencyContactPhone: '612345110',
    stats: { tecnica: 79, fuerza: 75, elasticidad: 60, guardia: 78, pase: 80, derribos: 70, leglocks: 70, finalizacion: 78 },
  },
  {
    alias: 'Hugo Serrano',
    email: 'hugo.serrano.bjj@gmail.com',
    phone: '612345011',
    birthDate: '1996-01-22',
    isMinor: false,
    belt: 'BLUE',
    stripes: 0,
    beltSystem: 'ADULT',
    beltDate: '2026-07-15',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_7500',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'María Serrano (Madre)',
    emergencyContactPhone: '612345111',
    stats: { tecnica: 70, fuerza: 74, elasticidad: 58, guardia: 68, pase: 72, derribos: 66, leglocks: 58, finalizacion: 68 },
  },
  {
    alias: 'Adrián Delgado',
    email: 'adrian.delgado@live.com',
    phone: '612345012',
    birthDate: '1993-06-19',
    isMinor: false,
    belt: 'BLUE',
    stripes: 2,
    beltSystem: 'ADULT',
    beltDate: '2025-09-05',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_7500',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Clara Delgado (Hermana)',
    emergencyContactPhone: '612345112',
    stats: { tecnica: 74, fuerza: 70, elasticidad: 64, guardia: 72, pase: 75, derribos: 64, leglocks: 65, finalizacion: 72 },
  },

  // 3. Adultos cinturón morado
  {
    alias: 'Mateo Vargas',
    email: 'mateo.vargas.purple@gmail.com',
    phone: '612345013',
    birthDate: '1988-12-04',
    isMinor: false,
    belt: 'PURPLE',
    stripes: 2,
    beltSystem: 'ADULT',
    beltDate: '2024-11-20',
    pricingTier: 'SF',
    activeTariffId: 'tariff_sf_monthly_6000',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Lucía Vargas (Esposa)',
    emergencyContactPhone: '612345113',
    stats: { tecnica: 85, fuerza: 80, elasticidad: 72, guardia: 88, pase: 84, derribos: 75, leglocks: 82, finalizacion: 86 },
  },
  {
    alias: 'Paula Mendoza',
    email: 'paula.mendoza.bjj@gmail.com',
    phone: '612345014',
    birthDate: '1995-03-29',
    isMinor: false,
    belt: 'PURPLE',
    stripes: 1,
    beltSystem: 'ADULT',
    beltDate: '2025-04-18',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_7500',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Ignacio Mendoza (Padre)',
    emergencyContactPhone: '612345114',
    stats: { tecnica: 86, fuerza: 68, elasticidad: 88, guardia: 90, pase: 80, derribos: 68, leglocks: 80, finalizacion: 88 },
  },
  {
    alias: 'Guillermo Rivas',
    email: 'guille.rivas.tatami@gmail.com',
    phone: '612345015',
    birthDate: '1991-07-11',
    isMinor: false,
    belt: 'PURPLE',
    stripes: 3,
    beltSystem: 'ADULT',
    beltDate: '2024-05-15',
    pricingTier: 'SF',
    activeTariffId: 'tariff_sf_monthly_6000',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Andrea Rivas (Hermana)',
    emergencyContactPhone: '612345115',
    stats: { tecnica: 88, fuerza: 82, elasticidad: 70, guardia: 86, pase: 88, derribos: 80, leglocks: 85, finalizacion: 87 },
  },
  {
    alias: 'Enrique Torres',
    email: 'kike.torres.bjj@gmail.com',
    phone: '612345016',
    birthDate: '1987-09-08',
    isMinor: false,
    belt: 'PURPLE',
    stripes: 0,
    beltSystem: 'ADULT',
    beltDate: '2025-12-01',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_7500',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Silvia Torres (Esposa)',
    emergencyContactPhone: '612345116',
    stats: { tecnica: 83, fuerza: 84, elasticidad: 68, guardia: 82, pase: 85, derribos: 78, leglocks: 80, finalizacion: 82 },
  },

  // 4. Adultos cinturón marrón & negro
  {
    alias: 'Rodrigo Santana',
    email: 'rodrigo.santana.brown@gmail.com',
    phone: '612345017',
    birthDate: '1985-05-25',
    isMinor: false,
    belt: 'BROWN',
    stripes: 2,
    beltSystem: 'ADULT',
    beltDate: '2024-02-10',
    pricingTier: 'SF',
    activeTariffId: 'tariff_sf_monthly_6000',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Marina Santana (Esposa)',
    emergencyContactPhone: '612345117',
    stats: { tecnica: 92, fuerza: 86, elasticidad: 75, guardia: 92, pase: 90, derribos: 84, leglocks: 90, finalizacion: 91 },
  },
  {
    alias: 'Héctor Carrillo',
    email: 'hector.carrillo.bjj@gmail.com',
    phone: '612345018',
    birthDate: '1984-11-17',
    isMinor: false,
    belt: 'BLACK',
    stripes: 1,
    beltSystem: 'ADULT',
    beltDate: '2022-09-14',
    pricingTier: 'SF',
    activeTariffId: 'tariff_sf_monthly_6000',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Irene Carrillo (Esposa)',
    emergencyContactPhone: '612345118',
    stats: { tecnica: 96, fuerza: 88, elasticidad: 82, guardia: 95, pase: 94, derribos: 88, leglocks: 94, finalizacion: 96 },
  },

  // 5. Infantiles / Juveniles (Kids & Teens BJJ)
  {
    alias: 'Lucas Romero (Kid)',
    email: 'tutor.lucas.romero@gmail.com',
    phone: '612345019',
    birthDate: '2014-06-12',
    isMinor: true,
    guardianName: 'Marcos Romero',
    guardianPhone: '612345119',
    guardianDni: '50123456K',
    guardianEmail: 'tutor.lucas.romero@gmail.com',
    belt: 'GREY',
    stripes: 3,
    beltSystem: 'KIDS',
    beltDate: '2026-04-10',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_5000',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Marcos Romero (Padre)',
    emergencyContactPhone: '612345119',
    stats: { tecnica: 55, fuerza: 40, elasticidad: 85, guardia: 60, pase: 55, derribos: 50, leglocks: 20, finalizacion: 50 },
  },
  {
    alias: 'Emma Beltrán (Teen)',
    email: 'tutor.emma.beltran@gmail.com',
    phone: '612345020',
    birthDate: '2011-09-03',
    isMinor: true,
    guardianName: 'Raquel Beltrán',
    guardianPhone: '612345120',
    guardianDni: '51987654M',
    guardianEmail: 'tutor.emma.beltran@gmail.com',
    belt: 'YELLOW',
    stripes: 2,
    beltSystem: 'KIDS',
    beltDate: '2026-02-18',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_5000',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Raquel Beltrán (Madre)',
    emergencyContactPhone: '612345120',
    stats: { tecnica: 68, fuerza: 50, elasticidad: 88, guardia: 72, pase: 65, derribos: 58, leglocks: 25, finalizacion: 64 },
  },
  {
    alias: 'Leo Sánchez (Kid)',
    email: 'tutor.leo.sanchez@gmail.com',
    phone: '612345021',
    birthDate: '2015-01-20',
    isMinor: true,
    guardianName: 'Diego Sánchez',
    guardianPhone: '612345121',
    guardianDni: '52345678P',
    guardianEmail: 'tutor.leo.sanchez@gmail.com',
    belt: 'GREY_WHITE',
    stripes: 1,
    beltSystem: 'KIDS',
    beltDate: '2026-06-05',
    pricingTier: 'FAM',
    activeTariffId: 'tariff_fam_monthly_5500',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Diego Sánchez (Padre)',
    emergencyContactPhone: '612345121',
    stats: { tecnica: 50, fuerza: 38, elasticidad: 82, guardia: 55, pase: 50, derribos: 48, leglocks: 15, finalizacion: 45 },
  },
  {
    alias: 'Martina Crespo (Teen)',
    email: 'tutor.martina.crespo@gmail.com',
    phone: '612345022',
    birthDate: '2010-04-14',
    isMinor: true,
    guardianName: 'Ana Crespo',
    guardianPhone: '612345122',
    guardianDni: '53456789R',
    guardianEmail: 'tutor.martina.crespo@gmail.com',
    belt: 'ORANGE',
    stripes: 2,
    beltSystem: 'KIDS',
    beltDate: '2025-12-15',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_5000',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Ana Crespo (Madre)',
    emergencyContactPhone: '612345122',
    stats: { tecnica: 74, fuerza: 56, elasticidad: 90, guardia: 78, pase: 70, derribos: 62, leglocks: 30, finalizacion: 72 },
  },

  // 6. Alumnos con bajas temporales (Freezes / Pausados)
  {
    alias: 'Gonzalo Peinado',
    email: 'gonzalo.peinado@gmail.com',
    phone: '612345023',
    birthDate: '1993-08-14',
    isMinor: false,
    belt: 'BLUE',
    stripes: 2,
    beltSystem: 'ADULT',
    beltDate: '2025-05-10',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_7500',
    accountStatus: 'PAUSED',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Carmen Peinado (Hermana)',
    emergencyContactPhone: '612345123',
    freezeReason: 'INJURY',
    freezeStartDate: '2026-10-15',
    freezeEndDate: '2026-12-01',
    stats: { tecnica: 72, fuerza: 74, elasticidad: 60, guardia: 70, pase: 72, derribos: 65, leglocks: 60, finalizacion: 70 },
  },
  {
    alias: 'Cristina Vega',
    email: 'cristina.vega.bjj@gmail.com',
    phone: '612345024',
    birthDate: '1996-02-28',
    isMinor: false,
    belt: 'WHITE',
    stripes: 3,
    beltSystem: 'ADULT',
    beltDate: '2026-02-01',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_7500',
    accountStatus: 'PAUSED',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Felipe Vega (Padre)',
    emergencyContactPhone: '612345124',
    freezeReason: 'OTHER',
    freezeStartDate: '2026-11-01',
    freezeEndDate: '2026-11-30',
    stats: { tecnica: 62, fuerza: 58, elasticidad: 70, guardia: 65, pase: 60, derribos: 55, leglocks: 45, finalizacion: 58 },
  },
  {
    alias: 'Iván Lozano',
    email: 'ivan.lozano.tatami@gmail.com',
    phone: '612345025',
    birthDate: '1991-10-19',
    isMinor: false,
    belt: 'PURPLE',
    stripes: 1,
    beltSystem: 'ADULT',
    beltDate: '2025-07-22',
    pricingTier: 'SF',
    activeTariffId: 'tariff_sf_monthly_6000',
    accountStatus: 'PAUSED',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Lucía Lozano (Esposa)',
    emergencyContactPhone: '612345125',
    freezeReason: 'OTHER',
    freezeStartDate: '2026-10-20',
    freezeEndDate: null, // Indefinido
    stats: { tecnica: 84, fuerza: 78, elasticidad: 70, guardia: 85, pase: 82, derribos: 75, leglocks: 78, finalizacion: 84 },
  },

  // 7. Alumnos en clase de prueba (TRIAL)
  {
    alias: 'Jorge Barroso (Prueba)',
    email: 'jorge.barroso.test@gmail.com',
    phone: '612345026',
    birthDate: '1998-05-12',
    isMinor: false,
    belt: 'WHITE',
    stripes: 0,
    beltSystem: 'ADULT',
    beltDate: '2026-11-05',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_drop_in_1500',
    accountStatus: 'TRIAL',
    paymentStatusCache: 'PENDING_VALIDATION',
    emergencyContactName: 'Manuel Barroso (Padre)',
    emergencyContactPhone: '612345126',
    trialScheduleId: 'sched-1-3',
    trialScheduleDetails: 'Lunes 18:30 — BJJ Gi Todos los niveles',
    trialStatus: 'CONFIRMED',
    stats: { tecnica: 45, fuerza: 65, elasticidad: 50, guardia: 45, pase: 50, derribos: 55, leglocks: 30, finalizacion: 40 },
  },
  {
    alias: 'Valeria Quintana (Prueba)',
    email: 'valeria.quintana@gmail.com',
    phone: '612345027',
    birthDate: '2000-08-17',
    isMinor: false,
    belt: 'WHITE',
    stripes: 0,
    beltSystem: 'ADULT',
    beltDate: '2026-11-06',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_drop_in_1500',
    accountStatus: 'TRIAL',
    paymentStatusCache: 'OK',
    emergencyContactName: 'Sandra Quintana (Madre)',
    emergencyContactPhone: '612345127',
    trialScheduleId: 'sched-2-3',
    trialScheduleDetails: 'Martes 18:30 — No-Gi Grappling',
    trialStatus: 'CONFIRMED',
    stats: { tecnica: 48, fuerza: 50, elasticidad: 70, guardia: 50, pase: 48, derribos: 45, leglocks: 30, finalizacion: 42 },
  },

  // 8. Alumnos pendientes de regularizar pago o inactivos
  {
    alias: 'Samuel Gallego',
    email: 'samuel.gallego@gmail.com',
    phone: '612345028',
    birthDate: '1994-12-05',
    isMinor: false,
    belt: 'WHITE',
    stripes: 2,
    beltSystem: 'ADULT',
    beltDate: '2026-04-12',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_7500',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'NOK',
    emergencyContactName: 'Eva Gallego (Hermana)',
    emergencyContactPhone: '612345128',
    stats: { tecnica: 60, fuerza: 70, elasticidad: 54, guardia: 58, pase: 66, derribos: 62, leglocks: 45, finalizacion: 58 },
  },
  {
    alias: 'Víctor Alarcón',
    email: 'victor.alarcon.bjj@gmail.com',
    phone: '612345029',
    birthDate: '1990-04-03',
    isMinor: false,
    belt: 'BLUE',
    stripes: 1,
    beltSystem: 'ADULT',
    beltDate: '2025-10-01',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_pass_11000',
    accountStatus: 'ACTIVE',
    paymentStatusCache: 'PENDING_VALIDATION',
    emergencyContactName: 'Sonia Alarcón (Hermana)',
    emergencyContactPhone: '612345129',
    stats: { tecnica: 72, fuerza: 72, elasticidad: 62, guardia: 70, pase: 74, derribos: 65, leglocks: 60, finalizacion: 70 },
  },
  {
    alias: 'Natalia Herrero',
    email: 'natalia.herrero@gmail.com',
    phone: '612345030',
    birthDate: '1997-01-15',
    isMinor: false,
    belt: 'WHITE',
    stripes: 1,
    beltSystem: 'ADULT',
    beltDate: '2026-03-20',
    pricingTier: 'STD',
    activeTariffId: 'tariff_std_monthly_7500',
    accountStatus: 'INACTIVE',
    paymentStatusCache: 'NOK',
    emergencyContactName: 'Pedro Herrero (Padre)',
    emergencyContactPhone: '612345130',
    stats: { tecnica: 56, fuerza: 54, elasticidad: 65, guardia: 56, pase: 54, derribos: 50, leglocks: 40, finalizacion: 52 },
  },
];

// Días de clases de lunes a viernes en noviembre 2026 (semana 1 de noviembre)
const WEEKDAY_DATES = [
  { date: '2026-11-02', dayOfWeek: 1 }, // Lunes
  { date: '2026-11-03', dayOfWeek: 2 }, // Martes
  { date: '2026-11-04', dayOfWeek: 3 }, // Miércoles
  { date: '2026-11-05', dayOfWeek: 4 }, // Jueves
  { date: '2026-11-06', dayOfWeek: 5 }, // Viernes
];

async function seed() {
  console.log(`[SEED] Iniciando inserción de ${MOCK_STUDENTS.length} alumnos ficticios en 247 STUDIO...`);

  let studentIdx = 1;
  const nowIso = new Date().toISOString();

  for (const s of MOCK_STUDENTS) {
    const uid = `mock-student-${String(studentIdx).padStart(2, '0')}`;
    studentIdx++;

    // 1. Documento de Usuario en 'users/{uid}'
    const userDoc = {
      uid,
      authEmail: s.email,
      contactEmail: s.email,
      alias: s.alias,
      phone: s.phone,
      birthDate: s.birthDate,
      isMinor: Boolean(s.isMinor),
      guardianName: s.guardianName || null,
      guardianPhone: s.guardianPhone || null,
      guardianDni: s.guardianDni || null,
      guardianEmail: s.guardianEmail || null,
      guardianUid: s.guardianUid || null,
      emergencyContactName: s.emergencyContactName,
      emergencyContactPhone: s.emergencyContactPhone,
      beltSystem: s.beltSystem,
      belt: s.belt,
      stripes: s.stripes,
      beltDate: s.beltDate,
      pricingTier: s.pricingTier,
      activeTariffId: s.activeTariffId,
      accountStatus: s.accountStatus,
      paymentStatusCache: s.paymentStatusCache,
      permissions: ['student'],
      waiverVersion: 'PRESENCIAL_V1',
      waiverSignedAt: '2026-09-01T10:00:00.000Z',
      stats: s.stats,
      photoUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(s.alias)}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (s.trialScheduleId) {
      userDoc.trialScheduleId = s.trialScheduleId;
      userDoc.trialScheduleDetails = s.trialScheduleDetails;
      userDoc.trialStatus = s.trialStatus;
    }

    await db.collection('users').doc(uid).set(userDoc, { merge: true });

    // 2. Documento en 'kiosk_members/{uid}' para el Kiosco del tatami
    const kioskDoc = {
      uid,
      alias: s.alias,
      belt: s.belt,
      stripes: s.stripes,
      activeTariffId: s.activeTariffId,
      accountStatus: s.accountStatus,
      paymentStatusCache: s.paymentStatusCache,
      photoUrl: userDoc.photoUrl,
      updatedAt: nowIso,
    };
    await db.collection('kiosk_members').doc(uid).set(kioskDoc, { merge: true });

    // 3. Pagos realistas para alumnos activos en 'payments'
    if (s.accountStatus === 'ACTIVE' || s.accountStatus === 'PAUSED') {
      const paymentId = `pay-202611-${uid}`;
      const amountCents = s.activeTariffId.includes('7500')
        ? 7500
        : s.activeTariffId.includes('6000')
        ? 6000
        : s.activeTariffId.includes('5500')
        ? 5500
        : s.activeTariffId.includes('5000')
        ? 5000
        : 11000;

      const isApproved = s.paymentStatusCache === 'OK';
      const isPending = s.paymentStatusCache === 'PENDING_VALIDATION';

      const paymentDoc = {
        id: paymentId,
        uid,
        period: '2026-11',
        method: studentIdx % 3 === 0 ? 'CARD' : studentIdx % 2 === 0 ? 'BIZUM' : 'CASH',
        status: isApproved ? 'APPROVED' : isPending ? 'PENDING_APPROVAL' : 'REJECTED',
        billingType: s.activeTariffId.includes('pass') ? 'PASS' : 'MONTHLY',
        concept: `Cuota Tatami Noviembre 2026 — ${s.alias}`,
        amountCents,
        baseCents: Math.round(amountCents / 1.21),
        vatCents: Math.round(amountCents - amountCents / 1.21),
        paidAt: isApproved ? '2026-11-01T12:00:00.000Z' : null,
        createdAt: '2026-11-01T09:00:00.000Z',
      };
      await db.collection('payments').doc(paymentId).set(paymentDoc, { merge: true });
    }

    // 4. Si tiene baja temporal, guardar en 'freezes'
    if (s.freezeReason) {
      const freezeId = `freeze-${uid}`;
      await db.collection('freezes').doc(freezeId).set({
        id: freezeId,
        uid,
        reason: s.freezeReason,
        startDate: s.freezeStartDate,
        endDate: s.freezeEndDate,
        openEnded: !s.freezeEndDate,
        createdAt: nowIso,
        createdBy: 'iOapIQTJCXamJni0v6FerYbdisk1',
      });
    }

    // 5. Asistencias realistas (Bookings) de lunes a viernes
    if (s.accountStatus === 'ACTIVE') {
      // Registrar 2 a 4 asistencias en la semana del 2 al 6 de noviembre
      const daysCount = (studentIdx % 3) + 2; // 2, 3 o 4 clases
      for (let i = 0; i < daysCount; i++) {
        const dayInfo = WEEKDAY_DATES[i];
        const scheduleId = `sched-${dayInfo.dayOfWeek}-3`; // 18:30 clase principal
        const bookingId = `book-${dayInfo.date}-${uid}`;

        await db.collection('bookings').doc(bookingId).set({
          id: bookingId,
          uid,
          scheduleId,
          date: dayInfo.date,
          status: 'ATTENDED',
          sessionType: 'PARTICIPANT',
          attendanceWeight: 1,
          checkInSource: studentIdx % 2 === 0 ? 'TABLET' : 'APP',
          createdAt: `${dayInfo.date}T10:00:00.000Z`,
        });
      }
    }

    process.stdout.write(`• Alumno sembrado: ${s.alias.padEnd(25)} [${s.belt.padEnd(6)} | ${s.accountStatus}]\n`);
  }

  // 6. Añadir 3 leads en 'leads' collection para tener prospectos en administración
  const MOCK_LEADS = [
    {
      id: 'lead-01',
      name: 'Fernando Ruiz',
      phone: '612345091',
      email: 'fernando.ruiz@gmail.com',
      interest: 'BJJ Principiantes',
      status: 'NEW',
      notes: 'Pregunta por horarios de tarde y disponibilidad de kimono de prueba.',
      createdAt: nowIso,
    },
    {
      id: 'lead-02',
      name: 'Laura Méndez',
      phone: '612345092',
      email: 'laura.mendez@outlook.com',
      interest: 'No-Gi Grappling',
      status: 'CONTACTED',
      notes: 'Tiene experiencia en judo, quiere probar la clase de los martes.',
      createdAt: nowIso,
    },
    {
      id: 'lead-03',
      name: 'Pablo Herrero (Papá de Tomás)',
      phone: '612345093',
      email: 'pablo.herrero@gmail.com',
      interest: 'Kids BJJ (8 años)',
      status: 'TRIAL_BOOKED',
      notes: 'Reservada prueba para el miércoles a las 17:30.',
      createdAt: nowIso,
    },
  ];

  for (const l of MOCK_LEADS) {
    await db.collection('leads').doc(l.id).set(l, { merge: true });
    console.log(`• Prospecto sembrado: ${l.name}`);
  }

  console.log(`\n[EXITO] Se cargaron correctamente 30 alumnos + 3 prospectos + pagos y asistencias en Firestore.`);
}

seed().catch((err) => {
  console.error('[FATAL] Error ejecutando seed:', err);
  process.exit(1);
});
