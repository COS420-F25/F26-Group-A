export function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function responsesToCsv(responses, questions = []) {
  const questionHeaders = questions.map((q) => q.label || q.id);
  const header = ["student_uid", "name", "email", "updated_at", ...questionHeaders];

  const rows = responses.map((r) => {
    const qCells = questions.map((q) => {
      const ans = r.answers?.[q.id];
      if (ans == null) return "";
      if (q.type === "availability") {
        const avail = Array.isArray(ans) ? ans : ans.available ?? [];
        const ifNeeded = !Array.isArray(ans) ? ans.ifNeeded ?? [] : [];
        const combined = [...avail, ...ifNeeded.map((s) => `${s} (if needed)`)];
        return combined.join(";");
      }
      if (Array.isArray(ans)) return ans.join(";");
      return String(ans);
    });

    return [
      r.uid,
      r.name,
      r.email,
      r.updatedAt?.toDate ? r.updatedAt.toDate().toISOString() : "",
      ...qCells,
    ];
  });

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function csvFileName(title) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "survey"}-responses.csv`;
}

export function downloadCsv(filename, csv) {
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
