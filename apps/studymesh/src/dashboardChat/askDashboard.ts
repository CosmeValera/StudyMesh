import {
  callLocalLanguageModel,
  readStudyPackAiSettings,
  resolveStudyPackAiCredentials,
} from '../studyPack/ai'
import { DashboardSourceChunk } from './contextBuilder'

interface AskDashboardOptions {
  dashboardTitle: string
  contextText: string
  question: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  sourceChunks: DashboardSourceChunk[]
}

export interface AskDashboardResult {
  answer: string
  sources: string[]
}

const GEMINI_REQUEST_TIMEOUT_MS = 45000

const buildPrompt = ({
  dashboardTitle,
  contextText,
  question,
  history,
}: AskDashboardOptions) => `You are StudyMesh's dashboard assistant. Help the student understand the current dashboard.

Rules:
- Answer using only the provided dashboard sources and study material when possible.
- If the answer is not supported by the provided context, say that the dashboard sources do not contain enough information.
- Do not invent facts, citations, links, or source names.
- Be concise, clear, student-friendly, and practical.
- Use bullets, examples, and study tips when helpful.

Dashboard title: ${dashboardTitle}

Dashboard/source context:
${contextText}

Recent chat:
${history
  .slice(-6)
  .map(
    (message) =>
      `${message.role === 'user' ? 'Student' : 'Assistant'}: ${message.content}`,
  )
  .join('\n')}

Student question: ${question}

Answer:`

const callGeminiText = async (
  apiToken: string,
  model: string,
  prompt: string,
): Promise<string> => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    GEMINI_REQUEST_TIMEOUT_MS,
  )

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiToken,
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'text/plain',
          },
        }),
      },
    )

    const payload = await response.json()
    if (!response.ok) {
      throw new Error(payload?.error?.message || 'Gemini request failed.')
    }

    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || '')
      .join('')
      .trim()

    if (!text) {
      throw new Error('Gemini returned an empty answer.')
    }

    return text
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(
        'The AI request timed out. Try a shorter question or fewer sources.',
      )
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }
}

const basicAnswer = ({
  question,
  sourceChunks,
}: AskDashboardOptions): string => {
  const snippets = sourceChunks
    .slice(0, 3)
    .map((chunk) => `- ${chunk.title}: ${chunk.text.slice(0, 420).trim()}`)
    .join('\n')

  return `I can answer from the dashboard sources, but Basic mode does not call an external AI model.\n\nMost relevant source notes for “${question}”:\n${snippets}\n\nSwitch to Gemini or Local AI in StudyMesh settings for a synthesized chat answer.`
}

export const askDashboardSources = async (
  options: AskDashboardOptions,
): Promise<AskDashboardResult> => {
  const settings = readStudyPackAiSettings()
  const provider = settings.provider || 'basic'
  const prompt = buildPrompt(options)
  let answer: string

  if (provider === 'hosted') {
    throw new Error(
      'Hosted AI is not configured yet. Choose Basic, Local AI, or Gemini in settings.',
    )
  }

  if (provider === 'local') {
    answer = await callLocalLanguageModel(prompt, {
      promptType: 'notes',
      stepLabel: 'Ask dashboard sources',
    })
  } else if (provider === 'gemini') {
    const credentials = resolveStudyPackAiCredentials()
    if (!credentials.apiToken) {
      throw new Error('Own Gemini API token mode needs a configured API key.')
    }
    answer = await callGeminiText(
      credentials.apiToken,
      credentials.model,
      prompt,
    )
  } else {
    answer = basicAnswer(options)
  }

  return {
    answer,
    sources: options.sourceChunks.slice(0, 4).map((chunk) => chunk.title),
  }
}
