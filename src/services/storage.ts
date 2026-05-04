import Database from "better-sqlite3";
import { SEOPage } from "../types/seo.js";

let db: any = null;

export async function initDB() {
  db = new Database("./seo_audit.sqlite");

  db.exec(`
    CREATE TABLE IF NOT EXISTS pages (
      url TEXT PRIMARY KEY,
      data TEXT,
      score REAL
    );
    CREATE TABLE IF NOT EXISTS audit_status (
      id INTEGER PRIMARY KEY,
      is_running BOOLEAN,
      progress INTEGER,
      current_url TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Schema migrations
  const tableInfo = db.prepare("PRAGMA table_info(audit_status)").all();
  const columns = tableInfo.map((c: any) => c.name);
  if (!columns.includes("has_robots")) {
    db.prepare("ALTER TABLE audit_status ADD COLUMN has_robots BOOLEAN DEFAULT 0").run();
  }
  if (!columns.includes("has_sitemap")) {
    db.prepare("ALTER TABLE audit_status ADD COLUMN has_sitemap BOOLEAN DEFAULT 0").run();
  }

  const status = db.prepare("SELECT * FROM audit_status WHERE id = 1").get();
  if (!status) {
    db.prepare("INSERT INTO audit_status (id, is_running, progress, current_url, has_robots, has_sitemap) VALUES (1, 0, 0, '', 0, 0)").run();
  }
}

export async function savePage(page: SEOPage) {
  db.prepare("INSERT OR REPLACE INTO pages (url, data, score) VALUES (?, ?, ?)")
    .run(page.url, JSON.stringify(page), page.score);
}

export async function getPages(): Promise<SEOPage[]> {
  const rows = db.prepare("SELECT data FROM pages").all();
  return rows.map((r: any) => JSON.parse(r.data));
}

export async function updateStatus(isRunning: boolean, progress: number, currentUrl: string, hasRobots?: boolean, hasSitemap?: boolean) {
  if (isRunning) {
    db.prepare("UPDATE audit_status SET is_running = ?, progress = ?, current_url = ?, last_updated = CURRENT_TIMESTAMP WHERE id = 1")
      .run(1, progress, currentUrl);
  } else {
    const updates = [];
    const params = [0, progress, currentUrl];
    
    if (hasRobots !== undefined) {
      updates.push("has_robots = ?");
      params.push(hasRobots ? 1 : 0);
    }
    if (hasSitemap !== undefined) {
      updates.push("has_sitemap = ?");
      params.push(hasSitemap ? 1 : 0);
    }
    
    const query = `UPDATE audit_status SET is_running = ?, progress = ?, current_url = ?, ${updates.length ? updates.join(", ") + ", " : ""} last_updated = CURRENT_TIMESTAMP WHERE id = 1`;
    db.prepare(query).run(...params);
  }
}

export async function getAuditStatus() {
  return db.prepare("SELECT * FROM audit_status WHERE id = 1").get();
}

export async function getStats() {
  const pages = await getPages();
  const status = await getAuditStatus();
  const criticalIssues = pages.reduce((acc, p) => acc + p.issues.filter(i => i.type === "critical").length, 0);
  const warningIssues = pages.reduce((acc, p) => acc + p.issues.filter(i => i.type === "warning").length, 0);
  const totalLinks = pages.reduce((acc, p) => acc + (p.links.internal.length + p.links.external.length), 0);
  const averageScore = pages.length > 0 ? pages.reduce((acc, p) => acc + p.score, 0) / pages.length : 0;

  return {
    totalPages: pages.length,
    averageScore: Math.round(averageScore),
    criticalIssues,
    warningIssues,
    totalLinks,
    hasRobots: !!status.has_robots,
    hasSitemap: !!status.has_sitemap
  };
}

export async function resetData() {
  db.prepare("DELETE FROM pages").run();
  await updateStatus(false, 0, "", false, false);
}
