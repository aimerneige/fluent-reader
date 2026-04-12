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
const schema_types_1 = require("../../schema-types");
const react_1 = require("@fluentui/react");
const danger_button_1 = __importDefault(require("../utils/danger-button"));
class GroupsTab extends React.Component {
    constructor(props) {
        super(props);
        this.groupDraggedIndex = -1;
        this.sourcesDraggedIndex = -1;
        this.childDragSid = null;
        this.parentDragSid = null;
        // Always read the expanded group from latest props (not a stale snapshot)
        this.getExpandedGroup = () => {
            if (this.state.expandedGroupIndex === null)
                return null;
            return (this.props.groups.find(g => g.index === this.state.expandedGroupIndex) || null);
        };
        this.groupColumns = () => [
            {
                key: "expand",
                name: "",
                minWidth: 20,
                maxWidth: 20,
                onRender: (g) => g.isMultiple ? (React.createElement(react_1.Icon, { iconName: this.state.expandedGroupIndex === g.index
                        ? "ChevronDown"
                        : "ChevronRight", style: {
                        fontSize: 12,
                        cursor: "pointer",
                        userSelect: "none",
                    }, onClick: e => {
                        e.stopPropagation();
                        this.toggleExpandGroup(g);
                    } })) : null,
            },
            {
                key: "type",
                name: react_intl_universal_1.default.get("groups.type"),
                minWidth: 40,
                maxWidth: 40,
                data: "string",
                onRender: (g) => (React.createElement(React.Fragment, null, g.isMultiple
                    ? react_intl_universal_1.default.get("groups.group")
                    : react_intl_universal_1.default.get("groups.source"))),
            },
            {
                key: "capacity",
                name: react_intl_universal_1.default.get("groups.capacity"),
                minWidth: 40,
                maxWidth: 60,
                data: "string",
                onRender: (g) => (React.createElement(React.Fragment, null, g.isMultiple ? g.sids.length : "")),
            },
            {
                key: "name",
                name: react_intl_universal_1.default.get("name"),
                minWidth: 200,
                data: "string",
                isRowHeader: true,
                onRender: (g) => (React.createElement(React.Fragment, null, g.isMultiple ? g.name : this.props.sources[g.sids[0]].name)),
            },
        ];
        this.sourceColumns = [
            {
                key: "favicon",
                name: react_intl_universal_1.default.get("icon"),
                fieldName: "name",
                isIconOnly: true,
                iconName: "ImagePixel",
                minWidth: 16,
                maxWidth: 16,
                onRender: (s) => s.iconurl && React.createElement("img", { src: s.iconurl, className: "favicon" }),
            },
            {
                key: "name",
                name: react_intl_universal_1.default.get("name"),
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
        ];
        this.getGroupDragDropEvents = () => ({
            canDrop: () => true,
            canDrag: () => true,
            onDrop: (item) => {
                if (this.groupDraggedItem) {
                    this.reorderGroups(item);
                }
            },
            onDragStart: (item, itemIndex) => {
                this.groupDraggedItem = item;
                this.groupDraggedIndex = itemIndex;
                // Track if a standalone source is being dragged from the main list
                if (item && !item.isMultiple) {
                    this.parentDragSid = item.sids[0];
                }
            },
            onDragEnd: () => {
                this.groupDraggedItem = undefined;
                this.groupDraggedIndex = -1;
                this.parentDragSid = null;
            },
            onDragEnter: () => "drag-drop-target",
        });
        this.reorderGroups = (item) => {
            let draggedItem = this.groupSelection.isIndexSelected(this.groupDraggedIndex)
                ? this.groupSelection.getSelection()[0]
                : this.groupDraggedItem;
            let insertIndex = item.index;
            let groups = this.props.groups.filter(g => g.index != draggedItem.index);
            groups.splice(insertIndex, 0, draggedItem);
            this.groupSelection.setAllSelected(false);
            this.props.reorderGroups(groups);
        };
        this.getSourcesDragDropEvents = () => ({
            canDrop: () => true,
            canDrag: () => true,
            onDrop: (item) => {
                if (this.sourcesDraggedItem) {
                    this.reorderSources(item);
                }
            },
            onDragStart: (item, itemIndex) => {
                this.sourcesDraggedItem = item;
                this.sourcesDraggedIndex = itemIndex;
                this.childDragSid = item ? item.sid : null;
            },
            onDragEnd: () => {
                this.sourcesDraggedItem = undefined;
                this.sourcesDraggedIndex = -1;
                this.childDragSid = null;
            },
            onDragEnter: () => "drag-drop-target",
        });
        this.reorderSources = (item) => {
            let group = this.getExpandedGroup();
            if (!group)
                return;
            let draggedItems = this.sourcesSelection.isIndexSelected(this.sourcesDraggedIndex)
                ? this.sourcesSelection.getSelection().map(s => s.sid)
                : [this.sourcesDraggedItem.sid];
            let insertIndex = group.sids.indexOf(item.sid);
            let items = group.sids.filter(sid => !draggedItems.includes(sid));
            items.splice(insertIndex, 0, ...draggedItems);
            let newGroup = { ...group, sids: items };
            this.props.updateGroup(newGroup);
        };
        this.dropChildOnGroup = (targetGroup) => {
            let sid = this.childDragSid;
            if (sid === null)
                return;
            let expandedGroup = this.getExpandedGroup();
            if (!expandedGroup)
                return;
            // Build the new groups array in one step:
            // 1. Remove sid from the expanded group
            // 2. Insert a new standalone SourceGroup([sid]) at the target position
            let targetIdx = targetGroup.index;
            let newGroups = [];
            let newExpandedIdx = -1;
            for (let i = 0; i < this.props.groups.length; i++) {
                let g = this.props.groups[i];
                if (i === targetIdx) {
                    newGroups.push(new schema_types_1.SourceGroup([sid]));
                }
                if (g.index === expandedGroup.index) {
                    // Remove sid from this group's sids
                    let filteredSids = g.sids.filter(s => s !== sid);
                    if (g.isMultiple || filteredSids.length > 0) {
                        newExpandedIdx = newGroups.length;
                        newGroups.push({ ...g, sids: filteredSids });
                    }
                }
                else {
                    newGroups.push(g);
                }
            }
            // If target is past the last item
            if (targetIdx >= this.props.groups.length) {
                newGroups.push(new schema_types_1.SourceGroup([sid]));
            }
            this.props.reorderGroups(newGroups);
            this.setState({
                expandedGroupIndex: newExpandedIdx >= 0 ? newExpandedIdx : null,
            });
            this.childDragSid = null;
        };
        this.dropParentOnExpandedGroup = (targetSid) => {
            let sid = this.parentDragSid;
            if (sid === null)
                return;
            let expandedGroup = this.getExpandedGroup();
            if (!expandedGroup)
                return;
            // Don't allow dropping a group onto itself
            if (expandedGroup.sids.includes(sid))
                return;
            // Build new groups: remove the standalone source entry,
            // and add its sid into the expanded group at the right position
            let newGroups = [];
            let newExpandedIdx = -1;
            for (let g of this.props.groups) {
                if (!g.isMultiple && g.sids[0] === sid) {
                    // Skip — this entry is being absorbed into the group
                    continue;
                }
                if (g.index === expandedGroup.index) {
                    let newSids = [...g.sids];
                    if (targetSid !== undefined) {
                        let insertIdx = newSids.indexOf(targetSid);
                        if (insertIdx >= 0) {
                            newSids.splice(insertIdx, 0, sid);
                        }
                        else {
                            newSids.push(sid);
                        }
                    }
                    else {
                        newSids.push(sid);
                    }
                    newExpandedIdx = newGroups.length;
                    newGroups.push({ ...g, sids: newSids });
                }
                else {
                    newGroups.push(g);
                }
            }
            this.groupSelection.setAllSelected(false);
            this.props.reorderGroups(newGroups);
            this.setState({
                expandedGroupIndex: newExpandedIdx >= 0 ? newExpandedIdx : null,
            });
            this.parentDragSid = null;
        };
        this.moveGroupUp = () => {
            let g = this.state.selectedGroups[0];
            if (!g || g.index <= 0)
                return;
            let groups = [...this.props.groups];
            let idx = g.index;
            [groups[idx - 1], groups[idx]] = [groups[idx], groups[idx - 1]];
            this.groupSelection.setAllSelected(false);
            this.props.reorderGroups(groups);
            setTimeout(() => {
                this.groupSelection.setIndexSelected(idx - 1, true, false);
            }, 0);
        };
        this.moveGroupDown = () => {
            let g = this.state.selectedGroups[0];
            if (!g || g.index >= this.props.groups.length - 1)
                return;
            let groups = [...this.props.groups];
            let idx = g.index;
            [groups[idx], groups[idx + 1]] = [groups[idx + 1], groups[idx]];
            this.groupSelection.setAllSelected(false);
            this.props.reorderGroups(groups);
            setTimeout(() => {
                this.groupSelection.setIndexSelected(idx + 1, true, false);
            }, 0);
        };
        this.moveGroupToTop = () => {
            let g = this.state.selectedGroups[0];
            if (!g || g.index <= 0)
                return;
            let groups = this.props.groups.filter((_, i) => i !== g.index);
            groups.unshift(this.props.groups[g.index]);
            this.groupSelection.setAllSelected(false);
            this.props.reorderGroups(groups);
            setTimeout(() => {
                this.groupSelection.setIndexSelected(0, true, false);
            }, 0);
        };
        this.moveGroupToBottom = () => {
            let g = this.state.selectedGroups[0];
            if (!g || g.index >= this.props.groups.length - 1)
                return;
            let groups = this.props.groups.filter((_, i) => i !== g.index);
            groups.push(this.props.groups[g.index]);
            this.groupSelection.setAllSelected(false);
            this.props.reorderGroups(groups);
            setTimeout(() => {
                this.groupSelection.setIndexSelected(groups.length - 1, true, false);
            }, 0);
        };
        this.moveSourceUp = () => {
            let sources = this.state.selectedSources;
            let group = this.getExpandedGroup();
            if (!sources || sources.length !== 1 || !group)
                return;
            let sid = sources[0].sid;
            let sids = [...group.sids];
            let idx = sids.indexOf(sid);
            if (idx <= 0)
                return;
            [sids[idx - 1], sids[idx]] = [sids[idx], sids[idx - 1]];
            this.props.updateGroup({ ...group, sids });
            setTimeout(() => {
                this.sourcesSelection.setAllSelected(false);
                this.sourcesSelection.setIndexSelected(idx - 1, true, false);
            }, 0);
        };
        this.moveSourceDown = () => {
            let sources = this.state.selectedSources;
            let group = this.getExpandedGroup();
            if (!sources || sources.length !== 1 || !group)
                return;
            let sid = sources[0].sid;
            let sids = [...group.sids];
            let idx = sids.indexOf(sid);
            if (idx < 0 || idx >= sids.length - 1)
                return;
            [sids[idx], sids[idx + 1]] = [sids[idx + 1], sids[idx]];
            this.props.updateGroup({ ...group, sids });
            setTimeout(() => {
                this.sourcesSelection.setAllSelected(false);
                this.sourcesSelection.setIndexSelected(idx + 1, true, false);
            }, 0);
        };
        this.moveSourceToTop = () => {
            let sources = this.state.selectedSources;
            let group = this.getExpandedGroup();
            if (!sources || sources.length !== 1 || !group)
                return;
            let sid = sources[0].sid;
            let sids = group.sids.filter(s => s !== sid);
            sids.unshift(sid);
            this.props.updateGroup({ ...group, sids });
            setTimeout(() => {
                this.sourcesSelection.setAllSelected(false);
                this.sourcesSelection.setIndexSelected(0, true, false);
            }, 0);
        };
        this.moveSourceToBottom = () => {
            let sources = this.state.selectedSources;
            let group = this.getExpandedGroup();
            if (!sources || sources.length !== 1 || !group)
                return;
            let sid = sources[0].sid;
            let sids = group.sids.filter(s => s !== sid);
            sids.push(sid);
            this.props.updateGroup({ ...group, sids });
            setTimeout(() => {
                this.sourcesSelection.setAllSelected(false);
                this.sourcesSelection.setIndexSelected(sids.length - 1, true, false);
            }, 0);
        };
        this.toggleExpandGroup = (g) => {
            this.setState(prev => ({
                expandedGroupIndex: prev.expandedGroupIndex === g.index ? null : g.index,
                selectedSources: null,
            }));
        };
        this.dropdownOptions = () => this.props.groups
            .filter(g => g.isMultiple)
            .map(g => ({
            key: g.index,
            text: g.name,
        }));
        this.handleInputChange = event => {
            const name = event.target.name;
            this.setState({ [name]: event.target.value });
        };
        this.validateNewGroupName = (v) => {
            const name = v.trim();
            if (name.length == 0) {
                return react_intl_universal_1.default.get("emptyName");
            }
            for (let group of this.props.groups) {
                if (group.isMultiple && group.name === name) {
                    return react_intl_universal_1.default.get("groups.exist");
                }
            }
            return "";
        };
        this.createGroup = (event) => {
            event.preventDefault();
            let trimmed = this.state.newGroupName.trim();
            if (this.validateNewGroupName(trimmed) === "")
                this.props.createGroup(trimmed);
        };
        this.addToGroup = () => {
            let sids = this.getSelectedSourceSids();
            for (let sid of sids) {
                this.props.addToGroup(this.state.dropdownIndex, sid);
            }
        };
        this.removeFromGroup = () => {
            let group = this.getExpandedGroup();
            if (!group || !this.state.selectedSources)
                return;
            this.props.removeFromGroup(group.index, this.state.selectedSources.map(s => s.sid));
            this.setState({ selectedSources: null });
        };
        this.deleteGroup = () => {
            let g = this.state.selectedGroups[0];
            this.props.deleteGroup(g.index);
            this.groupSelection.setIndexSelected(g.index, false, false);
            this.setState({
                selectedGroups: [],
                expandedGroupIndex: this.state.expandedGroupIndex === g.index
                    ? null
                    : this.state.expandedGroupIndex,
            });
        };
        this.updateGroupName = () => {
            let group = this.state.selectedGroups[0];
            group = { ...group, name: this.state.editGroupName.trim() };
            this.props.updateGroup(group);
        };
        this.dropdownChange = (_, item) => {
            this.setState({ dropdownIndex: item ? Number(item.key) : null });
        };
        // Get selected sids from the group list (only non-group items)
        this.getSelectedSourceSids = () => {
            return this.state.selectedGroups
                .filter(g => !g.isMultiple)
                .map(g => g.sids[0]);
        };
        // Determine what action panel to show
        this.getSelectionInfo = () => {
            let groups = this.state.selectedGroups;
            if (groups.length === 0)
                return "none";
            let hasMultiple = groups.some(g => g.isMultiple);
            let hasSingle = groups.some(g => !g.isMultiple);
            if (hasMultiple && hasSingle)
                return "mixed";
            if (hasMultiple)
                return groups.length === 1 ? "singleGroup" : "mixed";
            return hasSingle ? "sources" : "none";
        };
        this.renderSourceMoveButtons = (group) => {
            let sources = this.state.selectedSources;
            if (!sources || sources.length !== 1)
                return null;
            let sid = sources[0].sid;
            let idx = group.sids.indexOf(sid);
            let last = group.sids.length - 1;
            return (React.createElement(React.Fragment, null,
                React.createElement(react_1.IconButton, { title: react_intl_universal_1.default.get("groups.moveToTop"), iconProps: {
                        iconName: "DoubleChevronUp12",
                        style: { fontSize: 14 },
                    }, disabled: idx <= 0, onClick: this.moveSourceToTop }),
                React.createElement(react_1.IconButton, { title: react_intl_universal_1.default.get("groups.moveUp"), iconProps: {
                        iconName: "Up",
                        style: { fontSize: 14 },
                    }, disabled: idx <= 0, onClick: this.moveSourceUp }),
                React.createElement(react_1.IconButton, { title: react_intl_universal_1.default.get("groups.moveDown"), iconProps: {
                        iconName: "Down",
                        style: { fontSize: 14 },
                    }, disabled: idx >= last, onClick: this.moveSourceDown }),
                React.createElement(react_1.IconButton, { title: react_intl_universal_1.default.get("groups.moveToBottom"), iconProps: {
                        iconName: "DoubleChevronDown12",
                        style: { fontSize: 14 },
                    }, disabled: idx >= last, onClick: this.moveSourceToBottom })));
        };
        this.onRenderRow = (props) => {
            let group = props.item;
            let isExpanded = group.isMultiple && group.index === this.state.expandedGroupIndex;
            return (React.createElement(React.Fragment, null,
                React.createElement("div", { onDragOver: e => {
                        if (this.childDragSid !== null) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    }, onDrop: e => {
                        if (this.childDragSid !== null) {
                            e.preventDefault();
                            e.stopPropagation();
                            this.dropChildOnGroup(group);
                        }
                    } },
                    React.createElement(react_1.DetailsRow, { ...props })),
                isExpanded && this.renderExpandedGroup()));
        };
        this.renderExpandedGroup = () => {
            let group = this.getExpandedGroup();
            if (!group || !group.isMultiple)
                return null;
            let sources = group.sids.map(sid => this.props.sources[sid]);
            return (React.createElement("div", { style: {
                    marginBottom: 12,
                    marginLeft: 24,
                    borderLeft: "2px solid var(--neutralTertiaryAlt, #c8c6c4)",
                    paddingLeft: 12,
                }, onDragOver: e => {
                    if (this.parentDragSid !== null) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }, onDrop: e => {
                    if (this.parentDragSid !== null) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.dropParentOnExpandedGroup();
                    }
                } },
                React.createElement(react_1.Stack, { horizontal: true, horizontalAlign: "space-between", verticalAlign: "center", style: { height: 36 } },
                    React.createElement(react_1.Label, { style: { margin: 0, fontSize: 13 } }, group.name),
                    React.createElement(react_1.Stack, { horizontal: true },
                        this.renderSourceMoveButtons(group),
                        this.state.selectedSources != null && (React.createElement(react_1.CommandBarButton, { text: react_intl_universal_1.default.get("groups.removeSource"), onClick: this.removeFromGroup, iconProps: {
                                iconName: "RemoveFromShoppingList",
                                style: { color: "#d13438" },
                            } })))),
                React.createElement(react_1.MarqueeSelection, { selection: this.sourcesSelection, isDraggingConstrainedToRoot: true },
                    React.createElement(react_1.DetailsList, { compact: true, items: sources, columns: this.sourceColumns, dragDropEvents: this.sourcesDragDropEvents, setKey: "expanded-sources", selection: this.sourcesSelection, selectionMode: react_1.SelectionMode.multiple })),
                React.createElement("span", { className: "settings-hint" }, react_intl_universal_1.default.get("groups.sourceHint"))));
        };
        this.render = () => {
            let selInfo = this.getSelectionInfo();
            let singleGroup = this.state.selectedGroups.length === 1
                ? this.state.selectedGroups[0]
                : null;
            return (React.createElement("div", { className: "tab-body" },
                this.props.serviceOn && (React.createElement(react_1.MessageBar, { messageBarType: react_1.MessageBarType.info, isMultiline: false, actions: React.createElement(react_1.MessageBarButton, { text: react_intl_universal_1.default.get("service.importGroups"), onClick: this.props.importGroups }) }, react_intl_universal_1.default.get("service.groupsWarning"))),
                React.createElement("form", { onSubmit: this.createGroup },
                    React.createElement(react_1.Label, { htmlFor: "newGroupName" }, react_intl_universal_1.default.get("groups.create")),
                    React.createElement(react_1.Stack, { horizontal: true },
                        React.createElement(react_1.Stack.Item, { grow: true },
                            React.createElement(react_1.TextField, { onGetErrorMessage: this.validateNewGroupName, validateOnLoad: false, placeholder: react_intl_universal_1.default.get("groups.enterName"), value: this.state.newGroupName, id: "newGroupName", name: "newGroupName", onChange: this.handleInputChange })),
                        React.createElement(react_1.Stack.Item, null,
                            React.createElement(react_1.PrimaryButton, { disabled: this.validateNewGroupName(this.state.newGroupName) !== "", type: "sumbit", text: react_intl_universal_1.default.get("create") })))),
                React.createElement(react_1.DetailsList, { compact: true, items: this.props.groups, columns: this.groupColumns(), setKey: "selected", dragDropEvents: this.groupDragDropEvents, selection: this.groupSelection, selectionMode: react_1.SelectionMode.multiple, onRenderRow: this.onRenderRow }),
                singleGroup && (React.createElement(react_1.Stack, { horizontal: true, tokens: { childrenGap: 4 }, style: { marginBottom: 8 } },
                    React.createElement(react_1.IconButton, { title: react_intl_universal_1.default.get("groups.moveToTop"), iconProps: {
                            iconName: "DoubleChevronUp12",
                            style: { fontSize: 14 },
                        }, disabled: singleGroup.index <= 0, onClick: this.moveGroupToTop }),
                    React.createElement(react_1.IconButton, { title: react_intl_universal_1.default.get("groups.moveUp"), iconProps: {
                            iconName: "Up",
                            style: { fontSize: 14 },
                        }, disabled: singleGroup.index <= 0, onClick: this.moveGroupUp }),
                    React.createElement(react_1.IconButton, { title: react_intl_universal_1.default.get("groups.moveDown"), iconProps: {
                            iconName: "Down",
                            style: { fontSize: 14 },
                        }, disabled: singleGroup.index >=
                            this.props.groups.length - 1, onClick: this.moveGroupDown }),
                    React.createElement(react_1.IconButton, { title: react_intl_universal_1.default.get("groups.moveToBottom"), iconProps: {
                            iconName: "DoubleChevronDown12",
                            style: { fontSize: 14 },
                        }, disabled: singleGroup.index >=
                            this.props.groups.length - 1, onClick: this.moveGroupToBottom }))),
                selInfo === "singleGroup" && singleGroup && (React.createElement(React.Fragment, null,
                    React.createElement(react_1.Label, null, react_intl_universal_1.default.get("groups.selectedGroup")),
                    React.createElement(react_1.Stack, { horizontal: true },
                        React.createElement(react_1.Stack.Item, { grow: true },
                            React.createElement(react_1.TextField, { onGetErrorMessage: v => v.trim().length == 0
                                    ? react_intl_universal_1.default.get("emptyName")
                                    : "", validateOnLoad: false, placeholder: react_intl_universal_1.default.get("groups.enterName"), value: this.state.editGroupName, name: "editGroupName", onChange: this.handleInputChange })),
                        React.createElement(react_1.Stack.Item, null,
                            React.createElement(react_1.DefaultButton, { disabled: this.state.editGroupName.trim()
                                    .length == 0, onClick: this.updateGroupName, text: react_intl_universal_1.default.get("groups.editName") })),
                        React.createElement(react_1.Stack.Item, null,
                            React.createElement(danger_button_1.default, { key: singleGroup.index, onClick: this.deleteGroup, text: react_intl_universal_1.default.get("groups.deleteGroup") }))))),
                selInfo === "sources" && (React.createElement(React.Fragment, null,
                    React.createElement(react_1.Label, null, this.state.selectedGroups.length === 1
                        ? react_intl_universal_1.default.get("groups.selectedSource")
                        : react_intl_universal_1.default.get("groups.selectedSources", {
                            count: this.state.selectedGroups.length,
                        })),
                    React.createElement(react_1.Stack, { horizontal: true },
                        React.createElement(react_1.Stack.Item, { grow: true },
                            React.createElement(react_1.Dropdown, { placeholder: react_intl_universal_1.default.get("groups.chooseGroup"), selectedKey: this.state.dropdownIndex, options: this.dropdownOptions(), onChange: this.dropdownChange })),
                        React.createElement(react_1.Stack.Item, null,
                            React.createElement(react_1.DefaultButton, { disabled: this.state.dropdownIndex === null, onClick: this.addToGroup, text: react_intl_universal_1.default.get("groups.addToGroup") }))))),
                selInfo === "none" && (React.createElement("span", { className: "settings-hint" }, react_intl_universal_1.default.get("groups.groupHint")))));
        };
        this.state = {
            editGroupName: "",
            newGroupName: "",
            selectedGroups: [],
            selectedSources: null,
            dropdownIndex: null,
            expandedGroupIndex: null,
        };
        this.groupDragDropEvents = this.getGroupDragDropEvents();
        this.sourcesDragDropEvents = this.getSourcesDragDropEvents();
        this.groupSelection = new react_1.Selection({
            getKey: g => g.index,
            onSelectionChanged: () => {
                let groups = this.groupSelection.getSelectedCount()
                    ? this.groupSelection.getSelection()
                    : [];
                this.setState({
                    selectedGroups: groups,
                    editGroupName: groups.length === 1 && groups[0].isMultiple
                        ? groups[0].name
                        : "",
                });
            },
        });
        this.sourcesSelection = new react_1.Selection({
            getKey: s => s.sid,
            onSelectionChanged: () => {
                let sources = this.sourcesSelection.getSelectedCount()
                    ? this.sourcesSelection.getSelection()
                    : null;
                this.setState({
                    selectedSources: sources,
                });
            },
        });
    }
}
exports.default = GroupsTab;
