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
const react_redux_1 = require("react-redux");
const app_1 = require("../scripts/models/app");
const page_container_1 = __importDefault(require("../containers/page-container"));
const menu_container_1 = __importDefault(require("../containers/menu-container"));
const nav_1 = __importDefault(require("./nav"));
const settings_container_1 = __importDefault(require("../containers/settings-container"));
const context_menu_1 = require("./context-menu");
const log_menu_1 = __importDefault(require("./log-menu"));
const Root = ({ locale, dispatch }) => locale && (React.createElement("div", { id: "root", key: locale, onMouseDown: () => dispatch((0, app_1.closeContextMenu)()) },
    React.createElement(nav_1.default, null),
    React.createElement(page_container_1.default, null),
    React.createElement(log_menu_1.default, null),
    React.createElement(menu_container_1.default, null),
    React.createElement(settings_container_1.default, null),
    React.createElement(context_menu_1.ContextMenu, null)));
const getLocale = (state) => ({ locale: state.app.locale });
exports.default = (0, react_redux_1.connect)(getLocale)(Root);
