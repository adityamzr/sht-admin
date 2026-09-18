-- Final DB Code Generation Cleanup: remove legacy sequential defaults for active Tour operational codes
-- Active entities: CUS, ORD, JMH, TRP, VND, BKG, INV, PAY, EXP, STY, ROM
-- Legacy records remain valid, only stop using sequential defaults for NEW records
-- Estimation EST-* remains untouched
-- Sequences remain as harmless legacy infrastructure (not dropped)

-- Customers CUS
ALTER TABLE "tour_customers" ALTER COLUMN "customer_code" DROP DEFAULT;

-- Orders ORD
ALTER TABLE "tour_orders" ALTER COLUMN "order_code" DROP DEFAULT;

-- Jamaah JMH
ALTER TABLE "tour_jamaah" ALTER COLUMN "jamaah_code" DROP DEFAULT;

-- Trips TRP (was TRIP-)
ALTER TABLE "tour_trips" ALTER COLUMN "trip_code" DROP DEFAULT;

-- Vendors VND
ALTER TABLE "tour_vendors" ALTER COLUMN "vendor_code" DROP DEFAULT;

-- Bookings BKG
ALTER TABLE "tour_bookings" ALTER COLUMN "booking_code" DROP DEFAULT;

-- Invoices INV
ALTER TABLE "tour_invoices" ALTER COLUMN "invoice_code" DROP DEFAULT;

-- Payments PAY
ALTER TABLE "tour_payments" ALTER COLUMN "payment_code" DROP DEFAULT;

-- Expenses EXP
ALTER TABLE "tour_expenses" ALTER COLUMN "expense_code" DROP DEFAULT;

-- Accommodation Stays STY (was STAY-)
ALTER TABLE "tour_accommodation_stays" ALTER COLUMN "stay_code" DROP DEFAULT;

-- Accommodation Rooms ROM (was ROOM-)
ALTER TABLE "tour_accommodation_rooms" ALTER COLUMN "room_code" DROP DEFAULT;

-- Note: sequences tour_customers_seq etc remain, not dropped, per task preference
-- Estimation sequence estimation_seq and default EST-* remains untouched
