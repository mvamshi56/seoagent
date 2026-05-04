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

function getGemini(key?: string) {
  const apiKey = key || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key is missing");
  return new GoogleGenAI({ apiKey });
}

function getOpenAI(key?: string) {
  const apiKey = key || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API Key is missing");
  return new OpenAI({ apiKey });
}

function getAnthropic(key?: string) {
  const apiKey = key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic API Key is missing");
  return new Anthropic({ apiKey });
}

function getDeepSeek(key?: string) {
  const apiKey = key || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DeepSeek API Key is missing");
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com"
  });
}

function getPerplexity(key?: string) {
  const apiKey = key || process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error("Perplexity API Key is missing");
  return new OpenAI({
    apiKey,
    baseURL: "https://api.perplexity.ai"
  });
}

function getGroq(key?: string) {
  const apiKey = key || process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Groq API Key is missing");
  return new Groq({ apiKey });
}

function getHf(key?: string) {
  const apiKey = key || process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("Hugging Face API Key is missing");
  return new HfInference(apiKey);
}

function buildInsightPrompt(stats: AuditStats, pages: SEOPage[]) {
  const topIssues = pages
    .flatMap(p => p.issues)
    .reduce((acc, issue) => {
      acc[issue.message] = (acc[issue.message] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const sortedIssues = Object.entries(topIssues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return `
    Analyze the following SEO audit data for a website and provide a concise, high-level strategic executive summary and 3-5 actionable priority fixes.
    
    Audit Stats:
    - Total Pages: ${stats.totalPages}
    - Average Score: ${stats.averageScore}/100
    - Critical Issues: ${stats.criticalIssues}
    - Warning Issues: ${stats.warningIssues}
    - Total Links Found: ${stats.totalLinks}
    - Robots.txt: ${stats.hasRobots ? "Found" : "Missing"}
    - Sitemap.xml: ${stats.hasSitemap ? "Found" : "Missing"}
    
    Top Recurring Issues:
    ${sortedIssues.map(([msg, count]) => `- ${msg} (found on ${count} pages)`).join("\n")}
    
    Common Keywords Detected:
    ${pages.slice(0, 5).map(p => `- ${p.url}: ${p.keywords.join(", ")}`).join("\n")}
    
    Format your response as a clear SEO strategy roadmap in Markdown. Be professional, technical yet accessible.
  `;
}

function buildChatPrompt(query: string, context: SEOPage[]) {
  const contextText = context.slice(0, 15).map(p => `URL: ${p.url}, Score: ${p.score}, Issues: ${p.issues.map((i: any) => i.message).join(', ')}`).join('\n');
  return `
    You are an AI SEO Assistant. Use the following audit context to answer the user's question concisely.
    Context:
    ${contextText}

    User Question: ${query}
  `;
}

export async function generateInsights(provider: AIProvider, stats: AuditStats, pages: SEOPage[], keys: APIKeys) {
  const prompt = buildInsightPrompt(stats, pages);
  const system = "You are an expert SEO Strategist at a top digital agency. You provide high-impact, data-driven SEO advice.";

  switch (provider) {
    case 'gemini': {
      const ai = getGemini(keys.gemini);
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
            systemInstruction: system
        }
      });
      return response.text;
    }
    case 'openai': {
      const response = await getOpenAI(keys.openai).chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
      });
      return response.choices[0].message.content || "No response from OpenAI";
    }
    case 'anthropic': {
      const response = await getAnthropic(keys.anthropic).messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2048,
        system: system,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.content[0].type === 'text' ? response.content[0].text : "No text response from Anthropic";
    }
    case 'deepseek': {
      const response = await getDeepSeek(keys.deepseek).chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
      });
      return response.choices[0].message.content || "No response from DeepSeek";
    }
    case 'perplexity': {
      const response = await getPerplexity(keys.perplexity).chat.completions.create({
        model: "llama-3.1-sonar-large-128k-online",
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
      });
      return response.choices[0].message.content || "No response from Perplexity";
    }
    case 'groq': {
      const response = await getGroq(keys.groq).chat.completions.create({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        model: "llama-3.1-70b-versatile",
      });
      return response.choices[0].message.content || "No response from Groq";
    }
    case 'huggingface': {
      const hf = getHf(keys.huggingface);
      const response = await hf.textGeneration({
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        inputs: `<s>[INST] ${system}\n\n${prompt} [/INST]`,
        parameters: { max_new_tokens: 1024 }
      });
      return response.generated_text;
    }
    default:
      throw new Error("Invalid provider");
  }
}

export async function chat(provider: AIProvider, query: string, pages: SEOPage[], keys: APIKeys) {
  const prompt = buildChatPrompt(query, pages);
  const system = "You are an AI SEO Assistant. Be technical and data-driven based on the context provided.";

  switch (provider) {
    case 'gemini': {
      const ai = getGemini(keys.gemini);
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-latest",
        contents: prompt,
        config: {
            systemInstruction: system
        }
      });
      return response.text;
    }
    case 'openai': {
      const response = await getOpenAI(keys.openai).chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
      });
      return response.choices[0].message.content || "No response";
    }
    case 'anthropic': {
      const response = await getAnthropic(keys.anthropic).messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1024,
        system: system,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.content[0].type === 'text' ? response.content[0].text : "No response";
    }
    case 'deepseek': {
      const response = await getDeepSeek(keys.deepseek).chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
      });
      return response.choices[0].message.content || "No response";
    }
    case 'perplexity': {
      const response = await getPerplexity(keys.perplexity).chat.completions.create({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
      });
      return response.choices[0].message.content || "No response";
    }
    case 'groq': {
      const response = await getGroq(keys.groq).chat.completions.create({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ],
        model: "llama3-8b-8192",
      });
      return response.choices[0].message.content || "No response";
    }
    case 'huggingface': {
      const hf = getHf(keys.huggingface);
      const response = await hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        inputs: `<s>[INST] ${system}\n\n${prompt} [/INST]`,
        parameters: { max_new_tokens: 500 }
      });
      return response.generated_text;
    }
    default:
      throw new Error("Invalid provider");
  }
}
