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
const react_redux_1 = require("react-redux");
const react_1 = require("@fluentui/react");
const utils_1 = require("../../scripts/utils");
const page_1 = require("../../scripts/models/page");
class ArticleSearch extends React.Component {
    constructor(props) {
        super(props);
        this.onSearchChange = (_, newValue) => {
            this.debouncedSearch(newValue);
            this.setState({ query: newValue });
        };
        this.debouncedSearch = new react_1.Async().debounce((query) => {
            let regex = (0, utils_1.validateRegex)(query);
            if (regex !== null)
                props.dispatch((0, page_1.performSearch)(query));
        }, 750);
        this.inputRef = React.createRef();
        this.state = { query: props.initQuery };
    }
    componentDidUpdate(prevProps) {
        if (this.props.searchOn && !prevProps.searchOn) {
            this.setState({ query: this.props.initQuery });
            this.inputRef.current.focus();
        }
    }
    render() {
        return (this.props.searchOn && (React.createElement(react_1.SearchBox, { componentRef: this.inputRef, className: "article-search", placeholder: react_intl_universal_1.default.get("search"), value: this.state.query, onChange: this.onSearchChange })));
    }
}
const getSearchProps = (state) => ({
    searchOn: state.page.searchOn,
    initQuery: state.page.filter.search,
});
exports.default = (0, react_redux_1.connect)(getSearchProps)(ArticleSearch);
