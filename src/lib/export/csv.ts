export type Cell = string | number | null;

// Text is quoted and formula-leading input is neutralized for spreadsheet imports.
export function csv(rows: Cell[][]) {
  return (
    "\ufeff" +
    rows
      .map((row) =>
        row
          .map((value) => {
            if (typeof value === "number") return String(value);
            let text = value ?? "";
            if (/^[\t\r\n]/.test(text) || /^[=+\-@]/.test(text.trimStart()))
              text = "'" + text;
            return `"${text.replaceAll('"', '""')}"`;
          })
          .join(";"),
      )
      .join("\r\n") +
    "\r\n"
  );
}
