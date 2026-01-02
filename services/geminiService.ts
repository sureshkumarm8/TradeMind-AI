
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { Trade, StrategyProfile, ParsedVoiceCommand, PreMarketAnalysis, LiveMarketAnalysis, PostMarketAnalysis, NewsAnalysis, EdgeInsight } from "../types";

// --- GLOBAL VARIABLES ---
const API_KEY = process.env.API_KEY;

// Helper to get configured models with strict fallbacks
const getModels = () => {
  const pref = localStorage.getItem('tradeMind_aiModel') || 'gemini-3-pro-preview';
  
  // -- GEMINI 3 SERIES (LATE 2025) --
  if (pref === 'gemini-3-pro-preview') return { fast: 'gemini-3-flash-preview', reasoning: 'gemini-3-pro-preview' };
  if (pref === 'gemini-3-deep-think') return { fast: 'gemini-3-flash-preview', reasoning: 'gemini-3-pro-preview' }; // Logic handled in call
  if (pref === 'gemini-3-flash-preview') return { fast: 'gemini-3-flash-preview', reasoning: 'gemini-3-flash-preview' };
  
  // -- GEMINI 2.5 SERIES (MID 2025) --
  if (pref === 'gemini-2.5-pro') return { fast: 'gemini-2.5-flash-latest', reasoning: 'gemini-2.0-pro-exp-02-05' }; 
  if (pref === 'gemini-2.5-flash-latest') return { fast: 'gemini-2.5-flash-latest', reasoning: 'gemini-2.5-flash-latest' };
  if (pref === 'gemini-flash-lite-latest') return { fast: 'gemini-flash-lite-latest', reasoning: 'gemini-flash-lite-latest' };
  
  // -- GEMINI 2.0 SERIES (EARLY 2025) --
  if (pref === 'gemini-2.0-pro') return { fast: 'gemini-2.0-flash-001', reasoning: 'gemini-2.0-pro-exp-02-05' };
  if (pref === 'gemini-2.0-flash') return { fast: 'gemini-2.0-flash-001', reasoning: 'gemini-2.0-flash-001' };
  if (pref === 'gemini-2.0-flash-thinking') return { fast: 'gemini-2.0-flash-001', reasoning: 'gemini-2.0-flash-thinking-exp-01-21' };
  if (pref === 'gemini-2.0-flash-lite') return { fast: 'gemini-2.0-flash-lite-preview-02-05', reasoning: 'gemini-2.0-flash-lite-preview-02-05' };

  // Default Fallback
  return { fast: 'gemini-3-flash-preview', reasoning: 'gemini-3-pro-preview' };
};

// --- ROBUST API WRAPPER ---
const generateContentSafe = async (ai: GoogleGenAI, preferredModel: string, params: any): Promise<any> => {
    // Helper to detect quota/rate issues robustly
    const isQuotaError = (e: any) => {
        const msg = JSON.stringify(e);
        return msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED') || e.status === 429 || e.status === 503;
    };

    const isModelNotFoundError = (e: any) => {
        const msg = JSON.stringify(e);
        return msg.includes('not found') || msg.includes('404') || msg.includes('publisher model');
    };

    const execute = async (model: string) => {
        return await ai.models.generateContent({
            model: model,
            ...params
        });
    };

    try {
        return await execute(preferredModel);
    } catch (e: any) {
        // If Model Not Found, immediately try a stable fallback (Flash 2.5)
        if (isModelNotFoundError(e)) {
            console.warn(`Model ${preferredModel} not found. Falling back to gemini-2.5-flash-latest.`);
            return await execute('gemini-2.5-flash-latest');
        }

        if (isQuotaError(e)) {
            console.warn(`Gemini Quota/Rate Limit Hit on ${preferredModel}.`);
            
            // If using Pro, it likely hit the 2 RPM limit of Free Tier.
            // Fallback to Flash Lite (Highest Rate Limit)
            if (preferredModel.includes('pro') || preferredModel.includes('thinking')) {
                console.warn(`Falling back to gemini-flash-lite-latest due to Rate Limit.`);
                try {
                    return await execute('gemini-flash-lite-latest');
                } catch (fallbackError: any) {
                    if (isQuotaError(fallbackError)) {
                         throw new Error(`Rate Limit Exceeded. Please wait 60 seconds.`);
                    }
                    throw fallbackError;
                }
            } else {
                // If Flash failed, we are really out of quota or hitting strict limits
                throw new Error(`Quota Exceeded. Check your API Plan.`);
            }
        }
        throw e;
    }
};

