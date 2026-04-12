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
exports.minifluxServiceHooks = void 0;
const react_intl_universal_1 = __importDefault(require("react-intl-universal"));
const db = __importStar(require("../../db"));
const lovefield_1 = __importDefault(require("lovefield"));
const group_1 = require("../group");
const source_1 = require("../source");
const utils_1 = require("../../utils");
const rule_1 = require("../rule");
const APIError = () => new Error(react_intl_universal_1.default.get("service.failure"));
// base endpoint, authorization with dedicated token or http basic user/pass pair
async function fetchAPI(configs, endpoint = "", method = "GET", body = null) {
    try {
        const headers = new Headers();
        headers.append("content-type", "application/x-www-form-urlencoded");
        configs.apiKeyAuth
            ? headers.append("X-Auth-Token", configs.authKey)
            : headers.append("Authorization", `Basic ${configs.authKey}`);
        let baseUrl = configs.endpoint;
        if (!baseUrl.endsWith("/"))
            baseUrl = baseUrl + "/";
        if (!baseUrl.endsWith("/v1/"))
            baseUrl = baseUrl + "v1/";
        const response = await fetch(baseUrl + endpoint, {
            method: method,
            body: body,
            headers: headers,
        });
        return response;
    }
    catch (error) {
        console.log(error);
        throw APIError();
    }
}
exports.minifluxServiceHooks = {
    // poll service info endpoint to verify auth
    authenticate: async (configs) => {
        const response = await fetchAPI(configs, "me");
        if (await response.json().then(json => json.error_message))
            return false;
        return true;
    },
    // collect sources from service, along with associated groups/categories
    updateSources: () => async (dispatch, getState) => {
        const configs = getState().service;
        // fetch and create groups in redux
        if (configs.importGroups) {
            const groups = await fetchAPI(configs, "categories").then(response => response.json());
            groups.forEach(group => dispatch((0, group_1.createSourceGroup)(group.title)));
        }
        // fetch all feeds
        const feedResponse = await fetchAPI(configs, "feeds");
        const feeds = await feedResponse.json();
        if (feeds === undefined)
            throw APIError();
        // go through feeds, create typed source while also mapping by group
        let sources = new Array();
        let groupsMap = new Map();
        for (let feed of feeds) {
            let source = new source_1.RSSSource(feed.feed_url, feed.title);
            // associate service christened id to match in other request
            source.serviceRef = feed.id.toString();
            sources.push(source);
            groupsMap.set(feed.id.toString(), feed.category.title);
        }
        return [sources, configs.importGroups ? groupsMap : undefined];
    },
    // fetch entries from after the last fetched id (if exists)
    // limit by quantity and maximum safe integer (id)
    // NOTE: miniflux endpoint /entries default order with "published at", and does not offer "created_at"
    //          but does offer id sort, directly correlated with "created". some feeds give strange published_at.
    fetchItems: () => async (_, getState) => {
        var _a;
        const state = getState();
        const configs = state.service;
        const items = new Array();
        let entriesResponse;
        // parameters
        configs.lastId = (_a = configs.lastId) !== null && _a !== void 0 ? _a : 0;
        // intermediate
        const quantity = 125;
        let continueId;
        do {
            try {
                if (continueId) {
                    entriesResponse = await fetchAPI(configs, `entries?order=id&direction=desc&after_entry_id=${configs.lastId}&before_entry_id=${continueId}&limit=${quantity}`).then(response => response.json());
                }
                else {
                    entriesResponse = await fetchAPI(configs, `entries?order=id&direction=desc&after_entry_id=${configs.lastId}&limit=${quantity}`).then(response => response.json());
                }
                items.push(...entriesResponse.entries);
                continueId = items[items.length - 1].id;
            }
            catch {
                break;
            }
        } while (entriesResponse.entries &&
            entriesResponse.total >= quantity &&
            items.length < configs.fetchLimit);
        // break/return nothing if no new items acquired
        if (items.length === 0)
            return [[], configs];
        configs.lastId = items[0].id;
        // get sources that possess ref/id given by service, associate new items
        const sourceMap = new Map();
        for (let source of Object.values(state.sources)) {
            if (source.serviceRef) {
                sourceMap.set(source.serviceRef, source);
            }
        }
        // map item objects to rssitem type while appling rules (if exist)
        const parsedItems = items.map(item => {
            var _a;
            const source = sourceMap.get(item.feed.id.toString());
            let parsedItem = {
                source: source.sid,
                title: item.title,
                link: item.url,
                date: new Date((_a = item.published_at) !== null && _a !== void 0 ? _a : item.created_at),
                fetchedDate: new Date(),
                content: item.content,
                snippet: (0, utils_1.htmlDecode)(item.content).trim(),
                creator: item.author,
                hasRead: Boolean(item.status === "read"),
                starred: Boolean(item.starred),
                hidden: false,
                notify: false,
                serviceRef: String(item.id),
            };
            // Try to get the thumbnail of the item
            let dom = utils_1.domParser.parseFromString(item.content, "text/html");
            let baseEl = dom.createElement("base");
            baseEl.setAttribute("href", parsedItem.link.split("/").slice(0, 3).join("/"));
            dom.head.append(baseEl);
            let img = dom.querySelector("img");
            if (img && img.src)
                parsedItem.thumb = img.src;
            if (source.rules) {
                rule_1.SourceRule.applyAll(source.rules, parsedItem);
                if ((item.status === "read") !== parsedItem.hasRead)
                    exports.minifluxServiceHooks.markRead(parsedItem);
                if (item.starred !== parsedItem.starred)
                    exports.minifluxServiceHooks.markUnread(parsedItem);
            }
            return parsedItem;
        });
        return [parsedItems, configs];
    },
    // get remote read and star state of articles, for local sync
    syncItems: () => async (_, getState) => {
        const configs = getState().service;
        const unreadPromise = fetchAPI(configs, "entries?status=unread").then(response => response.json());
        const starredPromise = fetchAPI(configs, "entries?starred=true").then(response => response.json());
        const [unread, starred] = await Promise.all([
            unreadPromise,
            starredPromise,
        ]);
        return [
            new Set(unread.entries.map((entry) => String(entry.id))),
            new Set(starred.entries.map((entry) => String(entry.id))),
        ];
    },
    markRead: (item) => async (_, getState) => {
        if (!item.serviceRef)
            return;
        const body = `{
            "entry_ids": [${item.serviceRef}],
            "status": "read"
        }`;
        const response = await fetchAPI(getState().service, "entries", "PUT", body);
        if (response.status !== 204)
            throw APIError();
    },
    markUnread: (item) => async (_, getState) => {
        if (!item.serviceRef)
            return;
        const body = `{
            "entry_ids": [${item.serviceRef}],
            "status": "unread"
        }`;
        await fetchAPI(getState().service, "entries", "PUT", body);
    },
    // mark entries for source ids as read, relative to date, determined by "before" bool
    // context menu component:
    // item - null, item date, either
    // group - group sources, null, true
    // nav - null, daysago, true
    // if null, state consulted for context sids
    markAllRead: (sids, date, before) => async (_, getState) => {
        const state = getState();
        const configs = state.service;
        if (date) {
            const predicates = [
                db.items.source.in(sids),
                db.items.hasRead.eq(false),
                db.items.serviceRef.isNotNull(),
                before ? db.items.date.lte(date) : db.items.date.gte(date),
            ];
            const query = lovefield_1.default.op.and.apply(null, predicates);
            const rows = await db.itemsDB
                .select(db.items.serviceRef)
                .from(db.items)
                .where(query)
                .exec();
            const refs = rows.map(row => row["serviceRef"]);
            const body = `{
                "entry_ids": [${refs}],
                "status": "read"
            }`;
            await fetchAPI(configs, "entries", "PUT", body);
        }
        else {
            const sources = state.sources;
            await Promise.all(sids.map(sid => {
                var _a;
                return fetchAPI(configs, `feeds/${(_a = sources[sid]) === null || _a === void 0 ? void 0 : _a.serviceRef}/mark-all-as-read`, "PUT");
            }));
        }
    },
    star: (item) => async (_, getState) => {
        if (!item.serviceRef)
            return;
        await fetchAPI(getState().service, `entries/${item.serviceRef}/bookmark`, "PUT");
    },
    unstar: (item) => async (_, getState) => {
        if (!item.serviceRef)
            return;
        await fetchAPI(getState().service, `entries/${item.serviceRef}/bookmark`, "PUT");
    },
};
