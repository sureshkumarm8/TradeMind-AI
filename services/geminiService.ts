import { GoogleGenAI, Schema, Type } from "@google/genai";
import { Trade, StrategyProfile, ParsedVoiceCommand } from "../types";

// Text model for quick single-trade analysis (with Google Search tool enabled)
const FAST_MODEL = 'gemini-2.5-flash';
// Reasoning model for deep batch analysis (Weekly/Monthly reviews)
const REASONING_MODEL = 'gemini-3-pro-preview';

const formatStrategyForAI = (profile?: StrategyProfile) => {
  if (!profile) return "Strategy: General Intraday Trading";

  const stepsText = profile.steps.map(s => `${s.title}: ${s.items.join(', ')}`).join('\n');
  const rulesText = profile.rules.map(r => `Rule: ${r.title} - ${r.description}`).join('\n');

  return `
USER STRATEGY (${profile.name}):
${profile.description}

PROTOCOL:
${stepsText}

IRON RULES:
${rulesText}
`;
};

export const analyzeTradeWithAI = async (trade: Trade, strategyProfile?: StrategyProfile, apiKey?: string): Promise<string> => {
  const key = apiKey || process.env.API_KEY;
  if (!key) {
    return JSON.stringify({
      grade: "N/A",
      gradeColor: "gray",
      marketTrend: "Unknown",
      realityCheck: "API Key is missing. Please add your Gemini API Key in Settings.",
      strategyAudit: { timing: "-", direction: "-", rulesFollowed: false },
      coachCommand: "Add API Key to unlock analysis."
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const strategyContext = formatStrategyForAI(strategyProfile);
    
    // Construct a prompt specifically for Nifty/Index traders
    const prompt = `
      You are a strict Quantitative Trading Mentor.
      The user follows a specific system.
      ${strategyContext}
      
      TASK:
      1. Use Google Search to find the ACTUAL Nifty 50 intraday price action on ${trade.date} between ${trade.entryTime || 'market open'} and ${trade.exitTime || 'market close'}.
      2. Compare the user's Nifty Spot Entry (${trade.niftyEntryPrice || 'Not Logged'}) vs the Real Market.
      3. Verify if their view (LONG/SHORT) aligned with the trend in that specific window.
      
      User's Logged Trade:
      - Date: ${trade.date}
      - Time: ${trade.entryTime} to ${trade.exitTime} (${trade.tradeDurationMins} mins)
      - Nifty Spot: Entered @ ${trade.niftyEntryPrice}, Exited @ ${trade.niftyExitPrice}
      - Instrument: ${trade.instrument} ${trade.strikePrice || ''} ${trade.optionType || ''}
      - Direction: ${trade.direction}
      - Result: ${trade.outcome} (PnL: ₹${trade.pnl})
      - Logic: "${trade.entryReason}"
      
      Output strict JSON. Do not output markdown code blocks.
    `;
    
    // Define strict schema for UI consistency
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        grade: { type: Type.STRING, description: "Letter grade A, B, C, D, F based on timing and trend alignment" },
        gradeColor: { type: Type.STRING, description: "Color suggestion: green, yellow, red" },
        marketTrend: { type: Type.STRING, description: "Short phrase describing Nifty action during trade window (e.g. 'Strong Bullish Trend', 'Choppy Range')" },
        realityCheck: { type: Type.STRING, description: "Direct comparison of User Entry vs Actual Market Price Action" },
        strategyAudit: {
           type: Type.OBJECT,
           properties: {
              timing: { type: Type.STRING, description: "Early, Late, or Perfect" },
              direction: { type: Type.STRING, description: "With Trend or Counter Trend" },
              rulesFollowed: { type: Type.BOOLEAN, description: "Did they follow their system rules?" }
           }
        },
        coachCommand: { type: Type.STRING, description: "One specific, actionable command for the next trade." }
      }
    };

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], // Enable Grounding
        systemInstruction: "You are a professional prop trader manager. You must verify user claims against actual market history using Search. Return strictly valid JSON.",
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    let jsonResult = response.text;
    
    let resultObj: any = {};
    try {
        resultObj = JSON.parse(jsonResult || "{}");
    } catch(e) {
        return JSON.stringify({
            grade: "?", 
            gradeColor: "gray",
            marketTrend: "Analysis Error", 
            realityCheck: response.text || "Could not parse analysis.", 
            strategyAudit: { timing: "-", direction: "-", rulesFollowed: false },
            coachCommand: "Try again."
        });
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      const sources = groundingChunks
        .map((chunk: any) => chunk.web?.uri ? chunk.web.title || 'Source' : null)
        .filter(Boolean);
      
      if (sources.length > 0) {
        resultObj.sources = sources;
      }
    }

    return JSON.stringify(resultObj);

  } catch (error) {
    console.error("Error analyzing trade:", error);
    return JSON.stringify({
      grade: "Err",
      gradeColor: "red",
      marketTrend: "API Error",
      realityCheck: "Failed to connect to AI service.",
      strategyAudit: { timing: "-", direction: "-", rulesFollowed: false },
      coachCommand: "Check internet and API Key."
    });
  }
};

