import { StudyPackSourceFormat } from '../types'
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
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: responseSchema ? 'application/json' : 'text/plain',
          ...(responseSchema ? { responseSchema } : {}),
        },
      }),
    },
  )

  const payload = (await response.json()) as GeminiResponse
  if (!response.ok) {
    throw new Error(
      payload.error?.message || `Gemini request failed (${response.status}).`,
    )
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
  const targetInstruction = generationTargets.length
    ? `Prioritize these study materials: ${generationTargets.join(', ')}.`
    : 'Prioritize summaries, definitions, flashcards, quizzes, and practice prompts when supported by the notes.'
  const amountInstruction =
    generationAmount === 'few'
      ? 'Create a small set: about 4-7 strong items total.'
      : generationAmount === 'many'
        ? 'Create a larger set: about 14-24 useful items total, without padding weak material.'
        : 'Create a balanced set: about 8-14 useful items total.'

  const text = await callGemini(
    apiToken,
    model,
    [
      {
        text: `Create a study pack JSON object from these raw notes.

Rules:
- Use only facts answerable from the notes.
- Prefer useful learning widgets: term definitions, flashcards as "qa", quizzes, lists, comparisons, sequences, and review prompts.
- For multiple-choice quizzes, include 3-4 options and correctIndex.
- Do not invent outside facts or practice content requiring unstated knowledge.
- Keep objects concise and student-friendly.
- ${targetInstruction}
- ${amountInstruction}

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

  return {
    ...draft,
    title: draft.title || title,
    sourceFormat: draft.sourceFormat || ('text' as StudyPackSourceFormat),
  }
}
