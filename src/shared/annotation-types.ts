/**
 * @file annotation-types.ts
 * @description Annotation types for visual markup during recording sessions.
 * Annotations overlay the page as SVG shapes (rectangles, circles, freehand)
 * or comment pins (linked to bugs/features with coordinates).
 */

export type AnnotationKind = 'comment' | 'rectangle' | 'circle' | 'freehand';
export type CommentEntityType = 'bug' | 'feature';

export interface RectGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleGeometry {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface FreehandGeometry {
  /** SVG path "d" attribute value */
  pathData: string;
}

export interface CommentGeometry {
  /** Pin position relative to the viewport */
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  sessionId: string;
  kind: AnnotationKind;

  // Geometry — exactly one set populated based on kind
  rect?: RectGeometry;
  circle?: CircleGeometry;
  freehand?: FreehandGeometry;
  comment?: CommentGeometry;

  // Comment-specific fields
  commentEntityType?: CommentEntityType;
  commentText?: string;
  linkedEntityId?: string;

  // Visual properties
  color: string;         // hex color, default #ef4444 (red)
  strokeWidth: number;   // default 2

  // Metadata
  pageUrl: string;
  elementSelector?: string;
  viewportWidth: number;
  viewportHeight: number;
  scrollX: number;
  scrollY: number;
  timestamp: number;
  createdAt: number;
  updatedAt: number;
}

export type AnnotationTool = AnnotationKind | null;
