
import { GoogleGenAI, Type } from "@google/genai";
import { Trade, StrategyProfile, ParsedVoiceCommand, PreMarketAnalysis, LiveMarketAnalysis, PostMarketAnalysis, NewsAnalysis, TradeOutcome } from "../types";

// Using recommended models as per guidelines
const FAST_MODEL = 'gemini-3-flash-preview';
const REASONING_MODEL = 'gemini-3-pro-preview'; 

const formatStrategyForAI = (profile?: StrategyProfile) => {
  if (!profile) return "Strategy: General Intraday Trading";
  const stepsText = profile.steps.map(s => `${s.title}: ${s.items.join(', ')}`).join('\n');
  const rulesText = profile.rules.map(r => `Rule: ${r.title} - ${r.description}`).join('\n');
  return `USER STRATEGY: ${profile.name}\n${profile.description}\nPROTOCOL:\n${stepsText}\nIRON RULES:\n${rulesText}`;
};

export const analyzeTradeWithAI = async (trade: Trade, strategyProfile?: StrategyProfile, apiKey?: string): Promise<string> => {
  const key = apiKey || process.env.API_KEY;
  if (!key) return JSON.stringify({ grade: 0, realityCheck: "API Key missing." });
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const strategyContext = formatStrategyForAI(strategyProfile);
    const isSkipped = trade.outcome === TradeOutcome.SKIPPED;
    const timeline = trade.notes ? trade.notes.map(n => `[${n.timestamp}] ${n.content} (${n.type})`).join('\n') : "No live timeline.";
    const task = isSkipped ? "AUDIT SKIP DECISION" : "AUDIT EXECUTION";
    const promptText = `Mentor Audit. ${strategyContext}\n${task}\nTrade: ${JSON.stringify(trade)}\nTimeline: ${timeline}\nReturn strict JSON.`;
    
    const response = await ai.models.generateContent({
      model: FAST_MODEL,
      contents: promptText,
      config: { 
        responseMimeType: "application/json", 
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text || "{}";
  } catch (error) { return "{}"; }
};

export const analyzeBatch = async (trades: Trade[], periodDescription: string, strategyProfile?: StrategyProfile, apiKey?: string): Promise<string> => {
  const key = apiKey || process.env.API_KEY;
  if (!key) return "API Key is missing.";
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const strategyContext = formatStrategyForAI(strategyProfile);
    const tradeSummaries = trades.map((t, i) => `${i+1}. ${t.date} ${t.entryTime}: ${t.outcome}. Setup: ${t.setupName}. Logic: ${t.entryReason}.`).join('\n');
    const prompt = `Analyze missions: ${periodDescription}.\n${strategyContext}\nLogs:\n${tradeSummaries}\nMarkdown Output.`;
    const response = await ai.models.generateContent({ 
        model: REASONING_MODEL, 
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 32768 } }
    });
    return response.text || "Analysis complete.";
  } catch (error) { return "Deep analysis failed."; }
};

export const getDailyCoachTip = async (apiKey?: string): Promise<string> => {
  const key = apiKey || process.env.API_KEY;
  if (!key) return "Add API Key.";
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({ 
        model: FAST_MODEL, 
        contents: "One short trading aphorism (max 15 words). Sun Tzu style.",
        config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return response.text?.trim() || "Wait for your edge.";
  } catch (e) { return "Protect capital."; }
};

export const getNeuralBriefing = async (recentTrades: Trade[], strategyProfile: StrategyProfile, apiKey: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const strategyContext = formatStrategyForAI(strategyProfile);
        const summaries = recentTrades.map(t => `- ${t.date} ${t.entryTime}: ${t.outcome}. Setup: ${t.setupName}. Logic: ${t.entryReason}. Mistakes: ${t.mistakes.join(',')}.`).join('\n');
        
        const prompt = `
            You are a tactical flight director. Analyze these recent mission logs and the user's strategy.
            ${strategyContext}
            RECENT LOGS:
            ${summaries}
            
            Based on the RECENT MISTAKES and OUTCOMES, provide ONE sharp, actionable "COMBAT WARNING" for today's session.
            Example: "Your last 3 morning entries resulted in FOMO losses. Wait for the 10:30 AM candle close today."
            Be extremely specific and blunt. Max 25 words.
        `;
        
        const response = await ai.models.generateContent({ 
            model: FAST_MODEL, 
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 0 } }
        });
        return response.text?.trim() || "Focus on the process, not the P&L.";
    } catch (e) { return "Baseline data incomplete."; }
};

