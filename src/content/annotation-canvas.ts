/**
 * @file annotation-canvas.ts
 * @description Light DOM SVG canvas for visual annotations.
 * Lives OUTSIDE #refine-root so rrweb captures annotations in recordings
 * and captureVisibleTab() includes them in screenshots.
 *
 * Architecture:
 *   document.body → <svg id="vigil-annotation-canvas"> (light DOM)
 *   Shapes rendered with inline styles only (no CSS classes — avoids host page interference).
 *   pointer-events: none by default; flipped to "auto" during draw mode.
 */

import type { Annotation } from '@shared/types';
import {
  getAnnotationState,
  getAnnotations,
  getTool,
  setDrawing,
  addAnnotation,
  updateAnnotation,
  selectAnnotation,
  generateAnnotationId,
  createAnnotationBase,
  ANNOTATION_EVENTS,
  type AnnotationTool,
} from './annotation-state';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CANVAS_ID = 'vigil-annotation-canvas';
const CANVAS_Z = '2147483646'; // one below #refine-root

/** GOD MODE: Prevent Vigil interactions from reaching the host app. */
function stopPropagationHandler(e: Event): void { e.stopPropagation(); }

let svgCanvas: SVGSVGElement | null = null;

// ── Drawing state ─────────────────────────────────────────────────────────────

interface DrawState {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  previewEl: SVGElement | null;
  freehandPoints: Array<{ x: number; y: number }>;
}

const draw: DrawState = {
  active: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  previewEl: null,
  freehandPoints: [],
};

// ── Interaction state (drag / resize) ────────────────────────────────────────

type HandleDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
const HANDLE_SIZE = 7;
const MIN_SHAPE_SIZE = 20;

interface InteractionState {
  mode: 'idle' | 'dragging' | 'resizing';
  targetId: string | null;
  startX: number;
  startY: number;
  handleDir: HandleDir | null;
  /** Original shape geometry captured at drag/resize start */
  origRect: { x: number; y: number; width: number; height: number } | null;
  origCircle: { cx: number; cy: number; rx: number; ry: number } | null;
  origPath: string | null;
}

const interact: InteractionState = {
  mode: 'idle',
  targetId: null,
  startX: 0,
  startY: 0,
  handleDir: null,
  origRect: null,
  origCircle: null,
  origPath: null,
};

/** Block syncCanvas while dragging/resizing to prevent SVG flicker */
let blockSync = false;

// ── Mount / Unmount ───────────────────────────────────────────────────────────

export function mountAnnotationCanvas(): void {
  if (svgCanvas) return;

  svgCanvas = document.createElementNS(SVG_NS, 'svg');
  svgCanvas.id = CANVAS_ID;
  svgCanvas.setAttribute('xmlns', SVG_NS);
  svgCanvas.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'width: 100vw',
    'height: 100vh',
    `z-index: ${CANVAS_Z}`,
    'pointer-events: none',
    'overflow: visible',
  ].join('; ');

  document.body.appendChild(svgCanvas);

  // Listen for state changes
  document.addEventListener(ANNOTATION_EVENTS.UPDATED, handleAnnotationsUpdated);
  document.addEventListener(ANNOTATION_EVENTS.TOOL_CHANGED, handleToolChanged as EventListener);

  console.log('[Vigil] Annotation canvas mounted');
}

export function unmountAnnotationCanvas(): void {
  disableDrawMode();
  document.removeEventListener(ANNOTATION_EVENTS.UPDATED, handleAnnotationsUpdated);
  document.removeEventListener(ANNOTATION_EVENTS.TOOL_CHANGED, handleToolChanged as EventListener);

  if (svgCanvas) {
    svgCanvas.remove();
    svgCanvas = null;
  }
  console.log('[Vigil] Annotation canvas unmounted');
}

// ── Event handlers ────────────────────────────────────────────────────────────

function handleAnnotationsUpdated(): void {
  syncCanvas(getAnnotations() as Annotation[]);
}

function handleToolChanged(e: CustomEvent<{ tool: AnnotationTool }>): void {
  const tool = e.detail?.tool;
  if (tool === 'comment') {
    enableCommentMode();
  } else if (tool) {
    enableDrawMode(tool);
  } else {
    disableDrawMode();
    disableCommentMode();
  }
}

// ── Draw mode ─────────────────────────────────────────────────────────────────

