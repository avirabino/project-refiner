/**
 * @file report-generator.ts
 * @description Generates JSON and Markdown reports from a completed session.
 */

import type { Session, Bug, Feature, Action, Screenshot } from '@shared/types';
import { formatDuration } from '@shared/utils';
import { VERSION } from '@shared/constants';

export interface TimelineEntry {
  timestamp: number;
  type: 'action' | 'bug' | 'feature' | 'screenshot';
  description: string;
  url: string;
}

export interface PageStat {
  url: string;
  enterTime: number;
  exitTime: number;
  actionCount: number;
}

export interface JsonReport {
  meta: {
    generatedAt: string;
    refineVersion: string;
    sessionId: string;
  };
  session: {
    name: string;
    description: string;
    startTime: string;
    endTime: string;
    duration: number;
    durationFormatted: string;
  };
  pages: PageStat[];
  timeline: TimelineEntry[];
  bugs: Array<{
    id: string;
    title: string;
    priority: string;
    url: string;
    selector?: string;
    screenshotId?: string;
    timestamp: number;
    description: string;
  }>;
  features: Array<{
    id: string;
    title: string;
    type: string;
    description: string;
    timestamp: number;
  }>;
  stats: {
    totalActions: number;
    totalPages: number;
    totalBugs: number;
    totalFeatures: number;
    totalScreenshots: number;
    duration: number;
  };
}

function formatTs(ts: number): string {
  return new Date(ts).toISOString();
}

function buildTimeline(
  actions: Action[],
  bugs: Bug[],
  features: Feature[],
  screenshots: Screenshot[]
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...actions.map((a): TimelineEntry => ({
      timestamp: a.timestamp,
      type: 'action',
      description: `${a.type}${a.selector ? ` on ${a.selector}` : ''}${a.value ? ` → "${a.value}"` : ''}`,
      url: a.pageUrl,
    })),
    ...bugs.map((b): TimelineEntry => ({
      timestamp: b.timestamp,
      type: 'bug',
      description: `BUG [${b.priority}]: ${b.title}`,
      url: b.url,
    })),
    ...features.map((f): TimelineEntry => ({
      timestamp: f.timestamp,
      type: 'feature',
      description: `FEATURE [${f.featureType}]: ${f.title}`,
      url: f.url,
    })),
    ...screenshots.map((s): TimelineEntry => ({
      timestamp: s.timestamp,
      type: 'screenshot',
      description: `Screenshot captured (${s.width}×${s.height})`,
      url: s.url,
    })),
  ];
  return entries.sort((a, b) => a.timestamp - b.timestamp);
}

function buildPageStats(actions: Action[], session: Session): PageStat[] {
  if (actions.length === 0) {
    return session.pages.map((url) => ({
      url,
      enterTime: session.startedAt,
      exitTime: session.stoppedAt ?? session.startedAt + session.duration,
      actionCount: 0,
    }));
  }

  const pageMap = new Map<string, { first: number; last: number; count: number }>();
  for (const a of actions) {
    const existing = pageMap.get(a.pageUrl);
    if (!existing) {
      pageMap.set(a.pageUrl, { first: a.timestamp, last: a.timestamp, count: 1 });
    } else {
      existing.last = Math.max(existing.last, a.timestamp);
      existing.count++;
    }
  }
  return Array.from(pageMap.entries()).map(([url, v]) => ({
    url,
    enterTime: v.first,
    exitTime: v.last,
    actionCount: v.count,
  }));
}

