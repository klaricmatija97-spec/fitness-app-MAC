-- Fitness App Database Schema for Supabase
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Create clients table to store intake form submissions
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  honorific TEXT NOT NULL,
  age_range TEXT NOT NULL,
  weight_value NUMERIC NOT NULL,
  weight_unit TEXT NOT NULL CHECK (weight_unit IN ('kg', 'lb')),
  height_value NUMERIC NOT NULL,
  height_unit TEXT NOT NULL CHECK (height_unit IN ('cm', 'in')),
  activities TEXT[] NOT NULL DEFAULT '{}',
  goals TEXT[] NOT NULL DEFAULT '{}',
  diet_cleanliness INTEGER NOT NULL CHECK (diet_cleanliness >= 0 AND diet_cleanliness <= 100),
  other_activities TEXT,
  other_goals TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

-- Create client_programs table to link clients with their assigned plans
CREATE TABLE IF NOT EXISTS client_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  meal_plan_id TEXT,
  training_plan_id TEXT,
  phase TEXT DEFAULT 'intake',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on client_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_programs_client_id ON client_programs(client_id);

-- Enable Row Level Security (RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_programs ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your needs)
-- For now, we'll allow service role to insert/read (used by API routes)
-- In production, you may want to restrict this further

-- Allow service role full access (used by API with service_role_key)
CREATE POLICY "Service role can manage clients"
  ON clients
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage programs"
  ON client_programs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Optional: Allow authenticated users to read their own data
-- Uncomment if you implement user authentication later
-- CREATE POLICY "Users can read own client data"
--   ON clients
--   FOR SELECT
--   USING (auth.uid()::text = email);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at on clients table
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