function enableDrawMode(_tool: AnnotationTool): void {
  if (!svgCanvas) return;
  svgCanvas.style.pointerEvents = 'auto';
  svgCanvas.style.cursor = 'crosshair';

  svgCanvas.addEventListener('mousedown', onMouseDown);
  svgCanvas.addEventListener('mousemove', onMouseMove);
  svgCanvas.addEventListener('mouseup', onMouseUp);

  // GOD MODE: Stop events from bubbling to the host app during annotation draw mode.
  // Uses BUBBLE phase so draw handlers (onMouseDown/Move/Up) fire first.
  svgCanvas.addEventListener('click', stopPropagationHandler, false);
  svgCanvas.addEventListener('mousedown', stopPropagationHandler, false);
  svgCanvas.addEventListener('mouseup', stopPropagationHandler, false);
  svgCanvas.addEventListener('pointerdown', stopPropagationHandler, false);
  svgCanvas.addEventListener('pointerup', stopPropagationHandler, false);
}

function disableDrawMode(): void {
  if (!svgCanvas) return;
  svgCanvas.style.pointerEvents = 'none';
  svgCanvas.style.cursor = 'default';

  svgCanvas.removeEventListener('mousedown', onMouseDown);
  svgCanvas.removeEventListener('mousemove', onMouseMove);
  svgCanvas.removeEventListener('mouseup', onMouseUp);
  svgCanvas.removeEventListener('click', stopPropagationHandler, false);
  svgCanvas.removeEventListener('mousedown', stopPropagationHandler, false);
  svgCanvas.removeEventListener('mouseup', stopPropagationHandler, false);
  svgCanvas.removeEventListener('pointerdown', stopPropagationHandler, false);
  svgCanvas.removeEventListener('pointerup', stopPropagationHandler, false);

  // Clean up preview
  if (draw.previewEl) {
    draw.previewEl.remove();
    draw.previewEl = null;
  }
  draw.active = false;
  setDrawing(false);
}

// ── Comment pin cursor mode (Vercel-style) ───────────────────────────────────

