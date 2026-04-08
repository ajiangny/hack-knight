import { Router } from "express";
import db from "../db/database";

interface Event {
  id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  created_at: string;
}

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

export default scheduleRouter;
