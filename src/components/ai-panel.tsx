import * as React from "react"
import * as ReactDOM from "react-dom"
import intl from "react-intl-universal"
import {
    IconButton,
    Stack,
    Dialog,
    DialogType,
    DialogFooter,
    PrimaryButton,
    DefaultButton,
} from "@fluentui/react"
import { marked } from "marked"
import DOMPurify from "dompurify"
import { RSSItem } from "../scripts/models/item"
import {
    sendChatMessageStreaming,
    ChatMessage,
    createArticleContextMessage,
    createSelectionContextMessage,
    isAIConfigured,
    getAIConfig,
} from "../scripts/ai-service"
import {
    AIMessage,
    AIConversationTab,
    getAIHistory,
    setAIHistory,
    getAITabs,
    addAITab,
    removeAITab,
    renameAITab,
} from "../scripts/ai-history"
import { htmlToPlainText } from "../scripts/utils"
import { TRANSLATE_LANGUAGES } from "../scripts/translate-cache"

type AIMessageDisplay = AIMessage & { streaming?: boolean }

interface BuiltinPrompt {
    nameKey: string
    contentKey: string
    icon: string
    /** If true, prompt the user for a target language before filling input */
    needsLang?: boolean
}

const BUILTIN_PROMPTS: BuiltinPrompt[] = [
    {
        nameKey: "ai.builtinSummarize",
        contentKey: "ai.builtinSummarizeContent",
        icon: "BulletedList2",
    },
    {
        nameKey: "ai.builtinTranslate",
        contentKey: "ai.builtinTranslateContent",
        icon: "LocaleLanguage",
        needsLang: true,
    },
    {
        nameKey: "ai.builtinExplain",
        contentKey: "ai.builtinExplainContent",
        icon: "Lightbulb",
    },
    {
        nameKey: "ai.builtinKeyPoints",
        contentKey: "ai.builtinKeyPointsContent",
        icon: "Pinned",
    },
    {
        nameKey: "ai.builtinSentiment",
        contentKey: "ai.builtinSentimentContent",
        icon: "Emoji2",
    },
]

type AIPanelProps = {
    item: RSSItem
    fullContent?: string
    onClose: () => void
    getAnchorRect: () => DOMRect | null
    quotedText?: string
    selectionContext?: string
    isWebpage?: boolean
    requestClose?: boolean
    clearRequestClose?: () => void
}

const MIN_WIDTH = 250
const DEFAULT_WIDTH = 400

function renderMarkdown(content: string): string {
    const html = marked.parse(content, { async: false }) as string
    return DOMPurify.sanitize(html)
}

/** Memoized single-message component — skips re-render when props haven't changed */
const AIMessageItem = React.memo<{
    msg: AIMessageDisplay
    idx: number
    copiedIndex: number | null
    onCopy: (content: string, idx: number) => void
}>(({ msg, idx, copiedIndex, onCopy }) => {
    const htmlContent = React.useMemo(
        () => (msg.role === "assistant" ? renderMarkdown(msg.content) : ""),
        [msg.role, msg.content],
    )

    return (
        <div className={`ai-message ai-message-${msg.role}`}>
            <div className="ai-message-header">
                <span className="ai-message-role">
                    {msg.role === "user" ? "You" : "AI"}
                </span>
                {msg.role === "assistant" &&
                    !msg.streaming &&
                    (copiedIndex === idx ? (
                        <span className="ai-copied-hint">
                            {intl.get("ai.copied")}
                        </span>
                    ) : (
                        <IconButton
                            className="ai-copy-btn"
                            iconProps={{ iconName: "Copy" }}
                            title={intl.get("ai.copyMessage")}
                            onClick={() => onCopy(msg.content, idx)}
                        />
                    ))}
            </div>
            {msg.role === "assistant" ? (
                <div
                    className="ai-markdown"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
            ) : (
                <div
                    className="ai-message-content"
                    dangerouslySetInnerHTML={{
                        __html: renderMarkdown(msg.content),
                    }}
                />
            )}
            {msg.streaming && (
                <span className="ai-thinking">{intl.get("ai.thinking")}</span>
            )}
        </div>
    )
})

