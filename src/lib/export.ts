import type { Notebook } from "@/lib/types";

export function exportAsCSV(notebook: Notebook): void {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const header = "term,meaning,partOfSpeech,exampleSentence,context";
  const rows = notebook.words.map((w) =>
    [w.term, w.meaning, w.partOfSpeech, w.exampleSentence, w.context]
      .map(escape)
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${notebook.title}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
