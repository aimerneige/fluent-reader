import intl from "react-intl-universal"
import Datastore from "@seald-io/nedb"
import Dexie, { Table } from "dexie"
import { RSSSource } from "./models/source"
import { RSSItem } from "./models/item"

export class AppDatabase extends Dexie {
    sources!: Table<RSSSource, number>;
    items!: Table<RSSItem, number>;

    constructor() {
        super("fluent-reader-db");
        this.version(1).stores({
            sources: "sid, url",
            items: "++_id, source, date, serviceRef, hasRead"
        });
    }
}

export const appDB = new AppDatabase();
export const sources = appDB.sources;
export const items = appDB.items;

export async function init() {
    await appDB.open();
    if (window.settings.getNeDBStatus()) {
        await migrateNeDB()
    }
}

async function migrateNeDB() {
    try {
        const sdb = new Datastore<RSSSource>({
            filename: "sources",
            autoload: true,
            onload: err => {
                if (err) window.console.log(err)
            },
        })
        const idb = new Datastore<RSSItem>({
            filename: "items",
            autoload: true,
            onload: err => {
                if (err) window.console.log(err)
            },
        })
        const sourceDocs = await new Promise<RSSSource[]>(resolve => {
            sdb.find({}, (_, docs) => {
                resolve(docs)
            })
        })
        const itemDocs = await new Promise<RSSItem[]>(resolve => {
            idb.find({}, (_, docs) => {
                resolve(docs)
            })
        })
        const sRows = sourceDocs.map(doc => {
            if (doc.serviceRef !== undefined)
                doc.serviceRef = String(doc.serviceRef)
            // @ts-ignore
            delete doc._id
            if (!doc.fetchFrequency) doc.fetchFrequency = 0
            doc.textDir = 0
            doc.hidden = false
            return doc
        })
        const iRows = itemDocs.map(doc => {
            if (doc.serviceRef !== undefined)
                doc.serviceRef = String(doc.serviceRef)
            if (!doc.title) doc.title = intl.get("article.untitled")
            if (!doc.content) doc.content = ""
            if (!doc.snippet) doc.snippet = ""
            delete doc._id
            doc.starred = Boolean(doc.starred)
            doc.hidden = Boolean(doc.hidden)
            doc.notify = Boolean(doc.notify)
            return doc
        })
        await Promise.all([
            appDB.sources.bulkAdd(sRows),
            appDB.items.bulkAdd(iRows),
        ])
        window.settings.setNeDBStatus(false)
        sdb.remove({}, { multi: true }, () => {
            sdb.persistence.compactDatafile()
        })
        idb.remove({}, { multi: true }, () => {
            idb.persistence.compactDatafile()
        })
    } catch (err) {
        window.utils.showErrorBox(
            "An error has occured during update. Please report this error on GitHub.",
            String(err)
        )
        window.utils.closeWindow()
    }
}
