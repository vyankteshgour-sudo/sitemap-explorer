import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  normalizeCrawlSettings,
  normalizeUrl,
  type BrokenLink,
  type CrawlSettings,
  type ExternalLink,
  type SiteAnalysis,
  type SitemapPage,
} from "./site-map";

const MAX_RESPONSE_BYTES = 1_000_000;
const MAX_REDIRECTS = 5;
const MAX_CONCURRENCY = 4;
const MAX_ANALYSIS_MS = 25_000;

type CrawlInput = { url: string; settings: CrawlSettings };
type QueueEntry = { url: string; depth: number; parentUrl: string | null };
type FetchResult = {
  status: number | null;
  statusText: string;
  html: string;
  finalUrl: string;
  stoppedByDeadline?: boolean;
};

const crawlInputSchema = z.object({
  url: z.string().trim().min(1).max(2000),
  settings: z.object({
    maxDepth: z.number().finite(),
    maxPages: z.number().finite(),
    timeoutSeconds: z.number().finite(),
  }),
});

function hostIsWithinSite(url: string, siteHost: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return hostname === siteHost;
  } catch {
    return false;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, number: string) => String.fromCodePoint(Number(number)))
    .replace(/&#x([\da-f]+);/gi, (_match, number: string) => String.fromCodePoint(parseInt(number, 16)));
}

function extractLinks(html: string, baseUrl: string, siteHost: string) {
  const internal = new Set<string>();
  const external = new Set<string>();
  const anchorPattern = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+))/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const href = decodeHtml(match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (!href || href.startsWith("#")) continue;
    const normalized = normalizeUrl(href, baseUrl);
    if (!normalized) continue;
    if (hostIsWithinSite(normalized, siteHost)) internal.add(normalized);
    else external.add(normalized);
  }
  return { internalLinks: [...internal], externalLinks: [...external] };
}

function extractTitle(html: string, fallbackUrl: string): string {
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const title = match?.[1]?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (title) return decodeHtml(title).slice(0, 300);
  try {
    const pathname = new URL(fallbackUrl).pathname;
    return pathname === "/" ? "Homepage" : decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "Page");
  } catch {
    return "Untitled page";
  }
}

async function readHtml(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytesRead = 0;
  try {
    while (bytesRead < MAX_RESPONSE_BYTES) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytesRead += chunk.value.byteLength;
      body += decoder.decode(chunk.value, { stream: true });
      if (bytesRead >= MAX_RESPONSE_BYTES) {
        await reader.cancel();
        break;
      }
    }
    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}

function statusLabel(status: number): string {
  if (status === 404) return "Not Found";
  if (status >= 500) return "Server Error";
  if (status >= 400) return "Request Error";
  return `HTTP ${status}`;
}

