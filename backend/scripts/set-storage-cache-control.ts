// One-time migration: re-upload every object in the photos bucket with a
// long cacheControl. Objects uploaded before the routes passed cacheControl
// were stored with `no-cache`, so browsers re-validate every image on every
// <img> mount (e.g. each gallery year switch). Filenames are random UUIDs —
// content at a URL never changes — so a one-year max-age is safe.
//
// Storage metadata can't be edited in place; the only way to change it is to
// upload the same bytes again with `upsert: true`. Safe to re-run: already
// migrated objects are just re-uploaded with the same setting.
//
// Run against the environment in backend/.env:
//   npx tsx scripts/set-storage-cache-control.ts
// For production, run with the production SUPABASE_URL / SUPABASE_SECRET_KEY.

import "dotenv/config";
import { IMMUTABLE_CACHE, supabase } from "../src/db/supabase.js";

const BUCKET = "photos";

// storage.list() is per-folder, so walk the tree.
async function listFiles(prefix: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 1000,
  });
  if (error) throw new Error(`list("${prefix}") failed: ${error.message}`);

  const files: string[] = [];
  for (const entry of data ?? []) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    // Folders come back with a null id; files have one.
    if (entry.id) files.push(path);
    else files.push(...(await listFiles(path)));
  }
  return files;
}

async function main() {
  const files = await listFiles("");
  console.log(`${files.length} objects in "${BUCKET}"`);

  let migrated = 0;
  for (const path of files) {
    const { data, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(path);
    if (downloadError || !data) {
      console.error(`SKIP ${path}: download failed (${downloadError?.message})`);
      continue;
    }

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, await data.arrayBuffer(), {
        contentType: data.type || undefined,
        cacheControl: IMMUTABLE_CACHE,
        upsert: true,
      });
    if (uploadError) {
      console.error(`SKIP ${path}: upload failed (${uploadError.message})`);
      continue;
    }

    migrated += 1;
    console.log(`OK   ${path}`);
  }

  console.log(`Done: ${migrated}/${files.length} migrated`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