// --- HEALTH CHECK ---
export const checkModelHealth = async (apiKey: string, model: string): Promise<{ status: 'ok' | 'error' | 'quota', message: string, latency?: number }> => {
  const start = Date.now();
  const key = apiKey || API_KEY;
  if (!key) return { status: 'error', message: "No API Key Provided" };

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: "Ping" }] }
    });
    const latency = Date.now() - start;
    return { status: 'ok', message: "Operational", latency };
  } catch (e: any) {
    console.error("Health Check Error", e);
    const msg = e.message || JSON.stringify(e);
    if (msg.includes('429') || msg.includes('Quota')) {
      return { status: 'quota', message: "Rate Limit/Quota Exceeded (429)" };
    }
    return { status: 'error', message: "Connection Failed or Key Invalid" };
  }
};

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
  const key = apiKey || API_KEY;
  const pref = localStorage.getItem('tradeMind_aiModel');
  
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
    const models = getModels();
    
    const timeline = trade.notes 
        ? trade.notes.map(n => `[${n.timestamp}] ${n.content} (${n.type})`).join('\n') 
        : "No live timeline logged.";

    // --- DETERMINISTIC TIME CHECK (JS SIDE) ---
    // We calculate this in code to prevent AI hallucination about times
    let timeComplianceNote = "";
    if (trade.exitTime) {
        const [exitH, exitM] = trade.exitTime.split(':').map(Number);
        const exitMinutes = exitH * 60 + exitM;
        // Target: 10:15 AM = 615 minutes
        
        // Window: 10:10 (610) to 10:20 (620)
        // We define strict boolean logic here to feed the AI facts, not opinions.
        if (exitMinutes >= 610 && exitMinutes <= 620) {
            timeComplianceNote = `
            [SYSTEM VERIFIED FACT]: User exited at ${trade.exitTime}. 
            This matches the "10:15 AM Hard Stop" rule perfectly. 
            **MANDATORY INSTRUCTION:** Grade Discipline as 100/100. The user followed the hard stop rule. 
            Do NOT criticize early exit if profit target wasn't met. The Time Rule OVERRIDES the Profit Rule.
            `;
        } else if (exitMinutes > 620) {
            timeComplianceNote = `
            [SYSTEM VERIFIED FACT]: User exited at ${trade.exitTime}. 
            This is LATE (After 10:15 AM Hard Stop). 
            **MANDATORY INSTRUCTION:** Deduct points severely for violating the Hard Stop rule.
            `;
        } else {
            // Early exit (< 10:10)
            timeComplianceNote = `
            [SYSTEM VERIFIED FACT]: User exited at ${trade.exitTime}, before the hard stop window. 
            Analyze if they hit target or panic sold based on the charts/notes.
            `;
        }
    }

    const promptText = `
      You are a strict Quantitative Trading Mentor.
      
      ${strategyContext}
      
      ${timeComplianceNote}

      RULE HIERARCHY (CRITICAL):
      1. TIME STOPS are absolute. Use the [SYSTEM VERIFIED FACT] above as the source of truth for time compliance.
      2. "30 Points or Nothing" applies ONLY if the time limit hasn't been reached.
      3. Use the Chart Image (if provided) to verify the entry setup validity.
      
      User's Logged Trade:
      - Date: ${trade.date}
      - Time: ${trade.entryTime} to ${trade.exitTime}
      - Instrument: ${trade.instrument} ${trade.strikePrice || ''} ${trade.optionType || ''}
      - Direction: ${trade.direction}
      - Result: ${trade.outcome} (PnL: ₹${trade.pnl})
      - Logic Summary: "${trade.entryReason}"
      
      LIVE MISSION TIMELINE:
      ${timeline}
      
      CRITICAL OUTPUT INSTRUCTION:
      - Output STRICT VALID JSON only. No Markdown. No Intro.
      
      Expected JSON Structure:
      {
        "grade": "Integer 0-100",
        "gradeColor": "green, yellow, or red",
        "marketTrend": "Short phrase describing Nifty action",
        "realityCheck": "Comparison of User Entry vs Actual Market Price/Chart",
        "strategyAudit": {
            "timing": "Early, Late, or Perfect",
            "direction": "With Trend or Counter Trend",
            "rulesFollowed": true or false
        },
        "coachCommand": "One specific actionable command."
      }
    `;
    
    // Construct Parts: Image + Text
    const parts: any[] = [];
    
    if (trade.chartImage) {
        const base64Data = trade.chartImage.split(',')[1];
        parts.push({
            inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
            }
        });
        parts.push({ text: "First, analyze this trade chart image for setup validity." });
    }

    parts.push({ text: promptText });

    // Config Setup
    const config: any = {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a professional prop trader manager. Return ONLY valid JSON.",
        temperature: 0.2, 
    };

    // Activate Thinking Mode Logic
    if (pref === 'gemini-3-deep-think') {
        config.thinkingConfig = { thinkingBudget: 32768 }; // Max Budget for Deep Think
    } else if (models.reasoning === 'gemini-3-pro-preview' || models.reasoning.includes('thinking')) {
        config.thinkingConfig = { thinkingBudget: 16000 }; // Standard Reasoning
    }

    // Use Reasoning Model if available
    const response = await generateContentSafe(ai, models.reasoning, {
      contents: { parts },
      config: config
    });

    let jsonResult = response.text || "{}";
    const startIndex = jsonResult.indexOf('{');
    const endIndex = jsonResult.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
        jsonResult = jsonResult.substring(startIndex, endIndex + 1);
    }
    jsonResult = jsonResult.replace(/```json/g, '').replace(/```/g, '');
    
    // Validate JSON
    JSON.parse(jsonResult);
    
    return jsonResult;

  } catch (error: any) {
    console.error("Error analyzing trade:", error);
    let cleanMsg = "Unknown API Error";
    try {
        const errStr = typeof error === 'string' ? error : error.message;
        if (errStr.includes('not found')) cleanMsg = "Selected AI Model not found. Check Settings.";
        else if (errStr.includes('Quota') || errStr.includes('429')) cleanMsg = "Rate Limit Hit. Retrying with lighter model failed. Please wait.";
        else cleanMsg = errStr;
    } catch (e) { cleanMsg = String(error); }

    return JSON.stringify({
      grade: 0,
      gradeColor: "red",
      marketTrend: "Analysis Failed",
      realityCheck: cleanMsg,
      strategyAudit: { timing: "-", direction: "-", rulesFollowed: false },
      coachCommand: "Check Settings > AI Model or Wait 1 min"
    });
  }
};

