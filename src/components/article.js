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
const react_intl_universal_1 = __importDefault(require("react-intl-universal"));
const server_1 = require("react-dom/server");
const react_1 = require("@fluentui/react");
const source_1 = require("../scripts/models/source");
const context_menu_1 = require("./context-menu");
const utils_1 = require("../scripts/utils");
const ai_panel_1 = __importDefault(require("./ai-panel"));
const FONT_SIZE_OPTIONS = [12, 13, 14, 15, 16, 17, 18, 19, 20];
class Article extends React.Component {
    constructor(props) {
        super(props);
        this._documentListenerAdded = false;
        this.setFontSize = (size) => {
            window.settings.setFontSize(size);
            this.setState({ fontSize: size });
        };
        this.setFont = (font) => {
            window.settings.setFont(font);
            this.setState({ fontFamily: font });
        };
        this.fontSizeMenuProps = () => ({
            items: FONT_SIZE_OPTIONS.map(size => ({
                key: String(size),
                text: String(size),
                canCheck: true,
                checked: size === this.state.fontSize,
                onClick: () => this.setFontSize(size),
            })),
        });
        this.fontFamilyMenuProps = () => ({
            items: window.fontList.map((font, idx) => ({
                key: String(idx),
                text: font === "" ? react_intl_universal_1.default.get("default") : font,
                canCheck: true,
                checked: this.state.fontFamily === font,
                onClick: () => this.setFont(font),
            })),
        });
        this.updateTextDirection = (direction) => {
            this.props.updateSourceTextDirection(this.props.source, direction);
        };
        this.directionMenuProps = () => ({
            items: [
                {
                    key: "LTR",
                    text: react_intl_universal_1.default.get("article.LTR"),
                    iconProps: { iconName: "Forward" },
                    canCheck: true,
                    checked: this.props.source.textDir === 0 /* SourceTextDirection.LTR */,
                    onClick: () => this.updateTextDirection(0 /* SourceTextDirection.LTR */),
                },
                {
                    key: "RTL",
                    text: react_intl_universal_1.default.get("article.RTL"),
                    iconProps: { iconName: "Back" },
                    canCheck: true,
                    checked: this.props.source.textDir === 1 /* SourceTextDirection.RTL */,
                    onClick: () => this.updateTextDirection(1 /* SourceTextDirection.RTL */),
                },
                {
                    key: "Vertical",
                    text: react_intl_universal_1.default.get("article.Vertical"),
                    iconProps: { iconName: "Down" },
                    canCheck: true,
                    checked: this.props.source.textDir === 2 /* SourceTextDirection.Vertical */,
                    onClick: () => this.updateTextDirection(2 /* SourceTextDirection.Vertical */),
                },
            ],
        });
        this.moreMenuProps = () => ({
            items: [
                {
                    key: "openInBrowser",
                    text: react_intl_universal_1.default.get("openExternal"),
                    iconProps: { iconName: "NavigateExternalInline" },
                    onClick: e => {
                        window.utils.openExternal(this.props.item.link, (0, utils_1.platformCtrl)(e));
                    },
                },
                {
                    key: "copyURL",
                    text: react_intl_universal_1.default.get("context.copyURL"),
                    iconProps: { iconName: "Link" },
                    onClick: () => {
                        window.utils.writeClipboard(this.props.item.link);
                    },
                },
                {
                    key: "toggleHidden",
                    text: this.props.item.hidden
                        ? react_intl_universal_1.default.get("article.unhide")
                        : react_intl_universal_1.default.get("article.hide"),
                    iconProps: {
                        iconName: this.props.item.hidden ? "View" : "Hide3",
                    },
                    onClick: () => {
                        this.props.toggleHidden(this.props.item);
                    },
                },
                {
                    key: "fontMenu",
                    text: react_intl_universal_1.default.get("article.font"),
                    iconProps: { iconName: "Font" },
                    disabled: this.state.loadWebpage,
                    subMenuProps: this.fontFamilyMenuProps(),
                },
                {
                    key: "fontSizeMenu",
                    text: react_intl_universal_1.default.get("article.fontSize"),
                    iconProps: { iconName: "FontSize" },
                    disabled: this.state.loadWebpage,
                    subMenuProps: this.fontSizeMenuProps(),
                },
                {
                    key: "directionMenu",
                    text: react_intl_universal_1.default.get("article.textDir"),
                    iconProps: { iconName: "ChangeEntitlements" },
                    disabled: this.state.loadWebpage,
                    subMenuProps: this.directionMenuProps(),
                },
                {
                    key: "divider_1",
                    itemType: react_1.ContextualMenuItemType.Divider,
                },
                ...(0, context_menu_1.shareSubmenu)(this.props.item),
            ],
        });
        this.contextMenuHandler = (pos, text, url) => {
            if (pos) {
                if (text || url)
                    this.props.textMenu(pos, text, url);
                else
                    this.props.imageMenu(pos);
            }
            else {
                this.props.dismissContextMenu();
            }
        };
        this.keyDownHandler = (input) => {
            if (input.type === "keyDown") {
                switch (input.key) {
                    case "Escape":
                        if (this.state.findInPage) {
                            this.closeFindInPage();
                        }
                        else {
                            this.props.dismiss();
                        }
                        break;
                    case "ArrowLeft":
                    case "ArrowRight":
                        this.props.offsetItem(input.key === "ArrowLeft" ? -1 : 1);
                        break;
                    case "l":
                    case "L":
                        this.toggleWebpage();
                        break;
                    case "w":
                    case "W":
                        this.toggleFull();
                        break;
                    case "H":
                    case "h":
                        if (!input.meta)
                            this.props.toggleHidden(this.props.item);
                        break;
                    case "f":
                    case "F":
                        if (input.control || input.meta) {
                            this.openFindInPage();
                        }
                        break;
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
                        });
                        this.props.shortcuts(this.props.item, keyboardEvent);
                        document.dispatchEvent(keyboardEvent);
                        break;
                }
            }
        };
        this.webviewLoaded = () => {
            this.setState({ loaded: true });
        };
        this.webviewError = (reason) => {
            this.setState({ error: true, errorDescription: reason });
        };
        this.webviewReload = () => {
            if (this.webview) {
                this.setState({ loaded: false, error: false });
                this.webview.reload();
            }
            else if (this.state.loadFull) {
                this.loadFull();
            }
        };
        this.findInputRef = React.createRef();
        this.documentKeyDownHandler = (e) => {
            const isMac = window.utils.platform === "darwin";
            const ctrlOrMeta = isMac ? e.metaKey : e.ctrlKey;
            if (ctrlOrMeta && (e.key === "f" || e.key === "F")) {
                e.preventDefault();
                e.stopPropagation();
                this.openFindInPage();
            }
        };
        this.openFindInPage = () => {
            this.setState({ findInPage: true }, () => {
                if (this.findInputRef.current) {
                    this.findInputRef.current.focus();
                    this.findInputRef.current.select();
                }
            });
        };
        this.closeFindInPage = () => {
            if (this.webview) {
                try {
                    this.webview.stopFindInPage("clearSelection");
                }
                catch (_) { }
            }
            this.setState({ findInPage: false, findText: "", findResult: null });
        };
        this.handleFindChange = (text) => {
            this.setState({ findText: text });
            if (text && this.webview) {
                try {
                    this.webview.findInPage(text);
                }
                catch (_) { }
            }
            else {
                if (this.webview) {
                    try {
                        this.webview.stopFindInPage("clearSelection");
                    }
                    catch (_) { }
                }
                this.setState({ findResult: null });
            }
        };
        this.findNext = () => {
            if (this.state.findText && this.webview) {
                try {
                    this.webview.findInPage(this.state.findText, {
                        forward: true,
                        findNext: true,
                    });
                }
                catch (_) { }
            }
        };
        this.findPrevious = () => {
            if (this.state.findText && this.webview) {
                try {
                    this.webview.findInPage(this.state.findText, {
                        forward: false,
                        findNext: true,
                    });
                }
                catch (_) { }
            }
        };
        this.handleFoundInPage = (e) => {
            if (e.result) {
                this.setState({
                    findResult: {
                        activeMatchOrdinal: e.result.activeMatchOrdinal,
                        matches: e.result.matches,
                    },
                });
            }
        };
        this.handleFindKeyDown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                this.closeFindInPage();
            }
            else if (e.key === "Enter") {
                e.preventDefault();
                if (e.shiftKey) {
                    this.findPrevious();
                }
                else {
                    this.findNext();
                }
            }
        };
        this.componentDidMount = () => {
            if (!this._documentListenerAdded) {
                document.addEventListener("keydown", this.documentKeyDownHandler);
                this._documentListenerAdded = true;
            }
            let webview = document.getElementById("article");
            if (webview != this.webview) {
                this.webview = webview;
                if (webview) {
                    if (!this.state.showAIPanel) {
                        webview.focus();
                    }
                    this.setState({ loaded: false, error: false });
                    webview.addEventListener("did-stop-loading", this.webviewLoaded);
                    webview.addEventListener("found-in-page", this.handleFoundInPage);
                    let card = document.querySelector(`#refocus div[data-iid="${this.props.item._id}"]`);
                    // @ts-ignore
                    if (card)
                        card.scrollIntoViewIfNeeded();
                }
            }
        };
        this.componentDidUpdate = (prevProps) => {
            if (prevProps.item._id != this.props.item._id) {
                this.closeFindInPage();
                this.setState({
                    loadWebpage: (0, source_1.resolveOpenTarget)(this.props.source) ===
                        1 /* SourceOpenTarget.Webpage */,
                    loadFull: (0, source_1.resolveOpenTarget)(this.props.source) ===
                        3 /* SourceOpenTarget.FullContent */,
                    cachedContent: "",
                    cachedFullContent: "",
                });
                if ((0, source_1.resolveOpenTarget)(this.props.source) ===
                    3 /* SourceOpenTarget.FullContent */)
                    this.loadFull();
                this.loadCachedContent();
            }
            // Handle AI request from context menu
            if (this.props.aiRequest.active && !prevProps.aiRequest.active) {
                const { mode, selectedText } = this.props.aiRequest;
                this.setState({
                    showAIPanel: true,
                    aiQuotedText: selectedText,
                    aiSelectionContext: mode === 1 /* AIContextMode.SelectionOnly */
                        ? selectedText
                        : undefined,
                });
                this.props.clearAIRequest();
            }
            this.componentDidMount();
        };
        this.componentWillUnmount = () => {
            document.removeEventListener("keydown", this.documentKeyDownHandler);
            this.closeFindInPage();
            let refocus = document.querySelector(`#refocus div[data-iid="${this.props.item._id}"]`);
            if (refocus)
                refocus.focus();
        };
        this.toggleWebpage = () => {
            if (this.state.loadWebpage) {
                this.setState({ loadWebpage: false });
            }
            else if (this.props.item.link.startsWith("https://") ||
                this.props.item.link.startsWith("http://")) {
                this.setState({ loadWebpage: true, loadFull: false });
            }
        };
        this.toggleFull = () => {
            if (this.state.loadFull) {
                this.setState({ loadFull: false });
            }
            else if (this.props.item.link.startsWith("https://") ||
                this.props.item.link.startsWith("http://")) {
                this.setState({ loadFull: true, loadWebpage: false });
                this.loadFull();
            }
        };
        this.toggleAIPanel = () => {
            if (this.state.showAIPanel) {
                // Request close — AIPanel will decide whether to show confirmation
                this.setState({ aiRequestClose: true });
            }
            else {
                // Open panel
                this.setState({
                    showAIPanel: true,
                    aiQuotedText: undefined,
                    aiSelectionContext: undefined,
                });
            }
        };
        this.closeAIPanel = () => {
            this.setState({
                showAIPanel: false,
                aiQuotedText: undefined,
                aiSelectionContext: undefined,
                aiRequestClose: false,
            });
        };
        this.clearAIRequestClose = () => {
            this.setState({ aiRequestClose: false });
        };
        this.getAnchorRect = () => {
            const el = document.querySelector(".article");
            if (!el)
                return null;
            const rect = el.getBoundingClientRect();
            const toolbarHeight = 36;
            // In list view (.side-article-wrapper), flex-direction is column-reverse
            // so toolbar is at the bottom; in card view toolbar is at the top.
            const isListView = !!el.closest(".side-article-wrapper");
            if (isListView) {
                return new DOMRect(rect.x, rect.y, rect.width, rect.height - toolbarHeight);
            }
            else {
                return new DOMRect(rect.x, rect.y + toolbarHeight, rect.width, rect.height - toolbarHeight);
            }
        };
        this.loadCachedContent = async () => {
            try {
                if (!window.settings.getAggressiveCache())
                    return;
                // Load cached article content with localized image URLs
                const result = await window.utils.getCachedContent(this.props.item._id, this.props.item.content);
                if (result && result.fromCache) {
                    this.setState({ cachedContent: result.content });
                }
                else {
                    // Not yet cached — trigger on-demand caching now
                    this.triggerOnDemandCache();
                }
                // Load cached full page content
                const fullResult = await window.utils.getCachedFullContent(this.props.item._id);
                if (fullResult && fullResult.fromCache) {
                    this.setState({ cachedFullContent: fullResult.content });
                }
            }
            catch (e) {
                console.error("Failed to load cached content:", e);
            }
        };
        this.triggerOnDemandCache = async () => {
            try {
                if (!window.settings.getAggressiveCache())
                    return;
                const item = this.props.item;
                await window.utils.cacheArticles([
                    {
                        _id: item._id,
                        content: item.content,
                        link: item.link,
                        title: item.title,
                        sourceName: this.props.source.name || "",
                    },
                ]);
                // After caching completes, reload cached content
                const result = await window.utils.getCachedContent(item._id, item.content);
                if (result &&
                    result.fromCache &&
                    item._id === this.props.item._id) {
                    this.setState({ cachedContent: result.content });
                }
                const fullResult = await window.utils.getCachedFullContent(item._id);
                if (fullResult &&
                    fullResult.fromCache &&
                    item._id === this.props.item._id) {
                    this.setState({ cachedFullContent: fullResult.content });
                }
            }
            catch (e) {
                console.error("On-demand cache error:", e);
            }
        };
        this.loadFull = async () => {
            this.setState({ fullContent: "", loaded: false, error: false });
            // Try cached full content first when aggressive cache is on
            try {
                if (window.settings.getAggressiveCache()) {
                    const cached = await window.utils.getCachedFullContent(this.props.item._id);
                    if (cached && cached.fromCache && cached.content) {
                        this.setState({
                            fullContent: cached.content,
                            cachedFullContent: cached.content,
                        });
                        return;
                    }
                }
            }
            catch (e) {
                console.error("Failed to load cached full content:", e);
            }
            const link = this.props.item.link;
            try {
                const result = await fetch(link);
                if (!result || !result.ok)
                    throw new Error();
                const html = await (0, utils_1.decodeFetchResponse)(result, true);
                if (link === this.props.item.link) {
                    this.setState({ fullContent: html });
                }
            }
            catch {
                if (link === this.props.item.link) {
                    this.setState({
                        loaded: true,
                        error: true,
                        errorDescription: "MERCURY_PARSER_FAILURE",
                    });
                }
            }
        };
        this.articleView = () => {
            let content;
            if (this.state.loadFull) {
                content = this.state.cachedFullContent || this.state.fullContent;
            }
            else {
                content = this.state.cachedContent || this.props.item.content;
            }
            const a = encodeURIComponent(content);
            const h = encodeURIComponent((0, server_1.renderToString)(React.createElement(React.Fragment, null,
                React.createElement("p", { className: "title" }, this.props.item.title),
                React.createElement("p", { className: "date" }, this.props.item.date.toLocaleString(this.props.locale, { hour12: !this.props.locale.startsWith("zh") })),
                React.createElement("article", null))));
            return `article/article.html?a=${a}&h=${h}&f=${encodeURIComponent(this.state.fontFamily)}&s=${this.state.fontSize}&d=${this.props.source.textDir}&u=${this.props.item.link}&m=${this.state.loadFull ? 1 : 0}`;
        };
        this.render = () => (React.createElement(react_1.FocusZone, { className: "article" },
            React.createElement(react_1.Stack, { horizontal: true, style: { height: 36 } },
                React.createElement("span", { style: { width: 96 } }),
                React.createElement(react_1.Stack, { className: "actions", grow: true, horizontal: true, tokens: { childrenGap: 12 } },
                    React.createElement(react_1.Stack.Item, { grow: true },
                        React.createElement("span", { className: "source-name" },
                            this.state.loaded ? (this.props.source.iconurl && (React.createElement("img", { className: "favicon", src: this.props.source.iconurl }))) : (React.createElement(react_1.Spinner, { size: 1 })),
                            this.props.source.name,
                            this.props.item.creator && (React.createElement("span", { className: "creator" }, this.props.item.creator)))),
                    React.createElement(react_1.CommandBarButton, { title: this.props.item.hasRead
                            ? react_intl_universal_1.default.get("article.markUnread")
                            : react_intl_universal_1.default.get("article.markRead"), iconProps: this.props.item.hasRead
                            ? { iconName: "StatusCircleRing" }
                            : {
                                iconName: "RadioBtnOn",
                                style: {
                                    fontSize: 14,
                                    textAlign: "center",
                                },
                            }, onClick: () => this.props.toggleHasRead(this.props.item) }),
                    React.createElement(react_1.CommandBarButton, { title: this.props.item.starred
                            ? react_intl_universal_1.default.get("article.unstar")
                            : react_intl_universal_1.default.get("article.star"), iconProps: {
                            iconName: this.props.item.starred
                                ? "FavoriteStarFill"
                                : "FavoriteStar",
                        }, onClick: () => this.props.toggleStarred(this.props.item) }),
                    React.createElement(react_1.CommandBarButton, { title: react_intl_universal_1.default.get("article.loadFull"), className: this.state.loadFull ? "active" : "", iconProps: { iconName: "RawSource" }, onClick: this.toggleFull }),
                    React.createElement(react_1.CommandBarButton, { title: react_intl_universal_1.default.get("article.loadWebpage"), className: this.state.loadWebpage ? "active" : "", iconProps: { iconName: "Globe" }, onClick: this.toggleWebpage }),
                    React.createElement(react_1.CommandBarButton, { title: react_intl_universal_1.default.get("ai.askAI"), className: this.state.showAIPanel ? "active" : "", iconProps: { iconName: "Chat" }, onClick: this.toggleAIPanel }),
                    React.createElement(react_1.CommandBarButton, { title: react_intl_universal_1.default.get("more"), iconProps: { iconName: "More" }, menuIconProps: { style: { display: "none" } }, menuProps: this.moreMenuProps() })),
                React.createElement(react_1.Stack, { horizontal: true, horizontalAlign: "end", style: { width: 112 } },
                    React.createElement(react_1.CommandBarButton, { title: react_intl_universal_1.default.get("close"), iconProps: { iconName: "BackToWindow" }, onClick: this.props.dismiss }))),
            this.state.findInPage && (React.createElement("div", { className: "find-in-page-bar" },
                React.createElement("input", { ref: this.findInputRef, type: "text", placeholder: react_intl_universal_1.default.get("article.findInPage"), value: this.state.findText, onChange: e => this.handleFindChange(e.target.value), onKeyDown: this.handleFindKeyDown }),
                React.createElement("span", { className: "find-in-page-count" }, this.state.findText
                    ? this.state.findResult
                        ? this.state.findResult.matches > 0
                            ? `${this.state.findResult.activeMatchOrdinal}/${this.state.findResult.matches}`
                            : react_intl_universal_1.default.get("article.noResults")
                        : ""
                    : ""),
                React.createElement(react_1.IconButton, { iconProps: { iconName: "ChevronUp" }, title: react_intl_universal_1.default.get("article.findPrevious"), onClick: this.findPrevious, disabled: !this.state.findResult ||
                        this.state.findResult.matches === 0 }),
                React.createElement(react_1.IconButton, { iconProps: { iconName: "ChevronDown" }, title: react_intl_universal_1.default.get("article.findNext"), onClick: this.findNext, disabled: !this.state.findResult ||
                        this.state.findResult.matches === 0 }),
                React.createElement(react_1.IconButton, { iconProps: { iconName: "Cancel" }, title: react_intl_universal_1.default.get("close"), onClick: this.closeFindInPage }))),
            (!this.state.loadFull || this.state.fullContent) && (React.createElement("webview", { id: "article", className: this.state.error ? "error" : "", key: this.props.item._id +
                    (this.state.loadWebpage ? "_" : "") +
                    (this.state.loadFull ? "__" : ""), src: this.state.loadWebpage
                    ? this.props.item.link
                    : this.articleView(), allowpopups: "true", webpreferences: "contextIsolation,disableDialogs,autoplayPolicy=document-user-activation-required", partition: this.state.loadWebpage ? "sandbox" : undefined })),
            this.state.error && (React.createElement(react_1.Stack, { className: "error-prompt", verticalAlign: "center", horizontalAlign: "center", tokens: { childrenGap: 12 } },
                React.createElement(react_1.Icon, { iconName: "HeartBroken", style: { fontSize: 32 } }),
                React.createElement(react_1.Stack, { horizontal: true, horizontalAlign: "center", tokens: { childrenGap: 7 } },
                    React.createElement("small", null, react_intl_universal_1.default.get("article.error")),
                    React.createElement("small", null,
                        React.createElement(react_1.Link, { onClick: this.webviewReload }, react_intl_universal_1.default.get("article.reload")))),
                React.createElement("span", { style: { fontSize: 11 } }, this.state.errorDescription))),
            this.state.showAIPanel && (React.createElement(ai_panel_1.default, { item: this.props.item, fullContent: this.state.fullContent, onClose: this.closeAIPanel, getAnchorRect: this.getAnchorRect, quotedText: this.state.aiQuotedText, selectionContext: this.state.aiSelectionContext, isWebpage: this.state.loadWebpage, requestClose: this.state.aiRequestClose, clearRequestClose: this.clearAIRequestClose }))));
        this.state = {
            fontFamily: window.settings.getFont(),
            fontSize: window.settings.getFontSize(),
            loadWebpage: (0, source_1.resolveOpenTarget)(props.source) === 1 /* SourceOpenTarget.Webpage */,
            loadFull: (0, source_1.resolveOpenTarget)(props.source) ===
                3 /* SourceOpenTarget.FullContent */,
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
        };
        window.utils.addWebviewContextListener(this.contextMenuHandler);
        window.utils.addWebviewKeydownListener(this.keyDownHandler);
        window.utils.addWebviewErrorListener(this.webviewError);
        if ((0, source_1.resolveOpenTarget)(props.source) === 3 /* SourceOpenTarget.FullContent */)
            this.loadFull();
        this.loadCachedContent();
    }
}
exports.default = Article;
