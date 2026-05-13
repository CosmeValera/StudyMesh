import { StudyObject, StudyObjectKind, StudyQuizObject } from './types'

export type StudyPackGenerationAmount = 'few' | 'medium' | 'many'

export interface StudyPackPracticeProfile {
  amount: StudyPackGenerationAmount
  targetTotal: number
  minTotal: number
  maxTotal: number
  targetQuizzes: number
  minQuizzes: number
  targetFlashcards: number
  minFlashcards: number
  targetSupport: number
  enforceQuizzes: boolean
  enforceFlashcards: boolean
}

export interface AugmentStudyPackPracticeOptions {
  packId: string
  title: string
  rawNotes: string
  generationTargets?: string[]
  generationAmount?: StudyPackGenerationAmount
}

export interface AugmentStudyPackPracticeResult {
  objects: StudyObject[]
  addedCount: number
  warnings: string[]
  profile: StudyPackPracticeProfile
}

const DEFAULT_TARGETS = [
  'summaries',
  'definitions',
  'flashcards',
  'quizzes',
  'exercises',
]

const amountProfiles: Record<
  StudyPackGenerationAmount,
  Pick<StudyPackPracticeProfile, 'targetTotal' | 'minTotal' | 'maxTotal'>
> = {
  few: { targetTotal: 6, minTotal: 4, maxTotal: 7 },
  medium: { targetTotal: 11, minTotal: 8, maxTotal: 14 },
  many: { targetTotal: 18, minTotal: 14, maxTotal: 24 },
}

const reviewableKinds = new Set<StudyObjectKind>([
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
])

const supportKinds = new Set<StudyObjectKind>([
  'term',
  'comparison',
  'sequence',
  'reviewPrompt',
  'code',
  'list',
  'table',
])

export const getEffectiveGenerationTargets = (
  generationTargets: string[] = [],
): string[] =>
  generationTargets.length > 0 ? generationTargets : DEFAULT_TARGETS

export const createStudyPackPracticeProfile = (
  generationAmount: StudyPackGenerationAmount = 'medium',
  generationTargets: string[] = [],
): StudyPackPracticeProfile => {
  const amount = generationAmount
  const base = amountProfiles[amount]
  const targets = getEffectiveGenerationTargets(generationTargets)
  const enforceQuizzes =
    targets.includes('quizzes') || targets.includes('exercises')
  const enforceFlashcards = targets.includes('flashcards')
  const targetQuizzes = enforceQuizzes ? Math.round(base.targetTotal * 0.55) : 0
  const minQuizzes = enforceQuizzes ? Math.ceil(base.minTotal * 0.5) : 0
  const targetFlashcards = enforceFlashcards
    ? Math.max(1, Math.round(base.targetTotal * 0.25))
    : 0
  const minFlashcards = enforceFlashcards
    ? Math.max(1, Math.floor(base.minTotal * 0.2))
    : 0

  return {
    amount,
    ...base,
    targetQuizzes,
    minQuizzes,
    targetFlashcards,
    minFlashcards,
    targetSupport: Math.max(
      0,
      base.targetTotal - targetQuizzes - targetFlashcards,
    ),
    enforceQuizzes,
    enforceFlashcards,
  }
}

export const isReviewableStudyObject = (object: StudyObject): boolean =>
  reviewableKinds.has(object.kind)

