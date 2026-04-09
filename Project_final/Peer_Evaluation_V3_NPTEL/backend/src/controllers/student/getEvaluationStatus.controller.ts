import { Response, NextFunction } from "express";
import AuthenticatedRequest from "../../middlewares/authMiddleware.ts";
import { Evaluation } from "../../models/Evaluation.ts";

export const getEvaluationStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentId = req.user?._id;

    if (!studentId || req.user?.role !== "student") {
      res.status(403).json({ error: "Only students can access evaluation status." });
      return;
    }

    // Evaluations assigned TO this student (as evaluator)
    const assignedEvaluations = await Evaluation.find({
      evaluator: studentId,
    }).select("status");

    const total = assignedEvaluations.length;
    const completed = assignedEvaluations.filter(
      (ev) => ev.status === "completed"
    ).length;
    const pending = total - completed;

    // Evaluations OF this student (as evaluatee) — how many peers have reviewed them
    const receivedEvaluations = await Evaluation.find({
      evaluatee: studentId,
      status: "completed",
    }).select("_id");

    res.json({
      asEvaluator: {
        total,
        completed,
        pending,
        isAllDone: total > 0 && pending === 0,
      },
      asEvaluatee: {
        receivedCount: receivedEvaluations.length,
      },
    });
  } catch (err) {
    next(err);
  }
};
