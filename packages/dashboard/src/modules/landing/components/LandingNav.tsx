import { useState } from 'react';
import { VigilLogo } from './VigilLogo';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '/docs' },
] as const;

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-v-bg-base/80 backdrop-blur-md border-b border-v-border-subtle"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex-shrink-0" aria-label="Vigil home">
            <VigilLogo variant="full" height={32} />
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-v-text-secondary hover:text-v-text-primary transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="/auth/login"
              className="text-sm font-medium text-v-text-secondary hover:text-v-text-primary transition-colors duration-150 px-3 py-2"
            >
              Sign In
            </a>
            <a
              href="/auth/register"
              className="text-sm font-medium bg-v-accent-500 text-black px-4 py-2 rounded-v-md hover:bg-v-accent-400 hover:shadow-v-glow transition-all duration-150"
            >
              Sign Up
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-2 rounded-v-md text-v-text-secondary hover:text-v-text-primary hover:bg-v-bg-hover transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div id="mobile-menu" className="md:hidden border-t border-v-border-subtle bg-v-bg-raised">
          <div className="px-4 py-4 space-y-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block px-3 py-2 text-sm font-medium text-v-text-secondary hover:text-v-text-primary hover:bg-v-bg-hover rounded-v-md transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-3 border-t border-v-border-subtle space-y-2">
              <a
                href="/auth/login"
                className="block px-3 py-2 text-sm font-medium text-v-text-secondary hover:text-v-text-primary hover:bg-v-bg-hover rounded-v-md transition-colors"
              >
                Sign In
              </a>
              <a
                href="/auth/register"
                className="block px-3 py-2.5 text-sm font-medium bg-v-accent-500 text-black rounded-v-md text-center hover:bg-v-accent-400 transition-colors"
              >
                Sign Up
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
