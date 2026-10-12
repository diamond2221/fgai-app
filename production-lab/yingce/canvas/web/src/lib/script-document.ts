/** Deterministic presentation: preserve every non-empty source line and dialogue. */
export function scriptTextToHtml(text: string) {
    const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    return text.replace(/\r\n?/g, "\n").split("\n").map((raw) => {
        const line = raw.trim();
        if (!line) return "";
        const cells = line.split("\t");
        // Spreadsheet rows become readable paragraphs without relying on an unsupported table extension.
        if (cells.length > 1) {
            const [first, ...rest] = cells;
            return `<p><strong>${escape(first)}</strong>${rest.map((cell) => ` · ${escape(cell).replace(/\u2028/g, "<br>")}`).join("")}</p>`;
        }
        if (/^(?:第\s*[\d一二三四五六七八九十百零]+\s*[章节集幕]|chapter\s+\d+|#{1,3}\s)/i.test(line)) return `<h2>${escape(line.replace(/^#{1,3}\s+/, ""))}</h2>`;
        if (/^(?:\d{1,3}[-－]\d{1,3}\b|(?:INT|EXT|INT\/EXT)\.|[内外]景[：:])/i.test(line)) return `<h3>${escape(line)}</h3>`;
        const dialogue = line.match(/^([\p{L}\d .·_-]{1,40}(?:\s*[（(][^）)]{1,25}[）)])?[：:])\s*(.+)$/u);
        if (dialogue) return `<p><strong>${escape(dialogue[1])}</strong> ${escape(dialogue[2])}</p>`;
        return `<p>${escape(line)}</p>`;
    }).join("");
}

export function spreadsheetRowsToText(rows: unknown[][]) {
    return rows.filter((row) => row.some((cell) => cell !== null && cell !== undefined && String(cell).trim())).map((row) => row.map((cell) => String(cell ?? "").replace(/\r?\n/g, "\u2028")).join("\t")).join("\n");
}
