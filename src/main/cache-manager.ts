import { ipcMain, app, net } from "electron"
import * as path from "path"
import * as fs from "fs"
import * as crypto from "crypto"

// ---- Type Definitions ----

interface CacheManifestItem {
    cachedAt: string
    contentHash: string
    fullContentHash?: string
    imageMap: { [originalUrl: string]: string }
    resourceMap: { [originalUrl: string]: string }
    status: "complete" | "partial" | "failed"
}

interface CacheManifest {
    version: 1
    items: { [itemId: number]: CacheManifestItem }
}

interface ArchiveChangedItem {
    itemId: number
    title: string
    sourceName: string
    oldContentHash: string
    newContentHash: string
    oldContent: string
    oldFullContent?: string
}

interface ArchiveSnapshot {
    timestamp: string
    reason: string
    changedItems: ArchiveChangedItem[]
}

interface CacheArticleInput {
    _id: number
    content: string
    link: string
    title: string
    sourceName?: string
}

interface ContentChangeInput {
    _id: number
    content: string
    oldContent: string
    title: string
    sourceName: string
}

interface ArchiveListEntry {
    timestamp: string
    size: number
    changedCount: number
}

// ---- Constants ----

const CACHE_DIR_NAME = "article-cache"
const MANIFEST_FILE = "manifest.json"
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_CONCURRENT_DOWNLOADS = 5

// ---- Helper Functions ----

function getCacheDir(): string {
    return path.join(app.getPath("userData"), CACHE_DIR_NAME)
}

function sha256(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex")
}

function getExtFromUrl(url: string): string {
    try {
        const pathname = new URL(url).pathname
        const ext = path
            .extname(pathname)
            .toLowerCase()
            .replace(/[^a-z0-9.]/g, "")
        if (ext && ext.length <= 6) return ext
    } catch {}
    return ".bin"
}

function getExtFromContentType(ct: string): string {
    if (!ct) return ".bin"
    ct = ct.split(";")[0].trim().toLowerCase()
    const map: { [k: string]: string } = {
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
    }
    return map[ct] || ".bin"
}

// ---- Core Cache Manager ----

function initCacheDir(): void {
    const base = getCacheDir()
    for (const sub of ["images", "fullpage", "resources", "archives"]) {
        const dir = path.join(base, sub)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
    }
}

function loadManifest(): CacheManifest {
    const manifestPath = path.join(getCacheDir(), MANIFEST_FILE)
    try {
        if (fs.existsSync(manifestPath)) {
            const data = fs.readFileSync(manifestPath, "utf-8")
            return JSON.parse(data) as CacheManifest
        }
    } catch (e) {
        console.error("Failed to load cache manifest:", e)
    }
    return { version: 1, items: {} }
}

function saveManifest(manifest: CacheManifest): void {
    const manifestPath = path.join(getCacheDir(), MANIFEST_FILE)
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8")
}

function computeContentHash(content: string): string {
    return sha256(content || "")
}

async function fetchWithTimeout(
    url: string,
    timeoutMs = 30000,
): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const response = await net.fetch(url, { signal: controller.signal })
        return response
    } finally {
        clearTimeout(timer)
    }
}

// Concurrency-limited download helper
async function parallelLimit<T>(
    tasks: (() => Promise<T>)[],
    limit: number,
): Promise<T[]> {
    const results: T[] = new Array(tasks.length)
    let idx = 0

    async function worker() {
        while (idx < tasks.length) {
            const i = idx++
            try {
                results[i] = await tasks[i]()
            } catch (e) {
                results[i] = null
            }
        }
    }

    const workers = []
    for (let w = 0; w < Math.min(limit, tasks.length); w++) {
        workers.push(worker())
    }
    await Promise.all(workers)
    return results
}

// Extract image URLs from HTML content
function extractImageUrls(html: string): string[] {
    const urls: string[] = []
    // Match <img src="..."> and <img src='...'>
    const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi
    let match: RegExpExecArray | null
    while ((match = imgRegex.exec(html)) !== null) {
        const url = match[1]
        if (url.startsWith("http://") || url.startsWith("https://")) {
            urls.push(url)
        }
    }
    return [...new Set(urls)]
}

