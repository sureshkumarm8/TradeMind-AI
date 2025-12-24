
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { Trade, StrategyProfile, ParsedVoiceCommand, PreMarketAnalysis, LiveMarketAnalysis, PostMarketAnalysis, NewsAnalysis, TradeOutcome } from "../types";

// Text model for quick single-trade analysis (with Google Search tool enabled)
const FAST_MODEL = 'gemini-2.5-flash';
// Reasoning model for deep batch analysis 
const REASONING_MODEL = 'gemini-2.5-flash'; 

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
      grade: 0,
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
    const isSkipped = trade.outcome === TradeOutcome.SKIPPED;
    
    // Format timeline for prompt
    const timeline = trade.notes 
        ? trade.notes.map(n => `[${n.timestamp}] ${n.content} (${n.type})`).join('\n') 
        : "No live timeline logged.";

    const taskInstructions = isSkipped 
      ? `
      TASK: DECISION AUDIT (USER SKIPPED THE TRADE)
      1. Use Google Search to find the ACTUAL Nifty 50 intraday price action on ${trade.date} during the observation window (${trade.entryTime || 'market open'} onwards).
      2. Analyze if the user's decision to SKIP was correct. Was the market choppy, trendless, or failing to trigger the strategy rules?
      3. If they claim "no clarity," verify if the price action was indeed noisy or range-bound.
      4. Grade them on PATIENCE. 100/100 means they avoided a "trap" or a high-risk/low-reward scenario.
      `
      : `
      TASK: EXECUTION AUDIT (USER TOOK THE TRADE)
      1. Use Google Search to find the ACTUAL Nifty 50 intraday price action on ${trade.date} between ${trade.entryTime || 'market open'} and ${trade.exitTime || 'market close'}.
      2. If a chart image is provided, analyze the visual price structure to verify the entry.
      3. Compare the user's Nifty Spot Entry (${trade.niftyEntryPrice || 'Not Logged'}) vs the Real Market.
      4. Verify if their view (LONG/SHORT) aligned with the trend in that specific window.
      `;

    const promptText = `
      You are a strict Quantitative Trading Mentor.
      The user follows a specific system.
      ${strategyContext}
      
      ${taskInstructions}
      
      User's Mission Log:
      - Status: ${isSkipped ? 'SKIPPED / ABORTED' : 'EXECUTED'}
      - Date: ${trade.date}
      - Time Window: ${trade.entryTime} to ${trade.exitTime || 'Observation End'}
      - Direction Watched: ${trade.direction}
      - Logic Summary: "${trade.entryReason}"
      
      LIVE MISSION TIMELINE (User's Thoughts):
      ${timeline}
      
      Output strict JSON format ONLY. Do not output markdown code blocks.
      
      Expected JSON Structure:
      {
        "grade": "Integer between 0 and 100. 100 is Perfect Discipline (correctly skipping a bad setup or perfectly executing a good one).",
        "gradeColor": "green (80-100), yellow (50-79), or red (0-49)",
        "marketTrend": "Short phrase (e.g. 'Volatile Sideways', 'Clear Bearish Breakout')",
        "realityCheck": "Comparison of User's choice vs Actual Market Action. If skipped: 'Good skip, market was indeed messy' or 'Missed opportunity, setup was valid'.",
        "strategyAudit": {
            "timing": "${isSkipped ? 'N/A' : 'Early, Late, or Perfect'}",
            "direction": "Aligned or Contrary",
            "rulesFollowed": true or false
        },
        "coachCommand": "One specific command for the next session."
      }
    `;
    
    const parts: any[] = [{ text: promptText }];
    
    if (trade.chartImage) {
        const base64Data = trade.chartImage.split(',')[1];
        parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } });
        parts.push({ text: "Analyze the attached screenshot for technical confluence or lack thereof." });
    }

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `You are a professional prop trader manager. Your goal is to enforce the user's strategy. ${isSkipped ? 'Reward the user for being patient and avoiding bad trades.' : 'Critique execution accuracy.'} Return strictly valid JSON.`,
        temperature: 0.2,
      }
    });

    let jsonResult = response.text || "{}";
    if (jsonResult.includes('```')) {
        jsonResult = jsonResult.replace(/```json/g, '').replace(/```/g, '');
    }
    
    return jsonResult;

  } catch (error: any) {
    console.error("Error analyzing trade:", error);
    return JSON.stringify({
      grade: 0,
      gradeColor: "red",
      marketTrend: "API Error",
      realityCheck: `Analysis Failed: ${error.message || "Unknown API Error"}`,
      strategyAudit: { timing: "-", direction: "-", rulesFollowed: false },
      coachCommand: "Check API Key and Quota."
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

    const tradeSummaries = trades.map((t, i) => `
      ${i+1}. ${t.date} ${t.entryTime}: ${t.outcome === TradeOutcome.SKIPPED ? 'SKIPPED' : 'EXECUTED'}. 
      Dir: ${t.direction}. PnL: ₹${t.pnl || 0}. Setup: ${t.setupName}. Logic: ${t.entryReason}.
    `).join('\n');

    const prompt = `
      Analyze this batch of missions from a ${periodDescription}.
      ${strategyContext}

      Mission Log:
      ${tradeSummaries}

      Output a structured "Daily Coach's Report" in Markdown. 
      Include a section on "Disciplined Avoidance" if any trades were correctly skipped.
      
      Structure:
      ### 📊 Market Sync
      ### 🛡️ Execution Grade
      ### 💡 Pro Tip
    `;

    const response = await ai.models.generateContent({
      model: REASONING_MODEL,
      contents: prompt,
      config: {
        systemInstruction: "You are an expert trading psychologist. Format your response with clear Markdown headers and emojis.",
      }
    });

    return response.text || "Analysis complete.";

  } catch (error: any) {
    console.error("Error batch analyzing:", error);
    return `Deep analysis failed. API Error: ${error.message || "Unknown"}`;
  }
};

export const getDailyCoachTip = async (apiKey?: string): Promise<string> => {
  const key = apiKey || process.env.API_KEY;
  if (!key) return "Add API Key for daily wisdom.";
  
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: "Give me ONE powerful, ultra-short trading aphorism (MAX 15 WORDS). Focus on patience, risk, or discipline. Tone: Sun Tzu / Marcus Aurelius. No generic advice.",
    });
    return response.text?.trim() || "The market transfers money from the impatient to the patient.";
  } catch (e) {
    return "Protect your capital. It is your ammo.";
  }
};

