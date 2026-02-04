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
    onClose: () => void
}

type AIPanelState = {
    messages: AIMessage[]
    input: string
    loading: boolean
    error: string | null
}

class AIPanel extends React.Component<AIPanelProps, AIPanelState> {
    messagesEndRef: React.RefObject<HTMLDivElement>

    constructor(props: AIPanelProps) {
        super(props)
        this.state = {
            messages: [],
            input: "",
            loading: false,
            error: null,
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
                })
            },
            () => {
                this.setState({ loading: false })
            }
        )
    }

    handlePresetPrompt = (prompt: string) => {
        this.sendMessage(prompt)
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
                            iconProps={{ iconName: "Cancel" }}
                            onClick={this.props.onClose}
                            title={intl.get("close")}
                        />
                    </Stack.Item>
                </Stack>

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
                        <PrimaryButton
                            text={intl.get("ai.send")}
                            onClick={() => this.sendMessage()}
                            disabled={
                                !this.state.input.trim() || this.state.loading
                            }
                        />
                    </Stack.Item>
                </Stack>
            </div>
        )
    }
}

export default AIPanel
