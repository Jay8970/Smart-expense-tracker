import express from "express";
import { protect } from "../middleware/auth.js";
import { Transaction } from "../models/Transaction.js";
import { clearReportCacheForUser } from "../utils/reportCache.js";

const router = express.Router();

router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).sort({ date: -1, createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const transaction = await Transaction.create({ ...req.body, user: req.user._id });
    clearReportCacheForUser(req.user._id);
    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    clearReportCacheForUser(req.user._id);
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    clearReportCacheForUser(req.user._id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
