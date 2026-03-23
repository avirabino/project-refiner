import { CTA_SECTION } from '../data/content';

export function CTASection() {
  return (
    <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-center">
        {/* Glow backdrop */}
        <div className="relative">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] rounded-full opacity-20 blur-[100px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, #22d3ee 0%, transparent 70%)' }}
            aria-hidden="true"
          />

          <div className="relative bg-v-bg-raised border border-v-border-subtle rounded-v-2xl p-10 sm:p-16">
            <h2
              className="font-ui font-bold text-3xl sm:text-4xl text-v-text-primary mb-4"
              style={{ letterSpacing: '-0.02em' }}
            >
              {CTA_SECTION.headline}
            </h2>

            <p className="text-v-text-secondary text-lg mb-8 max-w-lg mx-auto">
              {CTA_SECTION.subtitle}
            </p>

            <a
              href={CTA_SECTION.ctaLink}
              className="inline-flex items-center justify-center px-10 py-4 text-lg font-semibold bg-v-accent-500 text-black rounded-v-md hover:bg-v-accent-400 hover:shadow-v-glow transition-all duration-150"
            >
              {CTA_SECTION.cta}
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
