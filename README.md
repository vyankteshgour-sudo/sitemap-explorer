# BashCraft SiteMap

A full-stack website sitemap and link analyzer built for the **BashCraft Web Development Recruitment Task**.

BashCraft SiteMap allows users to enter a publicly accessible website URL and analyze its structure. The application discovers internal pages, identifies internal and external links, detects broken or unreachable pages, collects HTTP status information, and generates a structured sitemap.

## Features

- Website URL input with validation and clear error handling
- Internal page discovery
- URL normalization and duplicate handling
- Internal and external link classification
- Broken and unreachable link detection
- HTTP status information
- Page titles and link counts
- Structured interactive sitemap
- Expandable and collapsible sitemap nodes
- Search, sorting, and filtering for discovered pages
- Crawl settings for maximum depth, maximum pages, and request timeout
- Summary statistics
- JSON export
- Preloaded demo data for the BashCraft website
- Live website crawling and analysis

---

## Primary Demonstration Website

The primary website used for demonstration and testing is:

**https://bashcraftclub.vercel.app/**

The application also allows users to analyze other publicly accessible websites.

---

## Tech Stack

- **React**
- **TypeScript**
- **TanStack Start**
- **TanStack Router**
- **TanStack React Query**
- **Vite**
- **Tailwind CSS**
- **Zod**

---

# Architecture

The application uses a full-stack TanStack Start architecture.

```text
┌─────────────────────────────┐
│         User Interface       │
│       React + TypeScript     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│     TanStack Server Function │
│       analyzeWebsite()      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│        Website Crawler       │
│                             │
│  • Fetch pages              │
│  • Extract links            │
│  • Follow internal links    │
│  • Check HTTP status        │
│  • Detect failures          │
└──────────────┬──────────────┘
               │
               ▼
        Target Website
```

The frontend collects the website URL and crawl settings. The analysis is performed through a TanStack Start server function, allowing website requests to be made from the server instead of directly from the browser.

---

# Project Structure

```text
src/
├── routes/
│   ├── __root.tsx
│   └── index.tsx
│
├── lib/
│   ├── site-map.ts
│   ├── site-map.functions.ts
│   ├── site-map-demo.ts
│   └── site-map.test.ts
│
├── server.ts
└── start.ts
```

### Important Files

- `src/routes/index.tsx` — Main user interface and results dashboard
- `src/lib/site-map.functions.ts` — Server-side crawling and analysis logic
- `src/lib/site-map.ts` — Types, URL utilities, and crawl configuration
- `src/lib/site-map-demo.ts` — Preloaded demonstration data
- `src/server.ts` — Server request handling
- `src/start.ts` — Application middleware and server configuration

---

# Crawling Approach

The crawler starts from the URL provided by the user and performs the following process:

1. Validates and normalizes the starting URL.
2. Fetches the webpage from the server.
3. Reads the returned HTML.
4. Extracts standard anchor (`<a href="">`) links.
5. Classifies links as internal or external.
6. Adds newly discovered internal pages to the crawl queue.
7. Prevents already discovered pages from being repeatedly analyzed.
8. Records page titles, HTTP status information, and discovered links.
9. Continues until the configured crawl depth, page limit, or analysis time limit is reached.

External websites are identified and reported but are **not recursively crawled**.

---

# URL Normalization and Duplicate Handling

URLs are normalized before crawling to ensure valid and consistent URLs are processed.

The crawler tracks discovered and queued URLs to prevent the same internal page from being repeatedly analyzed. Common internal host variations are also handled so that internal pages can be consistently classified.

This helps prevent unnecessary duplicate requests and reduces the risk of crawling loops.

---

# Internal and External Links

Every discovered link is classified based on its hostname.

### Internal Links

Links belonging to the analyzed website are treated as internal links and may be added to the crawl queue.

### External Links

Links pointing to another website are recorded separately.

External websites are **not recursively crawled**, preventing the analysis from expanding beyond the target website.

---

# Broken-Link Detection

Each discovered internal page is checked through an HTTP request.

A page may be reported as problematic when it:

- Returns an HTTP error status such as `404` or `500`
- Cannot be reached
- Times out
- Encounters an unexpected request failure

Where available, the application displays the HTTP status or failure reason.

---

# Crawl Controls and Safety Limits

The application includes configurable crawl controls:

- **Maximum crawl depth**
- **Maximum number of pages**
- **Per-request timeout**

Additional safety limits are used internally, including:

- Maximum concurrent requests
- Maximum redirect count
- Overall analysis time limit

These limits help prevent excessive resource usage and reduce the risk of infinite crawling loops.

---

# Results Dashboard

After an analysis is completed, the application displays:

### Summary Statistics

