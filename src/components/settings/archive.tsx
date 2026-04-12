import * as React from "react"
import intl from "react-intl-universal"
import { byteToMB } from "../../scripts/utils"
import {
    Stack,
    Label,
    DefaultButton,
    Spinner,
    SpinnerSize,
    Icon,
    IconButton,
} from "@fluentui/react"
import DangerButton from "../utils/danger-button"

type ArchiveEntry = {
    timestamp: string
    size: number
    changedCount: number
}

type ArchiveManagerProps = {
    onClose: () => void
}

type ArchiveManagerState = {
    archives: ArchiveEntry[]
    loading: boolean
    articleCacheSize: string
}

class ArchiveManager extends React.Component<
    ArchiveManagerProps,
    ArchiveManagerState
> {
    constructor(props: ArchiveManagerProps) {
        super(props)
        this.state = {
            archives: [],
            loading: true,
            articleCacheSize: null,
        }
        this.loadArchives()
        this.loadCacheSize()
    }

    loadArchives = () => {
        this.setState({ loading: true })
        window.utils
            .getArchiveList()
            .then(archives => {
                this.setState({ archives, loading: false })
            })
            .catch(() => {
                this.setState({ loading: false })
            })
    }

    loadCacheSize = () => {
        window.utils.getArticleCacheSize().then(size => {
            this.setState({ articleCacheSize: byteToMB(size) })
        })
    }

    deleteArchive = (timestamp: string) => {
        window.utils.deleteArchive(timestamp).then(success => {
            if (success) {
                this.loadArchives()
            }
        })
    }

    exportArchive = async (timestamp: string) => {
        const filename = `archive-${timestamp.replace(/[:.]/g, "-")}.json`
        const callback = await window.utils.showSaveDialog(
            [{ name: "JSON", extensions: ["json"] }],
            filename,
        )
        if (callback) {
            const success = await window.utils.exportArchive(
                timestamp,
                filename,
            )
            callback(
                success ? "" : "Export failed",
                success ? "" : "Failed to export archive",
            )
        }
    }

    clearAllCache = () => {
        window.utils.clearArticleCache().then(() => {
            this.loadArchives()
            this.loadCacheSize()
        })
    }

    formatDate = (timestamp: string): string => {
        try {
            return new Date(timestamp).toLocaleString()
        } catch {
            return timestamp
        }
    }

    render = () => (
        <div className="archive-manager">
            <Stack
                horizontal
                verticalAlign="center"
                tokens={{ childrenGap: 8 }}
                style={{ marginBottom: 12 }}
            >
                <Stack.Item grow>
                    <Label>{intl.get("app.archiveManager")}</Label>
                </Stack.Item>
            </Stack>

            {this.state.loading ? (
                <Spinner size={SpinnerSize.small} />
            ) : this.state.archives.length === 0 ? (
                <div className="archive-empty">
                    <Icon
                        iconName="Archive"
                        style={{ fontSize: 24, opacity: 0.5 }}
                    />
                    <span style={{ opacity: 0.6, marginLeft: 8 }}>
                        {intl.get("app.archiveEmpty")}
                    </span>
                </div>
            ) : (
                <div className="archive-list">
                    {this.state.archives.map(archive => (
                        <div className="archive-item" key={archive.timestamp}>
                            <Stack
                                horizontal
                                verticalAlign="center"
                                tokens={{ childrenGap: 12 }}
                            >
                                <Icon
                                    iconName="Archive"
                                    style={{ fontSize: 16, opacity: 0.7 }}
                                />
                                <Stack.Item grow>
                                    <div className="archive-info">
                                        <span className="archive-time">
                                            {this.formatDate(archive.timestamp)}
                                        </span>
                                        <span className="archive-meta">
                                            {byteToMB(archive.size)} ·{" "}
                                            {archive.changedCount}{" "}
                                            {intl
                                                .get("app.archiveItems")
                                                .toLowerCase()}
                                        </span>
                                    </div>
                                </Stack.Item>
                                <IconButton
                                    iconProps={{ iconName: "Download" }}
                                    title={intl.get("app.archiveExport")}
                                    onClick={() =>
                                        this.exportArchive(archive.timestamp)
                                    }
                                />
                                <DangerButton
                                    text={intl.get("app.archiveDelete")}
                                    onClick={() =>
                                        this.deleteArchive(archive.timestamp)
                                    }
                                />
                            </Stack>
                        </div>
                    ))}
                </div>
            )}

            <Stack
                horizontal
                tokens={{ childrenGap: 8 }}
                style={{ marginTop: 12 }}
            >
                <Stack.Item>
                    <DangerButton
                        text={intl.get("app.clearArticleCache")}
                        disabled={
                            this.state.articleCacheSize === null ||
                            this.state.articleCacheSize === "0MB"
                        }
                        onClick={this.clearAllCache}
                    />
                </Stack.Item>
            </Stack>
            {this.state.articleCacheSize && (
                <span className="settings-hint up">
                    {intl.get("app.articleCacheSize", {
                        size: this.state.articleCacheSize,
                    })}
                </span>
            )}
        </div>
    )
}

export default ArchiveManager
