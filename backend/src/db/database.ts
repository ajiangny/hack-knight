import Database from "better-sqlite3";
import path from "path";

const db = new Database(path.join(process.cwd(), "hackathon.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,  
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      location TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
  `);

export default db;
