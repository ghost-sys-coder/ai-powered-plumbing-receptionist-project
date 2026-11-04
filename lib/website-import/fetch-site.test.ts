import { describe, expect, it, vi } from "vitest";
import { fetchPage, htmlToText, isPrivateAddress, normalizeUrl, pickUsefulLinks, WebsiteFetchError } from "./fetch-site";

describe("normalizeUrl", () => {
  it("adds https and drops the fragment", () => {
    expect(normalizeUrl(" example.com/about#team ").toString()).toBe("https://example.com/about");
  });

  it.each(["ftp://example.com", "file:///etc/passwd", "https://user:pw@example.com", "http://example.com:8080", ""])(
    "rejects %s",
    (input) => {
      expect(() => normalizeUrl(input)).toThrow(WebsiteFetchError);
    }
  );
});

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0",
    "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1", "not-an-ip",
  ])("blocks %s", (ip) => expect(isPrivateAddress(ip)).toBe(true));

  it.each(["8.8.8.8", "172.32.0.1", "93.184.216.34", "2606:4700::1111", "::ffff:8.8.8.8"])(
    "allows %s",
    (ip) => expect(isPrivateAddress(ip)).toBe(false)
  );
});

describe("fetchPage", () => {
  it("refuses private IP literals before fetching", async () => {
    const fetchImpl = vi.fn();
    await expect(fetchPage(new URL("http://169.254.169.254/latest/meta-data"), fetchImpl)).rejects.toThrow(
      /private network/
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("checks redirect targets too", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } }));
    await expect(fetchPage(new URL("https://8.8.8.8/"), fetchImpl)).rejects.toThrow(/private network/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects non-HTML responses", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("%PDF", { status: 200, headers: { "content-type": "application/pdf" } }));
    await expect(fetchPage(new URL("https://8.8.8.8/x"), fetchImpl)).rejects.toThrow(/isn't a web page/);
  });
});

describe("htmlToText", () => {
  it("keeps title, description, JSON-LD and visible text, drops scripts", () => {
    const html = `<html><head><title>Joe&apos;s Plumbing</title>
      <meta name="description" content="24/7 plumbers in Leeds">
      <script type="application/ld+json">{"@type":"Plumber","telephone":"0113 496 0000"}</script>
      <script>trackEverything()</script><style>.x{}</style></head>
      <body><h1>Welcome</h1><p>Call us &amp; save</p><ul><li>Mon&ndash;Fri 8&ndash;5</li></ul></body></html>`;
    const text = htmlToText(html);
    expect(text).toContain("Title: Joe's Plumbing");
    expect(text).toContain("Description: 24/7 plumbers in Leeds");
    expect(text).toContain('"telephone":"0113 496 0000"');
    expect(text).toContain("Call us & save");
    expect(text).toContain("Mon–Fri 8–5");
    expect(text).not.toContain("trackEverything");
  });
});

describe("pickUsefulLinks", () => {
  it("picks same-site contact/service pages only", () => {
    const html = `
      <a href="/contact-us">Contact</a>
      <a href="https://www.example.com/services/">Services</a>
      <a href="/blog/post">Blog</a>
      <a href="https://other.com/contact">Elsewhere</a>
      <a href="/contact-us#form">Dup</a>
      <a href="/prices.pdf">PDF</a>
      <a href="mailto:hi@example.com">Mail</a>`;
    const links = pickUsefulLinks(html, new URL("https://example.com/")).map(String);
    expect(links).toEqual(["https://example.com/contact-us", "https://www.example.com/services/"]);
  });
});
