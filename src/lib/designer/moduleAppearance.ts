/**
 * Super Admin overrides for a module's display label and sidebar icon.
 * Same honest JSON-file pattern as every other Designer store: atomic
 * writes, local-dev-only persistence, migrate to a Prisma table later.
 *
 * Keyed by module slug (not pageId) — a module's label/icon is shared
 * across every one of its pages (list/create/edit/detail/admin all show
 * the same sidebar entry and topbar title), so this lives one level up
 * from the per-page customization store.
 */

import fs from "node:fs";
import path from "node:path";

export type ModuleAppearance = {
  label?: string;
  icon?: string; // key into src/lib/designer/icons.ts's ICONS map
};

const DATA_FILE = path.join(process.cwd(), "data", "module-appearance.json");

type Store = Record<string, ModuleAppearance>;

function readStore(): Store {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2) + "\n", "utf-8");
    fs.renameSync(tmpFile, DATA_FILE);
  } catch {
    // Read-only filesystem (Vercel runtime) — documented tradeoff above.
  }
}

export function getModuleAppearance(slug: string): ModuleAppearance {
  return readStore()[slug] ?? {};
}

export function getAllModuleAppearances(): Store {
  return readStore();
}

export function setModuleAppearance(slug: string, appearance: ModuleAppearance): void {
  const store = readStore();
  store[slug] = appearance;
  writeStore(store);
}
