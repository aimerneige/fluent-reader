import * as React from "react"
import intl from "react-intl-universal"
import { SourceGroup } from "../../schema-types"
import { SourceState, RSSSource } from "../../scripts/models/source"
import {
    IColumn,
    Selection,
    SelectionMode,
    DetailsList,
    DetailsRow,
    IDetailsRowProps,
    Label,
    Stack,
    TextField,
    PrimaryButton,
    DefaultButton,
    Dropdown,
    IDropdownOption,
    CommandBarButton,
    IconButton,
    MarqueeSelection,
    IDragDropEvents,
    MessageBar,
    MessageBarType,
    MessageBarButton,
    Icon,
    SearchBox,
} from "@fluentui/react"
import DangerButton from "../utils/danger-button"

type GroupsTabProps = {
    sources: SourceState
    groups: SourceGroup[]
    serviceOn: boolean
    createGroup: (name: string) => void
    updateGroup: (group: SourceGroup) => void
    addToGroup: (groupIndex: number, sid: number) => void
    deleteGroup: (groupIndex: number) => void
    removeFromGroup: (groupIndex: number, sids: number[]) => void
    reorderGroups: (groups: SourceGroup[]) => void
    importGroups: () => Promise<void>
}

type GroupsTabState = {
    [formName: string]: any
    searchQuery: string
    selectedGroups: SourceGroup[]
    selectedSources: RSSSource[]
    dropdownIndex: number
    expandedGroupIndex: number
}

class GroupsTab extends React.Component<GroupsTabProps, GroupsTabState> {
    groupSelection: Selection
    groupDragDropEvents: IDragDropEvents
    groupDraggedItem: SourceGroup
    groupDraggedIndex = -1
    sourcesSelection: Selection
    sourcesDragDropEvents: IDragDropEvents
    sourcesDraggedItem: RSSSource
    sourcesDraggedIndex = -1
    childDragSid: number = null
    parentDragSid: number = null

    constructor(props) {
        super(props)
        this.state = {
            editGroupName: "",
            newGroupName: "",
            searchQuery: "",
            selectedGroups: [],
            selectedSources: null,
            dropdownIndex: null,
            expandedGroupIndex: null,
        }
        this.groupDragDropEvents = this.getGroupDragDropEvents()
        this.sourcesDragDropEvents = this.getSourcesDragDropEvents()
        this.groupSelection = new Selection({
            getKey: g => (g as SourceGroup).index,
            onSelectionChanged: () => {
                let groups = this.groupSelection.getSelectedCount()
                    ? (this.groupSelection.getSelection() as SourceGroup[])
                    : []
                this.setState({
                    selectedGroups: groups,
                    editGroupName:
                        groups.length === 1 && groups[0].isMultiple
                            ? groups[0].name
                            : "",
                })
            },
        })
        this.sourcesSelection = new Selection({
            getKey: s => (s as RSSSource).sid,
            onSelectionChanged: () => {
                let sources = this.sourcesSelection.getSelectedCount()
                    ? (this.sourcesSelection.getSelection() as RSSSource[])
                    : null
                this.setState({
                    selectedSources: sources,
                })
            },
        })
    }

    // Always read the expanded group from latest props (not a stale snapshot)
    getExpandedGroup = (): SourceGroup => {
        if (this.state.expandedGroupIndex === null) return null
        return (
            this.props.groups.find(
                g => g.index === this.state.expandedGroupIndex,
            ) || null
        )
    }

