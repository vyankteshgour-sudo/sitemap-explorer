export type CrawlSettings = {
  maxDepth: number;
  maxPages: number;
  timeoutSeconds: number;
};

export const DEFAULT_CRAWL_SETTINGS: CrawlSettings = {
  maxDepth: 3,
  maxPages: 50,
  timeoutSeconds: 10,
};

export const MAX_PAGE_LIMIT = 50;

export type SitemapPage = {
  url: string;
  title: string;
  status: number | null;
  statusText: string;
  parentUrl: string | null;
  depth: number;
  internalLinks: string[];
  externalLinks: string[];
};

export type BrokenLink = {
  url: string;
  status: number | null;
  error: string;
  foundOn: string;
};

export type ExternalLink = {
  url: string;
  foundOn: string;
};

export type SitemapRelationship = {
  parentUrl: string | null;
  childUrl: string;
};

export type SiteAnalysis = {
  website: string;
  analyzedAt: string;
  summary: {
    pagesDiscovered: number;
    internalLinks: number;
    externalLinks: number;
    brokenLinks: number;
  };
  pages: SitemapPage[];
  relationships: SitemapRelationship[];
  brokenLinks: BrokenLink[];
  externalLinks: ExternalLink[];
  notice?: string;
  isDemo?: boolean;
};

export function normalizeCrawlSettings(settings?: Partial<CrawlSettings>): CrawlSettings {
  const boundedInteger = (value: number | undefined, fallback: number, min: number, max: number) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, Math.floor(value as number))) : fallback;

  return {
    maxDepth: boundedInteger(settings?.maxDepth, DEFAULT_CRAWL_SETTINGS.maxDepth, 1, 6),
    maxPages: boundedInteger(
      settings?.maxPages,
      DEFAULT_CRAWL_SETTINGS.maxPages,
      1,
      MAX_PAGE_LIMIT,
    ),
    timeoutSeconds: boundedInteger(
      settings?.timeoutSeconds,
      DEFAULT_CRAWL_SETTINGS.timeoutSeconds,
      1,
      10,
    ),
  };
}

function isPrivateOrReservedHost(hostname: string): boolean {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".test") ||
    host.endsWith(".example") ||
    host.endsWith(".invalid") ||
    host === "home.arpa" ||
    host.endsWith(".home.arpa") ||
    host.endsWith(".onion")
  )
    return true;

  if (host.includes(":")) {
    return (
      host === "::" ||
      host === "::1" ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe8") ||
      host.startsWith("fe9") ||
      host.startsWith("fea") ||
      host.startsWith("feb") ||
      host.startsWith("ff") ||
      host.startsWith("::ffff:") ||
      host.startsWith("2001:db8:")
    );
  }

  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  const octets = host.split(".").map(Number);
  if (octets.some((part) => part < 0 || part > 255)) return true;
  const [first = 0, second = 0] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 2) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && octets[2] === 100) ||
    (first === 203 && second === 0 && octets[2] === 113)
  );
}

export function normalizeUrl(value: string, base?: string): string | null {
  try {
    const url = base ? new URL(value, base) : new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !url.hostname ||
      url.username ||
      url.password ||
      isPrivateOrReservedHost(url.hostname)
    )
      return null;

    url.hash = "";
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return null;
  }
}
