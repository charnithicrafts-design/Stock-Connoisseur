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
