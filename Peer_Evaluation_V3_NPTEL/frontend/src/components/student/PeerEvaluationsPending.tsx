import { useEffect, useState } from "react";
import axios from "axios";
import { FaRegSmileBeam, FaRegPaperPlane } from "react-icons/fa";
import { BsStars } from "react-icons/bs";
import { PiExam } from "react-icons/pi";
import ManualPeerFeedbackForm from "./ManualPeerFeedbackForm";

const PORT = import.meta.env.VITE_BACKEND_PORT || 5000;

type Props = {
  darkMode: boolean;
};

interface Evaluation {
  _id: string;
  exam: {
    _id: string;
    title: string;
    numQuestions: number;
    maxMarks: number[];
  };
  submissionId: string | null;
  pdfUrl: string | null;
  answerKeyUrl?: string | null;
  incorrectQuestions?: {
    questionIndex: number;
    studentAnswer: string;
    correctAnswerKey: string;
  }[];
}

const pastelColors = [
  "bg-gradient-to-br from-blue-100 to-blue-50",
  "bg-gradient-to-br from-purple-100 to-purple-50",
  "bg-gradient-to-br from-pink-100 to-pink-50",
  "bg-gradient-to-br from-yellow-100 to-yellow-50",
  "bg-gradient-to-br from-green-100 to-green-50",
  "bg-gradient-to-br from-orange-100 to-orange-50",
];