    groupColumns = (): IColumn[] => [
        {
            key: "expand",
            name: "",
            minWidth: 20,
            maxWidth: 20,
            onRender: (g: SourceGroup) =>
                g.isMultiple ? (
                    <Icon
                        iconName={
                            this.state.expandedGroupIndex === g.index
                                ? "ChevronDown"
                                : "ChevronRight"
                        }
                        style={{
                            fontSize: 12,
                            cursor: "pointer",
                            userSelect: "none",
                        }}
                        onClick={e => {
                            e.stopPropagation()
                            this.toggleExpandGroup(g)
                        }}
                    />
                ) : null,
        },
        {
            key: "type",
            name: intl.get("groups.type"),
            minWidth: 40,
            maxWidth: 40,
            data: "string",
            onRender: (g: SourceGroup) => (
                <>
                    {g.isMultiple
                        ? intl.get("groups.group")
                        : intl.get("groups.source")}
                </>
            ),
        },
        {
            key: "capacity",
            name: intl.get("groups.capacity"),
            minWidth: 40,
            maxWidth: 60,
            data: "string",
            onRender: (g: SourceGroup) => (
                <>{g.isMultiple ? g.sids.length : ""}</>
            ),
        },
        {
            key: "name",
            name: intl.get("name"),
            minWidth: 200,
            data: "string",
            isRowHeader: true,
            onRender: (g: SourceGroup) => (
                <>
                    {g.isMultiple ? g.name : this.props.sources[g.sids[0]].name}
                </>
            ),
        },
    ]

    sourceColumns: IColumn[] = [
        {
            key: "favicon",
            name: intl.get("icon"),
            fieldName: "name",
            isIconOnly: true,
            iconName: "ImagePixel",
            minWidth: 16,
            maxWidth: 16,
            onRender: (s: RSSSource) =>
                s.iconurl && <img src={s.iconurl} className="favicon" />,
        },
        {
            key: "name",
            name: intl.get("name"),
            fieldName: "name",
            minWidth: 200,
            data: "string",
            isRowHeader: true,
        },
        {
            key: "url",
            name: "URL",
            fieldName: "url",
            minWidth: 280,
            data: "string",
        },
    ]

    getGroupDragDropEvents = (): IDragDropEvents => ({
        canDrop: () => true,
        canDrag: () => true,
        onDrop: (item?: SourceGroup) => {
            if (this.groupDraggedItem) {
                this.reorderGroups(item)
            }
        },
        onDragStart: (item?: SourceGroup, itemIndex?: number) => {
            this.groupDraggedItem = item
            this.groupDraggedIndex = itemIndex!
            // Track if a standalone source is being dragged from the main list
            if (item && !item.isMultiple) {
                this.parentDragSid = item.sids[0]
            }
        },
        onDragEnd: () => {
            this.groupDraggedItem = undefined
            this.groupDraggedIndex = -1
            this.parentDragSid = null
        },
        onDragEnter: () => "drag-drop-target",
    })

    reorderGroups = (item: SourceGroup) => {
        let draggedItem = this.groupSelection.isIndexSelected(
            this.groupDraggedIndex,
        )
            ? (this.groupSelection.getSelection()[0] as SourceGroup)
            : this.groupDraggedItem!

        let insertIndex = item.index
        let groups = this.props.groups.filter(g => g.index != draggedItem.index)

        groups.splice(insertIndex, 0, draggedItem)
        this.groupSelection.setAllSelected(false)
        this.props.reorderGroups(groups)
    }

    getSourcesDragDropEvents = (): IDragDropEvents => ({
        canDrop: () => true,
        canDrag: () => true,
        onDrop: (item?: RSSSource) => {
            if (this.sourcesDraggedItem) {
                this.reorderSources(item)
            }
        },
        onDragStart: (item?: RSSSource, itemIndex?: number) => {
            this.sourcesDraggedItem = item
            this.sourcesDraggedIndex = itemIndex!
            this.childDragSid = item ? item.sid : null
        },
        onDragEnd: () => {
            this.sourcesDraggedItem = undefined
            this.sourcesDraggedIndex = -1
            this.childDragSid = null
        },
        onDragEnter: () => "drag-drop-target",
    })

    reorderSources = (item: RSSSource) => {
        let group = this.getExpandedGroup()
        if (!group) return
        let draggedItems = this.sourcesSelection.isIndexSelected(
            this.sourcesDraggedIndex,
        )
            ? (this.sourcesSelection.getSelection() as RSSSource[]).map(
                  s => s.sid,
              )
            : [this.sourcesDraggedItem!.sid]

        let insertIndex = group.sids.indexOf(item.sid)
        let items = group.sids.filter(sid => !draggedItems.includes(sid))

        items.splice(insertIndex, 0, ...draggedItems)

        let newGroup = { ...group, sids: items }
        this.props.updateGroup(newGroup)
    }

