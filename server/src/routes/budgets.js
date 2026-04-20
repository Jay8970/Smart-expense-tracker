import express from "express";
import { protect } from "../middleware/auth.js";
import { Budget } from "../models/Budget.js";

const router = express.Router();

router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const budgets = await Budget.find({ user: req.user._id }).sort({ category: 1, currency: 1 });
    res.json(budgets);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, category: req.body.category, currency: req.body.currency },
      { ...req.body, user: req.user._id },
      { new: true, runValidators: true, upsert: true }
    );
    res.status(201).json(budget);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
