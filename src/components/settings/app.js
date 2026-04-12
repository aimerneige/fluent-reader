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
const source_1 = require("../../scripts/models/source");
const settings_1 = require("../../scripts/settings");
const performance_1 = require("../../scripts/performance");
const react_1 = require("@fluentui/react");
const danger_button_1 = __importDefault(require("../utils/danger-button"));
const archive_1 = __importDefault(require("./archive"));
class AppTab extends React.Component {
    constructor(props) {
        super(props);
        this.getCacheSize = () => {
            window.utils.getCacheSize().then(size => {
                this.setState({ cacheSize: (0, utils_1.byteToMB)(size) });
            });
        };
        this.getItemSize = () => {
            (0, utils_1.calculateItemSize)().then(size => {
                this.setState({ itemSize: (0, utils_1.byteToMB)(size) });
            });
        };
        this.clearCache = () => {
            window.utils.clearCache().then(() => {
                this.getCacheSize();
            });
        };
        this.themeChoices = () => [
            { key: "system" /* ThemeSettings.Default */, text: react_intl_universal_1.default.get("followSystem") },
            { key: "light" /* ThemeSettings.Light */, text: react_intl_universal_1.default.get("app.lightTheme") },
            { key: "dark" /* ThemeSettings.Dark */, text: react_intl_universal_1.default.get("app.darkTheme") },
        ];
        this.fetchIntervalOptions = () => [
            { key: 0, text: react_intl_universal_1.default.get("app.never") },
            { key: 10, text: react_intl_universal_1.default.get("time.minute", { m: 10 }) },
            { key: 15, text: react_intl_universal_1.default.get("time.minute", { m: 15 }) },
            { key: 20, text: react_intl_universal_1.default.get("time.minute", { m: 20 }) },
            { key: 30, text: react_intl_universal_1.default.get("time.minute", { m: 30 }) },
            { key: 45, text: react_intl_universal_1.default.get("time.minute", { m: 45 }) },
            { key: 60, text: react_intl_universal_1.default.get("time.hour", { h: 1 }) },
        ];
        this.onFetchIntervalChanged = (item) => {
            this.props.setFetchInterval(item.key);
        };
        this.searchEngineOptions = () => [
            0 /* SearchEngines.Google */,
            1 /* SearchEngines.Bing */,
            2 /* SearchEngines.Baidu */,
            3 /* SearchEngines.DuckDuckGo */,
        ].map(engine => ({
            key: engine,
            text: (0, utils_1.getSearchEngineName)(engine),
        }));
        this.onSearchEngineChanged = (item) => {
            window.settings.setSearchEngine(item.key);
        };
        this.openTargetChoices = () => [
            {
                key: String(0 /* SourceOpenTarget.Local */),
                text: react_intl_universal_1.default.get("sources.rssText"),
            },
            {
                key: String(3 /* SourceOpenTarget.FullContent */),
                text: react_intl_universal_1.default.get("article.loadFull"),
            },
            {
                key: String(1 /* SourceOpenTarget.Webpage */),
                text: react_intl_universal_1.default.get("sources.loadWebpage"),
            },
            {
                key: String(2 /* SourceOpenTarget.External */),
                text: react_intl_universal_1.default.get("openExternal"),
            },
        ];
        this.onOpenTargetChange = (_, option) => {
            let target = parseInt(option.key);
            window.settings.setDefaultOpenTarget(target);
            (0, source_1.setDefaultOpenTargetCached)(target);
            this.setState({ openTarget: target });
        };
        this.deleteOptions = () => [
            { key: "7", text: react_intl_universal_1.default.get("app.daysAgo", { days: 7 }) },
            { key: "14", text: react_intl_universal_1.default.get("app.daysAgo", { days: 14 }) },
            { key: "21", text: react_intl_universal_1.default.get("app.daysAgo", { days: 21 }) },
            { key: "28", text: react_intl_universal_1.default.get("app.daysAgo", { days: 28 }) },
            { key: "0", text: react_intl_universal_1.default.get("app.deleteAll") },
        ];
        this.deleteChange = (_, item) => {
            this.setState({ deleteIndex: item ? String(item.key) : null });
        };
        this.confirmDelete = () => {
            this.setState({ itemSize: null });
            this.props
                .deleteArticles(parseInt(this.state.deleteIndex))
                .then(() => this.getItemSize());
        };
        this.languageOptions = () => [
            { key: "default", text: react_intl_universal_1.default.get("followSystem") },
            { key: "de", text: "Deutsch" },
            { key: "en-US", text: "English" },
            { key: "es", text: "Español" },
            { key: "cs", text: "Čeština" },
            { key: "fr-FR", text: "Français" },
            { key: "it", text: "Italiano" },
            { key: "nl", text: "Nederlands" },
            { key: "pt-BR", text: "Português do Brasil" },
            { key: "pt-PT", text: "Português de Portugal" },
            { key: "fi-FI", text: "Suomi" },
            { key: "sv", text: "Svenska" },
            { key: "tr", text: "Türkçe" },
            { key: "uk", text: "Українська" },
            { key: "ru", text: "Русский" },
            { key: "ko", text: "한글" },
            { key: "ja", text: "日本語" },
            { key: "zh-CN", text: "中文（简体）" },
            { key: "zh-TW", text: "中文（繁體）" },
        ];
        this.toggleStatus = () => {
            window.settings.toggleProxyStatus();
            this.setState({
                pacStatus: window.settings.getProxyStatus(),
                pacUrl: window.settings.getProxy(),
            });
        };
        this.handleInputChange = event => {
            const name = event.target.name;
            // @ts-ignore
            this.setState({ [name]: event.target.value.trim() });
        };
        this.setUrl = (event) => {
            event.preventDefault();
            if ((0, utils_1.urlTest)(this.state.pacUrl))
                window.settings.setProxy(this.state.pacUrl);
        };
        this.onThemeChange = (_, option) => {
            (0, settings_1.setThemeSettings)(option.key);
            this.setState({ themeSettings: option.key });
        };
        this.toggleLowPerformance = () => {
            let flag = !this.state.lowPerformance;
            window.settings.setLowPerformance(flag);
            (0, performance_1.applyLowPerformance)(flag);
            this.setState({ lowPerformance: flag });
        };
        this.toggleAggressiveCache = () => {
            let flag = !this.state.aggressiveCache;
            window.settings.setAggressiveCache(flag);
            this.setState({ aggressiveCache: flag });
            if (flag) {
                // When enabling, cache all existing articles in background
                this.props.cacheAllExistingArticles().catch(e => {
                    console.error("Bulk cache error:", e);
                });
            }
        };
        this.getArticleCacheSize = () => {
            window.utils.getArticleCacheSize().then(size => {
                this.setState({ articleCacheSize: (0, utils_1.byteToMB)(size) });
            });
        };
        this.clearArticleCache = () => {
            window.utils.clearArticleCache().then(() => {
                this.getArticleCacheSize();
            });
        };
        this.toggleArchiveManager = () => {
            this.setState({ showArchiveManager: !this.state.showArchiveManager });
        };
        this.render = () => (React.createElement("div", { className: "tab-body" },
            React.createElement(react_1.Label, null, react_intl_universal_1.default.get("app.language")),
            React.createElement(react_1.Stack, { horizontal: true },
                React.createElement(react_1.Stack.Item, null,
                    React.createElement(react_1.Dropdown, { defaultSelectedKey: window.settings.getLocaleSettings(), options: this.languageOptions(), onChanged: option => this.props.setLanguage(String(option.key)), style: { width: 200 } }))),
            React.createElement(react_1.ChoiceGroup, { label: react_intl_universal_1.default.get("app.theme"), options: this.themeChoices(), onChange: this.onThemeChange, selectedKey: this.state.themeSettings }),
            React.createElement(react_1.Stack, { horizontal: true, verticalAlign: "baseline" },
                React.createElement(react_1.Stack.Item, { grow: true },
                    React.createElement(react_1.Label, null, react_intl_universal_1.default.get("app.lowPerformance"))),
                React.createElement(react_1.Stack.Item, null,
                    React.createElement(react_1.Toggle, { checked: this.state.lowPerformance, onChange: this.toggleLowPerformance }))),
            React.createElement("span", { className: "settings-hint up" }, react_intl_universal_1.default.get("app.lowPerformanceHint")),
            React.createElement(react_1.Stack, { horizontal: true, verticalAlign: "baseline" },
                React.createElement(react_1.Stack.Item, { grow: true },
                    React.createElement(react_1.Label, null, react_intl_universal_1.default.get("app.aggressiveCache"))),
                React.createElement(react_1.Stack.Item, null,
                    React.createElement(react_1.Toggle, { checked: this.state.aggressiveCache, onChange: this.toggleAggressiveCache }))),
            React.createElement("span", { className: "settings-hint up" }, react_intl_universal_1.default.get("app.aggressiveCacheHint")),
            this.state.aggressiveCache && (React.createElement(React.Fragment, null,
                React.createElement(react_1.Stack, { horizontal: true, tokens: { childrenGap: 8 } },
                    React.createElement(react_1.Stack.Item, null,
                        React.createElement(react_1.DefaultButton, { text: react_intl_universal_1.default.get("app.archiveManager"), onClick: this.toggleArchiveManager }))),
                React.createElement("span", { className: "settings-hint up" }, this.state.articleCacheSize
                    ? react_intl_universal_1.default.get("app.articleCacheSize", {
                        size: this.state.articleCacheSize,
                    })
                    : react_intl_universal_1.default.get("app.calculatingSize")),
                this.state.showArchiveManager && (React.createElement(archive_1.default, { onClose: this.toggleArchiveManager })))),
            React.createElement(react_1.Label, null, react_intl_universal_1.default.get("app.fetchInterval")),
            React.createElement(react_1.Stack, { horizontal: true },
                React.createElement(react_1.Stack.Item, null,
                    React.createElement(react_1.Dropdown, { defaultSelectedKey: window.settings.getFetchInterval(), options: this.fetchIntervalOptions(), onChanged: this.onFetchIntervalChanged, style: { width: 200 } }))),
            React.createElement(react_1.Label, null, react_intl_universal_1.default.get("searchEngine.name")),
            React.createElement(react_1.Stack, { horizontal: true },
                React.createElement(react_1.Stack.Item, null,
                    React.createElement(react_1.Dropdown, { defaultSelectedKey: window.settings.getSearchEngine(), options: this.searchEngineOptions(), onChanged: this.onSearchEngineChanged, style: { width: 200 } }))),
            React.createElement(react_1.ChoiceGroup, { label: react_intl_universal_1.default.get("app.openTarget"), options: this.openTargetChoices(), onChange: this.onOpenTargetChange, selectedKey: String(this.state.openTarget) }),
            React.createElement(react_1.Stack, { horizontal: true, verticalAlign: "baseline" },
                React.createElement(react_1.Stack.Item, { grow: true },
                    React.createElement(react_1.Label, null, react_intl_universal_1.default.get("app.enableProxy"))),
                React.createElement(react_1.Stack.Item, null,
                    React.createElement(react_1.Toggle, { checked: this.state.pacStatus, onChange: this.toggleStatus }))),
            this.state.pacStatus && (React.createElement("form", { onSubmit: this.setUrl },
                React.createElement(react_1.Stack, { horizontal: true },
                    React.createElement(react_1.Stack.Item, { grow: true },
                        React.createElement(react_1.TextField, { required: true, onGetErrorMessage: v => (0, utils_1.urlTest)(v.trim())
                                ? ""
                                : react_intl_universal_1.default.get("app.badUrl"), placeholder: react_intl_universal_1.default.get("app.pac"), name: "pacUrl", onChange: this.handleInputChange, value: this.state.pacUrl })),
                    React.createElement(react_1.Stack.Item, null,
                        React.createElement(react_1.DefaultButton, { disabled: !(0, utils_1.urlTest)(this.state.pacUrl), type: "sumbit", text: react_intl_universal_1.default.get("app.setPac") }))),
                React.createElement("span", { className: "settings-hint up" }, react_intl_universal_1.default.get("app.pacHint")))),
            React.createElement(react_1.Label, null, react_intl_universal_1.default.get("app.cleanup")),
            React.createElement(react_1.Stack, { horizontal: true },
                React.createElement(react_1.Stack.Item, { grow: true },
                    React.createElement(react_1.Dropdown, { placeholder: react_intl_universal_1.default.get("app.deleteChoices"), options: this.deleteOptions(), selectedKey: this.state.deleteIndex, onChange: this.deleteChange })),
                React.createElement(react_1.Stack.Item, null,
                    React.createElement(danger_button_1.default, { disabled: this.state.itemSize === null ||
                            this.state.deleteIndex === null, text: react_intl_universal_1.default.get("app.confirmDelete"), onClick: this.confirmDelete }))),
            React.createElement("span", { className: "settings-hint up" }, this.state.itemSize
                ? react_intl_universal_1.default.get("app.itemSize", { size: this.state.itemSize })
                : react_intl_universal_1.default.get("app.calculatingSize")),
            React.createElement(react_1.Stack, { horizontal: true },
                React.createElement(react_1.Stack.Item, null,
                    React.createElement(react_1.DefaultButton, { text: react_intl_universal_1.default.get("app.cache"), disabled: this.state.cacheSize === null ||
                            this.state.cacheSize === "0MB", onClick: this.clearCache }))),
            React.createElement("span", { className: "settings-hint up" }, this.state.cacheSize
                ? react_intl_universal_1.default.get("app.cacheSize", { size: this.state.cacheSize })
                : react_intl_universal_1.default.get("app.calculatingSize")),
            React.createElement(react_1.Label, null, react_intl_universal_1.default.get("app.data")),
            React.createElement(react_1.Stack, { horizontal: true },
                React.createElement(react_1.Stack.Item, null,
                    React.createElement(react_1.PrimaryButton, { onClick: settings_1.exportAll, text: react_intl_universal_1.default.get("app.backup") })),
                React.createElement(react_1.Stack.Item, null,
                    React.createElement(react_1.DefaultButton, { onClick: this.props.importAll, text: react_intl_universal_1.default.get("app.restore") })))));
        this.state = {
            pacStatus: window.settings.getProxyStatus(),
            pacUrl: window.settings.getProxy(),
            themeSettings: (0, settings_1.getThemeSettings)(),
            lowPerformance: window.settings.getLowPerformance(),
            aggressiveCache: window.settings.getAggressiveCache(),
            openTarget: window.settings.getDefaultOpenTarget(),
            itemSize: null,
            cacheSize: null,
            articleCacheSize: null,
            deleteIndex: null,
            showArchiveManager: false,
        };
        this.getItemSize();
        this.getCacheSize();
        this.getArticleCacheSize();
    }
}
exports.default = AppTab;
