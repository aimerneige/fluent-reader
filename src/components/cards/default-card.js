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
const card_1 = require("./card");
const info_1 = __importDefault(require("./info"));
const highlights_1 = __importDefault(require("./highlights"));
const className = (props) => {
    let cn = ["card", "default-card"];
    if (props.item.snippet && props.item.thumb)
        cn.push("transform");
    if (props.item.hidden)
        cn.push("hidden");
    if (props.source.textDir === 1 /* SourceTextDirection.RTL */)
        cn.push("rtl");
    return cn.join(" ");
};
const DefaultCard = props => (React.createElement("div", { className: className(props), ...card_1.Card.bindEventsToProps(props), "data-iid": props.item._id, "data-is-focusable": true },
    props.item.thumb ? (React.createElement("img", { className: "bg", src: props.item.thumb, loading: "lazy", decoding: "async", onError: e => (e.currentTarget.style.display = "none") })) : null,
    React.createElement("div", { className: "bg" }),
    props.item.thumb ? (React.createElement("img", { className: "head", src: props.item.thumb, loading: "lazy", decoding: "async", onError: e => (e.currentTarget.style.display = "none") })) : null,
    React.createElement(info_1.default, { source: props.source, item: props.item }),
    React.createElement("h3", { className: "title" },
        React.createElement(highlights_1.default, { text: props.item.title, filter: props.filter, title: true })),
    React.createElement("p", { className: "snippet" + (props.item.thumb ? "" : " show") },
        React.createElement(highlights_1.default, { text: props.item.snippet, filter: props.filter }))));
exports.default = DefaultCard;
