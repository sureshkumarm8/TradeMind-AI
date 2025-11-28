# TradeMind.AI 🧠📈

**TradeMind.AI** is a professional-grade trading journal and psychology coach designed for disciplined traders. While optimized for **Nifty 50 Intraday Scalping**, it features a fully customizable **Strategy Engine** that allows you to define your own protocols, rules, and tools.

It uses **Google Gemini AI** (Flash & Pro models) to act as a strict mentor—generating structured "Prop Desk" report cards by verifying your entries against actual historical market data and analyzing your behavior patterns.

---

## 🚀 Key Features

### 1. 🎛️ Dynamic Strategy Engine
- **Customizable System**: Define your own "Iron Rules", "Protocol Steps", and "Mission Tools" directly in the app.
- **Import/Export**: Share strategy templates with others or backup your specific setup.
- **Default Template**: Comes with a solid "Intraday Trend System" which you can adapt to your needs (e.g., Nifty 30-Point Scalp).

### 2. 🇮🇳 Nifty & Index Optimized
- **Derivative Logging**: Log Strike Price, CE/PE/FUT, and Spot Prices.
- **Spot Tracking**: Auto-calculates "Spot Points Captured" vs Option Premium captured.
- **Currency**: Native support for Indian Rupee (₹).
- **Direct Links**: One-click access to Sensibull OI and Kite Charts.

### 3. 🤖 AI Prop Desk Report Card
- **Structured Grading**: The AI doesn't just chat; it returns a strict JSON report card grading your **Execution (A-F)**.
- **Reality Check**: Verifies your logged trade times against **actual historical market action** (using Google Search grounding) to see if you were hallucinating the setup.
- **Strategy Audit**: Checks if you followed your specific defined rules (e.g., "Did you wait 15 mins?").

### 4. 📅 Professional Journal
- **Calendar View**: Heatmap style visualization of your monthly performance.
- **Weekly View**: Detailed breakdown of trades Mon-Fri.
- **Rich Metrics**: Track Confluences (VWAP, OI, etc.) and Mistakes (FOMO, Revenge).

### 5. 📊 Interactive Command Center
- **Drill-Down Dashboard**: Click on "Net P&L" or "Win Rate" cards to see the specific trades contributing to those stats.
- **Deep Analytics**: Long vs Short win rates, Profit Factor, and Day-of-Week performance.

### 6. 📱 Cross-Platform PWA
- **Install Everywhere**: Works as a native app on **iOS**, **Android**, **Mac**, and **Windows**.
- **Offline First**: All data is stored securely in your browser's `LocalStorage`.

---

## 🛠️ Setup & Installation

### Prerequisites
- Node.js installed.
- A **Google Gemini API Key** (Free tier available at [aistudio.google.com](https://aistudio.google.com)).

### 1. Clone & Install
```bash
# Clone the repo
git clone https://github.com/yourusername/trademind-ai.git

# Install dependencies
npm install
```

### 2. Run Locally
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Configure App
1. Click the **Settings (Gear)** icon in the app.
2. Paste your **Gemini API Key**.
3. Go to **My System** to customize your trading rules or import a strategy.

---

## 📲 How to Install on Mobile

**TradeMind.AI** is a Progressive Web App (PWA).

1. **Host the app** (e.g., on Vercel/Netlify) or access your local server via IP.
2. **Open the URL** on your mobile browser.
3. **Install**:
   - **iOS (Safari)**: Tap "Share" → **"Add to Home Screen"**.
   - **Android (Chrome)**: Tap Menu (Three Dots) → **"Install App"**.

---

## 📉 The Default "Nifty Scalp" Strategy

The app is optimized for the following workflow (which you can edit):

1. **Wait 15 Mins**: No trade zone at open.
2. **Sensibull OI**: Confirm Support/Resistance.
3. **Target**: 30 Points on Spot.
4. **Time Limit**: 15-30 Minute hold time max.

---

## 🔒 Privacy & Data

- **Local Storage**: Your trade logs and API keys **never leave your device** except to be sent to Google's AI API for analysis.
- **Export**: You own your data. Export to JSON or Excel (CSV) at any time.

---

## 🏗️ Tech Stack

- **Framework**: React 19, TypeScript, Vite
- **UI System**: Tailwind CSS, Lucide Icons
- **AI Engine**: Google GenAI SDK (`gemini-2.5-flash` for Reports, `gemini-3-pro-preview` for Deep Thinking)
- **Visualization**: Recharts

---

*Built by Suresh Kumar M for disciplined traders.*