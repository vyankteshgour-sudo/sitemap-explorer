import type { SiteAnalysis, SitemapPage } from "./site-map";

const origin = "https://bashcraftclub.vercel.app";
const page = (
  path: string,
  title: string,
  parent: string | null,
  depth: number,
  status: number,
  children: string[],
  external: string[] = [],
): SitemapPage => ({
  url: `${origin}${path}`,
  title,
  status,
  statusText: status === 200 ? "OK" : status === 404 ? "Not Found" : "Internal Server Error",
  parentUrl: parent ? `${origin}${parent}` : null,
  depth,
  internalLinks: children.map((child) => `${origin}${child}`),
  externalLinks: external,
});

export function createDemoAnalysis(): SiteAnalysis {
  const pages = [
    page("/", "BashCraft Club — no fluff; just engineering", null, 0, 200,
      ["/about", "/events", "/projects", "/community", "/resources", "/blog", "/contact", "/careers"],
      ["https://github.com/", "https://www.linkedin.com/", "https://www.instagram.com/", "https://discord.com/"]),
    page("/about", "About BashCraft Club", "/", 1, 200,
      ["/about/team", "/projects", "/community"], ["https://www.linkedin.com/"]),
    page("/about/team", "The people behind BashCraft", "/about", 2, 200,
      ["/about", "/contact"], ["https://github.com/"]),
    page("/events", "Events & workshops", "/", 1, 200,
      ["/events/design-meetup", "/events/portfolio-review", "/events/legacy-workshop", "/community"],
      ["https://lu.ma/"]),
    page("/events/design-meetup", "Design Meetup", "/events", 2, 200,
      ["/events", "/community"], ["https://lu.ma/"]),
    page("/events/portfolio-review", "Portfolio Review Night", "/events", 2, 200,
      ["/events", "/projects"], ["https://lu.ma/"]),
    page("/events/legacy-workshop", "Archived workshop", "/events", 2, 500, []),
    page("/projects", "Community projects", "/", 1, 200,
      ["/about", "/community", "/resources"]),
    page("/community", "Join the community", "/", 1, 200,
      ["/events", "/contact"], ["https://discord.com/"]),
    page("/resources", "Resources for makers", "/", 1, 200,
      ["/projects", "/blog", "/community"]),
    page("/blog", "Notes from BashCraft", "/", 1, 200,
      ["/resources", "/events"]),
    page("/contact", "Get in touch", "/", 1, 200,
      ["/about", "/community"]),
    page("/careers", "Careers", "/", 1, 404, []),
  ];
  const externalLinks = pages.flatMap((item) => item.externalLinks.map((url) => ({ url, foundOn: item.url })));
  const brokenLinks = pages
    .filter((item) => item.status >= 400)
    .map((item) => ({
      url: item.url,
      status: item.status,
      error: item.statusText,
      foundOn: item.parentUrl ?? origin,
    }));

  return {
    website: `${origin}/`,
    analyzedAt: "2026-11-09T22:11:00.000Z",
    isDemo: true,
    summary: {
      pagesDiscovered: pages.length,
      internalLinks: pages.reduce((sum, item) => sum + item.internalLinks.length, 0),
      externalLinks: externalLinks.length,
      brokenLinks: brokenLinks.length,
    },
    pages,
    relationships: pages.map(({ url, parentUrl }) => ({ parentUrl, childUrl: url })),
    brokenLinks,
    externalLinks,
  };
}