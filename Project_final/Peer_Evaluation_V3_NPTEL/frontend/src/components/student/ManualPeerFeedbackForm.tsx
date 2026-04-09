type ManualCorrectionRow = {
  questionNumber: string;
  correctAnswer: string;
  remark: string;
};

type Props = {
  darkMode: boolean;
  maxQuestion: number;
  rows: ManualCorrectionRow[];
  error: string;
  title?: string;
  inline?: boolean;
  submitDisabled?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onAddRow: () => void;
  onRemoveRow: (idx: number) => void;
  onUpdateRow: (idx: number, key: keyof ManualCorrectionRow, value: string) => void;
};

const ManualPeerFeedbackForm = ({
  darkMode,
  maxQuestion,
  rows,
  error,
  title,
  inline = false,
  submitDisabled = false,
  onClose,
  onSubmit,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
}: Props) => {
  const questionOptions = Array.from({ length: maxQuestion }, (_, idx) => `${idx + 1}`);

  return (
    <div className={inline ? "w-full" : "fixed right-6 bottom-6 z-[70] w-[520px] max-w-[95vw]"}>
      <div className={`rounded-xl border p-4 shadow-2xl ${darkMode ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-indigo-200 text-black"}`}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-sm">{title || "Separate Manual Feedback Form"}</p>
          <button type="button" onClick={onClose} className="text-xs text-red-500">Close</button>
        </div>
        <p className="text-xs mb-3">Add wrong question numbers with personalized correct answers and remarks.</p>
        <div className="space-y-3 max-h-[45vh] overflow-auto pr-1">
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <select
                value={row.questionNumber}
                onChange={(e) => onUpdateRow(idx, "questionNumber", e.target.value)}
                className="col-span-2 px-2 py-1 text-sm border rounded bg-white text-black"
              >
                <option value="">Q#</option>
                {questionOptions.map((q) => (
                  <option key={q} value={q}>
                    Q{q}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={row.correctAnswer}
                onChange={(e) => onUpdateRow(idx, "correctAnswer", e.target.value)}
                className="col-span-4 px-2 py-1 text-sm border rounded bg-white text-black"
                placeholder="Correct answer"
              />
              <input
                type="text"
                value={row.remark}
                onChange={(e) => onUpdateRow(idx, "remark", e.target.value)}
                className="col-span-5 px-2 py-1 text-sm border rounded bg-white text-black"
                placeholder="Feedback"
              />
              <button type="button" onClick={() => onRemoveRow(idx)} className="col-span-1 text-red-600 text-xs">
                X
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={onAddRow} className="mt-3 px-3 py-1 rounded bg-indigo-600 text-white text-xs">
          Add Wrong Question
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled}
          className={`mt-3 ml-2 px-3 py-1 rounded text-xs text-white ${submitDisabled ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
        >
          Submit Manual Feedback
        </button>
        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>
    </div>
  );
};

export default ManualPeerFeedbackForm;
