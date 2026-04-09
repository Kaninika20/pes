import { Request, Response, NextFunction } from "express";
import { Submission } from "../../models/Submission.ts";
import { Exam } from "../../models/Exam.ts";
import { Evaluation } from "../../models/Evaluation.ts";
import { User } from "../../models/User.ts";

export const submitAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const S01 = "s01_20260408@pes.local";
    const S02 = "s02_20260408@pes.local";
    const ALWAYS_FLOW_EXAM_TITLE = "Single Flow Peer Assignment";

    const { examId, answers } = req.body;

    const studentId = req.user?._id?.toString() || req.body.studentId;
    if (!studentId) {
      res.status(400).json({ error: "studentId is required" });
      return;
    }
    if (!req.file || !examId) {
      res.status(400).json({ error: "PDF file and examId are required" });
      return;
    }

    // Check if exam exists and is within submission window
    const exam = await Exam.findById(examId);
    if (!exam) {
      res.status(404).json({ error: "Exam not found" });
      return;
    }

    const now = new Date();
    if (now < exam.startTime || now > exam.endTime) {
      res.status(403).json({ error: "Submission window is closed" });
      return;
    }

    const submitter = await User.findById(studentId).select("email");
    const isS01 = submitter?.email === S01;
    const isS02 = submitter?.email === S02;
    const isAlwaysFlowSubmitter = isS01 || isS02;
    const isAlwaysFlowExam = exam.title === ALWAYS_FLOW_EXAM_TITLE;

    const parsedAnswers = JSON.parse(answers || "[]");

    if (isAlwaysFlowSubmitter && isAlwaysFlowExam) {
      // For repeated test cycles: overwrite submission each time.
      await Submission.findOneAndUpdate(
        { student: studentId, exam: examId },
        {
          $set: {
            student: studentId,
            exam: examId,
            course: exam.course,
            batch: exam.batch,
            answerPdf: req.file.buffer,
            answerPdfMimeType: req.file.mimetype,
            submittedAt: now,
            answers: parsedAnswers,
          },
        },
        { upsert: true, new: true }
      );

      // Reciprocal: S01 -> S02, S02 -> S01
      const evaluatorEmail = isS01 ? S02 : S01;
      const evaluator = await User.findOne({ email: evaluatorEmail }).select("_id");
      if (!evaluator) {
        res.status(500).json({ error: `Auto evaluator ${evaluatorEmail} not found` });
        return;
      }

      // Each submit resets/creates pending evaluation.
      await Evaluation.findOneAndUpdate(
        {
          exam: exam._id,
          evaluator: evaluator._id,
          evaluatee: studentId,
        },
        {
          $set: {
            exam: exam._id,
            evaluator: evaluator._id,
            evaluatee: studentId,
            marks: [],
            feedback: "",
            corrections: [],
            flagged: false,
            status: "pending",
          },
        },
        { upsert: true, new: true }
      );

      res.json({
        message:
          `Answer submitted. Pending peer evaluation has been sent to ${evaluatorEmail}`,
      });
      return;
    }

    // Default behavior for all other users/exams: no duplicate submissions.
    const existing = await Submission.findOne({
      student: studentId,
      exam: examId,
    });
    if (existing) {
      res.status(409).json({ error: "You have already submitted your answer" });
      return;
    }

    await Submission.create({
      student: studentId,
      exam: examId,
      course: exam.course,
      batch: exam.batch,
      answerPdf: req.file.buffer,
      answerPdfMimeType: req.file.mimetype,
      submittedAt: now,
      answers: parsedAnswers,
    });

    // // ------------------ PEER EVALUATION LOGIC ------------------
    // const K = 3;

    // const batch = await Batch.findById(exam.batch);
    // if (!batch) {
    //   console.warn("Batch not found for exam, skipping peer assignment");
    //   res.json({
    //     message: "PDF answer submitted, but peer assignment skipped",
    //   });
    //   return;
    // }

    // // Filter out the submitting student and shuffle
    // const peerIds = batch.students
    //   .filter((id) => id.toString() !== studentId)
    //   .sort(() => 0.5 - Math.random())
    //   .slice(0, K);

    // // Insert evaluations for the selected peers
    // const evaluationDocs = peerIds.map((evaluatorId) => ({
    //   exam: exam._id,
    //   evaluator: new Types.ObjectId(evaluatorId),
    //   evaluatee: new Types.ObjectId(studentId),
    //   marks: [],
    //   feedback: "",
    //   status: "pending",
    //   flagged: false,
    // }));

    // await Evaluation.insertMany(evaluationDocs);
    // console.log(`Assigned evaluation to ${peerIds.length} peers`);
    res.json({ message: "PDF answer submitted successfully" });
  } catch (err) {
    console.error(err);
    next(err);
  }
};
