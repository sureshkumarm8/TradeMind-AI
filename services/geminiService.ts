
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { Trade, StrategyProfile, ParsedVoiceCommand, PreMarketAnalysis, LiveMarketAnalysis, PostMarketAnalysis, NewsAnalysis } from "../types";

// Helper to get configured models
const getModels = () => {
  const pref = localStorage.getItem('tradeMind_aiModel');
  switch (pref) {
    // --- GEMINI 3 SERIES ---
    case 'gemini-3-pro':
      return { fast: 'gemini-3-flash-preview', reasoning: 'gemini-3-pro-preview' };
    case 'gemini-3-flash':
      return { fast: 'gemini-3-flash-preview', reasoning: 'gemini-3-flash-preview' };
    
    // --- GEMINI 2.5 SERIES ---
    case 'gemini-2.5-pro': 
      // Mapping 2.5 Pro preference to 3-Pro for best reasoning performance if 2.5 Pro specific string is not standard yet
      // or to 3-pro as the 'Pro' standard. 
      return { fast: 'gemini-2.5-flash-latest', reasoning: 'gemini-3-pro-preview' };
    case 'gemini-2.5-flash':
      return { fast: 'gemini-2.5-flash-latest', reasoning: 'gemini-2.5-flash-latest' };
    case 'gemini-2.5-flash-lite':
      return { fast: 'gemini-flash-lite-latest', reasoning: 'gemini-flash-lite-latest' };

    // --- GEMINI 2.0 SERIES ---
    case 'gemini-2.0-flash':
      // Maps to the general stable flash alias
      return { fast: 'gemini-flash-latest', reasoning: 'gemini-flash-latest' };
    case 'gemini-2.0-flash-lite':
      return { fast: 'gemini-flash-lite-latest', reasoning: 'gemini-flash-lite-latest' };

    // --- LEGACY / FALLBACK ---
    case 'gemini-flash-stable':
      return { fast: 'gemini-flash-latest', reasoning: 'gemini-flash-latest' };
    case 'gemini-flash-lite':
      return { fast: 'gemini-flash-lite-latest', reasoning: 'gemini-flash-lite-latest' };
      
    default:
      // Default to the most capable pairing
      return { fast: 'gemini-3-flash-preview', reasoning: 'gemini-3-pro-preview' };
  }
};

// --- ROBUST API WRAPPER ---
/**
 * Wraps Gemini API calls with:
 * 1. Immediate Fallback for Pro model quotas (429/Resource Exhausted).
 * 2. Retry logic for Fast model transient errors.
 */
const generateContentSafe = async (ai: GoogleGenAI, preferredModel: string, params: any): Promise<any> => {
    const models = getModels();
    
    // Helper to detect quota issues robustly
    const isQuotaError = (e: any) => {
        const msg = JSON.stringify(e);
        return msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED') || e.status === 429 || e.status === 503;
    };

    const execute = async (model: string) => {
        return await ai.models.generateContent({
            model: model,
            ...params
        });
    };

    try {
        // Attempt 1: Preferred Model
        return await execute(preferredModel);
    } catch (e: any) {
        if (isQuotaError(e)) {
            console.warn(`Gemini Quota Hit on ${preferredModel}.`);
            
            // STRATEGY: If using Pro/Reasoning and it fails, switch to Fast immediately.
            // Do not retry Pro on free tier as it has very low RPM (Requests Per Minute).
            if (preferredModel === models.reasoning && models.reasoning !== models.fast) {
                console.warn(`Falling back to ${models.fast} immediately.`);
                try {
                    return await execute(models.fast);
                } catch (fallbackError: any) {
                    // If fallback also fails, it's a hard stop.
                    throw fallbackError;
                }
            } else {
                // If we are already on Fast model, wait a bit and retry once.
                console.warn("Retrying Fast model after delay...");
                await new Promise(r => setTimeout(r, 2000));
                return await execute(preferredModel);
            }
        }
        throw e;
    }
};

