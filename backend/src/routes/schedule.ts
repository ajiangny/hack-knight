import { Router, Request, Response } from "express";
import { supabase } from "../db/supabase.js";
import {
  CreateScheduleEventBody,
  UpdateScheduleEventBody,
  ScheduleEventTypeBody,
} from "../types.js";
import { authenticateAdmin } from "../middleware/auth.js";
import { isScheduleColor } from "../lib/scheduleColors.js";

const scheduleRouter = Router();

// Events are read with their type's color joined in, then flattened so
// clients keep seeing a plain `color` field. Rows without a type (loaded
// from an older seed dump) fall back to the legacy color column.
const EVENT_SELECT = "*, type:schedule_event_types(color)";

type EventRowWithType = Record<string, unknown> & {
  color: string;
  type: { color: string } | null;
};

function flattenEvent(row: EventRowWithType) {
  const { type, ...event } = row;
  return { ...event, color: type?.color ?? event.color };
}

// Picks the writable event columns out of a request body.
function eventFields(body: UpdateScheduleEventBody) {
  const fields: UpdateScheduleEventBody = {};
  if (body.day !== undefined) fields.day = body.day;
  if (body.start_hour !== undefined) fields.start_hour = body.start_hour;
  if (body.end_hour !== undefined) fields.end_hour = body.end_hour;
  if (body.label !== undefined) fields.label = body.label;
  if (body.type_id !== undefined) fields.type_id = body.type_id;
  if (body.sort_order !== undefined) fields.sort_order = body.sort_order;
  return fields;
}

async function typeExists(id: string): Promise<boolean> {
  const { data } = await supabase
    .from("schedule_event_types")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  return data !== null;
}

// GET /api/schedule  (public)
scheduleRouter.get("/", async (_req: Request, res: Response) => {
  res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  const { data, error } = await supabase
    .from("schedule_events")
    .select(EVENT_SELECT)
    .order("start_hour", { ascending: true });

  if (error) {
    res.status(500).json({ message: "Failed to fetch schedule" });
    return;
  }
  res.json((data as EventRowWithType[]).map(flattenEvent));
});

// GET /api/schedule/days  (public)
scheduleRouter.get("/days", async (_req: Request, res: Response) => {
  res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  const { data, error } = await supabase
    .from("schedule_days")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    res.status(500).json({ message: "Failed to fetch days" });
    return;
  }
  res.json(data);
});

// GET /api/schedule/types  (public)
scheduleRouter.get("/types", async (_req: Request, res: Response) => {
  res.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  const { data, error } = await supabase
    .from("schedule_event_types")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    res.status(500).json({ message: "Failed to fetch event types" });
    return;
  }
  res.json(data);
});

// POST /api/schedule/types  (admin)
scheduleRouter.post(
  "/types",
  authenticateAdmin,
  async (req: Request<{}, {}, ScheduleEventTypeBody>, res: Response) => {
    const label = req.body.label?.trim();
    if (!label) {
      res.status(422).json({ message: "Label is required" });
      return;
    }
    if (!isScheduleColor(req.body.color)) {
      res.status(422).json({ message: "Invalid color" });
      return;
    }

    const { data, error } = await supabase
      .from("schedule_event_types")
      .insert({
        label,
        color: req.body.color,
        sort_order: req.body.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    res.status(201).json(data);
  },
);

// PUT /api/schedule/types/:id  (admin)
scheduleRouter.put(
  "/types/:id",
  authenticateAdmin,
  async (
    req: Request<{ id: string }, {}, ScheduleEventTypeBody>,
    res: Response,
  ) => {
    const fields: ScheduleEventTypeBody = {};
    if (req.body.label !== undefined) {
      const label = req.body.label.trim();
      if (!label) {
        res.status(422).json({ message: "Label is required" });
        return;
      }
      fields.label = label;
    }
    if (req.body.color !== undefined) {
      if (!isScheduleColor(req.body.color)) {
        res.status(422).json({ message: "Invalid color" });
        return;
      }
      fields.color = req.body.color;
    }
    if (req.body.sort_order !== undefined) {
      fields.sort_order = req.body.sort_order;
    }

    const { data, error } = await supabase
      .from("schedule_event_types")
      .update(fields)
      .eq("id", req.params.id)
      .select()
      .maybeSingle();

    if (error) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    if (!data) {
      res.status(404).json({ message: "Event type not found" });
      return;
    }
    res.json(data);
  },
);

// DELETE /api/schedule/types/:id  (admin)
scheduleRouter.delete(
  "/types/:id",
  authenticateAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const { error } = await supabase
      .from("schedule_event_types")
      .delete()
      .eq("id", req.params.id);

    // 23503 = foreign_key_violation: events still point at this type.
    if (error?.code === "23503") {
      res
        .status(409)
        .json({ message: "Event type is still used by schedule events" });
      return;
    }
    if (error) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    res.status(204).send();
  },
);

// POST /api/schedule  (admin)
scheduleRouter.post(
  "/",
  authenticateAdmin,
  async (req: Request<{}, {}, CreateScheduleEventBody>, res: Response) => {
    const { day, start_hour, end_hour, label, type_id } = req.body;
    if (!day || start_hour == null || end_hour == null || !label || !type_id) {
      res.status(422).json({ message: "Missing required field" });
      return;
    }
    if (!(await typeExists(type_id))) {
      res.status(422).json({ message: "Unknown event type" });
      return;
    }

    const { data, error } = await supabase
      .from("schedule_events")
      .insert({
        day,
        start_hour,
        end_hour,
        label,
        type_id,
        sort_order: req.body.sort_order ?? 0,
      })
      .select(EVENT_SELECT)
      .single();

    if (error) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    res.status(201).json(flattenEvent(data as EventRowWithType));
  },
);

// PUT /api/schedule/:id  (admin)
scheduleRouter.put(
  "/:id",
  authenticateAdmin,
  async (
    req: Request<{ id: string }, {}, UpdateScheduleEventBody>,
    res: Response,
  ) => {
    const fields = eventFields(req.body);
    if (fields.type_id && !(await typeExists(fields.type_id))) {
      res.status(422).json({ message: "Unknown event type" });
      return;
    }

    const { data, error } = await supabase
      .from("schedule_events")
      .update(fields)
      .eq("id", req.params.id)
      .select(EVENT_SELECT)
      .maybeSingle();

    if (error) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    if (!data) {
      res.status(404).json({ message: "Event not found" });
      return;
    }
    res.json(flattenEvent(data as EventRowWithType));
  },
);

// PUT /api/schedule/days/:key  (admin)
scheduleRouter.put(
  "/days/:key",
  authenticateAdmin,
  async (
    req: Request<{ key: string }, {}, { label: string }>,
    res: Response,
  ) => {
    if (!req.body.label) {
      res.status(422).json({ message: "Label is required" });
      return;
    }
    const { data, error } = await supabase
      .from("schedule_days")
      .update({ label: req.body.label })
      .eq("key", req.params.key)
      .select()
      .maybeSingle();

    if (error) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    if (!data) {
      res.status(404).json({ message: "Day not found" });
      return;
    }
    res.json(data);
  },
);

// DELETE /api/schedule/:id  (admin)
scheduleRouter.delete(
  "/:id",
  authenticateAdmin,
  async (req: Request<{ id: string }>, res: Response) => {
    const { error } = await supabase
      .from("schedule_events")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      res.status(500).json({ message: "Server error" });
      return;
    }
    res.status(204).send();
  },
);

export default scheduleRouter;
