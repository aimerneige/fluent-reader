import * as React from "react"
import intl from "react-intl-universal"
import { renderToString } from "react-dom/server"
import { RSSItem } from "../scripts/models/item"
import {
    Stack,
    CommandBarButton,
    IContextualMenuProps,
    FocusZone,
    ContextualMenuItemType,
    Spinner,
    Icon,
    Link,
    IconButton,
} from "@fluentui/react"
import {
    RSSSource,
    SourceOpenTarget,
    SourceTextDirection,
    SourceThemeOverride,
    resolveOpenTarget,
} from "../scripts/models/source"
import { shareSubmenu } from "./context-menu"
import {
    platformCtrl,
    decodeFetchResponse,
    htmlToPlainText,
} from "../scripts/utils"
import AIPanel from "./ai-panel"
import { AIContextMode } from "../scripts/models/app"
import {
    sendChatMessageStreaming,
    ChatMessage,
    isAIConfigured,
    getAIConfig,
} from "../scripts/ai-service"
import {
    TRANSLATE_LANGUAGES,
    getCachedTranslation,
    setCachedTranslation,
} from "../scripts/translate-cache"

const FONT_SIZE_OPTIONS = [12, 13, 14, 15, 16, 17, 18, 19, 20]

type ArticleProps = {
    item: RSSItem
    source: RSSSource
    locale: string
    shortcuts: (item: RSSItem, e: KeyboardEvent) => void
    dismiss: () => void
    offsetItem: (offset: number) => void
    toggleHasRead: (item: RSSItem) => void
    toggleStarred: (item: RSSItem) => void
    toggleHidden: (item: RSSItem) => void
    textMenu: (position: [number, number], text: string, url: string) => void
    imageMenu: (position: [number, number]) => void
    dismissContextMenu: () => void
    aiRequest: {
        active: boolean
        mode?: AIContextMode
        selectedText?: string
    }
    clearAIRequest: () => void
    updateSourceTextDirection: (
        source: RSSSource,
        direction: SourceTextDirection,
    ) => void
}

type ArticleState = {
    fontFamily: string
    fontSize: number
    loadWebpage: boolean
    loadFull: boolean
    fullContent: string
    loaded: boolean
    error: boolean
    errorDescription: string
    showAIPanel: boolean
    aiQuotedText?: string
    aiSelectionContext?: string
    aiRequestClose: boolean
    findInPage: boolean
    findText: string
    findResult: { activeMatchOrdinal: number; matches: number } | null
    cachedContent: string
    cachedFullContent: string
    translateLang: string
    translatedContent: string
    translating: boolean
    translateError: boolean
    translateStreamingText: string
}

class Article extends React.Component<ArticleProps, ArticleState> {
    webview: Electron.WebviewTag
    _documentListenerAdded = false
    _translateAbortController: AbortController | null = null

    constructor(props: ArticleProps) {
        super(props)
        this.state = {
            fontFamily: window.settings.getFont(),
            fontSize: window.settings.getFontSize(),
            loadWebpage:
                resolveOpenTarget(props.source) === SourceOpenTarget.Webpage,
            loadFull:
                resolveOpenTarget(props.source) ===
                SourceOpenTarget.FullContent,
            fullContent: "",
            loaded: false,
            error: false,
            errorDescription: "",
            showAIPanel: false,
            aiRequestClose: false,
            findInPage: false,
            findText: "",
            findResult: null,
            cachedContent: "",
            cachedFullContent: "",
            translateLang: "",
            translatedContent: "",
            translating: false,
            translateError: false,
            translateStreamingText: "",
        }
        window.utils.addWebviewContextListener(this.contextMenuHandler)
        window.utils.addWebviewKeydownListener(this.keyDownHandler)
        window.utils.addWebviewErrorListener(this.webviewError)
        if (resolveOpenTarget(props.source) === SourceOpenTarget.FullContent)
            this.loadFull()
        this.loadCachedContent()
    }

    setFontSize = (size: number) => {
        window.settings.setFontSize(size)
        this.setState({ fontSize: size })
    }
    setFont = (font: string) => {
        window.settings.setFont(font)
        this.setState({ fontFamily: font })
    }

    fontSizeMenuProps = (): IContextualMenuProps => ({
        items: FONT_SIZE_OPTIONS.map(size => ({
            key: String(size),
            text: String(size),
            canCheck: true,
            checked: size === this.state.fontSize,
            onClick: () => this.setFontSize(size),
        })),
    })

