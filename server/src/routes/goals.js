import express from "express";
import { protect } from "../middleware/auth.js";
import { Goal } from "../models/Goal.js";

const router = express.Router();

router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ targetDate: 1 });
    res.json(goals);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const goal = await Goal.create({ ...req.body, user: req.user._id });
    res.status(201).json(goal);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json(goal);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