export const analyzeBatch = async (trades: Trade[], periodDescription: string, strategyProfile?: StrategyProfile, apiKey?: string): Promise<string> => {
  const key = apiKey || process.env.API_KEY;
  if (!key) return "API Key is missing. Please add your Gemini API Key in Settings.";
  if (trades.length === 0) return "No trades to analyze for this period.";

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const strategyContext = formatStrategyForAI(strategyProfile);

    // Prepare a summary of trades for the prompt to save tokens/complexity
    const tradeSummaries = trades.map((t, i) => `
      ${i+1}. ${t.entryTime}-${t.exitTime} | Nifty Spot: ${t.niftyEntryPrice || '?'} -> ${t.niftyExitPrice || '?'} (${t.spotPointsCaptured} pts).
      Dir: ${t.direction}. Result: ${t.outcome} (₹${t.pnl}). Duration: ${t.tradeDurationMins}m.
      Mistakes: ${t.mistakes?.join(', ') || 'None'}. 
    `).join('\n');

    const prompt = `
      Analyze this batch of trades from a ${periodDescription}.
      ${strategyContext}

      Trade Log:
      ${tradeSummaries}

      Output a structured "Daily Coach's Report" in Markdown. 
      Do NOT use generic text. Be specific to the data provided and the USER STRATEGY above.
      
      Structure:
      ### 📊 Market Sync
      (Did they trade with the trend? Did they wait for setups as per their protocol?)

      ### 🛡️ Execution Grade
      (Are they following the specific time/point rules defined in the strategy? Grade A-F)

      ### 💡 Pro Tip
      (One advanced concept to apply tomorrow)
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
    return "Deep analysis failed. Please check your API Key and try again.";
  }
};

export const getDailyCoachTip = async (apiKey?: string): Promise<string> => {
  const key = apiKey || process.env.API_KEY;
  if (!key) return "Add your Gemini API Key to get daily tips.";
  
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: "Give me one powerful, short trading aphorism for a Nifty Intraday scalper. Focus on patience or risk management.",
    });
    return response.text || "Wait for the setup. Cash is also a position.";
  } catch (e) {
    return "Protect your capital. The market will be there tomorrow.";
  }
};

// MULTIMODAL VOICE LOGGING
// Accepts Audio Base64 -> Returns JSON
export const parseVoiceCommand = async (audioBase64: string, apiKey?: string): Promise<ParsedVoiceCommand> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required");

    try {
        const ai = new GoogleGenAI({ apiKey: key });
        
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                instrument: { type: Type.STRING },
                optionType: { type: Type.STRING, enum: ["CE", "PE", "FUT"] },
                strikePrice: { type: Type.NUMBER },
                direction: { type: Type.STRING, enum: ["LONG", "SHORT"] },
                entryPrice: { type: Type.NUMBER },
                quantity: { type: Type.NUMBER },
                entryReason: { type: Type.STRING },
                setupName: { type: Type.STRING }
            }
        };

        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: {
              parts: [
                {
                   inlineData: {
                      mimeType: "audio/webm",
                      data: audioBase64
                   }
                },
                {
                   text: `
                    Listen to this trader's voice note. Extract trading data for the Indian Nifty 50 market.
                    Default to "NIFTY 50" instrument if not specified.
                    Extract Option Type (CE/PE), Strike, Entry Price, Qty.
                    Capture the "Logic" or "Reason" for the trade into 'entryReason'.
                    Capture any technical setup name into 'setupName'.
                   `
                }
              ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });

        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Voice parse error", e);
        return { entryReason: "Error processing voice note." }; 
    }
}