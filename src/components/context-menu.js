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
exports.renderShareQR = exports.shareSubmenu = void 0;
exports.ContextMenu = ContextMenu;
const React = __importStar(require("react"));
const react_intl_universal_1 = __importDefault(require("react-intl-universal"));
const qrcode_react_1 = require("qrcode.react");
const utils_1 = require("../scripts/utils");
const ContextualMenu_1 = require("@fluentui/react/lib/ContextualMenu");
const app_1 = require("../scripts/models/app");
const item_1 = require("../scripts/models/item");
const feed_1 = require("../scripts/models/feed");
const reducer_1 = require("../scripts/reducer");
const page_1 = require("../scripts/models/page");
const shareSubmenu = (item) => [
    { key: "qr", url: item.link, onRender: exports.renderShareQR },
];
exports.shareSubmenu = shareSubmenu;
const renderShareQR = (item) => (React.createElement("div", { className: "qr-container" },
    React.createElement(qrcode_react_1.QRCodeSVG, { value: item.url, size: 150 })));
exports.renderShareQR = renderShareQR;
function getSearchItem(text) {
    const engine = window.settings.getSearchEngine();
    return {
        key: "searchText",
        text: react_intl_universal_1.default.get("context.search", {
            text: (0, utils_1.cutText)(text, 15),
            engine: (0, utils_1.getSearchEngineName)(engine),
        }),
        iconProps: { iconName: "Search" },
        onClick: () => (0, utils_1.webSearch)(text, engine),
    };
}
function ContextMenu() {
    const { type } = (0, reducer_1.useAppSelector)(state => state.app.contextMenu);
    switch (type) {
        case 0 /* ContextMenuType.Hidden */:
            return null;
        case 1 /* ContextMenuType.Item */:
            return React.createElement(ItemContextMenu, null);
        case 2 /* ContextMenuType.Text */:
            return React.createElement(TextContextMenu, null);
        case 5 /* ContextMenuType.Image */:
            return React.createElement(ImageContextMenu, null);
        case 3 /* ContextMenuType.View */:
            return React.createElement(ViewContextMenu, null);
        case 4 /* ContextMenuType.Group */:
            return React.createElement(GroupContextMenu, null);
        case 6 /* ContextMenuType.MarkRead */:
            return React.createElement(MarkReadContextMenu, null);
    }
}
function ItemContextMenu() {
    const dispatch = (0, reducer_1.useAppDispatch)();
    const viewConfigs = (0, reducer_1.useAppSelector)(state => state.page.viewConfigs);
    const target = (0, reducer_1.useAppSelector)(state => state.app.contextMenu.target);
    const item = target[0];
    const feedId = target[1];
    const menuItems = [
        {
            key: "showItem",
            text: react_intl_universal_1.default.get("context.read"),
            iconProps: { iconName: "TextDocument" },
            onClick: () => {
                dispatch((0, item_1.markRead)(item));
                dispatch((0, page_1.showItem)(feedId, item));
            },
        },
        {
            key: "openInBrowser",
            text: react_intl_universal_1.default.get("openExternal"),
            iconProps: { iconName: "NavigateExternalInline" },
            onClick: e => {
                dispatch((0, item_1.markRead)(item));
                window.utils.openExternal(item.link, (0, utils_1.platformCtrl)(e));
            },
        },
        {
            key: "markAsRead",
            text: item.hasRead
                ? react_intl_universal_1.default.get("article.markUnread")
                : react_intl_universal_1.default.get("article.markRead"),
            iconProps: item.hasRead
                ? {
                    iconName: "RadioBtnOn",
                    style: { fontSize: 14, textAlign: "center" },
                }
                : { iconName: "StatusCircleRing" },
            onClick: () => {
                if (item.hasRead) {
                    dispatch((0, item_1.markUnread)(item));
                }
                else {
                    dispatch((0, item_1.markRead)(item));
                }
            },
            split: true,
            subMenuProps: {
                items: [
                    {
                        key: "markBelow",
                        text: react_intl_universal_1.default.get("article.markBelow"),
                        iconProps: {
                            iconName: "Down",
                            style: { fontSize: 14 },
                        },
                        onClick: () => {
                            dispatch((0, item_1.markAllRead)(null, item.date));
                        },
                    },
                    {
                        key: "markAbove",
                        text: react_intl_universal_1.default.get("article.markAbove"),
                        iconProps: {
                            iconName: "Up",
                            style: { fontSize: 14 },
                        },
                        onClick: () => {
                            dispatch((0, item_1.markAllRead)(null, item.date, false));
                        },
                    },
                ],
            },
        },
        {
            key: "toggleStarred",
            text: item.starred
                ? react_intl_universal_1.default.get("article.unstar")
                : react_intl_universal_1.default.get("article.star"),
            iconProps: {
                iconName: item.starred ? "FavoriteStar" : "FavoriteStarFill",
            },
            onClick: () => {
                dispatch((0, item_1.toggleStarred)(item));
            },
        },
        {
            key: "toggleHidden",
            text: item.hidden
                ? react_intl_universal_1.default.get("article.unhide")
                : react_intl_universal_1.default.get("article.hide"),
            iconProps: {
                iconName: item.hidden ? "View" : "Hide3",
            },
            onClick: () => {
                dispatch((0, item_1.toggleHidden)(item));
            },
        },
        {
            key: "divider_1",
            itemType: ContextualMenu_1.ContextualMenuItemType.Divider,
        },
        {
            key: "share",
            text: react_intl_universal_1.default.get("context.share"),
            iconProps: { iconName: "Share" },
            subMenuProps: {
                items: (0, exports.shareSubmenu)(item),
            },
        },
        {
            key: "copyTitle",
            text: react_intl_universal_1.default.get("context.copyTitle"),
            onClick: () => {
                window.utils.writeClipboard(item.title);
            },
        },
        {
            key: "copyURL",
            text: react_intl_universal_1.default.get("context.copyURL"),
            onClick: () => {
                window.utils.writeClipboard(item.link);
            },
        },
        ...(viewConfigs !== undefined
            ? [
                {
                    key: "divider_2",
                    itemType: ContextualMenu_1.ContextualMenuItemType.Divider,
                },
                {
                    key: "view",
                    text: react_intl_universal_1.default.get("context.view"),
                    subMenuProps: {
                        items: [
                            {
                                key: "showCover",
                                text: react_intl_universal_1.default.get("context.showCover"),
                                canCheck: true,
                                checked: Boolean(viewConfigs & 1 /* ViewConfigs.ShowCover */),
                                onClick: () => dispatch((0, page_1.setViewConfigs)(viewConfigs ^
                                    1 /* ViewConfigs.ShowCover */)),
                            },
                            {
                                key: "showSnippet",
                                text: react_intl_universal_1.default.get("context.showSnippet"),
                                canCheck: true,
                                checked: Boolean(viewConfigs & 2 /* ViewConfigs.ShowSnippet */),
                                onClick: () => dispatch((0, page_1.setViewConfigs)(viewConfigs ^
                                    2 /* ViewConfigs.ShowSnippet */)),
                            },
                            {
                                key: "fadeRead",
                                text: react_intl_universal_1.default.get("context.fadeRead"),
                                canCheck: true,
                                checked: Boolean(viewConfigs & 4 /* ViewConfigs.FadeRead */),
                                onClick: () => dispatch((0, page_1.setViewConfigs)(viewConfigs ^
                                    4 /* ViewConfigs.FadeRead */)),
                            },
                        ],
                    },
                },
            ]
            : []),
    ];
    return React.createElement(ContextMenuBase, { menuItems: menuItems });
}
function TextContextMenu() {
    const dispatch = (0, reducer_1.useAppDispatch)();
    const target = (0, reducer_1.useAppSelector)(state => state.app.contextMenu.target);
    const text = target[0];
    const url = target[1];
    const menuItems = text
        ? [
            {
                key: "copyText",
                text: react_intl_universal_1.default.get("context.copy"),
                iconProps: { iconName: "Copy" },
                onClick: () => {
                    window.utils.writeClipboard(text);
                },
            },
            getSearchItem(text),
            {
                key: "divider_ai",
                itemType: ContextualMenu_1.ContextualMenuItemType.Divider,
            },
            {
                key: "askAIWithArticle",
                text: react_intl_universal_1.default.get("context.askAIWithArticle"),
                iconProps: { iconName: "ChatBot" },
                onClick: () => {
                    dispatch((0, app_1.requestAIAsk)(0 /* AIContextMode.FullArticle */, text));
                },
            },
            {
                key: "askAIWithSelection",
                text: react_intl_universal_1.default.get("context.askAIWithSelection"),
                iconProps: { iconName: "Chat" },
                onClick: () => {
                    dispatch((0, app_1.requestAIAsk)(1 /* AIContextMode.SelectionOnly */, text));
                },
            },
        ]
        : [];
    if (url) {
        menuItems.push({
            key: "urlSection",
            itemType: ContextualMenu_1.ContextualMenuItemType.Section,
            sectionProps: {
                topDivider: menuItems.length > 0,
                items: [
                    {
                        key: "openInBrowser",
                        text: react_intl_universal_1.default.get("openExternal"),
                        iconProps: {
                            iconName: "NavigateExternalInline",
                        },
                        onClick: e => {
                            window.utils.openExternal(url, (0, utils_1.platformCtrl)(e));
                        },
                    },
                    {
                        key: "copyURL",
                        text: react_intl_universal_1.default.get("context.copyURL"),
                        iconProps: { iconName: "Link" },
                        onClick: () => {
                            window.utils.writeClipboard(url);
                        },
                    },
                ],
            },
        });
    }
    return React.createElement(ContextMenuBase, { menuItems: menuItems });
}
function ImageContextMenu() {
    const menuItems = [
        {
            key: "openInBrowser",
            text: react_intl_universal_1.default.get("openExternal"),
            iconProps: { iconName: "NavigateExternalInline" },
            onClick: e => {
                if ((0, utils_1.platformCtrl)(e)) {
                    window.utils.imageCallback(1 /* ImageCallbackTypes.OpenExternalBg */);
                }
                else {
                    window.utils.imageCallback(0 /* ImageCallbackTypes.OpenExternal */);
                }
            },
        },
        {
            key: "saveImageAs",
            text: react_intl_universal_1.default.get("context.saveImageAs"),
            iconProps: { iconName: "SaveTemplate" },
            onClick: () => {
                window.utils.imageCallback(2 /* ImageCallbackTypes.SaveAs */);
            },
        },
        {
            key: "copyImage",
            text: react_intl_universal_1.default.get("context.copyImage"),
            iconProps: { iconName: "FileImage" },
            onClick: () => {
                window.utils.imageCallback(3 /* ImageCallbackTypes.Copy */);
            },
        },
        {
            key: "copyImageURL",
            text: react_intl_universal_1.default.get("context.copyImageURL"),
            iconProps: { iconName: "Link" },
            onClick: () => {
                window.utils.imageCallback(4 /* ImageCallbackTypes.CopyLink */);
            },
        },
    ];
    return React.createElement(ContextMenuBase, { menuItems: menuItems });
}
function ViewContextMenu() {
    const dispatch = (0, reducer_1.useAppDispatch)();
    const viewType = (0, reducer_1.useAppSelector)(state => state.page.viewType);
    const filter = (0, reducer_1.useAppSelector)(state => state.page.filter.type);
    const menuItems = [
        {
            key: "section_1",
            itemType: ContextualMenu_1.ContextualMenuItemType.Section,
            sectionProps: {
                title: react_intl_universal_1.default.get("context.view"),
                bottomDivider: true,
                items: [
                    {
                        key: "cardView",
                        text: react_intl_universal_1.default.get("context.cardView"),
                        iconProps: { iconName: "GridViewMedium" },
                        canCheck: true,
                        checked: viewType === 0 /* ViewType.Cards */,
                        onClick: () => dispatch((0, page_1.switchView)(0 /* ViewType.Cards */)),
                    },
                    {
                        key: "listView",
                        text: react_intl_universal_1.default.get("context.listView"),
                        iconProps: { iconName: "BacklogList" },
                        canCheck: true,
                        checked: viewType === 1 /* ViewType.List */,
                        onClick: () => dispatch((0, page_1.switchView)(1 /* ViewType.List */)),
                    },
                    {
                        key: "magazineView",
                        text: react_intl_universal_1.default.get("context.magazineView"),
                        iconProps: { iconName: "Articles" },
                        canCheck: true,
                        checked: viewType === 2 /* ViewType.Magazine */,
                        onClick: () => dispatch((0, page_1.switchView)(2 /* ViewType.Magazine */)),
                    },
                    {
                        key: "compactView",
                        text: react_intl_universal_1.default.get("context.compactView"),
                        iconProps: { iconName: "BulletedList" },
                        canCheck: true,
                        checked: viewType === 3 /* ViewType.Compact */,
                        onClick: () => dispatch((0, page_1.switchView)(3 /* ViewType.Compact */)),
                    },
                ],
            },
        },
        {
            key: "section_2",
            itemType: ContextualMenu_1.ContextualMenuItemType.Section,
            sectionProps: {
                title: react_intl_universal_1.default.get("context.filter"),
                bottomDivider: true,
                items: [
                    {
                        key: "allArticles",
                        text: react_intl_universal_1.default.get("allArticles"),
                        iconProps: { iconName: "ClearFilter" },
                        canCheck: true,
                        checked: (filter & ~feed_1.FilterType.Toggles) ==
                            feed_1.FilterType.Default,
                        onClick: () => dispatch((0, page_1.switchFilter)(feed_1.FilterType.Default)),
                    },
                    {
                        key: "unreadOnly",
                        text: react_intl_universal_1.default.get("context.unreadOnly"),
                        iconProps: {
                            iconName: "RadioBtnOn",
                            style: {
                                fontSize: 14,
                                textAlign: "center",
                            },
                        },
                        canCheck: true,
                        checked: (filter & ~feed_1.FilterType.Toggles) ==
                            feed_1.FilterType.UnreadOnly,
                        onClick: () => dispatch((0, page_1.switchFilter)(feed_1.FilterType.UnreadOnly)),
                    },
                    {
                        key: "starredOnly",
                        text: react_intl_universal_1.default.get("context.starredOnly"),
                        iconProps: { iconName: "FavoriteStarFill" },
                        canCheck: true,
                        checked: (filter & ~feed_1.FilterType.Toggles) ==
                            feed_1.FilterType.StarredOnly,
                        onClick: () => dispatch((0, page_1.switchFilter)(feed_1.FilterType.StarredOnly)),
                    },
                ],
            },
        },
        {
            key: "section_3",
            itemType: ContextualMenu_1.ContextualMenuItemType.Section,
            sectionProps: {
                title: react_intl_universal_1.default.get("search"),
                bottomDivider: true,
                items: [
                    {
                        key: "caseSensitive",
                        text: react_intl_universal_1.default.get("context.caseSensitive"),
                        iconProps: {
                            style: {
                                fontSize: 12,
                                fontStyle: "normal",
                            },
                            children: "Aa",
                        },
                        canCheck: true,
                        checked: !(filter & feed_1.FilterType.CaseInsensitive),
                        onClick: () => dispatch((0, page_1.toggleFilter)(feed_1.FilterType.CaseInsensitive)),
                    },
                    {
                        key: "fullSearch",
                        text: react_intl_universal_1.default.get("context.fullSearch"),
                        iconProps: { iconName: "Breadcrumb" },
                        canCheck: true,
                        checked: Boolean(filter & feed_1.FilterType.FullSearch),
                        onClick: () => dispatch((0, page_1.toggleFilter)(feed_1.FilterType.FullSearch)),
                    },
                ],
            },
        },
        {
            key: "showHidden",
            text: react_intl_universal_1.default.get("context.showHidden"),
            canCheck: true,
            checked: Boolean(filter & feed_1.FilterType.ShowHidden),
            onClick: () => dispatch((0, page_1.toggleFilter)(feed_1.FilterType.ShowHidden)),
        },
    ];
    return React.createElement(ContextMenuBase, { menuItems: menuItems });
}
function GroupContextMenu() {
    const dispatch = (0, reducer_1.useAppDispatch)();
    const sids = (0, reducer_1.useAppSelector)(state => state.app.contextMenu.target);
    const menuItems = [
        {
            key: "markAllRead",
            text: react_intl_universal_1.default.get("nav.markAllRead"),
            iconProps: { iconName: "CheckMark" },
            onClick: () => {
                dispatch((0, item_1.markAllRead)(sids));
            },
        },
        {
            key: "refresh",
            text: react_intl_universal_1.default.get("nav.refresh"),
            iconProps: { iconName: "Sync" },
            onClick: () => {
                dispatch((0, item_1.markAllRead)(sids));
            },
        },
        {
            key: "manage",
            text: react_intl_universal_1.default.get("context.manageSources"),
            iconProps: { iconName: "Settings" },
            onClick: () => {
                dispatch((0, item_1.markAllRead)(sids));
            },
        },
    ];
    return React.createElement(ContextMenuBase, { menuItems: menuItems });
}
function MarkReadContextMenu() {
    const dispatch = (0, reducer_1.useAppDispatch)();
    const menuItems = [
        {
            key: "section_1",
            itemType: ContextualMenu_1.ContextualMenuItemType.Section,
            sectionProps: {
                title: react_intl_universal_1.default.get("nav.markAllRead"),
                items: [
                    {
                        key: "all",
                        text: react_intl_universal_1.default.get("allArticles"),
                        iconProps: { iconName: "ReceiptCheck" },
                        onClick: () => {
                            dispatch((0, item_1.markAllRead)());
                        },
                    },
                    {
                        key: "1d",
                        text: react_intl_universal_1.default.get("app.daysAgo", { days: 1 }),
                        onClick: () => {
                            let date = new Date();
                            date.setTime(date.getTime() - 86400000);
                            dispatch((0, item_1.markAllRead)(null, date));
                        },
                    },
                    {
                        key: "3d",
                        text: react_intl_universal_1.default.get("app.daysAgo", { days: 3 }),
                        onClick: () => {
                            let date = new Date();
                            date.setTime(date.getTime() - 3 * 86400000);
                            dispatch((0, item_1.markAllRead)(null, date));
                        },
                    },
                    {
                        key: "7d",
                        text: react_intl_universal_1.default.get("app.daysAgo", { days: 7 }),
                        onClick: () => {
                            let date = new Date();
                            date.setTime(date.getTime() - 7 * 86400000);
                            dispatch((0, item_1.markAllRead)(null, date));
                        },
                    },
                ],
            },
        },
    ];
    return React.createElement(ContextMenuBase, { menuItems: menuItems });
}
function ContextMenuBase({ menuItems, }) {
    const { event, position } = (0, reducer_1.useAppSelector)(state => state.app.contextMenu);
    const dispatch = (0, reducer_1.useAppDispatch)();
    return (React.createElement(ContextualMenu_1.ContextualMenu, { directionalHint: ContextualMenu_1.DirectionalHint.bottomLeftEdge, items: menuItems, target: event ||
            (position && {
                left: position[0],
                top: position[1],
            }), onDismiss: () => dispatch((0, app_1.closeContextMenu)()) }));
}
