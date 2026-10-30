import { DomHighlighter } from "./dom-highlighter";

const REFRESH_INTERVAL = 60_000;

// GitHub only lists a PR under `review-requested:@me` until you submit a
// review, regardless of other reviewers' approvals.
const REVIEW_REQUESTED_QUERY = /(^|\s)(user-)?review-requested:@me(\s|$)/;
const PULLS_PAGE = /^\/(?:[^/]+\/[^/]+\/)?pulls(?:\/|$)/;
const PULL_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+\/?$/;
const PULL_URL = /\\?\/([\w.-]+)\\?\/([\w.-]+)\\?\/pull\\?\/(\d+)/g;

const STORAGE_KEY = "ghmr-requested";
const MAX_PAGES = 10;
const MAX_AGE = 24 * 60 * 60_000;

interface CacheEntry {
  at: number;
  paths: Set<string>;
}

const highlighter = new DomHighlighter();
const cache = loadCache();
const refreshing = new Set<string>();

// Persisted across reloads so known results show before the refresh finishes.
function loadCache(): Map<string, CacheEntry> {
  const entries = new Map<string, CacheEntry>();

  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "{}",
    ) as Record<string, { at: number; paths: string[] }>;

    for (const [listPath, entry] of Object.entries(stored)) {
      if (Date.now() - entry.at < MAX_AGE) {
        entries.set(listPath, { at: entry.at, paths: new Set(entry.paths) });
      }
    }
  } catch {
    // Ignore corrupt or unavailable storage.
  }

  return entries;
}

function saveCache(): void {
  const stored: Record<string, { at: number; paths: string[] }> = {};

  cache.forEach((entry, listPath) => {
    stored[listPath] = { at: entry.at, paths: [...entry.paths] };
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Ignore quota or unavailable storage.
  }
}

function isReviewRequestedPage(): boolean {
  if (location.pathname.startsWith("/pulls/review-requested")) {
    return true;
  }

  const query = new URLSearchParams(location.search).get("q") ?? "";

  return REVIEW_REQUESTED_QUERY.test(query);
}

// Asks GitHub for this list's PRs that need my review, using the logged-in
// session, and returns their paths, or null if the request failed.
async function fetchRequestedPaths(
  listPath: string,
): Promise<Set<string> | null> {
  const query = encodeURIComponent("is:pr is:open review-requested:@me");
  const paths = new Set<string>();

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const response = await fetch(`${listPath}?q=${query}&page=${page}`, {
        headers: { Accept: "text/html" },
      });

      if (!response.ok) {
        return page === 1 ? null : paths;
      }

      const html = await response.text();
      const known = paths.size;

      for (const [, owner, repo, number] of html.matchAll(PULL_URL)) {
        paths.add(`/${owner}/${repo}/pull/${number}`);
      }

      // Past the last page GitHub repeats or returns nothing new.
      if (paths.size === known) {
        break;
      }
    }

    return paths;
  } catch (error) {
    console.error("GitHub My Reviews: Failed to load review requests", error);
    return null;
  }
}

async function refresh(listPath: string): Promise<void> {
  if (refreshing.has(listPath)) {
    return;
  }

  refreshing.add(listPath);

  try {
    const paths = await fetchRequestedPaths(listPath);

    if (paths) {
      cache.set(listPath, { at: Date.now(), paths });
      saveCache();
      applyHighlights(listPath);
    }
  } finally {
    refreshing.delete(listPath);
  }
}

function applyHighlights(listPath: string): void {
  const allRequested = isReviewRequestedPage();
  const requested = cache.get(listPath)?.paths;

  document
    .querySelectorAll<HTMLAnchorElement>('a[href*="/pull/"]')
    .forEach((link) => {
      if (!PULL_PATH.test(link.pathname)) {
        return;
      }

      if (allRequested || requested?.has(link.pathname.replace(/\/$/, ""))) {
        highlighter.highlight(link);
      } else {
        highlighter.clear(link);
      }
    });
}

function scanPage(): void {
  if (!PULLS_PAGE.test(location.pathname)) {
    return;
  }

  const listPath = location.pathname.replace(/\/$/, "");
  const entry = cache.get(listPath);

  applyHighlights(listPath);

  if (
    !isReviewRequestedPage() &&
    (!entry || Date.now() - entry.at >= REFRESH_INTERVAL)
  ) {
    void refresh(listPath);
  }
}

scanPage();

// GitHub navigates and renders list content dynamically.
new MutationObserver(scanPage).observe(document.body, {
  childList: true,
  subtree: true,
});

window.setInterval(scanPage, REFRESH_INTERVAL);
