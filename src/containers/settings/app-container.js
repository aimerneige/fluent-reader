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
const react_redux_1 = require("react-redux");
const app_1 = require("../../scripts/models/app");
const db = __importStar(require("../../scripts/db"));
const app_2 = __importDefault(require("../../components/settings/app"));
const settings_1 = require("../../scripts/settings");
const source_1 = require("../../scripts/models/source");
const mapStateToProps = (state) => ({
    sources: state.sources,
});
const mapDispatchToProps = (dispatch, _) => ({
    setLanguage: (option) => {
        window.settings.setLocaleSettings(option);
        dispatch((0, app_1.initIntl)());
    },
    setFetchInterval: (interval) => {
        window.settings.setFetchInterval(interval);
        dispatch((0, app_1.setupAutoFetch)());
    },
    deleteArticles: async (days) => {
        dispatch((0, app_1.saveSettings)());
        let date = new Date();
        date.setTime(date.getTime() - days * 86400000);
        await db.itemsDB
            .delete()
            .from(db.items)
            .where(db.items.date.lt(date))
            .exec();
        await dispatch((0, source_1.updateUnreadCounts)());
        dispatch((0, app_1.saveSettings)());
    },
    importAll: async () => {
        dispatch((0, app_1.saveSettings)());
        let cancelled = await (0, settings_1.importAll)();
        if (cancelled)
            dispatch((0, app_1.saveSettings)());
    },
});
const mergeProps = (stateProps, dispatchProps, ownProps) => ({
    ...ownProps,
    ...dispatchProps,
    cacheAllExistingArticles: async () => {
        const allItems = (await db.itemsDB
            .select()
            .from(db.items)
            .exec());
        if (allItems.length === 0)
            return;
        const sources = stateProps.sources;
        // Batch in chunks of 20 to avoid overwhelming IPC
        const chunkSize = 20;
        for (let i = 0; i < allItems.length; i += chunkSize) {
            const chunk = allItems.slice(i, i + chunkSize);
            const cacheItems = chunk.map(item => {
                var _a;
                return ({
                    _id: item._id,
                    content: item.content || "",
                    link: item.link || "",
                    title: item.title || "",
                    sourceName: ((_a = sources[item.source]) === null || _a === void 0 ? void 0 : _a.name) || "",
                });
            });
            try {
                await window.utils.cacheArticles(cacheItems);
            }
            catch (e) {
                console.error("Bulk cache chunk error:", e);
            }
        }
    },
});
const AppTabContainer = (0, react_redux_1.connect)(mapStateToProps, mapDispatchToProps, mergeProps)(app_2.default);
exports.default = AppTabContainer;
