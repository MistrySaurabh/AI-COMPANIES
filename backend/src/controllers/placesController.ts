import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { Browser, Page } from 'puppeteer';
import Company from '../models/Company';

// ─── Stealth browser (same setup as scraperController) ───────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const puppeteerExtra = require('puppeteer-extra');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());

const STEALTH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-blink-features=AutomationControlled',
  '--window-size=1366,768',
  '--lang=en-US,en',
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── SSE helper ───────────────────────────────────────────────────────────────

function sendEvent(res: Response, event: string, data: object) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ─── Type map (Google Maps category → readable domain) ───────────────────────

function mapCategoryToDomain(category: string | null): string | null {
  if (!category) return null;
  const lower = category.toLowerCase();
  if (lower.includes('software') || lower.includes('it ') || lower.includes('technology') || lower.includes('tech')) return 'Information Technology';
  if (lower.includes('bank') || lower.includes('financ')) return 'Banking & Finance';
  if (lower.includes('hospital') || lower.includes('clinic') || lower.includes('health') || lower.includes('medical')) return 'Healthcare';
  if (lower.includes('school') || lower.includes('college') || lower.includes('university') || lower.includes('education')) return 'Education';
  if (lower.includes('restaurant') || lower.includes('food') || lower.includes('cafe')) return 'Food & Beverage';
  if (lower.includes('hotel') || lower.includes('resort') || lower.includes('lodge')) return 'Hospitality';
  if (lower.includes('construction') || lower.includes('builder') || lower.includes('contractor')) return 'Construction';
  if (lower.includes('retail') || lower.includes('shop') || lower.includes('store')) return 'Retail';
  if (lower.includes('transport') || lower.includes('logistics') || lower.includes('shipping')) return 'Logistics';
  if (lower.includes('legal') || lower.includes('law ') || lower.includes('attorney') || lower.includes('advocate')) return 'Legal';
  if (lower.includes('real estate') || lower.includes('property') || lower.includes('realty')) return 'Real Estate';
  if (lower.includes('manufactur') || lower.includes('factory') || lower.includes('industry')) return 'Manufacturing';
  if (lower.includes('consult')) return 'Consulting';
  if (lower.includes('insurance')) return 'Insurance';
  if (lower.includes('media') || lower.includes('advertis') || lower.includes('marketing')) return 'Media & Marketing';
  return category; // return as-is if no mapping found
}

// ─── Google Maps scraping sessions ───────────────────────────────────────────

interface MapsSession {
  keyword: string;
  city: string;
  state: string;
  res: Response | null;
  isRunning: boolean;
}

const mapsSessions = new Map<string, MapsSession>();

// ─── Extract place detail from a Google Maps place page ───────────────────────

async function extractPlaceDetail(page: Page): Promise<{
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: string | null;
  category: string | null;
} | null> {
  // Wait for the place name to appear
  await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
  await sleep(1000);

  return page.evaluate(() => {
    const name = document.querySelector('h1')?.textContent?.trim() || '';
    if (!name) return null;

    // Address — data-item-id="address", aria-label starts with "Address:"
    const addrBtn = document.querySelector('button[data-item-id="address"]');
    const address =
      addrBtn?.getAttribute('aria-label')?.replace(/^Address:\s*/i, '').trim() ||
      Array.from(addrBtn?.querySelectorAll('span') || [])
        .map((s) => s.textContent?.trim())
        .filter(Boolean)
        .join(', ') ||
      '';

    // Phone — data-item-id contains "phone"
    const phoneBtn = document.querySelector('button[data-item-id*="phone"]');
    const rawPhone =
      phoneBtn?.getAttribute('aria-label')?.replace(/^Phone:\s*/i, '').trim() ||
      Array.from(phoneBtn?.querySelectorAll('span') || [])
        .find((s) => /^\+?[\d\s\-()+]+$/.test(s.textContent?.trim() || ''))
        ?.textContent?.trim() ||
      null;
    const phone = rawPhone && rawPhone.length > 4 ? rawPhone : null;

    // Website — anchor with data-item-id="authority"
    const websiteAnchor = document.querySelector(
      'a[data-item-id="authority"]'
    ) as HTMLAnchorElement | null;
    const website = websiteAnchor?.href?.trim() || null;

    // Rating
    const ratingEl =
      document.querySelector('span.MW4etd') ||
      document.querySelector('[class*="fontDisplayLarge"]');
    const rating = ratingEl?.textContent?.trim() || null;

    // Category — first button with class DkEaL, or the subtitle span
    const categoryBtn = document.querySelector('button.DkEaL');
    const category =
      categoryBtn?.textContent?.trim() ||
      document.querySelector('[class*="fontBodyMedium"][class*="DkEaL"]')?.textContent?.trim() ||
      null;

    return { name, address, phone, website, rating, category };
  });
}