    dropChildOnGroup = (targetGroup: SourceGroup) => {
        let sid = this.childDragSid
        if (sid === null) return
        let expandedGroup = this.getExpandedGroup()
        if (!expandedGroup) return

        // Build the new groups array in one step:
        // 1. Remove sid from the expanded group
        // 2. Insert a new standalone SourceGroup([sid]) at the target position
        let targetIdx = targetGroup.index
        let newGroups: SourceGroup[] = []
        let newExpandedIdx = -1
        for (let i = 0; i < this.props.groups.length; i++) {
            let g = this.props.groups[i]
            if (i === targetIdx) {
                newGroups.push(new SourceGroup([sid]))
            }
            if (g.index === expandedGroup.index) {
                // Remove sid from this group's sids
                let filteredSids = g.sids.filter(s => s !== sid)
                if (g.isMultiple || filteredSids.length > 0) {
                    newExpandedIdx = newGroups.length
                    newGroups.push({ ...g, sids: filteredSids })
                }
            } else {
                newGroups.push(g)
            }
        }
        // If target is past the last item
        if (targetIdx >= this.props.groups.length) {
            newGroups.push(new SourceGroup([sid]))
        }
        this.props.reorderGroups(newGroups)
        this.setState({
            expandedGroupIndex: newExpandedIdx >= 0 ? newExpandedIdx : null,
        })
        this.childDragSid = null
    }

    dropParentOnExpandedGroup = (targetSid?: number) => {
        let sid = this.parentDragSid
        if (sid === null) return
        let expandedGroup = this.getExpandedGroup()
        if (!expandedGroup) return
        // Don't allow dropping a group onto itself
        if (expandedGroup.sids.includes(sid)) return

        // Build new groups: remove the standalone source entry,
        // and add its sid into the expanded group at the right position
        let newGroups: SourceGroup[] = []
        let newExpandedIdx = -1
        for (let g of this.props.groups) {
            if (!g.isMultiple && g.sids[0] === sid) {
                // Skip — this entry is being absorbed into the group
                continue
            }
            if (g.index === expandedGroup.index) {
                let newSids = [...g.sids]
                if (targetSid !== undefined) {
                    let insertIdx = newSids.indexOf(targetSid)
                    if (insertIdx >= 0) {
                        newSids.splice(insertIdx, 0, sid)
                    } else {
                        newSids.push(sid)
                    }
                } else {
                    newSids.push(sid)
                }
                newExpandedIdx = newGroups.length
                newGroups.push({ ...g, sids: newSids })
            } else {
                newGroups.push(g)
            }
        }
        this.groupSelection.setAllSelected(false)
        this.props.reorderGroups(newGroups)
        this.setState({
            expandedGroupIndex: newExpandedIdx >= 0 ? newExpandedIdx : null,
        })
        this.parentDragSid = null
    }

    moveGroupUp = () => {
        let g = this.state.selectedGroups[0]
        if (!g || g.index <= 0) return
        let groups = [...this.props.groups]
        let idx = g.index
        ;[groups[idx - 1], groups[idx]] = [groups[idx], groups[idx - 1]]
        this.groupSelection.setAllSelected(false)
        this.props.reorderGroups(groups)
        setTimeout(() => {
            this.groupSelection.setIndexSelected(idx - 1, true, false)
        }, 0)
    }

    moveGroupDown = () => {
        let g = this.state.selectedGroups[0]
        if (!g || g.index >= this.props.groups.length - 1) return
        let groups = [...this.props.groups]
        let idx = g.index
        ;[groups[idx], groups[idx + 1]] = [groups[idx + 1], groups[idx]]
        this.groupSelection.setAllSelected(false)
        this.props.reorderGroups(groups)
        setTimeout(() => {
            this.groupSelection.setIndexSelected(idx + 1, true, false)
        }, 0)
    }

