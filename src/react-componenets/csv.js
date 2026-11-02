// Turns survey responses into a CSV file.
// This file does not use Firebase, so it is easy to test.

// Wraps a value so it is safe in a CSV cell.
// Values that start with = + - or @ get a leading ' so Excel
// does not run them as formulas.
export function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

// Columns: student_uid, name, email, updated_at, tags, availability
// Tags and availability are joined with semicolons.
export function responsesToCsv(responses) {
  const header = ["student_uid", "name", "email", "updated_at", "tags", "availability"];
  const rows = responses.map((r) => [
    r.uid,
    r.name,
    r.email,
    r.updatedAt?.toDate ? r.updatedAt.toDate().toISOString() : "",
    (r.tags ?? []).join(";"),
    (r.availability ?? []).join(";"),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// "Week 1 Survey!" -> "week-1-survey-responses.csv"
export function csvFileName(title) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "survey"}-responses.csv`;
}

// Starts a file download in the browser
export function downloadCsv(filename, csv) {
  // The \uFEFF at the start helps Excel read the file as UTF-8
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
