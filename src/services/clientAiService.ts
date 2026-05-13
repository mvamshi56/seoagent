import { GoogleGenAI } from "@google/genai";
import { SEOPage, AuditStats } from "../types/seo";

async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = 
      error.message?.includes("429") || 
      error.message?.includes("quota") || 
      error.message?.includes("exhausted") ||
      error.message?.includes("503") ||
      error.message?.includes("500");

    if (retries > 0 && isRetryable) {
      console.log(`Retrying AI call... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function generateGeminiInsights(stats: AuditStats, pages: any[], userApiKey?: string) {
  const apiKey = (userApiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("Gemini API Key is missing. Please provide it in settings.");

  const ai = new GoogleGenAI({ apiKey });
  
  const topIssues = pages
    .flatMap(p => p.issues || [])
    .reduce((acc, issue) => {
      acc[issue.message] = (acc[issue.message] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const sortedIssues = Object.entries(topIssues)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 10);

  const prompt = `
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
        "pageSummary": [{ "url": "string", "score": number, "topIssue": "string" }]
      }
    }
  `;

  const system = `You are an elite, Enterprise-level SEO Strategist and Neural Search Auditor. 
Always output valid JSON when requested for insights.`;

  return await retry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", 
      contents: prompt,
      config: {
          systemInstruction: system,
          responseMimeType: "application/json"
      }
    });

    return response.text || "{}";
  });
}

export async function chatWithGemini(query: string, pages: any[], userApiKey?: string) {
  const apiKey = (userApiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("Gemini API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  
  const contextText = pages.slice(0, 15).map(p => `URL: ${p.url}, Score: ${p.score}, Issues: ${(p.issues || []).map((i: any) => i.message).join(', ')}`).join('\n');
  const prompt = `
    You are an AI SEO Assistant. Use the following audit context to answer the user's question concisely.
    Context:
    ${contextText}

    User Question: ${query}
  `;

  const system = "You are an AI SEO Assistant. Be technical and data-driven based on the context provided.";

  return await retry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
          systemInstruction: system
      }
    });

    return response.text || "I couldn't generate a response.";
  });
}
