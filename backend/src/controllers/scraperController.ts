import { Request, Response } from 'express';
import puppeteer, { Browser, Page } from 'puppeteer';
import ScrapedCompany from '../models/ScrapedCompany';
import Company from '../models/Company';
import City from '../models/City';

// ─── Stealth browser for Cloudflare-protected sites (Glassdoor) ──────────────

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

async function launchStealthBrowser(): Promise<Browser> {
  // headless:false is required for Glassdoor — Cloudflare's bot detection
  // reliably blocks headless Chrome regardless of stealth patches.
  // A visible Chrome window will appear briefly during scraping (Mac only).
  return puppeteerExtra.launch({
    headless: false,
    args: [
      ...STEALTH_ARGS,
      '--window-position=0,0',
      '--window-size=1366,768',
    ],
  }) as Promise<Browser>;
}

/** Poll until Cloudflare "Just a moment..." challenge passes or timeout. */
async function waitForCloudflare(page: Page, maxMs = 45000): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const title = await page.title().catch(() => '');
    if (!title.toLowerCase().includes('just a moment')) return;
    await sleep(2500);
  }
}

// ─── Session tracking for SSE ────────────────────────────────────────────────

interface ScrapeSession {
  res: Response;
  isRunning: boolean;
  stats: ScrapeStats;
}

interface ScrapeStats {
  pagesScraped: number;
  companiesFound: number;
  companiesSaved: number;
  companiesSkipped: number;
  errors: number;
  currentPage?: number;
}

const activeSessions = new Map<string, ScrapeSession>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const randomDelay = (min: number, max: number) =>
  sleep(Math.floor(Math.random() * (max - min + 1)) + min);

function detectSource(url: string): string {
  if (url.includes('naukri.com')) {
    // Job-search URLs (keyword + location search, job-listings paths)
    if (
      /naukri\.com\/[a-z0-9-]+-jobs(-in-[a-z0-9-]+)?(\?|$)/.test(url) ||
      url.includes('/jobs-in-') ||
      url.includes('/job-listings-') ||
      (url.includes('naukri.com') && (url.includes('&k=') || url.includes('?k=')))
    ) {
      return 'naukri-jobs';
    }
    return 'naukri';
  }
  if (url.includes('hirist')) return 'hirist';
  if (url.includes('glassdoor')) return 'glassdoor';
  return 'other';
}

function getPageUrl(baseUrl: string, pageNo: number): string {
  // Glassdoor uses &page=N or ?page=N
  if (/[?&]page=\d+/.test(baseUrl)) {
    return baseUrl.replace(/([?&]page=)\d+/, `$1${pageNo}`);
  }
  // Naukri uses pageNo=N
  if (/pageNo=\d+/.test(baseUrl)) {
    return baseUrl.replace(/pageNo=\d+/, `pageNo=${pageNo}`);
  }
  return `${baseUrl}&pageNo=${pageNo}`;
}

function getStartPage(url: string): number {
  // Glassdoor
  const m1 = url.match(/[?&]page=(\d+)/);
  if (m1) return parseInt(m1[1]);
  // Naukri
  const m2 = url.match(/pageNo=(\d+)/);
  return m2 ? parseInt(m2[1]) : 1;
}

async function sendSSE(sessionId: string, event: string, data: unknown) {
  const session = activeSessions.get(sessionId);
  if (session && !session.res.writableEnded) {
    session.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

// ─── Naukri: listing page ─────────────────────────────────────────────────────

interface CompanyCard {
  name: string;
  profileUrl: string;
  industry: string;
  size: string;
  rating: string;
  reviews: string;
  jobs: string;
}

async function scrapeNaukriListing(page: Page, url: string): Promise<CompanyCard[]> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await randomDelay(2500, 4500);

  for (const y of [300, 600, 900]) {
    await page.evaluate((sy: number) => window.scrollTo(0, sy), y);
    await randomDelay(400, 800);
  }

  const cards = await page.evaluate((): CompanyCard[] => {
    const results: CompanyCard[] = [];

    const cardSelectors = [
      'article.companyCardWrapper',
      'li.companyCardWrapper',
      '.company-card',
      '.comp-wrapper',
      'article[class*="company"]',
      'li[class*="company"]',
    ];

    let cardEls: Element[] = [];
    for (const sel of cardSelectors) {
      const found = Array.from(document.querySelectorAll(sel));
      if (found.length > 0) { cardEls = found; break; }
    }

    // Fallback: collect all links pointing to overview pages
    if (cardEls.length === 0) {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="overview"]'));
      return links
        .filter((a) => a.href.includes('naukri.com') && a.textContent?.trim())
        .map((a) => ({
          name: a.textContent?.trim() || '',
          profileUrl: a.href,
          industry: '',
          size: '',
          rating: '',
          reviews: '',
          jobs: '',
        }));
    }

    const gt = (el: Element, sel: string) => (el.querySelector(sel)?.textContent || '').trim();

    cardEls.forEach((card) => {
      const link = card.querySelector<HTMLAnchorElement>(
        'a[href*="overview"], a[href*="-overview-"], a.title, a.comp-name'
      );
      if (!link) return;

      results.push({
        name: gt(card, 'a.title, a.comp-name, .title, h2 a, h3 a') || link.textContent?.trim() || '',
        profileUrl: link.href,
        industry: gt(card, '.industry, .comp-industry, [class*="industry"]'),
        size: gt(card, '.emp-count, .comp-employee, [class*="employ"]'),
        rating: gt(card, '.rating, [class*="rating"] span'),
        reviews: gt(card, '.reviews, [class*="review"]'),
        jobs: gt(card, '.jobs, [class*="jobs"], .active-jobs'),
      });
    });

    return results.filter((c) => c.name && c.profileUrl);
  });

  return cards;
}

// ─── Naukri: overview detail page ────────────────────────────────────────────

interface NaukriDetail {
  companyName: string;
  website: string;
  description: string;
  industry: string;
  companySize: string;
  headquarters: string;
  foundedYear: string;
  companyType: string;
  rating: string;
  totalReviews: string;
  activeJobs: string;
  logo: string;
  socialLinks: Record<string, string>;
  emails: string[];
  contactNumbers: string[];
}

