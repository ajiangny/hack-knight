import { Router, Request, Response } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { IMMUTABLE_CACHE, supabase } from "../db/supabase.js";
import { authenticateAdmin } from "../middleware/auth.js";
import { ReorderBody, Sponsor, SponsorTier } from "../types.js";

const SPONSOR_TIERS: SponsorTier[] = ["platinum", "gold", "silver", "bronze"];

const sponsorsRouter = Router();

const BUCKET = "photos";
// Sponsor logos live in their own folder of the bucket. Rows migrated from
// the companies table still point at files under companies/ that may also
// back a team badge, so deletes are restricted to this folder (see
// storagePathFromPublicUrl).
const FOLDER = "sponsors";

// In-memory upload; compressed client-side, well under Vercel's 4.5 MB limit.
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Derive the in-bucket storage path from a public URL so we can delete the
 * underlying object — but only for objects this route owns (under FOLDER/).
 * Public URLs look like:
 *   {SUPABASE_URL}/storage/v1/object/public/photos/{path}
 */
function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const path = url.slice(idx + marker.length);
  return path.startsWith(`${FOLDER}/`) ? path : null;
}

async function uploadToStorage(
  file: Express.Multer.File,
): Promise<string | null> {
  const ext = file.originalname.split(".").pop() ?? "png";
  const path = `${FOLDER}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      cacheControl: IMMUTABLE_CACHE,
      upsert: false,
    });

  if (error) return null;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrl;
}

// GET /api/sponsors  (public) — powers the homepage row/carousel and the
// /sponsors page. Ordered by the admin's drag order; the frontend groups
// by tier.
sponsorsRouter.get("/", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("sponsors")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    res.status(500).json({ message: "Failed to fetch sponsors" });
    return;
  }
  res.json(data);
});

// PUT /api/sponsors/reorder  (admin) - batch-update sort orders after a
// drag. Registered before /:id so Express doesn't treat "reorder" as an id.
sponsorsRouter.put(
  "/reorder",
  authenticateAdmin,
  async (req: Request<{}, {}, ReorderBody>, res: Response) => {
    const { order } = req.body;
    if (!Array.isArray(order) || order.length === 0) {
      res.status(422).json({ message: "Order is required" });
      return;
    }

    const results = await Promise.all(
      order.map((o) =>
        supabase
          .from("sponsors")
          .update({ sort_order: o.sort_order })
          .eq("id", o.id),
      ),
    );

    if (results.some((r) => r.error)) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    res.status(204).send();
  },
);

// POST /api/sponsors  (admin) — create a sponsor with its logo. Unlike the
// old companies-based model, a tier is always required.
sponsorsRouter.post(
  "/",
  authenticateAdmin,
  upload.single("logo"),
  async (
    req: Request<{}, {}, { name: string; tier: string; url?: string; blurb?: string }>,
    res: Response,
  ) => {
    const { name, tier } = req.body;
    if (!name) {
      res.status(422).json({ message: "Name is required" });
      return;
    }
    if (!SPONSOR_TIERS.includes(tier as SponsorTier)) {
      res.status(422).json({ message: "Invalid sponsor tier" });
      return;
    }
    if (!req.file) {
      res.status(422).json({ message: "Logo is required" });
      return;
    }

    const logoUrl = await uploadToStorage(req.file);
    if (!logoUrl) {
      res.status(500).json({ message: "Logo upload failed" });
      return;
    }

    const { data, error } = await supabase
      .from("sponsors")
      .insert({
        name,
        logo_url: logoUrl,
        tier,
        url: req.body.url || null,
        blurb: req.body.blurb || null,
      })
      .select()
      .single();

    if (error) {
      // Roll back the orphaned logo.
      const path = storagePathFromPublicUrl(logoUrl);
      if (path) await supabase.storage.from(BUCKET).remove([path]);
      if (error.code === "23505") {
        res.status(409).json({ message: "Sponsor already exists" });
        return;
      }
      res.status(500).json({ message: "Server error" });
      return;
    }
    res.status(201).json(data);
  },
);

// PUT /api/sponsors/:id  (admin) — rename, change tier/url/blurb, and/or
// replace the logo.
sponsorsRouter.put(
  "/:id",
  authenticateAdmin,
  upload.single("logo"),
  async (
    req: Request<
      { id: string },
      {},
      { name?: string; tier?: string; url?: string; blurb?: string }
    >,
    res: Response,
  ) => {
    const { data: existing, error: fetchError } = await supabase
      .from("sponsors")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchError) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    if (!existing) {
      res.status(404).json({ message: "Sponsor not found" });
      return;
    }
    const sponsor = existing as Sponsor;

    // Every sponsor has a tier, so an update can change it but never clear it.
    if (
      req.body.tier !== undefined &&
      !SPONSOR_TIERS.includes(req.body.tier as SponsorTier)
    ) {
      res.status(422).json({ message: "Invalid sponsor tier" });
      return;
    }

    const updates: Partial<Sponsor> = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.tier !== undefined) updates.tier = req.body.tier as SponsorTier;
    if (req.body.url !== undefined) updates.url = req.body.url || null;
    if (req.body.blurb !== undefined) updates.blurb = req.body.blurb || null;

    let oldPath: string | null = null;
    if (req.file) {
      const url = await uploadToStorage(req.file);
      if (!url) {
        res.status(500).json({ message: "Logo upload failed" });
        return;
      }
      updates.logo_url = url;
      oldPath = storagePathFromPublicUrl(sponsor.logo_url);
    }

    if (Object.keys(updates).length === 0) {
      res.status(422).json({ message: "No fields to update" });
      return;
    }

    const { data, error } = await supabase
      .from("sponsors")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        res.status(409).json({ message: "Sponsor already exists" });
        return;
      }
      res.status(500).json({ message: "Server error" });
      return;
    }

    if (oldPath) {
      await supabase.storage.from(BUCKET).remove([oldPath]);
    }
    res.json(data);
  },
);

// DELETE /api/sponsors/:id  (admin) — remove the sponsor and its logo file
// (only when the file lives under sponsors/; see storagePathFromPublicUrl)
sponsorsRouter.delete(
  "/:id",
  authenticateAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const { data: sponsor, error: fetchError } = await supabase
      .from("sponsors")
      .select("logo_url")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchError) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    if (!sponsor) {
      res.status(404).json({ message: "Sponsor not found" });
      return;
    }

    const path = storagePathFromPublicUrl(
      (sponsor as Pick<Sponsor, "logo_url">).logo_url,
    );
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]);
    }

    const { error } = await supabase
      .from("sponsors")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    res.status(204).send();
  },
);

export default sponsorsRouter;
