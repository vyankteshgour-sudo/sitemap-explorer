import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleX,
  Clock3,
  Download,
  ExternalLink,
  FileJson2,
  FolderTree,
  Globe2,
  Link2,
  ListFilter,
  LoaderCircle,
  Search,
  ShieldAlert,
  TriangleAlert,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyzeWebsite } from "@/lib/site-map.functions";
import { createDemoAnalysis } from "@/lib/site-map-demo";
import {
  DEFAULT_CRAWL_SETTINGS,
  MAX_PAGE_LIMIT,
  normalizeCrawlSettings,
  normalizeUrl,
  type SiteAnalysis,
  type SitemapPage,
} from "@/lib/site-map";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BashCraft SiteMap — website & link analyzer" },
      {
        name: "description",
        content:
          "Map website pages, inspect link health, and export a structured sitemap with BashCraft SiteMap.",
      },
      { property: "og:title", content: "BashCraft SiteMap — website & link analyzer" },
      {
        property: "og:description",
        content:
          "Map website pages, inspect link health, and export a structured sitemap with BashCraft SiteMap.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SiteMapApp,
});

type SortField = "title" | "url" | "status" | "internalLinks" | "externalLinks";
type CrawlStep = "validate" | "discover" | "crawl" | "check" | "build";

const exampleWebsite = "https://bashcraftclub.vercel.app/";
const loadingSteps: { id: CrawlStep; label: string }[] = [
  { id: "validate", label: "Validating website address" },
  { id: "discover", label: "Discovering internal pages" },
  { id: "crawl", label: "Following page links" },
  { id: "check", label: "Checking response status" },
  { id: "build", label: "Building your sitemap" },
];