// ─── Core Google Maps scraper ────────────────────────────────────────────────

async function runMapsSearch(sessionId: string): Promise<void> {
  const session = mapsSessions.get(sessionId);
  if (!session?.res) return;
  const { keyword, city, state, res } = session;

  let browser: Browser | undefined;

  try {
    browser = await puppeteerExtra.launch({
      headless: false, // false = better Google anti-bot bypass (same as Glassdoor scraper)
      args: [...STEALTH_ARGS, '--window-position=0,0'],
    }) as Browser;

    const page = await browser.newPage();

    // Block heavy resources — keep JS since Maps needs it
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.setViewport({ width: 1366, height: 768 });

    // Navigate to Google Maps search
    const query = `${keyword} in ${city} ${state}`;
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    sendEvent(res, 'log', { message: `Navigating to Google Maps…`, type: 'info' });

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Dismiss cookie/consent dialog (EU or signed-in prompts)
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button, [role="button"]'));
      const acceptKeywords = ['accept all', 'accept', 'agree', 'i agree', 'ok', 'got it', 'no thanks'];
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase().trim() || '';
        if (acceptKeywords.some((k) => text === k) && (btn.closest('[role="dialog"]') || btn.closest('form'))) {
          btn.click();
          break;
        }
      }
    }).catch(() => {});

    await sleep(2500);

    // Wait for the results feed to appear
    sendEvent(res, 'log', { message: 'Waiting for results panel…', type: 'info' });
    const feedAppeared = await page.waitForSelector('div[role="feed"]', { timeout: 25000 }).then(() => true).catch(() => false);

    if (!feedAppeared) {
      sendEvent(res, 'error', { message: 'Results panel did not load. Google may have blocked the request or shown a CAPTCHA.' });
      return;
    }

    sendEvent(res, 'log', { message: 'Results panel loaded. Collecting place links…', type: 'success' });

    // ── Scroll the feed until end-of-list, collecting ALL place URLs ──────────
    const placeUrls = new Set<string>();
    let noChangeCycles = 0;

    sendEvent(res, 'log', { message: 'Scrolling results feed to collect all places…', type: 'info' });

    while (noChangeCycles < 20 && session.isRunning) {
      // Scroll to absolute bottom and nudge last item into view to trigger lazy-load
      await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (!feed) return;
        feed.scrollTop = feed.scrollHeight;
        const links = Array.from(feed.querySelectorAll('a[href*="/maps/place/"]'));
        if (links.length > 0) {
          (links[links.length - 1] as HTMLElement).scrollIntoView({ block: 'end' });
        }
      });
      await sleep(2000);

      // Check if "You've reached the end of the list" appears
      const endOfList = await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        return feed?.textContent?.includes("You've reached the end") || false;
      }).catch(() => false);

      // Collect all place links currently visible
      const urls = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLAnchorElement>('div[role="feed"] a[href*="/maps/place/"]')
        ).map((a) => a.href)
      );

      const prev = placeUrls.size;
      urls.forEach((u) => placeUrls.add(u));

      sendEvent(res, 'log', { message: `Collected ${placeUrls.size} place URLs so far…`, type: 'info' });

      if (placeUrls.size === prev) {
        noChangeCycles++;
        // On stall: nudge scroll up then back down to re-trigger lazy load
        if (noChangeCycles % 4 === 0) {
          await page.evaluate(() => {
            const feed = document.querySelector('div[role="feed"]');
            if (feed) feed.scrollTop -= 400;
          });
          await sleep(800);
          await page.evaluate(() => {
            const feed = document.querySelector('div[role="feed"]');
            if (feed) feed.scrollTop = feed.scrollHeight;
          });
          await sleep(1500);
        }
      } else {
        noChangeCycles = 0;
      }

      if (endOfList) {
        sendEvent(res, 'log', { message: 'Reached end of Google Maps results.', type: 'info' });
        break;
      }
    }

    if (placeUrls.size === 0) {
      sendEvent(res, 'error', { message: 'No place links found. The search returned no results.' });
      return;
    }

    const urlList = Array.from(placeUrls);
    sendEvent(res, 'log', {
      message: `Found ${urlList.length} places total. Extracting details…`,
      type: 'success',
    });
    sendEvent(res, 'total', { total: urlList.length });

    // ── Visit each place URL and extract details ──────────────────────────────
    let scraped = 0;

    for (let i = 0; i < urlList.length; i++) {
      if (!session.isRunning) break;

      sendEvent(res, 'progress', { current: i + 1, total: urlList.length });

      try {
        await page.goto(urlList[i], { waitUntil: 'domcontentloaded', timeout: 18000 });
        const detail = await extractPlaceDetail(page);

        if (detail?.name) {
          // ── Skip if company already exists in DB (same name + city) ──────────
          const escapedName = detail.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const escapedCity = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const existing = await Company.findOne({
            companyName: { $regex: new RegExp(`^${escapedName}$`, 'i') },
            city:        { $regex: new RegExp(`^${escapedCity}$`, 'i') },
          }).lean();

          if (existing) {
            sendEvent(res, 'log', { message: `↷ Already in DB — skipped: ${detail.name}`, type: 'warning' });
          } else {
            scraped++;
            const domain = mapCategoryToDomain(detail.category);

            sendEvent(res, 'result', {
              placeId: `gmaps_${i}_${Date.now()}`,
              companyName: detail.name,
              address: detail.address || '',
              website: detail.website || '',
              contactNumber: detail.phone || null,
              city,
              state,
              coreServicesDomain: domain,
              businessStatus: 'OPERATIONAL',
              rating: detail.rating,
              types: [],
              mapsUrl: urlList[i],
            });

            sendEvent(res, 'log', { message: `✓ ${detail.name}`, type: 'success' });
          }
        } else {
          sendEvent(res, 'log', { message: `⚠ Result ${i + 1}: name not found, skipped`, type: 'warning' });
        }
      } catch (err) {
        sendEvent(res, 'log', {
          message: `✗ Result ${i + 1} failed: ${err instanceof Error ? err.message : 'unknown error'}`,
          type: 'error',
        });
      }

      // Polite delay between visits
      if (i < urlList.length - 1) await sleep(1000);
    }

    sendEvent(res, 'complete', { total: urlList.length, scraped });
  } catch (err) {
    sendEvent(res, 'error', {
      message: err instanceof Error ? err.message : 'Scraping failed',
    });
  } finally {
    if (browser) await browser.close().catch(() => {});
    session.isRunning = false;
    res.end();
    setTimeout(() => mapsSessions.delete(sessionId), 60_000);
  }
}

