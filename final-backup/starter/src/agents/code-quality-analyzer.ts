import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { CODE_QUALITY_ANALYZER_PROMPT } from '../prompts/code-quality-analyzer.prompt.js';

export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Analyzes code quality, security vulnerabilities, performance issues, maintainability concerns and best-practice violations.',

  prompt: CODE_QUALITY_ANALYZER_PROMPT,

  model: 'inherit',

  tools: [
    'Read',
    'Grep',
    'Glob'
    ,'Skill'
  ]
};