// --- HEALTH CHECK ---
export const checkModelHealth = async (apiKey: string, model: string): Promise<{ status: 'ok' | 'error' | 'quota', message: string, latency?: number }> => {
  const start = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey });
    // Minimal token request to test connectivity and quota
    await ai.models.generateContent({
      model: model,
      contents: { parts: [{ text: "Ping" }] }
    });
    const latency = Date.now() - start;
    return { status: 'ok', message: "Operational", latency };
  } catch (e: any) {
    console.error("Health Check Error", e);
    const msg = e.message || JSON.stringify(e);
    if (msg.includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED')) {
      return { status: 'quota', message: "Quota Exceeded (429)" };
    }
    return { status: 'error', message: "Connection Failed" };
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
    const models = getModels();
    
    // Format timeline for prompt
    const timeline = trade.notes 
        ? trade.notes.map(n => `[${n.timestamp}] ${n.content} (${n.type})`).join('\n') 
        : "No live timeline logged.";

    const promptText = `
      You are a strict Quantitative Trading Mentor.
      The user follows a specific system.
      ${strategyContext}
      
      RULE HIERARCHY (CRITICAL):
      1. TIME STOPS are absolute. If the strategy says "Exit by 10:15" and the user exits at 10:15 (or slightly before/after), that is PERFECT DISCIPLINE, regardless of whether the Profit Target was hit.
      2. RISK MANAGEMENT > TARGETS. If the user exits early to preserve capital due to a valid reason logged in timeline (e.g. "Choppy", "Reversal"), they must be credited for following "NO SETUP = NO TRADE".
      3. "30 Points or Nothing" applies ONLY if the time limit hasn't been reached. If time limit is hit, exiting with 10 pts or 0 pts is CORRECT behavior.
      
      TASK:
      1. Use Google Search to find the ACTUAL Nifty 50 intraday price action on ${trade.date} between ${trade.entryTime || 'market open'} and ${trade.exitTime || 'market close'}.
      2. If a chart image is provided, analyze the visual price structure (Candles, Patterns) to verify the entry.
      3. Compare the user's Nifty Spot Entry (${trade.niftyEntryPrice || 'Not Logged'}) vs the Real Market.
      4. Verify if their view (LONG/SHORT) aligned with the trend in that specific window.
      5. Analyze their "Live Mission Timeline" (below) to check emotional stability and decision making during the trade.
      
      User's Logged Trade:
      - Date: ${trade.date}
      - Time: ${trade.entryTime} to ${trade.exitTime} (${trade.tradeDurationMins} mins)
      - Nifty Spot: Entered @ ${trade.niftyEntryPrice}, Exited @ ${trade.niftyExitPrice}
      - Instrument: ${trade.instrument} ${trade.strikePrice || ''} ${trade.optionType || ''}
      - Direction: ${trade.direction}
      - Result: ${trade.outcome} (PnL: ₹${trade.pnl})
      - Logic Summary: "${trade.entryReason}"
      
      LIVE MISSION TIMELINE (Thoughts during trade):
      ${timeline}
      
      CRITICAL OUTPUT INSTRUCTION:
      - You must output STRICT VALID JSON only.
      - Do NOT wrap the JSON in markdown code blocks (like \`\`\`json). 
      - Do NOT output any introductory text. Just the curly braces { ... }.
      
      Expected JSON Structure:
      {
        "grade": "Integer between 0 and 100 representing execution score. 100 is Perfect Discipline.",
        "gradeColor": "green (80-100), yellow (50-79), or red (0-49)",
        "marketTrend": "Short phrase describing Nifty action during trade window (e.g. 'Strong Bullish Trend', 'Choppy Range')",
        "realityCheck": "Direct comparison of User Entry vs Actual Market Price Action found via Search",
        "strategyAudit": {
            "timing": "Early, Late, or Perfect",
            "direction": "With Trend or Counter Trend",
            "rulesFollowed": true or false
        },
        "coachCommand": "One specific, actionable command for the next trade."
      }
    `;
    
    const parts: any[] = [{ text: promptText }];
    
    // Add Chart Image if exists (base64)
    if (trade.chartImage) {
        const base64Data = trade.chartImage.split(',')[1];
        parts.push({
            inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
            }
        });
        parts.push({ text: "Analyze the attached chart screenshot for technical confluence." });
    }

    // Use Reasoning Model for better quality, fallback to Fast handled by wrapper
    const response = await generateContentSafe(ai, models.reasoning, {
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }], // Enable Grounding
        systemInstruction: "You are a professional prop trader manager. Return ONLY valid JSON. No Markdown.",
        temperature: 0.2, // Lower temperature for stricter adherence
      }
    });

    let jsonResult = response.text || "{}";
    
    // Robust JSON Extraction
    const startIndex = jsonResult.indexOf('{');
    const endIndex = jsonResult.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
        jsonResult = jsonResult.substring(startIndex, endIndex + 1);
    }
    
    // Clean markdown if present (double check)
    jsonResult = jsonResult.replace(/```json/g, '').replace(/```/g, '');
    
    let resultObj: any = {};
    try {
        resultObj = JSON.parse(jsonResult);
    } catch(e) {
        console.error("JSON Parse Error", e, jsonResult);
        return JSON.stringify({
            grade: 0, 
            gradeColor: "gray",
            marketTrend: "Analysis Error", 
            realityCheck: "AI returned invalid format. Try again.", 
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

  } catch (error: any) {
    console.error("Error analyzing trade:", error);
    
    // Parse error for better display
    let cleanMsg = "Unknown API Error";
    try {
        // Attempt to parse JSON error message from Google
        const errStr = typeof error === 'string' ? error : error.message;
        if (errStr && errStr.includes('{')) {
             // Extract JSON part if mixed with text
             const start = errStr.indexOf('{');
             const end = errStr.lastIndexOf('}');
             if (start !== -1 && end !== -1) {
                 const jsonPart = JSON.parse(errStr.substring(start, end + 1));
                 cleanMsg = jsonPart.error?.message || jsonPart.message || cleanMsg;
             } else {
                 cleanMsg = errStr;
             }
        } else {
            cleanMsg = errStr;
        }
    } catch (e) { cleanMsg = String(error); }

    // Friendly message for Quota issues
    if (cleanMsg.includes('429') || cleanMsg.includes('Quota') || cleanMsg.includes('exhausted')) {
        cleanMsg = "Gemini Quota Exceeded. Please wait a moment or switch to 'Flash Lite' model in Settings.";
    }

    return JSON.stringify({
      grade: 0,
      gradeColor: "red",
      marketTrend: "Analysis Failed",
      realityCheck: cleanMsg,
      strategyAudit: { timing: "-", direction: "-", rulesFollowed: false },
      coachCommand: "Check Settings > AI Model"
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
    const models = getModels();

    // Prepare a summary of trades for the prompt to save tokens/complexity
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

    const response = await generateContentSafe(ai, models.reasoning, {
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
    const models = getModels();
    const response = await generateContentSafe(ai, models.fast, {
      contents: "Give me ONE powerful, ultra-short trading aphorism (MAX 15 WORDS). Focus on patience, risk, or discipline. Tone: Sun Tzu / Marcus Aurelius. No generic advice.",
    });
    return response.text?.trim() || "The market transfers money from the impatient to the patient.";
  } catch (e) {
    return "Protect your capital. It is your ammo.";
  }
};

// MULTIMODAL VOICE LOGGING
// Accepts Audio Base64 -> Returns JSON
export const parseVoiceCommand = async (audioBase64: string, apiKey?: string): Promise<ParsedVoiceCommand> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required");

    try {
        const ai = new GoogleGenAI({ apiKey: key });
        const models = getModels();
        
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

        const response = await generateContentSafe(ai, models.fast, {
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
                    
                    TASK 1: IF they are dictating trade parameters (e.g. "Buy Nifty 21500 CE at 150"):
                    - Extract Option Type (CE/PE), Strike, Entry Price, Qty.
                    
                    TASK 2: IF they are dictating a thought/feeling (e.g. "I am feeling nervous about this resistance"):
                    - Put the entire text into the 'note' field.
                    
                    TASK 3: IF mixed, extract parameters AND put the logic/feeling into 'entryReason' or 'note'.
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

// NEW: PATTERN RECOGNITION (Edge Lab)
export interface EdgeInsight {
    type: 'strength' | 'weakness' | 'opportunity';
    title: string;
    description: string;
    actionable: string;
}

export const getEdgePatterns = async (trades: Trade[], apiKey: string): Promise<EdgeInsight[]> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required");

    // Filter closed trades and map to lightweight format
    const data = trades
        .filter(t => t.outcome !== 'OPEN')
        .map(t => `${t.date} ${t.entryTime} | ${t.setupName || 'NoSetup'} | ${t.outcome} (PnL: ${t.pnl}) | Mistakes: ${t.mistakes?.join(',') || 'None'} | Mood: ${t.emotionalState || 'Neutral'}`)
        .join('\n');

    const prompt = `
        Analyze this raw trade log for Hidden Statistical Patterns.
        
        DATA:
        ${data}
        
        TASK:
        Find 3 deep correlations.
        1. STRENGTH: When does the user win most? (Time of day, specific setup, or emotional state).
        2. LEAK: Where is the money being lost? (Specific mistake, day of week, or "revenge" patterns).
        3. OPPORTUNITY / SIMULATION: "If you had eliminated X (e.g. FOMO trades), your PnL would likely be Y% higher."
        
        OUTPUT JSON ARRAY:
        [
            { "type": "strength", "title": "e.g. The 10 AM Sniper", "description": "...", "actionable": "..." },
            { "type": "weakness", "title": "e.g. The Mid-Day Slump", "description": "...", "actionable": "..." },
            { "type": "opportunity", "title": "e.g. Revenge Tax Refund", "description": "...", "actionable": "..." }
        ]
    `;

    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();
    
    try {
        const response = await generateContentSafe(ai, models.reasoning, {
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                // schema: ... (optional, but prompt is usually enough for array)
            }
        });
        
        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error("Edge Pattern Error", e);
        return [
            { type: 'strength', title: 'Data Insufficient', description: 'Log more trades to unlock patterns.', actionable: 'Keep logging.' }
        ];
    }
}

// NEW: SEMANTIC ARCHIVE SEARCH
export const queryTradeArchives = async (query: string, trades: Trade[], apiKey: string): Promise<{ matchingIds: string[], answer: string }> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required");

    // Create a lightweight index for the prompt
    // We include ID, Date, Outcome, PnL, Mistakes, and most importantly, NOTES.
    const tradeDocs = trades.map(t => {
        const notesText = t.notes?.map(n => n.content).join(" ");
        return `ID: ${t.id}
        Date: ${t.date}
        Outcome: ${t.outcome} (PnL: ${t.pnl})
        Setup: ${t.setupName}
        Mistakes: ${t.mistakes?.join(', ')}
        Notes/Emotions: ${t.entryReason} ${t.exitReason} ${t.emotionalState} ${notesText}`;
    }).join('\n---\n');

    const prompt = `
        You are a database administrator for a high-performance trading journal.
        The user is querying their past trades using natural language.
        
        USER QUERY: "${query}"
        
        DATABASE (Trade Logs):
        ${tradeDocs}
        
        TASK:
        1. Identify which trades match the semantic meaning of the user's query.
           (e.g., if they ask "When did I hesitate?", look for keywords like "hesitated", "waited too long", "scared", "late entry" in notes).
        2. Return the list of matching Trade IDs.
        3. Provide a very brief (1 sentence) summary of what you found common in these trades.
        
        OUTPUT JSON:
        {
            "matchingIds": ["id1", "id2"],
            "answer": "Found 3 trades where you mentioned hesitation; all were losing trades."
        }
    `;

    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();
    
    try {
        const response = await generateContentSafe(ai, models.fast, {
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        
        return JSON.parse(response.text || '{"matchingIds": [], "answer": "No matches found."}');
    } catch (e) {
        console.error("Archive Query Error", e);
        return { matchingIds: [], answer: "AI Error during search." };
    }
}

// NEWS INTELLIGENCE ROUTINE (PHASE 0)
export const fetchMarketNews = async (apiKey?: string): Promise<NewsAnalysis> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required for News Intelligence");

    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const promptText = `
        You are a Pre-Market Intelligence Officer for an Indian Stock Market trader. It is currently morning on ${today}.
        
        YOUR MISSION:
        Use Google Search to find real-time financial news impacting the "Nifty 50" opening today.
        
        SEARCH FOR:
        1. "Global stock market news today" (US Close, Asian Open).
        2. "Gift Nifty live status" (Gap Up/Down?).
        3. "Indian stock market news today" (FII/DII data, Key Earnings).
        4. "Crude oil price today" and "USD INR rate".
        
        ANALYZE & SYNTHESIZE:
        - Determine the overall sentiment for Nifty 50 opening (Bullish/Bearish).
        - Summarize the "Global Cues" concisely.
        - Extract the specific status of "Gift Nifty" (points up/down).
        - Find the latest FII/DII cash market activity if available.
        
        OUTPUT FORMAT:
        Return valid JSON only. No Markdown. No code blocks.
        JSON Structure:
        {
            "sentiment": "Bullish" | "Bearish" | "Neutral" | "Mixed",
            "sentimentScore": number (1-10),
            "summary": "string",
            "globalCues": {
                "usMarket": "string",
                "asianMarket": "string",
                "giftNifty": "string"
            },
            "keyHeadlines": ["string", "string"],
            "institutionalActivity": "string"
        }
    `;

    try {
        const response = await generateContentSafe(ai, models.fast, {
            contents: { parts: [{ text: promptText }] },
            config: {
                tools: [{ googleSearch: {} }],
                // Removed responseMimeType and responseSchema to be compatible with Google Search tool
                systemInstruction: "You are a financial news aggregator. Prioritize recency. Return strictly valid JSON text.",
                temperature: 0.1
            }
        });

        let jsonText = response.text || "{}";
        // Clean markdown if present
        if (jsonText.includes("```")) {
            jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "");
        }
        return JSON.parse(jsonText);
    } catch (e: any) {
        console.error("News Fetch Error", e);
        throw new Error(e.message || "Failed to fetch market news.");
    }
};

// PRE-MARKET ANALYZER ROUTINE
export const analyzePreMarketRoutine = async (
    images: { market: string; intraday: string; oi: string; multiStrike: string },
    newsContext: NewsAnalysis | null,
    apiKey?: string
): Promise<PreMarketAnalysis> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required for Pre-Market Analysis");

    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();

    // Prepare prompt parts
    const parts: any[] = [];
    
    // Add Images with labels in text
    if (images.market) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: images.market.split(',')[1] } });
        parts.push({ text: "Image 1: Market Overview Graph" });
    }
    if (images.intraday) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: images.intraday.split(',')[1] } });
        parts.push({ text: "Image 2: Intraday Chart (5min)" });
    }
    if (images.oi) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: images.oi.split(',')[1] } });
        parts.push({ text: "Image 3: Total Open Interest (OI)" });
    }
    if (images.multiStrike) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: images.multiStrike.split(',')[1] } });
        parts.push({ text: "Image 4: Multi-Strike OI Changes" });
    }

    // Add News Context if available
    if (newsContext) {
        parts.push({
            text: `
            CONTEXT FROM LIVE NEWS SCAN:
            - Overall Sentiment: ${newsContext.sentiment} (${newsContext.sentimentScore}/10)
            - Global Cues: US ${newsContext.globalCues.usMarket}, Asia ${newsContext.globalCues.asianMarket}, Gift Nifty ${newsContext.globalCues.giftNifty}
            - FII/DII: ${newsContext.institutionalActivity}
            - Headlines: ${newsContext.keyHeadlines.join(', ')}
            - News Summary: ${newsContext.summary}
            
            Use this news context to validate or question the technical signals from the charts.
            `
        });
    }

    // Strict Schema Definition
    const schema = {
        type: Type.OBJECT,
        properties: {
            marketBias: { type: Type.STRING, enum: ['Bullish', 'Bearish', 'Neutral', 'Volatile'] },
            confidenceScore: { type: Type.NUMBER, description: "1 to 10" },
            keyLevels: {
                type: Type.OBJECT,
                properties: {
                    resistance: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    support: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                }
            },
            coreThesis: { type: Type.STRING, description: "1-2 sentence central trading hypothesis" },
            firstHourPlan: {
                type: Type.OBJECT,
                properties: {
                    action: { type: Type.STRING, description: "Tactical plan STRICTLY for the 09:25 AM to 09:45 AM window." },
                    potentialTrade: {
                        type: Type.OBJECT,
                        properties: {
                            direction: { type: Type.STRING, enum: ['LONG', 'SHORT'] },
                            entryZone: { type: Type.STRING },
                            stopLoss: { type: Type.STRING, description: "Must be 'Exactly 30 pts'" },
                            target: { type: Type.STRING, description: "Must be 'Exactly 35 pts'" }
                        }
                    }
                }
            },
            tradeSetups: {
                type: Type.OBJECT,
                properties: {
                    primary: {
                        type: Type.OBJECT,
                        properties: {
                            direction: { type: Type.STRING, enum: ['LONG', 'SHORT'] },
                            trigger: { type: Type.STRING },
                            target: { type: Type.NUMBER },
                            stopLoss: { type: Type.NUMBER }
                        }
                    },
                    alternate: {
                         type: Type.OBJECT,
                        properties: {
                            direction: { type: Type.STRING, enum: ['LONG', 'SHORT'] },
                            trigger: { type: Type.STRING },
                            target: { type: Type.NUMBER },
                            stopLoss: { type: Type.NUMBER }
                        }
                    }
                }
            },
            openingScenarios: {
                type: Type.OBJECT,
                properties: {
                    gapUp: { type: Type.STRING },
                    gapDown: { type: Type.STRING }
                }
            },
            chartSummaries: {
                type: Type.OBJECT,
                properties: {
                    marketGraph: { type: Type.STRING },
                    intraday: { type: Type.STRING },
                    oiData: { type: Type.STRING },
                    multiStrike: { type: Type.STRING }
                }
            }
        }
    };

    // System Instruction
    const promptText = `
        You are an expert Nifty 50 intraday trading strategist.
        
        TASK:
        Analyze the provided charts with extreme precision.
        
        STEP 1: DATA EXTRACTION (Internal Thought Process)
        - Image 1 (Market Graph): Read the exact price value on the right axis. Identify the candle pattern of the last few candles.
        - Image 2 (Intraday): Identify specific support/resistance zones by reading the price axis numbers.
        - Image 3 (Total OI): Compare the height of Call bars (Red/Green usually) vs Put bars at the ATM strike. Read the Strike Prices on X-axis.
        - Image 4 (Multi-Strike): Check if Call OI line is crossing above/below Put OI line.
        
        STEP 2: STRATEGY GENERATION
        Based *only* on the data extracted above (do not hallucinate levels not visible):
        
        CRITICAL TIME CONSTRAINTS:
        - The trader DOES NOT trade immediately at 9:15 AM.
        - They wait for 10 minutes (9:15 - 9:25) to let the dust settle.
        - The 'firstHourPlan' MUST focus strictly on the entry window: 09:25 AM to 09:45 AM.
        - All advice must be for acting within this specific 20-minute slot.
        - CRITICAL RULE: "10:15 AM HARD STOP". If no setup is clear for the 9:25-9:45 window, state "NO TRADE" explicitly.
        
        CRITICAL RISK CONSTRAINTS:
        - For any trade recommended, the Stop Loss MUST be exactly 30 points from entry.
        - The Target MUST be exactly 35 points from entry.
        
        Generate a detailed Battle Plan in JSON format based on the schema.
        1. Identify the directional bias${newsContext ? ' (weighing chart structure vs news sentiment)' : ''}.
        2. Extract key Support & Resistance levels.
        3. Formulate a core thesis.
        4. Create a specific tactical plan for the 9:25 AM - 9:45 AM window.
        5. Define Primary and Alternate trade setups.
        6. Provide specific advice for Gap Up and Gap Down openings.
        7. Summarize key signals from each chart.
    `;
    
    parts.push({ text: promptText });

    try {
        const response = await generateContentSafe(ai, models.reasoning, {
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                systemInstruction: "You are a disciplined trading coach. Be objective. Extract specific numbers from axes before forming an opinion.",
                temperature: 0.2
            }
        });

        return JSON.parse(response.text || "{}");

    } catch (e: any) {
        console.error("Pre-Market Analysis Error", e);
        throw new Error(e.message || "Failed to generate Pre-Market Plan.");
    }
}