const COMMENT_PIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='28' viewBox='0 0 24 28'><path d='M12 0C5.4 0 0 5.4 0 12c0 9 12 16 12 16s12-7 12-16C24 5.4 18.6 0 12 0z' fill='%23ef4444'/><circle cx='12' cy='11' r='5' fill='white'/></svg>`;

function enableCommentMode(): void {
  if (!svgCanvas) return;
  svgCanvas.style.pointerEvents = 'auto';
  svgCanvas.style.cursor = `url("data:image/svg+xml,${encodeURIComponent(COMMENT_PIN_SVG)}") 12 26, crosshair`;

  // Remove draw-mode listeners (if leftover) but don't add them — comments use the overlay editor click handler
  svgCanvas.removeEventListener('mousedown', onMouseDown);
  svgCanvas.removeEventListener('mousemove', onMouseMove);
  svgCanvas.removeEventListener('mouseup', onMouseUp);

  // GOD MODE: Stop events from bubbling to the host app during comment mode
  svgCanvas.addEventListener('click', stopPropagationHandler, false);
  svgCanvas.addEventListener('mousedown', stopPropagationHandler, false);
  svgCanvas.addEventListener('pointerdown', stopPropagationHandler, false);
}

function disableCommentMode(): void {
  if (!svgCanvas) return;
  // Only reset if we're not in another mode
  if (getTool() === null) {
    svgCanvas.style.pointerEvents = 'none';
    svgCanvas.style.cursor = 'default';
  }
  // GOD MODE: Remove propagation blockers
  svgCanvas.removeEventListener('click', stopPropagationHandler, false);
  svgCanvas.removeEventListener('mousedown', stopPropagationHandler, false);
  svgCanvas.removeEventListener('pointerdown', stopPropagationHandler, false);
}

// ── Mouse handlers ────────────────────────────────────────────────────────────

function onMouseDown(e: MouseEvent): void {
  const tool = getTool();
  if (!tool || tool === 'comment') return;

  e.preventDefault();
  e.stopPropagation();

  draw.active = true;
  draw.startX = e.clientX;
  draw.startY = e.clientY;
  draw.currentX = e.clientX;
  draw.currentY = e.clientY;
  draw.freehandPoints = [{ x: e.clientX, y: e.clientY }];
  setDrawing(true);

  // Create preview element
  if (tool === 'rectangle') {
    draw.previewEl = createSvgRect(e.clientX, e.clientY, 0, 0, '#ef4444', 2, true);
  } else if (tool === 'circle') {
    draw.previewEl = createSvgEllipse(e.clientX, e.clientY, 0, 0, '#ef4444', 2, true);
  } else if (tool === 'freehand') {
    draw.previewEl = createSvgPath('', '#ef4444', 2, true);
  }

  if (draw.previewEl && svgCanvas) {
    svgCanvas.appendChild(draw.previewEl);
  }
}

function onMouseMove(e: MouseEvent): void {
  if (!draw.active || !draw.previewEl) return;
  const tool = getTool();
  if (!tool) return;

  draw.currentX = e.clientX;
  draw.currentY = e.clientY;

  if (tool === 'rectangle') {
    const x = Math.min(draw.startX, draw.currentX);
    const y = Math.min(draw.startY, draw.currentY);
    const w = Math.abs(draw.currentX - draw.startX);
    const h = Math.abs(draw.currentY - draw.startY);
    draw.previewEl.setAttribute('x', String(x));
    draw.previewEl.setAttribute('y', String(y));
    draw.previewEl.setAttribute('width', String(w));
    draw.previewEl.setAttribute('height', String(h));
  } else if (tool === 'circle') {
    const cx = (draw.startX + draw.currentX) / 2;
    const cy = (draw.startY + draw.currentY) / 2;
    const rx = Math.abs(draw.currentX - draw.startX) / 2;
    const ry = Math.abs(draw.currentY - draw.startY) / 2;
    draw.previewEl.setAttribute('cx', String(cx));
    draw.previewEl.setAttribute('cy', String(cy));
    draw.previewEl.setAttribute('rx', String(rx));
    draw.previewEl.setAttribute('ry', String(ry));
  } else if (tool === 'freehand') {
    draw.freehandPoints.push({ x: e.clientX, y: e.clientY });
    draw.previewEl.setAttribute('d', pointsToSvgPath(draw.freehandPoints));
  }
}

function onMouseUp(e: MouseEvent): void {
  if (!draw.active) return;
  const tool = getTool();
  if (!tool) return;

  e.preventDefault();
  e.stopPropagation();

  // Remove preview
  if (draw.previewEl) {
    draw.previewEl.remove();
    draw.previewEl = null;
  }

  draw.active = false;
  setDrawing(false);

  // Check minimum size to avoid accidental clicks
  const dx = Math.abs(draw.currentX - draw.startX);
  const dy = Math.abs(draw.currentY - draw.startY);
  if (tool !== 'freehand' && dx < 5 && dy < 5) return;
  if (tool === 'freehand' && draw.freehandPoints.length < 3) return;

  // Create annotation
  const base = createAnnotationBase(tool);
  const id = generateAnnotationId();

  if (tool === 'rectangle') {
    const annotation: Annotation = {
      ...base,
      id,
      rect: {
        x: Math.min(draw.startX, draw.currentX),
        y: Math.min(draw.startY, draw.currentY),
        width: dx,
        height: dy,
      },
    };
    addAnnotation(annotation);
  } else if (tool === 'circle') {
    const annotation: Annotation = {
      ...base,
      id,
      circle: {
        cx: (draw.startX + draw.currentX) / 2,
        cy: (draw.startY + draw.currentY) / 2,
        rx: dx / 2,
        ry: dy / 2,
      },
    };
    addAnnotation(annotation);
  } else if (tool === 'freehand') {
    const annotation: Annotation = {
      ...base,
      id,
      freehand: {
        pathData: pointsToSvgPath(draw.freehandPoints),
      },
    };
    addAnnotation(annotation);
  }
}

// ── Canvas rendering ──────────────────────────────────────────────────────────

export function syncCanvas(annotations: Annotation[]): void {
  // Allow sync when annotations is empty (clear-all) even if blockSync is set
  if (!svgCanvas || (blockSync && annotations.length > 0)) return;

  // Safety: if we get here during a blocked state (empty annotations), reset it
  if (blockSync) {
    blockSync = false;
    interact.mode = 'idle';
    interact.targetId = null;
    document.removeEventListener('mousemove', onInteractMove);
    document.removeEventListener('mouseup', onInteractUp);
  }

  // Clear all existing rendered annotations (preserve preview if drawing)
  const children = Array.from(svgCanvas.children);
  for (const child of children) {
    if (child !== draw.previewEl) {
      child.remove();
    }
  }

  const { selectedId } = getAnnotationState();

  for (const ann of annotations) {
    const isSelected = ann.id === selectedId;

    if (ann.kind === 'rectangle' && ann.rect) {
      const el = createSvgRect(
        ann.rect.x, ann.rect.y,
        ann.rect.width, ann.rect.height,
        ann.color, ann.strokeWidth, false,
      );
      el.dataset.annotationId = ann.id;
      makeShapeClickable(el);
      if (isSelected) applySelection(el, ann);
      svgCanvas.appendChild(el);
    } else if (ann.kind === 'circle' && ann.circle) {
      const el = createSvgEllipse(
        ann.circle.cx, ann.circle.cy,
        ann.circle.rx, ann.circle.ry,
        ann.color, ann.strokeWidth, false,
      );
      el.dataset.annotationId = ann.id;
      makeShapeClickable(el);
      if (isSelected) applySelection(el, ann);
      svgCanvas.appendChild(el);
    } else if (ann.kind === 'freehand' && ann.freehand) {
      const el = createSvgPath(
        ann.freehand.pathData,
        ann.color, ann.strokeWidth, false,
      );
      el.dataset.annotationId = ann.id;
      makeShapeClickable(el);
      if (isSelected) applySelection(el, ann);
      svgCanvas.appendChild(el);
    } else if (ann.kind === 'comment' && ann.comment) {
      const el = createCommentPin(ann.comment.x, ann.comment.y, ann.color, isSelected, ann);
      el.dataset.annotationId = ann.id;
      svgCanvas.appendChild(el);
    }
  }
}

// ── SVG element factories ─────────────────────────────────────────────────────

function createSvgRect(
  x: number, y: number, w: number, h: number,
  color: string, strokeWidth: number, isPreview: boolean,
): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(x));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(w));
  rect.setAttribute('height', String(h));
  rect.style.cssText = `fill: transparent; stroke: ${color}; stroke-width: ${strokeWidth}; opacity: ${isPreview ? 0.6 : 1};`;
  return rect;
}

function createSvgEllipse(
  cx: number, cy: number, rx: number, ry: number,
  color: string, strokeWidth: number, isPreview: boolean,
): SVGEllipseElement {
  const ellipse = document.createElementNS(SVG_NS, 'ellipse');
  ellipse.setAttribute('cx', String(cx));
  ellipse.setAttribute('cy', String(cy));
  ellipse.setAttribute('rx', String(rx));
  ellipse.setAttribute('ry', String(ry));
  ellipse.style.cssText = `fill: transparent; stroke: ${color}; stroke-width: ${strokeWidth}; opacity: ${isPreview ? 0.6 : 1};`;
  return ellipse;
}

function createSvgPath(
  d: string, color: string, strokeWidth: number, isPreview: boolean,
): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d || 'M0,0');
  path.style.cssText = `fill: none; stroke: ${color}; stroke-width: ${strokeWidth}; stroke-linecap: round; stroke-linejoin: round; opacity: ${isPreview ? 0.6 : 1};`;
  return path;
}

function createCommentPin(
  x: number, y: number, color: string, isSelected: boolean, ann: Annotation,
): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.style.cssText = 'cursor: pointer; pointer-events: auto;';

  // Drop shadow
  const shadow = document.createElementNS(SVG_NS, 'circle');
  shadow.setAttribute('cx', String(x));
  shadow.setAttribute('cy', String(y));
  shadow.setAttribute('r', '14');
  shadow.style.cssText = 'fill: rgba(0,0,0,0.3); filter: blur(3px);';
  g.appendChild(shadow);

  // Pin circle
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', String(x));
  circle.setAttribute('cy', String(y));
  circle.setAttribute('r', '12');
  circle.style.cssText = `fill: ${color}; stroke: #fff; stroke-width: 2;${isSelected ? ' filter: drop-shadow(0 0 4px rgba(99,102,241,0.8));' : ''}`;
  g.appendChild(circle);

  // Chat icon (simple speech bubble)
  const icon = document.createElementNS(SVG_NS, 'text');
  icon.setAttribute('x', String(x));
  icon.setAttribute('y', String(y + 1));
  icon.setAttribute('text-anchor', 'middle');
  icon.setAttribute('dominant-baseline', 'central');
  icon.style.cssText = 'fill: #fff; font-size: 12px; font-family: sans-serif; pointer-events: none; user-select: none;';
  icon.textContent = '💬';
  g.appendChild(icon);

  // ── Hover tooltip ──────────────────────────────────────────────────────────
  let tooltipEl: SVGForeignObjectElement | null = null;

  g.addEventListener('mouseenter', () => {
    if (interact.mode !== 'idle') return; // Don't show tooltip while dragging
    const text = ann.commentText || (ann.commentEntityType === 'bug' ? '🐛 Bug' : '✨ Feature');
    tooltipEl = document.createElementNS(SVG_NS, 'foreignObject');
    // Clamp tooltip inside viewport
    const ttW = 200, ttH = 40, ttMargin = 8;
    let ttX = x - ttW / 2;
    let ttY = y - ttH - 16; // above the pin
    if (ttX < ttMargin) ttX = ttMargin;
    if (ttX + ttW > window.innerWidth - ttMargin) ttX = window.innerWidth - ttW - ttMargin;
    if (ttY < ttMargin) ttY = y + 24; // below the pin if clipping top
    tooltipEl.setAttribute('x', String(ttX));
    tooltipEl.setAttribute('y', String(ttY));
    tooltipEl.setAttribute('width', String(ttW));
    tooltipEl.setAttribute('height', String(ttH));
    tooltipEl.style.cssText = 'pointer-events: none; overflow: visible;';

    const div = document.createElement('div');
    div.style.cssText = [
      'background: #1e1e2e',
      'color: #e0e0e0',
      'font-size: 11px',
      'font-family: -apple-system, BlinkMacSystemFont, sans-serif',
      'padding: 4px 8px',
      'border-radius: 6px',
      'border: 1px solid #333',
      'box-shadow: 0 2px 8px rgba(0,0,0,0.4)',
      'white-space: nowrap',
      'overflow: hidden',
      'text-overflow: ellipsis',
      'max-width: 200px',
      'text-align: center',
      'pointer-events: none',
    ].join('; ');
    div.textContent = text;
    tooltipEl.appendChild(div);
    g.appendChild(tooltipEl);
  });

  g.addEventListener('mouseleave', () => {
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }
  });

  // ── Drag-to-reposition ────────────────────────────────────────────────────
  let pinWasDragged = false;

  g.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    pinWasDragged = false;
    const origX = x, origY = y;
    const startX = e.clientX, startY = e.clientY;
    let moved = false;

    const onPinMove = (me: MouseEvent) => {
      const pdx = me.clientX - startX;
      const pdy = me.clientY - startY;
      if (Math.abs(pdx) > 3 || Math.abs(pdy) > 3) moved = true;
      if (!moved) return;

      // Remove tooltip during drag
      if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }

      // Update all child elements' positions
      const nx = origX + pdx;
      const ny = origY + pdy;
      shadow.setAttribute('cx', String(nx));
      shadow.setAttribute('cy', String(ny));
      circle.setAttribute('cx', String(nx));
      circle.setAttribute('cy', String(ny));
      icon.setAttribute('x', String(nx));
      icon.setAttribute('y', String(ny + 1));
    };

    const onPinUp = (ue: MouseEvent) => {
      document.removeEventListener('mousemove', onPinMove);
      document.removeEventListener('mouseup', onPinUp);

      if (moved) {
        pinWasDragged = true;
        const fdx = ue.clientX - startX;
        const fdy = ue.clientY - startY;
        updateAnnotation(ann.id, { comment: { x: origX + fdx, y: origY + fdy } });
      }
    };

    document.addEventListener('mousemove', onPinMove);
    document.addEventListener('mouseup', onPinUp);
  });

  // ── Click handler — select only (only if not dragged) ──────────────────────
  g.addEventListener('click', (e) => {
    e.stopPropagation();
    // If we just finished a drag, don't select
    if (pinWasDragged) { pinWasDragged = false; return; }
    const annId = g.dataset.annotationId;
    if (annId) {
      selectAnnotation(annId);
      // NOTE: Don't dispatch COMMENT_REQUEST here — single click only selects.
      // Double-click dispatches COMMENT_REQUEST with editMode: true (below).
    }
  });

  // ── Double-click — edit existing comment ──────────────────────────────────
  g.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    const annId = g.dataset.annotationId;
    if (annId) {
      selectAnnotation(annId);
      document.dispatchEvent(
        new CustomEvent(ANNOTATION_EVENTS.COMMENT_REQUEST, { detail: { annotationId: annId, editMode: true } }),
      );
    }
  });

  return g;
}

