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
const react_1 = require("@fluentui/react");
const app_1 = require("../scripts/models/app");
const time_1 = __importDefault(require("./utils/time"));
const reducer_1 = require("../scripts/reducer");
const page_1 = require("../scripts/models/page");
function getLogIcon(log) {
    switch (log.type) {
        case 0 /* AppLogType.Info */:
            return "Info";
        case 3 /* AppLogType.Article */:
            return "KnowledgeArticle";
        default:
            return "Warning";
    }
}
function LogMenu() {
    const dispatch = (0, reducer_1.useAppDispatch)();
    const { display, logs } = (0, reducer_1.useAppSelector)(state => state.app.logMenu);
    return (display && (React.createElement(react_1.Callout, { target: "#log-toggle", role: "log-menu", directionalHint: react_1.DirectionalHint.bottomCenter, calloutWidth: 320, calloutMaxHeight: 240, onDismiss: () => dispatch((0, app_1.toggleLogMenu)()) }, logs.length == 0 ? (React.createElement("p", { style: { textAlign: "center" } }, react_intl_universal_1.default.get("log.empty"))) : (logs
        .map((l, i) => (React.createElement(react_1.ActivityItem, { activityDescription: l.iid ? (React.createElement("b", null,
            React.createElement(react_1.Link, { onClick: () => {
                    dispatch((0, app_1.toggleLogMenu)());
                    dispatch((0, page_1.showItemFromId)(l.iid));
                } }, l.title))) : (React.createElement("b", null, l.title)), comments: l.details, activityIcon: React.createElement(react_1.Icon, { iconName: getLogIcon(l) }), timeStamp: React.createElement(time_1.default, { date: l.time }), key: i, style: { margin: 12 } })))
        .reverse()))));
}
exports.default = LogMenu;
