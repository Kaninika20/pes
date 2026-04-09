import { Response, NextFunction } from "express";
import AuthenticatedRequest from "../../middlewares/authMiddleware.ts";
import { Evaluation } from "../../models/Evaluation.ts";
import { Exam } from "../../models/Exam.ts";
import { User } from "../../models/User.ts";
import { Submission } from "../../models/Submission.ts";

export const submitPeerEvaluation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { evaluationId, marks, feedback, corrections } = req.body;
    const studentId = req.user?._id;
    if (!studentId || req.user?.role !== "student") {
      res.status(403).json({ error: "Only students can submit peer evaluations." });
      return;
    }

    const evaluation = await Evaluation.findOne({
      _id: evaluationId,
      evaluator: studentId,
      status: "pending",
    });
    if (!evaluation) {
      res.status(404).json({ error: "Evaluation not found" });
      return;
    }

    const exam = await Exam.findById(evaluation.exam);
    if (!exam) {
      res.status(404).json({ error: "Exam not found" });
      return;
    }

    if (!Array.isArray(marks) || marks.length !== exam.numQuestions) {
      res.status(400).json({ error: "Marks array length must match numQuestions" });
      return;
    }
    // Validate each mark does not exceed maxMarks
    if (exam.maxMarks && Array.isArray(exam.maxMarks)) {
      for (let i = 0; i < marks.length; i++) {
        if (typeof marks[i] !== "number" || marks[i] < 0 || marks[i] > exam.maxMarks[i]) {
          res.status(400).json({ error: `Mark for Q${i + 1} must be between 0 and ${exam.maxMarks[i]}` });
          return;
        }
      }
    }

    // Validate and sanitize corrections
    let validatedCorrections: { questionIndex: number; correctAnswer: string; remark: string }[] = [];
    if (Array.isArray(corrections) && corrections.length > 0) {
      const seenQuestionIndexes = new Set<number>();
      for (const corr of corrections) {
        if (
          typeof corr.questionIndex !== "number" ||
          corr.questionIndex < 0 ||
          corr.questionIndex >= exam.numQuestions
        ) {
          res.status(400).json({ error: `Invalid questionIndex in corrections` });
          return;
        }
        if (!corr.correctAnswer || typeof corr.correctAnswer !== "string" || !corr.correctAnswer.trim()) {
          res.status(400).json({ error: `Correct answer is required for Q${corr.questionIndex + 1}` });
          return;
        }
        if (!corr.remark || typeof corr.remark !== "string" || !corr.remark.trim()) {
          res.status(400).json({ error: `Remark is required for Q${corr.questionIndex + 1}` });
          return;
        }
        if (seenQuestionIndexes.has(corr.questionIndex)) {
          res.status(400).json({ error: `Duplicate correction provided for Q${corr.questionIndex + 1}` });
          return;
        }
        seenQuestionIndexes.add(corr.questionIndex);
        validatedCorrections.push({
          questionIndex: corr.questionIndex,
          correctAnswer: corr.correctAnswer.trim(),
          remark: corr.remark.trim(),
        });
      }
    }

    // If answer key + structured answers exist, enforce correction coverage
    // for every incorrect answer.
    const submission = await Submission.findOne({
      exam: evaluation.exam,
      student: evaluation.evaluatee,
    }).select("answers");

    if (submission?.answers && Array.isArray(exam.answerKey)) {
      const incorrectQuestionIndexes = new Set<number>();
      for (let i = 0; i < exam.numQuestions; i++) {
        if (submission.answers[i] !== exam.answerKey[i]) {
          incorrectQuestionIndexes.add(i);
        }
      }

      if (incorrectQuestionIndexes.size > 0) {
        const correctedIndexes = new Set(validatedCorrections.map((corr) => corr.questionIndex));
        for (const idx of incorrectQuestionIndexes) {
          if (!correctedIndexes.has(idx)) {
            res.status(400).json({
              error: `Correction and remark are required for incorrect answer Q${idx + 1}`,
            });
            return;
          }
        }
      }
    }

    evaluation.marks = marks;
    evaluation.feedback = feedback || "";
    evaluation.corrections = validatedCorrections;
    evaluation.status = "completed";
    await evaluation.save();

    // Increment evaluator reputation score
    await User.findByIdAndUpdate(studentId, {
      $inc: { reputationScore: 1 },
    });

    // Create In-App Notification for evaluatee (S1)
    try {
      const { Notification } = await import("../../models/Notification.ts");
      const { Exam } = await import("../../models/Exam.ts");
      const examDoc = await Exam.findById(evaluation.exam).select("title");

      await Notification.create({
        recipient: evaluation.evaluatee,
        message: `Your exam "${examDoc?.title || "Peer Assignment"}" has been reviewed by a peer. You can now view your results.`,
        relatedResource: { type: "evaluation", id: evaluation._id },
      });
    } catch (err) {
      console.error("Failed to create notification:", err);
      // Don't fail the submission if notification fails
    }

    res.json({ message: "Evaluation submitted successfully" });
  } catch (err) {
    next(err);
  }
};