async function scrapeNaukriDetail(page: Page, profileUrl: string): Promise<NaukriDetail> {
  // Strip query params — load the clean overview page
  const cleanUrl = profileUrl.split('?')[0];

  await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

  // Wait for main content
  await page.waitForSelector('h1, [class*="companyName"], [class*="comp-name"]', { timeout: 12000 })
    .catch(() => {});

  await randomDelay(2000, 3500);

  // Scroll to trigger lazy-loaded sections
  for (const y of [0, 400, 800, 1200, 800, 400]) {
    await page.evaluate((sy: number) => window.scrollTo(0, sy), y);
    await randomDelay(350, 700);
  }

  const detail = await page.evaluate((): NaukriDetail => {

    // ── Utilities ──────────────────────────────────────────────────────────

    const getText = (...selectors: string[]): string => {
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          const t = el?.textContent?.trim();
          if (t) return t;
        } catch { /* ignore invalid selectors */ }
      }
      return '';
    };

    const queryAll = <T extends Element>(sel: string): T[] => {
      try { return Array.from(document.querySelectorAll<T>(sel)); }
      catch { return []; }
    };

    // ── Company Name ───────────────────────────────────────────────────────

    const companyName = getText(
      'h1',
      '[class*="compName"]', '[class*="comp-name"]',
      '[class*="companyName"]', '[class*="company-name"]',
      '[class*="orgName"]',
    );

    // ── Logo ───────────────────────────────────────────────────────────────
    // Must NOT pick up Naukri's own site logo (in <nav> / site header).
    // Strategy: look inside the company-profile content section only,
    // and reject any image whose src contains naukri's own static domains.

    const NAUKRI_IMG_DOMAINS = [
      'naukri.com', 'naukri.com', 'naukcdn.com', 'iimjobs.com',
    ];
    const isNaukriImg = (src: string) =>
      NAUKRI_IMG_DOMAINS.some(d => src.toLowerCase().includes(d));

    let logo = '';

    // 1. Company-profile-specific containers (most reliable)
    const profileContainerSels = [
      '[class*="companyDetail"]',
      '[class*="company-detail"]',
      '[class*="compProfile"]',
      '[class*="comp-profile"]',
      '[class*="orgDetail"]',
      '[class*="compHeader"]',
      '[class*="comp-header"]',
      'main',
      '#main',
    ];
    for (const contSel of profileContainerSels) {
      const container = document.querySelector(contSel);
      if (!container) continue;
      const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img'));
      for (const img of imgs) {
        const src = img.src || img.getAttribute('data-src') || '';
        if (src && !src.startsWith('data:') && !isNaukriImg(src) &&
            (img.width > 30 || img.naturalWidth > 30 || !img.width)) {
          logo = src;
          break;
        }
      }
      if (logo) break;
    }

    // 2. Fallback: any img with logo-related class that isn't inside nav/header
    if (!logo) {
      const navEl = document.querySelector('nav, [class*="navbar"], [class*="topBar"], [class*="header-nav"]');
      queryAll<HTMLImageElement>('img[class*="logo"], img[class*="Logo"], [class*="Logo"] img, [class*="logo"] img').forEach(img => {
        if (logo) return;
        if (navEl && navEl.contains(img)) return; // skip nav logos
        const src = img.src || img.getAttribute('data-src') || '';
        if (src && !src.startsWith('data:') && !isNaukriImg(src)) logo = src;
      });
    }

    // ── Rating ─────────────────────────────────────────────────────────────

    let rating = '';
    queryAll<Element>('[class*="rating"], [class*="Rating"], [class*="ambitionBox"], [class*="ambitionbox"]').forEach(el => {
      if (rating) return;
      // Look for a child or self text that is a decimal number ≤ 5
      const text = el.textContent?.trim() || '';
      const match = text.match(/\b([0-4]\.\d|5\.0|[1-5])\b/);
      if (match) rating = match[1];
    });

    // ── Total Reviews ──────────────────────────────────────────────────────

    let totalReviews = '';
    queryAll<Element>('[class*="review"], [class*="Review"]').forEach(el => {
      if (totalReviews) return;
      const text = el.textContent?.trim() || '';
      const match = text.match(/[\d,]+\s*(reviews?|ratings?)/i);
      if (match) totalReviews = text;
    });

    // ── Active Jobs ────────────────────────────────────────────────────────

    let activeJobs = '';
    queryAll<Element>('[class*="job"], [class*="Job"], [class*="opening"], [class*="vacanci"]').forEach(el => {
      if (activeJobs) return;
      const text = el.textContent?.trim() || '';
      if (/\d/.test(text) && text.length < 60 && /(job|opening|position|vacanci)/i.test(text)) {
        activeJobs = text;
      }
    });

    // ── Description / About ────────────────────────────────────────────────

    let description = '';

    // Strategy 1: look in about / description sections
    const descSelectors = [
      '[class*="aboutUs"] p', '[class*="about-us"] p',
      '[class*="aboutCompany"] p', '[class*="about-company"] p',
      '[class*="companyAbout"] p', '[class*="company-about"] p',
      '[class*="description"] p', '[class*="Description"] p',
      '[class*="overview"] p', '[class*="Overview"] p',
      '#about p', '[id*="about"] p',
      'section[class*="about"] p',
    ];
    for (const sel of descSelectors) {
      const paras = queryAll<Element>(sel);
      if (paras.length > 0) {
        const joined = paras.map(p => p.textContent?.trim()).filter(Boolean).join(' ');
        if (joined.length > 80) { description = joined; break; }
      }
    }

    // Strategy 2: largest single text block on page
    if (!description) {
      let maxLen = 0;
      queryAll<Element>('p, [class*="description"], [class*="about"], [class*="content"]').forEach(el => {
        const t = el.textContent?.trim() || '';
        if (t.length > maxLen && t.length > 100 && t.length < 5000) {
          maxLen = t.length;
          description = t;
        }
      });
    }

    // ── Website ────────────────────────────────────────────────────────────

    const skipDomains = ['naukri.com', 'naukritalentcloud.com', 'naukrigulf.com', 'infoedge.in', 'infoedge.com',
      '99acres.com', 'jeevansathi.com', 'shiksha.com', 'firstnaukri.com',
      'google.', 'apple.com', 'facebook.', 'linkedin.', 'twitter.', 'instagram.', 'youtube.',
      'ambitionbox.', 'glassdoor.', 'iimjobs.com', 'hirist.com', 'hirist.tech', 'jobhai.com'];

    const isExternal = (href: string) =>
      /^https?:\/\//.test(href) && skipDomains.every(d => !href.includes(d));

    // Prefer links explicitly labeled as website
    let website = '';
    queryAll<HTMLAnchorElement>('a[href]').forEach(a => {
      if (website) return;
      const href = a.href || '';
      const label = (a.textContent + ' ' + (a.title || '') + ' ' + (a.getAttribute('aria-label') || '')).toLowerCase();
      if (isExternal(href) && (label.includes('website') || label.includes('visit') || label.includes('www') || label.includes('site'))) {
        website = href;
      }
    });
    // Fallback: first external link
    if (!website) {
      queryAll<HTMLAnchorElement>('a[href]').forEach(a => {
        if (website) return;
        if (isExternal(a.href)) website = a.href;
      });
    }

    // ── Social Links ───────────────────────────────────────────────────────

    const socialLinks: Record<string, string> = {};
    const socialMap: Record<string, string> = {
      linkedin: 'linkedin', twitter: 'twitter', facebook: 'facebook',
      instagram: 'instagram', youtube: 'youtube',
    };
    queryAll<HTMLAnchorElement>('a[href]').forEach(a => {
      const href = a.href || '';
      for (const [key, domain] of Object.entries(socialMap)) {
        if (!socialLinks[key] && href.includes(domain + '.com')) {
          socialLinks[key] = href;
        }
      }
    });

    // ── Info Section (Industry, Size, HQ, Founded, Type) ──────────────────
    //
    // Naukri renders these as a list of labeled entities in the right column.
    // We try 4 strategies to build a label→value map.

    const infoMap: Record<string, string> = {};

    const setInfo = (rawKey: string, value: string) => {
      const key = rawKey.toLowerCase().replace(/[^a-z ]/g, '').trim();
      if (key && value && value.length < 200 && !infoMap[key]) infoMap[key] = value;
    };

    // Strategy A: children[0]=label, children[1]=value pattern
    queryAll<Element>(
      '[class*="info"] li, [class*="Info"] li, [class*="entity"], [class*="Entity"], ' +
      '[class*="keyFacts"] li, [class*="key-facts"] li, [class*="compInfo"] div, [class*="comp-info"] li'
    ).forEach(el => {
      const ch = Array.from(el.children);
      if (ch.length >= 2) {
        setInfo(ch[0].textContent || '', ch[1].textContent || '');
      }
    });

    // Strategy B: <dt>/<dd> pairs
    queryAll<HTMLElement>('dt').forEach(dt => {
      const dd = dt.nextElementSibling;
      if (dd?.tagName === 'DD') setInfo(dt.textContent || '', dd.textContent || '');
    });

    // Strategy C: "Label\nValue" pattern in structured divs
    queryAll<Element>(
      '[class*="infoEntity"], [class*="info-entity"], [class*="CompanyDetails"], ' +
      '[class*="company-details"], [class*="orgInfo"], [class*="org-info"]'
    ).forEach(el => {
      const spans = queryAll<Element>('span, p').filter(s => el.contains(s) && s.children.length === 0);
      for (let i = 0; i + 1 < spans.length; i++) {
        const k = spans[i].textContent?.trim() || '';
        const v = spans[i + 1].textContent?.trim() || '';
        if (k.length > 2 && k.length < 30 && v.length > 0) setInfo(k, v);
      }
    });

    // Strategy D: scan page line-by-line for known label patterns
    const bodyText = (document.body as HTMLElement).innerText || '';
    const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const labelPatterns: [RegExp, string][] = [
      [/^industry\s*type\s*:?\s*/i, 'industry type'],
      [/^industry\s*:?\s*/i, 'industry'],
      [/^company\s*size\s*:?\s*/i, 'company size'],
      [/^(employees|employee\s*count|headcount|strength)\s*:?\s*/i, 'company size'],
      [/^(headquarter|headquarters|hq)\s*:?\s*/i, 'headquarters'],
      [/^(founded|established|inception)\s*:?\s*/i, 'founded'],
      [/^company\s*type\s*:?\s*/i, 'company type'],
      [/^type\s*:?\s*/i, 'company type'],
      [/^website\s*:?\s*/i, 'website'],
    ];
    for (let i = 0; i < lines.length - 1; i++) {
      for (const [pat, normalKey] of labelPatterns) {
        if (pat.test(lines[i])) {
          const inline = lines[i].replace(pat, '').trim();
          setInfo(normalKey, inline || lines[i + 1]);
        }
      }
    }

    // ── JSON-LD structured data ────────────────────────────────────────────

    queryAll<HTMLElement>('script[type="application/ld+json"]').forEach(s => {
      try {
        const data = JSON.parse(s.textContent || '{}');
        const org = Array.isArray(data) ? data.find((d: Record<string, unknown>) => d['@type'] === 'Organization') : data;
        if (org) {
          if (org.name && !companyName) setInfo('name', org.name);
          if (org.url && !website) website = org.url;
          if (org.description && !description) description = org.description;
          if (org.numberOfEmployees?.value) setInfo('company size', String(org.numberOfEmployees.value));
          if (org.foundingDate) setInfo('founded', org.foundingDate);
          if (org.address?.addressLocality) setInfo('headquarters', org.address.addressLocality);
          if (org.industry) setInfo('industry', org.industry);
        }
      } catch { /* ignore bad JSON */ }
    });

    // ── Resolve fields from infoMap ────────────────────────────────────────

    const findInfo = (...keys: string[]): string => {
      for (const k of keys) {
        for (const [mk, mv] of Object.entries(infoMap)) {
          if (mk.includes(k)) return mv;
        }
      }
      return '';
    };

    const industry     = findInfo('industry');
    const companySize  = findInfo('size', 'employee', 'headcount', 'strength');
    const headquarters = findInfo('headquarter', 'hq', 'location');
    const foundedYear  = findInfo('founded', 'established', 'inception');
    const companyType  = findInfo('company type', 'type');

    // ── Email addresses ────────────────────────────────────────────────────
    // 1. mailto: links
    const emailSet = new Set<string>();
    queryAll<HTMLAnchorElement>('a[href^="mailto:"]').forEach(a => {
      const email = a.href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emailSet.add(email);
    });
    // 2. Regex scan across full page text
    const pageTextForEmail = (document.body as HTMLElement).innerText || '';
    const emailRegex = /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g;
    const emailMatches = pageTextForEmail.match(emailRegex) || [];
    const skipEmailDomains = ['naukri.com', 'ambitionbox.com', 'sentry.io', 'example.com'];
    emailMatches.forEach(e => {
      const lower = e.toLowerCase();
      if (!skipEmailDomains.some(d => lower.includes(d))) emailSet.add(lower);
    });
    const emails = Array.from(emailSet).slice(0, 10);

    // ── Contact / Phone numbers ────────────────────────────────────────────
    // 1. tel: links
    const phoneSet = new Set<string>();
    queryAll<HTMLAnchorElement>('a[href^="tel:"]').forEach(a => {
      const num = a.href.replace('tel:', '').trim();
      if (num) phoneSet.add(num);
    });
    // 2. Regex scan — Indian & international formats
    const phoneRegex = /(?:\+91[-.\s]?|0)?[6-9]\d{9}|\+?\d[\d\s\-().]{7,}\d/g;
    const phoneMatches = pageTextForEmail.match(phoneRegex) || [];
    phoneMatches.forEach(p => {
      const cleaned = p.replace(/\s+/g, ' ').trim();
      // must have at least 7 digits
      if ((cleaned.match(/\d/g) || []).length >= 7) phoneSet.add(cleaned);
    });
    const contactNumbers = Array.from(phoneSet).slice(0, 10);

    return {
      companyName: companyName || '',
      website,
      description: description.trim().slice(0, 3000),
      industry,
      companySize,
      headquarters,
      foundedYear,
      companyType,
      rating,
      totalReviews,
      activeJobs,
      logo,
      socialLinks,
      emails,
      contactNumbers,
    };
  });

  return detail;
}

// ─── Naukri: job listing page ────────────────────────────────────────────────

interface JobCard {
  companyName: string;
  jobDetailUrl: string;
  jobTitle: string;
}

async function scrapeNaukriJobsListing(page: Page, url: string): Promise<JobCard[]> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
  await randomDelay(2500, 4000);

  // Scroll down to trigger lazy loading
  for (const y of [300, 700, 1200, 1800, 0]) {
    await page.evaluate((sy: number) => window.scrollTo(0, sy), y);
    await randomDelay(350, 700);
  }

  const jobs = await page.evaluate((): JobCard[] => {
    const results: JobCard[] = [];
    const seen = new Set<string>();

    /** Get direct text nodes only — ignores child spans (rating badges, etc.) */
    const directText = (el: Element | null): string => {
      if (!el) return '';
      const raw = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => (n.textContent || '').trim())
        .filter(Boolean)
        .join(' ')
        .trim();
      if (raw) return raw;
      // Fallback: strip trailing rating/review noise from full textContent
      return (el.textContent || '').replace(/(\s*\d+\.\d+|\s+\d[\d,]*\s*(reviews?|ratings?)).*$/i, '').trim();
    };

    const getCompanyName = (card: Element): string =>
      directText(card.querySelector(
        'a.comp-name, [class*="comp-name"], [class*="companyInfo"] a, [class*="company-name"], [class*="subtitleLink"], [class*="info-name"]'
      ));

    // Naukri job listing card selectors
    const cardSelectors = [
      'article.jobTuple',
      'div.jobTuple',
      'li.jobTuple',
      'article[class*="jobTuple"]',
      'div[class*="jobTuple"]',
      '[class*="srp-jobtuple"]',
      '[class*="job-tuple"]',
    ];

    let cardEls: Element[] = [];
    for (const sel of cardSelectors) {
      const found = Array.from(document.querySelectorAll(sel));
      if (found.length > 0) { cardEls = found; break; }
    }

    // Fallback: look for job title links whose href matches job-listings pattern
    if (cardEls.length === 0) {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="job-listings-"], a[href*="/job/"]'));
      links.forEach(a => {
        const href = a.href;
        if (!href || seen.has(href)) return;
        const companyEl = a.closest('[class*="jobTuple"], article, li')
          ?.querySelector('[class*="comp-name"], [class*="companyInfo"], [class*="company"]');
        const companyName = directText(companyEl || null);
        if (!companyName) return;
        seen.add(href);
        results.push({ companyName, jobDetailUrl: href, jobTitle: a.textContent?.trim() || '' });
      });
      return results.slice(0, 50);
    }

    cardEls.forEach(card => {
      const titleLink = card.querySelector<HTMLAnchorElement>(
        'a.title, a[class*="title"], a[href*="job-listings-"], a[href*="/job/"]'
      );
      if (!titleLink?.href || seen.has(titleLink.href)) return;
      seen.add(titleLink.href);

      const companyName = getCompanyName(card);
      if (!companyName) return;

      results.push({
        companyName,
        jobDetailUrl: titleLink.href,
        jobTitle: titleLink.textContent?.trim() || '',
      });
    });

    return results;
  });

  return jobs;
}

