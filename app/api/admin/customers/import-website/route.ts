import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/staff";
import { AiNotConfiguredError } from "@/lib/ai";
import { readSite, WebsiteFetchError } from "@/lib/website-import/fetch-site";
import { extractProfile } from "@/lib/website-import/extract";

// Reading a few pages plus one model call; well inside a minute.
export const maxDuration = 60;

// Reads a business's website and returns proposed setup-wizard fields.
// Nothing is saved: staff review the filled form before launching.
export async function POST(req: NextRequest) {
  await requireStaff();

  const body = (await req.json().catch(() => ({}))) as { url?: unknown };
  if (typeof body.url !== "string" || !body.url.trim()) {
    return NextResponse.json({ error: "Enter the business's website address." }, { status: 400 });
  }

  try {
    const site = await readSite(body.url);
    const { profile, provider, model } = await extractProfile(site);
    console.log(
      `[import-website] ${site.pages.length} page(s) from ${new URL(site.pages[0].url).hostname} via ${provider}/${model}: ${Object.keys(profile).length} field(s)`
    );
    return NextResponse.json({
      profile,
      pagesRead: site.pages.map((p) => p.url),
      provider,
    });
  } catch (err) {
    if (err instanceof WebsiteFetchError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: "Website import isn't set up on this server yet." }, { status: 503 });
    }
    console.error("[import-website] failed:", err);
    return NextResponse.json(
      { error: "Couldn't read the website right now. Try again, or fill the form in by hand." },
      { status: 502 }
    );
  }
}
