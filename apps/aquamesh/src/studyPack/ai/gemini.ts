import { StudyPackSourceFormat } from '../types'
import {
  augmentStudyPackPracticeObjects,
  createStudyPackPracticeProfile,
  getEffectiveGenerationTargets,
} from '../practice'
import { normalizeAiStudyPackDraft, AiStudyPackDraft } from './normalizer'

interface GeminiPart {
  text?: string
  inline_data?: {
    mime_type: string
    data: string
  }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
    finishReason?: string
  }>
  error?: {
    message?: string
    status?: string
  }
}

const GEMINI_REQUEST_TIMEOUT_MS = 5 * 60 * 1000
const GEMINI_TIMEOUT_MESSAGE =
  'Gemini took longer than 5 minutes, so AquaMesh stopped the request. Try again with shorter notes, fewer generated blocks, or Basic fallback.'
const GEMINI_RATE_LIMIT_MESSAGE =
  'Gemini rate limit reached for today. Try again later, use Basic fallback, or check your Gemini API quota.'

export interface GenerateStudyPackWithAiOptions {
  apiToken: string
  model: string
  title: string
  rawNotes: string
  packId: string
  generationTargets?: string[]
  generationAmount?: 'few' | 'medium' | 'many'
}

export interface ExtractRawNotesWithAiOptions {
  apiToken: string
  model: string
  image: File
}

const objectSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    sourceFormat: {
      type: 'STRING',
      enum: [
        'paste',
        'markdown',
        'text',
        'csv',
        'markdown-table',
        'quick-syntax',
      ],
    },
    objects: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          kind: {
            type: 'STRING',
            enum: [
              'note',
              'term',
              'qa',
              'quiz',
              'reveal',
              'comparison',
              'sequence',
              'reviewPrompt',
              'code',
              'list',
              'table',
            ],
          },
          title: { type: 'STRING' },
          tags: { type: 'ARRAY', items: { type: 'STRING' } },
          body: { type: 'STRING' },
          term: { type: 'STRING' },
          definition: { type: 'STRING' },
          question: { type: 'STRING' },
          answer: { type: 'STRING' },
          quizMode: { type: 'STRING', enum: ['multipleChoice', 'shortAnswer'] },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          correctIndex: { type: 'NUMBER' },
          explanation: { type: 'STRING' },
          prompt: { type: 'STRING' },
          hiddenText: { type: 'STRING' },
          columns: { type: 'ARRAY', items: { type: 'STRING' } },
          rows: {
            type: 'ARRAY',
            items: { type: 'ARRAY', items: { type: 'STRING' } },
          },
          steps: { type: 'ARRAY', items: { type: 'STRING' } },
          ordered: { type: 'BOOLEAN' },
          interactiveChecklist: { type: 'BOOLEAN' },
          checklist: { type: 'BOOLEAN' },
          reason: { type: 'STRING' },
          code: { type: 'STRING' },
          language: { type: 'STRING' },
          caption: { type: 'STRING' },
          items: { type: 'ARRAY', items: { type: 'STRING' } },
          headers: { type: 'ARRAY', items: { type: 'STRING' } },
        },
      },
    },
  },
  required: ['objects'],
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.onerror = () => reject(new Error('Could not read image file.'))
    reader.readAsDataURL(file)
  })

const callGemini = async (
  apiToken: string,
  model: string,
  parts: GeminiPart[],
  responseSchema?: Record<string, unknown>,
): Promise<string> => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    GEMINI_REQUEST_TIMEOUT_MS,
  )
  let response: Response

  try {
    response = await fetch(
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
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: responseSchema
              ? 'application/json'
              : 'text/plain',
            ...(responseSchema ? { responseSchema } : {}),
          },
        }),
      },
    )
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(GEMINI_TIMEOUT_MESSAGE)
    }

    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }

  const payload = (await response.json()) as GeminiResponse
  if (!response.ok) {
    const message = payload.error?.message || ''
    const status = payload.error?.status || ''
    if (
      response.status === 429 ||
      status === 'RESOURCE_EXHAUSTED' ||
      /rate limit|quota|peak requests/i.test(message)
    ) {
      throw new Error(`${GEMINI_RATE_LIMIT_MESSAGE} ${message}`.trim())
    }

    throw new Error(message || `Gemini request failed (${response.status}).`)
  }

  const candidate = payload.candidates?.[0]
  const text = candidate?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim()

  if (!text) {
    throw new Error(
      candidate?.finishReason
        ? `Gemini returned no text (${candidate.finishReason}).`
        : 'Gemini returned no text.',
    )
  }

  return text
}