// ── Selection visual + resize handles ────────────────────────────────────────

/** Make all shapes click-to-select (pointer-events: auto, cursor, click handler). */
function makeShapeClickable(el: SVGElement): void {
  el.style.pointerEvents = 'auto';
  el.style.cursor = 'pointer';
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    const annId = el.dataset.annotationId;
    if (annId) selectAnnotation(annId);
  });
}

function applySelection(el: SVGElement, ann: Annotation): void {
  el.style.strokeDasharray = '6 3';
  el.style.filter = 'drop-shadow(0 0 3px rgba(99, 102, 241, 0.8))';
  el.style.pointerEvents = 'auto';
  el.style.cursor = 'move';

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    const annId = (el as SVGElement & { dataset: DOMStringMap }).dataset.annotationId;
    if (annId) selectAnnotation(annId);
  });

  // Drag start on shape body
  el.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const annId = el.dataset.annotationId;
    if (!annId) return;
    interact.mode = 'dragging';
    interact.targetId = annId;
    interact.startX = e.clientX;
    interact.startY = e.clientY;
    interact.handleDir = null;

    if (ann.rect) {
      interact.origRect = { ...ann.rect };
      interact.origCircle = null;
      interact.origPath = null;
    } else if (ann.circle) {
      interact.origCircle = { ...ann.circle };
      interact.origRect = null;
      interact.origPath = null;
    } else if (ann.freehand) {
      interact.origPath = ann.freehand.pathData;
      interact.origRect = null;
      interact.origCircle = null;
    }

    blockSync = true;
    document.addEventListener('mousemove', onInteractMove);
    document.addEventListener('mouseup', onInteractUp);
  });

  // Add resize handles for rect / circle (not freehand)
  if ((ann.kind === 'rectangle' || ann.kind === 'circle') && svgCanvas) {
    const bbox = getAnnotationBBox(ann);
    if (bbox) addResizeHandles(bbox, ann);
  }
}

