-- Kuwait Re Analytics Database Schema
-- PostgreSQL implementation

-- Create database (run this separately)
-- CREATE DATABASE kuwaitre;

-- Policies table - main data table
CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER,
    quarter INTEGER,
    com_date DATE,
    inception_year INTEGER,
    premium DECIMAL(15,2) DEFAULT 0,
    gross_book_prem DECIMAL(15,2) DEFAULT 0,
    gross_uw_prem DECIMAL(15,2) DEFAULT 0,
    gross_actual_acq DECIMAL(15,2) DEFAULT 0,
    gross_paid_claims DECIMAL(15,2) DEFAULT 0,
    gross_os_loss DECIMAL(15,2) DEFAULT 0,
    incurred DECIMAL(15,2) DEFAULT 0,
    country_name VARCHAR(255),
    hub VARCHAR(255),
    region VARCHAR(255),
    cedant VARCHAR(255),
    insured VARCHAR(255),
    country_name_norm VARCHAR(255),
    hub_norm VARCHAR(255),
    region_norm VARCHAR(255),
    cedant_norm VARCHAR(255),
    insured_norm VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_policies_year ON policies(year);
CREATE INDEX IF NOT EXISTS idx_policies_country ON policies(country_name_norm);
CREATE INDEX IF NOT EXISTS idx_policies_hub ON policies(hub_norm);
CREATE INDEX IF NOT EXISTS idx_policies_region ON policies(region_norm);
CREATE INDEX IF NOT EXISTS idx_policies_cedant ON policies(cedant_norm);
CREATE INDEX IF NOT EXISTS idx_policies_insured ON policies(insured_norm);
CREATE INDEX IF NOT EXISTS idx_policies_com_date ON policies(com_date);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_policies_updated_at 
    BEFORE UPDATE ON policies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