function SiteMapApp() {
  const [analysis, setAnalysis] = useState<SiteAnalysis>(() => createDemoAnalysis());
  const [url, setUrl] = useState(exampleWebsite);
  const [urlError, setUrlError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [maxDepth, setMaxDepth] = useState(DEFAULT_CRAWL_SETTINGS.maxDepth);
  const [maxPages, setMaxPages] = useState(DEFAULT_CRAWL_SETTINGS.maxPages);
  const [timeoutSeconds, setTimeoutSeconds] = useState(DEFAULT_CRAWL_SETTINGS.timeoutSeconds);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("url");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, loadingSteps.length - 1));
    }, 1250);
    return () => window.clearInterval(interval);
  }, [isAnalyzing]);

  const pageByUrl = new Map(analysis.pages.map((page) => [page.url, page]));
  const visiblePages = analysis.pages
    .filter((page) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        page.title.toLowerCase().includes(query) ||
        page.url.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "200" && page.status === 200) ||
        (statusFilter === "error" && page.status !== null && page.status >= 400) ||
        (statusFilter === "unreachable" && page.status === null);
      return matchesSearch && matchesStatus;
    })
    .slice()
    .sort((left, right) => {
      const a: string | number =
        sortField === "title"
          ? left.title.toLowerCase()
          : sortField === "url"
            ? left.url.toLowerCase()
            : sortField === "status"
              ? (left.status ?? 0)
              : sortField === "internalLinks"
                ? left.internalLinks.length
                : left.externalLinks.length;
      const b: string | number =
        sortField === "title"
          ? right.title.toLowerCase()
          : sortField === "url"
            ? right.url.toLowerCase()
            : sortField === "status"
              ? (right.status ?? 0)
              : sortField === "internalLinks"
                ? right.internalLinks.length
                : right.externalLinks.length;
      const compared =
        typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
      return sortDirection === "asc" ? compared : -compared;
    });

  async function handleAnalyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeUrl(url.trim());
    if (!normalized) {
      setUrlError("Enter a public website address using http:// or https://.");
      return;
    }
    setUrlError("");
    setRequestError("");
    setIsAnalyzing(true);
    setActiveStep(0);
    try {
      const result = await analyzeWebsite({
        data: {
          url: normalized,
          settings: normalizeCrawlSettings({ maxDepth, maxPages, timeoutSeconds }),
        },
      });
      setAnalysis(result);
      setSearch("");
      setStatusFilter("all");
      setCollapsed(new Set());
      window.setTimeout(
        () =>
          document
            .getElementById("results")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        80,
      );
    } catch (error) {
      setRequestError(
        error instanceof Error
          ? error.message
          : "This website could not be analyzed. Please check the address and try again.",
      );
    } finally {
      setIsAnalyzing(false);
      setActiveStep(loadingSteps.length - 1);
    }
  }

  function analyzeAnother() {
    setAnalysis(createDemoAnalysis());
    setUrl(exampleWebsite);
    setSearch("");
    setStatusFilter("all");
    setRequestError("");
    setUrlError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${new URL(analysis.website).hostname}-sitemap.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <a
            href="#top"
            className="flex min-w-0 items-center gap-2.5 text-sm font-semibold tracking-[-0.01em]"
            aria-label="BashCraft SiteMap home"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FolderTree className="size-4" />
            </span>
            <span className="truncate">
              BashCraft <span className="font-normal text-muted-foreground">/ SiteMap</span>
            </span>
          </a>
          <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <span className="size-1.5 rounded-full bg-foreground/60" />
            Website &amp; link analyzer
          </span>
        </div>
      </header>

      <section id="top" className="mx-auto max-w-7xl scroll-mt-8 px-5 pb-9 pt-11 sm:px-8 sm:pt-14">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-foreground/70" />
            OPEN SOURCE · SITE INTELLIGENCE
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            BashCraft SiteMap
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            Discover pages. Analyze links. Find problems.
          </p>

          <form onSubmit={handleAnalyze} noValidate className="mt-8">
            <label htmlFor="website-url" className="mb-2 block text-sm font-medium">
              Website address
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div
                className={cn(
                  "relative min-w-0 flex-1",
                  urlError && "[&>input]:border-destructive",
                )}
              >
                <Globe2
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="website-url"
                  type="url"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setUrlError("");
                  }}
                  placeholder="https://example.com"
                  aria-invalid={Boolean(urlError)}
                  aria-describedby={urlError ? "url-error" : "url-example"}
                  className="h-11 rounded-md pl-10 pr-10 text-sm shadow-none"
                  disabled={isAnalyzing}
                />
                {url !== exampleWebsite && url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    title="Restore example website"
                    aria-label="Restore example website"
                    onClick={() => setUrl(exampleWebsite)}
                    className="absolute right-1 top-1 size-9 text-muted-foreground shadow-none"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
              <Button
                type="submit"
                disabled={isAnalyzing}
                className="h-11 shrink-0 gap-2 rounded-md px-5 shadow-none"
              >
                {isAnalyzing ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                Analyze Website
                {!isAnalyzing && <ArrowUpRight className="size-4" />}
              </Button>
            </div>
            {urlError ? (
              <p id="url-error" role="alert" className="mt-2 text-sm text-destructive">
                {urlError}
              </p>
            ) : (
              <p id="url-example" className="mt-2 text-xs text-muted-foreground">
                Try an example:{" "}
                <button
                  type="button"
                  className="font-mono text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                  onClick={() => setUrl(exampleWebsite)}
                >
                  {exampleWebsite}
                </button>
              </p>
            )}

            <details className="group mt-5 border-t border-border pt-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-open:rotate-90"
                />
                Crawl settings
                <span className="ml-auto hidden font-mono text-[11px] text-muted-foreground/80 sm:block">
                  depth {maxDepth} · {maxPages} pages · {timeoutSeconds}s / page
                </span>
              </summary>
              <div className="grid grid-cols-1 gap-4 pb-1 pt-5 sm:grid-cols-3">
                <label className="space-y-2 text-xs text-muted-foreground">
                  <span className="block font-medium text-foreground">Maximum crawl depth</span>
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    value={maxDepth}
                    onChange={(event) => setMaxDepth(Number(event.target.value))}
                    className="h-9 rounded-md shadow-none"
                  />
                  <span className="block">1–6 levels from the starting page</span>
                </label>
                <label className="space-y-2 text-xs text-muted-foreground">
                  <span className="block font-medium text-foreground">Maximum pages</span>
                  <Input
                    type="number"
                    min="1"
                    max={MAX_PAGE_LIMIT}
                    value={maxPages}
                    onChange={(event) => setMaxPages(Number(event.target.value))}
                    className="h-9 rounded-md shadow-none"
                  />
                  <span className="block">Up to {MAX_PAGE_LIMIT} pages per analysis</span>
                </label>
                <label className="space-y-2 text-xs text-muted-foreground">
                  <span className="block font-medium text-foreground">Timeout per page</span>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={timeoutSeconds}
                    onChange={(event) => setTimeoutSeconds(Number(event.target.value))}
                    className="h-9 rounded-md shadow-none"
                  />
                  <span className="block">1–10 seconds per page</span>
                </label>
              </div>
            </details>
          </form>

          {isAnalyzing && <LoadingPanel activeStep={activeStep} />}
          {requestError && !isAnalyzing && (
            <div
              role="alert"
              className="mt-5 flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div className="min-w-0">
                <p className="font-medium">The website couldn’t be analyzed</p>
                <p className="mt-1 break-words text-muted-foreground">{requestError}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {!isAnalyzing && (
        <section
          id="results"
          aria-label="Website analysis"
          className="scroll-mt-6 border-t border-border bg-background"
        >
          <div className="mx-auto max-w-7xl px-5 pb-12 pt-8 sm:px-8">
            <div className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Analysis results
                  </p>
                  {analysis.isDemo && (
                    <span className="rounded-sm border border-border px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                      Preview data
                    </span>
                  )}
                  {!analysis.isDemo && (
                    <span className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-0.5 text-[10px] font-medium uppercase">
                      <CircleCheck className="size-3" />
                      Live analysis
                    </span>
                  )}
                </div>
                <h2 className="break-all font-mono text-lg font-medium sm:text-xl">
                  {analysis.website}
                </h2>
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  {analysis.isDemo ? "Example analysis · " : "Analyzed "}
                  {formatUtc(analysis.analyzedAt)}
                  <span className="mx-1 text-border">·</span>
                  {analysis.pages.length} pages
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={exportJson}
                  variant="outline"
                  className="h-9 gap-2 rounded-md shadow-none"
                >
                  <Download className="size-4" /> Export JSON
                </Button>
                <Button
                  type="button"
                  onClick={analyzeAnother}
                  variant="outline"
                  className="h-9 gap-2 rounded-md shadow-none"
                >
                  <Search className="size-4" /> Analyze another
                </Button>
              </div>
            </div>

            {analysis.notice && (
              <div
                role="status"
                className="mt-5 flex items-start gap-2 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {analysis.notice}
              </div>
            )}

            {analysis.isDemo && (
              <div
                role="note"
                className="mt-5 flex items-start gap-2.5 border-l-2 border-foreground/40 py-1 pl-3 text-xs leading-relaxed text-muted-foreground"
              >
                <FileJson2 className="mt-0.5 size-3.5 shrink-0" />
                Example sitemap to explore. Choose{" "}
                <span className="font-medium text-foreground">Analyze Website</span> to check the
                live site and update these results.
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 border-l border-t border-border sm:grid-cols-4">
              <Metric
                label="Pages discovered"
                value={analysis.summary.pagesDiscovered}
                icon={<FolderTree className="size-4" />}
                detail="Unique pages"
              />
              <Metric
                label="Internal links"
                value={analysis.summary.internalLinks}
                icon={<Link2 className="size-4" />}
                detail="Across all pages"
              />
              <Metric
                label="External links"
                value={analysis.summary.externalLinks}
                icon={<ExternalLink className="size-4" />}
                detail="Not crawled"
              />
              <Metric
                label="Broken links"
                value={analysis.summary.brokenLinks}
                icon={<ShieldAlert className="size-4" />}
                detail="Errors &amp; unreachable"
                warning={analysis.summary.brokenLinks > 0}
              />
            </div>

            <div className="mt-9 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
              <section aria-labelledby="sitemap-heading" className="min-w-0">
                <SectionHeading
                  eyebrow="PAGE STRUCTURE"
                  title="Sitemap"
                  count={`${analysis.pages.length} pages`}
                  icon={<FolderTree className="size-4" />}
                />
                <div
                  className="mt-4 overflow-x-auto border-y border-border py-3"
                  role="tree"
                  aria-label="Website sitemap tree"
                >
                  {analysis.pages.length ? (
                    <div className="min-w-[430px] pr-3">
                      {analysis.pages
                        .filter((page) => !page.parentUrl || !pageByUrl.has(page.parentUrl))
                        .map((page) => (
                          <TreeNode
                            key={page.url}
                            page={page}
                            pages={analysis.pages}
                            collapsed={collapsed}
                            onToggle={(nodeUrl) =>
                              setCollapsed((current) => {
                                const next = new Set(current);
                                if (next.has(nodeUrl)) next.delete(nodeUrl);
                                else next.add(nodeUrl);
                                return next;
                              })
                            }
                          />
                        ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No pages found"
                      detail="Try analyzing a publicly accessible website."
                    />
                  )}
                </div>
              </section>

              <section aria-labelledby="pages-heading" className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <SectionHeading
                    eyebrow="CRAWL RESULTS"
                    title="Discovered pages"
                    count={`${visiblePages.length} of ${analysis.pages.length}`}
                  />
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <label className="relative min-w-0 flex-1">
                    <span className="sr-only">Search pages</span>
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search pages..."
                      className="h-9 rounded-md pl-9 text-sm shadow-none"
                    />
                  </label>
                  <label className="flex h-9 items-center gap-2 rounded-md border border-input px-2.5 text-muted-foreground">
                    <ListFilter className="size-3.5 shrink-0" />
                    <span className="sr-only">Filter pages by status</span>
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value)}
                      className="max-w-[130px] bg-transparent text-xs text-foreground outline-none"
                    >
                      <option value="all">All statuses</option>
                      <option value="200">Healthy</option>
                      <option value="error">Errors</option>
                      <option value="unreachable">Unreachable</option>
                    </select>
                  </label>
                </div>

                <div className="mt-3 overflow-x-auto border-y border-border">
                  <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <SortHeader
                          label="Status"
                          field="status"
                          sortField={sortField}
                          direction={sortDirection}
                          onSort={changeSort}
                        />
                        <SortHeader
                          label="Page title"
                          field="title"
                          sortField={sortField}
                          direction={sortDirection}
                          onSort={changeSort}
                        />
                        <SortHeader
                          label="URL"
                          field="url"
                          sortField={sortField}
                          direction={sortDirection}
                          onSort={changeSort}
                        />
                        <SortHeader
                          label="Internal"
                          field="internalLinks"
                          sortField={sortField}
                          direction={sortDirection}
                          onSort={changeSort}
                          numeric
                        />
                        <SortHeader
                          label="External"
                          field="externalLinks"
                          sortField={sortField}
                          direction={sortDirection}
                          onSort={changeSort}
                          numeric
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePages.map((page) => (
                        <tr
                          key={page.url}
                          className="group border-b border-border/70 transition-colors last:border-b-0 hover:bg-muted/40"
                        >
                          <td className="px-3 py-3.5 align-middle">
                            <StatusBadge status={page.status} />
                          </td>
                          <td className="max-w-[190px] px-3 py-3.5 align-middle">
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noreferrer"
                              title={page.title}
                              className="block truncate font-medium text-foreground decoration-border underline-offset-4 hover:underline"
                            >
                              {page.title}
                            </a>
                          </td>
                          <td className="max-w-[240px] px-3 py-3.5 align-middle">
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noreferrer"
                              title={page.url}
                              className="group/link flex min-w-0 items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                            >
                              <span className="truncate">
                                {displayPath(page.url, analysis.website)}
                              </span>
                              <ArrowUpRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover/link:opacity-100" />
                            </a>
                          </td>
                          <td className="px-3 py-3.5 text-right align-middle font-mono tabular-nums">
                            {page.internalLinks.length}
                          </td>
                          <td className="px-3 py-3.5 text-right align-middle font-mono tabular-nums">
                            {page.externalLinks.length}
                          </td>
                        </tr>
                      ))}
                      {visiblePages.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center">
                            <EmptyState
                              title="No matching pages"
                              detail="Try another search or clear the status filter."
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 border-t border-border pt-8 lg:grid-cols-2">
              <section aria-labelledby="broken-links-heading" className="min-w-0">
                <SectionHeading
                  eyebrow="NEEDS ATTENTION"
                  title="Broken links"
                  count={`${analysis.brokenLinks.length} found`}
                  icon={<TriangleAlert className="size-4" />}
                />
                {analysis.brokenLinks.length ? (
                  <div className="mt-4 overflow-x-auto border-y border-border">
                    <table className="w-full min-w-[440px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="px-3 py-2.5 font-medium">URL</th>
                          <th className="px-3 py-2.5 font-medium">Status / error</th>
                          <th className="px-3 py-2.5 font-medium">Found on</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.brokenLinks.map((link) => (
                          <tr
                            key={`${link.url}-${link.foundOn}`}
                            className="border-b border-border/70 last:border-b-0"
                          >
                            <td className="max-w-[210px] px-3 py-3">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="block truncate font-mono text-destructive underline-offset-4 hover:underline"
                                title={link.url}
                              >
                                {displayPath(link.url, analysis.website)}
                              </a>
                            </td>
                            <td className="px-3 py-3">
                              <span className="flex items-center gap-1.5 text-destructive">
                                <CircleX className="size-3.5 shrink-0" />
                                {link.status ? `${link.status} · ${link.error}` : link.error}
                              </span>
                            </td>
                            <td className="max-w-[115px] px-3 py-3 font-mono text-muted-foreground">
                              <a
                                href={link.foundOn}
                                target="_blank"
                                rel="noreferrer"
                                className="block truncate hover:text-foreground"
                                title={link.foundOn}
                              >
                                {displayPath(link.foundOn, analysis.website)}
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 border-y border-border py-5 text-sm text-muted-foreground">
                    <CircleCheck className="size-4" /> No broken links found.
                  </div>
                )}
              </section>

              <section aria-labelledby="external-links-heading" className="min-w-0">
                <SectionHeading
                  eyebrow="OUTBOUND LINKS"
                  title="External links"
                  count={`${analysis.externalLinks.length} found`}
                  icon={<ExternalLink className="size-4" />}
                />
                {analysis.externalLinks.length ? (
                  <div className="mt-4 max-h-[340px] overflow-y-auto border-y border-border">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="px-3 py-2.5 font-medium">External URL</th>
                          <th className="px-3 py-2.5 font-medium">Found on</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.externalLinks.map((link) => (
                          <tr
                            key={`${link.url}-${link.foundOn}`}
                            className="border-b border-border/70 last:border-b-0"
                          >
                            <td className="max-w-[310px] px-3 py-3">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group/link flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                              >
                                <span className="truncate">
                                  {link.url.replace(/^https?:\/\//, "")}
                                </span>
                                <ExternalLink className="size-3 shrink-0" />
                              </a>
                            </td>
                            <td className="max-w-[100px] px-3 py-3 font-mono text-muted-foreground">
                              <a
                                href={link.foundOn}
                                target="_blank"
                                rel="noreferrer"
                                className="block truncate hover:text-foreground"
                                title={link.foundOn}
                              >
                                {displayPath(link.foundOn, analysis.website)}
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 border-y border-border py-5 text-sm text-muted-foreground">
                    <ExternalLink className="size-4" /> No external links found.
                  </div>
                )}
              </section>
            </div>

            <footer className="mt-9 flex flex-col gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                BashCraft SiteMap <span className="mx-1 text-border">·</span> Website link analyzer
              </span>
              <span>External websites are listed, never crawled.</span>
            </footer>
          </div>
        </section>
      )}
    </main>
  );

  function changeSort(field: SortField) {
    if (field === sortField) setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDirection(field === "url" ? "asc" : "desc");
    }
  }
}

function LoadingPanel({ activeStep }: { activeStep: number }) {
  const percent = Math.max(8, Math.round(((activeStep + 1) / loadingSteps.length) * 84));
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Website analysis in progress"
      className="mt-6 border border-border"
    >
      <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
        <LoaderCircle className="size-4 animate-spin text-foreground" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Analyzing website</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Your sitemap is taking shape.</p>
        </div>
        <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
          {percent}%
        </span>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 p-4 sm:grid-cols-2">
        {loadingSteps.map((step, index) => {
          const complete = index < activeStep;
          const active = index === activeStep;
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2.5 text-xs",
                index > activeStep && "text-muted-foreground/60",
                !complete && active && "text-foreground",
              )}
            >
              {complete ? (
                <CircleCheck className="size-3.5 shrink-0" />
              ) : active ? (
                <LoaderCircle className="crawl-pulse size-3.5 shrink-0" />
              ) : (
                <span className="size-3.5 shrink-0 rounded-full border border-border" />
              )}
              {step.label}
            </div>
          );
        })}
      </div>
      <div className="h-0.5 bg-muted">
        <div
          className="h-full bg-foreground transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  detail,
  warning = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div className="flex min-h-[121px] flex-col border-b border-r border-border bg-background p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={warning ? "text-destructive" : ""}>{icon}</span>
      </div>
      <div
        className={cn(
          "mt-3 font-mono text-[32px] font-medium leading-none tabular-nums",
          warning && "text-destructive",
        )}
      >
        {value}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{detail}</div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  count,
  icon,
}: {
  eyebrow: string;
  title: string;
  count?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase text-muted-foreground">
        {icon}
        {eyebrow}
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
        {count && <span className="font-mono text-[11px] text-muted-foreground">{count}</span>}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: number | null }) {
  if (status === null)
    return (
      <span
        title="Unable to reach this page"
        className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground"
      >
        <span className="size-1.5 rounded-full bg-muted-foreground/50" />
        N/A
      </span>
    );
  const healthy = status >= 200 && status < 400;
  return (
    <span
      title={healthy ? "Page responded successfully" : "Page returned an error"}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap font-mono tabular-nums",
        healthy ? "text-foreground" : "text-destructive",
      )}
    >
      {healthy ? <CircleCheck className="size-3" /> : <CircleX className="size-3" />}
      {status}
    </span>
  );
}

function SortHeader({
  label,
  field,
  sortField,
  direction,
  onSort,
  numeric = false,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  direction: "asc" | "desc";
  onSort: (field: SortField) => void;
  numeric?: boolean;
}) {
  const active = sortField === field;
  return (
    <th scope="col" className={cn("px-3 py-2 font-medium", numeric && "text-right")}>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onSort(field)}
        className={cn(
          "h-7 gap-1 rounded-sm px-1 text-xs font-medium text-muted-foreground shadow-none hover:text-foreground",
          numeric && "flex-row-reverse",
        )}
        aria-label={`Sort by ${label}${active ? `, currently ${direction}ending` : ""}`}
      >
        {label}
        {active ? (
          direction === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-50" />
        )}
      </Button>
    </th>
  );
}

function TreeNode({
  page,
  pages,
  collapsed,
  onToggle,
  depth = 0,
}: {
  page: SitemapPage;
  pages: SitemapPage[];
  collapsed: Set<string>;
  onToggle: (url: string) => void;
  depth?: number;
}) {
  const children = pages.filter(
    (candidate) => candidate.parentUrl === page.url && candidate.url !== page.url,
  );
  const isCollapsed = collapsed.has(page.url);
  return (
    <div role="none">
      <div
        role="treeitem"
        aria-expanded={children.length ? !isCollapsed : undefined}
        aria-level={depth + 1}
        className="group/tree flex min-h-10 items-center gap-2 border-b border-border/50 px-2 text-xs last:border-b-0 hover:bg-muted/40"
        style={{ paddingLeft: `${8 + depth * 22}px` }}
      >
        {children.length ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggle(page.url)}
            aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${displayPath(page.url, page.url)}`}
            className="size-6 shrink-0 rounded-sm text-muted-foreground shadow-none"
          >
            {isCollapsed ? (
              <ChevronRight className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </Button>
        ) : (
          <span className="size-6 shrink-0" aria-hidden="true" />
        )}
        <StatusBadge status={page.status} />
        <a
          href={page.url}
          target="_blank"
          rel="noreferrer"
          title={page.title}
          className="min-w-0 flex-1 truncate text-foreground decoration-border underline-offset-4 hover:underline"
        >
          {page.title}
        </a>
        <span
          title={`${page.internalLinks.length} internal links`}
          className="flex shrink-0 items-center gap-1 font-mono text-[10px] text-muted-foreground"
        >
          <Link2 className="size-3" />
          {page.internalLinks.length}
        </span>
        <a
          href={page.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-sm p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus:opacity-100 group-hover/tree:opacity-100"
          aria-label={`Open ${displayPath(page.url, page.url)} in a new tab`}
        >
          <ArrowUpRight className="size-3" />
        </a>
      </div>
      {children.length > 0 && !isCollapsed && (
        <div role="group">
          {children.map((child) => (
            <TreeNode
              key={child.url}
              page={child}
              pages={pages}
              collapsed={collapsed}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="px-4 py-5 text-center">
      <p className="text-xs font-medium">{title}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function displayPath(value: string, base: string): string {
  try {
    const url = new URL(value);
    const root = new URL(base).origin;
    return url.origin === root ? `${url.pathname}${url.search}` : `${url.host}${url.pathname}`;
  } catch {
    return value;
  }
}

function formatUtc(value: string): string {
  return (
    new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value)) + " UTC"
  );
}
