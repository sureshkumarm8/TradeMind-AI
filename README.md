# TradeMind.AI 🧠📈

**TradeMind.AI** is a professional-grade trading journal and **AI performance coach** designed to transform emotional traders into disciplined, data-driven professionals.

It replaces the need for a human mentor by using **Google Gemini AI** to act as a strict "Prop Desk Manager." It audits your execution against your own rules, providing a reality check on every trade to ensure you are following your system, maximizing winners, and eliminating emotional errors.

---

## 🎯 Mission & Goals

### 1. Enforce Discipline via AI Accountability
Unlike standard journals that just store data, TradeMind.AI performs a **"Reality Check"** on every log. It uses Google Search Grounding to compare your entry reason against actual historical market price action.
- **The Goal**: Eliminate "hallucinated" setups. If the market didn't do what you said it did, the AI will catch it and grade you (A-F) accordingly.

### 2. Bridge the Gap Between Plan & Execution
Most traders have a plan but fail to follow it. The **Dynamic Strategy Engine** allows you to digitize your specific "System" (e.g., *Nifty 30-Point Scalp*, *Wait 15 mins*, *Check OI*).
- **The Goal**: The AI audits every single trade against these specific rules. It confirms if you actually waited for your setup or if you acted on impulse.

### 3. Deep Technical & Psychological Analysis
We go beyond simple P&L tracking. The app tracks **Confluences** (why you entered, e.g., VWAP, OI Data) vs. **Mistakes** (psychological errors, e.g., FOMO, Revenge Trading).
- **The Goal**: To identify your true statistical edge and plug your psychological leaks using batch analysis of your journal.

### 4. Optimized for Intraday Speed
Tailored specifically for **Nifty 50 Scalpers** and Index traders.
- **The Goal**: Rapid logging of Spot Prices, Strike Prices, Option Types (CE/PE), and Opening Types (Gap Up/Down) via a mobile-first PWA interface that feels like a native app.

---

## 🚀 Key Features

### 🎛️ Dynamic Strategy Engine
- **Customizable System**: Define your own "Iron Rules", "Protocol Steps", and "Mission Tools" directly in the app.
- **Import/Export**: Share strategy templates with others or backup your specific setup.
- **Default Template**: Comes with a solid "Intraday Trend System" which you can adapt to your needs.

### 🤖 AI Prop Desk Report Card
- **Structured Grading**: The AI returns a strict JSON report card grading your **Execution (A-F)** on every trade.
- **Reality Check**: Verifies your logged trade times against **actual historical market action**.
- **Strategy Audit**: Checks if you followed your specific defined rules (e.g., "Did you wait 15 mins?").

### 📊 Interactive Command Center
- **Drill-Down Dashboard**: Click on "Net P&L" or "Win Rate" cards to see the specific trades contributing to those stats.
- **Deep Analytics**: Long vs Short win rates, Profit Factor, and Day-of-Week performance.

### 📅 Professional Journal
- **Calendar View**: Heatmap style visualization of your monthly performance.
- **Weekly View**: Detailed breakdown of trades Mon-Fri.
- **Rich Metrics**: Track Confluences and Mistakes.

### 🇮🇳 Nifty & Index Optimized
- **Derivative Logging**: Log Strike Price, CE/PE/FUT, and Spot Prices.
- **Spot Tracking**: Auto-calculates "Spot Points Captured" vs Option Premium captured.
- **Currency**: Native support for Indian Rupee (₹).
- **Direct Links**: One-click access to Sensibull OI and Kite Charts.

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

## 🔒 Privacy & Data

- **Local Storage**: Your trade logs, strategy settings, and API keys **never leave your device** except to be sent to Google's AI API for analysis.
- **Export**: You own your data. Export to JSON or Excel (CSV) at any time.

---

## 🏗️ Tech Stack

- **Framework**: React 19, TypeScript, Vite
- **UI System**: Tailwind CSS, Lucide Icons
- **AI Engine**: Google GenAI SDK (`gemini-2.5-flash` for Reports, `gemini-3-pro-preview` for Deep Thinking)
- **Visualization**: Recharts

---

*Built by Suresh Kumar M for disciplined traders.*