/** Visit a Naukri job detail page.
 *  1) Extracts company name, Naukri profile URL, and "About company" description.
 *  2) Clicks "Apply on Company Website" and intercepts the new tab Naukri opens,
 *     following the redirect chain to get the real company domain. */
async function scrapeNaukriJobDetailWebsite(page: Page, jobDetailUrl: string, sessionId: string): Promise<{
  companyName: string;
  companyProfileUrl: string;
  aboutDescription: string;
}> {
  // Use networkidle2 so the full React/Angular page renders (Naukri is a SPA)
  await page.goto(jobDetailUrl, { waitUntil: 'networkidle2', timeout: 50000 }).catch(async () => {
    // Fallback: domcontentloaded if networkidle2 times out
    await page.goto(jobDetailUrl, { waitUntil: 'domcontentloaded', timeout: 40000 });
  });
  // Wait for the job header/company name to appear in the DOM
  await page.waitForSelector(
    '.comp-name, [class*="comp-name"], [class*="companyName"], [class*="jd-header"]',
    { timeout: 12000 }
  ).catch(() => { /* element didn't appear — proceed anyway */ });
  await randomDelay(1500, 3000);
  await page.evaluate(() => window.scrollTo(0, 800));
  await randomDelay(600, 1200);

  // ── Step 1: Extract static DOM data ──────────────────────────────────────
  const domData = await page.evaluate((): {
    companyName: string;
    companyProfileUrl: string;
    aboutDescription: string;
  } => {
    /** Direct text nodes only — strips child rating/review spans */
    const directText = (el: Element | null): string => {
      if (!el) return '';
      const raw = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => (n.textContent || '').trim())
        .filter(Boolean)
        .join(' ')
        .trim();
      if (raw) return raw;
      return (el.textContent || '').replace(/(\s*\d+\.\d+|\s+\d[\d,]*\s*(reviews?|ratings?)).*$/i, '').trim();
    };

    // Company name from job detail header
    const companyName = directText(
      document.querySelector(
        '.comp-name, [class*="comp-name"], [class*="companyName"], [class*="company-name"], [class*="jd-header"] [class*="comp"]'
      )
    );

    // Naukri company profile URL (link to company overview page)
    let companyProfileUrl = '';
    for (const a of Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))) {
      const h = a.href || '';
      if (h.includes('naukri.com') && (h.includes('/company-details/') || h.includes('-overview-') || /\/[a-z0-9-]+-overview\b/.test(h))) {
        companyProfileUrl = h.split('?')[0];
        break;
      }
    }

    // "About company" section on the job detail page
    const aboutSels = [
      '[class*="about-company"]', '[class*="aboutCompany"]', '[class*="AboutCompany"]',
      '[class*="company-info"]', '[class*="companyInfo"]', '.jd-desc',
    ];
    let aboutEl: Element | null = null;
    for (const sel of aboutSels) {
      aboutEl = document.querySelector(sel);
      if (aboutEl) break;
    }
    const aboutDescription = aboutEl ? (aboutEl.textContent || '').trim().slice(0, 3000) : '';

    return { companyName, companyProfileUrl, aboutDescription };
  });

  await sendSSE(sessionId, 'log', {
    message: `  company: "${domData.companyName}" | profile: ${domData.companyProfileUrl || 'none'}`,
    type: 'info',
  });

  return {
    companyName: domData.companyName,
    companyProfileUrl: domData.companyProfileUrl,
    aboutDescription: domData.aboutDescription,
  };
}

// ─── Glassdoor: listing page ──────────────────────────────────────────────────

async function scrapeGlassdoorListing(page: Page, url: string, sessionId: string): Promise<CompanyCard[]> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // ── Step 1: wait for Cloudflare JS challenge to complete ──────────────────
  await sendSSE(sessionId, 'log', { message: '  GD: waiting for Cloudflare challenge…', type: 'info' });
  await waitForCloudflare(page, 45000);

  const pageTitle = await page.title().catch(() => '');
  const pageUrl   = page.url();
  await sendSSE(sessionId, 'log', { message: `  GD page: "${pageTitle}" | ${pageUrl}`, type: 'info' });

  // Wait for page to fully settle after Cloudflare redirect
  await randomDelay(2500, 3500);

  // ── Step 2: dismiss any modal / sign-in wall ──────────────────────────────
  await page.evaluate(() => {
    try {
      const closeSelectors = [
        '[data-test="modal-close"]', '[alt="Close"]',
        'button[class*="CloseButton"]', 'button[class*="closeButton"]',
        'button[aria-label="Close"]', '[class*="ModalCEX"] button',
        '[class*="SignIn"] button[class*="close"]', '[id*="onetrust-accept"]',
      ];
      for (const sel of closeSelectors) {
        try { (document.querySelector(sel) as HTMLElement | null)?.click(); } catch { /* ignore */ }
      }
      if (document.body) document.body.style.overflow = 'auto';
      if (document.documentElement) document.documentElement.style.overflow = 'auto';
      document.querySelectorAll<HTMLElement>(
        '[class*="modal"], [class*="Modal"], [class*="overlay"], [class*="Overlay"], ' +
        '[class*="SignIn"], [class*="signIn"], [class*="HeroHeader"]'
      ).forEach(el => { try { if (el?.style) el.style.display = 'none'; } catch { /* ignore */ } });
    } catch { /* page may still be transitioning */ }
  }).catch(() => {});

  // ── Step 3: wait for company list to render ────────────────────────────────
  await sendSSE(sessionId, 'log', { message: '  GD: waiting for company list…', type: 'info' });

  // Glassdoor Reviews listing: company links follow the pattern
  // /Reviews/Company-Name-Reviews-E{id}.htm  OR  EI_IE{id}  OR  /Overview/
  const appeared = await page.waitForSelector(
    'a[href*="-Reviews-E"], a[href*="EI_IE"], a[href*="/Overview/"], [class*="EmployerCard"]',
    { timeout: 30000 },
  ).then(() => true).catch(() => false);

  await sendSSE(sessionId, 'log', { message: `  GD: company list visible=${appeared}`, type: appeared ? 'info' : 'warning' });

  // Extra scroll to load all lazy cards
  for (const y of [300, 700, 1200, 1800, 0]) {
    await page.evaluate((sy: number) => window.scrollTo(0, sy), y);
    await randomDelay(500, 900);
  }
  await randomDelay(1000, 2000);

  const cards = await page.evaluate((): CompanyCard[] => {
    const results: CompanyCard[] = [];

    /** Convert any Glassdoor company URL to an Overview URL */
    const toOverviewUrl = (href: string): string => {
      // Already Overview
      if (href.includes('/Overview/')) return href.split('?')[0];
      // /Reviews/Company-Reviews-E{id}.htm  →  /Overview/Working-at-Company-EI_IE{id}.htm
      const m = href.match(/\/Reviews\/(.+?)-Reviews-E(\d+)\.htm/i);
      if (m) return `https://www.glassdoor.co.in/Overview/Working-at-${m[1]}-EI_IE${m[2]}.htm`;
      // Has EI_IE already (some link variants)
      if (href.includes('EI_IE')) return href.split('?')[0];
      return href.split('?')[0];
    };

    const isCompanyLink = (href: string) =>
      href.includes('glassdoor') && (
        /\/Reviews\/.+-Reviews-E\d+\.htm/i.test(href) ||
        href.includes('EI_IE') ||
        href.includes('/Overview/')
      );

    // ── Try structured card containers ────────────────────────────────────────
    const cardSelectors = [
      '[data-test="employer-card-single"]',
      '[class*="EmployerCard_"]',
      '[class*="employer-card"]',
      '[class*="EmployerModule"]',
      'li[class*="company"]',
      'article[class*="employer"]',
    ];

    let cardEls: Element[] = [];
    for (const sel of cardSelectors) {
      const found = Array.from(document.querySelectorAll(sel));
      if (found.length > 0) { cardEls = found; break; }
    }

    if (cardEls.length > 0) {
      const gt = (el: Element, sel: string) => (el.querySelector(sel)?.textContent || '').trim();

      cardEls.forEach(card => {
        // Find any anchor inside the card pointing to a company page
        const links = Array.from(card.querySelectorAll<HTMLAnchorElement>('a[href]'));
        const link = links.find(a => isCompanyLink(a.href));
        if (!link) return;

        const profileUrl = toOverviewUrl(link.href);
        const name = gt(card, '[data-test="employer-name"], [class*="EmployerCard_name"], h2, h3')
          || link.textContent?.trim() || '';
        if (!name) return;

        const ratingEl = card.querySelector('[class*="ratingNumber"], [class*="RatingNumber"], [data-test="rating"]');
        const rating = ratingEl?.textContent?.trim().match(/\b([1-4]\.\d|5\.0)\b/)?.[1] || '';

        results.push({
          name,
          profileUrl,
          industry: gt(card, '[class*="industry"], [data-test="industry"]'),
          size:     gt(card, '[class*="empStats"], [class*="EmployerStats"], [data-test="size"]'),
          rating,
          reviews:  gt(card, '[class*="review"], [data-test="review-count"]'),
          jobs: '',
        });
      });

      if (results.length > 0) return results;
    }

    // ── Fallback: scan all page links for company patterns ────────────────────
    const seen = new Set<string>();
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).forEach(a => {
      if (!isCompanyLink(a.href)) return;
      const profileUrl = toOverviewUrl(a.href);
      if (seen.has(profileUrl)) return;
      seen.add(profileUrl);

      const name = (a.textContent || '').trim();
      if (!name || name.length < 2 || name.length > 100) return;

      results.push({ name, profileUrl, industry: '', size: '', rating: '', reviews: '', jobs: '' });
    });

    return results.slice(0, 30);
  });

  await sendSSE(sessionId, 'log', { message: `  GD listing extracted ${cards.length} cards`, type: 'info' });
  return cards;
}

// ─── Glassdoor: company overview page ─────────────────────────────────────────

