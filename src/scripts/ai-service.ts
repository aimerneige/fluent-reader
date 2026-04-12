import { AIConfig, AIProvider } from "../schema-types"
import { htmlToPlainText } from "./utils"

export interface ChatMessage {
    role: "system" | "user" | "assistant"
    content: string
}

export function getAIConfig(): AIConfig | null {
    return window.settings.getAIConfig()
}

export function isAIConfigured(): boolean {
    const config = getAIConfig()
    return config !== null && !!config.baseUrl && !!config.model
}

function getEndpointUrl(config: AIConfig): string {
    const base = config.baseUrl.replace(/\/+$/, "")
    switch (config.provider) {
        case AIProvider.Ollama:
            return base + "/api/chat"
        case AIProvider.OpenAI:
        case AIProvider.DeepSeek:
        default:
            return base + "/chat/completions"
    }
}

function buildRequestBody(
    config: AIConfig,
    messages: ChatMessage[],
    stream: boolean,
): object {
    return {
        model: config.model,
        messages: messages,
        stream: stream,
    }
}

function buildHeaders(config: AIConfig): Record<string, string> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (
        config.apiKey &&
        (config.provider === AIProvider.OpenAI ||
            config.provider === AIProvider.DeepSeek)
    ) {
        headers["Authorization"] = "Bearer " + config.apiKey
    }
    return headers
}

export function createArticleContextMessage(
    title: string,
    content: string,
    limit: number = 8000,
): ChatMessage {
    const plainText = htmlToPlainText(content).substring(0, limit)
    return {
        role: "system",
        content: `You are a helpful assistant discussing the following article.\n\nTitle: ${title}\n\nContent:\n${plainText}`,
    }
}

export function createSelectionContextMessage(
    selectedText: string,
): ChatMessage {
    return {
        role: "system",
        content: `You are a helpful assistant. The user has selected the following text and wants to ask questions about it.\n\nSelected text:\n${selectedText}`,
    }
}

export async function sendChatMessageStreaming(
    messages: ChatMessage[],
    onChunk: (text: string) => void,
    onError: (error: string) => void,
    onComplete: () => void,
    signal?: AbortSignal,
): Promise<void> {
    const config = getAIConfig()
    if (!config) {
        onError("AI is not configured")
        return
    }

    const url = getEndpointUrl(config)
    const body = buildRequestBody(config, messages, true)
    const headers = buildHeaders(config)

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body),
            signal: signal,
        })

        if (!response.ok) {
            const errorText = await response.text()
            onError(`HTTP ${response.status}: ${errorText}`)
            return
        }

        const reader = response.body?.getReader()
        if (!reader) {
            onError("No response body")
            return
        }

        const decoder = new TextDecoder()
        let buffer = ""
        const isOllama = config.provider === AIProvider.Ollama

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() || ""

            for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed) continue

                if (isOllama) {
                    // Ollama returns newline-delimited JSON (no "data:" prefix)
                    try {
                        const json = JSON.parse(trimmed)
                        const content = json.message?.content
                        if (content) onChunk(content)
                    } catch {
                        // skip malformed lines
                    }
                } else {
                    // OpenAI / DeepSeek use SSE format: "data: {...}"
                    if (!trimmed.startsWith("data:")) continue
                    const data = trimmed.slice(5).trim()
                    if (data === "[DONE]") continue
                    try {
                        const json = JSON.parse(data)
                        const content = json.choices?.[0]?.delta?.content
                        if (content) onChunk(content)
                    } catch {
                        // skip malformed JSON lines
                    }
                }
            }
        }

        // process remaining buffer
        if (buffer.trim()) {
            const trimmed = buffer.trim()
            if (isOllama) {
                try {
                    const json = JSON.parse(trimmed)
                    const content = json.message?.content
                    if (content) onChunk(content)
                } catch {
                    // skip
                }
            } else if (trimmed.startsWith("data:")) {
                const data = trimmed.slice(5).trim()
                if (data !== "[DONE]") {
                    try {
                        const json = JSON.parse(data)
                        const content = json.choices?.[0]?.delta?.content
                        if (content) onChunk(content)
                    } catch {
                        // skip
                    }
                }
            }
        }

        onComplete()
    } catch (err) {
        if (signal?.aborted) return
        onError(err instanceof Error ? err.message : String(err))
    }
}
