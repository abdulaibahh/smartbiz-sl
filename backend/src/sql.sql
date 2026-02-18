CREATE TABLE businesses (
  id SERIAL PRIMARY KEY,
  name TEXT,
  shop_name TEXT,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  trial_end TIMESTAMP,
  subscription_active BOOLEAN DEFAULT false
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT,
  business_id INTEGER REFERENCES businesses(id)
);

CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  business_id INTEGER REFERENCES businesses(id),
  total NUMERIC,
  paid NUMERIC,
  customer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  quantity INTEGER
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