async function scrapeGlassdoorDetail(page: Page, profileUrl: string): Promise<NaukriDetail> {
  // Ensure we use the Overview page — convert Reviews URL if needed
  let cleanUrl = profileUrl.split('?')[0];
  const reviewsMatch = cleanUrl.match(/\/Reviews\/(.+?)-Reviews-E(\d+)\.htm/i);
  if (reviewsMatch) {
    cleanUrl = `https://www.glassdoor.co.in/Overview/Working-at-${reviewsMatch[1]}-EI_IE${reviewsMatch[2]}.htm`;
  }

  await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for Cloudflare challenge to pass, then let page settle
  await waitForCloudflare(page, 45000);
  await randomDelay(2000, 3000);

  // Dismiss modals / overlays (non-critical)
  await page.evaluate(() => {
    try {
      const closeSelectors = [
        '[data-test="modal-close"]', '[alt="Close"]',
        'button[class*="CloseButton"]', 'button[class*="closeButton"]',
        'button[aria-label="Close"]', '[class*="ModalCEX"] button',
        '[class*="SignIn"] button[class*="close"]', '[id*="onetrust-accept"]',
      ];
      for (const sel of closeSelectors) {
        try { (document.querySelector(sel) as HTMLElement | null)?.click(); } catch { /* ignore */ }
      }
      if (document.body) document.body.style.overflow = 'auto';
      if (document.documentElement) document.documentElement.style.overflow = 'auto';
      document.querySelectorAll<HTMLElement>(
        '[class*="modal"], [class*="Modal"], [class*="overlay"], [class*="Overlay"], ' +
        '[class*="SignIn"], [class*="signIn"], [class*="HeroHeader"]'
      ).forEach(el => { try { if (el?.style) el.style.display = 'none'; } catch { /* ignore */ } });
    } catch { /* ignore */ }
  }).catch(() => {});

  // Wait for company header to render
  await page.waitForSelector(
    'h1, [data-test="employer-name"], [class*="EmployerProfile"], [class*="EmployerHeading"], [class*="employer-name"]',
    { timeout: 20000 },
  ).catch(() => {});
  await randomDelay(1500, 2500);

  for (const y of [0, 400, 800, 1200, 800, 0]) {
    await page.evaluate((sy: number) => window.scrollTo(0, sy), y);
    await randomDelay(300, 600);
  }

  const detail = await page.evaluate((): NaukriDetail => {
    const getText = (...selectors: string[]): string => {
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          const t = el?.textContent?.trim();
          if (t) return t;
        } catch { /* ignore */ }
      }
      return '';
    };

    const queryAll = <T extends Element>(sel: string): T[] => {
      try { return Array.from(document.querySelectorAll<T>(sel)); }
      catch { return []; }
    };

    // ── Company Name ──────────────────────────────────────────────────────────
    const companyName = getText(
      '[data-test="employer-name"]',
      '[class*="EmployerHeadingModule_name"]',
      '[class*="employerName"]',
      '[class*="employer-name"]',
      'h1',
    );

    // ── Logo ──────────────────────────────────────────────────────────────────
    let logo = '';
    const SKIP_DOMAINS = ['glassdoor.com', 'glassdoor.co.in', 'google', 'facebook'];
    const logoSels = [
      '[class*="EmployerHeadingModule"] img',
      '[class*="EmployerLogo"] img',
      '[data-test="employer-logo"] img',
      '[class*="employerLogo"] img',
      '[class*="logo"] img',
    ];
    for (const sel of logoSels) {
      const img = document.querySelector<HTMLImageElement>(sel);
      if (img) {
        const src = img.src || img.getAttribute('data-src') || '';
        if (src && !src.startsWith('data:') && SKIP_DOMAINS.every(d => !src.includes(d))) {
          logo = src;
          break;
        }
      }
    }

    // ── Rating ────────────────────────────────────────────────────────────────
    let rating = '';
    const ratingSels = ['[data-test="rating"]', '[class*="ratingNumber"]', '[class*="RatingNumber"]', '[class*="rating-number"]'];
    for (const sel of ratingSels) {
      const el = document.querySelector(sel);
      const m = el?.textContent?.trim().match(/\b([1-4]\.\d|5\.0)\b/);
      if (m) { rating = m[1]; break; }
    }
    if (!rating) {
      const bodyText = (document.body as HTMLElement).innerText || '';
      const m = bodyText.match(/^(\d\.\d)\s*(?:out of|\/)\s*5/m);
      if (m) rating = m[1];
    }

    // ── Total Reviews ─────────────────────────────────────────────────────────
    let totalReviews = '';
    queryAll<Element>('[data-test="review-count"], [class*="ReviewsModule"], [class*="reviews-count"], [class*="reviewCount"]').forEach(el => {
      if (totalReviews) return;
      const t = el.textContent?.trim() || '';
      if (/\d/.test(t) && /review/i.test(t)) totalReviews = t;
    });
    if (!totalReviews) {
      const bodyText2 = (document.body as HTMLElement).innerText || '';
      const m = bodyText2.match(/(\d[\d,]*)\s*reviews?/i);
      if (m) totalReviews = m[0];
    }

    // ── Active Jobs ───────────────────────────────────────────────────────────
    let activeJobs = '';
    queryAll<Element>('[data-test="jobs-count"], [class*="JobsModule"], [class*="jobs-count"], [class*="jobCount"]').forEach(el => {
      if (activeJobs) return;
      const t = el.textContent?.trim() || '';
      if (/\d/.test(t) && /(job|opening|position)/i.test(t)) activeJobs = t;
    });

    // ── Description ───────────────────────────────────────────────────────────
    let description = '';
    const descSels = [
      '[data-test="employerDescription"] p',
      '[class*="AboutModule"] p',
      '[class*="EmployerAbout"] p',
      '[class*="about-section"] p',
      '[class*="description"] p',
      '[class*="Overview"] p',
    ];
    for (const sel of descSels) {
      const paras = queryAll<Element>(sel);
      if (paras.length) {
        const joined = paras.map(p => p.textContent?.trim()).filter(Boolean).join(' ');
        if (joined.length > 80) { description = joined; break; }
      }
    }
    if (!description) {
      let maxLen = 0;
      queryAll<Element>('[data-test="employerDescription"], [class*="AboutModule"], [class*="EmployerAbout"], [class*="about"]').forEach(el => {
        const t = el.textContent?.trim() || '';
        if (t.length > 100 && t.length < 5000 && t.length > maxLen) { maxLen = t.length; description = t; }
      });
    }

    // ── Company Facts ─────────────────────────────────────────────────────────
    const infoMap: Record<string, string> = {};
    const setInfo = (rawKey: string, value: string) => {
      const key = rawKey.toLowerCase().replace(/[^a-z ]/g, '').trim();
      if (key && value && value.length < 200 && !infoMap[key]) infoMap[key] = value;
    };

    // Strategy A: paired children
    queryAll<Element>(
      '[class*="infoEntity"], [class*="InfoEntity"], [class*="EmployerInfo"], ' +
      '[class*="CompanyInfo"], [class*="FactsSummary"], [class*="factItem"], ' +
      '[data-test="employer-facts"] li, [class*="KeyFact"], [class*="employer-facts"] li, ' +
      '[class*="SideBarInfo"] li, [class*="sidebar"] li'
    ).forEach(el => {
      const ch = Array.from(el.children);
      if (ch.length >= 2) setInfo(ch[0].textContent || '', ch[1].textContent || '');
    });

    // Strategy B: dt/dd
    queryAll<HTMLElement>('dt').forEach(dt => {
      const dd = dt.nextElementSibling;
      if (dd?.tagName === 'DD') setInfo(dt.textContent || '', dd.textContent || '');
    });

    // Strategy C: line-by-line label scan
    const bodyText3 = (document.body as HTMLElement).innerText || '';
    const lines = bodyText3.split('\n').map(l => l.trim()).filter(Boolean);
    const labelPatterns: [RegExp, string][] = [
      [/^industry\s*:?\s*/i, 'industry'],
      [/^company\s*size\s*:?\s*/i, 'company size'],
      [/^(size|employees|headcount)\s*:?\s*/i, 'company size'],
      [/^(headquarters|hq|location)\s*:?\s*/i, 'headquarters'],
      [/^founded\s*:?\s*/i, 'founded'],
      [/^company\s*type\s*:?\s*/i, 'company type'],
      [/^type\s*:?\s*/i, 'company type'],
      [/^revenue\s*:?\s*/i, 'revenue'],
      [/^website\s*:?\s*/i, 'website'],
    ];
    for (let i = 0; i < lines.length - 1; i++) {
      for (const [pat, key] of labelPatterns) {
        if (pat.test(lines[i])) {
          const inline = lines[i].replace(pat, '').trim();
          setInfo(key, inline || lines[i + 1]);
        }
      }
    }

    // Strategy D: JSON-LD
    queryAll<HTMLScriptElement>('script[type="application/ld+json"]').forEach(s => {
      try {
        const data = JSON.parse(s.textContent || '{}');
        const org = Array.isArray(data) ? data.find((d: Record<string, unknown>) => d['@type'] === 'Organization') : data;
        if (org) {
          if (org.description && !description) description = org.description;
          if (org.url) setInfo('website', org.url);
          if (org.foundingDate) setInfo('founded', org.foundingDate);
          if (org.numberOfEmployees?.value) setInfo('company size', String(org.numberOfEmployees.value));
          if (org.address?.addressLocality) setInfo('headquarters', org.address.addressLocality);
          if (org.industry) setInfo('industry', org.industry);
        }
      } catch { /* ignore */ }
    });

    const findInfo = (...keys: string[]): string => {
      for (const k of keys) {
        for (const [mk, mv] of Object.entries(infoMap)) {
          if (mk.includes(k)) return mv;
        }
      }
      return '';
    };

    const industry    = findInfo('industry');
    const companySize = findInfo('size', 'employee', 'headcount');
    const headquarters = findInfo('headquarter', 'hq', 'location');
    const foundedYear = findInfo('founded', 'established');
    const companyType = findInfo('company type', 'type');

    // ── Website ───────────────────────────────────────────────────────────────
    const skipDomains = ['glassdoor.com', 'glassdoor.co.in', 'google.', 'facebook.',
      'linkedin.', 'twitter.', 'instagram.', 'youtube.', 'naukri.com',
      'naukritalentcloud.com', 'naukrigulf.com', 'infoedge.in', 'infoedge.com', 'ambitionbox.',
      '99acres.com', 'jeevansathi.com', 'shiksha.com', 'firstnaukri.com', 'hirist.com', 'hirist.tech', 'jobhai.com'];
    const isExternal = (href: string) =>
      /^https?:\/\//.test(href) && skipDomains.every(d => !href.includes(d));

    let website = findInfo('website') || '';
    if (!website || !isExternal(website)) {
      website = '';
      queryAll<HTMLAnchorElement>('a[href]').forEach(a => {
        if (website) return;
        const href = a.href || '';
        const label = (a.textContent + ' ' + (a.title || '') + ' ' + (a.getAttribute('aria-label') || '')).toLowerCase();
        if (isExternal(href) && (label.includes('website') || label.includes('visit') || label.includes('www') || label.includes('site'))) {
          website = href;
        }
      });
    }
    if (!website) {
      queryAll<HTMLAnchorElement>('a[href]').forEach(a => {
        if (website) return;
        if (isExternal(a.href)) website = a.href;
      });
    }

    // ── Social Links ──────────────────────────────────────────────────────────
    const socialLinks: Record<string, string> = {};
    const socialMap: Record<string, string> = { linkedin: 'linkedin', twitter: 'twitter', facebook: 'facebook', instagram: 'instagram', youtube: 'youtube' };
    queryAll<HTMLAnchorElement>('a[href]').forEach(a => {
      const href = a.href || '';
      for (const [key, domain] of Object.entries(socialMap)) {
        if (!socialLinks[key] && href.includes(domain + '.com')) socialLinks[key] = href;
      }
    });

    // ── Emails ────────────────────────────────────────────────────────────────
    const emailSet = new Set<string>();
    queryAll<HTMLAnchorElement>('a[href^="mailto:"]').forEach(a => {
      const email = a.href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emailSet.add(email);
    });
    const emailRx = /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g;
    const skipEmailDomains = ['glassdoor.com', 'glassdoor.co.in', 'sentry.io', 'example.com'];
    ((document.body as HTMLElement).innerText.match(emailRx) || []).forEach(e => {
      if (!skipEmailDomains.some(d => e.includes(d))) emailSet.add(e.toLowerCase());
    });

    // ── Phones ────────────────────────────────────────────────────────────────
    const phoneSet = new Set<string>();
    queryAll<HTMLAnchorElement>('a[href^="tel:"]').forEach(a => {
      const n = a.href.replace('tel:', '').trim();
      if (n && (n.match(/\d/g) || []).length >= 7) phoneSet.add(n);
    });
    const phoneRx = /(?:\+91[-.\s]?|0)?[6-9]\d{9}|\+?\d[\d\s\-().]{7,}\d/g;
    ((document.body as HTMLElement).innerText.match(phoneRx) || []).forEach(p => {
      const c = p.trim();
      if ((c.match(/\d/g) || []).length >= 7) phoneSet.add(c);
    });

    return {
      companyName: companyName || '',
      website,
      description: description.trim().slice(0, 3000),
      industry,
      companySize,
      headquarters,
      foundedYear,
      companyType,
      rating,
      totalReviews,
      activeJobs,
      logo,
      socialLinks,
      emails: Array.from(emailSet).slice(0, 10),
      contactNumbers: Array.from(phoneSet).slice(0, 10),
    };
  });

  return detail;
}

// ─── Company website scraper (footer + contact page) ─────────────────────────