// ─── Email scraping sessions ──────────────────────────────────────────────────

interface EmailScrapeJob {
  sites: Array<{ placeId: string; website: string; companyName: string }>;
  res: Response | null;
  isRunning: boolean;
}

const emailSessions = new Map<string, EmailScrapeJob>();

// ─── Email extraction helpers ─────────────────────────────────────────────────

const EMAIL_REGEX = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;

// Any TLD that is actually a media/code file extension
export const JUNK_TLD = /\.(png|jpg|jpeg|gif|svg|webp|ico|bmp|tiff|pdf|mp4|mp3|avi|mov|css|js|ts|jsx|tsx|woff|woff2|ttf|eot|otf|map|json|xml|zip|gz|tar|rar)$/i;

const JUNK_DOMAINS  = /^(example|yourdomain|domain|email|test|sample|foo|bar|placeholder)\.(com|net|org|io)$/i;
const JUNK_PREFIXES = /^(noreply|no-reply|donotreply|do-not-reply|bounce|mailer-daemon|postmaster|support-noreply)@/i;

/** Extract root domain from a URL, stripping www. and subdomains down to SLD+TLD.
 *  e.g. https://www.careers.techcorp.co.in → techcorp.co.in */
export function rootDomain(urlOrDomain: string): string {
  try {
    const host = new URL(
      urlOrDomain.startsWith('http') ? urlOrDomain : `https://${urlOrDomain}`
    ).hostname.toLowerCase().replace(/^www\./, '');

    // Keep last two labels, but handle ccSLD like .co.in, .com.au, .co.uk
    const parts = host.split('.');
    if (parts.length >= 3) {
      const sld  = parts[parts.length - 2];
      const tld  = parts[parts.length - 1];
      const ccSLDs = ['co', 'com', 'net', 'org', 'gov', 'edu', 'ac'];
      if (ccSLDs.includes(sld) && tld.length === 2) {
        // e.g. techcorp.co.in → take last 3 parts
        return parts.slice(-3).join('.');
      }
    }
    return parts.slice(-2).join('.');
  } catch {
    return urlOrDomain.toLowerCase().replace(/^www\./, '');
  }
}

function extractEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) || [];
  return [
    ...new Set(
      matches
        .map((e) => e.toLowerCase())
        .filter((e) => {
          const [local, domain] = e.split('@');
          if (!domain) return false;
          // Reject if TLD is a file extension (catches logo@2x.png, img@site.webp, etc.)
          if (JUNK_TLD.test(domain)) return false;
          // Reject if local part itself ends in a file extension (image.png@...)
          if (JUNK_TLD.test(local)) return false;
          // Reject junk placeholder domains
          if (JUNK_DOMAINS.test(domain)) return false;
          // Reject bot/system prefixes
          if (JUNK_PREFIXES.test(e)) return false;
          // Local part must be at least 2 chars
          if (local.length < 2) return false;
          // Domain must contain at least one dot and have some alphabetic TLD
          if (!/\.[a-z]{2,}$/.test(domain)) return false;
          return true;
        })
    ),
  ].slice(0, 20);
}

// ─── Extract address from a company website ───────────────────────────────────

async function extractAddressFromPage(page: import('puppeteer').Page): Promise<string | null> {
  return page.evaluate(() => {
    // 1. Try LD+JSON structured data (most reliable)
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (const s of scripts) {
      try {
        const raw = JSON.parse(s.textContent || '');
        const items: Record<string, unknown>[] = Array.isArray(raw) ? raw : [raw];
        for (const item of items) {
          const addr = item['address'] as Record<string, string> | string | undefined;
          if (!addr) continue;
          if (typeof addr === 'string' && addr.trim()) return addr.trim();
          if (typeof addr === 'object') {
            const parts = [
              addr['streetAddress'],
              addr['addressLocality'],
              addr['addressRegion'],
              addr['postalCode'],
              addr['addressCountry'],
            ].filter(Boolean);
            if (parts.length) return parts.join(', ');
          }
        }
      } catch { /* skip malformed JSON */ }
    }

    // 2. Try <address> HTML element
    const addrEl = document.querySelector('address');
    const addrText = addrEl?.innerText?.trim().replace(/\s+/g, ' ');
    if (addrText && addrText.length > 5) return addrText;

    // 3. Try common class/id patterns
    const selectors = [
      '[class*="address"]', '[id*="address"]',
      '[class*="location"]', '[id*="location"]',
      '[itemprop="address"]', '[itemprop="streetAddress"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLElement | null;
      const txt = el?.innerText?.trim().replace(/\s+/g, ' ');
      if (txt && txt.length > 5 && txt.length < 200) return txt;
    }

    return null;
  }).catch(() => null);
}

