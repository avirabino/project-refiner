// ── Vigil Pricing — Single Source of Truth ──────────────────────────────────
// All pricing data for landing page, billing, and Paddle integration.
// Keep in sync with paddle.config.ts when billing is implemented (Track C).

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  priceAnnual?: string;
  period: string;
  sxcPerMonth: string;
  sessionsPerMonth: string;
  features: string[];
  cta: string;
  ctaLink: string;
  featured: boolean;
  badge?: string;
}

export interface TokenPack {
  id: string;
  name: string;
  sxc: string;
  price: string;
  priceUsd: string;
  ctaLink: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '\u20AC0',
    period: 'forever',
    sxcPerMonth: '100 SXC/month',
    sessionsPerMonth: '10 sessions/month',
    features: [
      'Chrome extension',
      'Session recording',
      'Manual bug capture',
      'Management dashboard',
      'Community support',
    ],
    cta: 'Get Started',
    ctaLink: '/auth/register',
    featured: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '\u20AC19',
    priceAnnual: '\u20AC15',
    period: '/month',
    sxcPerMonth: '500 SXC/month',
    sessionsPerMonth: 'Unlimited sessions',
    features: [
      'Everything in Free',
      'AI bug auto-complete',
      'Severity auto-suggest',
      'Session report generation',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/auth/register?plan=pro',
    featured: true,
    badge: 'POPULAR',
  },
  {
    id: 'team',
    name: 'Team',
    price: '\u20AC49',
    priceAnnual: '\u20AC39',
    period: '/month',
    sxcPerMonth: '2,000 SXC/month',
    sessionsPerMonth: 'Unlimited sessions',
    features: [
      'Everything in Pro',
      'vigil_agent auto-fix',
      'Team sharing & collaboration',
      'Advanced analytics',
      'Dedicated support',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/auth/register?plan=team',
    featured: false,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    sxcPerMonth: 'Custom SXC allocation',
    sessionsPerMonth: 'Unlimited sessions',
    features: [
      'Everything in Team',
      'Self-hosted deployment',
      'SLA guarantee',
      'SSO / SAML integration',
      'Custom onboarding',
    ],
    cta: 'Contact Sales',
    ctaLink: 'mailto:sales@synaptixlabs.ai',
    featured: false,
  },
];

export const TOKEN_PACKS: TokenPack[] = [
  {
    id: 'spark',
    name: 'Spark',
    sxc: '200 SXC',
    price: '\u20AC9',
    priceUsd: '$10',
    ctaLink: '/auth/register',
  },
  {
    id: 'flow',
    name: 'Flow',
    sxc: '1,000 SXC',
    price: '\u20AC29',
    priceUsd: '$32',
    ctaLink: '/auth/register',
  },
  {
    id: 'surge',
    name: 'Surge',
    sxc: '5,000 SXC',
    price: '\u20AC99',
    priceUsd: '$109',
    ctaLink: '/auth/register',
  },
];

// ── SXC Cost Reference ──────────────────────────────────────────────────────
export const SXC_COSTS = {
  sessionCapture: 5,
  bugAutoComplete: 2,
  severityAutoSuggest: 1,
  vigilAgentFix: 10,
  sessionReport: 1,
  mcpToolInvocation: 0,
} as const;