    fontFamilyMenuProps = (): IContextualMenuProps => ({
        items: window.fontList.map((font, idx) => ({
            key: String(idx),
            text: font === "" ? intl.get("default") : font,
            canCheck: true,
            checked: this.state.fontFamily === font,
            onClick: () => this.setFont(font),
        })),
    })

    updateTextDirection = (direction: SourceTextDirection) => {
        this.props.updateSourceTextDirection(this.props.source, direction)
    }

    directionMenuProps = (): IContextualMenuProps => ({
        items: [
            {
                key: "LTR",
                text: intl.get("article.LTR"),
                iconProps: { iconName: "Forward" },
                canCheck: true,
                checked: this.props.source.textDir === SourceTextDirection.LTR,
                onClick: () =>
                    this.updateTextDirection(SourceTextDirection.LTR),
            },
            {
                key: "RTL",
                text: intl.get("article.RTL"),
                iconProps: { iconName: "Back" },
                canCheck: true,
                checked: this.props.source.textDir === SourceTextDirection.RTL,
                onClick: () =>
                    this.updateTextDirection(SourceTextDirection.RTL),
            },
            {
                key: "Vertical",
                text: intl.get("article.Vertical"),
                iconProps: { iconName: "Down" },
                canCheck: true,
                checked:
                    this.props.source.textDir === SourceTextDirection.Vertical,
                onClick: () =>
                    this.updateTextDirection(SourceTextDirection.Vertical),
            },
        ],
    })

    getArticleText = (): string => {
        let content: string
        if (this.state.loadFull) {
            content = this.state.cachedFullContent || this.state.fullContent
        } else {
            content = this.state.cachedContent || this.props.item.content
        }
        const bodyText = htmlToPlainText(content)
        const title = this.props.item.title
        const date = this.props.item.date.toLocaleString(this.props.locale, {
            hour12: !this.props.locale.startsWith("zh"),
        })
        return `${title}\n${date}\n\n${bodyText}`
    }

    moreMenuProps = (): IContextualMenuProps => ({
        items: [
            {
                key: "openInBrowser",
                text: intl.get("openExternal"),
                iconProps: { iconName: "NavigateExternalInline" },
                onClick: e => {
                    window.utils.openExternal(
                        this.props.item.link,
                        platformCtrl(e),
                    )
                },
            },
            {
                key: "copyURL",
                text: intl.get("context.copyURL"),
                iconProps: { iconName: "Link" },
                onClick: () => {
                    window.utils.writeClipboard(this.props.item.link)
                },
            },
            {
                key: "copyContent",
                text: intl.get("article.copyContent"),
                iconProps: { iconName: "Copy" },
                disabled: this.state.loadWebpage,
                onClick: () => {
                    window.utils.writeClipboard(this.getArticleText())
                },
            },
            {
                key: "toggleHidden",
                text: this.props.item.hidden
                    ? intl.get("article.unhide")
                    : intl.get("article.hide"),
                iconProps: {
                    iconName: this.props.item.hidden ? "View" : "Hide3",
                },
                onClick: () => {
                    this.props.toggleHidden(this.props.item)
                },
            },
            {
                key: "fontMenu",
                text: intl.get("article.font"),
                iconProps: { iconName: "Font" },
                disabled: this.state.loadWebpage,
                subMenuProps: this.fontFamilyMenuProps(),
            },
            {
                key: "fontSizeMenu",
                text: intl.get("article.fontSize"),
                iconProps: { iconName: "FontSize" },
                disabled: this.state.loadWebpage,
                subMenuProps: this.fontSizeMenuProps(),
            },
            {
                key: "directionMenu",
                text: intl.get("article.textDir"),
                iconProps: { iconName: "ChangeEntitlements" },
                disabled: this.state.loadWebpage,
                subMenuProps: this.directionMenuProps(),
            },
            {
                key: "divider_1",
                itemType: ContextualMenuItemType.Divider,
            },
            ...shareSubmenu(this.props.item),
        ],
    })

    contextMenuHandler = (pos: [number, number], text: string, url: string) => {
        if (pos) {
            if (text || url) this.props.textMenu(pos, text, url)
            else this.props.imageMenu(pos)
        } else {
            this.props.dismissContextMenu()
        }
    }