async function fetchPage(url: string, timeoutMs: number, siteHost: string, deadlineSignal: AbortSignal): Promise<FetchResult> {
  const requestController = new AbortController();
  const timeout = setTimeout(() => requestController.abort(), timeoutMs);
  const signal = AbortSignal.any([requestController.signal, deadlineSignal]);
  let currentUrl = url;

  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      const safeUrl = normalizeUrl(currentUrl);
      if (!safeUrl || !hostIsWithinSite(safeUrl, siteHost)) {
        return { status: null, statusText: "Redirect left the analyzed website", html: "", finalUrl: currentUrl };
      }
      const response = await fetch(safeUrl, {
        redirect: "manual",
        headers: { Accept: "text/html,application/xhtml+xml" },
        signal,
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location || redirects === MAX_REDIRECTS) {
          return { status: response.status, statusText: "Too many redirects", html: "", finalUrl: safeUrl };
        }
        const next = normalizeUrl(location, safeUrl);
        if (!next || !hostIsWithinSite(next, siteHost)) {
          return { status: null, statusText: "Redirect left the analyzed website", html: "", finalUrl: safeUrl };
        }
        currentUrl = next;
        continue;
      }
      const contentType = response.headers.get("content-type") ?? "";
      const html = contentType.includes("html") ? await readHtml(response) : "";
      return {
        status: response.status,
        statusText: response.statusText || statusLabel(response.status),
        html,
        finalUrl: safeUrl,
      };
    }
    return { status: null, statusText: "Too many redirects", html: "", finalUrl: currentUrl };
  } catch (error) {
    const stoppedByDeadline = deadlineSignal.aborted;
    const timedOut = requestController.signal.aborted;
    return {
      status: null,
      statusText: stoppedByDeadline ? "Not checked — analysis time limit reached" : timedOut ? "Timed out" : "Could not be reached",
      html: "",
      finalUrl: currentUrl,
      stoppedByDeadline,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function crawlWebsite(url: string, settings: CrawlSettings): Promise<SiteAnalysis> {
  const start = normalizeUrl(url);
  if (!start) throw new Error("Enter a valid public website URL using http:// or https://.");
  const parsedStart = new URL(start);
  const siteHost = parsedStart.hostname.toLowerCase().replace(/^www\./, "");
  const pages = new Map<string, SitemapPage>();
  const externalLinks: ExternalLink[] = [];
  const queue: QueueEntry[] = [{ url: start, depth: 0, parentUrl: null }];
  const externalSeen = new Set<string>();
  const analyzedAt = new Date().toISOString();
  const deadlineController = new AbortController();
  const deadlineTimer = setTimeout(() => deadlineController.abort(), MAX_ANALYSIS_MS);
  let reachedTimeLimit = false;

  while (queue.length > 0 && pages.size < settings.maxPages && !deadlineController.signal.aborted) {
    const batch = queue.splice(0, MAX_CONCURRENCY);
    const results = await Promise.all(batch.map(async (entry) => ({
      entry,
      response: await fetchPage(entry.url, settings.timeoutSeconds * 1000, siteHost, deadlineController.signal),
    })));

    for (const { entry, response } of results) {
      const pageLinks = response.html
        ? extractLinks(response.html, response.finalUrl, siteHost)
        : { internalLinks: [], externalLinks: [] };
      const record: SitemapPage = {
        ...entry,
        title: extractTitle(response.html, entry.url),
        status: response.status,
        statusText: response.statusText,
        internalLinks: pageLinks.internalLinks,
        externalLinks: pageLinks.externalLinks,
      };
      pages.set(entry.url, record);

      for (const externalUrl of pageLinks.externalLinks) {
        const key = `${externalUrl}\n${entry.url}`;
        if (!externalSeen.has(key)) {
          externalSeen.add(key);
          externalLinks.push({ url: externalUrl, foundOn: entry.url });
        }
      }

      if (entry.depth < settings.maxDepth) {
        for (const internalUrl of pageLinks.internalLinks) {
          if (pages.has(internalUrl) || queue.some((pending) => pending.url === internalUrl)) continue;
          if (pages.size + queue.length >= settings.maxPages) break;
          queue.push({ url: internalUrl, depth: entry.depth + 1, parentUrl: entry.url });
        }
      }
      if (response.stoppedByDeadline) reachedTimeLimit = true;
    }
  }

  if (deadlineController.signal.aborted) reachedTimeLimit = true;
  clearTimeout(deadlineTimer);

  const pageList = [...pages.values()];
  const brokenLinks: BrokenLink[] = pageList
    .filter((page) => page.status !== null && page.status >= 400 || page.status === null && !page.statusText.startsWith("Not checked"))
    .map((page) => ({
      url: page.url,
      status: page.status,
      error: page.status === null ? page.statusText : page.statusText || statusLabel(page.status),
      foundOn: page.parentUrl ?? start,
    }));

  return {
    website: start,
    analyzedAt,
    summary: {
      pagesDiscovered: pageList.length,
      internalLinks: pageList.reduce((sum, page) => sum + page.internalLinks.length, 0),
      externalLinks: externalLinks.length,
      brokenLinks: brokenLinks.length,
    },
    pages: pageList,
    relationships: pageList.map(({ url: childUrl, parentUrl }) => ({ childUrl, parentUrl })),
    brokenLinks,
    externalLinks,
    ...(reachedTimeLimit || queue.length > 0
      ? { notice: `Partial crawl: ${pageList.length} pages were checked before the crawl limit was reached.` }
      : {}),
  };
}

export const analyzeWebsite = createServerFn({ method: "POST" })
  .inputValidator((input) => crawlInputSchema.parse(input))
  .handler(async ({ data }) => {
    const normalizedUrl = normalizeUrl(data.url);
    if (!normalizedUrl) throw new Error("Enter a valid public website URL using http:// or https://.");
    const settings = normalizeCrawlSettings(data.settings);
    return crawlWebsite(normalizedUrl, settings);
  });