    moveGroupToTop = () => {
        let g = this.state.selectedGroups[0]
        if (!g || g.index <= 0) return
        let groups = this.props.groups.filter((_, i) => i !== g.index)
        groups.unshift(this.props.groups[g.index])
        this.groupSelection.setAllSelected(false)
        this.props.reorderGroups(groups)
        setTimeout(() => {
            this.groupSelection.setIndexSelected(0, true, false)
        }, 0)
    }

    moveGroupToBottom = () => {
        let g = this.state.selectedGroups[0]
        if (!g || g.index >= this.props.groups.length - 1) return
        let groups = this.props.groups.filter((_, i) => i !== g.index)
        groups.push(this.props.groups[g.index])
        this.groupSelection.setAllSelected(false)
        this.props.reorderGroups(groups)
        setTimeout(() => {
            this.groupSelection.setIndexSelected(groups.length - 1, true, false)
        }, 0)
    }

    moveSourceUp = () => {
        let sources = this.state.selectedSources
        let group = this.getExpandedGroup()
        if (!sources || sources.length !== 1 || !group) return
        let sid = sources[0].sid
        let sids = [...group.sids]
        let idx = sids.indexOf(sid)
        if (idx <= 0) return
        ;[sids[idx - 1], sids[idx]] = [sids[idx], sids[idx - 1]]
        this.props.updateGroup({ ...group, sids })
        setTimeout(() => {
            this.sourcesSelection.setAllSelected(false)
            this.sourcesSelection.setIndexSelected(idx - 1, true, false)
        }, 0)
    }

    moveSourceDown = () => {
        let sources = this.state.selectedSources
        let group = this.getExpandedGroup()
        if (!sources || sources.length !== 1 || !group) return
        let sid = sources[0].sid
        let sids = [...group.sids]
        let idx = sids.indexOf(sid)
        if (idx < 0 || idx >= sids.length - 1) return
        ;[sids[idx], sids[idx + 1]] = [sids[idx + 1], sids[idx]]
        this.props.updateGroup({ ...group, sids })
        setTimeout(() => {
            this.sourcesSelection.setAllSelected(false)
            this.sourcesSelection.setIndexSelected(idx + 1, true, false)
        }, 0)
    }

    moveSourceToTop = () => {
        let sources = this.state.selectedSources
        let group = this.getExpandedGroup()
        if (!sources || sources.length !== 1 || !group) return
        let sid = sources[0].sid
        let sids = group.sids.filter(s => s !== sid)
        sids.unshift(sid)
        this.props.updateGroup({ ...group, sids })
        setTimeout(() => {
            this.sourcesSelection.setAllSelected(false)
            this.sourcesSelection.setIndexSelected(0, true, false)
        }, 0)
    }

    moveSourceToBottom = () => {
        let sources = this.state.selectedSources
        let group = this.getExpandedGroup()
        if (!sources || sources.length !== 1 || !group) return
        let sid = sources[0].sid
        let sids = group.sids.filter(s => s !== sid)
        sids.push(sid)
        this.props.updateGroup({ ...group, sids })
        setTimeout(() => {
            this.sourcesSelection.setAllSelected(false)
            this.sourcesSelection.setIndexSelected(sids.length - 1, true, false)
        }, 0)
    }

    toggleExpandGroup = (g: SourceGroup) => {
        this.setState(prev => ({
            expandedGroupIndex:
                prev.expandedGroupIndex === g.index ? null : g.index,
            selectedSources: null,
        }))
    }

    dropdownOptions = () =>
        this.props.groups
            .filter(g => g.isMultiple)
            .map(g => ({
                key: g.index,
                text: g.name,
            }))

    handleInputChange = event => {
        const name: string = event.target.name
        this.setState({ [name]: event.target.value })
    }

    validateNewGroupName = (v: string) => {
        const name = v.trim()
        if (name.length == 0) {
            return intl.get("emptyName")
        }
        for (let group of this.props.groups) {
            if (group.isMultiple && group.name === name) {
                return intl.get("groups.exist")
            }
        }
        return ""
    }

