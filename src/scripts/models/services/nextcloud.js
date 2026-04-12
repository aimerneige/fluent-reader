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
exports.nextcloudServiceHooks = void 0;
const react_intl_universal_1 = __importDefault(require("react-intl-universal"));
const db = __importStar(require("../../db"));
const lovefield_1 = __importDefault(require("lovefield"));
const group_1 = require("../group");
const source_1 = require("../source");
const utils_1 = require("../../utils");
const rule_1 = require("../rule");
async function fetchAPI(configs, params) {
    const headers = new Headers();
    headers.set("Authorization", "Basic " + btoa(configs.username + ":" + configs.password));
    return await fetch(configs.endpoint + params, { headers: headers });
}
async function markItems(configs, type, method, refs) {
    const headers = new Headers();
    headers.set("Authorization", "Basic " + btoa(configs.username + ":" + configs.password));
    headers.set("Content-Type", "application/json; charset=utf-8");
    const promises = new Array();
    while (refs.length > 0) {
        const batch = new Array();
        while (batch.length < 1000 && refs.length > 0) {
            batch.push(refs.pop());
        }
        const bodyObject = {};
        bodyObject["itemIds"] = batch;
        promises.push(fetch(configs.endpoint + "/items/" + type + "/multiple", {
            method: method,
            headers: headers,
            body: JSON.stringify(bodyObject),
        }));
    }
    return await Promise.all(promises);
}
const APIError = () => new Error(react_intl_universal_1.default.get("service.failure"));
exports.nextcloudServiceHooks = {
    authenticate: async (configs) => {
        try {
            const result = await fetchAPI(configs, "/version");
            return result.status === 200;
        }
        catch {
            return false;
        }
    },
    updateSources: () => async (dispatch, getState) => {
        const configs = getState().service;
        const response = await fetchAPI(configs, "/feeds");
        if (response.status !== 200)
            throw APIError();
        const feeds = await response.json();
        let groupsMap;
        let groupsByTagId = new Map();
        if (configs.importGroups) {
            const foldersResponse = await fetchAPI(configs, "/folders");
            if (foldersResponse.status !== 200)
                throw APIError();
            const folders = await foldersResponse.json();
            const foldersSet = new Set();
            groupsMap = new Map();
            for (let folder of folders.folders) {
                const title = folder.name.trim();
                if (!foldersSet.has(title)) {
                    foldersSet.add(title);
                    dispatch((0, group_1.createSourceGroup)(title));
                }
                groupsByTagId.set(String(folder.id), title);
            }
        }
        const sources = feeds.feeds.map(s => {
            const source = new source_1.RSSSource(s.url, s.title);
            source.iconurl = s.faviconLink;
            source.serviceRef = String(s.id);
            if (s.folderId && groupsByTagId.has(String(s.folderId))) {
                groupsMap.set(String(s.id), groupsByTagId.get(String(s.folderId)));
            }
            return source;
        });
        return [sources, groupsMap];
    },
    syncItems: () => async (_, getState) => {
        const configs = getState().service;
        const [unreadResponse, starredResponse] = await Promise.all([
            fetchAPI(configs, "/items?getRead=false&type=3&batchSize=-1"),
            fetchAPI(configs, "/items?getRead=true&type=2&batchSize=-1"),
        ]);
        if (unreadResponse.status !== 200 || starredResponse.status !== 200)
            throw APIError();
        const unread = await unreadResponse.json();
        const starred = await starredResponse.json();
        return [
            new Set(unread.items.map(i => String(i.id))),
            new Set(starred.items.map(i => String(i.id))),
        ];
    },
    fetchItems: () => async (_, getState) => {
        const state = getState();
        const configs = state.service;
        let items = new Array();
        configs.lastModified = configs.lastModified || 0;
        configs.lastId = configs.lastId || 0;
        let lastFetched;
        if (!configs.lastModified || configs.lastModified == 0) {
            //first sync
            let min = Number.MAX_SAFE_INTEGER;
            do {
                const response = await fetchAPI(configs, "/items?getRead=true&type=3&batchSize=125&offset=" + min);
                if (response.status !== 200)
                    throw APIError();
                lastFetched = await response.json();
                items = [...items, ...lastFetched.items];
                min = lastFetched.items.reduce((m, n) => Math.min(m, n.id), min);
            } while (lastFetched.items &&
                lastFetched.items.length >= 125 &&
                items.length < configs.fetchLimit);
        }
        else {
            //incremental sync
            const response = await fetchAPI(configs, "/items/updated?lastModified=" +
                configs.lastModified +
                "&type=3");
            if (response.status !== 200)
                throw APIError();
            lastFetched = (await response.json()).items;
            items.push(...lastFetched.filter(i => i.id > configs.lastId));
        }
        configs.lastModified = items.reduce((m, n) => Math.max(m, n.lastModified), configs.lastModified);
        configs.lastId = items.reduce((m, n) => Math.max(m, n.id), configs.lastId);
        configs.lastModified++; //+1 to avoid fetching articles with same lastModified next time
        if (items.length > 0) {
            const fidMap = new Map();
            for (let source of Object.values(state.sources)) {
                if (source.serviceRef) {
                    fidMap.set(source.serviceRef, source);
                }
            }
            const parsedItems = new Array();
            items.forEach(i => {
                if (i.body === null || i.url === null)
                    return;
                const unreadItem = i.unread;
                const starredItem = i.starred;
                const source = fidMap.get(String(i.feedId));
                const dom = utils_1.domParser.parseFromString(i.body, "text/html");
                const item = {
                    source: source.sid,
                    title: i.title,
                    link: i.url,
                    date: new Date(i.pubDate * 1000),
                    fetchedDate: new Date(),
                    content: i.body,
                    snippet: dom.documentElement.textContent.trim(),
                    creator: i.author,
                    hasRead: !i.unread,
                    starred: i.starred,
                    hidden: false,
                    notify: false,
                    serviceRef: String(i.id),
                };
                if (i.enclosureLink) {
                    item.thumb = i.enclosureLink;
                }
                else {
                    let baseEl = dom.createElement("base");
                    baseEl.setAttribute("href", item.link.split("/").slice(0, 3).join("/"));
                    dom.head.append(baseEl);
                    let img = dom.querySelector("img");
                    if (img && img.src)
                        item.thumb = img.src;
                }
                // Apply rules and sync back to the service
                if (source.rules)
                    rule_1.SourceRule.applyAll(source.rules, item);
                if (unreadItem && item.hasRead)
                    markItems(configs, item.hasRead ? "read" : "unread", "POST", [i.id]);
                if (starredItem !== Boolean(item.starred))
                    markItems(configs, item.starred ? "star" : "unstar", "POST", [i.id]);
                parsedItems.push(item);
            });
            return [parsedItems, configs];
        }
        else {
            return [[], configs];
        }
    },
    markAllRead: (sids, date, before) => async (_, getState) => {
        const state = getState();
        const configs = state.service;
        const predicates = [
            db.items.source.in(sids),
            db.items.hasRead.eq(false),
            db.items.serviceRef.isNotNull(),
        ];
        if (date) {
            predicates.push(before ? db.items.date.lte(date) : db.items.date.gte(date));
        }
        const query = lovefield_1.default.op.and.apply(null, predicates);
        const rows = await db.itemsDB
            .select(db.items.serviceRef)
            .from(db.items)
            .where(query)
            .exec();
        const refs = rows.map(row => parseInt(row["serviceRef"]));
        markItems(configs, "unread", "POST", refs);
    },
    markRead: (item) => async (_, getState) => {
        await markItems(getState().service, "read", "POST", [parseInt(item.serviceRef)]);
    },
    markUnread: (item) => async (_, getState) => {
        await markItems(getState().service, "unread", "POST", [parseInt(item.serviceRef)]);
    },
    star: (item) => async (_, getState) => {
        await markItems(getState().service, "star", "POST", [parseInt(item.serviceRef)]);
    },
    unstar: (item) => async (_, getState) => {
        await markItems(getState().service, "unstar", "POST", [parseInt(item.serviceRef)]);
    },
};
