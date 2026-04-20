import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import { connectDb } from "./db.js";
import analyticsRouter from "./routes/analytics.js";
import authRouter from "./routes/auth.js";
import budgetsRouter from "./routes/budgets.js";
import goalsRouter from "./routes/goals.js";
import suggestionsRouter from "./routes/suggestions.js";
import transactionsRouter from "./routes/transactions.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "8mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "Smart Expense Tracker" });
});

app.use("/api/auth", authRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/goals", goalsRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/suggestions", suggestionsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

connectDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`API running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  });
