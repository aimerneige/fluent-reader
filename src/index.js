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
const client_1 = require("react-dom/client");
const react_redux_1 = require("react-redux");
const Icons_1 = require("@fluentui/react/lib/Icons");
const root_1 = __importDefault(require("./components/root"));
const settings_1 = require("./scripts/settings");
const performance_1 = require("./scripts/performance");
const app_1 = require("./scripts/models/app");
const reducer_1 = require("./scripts/reducer");
window.settings.setProxy();
(0, settings_1.applyThemeSettings)();
(0, performance_1.applyLowPerformance)();
(0, Icons_1.initializeIcons)("icons/");
reducer_1.rootStore.dispatch((0, app_1.initApp)());
window.utils.addMainContextListener((pos, text) => {
    reducer_1.rootStore.dispatch((0, app_1.openTextMenu)(pos, text));
});
window.fontList = [""];
window.utils.initFontList().then(fonts => {
    window.fontList.push(...fonts);
});
const root = (0, client_1.createRoot)(document.getElementById("app"));
root.render(React.createElement(react_redux_1.Provider, { store: reducer_1.rootStore },
    React.createElement(root_1.default, null)));