function getAnnotationBBox(ann: Annotation): { x: number; y: number; w: number; h: number } | null {
  if (ann.rect) return { x: ann.rect.x, y: ann.rect.y, w: ann.rect.width, h: ann.rect.height };
  if (ann.circle) return {
    x: ann.circle.cx - ann.circle.rx,
    y: ann.circle.cy - ann.circle.ry,
    w: ann.circle.rx * 2,
    h: ann.circle.ry * 2,
  };
  return null;
}

const HANDLE_CURSORS: Record<HandleDir, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize', e: 'e-resize',
  se: 'se-resize', s: 's-resize', sw: 'sw-resize', w: 'w-resize',
};

function addResizeHandles(bbox: { x: number; y: number; w: number; h: number }, ann: Annotation): void {
  if (!svgCanvas) return;
  const { x, y, w, h } = bbox;
  const positions: Array<{ dir: HandleDir; cx: number; cy: number }> = [
    { dir: 'nw', cx: x, cy: y },
    { dir: 'n',  cx: x + w / 2, cy: y },
    { dir: 'ne', cx: x + w, cy: y },
    { dir: 'e',  cx: x + w, cy: y + h / 2 },
    { dir: 'se', cx: x + w, cy: y + h },
    { dir: 's',  cx: x + w / 2, cy: y + h },
    { dir: 'sw', cx: x, cy: y + h },
    { dir: 'w',  cx: x, cy: y + h / 2 },
  ];

  for (const { dir, cx, cy } of positions) {
    const handle = document.createElementNS(SVG_NS, 'rect');
    handle.setAttribute('x', String(cx - HANDLE_SIZE / 2));
    handle.setAttribute('y', String(cy - HANDLE_SIZE / 2));
    handle.setAttribute('width', String(HANDLE_SIZE));
    handle.setAttribute('height', String(HANDLE_SIZE));
    handle.style.cssText = `fill: #fff; stroke: #6366f1; stroke-width: 1; cursor: ${HANDLE_CURSORS[dir]}; pointer-events: auto;`;
    handle.dataset.handleDir = dir;
    handle.dataset.annotationId = ann.id;

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      interact.mode = 'resizing';
      interact.targetId = ann.id;
      interact.startX = e.clientX;
      interact.startY = e.clientY;
      interact.handleDir = dir;

      if (ann.rect) {
        interact.origRect = { ...ann.rect };
        interact.origCircle = null;
      } else if (ann.circle) {
        interact.origCircle = { ...ann.circle };
        interact.origRect = null;
      }
      interact.origPath = null;

      blockSync = true;
      document.addEventListener('mousemove', onInteractMove);
      document.addEventListener('mouseup', onInteractUp);
    });

    svgCanvas.appendChild(handle);
  }
}