// Extract CSS URLs from HTML content
function extractCssUrls(html: string): string[] {
    const urls: string[] = []
    const linkRegex =
        /<link[^>]+rel\s*=\s*["']stylesheet["'][^>]+href\s*=\s*["']([^"']+)["']/gi
    let match: RegExpExecArray | null
    while ((match = linkRegex.exec(html)) !== null) {
        const url = match[1]
        if (url.startsWith("http://") || url.startsWith("https://")) {
            urls.push(url)
        }
    }
    // Also try reversed order: href before rel
    const linkRegex2 =
        /<link[^>]+href\s*=\s*["']([^"']+)["'][^>]+rel\s*=\s*["']stylesheet["']/gi
    while ((match = linkRegex2.exec(html)) !== null) {
        const url = match[1]
        if (url.startsWith("http://") || url.startsWith("https://")) {
            urls.push(url)
        }
    }
    return [...new Set(urls)]
}

async function downloadImage(
    url: string,
    existingMap: { [url: string]: string },
): Promise<[string, string] | null> {
    // Already downloaded
    if (existingMap[url]) {
        const filePath = path.join(getCacheDir(), "images", existingMap[url])
        if (fs.existsSync(filePath)) {
            return [url, existingMap[url]]
        }
    }

    try {
        const response = await fetchWithTimeout(url)
        if (!response.ok) return null

        const contentType = response.headers.get("content-type") || ""
        if (!contentType.startsWith("image/") && !contentType.includes("svg")) {
            // Try downloading anyway if URL looks like an image
            const ext = getExtFromUrl(url)
            if (
                ![
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".gif",
                    ".webp",
                    ".svg",
                    ".bmp",
                    ".avif",
                ].includes(ext)
            ) {
                return null
            }
        }

        const contentLength = parseInt(
            response.headers.get("content-length") || "0",
            10,
        )
        if (contentLength > MAX_IMAGE_SIZE) return null

        const buffer = Buffer.from(await response.arrayBuffer())
        if (buffer.length > MAX_IMAGE_SIZE) return null

        const ext = getExtFromContentType(contentType) || getExtFromUrl(url)
        const filename = sha256(url) + ext
        const filePath = path.join(getCacheDir(), "images", filename)
        fs.writeFileSync(filePath, buffer)
        return [url, filename]
    } catch (e) {
        console.error("Failed to download image:", url, e)
        return null
    }
}

async function downloadResource(
    url: string,
    existingMap: { [url: string]: string },
): Promise<[string, string] | null> {
    if (existingMap[url]) {
        const filePath = path.join(getCacheDir(), "resources", existingMap[url])
        if (fs.existsSync(filePath)) {
            return [url, existingMap[url]]
        }
    }

    try {
        const response = await fetchWithTimeout(url)
        if (!response.ok) return null

        const contentType = response.headers.get("content-type") || ""
        const ext = getExtFromContentType(contentType) || getExtFromUrl(url)
        const filename = sha256(url) + ext
        const buffer = Buffer.from(await response.arrayBuffer())
        const filePath = path.join(getCacheDir(), "resources", filename)
        fs.writeFileSync(filePath, buffer)
        return [url, filename]
    } catch (e) {
        console.error("Failed to download resource:", url, e)
        return null
    }
}

function replaceUrlsInHtml(
    html: string,
    imageMap: { [url: string]: string },
    resourceMap: { [url: string]: string },
): string {
    let result = html
    const cacheBase = getCacheDir()

    // Replace image URLs
    for (const [originalUrl, filename] of Object.entries(imageMap)) {
        const localPath = path.join(cacheBase, "images", filename)
        const fileUrl = "file://" + localPath.replace(/\\/g, "/")
        result = result.split(originalUrl).join(fileUrl)
    }

    // Replace resource URLs
    for (const [originalUrl, filename] of Object.entries(resourceMap)) {
        const localPath = path.join(cacheBase, "resources", filename)
        const fileUrl = "file://" + localPath.replace(/\\/g, "/")
        result = result.split(originalUrl).join(fileUrl)
    }

    return result
}

async function cacheArticle(
    item: CacheArticleInput,
): Promise<CacheManifestItem> {
    const manifest = loadManifest()
    const existingEntry = manifest.items[item._id]
    const existingImageMap = existingEntry?.imageMap || {}
    const existingResourceMap = existingEntry?.resourceMap || {}

    const contentHash = computeContentHash(item.content)
    const imageUrls = extractImageUrls(item.content)

    // Download images with concurrency limit
    const imageTasks = imageUrls.map(
        url => () => downloadImage(url, existingImageMap),
    )
    const imageResults = await parallelLimit(
        imageTasks,
        MAX_CONCURRENT_DOWNLOADS,
    )

    const imageMap: { [url: string]: string } = {}
    for (const result of imageResults) {
        if (result) {
            imageMap[result[0]] = result[1]
        }
    }

    let status: "complete" | "partial" | "failed" = "complete"
    if (
        imageUrls.length > 0 &&
        Object.keys(imageMap).length < imageUrls.length
    ) {
        status = "partial"
    }

    const entry: CacheManifestItem = {
        cachedAt: new Date().toISOString(),
        contentHash: contentHash,
        imageMap: imageMap,
        resourceMap: existingResourceMap,
        status: status,
    }

    manifest.items[item._id] = entry
    saveManifest(manifest)
    return entry
}

async function downloadFullPage(itemId: number, link: string): Promise<void> {
    try {
        const response = await fetchWithTimeout(link)
        if (!response.ok) return

        let html: string
        const contentType = response.headers.get("content-type") || ""
        if (
            contentType.includes("charset=") &&
            !contentType.includes("utf-8")
        ) {
            const buffer = Buffer.from(await response.arrayBuffer())
            // Try to extract charset
            const charsetMatch = contentType.match(/charset=([^\s;]+)/i)
            if (charsetMatch) {
                try {
                    const decoder = new TextDecoder(charsetMatch[1])
                    html = decoder.decode(buffer)
                } catch {
                    html = buffer.toString("utf-8")
                }
            } else {
                html = buffer.toString("utf-8")
            }
        } else {
            html = await response.text()
        }

        const manifest = loadManifest()
        const entry = manifest.items[itemId]
        if (!entry) return

        // Extract and download images from full page
        const imageUrls = extractImageUrls(html)
        const imageTasks = imageUrls.map(
            url => () => downloadImage(url, entry.imageMap),
        )
        const imageResults = await parallelLimit(
            imageTasks,
            MAX_CONCURRENT_DOWNLOADS,
        )
        for (const result of imageResults) {
            if (result) {
                entry.imageMap[result[0]] = result[1]
            }
        }

        // Extract and download CSS resources
        const cssUrls = extractCssUrls(html)
        const cssTasks = cssUrls.map(
            url => () => downloadResource(url, entry.resourceMap),
        )
        const cssResults = await parallelLimit(
            cssTasks,
            MAX_CONCURRENT_DOWNLOADS,
        )
        for (const result of cssResults) {
            if (result) {
                entry.resourceMap[result[0]] = result[1]
            }
        }

        // Replace URLs in HTML with local paths
        const localizedHtml = replaceUrlsInHtml(
            html,
            entry.imageMap,
            entry.resourceMap,
        )

        // Save full page HTML
        const fullpagePath = path.join(
            getCacheDir(),
            "fullpage",
            `${itemId}.html`,
        )
        fs.writeFileSync(fullpagePath, localizedHtml, "utf-8")

        entry.fullContentHash = computeContentHash(html)
        saveManifest(manifest)
    } catch (e) {
        console.error("Failed to download full page:", link, e)
    }
}

function getCachedContent(
    itemId: number,
    originalContent: string,
): { content: string; fromCache: boolean } {
    const manifest = loadManifest()
    const entry = manifest.items[itemId]
    if (!entry) return { content: originalContent, fromCache: false }

    const localized = replaceUrlsInHtml(
        originalContent,
        entry.imageMap,
        entry.resourceMap,
    )
    return { content: localized, fromCache: true }
}

function getCachedFullContent(
    itemId: number,
): { content: string; fromCache: boolean } | null {
    const fullpagePath = path.join(getCacheDir(), "fullpage", `${itemId}.html`)
    if (fs.existsSync(fullpagePath)) {
        const content = fs.readFileSync(fullpagePath, "utf-8")
        return { content, fromCache: true }
    }
    return null
}

function compareAndArchive(
    changedItems: ContentChangeInput[],
): ArchiveChangedItem[] {
    const manifest = loadManifest()
    const archiveItems: ArchiveChangedItem[] = []

    for (const item of changedItems) {
        const entry = manifest.items[item._id]

        // Compute hash of new content
        const newHash = computeContentHash(item.content)

        // If item was previously cached, compare hashes
        if (entry) {
            if (entry.contentHash === newHash) continue

            // Read old full content if exists
            let oldFullContent: string | undefined
            const fullpagePath = path.join(
                getCacheDir(),
                "fullpage",
                `${item._id}.html`,
            )
            if (fs.existsSync(fullpagePath)) {
                oldFullContent = fs.readFileSync(fullpagePath, "utf-8")
            }

            archiveItems.push({
                itemId: item._id,
                title: item.title,
                sourceName: item.sourceName,
                oldContentHash: entry.contentHash,
                newContentHash: newHash,
                oldContent: item.oldContent,
                oldFullContent: oldFullContent,
            })

            // Update manifest with new hash
            entry.contentHash = newHash
        } else {
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
            })

            // Also create a manifest entry so future changes are tracked
            manifest.items[item._id] = {
                cachedAt: new Date().toISOString(),
                contentHash: newHash,
                imageMap: {},
                resourceMap: {},
                status: "partial",
            }
        }
    }

    if (archiveItems.length > 0) {
        // Create archive snapshot
        const snapshot: ArchiveSnapshot = {
            timestamp: new Date().toISOString(),
            reason: "content_changed",
            changedItems: archiveItems,
        }

        const archivePath = path.join(
            getCacheDir(),
            "archives",
            `${Date.now()}.json`,
        )
        fs.writeFileSync(
            archivePath,
            JSON.stringify(snapshot, null, 2),
            "utf-8",
        )
        saveManifest(manifest)
    }

    return archiveItems
}

function getArchiveList(): ArchiveListEntry[] {
    const archivesDir = path.join(getCacheDir(), "archives")
    if (!fs.existsSync(archivesDir)) return []

    const files = fs.readdirSync(archivesDir).filter(f => f.endsWith(".json"))
    const entries: ArchiveListEntry[] = []

    for (const file of files) {
        const filePath = path.join(archivesDir, file)
        try {
            const stat = fs.statSync(filePath)
            const data = JSON.parse(
                fs.readFileSync(filePath, "utf-8"),
            ) as ArchiveSnapshot
            entries.push({
                timestamp: data.timestamp,
                size: stat.size,
                changedCount: data.changedItems.length,
            })
        } catch {}
    }

    entries.sort(
        (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    return entries
}

function deleteArchive(timestamp: string): boolean {
    const archivesDir = path.join(getCacheDir(), "archives")
    const files = fs.readdirSync(archivesDir).filter(f => f.endsWith(".json"))

    for (const file of files) {
        const filePath = path.join(archivesDir, file)
        try {
            const data = JSON.parse(
                fs.readFileSync(filePath, "utf-8"),
            ) as ArchiveSnapshot
            if (data.timestamp === timestamp) {
                fs.unlinkSync(filePath)
                return true
            }
        } catch {}
    }
    return false
}

function exportArchive(timestamp: string, exportPath: string): boolean {
    const archivesDir = path.join(getCacheDir(), "archives")
    const files = fs.readdirSync(archivesDir).filter(f => f.endsWith(".json"))

    for (const file of files) {
        const filePath = path.join(archivesDir, file)
        try {
            const data = fs.readFileSync(filePath, "utf-8")
            const parsed = JSON.parse(data) as ArchiveSnapshot
            if (parsed.timestamp === timestamp) {
                fs.copyFileSync(filePath, exportPath)
                return true
            }
        } catch {}
    }
    return false
}

function getCacheSizeTotal(): number {
    const cacheDir = getCacheDir()
    if (!fs.existsSync(cacheDir)) return 0

    let totalSize = 0

    function walkDir(dir: string) {
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true })
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name)
                if (entry.isDirectory()) {
                    walkDir(fullPath)
                } else if (entry.isFile()) {
                    try {
                        totalSize += fs.statSync(fullPath).size
                    } catch {}
                }
            }
        } catch {}
    }

    walkDir(cacheDir)
    return totalSize
}

