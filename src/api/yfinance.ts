// src/api/yfinance.ts
// Using allorigins.win as a reliable CORS proxy
const PROXY_URL = 'https://api.allorigins.win/get?url=';

export interface StockData {
  price: number;
  peRatio: number;
  marketCap: number;
  sma200: number;
  rsi: number;
}

export const fetchStockData = async (symbol: string): Promise<StockData> => {
  let normalizedSymbol = symbol.toUpperCase().trim();
  
  const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${normalizedSymbol}?interval=1d&range=1y`;
  const url = `${PROXY_URL}${encodeURIComponent(targetUrl)}`;
  console.log(`Fetching data for ${normalizedSymbol}...`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    // allorigins.win returns the response in a 'contents' field as a string
    const json = JSON.parse(data.contents);
    
    if (!json.chart || !json.chart.result) {
      throw new Error(`Invalid response for ${normalizedSymbol}`);
    }

    const result = json.chart.result[0];
    const indicators = result.indicators;
    if (!indicators || !indicators.adjclose) {
      throw new Error(`No technical data for ${normalizedSymbol}`);
    }

    const adjClose = indicators.adjclose[0].adjclose;
    if (!adjClose || adjClose.length === 0) {
      throw new Error(`Empty price history for ${normalizedSymbol}`);
    }
    
    const validPrices = adjClose.filter((p: number | null) => p !== null) as number[];
    const price = validPrices[validPrices.length - 1];
    
    const sma200 = validPrices.length >= 200 
      ? validPrices.slice(-200).reduce((a, b) => a + b, 0) / 200
      : validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
    
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
