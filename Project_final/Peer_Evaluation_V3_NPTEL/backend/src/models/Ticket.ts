import { Schema, model, Document, Types } from "mongoose";

export interface ITicket extends Document {
  student: Types.ObjectId;
  evaluator: Types.ObjectId;
  ta: Types.ObjectId;
  exam: Types.ObjectId;
  message: string;
  status: "open" | "closed";
  escalatedToTeacher: boolean; //escalted tickets :false
  createdAt: Date;
}

const ticketSchema = new Schema<ITicket>({
  student: { type: Schema.Types.ObjectId, ref: "User", required: true },
  evaluator: { type: Schema.Types.ObjectId, ref: "User", required: false },
  ta: { type: Schema.Types.ObjectId, ref: "User", required: false },
  exam: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ["open", "closed"], default: "open" },
  escalatedToTeacher: { type: Boolean, default: false },// escalated tickets
  createdAt: { type: Date, default: Date.now },
});


export const Ticket = model<ITicket>("Ticket", ticketSchema);