const PeerEvaluationsPending = ({ darkMode }: Props) => {
  const token = localStorage.getItem("token");
  const [pending, setPending] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openEval, setOpenEval] = useState<Evaluation | null>(null);
  const [marks, setMarks] = useState<(number | '')[]>([]);
  const [feedback, setFeedback] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [markErrors, setMarkErrors] = useState<string[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [answerKeyUrl, setAnswerKeyUrl] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<{ questionIndex: number, correctAnswer: string, remark: string }[]>([]);
  const [correctionErrors, setCorrectionErrors] = useState<string[]>([]);
  const [manualCorrections, setManualCorrections] = useState<{ questionNumber: string; correctAnswer: string; remark: string }[]>([]);
  const [manualCorrectionError, setManualCorrectionError] = useState<string>("");
  const [showSeparateManualForm, setShowSeparateManualForm] = useState<boolean>(false);
  const [manualFormEvaluation, setManualFormEvaluation] = useState<Evaluation | null>(null);

  useEffect(() => {
    const fetchPending = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`http://localhost:${PORT}/api/student/pending-evaluations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPending(res.data.evaluations || []);
      } catch (err: unknown) {
        const errorMsg = axios.isAxiosError(err)
          ? err.response?.data?.error || err.response?.data?.message
          : null;
        setError(errorMsg || "Failed to fetch pending evaluations");
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, [token]);

  const openEvaluation = async (ev: Evaluation) => {
    const defaultMarks = ev.incorrectQuestions && ev.incorrectQuestions.length > 0
      ? [...ev.exam.maxMarks]
      : Array(ev.exam.numQuestions).fill("");
    setOpenEval(ev);
    setMarks(defaultMarks);
    setCorrections(ev.incorrectQuestions?.map(q => ({
      questionIndex: q.questionIndex,
      correctAnswer: "",
      remark: ""
    })) || []);
    setCorrectionErrors(ev.incorrectQuestions?.map(() => "") || []);
    setManualCorrections([]);
    setManualCorrectionError("");
    setShowSeparateManualForm(false);
    setManualFormEvaluation(null);
    setFeedback("");
    setSubmitStatus("idle");
    setMarkErrors(Array(ev.exam.numQuestions).fill(""));
    setPdfUrl(null);
    setAnswerKeyUrl(null);

    if (ev.pdfUrl) {
      try {
        const res = await fetch(ev.pdfUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const blob = await res.blob();
          setPdfUrl(URL.createObjectURL(blob));
        }
      } catch (err) {
        console.warn("Unable to fetch submission PDF:", err);
      }
    }

    if (ev.answerKeyUrl) {
      try {
        const res = await fetch(ev.answerKeyUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const blob = await res.blob();
          setAnswerKeyUrl(URL.createObjectURL(blob));
        }
      } catch (err) {
        console.warn("Unable to fetch answer key PDF:", err);
      }
    }
  };

  const handleMarkChange = (idx: number, value: string) => {
    const newMarks = [...marks];
    const newErrors = [...markErrors];
    if (value === "") {
      newMarks[idx] = "";
      newErrors[idx] = "Please enter a value";
    } else {
      const num = Number(value);
      newMarks[idx] = num;
      if (openEval && num > openEval.exam.maxMarks[idx]) {
        newErrors[idx] = "Value greater than max marks";
      } else if (num < 0) {
        newErrors[idx] = "Value cannot be negative";
      } else {
        newErrors[idx] = "";
      }
    }
    setMarks(newMarks);
    setMarkErrors(newErrors);
  };

  const requiresCorrections = Boolean(openEval?.incorrectQuestions && openEval.incorrectQuestions.length > 0);

  const hasInvalidCorrections = requiresCorrections
    ? corrections.some((c) => !c.correctAnswer.trim() || !c.remark.trim())
    : false;

  const isSubmitDisabled =
    submitStatus === "submitting" ||
    !openEval ||
    marks.length !== openEval.exam.numQuestions ||
    marks.some(m => m === "" || typeof m !== "number") ||
    markErrors.some(e => e) ||
    hasInvalidCorrections;

  const handleCloseModal = () => {
    setOpenEval(null);
    setMarks([]);
    setFeedback("");
    setSubmitStatus("idle");
    setMarkErrors([]);
    setCorrectionErrors([]);
    setManualCorrections([]);
    setManualCorrectionError("");
    setShowSeparateManualForm(false);
    setManualFormEvaluation(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    if (answerKeyUrl) URL.revokeObjectURL(answerKeyUrl);
    setPdfUrl(null);
    setAnswerKeyUrl(null);
  };

  const handleSubmit = async () => {
    if (!openEval || isSubmitDisabled) return;

    if (requiresCorrections) {
      const validationErrors = corrections.map((c) =>
        !c.correctAnswer.trim() || !c.remark.trim()
          ? "Both correct solution and remark are required."
          : ""
      );
      setCorrectionErrors(validationErrors);
      if (validationErrors.some(Boolean)) return;
    }

    const normalizedManualCorrections = manualCorrections
      .filter((c) => c.questionNumber.trim() || c.correctAnswer.trim() || c.remark.trim())
      .map((c) => ({
        questionIndex: Number(c.questionNumber) - 1,
        correctAnswer: c.correctAnswer.trim(),
        remark: c.remark.trim(),
      }));

    const invalidManual = normalizedManualCorrections.some((c) =>
      !Number.isInteger(c.questionIndex) ||
      c.questionIndex < 0 ||
      !openEval ||
      c.questionIndex >= openEval.exam.numQuestions ||
      !c.correctAnswer ||
      !c.remark
    );
    if (invalidManual) {
      setManualCorrectionError("Manual corrections need valid question numbers and both fields filled.");
      return;
    }

    const allCorrections = [...corrections, ...normalizedManualCorrections];
    const duplicateCheck = new Set<number>();
    for (const corr of allCorrections) {
      if (duplicateCheck.has(corr.questionIndex)) {
        setManualCorrectionError(`Duplicate correction for Q${corr.questionIndex + 1}.`);
        return;
      }
      duplicateCheck.add(corr.questionIndex);
    }

    setManualCorrectionError("");

    setSubmitStatus("submitting");
    try {
      await axios.post(`http://localhost:${PORT}/api/student/submit-peer-evaluation`, {
        evaluationId: openEval._id,
        marks: marks.map(m => m === "" ? 0 : m),
        feedback,
        corrections: allCorrections,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmitStatus("success");
      setPending(prev => prev.filter(ev => ev._id !== openEval._id));
      handleCloseModal();
    } catch {
      setSubmitStatus("error");
    }
  };

  const handleManualSubmit = async () => {
    if (!manualFormEvaluation) return;

    const normalizedManualCorrections = manualCorrections
      .filter((c) => c.questionNumber.trim() || c.correctAnswer.trim() || c.remark.trim())
      .map((c) => ({
        questionIndex: Number(c.questionNumber) - 1,
        correctAnswer: c.correctAnswer.trim(),
        remark: c.remark.trim(),
      }));

    if (normalizedManualCorrections.length === 0) {
      setManualCorrectionError("Add at least one wrong question before submitting.");
      return;
    }

    const invalidManual = normalizedManualCorrections.some((c) =>
      !Number.isInteger(c.questionIndex) ||
      c.questionIndex < 0 ||
      c.questionIndex >= manualFormEvaluation.exam.numQuestions ||
      !c.correctAnswer ||
      !c.remark
    );
    if (invalidManual) {
      setManualCorrectionError("Manual corrections need valid question numbers and both fields filled.");
      return;
    }

    const duplicateCheck = new Set<number>();
    for (const corr of normalizedManualCorrections) {
      if (duplicateCheck.has(corr.questionIndex)) {
        setManualCorrectionError(`Duplicate correction for Q${corr.questionIndex + 1}.`);
        return;
      }
      duplicateCheck.add(corr.questionIndex);
    }
    setManualCorrectionError("");

    const filledMarks = Array.from(
      { length: manualFormEvaluation.exam.numQuestions },
      () => 0
    );

    setSubmitStatus("submitting");
    try {
      await axios.post(`http://localhost:${PORT}/api/student/submit-peer-evaluation`, {
        evaluationId: manualFormEvaluation._id,
        marks: filledMarks,
        feedback: "Manual feedback submitted.",
        corrections: normalizedManualCorrections,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmitStatus("success");
      setPending((prev) => prev.filter((ev) => ev._id !== manualFormEvaluation._id));
      handleCloseModal();
    } catch {
      setSubmitStatus("error");
      setManualCorrectionError("Failed to submit manual feedback. Please try again.");
    }
  };

  return (
    <div className={`p-10 w-full max-w-5xl space-y-8 relative ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
      <div className="flex items-center gap-3 mb-4">
        <FaRegSmileBeam className="text-4xl text-blue-400" />
        <h2 className="text-3xl font-bold">Pending Peer Evaluations</h2>
      </div>

      {loading ? (
        <div className="flex flex-col items-center">
          <BsStars className="text-5xl text-blue-400 animate-spin mb-4" />
          <div className="rounded-2xl shadow p-6 text-lg font-semibold bg-opacity-50">
            Loading your pending evaluations...
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center">
          <div className="rounded-2xl shadow p-6 text-red-500 font-semibold bg-opacity-50">
            {error}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pending.map((ev, i) => (
            <div key={ev._id} className={`rounded-2xl shadow p-6 border hover:shadow-xl transition relative ${darkMode ? 'bg-gray-800 border-gray-700' : pastelColors[i % pastelColors.length]}`}>
              <div className="absolute -top-5 -right-5">
                <PiExam className="text-5xl text-blue-200 opacity-60" />
              </div>
              <div>
                <div className="font-semibold text-xl mb-2 flex items-center gap-2">
                  <BsStars className="text-blue-400" /> {ev.exam.title}
                </div>
                <div className="mb-2">
                  <span className="font-medium">Questions:</span> {ev.exam.numQuestions}
                </div>
              </div>
              <button
                className="mt-2 bg-gradient-to-r from-blue-400 to-purple-400 text-white px-4 py-2 rounded-xl hover:from-blue-500 hover:to-purple-500 transition font-bold shadow"
                onClick={() => openEvaluation(ev)}
              >
                Start Evaluation
              </button>
              <button
                className="mt-2 ml-2 bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-semibold"
                onClick={() => {
                  setManualFormEvaluation(ev);
                  setShowSeparateManualForm(true);
                  setManualCorrectionError("");
                  setManualCorrections([{ questionNumber: "", correctAnswer: "", remark: "" }]);
                }}
              >
                Open Separate Manual Form
              </button>
            </div>
          ))}
        </div>
      )}

      {openEval && (
        <div className={`fixed inset-0 z-50 backdrop-blur-md flex items-center justify-center ${darkMode ? 'bg-black/80' : 'bg-white/40'}`}>
          <div className={`rounded-2xl shadow-xl w-[90vw] max-h-[90vh] overflow-auto p-6 flex gap-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-black'}`}>
            <div className="w-3/5 h-[650px] grid grid-cols-2 gap-2">
              <div className="border rounded-xl overflow-hidden relative">
                <div className="text-xs text-center py-1 font-semibold bg-gray-100 dark:bg-gray-800">Student Submission</div>
                {pdfUrl ? (
                  <iframe src={pdfUrl} title="Student PDF" className="w-full h-full" />
                ) : (
                  <div className="text-gray-500 p-4">No submission available</div>
                )}
              </div>
              <div className="border rounded-xl overflow-hidden relative">
                <div className="text-xs text-center py-1 font-semibold bg-gray-100 dark:bg-gray-800">Answer Key</div>
                {answerKeyUrl ? (
                  <iframe src={answerKeyUrl} title="Answer Key" className="w-full h-full" />
                ) : (
                  <div className="text-gray-500 p-4">No answer key available</div>
                )}
              </div>
            </div>

            <div className="w-2/5 space-y-4">
              <h3 className="text-2xl font-bold text-indigo-500">Evaluate: {openEval.exam.title}</h3>

              {openEval.incorrectQuestions && openEval.incorrectQuestions.length > 0 ? (
                <div className="space-y-6">
                  <p className="text-sm font-semibold text-red-500">Only incorrect answers are shown for review:</p>
                  {openEval.incorrectQuestions.map((q, idx) => (
                    <div key={q.questionIndex} className={`p-4 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-red-50 border-red-100'}`}>
                      <p className="font-bold mb-2">Question {q.questionIndex + 1}</p>
                      <p className="text-sm mb-1">Student's Answer: <span className="font-mono text-red-600">{q.studentAnswer}</span></p>
                      <p className="text-sm mb-3">Correct Key: <span className="font-mono text-green-600">{q.correctAnswerKey}</span></p>

                      <div className="space-y-2">
                        <label className="block text-xs font-medium uppercase">Marks (Max: {openEval.exam.maxMarks[q.questionIndex]})</label>
                        <input
                          type="number"
                          className="w-full px-3 py-1 text-sm border rounded bg-white text-black"
                          value={marks[q.questionIndex]}
                          onChange={(e) => handleMarkChange(q.questionIndex, e.target.value)}
                        />

                        <label className="block text-xs font-medium uppercase">Correct Solution</label>
                        <input
                          type="text"
                          className="w-full px-3 py-1 text-sm border rounded bg-white text-black"
                          value={corrections.find(c => c.questionIndex === q.questionIndex)?.correctAnswer || ""}
                          onChange={(e) => {
                            const newCorrs = [...corrections];
                            const target = newCorrs.find(c => c.questionIndex === q.questionIndex);
                            if (target) target.correctAnswer = e.target.value;
                            setCorrections(newCorrs);
                          }}
                          placeholder="Provide the correct solution..."
                        />

                        <label className="block text-xs font-medium uppercase">Remark</label>
                        <textarea
                          className="w-full px-3 py-1 text-sm border rounded bg-white text-black resize-none"
                          value={corrections.find(c => c.questionIndex === q.questionIndex)?.remark || ""}
                          onChange={(e) => {
                            const newCorrs = [...corrections];
                            const target = newCorrs.find(c => c.questionIndex === q.questionIndex);
                            if (target) target.remark = e.target.value;
                            setCorrections(newCorrs);
                          }}
                          placeholder="Explain why it's wrong..."
                          rows={2}
                        />
                        {correctionErrors[idx] && (
                          <p className="text-red-500 text-xs">{correctionErrors[idx]}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-green-600 font-semibold">No structured differences found. Evaluating via PDF:</p>
                  {Array.from({ length: openEval.exam.numQuestions }).map((_, idx) => (
                    <div key={idx} className="space-y-1">
                      <label className="block font-medium">Q{idx + 1} (Max: {openEval.exam.maxMarks[idx]})</label>
                      <input
                        type="number"
                        className="w-full px-4 py-2 border rounded-xl bg-white text-black"
                        value={marks[idx]}
                        onChange={(e) => handleMarkChange(idx, e.target.value)}
                        placeholder="Enter marks"
                      />
                      {markErrors[idx] && (
                        <p className="text-red-500 text-sm">{markErrors[idx]}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <label className="block font-medium">General Feedback</label>
                <textarea
                  className={`w-full px-4 py-2 border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors ${darkMode ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-400' : 'bg-white text-black border-gray-300 placeholder-gray-500'}`}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Final comments for your peer"
                  rows={4}
                />
              </div>
              <div className="flex flex-wrap gap-4 justify-end mt-6">
                <button
                  onClick={handleCloseModal}
                  className="bg-gray-300 text-gray-800 px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitDisabled}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 ${isSubmitDisabled ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  <FaRegPaperPlane /> Submit Evaluation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showSeparateManualForm && manualFormEvaluation && (
        <ManualPeerFeedbackForm
          darkMode={darkMode}
          maxQuestion={manualFormEvaluation.exam.numQuestions}
          rows={manualCorrections}
          error={manualCorrectionError}
          title={`Manual Feedback - ${manualFormEvaluation.exam.title}`}
          inline={true}
          onClose={() => {
            setShowSeparateManualForm(false);
            setManualFormEvaluation(null);
          }}
          onSubmit={handleManualSubmit}
          submitDisabled={submitStatus === "submitting"}
          onAddRow={() =>
            setManualCorrections((prev) => [...prev, { questionNumber: "", correctAnswer: "", remark: "" }])
          }
          onRemoveRow={(idx) =>
            setManualCorrections((prev) => prev.filter((_, i) => i !== idx))
          }
          onUpdateRow={(idx, key, value) =>
            setManualCorrections((prev) => {
              const next = [...prev];
              next[idx] = { ...next[idx], [key]: value };
              return next;
            })
          }
        />
      )}
    </div>
  );
};

export default PeerEvaluationsPending;