    keyDownHandler = (input: Electron.Input) => {
        if (input.type === "keyDown") {
            switch (input.key) {
                case "Escape":
                    if (this.state.findInPage) {
                        this.closeFindInPage()
                    } else {
                        this.props.dismiss()
                    }
                    break
                case "ArrowLeft":
                case "ArrowRight":
                    this.props.offsetItem(input.key === "ArrowLeft" ? -1 : 1)
                    break
                case "l":
                case "L":
                    this.toggleWebpage()
                    break
                case "w":
                case "W":
                    this.toggleFull()
                    break
                case "H":
                case "h":
                    if (!input.meta) this.props.toggleHidden(this.props.item)
                    break
                case "f":
                case "F":
                    if (input.control || input.meta) {
                        this.openFindInPage()
                    }
                    break
                default:
                    const keyboardEvent = new KeyboardEvent("keydown", {
                        code: input.code,
                        key: input.key,
                        shiftKey: input.shift,
                        altKey: input.alt,
                        ctrlKey: input.control,
                        metaKey: input.meta,
                        repeat: input.isAutoRepeat,
                        bubbles: true,
                    })
                    this.props.shortcuts(this.props.item, keyboardEvent)
                    document.dispatchEvent(keyboardEvent)
                    break
            }
        }
    }

    webviewLoaded = () => {
        this.setState({ loaded: true })
        this.applyThemeOverride()
    }

    applyThemeOverride = () => {
        if (!this.webview) return
        const override = this.props.source.themeOverride
        if (override === SourceThemeOverride.Default) return
        const scheme =
            override === SourceThemeOverride.Light ? "light" : "dark"
        this.webview
            .executeJavaScript(
                `(function() {
                var meta = document.querySelector('meta[name="color-scheme"]');
                if (!meta) {
                    meta = document.createElement('meta');
                    meta.name = 'color-scheme';
                    document.head.appendChild(meta);
                }
                meta.content = '${scheme}';
            })();`,
            )
            .catch(() => {})
    }

    webviewError = (reason: string) => {
        this.setState({ error: true, errorDescription: reason })
    }
    webviewReload = () => {
        if (this.webview) {
            this.setState({ loaded: false, error: false })
            this.webview.reload()
        } else if (this.state.loadFull) {
            this.loadFull()
        }
    }

    findInputRef = React.createRef<HTMLInputElement>()

    documentKeyDownHandler = (e: KeyboardEvent) => {
        const isMac = window.utils.platform === "darwin"
        const ctrlOrMeta = isMac ? e.metaKey : e.ctrlKey
        if (ctrlOrMeta && (e.key === "f" || e.key === "F")) {
            e.preventDefault()
            e.stopPropagation()
            this.openFindInPage()
        }
    }

    openFindInPage = () => {
        this.setState({ findInPage: true }, () => {
            if (this.findInputRef.current) {
                this.findInputRef.current.focus()
                this.findInputRef.current.select()
            }
        })
    }

    closeFindInPage = () => {
        if (this.webview) {
            try {
                this.webview.stopFindInPage("clearSelection")
            } catch (_) {}
        }
        this.setState({ findInPage: false, findText: "", findResult: null })
    }

    handleFindChange = (text: string) => {
        this.setState({ findText: text })
        if (text && this.webview) {
            try {
                this.webview.findInPage(text)
            } catch (_) {}
        } else {
            if (this.webview) {
                try {
                    this.webview.stopFindInPage("clearSelection")
                } catch (_) {}
            }
            this.setState({ findResult: null })
        }
    }

    findNext = () => {
        if (this.state.findText && this.webview) {
            try {
                this.webview.findInPage(this.state.findText, {
                    forward: true,
                    findNext: true,
                })
            } catch (_) {}
        }
    }

    findPrevious = () => {
        if (this.state.findText && this.webview) {
            try {
                this.webview.findInPage(this.state.findText, {
                    forward: false,
                    findNext: true,
                })
            } catch (_) {}
        }
    }

    handleFoundInPage = (e: Electron.FoundInPageEvent) => {
        if (e.result) {
            this.setState({
                findResult: {
                    activeMatchOrdinal: e.result.activeMatchOrdinal,
                    matches: e.result.matches,
                },
            })
        }
    }

    handleFindKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            e.preventDefault()
            this.closeFindInPage()
        } else if (e.key === "Enter") {
            e.preventDefault()
            if (e.shiftKey) {
                this.findPrevious()
            } else {
                this.findNext()
            }
        }
    }

    componentDidMount = () => {
        if (!this._documentListenerAdded) {
            document.addEventListener("keydown", this.documentKeyDownHandler)
            this._documentListenerAdded = true
        }
        let webview = document.getElementById("article") as Electron.WebviewTag
        if (webview != this.webview) {
            this.webview = webview
            if (webview) {
                if (!this.state.showAIPanel) {
                    webview.focus()
                }
                this.setState({ loaded: false, error: false })
                webview.addEventListener("did-stop-loading", this.webviewLoaded)
                webview.addEventListener(
                    "found-in-page",
                    this.handleFoundInPage,
                )
                let card = document.querySelector(
                    `#refocus div[data-iid="${this.props.item._id}"]`,
                ) as HTMLElement
                // @ts-ignore
                if (card) card.scrollIntoViewIfNeeded()
            }
        }
    }
    componentDidUpdate = (prevProps: ArticleProps) => {
        if (prevProps.item._id != this.props.item._id) {
            this.closeFindInPage()
            // Abort any in-progress translation
            if (this._translateAbortController) {
                this._translateAbortController.abort()
                this._translateAbortController = null
            }
            this.setState({
                loadWebpage:
                    resolveOpenTarget(this.props.source) ===
                    SourceOpenTarget.Webpage,
                loadFull:
                    resolveOpenTarget(this.props.source) ===
                    SourceOpenTarget.FullContent,
                cachedContent: "",
                cachedFullContent: "",
                translateLang: "",
                translatedContent: "",
                translating: false,
                translateError: false,
                translateStreamingText: "",
            })
            if (
                resolveOpenTarget(this.props.source) ===
                SourceOpenTarget.FullContent
            )
                this.loadFull()
            this.loadCachedContent()
        }
        // Handle AI request from context menu
        if (this.props.aiRequest.active && !prevProps.aiRequest.active) {
            const { mode, selectedText } = this.props.aiRequest
            this.setState({
                showAIPanel: true,
                aiQuotedText: selectedText,
                aiSelectionContext:
                    mode === AIContextMode.SelectionOnly
                        ? selectedText
                        : undefined,
            })
            this.props.clearAIRequest()
        }
        this.componentDidMount()
    }

    componentWillUnmount = () => {
        document.removeEventListener("keydown", this.documentKeyDownHandler)
        this.closeFindInPage()
        // Abort any in-progress translation
        if (this._translateAbortController) {
            this._translateAbortController.abort()
            this._translateAbortController = null
        }
        let refocus = document.querySelector(
            `#refocus div[data-iid="${this.props.item._id}"]`,
        ) as HTMLElement
        if (refocus) refocus.focus()
    }

    toggleWebpage = () => {
        if (this.state.loadWebpage) {
            this.setState({ loadWebpage: false })
        } else if (
            this.props.item.link.startsWith("https://") ||
            this.props.item.link.startsWith("http://")
        ) {
            this.setState({ loadWebpage: true, loadFull: false })
        }
    }

    toggleFull = () => {
        if (this.state.loadFull) {
            this.setState({ loadFull: false })
        } else if (
            this.props.item.link.startsWith("https://") ||
            this.props.item.link.startsWith("http://")
        ) {
            this.setState({ loadFull: true, loadWebpage: false })
            this.loadFull()
        }
    }

    toggleAIPanel = () => {
        if (this.state.showAIPanel) {
            // Request close — AIPanel will decide whether to show confirmation
            this.setState({ aiRequestClose: true })
        } else {
            // Open panel
            this.setState({
                showAIPanel: true,
                aiQuotedText: undefined,
                aiSelectionContext: undefined,
            })
        }
    }

    closeAIPanel = () => {
        this.setState({
            showAIPanel: false,
            aiQuotedText: undefined,
            aiSelectionContext: undefined,
            aiRequestClose: false,
        })
    }

    stopTranslation = () => {
        if (this._translateAbortController) {
            this._translateAbortController.abort()
            this._translateAbortController = null
        }
        this.setState({
            translateLang: "",
            translatedContent: "",
            translating: false,
            translateError: false,
            translateStreamingText: "",
        })
    }

    translateArticle = async (lang: string) => {
        // Toggle off if same language already active (whether finished or still streaming)
        if (lang === this.state.translateLang) {
            if (this._translateAbortController) {
                this._translateAbortController.abort()
                this._translateAbortController = null
            }
            this.setState({
                translateLang: "",
                translatedContent: "",
                translating: false,
                translateError: false,
                translateStreamingText: "",
            })
            return
        }

        // Abort any in-progress translation
        if (this._translateAbortController) {
            this._translateAbortController.abort()
            this._translateAbortController = null
        }

        // Check cache first
        const cached = getCachedTranslation(this.props.item._id, lang)
        if (cached) {
            this.setState({
                translateLang: lang,
                translatedContent: cached.content,
                translating: false,
                translateError: false,
                translateStreamingText: "",
            })
            return
        }

        // Check if AI is configured
        if (!isAIConfigured()) {
            this.setState({ translateError: true })
            return
        }

        // Get article plain text
        let content: string
        if (this.state.loadFull) {
            content =
                this.state.cachedFullContent || this.state.fullContent
        } else {
            content =
                this.state.cachedContent || this.props.item.content
        }
        const contentLimit = getAIConfig()?.contentLimit || 8000
        const plainText = htmlToPlainText(content).substring(0, contentLimit)
        const title = this.props.item.title

        // Start translating — show streaming overlay, don't touch webview yet
        this.setState({
            translateLang: lang,
            translatedContent: "",
            translating: true,
            translateError: false,
            translateStreamingText: "",
        })

        const messages: ChatMessage[] = [
            {
                role: "system",
                content:
                    "You are a professional translator. Translate the user-provided article text faithfully into the target language specified by the user. The output language MUST be " +
                    lang +
                    ". Output ONLY the translated text, preserving paragraph breaks. Do not add explanations or commentary. IMPORTANT: If the article is already written in " +
                    lang +
                    ", respond with exactly \"[SAME_LANGUAGE]\" and nothing else.",
            },
            {
                role: "user",
                content: `Translate the following article into ${lang}. The entire output must be written in ${lang}. If the article is already in ${lang}, respond with exactly "[SAME_LANGUAGE]".\n\nTitle: ${title}\n\n${plainText}`,
            },
        ]

        const controller = new AbortController()
        this._translateAbortController = controller
        let accumulated = ""

        sendChatMessageStreaming(
            messages,
            (chunk: string) => {
                // Stream chunks — only update the streaming text overlay,
                // not translatedContent (which would cause webview reload)
                accumulated += chunk
                this.setState({ translateStreamingText: accumulated })
            },
            (error: string) => {
                console.error("Translation error:", error)
                this.setState({
                    translating: false,
                    translateError: true,
                    translateLang: "",
                    translatedContent: "",
                    translateStreamingText: "",
                })
                this._translateAbortController = null
            },
            () => {
                // Check if AI reported same language
                if (accumulated.trim() === "[SAME_LANGUAGE]") {
                    this.setState({
                        translating: false,
                        translateLang: "",
                        translatedContent: "",
                        translateStreamingText:
                            intl.get("article.translateSameLang"),
                    })
                    this._translateAbortController = null
                    // Auto-dismiss after 2 seconds
                    setTimeout(() => {
                        if (!this.state.translating && !this.state.translateLang) {
                            this.setState({ translateStreamingText: "" })
                        }
                    }, 2000)
                    return
                }

                // Complete — wrap plain text into <p> tags
                const paragraphs = accumulated
                    .split(/\n\n+/)
                    .filter(p => p.trim())
                    .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
                    .join("")
                const finalContent = paragraphs || accumulated
                // Now set translatedContent — this triggers one webview reload
                this.setState({
                    translating: false,
                    translatedContent: finalContent,
                    translateStreamingText: "",
                })
                setCachedTranslation(this.props.item._id, lang, {
                    content: finalContent,
                    language: lang,
                    timestamp: Date.now(),
                })
                this._translateAbortController = null
            },
            controller.signal,
        )
    }

    translateMenuProps = (): IContextualMenuProps => {
        const itemId = this.props.item._id
        return {
            items: [
                {
                    key: "original",
                    text: intl.get("article.originalText"),
                    canCheck: true,
                    checked: !this.state.translateLang,
                    onClick: () =>
                        this.setState({
                            translateLang: "",
                            translatedContent: "",
                            translateError: false,
                        }),
                },
                {
                    key: "divider",
                    itemType: ContextualMenuItemType.Divider,
                },
                ...TRANSLATE_LANGUAGES.map(lang => {
                    const hasCached = !!getCachedTranslation(itemId, lang)
                    return {
                        key: lang,
                        text: lang + (hasCached ? " [*]" : ""),
                        canCheck: true,
                        checked: lang === this.state.translateLang,
                        onClick: () => { this.translateArticle(lang) },
                    }
                }),
            ],
        }
    }

    clearAIRequestClose = () => {
        this.setState({ aiRequestClose: false })
    }

    getAnchorRect = (): DOMRect | null => {
        const el = document.querySelector(".article") as HTMLElement
        if (!el) return null
        const rect = el.getBoundingClientRect()
        const toolbarHeight = 36
        // In list view (.side-article-wrapper), flex-direction is column-reverse
        // so toolbar is at the bottom; in card view toolbar is at the top.
        const isListView = !!el.closest(".side-article-wrapper")
        if (isListView) {
            return new DOMRect(
                rect.x,
                rect.y,
                rect.width,
                rect.height - toolbarHeight,
            )
        } else {
            return new DOMRect(
                rect.x,
                rect.y + toolbarHeight,
                rect.width,
                rect.height - toolbarHeight,
            )
        }
    }
    loadCachedContent = async () => {
        try {
            if (!window.settings.getAggressiveCache()) return
            // Load cached article content with localized image URLs
            const result = await window.utils.getCachedContent(
                this.props.item._id,
                this.props.item.content,
            )
            if (result && result.fromCache) {
                this.setState({ cachedContent: result.content })
            } else {
                // Not yet cached — trigger on-demand caching now
                this.triggerOnDemandCache()
            }
            // Load cached full page content
            const fullResult = await window.utils.getCachedFullContent(
                this.props.item._id,
            )
            if (fullResult && fullResult.fromCache) {
                this.setState({ cachedFullContent: fullResult.content })
            }
        } catch (e) {
            console.error("Failed to load cached content:", e)
        }
    }

    triggerOnDemandCache = async () => {
        try {
            if (!window.settings.getAggressiveCache()) return
            const item = this.props.item
            await window.utils.cacheArticles([
                {
                    _id: item._id,
                    content: item.content,
                    link: item.link,
                    title: item.title,
                    sourceName: this.props.source.name || "",
                },
            ])
            // After caching completes, reload cached content
            const result = await window.utils.getCachedContent(
                item._id,
                item.content,
            )
            if (
                result &&
                result.fromCache &&
                item._id === this.props.item._id
            ) {
                this.setState({ cachedContent: result.content })
            }
            const fullResult = await window.utils.getCachedFullContent(item._id)
            if (
                fullResult &&
                fullResult.fromCache &&
                item._id === this.props.item._id
            ) {
                this.setState({ cachedFullContent: fullResult.content })
            }
        } catch (e) {
            console.error("On-demand cache error:", e)
        }
    }

    loadFull = async () => {
        this.setState({ fullContent: "", loaded: false, error: false })
        // Try cached full content first when aggressive cache is on
        try {
            if (window.settings.getAggressiveCache()) {
                const cached = await window.utils.getCachedFullContent(
                    this.props.item._id,
                )
                if (cached && cached.fromCache && cached.content) {
                    this.setState({
                        fullContent: cached.content,
                        cachedFullContent: cached.content,
                    })
                    return
                }
            }
        } catch (e) {
            console.error("Failed to load cached full content:", e)
        }
        const link = this.props.item.link
        try {
            const result = await fetch(link)
            if (!result || !result.ok) throw new Error()
            const html = await decodeFetchResponse(result, true)
            if (link === this.props.item.link) {
                this.setState({ fullContent: html })
            }
        } catch {
            if (link === this.props.item.link) {
                this.setState({
                    loaded: true,
                    error: true,
                    errorDescription: "MERCURY_PARSER_FAILURE",
                })
            }
        }
    }

    articleView = () => {
        let content: string
        if (this.state.translateLang && this.state.translatedContent) {
            content = this.state.translatedContent
        } else if (this.state.loadFull) {
            content = this.state.cachedFullContent || this.state.fullContent
        } else {
            content = this.state.cachedContent || this.props.item.content
        }
        const a = encodeURIComponent(content)
        const h = encodeURIComponent(
            renderToString(
                <>
                    <p className="title">{this.props.item.title}</p>
                    <p className="date">
                        {this.props.item.date.toLocaleString(
                            this.props.locale,
                            { hour12: !this.props.locale.startsWith("zh") },
                        )}
                    </p>
                    <article></article>
                </>,
            ),
        )
        return `article/article.html?a=${a}&h=${h}&f=${encodeURIComponent(
            this.state.fontFamily,
        )}&s=${this.state.fontSize}&d=${this.props.source.textDir}&u=${
            this.props.item.link
        }&m=${this.state.loadFull ? 1 : 0}`
    }

    render = () => (
        <FocusZone className="article">
            <Stack horizontal style={{ height: 36 }}>
                <span style={{ width: 96 }}></span>
                <Stack
                    className="actions"
                    grow
                    horizontal
                    tokens={{ childrenGap: 12 }}
                >
                    <Stack.Item grow>
                        <span className="source-name">
                            {this.state.loaded ? (
                                this.props.source.iconurl && (
                                    <img
                                        className="favicon"
                                        src={this.props.source.iconurl}
                                    />
                                )
                            ) : (
                                <Spinner size={1} />
                            )}
                            {this.props.source.name}
                            {this.props.item.creator && (
                                <span className="creator">
                                    {this.props.item.creator}
                                </span>
                            )}
                        </span>
                    </Stack.Item>
                    <CommandBarButton
                        title={
                            this.props.item.hasRead
                                ? intl.get("article.markUnread")
                                : intl.get("article.markRead")
                        }
                        iconProps={
                            this.props.item.hasRead
                                ? { iconName: "StatusCircleRing" }
                                : {
                                      iconName: "RadioBtnOn",
                                      style: {
                                          fontSize: 14,
                                          textAlign: "center",
                                      },
                                  }
                        }
                        onClick={() =>
                            this.props.toggleHasRead(this.props.item)
                        }
                    />
                    <CommandBarButton
                        title={
                            this.props.item.starred
                                ? intl.get("article.unstar")
                                : intl.get("article.star")
                        }
                        iconProps={{
                            iconName: this.props.item.starred
                                ? "FavoriteStarFill"
                                : "FavoriteStar",
                        }}
                        onClick={() =>
                            this.props.toggleStarred(this.props.item)
                        }
                    />
                    <CommandBarButton
                        title={intl.get("article.loadFull")}
                        className={this.state.loadFull ? "active" : ""}
                        iconProps={{ iconName: "RawSource" }}
                        onClick={this.toggleFull}
                    />
                    <CommandBarButton
                        title={intl.get("article.loadWebpage")}
                        className={this.state.loadWebpage ? "active" : ""}
                        iconProps={{ iconName: "Globe" }}
                        onClick={this.toggleWebpage}
                    />
                    <CommandBarButton
                        title={intl.get("article.translate")}
                        className={this.state.translateLang ? "active" : ""}
                        iconProps={{ iconName: "LocaleLanguage" }}
                        disabled={this.state.loadWebpage}
                        menuProps={this.translateMenuProps()}
                        menuIconProps={{ style: { display: "none" } }}
                    />
                    <CommandBarButton
                        title={intl.get("ai.askAI")}
                        className={this.state.showAIPanel ? "active" : ""}
                        iconProps={{ iconName: "Chat" }}
                        onClick={this.toggleAIPanel}
                    />
                    <CommandBarButton
                        title={intl.get("more")}
                        iconProps={{ iconName: "More" }}
                        menuIconProps={{ style: { display: "none" } }}
                        menuProps={this.moreMenuProps()}
                    />
                </Stack>
                <Stack horizontal horizontalAlign="end" style={{ width: 112 }}>
                    <CommandBarButton
                        title={intl.get("close")}
                        iconProps={{ iconName: "BackToWindow" }}
                        onClick={this.props.dismiss}
                    />
                </Stack>
            </Stack>
            {this.state.findInPage && (
                <div className="find-in-page-bar">
                    <input
                        ref={this.findInputRef}
                        type="text"
                        placeholder={intl.get("article.findInPage")}
                        value={this.state.findText}
                        onChange={e => this.handleFindChange(e.target.value)}
                        onKeyDown={this.handleFindKeyDown}
                    />
                    <span className="find-in-page-count">
                        {this.state.findText
                            ? this.state.findResult
                                ? this.state.findResult.matches > 0
                                    ? `${this.state.findResult.activeMatchOrdinal}/${this.state.findResult.matches}`
                                    : intl.get("article.noResults")
                                : ""
                            : ""}
                    </span>
                    <IconButton
                        iconProps={{ iconName: "ChevronUp" }}
                        title={intl.get("article.findPrevious")}
                        onClick={this.findPrevious}
                        disabled={
                            !this.state.findResult ||
                            this.state.findResult.matches === 0
                        }
                    />
                    <IconButton
                        iconProps={{ iconName: "ChevronDown" }}
                        title={intl.get("article.findNext")}
                        onClick={this.findNext}
                        disabled={
                            !this.state.findResult ||
                            this.state.findResult.matches === 0
                        }
                    />
                    <IconButton
                        iconProps={{ iconName: "Cancel" }}
                        title={intl.get("close")}
                        onClick={this.closeFindInPage}
                    />
                </div>
            )}
            {(!this.state.loadFull || this.state.fullContent) && (
                <webview
                    id="article"
                    className={this.state.error ? "error" : ""}
                    key={
                        this.props.item._id +
                        (this.state.loadWebpage ? "_" : "") +
                        (this.state.loadFull ? "__" : "") +
                        (this.state.translateLang && this.state.translatedContent
                            ? "___" + this.state.translateLang
                            : "")
                    }
                    src={
                        this.state.loadWebpage
                            ? this.props.item.link
                            : this.articleView()
                    }
                    allowpopups={"true" as unknown as boolean}
                    webpreferences="contextIsolation,disableDialogs,autoplayPolicy=document-user-activation-required"
                    partition={this.state.loadWebpage ? "sandbox" : undefined}
                />
            )}
            {(this.state.translating || this.state.translateStreamingText) && (
                <div
                    className="translating-overlay"
                    style={{
                        position: "absolute",
                        top: 36,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "var(--neutralLighterAlt, rgba(255,255,255,0.95))",
                        color: "var(--neutralPrimary)",
                        zIndex: 10,
                        overflow: "auto",
                        padding: "20px 24px",
                    }}
                >
                    <Stack
                        horizontal
                        verticalAlign="center"
                        tokens={{ childrenGap: 8 }}
                        style={{ marginBottom: 16 }}
                    >
                        {this.state.translating && <Spinner size={1} />}
                        <Stack.Item grow>
                            <span style={{ fontWeight: 600 }}>
                                {this.state.translating
                                    ? intl.get("article.translating")
                                    : ""}
                            </span>
                        </Stack.Item>
                        {this.state.translating && (
                            <IconButton
                                iconProps={{ iconName: "Stop" }}
                                title={intl.get("ai.stop")}
                                onClick={this.stopTranslation}
                                style={{ flexShrink: 0 }}
                            />
                        )}
                    </Stack>
                    {this.state.translateStreamingText && (
                        <div style={{
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.7,
                            fontSize: this.state.fontSize,
                            fontFamily: this.state.fontFamily || "inherit",
                        }}>
                            {this.state.translateStreamingText}
                        </div>
                    )}
                </div>
            )}
            {this.state.error && (
                <Stack
                    className="error-prompt"
                    verticalAlign="center"
                    horizontalAlign="center"
                    tokens={{ childrenGap: 12 }}
                >
                    <Icon iconName="HeartBroken" style={{ fontSize: 32 }} />
                    <Stack
                        horizontal
                        horizontalAlign="center"
                        tokens={{ childrenGap: 7 }}
                    >
                        <small>{intl.get("article.error")}</small>
                        <small>
                            <Link onClick={this.webviewReload}>
                                {intl.get("article.reload")}
                            </Link>
                        </small>
                    </Stack>
                    <span style={{ fontSize: 11 }}>
                        {this.state.errorDescription}
                    </span>
                </Stack>
            )}
            {this.state.showAIPanel && (
                <AIPanel
                    item={this.props.item}
                    fullContent={this.state.fullContent}
                    onClose={this.closeAIPanel}
                    getAnchorRect={this.getAnchorRect}
                    quotedText={this.state.aiQuotedText}
                    selectionContext={this.state.aiSelectionContext}
                    isWebpage={this.state.loadWebpage}
                    requestClose={this.state.aiRequestClose}
                    clearRequestClose={this.clearAIRequestClose}
                />
            )}
        </FocusZone>
    )
}

export default Article
