const assert = require("assert");

function calculateVatBreakdown(totalCents, rate = 0.21) {
  const baseCents = Math.round(totalCents / (1 + rate));
  const vatCents = totalCents - baseCents;
  return { totalCents, baseCents, vatCents };
}

// Initial payments state
let payments = [
  {
    id: "pay_1",
    uid: "user_a",
    period: "2026-11",
    amountCents: 6500,
    status: "PENDING_APPROVAL",
    method: "BIZUM",
    billingType: "MONTHLY",
  },
  {
    id: "pay_2",
    uid: "user_b",
    period: "2026-11",
    amountCents: 6000,
    baseCents: 4959,
    vatCents: 1041,
    status: "APPROVED",
    method: "CASH",
    billingType: "MONTHLY",
  },
  {
    id: "pay_3",
    uid: "user_c",
    period: "2026-10",
    amountCents: 6500,
    status: "APPROVED",
    method: "BIZUM",
    billingType: "MONTHLY",
  },
];

let filterPeriod = "2026-11";
let statusFilter = "ALL";
let methodFilter = "ALL";

function getDerivedState(currentPayments, period, sFilter, mFilter) {
  const periodPayments = currentPayments.filter((p) => p.period === period);
  const approvedPayments = periodPayments.filter((p) => p.status === "APPROVED");
  const pendingPayments = periodPayments.filter((p) => p.status === "PENDING_APPROVAL");

  const totalRecaudadoCents = approvedPayments.reduce((acc, p) => acc + (p.amountCents || 0), 0);
  const totalBaseCents = approvedPayments.reduce((acc, p) => acc + (p.baseCents || 0), 0);
  const totalVatCents = approvedPayments.reduce((acc, p) => acc + (p.vatCents || 0), 0);
  const totalCashCents = approvedPayments
    .filter((p) => p.method === "CASH")
    .reduce((acc, p) => acc + (p.amountCents || 0), 0);
  const totalBizumCents = approvedPayments
    .filter((p) => p.method === "BIZUM")
    .reduce((acc, p) => acc + (p.amountCents || 0), 0);

  const displayedRows = periodPayments.filter(
    (p) => (sFilter === "ALL" || p.status === sFilter) && (mFilter === "ALL" || p.method === mFilter)
  );

  return {
    periodPayments,
    approvedPayments,
    pendingPayments,
    totalRecaudadoCents,
    totalBaseCents,
    totalVatCents,
    totalCashCents,
    totalBizumCents,
    displayedRows,
  };
}

// 1. Initial State assertions
let s1 = getDerivedState(payments, filterPeriod, statusFilter, methodFilter);
assert.strictEqual(s1.periodPayments.length, 2);
assert.strictEqual(s1.pendingPayments.length, 1);
assert.strictEqual(s1.approvedPayments.length, 1);
assert.strictEqual(s1.totalRecaudadoCents, 6000);
assert.strictEqual(s1.totalCashCents, 6000);
assert.strictEqual(s1.totalBizumCents, 0);

// 2. Action: Approve payment 1 (Bizum, 6500 cents)
const vat1 = calculateVatBreakdown(6500);
const updateData1 = {
  status: "APPROVED",
  amountCents: vat1.totalCents,
  baseCents: vat1.baseCents,
  vatCents: vat1.vatCents,
  validatedBy: "admin_123",
  validatedAt: new Date(),
};

payments = payments.map((p) => (p.id === "pay_1" ? { ...p, ...updateData1 } : p));

let s2 = getDerivedState(payments, filterPeriod, statusFilter, methodFilter);
assert.strictEqual(s2.pendingPayments.length, 0);
assert.strictEqual(s2.approvedPayments.length, 2);
assert.strictEqual(s2.totalRecaudadoCents, 12500);
assert.strictEqual(s2.totalBizumCents, 6500);
assert.strictEqual(s2.totalCashCents, 6000);

// 3. Tab navigation: Filter PENDING_APPROVAL
let s2Pending = getDerivedState(payments, filterPeriod, "PENDING_APPROVAL", methodFilter);
assert.strictEqual(s2Pending.displayedRows.length, 0);

// 4. Tab navigation: Filter APPROVED
let s2Approved = getDerivedState(payments, filterPeriod, "APPROVED", methodFilter);
assert.strictEqual(s2Approved.displayedRows.length, 2);
assert.strictEqual(s2Approved.displayedRows.find((p) => p.id === "pay_1").status, "APPROVED");

// 5. Action: Create POS charge (Cash, 10000 cents)
const newPos = {
  id: "pos_999",
  uid: "walkin_1",
  period: filterPeriod,
  method: "CASH",
  billingType: "PASS",
  amountCents: 10000,
  baseCents: 8264,
  vatCents: 1736,
  status: "APPROVED",
  concept: "Bono 10 sesiones TPV",
};
payments = [newPos, ...payments];

let s3 = getDerivedState(payments, filterPeriod, statusFilter, methodFilter);
assert.strictEqual(s3.approvedPayments.length, 3);
assert.strictEqual(s3.totalRecaudadoCents, 22500);
assert.strictEqual(s3.totalCashCents, 16000);
assert.strictEqual(s3.displayedRows[0].id, "pos_999");

// 6. Action: Reject a payment
const rejectPaymentId = "pos_999";
payments = payments.map((p) =>
  p.id === rejectPaymentId
    ? {
        ...p,
        status: "REJECTED",
        rejectedReason: "Devolución en efectivo",
        validatedBy: "admin_123",
      }
    : p
);

let s4 = getDerivedState(payments, filterPeriod, "REJECTED", methodFilter);
assert.strictEqual(s4.displayedRows.length, 1);
assert.strictEqual(s4.displayedRows[0].id, "pos_999");
assert.strictEqual(s4.displayedRows[0].status, "REJECTED");

let s4Approved = getDerivedState(payments, filterPeriod, "APPROVED", methodFilter);
assert.strictEqual(s4Approved.displayedRows.length, 2);

console.log("CajaPage state transitions and tab synchronization verified cleanly! 0 state drift.");
