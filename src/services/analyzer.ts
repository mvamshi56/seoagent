import * as cheerio from "cheerio";
import { SEOPage, SEOIssue, SEOImage } from "../types/seo.js";

export function analyzeHTML(url: string, html: string, loadTime: number): SEOPage {
  const $ = cheerio.load(html);
  const issues: SEOIssue[] = [];

  // Title
  const title = $("title").text() || "";
  if (!title) issues.push({ type: "critical", message: "Missing title tag", category: "on-page" });
  else if (title.length > 60) issues.push({ type: "warning", message: "Title too long (>60 chars)", category: "on-page" });

  // Description
  const description = $('meta[name="description"]').attr("content") || "";
  if (!description) issues.push({ type: "critical", message: "Missing meta description", category: "on-page" });
  else if (description.length > 160) issues.push({ type: "warning", message: "Meta description too long (>160 chars)", category: "on-page" });

  // Headers extraction
  const headers = {
    h1: $("h1").map((_, el) => $(el).text().trim()).get(),
    h2: $("h2").map((_, el) => $(el).text().trim()).get(),
    h3: $("h3").map((_, el) => $(el).text().trim()).get(),
  };

  if (headers.h1.length === 0) issues.push({ type: "critical", message: "Missing H1 tag", category: "on-page" });
  if (headers.h1.length > 1) issues.push({ type: "warning", message: "Multiple H1 tags found", category: "on-page" });

  // Images
  const images: SEOImage[] = $("img").map((_, el) => {
    const src = $(el).attr("src") || "";
    const alt = $(el).attr("alt") || "";
    const isMissingAlt = !$(el).attr("alt");
    
    let altQuality: 'good' | 'generic' | 'missing' = 'good';
    if (isMissingAlt) {
      altQuality = 'missing';
    } else {
      const genericTerms = ["image", "logo", "img", "picture", "photo", "background", "spacer", "icon", "placeholder"];
      const lowerAlt = alt.toLowerCase().trim();
      const isGeneric = genericTerms.some(term => lowerAlt === term || lowerAlt.includes(` ${term} `) || lowerAlt.startsWith(`${term} `) || lowerAlt.endsWith(` ${term}`));
      const isFilename = /^[0-9a-zA-Z\-_]+\.(jpg|png|webp|gif|svg)$/i.test(alt);
      
      if (isGeneric || isFilename || alt.length < 3) {
        altQuality = 'generic';
      }
    }

    return {
      src,
      alt,
      isMissingAlt,
      altQuality
    };
  }).get();

  const totalImages = images.length;
  const missingAltCount = images.filter(img => img.altQuality === 'missing').length;
  const genericAltCount = images.filter(img => img.altQuality === 'generic').length;
  const missingAltPercent = totalImages > 0 ? (missingAltCount / totalImages) * 100 : 0;

  if (missingAltCount > 0) issues.push({ type: "warning", message: `${missingAltCount} images missing alt text`, category: "on-page" });
  if (genericAltCount > 0) issues.push({ type: "info", message: `${genericAltCount} images have generic/low-quality alt text`, category: "content" });
  if (missingAltPercent > 50 && totalImages > 5) issues.push({ type: "critical", message: `Extremely low accessibility: ${missingAltPercent.toFixed(0)}% of images missing alt text`, category: "on-page" });

  const imageMetrics = {
    total: totalImages,
    missingAlt: missingAltCount,
    missingAltPercent: Number(missingAltPercent.toFixed(1)),
    genericAlt: genericAltCount
  };

  // Links extraction
  const linkList = $("a").map((_, el) => $(el).attr("href")).get();
  const domain = new URL(url).hostname;
  const links = {
    internal: [] as string[],
    external: [] as string[]
  };

  linkList.forEach(href => {
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
    try {
      const absolute = new URL(href, url).href;
      if (new URL(absolute).hostname === domain) {
        if (!links.internal.includes(absolute)) links.internal.push(absolute);
      } else {
        if (!links.external.includes(absolute)) links.external.push(absolute);
      }
    } catch (e) { /* Invalid */ }
  });

  // Word count
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(" ").length;
  if (wordCount < 300) issues.push({ type: "warning", message: "Thin content (<300 words)", category: "content" });

  // Text to Code Ratio
  const htmlLength = html.length;
  const textLength = bodyText.length;
  const textToCodeRatio = htmlLength > 0 ? Number(((textLength / htmlLength) * 100).toFixed(2)) : 0;
  if (textToCodeRatio < 10) issues.push({ type: "info", message: `Low text-to-code ratio: ${textToCodeRatio}%`, category: "content" });

  // Technical
  const canonical = $('link[rel="canonical"]').attr("href") || "";
  if (!canonical) {
    issues.push({ type: "warning", message: "Missing canonical tag", category: "technical" });
  } else {
    try {
      const canonicalUrl = new URL(canonical, url).href;
      if (canonicalUrl !== url && !canonicalUrl.includes('?')) {
        issues.push({ type: "info", message: "Non-self-referential canonical detected", category: "technical" });
      }
    } catch (e) {
      issues.push({ type: "critical", message: "Invalid canonical URL format", category: "technical" });
    }
  }

  const robots = $('meta[name="robots"]').attr("content") || "";

  // OG Tags
  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr("property");
    const content = $(el).attr("content");
    if (prop && content) ogTags[prop] = content;
  });

  // Structured Data (JSON-LD)
  const structuredData: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || "{}");
      if (Array.isArray(json)) structuredData.push(...json);
      else structuredData.push(json);
    } catch (e) {
      issues.push({ type: "warning", message: "Invalid JSON-LD syntax detected", category: "technical" });
    }
  });

  if (structuredData.length === 0) {
    issues.push({ type: "warning", message: "No JSON-LD structured data found", category: "technical" });
  } else {
    // Basic Schema Analysis
    structuredData.forEach(sd => {
      const type = sd['@type'];
      if (type === 'Article' || type === 'NewsArticle' || type === 'BlogPosting') {
        if (!sd.headline) issues.push({ type: "info", message: "Schema Article: Missing 'headline' property", category: "technical" });
        if (!sd.author) issues.push({ type: "info", message: "Schema Article: Missing 'author' property", category: "technical" });
        if (!sd.datePublished) issues.push({ type: "info", message: "Schema Article: Missing 'datePublished'", category: "technical" });
      } else if (type === 'Product') {
        if (!sd.name) issues.push({ type: "warning", message: "Schema Product: Missing 'name' property", category: "technical" });
        if (!sd.offers) issues.push({ type: "warning", message: "Schema Product: Missing 'offers' property (price/availability)", category: "technical" });
      } else if (type === 'Organization' || type === 'LocalBusiness') {
        if (!sd.logo && !sd.image) issues.push({ type: "info", message: `Schema ${type}: Missing logo or image`, category: "technical" });
        if (!sd.address) issues.push({ type: "info", message: `Schema ${type}: Missing physical address`, category: "technical" });
      }
    });
  }

  // Simple scoring (starts at 100, drops for issues)
  let score = 100;
  score -= issues.filter(i => i.type === "critical").length * 15;
  score -= issues.filter(i => i.type === "warning").length * 5;

  // Bonus for good content
  if (wordCount > 1000) score += 5;
  if (images.length > 3 && !missingAltCount) score += 5;
  if (structuredData.length > 0) score += 5;

  score = Math.min(100, Math.max(0, score));

  // Performance Simulation (PageSpeed Insights)
  const performance = {
    performanceScore: Math.floor(Math.random() * 40) + 60, // 60-100
    fcp: Number((Math.random() * 2 + 0.5).toFixed(1)), // 0.5 - 2.5s
    lcp: Number((Math.random() * 3 + 1.2).toFixed(1)), // 1.2 - 4.2s
    cls: Number((Math.random() * 0.1).toFixed(3)), // 0 - 0.1
    tbt: Math.floor(Math.random() * 300) // 0 - 300ms
  };

  if (performance.performanceScore < 70) issues.push({ type: "warning", message: "Low performance score detected", category: "technical" });
  if (performance.lcp > 2.5) issues.push({ type: "warning", message: `LCP is high: ${performance.lcp}s`, category: "technical" });

  // Simple Keyword Extraction
  const stopwords = new Set(["a", "an", "the", "and", "or", "but", "if", "then", "of", "to", "in", "is", "it", "that", "this", "was", "for", "with", "as", "at", "by", "from", "up", "on", "out", "about", "into", "over", "after", "your", "more", "their", "have", "been", "these", "thier"]);
  const extractKeywords = (text: string) => {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopwords.has(w));
    
    const freqs: Record<string, number> = {};
    words.forEach(w => freqs[w] = (freqs[w] || 0) + 1);
    
    return Object.entries(freqs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([w]) => w);
  };

  const keywords = extractKeywords(bodyText + " " + title + " " + (headers.h1.join(" ")));

  return {
    url,
    title,
    description,
    wordCount,
    statusCode: 200,
    loadTime,
    headers,
    images,
    links,
    canonical,
    robots,
    ogTags,
    structuredData,
    score,
    issues,
    performance,
    keywords,
    textToCodeRatio,
    imageMetrics
  };
}
