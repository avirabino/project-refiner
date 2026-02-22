/**
 * @file selector-engine.ts
 * @description Generates the best stable CSS selector for a DOM element.
 * Priority: data-testid > aria-label > id > CSS fallback
 */

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(value);
  return value.replace(/[^\w-]/g, '\\$&');
}

export interface SelectorResult {
  selector: string;
  strategy: 'data-testid' | 'aria-label' | 'id' | 'css' | 'playwright';
  confidence: 'high' | 'medium' | 'low';
}

export function getBestSelector(element: Element): SelectorResult {
  // 1. data-testid — highest confidence
  const testId = element.getAttribute('data-testid');
  if (testId) {
    return {
      selector: `[data-testid="${testId}"]`,
      strategy: 'data-testid',
      confidence: 'high',
    };
  }

  // 2. aria-label — medium confidence
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    return {
      selector: `[aria-label="${cssEscape(ariaLabel)}"]`,
      strategy: 'aria-label',
      confidence: 'medium',
    };
  }

  // 3. id — high confidence
  if (element.id) {
    return {
      selector: `#${cssEscape(element.id)}`,
      strategy: 'id',
      confidence: 'high',
    };
  }

  // 4. role + accessible name — medium confidence (Playwright-native)
  const role = element.getAttribute('role');
  const name = (element as HTMLElement).innerText?.trim().slice(0, 50);
  if (role && name) {
    return {
      selector: `[role="${role}"]:has-text("${name.replace(/"/g, '\\"')}")`,
      strategy: 'playwright',
      confidence: 'medium',
    };
  }

  // 5. CSS fallback — low confidence
  return {
    selector: buildCssSelector(element),
    strategy: 'css',
    confidence: 'low',
  };
}

function buildCssSelector(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.documentElement) {
    let part = current.tagName.toLowerCase();

    const classes = Array.from(current.classList)
      .filter((c) => !/^(active|hover|focus|selected|disabled|is-|has-)/.test(c))
      .slice(0, 2);

    if (classes.length > 0) {
      part += classes.map((c) => `.${cssEscape(c)}`).join('');
    }

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        part += `:nth-child(${idx})`;
      }
    }

    parts.unshift(part);
    current = current.parentElement;

    if (parts.length >= 4) break;
  }

  return parts.join(' > ');
}
