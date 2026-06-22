import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

async function main(): Promise<void> {
    const fixtureName = process.argv[2];
    if (!fixtureName) {
        console.error("Usage: npx tsx scripts/replay-webhook.ts <fixture-name>");
        console.error("       e.g. npx tsx scripts/replay-webhook.ts vapi-end-of-call-report");
        process.exit(1);
    }

    const target = process.env.VAPI_REPLAY_URL ?? "http://localhost:3000/api/webhooks/vapi";
    const fixturePath = resolve(
        process.cwd(),
        "docs",
        "fixtures",
        fixtureName.endsWith(".json") ? fixtureName : `${fixtureName}.json`
    );

    let raw: string;
    try {
        raw = await readFile(fixturePath, "utf8");
    } catch {
        console.error(`Could not read fixture at ${fixturePath}`);
        process.exit(1);
    }

    const res = await fetch(target, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: raw,
    });

    const body = await res.text();
    console.log(`POST ${target}`);
    console.log(`  status: ${res.status}`);
    console.log(`  body:   ${body}`);

    if (!res.ok) process.exit(1);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