export const analyzeBatch = async (trades: Trade[], periodDescription: string, strategyProfile?: StrategyProfile, apiKey?: string): Promise<string> => {
  const key = apiKey || API_KEY;
  if (!key) return "API Key is missing. Please add your Gemini API Key in Settings.";
  if (trades.length === 0) return "No trades to analyze for this period.";

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const strategyContext = formatStrategyForAI(strategyProfile);
    const models = getModels();
    const pref = localStorage.getItem('tradeMind_aiModel');

    // Batch analysis focuses on stats/text logs.
    const tradeSummaries = trades.map((t, i) => `
      ${i+1}. ${t.date} ${t.entryTime}: Spot ${t.niftyEntryPrice || '?'} -> ${t.niftyExitPrice || '?'}. 
      Dir: ${t.direction}. PnL: ₹${t.pnl}. Outcome: ${t.outcome}.
      Setup: ${t.setupName}. Mistakes: ${t.mistakes?.join(', ') || 'None'}.
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

    // Config for Batch
    const config: any = {
        systemInstruction: "You are an expert trading psychologist. Format your response with clear Markdown headers and emojis.",
    };
    
    // Enable Thinking for deep batch analysis
    if (pref === 'gemini-3-deep-think') {
        config.thinkingConfig = { thinkingBudget: 32768 };
    } else if (models.reasoning === 'gemini-3-pro-preview') {
        config.thinkingConfig = { thinkingBudget: 16000 }; 
    }

    const response = await generateContentSafe(ai, models.reasoning, {
      contents: prompt,
      config: config
    });

    return response.text || "Analysis complete.";

  } catch (error: any) {
    console.error("Error batch analyzing:", error);
    return `Deep analysis failed. API Error: ${error.message || "Unknown"}`;
  }
};

export const getDailyCoachTip = async (apiKey?: string): Promise<string> => {
  const key = apiKey || API_KEY;
  if (!key) return "Add API Key for daily wisdom.";
  
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();
    const response = await generateContentSafe(ai, models.fast, {
      contents: "Give me ONE powerful, ultra-short trading aphorism (MAX 15 WORDS). Focus on patience, risk, or discipline. Tone: Sun Tzu / Marcus Aurelius. No generic advice.",
    });
    return response.text?.trim() || "The market transfers money from the impatient to the patient.";
  } catch (e) {
    return "Protect your capital. It is your ammo.";
  }
};

export const parseVoiceCommand = async (audioBase64: string, apiKey?: string): Promise<ParsedVoiceCommand> => {
    const key = apiKey || API_KEY;
    if (!key) throw new Error("API Key Required");
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        const models = getModels();
        const responseSchema = { type: Type.OBJECT, properties: { instrument: { type: Type.STRING }, optionType: { type: Type.STRING }, strikePrice: { type: Type.NUMBER }, direction: { type: Type.STRING }, entryPrice: { type: Type.NUMBER }, quantity: { type: Type.NUMBER }, entryReason: { type: Type.STRING }, setupName: { type: Type.STRING }, note: { type: Type.STRING } } };
        const response = await generateContentSafe(ai, models.fast, {
            contents: { parts: [{ inlineData: { mimeType: "audio/webm", data: audioBase64 } }, { text: `Listen to voice note. Extract trading data.` }] },
            config: { responseMimeType: "application/json", responseSchema: responseSchema }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { return { note: "Error processing voice note." }; }
}

export const getEdgePatterns = async (trades: Trade[], apiKey: string): Promise<EdgeInsight[]> => {
    const key = apiKey || API_KEY;
    if (!key) throw new Error("API Key Required");
    const data = trades.filter(t => t.outcome !== 'OPEN').map(t => `${t.date} ${t.entryTime} | ${t.setupName} | ${t.outcome} (${t.pnl})`).join('\n');
    const prompt = `Analyze trades for patterns. Output JSON array of insights. Data: ${data}`;
    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();
    
    const config: any = { responseMimeType: "application/json" };
    // Standard thinking for patterns
    if (models.reasoning === 'gemini-3-pro-preview') config.thinkingConfig = { thinkingBudget: 16000 };

    try {
        const response = await generateContentSafe(ai, models.reasoning, { contents: prompt, config });
        return JSON.parse(response.text || "[]");
    } catch (e) { return [{ type: 'strength', title: 'Data Insufficient', description: 'Log more trades.', actionable: 'Keep logging.' }]; }
}

export const queryTradeArchives = async (query: string, trades: Trade[], apiKey: string): Promise<{ matchingIds: string[], answer: string }> => {
    const key = apiKey || API_KEY;
    if (!key) throw new Error("API Key Required");
    const tradeDocs = trades.map(t => `ID: ${t.id} Date: ${t.date} Outcome: ${t.outcome} Note: ${t.entryReason}`).join('\n---\n');
    const prompt = `User Query: "${query}". Trade Logs: ${tradeDocs}. Return JSON {matchingIds, answer}.`;
    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();
    try {
        const response = await generateContentSafe(ai, models.fast, { contents: prompt, config: { responseMimeType: "application/json" } });
        return JSON.parse(response.text || '{"matchingIds": [], "answer": "No matches found."}');
    } catch (e) { return { matchingIds: [], answer: "AI Error." }; }
}

export const fetchMarketNews = async (apiKey?: string): Promise<NewsAnalysis> => {
    const key = apiKey || API_KEY;
    if (!key) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();
    const promptText = `Find real-time news for Nifty 50 opening today. Output JSON {sentiment, sentimentScore, summary, globalCues, keyHeadlines, institutionalActivity}`;
    try {
        const response = await generateContentSafe(ai, models.fast, {
            contents: { parts: [{ text: promptText }] },
            config: { tools: [{ googleSearch: {} }], systemInstruction: "News aggregator. JSON only.", temperature: 0.1 }
        });
        let jsonText = response.text || "{}";
        if (jsonText.includes("```")) jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "");
        return JSON.parse(jsonText);
    } catch (e: any) { throw new Error(e.message || "Failed to fetch news."); }
};

