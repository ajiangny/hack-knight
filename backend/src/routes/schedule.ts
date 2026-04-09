import { Router, Request, Response } from "express";
import db from "../db/database";
import { Event, CreateEventBody, UpdateEventBody } from "../types";
import { authenticateAdmin } from "../middleware/auth";

const scheduleRouter = Router();

scheduleRouter.get("/", (req, res) => {
  try {
    const events = db
      .prepare("SELECT * FROM events ORDER BY start_time ASC")
      .all() as Event[];

    res.json(events);
  } catch {
    res.status(500).json({ message: "Failed to fetch schedule" });
  }
});
scheduleRouter.post(
  "/",
  authenticateAdmin,
  (req: Request<{}, {}, CreateEventBody>, res: Response) => {
    if (!req.body.title || !req.body.start_time) {
      res.status(422).json({ message: "Missing required field" });
      return;
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO events (title, description, start_time, end_time, location) VALUES (@title, @description, @start_time, @end_time, @location)
        `);

      const result = stmt.run({
        title: req.body.title,
        description: req.body.description ?? null,
        start_time: req.body.start_time,
        end_time: req.body.end_time ?? null,
        location: req.body.location ?? null,
      });

      const created = db
        .prepare("SELECT * FROM events  WHERE id = ?")
        .get(result.lastInsertRowid) as Event;

      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  },
);
scheduleRouter.put(
  "/:id",
  authenticateAdmin,
  (req: Request<{ id: string }, {}, UpdateEventBody>, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid ID" });
      return;
    }

    if (!req.body.title || !req.body.start_time) {
      res.status(422).json({ message: "Missing required fields" });
      return;
    }

    try {
      const stmt = db.prepare(`
        UPDATE events SET title = @title, description = @description, start_time = @start_time, end_time = @end_time, location = @location WHERE id = @id
      `);
      const result = stmt.run({
        title: req.body.title,
        description: req.body.description ?? null,
        start_time: req.body.start_time,
        end_time: req.body.end_time ?? null,
        location: req.body.location ?? null,
        id: req.params.id,
      });

      if (result.changes === 0) {
        res.status(404).json({ message: "Event not found" });
        return;
      }

      const updated = db
        .prepare("SELECT * FROM events WHERE id = ?")
        .get(id) as Event;

      res.status(200).json(updated);
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  },
);
scheduleRouter.delete(
  "/:id",
  authenticateAdmin,
  (req: Request<{ id: string }>, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid ID" });
      return;
    }
    try {
      const stmt = db.prepare("DELETE FROM events WHERE id = ?");
      const result = stmt.run(id);

      if (result.changes === 0) {
        res.status(404).json({ message: "Event not found." });
        return;
      }

      res.status(204).send();
    } catch {
      res.status(500).json({ message: "Server error" });
    }
  },
);
export default scheduleRouter;
