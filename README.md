# TradeMind AI 🧠📈

**TradeMind AI** is a professional-grade trading journal and psychology coach designed specifically for **Nifty 50 Intraday Scalpers**. 

Unlike generic journals, this app is hard-coded with a disciplined 30-point scalping strategy and uses **Google Gemini AI** to act as a strict mentor—verifying your entries against actual historical market data and analyzing your behavior patterns.

![TradeMind AI](https://lucide.dev/logo.light.svg)

---

## 🚀 Key Features

### 1. 🇮🇳 Nifty-Specific Workflow
- **Derivative Logging**: Log Strike Price, CE/PE/FUT, and Spot Prices.
- **Spot Tracking**: Auto-calculates "Spot Points Captured" (Target: 30 pts).
- **Direct Integrations**: One-click access to **Sensibull OI** and **Zerodha Kite** charts.
- **Currency**: Native support for Indian Rupee (₹).

### 2. 🤖 AI Coach & Reality Check
- **Trade Audit**: The AI checks your logged Entry/Exit times against **actual historical Nifty 50 data** (via Google Search grounding) to verify if your "Entry Reason" matches reality.
- **Batch Analysis**: Uses `Gemini 3 Pro` (Thinking Mode) to analyze weekly or monthly performance, identifying hidden patterns (e.g., "You lose 80% of trades taken before 9:30 AM").
- **Daily Coach**: Generates a daily report card grading your Market Sync and Execution.

### 3. 🛡️ "The System" Enforcement
- **Protocol Checklist**: Enforces a strict routine:
  1. Analyze Pre-Market.
  2. Wait 15 mins (No trade zone).
  3. Check Sensibull OI.
  4. Exit or Re-assess at 15-30 min mark.
- **Discipline Tracking**: Logs mistakes (FOMO, Revenge Trading) and emotional state.

### 4. 📊 Pro Dashboard
- **Equity Curve**: Visualize your account growth.
- **Win Rate**: Split by Long vs. Short.
- **Day of Week Analysis**: Find your most profitable trading days.
- **PnL Stats**: Profit Factor, Avg Win/Loss, Best/Worst Trade.

### 5. 📱 Cross-Platform (PWA)
- **Installable**: Works as a native app on **Android**, **iOS**, and **Mac/Windows**.
- **Offline Capable**: LocalStorage first architecture.

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js installed.
- A Google Cloud Project with **Gemini API Key** enabled.

### 1. Clone & Install
```bash
# Install dependencies
npm install
```

### 2. Configure API Key
Create a `.env` file in the root directory (or set it in your deployment environment):
```env
API_KEY=your_google_gemini_api_key_here
```

### 3. Run Locally
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📲 How to Install on Mobile (PWA)

**TradeMind AI** is a Progressive Web App. You can install it without an App Store.

1. **Deploy** the app (e.g., to Vercel/Netlify) or run locally on your network.
2. **Open the URL** on your mobile browser (Chrome for Android, Safari for iOS).
3. **Install**:
   - **iOS (Safari)**: Tap "Share" Button → Scroll down → Tap **"Add to Home Screen"**.
   - **Android (Chrome)**: Tap "Three Dots" Menu → Tap **"Install App"** or **"Add to Home Screen"**.

---

## 📉 The "Nifty 30-Point Scalp" System

This app is built around a specific winning protocol:

1. **Wait 5-15 Mins**: Never trade the opening volatility. Let the candles settle.
2. **Sensibull OI**: Confirm Support/Resistance using Open Interest data before entering.
3. **The Target**: Capture **30 Points** on the Nifty Spot chart.
4. **The Time Limit**:
   - **15 Mins**: The "Re-assessment" checkpoint. If the move hasn't started, option decay will kill you.
   - **30 Mins**: Hard stop. Intraday momentum usually fades by then.

---

## 📂 Data Import/Export

- **Export Excel**: Downloads a CSV formatted specifically for Excel analysis, with separate columns for System Checks and AI Feedback.
- **Backup JSON**: Full backup of your trade history.
- **Import**: Restore data from previous backups.

---

## 🏗️ Tech Stack

- **Frontend**: React, TypeScript, Vite/Webpack
- **Styling**: Tailwind CSS
- **AI**: Google GenAI SDK (`gemini-2.5-flash`, `gemini-3-pro-preview`)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Storage**: LocalStorage (Browser)

---

*Built with discipline for the disciplined trader.*
