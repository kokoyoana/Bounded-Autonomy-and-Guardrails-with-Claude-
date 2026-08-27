import { query } from '@anthropic-ai/claude-agent-sdk';
import type { PermissionMode } from '@anthropic-ai/claude-agent-sdk';

import {
  codeQualityAnalyzer,
  testCoverageAnalyzer,
  refactoringSuggester
} from './agents/index.js';

import { mcpServersConfig } from './config/mcp.config.js';
import { ORCHESTRATOR_PROMPT } from './prompts/index.js';

import {
  ReviewReportSchema,
  ReviewReportJSONSchema
} from './types/report-types.js';

import type { ReviewReport } from './types/report-types.js';

/**
 * Orchestrator configuration options
 */
export interface OrchestratorOptions {
  model?: string;
  maxTurns?: number;
  permissionMode?: PermissionMode;
  cwd?: string;
}

/**
 * Main Code Review Orchestrator
 * Coordinates subagents to analyze pull requests and generate comprehensive reports
 */
export class CodeReviewOrchestrator {
  private readonly model: string;
  private readonly maxTurns: number;
  private readonly permissionMode: PermissionMode;
  private readonly cwd: string;

  constructor(options: OrchestratorOptions = {}) {
    const configuredModel =
      options.model ?? process.env.ANTHROPIC_MODEL;

    if (!configuredModel) {
      throw new Error(
        'ANTHROPIC_MODEL is required. Configure it in the environment.'
      );
    }

    this.model = configuredModel;
    this.maxTurns = options.maxTurns ?? 20;
    this.permissionMode = options.permissionMode ?? 'dontAsk';
    this.cwd =
      options.cwd ??
      process.env.PROJECT_ROOT ??
      process.cwd();
  }

  /**
   * Review a pull request using parallel subagent analysis
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - Pull request number
   * @returns Complete review report
   */
  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    const prompt = `
${ORCHESTRATOR_PROMPT}

Review the following GitHub pull request:

- Owner: ${owner}
- Repository: ${repo}
- Pull request number: ${prNumber}

Required workflow:

1. Use the GitHub MCP pull request read tool to obtain the pull request
   information and changed files.

2. For every changed source file, explicitly use the
   code-quality-analyzer agent to analyse code quality, security,
   performance and maintainability.

3. For every changed source file, explicitly use the
   test-coverage-analyzer agent to analyse existing tests and identify
   missing test scenarios.

4. For every changed source file, explicitly use the
   refactoring-suggester agent to identify refactoring and modernisation
   opportunities.

5. Run independent subagent analyses in parallel whenever possible.

6. If one subagent cannot analyse a file, continue with the remaining
   analyses and describe the failure in the relevant summary.

7. Aggregate every result into one object matching ReviewReportSchema.

The pullRequest field must contain exactly:

{
  "owner": "${owner}",
  "repo": "${repo}",
  "number": ${prNumber}
}

Return only the structured ReviewReport output.
`;

    const result = query({
      prompt,
      options: {
        agents: {
          'code-quality-analyzer': codeQualityAnalyzer,
          'test-coverage-analyzer': testCoverageAnalyzer,
          'refactoring-suggester': refactoringSuggester
        },

        allowedTools: [
          'Task',
          'Read',
          'Grep',
          'Glob',
          'Skill',
          'mcp__github__get_pull_request',
          'mcp__github__get_pull_request_files',
          'mcp__github__get_file_contents'
        ],

        mcpServers: mcpServersConfig,

        model: this.model,
        maxTurns: this.maxTurns,
        permissionMode: this.permissionMode,
        cwd: this.cwd,

        outputFormat: {
          type: 'json_schema',
          schema: ReviewReportJSONSchema
        }
      }
    });

    for await (const message of result) {
      if (message.type !== 'result') {
        continue;
      }

      if (message.subtype !== 'success') {
        throw new Error(
          `Code review failed with SDK result: ${message.subtype}. ` +
          `Details: ${message.errors.join('; ')}`
        );
      }

      if (message.structured_output === undefined) {
        throw new Error(
          'The orchestrator completed without structured output.'
        );
      }

      const validation =
        ReviewReportSchema.safeParse(message.structured_output);

      if (!validation.success) {
        throw new Error(
          `Structured output does not match ReviewReportSchema: ${
            validation.error.message
          }`
        );
      }

      return validation.data;
    }

    throw new Error(
      'The Claude Agent SDK finished without returning a result message.'
    );
  }
}
