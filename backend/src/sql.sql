-- =============================================
-- SMARTBIZ-SL DATABASE SCHEMA
-- =============================================

CREATE TABLE businesses (
  id SERIAL PRIMARY KEY,
  name TEXT,
  shop_name TEXT,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  trial_end TIMESTAMP,
  subscription_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'cashier',
  business_id INTEGER REFERENCES businesses(id),
  password_reset_token TEXT,
  password_reset_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens table

CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id),
  customer_id INTEGER REFERENCES customers(id),
  user_id INTEGER REFERENCES users(id),
  total NUMERIC NOT NULL,
  paid NUMERIC DEFAULT 0,
  customer TEXT,
  sale_type TEXT DEFAULT 'cash', -- 'cash' or 'credit'
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
  notes TEXT,
  receipt_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id),
  active BOOLEAN DEFAULT true,
  end_date TIMESTAMP
);


CREATE TABLE debts (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id),
  customer TEXT,
  amount NUMERIC,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id),
  product TEXT,
  quantity INTEGER,
  cost_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales items table for detailed tracking

CREATE TABLE sales_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER REFERENCES sales(id),
  product_id INTEGER REFERENCES inventory(id),
  product_name TEXT,
  quantity INTEGER,
  unit_price NUMERIC,
  total NUMERIC,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE platform_admins (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  password TEXT
);

SELECT COUNT(*) FROM businesses WHERE subscription_active=true;


CREATE TABLE stripe_events (
  id SERIAL PRIMARY KEY,
  event_id TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE subscription_payments (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id),
  payment_method TEXT,
  transaction_id TEXT,
  sender_number TEXT,
  amount NUMERIC,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Orders from suppliers table

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id),
  supplier_name TEXT NOT NULL,
  supplier_contact TEXT,
  order_date DATE DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  status TEXT DEFAULT 'pending', -- 'pending', 'received', 'cancelled'
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES inventory(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Supplier payments table

CREATE TABLE supplier_payments (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id),
  order_id INTEGER REFERENCES orders(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT, -- 'cash', 'orange_money', 'bank_transfer'
  reference_number TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Update debts table to include customer_id

ALTER TABLE debts ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id);
ALTER TABLE debts ADD COLUMN IF NOT EXISTS sale_id INTEGER REFERENCES sales(id);
ALTER TABLE debts ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 0;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE debts ADD COLUMN IF NOT EXISTS due_date DATE;

