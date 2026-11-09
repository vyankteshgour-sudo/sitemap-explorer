import { describe, expect, it } from "vitest";

import { DEFAULT_CRAWL_SETTINGS, normalizeCrawlSettings, normalizeUrl } from "./site-map";

describe("sitemap URL and crawl settings", () => {
  it("uses the specified crawl defaults", () => {
    expect(DEFAULT_CRAWL_SETTINGS).toEqual({ maxDepth: 3, maxPages: 50, timeoutSeconds: 10 });
  });

  it("caps page and timeout settings at the supported limits", () => {
    expect(normalizeCrawlSettings({ maxDepth: 99, maxPages: 100, timeoutSeconds: 60 })).toEqual({
      maxDepth: 6,
      maxPages: 50,
      timeoutSeconds: 10,
    });
  });

  it("removes fragments and redundant trailing slashes from URLs", () => {
    expect(normalizeUrl("https://Example.com/team///?ref=site#members")).toBe(
      "https://example.com/team?ref=site",
    );
  });

  it("rejects local and non-web addresses before a crawl", () => {
    expect(normalizeUrl("http://127.0.0.1/admin")).toBeNull();
    expect(normalizeUrl("http://localhost:8080/" )).toBeNull();
    expect(normalizeUrl("file:///etc/passwd")).toBeNull();
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });
});