import { useEffect, useState } from "react";
import axios from "axios";

const PORT = import.meta.env.VITE_BACKEND_PORT || 5000;

interface Course {
    _id: string;
    name: string;
    code: string;
}

interface Batch {
    _id: string;
    name: string;
}

interface Enrollment {
    _id: string;
    courseId: { _id: string; name: string };
    batchId: { _id: string; name: string };
    status: string;
    notes?: string;
}
const EnrollmentSection = ({ darkMode }: { darkMode: boolean }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [selectedBatch, setSelectedBatch] = useState<string>("");
    const [notes, setNotes] = useState("");
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`http://localhost:${PORT}/api/student/all-courses`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setCourses(res.data.courses || []);
            } catch {
                setCourses([]);
            }
        };
        fetchCourses();
    }, []);

    useEffect(() => {
        if (!selectedCourse) {
            setBatches([]);
            setSelectedBatch("");
            return;
        }
        const fetchBatches = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(
                    `http://localhost:${PORT}/api/student/batches-by-course?courseId=${selectedCourse}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setBatches(res.data.batches || []);
            } catch {
                setBatches([]);
            }
        };
        fetchBatches();
    }, [selectedCourse]);

    const fetchEnrollments = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`http://localhost:${PORT}/api/student/enrollment`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEnrollments(res.data || []);
        } catch {
            setError("Failed to fetch enrollment requests.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEnrollments();
    }, []);

    const handleRequest = async () => {
        if (!selectedCourse || !selectedBatch) return;
        setSubmitStatus("submitting");
        setError(null);
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                `http://localhost:${PORT}/api/student/enrollment`,
                { courseId: selectedCourse, batchId: selectedBatch, notes },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSubmitStatus("success");
            setNotes("");
            fetchEnrollments();
        } catch (err: any) {
            setSubmitStatus("error");
            setError(
                err.response?.data?.message ||
                "Failed to submit enrollment request."
            );
        }
    };

    const cardBg = darkMode ? "bg-[#1A1A2E] border-gray-700 text-white" : "bg-white border-gray-200 text-gray-800";
    const textMuted = darkMode ? "text-gray-300" : "text-gray-600";
    const headerColor = darkMode ? "text-purple-300" : "text-purple-800";
    const tableHeaderBg = darkMode ? "bg-purple-900" : "bg-purple-100";

    return (
        <div className="w-full max-w-3xl mx-auto space-y-8">
            <div className={`rounded-xl p-6 border shadow-xl ${cardBg}`}>
                <h2 className={`text-2xl font-bold mb-4 ${headerColor}`}>Request Enrollment</h2>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <select
                        className={`border rounded-lg px-4 py-2 flex-1 ${darkMode ? "bg-gray-900 text-white border-gray-700" : ""}`}
                        value={selectedCourse}
                        onChange={e => {
                            setSelectedCourse(e.target.value);
                            setSelectedBatch("");
                        }}
                    >
                        <option value="">Select Course</option>
                        {courses.map(course => (
                            <option key={course._id} value={course._id}>
                                {course.name} ({course.code})
                            </option>
                        ))}
                    </select>
                    <select
                        className={`border rounded-lg px-4 py-2 flex-1 ${darkMode ? "bg-gray-900 text-white border-gray-700" : ""}`}
                        value={selectedBatch}
                        onChange={e => setSelectedBatch(e.target.value)}
                        disabled={!selectedCourse}
                    >
                        <option value="">Select Batch</option>
                        {batches.map(batch => (
                            <option key={batch._id} value={batch._id}>
                                {batch.name}
                            </option>
                        ))}
                    </select>
                </div>
                <textarea
                    className={`border rounded-lg px-4 py-2 w-full mb-4 ${darkMode ? "bg-gray-900 text-white border-gray-700" : ""}`}
                    placeholder="Notes (optional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                />
                <button
                    className="px-6 py-2 rounded-lg bg-purple-600 text-white font-semibold shadow hover:bg-purple-700 transition"
                    onClick={handleRequest}
                    disabled={!selectedCourse || !selectedBatch || submitStatus === "submitting"}
                >
                    {submitStatus === "submitting" ? "Requesting..." : "Request Enrollment"}
                </button>
                {submitStatus === "success" && (
                    <div className="text-green-600 mt-2 dark:text-green-400">Enrollment request submitted!</div>
                )}
                {error && <div className="text-red-600 mt-2 dark:text-red-400">{error}</div>}
            </div>
            <div className={`rounded-xl p-6 border shadow-xl ${cardBg}`}>
                <h2 className={`text-xl font-bold mb-4 ${headerColor}`}>Your Enrollment Requests</h2>
                {loading ? (
                    <div className={textMuted}>Loading...</div>
                ) : enrollments.length === 0 ? (
                    <div className={textMuted}>No enrollment requests yet.</div>
                ) : (
                    <table className={`w-full border-collapse ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
                        <thead>
                            <tr className={tableHeaderBg}>
                                <th className="p-2 text-left">Course</th>
                                <th className="p-2 text-left">Batch</th>
                                <th className="p-2 text-left">Status</th>
                                <th className="p-2 text-left">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrollments.map((enr) => (
                                <tr key={enr._id} className={`border-t ${darkMode ? "border-gray-700" : "border-gray-300"}`}>
                                    <td className="p-2">{enr.courseId?.name || "-"}</td>
                                    <td className="p-2">{enr.batchId?.name || "-"}</td>
                                    <td className="p-2 capitalize">{enr.status}</td>
                                    <td className="p-2">{enr.notes || "-"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default EnrollmentSection;