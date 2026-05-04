import { GoogleGenAI } from "@google/genai";
import { SEOPage, AuditStats } from "../types/seo";

export async function generateGeminiInsights(stats: AuditStats, pages: SEOPage[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key is missing. Please set it in the environment.");

  const ai = new GoogleGenAI({ apiKey });
  
  const topIssues = pages
    .flatMap(p => p.issues)
    .reduce((acc, issue) => {
      acc[issue.message] = (acc[issue.message] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const sortedIssues = Object.entries(topIssues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const prompt = `
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

  const system = "You are an expert SEO Strategist at a top digital agency. You provide high-impact, data-driven SEO advice.";

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview", 
    contents: prompt,
    config: {
        systemInstruction: system
    }
  });

  return response.text || "Failed to generate AI insights.";
}

export async function chatWithGemini(query: string, pages: SEOPage[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  
  const contextText = pages.slice(0, 15).map(p => `URL: ${p.url}, Score: ${p.score}, Issues: ${p.issues.map((i: any) => i.message).join(', ')}`).join('\n');
  const prompt = `
    You are an AI SEO Assistant. Use the following audit context to answer the user's question concisely.
    Context:
    ${contextText}

    User Question: ${query}
  `;

  const system = "You are an AI SEO Assistant. Be technical and data-driven based on the context provided.";

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-latest",
    contents: prompt,
    config: {
        systemInstruction: system
    }
  });

  return response.text || "I couldn't generate a response.";
}
