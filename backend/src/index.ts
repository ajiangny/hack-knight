import "dotenv/config";
import express from "express";
import morgan from "morgan";
import db from "./db/database.js";
import authRouter from "./routes/auth.js";
import { authenticateAdmin } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan("dev"));
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/auth", authRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Database connected:", db.name);
});
