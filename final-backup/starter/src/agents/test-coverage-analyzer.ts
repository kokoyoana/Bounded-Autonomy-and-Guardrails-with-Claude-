import type { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { TEST_COVERAGE_ANALYZER_PROMPT } from '../prompts/test-coverage-analyzer.prompt.js';

export const testCoverageAnalyzer: AgentDefinition = {
  description:
    'Analyzes test coverage, identifies missing tests and suggests actionable test cases.',

  prompt: TEST_COVERAGE_ANALYZER_PROMPT,

  model: 'inherit',

  tools: [
    'Read',
    'Grep',
    'Glob',
    'Skill'
  ]
};
