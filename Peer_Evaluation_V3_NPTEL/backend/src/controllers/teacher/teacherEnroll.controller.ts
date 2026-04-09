import { Request, Response } from "express";
import { Types } from "mongoose";
import { Batch } from "../../models/Batch.ts";
import { User } from "../../models/User.ts";
import bcrypt from "bcryptjs";
import Enrollment from "../../models/Enrollment.ts";
import AuthenticatedRequest from "../../middlewares/authMiddleware.ts";

export const enrollStudents = async (req: Request, res: Response) => {
  const { courseId, batchId, students } = req.body;

  if (!courseId || !batchId || !students?.length) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const batch = await Batch.findById(batchId);
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }

    const studentIds: Types.ObjectId[] = [];

    const resolveEmail = (student: { email?: string; id?: string }) => {
      const raw = (student.email || student.id || "").trim().toLowerCase();
      if (!raw) return "";
      return raw.includes("@") ? raw : `${raw}@pes.local`;
    };

    for (const student of students) {
      const normalizedEmail = resolveEmail(student);
      if (!student?.name?.trim() || !normalizedEmail) {
        continue;
      }

      let user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        user = await User.create({
          name: student.name.trim(),
          email: normalizedEmail,
          role: "student",
          password: await bcrypt.hash("temp1234", 10),
          enrolledCourses: [courseId],
        });
      } else {
        // Update existing user if not already enrolled
        if (!user.enrolledCourses.includes(courseId)) {
          user.enrolledCourses.push(courseId);
          await user.save();
        }
      }

      if (
        !(batch.students as Types.ObjectId[]).includes(
          user._id as Types.ObjectId
        )
      ) {
        studentIds.push(user._id as Types.ObjectId);
      }
    }

    // Add new students to batch
    batch.students.push(...studentIds);
    await batch.save();

    res.status(200).json({ message: "Students enrolled successfully." });
  } catch (err) {
    console.error("Enrollment error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getBatchStudents2 = async (req: Request, res: Response) => {
  const { batchId } = req.params;

  try {
    const batch = await Batch.findById(batchId).populate(
      "students",
      "name email"
    );
    if (!batch) {
      res.status(404).json({ error: "Batch not found" });
      return;
    }

    res.status(200).json(batch.students); // Array of { name, email }
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Server error" });
  }
};