const AIPanel: React.FC<AIPanelProps> = ({
    item,
    fullContent,
    onClose,
    getAnchorRect,
    quotedText: quotedTextProp,
    selectionContext,
    isWebpage,
    requestClose,
    clearRequestClose,
}) => {
    const [messages, setMessages] = React.useState<AIMessageDisplay[]>([])
    const [input, setInput] = React.useState("")
    const [quotedText, setQuotedText] = React.useState<string | undefined>(
        quotedTextProp,
    )
    const [isStreaming, setIsStreaming] = React.useState(false)
    const [showContextPreview, setShowContextPreview] = React.useState(false)
    const [tabs, setTabs] = React.useState<AIConversationTab[]>([])
    const [activeTabId, setActiveTabId] = React.useState<string | null>(null)
    const [editingTabId, setEditingTabId] = React.useState<string | null>(null)
    const [editingTabTitle, setEditingTabTitle] = React.useState("")
    const [pendingCloseTabId, setPendingCloseTabId] = React.useState<
        string | null
    >(null)
    const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null)
    const [showTranslateMenu, setShowTranslateMenu] = React.useState(false)
    const [pendingClose, setPendingClose] = React.useState(false)
    const [panelWidth, setPanelWidth] = React.useState(() => {
        const saved = localStorage.getItem("ai-panel-width")
        return saved ? parseInt(saved, 10) : DEFAULT_WIDTH
    })

    const messagesEndRef = React.useRef<HTMLDivElement>(null)
    const inputRef = React.useRef<HTMLTextAreaElement>(null)
    const abortControllerRef = React.useRef<AbortController | null>(null)
    const accumulatedRef = React.useRef("")
    const isDraggingRef = React.useRef(false)

    // Track anchor element rect for fixed positioning
    const [anchorRect, setAnchorRect] = React.useState<DOMRect | null>(null)
    React.useEffect(() => {
        const update = () => {
            setAnchorRect(getAnchorRect())
        }
        update()
        window.addEventListener("resize", update)
        return () => window.removeEventListener("resize", update)
    }, [getAnchorRect])

    // Auto-focus input when panel mounts
    React.useEffect(() => {
        // Delay focus to ensure portal is rendered and FocusZone won't steal it
        const timer = setTimeout(() => {
            inputRef.current?.focus()
        }, 50)
        return () => clearTimeout(timer)
    }, [])

    // Abort streaming on unmount
    React.useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
                abortControllerRef.current = null
            }
        }
    }, [])

    // Load tabs and history when item changes
    React.useEffect(() => {
        let existingTabs = getAITabs(item._id)
        if (existingTabs.length === 0) {
            // Create a default tab
            const tab = addAITab(item._id)
            existingTabs = [tab]
        }
        setTabs(existingTabs)
        const firstTab = existingTabs[0]
        setActiveTabId(firstTab.id)
        const history = getAIHistory(item._id, firstTab.id)
        setMessages(history)
        setInput("")
        setIsStreaming(false)
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
    }, [item._id])

    // Sync quoted text from prop when it changes
    React.useEffect(() => {
        setQuotedText(quotedTextProp)
    }, [quotedTextProp])

    // Auto-scroll to bottom
    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Save to localStorage when messages change (skip streaming messages)
    React.useEffect(() => {
        if (!isStreaming && activeTabId) {
            const toSave = messages.map(({ role, content }) => ({
                role,
                content,
            }))
            if (toSave.length > 0) {
                setAIHistory(item._id, activeTabId, toSave)
            }
        }
    }, [messages, isStreaming, item._id, activeTabId])

    const handleSend = () => {
        const text = input.trim()
        if (!text || isStreaming) return
        if (!isAIConfigured()) return

        // Build display message (what user sees)
        const displayContent = quotedText ? `> ${quotedText}\n\n${text}` : text
        const userMsg: AIMessageDisplay = {
            role: "user",
            content: displayContent,
        }
        const assistantMsg: AIMessageDisplay = {
            role: "assistant",
            content: "",
            streaming: true,
        }
        const newMessages = [...messages, userMsg, assistantMsg]
        setMessages(newMessages)
        setInput("")
        setQuotedText(undefined)
        setIsStreaming(true)
        accumulatedRef.current = ""

        // Auto-name tab from first user message
        if (activeTabId && messages.length === 0) {
            const autoTitle =
                text.substring(0, 20).trim() || intl.get("ai.defaultTabName")
            renameAITab(item._id, activeTabId, autoTitle)
            setTabs(getAITabs(item._id))
        }

        const effectiveContent = fullContent || item.content
        const contentLimit = getAIConfig()?.contentLimit || 8000
        const contextMsg = selectionContext
            ? createSelectionContextMessage(selectionContext)
            : createArticleContextMessage(
                  item.title,
                  effectiveContent,
                  contentLimit,
              )
        const chatMessages: ChatMessage[] = [
            contextMsg,
            ...newMessages
                .filter(m => !m.streaming)
                .map(m => ({
                    role: m.role as "user" | "assistant",
                    content: m.content,
                })),
        ]

        // Add preset prompt system messages if configured
        const config = getAIConfig()
        if (config?.prompts?.length) {
            const promptMsgs: ChatMessage[] = config.prompts.map(p => ({
                role: "system" as const,
                content: p.content,
            }))
            chatMessages.splice(1, 0, ...promptMsgs)
        }

        const controller = new AbortController()
        abortControllerRef.current = controller

        sendChatMessageStreaming(
            chatMessages,
            (chunk: string) => {
                accumulatedRef.current += chunk
                const content = accumulatedRef.current
                setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                        role: "assistant",
                        content: content,
                        streaming: true,
                    }
                    return updated
                })
            },
            (error: string) => {
                setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                        role: "assistant",
                        content: intl.get("ai.error") + ": " + error,
                    }
                    return updated
                })
                setIsStreaming(false)
                abortControllerRef.current = null
                setTimeout(() => inputRef.current?.focus(), 0)
            },
            () => {
                setMessages(prev => {
                    const updated = [...prev]
                    const last = updated[updated.length - 1]
                    updated[updated.length - 1] = {
                        role: last.role,
                        content: last.content,
                    }
                    return updated
                })
                setIsStreaming(false)
                abortControllerRef.current = null
                setTimeout(() => inputRef.current?.focus(), 0)
            },
            controller.signal,
        )
    }

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last?.streaming) {
                updated[updated.length - 1] = {
                    role: last.role,
                    content: last.content,
                }
            }
            return updated
        })
        setIsStreaming(false)
        setTimeout(() => inputRef.current?.focus(), 0)
    }

    const handleCopy = React.useCallback((content: string, index: number) => {
        navigator.clipboard.writeText(content)
        setCopiedIndex(index)
        setTimeout(() => setCopiedIndex(null), 1500)
    }, [])

    const handleClose = () => {
        if (isStreaming) {
            setPendingClose(true)
        } else {
            onClose()
        }
    }

    const confirmClose = () => {
        handleStop()
        setPendingClose(false)
        // Delay one frame so stop state updates and history save logic complete
        setTimeout(() => onClose(), 0)
    }

    // Handle requestClose from parent (toolbar Chat button)
    React.useEffect(() => {
        if (requestClose) {
            clearRequestClose?.()
            handleClose()
        }
    }, [requestClose])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handlePresetPrompt = (promptContent: string) => {
        if (isStreaming) return
        setInput(promptContent)
    }

    const handleBuiltinPrompt = (prompt: BuiltinPrompt) => {
        if (isStreaming) return
        if (prompt.needsLang) {
            setShowTranslateMenu(prev => !prev)
            return
        }
        setInput(intl.get(prompt.contentKey))
        setShowTranslateMenu(false)
    }

    const handleTranslateTo = (lang: string) => {
        const translatePrompt = BUILTIN_PROMPTS.find(p => p.needsLang)
        if (translatePrompt) {
            setInput(intl.get(translatePrompt.contentKey, { lang }))
        }
        setShowTranslateMenu(false)
    }

    const handleClearConversation = () => {
        if (isStreaming) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
                abortControllerRef.current = null
            }
            setIsStreaming(false)
        }
        setMessages([])
        if (activeTabId) {
            setAIHistory(item._id, activeTabId, [])
        }
        setTimeout(() => inputRef.current?.focus(), 0)
    }

    // ─── Tab handlers ────────────────────────────────────────

    const handleTabSwitch = (tabId: string) => {
        if (tabId === activeTabId) return
        // Abort streaming if active
        if (isStreaming && abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
            setIsStreaming(false)
        }
        // Save current messages before switching
        if (activeTabId) {
            const toSave = messages.map(({ role, content }) => ({
                role,
                content,
            }))
            if (toSave.length > 0) {
                setAIHistory(item._id, activeTabId, toSave)
            }
        }
        setActiveTabId(tabId)
        const history = getAIHistory(item._id, tabId)
        setMessages(history)
        setInput("")
        setTimeout(() => inputRef.current?.focus(), 0)
    }

    const handleTabAdd = () => {
        // Abort streaming if active
        if (isStreaming && abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
            setIsStreaming(false)
        }
        // Save current tab
        if (activeTabId) {
            const toSave = messages.map(({ role, content }) => ({
                role,
                content,
            }))
            if (toSave.length > 0) {
                setAIHistory(item._id, activeTabId, toSave)
            }
        }
        const tab = addAITab(item._id)
        setTabs(getAITabs(item._id))
        setActiveTabId(tab.id)
        setMessages([])
        setInput("")
        setTimeout(() => inputRef.current?.focus(), 0)
    }

    const handleTabClose = (e: React.MouseEvent, tabId: string) => {
        e.stopPropagation()
        if (tabs.length <= 1) return // keep at least 1
        setPendingCloseTabId(tabId)
    }

    const confirmTabClose = () => {
        const tabId = pendingCloseTabId
        setPendingCloseTabId(null)
        if (!tabId) return
        if (tabs.length <= 1) return
        removeAITab(item._id, tabId)
        const updatedTabs = getAITabs(item._id)
        setTabs(updatedTabs)
        if (tabId === activeTabId) {
            // Switch to adjacent tab
            const oldIndex = tabs.findIndex(t => t.id === tabId)
            const newTab =
                updatedTabs[Math.min(oldIndex, updatedTabs.length - 1)]
            setActiveTabId(newTab.id)
            setMessages(getAIHistory(item._id, newTab.id))
            setInput("")
        }
    }

    const handleTabDoubleClick = (tabId: string) => {
        const tab = tabs.find(t => t.id === tabId)
        if (!tab) return
        setEditingTabId(tabId)
        setEditingTabTitle(tab.title)
    }

    const commitTabRename = () => {
        if (editingTabId) {
            const title =
                editingTabTitle.trim() || intl.get("ai.defaultTabName")
            renameAITab(item._id, editingTabId, title)
            setTabs(getAITabs(item._id))
            setEditingTabId(null)
            setEditingTabTitle("")
        }
    }

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            commitTabRename()
        } else if (e.key === "Escape") {
            setEditingTabId(null)
            setEditingTabTitle("")
        }
    }

    const [isDragging, setIsDragging] = React.useState(false)

    // Drag resize handler
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        isDraggingRef.current = true
        setIsDragging(true)
        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none"

        const startX = e.clientX
        const startWidth = panelWidth
        const maxWidth = getAnchorRect()?.width || startWidth

        const clamp = (w: number) => Math.min(maxWidth, Math.max(MIN_WIDTH, w))

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDraggingRef.current) return
            const diff = startX - e.clientX
            setPanelWidth(clamp(startWidth + diff))
        }

        const handleMouseUp = (e: MouseEvent) => {
            isDraggingRef.current = false
            setIsDragging(false)
            document.body.style.cursor = ""
            document.body.style.userSelect = ""
            const diff = startX - e.clientX
            const finalWidth = clamp(startWidth + diff)
            localStorage.setItem("ai-panel-width", String(finalWidth))
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
        }

        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("mouseup", handleMouseUp)
    }

    const config = getAIConfig()
    const configured = isAIConfigured()

    const isFull = !isWebpage && !!fullContent
    const isSelectionOnly = !!selectionContext
    const isWebpageMode = !!isWebpage && !selectionContext
    const effectiveContent = selectionContext || fullContent || item.content
    const contentLimit = config?.contentLimit || 8000
    const plainText = htmlToPlainText(effectiveContent).substring(
        0,
        contentLimit,
    )
    const charCount = plainText.length

    if (!anchorRect) return null

    const effectiveWidth = Math.min(panelWidth, anchorRect.width)

    // Find the FocusTrapZone container (.article-container) used in card view.
    // When it exists, backdrop-filter on it creates a new containing block,
    // making position:fixed relative to it instead of the viewport.
    // We portal into that container so focus stays inside the trap zone,
    // and adjust coordinates to be relative to it.
    const trapZone = document.querySelector(
        ".article-container",
    ) as HTMLElement | null
    const portalTarget = trapZone || document.body

    let panelTop = anchorRect.top
    let panelRight = window.innerWidth - anchorRect.right

    if (trapZone) {
        const trapRect = trapZone.getBoundingClientRect()
        panelTop = anchorRect.top - trapRect.top
        panelRight = trapRect.right - anchorRect.right
    }

    const panelStyle: React.CSSProperties = {
        width: effectiveWidth,
        position: "fixed",
        top: panelTop,
        right: panelRight,
        height: anchorRect.height,
    }

    return ReactDOM.createPortal(
        <>
            {isDragging && <div className="ai-drag-overlay" />}
            <div
                className="ai-panel"
                style={panelStyle}
                onKeyDown={e => e.stopPropagation()}
                onFocus={e => e.stopPropagation()}
                onClick={() => showTranslateMenu && setShowTranslateMenu(false)}
            >
                <div className="ai-panel-drag" onMouseDown={handleMouseDown} />
                <div className="ai-panel-header">
                    <Stack
                        horizontal
                        verticalAlign="center"
                        tokens={{ childrenGap: 8 }}
                    >
                        <Stack.Item grow>
                            <span className="ai-panel-title">
                                {intl.get("ai.name")}
                            </span>
                        </Stack.Item>
                        <IconButton
                            iconProps={{ iconName: "EraseTool" }}
                            title={intl.get("ai.clearChat")}
                            onClick={handleClearConversation}
                            disabled={messages.length === 0 && !isStreaming}
                        />
                        <IconButton
                            iconProps={{ iconName: "Cancel" }}
                            title={intl.get("close")}
                            onClick={handleClose}
                        />
                    </Stack>
                </div>
                <div className="ai-tabs-bar">
                    <div className="ai-tabs-list">
                        {tabs.map(tab => (
                            <div
                                key={tab.id}
                                className={`ai-tab${tab.id === activeTabId ? " active" : ""}`}
                                onClick={() => handleTabSwitch(tab.id)}
                                onDoubleClick={() =>
                                    handleTabDoubleClick(tab.id)
                                }
                            >
                                {editingTabId === tab.id ? (
                                    <input
                                        className="ai-tab-title-input"
                                        value={editingTabTitle}
                                        onChange={e =>
                                            setEditingTabTitle(e.target.value)
                                        }
                                        onBlur={commitTabRename}
                                        onKeyDown={handleRenameKeyDown}
                                        autoFocus
                                        onClick={e => e.stopPropagation()}
                                    />
                                ) : (
                                    <span
                                        className="ai-tab-title"
                                        title={tab.title}
                                    >
                                        {tab.title}
                                    </span>
                                )}
                                {tabs.length > 1 && (
                                    <button
                                        className="ai-tab-close"
                                        title={intl.get("ai.closeTab")}
                                        onClick={e => handleTabClose(e, tab.id)}
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button
                        className="ai-tab-add"
                        title={intl.get("ai.newChat")}
                        onClick={handleTabAdd}
                    >
                        +
                    </button>
                </div>
                <div
                    className="ai-context-bar"
                    onClick={() => setShowContextPreview(prev => !prev)}
                >
                    <span
                        className={`ai-context-bar-dot ${isWebpageMode ? "webpage" : isSelectionOnly ? "selection" : isFull ? "full" : "partial"}`}
                    />
                    <span className="ai-context-bar-text">
                        {isWebpageMode
                            ? intl.get("ai.contextWebpage")
                            : isSelectionOnly
                              ? intl.get("ai.contextSelection")
                              : isFull
                                ? intl.get("ai.contextFull")
                                : intl.get("ai.contextPartial")}
                        {" · "}
                        {intl.get("ai.contextChars", { count: charCount })}
                    </span>
                    <span className="ai-context-bar-toggle">
                        {showContextPreview ? "▴" : "▾"}
                    </span>
                </div>
                {showContextPreview && (
                    <div className="ai-context-preview">
                        <strong>Title:</strong> {item.title}
                        {"\n\n"}
                        <strong>Content:</strong>
                        {"\n"}
                        {plainText}
                    </div>
                )}
                <div className="ai-messages">
                    {!configured && (
                        <div className="ai-no-config">
                            {intl.get("ai.noConfig")}
                        </div>
                    )}
                    {messages.map((msg, idx) => (
                        <AIMessageItem
                            key={idx}
                            msg={msg}
                            idx={idx}
                            copiedIndex={copiedIndex}
                            onCopy={handleCopy}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="ai-preset-prompts">
                    {config?.showBuiltinPrompts !== false && (
                        <div className="ai-builtin-prompts">
                            {BUILTIN_PROMPTS.map((p, idx) => (
                                <span
                                    key={idx}
                                    className="ai-builtin-btn-wrapper"
                                >
                                    <button
                                        className="ai-preset-btn ai-builtin-btn"
                                        onClick={() => handleBuiltinPrompt(p)}
                                        disabled={isStreaming}
                                        title={intl.get(p.contentKey)}
                                    >
                                        <IconButton
                                            iconProps={{ iconName: p.icon }}
                                            className="ai-builtin-icon"
                                            tabIndex={-1}
                                        />
                                        {intl.get(p.nameKey)}
                                    </button>
                                    {p.needsLang && showTranslateMenu && (
                                        <div
                                            className="ai-translate-menu"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            {TRANSLATE_LANGUAGES.map(lang => (
                                                <button
                                                    key={lang}
                                                    className="ai-translate-lang-btn"
                                                    onClick={() =>
                                                        handleTranslateTo(lang)
                                                    }
                                                >
                                                    {lang}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </span>
                            ))}
                        </div>
                    )}
                    {config?.prompts?.length > 0 && (
                        <div className="ai-custom-prompts">
                            {config.prompts.map((p, idx) => (
                                <button
                                    key={idx}
                                    className="ai-preset-btn"
                                    onClick={() =>
                                        handlePresetPrompt(p.content)
                                    }
                                    disabled={isStreaming}
                                    title={p.content}
                                >
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {quotedText && (
                    <div className="ai-quote-bar">
                        <div className="ai-quote-content">{quotedText}</div>
                        <IconButton
                            className="ai-quote-dismiss"
                            iconProps={{ iconName: "Cancel" }}
                            title={intl.get("ai.removeQuote")}
                            onClick={() => setQuotedText(undefined)}
                        />
                    </div>
                )}

                <div className="ai-input-area">
                    <textarea
                        ref={inputRef}
                        className="ai-input"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={intl.get("ai.inputPlaceholder")}
                        disabled={!configured || isStreaming}
                        rows={3}
                    />
                    <div className="ai-input-actions">
                        {isStreaming ? (
                            <IconButton
                                iconProps={{ iconName: "Stop" }}
                                title={intl.get("ai.stop")}
                                onClick={handleStop}
                            />
                        ) : (
                            <IconButton
                                iconProps={{ iconName: "Send" }}
                                title={intl.get("ai.send")}
                                onClick={handleSend}
                                disabled={!configured || !input.trim()}
                            />
                        )}
                    </div>
                </div>

                <Dialog
                    hidden={!pendingCloseTabId}
                    onDismiss={() => setPendingCloseTabId(null)}
                    dialogContentProps={{
                        type: DialogType.normal,
                        title: intl.get("ai.confirmCloseTab"),
                        subText: intl.get("ai.confirmCloseTabSubtitle"),
                    }}
                >
                    <DialogFooter>
                        <PrimaryButton
                            onClick={confirmTabClose}
                            text={intl.get("confirm")}
                        />
                        <DefaultButton
                            onClick={() => setPendingCloseTabId(null)}
                            text={intl.get("cancel")}
                        />
                    </DialogFooter>
                </Dialog>

                <Dialog
                    hidden={!pendingClose}
                    onDismiss={() => setPendingClose(false)}
                    dialogContentProps={{
                        type: DialogType.normal,
                        title: intl.get("ai.confirmClosePanel"),
                        subText: intl.get("ai.confirmClosePanelSubtitle"),
                    }}
                >
                    <DialogFooter>
                        <PrimaryButton
                            onClick={confirmClose}
                            text={intl.get("confirm")}
                        />
                        <DefaultButton
                            onClick={() => setPendingClose(false)}
                            text={intl.get("cancel")}
                        />
                    </DialogFooter>
                </Dialog>
            </div>
        </>,
        portalTarget,
    )
}

export default AIPanel
