import "dotenv/config";
import express from "express";
import morgan from "morgan";
import db from "./db/database.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan("dev"));
app.use(express.json());

// Health check for database
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Database connected:", db.name);
});
