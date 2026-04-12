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
const react_1 = require("react");
const react_intl_universal_1 = __importDefault(require("react-intl-universal"));
const Icon_1 = require("@fluentui/react/lib/Icon");
const react_2 = require("@fluentui/react");
const item_1 = require("../scripts/models/item");
const app_1 = require("../scripts/models/app");
const page_1 = require("../scripts/models/page");
const reducer_1 = require("../scripts/reducer");
const Nav = () => {
    const dispatch = (0, reducer_1.useAppDispatch)();
    const state = (0, reducer_1.useAppSelector)(state => state.app);
    const itemShown = (0, reducer_1.useAppSelector)(state => state.page.itemId && state.page.viewType !== 1 /* ViewType.List */);
    const [maximized, setMaximized] = (0, react_1.useState)(window.utils.isMaximized());
    const setBodyFocusState = (0, react_1.useCallback)((focused) => {
        if (focused)
            document.body.classList.remove("blur");
        else
            document.body.classList.add("blur");
    }, []);
    const setBodyFullscreenState = (0, react_1.useCallback)((fullscreen) => {
        if (fullscreen)
            document.body.classList.remove("not-fullscreen");
        else
            document.body.classList.add("not-fullscreen");
    }, []);
    const windowStateListener = (0, react_1.useCallback)((type, windowState) => {
        switch (type) {
            case 0 /* WindowStateListenerType.Maximized */:
                setMaximized(windowState);
                break;
            case 2 /* WindowStateListenerType.Fullscreen */:
                setBodyFullscreenState(windowState);
                break;
            case 1 /* WindowStateListenerType.Focused */:
                setBodyFocusState(windowState);
                break;
        }
    }, [setBodyFocusState, setBodyFullscreenState]);
    const canFetch = (0, react_1.useCallback)(() => state.sourceInit &&
        state.feedInit &&
        !state.syncing &&
        !state.fetchingItems, [state.sourceInit, state.feedInit, state.syncing, state.fetchingItems]);
    const fetch = (0, react_1.useCallback)(() => {
        if (canFetch())
            dispatch((0, item_1.fetchItems)());
    }, [canFetch, dispatch]);
    const menu = (0, react_1.useCallback)(() => dispatch((0, app_1.toggleMenu)()), [dispatch]);
    const logs = (0, react_1.useCallback)(() => dispatch((0, app_1.toggleLogMenu)()), [dispatch]);
    const search = (0, react_1.useCallback)(() => dispatch((0, page_1.toggleSearch)()), [dispatch]);
    const settings = (0, react_1.useCallback)(() => dispatch((0, app_1.toggleSettings)()), [dispatch]);
    const markAll = (0, react_1.useCallback)(() => dispatch((0, app_1.openMarkAllMenu)()), [dispatch]);
    const views = (0, react_1.useCallback)(() => {
        if (state.contextMenu.event !== "#view-toggle") {
            dispatch((0, app_1.openViewMenu)());
        }
    }, [state.contextMenu.event, dispatch]);
    const navShortcutsHandler = (0, react_1.useCallback)((e) => {
        if (!state.settings.display) {
            switch (e.key) {
                case "F1":
                    menu();
                    break;
                case "F2":
                    search();
                    break;
                case "F5":
                    fetch();
                    break;
                case "F6":
                    markAll();
                    break;
                case "F7":
                    if (!itemShown)
                        logs();
                    break;
                case "F8":
                    if (!itemShown)
                        views();
                    break;
                case "F9":
                    if (!itemShown)
                        settings();
                    break;
            }
        }
    }, [
        state.settings.display,
        itemShown,
        menu,
        search,
        fetch,
        markAll,
        logs,
        views,
        settings,
    ]);
    (0, react_1.useEffect)(() => {
        setBodyFocusState(window.utils.isFocused());
        setBodyFullscreenState(window.utils.isFullscreen());
        window.utils.addWindowStateListener(windowStateListener);
        return () => {
            // Cleanup will be handled by the event listener removal effect
        };
    }, [setBodyFocusState, setBodyFullscreenState, windowStateListener]);
    (0, react_1.useEffect)(() => {
        document.addEventListener("keydown", navShortcutsHandler);
        if (window.utils.platform === "darwin")
            window.utils.addTouchBarEventsListener(navShortcutsHandler);
        return () => {
            document.removeEventListener("keydown", navShortcutsHandler);
        };
    }, [navShortcutsHandler]);
    const minimize = () => {
        window.utils.minimizeWindow();
    };
    const maximize = () => {
        window.utils.maximizeWindow();
        setMaximized(!maximized);
    };
    const close = () => {
        window.utils.closeWindow();
    };
    const fetching = () => (!canFetch() ? " fetching" : "");
    const getClassNames = () => {
        const classNames = new Array();
        if (state.settings.display)
            classNames.push("hide-btns");
        if (state.menu)
            classNames.push("menu-on");
        if (itemShown)
            classNames.push("item-on");
        return classNames.join(" ");
    };
    const getProgress = () => {
        return state.fetchingTotal > 0
            ? state.fetchingProgress / state.fetchingTotal
            : null;
    };
    return (React.createElement("nav", { className: getClassNames() },
        React.createElement("div", { className: "btn-group" },
            React.createElement("a", { className: "btn hide-wide", title: react_intl_universal_1.default.get("nav.menu"), onClick: menu },
                React.createElement(Icon_1.Icon, { iconName: window.utils.platform === "darwin"
                        ? "SidePanel"
                        : "GlobalNavButton" }))),
        React.createElement("span", { className: "title" }, state.title),
        React.createElement("div", { className: "btn-group", style: { float: "right" } },
            React.createElement("a", { className: "btn" + fetching(), onClick: fetch, title: react_intl_universal_1.default.get("nav.refresh") },
                React.createElement(Icon_1.Icon, { iconName: "Refresh" })),
            React.createElement("a", { className: "btn", id: "mark-all-toggle", onClick: markAll, title: react_intl_universal_1.default.get("nav.markAllRead"), onMouseDown: e => {
                    if (state.contextMenu.event === "#mark-all-toggle")
                        e.stopPropagation();
                } },
                React.createElement(Icon_1.Icon, { iconName: "InboxCheck" })),
            React.createElement("a", { className: "btn", id: "log-toggle", title: react_intl_universal_1.default.get("nav.notifications"), onClick: logs }, state.logMenu.notify ? (React.createElement(Icon_1.Icon, { iconName: "RingerSolid" })) : (React.createElement(Icon_1.Icon, { iconName: "Ringer" }))),
            React.createElement("a", { className: "btn", id: "view-toggle", title: react_intl_universal_1.default.get("nav.view"), onClick: views, onMouseDown: e => {
                    if (state.contextMenu.event === "#view-toggle")
                        e.stopPropagation();
                } },
                React.createElement(Icon_1.Icon, { iconName: "View" })),
            React.createElement("a", { className: "btn", title: react_intl_universal_1.default.get("nav.settings"), onClick: settings },
                React.createElement(Icon_1.Icon, { iconName: "Settings" })),
            React.createElement("span", { className: "seperator" }),
            React.createElement("a", { className: "btn system", title: react_intl_universal_1.default.get("nav.minimize"), onClick: minimize, style: { fontSize: 12 } },
                React.createElement(Icon_1.Icon, { iconName: "Remove" })),
            React.createElement("a", { className: "btn system", title: react_intl_universal_1.default.get("nav.maximize"), onClick: maximize }, maximized ? (React.createElement(Icon_1.Icon, { iconName: "ChromeRestore", style: { fontSize: 11 } })) : (React.createElement(Icon_1.Icon, { iconName: "Checkbox", style: { fontSize: 10 } }))),
            React.createElement("a", { className: "btn system close", title: react_intl_universal_1.default.get("close"), onClick: close },
                React.createElement(Icon_1.Icon, { iconName: "Cancel" }))),
        !canFetch() && (React.createElement(react_2.ProgressIndicator, { className: "progress", percentComplete: getProgress() }))));
};
exports.default = Nav;