export const getMentorChatResponse = async (chatHistory: any[], trades: Trade[], strategyProfile: StrategyProfile, apiKey?: string): Promise<string> => {
    const key = apiKey || API_KEY;
    if (!key) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();
    const historyForInit = [...chatHistory];
    const lastUserMsg = historyForInit.pop(); 
    try {
        const activeChat = ai.chats.create({
            model: models.fast,
            config: { systemInstruction: `You are a Trading Mentor. Strategy: ${strategyProfile.name}.` },
            history: historyForInit
        });
        const result = await activeChat.sendMessage({ message: lastUserMsg.parts[0].text });
        return result.text || "";
    } catch (e: any) { return `Error: ${e.message}`; }
}

export const getLiveTradeCoachResponse = async (chatHistory: any[], currentTradeData: any, strategyProfile: StrategyProfile, apiKey: string): Promise<string> => {
    const key = apiKey || API_KEY;
    if (!key) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();
    const historyForInit = [...chatHistory];
    const lastUserMsg = historyForInit.pop(); 
    try {
        const activeChat = ai.chats.create({
            model: models.fast,
            config: { systemInstruction: `You are a Live Trading Co-Pilot. Strategy: ${strategyProfile.name}.` },
            history: historyForInit
        });
        const result = await activeChat.sendMessage({ message: lastUserMsg.parts[0].text });
        return result.text || "";
    } catch (e: any) { return `Error: ${e.message}`; }
}

