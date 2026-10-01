// Upload the sample images that supabase/seeds/dummy.sql points at into the
// LOCAL photos bucket. SQL seeds can only insert rows, not file bytes, and
// `supabase db reset` drops storage metadata, so re-run this after each reset:
//   npx tsx scripts/seed-storage.ts
//
// Images come from the frontend's bundled assets and land under seed/ at
// fixed paths. Safe to re-run: uploads use `upsert: true`.

import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { IMMUTABLE_CACHE, supabase } from "../src/db/supabase.js";

const BUCKET = "photos";

// This writes to storage, so never let it touch the cloud project.
const { hostname } = new URL(process.env.SUPABASE_URL ?? "");
if (hostname !== "127.0.0.1" && hostname !== "localhost") {
  console.error(
    `Refusing to seed storage: SUPABASE_URL (${hostname}) is not local.`,
  );
  process.exit(1);
}

const assets = resolve(__dirname, "../../frontend/src/assets");

// [path in the bucket, source file relative to frontend/src/assets/]
const FILES: [string, string][] = [
  ["seed/member.png", "images/cfacody.png"],
  ["seed/badge.png", "images/hackknightcody.png"],
  ["seed/logo.png", "logos/placeholder.png"],
  ...[1, 2, 3, 4, 5, 6].flatMap((n): [string, string][] => [
    [`seed/gallery/2024/${n}.webp`, `photos/2024/hackknight_${n}.webp`],
    [`seed/gallery/2025/${n}.webp`, `photos/2025/hackknight25_${n}.webp`],
  ]),
];

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  webp: "image/webp",
};

async function main() {
  for (const [dest, src] of FILES) {
    const bytes = await readFile(resolve(assets, src));
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(dest, bytes, {
        contentType: CONTENT_TYPES[dest.split(".").pop()!],
        cacheControl: IMMUTABLE_CACHE,
        upsert: true,
      });
    if (error) throw new Error(`upload ${dest} failed: ${error.message}`);
    console.log(`OK   ${dest}`);
  }
  console.log(`Done: ${FILES.length} files uploaded to "${BUCKET}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
