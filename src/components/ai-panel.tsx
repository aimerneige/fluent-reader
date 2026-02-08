import * as React from "react"
import intl from "react-intl-universal"
import {
    Stack,
    TextField,
    PrimaryButton,
    DefaultButton,
    IconButton,
    Spinner,
    MessageBar,
    MessageBarType,
    IButtonStyles,
    Dialog,
    DialogType,
    DialogFooter,
} from "@fluentui/react"
import { AnimationClassNames } from "@fluentui/react/lib/Styling"
import {
    ChatMessage,
    sendChatMessageStreaming,
    isAIConfigured,
    getAIConfig,
    createArticleContextMessage,
} from "../scripts/ai-service"

type AIMessage = {
    role: "user" | "assistant"
    content: string
}

type AIPanelProps = {
    articleTitle: string
    articleContent: string
    history?: AIMessage[]
    onHistoryUpdate: (history: AIMessage[]) => void
    onClose: () => void
}

type AIPanelState = {
    messages: AIMessage[]
    input: string
    loading: boolean
    error: string | null
    abortController: AbortController | null
    showClearDialog: boolean
}

class AIPanel extends React.Component<AIPanelProps, AIPanelState> {
    messagesEndRef: React.RefObject<HTMLDivElement>

    constructor(props: AIPanelProps) {
        super(props)
        this.state = {
            messages: props.history || [],
            input: "",
            loading: false,
            error: null,
            abortController: null,
            showClearDialog: false,
        }
        this.messagesEndRef = React.createRef()
    }