// ── Interaction mouse handlers (drag / resize) ──────────────────────────────

/** Reposition all 8 resize handles to match a new bounding box. */
function repositionHandles(bbox: { x: number; y: number; w: number; h: number }): void {
  if (!svgCanvas) return;
  const { x, y, w, h } = bbox;
  const positions: Record<string, { cx: number; cy: number }> = {
    nw: { cx: x, cy: y },
    n:  { cx: x + w / 2, cy: y },
    ne: { cx: x + w, cy: y },
    e:  { cx: x + w, cy: y + h / 2 },
    se: { cx: x + w, cy: y + h },
    s:  { cx: x + w / 2, cy: y + h },
    sw: { cx: x, cy: y + h },
    w:  { cx: x, cy: y + h / 2 },
  };
  const handles = svgCanvas.querySelectorAll('[data-handle-dir]');
  for (const handle of handles) {
    const dir = (handle as HTMLElement).dataset.handleDir;
    if (dir && positions[dir]) {
      handle.setAttribute('x', String(positions[dir].cx - HANDLE_SIZE / 2));
      handle.setAttribute('y', String(positions[dir].cy - HANDLE_SIZE / 2));
    }
  }
}

function onInteractMove(e: MouseEvent): void {
  if (interact.mode === 'idle' || !interact.targetId || !svgCanvas) return;
  e.preventDefault();

  const dx = e.clientX - interact.startX;
  const dy = e.clientY - interact.startY;
  const annId = interact.targetId;

  // Find the main shape element by data-annotationId (skip handles)
  const el = svgCanvas.querySelector(`[data-annotation-id="${annId}"]:not([data-handle-dir])`) as SVGElement | null
    ?? svgCanvas.querySelector(`[data-annotationid="${annId}"]`) as SVGElement | null;

  if (interact.mode === 'dragging') {
    if (interact.origRect && el) {
      const nx = interact.origRect.x + dx;
      const ny = interact.origRect.y + dy;
      el.setAttribute('x', String(nx));
      el.setAttribute('y', String(ny));
      // Move handles along with the shape
      const o = interact.origRect;
      repositionHandles({ x: nx, y: ny, w: o.width, h: o.height });
    } else if (interact.origCircle && el) {
      const ncx = interact.origCircle.cx + dx;
      const ncy = interact.origCircle.cy + dy;
      el.setAttribute('cx', String(ncx));
      el.setAttribute('cy', String(ncy));
      // Move handles along with the shape
      const o = interact.origCircle;
      repositionHandles({ x: ncx - o.rx, y: ncy - o.ry, w: o.rx * 2, h: o.ry * 2 });
    } else if (interact.origPath && el) {
      // Freehand: translate via SVG transform
      el.setAttribute('transform', `translate(${dx},${dy})`);
    }
  } else if (interact.mode === 'resizing' && interact.handleDir) {
    const dir = interact.handleDir;
    if (interact.origRect) {
      const o = interact.origRect;
      let nx = o.x, ny = o.y, nw = o.width, nh = o.height;

      // Adjust based on handle direction
      if (dir.includes('w')) { nx = o.x + dx; nw = o.width - dx; }
      if (dir.includes('e')) { nw = o.width + dx; }
      if (dir.includes('n')) { ny = o.y + dy; nh = o.height - dy; }
      if (dir.includes('s')) { nh = o.height + dy; }

      // Enforce minimum size
      if (nw < MIN_SHAPE_SIZE) { if (dir.includes('w')) nx = o.x + o.width - MIN_SHAPE_SIZE; nw = MIN_SHAPE_SIZE; }
      if (nh < MIN_SHAPE_SIZE) { if (dir.includes('n')) ny = o.y + o.height - MIN_SHAPE_SIZE; nh = MIN_SHAPE_SIZE; }

      if (el) {
        el.setAttribute('x', String(nx));
        el.setAttribute('y', String(ny));
        el.setAttribute('width', String(nw));
        el.setAttribute('height', String(nh));
      }
      // Move handles to match new shape
      repositionHandles({ x: nx, y: ny, w: nw, h: nh });
    } else if (interact.origCircle) {
      const o = interact.origCircle;
      let nrx = o.rx, nry = o.ry, ncx = o.cx, ncy = o.cy;

      if (dir.includes('e')) nrx = Math.max(MIN_SHAPE_SIZE / 2, o.rx + dx / 2);
      if (dir.includes('w')) nrx = Math.max(MIN_SHAPE_SIZE / 2, o.rx - dx / 2);
      if (dir.includes('s')) nry = Math.max(MIN_SHAPE_SIZE / 2, o.ry + dy / 2);
      if (dir.includes('n')) nry = Math.max(MIN_SHAPE_SIZE / 2, o.ry - dy / 2);

      // Keep center aligned with opposite handle
      if (dir.includes('e') || dir.includes('w')) ncx = o.cx + dx / 2;
      if (dir.includes('s') || dir.includes('n')) ncy = o.cy + dy / 2;

      if (el) {
        el.setAttribute('cx', String(ncx));
        el.setAttribute('cy', String(ncy));
        el.setAttribute('rx', String(nrx));
        el.setAttribute('ry', String(nry));
      }
      // Move handles to match new shape
      repositionHandles({ x: ncx - nrx, y: ncy - nry, w: nrx * 2, h: nry * 2 });
    }
  }
}

