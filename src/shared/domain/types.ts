/**
 * Entidades y tipos de dominio puro de 247Studio WebApp.
 * Agnósticos a frameworks (React, Firebase) e I/O.
 */

export type Role = 'student' | 'admin' | 'kiosk';

export type AccountStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'FROZEN' | 'SUSPENDED' | 'INACTIVE';

export type BeltSystem = 'ADULT' | 'KIDS';

export type AdultBelt = 'WHITE' | 'BLUE' | 'PURPLE' | 'BROWN' | 'BLACK';

export type KidsBelt =
  | 'WHITE'
  | 'GREY_WHITE'
  | 'GREY'
  | 'GREY_BLACK'
  | 'YELLOW_WHITE'
  | 'YELLOW'
  | 'YELLOW_BLACK'
  | 'ORANGE_WHITE'
  | 'ORANGE'
  | 'ORANGE_BLACK'
  | 'GREEN_WHITE'
  | 'GREEN'
  | 'GREEN_BLACK';

export type Belt = AdultBelt | KidsBelt;

export type PricingTier = 'STD' | 'SF' | 'FAM';

export type BillingType = 'MONTHLY' | 'PASS' | 'DROP_IN';

export type PaymentMethod = 'BIZUM' | 'CASH';

export type PaymentStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export type DerivedPaymentStatus = 'OK' | 'PENDING_VALIDATION' | 'GRACE' | 'NOK';

export type BookingStatus = 'BOOKED' | 'WAITLISTED' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED';

export type SessionType = 'PARTICIPANT' | 'OBSERVER' | 'GRADUATION_CLASS';

export type CheckInSource = 'ADMIN' | 'TABLET' | 'APP' | 'MANUAL';

export type RetentionRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export type AthleteCategory = 'KID' | 'ADULT';

export interface FighterStats {
  tecnica: number;      // 0-100 (Técnica)
  fuerza: number;       // 0-100 (Fuerza)
  elasticidad: number;  // 0-100 (Elasticidad)
  guardia: number;      // 0-100 (Guardia)
  pase: number;         // 0-100 (Pase de Guardia)
  derribos: number;     // 0-100 (Derribos / Takedowns)
  leglocks: number;     // 0-100 (Leglocks / Ataques a pierna)
  finalizacion: number; // 0-100 (Finalización / Submissions)
}

export interface UserDomainModel {
  uid: string;
  authEmail: string;
  contactEmail: string;
  alias: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  birthDate: string; // YYYY-MM-DD
  isMinor: boolean;
  guardianUid?: string;
  beltSystem: BeltSystem;
  belt: Belt;
  stripes: number; // 0..4
  beltDate: string; // YYYY-MM-DD
  stats?: FighterStats;
  pricingTier: PricingTier;
  activeTariffId: string;
  accountStatus: AccountStatus;
  paymentStatusCache?: DerivedPaymentStatus;
  medicalNotes?: string;
  medicalConsentAt?: string; // ISO String
  medicalConsentVersion?: string;
  waiverVersion?: string;
  waiverSignedAt?: string; // ISO String
  waiverSignatureSvg?: string;
  waiverSignedByUid?: string;
  photoUrl?: string;
  permissions: string[];
  retentionRiskCache?: RetentionRisk;
  createdAt: string;
  updatedAt: string;
}

export interface BookingDomainModel {
  id: string;
  uid: string;
  scheduleId: string;
  date: string; // YYYY-MM-DD
  status: BookingStatus;
  sessionType: SessionType;
  attendanceWeight: number;
  checkInSource: CheckInSource;
  createdAt: string;
  cancelledAt?: string;
}

export interface PaymentDomainModel {
  id: string;
  uid: string;
  period: string; // YYYY-MM
  method: PaymentMethod;
  status: PaymentStatus;
  billingType: BillingType;
  bookingId?: string;
  sessionsIncluded?: number;
  amountCents?: number;
  baseCents?: number;
  vatCents?: number;
  validatedBy?: string;
  validatedAt?: string;
  rejectedReason?: string;
  createdAt: string;
}

export interface FreezeDomainModel {
  id: string;
  uid: string;
  reason: 'INJURY' | 'OTHER';
  startDate: string; // ISO o YYYY-MM-DD
  endDate?: string;
  openEnded: boolean;
  createdAt: string;
  createdBy: string;
}

export interface ScheduleDomainModel {
  id: string;
  dayOfWeek: number; // 1 = Lunes, 7 = Domingo
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  professor: string;
  program: string;
  capacity?: number;
  active: boolean;
}

export interface ScheduleExceptionDomainModel {
  id: string;
  scheduleId: string;
  date: string; // YYYY-MM-DD
  reason: string;
  createdAt: string;
  createdBy: string;
}

export interface TariffDomainModel {
  id: string;
  name: string;
  programs: string[];
  tier: PricingTier;
  billingType: BillingType;
  priceCents: number;
  vatRate: number;
  active: boolean;
}

export interface AppConfigDomainModel {
  cancellationDeadlineHours: number;
  waiverVersion: string;
  medicalConsentVersion: string;
}
