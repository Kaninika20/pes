import { Schema, model, Document, Types } from "mongoose";

export interface IUIDMap extends Document {
  examId: Types.ObjectId;
  studentId: Types.ObjectId;
  uid: string;
}

const uidMapSchema = new Schema<IUIDMap>({
  examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
  studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  uid: { type: String, required: true, unique: true }, // Must be unique globally
});

// Compound index to prevent duplicate mappings for the same exam and student
uidMapSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export const UIDMap = model<IUIDMap>("UIDMap", uidMapSchema);
