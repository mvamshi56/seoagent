import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";
import { HfInference } from "@huggingface/inference";
import { SEOPage, AuditStats } from "../types/seo";

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'huggingface' | 'deepseek' | 'perplexity';

export interface APIKeys {
  gemini?: string;
  openai?: string;
  anthropic?: string;
  groq?: string;
  huggingface?: string;
  deepseek?: string;
  perplexity?: string;
}

const SYSTEM_PROMPT = `You are an elite, Enterprise-level SEO Strategist and Neural Search Auditor. 
Your objective is to synthesize massive datasets into high-impact strategic directives.

Focus on:
1. Architectural Integrity: Identify crawl bottlenecks and structural diluters.
2. Semantic Resonance: Map content clusters to user intent and search engine neural mapping.
3. Performance Velocity: Evaluate Core Web Vitals with a focus on LCP, CLS, and TBT.
4. E-E-A-T & Quality: Look for evidence of Experience, Expertise, Authoritativeness, and Trustworthiness.
5. SGE & AI Overviews Readiness: Optimize for direct answer synthesis and entity-relationship clarity.

Your tone is professional, technical, and data-driven. Use sophisticated terminology like "Neural Trust Threshold", "Semantic Authority", "T2C Ratio", and "Architectural Velocity".

Always output valid JSON when requested for insights.`;

function getGemini(key?: string) {
  const apiKey = (key || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("Gemini API Key is missing");
  return new GoogleGenAI({ apiKey });
}

function getOpenAI(key?: string) {
  const apiKey = (key || process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("OpenAI API Key is missing");
  return new OpenAI({ apiKey });
}

function getAnthropic(key?: string) {
  const apiKey = (key || process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) throw new Error("Anthropic API Key is missing");
  return new Anthropic({ apiKey });
}

function getDeepSeek(key?: string) {
  const apiKey = (key || process.env.DEEPSEEK_API_KEY || "").trim();
  if (!apiKey) throw new Error("DeepSeek API Key is missing");
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com"
  });
}

function getPerplexity(key?: string) {
  const apiKey = (key || process.env.PERPLEXITY_API_KEY || "").trim();
  if (!apiKey) throw new Error("Perplexity API Key is missing");
  return new OpenAI({
    apiKey,
    baseURL: "https://api.perplexity.ai"
  });
}

function getGroq(key?: string) {
  const apiKey = (key || process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) throw new Error("Groq API Key is missing");
  return new Groq({ apiKey });
}

function getHf(key?: string) {
  const apiKey = (key || process.env.HUGGINGFACE_API_KEY || "").trim();
  if (!apiKey) throw new Error("Hugging Face API Key is missing");
  return new HfInference(apiKey);
}