export const extractRawNotesWithAi = async ({
  apiToken,
  model,
  image,
}: ExtractRawNotesWithAiOptions): Promise<string> => {
  const data = await fileToBase64(image)
  const text = await callGemini(apiToken, model, [
    {
      text: 'Extract study notes from this image. Correct likely OCR mistakes, preserve headings, formulas, lists, and questions. Return only clean Markdown notes grounded in the image.',
    },
    {
      inline_data: {
        mime_type: image.type || 'image/png',
        data,
      },
    },
  ])

  return text.trim()
}

export const generateStudyPackWithAi = async ({
  apiToken,
  model,
  title,
  rawNotes,
  packId,
  generationTargets = [],
  generationAmount = 'medium',
}: GenerateStudyPackWithAiOptions): Promise<AiStudyPackDraft> => {
  const effectiveTargets = getEffectiveGenerationTargets(generationTargets)
  const practiceProfile = createStudyPackPracticeProfile(
    generationAmount,
    generationTargets,
  )
  const targetInstruction = `Prioritize these study materials: ${effectiveTargets.join(
    ', ',
  )}. Treat selected targets as a hard UI contract.`
  const amountInstruction = `Create ${practiceProfile.targetTotal} reviewable study items when possible, never fewer than ${practiceProfile.minTotal} if the notes contain usable facts. Keep the total within ${practiceProfile.minTotal}-${practiceProfile.maxTotal} items.`
  const mixInstruction =
    practiceProfile.enforceQuizzes || practiceProfile.enforceFlashcards
      ? `Use an active-practice mix: ${practiceProfile.targetQuizzes} quizzes, ${practiceProfile.targetFlashcards} flashcards, and about ${practiceProfile.targetSupport} summaries/definitions/review prompts. Quizzes should be 50-60% of the pack and flashcards 20-30%.`
      : 'Use the selected non-practice targets and still create the requested number of useful reviewable items.'

  const text = await callGemini(
    apiToken,
    model,
    [
      {
        text: `Create a study pack JSON object from these raw notes.

Rules:
- Use only facts answerable from the notes.
- Generate exercises even from short notes. A single wiki paragraph should still produce multiple grounded quizzes and flashcards.
- Prefer useful learning widgets: quizzes, flashcards as "qa", term definitions, lists, comparisons, sequences, and review prompts.
- For multiple-choice quizzes, include 3-4 options and correctIndex. Vary the correct answer position across questions; do not always put the correct answer first.
- Prefer multiple-choice quizzes. Use short-answer quizzes only when a grounded multiple-choice question would be misleading.
- Do not invent outside facts or practice content requiring unstated knowledge.
- Keep objects concise and student-friendly.
- ${targetInstruction}
- ${amountInstruction}
- ${mixInstruction}
- Do not return 0, 1, or 2 reviewable items when the notes contain enough text for more practice.

Pack title: ${title}

Raw notes:
${rawNotes}`,
      },
    ],
    objectSchema,
  )

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Gemini returned invalid JSON.')
  }

  const draft = normalizeAiStudyPackDraft(parsed, packId)
  const augmented = augmentStudyPackPracticeObjects(draft.objects, {
    packId,
    title: draft.title || title,
    rawNotes,
    generationTargets,
    generationAmount,
  })

  return {
    ...draft,
    objects: augmented.objects,
    warnings: [...draft.warnings, ...augmented.warnings],
    title: draft.title || title,
    sourceFormat: draft.sourceFormat || ('text' as StudyPackSourceFormat),
  }
}
