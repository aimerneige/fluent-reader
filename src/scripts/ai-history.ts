export type AIMessage = { role: "user" | "assistant"; content: string }

export interface AIConversationTab {
    id: string
    title: string
    createdAt: number
}

const KEY_PREFIX = "ai-history-"
const TABS_PREFIX = "ai-tabs-"

function generateTabId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 6)
}

/**
 * Migrate old single-conversation data to new tab-based structure.
 * If `ai-history-{itemId}` exists but `ai-tabs-{itemId}` does not,
 * create a default tab and move the messages under it.
 */
function migrateIfNeeded(itemId: number): void {
    const tabsRaw = localStorage.getItem(TABS_PREFIX + itemId)
    if (tabsRaw) return // already migrated

    const oldRaw = localStorage.getItem(KEY_PREFIX + itemId)
    if (!oldRaw) return // no old data either

    try {
        const oldMessages: AIMessage[] = JSON.parse(oldRaw)
        if (!Array.isArray(oldMessages) || oldMessages.length === 0) {
            localStorage.removeItem(KEY_PREFIX + itemId)
            return
        }

        const tab: AIConversationTab = {
            id: generateTabId(),
            title: "New Chat",
            createdAt: Date.now(),
        }

        // Auto-name from first user message
        const firstUser = oldMessages.find(m => m.role === "user")
        if (firstUser) {
            tab.title = firstUser.content.substring(0, 20).trim() || "New Chat"
        }

        localStorage.setItem(TABS_PREFIX + itemId, JSON.stringify([tab]))
        localStorage.setItem(
            KEY_PREFIX + itemId + "-" + tab.id,
            JSON.stringify(oldMessages),
        )
        // Remove old key
        localStorage.removeItem(KEY_PREFIX + itemId)
    } catch {
        // ignore corrupt data
    }
}

// ─── Tab management ──────────────────────────────────────────

export function getAITabs(itemId: number): AIConversationTab[] {
    migrateIfNeeded(itemId)
    try {
        const raw = localStorage.getItem(TABS_PREFIX + itemId)
        if (raw) {
            const tabs = JSON.parse(raw)
            if (Array.isArray(tabs) && tabs.length > 0) return tabs
        }
    } catch {
        // ignore
    }
    return []
}

export function setAITabs(itemId: number, tabs: AIConversationTab[]): void {
    localStorage.setItem(TABS_PREFIX + itemId, JSON.stringify(tabs))
}

export function addAITab(itemId: number): AIConversationTab {
    const tabs = getAITabs(itemId)
    const tab: AIConversationTab = {
        id: generateTabId(),
        title: "New Chat",
        createdAt: Date.now(),
    }
    tabs.push(tab)
    setAITabs(itemId, tabs)
    return tab
}

export function removeAITab(itemId: number, tabId: string): void {
    const tabs = getAITabs(itemId)
    const filtered = tabs.filter(t => t.id !== tabId)
    if (filtered.length === 0) return // keep at least 1 tab
    setAITabs(itemId, filtered)
    // Remove associated messages
    localStorage.removeItem(KEY_PREFIX + itemId + "-" + tabId)
}

export function renameAITab(
    itemId: number,
    tabId: string,
    title: string,
): void {
    const tabs = getAITabs(itemId)
    const tab = tabs.find(t => t.id === tabId)
    if (tab) {
        tab.title = title
        setAITabs(itemId, tabs)
    }
}

// ─── Message history (per tab) ───────────────────────────────

export function getAIHistory(itemId: number, tabId: string): AIMessage[] {
    try {
        const raw = localStorage.getItem(KEY_PREFIX + itemId + "-" + tabId)
        if (raw) return JSON.parse(raw)
    } catch {
        // ignore corrupt data
    }
    return []
}

export function setAIHistory(
    itemId: number,
    tabId: string,
    messages: AIMessage[],
): void {
    localStorage.setItem(
        KEY_PREFIX + itemId + "-" + tabId,
        JSON.stringify(messages),
    )
}
