const TRANSLATE_PREFIX = "translate-"

export interface TranslationEntry {
    content: string // translated HTML
    language: string // target language, e.g. "中文"
    timestamp: number
}

export const TRANSLATE_LANGUAGES = [
    "English",
    "中文",
    "日本語",
    "한국어",
    "Français",
    "Deutsch",
    "Español",
    "Português",
    "Русский",
    "العربية",
]

function cacheKey(itemId: number, lang: string): string {
    return TRANSLATE_PREFIX + itemId + "-" + lang
}

export function getCachedTranslation(
    itemId: number,
    lang: string,
): TranslationEntry | null {
    try {
        const raw = localStorage.getItem(cacheKey(itemId, lang))
        if (raw) {
            const entry: TranslationEntry = JSON.parse(raw)
            if (entry && entry.content && entry.language) return entry
        }
    } catch {
        // ignore corrupt data
    }
    return null
}

export function setCachedTranslation(
    itemId: number,
    lang: string,
    entry: TranslationEntry,
): void {
    localStorage.setItem(cacheKey(itemId, lang), JSON.stringify(entry))
}

export function removeCachedTranslation(
    itemId: number,
    lang: string,
): void {
    localStorage.removeItem(cacheKey(itemId, lang))
}