// LIVE MARKET CHECK ROUTINE (9:20 AM)
export const analyzeLiveMarketRoutine = async (
    images: { liveChart: string; liveOi: string },
    preMarketPlan: PreMarketAnalysis,
    apiKey?: string
): Promise<LiveMarketAnalysis> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required for Live Check");

    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();
    const parts: any[] = [];

    // Context: Pre-Market Plan
    const contextStr = JSON.stringify(preMarketPlan, null, 2);
    parts.push({ text: `PRE-MARKET PLAN (Context): ${contextStr}` });

    // Live Images
    if (images.liveChart) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: images.liveChart.split(',')[1] } });
        parts.push({ text: "LIVE CHART (9:20 AM)" });
    }
    if (images.liveOi) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: images.liveOi.split(',')[1] } });
        parts.push({ text: "LIVE OI DATA (9:20 AM)" });
    }

    const schema = {
        type: Type.OBJECT,
        properties: {
            status: { type: Type.STRING, enum: ['CONFIRMED', 'INVALIDATED', 'CAUTION'] },
            updatedBias: { type: Type.STRING, enum: ['Bullish', 'Bearish', 'Neutral'] },
            realityCheck: { type: Type.STRING, description: "Compare Pre-Market Thesis vs Live Price Action. Is the gap fill happening? Is support holding?" },
            immediateAction: { type: Type.STRING, description: "Specific instruction for the 9:25 AM - 9:45 AM window." },
            tradeUpdate: {
                type: Type.OBJECT,
                properties: {
                    direction: { type: Type.STRING, enum: ['LONG', 'SHORT'] },
                    entryPrice: { type: Type.STRING },
                    stopLoss: { type: Type.STRING, description: "Exactly 30 pts" },
                    target: { type: Type.STRING, description: "Exactly 35 pts" }
                }
            }
        }
    };

    const promptText = `
        You are the Nifty 50 Commander. It is now 9:20 AM (5 mins after open).
        
        TASK:
        1. Compare the LIVE charts against the PRE-MARKET PLAN context provided.
        2. Look at the Live Chart: Did the market open Gap Up or Down? What is the current tick price relative to yesterday's close?
        3. Is the Core Thesis still valid?
        
        DECISION FOR 9:25 AM - 9:45 AM WINDOW:
        - Should we enter as planned? Or abort?
        - If entering, confirm the levels.
        - Constraints: Stop Loss = 30 pts, Target = 35 pts.
        - REMEMBER: 10:15 AM Hard Stop. If volatility is too low, advise "NO TRADE".
        - RULE HIERARCHY: If current time is past 10:00 AM, advise extreme caution or no entry.
        
        Output valid JSON.
    `;
    
    parts.push({ text: promptText });

    try {
        const response = await generateContentSafe(ai, models.fast, {
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                systemInstruction: "You are a real-time trading assistant. Be sharp and decisive.",
                temperature: 0.2
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e: any) {
        console.error("Live Check Error", e);
        throw new Error(e.message || "Failed Live Check.");
    }
}

// POST-MARKET DEBRIEF ROUTINE (End of Day)
export const analyzePostMarketRoutine = async (
    images: { dailyChart: string; eodChart: string; eodOi: string },
    preMarketPlan: PreMarketAnalysis | null,
    apiKey?: string
): Promise<PostMarketAnalysis> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required for Post-Market Analysis");

    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();
    const parts: any[] = [];

    // Context: Morning Plan
    if (preMarketPlan) {
        const contextStr = JSON.stringify(preMarketPlan, null, 2);
        parts.push({ text: `MORNING PLAN (For Reference): ${contextStr}` });
    } else {
        parts.push({ text: "NO MORNING PLAN WAS CREATED. Analyze purely on EOD data." });
    }

    // EOD Images
    if (images.dailyChart) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: images.dailyChart.split(',')[1] } });
        parts.push({ text: "Image 1: Daily Timeframe Chart (High Level)" });
    }
    if (images.eodChart) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: images.eodChart.split(',')[1] } });
        parts.push({ text: "Image 2: Intraday 5m Chart (Full Day Action)" });
    }
    if (images.eodOi) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: images.eodOi.split(',')[1] } });
        parts.push({ text: "Image 3: End of Day OI Data" });
    }

    const schema = {
        type: Type.OBJECT,
        properties: {
            predictionAccuracy: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
            actualTrend: { type: Type.STRING, description: "What actually happened today? (e.g. 'Gap up and trended higher')" },
            planVsReality: { type: Type.STRING, description: "Detailed critique: Did the morning plan work? Where did it fail or succeed?" },
            keyTakeaways: { type: Type.STRING, description: "One major lesson from today's price action." },
            tomorrowOutlook: {
                type: Type.OBJECT,
                properties: {
                    bias: { type: Type.STRING, enum: ['Bullish', 'Bearish', 'Neutral'] },
                    earlyLevels: {
                        type: Type.OBJECT,
                        properties: {
                            support: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                            resistance: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                        }
                    },
                    watchFor: { type: Type.STRING, description: "Specific setup to watch for at tomorrow's open." }
                }
            }
        }
    };

    const promptText = `
        You are the Head Risk Manager. The trading day is over.
        
        TASK:
        1. Review today's full price action (Intraday Chart).
        2. Compare it against the Morning Plan (if provided). Did we predict the bias correctly?
        3. Analyze the Daily Candle structure. What does it signal for TOMORROW?
        4. Provide early Support/Resistance levels for the next trading session.
        
        Output structured JSON. Be critical and educational.
    `;
    
    parts.push({ text: promptText });

    try {
        const response = await generateContentSafe(ai, models.reasoning, {
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                systemInstruction: "You are a retrospective trading analyst. Your goal is to learn from today to prepare for tomorrow.",
                temperature: 0.3
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e: any) {
        console.error("Post-Market Analysis Error", e);
        throw new Error(e.message || "Failed Post-Market Analysis.");
    }
}

// --- MENTOR CHAT ROUTINE ---
// This enables a conversational interface with the full context of the user's trading history.
export const getMentorChatResponse = async (
    chatHistory: { role: string, parts: { text: string }[] }[],
    trades: Trade[],
    strategyProfile: StrategyProfile,
    apiKey?: string
): Promise<string> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required for Mentor Chat");

    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();

    // 1. Summarize History for Context (Last 50 trades)
    // We don't send full objects to save tokens, just key metrics
    const recentHistory = trades
        .slice(0, 50)
        .map(t => `${t.date}: ${t.direction} ${t.instrument}. Res: ${t.outcome} (${t.pnl}). Setup: ${t.setupName}. Mistakes: ${t.mistakes?.join(',') || 'None'}`)
        .join('\n');

    const strategyContext = formatStrategyForAI(strategyProfile);

    // 2. Define System Instruction (Persona)
    const systemInstruction = `
        You are "The War Room Mentor", a battle-hardened, professional trading psychologist and risk manager.
        
        CONTEXT:
        You have access to the user's Trading Strategy and their last 50 trades.
        
        USER STRATEGY:
        ${strategyContext}
        
        RECENT TRADE LOG (Last 50):
        ${recentHistory}
        
        YOUR MISSION:
        - Answer the user's questions about their performance, psychology, or strategy.
        - Be direct, concise, and professional. No fluff.
        - Cite specific trades from their history if relevant (e.g., "Look at your loss on 2024-03-12...").
        - If they show signs of "Tilt" (emotional trading), shut them down gently but firmly.
        - Use emojis sparingly, only for emphasis (🛡️, 📉, 💡).
        - Format responses in Markdown.
    `;

    try {
        // Initialize Chat with System Instruction
        // Pop the last message (current user prompt) to send it via sendMessage
        // The rest is history.
        const historyForInit = [...chatHistory];
        const lastUserMsg = historyForInit.pop(); 
        
        const activeChat = ai.chats.create({
            model: models.fast,
            config: {
                systemInstruction: systemInstruction,
            },
            history: historyForInit as any
        });

        if (!lastUserMsg || !lastUserMsg.parts[0].text) return "Silent check.";

        const result = await activeChat.sendMessage({ message: lastUserMsg.parts[0].text });
        return result.text || "";

    } catch (e: any) {
        console.error("Mentor Chat Error", e);
        return `SIGNAL INTERRUPTED. API Error: ${e.message || "Unknown Connection Failure"}. Check Key and Quota.`;
    }
}

