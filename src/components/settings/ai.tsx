import * as React from "react"
import intl from "react-intl-universal"
import { AIConfig, AIProvider, AIPrompt } from "../../schema-types"
import {
    Stack,
    Label,
    TextField,
    Dropdown,
    IDropdownOption,
    DefaultButton,
    PrimaryButton,
    IconButton,
    List,
} from "@fluentui/react"

type AITabState = {
    config: AIConfig
    newPromptName: string
    newPromptContent: string
}

const defaultConfig: AIConfig = {
    provider: AIProvider.OpenAI,
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-3.5-turbo",
    prompts: [],
}

class AITab extends React.Component<{}, AITabState> {
    constructor(props: {}) {
        super(props)
        const savedConfig = window.settings.getAIConfig()
        this.state = {
            config: savedConfig || defaultConfig,
            newPromptName: "",
            newPromptContent: "",
        }
    }

    providerOptions = (): IDropdownOption[] => [
        { key: AIProvider.OpenAI, text: intl.get("ai.openai") },
        { key: AIProvider.Ollama, text: intl.get("ai.ollama") },
    ]

    onProviderChange = (_: any, option: IDropdownOption) => {
        const provider = option.key as AIProvider
        let baseUrl = this.state.config.baseUrl
        let model = this.state.config.model

        // Set sensible defaults when switching providers
        if (provider === AIProvider.Ollama) {
            baseUrl = "http://localhost:11434"
            model = "llama3.2"
        } else if (provider === AIProvider.OpenAI) {
            baseUrl = "https://api.openai.com/v1"
            model = "gpt-3.5-turbo"
        }

        this.setState(
            {
                config: {
                    ...this.state.config,
                    provider,
                    baseUrl,
                    model,
                },
            },
            this.saveConfig
        )
    }

    onBaseUrlChange = (_: any, value: string) => {
        this.setState({
            config: { ...this.state.config, baseUrl: value.trim() },
        })
    }

    onApiKeyChange = (_: any, value: string) => {
        this.setState({
            config: { ...this.state.config, apiKey: value.trim() },
        })
    }

    onModelChange = (_: any, value: string) => {
        this.setState({
            config: { ...this.state.config, model: value.trim() },
        })
    }

    onBlur = () => {
        this.saveConfig()
    }

    saveConfig = () => {
        window.settings.setAIConfig(this.state.config)
    }

    onNewPromptNameChange = (_: any, value: string) => {
        this.setState({ newPromptName: value })
    }

    onNewPromptContentChange = (_: any, value: string) => {
        this.setState({ newPromptContent: value })
    }

    addPrompt = () => {
        if (this.state.newPromptName && this.state.newPromptContent) {
            const newPrompt: AIPrompt = {
                name: this.state.newPromptName.trim(),
                content: this.state.newPromptContent.trim(),
            }
            this.setState(
                {
                    config: {
                        ...this.state.config,
                        prompts: [...this.state.config.prompts, newPrompt],
                    },
                    newPromptName: "",
                    newPromptContent: "",
                },
                this.saveConfig
            )
        }
    }

    deletePrompt = (index: number) => {
        const prompts = [...this.state.config.prompts]
        prompts.splice(index, 1)
        this.setState(
            {
                config: { ...this.state.config, prompts },
            },
            this.saveConfig
        )
    }

    renderPrompt = (item: AIPrompt, index: number) => (
        <Stack
            horizontal
            verticalAlign="center"
            tokens={{ childrenGap: 8 }}
            styles={{ root: { marginBottom: 8 } }}
            key={index}>
            <Stack.Item grow>
                <span>
                    <strong>{item.name}</strong>: {item.content}
                </span>
            </Stack.Item>
            <Stack.Item>
                <IconButton
                    iconProps={{ iconName: "Delete" }}
                    title={intl.get("ai.deletePrompt")}
                    onClick={() => this.deletePrompt(index)}
                />
            </Stack.Item>
        </Stack>
    )

    render = () => (
        <div className="tab-body">
            <Label>{intl.get("ai.provider")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        selectedKey={this.state.config.provider}
                        options={this.providerOptions()}
                        onChange={this.onProviderChange}
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>

            <Label>{intl.get("ai.baseUrl")}</Label>
            <Stack horizontal>
                <Stack.Item grow>
                    <TextField
                        value={this.state.config.baseUrl}
                        onChange={this.onBaseUrlChange}
                        onBlur={this.onBlur}
                        placeholder="https://api.openai.com/v1"
                    />
                </Stack.Item>
            </Stack>

            {this.state.config.provider === AIProvider.OpenAI && (
                <>
                    <Label>{intl.get("ai.apiKey")}</Label>
                    <Stack horizontal>
                        <Stack.Item grow>
                            <TextField
                                type="password"
                                value={this.state.config.apiKey}
                                onChange={this.onApiKeyChange}
                                onBlur={this.onBlur}
                                placeholder="sk-..."
                            />
                        </Stack.Item>
                    </Stack>
                </>
            )}

            <Label>{intl.get("ai.model")}</Label>
            <Stack horizontal>
                <Stack.Item grow>
                    <TextField
                        value={this.state.config.model}
                        onChange={this.onModelChange}
                        onBlur={this.onBlur}
                        placeholder={
                            this.state.config.provider === AIProvider.Ollama
                                ? "llama3.2"
                                : "gpt-3.5-turbo"
                        }
                    />
                </Stack.Item>
            </Stack>

            <Label>{intl.get("ai.prompts")}</Label>
            <div style={{ marginBottom: 12 }}>
                {this.state.config.prompts.map((prompt, index) =>
                    this.renderPrompt(prompt, index)
                )}
            </div>

            <Stack horizontal tokens={{ childrenGap: 8 }}>
                <Stack.Item>
                    <TextField
                        placeholder={intl.get("ai.promptName")}
                        value={this.state.newPromptName}
                        onChange={this.onNewPromptNameChange}
                        style={{ width: 150 }}
                    />
                </Stack.Item>
                <Stack.Item grow>
                    <TextField
                        placeholder={intl.get("ai.promptContent")}
                        value={this.state.newPromptContent}
                        onChange={this.onNewPromptContentChange}
                    />
                </Stack.Item>
                <Stack.Item>
                    <PrimaryButton
                        text={intl.get("ai.addPrompt")}
                        onClick={this.addPrompt}
                        disabled={
                            !this.state.newPromptName ||
                            !this.state.newPromptContent
                        }
                    />
                </Stack.Item>
            </Stack>
        </div>
    )
}

export default AITab
