const CHAR_MAP: Record<string, string> = {
    á: "a",
    à: "a",
    â: "a",
    ä: "a",
    ã: "a",
    å: "a",
    æ: "ae",
    é: "e",
    è: "e",
    ê: "e",
    ë: "e",
    í: "i",
    ì: "i",
    î: "i",
    ï: "i",
    ó: "o",
    ò: "o",
    ô: "o",
    ö: "o",
    õ: "o",
    ø: "o",
    ú: "u",
    ù: "u",
    û: "u",
    ü: "u",
    ñ: "n",
    ç: "c",
    ß: "ss",
    "&": "and",
    "@": "at",
    "%": "percent",
    "+": "plus",
};

export function slugify(text: string): string {
    if (!text || !text.trim()) return "";

    return text
        .trim()
        .toLowerCase()
        .replace(/./g, (c) => CHAR_MAP[c] ?? c)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}