    scrollToBottom = () => {
        this.messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    componentDidUpdate(_prevProps: AIPanelProps, prevState: AIPanelState) {
        if (prevState.messages.length !== this.state.messages.length) {
            this.scrollToBottom()
        }
    }

    onInputChange = (_: any, value: string) => {
        this.setState({ input: value })
    }

    onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            this.sendMessage()
        }
    }

    sendMessage = (customPrompt?: string) => {
        const messageText = customPrompt || this.state.input.trim()
        if (!messageText || this.state.loading) return

        if (!isAIConfigured()) {
            this.setState({ error: intl.get("ai.noConfig") })
            return
        }

        const userMessage: AIMessage = { role: "user", content: messageText }
        this.setState(
            {
                messages: [...this.state.messages, userMessage],
                input: "",
                loading: true,
                error: null,
            },
            () => {
                this.scrollToBottom()
                this.props.onHistoryUpdate(this.state.messages)
                this.streamResponse()
            }
        )
    }

    streamResponse = () => {
        // Build messages for API
        const contextMessage = createArticleContextMessage(
            this.props.articleTitle,
            this.props.articleContent
        )

        const chatMessages: ChatMessage[] = [
            contextMessage,
            ...this.state.messages.map(m => ({
                role: m.role as "user" | "assistant",
                content: m.content,
            })),
        ]

        // Add placeholder for assistant response
        this.setState({
            messages: [
                ...this.state.messages,
                { role: "assistant", content: "" },
            ],
        })

        // Create AbortController for cancellation
        const abortController = new AbortController()
        this.setState({ abortController })

        sendChatMessageStreaming(
            chatMessages,
            chunk => {
                // Update the last message with new chunk
                this.setState(state => {
                    const messages = [...state.messages]
                    const lastMessage = messages[messages.length - 1]
                    if (lastMessage.role === "assistant") {
                        lastMessage.content += chunk
                    }
                    return { messages }
                })
            },
            error => {
                this.setState({
                    loading: false,
                    error: error,
                    abortController: null,
                })
            },
            () => {
                this.setState({ loading: false, abortController: null })
                this.props.onHistoryUpdate(this.state.messages)
            },
            abortController.signal
        )
    }

    stopGeneration = () => {
        if (this.state.abortController) {
            this.state.abortController.abort()
            this.setState({
                loading: false,
                abortController: null,
            })
        }
    }

    handlePresetPrompt = (prompt: string) => {
        this.sendMessage(prompt)
    }

    clearHistory = () => {
        if (this.state.loading || this.state.messages.length === 0) return
        this.setState({ showClearDialog: true })
    }

    confirmClear = () => {
        this.setState({ messages: [], showClearDialog: false }, () => {
            this.props.onHistoryUpdate([])
        })
    }

    renderMessage = (message: AIMessage, index: number) => (
        <div
            key={index}
            className={`ai-message ai-message-${message.role}`}
            style={{
                padding: "8px 12px",
                marginBottom: 8,
                borderRadius: 8,
                backgroundColor:
                    message.role === "user"
                        ? "var(--neutralLight)"
                        : "var(--neutralLighter)",
                alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%",
            }}>
            <span style={{ whiteSpace: "pre-wrap" }}>{message.content}</span>
            {message.role === "assistant" &&
                message.content === "" &&
                this.state.loading && (
                    <Spinner size={1} label={intl.get("ai.thinking")} />
                )}
        </div>
    )

    render = () => {
        const config = getAIConfig()
        const presetPrompts = config?.prompts || []

        return (
            <div
                className={`ai-panel ${AnimationClassNames.slideRightIn20}`}
                style={{
                    position: "absolute",
                    right: 0,
                    top: 36,
                    bottom: 0,
                    width: 360,
                    backgroundColor: "var(--white)",
                    borderLeft: "1px solid var(--neutralLight)",
                    display: "flex",
                    flexDirection: "column",
                    zIndex: 100,
                    boxShadow: "-5px 0 20px rgba(0,0,0,0.15)",
                }}>
                {/* Header */}
                <Stack
                    horizontal
                    verticalAlign="center"
                    style={{
                        padding: "8px 12px",
                        borderBottom: "1px solid var(--neutralLight)",
                    }}>
                    <Stack.Item grow>
                        <span style={{ fontWeight: 600 }}>
                            {intl.get("ai.askAI")}
                        </span>
                    </Stack.Item>
                    <Stack.Item>
                        <IconButton
                            iconProps={{ iconName: "Delete" }}
                            onClick={this.clearHistory}
                            title={intl.get("ai.clearHistory")}
                            disabled={this.state.loading || this.state.messages.length === 0}
                        />
                        <IconButton
                            iconProps={{ iconName: "Cancel" }}
                            onClick={this.props.onClose}
                            title={intl.get("close")}
                        />
                    </Stack.Item>
                </Stack>

                <Dialog
                    hidden={!this.state.showClearDialog}
                    onDismiss={() => this.setState({ showClearDialog: false })}
                    dialogContentProps={{
                        type: DialogType.normal,
                        title: intl.get("ai.confirmClearHistory"),
                        subText: intl.get("ai.confirmClearHistorySubtitle"),
                    }}
                    modalProps={{ isBlocking: true }}>
                    <DialogFooter>
                        <PrimaryButton
                            onClick={this.confirmClear}
                            text={intl.get("confirm")}
                        />
                        <DefaultButton
                            onClick={() => this.setState({ showClearDialog: false })}
                            text={intl.get("cancel")}
                        />
                    </DialogFooter>
                </Dialog>

                {/* Preset prompts */}
                {presetPrompts.length > 0 && (
                    <Stack
                        horizontal
                        wrap
                        tokens={{ childrenGap: 4 }}
                        style={{ padding: "8px 12px" }}>
                        {presetPrompts.map((prompt, index) => (
                            <DefaultButton
                                key={index}
                                text={prompt.name}
                                onClick={() =>
                                    this.handlePresetPrompt(prompt.content)
                                }
                                disabled={this.state.loading}
                                styles={{
                                    root: {
                                        minWidth: "auto",
                                        padding: "0 8px",
                                        height: 28,
                                    },
                                }}
                            />
                        ))}
                    </Stack>
                )}

                {/* Error message */}
                {this.state.error && (
                    <MessageBar
                        messageBarType={MessageBarType.error}
                        onDismiss={() => this.setState({ error: null })}>
                        {this.state.error}
                    </MessageBar>
                )}

                {/* Messages */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: 12,
                        display: "flex",
                        flexDirection: "column",
                    }}>
                    {this.state.messages.length === 0 && (
                        <div
                            style={{
                                color: "var(--neutralTertiary)",
                                textAlign: "center",
                                marginTop: 20,
                            }}>
                            {intl.get("ai.inputPlaceholder")}
                        </div>
                    )}
                    {this.state.messages.map((msg, idx) =>
                        this.renderMessage(msg, idx)
                    )}
                    <div ref={this.messagesEndRef} />
                </div>

                {/* Input */}
                <Stack
                    horizontal
                    tokens={{ childrenGap: 8 }}
                    style={{
                        padding: 12,
                        borderTop: "1px solid var(--neutralLight)",
                    }}>
                    <Stack.Item grow>
                        <TextField
                            placeholder={intl.get("ai.inputPlaceholder")}
                            value={this.state.input}
                            onChange={this.onInputChange}
                            onKeyDown={this.onKeyDown}
                            disabled={this.state.loading}
                            multiline
                            autoAdjustHeight
                            styles={{ root: { minHeight: 32 } }}
                        />
                    </Stack.Item>
                    <Stack.Item>
                        {this.state.loading ? (
                            <PrimaryButton
                                text={intl.get("ai.stop")}
                                onClick={this.stopGeneration}
                                styles={{
                                    root: {
                                        backgroundColor: "#d32f2f",
                                        borderColor: "#d32f2f",
                                    },
                                    rootHovered: {
                                        backgroundColor: "#b71c1c",
                                        borderColor: "#b71c1c",
                                    },
                                    rootPressed: {
                                        backgroundColor: "#c62828",
                                        borderColor: "#c62828",
                                    },
                                } as IButtonStyles}
                            />
                        ) : (
                            <PrimaryButton
                                text={intl.get("ai.send")}
                                onClick={() => this.sendMessage()}
                                disabled={!this.state.input.trim()}
                            />
                        )}
                    </Stack.Item>
                </Stack>
            </div>
        )
    }
}

export default AIPanel