const hashValue = (value: string): number => {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

const reorderOptions = (
  options: string[],
  correctAnswer: string,
  targetIndex: number,
): string[] => {
  const wrongOptions = options.filter((option) => option !== correctAnswer)
  const nextOptions = [...wrongOptions]
  nextOptions.splice(targetIndex, 0, correctAnswer)

  return nextOptions
}

export const shuffleStudyQuizOptions = (
  quiz: StudyQuizObject,
): StudyQuizObject => {
  if (quiz.quizMode !== 'multipleChoice' || quiz.options.length < 2) {
    return quiz
  }

  const currentAnswer = quiz.answer || quiz.options[quiz.correctIndex] || ''
  if (!currentAnswer) {
    return quiz
  }

  const uniqueOptions = Array.from(new Set(quiz.options))
  if (uniqueOptions.length < 2 || !uniqueOptions.includes(currentAnswer)) {
    return quiz
  }

  const targetIndex =
    hashValue(`${quiz.id}:${quiz.question}`) % uniqueOptions.length
  const options = reorderOptions(uniqueOptions, currentAnswer, targetIndex)

  return {
    ...quiz,
    options,
    correctIndex: options.findIndex((option) => option === currentAnswer),
    answer: currentAnswer,
  }
}

export const shuffleStudyObjectQuizOptions = (
  object: StudyObject,
): StudyObject =>
  object.kind === 'quiz' ? shuffleStudyQuizOptions(object) : object

const sanitizeIdPart = (value: string): string => {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return sanitized || 'study-pack'
}

const normalizeSpaces = (value: string): string =>
  value.replace(/\s+/g, ' ').trim()

const stripMarkdown = (value: string): string =>
  value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(
      /\b(?:Quiz|Flashcard|Definition|Reveal|Sequence|Comparison|Checklist|Formula|Example)::/gi,
      '',
    )
    .replace(/\s+\|\s+/g, '. ')
    .replace(/^[#>\-*+\d.)\s[\]xX]+/gm, '')
    .replace(/\|/g, ' ')

const splitIntoFacts = (rawNotes: string): string[] => {
  const cleaned = stripMarkdown(rawNotes)
  const chunks = cleaned
    .split(/\r?\n|(?<=[.!?])\s+/)
    .map((chunk) => normalizeSpaces(chunk))
    .map((chunk) => (chunk.length > 420 ? `${chunk.slice(0, 417)}...` : chunk))
    .filter((chunk) => {
      const words = chunk.split(/\s+/).filter(Boolean)
      return chunk.length >= 18 && words.length >= 4
    })

  const seen = new Set<string>()
  return chunks.filter((chunk) => {
    const key = chunk.toLowerCase()
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

const extractConcept = (fact: string, title: string): string => {
  const definitionMatch = fact.match(
    /^(.{2,80}?)\s+(?:is|are|was|were|means|refers to|es|son|fue|era|significa|consiste en)\s+/i,
  )
  const rawConcept = definitionMatch?.[1] || title || fact
  const concept = normalizeSpaces(
    rawConcept
      .replace(/^(?:the|a|an|el|la|los|las|un|una)\s+/i, '')
      .split(/[,:;()[\].]/)[0],
  )
  const words = concept.split(/\s+/).filter(Boolean)

  return words.slice(0, 8).join(' ') || title || 'this topic'
}

const createQuiz = (
  packId: string,
  index: number,
  fact: string,
  facts: string[],
  title: string,
): StudyObject => {
  const concept = extractConcept(fact, title)
  const otherFacts = facts.filter((candidate) => candidate !== fact)
  const useFactOptions = otherFacts.length >= 2
  const options = useFactOptions
    ? [
        fact,
        otherFacts[index % otherFacts.length],
        otherFacts[(index + 1) % otherFacts.length],
      ]
    : ['Supported by the notes', 'Not supported by the notes']

  return {
    id: `${packId}-practice-quiz-${index + 1}`,
    kind: 'quiz',
    title: `${concept} quiz`,
    sourceLine: index + 1,
    tags: ['study-pack', 'practice'],
    quizMode: 'multipleChoice',
    question: useFactOptions
      ? `Which statement matches the notes about ${concept}?`
      : `According to the notes, is this statement supported: "${fact}"?`,
    options,
    correctIndex: 0,
    answer: options[0],
    explanation: fact,
  }
}

const createFlashcard = (
  packId: string,
  index: number,
  fact: string,
  title: string,
): StudyObject => {
  const concept = extractConcept(fact, title)

  return {
    id: `${packId}-practice-flashcard-${index + 1}`,
    kind: 'qa',
    title: `${concept} flashcard`,
    sourceLine: index + 1,
    tags: ['study-pack', 'practice'],
    question: `What do the notes say about ${concept}?`,
    answer: fact,
  }
}

const createSupportPrompt = (
  packId: string,
  index: number,
  fact: string,
  title: string,
): StudyObject => {
  const concept = extractConcept(fact, title)

  return {
    id: `${packId}-practice-review-${index + 1}`,
    kind: 'reviewPrompt',
    title: `${concept} review`,
    sourceLine: index + 1,
    tags: ['study-pack', 'practice'],
    prompt: `Review this source point: ${fact}`,
    reason: 'Generated to keep the Study Pack practice-focused.',
    status: 'needsReview',
  }
}

const countReviewable = (objects: StudyObject[]) =>
  objects.filter(isReviewableStudyObject).length

const countKind = (objects: StudyObject[], kind: StudyObjectKind) =>
  objects.filter((object) => object.kind === kind).length

const countSupport = (objects: StudyObject[]) =>
  objects.filter((object) => supportKinds.has(object.kind)).length

const hasObjectId = (objects: StudyObject[], id: string): boolean =>
  objects.some((object) => object.id === id)

const pushUnique = (objects: StudyObject[], object: StudyObject): void => {
  if (!hasObjectId(objects, object.id)) {
    objects.push(object)
  }
}

export const augmentStudyPackPracticeObjects = (
  inputObjects: StudyObject[],
  options: AugmentStudyPackPracticeOptions,
): AugmentStudyPackPracticeResult => {
  const profile = createStudyPackPracticeProfile(
    options.generationAmount,
    options.generationTargets,
  )
  const packId = sanitizeIdPart(options.packId || options.title)
  const objects = inputObjects.map(shuffleStudyObjectQuizOptions)
  const facts = splitIntoFacts(options.rawNotes)
  const warnings: string[] = []

  if (facts.length === 0) {
    return { objects, addedCount: 0, warnings, profile }
  }

  const startingCount = objects.length
  let cursor = 0
  const nextFact = () => {
    const fact = facts[cursor % facts.length]
    cursor += 1
    return fact
  }

  if (profile.enforceQuizzes) {
    while (
      countKind(objects, 'quiz') < profile.targetQuizzes &&
      countReviewable(objects) < profile.maxTotal
    ) {
      pushUnique(
        objects,
        createQuiz(
          packId,
          countKind(objects, 'quiz'),
          nextFact(),
          facts,
          options.title,
        ),
      )
    }
  }

  if (profile.enforceFlashcards) {
    while (
      countKind(objects, 'qa') < profile.targetFlashcards &&
      countReviewable(objects) < profile.maxTotal
    ) {
      pushUnique(
        objects,
        createFlashcard(
          packId,
          countKind(objects, 'qa'),
          nextFact(),
          options.title,
        ),
      )
    }
  }

  while (
    countReviewable(objects) < profile.targetTotal &&
    countReviewable(objects) < profile.maxTotal
  ) {
    if (
      profile.enforceQuizzes &&
      countKind(objects, 'quiz') < profile.minQuizzes
    ) {
      pushUnique(
        objects,
        createQuiz(
          packId,
          countKind(objects, 'quiz'),
          nextFact(),
          facts,
          options.title,
        ),
      )
      continue
    }

    if (
      profile.enforceFlashcards &&
      countKind(objects, 'qa') < profile.minFlashcards
    ) {
      pushUnique(
        objects,
        createFlashcard(
          packId,
          countKind(objects, 'qa'),
          nextFact(),
          options.title,
        ),
      )
      continue
    }

    pushUnique(
      objects,
      createSupportPrompt(
        packId,
        countSupport(objects),
        nextFact(),
        options.title,
      ),
    )
  }

  const addedCount = objects.length - startingCount
  if (addedCount > 0) {
    warnings.push(
      `AquaMesh added ${addedCount} grounded practice block${
        addedCount === 1 ? '' : 's'
      } to match the selected Study Pack target.`,
    )
  }

  return {
    objects: objects.map(shuffleStudyObjectQuizOptions),
    addedCount,
    warnings,
    profile,
  }
}
