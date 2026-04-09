import { Response, NextFunction } from "express";
import AuthenticatedRequest from "../../middlewares/authMiddleware.ts";
import { Evaluation } from "../../models/Evaluation.ts";
import { Submission } from "../../models/Submission.ts";

const PORT = process.env.PORT || 5000;

export const getPendingEvaluations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const studentId = req.user?._id;
    if (!studentId || req.user?.role !== "student") {
      res.status(403).json({ error: "Only students can access pending evaluations." });
      return;
    }

    const pending = await Evaluation.find({
      evaluator: studentId,
      status: "pending",
    })
      .populate({
        path: "exam",
        select: "title questions numQuestions maxMarks answerKeyPdf answerKeyMimeType",
      })
      .lean();

    const evaluations = await Promise.all(
      pending.map(async (ev) => {
        const exam = ev.exam as unknown as {
          _id: string;
          title: string;
          numQuestions: number;
          maxMarks: number[];
          answerKeyPdf?: Buffer;
          answerKeyMimeType?: string;
        };

        if (!exam || !ev.evaluatee || typeof ev.evaluatee !== "object" || !("_id" in ev.evaluatee)) {
          return null;
        }

        const submission = await Submission.findOne({
          exam: exam._id,
          student: ev.evaluatee._id,
        });

        return {
          _id: ev._id.toString(),
          exam: {
            _id: exam._id,
            title: exam.title,
            numQuestions: exam.numQuestions,
            maxMarks: exam.maxMarks
          },
          evaluatee: ev.evaluatee,
          submissionId: submission ? submission._id : null,
          pdfUrl: submission
            ? `http://localhost:${PORT}/api/student/submission-pdf/${submission._id}`
            : null,
          answerKeyUrl:
            exam.answerKeyPdf && exam.answerKeyMimeType
              ? `http://localhost:${PORT}/api/student/answer-key/${exam._id}`
              : null,
        };
      })
    );

    res.json({ evaluations: evaluations.filter(Boolean) });
  } catch (err) {
    next(err);
  }
};
