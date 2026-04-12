import * as React from "react"
import intl from "react-intl-universal"
import {
    Stack,
    Label,
    Dropdown,
    TextField,
    PrimaryButton,
    DefaultButton,
    IconButton,
    Toggle,
    IDropdownOption,
} from "@fluentui/react"
import { AIProvider, AIConfig, AIPrompt } from "../../schema-types"

const DEEPSEEK_MODELS = ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"]

const providerOptions: IDropdownOption[] = [
    { key: AIProvider.OpenAI, text: "OpenAI" },
    { key: AIProvider.Ollama, text: "Ollama" },
    { key: AIProvider.DeepSeek, text: "DeepSeek" },
]

function getDefaultBaseUrl(provider: AIProvider): string {
    switch (provider) {
        case AIProvider.Ollama:
            return "http://localhost:11434"
        case AIProvider.DeepSeek:
            return "https://api.deepseek.com"
        case AIProvider.OpenAI:
        default:
            return "https://api.openai.com/v1"
    }
}

function defaultConfig(): AIConfig {
    return {
        provider: AIProvider.OpenAI,
        baseUrl: getDefaultBaseUrl(AIProvider.OpenAI),
        apiKey: "",
        model: "",
        prompts: [],
        showBuiltinPrompts: true,
    }
}

const AITab: React.FC = () => {
    const [config, setConfig] = React.useState<AIConfig>(() => {
        return window.settings.getAIConfig() || defaultConfig()
    })
    const [newPromptName, setNewPromptName] = React.useState("")
    const [newPromptContent, setNewPromptContent] = React.useState("")

    const saveConfig = (updated: AIConfig) => {
        setConfig(updated)
        window.settings.setAIConfig(updated)
    }

    const handleProviderChange = (
        _: React.FormEvent,
        option: IDropdownOption,
    ) => {
        const provider = option.key as AIProvider
        saveConfig({
            ...config,
            provider,
            baseUrl: getDefaultBaseUrl(provider),
            model: provider === AIProvider.DeepSeek ? DEEPSEEK_MODELS[0] : "",
        })
    }

    const handleBaseUrlChange = (_: React.FormEvent, value: string) => {
        saveConfig({ ...config, baseUrl: value })
    }

    const handleApiKeyChange = (_: React.FormEvent, value: string) => {
        saveConfig({ ...config, apiKey: value })
    }

    const handleModelChange = (
        _: React.FormEvent,
        value: string | IDropdownOption,
    ) => {
        const model = typeof value === "string" ? value : (value.key as string)
        saveConfig({ ...config, model })
    }

    const handleAddPrompt = () => {
        const name = newPromptName.trim()
        const content = newPromptContent.trim()
        if (!name || !content) return
        const prompt: AIPrompt = { name, content }
        saveConfig({ ...config, prompts: [...config.prompts, prompt] })
        setNewPromptName("")
        setNewPromptContent("")
    }

    const handleDeletePrompt = (index: number) => {
        const prompts = config.prompts.filter((_, i) => i !== index)
        saveConfig({ ...config, prompts })
    }

    const showApiKey =
        config.provider === AIProvider.OpenAI ||
        config.provider === AIProvider.DeepSeek

    return (
        <div className="tab-body">
            <Label>{intl.get("ai.provider")}</Label>
            <Stack tokens={{ childrenGap: 12 }}>
                <Dropdown
                    options={providerOptions}
                    selectedKey={config.provider}
                    onChange={handleProviderChange}
                    styles={{ root: { maxWidth: 300 } }}
                />

                <TextField
                    label={intl.get("ai.baseUrl")}
                    value={config.baseUrl}
                    onChange={handleBaseUrlChange}
                    styles={{ root: { maxWidth: 400 } }}
                />

                {showApiKey && (
                    <TextField
                        label={intl.get("ai.apiKey")}
                        value={config.apiKey}
                        onChange={handleApiKeyChange}
                        type="password"
                        styles={{ root: { maxWidth: 400 } }}
                    />
                )}

                {config.provider === AIProvider.DeepSeek ? (
                    <Dropdown
                        label={intl.get("ai.model")}
                        options={DEEPSEEK_MODELS.map(m => ({
                            key: m,
                            text: m,
                        }))}
                        selectedKey={config.model}
                        onChange={(_, opt) => handleModelChange(_, opt)}
                        styles={{ root: { maxWidth: 300 } }}
                    />
                ) : (
                    <TextField
                        label={intl.get("ai.model")}
                        value={config.model}
                        onChange={(e, v) => handleModelChange(e, v)}
                        placeholder={
                            config.provider === AIProvider.Ollama
                                ? "llama3"
                                : "gpt-4o-mini"
                        }
                        styles={{ root: { maxWidth: 300 } }}
                    />
                )}
            </Stack>

            <TextField
                label={intl.get("ai.contentLimit")}
                description={intl.get("ai.contentLimitHint")}
                value={String(config.contentLimit || 8000)}
                onChange={(_, value) => {
                    const num = parseInt(value, 10)
                    if (!isNaN(num) && num >= 1000 && num <= 100000) {
                        saveConfig({ ...config, contentLimit: num })
                    } else if (value === "") {
                        saveConfig({ ...config, contentLimit: undefined })
                    }
                }}
                styles={{ root: { maxWidth: 300, marginTop: 12 } }}
            />

            <Toggle
                label={intl.get("ai.showBuiltinPrompts")}
                checked={config.showBuiltinPrompts !== false}
                onChange={(_, checked) =>
                    saveConfig({ ...config, showBuiltinPrompts: checked })
                }
                styles={{ root: { marginTop: 20 } }}
            />

            <Label style={{ marginTop: 20 }}>{intl.get("ai.prompts")}</Label>
            <Stack tokens={{ childrenGap: 8 }}>
                {config.prompts.map((prompt, idx) => (
                    <Stack
                        key={idx}
                        horizontal
                        verticalAlign="center"
                        tokens={{ childrenGap: 8 }}
                    >
                        <span
                            style={{
                                fontWeight: 600,
                                minWidth: 80,
                                color: "var(--neutralPrimary)",
                            }}
                        >
                            {prompt.name}
                        </span>
                        <span
                            className="settings-hint"
                            style={{
                                flex: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {prompt.content}
                        </span>
                        <IconButton
                            iconProps={{ iconName: "Delete" }}
                            title={intl.get("ai.deletePrompt")}
                            onClick={() => handleDeletePrompt(idx)}
                        />
                    </Stack>
                ))}
                <Stack horizontal tokens={{ childrenGap: 8 }}>
                    <TextField
                        placeholder={intl.get("ai.promptName")}
                        value={newPromptName}
                        onChange={(_, v) => setNewPromptName(v)}
                        styles={{ root: { width: 120 } }}
                    />
                    <TextField
                        placeholder={intl.get("ai.promptContent")}
                        value={newPromptContent}
                        onChange={(_, v) => setNewPromptContent(v)}
                        styles={{ root: { flex: 1 } }}
                    />
                    <PrimaryButton
                        text={intl.get("ai.addPrompt")}
                        onClick={handleAddPrompt}
                        disabled={
                            !newPromptName.trim() || !newPromptContent.trim()
                        }
                    />
                </Stack>
            </Stack>
        </div>
    )
}

export default AITab
