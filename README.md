# SiteMap Explorer

Build a production-quality web application called BashCraft SiteMap based on the attached specification.

The application is a website sitemap and link analyzer created for a web development recruitment task.

Main Purpose:
The user enters a website URL, clicks Analyze Website, and the application analyzes the website and displays:
- Discovered internal pages
- Internal links
- External links
- Broken or unreachable links
- HTTP status information
- Page titles
- Link counts
- A structured sitemap showing relationships between pages
- Summary statistics
- Export functionality

The primary demonstration website is: https://bashcraftclub.vercel.app/
The UI should allow users to enter other website URLs as well.

Follow all design and functional specifications in the document:
- Clean monochrome Vercel-inspired design (#FFFFFF background, #000000 text, dark gray secondary text, light gray borders, Geist/Inter typography, subtle animations, minimal shadows).
- Landing section with URL input, validation, example URL, and collapsible Crawl Settings (max crawl depth, max pages, timeout).
- Dynamic analysis loading state with multi-step animated progress indicators.
- Results dashboard with website URL, Export JSON button, and Analyze Another Website button.
- 4 summary statistic cards: Pages Discovered, Internal Links, External Links, Broken Links.
- Interactive sitemap tree view with expandable/collapsible nodes, status badges, clickable pages, and link counts.
- Discovered Pages table with search, sorting, and status filtering.
- Broken Links section (with status, error, and "Found On" path, or "✓ No broken links found.").
- External Links section (External URL and Found On).
- Full export to JSON with metadata, summary, pages, relationships, and broken links.
- Pre-loaded realistic demo data for https://bashcraftclub.vercel.app/ so it can be previewed immediately, along with live crawl / analysis capabilities.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d7b2fbfe-2606-4b30-beb5-03e3e9fd54bf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