    createGroup = (event: React.FormEvent) => {
        event.preventDefault()
        let trimmed = this.state.newGroupName.trim()
        if (this.validateNewGroupName(trimmed) === "")
            this.props.createGroup(trimmed)
    }

    addToGroup = () => {
        let sids = this.getSelectedSourceSids()
        for (let sid of sids) {
            this.props.addToGroup(this.state.dropdownIndex, sid)
        }
    }

    removeFromGroup = () => {
        let group = this.getExpandedGroup()
        if (!group || !this.state.selectedSources) return
        this.props.removeFromGroup(
            group.index,
            this.state.selectedSources.map(s => s.sid),
        )
        this.setState({ selectedSources: null })
    }

    deleteGroup = () => {
        let g = this.state.selectedGroups[0]
        this.props.deleteGroup(g.index)
        this.groupSelection.setIndexSelected(g.index, false, false)
        this.setState({
            selectedGroups: [],
            expandedGroupIndex:
                this.state.expandedGroupIndex === g.index
                    ? null
                    : this.state.expandedGroupIndex,
        })
    }

    updateGroupName = () => {
        let group = this.state.selectedGroups[0]
        group = { ...group, name: this.state.editGroupName.trim() }
        this.props.updateGroup(group)
    }

    dropdownChange = (_, item: IDropdownOption) => {
        this.setState({ dropdownIndex: item ? Number(item.key) : null })
    }

    // Get selected sids from the group list (only non-group items)
    getSelectedSourceSids = (): number[] => {
        return this.state.selectedGroups
            .filter(g => !g.isMultiple)
            .map(g => g.sids[0])
    }

    // Determine what action panel to show
    getSelectionInfo = () => {
        let groups = this.state.selectedGroups
        if (groups.length === 0) return "none"
        let hasMultiple = groups.some(g => g.isMultiple)
        let hasSingle = groups.some(g => !g.isMultiple)
        if (hasMultiple && hasSingle) return "mixed"
        if (hasMultiple) return groups.length === 1 ? "singleGroup" : "mixed"
        return hasSingle ? "sources" : "none"
    }

    renderSourceMoveButtons = (group: SourceGroup) => {
        let sources = this.state.selectedSources
        if (!sources || sources.length !== 1) return null
        let sid = sources[0].sid
        let idx = group.sids.indexOf(sid)
        let last = group.sids.length - 1
        return (
            <>
                <IconButton
                    title={intl.get("groups.moveToTop")}
                    iconProps={{
                        iconName: "DoubleChevronUp12",
                        style: { fontSize: 14 },
                    }}
                    disabled={idx <= 0}
                    onClick={this.moveSourceToTop}
                />
                <IconButton
                    title={intl.get("groups.moveUp")}
                    iconProps={{
                        iconName: "Up",
                        style: { fontSize: 14 },
                    }}
                    disabled={idx <= 0}
                    onClick={this.moveSourceUp}
                />
                <IconButton
                    title={intl.get("groups.moveDown")}
                    iconProps={{
                        iconName: "Down",
                        style: { fontSize: 14 },
                    }}
                    disabled={idx >= last}
                    onClick={this.moveSourceDown}
                />
                <IconButton
                    title={intl.get("groups.moveToBottom")}
                    iconProps={{
                        iconName: "DoubleChevronDown12",
                        style: { fontSize: 14 },
                    }}
                    disabled={idx >= last}
                    onClick={this.moveSourceToBottom}
                />
            </>
        )
    }

    onRenderRow = (props: IDetailsRowProps) => {
        let group = props.item as SourceGroup
        let isExpanded =
            group.isMultiple && group.index === this.state.expandedGroupIndex
        return (
            <>
                <div
                    onDragOver={e => {
                        if (this.childDragSid !== null) {
                            e.preventDefault()
                            e.stopPropagation()
                        }
                    }}
                    onDrop={e => {
                        if (this.childDragSid !== null) {
                            e.preventDefault()
                            e.stopPropagation()
                            this.dropChildOnGroup(group)
                        }
                    }}
                >
                    <DetailsRow {...props} />
                </div>
                {isExpanded && this.renderExpandedGroup()}
            </>
        )
    }

