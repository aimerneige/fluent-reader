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
const utils_1 = require("../../scripts/utils");
const react_1 = require("@fluentui/react");
const danger_button_1 = __importDefault(require("../utils/danger-button"));
class ArchiveManager extends React.Component {
    constructor(props) {
        super(props);
        this.loadArchives = () => {
            this.setState({ loading: true });
            window.utils
                .getArchiveList()
                .then(archives => {
                this.setState({ archives, loading: false });
            })
                .catch(() => {
                this.setState({ loading: false });
            });
        };
        this.loadCacheSize = () => {
            window.utils.getArticleCacheSize().then(size => {
                this.setState({ articleCacheSize: (0, utils_1.byteToMB)(size) });
            });
        };
        this.deleteArchive = (timestamp) => {
            window.utils.deleteArchive(timestamp).then(success => {
                if (success) {
                    this.loadArchives();
                }
            });
        };
        this.exportArchive = async (timestamp) => {
            const filename = `archive-${timestamp.replace(/[:.]/g, "-")}.json`;
            const callback = await window.utils.showSaveDialog([{ name: "JSON", extensions: ["json"] }], filename);
            if (callback) {
                const success = await window.utils.exportArchive(timestamp, filename);
                callback(success ? "" : "Export failed", success ? "" : "Failed to export archive");
            }
        };
        this.clearAllCache = () => {
            window.utils.clearArticleCache().then(() => {
                this.loadArchives();
                this.loadCacheSize();
            });
        };
        this.formatDate = (timestamp) => {
            try {
                return new Date(timestamp).toLocaleString();
            }
            catch {
                return timestamp;
            }
        };
        this.render = () => (React.createElement("div", { className: "archive-manager" },
            React.createElement(react_1.Stack, { horizontal: true, verticalAlign: "center", tokens: { childrenGap: 8 }, style: { marginBottom: 12 } },
                React.createElement(react_1.Stack.Item, { grow: true },
                    React.createElement(react_1.Label, null, react_intl_universal_1.default.get("app.archiveManager")))),
            this.state.loading ? (React.createElement(react_1.Spinner, { size: react_1.SpinnerSize.small })) : this.state.archives.length === 0 ? (React.createElement("div", { className: "archive-empty" },
                React.createElement(react_1.Icon, { iconName: "Archive", style: { fontSize: 24, opacity: 0.5 } }),
                React.createElement("span", { style: { opacity: 0.6, marginLeft: 8 } }, react_intl_universal_1.default.get("app.archiveEmpty")))) : (React.createElement("div", { className: "archive-list" }, this.state.archives.map(archive => (React.createElement("div", { className: "archive-item", key: archive.timestamp },
                React.createElement(react_1.Stack, { horizontal: true, verticalAlign: "center", tokens: { childrenGap: 12 } },
                    React.createElement(react_1.Icon, { iconName: "Archive", style: { fontSize: 16, opacity: 0.7 } }),
                    React.createElement(react_1.Stack.Item, { grow: true },
                        React.createElement("div", { className: "archive-info" },
                            React.createElement("span", { className: "archive-time" }, this.formatDate(archive.timestamp)),
                            React.createElement("span", { className: "archive-meta" },
                                (0, utils_1.byteToMB)(archive.size),
                                " \u00B7",
                                " ",
                                archive.changedCount,
                                " ",
                                react_intl_universal_1.default
                                    .get("app.archiveItems")
                                    .toLowerCase()))),
                    React.createElement(react_1.IconButton, { iconProps: { iconName: "Download" }, title: react_intl_universal_1.default.get("app.archiveExport"), onClick: () => this.exportArchive(archive.timestamp) }),
                    React.createElement(danger_button_1.default, { text: react_intl_universal_1.default.get("app.archiveDelete"), onClick: () => this.deleteArchive(archive.timestamp) }))))))),
            React.createElement(react_1.Stack, { horizontal: true, tokens: { childrenGap: 8 }, style: { marginTop: 12 } },
                React.createElement(react_1.Stack.Item, null,
                    React.createElement(danger_button_1.default, { text: react_intl_universal_1.default.get("app.clearArticleCache"), disabled: this.state.articleCacheSize === null ||
                            this.state.articleCacheSize === "0MB", onClick: this.clearAllCache }))),
            this.state.articleCacheSize && (React.createElement("span", { className: "settings-hint up" }, react_intl_universal_1.default.get("app.articleCacheSize", {
                size: this.state.articleCacheSize,
            })))));
        this.state = {
            archives: [],
            loading: true,
            articleCacheSize: null,
        };
        this.loadArchives();
        this.loadCacheSize();
    }
}
exports.default = ArchiveManager;
