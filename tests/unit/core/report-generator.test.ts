import { describe, it, expect } from 'vitest';
import { generateJsonReport, generateMarkdownReport } from '@core/report-generator';
import type { Session, Bug, Feature, Action, Screenshot } from '@shared/types';
import { SessionStatus, BugPriority, FeatureType } from '@shared/types';

const baseSession: Session = {
  id: 'ats-2026-02-22-001',
  name: 'Test Session',
  description: 'A QA session',
  status: SessionStatus.COMPLETED,
  startedAt: 1_700_000_000_000,
  stoppedAt: 1_700_000_060_000,
  duration: 60_000,
  pages: ['http://localhost:38470/', 'http://localhost:38470/form'],
  actionCount: 2,
  bugCount: 1,
  featureCount: 1,
  screenshotCount: 1,
};

const bug: Bug = {
  id: 'bug-0001',
  sessionId: baseSession.id,
  type: 'bug',
  priority: BugPriority.P1,
  title: 'Submit button misaligned',
  description: 'The button shifts on mobile',
  url: 'http://localhost:38470/form',
  elementSelector: '[data-testid="btn-submit"]',
  timestamp: 1_700_000_030_000,
};

const feature: Feature = {
  id: 'feat-0001',
  sessionId: baseSession.id,
  type: 'feature',
  featureType: FeatureType.ENHANCEMENT,
  title: 'Add dark mode',
  description: 'Support dark mode toggle',
  url: 'http://localhost:38470/',
  timestamp: 1_700_000_045_000,
};

const action: Action = {
  id: 'act-0001',
  sessionId: baseSession.id,
  timestamp: 1_700_000_010_000,
  type: 'click',
  pageUrl: 'http://localhost:38470/',
  selector: '[data-testid="btn-submit"]',
  selectorStrategy: 'data-testid',
  selectorConfidence: 'high',
};

const screenshot: Screenshot = {
  id: 'scr-0001',
  sessionId: baseSession.id,
  dataUrl: 'data:image/jpeg;base64,/9j/abc',
  url: 'http://localhost:38470/',
  timestamp: 1_700_000_020_000,
  width: 1280,
  height: 720,
};

describe('generateJsonReport', () => {
  it('returns correct meta fields', () => {
    const report = generateJsonReport(baseSession, [bug], [feature], [action], [screenshot]);
    expect(report.meta.sessionId).toBe(baseSession.id);
    expect(report.meta.refineVersion).toBe('1.0.0');
    expect(report.meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns correct session fields', () => {
    const report = generateJsonReport(baseSession, [bug], [feature], [action], [screenshot]);
    expect(report.session.name).toBe('Test Session');
    expect(report.session.duration).toBe(60_000);
    expect(report.session.durationFormatted).toBe('1m 0s');
  });

  it('includes bugs sorted by priority', () => {
    const p2: Bug = { ...bug, id: 'bug-0002', priority: BugPriority.P2 };
    const report = generateJsonReport(baseSession, [p2, bug], [], [], []);
    expect(report.bugs[0].priority).toBe('P1');
    expect(report.bugs[1].priority).toBe('P2');
  });

  it('timeline is sorted ascending by timestamp', () => {
    const report = generateJsonReport(baseSession, [bug], [feature], [action], [screenshot]);
    const timestamps = report.timeline.map((e) => e.timestamp);
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });

  it('stats match input lengths', () => {
    const report = generateJsonReport(baseSession, [bug], [feature], [action], [screenshot]);
    expect(report.stats.totalBugs).toBe(1);
    expect(report.stats.totalFeatures).toBe(1);
    expect(report.stats.totalActions).toBe(1);
    expect(report.stats.totalScreenshots).toBe(1);
    expect(report.stats.duration).toBe(60_000);
  });

  it('handles empty session without errors', () => {
    const empty: Session = { ...baseSession, bugCount: 0, featureCount: 0, actionCount: 0, screenshotCount: 0, pages: [] };
    const report = generateJsonReport(empty, [], [], [], []);
    expect(report.bugs).toHaveLength(0);
    expect(report.features).toHaveLength(0);
    expect(report.timeline).toHaveLength(0);
    expect(report.stats.totalBugs).toBe(0);
  });
});

describe('generateMarkdownReport', () => {
  it('includes session name in heading', () => {
    const md = generateMarkdownReport(baseSession, [bug], [feature], [action], [screenshot]);
    expect(md).toContain('# Session Report: Test Session');
  });

  it('includes bugs section when bugs present', () => {
    const md = generateMarkdownReport(baseSession, [bug], [], [], []);
    expect(md).toContain('## Bugs');
    expect(md).toContain('Submit button misaligned');
    expect(md).toContain('[P1]');
  });

  it('includes features section when features present', () => {
    const md = generateMarkdownReport(baseSession, [], [feature], [], []);
    expect(md).toContain('## Feature Requests');
    expect(md).toContain('Add dark mode');
  });

  it('includes stats table', () => {
    const md = generateMarkdownReport(baseSession, [bug], [], [action], [screenshot]);
    expect(md).toContain('## Stats');
    expect(md).toContain('Actions recorded');
    expect(md).toContain('Bugs logged');
  });

  it('includes generated-by footer', () => {
    const md = generateMarkdownReport(baseSession, [], [], [], []);
    expect(md).toContain('Generated by Refine');
  });

  it('produces valid markdown for empty session', () => {
    const empty: Session = { ...baseSession, pages: [] };
    const md = generateMarkdownReport(empty, [], [], [], []);
    expect(md).toContain('# Session Report:');
    expect(md).not.toContain('undefined');
    expect(md).not.toContain('[object');
  });
});
