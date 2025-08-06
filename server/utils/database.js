const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, '../../database/ikf_phonebook.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connection successful');
  }
});

// Test database connection
const testConnection = async () => {
  return new Promise((resolve, reject) => {
    db.get('SELECT 1', (err, row) => {
      if (err) {
        console.error('❌ Database connection failed:', err.message);
        reject(err);
      } else {
        console.log('✅ Database connection successful');
        resolve(true);
      }
    });
  });
};

// Initialize database tables
const initializeDatabase = async () => {
  return new Promise((resolve, reject) => {
    // Create users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('❌ Users table creation failed:', err);
        reject(err);
        return;
      }
    });

    // Create contacts table
    db.run(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT,
        phone_number TEXT NOT NULL,
        email TEXT,
        relationship_type TEXT DEFAULT 'Other',
        data_owner TEXT,
        source TEXT NOT NULL,
        status TEXT DEFAULT 'Active',
        notes TEXT,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(phone_number, email)
      )
    `, (err) => {
      if (err) {
        console.error('❌ Contacts table creation failed:', err);
        reject(err);
        return;
      }
    });

    // Create import_sessions table for tracking imports
    db.run(`
      CREATE TABLE IF NOT EXISTS import_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        source_type TEXT NOT NULL,
        total_records INTEGER DEFAULT 0,
        successful_imports INTEGER DEFAULT 0,
        failed_imports INTEGER DEFAULT 0,
        duplicates_found INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `, (err) => {
      if (err) {
        console.error('❌ Import sessions table creation failed:', err);
        reject(err);
        return;
      }
    });

    // Create indexes for better performance
    db.run('CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone_number)');
    db.run('CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)');
    db.run('CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(data_owner)');
    db.run('CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(relationship_type)');
    db.run('CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source)');

    console.log('✅ Database tables initialized successfully');
    resolve();
  });
};

// Connect to database
const connectDatabase = async () => {
  try {
    await testConnection();
    await initializeDatabase();
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

// Get database instance
const getClient = () => db;

// Execute query with error handling
const executeQuery = async (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Query execution error:', err);
        reject(err);
      } else {
        resolve({ rows });
      }
    });
  });
};

// Execute single query (for INSERT, UPDATE, DELETE)
const executeSingleQuery = async (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        console.error('Query execution error:', err);
        reject(err);
      } else {
        resolve({ 
          rowCount: this.changes,
          insertId: this.lastID 
        });
      }
    });
  });
};

// Close database connection
const closeDatabase = async () => {
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
      resolve();
    });
  });
};

module.exports = {
  db,
  connectDatabase,
  getClient,
  executeQuery,
  executeSingleQuery,
  closeDatabase,
  testConnection
}; 