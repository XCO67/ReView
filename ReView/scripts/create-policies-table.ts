import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

async function createPoliciesTable() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env file');
    process.exit(1);
  }

  console.log('🔌 Connecting to Railway database...');
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('📝 Creating policies table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS policies (
        id SERIAL PRIMARY KEY,
        uy VARCHAR(50),
        ext_type VARCHAR(100),
        srl VARCHAR(100),
        loc VARCHAR(100),
        class_name VARCHAR(200),
        sub_class VARCHAR(200),
        ced_territory VARCHAR(200),
        broker VARCHAR(200) NOT NULL,
        cedant VARCHAR(200) NOT NULL,
        org_insured_trty_name VARCHAR(500) NOT NULL,
        country_name VARCHAR(200) NOT NULL,
        region VARCHAR(100) NOT NULL,
        hub VARCHAR(100) NOT NULL,
        office VARCHAR(100),
        grs_prem_kd DECIMAL(15, 2) DEFAULT 0,
        acq_cost_kd DECIMAL(15, 2) DEFAULT 0,
        paid_claims_kd DECIMAL(15, 2) DEFAULT 0,
        os_claim_kd DECIMAL(15, 2) DEFAULT 0,
        inc_claim_kd DECIMAL(15, 2) DEFAULT 0,
        max_liability_kd DECIMAL(15, 2) DEFAULT 0,
        sign_share_pct DECIMAL(10, 4) DEFAULT 0,
        written_share_pct DECIMAL(10, 4),
        inception_day INTEGER,
        inception_month INTEGER,
        inception_quarter VARCHAR(10),
        inception_year INTEGER,
        expiry_day INTEGER,
        expiry_month INTEGER,
        expiry_quarter VARCHAR(10),
        expiry_year INTEGER,
        renewal_date VARCHAR(50),
        renewal_day INTEGER,
        renewal_month INTEGER,
        renewal_quarter VARCHAR(10),
        renewal_year INTEGER,
        source VARCHAR(200),
        policy_status VARCHAR(100),
        channel VARCHAR(100),
        arrangement VARCHAR(100),
        com_date DATE,
        expiry_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Policies table created successfully!');

    console.log('📊 Creating indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_policies_inception_year ON policies(inception_year);
      CREATE INDEX IF NOT EXISTS idx_policies_country_name ON policies(country_name);
      CREATE INDEX IF NOT EXISTS idx_policies_cedant ON policies(cedant);
      CREATE INDEX IF NOT EXISTS idx_policies_broker ON policies(broker);
      CREATE INDEX IF NOT EXISTS idx_policies_region ON policies(region);
    `);

    console.log('✅ Indexes created successfully!');
    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createPoliciesTable();

