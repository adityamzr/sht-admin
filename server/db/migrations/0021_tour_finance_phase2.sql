-- Tour Finance Phase 2: Invoices, Payments, Expenses
CREATE SEQUENCE tour_invoices_seq START WITH 1;
CREATE SEQUENCE tour_payments_seq START WITH 1;
CREATE SEQUENCE tour_expenses_seq START WITH 1;

CREATE TABLE tour_invoices (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  invoice_code TEXT NOT NULL DEFAULT ('INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_invoices_seq')::text, 4, '0')),
  order_id INTEGER NOT NULL REFERENCES tour_orders(id),
  issue_date DATE NOT NULL,
  due_date DATE,
  description TEXT,
  amount_idr NUMERIC(18,2) NOT NULL CHECK (amount_idr > 0),
  state TEXT NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  created_by INTEGER REFERENCES admin_users(id),
  updated_by INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX tour_invoices_workspace_code_unique ON tour_invoices(workspace_id, invoice_code);
CREATE INDEX tour_invoices_workspace_idx ON tour_invoices(workspace_id);
CREATE INDEX tour_invoices_order_idx ON tour_invoices(order_id);
CREATE INDEX tour_invoices_state_idx ON tour_invoices(state);
CREATE INDEX tour_invoices_issue_date_idx ON tour_invoices(issue_date);
CREATE INDEX tour_invoices_due_date_idx ON tour_invoices(due_date);
CREATE INDEX tour_invoices_deleted_idx ON tour_invoices(deleted_at);

CREATE TABLE tour_payments (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  payment_code TEXT NOT NULL DEFAULT ('PAY-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_payments_seq')::text, 4, '0')),
  invoice_id INTEGER NOT NULL REFERENCES tour_invoices(id),
  order_id INTEGER NOT NULL REFERENCES tour_orders(id),
  payment_date DATE NOT NULL,
  amount_idr NUMERIC(18,2) NOT NULL CHECK (amount_idr > 0),
  method TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
  account_or_channel TEXT,
  reference_number TEXT,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  verified_by INTEGER REFERENCES admin_users(id),
  verified_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES admin_users(id),
  updated_by INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX tour_payments_workspace_code_unique ON tour_payments(workspace_id, payment_code);
CREATE INDEX tour_payments_workspace_idx ON tour_payments(workspace_id);
CREATE INDEX tour_payments_invoice_idx ON tour_payments(invoice_id);
CREATE INDEX tour_payments_order_idx ON tour_payments(order_id);
CREATE INDEX tour_payments_status_idx ON tour_payments(status);
CREATE INDEX tour_payments_date_idx ON tour_payments(payment_date);
CREATE INDEX tour_payments_deleted_idx ON tour_payments(deleted_at);

CREATE TABLE tour_expenses (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id),
  expense_code TEXT NOT NULL DEFAULT ('EXP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('tour_expenses_seq')::text, 4, '0')),
  expense_date DATE NOT NULL,
  order_id INTEGER REFERENCES tour_orders(id),
  trip_id INTEGER REFERENCES tour_trips(id),
  booking_id INTEGER REFERENCES tour_bookings(id),
  vendor_id INTEGER REFERENCES tour_vendors(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'IDR',
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  exchange_rate_snapshot NUMERIC(18,6),
  amount_idr NUMERIC(18,2) NOT NULL CHECK (amount_idr > 0),
  status TEXT NOT NULL DEFAULT 'DRAFT',
  payment_method TEXT,
  reference_number TEXT,
  proof_url TEXT,
  notes TEXT,
  verified_by INTEGER REFERENCES admin_users(id),
  verified_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES admin_users(id),
  updated_by INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX tour_expenses_workspace_code_unique ON tour_expenses(workspace_id, expense_code);
CREATE INDEX tour_expenses_workspace_idx ON tour_expenses(workspace_id);
CREATE INDEX tour_expenses_order_idx ON tour_expenses(order_id);
CREATE INDEX tour_expenses_trip_idx ON tour_expenses(trip_id);
CREATE INDEX tour_expenses_booking_idx ON tour_expenses(booking_id);
CREATE INDEX tour_expenses_vendor_idx ON tour_expenses(vendor_id);
CREATE INDEX tour_expenses_category_idx ON tour_expenses(category);
CREATE INDEX tour_expenses_status_idx ON tour_expenses(status);
CREATE INDEX tour_expenses_date_idx ON tour_expenses(expense_date);
CREATE INDEX tour_expenses_deleted_idx ON tour_expenses(deleted_at);