- Pages Discovered
- Internal Links
- External Links
- Broken Links

### Interactive Sitemap

The sitemap displays discovered pages and their relationships using a structured tree view.

### Discovered Pages

Users can:

- Search pages
- Sort results
- Filter by status
- View page titles
- View URLs
- View HTTP status information
- View link counts

### Broken Links

Broken or unreachable internal pages are displayed with:

- URL
- HTTP status or error reason
- The page where the problematic link was found

### External Links

External URLs are listed along with the internal page where each link was discovered.

---

# Export

The complete analysis can be exported as JSON.

The exported data includes:

- Website URL
- Analysis timestamp
- Summary statistics
- Discovered pages
- Sitemap relationships
- Broken links
- External links

---

# Installation

## Prerequisites

You need:

- Node.js
- npm

## Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd <YOUR_REPOSITORY_NAME>
```

## Install Dependencies

```bash
npm install
```

## Run the Development Server

```bash
npm run dev
```

Open the local development URL displayed in your terminal.

---

# Usage

1. Open the application.
2. Enter a publicly accessible website URL.
3. Optionally configure:
   - Maximum crawl depth
   - Maximum pages
   - Request timeout
4. Click **Analyze Website**.
5. Wait for the analysis to complete.
6. Review the sitemap and analysis results.
7. Search or filter discovered pages if required.
8. Review broken links and external links.
9. Use **Export JSON** to download the analysis results.

---

# Testing

## Test 1 — BashCraft Website Analysis

**Website:**

```text
https://bashcraftclub.vercel.app/
```

**Expected Result:**

The application should:

- Discover connected internal pages
- Identify internal and external links
- Display HTTP status information
- Generate a structured sitemap
- Detect broken or unreachable internal pages where applicable
- Display summary statistics

**Actual Result:**

><img width="1307" height="798" alt="image" src="https://github.com/user-attachments/assets/811b2e92-6fce-42fe-b6fb-ed22f70de47b" />


Example:

```text
Successfully analyzed the BashCraft website and displayed the discovered pages,
links, sitemap structure, HTTP status information, and summary statistics.
```

---

## Test 2 — Invalid URL

**Expected Result:**

The application should reject invalid URLs and display a clear validation error.

**Actual Result:**

> Enter a public website address using http:// or https://.

---

## Test 3 — Crawl Limits

**Expected Result:**

The crawler should stop when the configured maximum depth, maximum page count, or analysis time limit is reached.

**Actual Result:**

>Expected behavior based on implementation the crawler successfully respects the configured crawl limits. When the maximum page count or crawl depth is reached, it stops discovering additional pages. For larger websites, the overall analysis time limit may stop the crawl early and the application returns a partial crawl notice indicating that the crawl limit was reached..

---

## Test 4 — Broken or Unreachable Page

**Expected Result:**

The application should display an error status or failure reason for pages that cannot be successfully reached.

**Actual Result:**

>Expected behavior based on implementation the crawler detects pages that return HTTP error responses such as 404 or 500 and adds them to the Broken Links section. Pages that cannot be reached or that time out are also reported with an appropriate error message, such as Could not be reached or Timed out.

---

# Known Limitations

- The crawler discovers links available in the HTML returned by the server. Links generated only after JavaScript executes may not be discovered.
- Some websites may block automated requests, rate-limit crawlers, or require authentication.
- Crawls are limited by maximum depth, maximum pages, per-request timeout, and an overall analysis time limit to prevent excessive resource usage.
- Redirects are followed only up to a fixed limit.
- HTML link extraction is designed for standard anchor links and may not handle every unusual HTML structure or dynamically generated navigation pattern.
- External links are listed but are not recursively crawled as part of the website analysis.
- Very large websites may produce a partial crawl when configured safety limits are reached.

---

# Important Design Decisions

## Server-Side Crawling

The crawling logic runs through a TanStack Start server function.

This avoids many browser-side restrictions, including CORS limitations, that would make direct client-side website crawling unreliable.

## Crawl Limits

The application uses page limits, crawl depth limits, request timeouts, redirect limits, concurrency limits, and an overall analysis timeout to avoid excessive resource usage.

## External Link Handling

External links are collected for reporting purposes but are not recursively crawled. This keeps the analysis focused on the target website.

## Demo Data

The application includes preloaded demonstration data so that the user interface can be previewed immediately before running a live analysis.

---

# Security

No passwords, API keys, tokens, or other secrets are required or committed to the repository.

---

# AI Tools and External Resources

AI-assisted development tools and external documentation were used during development.

The implementation, architecture, and technical decisions have been reviewed and understood, and the submitted code can be explained, debugged, modified, or extended as required during evaluation.

---

