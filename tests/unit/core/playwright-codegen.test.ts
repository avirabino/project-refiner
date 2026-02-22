import { describe, it, expect } from 'vitest';
import { generatePlaywrightSpec } from '@core/playwright-codegen';
import type { Session, Action, Bug } from '@shared/types';
import { SessionStatus, BugPriority } from '@shared/types';

const baseSession: Session = {
  id: 'ats-2026-02-22-001',
  name: 'Login Flow',
  description: '',
  status: SessionStatus.COMPLETED,
  startedAt: 1_700_000_000_000,
  stoppedAt: 1_700_000_060_000,
  duration: 60_000,
  pages: ['http://localhost:38470/'],
  actionCount: 3,
  bugCount: 1,
  featureCount: 0,
  screenshotCount: 0,
};

const navAction: Action = {
  id: 'act-1',
  sessionId: baseSession.id,
  timestamp: 1_700_000_005_000,
  type: 'navigation',
  pageUrl: 'http://localhost:38470/',
  selectorStrategy: 'data-testid',
};

const clickAction: Action = {
  id: 'act-2',
  sessionId: baseSession.id,
  timestamp: 1_700_000_010_000,
  type: 'click',
  pageUrl: 'http://localhost:38470/',
  selector: '[data-testid="btn-submit"]',
  selectorStrategy: 'data-testid',
  selectorConfidence: 'high',
};

const fillAction: Action = {
  id: 'act-3',
  sessionId: baseSession.id,
  timestamp: 1_700_000_015_000,
  type: 'input',
  pageUrl: 'http://localhost:38470/',
  selector: '[data-testid="input-name"]',
  selectorStrategy: 'data-testid',
  selectorConfidence: 'high',
  value: 'Alice',
};

const bug: Bug = {
  id: 'bug-1',
  sessionId: baseSession.id,
  type: 'bug',
  priority: BugPriority.P1,
  title: 'Submit hangs on slow connection',
  description: '',
  url: 'http://localhost:38470/',
  timestamp: 1_700_000_012_000,
};

describe('generatePlaywrightSpec', () => {
  it('includes Playwright import statement', () => {
    const spec = generatePlaywrightSpec(baseSession, [], []);
    expect(spec).toContain(`import { test, expect } from '@playwright/test'`);
  });

  it('includes session name in test title', () => {
    const spec = generatePlaywrightSpec(baseSession, [], []);
    expect(spec).toContain('Login Flow');
  });

  it('maps navigation to page.goto', () => {
    const spec = generatePlaywrightSpec(baseSession, [navAction], []);
    expect(spec).toContain(`await page.goto('http://localhost:38470/')`);
  });

  it('maps click to page.click with getByTestId for data-testid selector', () => {
    const spec = generatePlaywrightSpec(baseSession, [clickAction], []);
    expect(spec).toContain(`page.getByTestId('btn-submit')`);
    expect(spec).toContain('await page.click(');
  });

  it('maps input to page.fill with value', () => {
    const spec = generatePlaywrightSpec(baseSession, [fillAction], []);
    expect(spec).toContain(`await page.fill(`);
    expect(spec).toContain(`'Alice'`);
    expect(spec).toContain(`page.getByTestId('input-name')`);
  });

  it('inserts BUG comment at correct position between actions', () => {
    const spec = generatePlaywrightSpec(baseSession, [clickAction, fillAction], [bug]);
    const bugLine = spec.indexOf('// BUG:');
    const fillLine = spec.indexOf('await page.fill(');
    // BUG comment should appear before the fill action
    expect(bugLine).toBeGreaterThan(-1);
    expect(bugLine).toBeLessThan(fillLine);
  });

  it('BUG comment includes priority and title', () => {
    const spec = generatePlaywrightSpec(baseSession, [clickAction, fillAction], [bug]);
    expect(spec).toContain('// BUG: P1');
    expect(spec).toContain('Submit hangs on slow connection');
  });

  it('produces valid spec structure (test block opens and closes)', () => {
    const spec = generatePlaywrightSpec(baseSession, [navAction, clickAction], []);
    expect(spec).toContain('test(');
    expect(spec).toContain('async ({ page }) => {');
    expect(spec.trimEnd().endsWith('});')).toBe(true);
  });

  it('scroll actions are omitted', () => {
    const scroll: Action = { ...clickAction, id: 'act-scroll', type: 'scroll', selector: undefined };
    const spec = generatePlaywrightSpec(baseSession, [scroll], []);
    expect(spec).not.toContain('scroll');
  });

  it('empty actions produces a valid spec without errors', () => {
    const spec = generatePlaywrightSpec(baseSession, [], []);
    expect(spec).toContain('No actions were recorded');
  });
});