function onInteractUp(e: MouseEvent): void {
  document.removeEventListener('mousemove', onInteractMove);
  document.removeEventListener('mouseup', onInteractUp);

  if (!interact.targetId) {
    interact.mode = 'idle';
    blockSync = false;
    return;
  }

  const dx = e.clientX - interact.startX;
  const dy = e.clientY - interact.startY;
  const annId = interact.targetId;

  // Capture interaction values locally before resetting state
  const mode = interact.mode;
  const handleDir = interact.handleDir;
  const origRect = interact.origRect;
  const origCircle = interact.origCircle;
  const origPath = interact.origPath;

  // ── Reset interaction state BEFORE persisting ──────────────────────────
  // This ensures updateAnnotation → syncCanvas can run without being blocked.
  interact.mode = 'idle';
  interact.targetId = null;
  interact.handleDir = null;
  interact.origRect = null;
  interact.origCircle = null;
  interact.origPath = null;
  blockSync = false;

  // Only persist if there was meaningful movement
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
    if (mode === 'dragging') {
      if (origRect) {
        updateAnnotation(annId, { rect: { ...origRect, x: origRect.x + dx, y: origRect.y + dy } });
      } else if (origCircle) {
        updateAnnotation(annId, { circle: { ...origCircle, cx: origCircle.cx + dx, cy: origCircle.cy + dy } });
      } else if (origPath) {
        const translated = translatePathData(origPath, dx, dy);
        updateAnnotation(annId, { freehand: { pathData: translated } });
      }
    } else if (mode === 'resizing' && handleDir) {
      const dir = handleDir;
      if (origRect) {
        const o = origRect;
        let nx = o.x, ny = o.y, nw = o.width, nh = o.height;
        if (dir.includes('w')) { nx = o.x + dx; nw = o.width - dx; }
        if (dir.includes('e')) { nw = o.width + dx; }
        if (dir.includes('n')) { ny = o.y + dy; nh = o.height - dy; }
        if (dir.includes('s')) { nh = o.height + dy; }
        if (nw < MIN_SHAPE_SIZE) { if (dir.includes('w')) nx = o.x + o.width - MIN_SHAPE_SIZE; nw = MIN_SHAPE_SIZE; }
        if (nh < MIN_SHAPE_SIZE) { if (dir.includes('n')) ny = o.y + o.height - MIN_SHAPE_SIZE; nh = MIN_SHAPE_SIZE; }
        updateAnnotation(annId, { rect: { x: nx, y: ny, width: nw, height: nh } });
      } else if (origCircle) {
        const o = origCircle;
        let nrx = o.rx, nry = o.ry, ncx = o.cx, ncy = o.cy;
        if (dir.includes('e')) nrx = Math.max(MIN_SHAPE_SIZE / 2, o.rx + dx / 2);
        if (dir.includes('w')) nrx = Math.max(MIN_SHAPE_SIZE / 2, o.rx - dx / 2);
        if (dir.includes('s')) nry = Math.max(MIN_SHAPE_SIZE / 2, o.ry + dy / 2);
        if (dir.includes('n')) nry = Math.max(MIN_SHAPE_SIZE / 2, o.ry - dy / 2);
        if (dir.includes('e') || dir.includes('w')) ncx = o.cx + dx / 2;
        if (dir.includes('s') || dir.includes('n')) ncy = o.cy + dy / 2;
        updateAnnotation(annId, { circle: { cx: ncx, cy: ncy, rx: nrx, ry: nry } });
      }
    }
  } else {
    // No meaningful movement — just re-sync to restore proper visual state
    syncCanvas(getAnnotations() as Annotation[]);
  }
}

