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
  // Normalize symbol for Indian market if it doesn't have a suffix
  // Yahoo Finance needs .NS for NSE or .BO for BSE
  let normalizedSymbol = symbol.toUpperCase();
  if (!normalizedSymbol.includes('.') && !['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'].includes(normalizedSymbol)) {
    // This is a naive check; a better way would be to pass the market context
    // But for MVP, if it's not a common US ticker and has no dot, we try .NS
  }

  const url = `${PROXY_URL}https://query1.finance.yahoo.com/v8/finance/chart/${normalizedSymbol}?interval=1d&range=1y`;
  console.log(`Fetching data for ${normalizedSymbol}...`);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();
    if (!data.chart || !data.chart.result) {
      throw new Error(`Invalid response for ${normalizedSymbol}`);
    }

    const result = data.chart.result[0];
    const indicators = result.indicators;
    if (!indicators || !indicators.adjclose) {
      throw new Error(`No technical data for ${normalizedSymbol}`);
    }

    const adjClose = indicators.adjclose[0].adjclose;
    if (!adjClose || adjClose.length === 0) {
      throw new Error(`Empty price history for ${normalizedSymbol}`);
    }

    // Filter out nulls which Yahoo sometimes returns for recent days
    const validPrices = adjClose.filter((p: number | null) => p !== null) as number[];
    const price = validPrices[validPrices.length - 1];

    // SMA 200
    const sma200 = validPrices.length >= 200 
      ? validPrices.slice(-200).reduce((a, b) => a + b, 0) / 200
      : validPrices.reduce((a, b) => a + b, 0) / validPrices.length;

    // RSI calculation
    const windowSize = 14;
    const changes = [];
    for (let i = 1; i < validPrices.length; i++) {
      changes.push(validPrices[i] - validPrices[i-1]);
    }

    const recentChanges = changes.slice(-windowSize);
    const gains = recentChanges.filter(c => c > 0).reduce((a, b) => a + b, 0) / windowSize;
    const losses = Math.abs(recentChanges.filter(c => c < 0).reduce((a, b) => a + b, 0)) / windowSize;
    const rs = gains / (losses || 1);
    const rsi = 100 - (100 / (1 + rs));

    return {
      price,
      peRatio: 0,
      marketCap: 0,
      sma200,
      rsi
    };
  } catch (error) {
    console.error(`Error fetching ${normalizedSymbol}:`, error);
    throw error;
  }
};

