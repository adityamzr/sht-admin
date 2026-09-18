# Tour V1 Final Freeze Patch – Finance + Rooming Integrity Gaps Closed

**Branch:** `fix/tour-v1-freeze-patch` (from `fix/tour-v1-final-hardening` @ bdafd5a)
**Date:** 2026-09-18
**Status:** Ready for freeze, 226 tests pass, build 6.5 MB

## Context
Audit found 2 remaining gaps:
1. VERIFIED Payment/Expense could be VOIDed while mutating financial fields
2. Accommodation Stay could be soft-deleted with active Rooms/Occupants, bypassing Order↔Trip guard

## 1. Payment VERIFIED→VOID locking
**File:** `server/services/tour-finance.ts` `updateTourPayment`

- Before: VERIFIED→VOID allowed any field changes (gap)
- After: VERIFIED→VOID status-only:
  - Lock at minimum: invoiceId, orderId, paymentDate, amountIdr, method, accountOrChannel, referenceNumber, proofUrl, verifiedBy, verifiedAt
  - If patch contains any other key besides `status`, reject with "hanya bisa di-VOID tanpa mengubah X. Hanya status yang boleh berubah saat Void."
  - Also block any key if same value provided – enforce strict status-only
- Terminal lifecycle:
  - VERIFIED→DRAFT rejected
  - VERIFIED→other status rejected except VOID
  - VOID is terminal: VOID→VERIFIED/DRAFT rejected, financial fields immutable
- History preserved: amount, invoice, order, date, method, verification metadata unchanged, not zeroed, not deleted, excluded from totals as designed

## 2. Expense VERIFIED→VOID locking
Same rule applied:
- Lock: expenseDate, orderId, tripId, bookingId, vendorId, category, description, currency, amount, exchangeRateSnapshot, amountIdr, paymentMethod, referenceNumber, proofUrl, verifiedBy, verifiedAt
- VERIFIED→VOID status-only, any financial mutation rejected
- VOID terminal, excluded from verifiedExpenses, profitability, reports

## 3. Terminal lifecycle behavior
- Payment: DRAFT→VERIFIED→VOID, VOID terminal, DRAFT editable, VERIFIED immutable except VOID
- Expense: same
- Both use verifiedBy/verifiedAt server-side on DRAFT→VERIFIED, no voidedAt/voidedBy added (schema does not have, sufficient for V1)

## 4. Stay deletion guard
**File:** `server/services/tour-accommodation.ts` `softDeleteAccommodationStay`

Before: no check, could soft-delete with rooms/occupants
After:
- Query active rooms (notDeleted) where stayId
- If roomsCount>0:
  - If occupants>0 → "Akomodasi masih memiliki kamar atau jamaah yang dialokasikan. Kosongkan rooming terlebih dahulu."
  - Else → "Akomodasi masih memiliki kamar. Hapus kamar terlebih dahulu sebelum menghapus akomodasi."
- Also check orphan occupants
- No cascade delete

## 5. Room dependency behavior
- `softDeleteAccommodationRoom` already blocks if occupants exist: "Room masih ada occupant, keluarkan dulu sebelum hapus"
- Sequence enforced: Occupants → Room → Stay

## 6. Order/Trip Rooming integrity confirmation
- Stay delete guard prevents bypass: cannot delete Stay then unassign Order, because Stay deletion itself blocked while rooms/occupants exist
- Existing guards kept:
  - `unassignOrderFromTrip` checks StayOrders, Rooms SAME_ORDER, Occupants via Jamaah
  - Stay order scope cannot remove Order while Jamaah occupy Rooms

## 7. Tests added
**File:** `tests/tour-v1-freeze-patch.test.ts` 18 tests

Payment:
- A VERIFIED 10m VOID success amount remains 10m
- B VERIFIED 10m VOID+20m reject
- C VERIFIED→DRAFT reject
- D VOID→VERIFIED reject
- E VOID excluded from totals
- F VERIFIED field mutation without status change reject

Expense:
- A VERIFIED VOID success fields unchanged
- B amount changed reject
- C vendorId changed reject
- D VERIFIED→DRAFT reject
- E VOID→VERIFIED reject
- F VOID excluded from totals

Stay delete:
- A no Rooms allowed
- B 1 Room 0 Occupants rejected
- C 1 Room 2 Occupants rejected
- D Remove Occupants→delete Room→delete Stay allowed
- E Stay with Rooming tied to Order – delete blocked before bypass, unassign blocked
- Room cannot be deleted while occupants exist

Total: 226 tests pass (208 previous +18 new)

## 8. Manual UAT results

**Scenario A – Payment:**
- Create Invoice Rp30m, Verify Payment Rp30m
- Void Payment: Payment remains Rp30m status VOID, Invoice outstanding returns Rp30m, Cash Received decreases, attempt amount change while voiding fails ✅

**Scenario B – Expense:**
- Booking 350 SAR, Create+Verify Expense 350 SAR
- Void Expense: history still 350 SAR status VOID, Booking actual expense returns, change to 500 SAR while voiding fails ✅

**Scenario C – Stay:**
- Create Trip/Order/Hotel Booking/Stay/Room/Occupant
- Attempt Delete Stay → blocked "Akomodasi masih memiliki kamar..." ✅
- Remove Occupant → Delete Room → Delete Stay success ✅

## 9. Full test result
`npm test` → 226 tests, 32 suites, 0 fail, duration ~30s

## 10. Typecheck/lint
- vue-tsc: pre-existing errors in tests due to esModuleInterop flag (unrelated to this patch), not blocking build
- Production build passes

## 11. Production build result
`npx nuxt build` → Client 2118 modules, Server 322 modules, Total 6.5 MB (1.49 MB gzip), `.output/server/index.mjs` exists

## 12. Files changed
- server/services/tour-finance.ts (Payment & Expense VOID status-only, terminal)
- server/services/tour-accommodation.ts (Stay delete guard)
- pages/tour/finance/payments/index.vue (Void modal explanatory text)
- pages/tour/finance/expenses/index.vue (Void modal explanatory text)
- tests/tour-v1-freeze-patch.test.ts (new 18 tests)
- PHASE_FREEZE_PATCH_REPORT.md (new)

## 13. Migration changes
None – no schema changes, uses existing status enum, preserves history, no voidedAt/voidedBy added as per spec

## 14. Commit
`fix(tour): close final finance and rooming integrity gaps` (to be created)

## 15. Branch/push status
Branch `fix/tour-v1-freeze-patch`, push via PAT to origin

## 16. Remaining blocker to Tour V1 freeze
None – all acceptance criteria pass:

Payment:
✓ VERIFIED→VOID works
✓ transaction fields unchanged during Void
✓ VERIFIED→VOID+field mutation rejected
✓ VOID terminal
✓ VOID excluded from financial totals

Expense:
✓ VERIFIED→VOID works
✓ transaction fields unchanged during Void
✓ financial mutation during Void rejected
✓ VOID terminal
✓ VOID excluded from actual expenses

Rooming:
✓ Stay cannot be deleted with active Rooms
✓ Stay cannot hide active Occupants through soft-delete
✓ Room must be cleared before deletion
✓ explicit cleanup sequence enforced
✓ Order/Trip integrity cannot be bypassed by deleting Stay

Regression:
✓ Finance calculations reconcile
✓ Rooming still works
✓ Operations unaffected

Quality:
✓ full tests pass 226
✓ production build passes 6.5 MB

**Ready for Tour V1 freeze.**
