import { connect } from "react-redux"
import {
    initIntl,
    saveSettings,
    setupAutoFetch,
} from "../../scripts/models/app"
import * as db from "../../scripts/db"
import AppTab from "../../components/settings/app"
import { importAll } from "../../scripts/settings"
import { updateUnreadCounts } from "../../scripts/models/source"
import { AppDispatch } from "../../scripts/utils"
import { RSSItem } from "../../scripts/models/item"
import { RootState } from "../../scripts/reducer"

const mapStateToProps = (state: RootState) => ({
    sources: state.sources,
})

const mapDispatchToProps = (dispatch: AppDispatch, _: any) => ({
    setLanguage: (option: string) => {
        window.settings.setLocaleSettings(option)
        dispatch(initIntl())
    },
    setFetchInterval: (interval: number) => {
        window.settings.setFetchInterval(interval)
        dispatch(setupAutoFetch())
    },
    deleteArticles: async (days: number) => {
        dispatch(saveSettings())
        let date = new Date()
        date.setTime(date.getTime() - days * 86400000)
        await db.itemsDB
            .delete()
            .from(db.items)
            .where(db.items.date.lt(date))
            .exec()
        await dispatch(updateUnreadCounts())
        dispatch(saveSettings())
    },
    importAll: async () => {
        dispatch(saveSettings())
        let cancelled = await importAll()
        if (cancelled) dispatch(saveSettings())
    },
})

const mergeProps = (stateProps: any, dispatchProps: any, ownProps: any) => ({
    ...ownProps,
    ...dispatchProps,
    cacheAllExistingArticles: async () => {
        const allItems = (await db.itemsDB
            .select()
            .from(db.items)
            .exec()) as RSSItem[]
        if (allItems.length === 0) return
        const sources = stateProps.sources
        // Batch in chunks of 20 to avoid overwhelming IPC
        const chunkSize = 20
        for (let i = 0; i < allItems.length; i += chunkSize) {
            const chunk = allItems.slice(i, i + chunkSize)
            const cacheItems = chunk.map(item => ({
                _id: item._id,
                content: item.content || "",
                link: item.link || "",
                title: item.title || "",
                sourceName: sources[item.source]?.name || "",
            }))
            try {
                await window.utils.cacheArticles(cacheItems)
            } catch (e) {
                console.error("Bulk cache chunk error:", e)
            }
        }
    },
})

const AppTabContainer = connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
)(AppTab)
export default AppTabContainer