// Pre-Market Routine Analysis
export const analyzePreMarketRoutine = async (images: { market: string, intraday: string, oi: string, multiStrike: string }, newsData: NewsAnalysis | null, apiKey: string): Promise<PreMarketAnalysis> => {
    const key = apiKey || API_KEY;
    if (!key) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();
    const pref = localStorage.getItem('tradeMind_aiModel');

    const promptText = `
    Analyze these 4 charts (Market Graph, Intraday, OI, Multi-Strike OI) for Nifty 50 Pre-Market planning.
    News Context: ${newsData ? JSON.stringify(newsData) : "No news data provided."}

    Output STRICT JSON for a Pre-Market Plan.
    JSON Structure:
    {
      "marketBias": "Bullish" | "Bearish" | "Neutral" | "Volatile",
      "confidenceScore": number (1-10),
      "keyLevels": { "resistance": [number], "support": [number] },
      "coreThesis": "string",
      "firstHourPlan": { "action": "string", "potentialTrade": { "direction": "LONG"|"SHORT", "entryZone": "string", "stopLoss": "string", "target": "string" } },
      "tradeSetups": { "primary": { ... }, "alternate": { ... } }, 
      "openingScenarios": { "gapUp": "string", "gapDown": "string" },
      "chartSummaries": { "marketGraph": "string", "intraday": "string", "oiData": "string", "multiStrike": "string" }
    }
    `;

    const parts = [
        { text: promptText },
        { inlineData: { mimeType: "image/jpeg", data: images.market.split(',')[1] } },
        { inlineData: { mimeType: "image/jpeg", data: images.intraday.split(',')[1] } },
        { inlineData: { mimeType: "image/jpeg", data: images.oi.split(',')[1] } },
        { inlineData: { mimeType: "image/jpeg", data: images.multiStrike.split(',')[1] } }
    ];

    // Config with Thinking for Pro
    const config: any = { responseMimeType: "application/json" };
    if (pref === 'gemini-3-deep-think') {
        config.thinkingConfig = { thinkingBudget: 32768 };
    } else if (models.reasoning === 'gemini-3-pro-preview') {
        config.thinkingConfig = { thinkingBudget: 16000 }; 
    }

    try {
        const response = await generateContentSafe(ai, models.reasoning, {
            contents: { parts },
            config: config
        });
        return JSON.parse(response.text || "{}");
    } catch (e: any) {
        console.error(e);
        throw new Error("Pre-Market Analysis Failed");
    }
};