// MULTIMODAL VOICE LOGGING
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
                setupName: { type: Type.STRING },
                note: { type: Type.STRING }
            }
        };

        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: {
              parts: [
                { inlineData: { mimeType: "audio/webm", data: audioBase64 } },
                {
                   text: `
                    Listen to this trader's voice note. Extract trading data for the Indian Nifty 50 market.
                    If they mention skipping or aborting, extract the reason into 'entryReason'.
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
        return { note: "Error processing voice note." }; 
    }
}

export const fetchMarketNews = async (apiKey?: string): Promise<NewsAnalysis> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required for News Intelligence");
    const ai = new GoogleGenAI({ apiKey: key });
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const promptText = `You are a Pre-Market Intelligence Officer for an Indian Stock Market trader. It is currently morning on ${today}. Use Google Search to find real-time financial news impacting the "Nifty 50" opening today. Output valid JSON.`;
    try {
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: { parts: [{ text: promptText }] },
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: "You are a financial news aggregator. Return strictly valid JSON text.",
                temperature: 0.1
            }
        });
        let jsonText = response.text || "{}";
        if (jsonText.includes("```")) jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "");
        return JSON.parse(jsonText);
    } catch (e: any) {
        throw new Error(e.message || "Failed to fetch market news.");
    }
};

export const analyzePreMarketRoutine = async (images: { market: string; intraday: string; oi: string; multiStrike: string }, newsContext: NewsAnalysis | null, apiKey?: string): Promise<PreMarketAnalysis> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required for Pre-Market Analysis");
    const ai = new GoogleGenAI({ apiKey: key });
    const parts: any[] = [];
    if (images.market) parts.push({ inlineData: { mimeType: "image/jpeg", data: images.market.split(',')[1] } });
    if (images.intraday) parts.push({ inlineData: { mimeType: "image/jpeg", data: images.intraday.split(',')[1] } });
    if (images.oi) parts.push({ inlineData: { mimeType: "image/jpeg", data: images.oi.split(',')[1] } });
    if (images.multiStrike) parts.push({ inlineData: { mimeType: "image/jpeg", data: images.multiStrike.split(',')[1] } });
    if (newsContext) parts.push({ text: `CONTEXT: ${JSON.stringify(newsContext)}` });
    const promptText = `Analyze charts for Nifty 50 Battle Plan. wait for 9:25 AM. Stop Loss 30 pts. Target 35 pts. Return JSON.`;
    parts.push({ text: promptText });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: { parts },
        config: { responseMimeType: "application/json", systemInstruction: "Disciplined coach. Valid JSON only.", temperature: 0.2 }
    });
    return JSON.parse(response.text || "{}");
}

