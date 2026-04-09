import { Schema, model, Document, Types } from "mongoose";

export interface IEvaluation extends Document {
  exam: Types.ObjectId;
  evaluator: Types.ObjectId;
  evaluatee: Types.ObjectId;
  marks: number[];
  feedback: string;
  status: 'pending' | 'completed';
  flagged: boolean;
  corrections: {
    questionIndex: number;
    correctAnswer: string;
    remark: string;
  }[];
}

const evaluationSchema = new Schema<IEvaluation>({
  exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
  evaluator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  evaluatee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  marks: [{ type: Number, required: true }],
  feedback: { type: String },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  flagged: { type: Boolean, default: false },
  corrections: [{
    questionIndex: { type: Number, required: true },
    correctAnswer: { type: String, required: true },
    remark: { type: String, required: true },
  }],
});

evaluationSchema.index(
  { exam: 1, evaluator: 1, evaluatee: 1 },
  { unique: true, name: "uniq_exam_evaluator_evaluatee" }
);

evaluationSchema.pre("validate", function (next) {
  if (this.evaluator?.toString() === this.evaluatee?.toString()) {
    next(new Error("Evaluator and evaluatee cannot be the same student."));
    return;
  }
  next();
});

export const Evaluation = model<IEvaluation>('Evaluation', evaluationSchema);