// --- LIVE TRADE COACH ROUTINE (New) ---
// Focused on the current trade being logged
export const getLiveTradeCoachResponse = async (
    chatHistory: { role: string, parts: { text?: string, inlineData?: any }[] }[],
    currentTradeData: any, // The formData
    strategyProfile: StrategyProfile,
    apiKey: string
): Promise<string> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required");

    const ai = new GoogleGenAI({ apiKey: key });
    const models = getModels();

    const strategyContext = formatStrategyForAI(strategyProfile);
    
    // Format live timeline
    const timeline = currentTradeData.notes 
        ? currentTradeData.notes.map((n: any) => `[${n.timestamp}] ${n.content} (${n.type})`).join('\n') 
        : "No live notes yet.";

    const systemInstruction = `
        You are an AI Co-Pilot for a live trader. You are situated INSIDE the cockpit.
        
        CURRENT TRADE DATA:
        Instrument: ${currentTradeData.instrument || 'Nifty'} ${currentTradeData.strikePrice || ''} ${currentTradeData.optionType || ''}
        Direction: ${currentTradeData.direction}
        Entry: ${currentTradeData.entryPrice || 'Pending'}
        Current PnL: ${currentTradeData.pnl || '0'}
        
        LIVE MISSION TIMELINE:
        ${timeline}
        
        STRATEGY PROTOCOL:
        ${strategyContext}
        
        YOUR MISSION:
        - Provide immediate, tactical advice based on the Strategy Rules.
        - If they are hesitating, push them (if setup is valid) or hold them back (if not).
        - Keep answers SHORT and punchy. You are on radio comms.
        - No lengthy disclaimers.
    `;

    try {
        // Pop the last message (current user prompt) to send it via sendMessage
        // The rest is history.
        const historyForInit = [...chatHistory];
        const lastUserMsg = historyForInit.pop(); 
        
        const activeChat = ai.chats.create({
            model: models.fast,
            config: {
                systemInstruction: systemInstruction,
            },
            history: historyForInit as any
        });

        if (!lastUserMsg || !lastUserMsg.parts[0].text) return "Copy that. Standing by.";

        const result = await activeChat.sendMessage({ message: lastUserMsg.parts[0].text });
        return result.text || "";

    } catch (e: any) {
        console.error("Live Coach Error", e);
        return `Comms offline. Check connection.`;
    }
};