    renderExpandedGroup = () => {
        let group = this.getExpandedGroup()
        if (!group || !group.isMultiple) return null
        let sources = group.sids.map(sid => this.props.sources[sid])
        return (
            <div
                style={{
                    marginBottom: 12,
                    marginLeft: 24,
                    borderLeft: "2px solid var(--neutralTertiaryAlt, #c8c6c4)",
                    paddingLeft: 12,
                }}
                onDragOver={e => {
                    if (this.parentDragSid !== null) {
                        e.preventDefault()
                        e.stopPropagation()
                    }
                }}
                onDrop={e => {
                    if (this.parentDragSid !== null) {
                        e.preventDefault()
                        e.stopPropagation()
                        this.dropParentOnExpandedGroup()
                    }
                }}
            >
                <Stack
                    horizontal
                    horizontalAlign="space-between"
                    verticalAlign="center"
                    style={{ height: 36 }}
                >
                    <Label style={{ margin: 0, fontSize: 13 }}>
                        {group.name}
                    </Label>
                    <Stack horizontal>
                        {this.renderSourceMoveButtons(group)}
                        {this.state.selectedSources != null && (
                            <CommandBarButton
                                text={intl.get("groups.removeSource")}
                                onClick={this.removeFromGroup}
                                iconProps={{
                                    iconName: "RemoveFromShoppingList",
                                    style: { color: "#d13438" },
                                }}
                            />
                        )}
                    </Stack>
                </Stack>
                <MarqueeSelection
                    selection={this.sourcesSelection}
                    isDraggingConstrainedToRoot={true}
                >
                    <DetailsList
                        compact={true}
                        items={sources}
                        columns={this.sourceColumns}
                        dragDropEvents={this.sourcesDragDropEvents}
                        setKey="expanded-sources"
                        selection={this.sourcesSelection}
                        selectionMode={SelectionMode.multiple}
                    />
                </MarqueeSelection>
                <span className="settings-hint">
                    {intl.get("groups.sourceHint")}
                </span>
            </div>
        )
    }