interface WebsiteData {
  emails: string[];
  contactNumbers: string[];
  address: string;
  city: string;
  state: string;
}

/** Extract contact info from the currently loaded page. Runs inside the browser. */
async function extractContactFromPage(page: Page): Promise<WebsiteData> {
  return page.evaluate((): WebsiteData => {

    // ── Helpers ─────────────────────────────────────────────────────────────

    const qAll = <T extends Element>(sel: string, root: Document | Element = document): T[] => {
      try { return Array.from((root as Document | Element).querySelectorAll<T>(sel)); }
      catch { return []; }
    };

    const innerTxt = (el: Element): string =>
      ((el as HTMLElement).innerText || el.textContent || '').replace(/\s+/g, ' ').trim();

    // ── Identify the regions of interest ────────────────────────────────────

    const regionSelectors = [
      'footer', '[class*="footer"]', '[id*="footer"]',
      '[class*="Footer"]', '[id*="Footer"]',
      'address',
      '[class*="contact"]', '[id*="contact"]',
      '[class*="Contact"]', '[id*="Contact"]',
      '[class*="address"]', '[id*="address"]',
      '[class*="Address"]', '[id*="Address"]',
      '[class*="reach"]',  '[class*="Reach"]',
    ];

    const seen = new Set<Element>();
    const regions: Element[] = [];
    for (const sel of regionSelectors) {
      qAll(sel).forEach(el => {
        if (!seen.has(el)) { seen.add(el); regions.push(el); }
      });
    }

    // Full body text as fallback
    const fullText = (document.body as HTMLElement).innerText || '';

    // ── Email extraction ─────────────────────────────────────────────────────

    const SKIP_EMAIL_DOMAINS = [
      'sentry.io', 'example.com', 'schema.org', 'w3.org', 'googleapis.com',
      'cloudflare.com', 'jquery.com', 'bootstrap.com', 'fontawesome.com',
      'amazonaws.com', 'cdn.', 'pixel.',
      'naukri.com', 'naukritalentcloud.com', 'naukrigulf.com', 'infoedge.in', 'infoedge.com',
      'iimjobs.com', 'hirist.com', 'hirist.tech', 'jobhai.com', 'ambitionbox.com',
      '99acres.com', 'jeevansathi.com', 'shiksha.com',
    ];
    const emailSet = new Set<string>();
    const emailRx = /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g;

    // mailto links
    qAll<HTMLAnchorElement>('a[href^="mailto:"]').forEach(a => {
      const e = a.href.replace('mailto:', '').split('?')[0].trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) &&
          SKIP_EMAIL_DOMAINS.every(d => !e.includes(d))) emailSet.add(e);
    });

    // Scan footer/contact regions first, then fallback to full page
    const textToScan = regions.length > 0
      ? regions.map(innerTxt).join('\n')
      : fullText;

    (textToScan.match(emailRx) || []).forEach(e => {
      const l = e.toLowerCase();
      if (SKIP_EMAIL_DOMAINS.every(d => !l.includes(d))) emailSet.add(l);
    });

    // ── Phone extraction ─────────────────────────────────────────────────────

    const phoneSet = new Set<string>();
    // Indian mobile: 6-9XXXXXXXXX or +91-XXXXXXXXXX
    // Landline / generic: +?digits with separators, 7-15 digits total
    const phoneRx = /(?:(?:\+|0{0,2})91[-.\s]?)?[6-9]\d{9}|(?:\+?[\d][\d\s\-().]{6,14}\d)/g;

    qAll<HTMLAnchorElement>('a[href^="tel:"]').forEach(a => {
      const n = a.href.replace('tel:', '').trim();
      if (n && (n.match(/\d/g) || []).length >= 7) phoneSet.add(n);
    });

    (textToScan.match(phoneRx) || []).forEach(p => {
      const cleaned = p.trim();
      if ((cleaned.match(/\d/g) || []).length >= 7) phoneSet.add(cleaned);
    });

    // ── Address extraction ───────────────────────────────────────────────────

    let rawAddress = '';

    // 1. <address> HTML element
    const addrEl = document.querySelector('address');
    if (addrEl) rawAddress = innerTxt(addrEl);

    // 2. JSON-LD Organization schema
    if (!rawAddress) {
      qAll<HTMLScriptElement>('script[type="application/ld+json"]').forEach(s => {
        if (rawAddress) return;
        try {
          const data = JSON.parse(s.textContent || '{}');
          const items: Record<string, unknown>[] = Array.isArray(data) ? data : [data];
          items.forEach(item => {
            if (rawAddress) return;
            const addr = item.address as Record<string, string> | string | undefined;
            if (typeof addr === 'string') { rawAddress = addr; return; }
            if (addr && typeof addr === 'object') {
              rawAddress = [addr.streetAddress, addr.addressLocality, addr.addressRegion,
                addr.postalCode, addr.addressCountry].filter(Boolean).join(', ');
            }
          });
        } catch { /* ignore */ }
      });
    }

    // 3. Specific address-labeled elements
    if (!rawAddress) {
      const addrSelectors = [
        '[class*="address"]', '[class*="Address"]',
        '[id*="address"]', '[id*="Address"]',
        '[itemprop="address"]', '[itemtype*="PostalAddress"]',
        '.location', '.office-address', '.company-address',
      ];
      for (const sel of addrSelectors) {
        const el = document.querySelector(sel);
        if (el) { rawAddress = innerTxt(el); if (rawAddress.length > 10) break; }
      }
    }

    // 4. Largest text block in footer regions that looks like an address
    if (!rawAddress) {
      let best = '';
      regions.forEach(region => {
        const t = innerTxt(region);
        // heuristic: contains digit (house number/pin) and is a reasonable address length
        if (t.length > 15 && t.length < 600 && /\d/.test(t) && t.length > best.length) {
          best = t;
        }
      });
      rawAddress = best;
    }

    rawAddress = rawAddress.replace(/\s+/g, ' ').trim().slice(0, 500);

    // ── City & State extraction ───────────────────────────────────────────────

    const STATES: string[] = [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
      'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
      'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
      'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
      'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
      'West Bengal', 'Delhi', 'NCT of Delhi', 'Jammu and Kashmir',
      'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Pondicherry', 'Chandigarh',
      'Dadra and Nagar Haveli', 'Daman and Diu', 'Lakshadweep',
    ];
    const STATE_ABBREV: Record<string, string> = {
      AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam',
      BR: 'Bihar', CG: 'Chhattisgarh', GA: 'Goa', GJ: 'Gujarat',
      HR: 'Haryana', HP: 'Himachal Pradesh', JH: 'Jharkhand',
      KA: 'Karnataka', KL: 'Kerala', MP: 'Madhya Pradesh',
      MH: 'Maharashtra', MN: 'Manipur', ML: 'Meghalaya',
      MZ: 'Mizoram', NL: 'Nagaland', OD: 'Odisha', OR: 'Odisha',
      PB: 'Punjab', RJ: 'Rajasthan', SK: 'Sikkim', TN: 'Tamil Nadu',
      TS: 'Telangana', TR: 'Tripura', UP: 'Uttar Pradesh',
      UA: 'Uttarakhand', UK: 'Uttarakhand', WB: 'West Bengal',
      DL: 'Delhi', JK: 'Jammu & Kashmir', PY: 'Puducherry',
      CH: 'Chandigarh', LD: 'Lakshadweep',
    };
    const CITIES: string[] = [
      'Mumbai', 'Delhi', 'Bangalore', 'Bengaluru', 'Hyderabad', 'Ahmedabad',
      'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur', 'Lucknow', 'Kanpur',
      'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Patna',
      'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad',
      'Meerut', 'Rajkot', 'Kalyan', 'Varanasi', 'Srinagar', 'Aurangabad',
      'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad', 'Prayagraj',
      'Ranchi', 'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur',
      'Madurai', 'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Solapur',
      'Mysore', 'Mysuru', 'Thiruvananthapuram', 'Tiruppur', 'Gurgaon',
      'Gurugram', 'Noida', 'Dehradun', 'Bhubaneswar', 'Salem', 'Warangal',
      'Guntur', 'Bhiwandi', 'Kochi', 'Ernakulam', 'Bhavnagar', 'Durgapur',
      'Asansol', 'Nanded', 'Kolhapur', 'Ajmer', 'Jamnagar', 'Ujjain',
      'Siliguri', 'Jhansi', 'Mangalore', 'Mangaluru', 'Erode', 'Belgaum',
      'Hubballi', 'Bellary', 'Patiala', 'Agartala', 'Bhagalpur', 'Latur',
      'Dhule', 'Tirupati', 'Rohtak', 'Bhilwara', 'Muzaffarpur', 'Ahmednagar',
      'Mathura', 'Kollam', 'Davanagere', 'Kozhikode', 'Kurnool', 'Nellore',
      'Nizamabad', 'Shimla', 'Aligarh', 'Shillong', 'Puducherry', 'Panaji',
      'Vasco', 'Bokaro', 'Jamshedpur', 'Bhilai', 'Cuttack', 'Firozabad',
      'Akola', 'Tirunelveli', 'Malegaon', 'Gaya', 'Jalgaon', 'Udaipur',
      'Jammu', 'Sangli', 'Ambattur', 'Gorakhpur', 'Bikaner', 'Amravati',
    ];

    const textForLocation = rawAddress || textToScan;
    const textLower = textForLocation.toLowerCase();
    let state = '';
    let city = '';

    for (const st of STATES) {
      if (textLower.includes(st.toLowerCase())) { state = st; break; }
    }
    if (!state) {
      const abbrs = textForLocation.match(/\b([A-Z]{2})\b/g) || [];
      for (const a of abbrs) {
        if (STATE_ABBREV[a]) { state = STATE_ABBREV[a]; break; }
      }
    }
    for (const c of CITIES) {
      if (textLower.includes(c.toLowerCase())) { city = c; break; }
    }
    // Fallback: text segment immediately before state name
    if (!city && state && rawAddress) {
      const idx = rawAddress.toLowerCase().indexOf(state.toLowerCase());
      if (idx > 0) {
        const before = rawAddress.slice(0, idx);
        const parts = before.split(/[,\n\-]+/).map(p => p.trim()).filter(Boolean);
        if (parts.length) city = parts[parts.length - 1];
      }
    }

    return {
      emails: Array.from(emailSet).slice(0, 10),
      contactNumbers: Array.from(phoneSet).slice(0, 10),
      address: rawAddress,
      city: city.slice(0, 100),
      state: state.slice(0, 100),
    };
  });
}

