"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
// ---- Constants ----
const CACHE_DIR_NAME = "article-cache";
const MANIFEST_FILE = "manifest.json";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CONCURRENT_DOWNLOADS = 5;
// ---- Helper Functions ----
function getCacheDir() {
    return path.join(electron_1.app.getPath("userData"), CACHE_DIR_NAME);
}
function sha256(input) {
    return crypto.createHash("sha256").update(input).digest("hex");
}
function getExtFromUrl(url) {
    try {
        const pathname = new URL(url).pathname;
        const ext = path
            .extname(pathname)
            .toLowerCase()
            .replace(/[^a-z0-9.]/g, "");
        if (ext && ext.length <= 6)
            return ext;
    }
    catch { }
    return ".bin";
}
function getExtFromContentType(ct) {
    if (!ct)
        return ".bin";
    ct = ct.split(";")[0].trim().toLowerCase();
    const map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/webp": ".webp",
        "image/svg+xml": ".svg",
        "image/bmp": ".bmp",
        "image/avif": ".avif",
        "text/css": ".css",
        "application/javascript": ".js",
        "font/woff": ".woff",
        "font/woff2": ".woff2",
        "font/ttf": ".ttf",
        "application/font-woff": ".woff",
        "application/font-woff2": ".woff2",
    };
    return map[ct] || ".bin";
}
// ---- Core Cache Manager ----
function initCacheDir() {
    const base = getCacheDir();
    for (const sub of ["images", "fullpage", "resources", "archives"]) {
        const dir = path.join(base, sub);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}
function loadManifest() {
    const manifestPath = path.join(getCacheDir(), MANIFEST_FILE);
    try {
        if (fs.existsSync(manifestPath)) {
            const data = fs.readFileSync(manifestPath, "utf-8");
            return JSON.parse(data);
        }
    }
    catch (e) {
        console.error("Failed to load cache manifest:", e);
    }
    return { version: 1, items: {} };
}
function saveManifest(manifest) {
    const manifestPath = path.join(getCacheDir(), MANIFEST_FILE);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
}
function computeContentHash(content) {
    return sha256(content || "");
}
async function fetchWithTimeout(url, timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await electron_1.net.fetch(url, { signal: controller.signal });
        return response;
    }
    finally {
        clearTimeout(timer);
    }
}
// Concurrency-limited download helper
async function parallelLimit(tasks, limit) {
    const results = new Array(tasks.length);
    let idx = 0;
    async function worker() {
        while (idx < tasks.length) {
            const i = idx++;
            try {
                results[i] = await tasks[i]();
            }
            catch (e) {
                results[i] = null;
            }
        }
    }
    const workers = [];
    for (let w = 0; w < Math.min(limit, tasks.length); w++) {
        workers.push(worker());
    }
    await Promise.all(workers);
    return results;
}
// Extract image URLs from HTML content
function extractImageUrls(html) {
    const urls = [];
    // Match <img src="..."> and <img src='...'>
    const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
        const url = match[1];
        if (url.startsWith("http://") || url.startsWith("https://")) {
            urls.push(url);
        }
    }
    return [...new Set(urls)];
}
// Extract CSS URLs from HTML content
function extractCssUrls(html) {
    const urls = [];
    const linkRegex = /<link[^>]+rel\s*=\s*["']stylesheet["'][^>]+href\s*=\s*["']([^"']+)["']/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
        const url = match[1];
        if (url.startsWith("http://") || url.startsWith("https://")) {
            urls.push(url);
        }
    }
    // Also try reversed order: href before rel
    const linkRegex2 = /<link[^>]+href\s*=\s*["']([^"']+)["'][^>]+rel\s*=\s*["']stylesheet["']/gi;
    while ((match = linkRegex2.exec(html)) !== null) {
        const url = match[1];
        if (url.startsWith("http://") || url.startsWith("https://")) {
            urls.push(url);
        }
    }
    return [...new Set(urls)];
}
async function downloadImage(url, existingMap) {
    // Already downloaded
    if (existingMap[url]) {
        const filePath = path.join(getCacheDir(), "images", existingMap[url]);
        if (fs.existsSync(filePath)) {
            return [url, existingMap[url]];
        }
    }
    try {
        const response = await fetchWithTimeout(url);
        if (!response.ok)
            return null;
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.startsWith("image/") && !contentType.includes("svg")) {
            // Try downloading anyway if URL looks like an image
            const ext = getExtFromUrl(url);
            if (![
                ".jpg",
                ".jpeg",
                ".png",
                ".gif",
                ".webp",
                ".svg",
                ".bmp",
                ".avif",
            ].includes(ext)) {
                return null;
            }
        }
        const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
        if (contentLength > MAX_IMAGE_SIZE)
            return null;
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > MAX_IMAGE_SIZE)
            return null;
        const ext = getExtFromContentType(contentType) || getExtFromUrl(url);
        const filename = sha256(url) + ext;
        const filePath = path.join(getCacheDir(), "images", filename);
        fs.writeFileSync(filePath, buffer);
        return [url, filename];
    }
    catch (e) {
        console.error("Failed to download image:", url, e);
        return null;
    }
}
async function downloadResource(url, existingMap) {
    if (existingMap[url]) {
        const filePath = path.join(getCacheDir(), "resources", existingMap[url]);
        if (fs.existsSync(filePath)) {
            return [url, existingMap[url]];
        }
    }
    try {
        const response = await fetchWithTimeout(url);
        if (!response.ok)
            return null;
        const contentType = response.headers.get("content-type") || "";
        const ext = getExtFromContentType(contentType) || getExtFromUrl(url);
        const filename = sha256(url) + ext;
        const buffer = Buffer.from(await response.arrayBuffer());
        const filePath = path.join(getCacheDir(), "resources", filename);
        fs.writeFileSync(filePath, buffer);
        return [url, filename];
    }
    catch (e) {
        console.error("Failed to download resource:", url, e);
        return null;
    }
}
function replaceUrlsInHtml(html, imageMap, resourceMap) {
    let result = html;
    const cacheBase = getCacheDir();
    // Replace image URLs
    for (const [originalUrl, filename] of Object.entries(imageMap)) {
        const localPath = path.join(cacheBase, "images", filename);
        const fileUrl = "file://" + localPath.replace(/\\/g, "/");
        result = result.split(originalUrl).join(fileUrl);
    }
    // Replace resource URLs
    for (const [originalUrl, filename] of Object.entries(resourceMap)) {
        const localPath = path.join(cacheBase, "resources", filename);
        const fileUrl = "file://" + localPath.replace(/\\/g, "/");
        result = result.split(originalUrl).join(fileUrl);
    }
    return result;
}
async function cacheArticle(item) {
    const manifest = loadManifest();
    const existingEntry = manifest.items[item._id];
    const existingImageMap = (existingEntry === null || existingEntry === void 0 ? void 0 : existingEntry.imageMap) || {};
    const existingResourceMap = (existingEntry === null || existingEntry === void 0 ? void 0 : existingEntry.resourceMap) || {};
    const contentHash = computeContentHash(item.content);
    const imageUrls = extractImageUrls(item.content);
    // Download images with concurrency limit
    const imageTasks = imageUrls.map(url => () => downloadImage(url, existingImageMap));
    const imageResults = await parallelLimit(imageTasks, MAX_CONCURRENT_DOWNLOADS);
    const imageMap = {};
    for (const result of imageResults) {
        if (result) {
            imageMap[result[0]] = result[1];
        }
    }
    let status = "complete";
    if (imageUrls.length > 0 &&
        Object.keys(imageMap).length < imageUrls.length) {
        status = "partial";
    }
    const entry = {
        cachedAt: new Date().toISOString(),
        contentHash: contentHash,
        imageMap: imageMap,
        resourceMap: existingResourceMap,
        status: status,
    };
    manifest.items[item._id] = entry;
    saveManifest(manifest);
    return entry;
}
async function downloadFullPage(itemId, link) {
    try {
        const response = await fetchWithTimeout(link);
        if (!response.ok)
            return;
        let html;
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("charset=") &&
            !contentType.includes("utf-8")) {
            const buffer = Buffer.from(await response.arrayBuffer());
            // Try to extract charset
            const charsetMatch = contentType.match(/charset=([^\s;]+)/i);
            if (charsetMatch) {
                try {
                    const decoder = new TextDecoder(charsetMatch[1]);
                    html = decoder.decode(buffer);
                }
                catch {
                    html = buffer.toString("utf-8");
                }
            }
            else {
                html = buffer.toString("utf-8");
            }
        }
        else {
            html = await response.text();
        }
        const manifest = loadManifest();
        const entry = manifest.items[itemId];
        if (!entry)
            return;
        // Extract and download images from full page
        const imageUrls = extractImageUrls(html);
        const imageTasks = imageUrls.map(url => () => downloadImage(url, entry.imageMap));
        const imageResults = await parallelLimit(imageTasks, MAX_CONCURRENT_DOWNLOADS);
        for (const result of imageResults) {
            if (result) {
                entry.imageMap[result[0]] = result[1];
            }
        }
        // Extract and download CSS resources
        const cssUrls = extractCssUrls(html);
        const cssTasks = cssUrls.map(url => () => downloadResource(url, entry.resourceMap));
        const cssResults = await parallelLimit(cssTasks, MAX_CONCURRENT_DOWNLOADS);
        for (const result of cssResults) {
            if (result) {
                entry.resourceMap[result[0]] = result[1];
            }
        }
        // Replace URLs in HTML with local paths
        const localizedHtml = replaceUrlsInHtml(html, entry.imageMap, entry.resourceMap);
        // Save full page HTML
        const fullpagePath = path.join(getCacheDir(), "fullpage", `${itemId}.html`);
        fs.writeFileSync(fullpagePath, localizedHtml, "utf-8");
        entry.fullContentHash = computeContentHash(html);
        saveManifest(manifest);
    }
    catch (e) {
        console.error("Failed to download full page:", link, e);
    }
}
function getCachedContent(itemId, originalContent) {
    const manifest = loadManifest();
    const entry = manifest.items[itemId];
    if (!entry)
        return { content: originalContent, fromCache: false };
    const localized = replaceUrlsInHtml(originalContent, entry.imageMap, entry.resourceMap);
    return { content: localized, fromCache: true };
}
function getCachedFullContent(itemId) {
    const fullpagePath = path.join(getCacheDir(), "fullpage", `${itemId}.html`);
    if (fs.existsSync(fullpagePath)) {
        const content = fs.readFileSync(fullpagePath, "utf-8");
        return { content, fromCache: true };
    }
    return null;
}
function compareAndArchive(changedItems) {
    const manifest = loadManifest();
    const archiveItems = [];
    for (const item of changedItems) {
        const entry = manifest.items[item._id];
        // Compute hash of new content
        const newHash = computeContentHash(item.content);
        // If item was previously cached, compare hashes
        if (entry) {
            if (entry.contentHash === newHash)
                continue;
            // Read old full content if exists
            let oldFullContent;
            const fullpagePath = path.join(getCacheDir(), "fullpage", `${item._id}.html`);
            if (fs.existsSync(fullpagePath)) {
                oldFullContent = fs.readFileSync(fullpagePath, "utf-8");
            }
            archiveItems.push({
                itemId: item._id,
                title: item.title,
                sourceName: item.sourceName,
                oldContentHash: entry.contentHash,
                newContentHash: newHash,
                oldContent: item.oldContent,
                oldFullContent: oldFullContent,
            });
            // Update manifest with new hash
            entry.contentHash = newHash;
        }
        else {
            // Item was never cached — the caller (source.ts) already
            // confirmed the content differs from the DB record.
            // Create an archive entry with a blank old hash.
            archiveItems.push({
                itemId: item._id,
                title: item.title,
                sourceName: item.sourceName,
                oldContentHash: "",
                newContentHash: newHash,
                oldContent: item.oldContent,
                oldFullContent: undefined,
            });
            // Also create a manifest entry so future changes are tracked
            manifest.items[item._id] = {
                cachedAt: new Date().toISOString(),
                contentHash: newHash,
                imageMap: {},
                resourceMap: {},
                status: "partial",
            };
        }
    }
    if (archiveItems.length > 0) {
        // Create archive snapshot
        const snapshot = {
            timestamp: new Date().toISOString(),
            reason: "content_changed",
            changedItems: archiveItems,
        };
        const archivePath = path.join(getCacheDir(), "archives", `${Date.now()}.json`);
        fs.writeFileSync(archivePath, JSON.stringify(snapshot, null, 2), "utf-8");
        saveManifest(manifest);
    }
    return archiveItems;
}
function getArchiveList() {
    const archivesDir = path.join(getCacheDir(), "archives");
    if (!fs.existsSync(archivesDir))
        return [];
    const files = fs.readdirSync(archivesDir).filter(f => f.endsWith(".json"));
    const entries = [];
    for (const file of files) {
        const filePath = path.join(archivesDir, file);
        try {
            const stat = fs.statSync(filePath);
            const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            entries.push({
                timestamp: data.timestamp,
                size: stat.size,
                changedCount: data.changedItems.length,
            });
        }
        catch { }
    }
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return entries;
}
function deleteArchive(timestamp) {
    const archivesDir = path.join(getCacheDir(), "archives");
    const files = fs.readdirSync(archivesDir).filter(f => f.endsWith(".json"));
    for (const file of files) {
        const filePath = path.join(archivesDir, file);
        try {
            const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            if (data.timestamp === timestamp) {
                fs.unlinkSync(filePath);
                return true;
            }
        }
        catch { }
    }
    return false;
}
function exportArchive(timestamp, exportPath) {
    const archivesDir = path.join(getCacheDir(), "archives");
    const files = fs.readdirSync(archivesDir).filter(f => f.endsWith(".json"));
    for (const file of files) {
        const filePath = path.join(archivesDir, file);
        try {
            const data = fs.readFileSync(filePath, "utf-8");
            const parsed = JSON.parse(data);
            if (parsed.timestamp === timestamp) {
                fs.copyFileSync(filePath, exportPath);
                return true;
            }
        }
        catch { }
    }
    return false;
}
function getCacheSizeTotal() {
    const cacheDir = getCacheDir();
    if (!fs.existsSync(cacheDir))
        return 0;
    let totalSize = 0;
    function walkDir(dir) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walkDir(fullPath);
                }
                else if (entry.isFile()) {
                    try {
                        totalSize += fs.statSync(fullPath).size;
                    }
                    catch { }
                }
            }
        }
        catch { }
    }
    walkDir(cacheDir);
    return totalSize;
}
function clearAllCache() {
    const cacheDir = getCacheDir();
    if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
    }
    initCacheDir();
}
// ---- IPC Handlers ----
initCacheDir();
electron_1.ipcMain.handle("cache-articles", async (_, items) => {
    const results = {};
    for (const item of items) {
        try {
            results[item._id] = await cacheArticle(item);
            // Also attempt full page download if link is available
            if (item.link &&
                (item.link.startsWith("http://") ||
                    item.link.startsWith("https://"))) {
                await downloadFullPage(item._id, item.link);
            }
        }
        catch (e) {
            console.error("Failed to cache article:", item._id, e);
        }
    }
    return results;
});
electron_1.ipcMain.handle("get-cached-content", (_, itemId, originalContent) => {
    return getCachedContent(itemId, originalContent);
});
electron_1.ipcMain.handle("get-cached-full-content", (_, itemId) => {
    return getCachedFullContent(itemId);
});
electron_1.ipcMain.handle("check-content-changes", (_, items) => {
    return compareAndArchive(items);
});
electron_1.ipcMain.handle("get-archive-list", () => {
    return getArchiveList();
});
electron_1.ipcMain.handle("delete-archive", (_, timestamp) => {
    return deleteArchive(timestamp);
});
electron_1.ipcMain.handle("export-archive", (_, timestamp, filePath) => {
    return exportArchive(timestamp, filePath);
});
electron_1.ipcMain.handle("get-article-cache-size", () => {
    return getCacheSizeTotal();
});
electron_1.ipcMain.handle("clear-article-cache", () => {
    clearAllCache();
});
