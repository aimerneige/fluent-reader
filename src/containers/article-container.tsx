import { connect } from "react-redux"
import { createSelector } from "reselect"
import { RootState } from "../scripts/reducer"
import {
    RSSItem,
    markUnread,
    markRead,
    toggleStarred,
    toggleHidden,
    itemShortcuts,
} from "../scripts/models/item"
import { AppDispatch } from "../scripts/utils"
import { dismissItem, showOffsetItem } from "../scripts/models/page"
import Article from "../components/article"
import {
    openTextMenu,
    closeContextMenu,
    openImageMenu,
    clearAIRequest,
    AIContextMode,
} from "../scripts/models/app"
import {
    RSSSource,
    SourceTextDirection,
    updateSource,
} from "../scripts/models/source"

type ArticleContainerProps = {
    itemId: number
}

const getItem = (state: RootState, props: ArticleContainerProps) =>
    state.items[props.itemId]
const getSource = (state: RootState, props: ArticleContainerProps) =>
    state.sources[state.items[props.itemId].source]
const getLocale = (state: RootState) => state.app.locale
const getAIRequest = (state: RootState) => state.app.aiRequest

const makeMapStateToProps = () => {
    return createSelector(
        [getItem, getSource, getLocale, getAIRequest],
        (item, source, locale, aiRequest) => ({
            item: item,
            source: source,
            locale: locale,
            aiRequest: aiRequest,
        }),
    )
}

const mapDispatchToProps = (dispatch: AppDispatch) => {
    return {
        shortcuts: (item: RSSItem, e: KeyboardEvent) =>
            dispatch(itemShortcuts(item, e)),
        dismiss: () => dispatch(dismissItem()),
        offsetItem: (offset: number) => dispatch(showOffsetItem(offset)),
        toggleHasRead: (item: RSSItem) =>
            dispatch(item.hasRead ? markUnread(item) : markRead(item)),
        toggleStarred: (item: RSSItem) => dispatch(toggleStarred(item)),
        toggleHidden: (item: RSSItem) => {
            if (!item.hidden) dispatch(dismissItem())
            if (!item.hasRead && !item.hidden) dispatch(markRead(item))
            dispatch(toggleHidden(item))
        },
        textMenu: (position: [number, number], text: string, url: string) =>
            dispatch(openTextMenu(position, text, url)),
        imageMenu: (position: [number, number]) =>
            dispatch(openImageMenu(position)),
        dismissContextMenu: () => dispatch(closeContextMenu()),
        clearAIRequest: () => dispatch(clearAIRequest()),
        updateSourceTextDirection: (
            source: RSSSource,
            direction: SourceTextDirection,
        ) => {
            dispatch(
                updateSource({ ...source, textDir: direction } as RSSSource),
            )
        },
    }
}

const ArticleContainer = connect(
    makeMapStateToProps,
    mapDispatchToProps,
)(Article)
export default ArticleContainer