async function scrapeEmailsFromSite(
  browser: Browser,
  website: string
): Promise<{ emails: string[]; address: string | null }> {
  const page = await browser.newPage();
  const allEmails: string[] = [];
  let foundAddress: string | null = null;

  try {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'font', 'media', 'stylesheet'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    page.setDefaultNavigationTimeout(15000);

    const normalizedUrl = website.startsWith('http') ? website : `https://${website}`;
    let baseOrigin: string;
    try {
      baseOrigin = new URL(normalizedUrl).origin;
    } catch {
      return { emails: [], address: null };
    }

    await page.goto(normalizedUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
    const homeContent = await page.content().catch(() => '');
    allEmails.push(...extractEmails(homeContent));

    // Try to get address from homepage
    if (!foundAddress) {
      foundAddress = await extractAddressFromPage(page);
    }

    // Find contact/about/career sub-pages on same domain
    const subLinks = await page
      .evaluate((origin: string) => {
        const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
        const keywords = /contact|about|career|team|jobs|hiring|reach|people|write-to/i;
        const seen = new Set<string>();
        const links: string[] = [];
        for (const a of anchors) {
          try {
            const url = new URL(a.href);
            if (
              url.origin === origin &&
              keywords.test(url.pathname + a.textContent) &&
              !seen.has(url.href)
            ) {
              seen.add(url.href);
              links.push(url.href);
              if (links.length >= 4) break;
            }
          } catch { /* skip */ }
        }
        return links;
      }, baseOrigin)
      .catch(() => [] as string[]);

    for (const link of subLinks.slice(0, 3)) {
      await page.goto(link, { waitUntil: 'domcontentloaded' }).catch(() => {});
      const content = await page.content().catch(() => '');
      allEmails.push(...extractEmails(content));
      // Also try to pick up address from contact page if not found yet
      if (!foundAddress) {
        foundAddress = await extractAddressFromPage(page);
      }
    }

    // ── Keep only emails whose domain matches the website's root domain ──────
    const siteDomain = rootDomain(normalizedUrl);
    const domainFiltered = [...new Set(allEmails)].filter((email) => {
      const emailDomain = email.split('@')[1] || '';
      const emailRoot   = rootDomain(emailDomain);
      return emailRoot === siteDomain;
    }).slice(0, 15);

    return { emails: domainFiltered, address: foundAddress };
  } finally {
    await page.close().catch(() => {});
  }
}

async function runEmailScrape(sessionId: string): Promise<void> {
  const session = emailSessions.get(sessionId);
  if (!session || !session.res) return;
  const { sites, res } = session;
  let browser: Browser | undefined;

  try {
    browser = await puppeteerExtra.launch({
      headless: true,
      args: STEALTH_ARGS,
    }) as Browser;

    for (let i = 0; i < sites.length; i++) {
      if (!session.isRunning) break;

      const site = sites[i];
      sendEvent(res, 'progress', {
        placeId: site.placeId,
        companyName: site.companyName,
        status: 'scraping',
        current: i + 1,
        total: sites.length,
      });

      try {
        const { emails, address } = await scrapeEmailsFromSite(browser, site.website);
        sendEvent(res, 'result', {
          placeId: site.placeId,
          companyName: site.companyName,
          emails,
          address,
          current: i + 1,
          total: sites.length,
        });
      } catch {
        sendEvent(res, 'result', {
          placeId: site.placeId,
          companyName: site.companyName,
          emails: [],
          address: null,
          error: 'Failed to scrape website',
          current: i + 1,
          total: sites.length,
        });
      }
    }

    sendEvent(res, 'complete', { total: sites.length });
  } catch (err) {
    sendEvent(res, 'error', { message: err instanceof Error ? err.message : 'Unknown error' });
  } finally {
    if (browser) await browser.close().catch(() => {});
    session.isRunning = false;
    res.end();
    setTimeout(() => emailSessions.delete(sessionId), 60_000);
  }
}

// ─── Route handlers ───────────────────────────────────────────────────────────

// POST /api/places/search/start
export async function startMapsSearch(req: Request, res: Response): Promise<void> {
  const { keyword, city, state } = req.body as {
    keyword: string; city: string; state: string;
  };

  if (!keyword || !city || !state) {
    res.status(400).json({ message: 'keyword, city, and state are required' });
    return;
  }

  const sessionId = randomUUID();
  mapsSessions.set(sessionId, { keyword, city, state, res: null, isRunning: false });
  res.json({ sessionId });
}

// GET /api/places/search-stream/:sessionId
export async function streamMapsSearch(req: Request, res: Response): Promise<void> {
  const { sessionId } = req.params;
  const session = mapsSessions.get(sessionId);

  if (!session) {
    res.status(404).json({ message: 'Session not found' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  session.res = res;
  session.isRunning = true;

  sendEvent(res, 'connected', { message: 'Connected — launching browser…' });

  runMapsSearch(sessionId).catch((err) => {
    console.error('runMapsSearch error:', err);
  });
}

// POST /api/places/search/stop
export async function stopMapsSearch(req: Request, res: Response): Promise<void> {
  const { sessionId } = req.body as { sessionId: string };
  const session = mapsSessions.get(sessionId);
  if (session) session.isRunning = false;
  res.json({ message: 'Stop signal sent' });
}

// POST /api/places/scrape-emails/start
export async function startEmailScrape(req: Request, res: Response): Promise<void> {
  const { sites } = req.body as {
    sites: Array<{ placeId: string; website: string; companyName: string }>;
  };

  if (!Array.isArray(sites) || sites.length === 0) {
    res.status(400).json({ message: 'No sites provided' });
    return;
  }

  const sessionId = randomUUID();
  emailSessions.set(sessionId, { sites, res: null, isRunning: false });
  res.json({ sessionId });
}

// GET /api/places/scrape-stream/:sessionId
export async function streamEmailScrape(req: Request, res: Response): Promise<void> {
  const { sessionId } = req.params;
  const session = emailSessions.get(sessionId);

  if (!session) {
    res.status(404).json({ message: 'Session not found' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  session.res = res;
  session.isRunning = true;
  sendEvent(res, 'connected', { message: 'Connected — starting email scrape…' });

  runEmailScrape(sessionId).catch((err) => console.error('runEmailScrape error:', err));
}

// POST /api/places/scrape-emails/stop
export async function stopEmailScrape(req: Request, res: Response): Promise<void> {
  const { sessionId } = req.body as { sessionId: string };
  const session = emailSessions.get(sessionId);
  if (session) session.isRunning = false;
  res.json({ message: 'Stop signal sent' });
}

// POST /api/places/save
export async function savePlaces(req: Request, res: Response): Promise<void> {
  try {
    const { places } = req.body as {
      places: Array<{
        placeId: string;
        companyName: string;
        address?: string;
        scrapedAddress?: string; // address found during email scraping
        website: string;
        contactNumber: string | null;
        city: string;
        state: string;
        coreServicesDomain: string | null;
        emails: string[];
      }>;
    };

    if (!Array.isArray(places) || places.length === 0) {
      res.status(400).json({ message: 'No places provided' });
      return;
    }

    const HR_KEYWORDS = /\b(hr|career|recruit|talent|hiring|people|jobs)\b/i;
    let saved = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const place of places) {
      try {
        const emails = place.emails || [];
        const hasEmails = emails.length > 0;
        const hrEmail = hasEmails ? (emails.find((e) => HR_KEYWORDS.test(e.split('@')[0])) || null) : null;
        const mainEmail = hasEmails ? (emails.find((e) => e !== hrEmail) || emails[0] || null) : null;

        // Best available address: scraped from website > from Google Maps > empty string
        const bestAddress = place.scrapedAddress || place.address || '';

        const existing = await Company.findOne({
          companyName: {
            $regex: new RegExp(
              `^${place.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
              'i'
            ),
          },
          city: {
            $regex: new RegExp(
              `^${place.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
              'i'
            ),
          },
        });

        if (existing) {
          const updateFields: Record<string, unknown> = {
            // Update address only if we found a better one and existing is empty
            address: (bestAddress && !existing.address) ? bestAddress : existing.address,
            website: place.website || existing.website,
            contactNumber: place.contactNumber || existing.contactNumber,
            coreServicesDomain: place.coreServicesDomain || existing.coreServicesDomain,
            city: place.city || existing.city,
            state: place.state || existing.state,
          };
          // Only set email fields if emails were actually found
          if (hrEmail && !existing.hrEmail) updateFields.hrEmail = hrEmail;
          if (mainEmail && !existing.email) updateFields.email = mainEmail;

          await Company.updateOne({ _id: existing._id }, { $set: updateFields });
          updated++;
          continue;
        }

        await Company.create({
          companyName: place.companyName,
          address: bestAddress,
          website: place.website || '',
          contactNumber: place.contactNumber || null,
          contactNumber2: null,
          city: place.city,
          state: place.state,
          coreServicesDomain: place.coreServicesDomain || null,
          hrEmail: hrEmail || null,
          email: mainEmail || null,
          cityId: null,
          stateId: null,
          isActive: true,
        });
        saved++;
      } catch (e) {
        errors.push(
          `${place.companyName}: ${e instanceof Error ? e.message : 'unknown error'}`
        );
      }
    }

    res.json({ saved, updated, errors });
  } catch (err) {
    console.error('savePlaces error:', err);
    res.status(500).json({ message: 'Failed to save places' });
  }
}
