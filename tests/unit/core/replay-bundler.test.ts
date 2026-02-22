import { describe, it, expect } from 'vitest';
import { generateReplayHtml } from '@core/replay-bundler';
import type { Session } from '@shared/types';
import { SessionStatus } from '@shared/types';

const baseSession: Session = {
  id: 'ats-2026-02-22-001',
  name: 'Replay Test Session',
  description: '',
  status: SessionStatus.COMPLETED,
  startedAt: 1_700_000_000_000,
  stoppedAt: 1_700_000_060_000,
  duration: 60_000,
  pages: ['http://localhost:38470/'],
  actionCount: 0,
  bugCount: 0,
  featureCount: 0,
  screenshotCount: 0,
};

const mockEvents = [
  { type: 4, data: { href: 'http://localhost:38470/' }, timestamp: 1_700_000_001_000 },
  { type: 3, data: {}, timestamp: 1_700_000_005_000 },
];

describe('generateReplayHtml', () => {
  it('returns a valid HTML string', () => {
    const html = generateReplayHtml(baseSession, mockEvents);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it('includes session name in the page title and header', () => {
    const html = generateReplayHtml(baseSession, mockEvents);
    expect(html).toContain('Replay Test Session');
  });

  it('embeds session events as JSON', () => {
    const html = generateReplayHtml(baseSession, mockEvents);
    expect(html).toContain('"type":4');
  });

  it('includes rrweb-player script tag', () => {
    const html = generateReplayHtml(baseSession, mockEvents);
    expect(html).toContain('<script>');
  });

  it('references the player container element', () => {
    const html = generateReplayHtml(baseSession, mockEvents);
    expect(html).toContain('id="player"');
  });

  it('includes no-events fallback element', () => {
    const html = generateReplayHtml(baseSession, mockEvents);
    expect(html).toContain('id="no-events"');
  });

  it('handles empty events array without throwing', () => {
    expect(() => generateReplayHtml(baseSession, [])).not.toThrow();
    const html = generateReplayHtml(baseSession, []);
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('escapes HTML special chars in session name', () => {
    const xssSession = { ...baseSession, name: '<script>alert(1)</script>' };
    const html = generateReplayHtml(xssSession, []);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
