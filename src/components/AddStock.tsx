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
    <form onSubmit={handleSubmit} className="add-stock-form">
      <input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="Symbol (e.g. AAPL)" required />
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (e.g. Apple Inc.)" required />
      <button type="submit">Add Stock</button>
    </form>
  );
}