export const analyzeLiveMarketRoutine = async (images: { liveChart: string; liveOi: string }, preMarketPlan: PreMarketAnalysis, apiKey?: string): Promise<LiveMarketAnalysis> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required for Live Check");
    const ai = new GoogleGenAI({ apiKey: key });
    const parts: any[] = [{ text: `CONTEXT: ${JSON.stringify(preMarketPlan)}` }];
    if (images.liveChart) parts.push({ inlineData: { mimeType: "image/jpeg", data: images.liveChart.split(',')[1] } });
    if (images.liveOi) parts.push({ inlineData: { mimeType: "image/jpeg", data: images.liveOi.split(',')[1] } });
    const promptText = `Nifty commander 9:20 AM live check. SL 30 pt, TGT 35 pt. Return JSON.`;
    parts.push({ text: promptText });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: { responseMimeType: "application/json", systemInstruction: "Real-time assistant. Sharp, decisive. Valid JSON.", temperature: 0.2 }
    });
    return JSON.parse(response.text || "{}");
}

export const analyzePostMarketRoutine = async (images: { dailyChart: string; eodChart: string; eodOi: string }, preMarketPlan: PreMarketAnalysis | null, apiKey?: string): Promise<PostMarketAnalysis> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required for Post-Market Analysis");
    const ai = new GoogleGenAI({ apiKey: key });
    const parts: any[] = [];
    if (preMarketPlan) parts.push({ text: `MORNING PLAN: ${JSON.stringify(preMarketPlan)}` });
    if (images.dailyChart) parts.push({ inlineData: { mimeType: "image/jpeg", data: images.dailyChart.split(',')[1] } });
    if (images.eodChart) parts.push({ inlineData: { mimeType: "image/jpeg", data: images.eodChart.split(',')[1] } });
    if (images.eodOi) parts.push({ inlineData: { mimeType: "image/jpeg", data: images.eodOi.split(',')[1] } });
    const promptText = `Review full day action. Lesson learned. Return JSON.`;
    parts.push({ text: promptText });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: { responseMimeType: "application/json", systemInstruction: "Retrospective analysis. Educational. Valid JSON.", temperature: 0.3 }
    });
    return JSON.parse(response.text || "{}");
}

export const getMentorChatResponse = async (chatHistory: any[], trades: Trade[], strategyProfile: StrategyProfile, apiKey?: string): Promise<string> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required for Mentor Chat");
    const ai = new GoogleGenAI({ apiKey: key });
    const historyForInit = [...chatHistory];
    const lastUserMsg = historyForInit.pop(); 
    const activeChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction: `War Room Mentor. Access to trades and strategy. Direct, no fluff. CITING SKIPPED MISSIONS AS POSITIVE IF JUSTIFIED.`, },
        history: historyForInit as any
    });
    if (!lastUserMsg) return "Silent check.";
    const result = await activeChat.sendMessage({ message: lastUserMsg.parts[0].text });
    return result.text || "";
}

export const getLiveTradeCoachResponse = async (chatHistory: any[], currentTradeData: any, strategyProfile: StrategyProfile, apiKey: string): Promise<string> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey: key });
    const historyForInit = [...chatHistory];
    const lastUserMsg = historyForInit.pop();
    const activeChat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: { systemInstruction: `AI Co-pilot in cockpit. Handle executed or skipped missions tactically.`, },
        history: historyForInit as any
    });
    if (!lastUserMsg) return "Standby.";
    const result = await activeChat.sendMessage({ message: lastUserMsg.parts });
    return result.text || "";
}
