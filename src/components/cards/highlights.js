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
Object.defineProperty(exports, "__esModule", { value: true });
const React = __importStar(require("react"));
const utils_1 = require("../../scripts/utils");
const feed_1 = require("../../scripts/models/feed");
const Highlights = props => {
    const spans = new Array();
    const flags = props.filter.type & feed_1.FilterType.CaseInsensitive ? "ig" : "g";
    let regex;
    if (props.filter.search === "" ||
        !(regex = (0, utils_1.validateRegex)(props.filter.search, flags))) {
        if (props.title)
            spans.push([props.text, false]);
        else
            spans.push([props.text.substr(0, 325), false]);
    }
    else if (props.title) {
        let match;
        do {
            const startIndex = regex.lastIndex;
            match = regex.exec(props.text);
            if (match) {
                if (startIndex != match.index) {
                    spans.push([
                        props.text.substring(startIndex, match.index),
                        false,
                    ]);
                }
                spans.push([match[0], true]);
            }
            else {
                spans.push([props.text.substr(startIndex), false]);
            }
        } while (match && regex.lastIndex < props.text.length);
    }
    else {
        const match = regex.exec(props.text);
        if (match) {
            if (match.index != 0) {
                const startIndex = Math.max(match.index - 25, props.text.lastIndexOf(" ", Math.max(match.index - 10, 0)));
                spans.push([
                    props.text.substring(Math.max(0, startIndex), match.index),
                    false,
                ]);
            }
            spans.push([match[0], true]);
            if (regex.lastIndex < props.text.length) {
                spans.push([props.text.substr(regex.lastIndex, 300), false]);
            }
        }
        else {
            spans.push([props.text.substr(0, 325), false]);
        }
    }
    return (React.createElement(React.Fragment, null, spans.map(([text, flag]) => flag ? React.createElement("span", { className: "h" }, text) : text)));
};
exports.default = Highlights;
