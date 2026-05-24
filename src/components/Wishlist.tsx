// src/components/Wishlist.tsx
import React, { useState, useEffect } from 'react';
import { query } from '../db/client';
import AddStock from './AddStock';

export default function Wishlist({ market }: { market: 'US' | 'IN' }) {
  const [stocks, setStocks] = useState<any[]>([]);

  const loadStocks = async () => {
    const result = await query(`SELECT * FROM stocks WHERE market = '${market}'`);
    // result might be an array of arrays or array of objects depending on sqlite-wasm config
    // Based on worker.ts: returnValue: 'resultRows' returns array of arrays
    setStocks(result || []);
  };

  useEffect(() => { loadStocks(); }, [market]);

  return (
    <div className="wishlist">
      <h2>{market} Wishlist</h2>
      <AddStock market={market} onAdd={loadStocks} />
      <div className="stock-list">
        {stocks.length === 0 ? (
          <p>No stocks added yet.</p>
        ) : (
          stocks.map(s => (
            <div key={s[0]} className="stock-card">
              <h3>{s[0]} - {s[1]}</h3>
              <p>{s[2]} market ({s[3]})</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
