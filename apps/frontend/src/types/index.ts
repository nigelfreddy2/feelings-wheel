// types/index.ts — shared TypeScript types for the Feelings Wheel app
export type Level = 'child' | 'adult' | 'advanced'
export type SessionMode = 'general' | 'incident'
export type Ring = 'core' | 'mid' | 'specific'
export type Dimension =
  | 'synonyms'
  | 'prompting_event'
  | 'interpretation'
  | 'biological_change'
  | 'expression_action'
  | 'aftereffect'
  | 'opposite_action'
  | 'justified_when'
  | 'coping_strategy'
  | 'child_language'
  | 'what_it_does'

export type CopingCategory =
  | 'breathing'
  | 'grounding'
  | 'opposite_action'
  | 'pleasant_event'
  | 'please_skill'
  | 'mindfulness'
  | 'crisis'
  | 'values_reflection'

export interface EmotionDimension {
  id: string
  emotionKey: string
  dimension: Dimension
  content: string
  levelMin: Level
  source: string
  displayOrder: number
}

export interface CopingSuggestion {
  id: string
  emotionKey: string | null
  suggestion: string
  category: CopingCategory
  levelMin: Level
  source: string
}

export interface Emotion {
  key: string
  label: string
  definition: string
  parentKey: string | null
  ring: Ring
  sectorColour: string
  levelMin: Level
  source: string
  dimensions: EmotionDimension[]
  copingSuggestions: CopingSuggestion[]
  children?: Emotion[]
}

export interface Session {
  id: string
  createdAt: string
  level: Level
  mode: SessionMode
  overridingEmotion: string | null
  completed: boolean
}

export interface SessionReflection {
  emotionFitsFacts?: 'yes' | 'no' | 'unsure'
  actionUrge?: string
  oppositeTaken?: boolean
  reframeText?: string
  commitmentText?: string
  intensityBefore?: number
  intensityAfter?: number
}
