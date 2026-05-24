# Stock Connoisseur Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local-first PWA for stock picking and tracking earnings reports using SQLite WASM and yfinance.

**Architecture:** React PWA with a separate Web Worker for SQLite WASM (OPFS) to ensure UI responsiveness. Data is fetched via a CORS proxy to yfinance.

**Tech Stack:** Vite, React, TypeScript, Vanilla CSS, @sqlite.org/sqlite-wasm, vite-plugin-pwa.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/App.css`

- [x] **Step 1: Initialize Vite project with React and TypeScript**

Run: `npm create vite@latest . -- --template react-ts`
Expected: Project files created.

- [x] **Step 2: Install core dependencies**

Run: `npm install @sqlite.org/sqlite-wasm vite-plugin-pwa`
Expected: Dependencies installed.

- [x] **Step 3: Setup basic Vite config with PWA plugin**

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Stock Connoisseur',
        short_name: 'StockConn',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
```

- [x] **Step 4: Commit scaffolding**

Run: `git add . && git commit -m "chore: initial scaffold with Vite and PWA"`

### Task 2: SQLite WASM Worker Setup

**Files:**
- Create: `src/db/worker.ts`, `src/db/client.ts`

- [x] **Step 1: Create the SQLite Web Worker**

```typescript
// src/db/worker.ts
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let db: any;

const initDb = async () => {
  const sqlite3 = await sqlite3InitModule();
  if ('opfs' in sqlite3) {
    db = new sqlite3.oo1.OpfsDb('/stock_connoisseur.db');
  } else {
    db = new sqlite3.oo1.DB('/stock_connoisseur.db', 'ct');
  }
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS stocks (
      symbol TEXT PRIMARY KEY,
      name TEXT,
      market TEXT,
      currency TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
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
```

- [x] **Step 2: Create the DB Client**

```typescript
// src/db/client.ts
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

let nextId = 0;
const pendingRequests = new Map();

worker.onmessage = (e) => {
  const { type, payload, id } = e.data;
  if (pendingRequests.has(id)) {
    const { resolve } = pendingRequests.get(id);
    resolve(payload);
    pendingRequests.delete(id);
  }
};

export const initDb = () => {
  return new Promise((resolve) => {
    const id = nextId++;
    pendingRequests.set(id, { resolve });
    worker.postMessage({ type: 'init', id });
  });
};

export const query = (sql: string) => {
  return new Promise((resolve) => {
    const id = nextId++;
    pendingRequests.set(id, { resolve });
    worker.postMessage({ type: 'query', payload: sql, id });
  });
};
```

- [x] **Step 3: Commit DB layer**

Run: `git add src/db && git commit -m "feat: setup SQLite WASM worker and client"`

### Task 3: yfinance API Client

**Files:**
- Create: `src/api/yfinance.ts`

- [x] **Step 1: Implement yfinance fetcher with CORS proxy**

```typescript
// src/api/yfinance.ts
const PROXY_URL = 'https://corsproxy.io/?';

export interface StockData {
  price: number;
  peRatio: number;
  marketCap: number;
  sma200: number;
  rsi: number;
}

export const fetchStockData = async (symbol: string): Promise<StockData> => {
  const url = `${PROXY_URL}https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`;
  const response = await fetch(url);
  const data = await response.json();
  const result = data.chart.result[0];
  const quote = result.indicators.quote[0];
  const adjClose = result.indicators.adjclose[0].adjclose;
  
  // Basic technicals (Simplified for MVP)
  const price = adjClose[adjClose.length - 1];
  const sma200 = adjClose.slice(-200).reduce((a: number, b: number) => a + b, 0) / 200;
  
  // RSI calculation (Simplified)
  const changes = adjClose.slice(-15).map((v: number, i: number, arr: number[]) => i === 0 ? 0 : v - arr[i-1]).slice(1);
  const gains = changes.filter((c: number) => c > 0).reduce((a: number, b: number) => a + b, 0) / 14;
  const losses = Math.abs(changes.filter((c: number) => c < 0).reduce((a: number, b: number) => a + b, 0)) / 14;
  const rs = gains / (losses || 1);
  const rsi = 100 - (100 / (1 + rs));

  // Fundamentals would normally come from a different endpoint or deeper in this response
  // For MVP, we'll focus on price and technicals first.
  return {
    price,
    peRatio: 0, // Need quoteSummary for this
    marketCap: 0,
    sma200,
    rsi
  };
};
```

