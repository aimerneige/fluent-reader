"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAITabs = getAITabs;
exports.setAITabs = setAITabs;
exports.addAITab = addAITab;
exports.removeAITab = removeAITab;
exports.renameAITab = renameAITab;
exports.getAIHistory = getAIHistory;
exports.setAIHistory = setAIHistory;
const KEY_PREFIX = "ai-history-";
const TABS_PREFIX = "ai-tabs-";
function generateTabId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}
/**
 * Migrate old single-conversation data to new tab-based structure.
 * If `ai-history-{itemId}` exists but `ai-tabs-{itemId}` does not,
 * create a default tab and move the messages under it.
 */
function migrateIfNeeded(itemId) {
    const tabsRaw = localStorage.getItem(TABS_PREFIX + itemId);
    if (tabsRaw)
        return; // already migrated
    const oldRaw = localStorage.getItem(KEY_PREFIX + itemId);
    if (!oldRaw)
        return; // no old data either
    try {
        const oldMessages = JSON.parse(oldRaw);
        if (!Array.isArray(oldMessages) || oldMessages.length === 0) {
            localStorage.removeItem(KEY_PREFIX + itemId);
            return;
        }
        const tab = {
            id: generateTabId(),
            title: "New Chat",
            createdAt: Date.now(),
        };
        // Auto-name from first user message
        const firstUser = oldMessages.find(m => m.role === "user");
        if (firstUser) {
            tab.title = firstUser.content.substring(0, 20).trim() || "New Chat";
        }
        localStorage.setItem(TABS_PREFIX + itemId, JSON.stringify([tab]));
        localStorage.setItem(KEY_PREFIX + itemId + "-" + tab.id, JSON.stringify(oldMessages));
        // Remove old key
        localStorage.removeItem(KEY_PREFIX + itemId);
    }
    catch {
        // ignore corrupt data
    }
}
// ─── Tab management ──────────────────────────────────────────
function getAITabs(itemId) {
    migrateIfNeeded(itemId);
    try {
        const raw = localStorage.getItem(TABS_PREFIX + itemId);
        if (raw) {
            const tabs = JSON.parse(raw);
            if (Array.isArray(tabs) && tabs.length > 0)
                return tabs;
        }
    }
    catch {
        // ignore
    }
    return [];
}
function setAITabs(itemId, tabs) {
    localStorage.setItem(TABS_PREFIX + itemId, JSON.stringify(tabs));
}
function addAITab(itemId) {
    const tabs = getAITabs(itemId);
    const tab = {
        id: generateTabId(),
        title: "New Chat",
        createdAt: Date.now(),
    };
    tabs.push(tab);
    setAITabs(itemId, tabs);
    return tab;
}
function removeAITab(itemId, tabId) {
    const tabs = getAITabs(itemId);
    const filtered = tabs.filter(t => t.id !== tabId);
    if (filtered.length === 0)
        return; // keep at least 1 tab
    setAITabs(itemId, filtered);
    // Remove associated messages
    localStorage.removeItem(KEY_PREFIX + itemId + "-" + tabId);
}
function renameAITab(itemId, tabId, title) {
    const tabs = getAITabs(itemId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        tab.title = title;
        setAITabs(itemId, tabs);
    }
}
// ─── Message history (per tab) ───────────────────────────────
function getAIHistory(itemId, tabId) {
    try {
        const raw = localStorage.getItem(KEY_PREFIX + itemId + "-" + tabId);
        if (raw)
            return JSON.parse(raw);
    }
    catch {
        // ignore corrupt data
    }
    return [];
}
function setAIHistory(itemId, tabId, messages) {
    localStorage.setItem(KEY_PREFIX + itemId + "-" + tabId, JSON.stringify(messages));
}
