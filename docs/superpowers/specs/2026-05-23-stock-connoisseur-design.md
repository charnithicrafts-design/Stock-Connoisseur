# Design Doc: Stock Connoisseur (The Local Minimalist)

**Date:** 2026-05-23  
**Status:** Draft  
**Goal:** A privacy-first, zero-cost stock picking engine and reporting calendar.

## 1. Overview
Stock Connoisseur is a PWA designed to help users pick stocks based on performance (Fundamental and Technical metrics) while keeping track of corporate reporting events (Earnings/Annual Reports) through a calendar view. It operates as a "Local Minimalist" application, storing all data on the user's device using SQLite WASM and fetching data from Yahoo Finance.

## 2. Architecture
- **Frontend:** React (TypeScript) with Vanilla CSS.
- **Runtime:** Progressive Web App (PWA) with offline support and local push notifications.
- **Persistence:** SQLite WASM with Origin Private File System (OPFS) for local storage.
- **Data Source:** Yahoo Finance (yfinance) accessed via a CORS proxy.
- **Sync Model:** Manual "Snapshot" sync. Users trigger a refresh to fetch latest price, fundamentals, and technicals.

## 3. Features
### 3.1. Stock Picking "Intimator"
- **Scoring Engine:** Calculates a performance score (0-100) based on:
    - **Fundamentals (60%):** P/E Ratio, EPS Growth, Debt-to-Equity.
    - **Technical (40%):** Distance from 200-day Moving Average (SMA), RSI (Relative Strength Index).
- **Markets:** Separate wishlists for US (NASDAQ/NYSE in USD) and Indian (NSE/BSE in INR) stocks.

### 3.2. Reporting Calendar
- **Events:** Tracks Quarterly Earnings and Annual Reports.
- **Views:** Monthly grid showing upcoming events for wishlisted stocks.
- **Notifications:** 
    - **Push:** Browser/Device notifications 1 day before and the morning of a report.
    - **Local Digest:** Pre-filled `mailto:` links for generating weekly email summaries manually from the client.

## 4. Data Model
### `stocks`
Stores the user's wishlist and basic company info.
- `symbol` (TEXT, PK): Ticker symbol.
- `name` (TEXT): Company name.
- `market` (TEXT): 'US' or 'IN'.
- `currency` (TEXT): 'USD' or 'INR'.

### `snapshots`
Stores historical performance data points from sync events.
- `symbol` (TEXT, FK): Ticker symbol.
- `timestamp` (DATETIME): Time of sync.
- `price` (REAL): Last closing price.
- `pe_ratio`, `market_cap`, `sma_200`, `rsi` (REAL): Metrics.
- `score` (REAL): Calculated Intimator score.

### `events`
Stores upcoming reporting dates.
- `symbol` (TEXT, FK): Ticker symbol.
- `event_type` (TEXT): 'EARNINGS', 'ANNUAL_REPORT'.
- `event_date` (DATE): Date of the event.
- `notified` (BOOLEAN): Status of push notification.

## 5. Implementation Strategy
1. **Scaffold:** Vite + React + TypeScript + `vite-plugin-pwa`.
2. **Database:** Integrate `@sqlite.org/sqlite-wasm` with a Web Worker to handle DB operations off-main-thread.
3. **API Integration:** Create a service to fetch from yfinance through a CORS proxy.
4. **Intimator Logic:** Implement the scoring algorithm in the DB worker or a dedicated logic layer.
5. **UI/UX:**
    - Dashboard with separate US/IN tabs.
    - Detailed stock view with "Snapshot" history.
    - Full-screen Calendar view.
6. **Service Worker:** Register for background tasks (e.g., checking for today's events if the app is open or backgrounded).

## 6. Success Criteria
- User can add/remove stocks from US and Indian markets.
- One-tap sync fetches data and updates performance scores.
- Calendar correctly displays upcoming report dates for wishlisted stocks.
- PWA can be installed on mobile/desktop and works offline with local data.