/** Visit the company's own website, scrape footer + contact page for contact info. */
async function scrapeCompanyWebsite(page: Page, websiteUrl: string, sessionId: string): Promise<WebsiteData> {
  const empty: WebsiteData = { emails: [], contactNumbers: [], address: '', city: '', state: '' };

  // Basic sanity check
  if (!websiteUrl || !/^https?:\/\/.+\..+/.test(websiteUrl)) return empty;

  try {
    await sendSSE(sessionId, 'log', { message: `  → visiting website: ${websiteUrl}`, type: 'info' });

    await page.goto(websiteUrl, { waitUntil: 'networkidle2', timeout: 30000 }).catch(async () => {
      await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    });
    await randomDelay(1500, 2500);

    // Scroll to bottom to load lazy footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(800, 1400);

    const homeData = await extractContactFromPage(page);

    // ── Find contact page: first try link scanning, then common paths ────────
    let contactHref: string = await page.evaluate((): string => {
      const hrefKw = ['contact-us', 'contact_us', 'contactus', '/contact', 'reach-us', 'get-in-touch'];
      const textKw = ['contact us', 'contact', 'get in touch', 'reach us', 'reach out', 'write to us'];
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));

      for (const a of links) {
        const href = (a.href || '').toLowerCase();
        if (hrefKw.some(k => href.includes(k)) && href.startsWith('http')) return a.href;
      }
      for (const a of links) {
        const txt = (a.textContent || '').toLowerCase().trim();
        if (textKw.some(k => txt === k || txt.startsWith(k)) && (a.href || '').startsWith('http')) return a.href;
      }
      return '';
    });

    // Fallback: if no link found on page, try common contact URL paths directly
    if (!contactHref) {
      const origin = new URL(websiteUrl).origin;
      const candidates = ['/contact', '/contact/', '/contact-us', '/contact-us/', '/contactus', '/reach-us', '/get-in-touch', '/about-us'];
      for (const path of candidates) {
        const url = `${origin}${path}`;
        try {
          const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
          if (res && res.ok() && page.url() === url) {
            contactHref = url;
            break;
          }
        } catch { /* path doesn't exist, try next */ }
      }
      // Navigate back to homepage if we probed paths but found nothing
      if (!contactHref) {
        await page.goto(websiteUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      }
    }

    let contactData: WebsiteData = { ...empty };
    if (contactHref && contactHref !== websiteUrl) {
      try {
        // If we already landed on the contact page via path probing, check current URL
        if (page.url() !== contactHref) {
          await sendSSE(sessionId, 'log', { message: `  → visiting contact page: ${contactHref}`, type: 'info' });
          await page.goto(contactHref, { waitUntil: 'networkidle2', timeout: 25000 }).catch(async () => {
            await page.goto(contactHref, { waitUntil: 'domcontentloaded', timeout: 20000 });
          });
        } else {
          await sendSSE(sessionId, 'log', { message: `  → contact page: ${contactHref}`, type: 'info' });
        }
        await randomDelay(1200, 2000);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await randomDelay(600, 1000);
        contactData = await extractContactFromPage(page);
      } catch {
        // Contact page visit failed — continue with homepage data
      }
    }

    // Merge: prefer contact page data; deduplicate arrays
    const mergedEmails = [...new Set([...contactData.emails, ...homeData.emails])].slice(0, 10);
    const mergedPhones = [...new Set([...contactData.contactNumbers, ...homeData.contactNumbers])].slice(0, 10);

    return {
      emails: mergedEmails,
      contactNumbers: mergedPhones,
      address: contactData.address || homeData.address || '',
      city: contactData.city || homeData.city || '',
      state: contactData.state || homeData.state || '',
    };

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await sendSSE(sessionId, 'log', { message: `  → website visit failed: ${msg}`, type: 'warning' });
    return empty;
  }
}

// ─── Find company website via Bing search ─────────────────────────────────────

const SEARCH_BLOCKED = [
  'naukri.com', 'naukritalentcloud.com', 'naukrigulf.com', 'iimjobs.com',
  'hirist.com', 'hirist.tech', 'jobhai.com', 'infoedge.in', 'infoedge.com',
  '99acres.com', 'jeevansathi.com', 'shiksha.com', 'firstnaukri.com',
  'linkedin.com', 'facebook.com', 'twitter.com', 'instagram.com',
  'glassdoor.com', 'youtube.com', 'ambitionbox.com',
  'google.com', 'google.co', 'bing.com', 'yahoo.com', 'duckduckgo.com',
  'wikipedia.org', 'indiamart.com', 'justdial.com', 'tradeindia.com',
  'sulekha.com', 'quora.com', 'reddit.com', 'apple.com', 'apps.apple.com',
  'play.google.com', 'zaubacorp.com', 'tofler.in', 'mca.gov.in', 'crunchbase.com',
];

async function findWebsiteByCompanyName(page: Page, companyName: string, sessionId: string): Promise<string> {
  try {
    await sendSSE(sessionId, 'log', { message: `  → searching for: "${companyName}"`, type: 'info' });

    // Use DuckDuckGo HTML-only endpoint — static HTML, no JS redirects, no context issues.
    // Each result <a class="result__a"> has href="/l/?uddg=<encoded-real-url>&..."
    const query = encodeURIComponent(`${companyName} official website`);
    await page.goto(`https://html.duckduckgo.com/html/?q=${query}`, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    });
    await randomDelay(1000, 1800);

    const website = await page.evaluate((blocked: string[]): string => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a.result__a'));
      for (const a of links) {
        // DDG HTML redirects: /l/?uddg=https%3A%2F%2Fwww.example.com&...
        const raw = a.getAttribute('href') || '';
        let actualUrl = '';
        const m = raw.match(/[?&]uddg=([^&]+)/);
        if (m) {
          try { actualUrl = decodeURIComponent(m[1]); } catch { /* skip */ }
        } else if (raw.startsWith('http')) {
          actualUrl = raw;
        }
        if (!actualUrl.startsWith('http')) continue;
        if (blocked.some(d => actualUrl.includes(d))) continue;
        try {
          const u = new URL(actualUrl);
          return `${u.protocol}//${u.hostname}`;
        } catch { /* malformed */ }
      }
      return '';
    }, SEARCH_BLOCKED);

    if (website) {
      await sendSSE(sessionId, 'log', { message: `  → found: ${website}`, type: 'success' });
    } else {
      await sendSSE(sessionId, 'log', { message: `  → no result found`, type: 'warning' });
    }
    return website;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await sendSSE(sessionId, 'log', { message: `  → search failed: ${msg}`, type: 'warning' });
    return '';
  }
}

// ─── Check next page ──────────────────────────────────────────────────────────

async function hasNextPage(page: Page): Promise<boolean> {
  return page.evaluate((): boolean => {
    const selectors = [
      'a.next', 'button.next', 'a[title="Next"]', 'a[aria-label="Next"]',
      '[class*="next-page"]', '[class*="nextPage"]', '.pagination .next',
      'li.next a', 'a.pagination-next',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel) as HTMLButtonElement | null;
      if (el && !el.disabled && !el.classList.contains('disabled')) return true;
    }
    return false;
  });
}

// ─── Main scrape loop ─────────────────────────────────────────────────────────

