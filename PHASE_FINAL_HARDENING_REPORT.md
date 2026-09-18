# Tour V1 Final Micro-Hardening – Finance + Rooming Data Integrity Lock

**Branch:** `fix/tour-v1-final-hardening` (from `feat/tour-rooming-v1` @ 1bdefa1)
**Date:** 2026-09-18
**Status:** Complete, 208 tests pass, vue-tsc green, build 6.49 MB

## Implemented

### Payment selector eligible query (server-authoritative)
- `listEligibleInvoicesForPayment` in `server/services/tour-finance.ts`
- Returns only ISSUED where outstanding>0 (amount - SUM VERIFIED)
- New API `GET /api/admin/tour/invoices/eligible` (pageSize 100, search, orderId)
- Valid for UI/n8n/direct API, not rely on label
- Frontend `pages/tour/finance/payments/index.vue` now uses eligible endpoint, label human-readable `INV-xxx · ORD-xxx · Name · Invoice RpX · Outstanding RpY · UNPAID/PARTIAL`, no raw IDs, no PAID
- Empty state: "Belum ada Invoice ISSUED yang memiliki sisa tagihan." + "Invoice harus berstatus ISSUED dan memiliki outstanding tagihan >0..."
- Edit DRAFT preserves current Invoice even if not eligible, but VERIFY must still be ISSUED with sufficient outstanding
- VERIFIED immutable: cannot change to another Invoice

### Amount validation & concurrency
- Frontend outstanding informational, shows Outstanding line
- Server recalc at VERIFY: `SUM VERIFIED WHERE id != current` latest, rejects stale overpayment with message "Nominal pembayaran melebihi sisa tagihan RpX."
- Amount >0 validation

### Invoice ISSUED immutability
- `updateTourInvoice`:
  - CANCELLED terminal read-only, cannot reopen
  - ISSUED locks orderId, amountIdr, issueDate, dueDate, description – reject with "buat Invoice baru untuk koreksi (cancel/create)"
  - DRAFT editable, DRAFT→CANCELLED blocked (use delete), ISSUED only Cancel allowed
  - Date validation merged existing+patch

### Cannot cancel Invoice with VERIFIED Payment
- Block ISSUED→CANCELLED if VERIFIED payment exists, message "Invoice memiliki pembayaran terverifikasi. Void pembayaran terlebih dahulu sebelum membatalkan Invoice."
- After VOID allowed

### Payment PATCH consistency
- Enforces payment.orderId == invoice.orderId invariant
- If invoiceId changes, derives/validates orderId, rejects mismatch "Order A + Invoice Order B"

### Order↔Trip unassign guard
- `unassignOrderFromTrip` checks Accommodation Stay order scope, Rooms SAME_ORDER targeting, Room occupants from Order Jamaah
- Blocks with "Order masih digunakan dalam Rooming Trip ini. Hapus alokasi kamar/Order dari Accommodation terlebih dahulu."
- No auto destroy

### Room SHARED→SAME_ORDER patch validation
- Computes final merged state, SAME_ORDER requires orderId
- Rejects SAME_ORDER+null

### SAME_ORDER order validation
- Order must same workspace, belong Trip, included Stay, compatible with existing occupants
- Changing order with occupants validates all occupants, rejects incompatible

### Accommodation Stay HOTEL Booking strictness
- Must ref Booking Type=HOTEL AND Booking.tripId=Stay.tripId, reject tripId null, reject mismatched Trip, UI+server match

### Stay Order Scope
- Every Order in Stay same workspace + assigned to Trip, block removing Order while its Jamaah occupy Rooms

### Historical safety
- No hard-delete meaningful Invoice/Payment/Expense/Stay/Room/Occupant to satisfy relations, prefer explicit lifecycle

### Tests
- `tests/tour-v1-final-hardening.test.ts` 13 tests covering selector, validation, invoice, rooming
- Total 208 tests pass, vue-tsc green, build 6.49 MB (1.49 MB gzip)

### UAT
- A PAID disappears: eligible filter excludes PAID
- B PARTIAL flow: outstanding computed, VERIFY recalc, overpayment blocked
- C Rooming guard: unassign blocked if used in Stay/Rooms/Occupants
- D SAME_ORDER patch: orderId REQUIRED validated
- E HOTEL booking null: rejected

## Files changed
- server/services/tour-finance.ts
- server/services/tour-accommodation.ts
- server/services/tour-operations.ts
- server/api/admin/tour/invoices/eligible.get.ts (new)
- pages/tour/finance/payments/index.vue
- tests/tour-v1-final-hardening.test.ts (new)

## Commit
fix(tour): lock final finance and rooming integrity

## Acceptance checklist
All items 2-24 from spec satisfied.
