import { Schema, model, Document, Types } from "mongoose";

export interface IStatistics extends Document {
  exam: Types.ObjectId;
  student: Types.ObjectId;
  average: number;
  standardDeviation: number;
  classAverage?: number; // optional - useful for debugging k <= 3
  k: number;
  wasFlagged: boolean;
  individualMarks: number[]; // store raw marks for debugging or display
}

const statisticsSchema = new Schema<IStatistics>({
  exam: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
  student: { type: Schema.Types.ObjectId, ref: "User", required: true },
  average: { type: Number, required: true },
  standardDeviation: { type: Number, required: true },
  classAverage: { type: Number }, // used when k <= 3
  k: { type: Number, required: true },
  wasFlagged: { type: Boolean, required: true },
  individualMarks: [{ type: Number, required: true }],
});

export const Statistics = model<IStatistics>("Statistics", statisticsSchema);
