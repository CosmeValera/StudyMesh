export {
  DEFAULT_STUDY_PACK_AI_MODEL,
  STUDY_PACK_AI_SETTINGS_KEY,
  clearStudyPackAiToken,
  getEnvGeminiApiKey,
  readStudyPackAiSettings,
  resolveStudyPackAiCredentials,
  saveStudyPackAiSettings,
} from './settings'
export type { StudyPackAiSettings } from './settings'
export type { StudyPackAiProvider } from './settings'
export {
  getStudyPathDashboardRoles,
  normalizeStudyPathGenerationAmount,
} from './gemini'
export type {
  AiStudyPathDashboardDraft,
  AiStudyPathDraft,
  ExtractRawNotesWithAiOptions,
  GenerateStudyPackWithAiOptions,
  GenerateStudyPathWithAiOptions,
  StudyPathGenerationAmount,
} from './gemini'
export { extractRawNotesWithAi } from './gemini'
export {
  generateStudyPackWithAi as generateStudyPackWithGemini,
  generateStudyPathWithAi as generateStudyPathWithGemini,
} from './gemini'
export { generateStudyPackWithAi, generateStudyPathWithAi } from './provider'
export {
  assertRoleObjectsAreClean,
  filterStudyObjectsForDashboardRole,
  normalizeAiStudyPackDraft,
  studyObjectAllowedForDashboardRole,
} from './normalizer'
export type {
  AiGenerationDebugTrace,
  AiSourceSummary,
  AiStudyPackDraft,
  StrictAiDashboardContract,
} from './normalizer'
export {
  callLocalLanguageModel,
  extractNotesFromImageWithLocalLanguageModel,
  getLocalLanguageModelImageAvailability,
  getLocalLanguageModelAvailability,
  isLocalLanguageModelSupported,
  testLocalLanguageModel,
} from './localLanguageModel'
export { normalizeLocalAiStudyPackDraft, parseLocalAiJson } from './localGeneration'
