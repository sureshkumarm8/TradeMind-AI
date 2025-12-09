
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { Trade, StrategyProfile, ParsedVoiceCommand, PreMarketAnalysis, LiveMarketAnalysis } from "../types";

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
    
    // Format timeline for prompt
    const timeline = trade.notes 
        ? trade.notes.map(n => `[${n.timestamp}] ${n.content} (${n.type})`).join('\n') 
        : "No live timeline logged.";

    const promptText = `
      You are a strict Quantitative Trading Mentor.
      The user follows a specific system.
      ${strategyContext}
      
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
      
      Output strict JSON format ONLY. Do not output markdown code blocks.
      
      Expected JSON Structure:
      {
        "grade": "Letter grade A, B, C, D, F based on timing and trend alignment",
        "gradeColor": "green, yellow, or red",
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

    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }], // Enable Grounding
        systemInstruction: "You are a professional prop trader manager. You must verify user claims against actual market history using Search. Return strictly valid JSON.",
        temperature: 0.3,
      }
    });

    let jsonResult = response.text || "{}";
    
    // Clean markdown if present
    if (jsonResult.includes('```')) {
        jsonResult = jsonResult.replace(/```json/g, '').replace(/```/g, '');
    }
    
    let resultObj: any = {};
    try {
        resultObj = JSON.parse(jsonResult);
    } catch(e) {
        console.error("JSON Parse Error", e, jsonResult);
        return JSON.stringify({
            grade: "?", 
            gradeColor: "gray",
            marketTrend: "Analysis Error", 
            realityCheck: "AI returned invalid format. Please try again.", 
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
                setupName: { type: Type.STRING },
                note: { type: Type.STRING }
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

// PRE-MARKET ANALYZER ROUTINE
export const analyzePreMarketRoutine = async (
    images: { market: string; intraday: string; oi: string; multiStrike: string },
    apiKey?: string
): Promise<PreMarketAnalysis> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required for Pre-Market Analysis");

    const ai = new GoogleGenAI({ apiKey: key });

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
        Analyze the provided 4 images holistically.
        
        CRITICAL TIME CONSTRAINTS:
        - The trader DOES NOT trade immediately at 9:15 AM.
        - They wait for 10 minutes (9:15 - 9:25) to let the dust settle.
        - The 'firstHourPlan' MUST focus strictly on the entry window: 09:25 AM to 09:45 AM.
        - All advice must be for acting within this specific 20-minute slot.
        
        CRITICAL RISK CONSTRAINTS:
        - For any trade recommended, the Stop Loss MUST be exactly 30 points from entry.
        - The Target MUST be exactly 35 points from entry.
        
        Generate a detailed Battle Plan in JSON format based on the schema.
        1. Identify the directional bias.
        2. Extract key Support & Resistance levels.
        3. Formulate a core thesis.
        4. Create a specific tactical plan for the 9:25 AM - 9:45 AM window.
        5. Define Primary and Alternate trade setups.
        6. Provide specific advice for Gap Up and Gap Down openings.
        7. Summarize key signals from each chart.
    `;
    
    parts.push({ text: promptText });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                systemInstruction: "You are a disciplined trading coach. Be objective. Do not hallucinate data not present in charts.",
                temperature: 0.2
            }
        });

        return JSON.parse(response.text || "{}");

    } catch (e) {
        console.error("Pre-Market Analysis Error", e);
        throw new Error("Failed to generate Pre-Market Plan. Check API Key and Images.");
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
        2. Did the market open as expected (Gap Up/Down)?
        3. Is the Core Thesis still valid?
        
        DECISION FOR 9:25 AM - 9:45 AM WINDOW:
        - Should we enter as planned? Or abort?
        - If entering, confirm the levels.
        - Constraints: Stop Loss = 30 pts, Target = 35 pts.
        
        Output valid JSON.
    `;
    
    parts.push({ text: promptText });

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                systemInstruction: "You are a real-time trading assistant. Be sharp and decisive.",
                temperature: 0.2
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Live Check Error", e);
        throw new Error("Failed Live Check.");
    }
}
