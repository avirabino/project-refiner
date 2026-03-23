// ── Landing Page Copy — Single Source of Truth ──────────────────────────────
// All text content for the landing page in one place.

export const HERO = {
  headline: 'Find bugs before your users do',
  subtitle:
    'Vigil is a bug discovery and resolution platform that records browser sessions, captures bugs inline, and auto-fixes them with AI — all from a Chrome extension.',
  ctaPrimary: 'Start Free',
  ctaSecondary: 'See How It Works',
} as const;

export const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: 'Record',
    description:
      'Install the Chrome extension and start a session. Vigil records every DOM change, click, and navigation using rrweb — zero performance impact.',
  },
  {
    step: 2,
    title: 'Capture',
    description:
      'Found a bug? Click the bug button. Vigil captures a screenshot, DOM state, console logs, and network context — all tied to the exact moment in the recording.',
  },
  {
    step: 3,
    title: 'Resolve',
    description:
      'AI auto-completes bug details and suggests severity. vigil_agent proposes a fix, opens a PR, and runs regression tests — automatically.',
  },
] as const;

export const FEATURES = [
  {
    id: 'session-recording',
    title: 'Session Recording',
    description:
      'Full DOM replay powered by rrweb. Every click, scroll, and mutation captured with pixel-perfect fidelity.',
    icon: 'record',
  },
  {
    id: 'inline-bug-capture',
    title: 'Inline Bug Capture',
    description:
      'Report bugs without leaving the page. Screenshot, console logs, network state, and DOM context — captured in one click.',
    icon: 'bug',
  },
  {
    id: 'ai-auto-complete',
    title: 'AI Auto-Complete',
    description:
      'AI analyzes the recording context and auto-fills bug title, steps to reproduce, expected vs actual behavior, and severity.',
    icon: 'ai',
  },
  {
    id: 'vigil-agent',
    title: 'vigil_agent Auto-Fix',
    description:
      'An autonomous agent reads the bug, locates the code, proposes a fix, opens a branch, and runs tests — all without human intervention.',
    icon: 'agent',
  },
  {
    id: 'mcp-integration',
    title: 'MCP Integration',
    description:
      'Expose bugs, sessions, and projects as MCP tools. Claude Code can query and resolve bugs directly from the terminal.',
    icon: 'mcp',
  },
  {
    id: 'management-dashboard',
    title: 'Management Dashboard',
    description:
      'Track all sessions, bugs, and features across projects. Filter by sprint, severity, and status. Replay any session.',
    icon: 'dashboard',
  },
] as const;

export const CTA_SECTION = {
  headline: 'Start free \u2014 no credit card required',
  subtitle:
    'Get 100 SXC tokens and 10 sessions per month. Upgrade anytime.',
  cta: 'Create Free Account',
  ctaLink: '/auth/register',
} as const;

export const FOOTER = {
  copyright: `\u00A9 ${new Date().getFullYear()} SynaptixLabs. All rights reserved.`,
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Documentation', href: '/docs' },
    { label: 'Changelog', href: '/changelog' },
  ],
  company: [
    { label: 'About', href: 'https://synaptixlabs.ai' },
    { label: 'Blog', href: 'https://synaptixlabs.ai/blog' },
    { label: 'Contact', href: 'mailto:hello@synaptixlabs.ai' },
  ],
  legal: [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
} as const;

export const SEO = {
  title: 'Vigil — Find Bugs Before Your Users Do',
  description:
    'Bug discovery and resolution platform. Record browser sessions, capture bugs inline, and auto-fix them with AI. Chrome extension + management dashboard.',
  ogTitle: 'Vigil — Bug Discovery & Resolution Platform',
  ogDescription:
    'Record sessions. Capture bugs. Resolve with AI. Vigil is the developer-first bug hunting platform by SynaptixLabs.',
  ogUrl: 'https://vigil.synaptixlabs.ai',
  ogImage: 'https://vigil.synaptixlabs.ai/og-image.png',
} as const;
