import { HERO } from '../data/content';
import { VigilLogo } from './VigilLogo';

export function HeroSection() {
  return (
    <section
      id="hero"
      className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      {/* Background glow effect */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #22d3ee 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative max-w-4xl mx-auto text-center">
        {/* Logo mark above headline */}
        <div className="flex justify-center mb-8">
          <VigilLogo variant="mark" height={64} />
        </div>

        {/* Headline */}
        <h1
          className="font-ui font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-v-text-primary mb-6"
          style={{ letterSpacing: '-0.03em' }}
        >
          {HERO.headline}
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-v-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          {HERO.subtitle}
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/auth/register"
            className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold bg-v-accent-500 text-black rounded-v-md hover:bg-v-accent-400 hover:shadow-v-glow transition-all duration-150 w-full sm:w-auto"
          >
            {HERO.ctaPrimary}
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </a>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-v-text-primary border border-v-border-default rounded-v-md hover:bg-v-bg-hover hover:border-v-border-strong transition-all duration-150 w-full sm:w-auto"
          >
            {HERO.ctaSecondary}
          </a>
        </div>

        {/* Tech stack badges */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
          {['Chrome Extension', 'rrweb', 'React', 'Claude Code', 'MCP'].map((tech) => (
            <span
              key={tech}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-medium text-v-text-tertiary bg-v-bg-raised border border-v-border-subtle"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
