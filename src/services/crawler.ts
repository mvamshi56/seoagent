import fetch from "node-fetch";
import { analyzeHTML } from "./analyzer.js";
import * as db from "./storage.js";

interface AuditConfig {
  depth: number;
  maxPages: number;
}

export async function audit(startUrl: string, config: AuditConfig) {
  const { depth, maxPages } = config;
  const visited = new Set<string>();
  const queue: { url: string; currentDepth: number }[] = [{ url: startUrl, currentDepth: 0 }];
  
  await db.resetData();
  await db.updateStatus(true, 0, startUrl);

  const domainUrl = new URL(startUrl);
  const baseDomain = `${domainUrl.protocol}//${domainUrl.hostname}`;
  
  // Check robots.txt and sitemap.xml
  let hasRobots = false;
  let hasSitemap = false;
  
  try {
    const robotsRes = await fetch(`${baseDomain}/robots.txt`);
    hasRobots = robotsRes.ok;

    // Common sitemap locations
    const sitemapPaths = ["/sitemap.xml", "/sitemap-index.xml", "/sitemap_index.xml"];
    for (const path of sitemapPaths) {
      const sRes = await fetch(`${baseDomain}${path}`);
      if (sRes.ok) {
        hasSitemap = true;
        break;
      }
    }
  } catch (e) {
    console.error("Error checking sitewide assets:", e);
  }

  let processedCount = 0;
  const domain = new URL(startUrl).hostname;

  while (queue.length > 0 && processedCount < maxPages) {
    const { url, currentDepth } = queue.shift()!;
    
    if (visited.has(url) || currentDepth > depth) continue;
    visited.add(url);

    try {
      await db.updateStatus(true, Math.round((processedCount / maxPages) * 100), url);

      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        headers: { "User-Agent": "SEO-Sage-Agent/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Failed to fetch ${url}: ${response.statusText}`);
        continue;
      }

      const html = await response.text();
      const loadTime = Date.now() - startTime;

      const pageData = analyzeHTML(url, html, loadTime);
      await db.savePage(pageData);
      processedCount++;

      // Add discovered links to queue
      if (currentDepth < depth) {
        for (const link of pageData.links.internal) {
          if (!visited.has(link)) {
            queue.push({ url: link, currentDepth: currentDepth + 1 });
          }
        }
      }
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
      await db.updateStatus(false, 0, `Error: ${url}`);
    }
  }

  await db.updateStatus(false, 100, "Completed", hasRobots, hasSitemap);
}
