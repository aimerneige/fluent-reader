import { AIConfig, AIProvider } from "../schema-types"

export interface ChatMessage {
    role: "system" | "user" | "assistant"
    content: string
}

export interface AIResponse {
    content: string
    error?: string
}

/**
 * Get the AI configuration from settings.
 */
export function getAIConfig(): AIConfig | null {
    return window.settings.getAIConfig()
}

/**
 * Check if AI is configured properly.
 */
export function isAIConfigured(): boolean {
    const config = getAIConfig()
    if (!config) return false
    if (!config.baseUrl || !config.model) return false
    if (
        (config.provider === AIProvider.OpenAI ||
            config.provider === AIProvider.DeepSeek) &&
        !config.apiKey
    )
        return false
    return true
}

/**
 * Build the API endpoint URL based on provider.
 */
function getEndpointUrl(config: AIConfig): string {
    const baseUrl = config.baseUrl.replace(/\/$/, "")
    if (config.provider === AIProvider.Ollama) {
        return `${baseUrl}/api/chat`
    }
    // OpenAI-compatible endpoint (OpenAI & DeepSeek)
    return `${baseUrl}/chat/completions`
}

/**
 * Build request body for the chat API.
 */
function buildRequestBody(
    config: AIConfig,
    messages: ChatMessage[],
    stream: boolean
): object {
    if (config.provider === AIProvider.Ollama) {
        return {
            model: config.model,
            messages: messages,
            stream: stream,
        }
    }
    // OpenAI-compatible format (OpenAI & DeepSeek)
    return {
        model: config.model,
        messages: messages,
        stream: stream,
    }
}

/**
 * Build request headers.
 */
function buildHeaders(config: AIConfig): HeadersInit {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    }
    if (
        (config.provider === AIProvider.OpenAI ||
            config.provider === AIProvider.DeepSeek) &&
        config.apiKey
    ) {
        headers["Authorization"] = `Bearer ${config.apiKey}`
    }
    return headers
}

/**
 * Send a chat message to the AI and get a response.
 * This is a non-streaming version for simplicity.
 */
export async function sendChatMessage(
    messages: ChatMessage[]
): Promise<AIResponse> {
    const config = getAIConfig()
    if (!config) {
        return { content: "", error: "AI not configured" }
    }

    const url = getEndpointUrl(config)
    const headers = buildHeaders(config)
    const body = buildRequestBody(config, messages, false)

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const errorText = await response.text()
            return {
                content: "",
                error: `API error: ${response.status} - ${errorText}`,
            }
        }

        const data = await response.json()

        // Parse response based on provider
        if (config.provider === AIProvider.Ollama) {
            return {
                content:
                    data.message?.content || data.response || "No response",
            }
        }

        // OpenAI-compatible format (OpenAI & DeepSeek)
        return {
            content: data.choices?.[0]?.message?.content || "No response",
        }
    } catch (error) {
        return {
            content: "",
            error: `Request failed: ${error instanceof Error ? error.message : String(error)}`,
        }
    }
}

/**
 * Send a chat message with streaming support.
 * Calls onChunk for each received chunk.
 */
export async function sendChatMessageStreaming(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    onError: (error: string) => void,
    onComplete: () => void
): Promise<void> {
    const config = getAIConfig()
    if (!config) {
        onError("AI not configured")
        return
    }

    const url = getEndpointUrl(config)
    const headers = buildHeaders(config)
    const body = buildRequestBody(config, messages, true)

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const errorText = await response.text()
            onError(`API error: ${response.status} - ${errorText}`)
            return
        }

        const reader = response.body?.getReader()
        if (!reader) {
            onError("No response body")
            return
        }

        const decoder = new TextDecoder()

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split("\n").filter(line => line.trim())

            for (const line of lines) {
                // Handle SSE format (OpenAI)
                if (line.startsWith("data: ")) {
                    const data = line.slice(6)
                    if (data === "[DONE]") continue

                    try {
                        const parsed = JSON.parse(data)
                        const content = parsed.choices?.[0]?.delta?.content
                        if (content) onChunk(content)
                    } catch {
                        // Not JSON, skip
                    }
                } else {
                    // Handle Ollama format (JSON per line)
                    try {
                        const parsed = JSON.parse(line)
                        if (parsed.message?.content) {
                            onChunk(parsed.message.content)
                        }
                        if (parsed.done) {
                            onComplete()
                            return
                        }
                    } catch {
                        // Not JSON, skip
                    }
                }
            }
        }

        onComplete()
    } catch (error) {
        onError(
            `Request failed: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

/**
 * Create a system message with article context.
 */
export function createArticleContextMessage(
    articleTitle: string,
    articleContent: string
): ChatMessage {
    return {
        role: "system",
        content: `You are a helpful AI assistant. The user is reading an article titled "${articleTitle}". Here is the article content:\n\n${articleContent}\n\nAnswer questions about this article or help the user understand it better.`,
    }
}