async function runScrape(sessionId: string, startUrl: string) {
  const source = detectSource(startUrl);
  let browser: Browser | null = null;

  try {
    await sleep(800);

    await sendSSE(sessionId, 'log', { message: `Starting scrape: ${startUrl}`, type: 'info' });
    await sendSSE(sessionId, 'log', { message: `Source detected: ${source}`, type: 'info' });

    // Glassdoor is behind Cloudflare — use stealth browser to pass the JS challenge
    if (source === 'glassdoor') {
      browser = await launchStealthBrowser();
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--window-size=1366,768',
        ],
      });
    }

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1366, height: 768 });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    const session = activeSessions.get(sessionId)!;
    const stats = session.stats;
    let currentPage = getStartPage(startUrl);
    let hasMore = true;

    while (hasMore) {
      if (!activeSessions.get(sessionId)?.isRunning) {
        await sendSSE(sessionId, 'log', { message: 'Scrape stopped by user.', type: 'warning' });
        break;
      }

      const pageUrl = getPageUrl(startUrl, currentPage);
      await sendSSE(sessionId, 'log', { message: `Fetching listing page ${currentPage}…`, type: 'info' });

      // ── Naukri remote jobs flow ───────────────────────────────────────────
      if (source === 'naukri-jobs') {
        let jobCards: JobCard[] = [];
        try {
          jobCards = await scrapeNaukriJobsListing(page, pageUrl);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          await sendSSE(sessionId, 'log', { message: `Job listing page error: ${msg}`, type: 'error' });
          stats.errors++;
          break;
        }

        stats.pagesScraped++;
        stats.companiesFound += jobCards.length;
        await sendSSE(sessionId, 'progress', { ...stats, currentPage });
        await sendSSE(sessionId, 'log', {
          message: `Found ${jobCards.length} jobs on page ${currentPage}`,
          type: jobCards.length > 0 ? 'info' : 'warning',
        });

        if (jobCards.length === 0) break;

        for (const job of jobCards) {
          if (!activeSessions.get(sessionId)?.isRunning) break;

          const safeCompanyName = job.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          // Skip if company already exists anywhere in the collection (any source)
          const exists = await ScrapedCompany.findOne({
            companyName: { $regex: new RegExp(`^${safeCompanyName}$`, 'i') },
          });
          if (exists) {
            stats.companiesSkipped++;
            await sendSSE(sessionId, 'log', { message: `Skip (exists): ${job.companyName}`, type: 'skip' });
            await sendSSE(sessionId, 'progress', { ...stats, currentPage });
            continue;
          }

          await sendSSE(sessionId, 'log', {
            message: `Processing: ${job.companyName} — "${job.jobTitle}"`,
            type: 'info',
          });

          // Step 1: visit job detail page → get company name, profile URL, website
          let companyWebsite = '';
          let companyProfileUrl = '';
          let detailCompanyName = job.companyName;
          let jobAboutDescription = '';
          try {
            const jobDetail = await scrapeNaukriJobDetailWebsite(page, job.jobDetailUrl, sessionId);
            // Prefer listing page name (already cleaned via directText) — detail page DOM
            // sometimes splits compound names (e.g. "Tier5" → "Tier" + "5" in a span)
            if (!job.companyName && jobDetail.companyName) detailCompanyName = jobDetail.companyName;
            companyProfileUrl = jobDetail.companyProfileUrl;
            jobAboutDescription = jobDetail.aboutDescription;
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            await sendSSE(sessionId, 'log', { message: `  Job detail failed: ${msg}`, type: 'warning' });
          }

          await randomDelay(1000, 2000);

          // Step 2: if we have a Naukri company profile URL, scrape full company details
          let naukriDetail: NaukriDetail | null = null;
          if (companyProfileUrl) {
            try {
              await sendSSE(sessionId, 'log', { message: `  → scraping Naukri profile…`, type: 'info' });
              naukriDetail = await scrapeNaukriDetail(page, companyProfileUrl);
              // Profile page may have the website if the apply button didn't give us one
              if (!companyWebsite && naukriDetail.website) companyWebsite = naukriDetail.website;
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              await sendSSE(sessionId, 'log', { message: `  Profile scrape failed: ${msg}`, type: 'warning' });
            }
            await randomDelay(1000, 2000);
          }

          // Step 3: if still no website, search Bing by company name
          if (!companyWebsite) {
            companyWebsite = await findWebsiteByCompanyName(page, detailCompanyName, sessionId);
            await randomDelay(1000, 2000);
          }

          // Step 4: visit company website and scrape contact info
          let webData: WebsiteData = { emails: [], contactNumbers: [], address: '', city: '', state: '' };
          if (companyWebsite) {
            webData = await scrapeCompanyWebsite(page, companyWebsite, sessionId);
            await randomDelay(1500, 3000);
          }

          // Merge emails/phones from Naukri profile + company website
          const allEmails = [...new Set([...(naukriDetail?.emails ?? []), ...webData.emails])].slice(0, 15);
          const allPhones = [...new Set([...(naukriDetail?.contactNumbers ?? []), ...webData.contactNumbers])].slice(0, 15);

          try {
            await ScrapedCompany.create({
              companyName: detailCompanyName,
              sourceWebsite: 'naukri-jobs',
              companyProfileUrl: companyProfileUrl || job.jobDetailUrl,
              website: companyWebsite || '',
              description: naukriDetail?.description || jobAboutDescription || '',
              industry: naukriDetail?.industry || '',
              companySize: naukriDetail?.companySize || '',
              headquarters: naukriDetail?.headquarters || '',
              foundedYear: naukriDetail?.foundedYear || '',
              companyType: naukriDetail?.companyType || '',
              rating: parseFloat(naukriDetail?.rating || '') || null,
              totalReviews: parseInt(naukriDetail?.totalReviews || '') || null,
              activeJobs: parseInt(naukriDetail?.activeJobs || '') || null,
              logo: naukriDetail?.logo || '',
              socialLinks: naukriDetail?.socialLinks || {},
              isRemote: true,
              jobTitle: job.jobTitle || '',
              emails: allEmails,
              contactNumbers: allPhones,
              address: webData.address || '',
              city: webData.city || '',
              state: webData.state || '',
              rawData: { job, naukriDetail, webData },
              scrapedAt: new Date(),
            });
            stats.companiesSaved++;
            await sendSSE(sessionId, 'log', { message: `Saved: ${detailCompanyName}`, type: 'success' });
          } catch (dbErr: unknown) {
            const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
            if (!msg.includes('duplicate key') && !msg.includes('E11000')) {
              stats.errors++;
              await sendSSE(sessionId, 'log', { message: `DB error for ${job.companyName}: ${msg}`, type: 'error' });
            } else {
              stats.companiesSkipped++;
              await sendSSE(sessionId, 'log', { message: `Skip (duplicate): ${job.companyName}`, type: 'skip' });
            }
          }

          await sendSSE(sessionId, 'progress', { ...stats, currentPage });
          await randomDelay(2000, 4000);
        }

        hasMore = jobCards.length > 0;
        if (hasMore) {
          currentPage++;
          await randomDelay(3000, 6000);
        }
        continue; // skip the non-jobs flow below
      }

      // ── Standard company-listing flow (naukri / glassdoor / hirist) ──────
      let cards: CompanyCard[] = [];
      try {
        if (source === 'glassdoor') {
          cards = await scrapeGlassdoorListing(page, pageUrl, sessionId);
        } else {
          cards = await scrapeNaukriListing(page, pageUrl);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        await sendSSE(sessionId, 'log', { message: `Listing page error: ${msg}`, type: 'error' });
        stats.errors++;
        break;
      }

      stats.pagesScraped++;
      stats.companiesFound += cards.length;
      await sendSSE(sessionId, 'progress', { ...stats, currentPage });
      await sendSSE(sessionId, 'log', {
        message: `Found ${cards.length} companies on page ${currentPage}`,
        type: cards.length > 0 ? 'info' : 'warning',
      });

      if (cards.length === 0) break;

      for (const card of cards) {
        if (!activeSessions.get(sessionId)?.isRunning) break;

        // Skip if already exists
        const exists = await ScrapedCompany.findOne({
          companyName: { $regex: new RegExp(`^${card.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          sourceWebsite: source,
        });

        if (exists) {
          stats.companiesSkipped++;
          await sendSSE(sessionId, 'log', { message: `Skip (exists): ${card.name}`, type: 'skip' });
          await sendSSE(sessionId, 'progress', { ...stats, currentPage });
          continue;
        }

        await sendSSE(sessionId, 'log', { message: `Scraping overview: ${card.name}`, type: 'info' });

        let detail: NaukriDetail = {
          companyName: card.name,
          website: '',
          description: '',
          industry: card.industry,
          companySize: card.size,
          headquarters: '',
          foundedYear: '',
          companyType: '',
          rating: card.rating,
          totalReviews: card.reviews,
          activeJobs: card.jobs,
          logo: '',
          socialLinks: {},
          emails: [],
          contactNumbers: [],
        };

        try {
          if (card.profileUrl && source === 'naukri') {
            detail = await scrapeNaukriDetail(page, card.profileUrl);
          } else if (card.profileUrl && source === 'glassdoor') {
            detail = await scrapeGlassdoorDetail(page, card.profileUrl);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          await sendSSE(sessionId, 'log', {
            message: `Overview scrape failed for ${card.name}: ${msg}`,
            type: 'error',
          });
          stats.errors++;
        }

        // ── Visit company's own website ───────────────────────────────────
        let webData: WebsiteData = { emails: [], contactNumbers: [], address: '', city: '', state: '' };
        if (detail.website) {
          webData = await scrapeCompanyWebsite(page, detail.website, sessionId);
          await randomDelay(1500, 3000);
        }

        // Merge emails/phones from both sources (deduplicated)
        const allEmails = [...new Set([...detail.emails, ...webData.emails])].slice(0, 15);
        const allPhones = [...new Set([...detail.contactNumbers, ...webData.contactNumbers])].slice(0, 15);

        try {
          await ScrapedCompany.create({
            companyName: detail.companyName || card.name,
            sourceWebsite: source,
            companyProfileUrl: card.profileUrl,
            website: detail.website || '',
            description: detail.description || '',
            industry: detail.industry || card.industry || '',
            companySize: detail.companySize || card.size || '',
            headquarters: detail.headquarters || '',
            foundedYear: detail.foundedYear || '',
            companyType: detail.companyType || '',
            rating: parseFloat(detail.rating) || null,
            totalReviews: parseInt(detail.totalReviews) || null,
            activeJobs: parseInt(detail.activeJobs) || null,
            logo: detail.logo || '',
            socialLinks: detail.socialLinks || {},
            emails: allEmails,
            contactNumbers: allPhones,
            address: webData.address || '',
            city: webData.city || '',
            state: webData.state || '',
            rawData: { card, detail, webData },
            scrapedAt: new Date(),
          });
          stats.companiesSaved++;
          await sendSSE(sessionId, 'log', { message: `Saved: ${detail.companyName || card.name}`, type: 'success' });
        } catch (dbErr: unknown) {
          const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
          if (!msg.includes('duplicate key') && !msg.includes('E11000')) {
            stats.errors++;
            await sendSSE(sessionId, 'log', { message: `DB error for ${card.name}: ${msg}`, type: 'error' });
          } else {
            stats.companiesSkipped++;
            await sendSSE(sessionId, 'log', { message: `Skip (duplicate): ${card.name}`, type: 'skip' });
          }
        }

        await sendSSE(sessionId, 'progress', { ...stats, currentPage });
        await randomDelay(2500, 5500);
      }

      // Continue as long as this page returned companies
      hasMore = cards.length > 0;

      if (hasMore) {
        currentPage++;
        await randomDelay(3000, 6000);
      }
    }

    await sendSSE(sessionId, 'complete', {
      ...stats,
      message: `Done! Saved ${stats.companiesSaved} companies across ${stats.pagesScraped} pages.`,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await sendSSE(sessionId, 'error', { message: msg });
  } finally {
    if (browser) await browser.close().catch(() => {});
    const session = activeSessions.get(sessionId);
    if (session && !session.res.writableEnded) session.res.end();
    activeSessions.delete(sessionId);
  }
}

// ─── Re-scrape details for existing DB records ───────────────────────────────

async function runRescrapeDetails(sessionId: string, mode: 'missing' | 'all') {
  let browser: Browser | null = null;

  try {
    await sleep(800);

    // Find target companies
    const filter = mode === 'missing'
      ? {
          companyProfileUrl: { $ne: '' },
          $or: [
            { description: { $in: [null, ''] } },
            { industry: { $in: [null, ''] } },
            { companySize: { $in: [null, ''] } },
          ],
        }
      : { companyProfileUrl: { $ne: '' } };

    const companies = await ScrapedCompany.find(filter).select(
      '_id companyName companyProfileUrl sourceWebsite'
    ).lean();

    const total = companies.length;
    await sendSSE(sessionId, 'log', {
      message: `Found ${total} companies to re-scrape (mode: ${mode})`,
      type: 'info',
    });

    if (total === 0) {
      await sendSSE(sessionId, 'complete', {
        pagesScraped: 0, companiesFound: 0, companiesSaved: 0,
        companiesSkipped: 0, errors: 0,
        message: 'Nothing to re-scrape.',
      });
      return;
    }

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--window-size=1366,768',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1366, height: 768 });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).chrome = { runtime: {} };
    });

    const stats: ScrapeStats = {
      pagesScraped: 0,
      companiesFound: total,
      companiesSaved: 0,
      companiesSkipped: 0,
      errors: 0,
    };

    for (let i = 0; i < companies.length; i++) {
      const session = activeSessions.get(sessionId);
      if (!session?.isRunning) {
        await sendSSE(sessionId, 'log', { message: 'Stopped by user.', type: 'warning' });
        break;
      }

      const company = companies[i];
      const profileUrl = company.companyProfileUrl as string;
      const name = company.companyName as string;

      await sendSSE(sessionId, 'log', {
        message: `[${i + 1}/${total}] Scraping: ${name}`,
        type: 'info',
      });

      try {
        const detail = await scrapeNaukriDetail(page, profileUrl);

        // ── Visit company's own website ─────────────────────────────────
        let webData: WebsiteData = { emails: [], contactNumbers: [], address: '', city: '', state: '' };
        if (detail.website) {
          webData = await scrapeCompanyWebsite(page, detail.website, sessionId);
          await randomDelay(1500, 3000);
        }

        const allEmails = [...new Set([...detail.emails, ...webData.emails])].slice(0, 15);
        const allPhones = [...new Set([...detail.contactNumbers, ...webData.contactNumbers])].slice(0, 15);

        await ScrapedCompany.findByIdAndUpdate(company._id, {
          $set: {
            companyName: detail.companyName || name,
            website: detail.website || '',
            description: detail.description || '',
            industry: detail.industry || '',
            companySize: detail.companySize || '',
            headquarters: detail.headquarters || '',
            foundedYear: detail.foundedYear || '',
            companyType: detail.companyType || '',
            rating: parseFloat(detail.rating) || null,
            totalReviews: parseInt(detail.totalReviews) || null,
            activeJobs: parseInt(detail.activeJobs) || null,
            logo: detail.logo || '',
            socialLinks: detail.socialLinks || {},
            emails: allEmails,
            contactNumbers: allPhones,
            address: webData.address || '',
            city: webData.city || '',
            state: webData.state || '',
            rawData: { detail, webData },
            scrapedAt: new Date(),
          },
        });

        stats.companiesSaved++;
        await sendSSE(sessionId, 'log', { message: `Updated: ${name}`, type: 'success' });
      } catch (err: unknown) {
        stats.errors++;
        const msg = err instanceof Error ? err.message : String(err);
        await sendSSE(sessionId, 'log', { message: `Failed: ${name} — ${msg}`, type: 'error' });
      }

      await sendSSE(sessionId, 'progress', { ...stats, currentPage: i + 1 });

      // Delay between companies (Naukri detail + website already add delays)
      await randomDelay(1500, 3000);
    }

    await sendSSE(sessionId, 'complete', {
      ...stats,
      message: `Done! Updated ${stats.companiesSaved} / ${total} companies.`,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await sendSSE(sessionId, 'error', { message: msg });
  } finally {
    if (browser) await browser.close().catch(() => {});
    const session = activeSessions.get(sessionId);
    if (session && !session.res.writableEnded) session.res.end();
    activeSessions.delete(sessionId);
  }
}

// ─── Fill city/state from description ────────────────────────────────────────

/** Match scraped city text against DB cities. Returns first match or null. */
function matchCityInText(
  text: string,
  allCities: { name: string; stateName: string }[],
): { name: string; stateName: string } | null {
  for (const cityDoc of allCities) {
    const regex = new RegExp(
      `\\b${cityDoc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      'i',
    );
    if (regex.test(text)) return cityDoc;
  }
  return null;
}

async function runFillCityState(sessionId: string) {
  let browser: Browser | null = null;

  try {
    // Load all active cities sorted longest-first (prevents "Delhi" stealing before "New Delhi")
    const allCities = await City.find({ isActive: true }, 'name stateName').lean() as { name: string; stateName: string }[];
    allCities.sort((a, b) => b.name.length - a.name.length);

    // Fetch companies missing city or state — include website for fallback scraping
    const companies = await ScrapedCompany.find({
      $or: [{ city: '' }, { city: { $exists: false } }, { state: '' }, { state: { $exists: false } }],
    }, '_id companyName description headquarters address website companyProfileUrl').lean() as {
      _id: unknown;
      companyName: string;
      description: string;
      headquarters: string;
      address: string;
      website: string;
      companyProfileUrl: string;
    }[];

    const total = companies.length;
    await sendSSE(sessionId, 'log', { message: `Found ${total} companies to process.`, type: 'info' });
    await sendSSE(sessionId, 'progress', { companiesFound: total, companiesSaved: 0, companiesSkipped: 0, errors: 0, pagesScraped: 0 });

    if (total === 0) {
      await sendSSE(sessionId, 'complete', { companiesFound: 0, companiesSaved: 0, companiesSkipped: 0, errors: 0, pagesScraped: 0, message: 'No companies need city/state fill.' });
      const session = activeSessions.get(sessionId);
      if (session && !session.res.writableEnded) session.res.end();
      activeSessions.delete(sessionId);
      return;
    }

    let saved = 0;
    let skipped = 0;
    let errors = 0;
    let page: Page | null = null;

    for (let i = 0; i < companies.length; i++) {
      const session = activeSessions.get(sessionId);
      if (!session?.isRunning) {
        await sendSSE(sessionId, 'log', { message: 'Stopped by user.', type: 'warning' });
        break;
      }

      const c = companies[i];

      // ── Step 1: search stored text fields ───────────────────────────────────
      const storedText = [c.description, c.headquarters, c.address].filter(Boolean).join(' ');
      let foundCity = matchCityInText(storedText, allCities);

      // ── Step 2: fallback — visit company website ─────────────────────────────
      if (!foundCity && c.website) {
        await sendSSE(sessionId, 'log', { message: `No city in text for ${c.companyName} — visiting website…`, type: 'info' });

        // Lazy-launch browser on first need
        if (!browser) {
          browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        }
        if (!page || page.isClosed()) {
          page = await browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          await page.setViewport({ width: 1280, height: 800 });
        }

        try {
          const webData = await scrapeCompanyWebsite(page, c.website, sessionId);

          // Persist any extra contact data we collected while we were there
          const webUpdate: Record<string, unknown> = {};
          if (webData.address && !c.address) webUpdate.address = webData.address;
          if (webData.emails?.length) webUpdate.emails = webData.emails;
          if (webData.contactNumbers?.length) webUpdate.contactNumbers = webData.contactNumbers;

          // Try to match scraped city text against DB
          const webText = [webData.city, webData.address].filter(Boolean).join(' ');
          foundCity = matchCityInText(webText, allCities);

          // If DB match failed but website returned a raw city string, use it directly
          if (!foundCity && webData.city) {
            webUpdate.city = webData.city;
            webUpdate.state = webData.state || '';
            if (Object.keys(webUpdate).length) {
              await ScrapedCompany.findByIdAndUpdate(c._id, { $set: webUpdate });
            }
            await sendSSE(sessionId, 'log', { message: `Updated (raw): ${c.companyName} → ${webData.city}, ${webData.state}`, type: 'success' });
            saved++;
            await sendSSE(sessionId, 'progress', { companiesFound: total, companiesSaved: saved, companiesSkipped: skipped, errors, pagesScraped: 0, currentPage: i + 1 });
            continue;
          }

          if (Object.keys(webUpdate).length && foundCity) {
            // merge city/state into the pending update below
          } else if (Object.keys(webUpdate).length) {
            await ScrapedCompany.findByIdAndUpdate(c._id, { $set: webUpdate });
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          await sendSSE(sessionId, 'log', { message: `Website scrape failed for ${c.companyName}: ${msg}`, type: 'warning' });
        }
      }

      // ── Step 3: save result ──────────────────────────────────────────────────
      if (!foundCity) {
        await sendSSE(sessionId, 'log', { message: `Skip (no city found): ${c.companyName}`, type: 'skip' });
        skipped++;
      } else {
        try {
          await ScrapedCompany.findByIdAndUpdate(c._id, { $set: { city: foundCity.name, state: foundCity.stateName } });
          await sendSSE(sessionId, 'log', { message: `Updated: ${c.companyName} → ${foundCity.name}, ${foundCity.stateName}`, type: 'success' });
          saved++;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          await sendSSE(sessionId, 'log', { message: `DB error for ${c.companyName}: ${msg}`, type: 'error' });
          errors++;
        }
      }

      await sendSSE(sessionId, 'progress', { companiesFound: total, companiesSaved: saved, companiesSkipped: skipped, errors, pagesScraped: 0, currentPage: i + 1 });
    }

    await sendSSE(sessionId, 'complete', {
      companiesFound: total, companiesSaved: saved, companiesSkipped: skipped, errors, pagesScraped: 0,
      message: `Done! Updated ${saved} / ${total} companies.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await sendSSE(sessionId, 'error', { message: msg });
  } finally {
    if (browser) await browser.close().catch(() => {});
    const session = activeSessions.get(sessionId);
    if (session && !session.res.writableEnded) session.res.end();
    activeSessions.delete(sessionId);
  }
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export const startScrape = async (req: Request, res: Response) => {
  const { url } = req.body as { url?: string };
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  res.json({ sessionId });

  runScrape(sessionId, url).catch((e) => console.error('Scrape fatal error:', e));
};

export const streamProgress = (req: Request, res: Response) => {
  const { sessionId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  activeSessions.set(sessionId, {
    res,
    isRunning: true,
    stats: { pagesScraped: 0, companiesFound: 0, companiesSaved: 0, companiesSkipped: 0, errors: 0 },
  });

  res.write(`event: connected\ndata: ${JSON.stringify({ sessionId })}\n\n`);

  req.on('close', () => {
    const s = activeSessions.get(sessionId);
    if (s) s.isRunning = false;
  });
};

export const stopScrape = (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);
  if (session) {
    session.isRunning = false;
    res.json({ message: 'Stop signal sent' });
  } else {
    res.status(404).json({ error: 'Session not found or already finished' });
  }
};

export const getScrapedCompanies = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search, sourceWebsite, city, state, isRemote } = req.query as Record<string, string>;
    const query: Record<string, unknown> = {};

    if (search) query.$text = { $search: search };
    if (sourceWebsite) query.sourceWebsite = sourceWebsite;
    if (city) query.city = { $regex: city, $options: 'i' };
    if (state) query.state = { $regex: state, $options: 'i' };
    if (isRemote === 'true') query.isRemote = true;
    else if (isRemote === 'false') query.isRemote = { $ne: true };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [docs, total] = await Promise.all([
      ScrapedCompany.find(query).sort({ scrapedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      ScrapedCompany.countDocuments(query),
    ]);

    // Normalize: old records saved before emails/contactNumbers/socialLinks were
    // added to the schema won't have those fields in MongoDB — default them here.
    const companies = docs.map((c) => ({
      ...c,
      emails: (c as Record<string, unknown>).emails ?? [],
      contactNumbers: (c as Record<string, unknown>).contactNumbers ?? [],
      socialLinks: (c as Record<string, unknown>).socialLinks ?? {},
      address: (c as Record<string, unknown>).address ?? '',
      city: (c as Record<string, unknown>).city ?? '',
      state: (c as Record<string, unknown>).state ?? '',
    }));

    res.json({
      companies,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
};

export const getScrapedCompanyFilterOptions = async (_req: Request, res: Response) => {
  try {
    const [cities, states] = await Promise.all([
      ScrapedCompany.distinct('city'),
      ScrapedCompany.distinct('state'),
    ]);
    const clean = (arr: unknown[]) =>
      (arr as string[]).filter((v) => v && v.trim()).sort((a, b) => a.localeCompare(b));
    res.json({ cities: clean(cities), states: clean(states) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
};

export const startRescrapeDetails = async (req: Request, res: Response) => {
  const { mode = 'missing' } = req.body as { mode?: 'missing' | 'all' };

  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  res.json({ sessionId });

  runRescrapeDetails(sessionId, mode).catch((e) =>
    console.error('Re-scrape fatal error:', e)
  );
};

const BAD_WEBSITE_DOMAINS = [
  'naukritalentcloud.com',
  'naukri.com',
  'naukrigulf.com',
  'hirist.com',
  'hirist.tech',
  'jobhai.com',
  'infoedge.in',
  'infoedge.com',
  '99acres.com',
  'jeevansathi.com',
  'shiksha.com',
  'firstnaukri.com',
  'play.google.com',
  'apps.apple.com',
  'hirist.com',
  'glassdoor.com',
  'ambitionbox.com',
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'youtube.com',
  'google.com',
];

export const cleanBadWebsiteUrls = async (_req: Request, res: Response) => {
  try {
    const domainRegex = BAD_WEBSITE_DOMAINS.map(d => d.replace('.', '\\.')).join('|');
    const result = await ScrapedCompany.updateMany(
      { website: { $regex: domainRegex, $options: 'i' } },
      { $set: { website: '' } },
    );
    res.json({ updated: result.modifiedCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
};

export const startFillCityState = async (_req: Request, res: Response) => {
  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  res.json({ sessionId });
  runFillCityState(sessionId).catch((e) => console.error('Fill city/state fatal error:', e));
};

export const deleteScrapedCompany = async (req: Request, res: Response) => {
  try {
    await ScrapedCompany.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
};

export const syncScrapedCompanyToCompany = async (req: Request, res: Response) => {
  try {
    const scraped = await ScrapedCompany.findById(req.params.id).lean() as Record<string, unknown> | null;
    if (!scraped) return res.status(404).json({ error: 'Scraped company not found' });

    // Map scraped fields → Company schema
    const emails = (scraped.emails as string[] | undefined) ?? [];
    const phones = (scraped.contactNumbers as string[] | undefined) ?? [];

    const companyData = {
      companyName: scraped.companyName as string,
      address: (scraped.address as string) || (scraped.headquarters as string) || '',
      website: (scraped.website as string) || '',
      hrEmail: emails[0] || null,
      email: emails[1] || null,
      coreServicesDomain: (scraped.industry as string) || null,
      contactNumber: phones[0] || null,
      contactNumber2: phones[1] || null,
      city: (scraped.city as string) || null,
      state: (scraped.state as string) || null,
    };

    // Create or update Company (upsert by name)
    const company = await Company.findOneAndUpdate(
      { companyName: { $regex: new RegExp(`^${(scraped.companyName as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { $setOnInsert: companyData },
      { upsert: true, new: true }
    );

    // Mark scraped record as synced
    await ScrapedCompany.findByIdAndUpdate(req.params.id, {
      $set: { syncedToCompany: true, linkedCompanyId: company._id },
    });

    res.json({ company, message: 'Synced successfully' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
};

export const bulkSyncScrapedCompanies = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const scraped = await ScrapedCompany.find({ _id: { $in: ids } }).lean() as Record<string, unknown>[];

    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const s of scraped) {
      try {
        const emails = (s.emails as string[] | undefined) ?? [];
        const phones = (s.contactNumbers as string[] | undefined) ?? [];
        const companyData = {
          companyName: s.companyName as string,
          address: (s.address as string) || (s.headquarters as string) || '',
          website: (s.website as string) || '',
          hrEmail: emails[0] || null,
          email: emails[1] || null,
          coreServicesDomain: (s.industry as string) || null,
          contactNumber: phones[0] || null,
          contactNumber2: phones[1] || null,
          city: (s.city as string) || null,
          state: (s.state as string) || null,
        };

        const company = await Company.findOneAndUpdate(
          { companyName: { $regex: new RegExp(`^${(s.companyName as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          { $setOnInsert: companyData },
          { upsert: true, new: true }
        );

        await ScrapedCompany.findByIdAndUpdate(s._id, {
          $set: { syncedToCompany: true, linkedCompanyId: company._id },
        });
        synced++;
      } catch {
        errors.push(s.companyName as string);
        skipped++;
      }
    }

    res.json({ synced, skipped, errors });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
};

export const bulkDeleteScrapedCompanies = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    const result = await ScrapedCompany.deleteMany({ _id: { $in: ids } });
    res.json({ deletedCount: result.deletedCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
};
