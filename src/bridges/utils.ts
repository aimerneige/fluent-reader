import { ipcRenderer } from "electron"
import {
    ImageCallbackTypes,
    TouchBarTexts,
    WindowStateListenerType,
} from "../schema-types"
import { IObjectWithKey } from "@fluentui/react"

const utilsBridge = {
    platform: process.platform,

    getVersion: (): string => {
        return ipcRenderer.sendSync("get-version")
    },

    openExternal: (url: string, background = false) => {
        ipcRenderer.invoke("open-external", url, background)
    },

    showErrorBox: (title: string, content: string, copy?: string) => {
        ipcRenderer.invoke("show-error-box", title, content, copy)
    },

    showMessageBox: async (
        title: string,
        message: string,
        confirm: string,
        cancel: string,
        defaultCancel = false,
        type = "none",
    ) => {
        return (await ipcRenderer.invoke(
            "show-message-box",
            title,
            message,
            confirm,
            cancel,
            defaultCancel,
            type,
        )) as boolean
    },

    showSaveDialog: async (filters: Electron.FileFilter[], path: string) => {
        let result = (await ipcRenderer.invoke(
            "show-save-dialog",
            filters,
            path,
        )) as boolean
        if (result) {
            return (result: string, errmsg: string) => {
                ipcRenderer.invoke("write-save-result", result, errmsg)
            }
        } else {
            return null
        }
    },

    showOpenDialog: async (filters: Electron.FileFilter[]) => {
        return (await ipcRenderer.invoke("show-open-dialog", filters)) as string
    },

    getCacheSize: async (): Promise<number> => {
        return await ipcRenderer.invoke("get-cache")
    },

    clearCache: async () => {
        await ipcRenderer.invoke("clear-cache")
    },

    addMainContextListener: (
        callback: (pos: [number, number], text: string) => any,
    ) => {
        ipcRenderer.removeAllListeners("window-context-menu")
        ipcRenderer.on("window-context-menu", (_, pos, text) => {
            callback(pos, text)
        })
    },
    addWebviewContextListener: (
        callback: (pos: [number, number], text: string, url: string) => any,
    ) => {
        ipcRenderer.removeAllListeners("webview-context-menu")
        ipcRenderer.on("webview-context-menu", (_, pos, text, url) => {
            callback(pos, text, url)
        })
    },
    imageCallback: (type: ImageCallbackTypes) => {
        ipcRenderer.invoke("image-callback", type)
    },

    addWebviewKeydownListener: (callback: (event: Electron.Input) => any) => {
        ipcRenderer.removeAllListeners("webview-keydown")
        ipcRenderer.on("webview-keydown", (_, input) => {
            callback(input)
        })
    },

    addWebviewErrorListener: (callback: (reason: string) => any) => {
        ipcRenderer.removeAllListeners("webview-error")
        ipcRenderer.on("webview-error", (_, reason) => {
            callback(reason)
        })
    },

    writeClipboard: (text: string) => {
        ipcRenderer.invoke("write-clipboard", text)
    },

    closeWindow: () => {
        ipcRenderer.invoke("close-window")
    },
    minimizeWindow: () => {
        ipcRenderer.invoke("minimize-window")
    },
    maximizeWindow: () => {
        ipcRenderer.invoke("maximize-window")
    },
    isMaximized: () => {
        return ipcRenderer.sendSync("is-maximized") as boolean
    },
    isFullscreen: () => {
        return ipcRenderer.sendSync("is-fullscreen") as boolean
    },
    isFocused: () => {
        return ipcRenderer.sendSync("is-focused") as boolean
    },
    focus: () => {
        ipcRenderer.invoke("request-focus")
    },
    requestAttention: () => {
        ipcRenderer.invoke("request-attention")
    },
    addWindowStateListener: (
        callback: (type: WindowStateListenerType, state: boolean) => any,
    ) => {
        ipcRenderer.removeAllListeners("maximized")
        ipcRenderer.on("maximized", () => {
            callback(WindowStateListenerType.Maximized, true)
        })
        ipcRenderer.removeAllListeners("unmaximized")
        ipcRenderer.on("unmaximized", () => {
            callback(WindowStateListenerType.Maximized, false)
        })
        ipcRenderer.removeAllListeners("enter-fullscreen")
        ipcRenderer.on("enter-fullscreen", () => {
            callback(WindowStateListenerType.Fullscreen, true)
        })
        ipcRenderer.removeAllListeners("leave-fullscreen")
        ipcRenderer.on("leave-fullscreen", () => {
            callback(WindowStateListenerType.Fullscreen, false)
        })
        ipcRenderer.removeAllListeners("window-focus")
        ipcRenderer.on("window-focus", () => {
            callback(WindowStateListenerType.Focused, true)
        })
        ipcRenderer.removeAllListeners("window-blur")
        ipcRenderer.on("window-blur", () => {
            callback(WindowStateListenerType.Focused, false)
        })
    },

    addTouchBarEventsListener: (callback: (IObjectWithKey) => any) => {
        ipcRenderer.removeAllListeners("touchbar-event")
        ipcRenderer.on("touchbar-event", (_, key: string) => {
            callback({ key: key })
        })
    },
    initTouchBar: (texts: TouchBarTexts) => {
        ipcRenderer.invoke("touchbar-init", texts)
    },
    destroyTouchBar: () => {
        ipcRenderer.invoke("touchbar-destroy")
    },

    initFontList: (): Promise<Array<string>> => {
        return ipcRenderer.invoke("init-font-list")
    },

    cacheArticles: async (items: any[]): Promise<any> => {
        return await ipcRenderer.invoke("cache-articles", items)
    },

    getCachedContent: async (
        itemId: number,
        originalContent: string,
    ): Promise<{ content: string; fromCache: boolean }> => {
        return await ipcRenderer.invoke(
            "get-cached-content",
            itemId,
            originalContent,
        )
    },

    getCachedFullContent: async (
        itemId: number,
    ): Promise<{ content: string; fromCache: boolean } | null> => {
        return await ipcRenderer.invoke("get-cached-full-content", itemId)
    },

    checkContentChanges: async (items: any[]): Promise<any[]> => {
        return await ipcRenderer.invoke("check-content-changes", items)
    },

    getArchiveList: async (): Promise<any[]> => {
        return await ipcRenderer.invoke("get-archive-list")
    },

    deleteArchive: async (timestamp: string): Promise<boolean> => {
        return await ipcRenderer.invoke("delete-archive", timestamp)
    },

    exportArchive: async (
        timestamp: string,
        filePath: string,
    ): Promise<boolean> => {
        return await ipcRenderer.invoke("export-archive", timestamp, filePath)
    },

    getArticleCacheSize: async (): Promise<number> => {
        return await ipcRenderer.invoke("get-article-cache-size")
    },

    clearArticleCache: async (): Promise<void> => {
        return await ipcRenderer.invoke("clear-article-cache")
    },
}

declare global {
    interface Window {
        utils: typeof utilsBridge
        fontList: Array<string>
    }
}

export default utilsBridge