function buildInsightPrompt(stats: AuditStats, pages: SEOPage[]) {
  const topIssues = pages
    .flatMap(p => p.issues || [])
    .reduce((acc, issue) => {
      acc[issue.message] = (acc[issue.message] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const sortedIssues = Object.entries(topIssues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return `
    Analyze the following SEO audit data and provide a comprehensive, high-level "Neural SEO" strategic roadmap in JSON format.
    
    Aggregate Audit Intelligence:
    - Scope: ${stats.totalPages} pages
    - Baseline Score: ${stats.averageScore}/100
    - Technical Debt: ${stats.criticalIssues} critical violations, ${stats.warningIssues} warnings
    - Content Depth Distribution: ${stats.wordCountDistribution ? JSON.stringify(stats.wordCountDistribution) : "N/A"}
    - Heading Integrity: ${stats.headingHealth ? JSON.stringify(stats.headingHealth) : "N/A"}
    - Top Keywords & Density: ${stats.topKeywords ? JSON.stringify(stats.topKeywords) : "N/A"}
    - GEO (Generative Engine Optimization) Score: ${stats.geoScore}/100
    - AI Recognition Score: ${stats.aiRecognitionScore}/100
    - Sentiment Distribution: ${stats.sentimentTrend ? JSON.stringify(stats.sentimentTrend) : "N/A"}
    - Topical Clusters: ${stats.topicalClusters ? JSON.stringify(stats.topicalClusters) : "N/A"}
    - Technical Coverage: Structured Data ${stats.structuredDataCoverage}%, Social Tags ${stats.socialGraphCoverage}%
    
    Top Recurring Biological Issues:
    ${sortedIssues.map(([msg, count]) => `- ${msg} (found on ${count} pages)`).join("\n")}
    
    Neural Topography Snippets:
    ${pages.slice(0, 10).map(p => `- ${p.url}: keywords=[${(p.keywords || []).join(", ")}], score=${p.score}, t2c=${p.textToCodeRatio}%`).join("\n")}
    
    IMPORTANT: Provide ONLY a raw JSON object (properly escaped) with the following schema:
    {
      "executiveSummary": "string (concise 'neural' summary of site essence)",
      "marketPosition": "string (where this site sits compared to modern semantic standards)",
      "criticalRoadmap": [
        { "task": "string", "impact": "High/Medium/Low", "effort": "Easy/Medium/Hard", "description": "string" }
      ],
      "technicalAudit": {
        "score": number,
        "findings": ["string"],
        "recommendation": "string"
      },
      "contentStrategy": {
        "status": "string",
        "improvements": ["string"],
        "suggestedMeta": { "title": "string", "description": "string" }
      },
      "semanticClusterAnalysis": {
         "topEntities": ["string (3-5 core topics detected)"],
         "contentGaps": ["string (2-3 missing semantic clusters)"],
         "brandVibe": "string (describe the content tone/authority)"
      },
      "geoStrategy": {
        "citationReadiness": "string (Analysis of if content is ready for AI citations)",
        "informationGain": ["string (2-3 areas where unique data/experience could be added)"],
        "schemaEffectiveness": "string (Current schema coverage/impact)",
        "actionableFixes": ["string (2-3 optimizations for LLM/SGE engines)"]
      },
      "detailedActionPlan": {
        "technical": ["string (5+ detailed steps)"],
        "content": ["string (5+ detailed steps)"],
        "ux": ["string (3+ detailed steps)"]
      },
      "fullReport": {
        "priorityActionPlan": [{ "id": 1, "action": "string", "impact": "Critical/High/Medium/Low", "effort": "Low/Medium/High" }],
        "criticalIssues": [{ "url": "string", "issue": "string", "why": "string", "howToFix": "string" }],
        "highPriority": [{ "url": "string", "issue": "string", "why": "string", "howToFix": "string" }],
        "quickWins": ["string"],
        "pageSummary": [{ 
          "url": "string", 
          "score": "CRITICAL: number between 1-99. MUST BE UNIQUE for every single node. Never use the same score for multiple pages. Use values like 47, 82, 63 etc.", 
          "topIssue": "string (A specific, unique critical hazard for this exact node. Avoid repetition.)" 
        }]
      }
    }
  `;
}

function buildChatPrompt(query: string, context: SEOPage[]) {
  const contextText = context.slice(0, 15).map(p => `URL: ${p.url}, Score: ${p.score}, Issues: ${(p.issues || []).map((i: any) => i.message).join(', ')}`).join('\n');
  return `
    You are an AI SEO Assistant. Use the following audit context to answer the user's question concisely.
    Context:
    ${contextText}

    User Question: ${query}
  `;
}

export async function generateInsights(provider: AIProvider, stats: AuditStats, pages: SEOPage[], keys: APIKeys) {
  const prompt = buildInsightPrompt(stats, pages);

  switch (provider) {
    case 'gemini': {
      const ai = getGemini(keys.gemini);
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_PROMPT + " Respond ONLY with JSON.",
            responseMimeType: "application/json"
        }
      });
      return response.text;
    }
    case 'openai': {
      const response = await getOpenAI(keys.openai).chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
      });
      return response.choices[0].message.content || "No response from OpenAI";
    }
    case 'anthropic': {
      const response = await getAnthropic(keys.anthropic).messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.content[0].type === 'text' ? response.content[0].text : "No text response from Anthropic";
    }
    case 'deepseek': {
      const response = await getDeepSeek(keys.deepseek).chat.completions.create({
        model: "deepseek-reasoner",
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
      });
      return response.choices[0].message.content || "No response from DeepSeek";
    }
    case 'perplexity': {
      const response = await getPerplexity(keys.perplexity).chat.completions.create({
        model: "sonar-pro",
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
      });
      return response.choices[0].message.content || "No response from Perplexity";
    }
    case 'groq': {
      const response = await getGroq(keys.groq).chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        model: "llama-3.3-70b-versatile",
      });
      return response.choices[0].message.content || "No response from Groq";
    }
    case 'huggingface': {
      const hf = getHf(keys.huggingface);
      const response = await hf.textGeneration({
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        inputs: `<s>[INST] ${SYSTEM_PROMPT}\n\n${prompt} [/INST]`,
        parameters: { max_new_tokens: 2048 }
      });
      return response.generated_text;
    }
    default:
      throw new Error("Invalid provider");
  }
}

