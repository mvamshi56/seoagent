export interface SEOPage {
  url: string;
  title: string;
  description: string;
  wordCount: number;
  statusCode: number;
  loadTime: number;
  images: SEOImage[];
  canonical: string;
  robots: string;
  ogTags: Record<string, string>;
  structuredData: any[];
  links: {
    internal: string[];
    external: string[];
  };
  headers: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  score: number;
  issues: SEOIssue[];
  performance: SEOPerformance;
  keywords: string[];
  textToCodeRatio: number;
  imageMetrics: {
    total: number;
    missingAlt: number;
    missingAltPercent: number;
    genericAlt: number;
  };
}

export interface SEOPerformance {
  performanceScore: number;
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  cls: number; // Cumulative Layout Shift
  tbt: number; // Total Blocking Time
}

export interface SEOImage {
  src: string;
  alt: string;
  isMissingAlt: boolean;
  altQuality: 'good' | 'generic' | 'missing';
}

export interface SEOIssue {
  type: "critical" | "warning" | "info";
  message: string;
  category: "on-page" | "technical" | "content";
}

export interface AuditStats {
  totalPages: number;
  averageScore: number;
  criticalIssues: number;
  warningIssues: number;
  totalLinks: number;
  hasRobots: boolean;
  hasSitemap: boolean;
}
