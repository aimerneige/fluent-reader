"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAppStore = exports.useAppSelector = exports.useAppDispatch = exports.rootStore = exports.rootReducer = void 0;
const redux_1 = require("redux");
const redux_thunk_1 = require("redux-thunk");
const source_1 = require("./models/source");
const item_1 = require("./models/item");
const feed_1 = require("./models/feed");
const app_1 = require("./models/app");
const group_1 = require("./models/group");
const page_1 = require("./models/page");
const service_1 = require("./models/service");
const react_redux_1 = require("react-redux");
exports.rootReducer = (0, redux_1.combineReducers)({
    sources: source_1.sourceReducer,
    items: item_1.itemReducer,
    feeds: feed_1.feedReducer,
    groups: group_1.groupReducer,
    page: page_1.pageReducer,
    service: service_1.serviceReducer,
    app: app_1.appReducer,
});
exports.rootStore = (0, redux_1.createStore)(exports.rootReducer, undefined, (0, redux_1.applyMiddleware)(redux_thunk_1.thunk));
exports.useAppDispatch = react_redux_1.useDispatch;
exports.useAppSelector = react_redux_1.useSelector;
exports.useAppStore = react_redux_1.useStore;