// Live Market Routine Analysis
export const analyzeLiveMarketRoutine = async (images: { liveChart: string, liveOi: string }, preMarketPlan: PreMarketAnalysis, apiKey: string): Promise<LiveMarketAnalysis> => {
    const key = apiKey || API_KEY;
    if (!key) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();

    const promptText = `
    Compare current Live Charts (Price & OI) against the Pre-Market Plan.
    Pre-Market Plan: ${JSON.stringify(preMarketPlan)}

    Output STRICT JSON.
    Structure:
    {
        "status": "CONFIRMED" | "INVALIDATED" | "CAUTION",
        "updatedBias": "Bullish" | "Bearish" | "Neutral",
        "realityCheck": "string",
        "immediateAction": "string",
        "tradeUpdate": { "direction": "LONG"|"SHORT", "entryPrice": "string", "stopLoss": "string", "target": "string" }
    }
    `;

    const parts = [
        { text: promptText },
        { inlineData: { mimeType: "image/jpeg", data: images.liveChart.split(',')[1] } },
        { inlineData: { mimeType: "image/jpeg", data: images.liveOi.split(',')[1] } }
    ];

    try {
        // Live analysis uses 'fast' model by default for speed, but if 'fast' maps to '3-flash', it's smart enough.
        // We do NOT use thinking here to ensure speed (Phase 2 requirement).
        const response = await generateContentSafe(ai, models.reasoning, {
            contents: { parts },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (e: any) {
        console.error(e);
        throw new Error("Live Analysis Failed");
    }
};

// Post Market Routine Analysis
export const analyzePostMarketRoutine = async (images: { dailyChart: string, eodChart: string, eodOi: string }, preMarketPlan: PreMarketAnalysis | null, apiKey: string): Promise<PostMarketAnalysis> => {
    const key = apiKey || API_KEY;
    if (!key) throw new Error("API Key Required");
    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();
    const pref = localStorage.getItem('tradeMind_aiModel');

    const promptText = `
    Conduct Post-Market Debrief.
    Pre-Market Plan (for reference): ${preMarketPlan ? JSON.stringify(preMarketPlan) : "None provided"}

    Output STRICT JSON.
    Structure:
    {
        "predictionAccuracy": "High" | "Medium" | "Low",
        "actualTrend": "string",
        "planVsReality": "string",
        "keyTakeaways": "string",
        "tomorrowOutlook": {
            "bias": "Bullish" | "Bearish" | "Neutral",
            "earlyLevels": { "support": [number], "resistance": [number] },
            "watchFor": "string"
        }
    }
    `;

    const parts = [
        { text: promptText },
        { inlineData: { mimeType: "image/jpeg", data: images.dailyChart.split(',')[1] } },
        { inlineData: { mimeType: "image/jpeg", data: images.eodChart.split(',')[1] } },
        { inlineData: { mimeType: "image/jpeg", data: images.eodOi.split(',')[1] } }
    ];

    // Config with Thinking for Pro
    const config: any = { responseMimeType: "application/json" };
    if (pref === 'gemini-3-deep-think') {
        config.thinkingConfig = { thinkingBudget: 32768 };
    } else if (models.reasoning === 'gemini-3-pro-preview') {
        config.thinkingConfig = { thinkingBudget: 16000 }; 
    }

    try {
        const response = await generateContentSafe(ai, models.reasoning, {
            contents: { parts },
            config: config
        });
        return JSON.parse(response.text || "{}");
    } catch (e: any) {
        console.error(e);
        throw new Error("Post-Market Analysis Failed");
    }
};