- [x] **Step 2: Commit API client**

Run: `git add src/api && git commit -m "feat: add yfinance API client"`

### Task 4: Intimator Scoring Logic

**Files:**
- Create: `src/logic/intimator.ts`

- [x] **Step 1: Implement scoring algorithm**

```typescript
// src/logic/intimator.ts
import { StockData } from '../api/yfinance';

export const calculateScore = (data: StockData): number => {
  let score = 0;
  
  // Technical (40% weight)
  // Distance from SMA 200 (20%) - Closer to SMA from above is better
  const smaDist = (data.price - data.sma200) / data.sma200;
  if (smaDist > 0 && smaDist < 0.1) score += 20;
  else if (smaDist > 0.1) score += 10;
  
  // RSI (20%) - Oversold (< 30) is good for entry
  if (data.rsi < 30) score += 20;
  else if (data.rsi < 40) score += 15;
  else if (data.rsi < 70) score += 5;

  // Fundamentals (60% weight) - Placeholder for MVP
  // If we had P/E and EPS growth, we'd add it here
  score += 30; // Base score for now

  return Math.min(100, Math.max(0, score));
};
```

- [x] **Step 2: Commit scoring logic**

Run: `git add src/logic && git commit -m "feat: implement intimator scoring logic"`

### Task 5: UI - Dashboard & Wishlist

**Files:**
- Modify: `src/App.tsx`, `src/App.css`
- Create: `src/components/Wishlist.tsx`, `src/components/StockCard.tsx`

- [x] **Step 1: Create Basic Layout with Tabs**

```tsx
// src/App.tsx
import React, { useState, useEffect } from 'react';
import { initDb } from './db/client';
import Wishlist from './components/Wishlist';
import './App.css';

function App() {
  const [activeMarket, setActiveMarket] = useState<'US' | 'IN'>('US');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initDb().then(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading Database...</div>;

  return (
    <div className="app">
      <header>
        <h1>Stock Connoisseur</h1>
        <div className="tabs">
          <button onClick={() => setActiveMarket('US')} className={activeMarket === 'US' ? 'active' : ''}>US Stocks</button>
          <button onClick={() => setActiveMarket('IN')} className={activeMarket === 'IN' ? 'active' : ''}>Indian Stocks</button>
        </div>
      </header>
      <main>
        <Wishlist market={activeMarket} />
      </main>
    </div>
  );
}

export default App;
```

- [x] **Step 2: Commit UI structure**

Run: `git add src/App.tsx src/App.css src/components && git commit -m "feat: basic UI layout and market tabs"`

### Task 6: Wishlist Management

**Files:**
- Create: `src/components/AddStock.tsx`
- Modify: `src/components/Wishlist.tsx`

- [x] **Step 1: Implement Add Stock form**

```tsx
// src/components/AddStock.tsx
import React, { useState } from 'react';
import { query } from '../db/client';

export default function AddStock({ market, onAdd }: { market: string, onAdd: () => void }) {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currency = market === 'US' ? 'USD' : 'INR';
    await query(`INSERT INTO stocks (symbol, name, market, currency) VALUES ('${symbol}', '${name}', '${market}', '${currency}')`);
    setSymbol('');
    setName('');
    onAdd();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="Symbol (e.g. AAPL)" required />
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Apple Inc.)" required />
      <button type="submit">Add Stock</button>
    </form>
  );
}
```

- [x] **Step 2: Update Wishlist to list stocks**

```tsx
// src/components/Wishlist.tsx
import React, { useState, useEffect } from 'react';
import { query } from '../db/client';
import AddStock from './AddStock';

export default function Wishlist({ market }: { market: 'US' | 'IN' }) {
  const [stocks, setStocks] = useState<any[]>([]);

  const loadStocks = async () => {
    const result = await query(`SELECT * FROM stocks WHERE market = '${market}'`);
    setStocks(result || []);
  };

  useEffect(() => { loadStocks(); }, [market]);

  return (
    <div>
      <AddStock market={market} onAdd={loadStocks} />
      <div className="stock-list">
        {stocks.map(s => (
          <div key={s[0]} className="stock-card">
            <h3>{s[0]} - {s[1]}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 3: Commit Wishlist management**

Run: `git add src/components && git commit -m "feat: implement stock adding and listing"`

### Task 7: Sync Engine & Snapshots

**Files:**
- Create: `src/logic/sync.ts`
- Modify: `src/components/Wishlist.tsx`, `src/components/StockCard.tsx`

- [x] **Step 1: Implement Sync logic**

```typescript
// src/logic/sync.ts
import { fetchStockData } from '../api/yfinance';
import { calculateScore } from './intimator';
import { query } from '../db/client';

