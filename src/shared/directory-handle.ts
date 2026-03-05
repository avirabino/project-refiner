/**
 * @file directory-handle.ts
 * @description File System Access API utilities for project folder selection (S07-16).
 * Uses `showDirectoryPicker()` to get a `FileSystemDirectoryHandle` — no absolute
 * filesystem path is needed. Sprint detection and root marker validation run
 * entirely client-side via the handle.
 *
 * NOTE: `showDirectoryPicker()` works reliably in full browser tabs but NOT in
 * extension popups. The popup form should link to the standalone new-session tab
 * for Browse support.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface SprintEntry {
  id: string;   // bare number: "07", "10"
  name: string; // full dir name: "sprint_07", "sprint_10"
}

export interface ProjectPickResult {
  /** The folder name (e.g. "vigil", "Papyrus") */
  name: string;
  /** The directory handle — can be persisted in IndexedDB */
  handle: FileSystemDirectoryHandle;
  /** Detected sprints under docs/sprints/ */
  sprints: SprintEntry[];
  /** Root markers found (e.g. ".git", "package.json") */
  rootMarkers: string[];
  /** Whether a .vigil/ directory already exists */
  hasVigilDir: boolean;
}

// Well-known files/dirs that indicate a project root
const ROOT_MARKERS = ['.git', 'package.json', 'tsconfig.json', 'Cargo.toml', 'pyproject.toml', 'go.mod'] as const;

// ── Feature detection ────────────────────────────────────────────────────────

/** Returns true if the File System Access API is available (Chrome 86+, full tabs). */
export function isDirectoryPickerAvailable(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

// ── Core utilities ───────────────────────────────────────────────────────────

/**
 * Opens the OS folder picker and returns project info.
 * @throws {DOMException} `AbortError` if user cancels the picker.
 */
export async function pickProjectDirectory(): Promise<ProjectPickResult> {
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' });

  const [sprints, rootMarkers, hasVigilDir] = await Promise.all([
    detectSprints(handle),
    detectRootMarkers(handle),
    hasChildDirectory(handle, '.vigil'),
  ]);

  return {
    name: handle.name,
    handle,
    sprints,
    rootMarkers,
    hasVigilDir,
  };
}

/**
 * Iterates `docs/sprints/` within the given handle and returns sprint entries
 * for directories matching `sprint_*`.
 */
export async function detectSprints(handle: FileSystemDirectoryHandle): Promise<SprintEntry[]> {
  try {
    const docsHandle = await handle.getDirectoryHandle('docs', { create: false });
    const sprintsHandle = await docsHandle.getDirectoryHandle('sprints', { create: false });

    const entries: SprintEntry[] = [];
    for await (const [name, entry] of sprintsHandle.entries()) {
      if (entry.kind === 'directory' && name.startsWith('sprint_')) {
        entries.push({
          id: name.replace('sprint_', ''),
          name,
        });
      }
    }

    return entries.sort((a, b) => a.id.localeCompare(b.id));
  } catch {
    // docs/ or docs/sprints/ doesn't exist — no sprints to detect
    return [];
  }
}

/**
 * Checks for well-known project root markers (.git, package.json, etc.).
 */
export async function detectRootMarkers(handle: FileSystemDirectoryHandle): Promise<string[]> {
  const found: string[] = [];

  await Promise.all(
    ROOT_MARKERS.map(async (marker) => {
      try {
        // Try as directory first (e.g. .git), then as file
        try {
          await handle.getDirectoryHandle(marker, { create: false });
          found.push(marker);
        } catch {
          await handle.getFileHandle(marker, { create: false });
          found.push(marker);
        }
      } catch {
        // Marker doesn't exist — skip
      }
    }),
  );

  return found;
}

/**
 * Creates `.vigil/project.json` in the target project root.
 * Idempotent — skips if the file already exists with content.
 */
export async function createVigilDir(
  handle: FileSystemDirectoryHandle,
  projectName: string,
): Promise<void> {
  try {
    const vigilDir = await handle.getDirectoryHandle('.vigil', { create: true });

    // Check if project.json already exists
    try {
      const existing = await vigilDir.getFileHandle('project.json', { create: false });
      const file = await existing.getFile();
      if (file.size > 0) {
        // Already initialised — don't overwrite
        return;
      }
    } catch {
      // Doesn't exist yet — we'll create it
    }

    const meta = {
      name: projectName,
      detectedAt: new Date().toISOString(),
      createdBy: 'vigil-extension',
    };

    const fileHandle = await vigilDir.getFileHandle('project.json', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(meta, null, 2));
    await writable.close();
  } catch (e) {
    console.warn('[Vigil] Failed to create .vigil/ directory:', e);
    // Non-fatal — don't block session creation
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function hasChildDirectory(handle: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await handle.getDirectoryHandle(name, { create: false });
    return true;
  } catch {
    return false;
  }
}