export function generateJsonReport(
  session: Session,
  bugs: Bug[],
  features: Feature[],
  actions: Action[],
  screenshots: Screenshot[]
): JsonReport {
  const sortedBugs = [...bugs].sort((a, b) => a.priority.localeCompare(b.priority));
  const timeline = buildTimeline(actions, bugs, features, screenshots);
  const pages = buildPageStats(actions, session);

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      refineVersion: VERSION,
      sessionId: session.id,
    },
    session: {
      name: session.name,
      description: session.description,
      startTime: formatTs(session.startedAt),
      endTime: session.stoppedAt ? formatTs(session.stoppedAt) : '',
      duration: session.duration,
      durationFormatted: formatDuration(session.duration),
    },
    pages,
    timeline,
    bugs: sortedBugs.map((b) => ({
      id: b.id,
      title: b.title,
      priority: b.priority,
      url: b.url,
      selector: b.elementSelector,
      screenshotId: b.screenshotId,
      timestamp: b.timestamp,
      description: b.description,
    })),
    features: features.map((f) => ({
      id: f.id,
      title: f.title,
      type: f.featureType,
      description: f.description,
      timestamp: f.timestamp,
    })),
    stats: {
      totalActions: actions.length,
      totalPages: pages.length,
      totalBugs: bugs.length,
      totalFeatures: features.length,
      totalScreenshots: screenshots.length,
      duration: session.duration,
    },
  };
}

export function generateMarkdownReport(
  session: Session,
  bugs: Bug[],
  features: Feature[],
  actions: Action[],
  screenshots: Screenshot[]
): string {
  const sortedBugs = [...bugs].sort((a, b) => a.priority.localeCompare(b.priority));
  const timeline = buildTimeline(actions, bugs, features, screenshots);
  const pages = buildPageStats(actions, session);
  const lines: string[] = [];

  lines.push(`# Session Report: ${session.name}`);
  lines.push('');
  lines.push(`| Field | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Session ID | \`${session.id}\` |`);
  lines.push(`| Started | ${new Date(session.startedAt).toLocaleString()} |`);
  if (session.stoppedAt) {
    lines.push(`| Stopped | ${new Date(session.stoppedAt).toLocaleString()} |`);
  }
  lines.push(`| Duration | ${formatDuration(session.duration)} |`);
  lines.push(`| Status | ${session.status} |`);
  if (session.description) {
    lines.push(`| Description | ${session.description} |`);
  }
  lines.push('');

  lines.push('## Stats');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| Pages visited | ${pages.length} |`);
  lines.push(`| Actions recorded | ${actions.length} |`);
  lines.push(`| Bugs logged | ${bugs.length} |`);
  lines.push(`| Features logged | ${features.length} |`);
  lines.push(`| Screenshots | ${screenshots.length} |`);
  lines.push('');

  if (pages.length > 0) {
    lines.push('## Pages Visited');
    lines.push('');
    lines.push('| URL | Actions |');
    lines.push('|---|---|');
    for (const p of pages) {
      lines.push(`| ${p.url} | ${p.actionCount} |`);
    }
    lines.push('');
  }

  if (sortedBugs.length > 0) {
    lines.push('## Bugs');
    lines.push('');
    for (const bug of sortedBugs) {
      lines.push(`### [${bug.priority}] ${bug.title}`);
      lines.push('');
      lines.push(`- **URL:** ${bug.url}`);
      lines.push(`- **Time:** ${new Date(bug.timestamp).toLocaleTimeString()}`);
      if (bug.elementSelector) {
        lines.push(`- **Selector:** \`${bug.elementSelector}\``);
      }
      if (bug.description) {
        lines.push(`- **Description:** ${bug.description}`);
      }
      lines.push('');
    }
  }

  if (features.length > 0) {
    lines.push('## Feature Requests');
    lines.push('');
    for (const feat of features) {
      lines.push(`### [${feat.featureType}] ${feat.title}`);
      lines.push('');
      if (feat.description) {
        lines.push(feat.description);
        lines.push('');
      }
    }
  }

  if (timeline.length > 0) {
    lines.push('## Timeline');
    lines.push('');
    for (const entry of timeline) {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const tag = entry.type.toUpperCase().padEnd(10);
      lines.push(`- \`${time}\` **${tag}** ${entry.description}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`*Generated by Refine ${VERSION} at ${new Date().toISOString()}*`);

  return lines.join('\n');
}
