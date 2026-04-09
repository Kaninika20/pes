export function assignEvaluationsConstrained(
  studentIds: string[],
  k: number
): [boolean, [string, string][]] {
  const uniqueStudents = Array.from(new Set(studentIds));
  const n = uniqueStudents.length;

  if (!Number.isInteger(k) || k < 1) return [false, []];
  if (n < 3) return [false, []];
  if (k >= n) return [false, []];

  // In a simple directed graph without opposite edges (no mutual reviews),
  // regular out-degree k is feasible only when k <= floor((n - 1) / 2).
  const maxFeasibleK = Math.floor((n - 1) / 2);
  if (k > maxFeasibleK) return [false, []];

  // Shuffle once so assignments are not tied to DB retrieval order.
  const students = [...uniqueStudents];
  for (let i = students.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [students[i], students[j]] = [students[j], students[i]];
  }

  const pairs: [string, string][] = [];
  // Circular assignment with forward offsets 1..k gives:
  // - no self review,
  // - no mutual 2-cycle,
  // - exactly k outgoing and k incoming edges per student.
  for (let i = 0; i < n; i++) {
    for (let offset = 1; offset <= k; offset++) {
      const evaluateeIndex = (i + offset) % n;
      pairs.push([students[i], students[evaluateeIndex]]);
    }
  }

  return [true, pairs];
}