export const syncStock = async (symbol: string) => {
  const data = await fetchStockData(symbol);
  const score = calculateScore(data);
  
  await query(`
    INSERT INTO snapshots (symbol, price, pe_ratio, market_cap, sma_200, rsi, score)
    VALUES ('${symbol}', ${data.price}, ${data.peRatio}, ${data.marketCap}, ${data.sma200}, ${data.rsi}, ${score})
  `);
};
```

- [x] **Step 2: Add Sync button to StockCard**

```tsx
// src/components/StockCard.tsx
import React from 'react';
import { syncStock } from '../logic/sync';

export default function StockCard({ stock, onSync }: { stock: any, onSync: () => void }) {
  const handleSync = async () => {
    await syncStock(stock[0]);
    onSync();
  };

  return (
    <div className="stock-card">
      <h3>{stock[0]}</h3>
      <p>{stock[1]}</p>
      <button onClick={handleSync}>Sync Now</button>
    </div>
  );
}
```

- [x] **Step 3: Commit Sync engine**

Run: `git add src/logic/sync.ts src/components && git commit -m "feat: implement snapshot sync engine"`

### Task 8: Calendar View

**Files:**
- Create: `src/components/Calendar.tsx`
- Modify: `src/App.tsx`

- [x] **Step 1: Implement basic Calendar grid**

```tsx
// src/components/Calendar.tsx
import React from 'react';

export default function Calendar() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  return (
    <div className="calendar">
      <h2>Reporting Calendar</h2>
      <div className="grid">
        {days.map(d => (
          <div key={d} className="day">
            <span>{d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [x] **Step 2: Add Calendar tab to App**

```tsx
// src/App.tsx (Update)
import Calendar from './components/Calendar';

function App() {
  const [activeView, setActiveView] = useState<'US' | 'IN' | 'CALENDAR'>('US');
  // ... rest of component
  return (
    // ...
    <div className="tabs">
      <button onClick={() => setActiveView('US')} className={activeView === 'US' ? 'active' : ''}>US</button>
      <button onClick={() => setActiveView('IN')} className={activeView === 'IN' ? 'active' : ''}>India</button>
      <button onClick={() => setActiveView('CALENDAR')} className={activeView === 'CALENDAR' ? 'active' : ''}>Calendar</button>
    </div>
    <main>
      {activeView === 'CALENDAR' ? <Calendar /> : <Wishlist market={activeView} />}
    </main>
  );
}
```

- [x] **Step 3: Commit Calendar**

Run: `git add src/components/Calendar.tsx src/App.tsx && git commit -m "feat: add calendar view and navigation"`

### Task 9: Notifications & Final Polish

**Files:**
- Modify: `src/main.tsx`, `src/App.css`, `public/manifest.json`

- [x] **Step 1: Request Notification Permission**

```typescript
// src/main.tsx (Add to start)
if ('Notification' in window) {
  Notification.requestPermission();
}
```

- [x] **Step 2: Add responsive Vanilla CSS**

```css
/* src/App.css */
:root { --primary: #007bff; --bg: #f8f9fa; }
body { margin: 0; background: var(--bg); }
.app { max-width: 800px; margin: 0 auto; padding: 20px; font-family: sans-serif; }
.tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
.tabs button { padding: 8px 16px; border: none; background: none; cursor: pointer; font-weight: bold; }
.tabs button.active { color: var(--primary); border-bottom: 2px solid var(--primary); }
.stock-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
.stock-card { background: white; border: 1px solid #eee; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.calendar .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
.calendar .day { background: white; border: 1px solid #eee; min-height: 80px; padding: 5px; }
```

- [x] **Step 3: Final Commit**

Run: `git add . && git commit -m "style: add responsive design and notification permission"`