/** Translate all absolute coordinates in an SVG path data string. */
function translatePathData(d: string, dx: number, dy: number): string {
  return d.replace(/([ML])(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_match, cmd: string, xStr: string, yStr: string) => {
    return `${cmd}${parseFloat(xStr) + dx},${parseFloat(yStr) + dy}`;
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pointsToSvgPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  const parts = [`M${points[0].x},${points[0].y}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(`L${points[i].x},${points[i].y}`);
  }
  return parts.join(' ');
}

/** Reset interaction state — call when clearing all annotations or force-resetting canvas. */
export function resetInteractionState(): void {
  blockSync = false;
  interact.mode = 'idle';
  interact.targetId = null;
  interact.handleDir = null;
  interact.origRect = null;
  interact.origCircle = null;
  interact.origPath = null;
  document.removeEventListener('mousemove', onInteractMove);
  document.removeEventListener('mouseup', onInteractUp);
}

/** Enable click-to-select when no tool is active */
export function enableSelectionMode(): void {
  if (!svgCanvas) return;
  svgCanvas.style.pointerEvents = 'auto';
  svgCanvas.style.cursor = 'default';

  // Remove draw listeners
  svgCanvas.removeEventListener('mousedown', onMouseDown);
  svgCanvas.removeEventListener('mousemove', onMouseMove);
  svgCanvas.removeEventListener('mouseup', onMouseUp);

  // Add click-on-canvas to deselect
  svgCanvas.addEventListener('click', onCanvasClick);
}

export function disableSelectionMode(): void {
  if (!svgCanvas) return;
  svgCanvas.removeEventListener('click', onCanvasClick);
  svgCanvas.style.pointerEvents = 'none';
}

function onCanvasClick(e: MouseEvent): void {
  // If clicking on empty canvas, deselect
  const target = e.target as SVGElement;
  if (target === svgCanvas) {
    selectAnnotation(null);
  }
}
