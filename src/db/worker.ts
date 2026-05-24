// src/db/worker.ts
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let db: any;

const initDb = async () => {
  const sqlite3 = await sqlite3InitModule();
  console.log('SQLite3 version:', sqlite3.version.libVersion);
  console.log('Is secure context:', self.isSecureContext);
  console.log('SharedArrayBuffer available:', typeof SharedArrayBuffer !== 'undefined');

  try {
    if ('opfs' in sqlite3) {
      db = new sqlite3.oo1.OpfsDb('/stock_connoisseur.db');
      console.log('Using OPFS persistence:', db.filename);
    } else {
      console.warn('OPFS not available, falling back to transient storage');
      db = new sqlite3.oo1.DB('/stock_connoisseur.db', 'ct');
    }
  } catch (err) {
    console.error('Failed to initialize database:', err);
    // Fallback to in-memory if everything fails
    db = new sqlite3.oo1.DB();
  }
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS stocks (
      symbol TEXT PRIMARY KEY,
      name TEXT,
      market TEXT,
      currency TEXT,
      notes TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    -- Migration: Add notes if it doesn't exist
    PRAGMA table_info(stocks);
  `);

  // Simple migration check for existing tables
  const columns = db.exec("PRAGMA table_info(stocks)", { returnValue: 'resultRows' });
  const hasNotes = columns.some((col: any) => col[1] === 'notes');
  if (!hasNotes) {
    db.exec("ALTER TABLE stocks ADD COLUMN notes TEXT;");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      symbol TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      price REAL,
      pe_ratio REAL,
      market_cap REAL,
      sma_200 REAL,
      rsi REAL,
      score REAL,
      FOREIGN KEY(symbol) REFERENCES stocks(symbol)
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY,
      symbol TEXT,
      event_type TEXT,
      event_date DATE,
      notified BOOLEAN DEFAULT 0,
      FOREIGN KEY(symbol) REFERENCES stocks(symbol)
    );
  `);
};

self.onmessage = async (e) => {
  const { type, payload, id } = e.data;
  if (type === 'init') {
    await initDb();
    self.postMessage({ type: 'init-complete', id });
  } else if (type === 'query') {
    const result = db.exec(payload, { returnValue: 'resultRows' });
    self.postMessage({ type: 'query-result', payload: result, id });
  }
};