export async function geoAudit(provider: AIProvider, query: string, pages: SEOPage[], keys: APIKeys) {
  const jsonSystemPrompt = SYSTEM_PROMPT + "\nIMPORTANT: You MUST respond with ONLY a valid, minified JSON object. No markdown, no conversational text, no explanations. Just the JSON.";
  
  switch (provider) {
    case 'gemini': {
      const ai = getGemini(keys.gemini);
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: query,
        config: {
            systemInstruction: jsonSystemPrompt,
            responseMimeType: "application/json"
        }
      });
      return response.text;
    }
    case 'openai': {
      const response = await getOpenAI(keys.openai).chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: 'system', content: jsonSystemPrompt },
          { role: 'user', content: query }
        ],
        response_format: { type: "json_object" }
      });
      return response.choices[0].message.content || "{}";
    }
    case 'anthropic': {
      const response = await getAnthropic(keys.anthropic).messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 4096,
        system: jsonSystemPrompt,
        messages: [{ role: 'user', content: query }],
      });
      return response.content[0].type === 'text' ? response.content[0].text : "{}";
    }
    case 'deepseek': {
      const response = await getDeepSeek(keys.deepseek).chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: 'system', content: jsonSystemPrompt },
          { role: 'user', content: query }
        ],
        response_format: { type: "json_object" }
      });
      return response.choices[0].message.content || "{}";
    }
    case 'perplexity': {
      const response = await getPerplexity(keys.perplexity).chat.completions.create({
        model: "sonar",
        messages: [
          { role: 'system', content: jsonSystemPrompt },
          { role: 'user', content: query }
        ],
        response_format: { type: "json_object" }
      });
      return response.choices[0].message.content || "{}";
    }
    case 'groq': {
      const response = await getGroq(keys.groq).chat.completions.create({
        messages: [
          { role: 'system', content: jsonSystemPrompt },
          { role: 'user', content: query }
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" }
      });
      return response.choices[0].message.content || "{}";
    }
    default:
      return chat(provider, query, pages, keys);
  }
}

export async function chat(provider: AIProvider, query: string, pages: SEOPage[], keys: APIKeys) {
  const prompt = buildChatPrompt(query, pages);

  switch (provider) {
    case 'gemini': {
      const ai = getGemini(keys.gemini);
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_PROMPT
        }
      });
      return response.text;
    }
    case 'openai': {
      const response = await getOpenAI(keys.openai).chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
      });
      return response.choices[0].message.content || "No response";
    }
    case 'anthropic': {
      const response = await getAnthropic(keys.anthropic).messages.create({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.content[0].type === 'text' ? response.content[0].text : "No response";
    }
    case 'deepseek': {
      const response = await getDeepSeek(keys.deepseek).chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
      });
      return response.choices[0].message.content || "No response";
    }
    case 'perplexity': {
      const response = await getPerplexity(keys.perplexity).chat.completions.create({
        model: "sonar",
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
      });
      return response.choices[0].message.content || "No response";
    }
    case 'groq': {
      const response = await getGroq(keys.groq).chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        model: "llama-3.3-70b-specdec",
      });
      return response.choices[0].message.content || "No response";
    }
    case 'huggingface': {
      const hf = getHf(keys.huggingface);
      const response = await hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        inputs: `<s>[INST] ${SYSTEM_PROMPT}\n\n${prompt} [/INST]`,
        parameters: { max_new_tokens: 1024 }
      });
      return response.generated_text;
    }
    default:
      throw new Error("Invalid provider");
  }
}
