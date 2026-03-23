import { FOOTER } from '../data/content';
import { VigilLogo } from './VigilLogo';

export function Footer() {
  return (
    <footer className="border-t border-v-border-subtle bg-v-bg-raised" role="contentinfo">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <VigilLogo variant="full" height={28} />
            <p className="mt-4 text-sm text-v-text-tertiary leading-relaxed max-w-xs">
              Bug discovery and resolution platform by SynaptixLabs. Find bugs before your users do.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-xs font-semibold text-v-text-secondary uppercase tracking-wider mb-4">
              Product
            </h4>
            <ul className="space-y-2.5">
              {FOOTER.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-v-text-tertiary hover:text-v-text-primary transition-colors duration-150"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="text-xs font-semibold text-v-text-secondary uppercase tracking-wider mb-4">
              Company
            </h4>
            <ul className="space-y-2.5">
              {FOOTER.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-v-text-tertiary hover:text-v-text-primary transition-colors duration-150"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="text-xs font-semibold text-v-text-secondary uppercase tracking-wider mb-4">
              Legal
            </h4>
            <ul className="space-y-2.5">
              {FOOTER.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-v-text-tertiary hover:text-v-text-primary transition-colors duration-150"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-v-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-v-text-ghost">
            {FOOTER.copyright}
          </p>
          <div className="flex items-center gap-4">
            {/* GitHub link */}
            <a
              href="https://github.com/SynaptixLabs/vigil"
              target="_blank"
              rel="noopener noreferrer"
              className="text-v-text-ghost hover:text-v-text-secondary transition-colors"
              aria-label="Vigil on GitHub"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
