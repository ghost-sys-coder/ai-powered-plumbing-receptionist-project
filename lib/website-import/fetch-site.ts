import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Reads a business's public website as plain text: the page the user gave
// plus a few likely-useful pages it links to (contact, about, services…).
//
// The URL is user-supplied, so every hop is checked against private and
// internal addresses (no reaching our own infrastructure or cloud metadata),
// redirects are followed manually so each target is checked too, and size and
// time are capped. A DNS answer could still change between our check and the
// fetch; the feature is staff-only and returns text to the same staff, which
// keeps that residual risk acceptable.

export class WebsiteFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebsiteFetchError";
  }
}

const PAGE_TIMEOUT_MS = 10_000;
const MAX_PAGE_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;
const MAX_EXTRA_PAGES = 4;
const MAX_PAGE_CHARS = 12_000;
const MAX_TOTAL_CHARS = 40_000;
const USER_AGENT = "Mozilla/5.0 (compatible; ReceptionistSetupBot/1.0; reads public business info)";

export function normalizeUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new WebsiteFetchError("Enter the business's website address.");
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new WebsiteFetchError(`"${trimmed}" isn't a valid web address.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new WebsiteFetchError("Only http and https websites can be read.");
  }
  if (url.username || url.password) throw new WebsiteFetchError("Web addresses with a login can't be read.");
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new WebsiteFetchError("Only websites on the standard ports can be read.");
  }
  url.hash = "";
  return url;
}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;
}

const PRIVATE_V4: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3], // multicast + reserved
];

export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const n = ipv4ToInt(ip);
    return PRIVATE_V4.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      lower === "::" ||
      lower === "::1" ||
      /^f[cd]/.test(lower) || // unique local fc00::/7
      /^fe[89ab]/.test(lower) || // link-local fe80::/10
      /^ff/.test(lower) // multicast
    );
  }
  return true; // not an IP at all — refuse rather than guess
}

async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (/^localhost$|\.localhost$|\.local$|\.internal$/i.test(host)) {
    throw new WebsiteFetchError("That address points to a private network.");
  }
  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await lookup(host, { all: true })).map((a) => a.address);
    } catch {
      throw new WebsiteFetchError(`Couldn't find a website at ${host}. Check the address.`);
    }
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new WebsiteFetchError("That address points to a private network.");
  }
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_PAGE_BYTES) {
      await reader.cancel();
      break; // keep what we have; the top of a page holds most of what we need
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}

export type FetchedPage = { url: string; html: string };

export async function fetchPage(start: URL, fetchImpl: typeof fetch = fetch): Promise<FetchedPage> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url.hostname);
    let res: Response;
    try {
      res = await fetchImpl(url, {
        redirect: "manual",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      });
    } catch (err) {
      const timedOut = (err as Error).name === "TimeoutError";
      throw new WebsiteFetchError(
        timedOut ? `${url.hostname} took too long to respond.` : `Couldn't reach ${url.hostname}.`
      );
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new WebsiteFetchError(`${url.hostname} sent a redirect with no destination.`);
      url = normalizeUrl(new URL(location, url).toString());
      continue;
    }
    // We identify ourselves honestly; sites that refuse automated readers are
    // respected, and staff fill the form in by hand.
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      throw new WebsiteFetchError(
        `${url.hostname} blocks automated reading, so it can't be imported. Fill the form in by hand.`
      );
    }
    if (!res.ok) throw new WebsiteFetchError(`${url.hostname} answered with an error (${res.status}).`);
    const type = res.headers.get("content-type") ?? "";
    if (type && !/html|xml/i.test(type)) {
      throw new WebsiteFetchError("That address isn't a web page.");
    }
    return { url: url.toString(), html: await readCapped(res) };
  }
  throw new WebsiteFetchError(`${start.hostname} redirected too many times.`);
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", hellip: "…",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

// Visible text plus the parts of <head> that describe the business: title,
// meta description and schema.org JSON-LD (often holds hours and address).
export function htmlToText(html: string): string {
  const parts: string[] = [];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) parts.push(`Title: ${decodeEntities(title).trim()}`);
  const description = html.match(
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i
  )?.[1];
  if (description) parts.push(`Description: ${decodeEntities(description).trim()}`);
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    parts.push(`Structured data: ${m[1].replace(/\s+/g, " ").trim().slice(0, 3000)}`);
  }

  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/i, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|header|footer|address|dt|dd)>/gi, "\n")
    .replace(/<(td|th)[^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, " ");
  const text = decodeEntities(body)
    .split("\n")
    .map((line) => line.replace(/[ \t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  parts.push(text);
  return parts.join("\n").slice(0, MAX_PAGE_CHARS);
}

const USEFUL_PATH = /contact|about|service|pricing|price|rates|fees|hours|location|book|appointment|faq|menu|treatments/i;

// Same-site links whose path suggests contact, hours, services or prices.
export function pickUsefulLinks(html: string, base: URL, limit = MAX_EXTRA_PAGES): URL[] {
  const baseHost = base.hostname.replace(/^www\./, "");
  const seen = new Set<string>([base.toString()]);
  const picked: URL[] = [];
  for (const m of html.matchAll(/<a\s[^>]*href=["']([^"'#]+)["']/gi)) {
    let url: URL;
    try {
      url = new URL(decodeEntities(m[1]), base);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    if (url.hostname.replace(/^www\./, "") !== baseHost) continue;
    if (/\.(pdf|jpe?g|png|gif|webp|zip|docx?|mp4)$/i.test(url.pathname)) continue;
    if (!USEFUL_PATH.test(url.pathname)) continue;
    url.hash = "";
    url.search = "";
    const key = url.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(url);
    if (picked.length >= limit) break;
  }
  return picked;
}

export type SiteText = { pages: Array<{ url: string; text: string }> };

export async function readSite(input: string, fetchImpl: typeof fetch = fetch): Promise<SiteText> {
  const home = await fetchPage(normalizeUrl(input), fetchImpl);
  const homeUrl = new URL(home.url);
  const extras = await Promise.allSettled(
    pickUsefulLinks(home.html, homeUrl).map((u) => fetchPage(u, fetchImpl))
  );

  const pages = [home, ...extras.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []))];
  let budget = MAX_TOTAL_CHARS;
  const out: SiteText["pages"] = [];
  for (const page of pages) {
    if (budget <= 0) break;
    const text = htmlToText(page.html).slice(0, budget);
    if (!text.trim()) continue;
    out.push({ url: page.url, text });
    budget -= text.length;
  }
  if (out.length === 0 || out.every((p) => p.text.length < 200)) {
    throw new WebsiteFetchError(
      "That website has almost no readable text (it may be built entirely in JavaScript). Fill the form in by hand."
    );
  }
  return { pages: out };
}
