import * as dotenv from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator, formatError } from './utils/index.js';

dotenv.config();

/**
 * Main entry point for the Claude Multi-Agent Code Review System
 * Usage: npm run dev -- <owner> <repo> <pr-number>
 */
async function main(): Promise<void> {
  const [owner, repo, prStr] = process.argv.slice(2);

  if (!owner || !repo || !prStr) {
    console.error(
      'Usage: npm run dev -- <owner> <repo> <pr-number>'
    );
    process.exitCode = 1;
    return;
  }

  const prNumber = Number(prStr);

  if (
    !Number.isInteger(prNumber) ||
    prNumber <= 0
  ) {
    console.error(
      'PR number must be a positive integer'
    );
    process.exitCode = 1;
    return;
  }

  const hasAnthropicAPI =
    Boolean(process.env.ANTHROPIC_API_KEY);

  const hasAWSAccessKeys = Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );

  if (!hasAnthropicAPI && !hasAWSAccessKeys) {
    console.error('Authentication required. Set one of:');
    console.error('  - ANTHROPIC_API_KEY, or');
    console.error(
      '  - AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_REGION'
    );
    process.exitCode = 1;
    return;
  }

  if (hasAnthropicAPI) {
    console.log(
      '🔐 Using Anthropic API authentication'
    );
  } else {
    if (!process.env.AWS_REGION) {
      console.error(
        'AWS_REGION is required when using AWS Bedrock authentication'
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      '🔐 Using AWS Bedrock authentication'
    );
  }

  if (!process.env.ANTHROPIC_MODEL) {
    console.error(
      'ANTHROPIC_MODEL environment variable is required.'
    );
    console.error(
      'Anthropic API example: claude-sonnet-4-5-20250929'
    );
    console.error(
      'AWS Bedrock example: us.anthropic.claude-sonnet-4-5-20250929-v1:0'
    );
    process.exitCode = 1;
    return;
  }

  try {
    console.log(
      `🔍 Reviewing ${owner}/${repo} PR #${prNumber}...`
    );

    const orchestrator =
      new CodeReviewOrchestrator();

    const result =
      await orchestrator.reviewPullRequest(
        owner,
        repo,
        prNumber
      );

    const reportGenerator =
      new ReportGenerator();

    const reportsDirectory =
      join(process.cwd(), 'reports');

    await mkdir(
      reportsDirectory,
      { recursive: true }
    );

    const baseName =
      `${owner}_${repo}_${prNumber}`;

    const markdownReport =
      reportGenerator.generateMarkdownReport(result);

    const htmlReport =
      reportGenerator.generateHTMLReport(result);

    const jsonReport =
      reportGenerator.generateJSONReport(result);

    const markdownPath =
      join(reportsDirectory, `${baseName}.md`);

    const htmlPath =
      join(reportsDirectory, `${baseName}.html`);

    const jsonPath =
      join(reportsDirectory, `${baseName}.json`);

    await Promise.all([
      writeFile(markdownPath, markdownReport, 'utf8'),
      writeFile(htmlPath, htmlReport, 'utf8'),
      writeFile(jsonPath, jsonReport, 'utf8')
    ]);

    console.log('');
    console.log(
      `✅ Analysis completed for ${owner}/${repo} PR #${prNumber}`
    );
    console.log(`📄 ${markdownPath}`);
    console.log(`🌐 ${htmlPath}`);
    console.log(`📦 ${jsonPath}`);
  } catch (error) {
    console.error(`❌ ${formatError(error)}`);
    process.exitCode = 1;
  }
}

void main();
