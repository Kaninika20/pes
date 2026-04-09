import { Response, NextFunction } from "express";
import Enrollment from "../../models/Enrollment.ts";
import AuthenticatedRequest from "../../middlewares/authMiddleware.ts";

export const createEnrollment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentId = req.user?._id;
    const { courseId, batchId, notes } = req.body;

    if (!studentId || !courseId || !batchId) {
      res
        .status(400)
        .json({ message: "studentId, courseId, and batchId are required." });
      return;
    }

    const existing = await Enrollment.findOne({
      studentId,
      courseId,
      batchId,
    });
    if (existing) {
      if (existing.status === "pending") {
        res.status(400).json({
          message: "Enrollment request already exists and is pending.",
        });
        return; 
      }

      if (existing.status === "rejected") {
        res.status(400).json({
          message:
          "Enrollment request was already rejected. You cannot reapply.",
        });
        return;
      }

      if (existing.status === "completed") {
        res.status(400).json({
          message: "You are already enrolled in this course and batch.",
        });
        return; 
      }
    }

    const enrollment = new Enrollment({
      studentId,
      courseId,
      batchId,
      notes,
    });
    await enrollment.save();
    res
      .status(201)
      .json({ message: "Enrollment request submitted.", enrollment });
  } catch (error) {
    next(error);
  }
};

export const getStudentEnrollments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentId = req.user?._id;
    if (!studentId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const enrollments = await Enrollment.find({ studentId })
      .populate("courseId")
      .populate("batchId")
      .sort({ createdAt: -1 });
    res.status(200).json(enrollments);
  } catch (error) {
    next(error);
  }
};