function clearAllCache(): void {
    const cacheDir = getCacheDir()
    if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true })
    }
    initCacheDir()
}

// ---- IPC Handlers ----

initCacheDir()

ipcMain.handle("cache-articles", async (_, items: CacheArticleInput[]) => {
    const results: { [id: number]: CacheManifestItem } = {}
    for (const item of items) {
        try {
            results[item._id] = await cacheArticle(item)
            // Also attempt full page download if link is available
            if (
                item.link &&
                (item.link.startsWith("http://") ||
                    item.link.startsWith("https://"))
            ) {
                await downloadFullPage(item._id, item.link)
            }
        } catch (e) {
            console.error("Failed to cache article:", item._id, e)
        }
    }
    return results
})

ipcMain.handle(
    "get-cached-content",
    (_, itemId: number, originalContent: string) => {
        return getCachedContent(itemId, originalContent)
    },
)

ipcMain.handle("get-cached-full-content", (_, itemId: number) => {
    return getCachedFullContent(itemId)
})

ipcMain.handle("check-content-changes", (_, items: ContentChangeInput[]) => {
    return compareAndArchive(items)
})

ipcMain.handle("get-archive-list", () => {
    return getArchiveList()
})

ipcMain.handle("delete-archive", (_, timestamp: string) => {
    return deleteArchive(timestamp)
})

ipcMain.handle("export-archive", (_, timestamp: string, filePath: string) => {
    return exportArchive(timestamp, filePath)
})

ipcMain.handle("get-article-cache-size", () => {
    return getCacheSizeTotal()
})

ipcMain.handle("clear-article-cache", () => {
    clearAllCache()
})
