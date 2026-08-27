import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { REFACTORING_SUGGESTER_PROMPT } from '../prompts/refactoring-suggester.prompt.js';

export const refactoringSuggester: AgentDefinition = {
  description:
    'Identifies refactoring opportunities, modernization candidates and code simplification improvements.',

  prompt: REFACTORING_SUGGESTER_PROMPT,

  model: 'inherit',

  tools: [
    'Read',
    'Grep',
    'Glob',
    'Skill'
  ]
};