    render = () => {
        let selInfo = this.getSelectionInfo()
        let singleGroup =
            this.state.selectedGroups.length === 1
                ? this.state.selectedGroups[0]
                : null

        return (
            <div className="tab-body">
                {this.props.serviceOn && (
                    <MessageBar
                        messageBarType={MessageBarType.info}
                        isMultiline={false}
                        actions={
                            <MessageBarButton
                                text={intl.get("service.importGroups")}
                                onClick={this.props.importGroups}
                            />
                        }
                    >
                        {intl.get("service.groupsWarning")}
                    </MessageBar>
                )}
                <form onSubmit={this.createGroup}>
                    <Label htmlFor="newGroupName">
                        {intl.get("groups.create")}
                    </Label>
                    <Stack horizontal>
                        <Stack.Item grow>
                            <TextField
                                onGetErrorMessage={this.validateNewGroupName}
                                validateOnLoad={false}
                                placeholder={intl.get("groups.enterName")}
                                value={this.state.newGroupName}
                                id="newGroupName"
                                name="newGroupName"
                                onChange={this.handleInputChange}
                            />
                        </Stack.Item>
                        <Stack.Item>
                            <PrimaryButton
                                disabled={
                                    this.validateNewGroupName(
                                        this.state.newGroupName,
                                    ) !== ""
                                }
                                type="sumbit"
                                text={intl.get("create")}
                            />
                        </Stack.Item>
                    </Stack>
                </form>

                <SearchBox
                    placeholder={intl.get("groups.search")}
                    value={this.state.searchQuery}
                    onChange={(_, v) =>
                        this.setState({ searchQuery: v || "" })
                    }
                    styles={{ root: { marginBottom: 8 } }}
                />

                <DetailsList
                    compact={true}
                    items={(() => {
                        const query =
                            this.state.searchQuery.toLowerCase()
                        return query
                            ? this.props.groups.filter(g => {
                                  if (g.isMultiple) {
                                      return g.name
                                          .toLowerCase()
                                          .includes(query)
                                  }
                                  const src =
                                      this.props.sources[g.sids[0]]
                                  return (
                                      src &&
                                      (src.name
                                          .toLowerCase()
                                          .includes(query) ||
                                          src.url
                                              .toLowerCase()
                                              .includes(query))
                                  )
                              })
                            : this.props.groups
                    })()}
                    columns={this.groupColumns()}
                    setKey="selected"
                    dragDropEvents={this.groupDragDropEvents}
                    selection={this.groupSelection}
                    selectionMode={SelectionMode.multiple}
                    onRenderRow={this.onRenderRow}
                />

                {/* Single selection: show reorder buttons */}
                {singleGroup && (
                    <Stack
                        horizontal
                        tokens={{ childrenGap: 4 }}
                        style={{ marginBottom: 8 }}
                    >
                        <IconButton
                            title={intl.get("groups.moveToTop")}
                            iconProps={{
                                iconName: "DoubleChevronUp12",
                                style: { fontSize: 14 },
                            }}
                            disabled={singleGroup.index <= 0}
                            onClick={this.moveGroupToTop}
                        />
                        <IconButton
                            title={intl.get("groups.moveUp")}
                            iconProps={{
                                iconName: "Up",
                                style: { fontSize: 14 },
                            }}
                            disabled={singleGroup.index <= 0}
                            onClick={this.moveGroupUp}
                        />
                        <IconButton
                            title={intl.get("groups.moveDown")}
                            iconProps={{
                                iconName: "Down",
                                style: { fontSize: 14 },
                            }}
                            disabled={
                                singleGroup.index >=
                                this.props.groups.length - 1
                            }
                            onClick={this.moveGroupDown}
                        />
                        <IconButton
                            title={intl.get("groups.moveToBottom")}
                            iconProps={{
                                iconName: "DoubleChevronDown12",
                                style: { fontSize: 14 },
                            }}
                            disabled={
                                singleGroup.index >=
                                this.props.groups.length - 1
                            }
                            onClick={this.moveGroupToBottom}
                        />
                    </Stack>
                )}

                {/* Action panel based on selection */}
                {selInfo === "singleGroup" && singleGroup && (
                    <>
                        <Label>{intl.get("groups.selectedGroup")}</Label>
                        <Stack horizontal>
                            <Stack.Item grow>
                                <TextField
                                    onGetErrorMessage={v =>
                                        v.trim().length == 0
                                            ? intl.get("emptyName")
                                            : ""
                                    }
                                    validateOnLoad={false}
                                    placeholder={intl.get("groups.enterName")}
                                    value={this.state.editGroupName}
                                    name="editGroupName"
                                    onChange={this.handleInputChange}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <DefaultButton
                                    disabled={
                                        this.state.editGroupName.trim()
                                            .length == 0
                                    }
                                    onClick={this.updateGroupName}
                                    text={intl.get("groups.editName")}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <DangerButton
                                    key={singleGroup.index}
                                    onClick={this.deleteGroup}
                                    text={intl.get("groups.deleteGroup")}
                                />
                            </Stack.Item>
                        </Stack>
                    </>
                )}
                {selInfo === "sources" && (
                    <>
                        <Label>
                            {this.state.selectedGroups.length === 1
                                ? intl.get("groups.selectedSource")
                                : intl.get("groups.selectedSources", {
                                      count: this.state.selectedGroups.length,
                                  })}
                        </Label>
                        <Stack horizontal>
                            <Stack.Item grow>
                                <Dropdown
                                    placeholder={intl.get("groups.chooseGroup")}
                                    selectedKey={this.state.dropdownIndex}
                                    options={this.dropdownOptions()}
                                    onChange={this.dropdownChange}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <DefaultButton
                                    disabled={this.state.dropdownIndex === null}
                                    onClick={this.addToGroup}
                                    text={intl.get("groups.addToGroup")}
                                />
                            </Stack.Item>
                        </Stack>
                    </>
                )}
                {selInfo === "none" && (
                    <span className="settings-hint">
                        {intl.get("groups.groupHint")}
                    </span>
                )}
            </div>
        )
    }
}

export default GroupsTab
