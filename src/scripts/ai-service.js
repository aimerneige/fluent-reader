"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIConfig = getAIConfig;
exports.isAIConfigured = isAIConfigured;
exports.createArticleContextMessage = createArticleContextMessage;
exports.createSelectionContextMessage = createSelectionContextMessage;
exports.sendChatMessageStreaming = sendChatMessageStreaming;
function getAIConfig() {
    return window.settings.getAIConfig();
}
function isAIConfigured() {
    const config = getAIConfig();
    return config !== null && !!config.baseUrl && !!config.model;
}
function getEndpointUrl(config) {
    const base = config.baseUrl.replace(/\/+$/, "");
    switch (config.provider) {
        case 1 /* AIProvider.Ollama */:
            return base + "/api/chat";
        case 0 /* AIProvider.OpenAI */:
        case 2 /* AIProvider.DeepSeek */:
        default:
            return base + "/chat/completions";
    }
}
function buildRequestBody(config, messages, stream) {
    return {
        model: config.model,
        messages: messages,
        stream: stream,
    };
}
function buildHeaders(config) {
    const headers = {
        "Content-Type": "application/json",
    };
    if (config.apiKey &&
        (config.provider === 0 /* AIProvider.OpenAI */ ||
            config.provider === 2 /* AIProvider.DeepSeek */)) {
        headers["Authorization"] = "Bearer " + config.apiKey;
    }
    return headers;
}
function createArticleContextMessage(title, content) {
    const plainText = content.replace(/<[^>]*>/g, "").substring(0, 4000);
    return {
        role: "system",
        content: `You are a helpful assistant discussing the following article.\n\nTitle: ${title}\n\nContent:\n${plainText}`,
    };
}
function createSelectionContextMessage(selectedText) {
    return {
        role: "system",
        content: `You are a helpful assistant. The user has selected the following text and wants to ask questions about it.\n\nSelected text:\n${selectedText}`,
    };
}
async function sendChatMessageStreaming(messages, onChunk, onError, onComplete, signal) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const config = getAIConfig();
    if (!config) {
        onError("AI is not configured");
        return;
    }
    const url = getEndpointUrl(config);
    const body = buildRequestBody(config, messages, true);
    const headers = buildHeaders(config);
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body),
            signal: signal,
        });
        if (!response.ok) {
            const errorText = await response.text();
            onError(`HTTP ${response.status}: ${errorText}`);
            return;
        }
        const reader = (_a = response.body) === null || _a === void 0 ? void 0 : _a.getReader();
        if (!reader) {
            onError("No response body");
            return;
        }
        const decoder = new TextDecoder();
        let buffer = "";
        const isOllama = config.provider === 1 /* AIProvider.Ollama */;
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                if (isOllama) {
                    // Ollama returns newline-delimited JSON (no "data:" prefix)
                    try {
                        const json = JSON.parse(trimmed);
                        const content = (_b = json.message) === null || _b === void 0 ? void 0 : _b.content;
                        if (content)
                            onChunk(content);
                    }
                    catch {
                        // skip malformed lines
                    }
                }
                else {
                    // OpenAI / DeepSeek use SSE format: "data: {...}"
                    if (!trimmed.startsWith("data:"))
                        continue;
                    const data = trimmed.slice(5).trim();
                    if (data === "[DONE]")
                        continue;
                    try {
                        const json = JSON.parse(data);
                        const content = (_e = (_d = (_c = json.choices) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.delta) === null || _e === void 0 ? void 0 : _e.content;
                        if (content)
                            onChunk(content);
                    }
                    catch {
                        // skip malformed JSON lines
                    }
                }
            }
        }
        // process remaining buffer
        if (buffer.trim()) {
            const trimmed = buffer.trim();
            if (isOllama) {
                try {
                    const json = JSON.parse(trimmed);
                    const content = (_f = json.message) === null || _f === void 0 ? void 0 : _f.content;
                    if (content)
                        onChunk(content);
                }
                catch {
                    // skip
                }
            }
            else if (trimmed.startsWith("data:")) {
                const data = trimmed.slice(5).trim();
                if (data !== "[DONE]") {
                    try {
                        const json = JSON.parse(data);
                        const content = (_j = (_h = (_g = json.choices) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.delta) === null || _j === void 0 ? void 0 : _j.content;
                        if (content)
                            onChunk(content);
                    }
                    catch {
                        // skip
                    }
                }
            }
        }
        onComplete();
    }
    catch (err) {
        if (signal === null || signal === void 0 ? void 0 : signal.aborted)
            return;
        onError(err instanceof Error ? err.message : String(err));
    }
}
