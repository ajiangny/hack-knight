import { Router, Request, Response } from "express";
import { supabase } from "../db/supabase.js";
import { authenticateAdmin } from "../middleware/auth.js";
import { SiteSetting, UpdateSiteSettingBody } from "../types.js";

const settingsRouter = Router();

// GET /api/settings  (public) — flattened { key: value } map
settingsRouter.get("/", async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from("site_settings").select("*");

  if (error) {
    res.status(500).json({ message: "Failed to fetch settings" });
    return;
  }

  const map = Object.fromEntries(
    (data as SiteSetting[]).map((s) => [s.key, s.value]),
  );
  res.json(map);
});

// PUT /api/settings/:key  (admin) — write a setting's value.
//
// Upsert, not update: migrations deliberately do not seed site_settings (the
// rows come from the production dump in supabase/seed.sql, and seeding a key in
// both places breaks `db reset` on a duplicate key). So a brand-new setting has
// no row until an admin saves it, and callers must treat a missing key as its
// default rather than expecting one to exist.
settingsRouter.put(
  "/:key",
  authenticateAdmin,
  async (
    req: Request<{ key: string }, {}, UpdateSiteSettingBody>,
    res: Response,
  ) => {
    if (!req.body.value) {
      res.status(422).json({ message: "Value is required" });
      return;
    }

    const { data, error } = await supabase
      .from("site_settings")
      .upsert(
        {
          key: req.params.key,
          value: req.body.value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      )
      .select()
      .maybeSingle();

    if (error) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    res.json(data);
  },
);

export default settingsRouter;
