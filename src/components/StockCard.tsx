// src/components/StockCard.tsx
import { syncStock } from '../logic/sync';
import { query } from '../db/client';

export default function StockCard({ stock, onSync }: { stock: any, onSync: () => void }) {
  const symbol = stock[0];
  const name = stock[1];
  const currency = stock[3];
  const price = stock[4];
  const score = stock[5];

  const handleSync = async () => {
    try {
      await syncStock(symbol);
      onSync();
    } catch (error) {
      console.error(error);
      alert(`Failed to sync ${symbol}. Ensure the ticker is correct (e.g. RELIANCE.NS for Indian stocks).`);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Delete ${symbol} from wishlist?`)) {
      await query(`DELETE FROM snapshots WHERE symbol = '${symbol}'`);
      await query(`DELETE FROM events WHERE symbol = '${symbol}'`);
      await query(`DELETE FROM stocks WHERE symbol = '${symbol}'`);
      onSync();
    }
  };

  const handleEdit = async () => {
    const newName = prompt(`Enter new name for ${symbol}:`, name);
    if (newName && newName !== name) {
      await query(`UPDATE stocks SET name = '${newName}' WHERE symbol = '${symbol}'`);
      onSync();
    }
  };

  return (
    <div className="stock-card">
      <div className="stock-header">
        <h3>{symbol}</h3>
        <div className="stock-actions">
          <button onClick={handleEdit} className="btn-icon" title="Edit Name">✎</button>
          <button onClick={handleDelete} className="btn-icon btn-danger" title="Delete">✕</button>
        </div>
      </div>
      <p className="stock-name">{name}</p>
      
      <div className="stock-metrics">
        <div className="metric">
          <span className="label">Price:</span>
          <span className="value">{price ? `${price.toFixed(2)} ${currency}` : '---'}</span>
        </div>
        <div className="metric">
          <span className="label">Score:</span>
          <span className="value score">{score !== null ? `${Math.round(score)}/100` : '---'}</span>
        </div>
      </div>

      <button onClick={handleSync} className="btn-sync">Sync Now</button>
    </div>
  );
}
