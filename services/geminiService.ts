import { GoogleGenAI } from "@google/genai";
import { Trade } from "../types";

const API_KEY = process.env.API_KEY || '';

// Text model for quick single-trade analysis (with Google Search tool enabled)
const FAST_MODEL = 'gemini-2.5-flash';
// Reasoning model for deep batch analysis (Weekly/Monthly reviews)
const REASONING_MODEL = 'gemini-3-pro-preview';

const USER_STRATEGY = `
USER STRATEGY (Nifty 30-Point Scalp):
1. Pre-market: Analyze prev day/month, S/R zones, predict direction.
2. Open: Analyze Gap/Flat. Wait 5-15 mins before trading.
3. Confirmation: Watch Sensibull OI vs Strike for S/R zones & Nifty 5m Chart.
4. Execution: Buy CE/PE based on direction.
5. Goal: Capture 30 points on Nifty Spot.
6. Time Rule: 
   - Checkpoint at 15 mins. 
   - If target/SL not hit but thesis is valid, HOLD. 
   - Max duration ~30 mins. Do not exit early if the setup is still valid.
`;

export const analyzeTradeWithAI = async (trade: Trade): Promise<string> => {
  if (!API_KEY) {
    return "API Key is missing. Please check your environment variables.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    // Construct a prompt specifically for Nifty/Index traders
    const prompt = `
      You are a strict Quantitative Trading Mentor specializing in Nifty 50 Intraday trading.
      The user follows a specific strategy: ${USER_STRATEGY}
      
      TASK:
      1. Use Google Search to find the ACTUAL Nifty 50 intraday price action on ${trade.date} between ${trade.entryTime || 'market open'} and ${trade.exitTime || 'market close'}.
      2. Compare the user's Nifty Spot Entry (${trade.niftyEntryPrice || 'Not Logged'}) vs the Real Market.
      3. Verify if their view (LONG/SHORT) aligned with the trend in that specific 15-30 min window.
      
      User's Logged Trade:
      - Date: ${trade.date}
      - Time: ${trade.entryTime} to ${trade.exitTime} (${trade.tradeDurationMins} mins)
      - Nifty Spot: Entered @ ${trade.niftyEntryPrice}, Exited @ ${trade.niftyExitPrice}
      - Instrument: ${trade.instrument} ${trade.strikePrice || ''} ${trade.optionType || ''}
      - Direction: ${trade.direction}
      - Result: ${trade.outcome} (PnL: ₹${trade.pnl})
      - Logic: "${trade.entryReason}"
      
      Output Format (Markdown):
      1. **Reality Check**: "At ${trade.entryTime}, Nifty was actually [Price/Trend]. Your entry was [Perfect/Early/Late] because..."
      2. **Strategy Audit**: Did they follow the Wait rule? Did they hold efficiently (15-30m) or panic exit?
      3. **Coach's Command**: One specific improvement for next time.
      
      Tone: Professional, direct, encouraging but firm on discipline.
    `;

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable Grounding
        systemInstruction: "You are a professional prop trader manager. You must verify user claims against actual market history using Search.",
        temperature: 0.5,
      }
    });

    let feedback = response.text || "No analysis generated.";
    
    // Append sources if available (standard practice for Grounding)
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      const sources = groundingChunks
        .map((chunk: any) => chunk.web?.uri ? `[${chunk.web.title || 'Source'}](${chunk.web.uri})` : null)
        .filter(Boolean)
        .join(', ');
      
      if (sources) {
        feedback += `\n\n**Sources verified:** ${sources}`;
      }
    }

    return feedback;
  } catch (error) {
    console.error("Error analyzing trade:", error);
    return "Failed to generate AI analysis. Please try again later.";
  }
};

export const analyzeBatch = async (trades: Trade[], periodDescription: string): Promise<string> => {
  if (!API_KEY) return "No API Key available.";
  if (trades.length === 0) return "No trades to analyze for this period.";

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // Prepare a summary of trades for the prompt to save tokens/complexity
    const tradeSummaries = trades.map((t, i) => `
      ${i+1}. ${t.entryTime}-${t.exitTime} | Nifty Spot: ${t.niftyEntryPrice || '?'} -> ${t.niftyExitPrice || '?'} (${t.spotPointsCaptured} pts).
      Dir: ${t.direction}. Result: ${t.outcome} (₹${t.pnl}). Duration: ${t.tradeDurationMins}m.
      Mistakes: ${t.mistakes?.join(', ') || 'None'}. 
    `).join('\n');

    const prompt = `
      Analyze this batch of trades from a ${periodDescription} for a Nifty 50 Scalper.
      User's Strategy: ${USER_STRATEGY}

      Trade Log:
      ${tradeSummaries}

      Output a structured "Daily Coach's Report" in Markdown. 
      Do NOT use generic text. Be specific to the data provided.
      
      Structure:
      ### 📊 Market Sync
      (Did they trade with the trend or fight it? Did they wait for setups?)

      ### 🛡️ Execution Grade
      (Are they hitting the 15-30m window correctly? Are they capturing 30 pts? Grade A-F)

      ### 💡 Pro Tip
      (One advanced concept to apply tomorrow based on these specific mistakes)
    `;

    const response = await ai.models.generateContent({
      model: REASONING_MODEL, // Gemini 3 Pro for deep thinking
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Max thinking for deep analysis
        systemInstruction: "You are an expert trading psychologist. Format your response with clear Markdown headers and emojis.",
      }
    });

    return response.text || "Analysis complete.";

  } catch (error) {
    console.error("Error batch analyzing:", error);
    return "Deep analysis failed. Please try again.";
  }
};

export const getDailyCoachTip = async (): Promise<string> => {
  if (!API_KEY) return "No API Key available.";
  
  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: "Give me one powerful, short trading aphorism for a Nifty Intraday scalper who targets 30 points. Focus on patience or risk management.",
    });
    return response.text || "Wait for the setup. Cash is also a position.";
  } catch (e) {
    return "Protect your capital. The market will be there tomorrow.";
  }
};