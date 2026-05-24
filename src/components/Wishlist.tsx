// src/components/Wishlist.tsx
import { useState, useEffect } from 'react';
import { query } from '../db/client';
import AddStock from './AddStock';
import StockCard from './StockCard';

export default function Wishlist({ market }: { market: 'US' | 'IN' }) {
  const [stocks, setStocks] = useState<any[]>([]);

  const loadStocks = async () => {
    const result = await query(`
      SELECT 
        s.symbol, 
        s.name, 
        s.market, 
        s.currency,
        sn.price,
        sn.score,
        sn.timestamp
      FROM stocks s
      LEFT JOIN (
        SELECT symbol, price, score, timestamp,
               ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) as rn
        FROM snapshots
      ) sn ON s.symbol = sn.symbol AND sn.rn = 1
      WHERE s.market = '${market}'
    `);
    setStocks((result as any[]) || []);
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
            <StockCard key={s[0]} stock={s} onSync={loadStocks} />
          ))
        )}
      </div>
    </div>
  );
}
