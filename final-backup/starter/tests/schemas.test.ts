import { describe, expect, it } from 'vitest';

import {
  CodeQualityResultSchema
} from '../src/types/analysis-results.js';

import {
  ReviewReportSchema
} from '../src/types/report-types.js';

describe('Schema Validation', () => {
  it('should accept valid CodeQualityResult', () => {
    const data = {
      file: 'index.ts',
      issues: [],
      overallScore: 100,
      summary: 'Looks good'
    };

    expect(() =>
      CodeQualityResultSchema.parse(data)
    ).not.toThrow();
  });

  it('should reject invalid CodeQualityResult', () => {
    const data = {
      file: 'index.ts',
      issues: [],
      overallScore: 999,
      summary: 'Invalid score'
    };

    expect(() =>
      CodeQualityResultSchema.parse(data)
    ).toThrow();
  });

  it('should accept valid ReviewReport', () => {
    const report = {
      pullRequest: {
        owner: 'test',
        repo: 'repo',
        number: 1
      },
      fileReviews: [],
      summary: {
        totalFiles: 0,
        overallScore: 100,
        criticalIssues: 0,
        highPriorityTests: 0,
        refactoringOpportunities: 0
      },
      recommendations: [],
      metadata: {
        analyzedAt: new Date().toISOString(),
        duration: 100,
        agentVersions: {}
      }
    };

    expect(() =>
      ReviewReportSchema.parse(report)
    ).not.toThrow();
  });
});