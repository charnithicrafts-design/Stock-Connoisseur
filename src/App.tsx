// src/App.tsx
import React, { useState, useEffect } from 'react';
import { initDb } from './db/client';
import Wishlist from './components/Wishlist';
import Calendar from './components/Calendar';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState<'US' | 'IN' | 'CALENDAR'>('US');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initDb().then(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading Database...</div>;

  return (
    <div className="app">
      <header>
        <h1>Stock Connoisseur</h1>
        <div className="tabs">
          <button onClick={() => setActiveView('US')} className={activeView === 'US' ? 'active' : ''}>US Stocks</button>
          <button onClick={() => setActiveView('IN')} className={activeView === 'IN' ? 'active' : ''}>Indian Stocks</button>
          <button onClick={() => setActiveView('CALENDAR')} className={activeView === 'CALENDAR' ? 'active' : ''}>Calendar</button>
        </div>
      </header>
      <main>
        {activeView === 'CALENDAR' ? <Calendar /> : <Wishlist market={activeView as 'US' | 'IN'} />}
      </main>
    </div>
  );
}

export default App;
