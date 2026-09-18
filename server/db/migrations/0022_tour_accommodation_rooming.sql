-- Tour Accommodation & Rooming V1 (idempotent)
CREATE SEQUENCE IF NOT EXISTS tour_accommodation_stays_seq START WITH 1;--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS tour_accommodation_rooms_seq START WITH 1;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS tour_accommodation_stays (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  stay_code TEXT NOT NULL DEFAULT ('STAY-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_accommodation_stays_seq')::text, 4, '0')),
  trip_id INTEGER NOT NULL REFERENCES tour_trips(id) ON DELETE CASCADE,
  booking_id INTEGER NOT NULL REFERENCES tour_bookings(id),
  hotel_name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Makkah',
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL CHECK (check_out_date >= check_in_date),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS tour_accommodation_stays_workspace_code_unique ON tour_accommodation_stays(workspace_id, stay_code);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_accommodation_stays_workspace_idx ON tour_accommodation_stays(workspace_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_accommodation_stays_trip_idx ON tour_accommodation_stays(trip_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_accommodation_stays_booking_idx ON tour_accommodation_stays(booking_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_accommodation_stays_checkin_idx ON tour_accommodation_stays(check_in_date);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_accommodation_stays_deleted_idx ON tour_accommodation_stays(deleted_at);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS tour_accommodation_stay_orders (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  stay_id INTEGER NOT NULL REFERENCES tour_accommodation_stays(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES tour_orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS tour_accommodation_stay_orders_stay_order_unique ON tour_accommodation_stay_orders(stay_id, order_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_accommodation_stay_orders_workspace_idx ON tour_accommodation_stay_orders(workspace_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_accommodation_stay_orders_stay_idx ON tour_accommodation_stay_orders(stay_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_accommodation_stay_orders_order_idx ON tour_accommodation_stay_orders(order_id);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS tour_accommodation_rooms (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  stay_id INTEGER NOT NULL REFERENCES tour_accommodation_stays(id) ON DELETE CASCADE,
  room_code TEXT NOT NULL DEFAULT ('ROOM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_accommodation_rooms_seq')::text, 4, '0')),
  room_label TEXT NOT NULL,
  room_number TEXT,
  room_type TEXT NOT NULL DEFAULT 'DOUBLE',
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  rooming_mode TEXT NOT NULL DEFAULT 'SAME_ORDER',
  order_id INTEGER REFERENCES tour_orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS tour_accommodation_rooms_workspace_code_unique ON tour_accommodation_rooms(workspace_id, room_code);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_accommodation_rooms_workspace_idx ON tour_accommodation_rooms(workspace_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_accommodation_rooms_stay_idx ON tour_accommodation_rooms(stay_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_accommodation_rooms_order_idx ON tour_accommodation_rooms(order_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_accommodation_rooms_type_idx ON tour_accommodation_rooms(room_type);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_accommodation_rooms_mode_idx ON tour_accommodation_rooms(rooming_mode);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_accommodation_rooms_deleted_idx ON tour_accommodation_rooms(deleted_at);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS tour_room_occupants (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  stay_id INTEGER NOT NULL REFERENCES tour_accommodation_stays(id) ON DELETE CASCADE,
  room_id INTEGER NOT NULL REFERENCES tour_accommodation_rooms(id) ON DELETE CASCADE,
  jamaah_id INTEGER NOT NULL REFERENCES tour_jamaah(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS tour_room_occupants_stay_jamaah_unique ON tour_room_occupants(stay_id, jamaah_id);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS tour_room_occupants_room_jamaah_unique ON tour_room_occupants(room_id, jamaah_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_room_occupants_workspace_idx ON tour_room_occupants(workspace_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_room_occupants_stay_idx ON tour_room_occupants(stay_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_room_occupants_room_idx ON tour_room_occupants(room_id);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS tour_room_occupants_jamaah_idx ON tour_room_occupants(jamaah_id);
