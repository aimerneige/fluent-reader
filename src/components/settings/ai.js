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
const react_1 = require("@fluentui/react");
const DEEPSEEK_MODELS = ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"];
const providerOptions = [
    { key: 0 /* AIProvider.OpenAI */, text: "OpenAI" },
    { key: 1 /* AIProvider.Ollama */, text: "Ollama" },
    { key: 2 /* AIProvider.DeepSeek */, text: "DeepSeek" },
];
function getDefaultBaseUrl(provider) {
    switch (provider) {
        case 1 /* AIProvider.Ollama */:
            return "http://localhost:11434";
        case 2 /* AIProvider.DeepSeek */:
            return "https://api.deepseek.com";
        case 0 /* AIProvider.OpenAI */:
        default:
            return "https://api.openai.com/v1";
    }
}
function defaultConfig() {
    return {
        provider: 0 /* AIProvider.OpenAI */,
        baseUrl: getDefaultBaseUrl(0 /* AIProvider.OpenAI */),
        apiKey: "",
        model: "",
        prompts: [],
        showBuiltinPrompts: true,
    };
}
const AITab = () => {
    const [config, setConfig] = React.useState(() => {
        return window.settings.getAIConfig() || defaultConfig();
    });
    const [newPromptName, setNewPromptName] = React.useState("");
    const [newPromptContent, setNewPromptContent] = React.useState("");
    const saveConfig = (updated) => {
        setConfig(updated);
        window.settings.setAIConfig(updated);
    };
    const handleProviderChange = (_, option) => {
        const provider = option.key;
        saveConfig({
            ...config,
            provider,
            baseUrl: getDefaultBaseUrl(provider),
            model: provider === 2 /* AIProvider.DeepSeek */ ? DEEPSEEK_MODELS[0] : "",
        });
    };
    const handleBaseUrlChange = (_, value) => {
        saveConfig({ ...config, baseUrl: value });
    };
    const handleApiKeyChange = (_, value) => {
        saveConfig({ ...config, apiKey: value });
    };
    const handleModelChange = (_, value) => {
        const model = typeof value === "string" ? value : value.key;
        saveConfig({ ...config, model });
    };
    const handleAddPrompt = () => {
        const name = newPromptName.trim();
        const content = newPromptContent.trim();
        if (!name || !content)
            return;
        const prompt = { name, content };
        saveConfig({ ...config, prompts: [...config.prompts, prompt] });
        setNewPromptName("");
        setNewPromptContent("");
    };
    const handleDeletePrompt = (index) => {
        const prompts = config.prompts.filter((_, i) => i !== index);
        saveConfig({ ...config, prompts });
    };
    const showApiKey = config.provider === 0 /* AIProvider.OpenAI */ ||
        config.provider === 2 /* AIProvider.DeepSeek */;
    return (React.createElement("div", { className: "tab-body" },
        React.createElement(react_1.Label, null, react_intl_universal_1.default.get("ai.provider")),
        React.createElement(react_1.Stack, { tokens: { childrenGap: 12 } },
            React.createElement(react_1.Dropdown, { options: providerOptions, selectedKey: config.provider, onChange: handleProviderChange, styles: { root: { maxWidth: 300 } } }),
            React.createElement(react_1.TextField, { label: react_intl_universal_1.default.get("ai.baseUrl"), value: config.baseUrl, onChange: handleBaseUrlChange, styles: { root: { maxWidth: 400 } } }),
            showApiKey && (React.createElement(react_1.TextField, { label: react_intl_universal_1.default.get("ai.apiKey"), value: config.apiKey, onChange: handleApiKeyChange, type: "password", styles: { root: { maxWidth: 400 } } })),
            config.provider === 2 /* AIProvider.DeepSeek */ ? (React.createElement(react_1.Dropdown, { label: react_intl_universal_1.default.get("ai.model"), options: DEEPSEEK_MODELS.map(m => ({
                    key: m,
                    text: m,
                })), selectedKey: config.model, onChange: (_, opt) => handleModelChange(_, opt), styles: { root: { maxWidth: 300 } } })) : (React.createElement(react_1.TextField, { label: react_intl_universal_1.default.get("ai.model"), value: config.model, onChange: (e, v) => handleModelChange(e, v), placeholder: config.provider === 1 /* AIProvider.Ollama */
                    ? "llama3"
                    : "gpt-4o-mini", styles: { root: { maxWidth: 300 } } }))),
        React.createElement(react_1.Toggle, { label: react_intl_universal_1.default.get("ai.showBuiltinPrompts"), checked: config.showBuiltinPrompts !== false, onChange: (_, checked) => saveConfig({ ...config, showBuiltinPrompts: checked }), styles: { root: { marginTop: 20 } } }),
        React.createElement(react_1.Label, { style: { marginTop: 20 } }, react_intl_universal_1.default.get("ai.prompts")),
        React.createElement(react_1.Stack, { tokens: { childrenGap: 8 } },
            config.prompts.map((prompt, idx) => (React.createElement(react_1.Stack, { key: idx, horizontal: true, verticalAlign: "center", tokens: { childrenGap: 8 } },
                React.createElement("span", { style: {
                        fontWeight: 600,
                        minWidth: 80,
                        color: "var(--neutralPrimary)",
                    } }, prompt.name),
                React.createElement("span", { className: "settings-hint", style: {
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    } }, prompt.content),
                React.createElement(react_1.IconButton, { iconProps: { iconName: "Delete" }, title: react_intl_universal_1.default.get("ai.deletePrompt"), onClick: () => handleDeletePrompt(idx) })))),
            React.createElement(react_1.Stack, { horizontal: true, tokens: { childrenGap: 8 } },
                React.createElement(react_1.TextField, { placeholder: react_intl_universal_1.default.get("ai.promptName"), value: newPromptName, onChange: (_, v) => setNewPromptName(v), styles: { root: { width: 120 } } }),
                React.createElement(react_1.TextField, { placeholder: react_intl_universal_1.default.get("ai.promptContent"), value: newPromptContent, onChange: (_, v) => setNewPromptContent(v), styles: { root: { flex: 1 } } }),
                React.createElement(react_1.PrimaryButton, { text: react_intl_universal_1.default.get("ai.addPrompt"), onClick: handleAddPrompt, disabled: !newPromptName.trim() || !newPromptContent.trim() })))));
};
exports.default = AITab;