export const findHistoricalMatch = async (query: string, allTrades: Trade[], apiKey: string): Promise<{match: Trade | null, insight: string}> => {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const summaries = allTrades.map(t => ({ id: t.id, desc: `${t.date}: ${t.setupName} - ${t.entryReason}. Outcome: ${t.outcome}. PnL: ${t.pnl}.` }));
        
        const prompt = `
            A trader is describing a live setup: "${query}"
            Look through their trade history below and find the ONE trade that is the closest match to this scenario.
            
            HISTORY:
            ${JSON.stringify(summaries)}
            
            Return JSON only:
            {
                "tradeId": "The ID of the matching trade or null",
                "insight": "1 sentence summarizing what happened in that matching trade and what the user should do NOW."
            }
        `;
        
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        
        const result = JSON.parse(response.text || "{}");
        const match = allTrades.find(t => t.id === result.tradeId) || null;
        return { match, insight: result.insight || "No historical match found." };
    } catch (e) { return { match: null, insight: "Pattern match offline." }; }
};

export const parseVoiceCommand = async (audioBase64: string, apiKey?: string): Promise<ParsedVoiceCommand> => {
    const key = apiKey || process.env.API_KEY;
    if (!key) throw new Error("API Key Required");
    try {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: { parts: [{ inlineData: { mimeType: "audio/webm", data: audioBase64 } }, { text: "Extract trading data. Indian Nifty 50." }] },
            config: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } }
        });
        return JSON.parse(response.text || "{}");
    } catch (e) { return { note: "Error processing voice." }; }
}

export const fetchMarketNews = async (apiKey?: string): Promise<NewsAnalysis> => {
    const key = apiKey || process.env.API_KEY;
    const ai = new GoogleGenAI({ apiKey: key });
    const promptText = `Indian Stock Market news for today's Nifty 50 open. Search and return JSON.`;
    const response = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: promptText,
        config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } }
    });
    return JSON.parse(response.text || "{}");
};

export const analyzePreMarketRoutine = async (images: any, newsContext: any, apiKey: string): Promise<PreMarketAnalysis> => {
    const ai = new GoogleGenAI({ apiKey });
    // Convert base64 images to inlineData parts
    const imageParts = Object.values(images).filter(img => !!img).map(img => ({
        inlineData: { mimeType: "image/jpeg", data: (img as string).split(',')[1] }
    }));
    
    const response = await ai.models.generateContent({
        model: FAST_MODEL, 
        contents: { parts: [...imageParts, { text: "Analyze Nifty 50 charts and news context. Return JSON following PreMarketAnalysis schema." }] },
        config: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } }
    });
    return JSON.parse(response.text || "{}");
}

export const analyzeLiveMarketRoutine = async (images: any, preMarketPlan: any, apiKey: string): Promise<LiveMarketAnalysis> => {
    const ai = new GoogleGenAI({ apiKey });
    const imageParts = Object.values(images).filter(img => !!img).map(img => ({
        inlineData: { mimeType: "image/jpeg", data: (img as string).split(',')[1] }
    }));
    
    const response = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: { parts: [...imageParts, { text: `Nifty 9:20 AM check based on pre-market plan: ${JSON.stringify(preMarketPlan)}. Return JSON.` }] },
        config: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } }
    });
    return JSON.parse(response.text || "{}");
}

export const analyzePostMarketRoutine = async (images: any, preMarketPlan: any, apiKey: string): Promise<PostMarketAnalysis> => {
    const ai = new GoogleGenAI({ apiKey });
    const imageParts = Object.values(images).filter(img => !!img).map(img => ({
        inlineData: { mimeType: "image/jpeg", data: (img as string).split(',')[1] }
    }));
    
    const response = await ai.models.generateContent({
        model: FAST_MODEL,
        contents: { parts: [...imageParts, { text: `EOD Review based on plan: ${JSON.stringify(preMarketPlan)}. Return JSON.` }] },
        config: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } }
    });
    return JSON.parse(response.text || "{}");
}

export const getMentorChatResponse = async (chatHistory: any[], trades: Trade[], strategyProfile: StrategyProfile, apiKey: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are a professional trading mentor for Indian markets. Strategy: ${formatStrategyForAI(strategyProfile)}. Recent Trades: ${JSON.stringify(trades.slice(0, 10))}`;
    
    const response = await ai.models.generateContent({ 
        model: REASONING_MODEL, 
        contents: chatHistory,
        config: { 
            systemInstruction,
            thinkingConfig: { thinkingBudget: 32768 }
        }
    });
    return response.text || "";
}

export const getLiveTradeCoachResponse = async (chatHistory: any[], currentTradeData: any, strategyProfile: StrategyProfile, apiKey: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are a tactical trading co-pilot monitoring a live Nifty trade. Current trade data: ${JSON.stringify(currentTradeData)}. Strategy: ${formatStrategyForAI(strategyProfile)}.`;
    
    const response = await ai.models.generateContent({ 
        model: FAST_MODEL, 
        contents: chatHistory,
        config: { 
            systemInstruction,
            thinkingConfig: { thinkingBudget: 0 }
        }
    });
    return response.text || "";
}
