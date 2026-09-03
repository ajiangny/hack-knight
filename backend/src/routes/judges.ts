// Judges CRUD — a leaner copy of routes/team.ts: photo only (no character
// badge, no social links), company badges shared with the team via the
// companies table.

import { Router, Request, Response } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { IMMUTABLE_CACHE, supabase } from "../db/supabase.js";
import { authenticateAdmin } from "../middleware/auth.js";
import {
  Company,
  CreateJudgeBody,
  Judge,
  JudgeWithCompanies,
  ReorderBody,
  UpdateJudgeBody,
} from "../types.js";

const judgesRouter = Router();

const BUCKET = "photos";

// In-memory upload; compressed client-side, well under Vercel's 4.5 MB limit.
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Derive the in-bucket storage path from a public URL so we can delete the
 * underlying object. Public URLs look like:
 *   {SUPABASE_URL}/storage/v1/object/public/photos/{path}
 */
function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

// Upload a single file to storage and return its public URL.
async function uploadToStorage(
  file: Express.Multer.File,
): Promise<string | null> {
  const ext = file.originalname.split(".").pop() ?? "jpg";
  const path = `judges/${randomUUID()}.${ext}`;

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

// GET /api/judges  (public) — judges with their company badges embedded
judgesRouter.get("/", async (_req: Request, res: Response) => {
  res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  const [judgesRes, companiesRes] = await Promise.all([
    supabase.from("judges").select("*").order("sort_order", { ascending: true }),
    supabase.from("companies").select("*"),
  ]);

  if (judgesRes.error || companiesRes.error) {
    res.status(500).json({ message: "Failed to fetch judges" });
    return;
  }

  const companiesById = new Map(
    (companiesRes.data as Company[]).map((c) => [c.id, c]),
  );
  const result: JudgeWithCompanies[] = (judgesRes.data as Judge[]).map((j) => ({
    ...j,
    companies: [j.company1_id, j.company2_id]
      .map((id) => (id ? companiesById.get(id) : undefined))
      .filter((c): c is Company => !!c),
  }));

  res.json(result);
});

// POST /api/judges  (admin) - create a judge with photo
judgesRouter.post(
  "/",
  authenticateAdmin,
  upload.single("photo"),
  async (req: Request<{}, {}, CreateJudgeBody>, res: Response) => {
    const { name, title } = req.body;

    if (!name || !title) {
      res.status(422).json({ message: "Name and title are required" });
      return;
    }
    if (!req.file) {
      res.status(422).json({ message: "Photo is required" });
      return;
    }

    const photoUrl = await uploadToStorage(req.file);
    if (!photoUrl) {
      res.status(500).json({ message: "Photo upload failed" });
      return;
    }

    const { data, error } = await supabase
      .from("judges")
      .insert({
        name,
        title,
        photo_url: photoUrl,
        company1_id: req.body.company1_id || null,
        company2_id: req.body.company2_id || null,
        sort_order: req.body.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      // Roll back the orphaned storage object.
      const path = storagePathFromPublicUrl(photoUrl);
      if (path) await supabase.storage.from(BUCKET).remove([path]);
      res.status(500).json({ message: "Server error" });
      return;
    }
    res.status(201).json(data);
  },
);

// PUT /api/judges/reorder  (admin) - batch-update sort orders after a drag.
// Registered before /:id so Express doesn't treat "reorder" as a judge id.
judgesRouter.put(
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
          .from("judges")
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

// PUT /api/judges/:id  (admin) - update info, optionally replace photo
judgesRouter.put(
  "/:id",
  authenticateAdmin,
  upload.single("photo"),
  async (req: Request<{ id: string }, {}, UpdateJudgeBody>, res: Response) => {
    const { data: existing, error: fetchError } = await supabase
      .from("judges")
      .select("*")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchError) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    if (!existing) {
      res.status(404).json({ message: "Judge not found" });
      return;
    }
    const judge = existing as Judge;

    const updates: Partial<Judge> = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.sort_order !== undefined)
      updates.sort_order = req.body.sort_order;
    if (req.body.company1_id !== undefined)
      updates.company1_id = req.body.company1_id || null;
    if (req.body.company2_id !== undefined)
      updates.company2_id = req.body.company2_id || null;

    const oldPaths: string[] = [];
    if (req.file) {
      const url = await uploadToStorage(req.file);
      if (!url) {
        res.status(500).json({ message: "Photo upload failed" });
        return;
      }
      updates.photo_url = url;
      const old = storagePathFromPublicUrl(judge.photo_url);
      if (old) oldPaths.push(old);
    }

    if (Object.keys(updates).length === 0) {
      res.status(422).json({ message: "No fields to update" });
      return;
    }

    const { data, error } = await supabase
      .from("judges")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) {
      res.status(500).json({ message: "Server error" });
      return;
    }

    // Clean up the replaced storage object after a successful update.
    if (oldPaths.length > 0) {
      await supabase.storage.from(BUCKET).remove(oldPaths);
    }

    res.json(data);
  },
);

// DELETE /api/judges/:id  (admin) - remove judge + their photo
judgesRouter.delete(
  "/:id",
  authenticateAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const { data: judge, error: fetchError } = await supabase
      .from("judges")
      .select("photo_url")
      .eq("id", req.params.id)
      .maybeSingle();

    if (fetchError) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    if (!judge) {
      res.status(404).json({ message: "Judge not found" });
      return;
    }

    const path = storagePathFromPublicUrl(
      (judge as Pick<Judge, "photo_url">).photo_url,
    );
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]);
    }

    const { error } = await supabase
      .from("judges")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    res.status(204).send();
  },
);

export default judgesRouter;
