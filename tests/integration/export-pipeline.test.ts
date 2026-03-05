import { describe, it, expect, beforeEach } from 'vitest';
import { generateJsonReport, generateMarkdownReport } from '@core/report-generator';
import { generatePlaywrightSpec } from '@core/playwright-codegen';
import { generateReplayHtml } from '@core/replay-bundler';
import { generateZipBundle } from '@core/zip-bundler';
import type { Session, Bug, Feature, Action, Screenshot, RecordingChunk } from '@shared/types';
import { SessionStatus, BugPriority, FeatureType } from '@shared/types';

describe('Export Pipeline Integration', () => {
  let session: Session;
  let bugs: Bug[];
  let features: Feature[];
  let actions: Action[];
  let screenshots: Screenshot[];
  let chunks: RecordingChunk[];

  beforeEach(() => {
    const now = Date.now();
    session = {
      id: 'ats-2026-02-22-001',
      name: 'Test Session',
      description: 'Test description',
      status: SessionStatus.COMPLETED,
      startedAt: now - 60000,
      stoppedAt: now,
      duration: 60000,
      actionCount: 2,
      bugCount: 1,
      featureCount: 1,
      screenshotCount: 1,
      pages: ['https://example.com'],
      tags: [],
      recordMouseMove: false,
    };

    bugs = [
      {
        id: 'bug-1',
        sessionId: session.id,
        type: 'bug',
        title: 'Test Bug',
        description: 'Test bug description',
        priority: BugPriority.P1,
        status: 'open',
        url: 'https://example.com',
        timestamp: now - 30000,
      }
    ];

    features = [
      {
        id: 'feat-1',
        sessionId: session.id,
        type: 'feature',
        title: 'Test Feature',
        description: 'Test feature description',
        featureType: FeatureType.ENHANCEMENT,
        status: 'open',
        url: 'https://example.com',
        timestamp: now - 20000,
      }
    ];

    actions = [
      {
        id: 'act-1',
        sessionId: session.id,
        type: 'navigation',
        value: 'https://example.com',
        timestamp: now - 50000,
        pageUrl: 'https://example.com',
      },
      {
        id: 'act-2',
        sessionId: session.id,
        type: 'click',
        selector: '#test-btn',
        selectorStrategy: 'id',
        selectorConfidence: 'high',
        timestamp: now - 40000,
        pageUrl: 'https://example.com',
      }
    ];

    screenshots = [
      {
        id: 'ss-1',
        sessionId: session.id,
        dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        timestamp: now - 35000,
        url: 'https://example.com',
        width: 1280,
        height: 720,
      }
    ];

    chunks = [
      {
        sessionId: session.id,
        chunkIndex: 0,
        events: [{ type: 1, timestamp: now - 60000 }, { type: 2, timestamp: now - 50000 }],
        pageUrl: 'https://example.com',
        createdAt: now - 50000,
      }
    ];
  });

  it('generates a valid JSON report', () => {
    const json = generateJsonReport(session, bugs, features, actions, screenshots);
    expect(json.meta.sessionId).toBe(session.id);
    expect(json.session.name).toBe(session.name);
    expect(json.stats.totalActions).toBe(2);
    expect(json.stats.totalBugs).toBe(1);
    expect(json.stats.totalFeatures).toBe(1);
    expect(json.timeline).toHaveLength(5); // 2 actions + 1 bug + 1 feature + 1 screenshot
  });

  it('generates a valid Markdown report', () => {
    const md = generateMarkdownReport(session, bugs, features, actions, screenshots);
    expect(md).toContain('# Session Report: Test Session');
    expect(md).toContain(session.name);
    expect(md).toContain('Test Bug');
    expect(md).toContain('Test Feature');
    expect(md).toContain('## Timeline');
  });

  it('generates a valid Playwright spec', () => {
    const spec = generatePlaywrightSpec(session, actions, bugs);
    expect(spec).toContain(`import { test, expect } from '@playwright/test';`);
    expect(spec).toContain(`await page.goto('https://example.com');`);
    expect(spec).toContain(`await page.locator('#test-btn').click();`);
    expect(spec).toContain('// BUG: P1 — "Test Bug"');
  });

  it('generates a valid Replay HTML', async () => {
    const html = await generateReplayHtml(session, chunks);
    expect(html).toContain('<!DOCTYPE html>');
    // The playerJs/playerCss imports resolve to undefined in Vitest Node environment
    // due to the ?raw query param, so we just check for the player init code
    expect(html).toContain('new PlayerCtor({');
    expect(html).toContain(session.name);
  });

  it('generates a valid ZIP bundle', async () => {
    const blob = await generateZipBundle(session, bugs, features, actions, screenshots, chunks);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/zip');
    expect(blob.size).toBeGreaterThan(0);
  });
});
