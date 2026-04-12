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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const React = __importStar(require("react"));
const ReactDOM = __importStar(require("react-dom"));
const react_intl_universal_1 = __importDefault(require("react-intl-universal"));
const react_1 = require("@fluentui/react");
const marked_1 = require("marked");
const dompurify_1 = __importDefault(require("dompurify"));
const ai_service_1 = require("../scripts/ai-service");
const ai_history_1 = require("../scripts/ai-history");
const BUILTIN_PROMPTS = [
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
];
const MIN_WIDTH = 250;
const DEFAULT_WIDTH = 400;
function renderMarkdown(content) {
    const html = marked_1.marked.parse(content, { async: false });
    return dompurify_1.default.sanitize(html);
}
/** Memoized single-message component — skips re-render when props haven't changed */
const AIMessageItem = React.memo(({ msg, idx, copiedIndex, onCopy }) => {
    const htmlContent = React.useMemo(() => (msg.role === "assistant" ? renderMarkdown(msg.content) : ""), [msg.role, msg.content]);
    return (React.createElement("div", { className: `ai-message ai-message-${msg.role}` },
        React.createElement("div", { className: "ai-message-header" },
            React.createElement("span", { className: "ai-message-role" }, msg.role === "user" ? "You" : "AI"),
            msg.role === "assistant" &&
                !msg.streaming &&
                (copiedIndex === idx ? (React.createElement("span", { className: "ai-copied-hint" }, react_intl_universal_1.default.get("ai.copied"))) : (React.createElement(react_1.IconButton, { className: "ai-copy-btn", iconProps: { iconName: "Copy" }, title: react_intl_universal_1.default.get("ai.copyMessage"), onClick: () => onCopy(msg.content, idx) })))),
        msg.role === "assistant" ? (React.createElement("div", { className: "ai-markdown", dangerouslySetInnerHTML: { __html: htmlContent } })) : (React.createElement("div", { className: "ai-message-content", dangerouslySetInnerHTML: {
                __html: renderMarkdown(msg.content),
            } })),
        msg.streaming && (React.createElement("span", { className: "ai-thinking" }, react_intl_universal_1.default.get("ai.thinking")))));
});
const AIPanel = ({ item, fullContent, onClose, getAnchorRect, quotedText: quotedTextProp, selectionContext, isWebpage, requestClose, clearRequestClose, }) => {
    var _a;
    const [messages, setMessages] = React.useState([]);
    const [input, setInput] = React.useState("");
    const [quotedText, setQuotedText] = React.useState(quotedTextProp);
    const [isStreaming, setIsStreaming] = React.useState(false);
    const [showContextPreview, setShowContextPreview] = React.useState(false);
    const [tabs, setTabs] = React.useState([]);
    const [activeTabId, setActiveTabId] = React.useState(null);
    const [editingTabId, setEditingTabId] = React.useState(null);
    const [editingTabTitle, setEditingTabTitle] = React.useState("");
    const [pendingCloseTabId, setPendingCloseTabId] = React.useState(null);
    const [copiedIndex, setCopiedIndex] = React.useState(null);
    const [showTranslateMenu, setShowTranslateMenu] = React.useState(false);
    const [pendingClose, setPendingClose] = React.useState(false);
    const [panelWidth, setPanelWidth] = React.useState(() => {
        const saved = localStorage.getItem("ai-panel-width");
        return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
    });
    const messagesEndRef = React.useRef(null);
    const inputRef = React.useRef(null);
    const abortControllerRef = React.useRef(null);
    const accumulatedRef = React.useRef("");
    const isDraggingRef = React.useRef(false);
    // Track anchor element rect for fixed positioning
    const [anchorRect, setAnchorRect] = React.useState(null);
    React.useEffect(() => {
        const update = () => {
            setAnchorRect(getAnchorRect());
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, [getAnchorRect]);
    // Auto-focus input when panel mounts
    React.useEffect(() => {
        // Delay focus to ensure portal is rendered and FocusZone won't steal it
        const timer = setTimeout(() => {
            var _a;
            (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus();
        }, 50);
        return () => clearTimeout(timer);
    }, []);
    // Abort streaming on unmount
    React.useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, []);
    // Load tabs and history when item changes
    React.useEffect(() => {
        let existingTabs = (0, ai_history_1.getAITabs)(item._id);
        if (existingTabs.length === 0) {
            // Create a default tab
            const tab = (0, ai_history_1.addAITab)(item._id);
            existingTabs = [tab];
        }
        setTabs(existingTabs);
        const firstTab = existingTabs[0];
        setActiveTabId(firstTab.id);
        const history = (0, ai_history_1.getAIHistory)(item._id, firstTab.id);
        setMessages(history);
        setInput("");
        setIsStreaming(false);
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, [item._id]);
    // Sync quoted text from prop when it changes
    React.useEffect(() => {
        setQuotedText(quotedTextProp);
    }, [quotedTextProp]);
    // Auto-scroll to bottom
    React.useEffect(() => {
        var _a;
        (_a = messagesEndRef.current) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: "smooth" });
    }, [messages]);
    // Save to localStorage when messages change (skip streaming messages)
    React.useEffect(() => {
        if (!isStreaming && activeTabId) {
            const toSave = messages.map(({ role, content }) => ({
                role,
                content,
            }));
            if (toSave.length > 0) {
                (0, ai_history_1.setAIHistory)(item._id, activeTabId, toSave);
            }
        }
    }, [messages, isStreaming, item._id, activeTabId]);
    const handleSend = () => {
        var _a;
        const text = input.trim();
        if (!text || isStreaming)
            return;
        if (!(0, ai_service_1.isAIConfigured)())
            return;
        // Build display message (what user sees)
        const displayContent = quotedText ? `> ${quotedText}\n\n${text}` : text;
        const userMsg = {
            role: "user",
            content: displayContent,
        };
        const assistantMsg = {
            role: "assistant",
            content: "",
            streaming: true,
        };
        const newMessages = [...messages, userMsg, assistantMsg];
        setMessages(newMessages);
        setInput("");
        setQuotedText(undefined);
        setIsStreaming(true);
        accumulatedRef.current = "";
        // Auto-name tab from first user message
        if (activeTabId && messages.length === 0) {
            const autoTitle = text.substring(0, 20).trim() || react_intl_universal_1.default.get("ai.defaultTabName");
            (0, ai_history_1.renameAITab)(item._id, activeTabId, autoTitle);
            setTabs((0, ai_history_1.getAITabs)(item._id));
        }
        const effectiveContent = fullContent || item.content;
        const contextMsg = selectionContext
            ? (0, ai_service_1.createSelectionContextMessage)(selectionContext)
            : (0, ai_service_1.createArticleContextMessage)(item.title, effectiveContent);
        const chatMessages = [
            contextMsg,
            ...newMessages
                .filter(m => !m.streaming)
                .map(m => ({
                role: m.role,
                content: m.content,
            })),
        ];
        // Add preset prompt system messages if configured
        const config = (0, ai_service_1.getAIConfig)();
        if ((_a = config === null || config === void 0 ? void 0 : config.prompts) === null || _a === void 0 ? void 0 : _a.length) {
            const promptMsgs = config.prompts.map(p => ({
                role: "system",
                content: p.content,
            }));
            chatMessages.splice(1, 0, ...promptMsgs);
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;
        (0, ai_service_1.sendChatMessageStreaming)(chatMessages, (chunk) => {
            accumulatedRef.current += chunk;
            const content = accumulatedRef.current;
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: "assistant",
                    content: content,
                    streaming: true,
                };
                return updated;
            });
        }, (error) => {
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: "assistant",
                    content: react_intl_universal_1.default.get("ai.error") + ": " + error,
                };
                return updated;
            });
            setIsStreaming(false);
            abortControllerRef.current = null;
            setTimeout(() => { var _a; return (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }, 0);
        }, () => {
            setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                    role: last.role,
                    content: last.content,
                };
                return updated;
            });
            setIsStreaming(false);
            abortControllerRef.current = null;
            setTimeout(() => { var _a; return (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }, 0);
        }, controller.signal);
    };
    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last === null || last === void 0 ? void 0 : last.streaming) {
                updated[updated.length - 1] = {
                    role: last.role,
                    content: last.content,
                };
            }
            return updated;
        });
        setIsStreaming(false);
        setTimeout(() => { var _a; return (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }, 0);
    };
    const handleCopy = React.useCallback((content, index) => {
        navigator.clipboard.writeText(content);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 1500);
    }, []);
    const handleClose = () => {
        if (isStreaming) {
            setPendingClose(true);
        }
        else {
            onClose();
        }
    };
    const confirmClose = () => {
        handleStop();
        setPendingClose(false);
        // Delay one frame so stop state updates and history save logic complete
        setTimeout(() => onClose(), 0);
    };
    // Handle requestClose from parent (toolbar Chat button)
    React.useEffect(() => {
        if (requestClose) {
            clearRequestClose === null || clearRequestClose === void 0 ? void 0 : clearRequestClose();
            handleClose();
        }
    }, [requestClose]);
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    const handlePresetPrompt = (promptContent) => {
        if (isStreaming)
            return;
        setInput(promptContent);
    };
    const TRANSLATE_LANGUAGES = [
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
    ];
    const handleBuiltinPrompt = (prompt) => {
        if (isStreaming)
            return;
        if (prompt.needsLang) {
            setShowTranslateMenu(prev => !prev);
            return;
        }
        setInput(react_intl_universal_1.default.get(prompt.contentKey));
        setShowTranslateMenu(false);
    };
    const handleTranslateTo = (lang) => {
        const translatePrompt = BUILTIN_PROMPTS.find(p => p.needsLang);
        if (translatePrompt) {
            setInput(react_intl_universal_1.default.get(translatePrompt.contentKey, { lang }));
        }
        setShowTranslateMenu(false);
    };
    const handleClearConversation = () => {
        if (isStreaming) {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
            setIsStreaming(false);
        }
        setMessages([]);
        if (activeTabId) {
            (0, ai_history_1.setAIHistory)(item._id, activeTabId, []);
        }
        setTimeout(() => { var _a; return (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }, 0);
    };
    // ─── Tab handlers ────────────────────────────────────────
    const handleTabSwitch = (tabId) => {
        if (tabId === activeTabId)
            return;
        // Abort streaming if active
        if (isStreaming && abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsStreaming(false);
        }
        // Save current messages before switching
        if (activeTabId) {
            const toSave = messages.map(({ role, content }) => ({
                role,
                content,
            }));
            if (toSave.length > 0) {
                (0, ai_history_1.setAIHistory)(item._id, activeTabId, toSave);
            }
        }
        setActiveTabId(tabId);
        const history = (0, ai_history_1.getAIHistory)(item._id, tabId);
        setMessages(history);
        setInput("");
        setTimeout(() => { var _a; return (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }, 0);
    };
    const handleTabAdd = () => {
        // Abort streaming if active
        if (isStreaming && abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsStreaming(false);
        }
        // Save current tab
        if (activeTabId) {
            const toSave = messages.map(({ role, content }) => ({
                role,
                content,
            }));
            if (toSave.length > 0) {
                (0, ai_history_1.setAIHistory)(item._id, activeTabId, toSave);
            }
        }
        const tab = (0, ai_history_1.addAITab)(item._id);
        setTabs((0, ai_history_1.getAITabs)(item._id));
        setActiveTabId(tab.id);
        setMessages([]);
        setInput("");
        setTimeout(() => { var _a; return (_a = inputRef.current) === null || _a === void 0 ? void 0 : _a.focus(); }, 0);
    };
    const handleTabClose = (e, tabId) => {
        e.stopPropagation();
        if (tabs.length <= 1)
            return; // keep at least 1
        setPendingCloseTabId(tabId);
    };
    const confirmTabClose = () => {
        const tabId = pendingCloseTabId;
        setPendingCloseTabId(null);
        if (!tabId)
            return;
        if (tabs.length <= 1)
            return;
        (0, ai_history_1.removeAITab)(item._id, tabId);
        const updatedTabs = (0, ai_history_1.getAITabs)(item._id);
        setTabs(updatedTabs);
        if (tabId === activeTabId) {
            // Switch to adjacent tab
            const oldIndex = tabs.findIndex(t => t.id === tabId);
            const newTab = updatedTabs[Math.min(oldIndex, updatedTabs.length - 1)];
            setActiveTabId(newTab.id);
            setMessages((0, ai_history_1.getAIHistory)(item._id, newTab.id));
            setInput("");
        }
    };
    const handleTabDoubleClick = (tabId) => {
        const tab = tabs.find(t => t.id === tabId);
        if (!tab)
            return;
        setEditingTabId(tabId);
        setEditingTabTitle(tab.title);
    };
    const commitTabRename = () => {
        if (editingTabId) {
            const title = editingTabTitle.trim() || react_intl_universal_1.default.get("ai.defaultTabName");
            (0, ai_history_1.renameAITab)(item._id, editingTabId, title);
            setTabs((0, ai_history_1.getAITabs)(item._id));
            setEditingTabId(null);
            setEditingTabTitle("");
        }
    };
    const handleRenameKeyDown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            commitTabRename();
        }
        else if (e.key === "Escape") {
            setEditingTabId(null);
            setEditingTabTitle("");
        }
    };
    const [isDragging, setIsDragging] = React.useState(false);
    // Drag resize handler
    const handleMouseDown = (e) => {
        var _a;
        e.preventDefault();
        isDraggingRef.current = true;
        setIsDragging(true);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        const startX = e.clientX;
        const startWidth = panelWidth;
        const maxWidth = ((_a = getAnchorRect()) === null || _a === void 0 ? void 0 : _a.width) || startWidth;
        const clamp = (w) => Math.min(maxWidth, Math.max(MIN_WIDTH, w));
        const handleMouseMove = (e) => {
            if (!isDraggingRef.current)
                return;
            const diff = startX - e.clientX;
            setPanelWidth(clamp(startWidth + diff));
        };
        const handleMouseUp = (e) => {
            isDraggingRef.current = false;
            setIsDragging(false);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            const diff = startX - e.clientX;
            const finalWidth = clamp(startWidth + diff);
            localStorage.setItem("ai-panel-width", String(finalWidth));
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    };
    const config = (0, ai_service_1.getAIConfig)();
    const configured = (0, ai_service_1.isAIConfigured)();
    const isFull = !isWebpage && !!fullContent;
    const isSelectionOnly = !!selectionContext;
    const isWebpageMode = !!isWebpage && !selectionContext;
    const effectiveContent = selectionContext || fullContent || item.content;
    const plainText = effectiveContent
        .replace(/<[^>]*>/g, "")
        .substring(0, 4000);
    const charCount = plainText.length;
    if (!anchorRect)
        return null;
    const effectiveWidth = Math.min(panelWidth, anchorRect.width);
    // Find the FocusTrapZone container (.article-container) used in card view.
    // When it exists, backdrop-filter on it creates a new containing block,
    // making position:fixed relative to it instead of the viewport.
    // We portal into that container so focus stays inside the trap zone,
    // and adjust coordinates to be relative to it.
    const trapZone = document.querySelector(".article-container");
    const portalTarget = trapZone || document.body;
    let panelTop = anchorRect.top;
    let panelRight = window.innerWidth - anchorRect.right;
    if (trapZone) {
        const trapRect = trapZone.getBoundingClientRect();
        panelTop = anchorRect.top - trapRect.top;
        panelRight = trapRect.right - anchorRect.right;
    }
    const panelStyle = {
        width: effectiveWidth,
        position: "fixed",
        top: panelTop,
        right: panelRight,
        height: anchorRect.height,
    };
    return ReactDOM.createPortal(React.createElement(React.Fragment, null,
        isDragging && React.createElement("div", { className: "ai-drag-overlay" }),
        React.createElement("div", { className: "ai-panel", style: panelStyle, onKeyDown: e => e.stopPropagation(), onFocus: e => e.stopPropagation(), onClick: () => showTranslateMenu && setShowTranslateMenu(false) },
            React.createElement("div", { className: "ai-panel-drag", onMouseDown: handleMouseDown }),
            React.createElement("div", { className: "ai-panel-header" },
                React.createElement(react_1.Stack, { horizontal: true, verticalAlign: "center", tokens: { childrenGap: 8 } },
                    React.createElement(react_1.Stack.Item, { grow: true },
                        React.createElement("span", { className: "ai-panel-title" }, react_intl_universal_1.default.get("ai.name"))),
                    React.createElement(react_1.IconButton, { iconProps: { iconName: "EraseTool" }, title: react_intl_universal_1.default.get("ai.clearChat"), onClick: handleClearConversation, disabled: messages.length === 0 && !isStreaming }),
                    React.createElement(react_1.IconButton, { iconProps: { iconName: "Cancel" }, title: react_intl_universal_1.default.get("close"), onClick: handleClose }))),
            React.createElement("div", { className: "ai-tabs-bar" },
                React.createElement("div", { className: "ai-tabs-list" }, tabs.map(tab => (React.createElement("div", { key: tab.id, className: `ai-tab${tab.id === activeTabId ? " active" : ""}`, onClick: () => handleTabSwitch(tab.id), onDoubleClick: () => handleTabDoubleClick(tab.id) },
                    editingTabId === tab.id ? (React.createElement("input", { className: "ai-tab-title-input", value: editingTabTitle, onChange: e => setEditingTabTitle(e.target.value), onBlur: commitTabRename, onKeyDown: handleRenameKeyDown, autoFocus: true, onClick: e => e.stopPropagation() })) : (React.createElement("span", { className: "ai-tab-title", title: tab.title }, tab.title)),
                    tabs.length > 1 && (React.createElement("button", { className: "ai-tab-close", title: react_intl_universal_1.default.get("ai.closeTab"), onClick: e => handleTabClose(e, tab.id) }, "\u00D7")))))),
                React.createElement("button", { className: "ai-tab-add", title: react_intl_universal_1.default.get("ai.newChat"), onClick: handleTabAdd }, "+")),
            React.createElement("div", { className: "ai-context-bar", onClick: () => setShowContextPreview(prev => !prev) },
                React.createElement("span", { className: `ai-context-bar-dot ${isWebpageMode ? "webpage" : isSelectionOnly ? "selection" : isFull ? "full" : "partial"}` }),
                React.createElement("span", { className: "ai-context-bar-text" },
                    isWebpageMode
                        ? react_intl_universal_1.default.get("ai.contextWebpage")
                        : isSelectionOnly
                            ? react_intl_universal_1.default.get("ai.contextSelection")
                            : isFull
                                ? react_intl_universal_1.default.get("ai.contextFull")
                                : react_intl_universal_1.default.get("ai.contextPartial"),
                    " · ",
                    react_intl_universal_1.default.get("ai.contextChars", { count: charCount })),
                React.createElement("span", { className: "ai-context-bar-toggle" }, showContextPreview ? "▴" : "▾")),
            showContextPreview && (React.createElement("div", { className: "ai-context-preview" },
                React.createElement("strong", null, "Title:"),
                " ",
                item.title,
                "\n\n",
                React.createElement("strong", null, "Content:"),
                "\n",
                plainText)),
            React.createElement("div", { className: "ai-messages" },
                !configured && (React.createElement("div", { className: "ai-no-config" }, react_intl_universal_1.default.get("ai.noConfig"))),
                messages.map((msg, idx) => (React.createElement(AIMessageItem, { key: idx, msg: msg, idx: idx, copiedIndex: copiedIndex, onCopy: handleCopy }))),
                React.createElement("div", { ref: messagesEndRef })),
            React.createElement("div", { className: "ai-preset-prompts" },
                (config === null || config === void 0 ? void 0 : config.showBuiltinPrompts) !== false && (React.createElement("div", { className: "ai-builtin-prompts" }, BUILTIN_PROMPTS.map((p, idx) => (React.createElement("span", { key: idx, className: "ai-builtin-btn-wrapper" },
                    React.createElement("button", { className: "ai-preset-btn ai-builtin-btn", onClick: () => handleBuiltinPrompt(p), disabled: isStreaming, title: react_intl_universal_1.default.get(p.contentKey) },
                        React.createElement(react_1.IconButton, { iconProps: { iconName: p.icon }, className: "ai-builtin-icon", tabIndex: -1 }),
                        react_intl_universal_1.default.get(p.nameKey)),
                    p.needsLang && showTranslateMenu && (React.createElement("div", { className: "ai-translate-menu", onClick: e => e.stopPropagation() }, TRANSLATE_LANGUAGES.map(lang => (React.createElement("button", { key: lang, className: "ai-translate-lang-btn", onClick: () => handleTranslateTo(lang) }, lang)))))))))),
                ((_a = config === null || config === void 0 ? void 0 : config.prompts) === null || _a === void 0 ? void 0 : _a.length) > 0 && (React.createElement("div", { className: "ai-custom-prompts" }, config.prompts.map((p, idx) => (React.createElement("button", { key: idx, className: "ai-preset-btn", onClick: () => handlePresetPrompt(p.content), disabled: isStreaming, title: p.content }, p.name)))))),
            quotedText && (React.createElement("div", { className: "ai-quote-bar" },
                React.createElement("div", { className: "ai-quote-content" }, quotedText),
                React.createElement(react_1.IconButton, { className: "ai-quote-dismiss", iconProps: { iconName: "Cancel" }, title: react_intl_universal_1.default.get("ai.removeQuote"), onClick: () => setQuotedText(undefined) }))),
            React.createElement("div", { className: "ai-input-area" },
                React.createElement("textarea", { ref: inputRef, className: "ai-input", value: input, onChange: e => setInput(e.target.value), onKeyDown: handleKeyDown, placeholder: react_intl_universal_1.default.get("ai.inputPlaceholder"), disabled: !configured || isStreaming, rows: 3 }),
                React.createElement("div", { className: "ai-input-actions" }, isStreaming ? (React.createElement(react_1.IconButton, { iconProps: { iconName: "Stop" }, title: react_intl_universal_1.default.get("ai.stop"), onClick: handleStop })) : (React.createElement(react_1.IconButton, { iconProps: { iconName: "Send" }, title: react_intl_universal_1.default.get("ai.send"), onClick: handleSend, disabled: !configured || !input.trim() })))),
            React.createElement(react_1.Dialog, { hidden: !pendingCloseTabId, onDismiss: () => setPendingCloseTabId(null), dialogContentProps: {
                    type: react_1.DialogType.normal,
                    title: react_intl_universal_1.default.get("ai.confirmCloseTab"),
                    subText: react_intl_universal_1.default.get("ai.confirmCloseTabSubtitle"),
                } },
                React.createElement(react_1.DialogFooter, null,
                    React.createElement(react_1.PrimaryButton, { onClick: confirmTabClose, text: react_intl_universal_1.default.get("confirm") }),
                    React.createElement(react_1.DefaultButton, { onClick: () => setPendingCloseTabId(null), text: react_intl_universal_1.default.get("cancel") }))),
            React.createElement(react_1.Dialog, { hidden: !pendingClose, onDismiss: () => setPendingClose(false), dialogContentProps: {
                    type: react_1.DialogType.normal,
                    title: react_intl_universal_1.default.get("ai.confirmClosePanel"),
                    subText: react_intl_universal_1.default.get("ai.confirmClosePanelSubtitle"),
                } },
                React.createElement(react_1.DialogFooter, null,
                    React.createElement(react_1.PrimaryButton, { onClick: confirmClose, text: react_intl_universal_1.default.get("confirm") }),
                    React.createElement(react_1.DefaultButton, { onClick: () => setPendingClose(false), text: react_intl_universal_1.default.get("cancel") }))))), portalTarget);
};
exports.default = AIPanel;
