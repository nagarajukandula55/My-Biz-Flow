/**
 * The "make any page public" toggle store. Same honest JSON-file pattern
 * as every other Designer store: atomic writes, local-dev-only
 * persistence, migrate to a Prisma table later.
 *
 * IMPORTANT SCOPE NOTE (see DESIGN_SYSTEM.md §9): this is only REAL
 * enforcement for pages currently gated by src/middleware.ts — /admin/*
 * and a module's admin/ subfolder. Ordinary vendor-facing pages
 * (list/create/edit/detail under /vendor/[vendorId]/<slug>/) have no
 * access gate at all yet, so marking one "public" here has no
 * observable effect — there's nothing to lift. The Settings UI shows
 * the toggle for every page for completeness, but says so explicitly
 * next to ungated pages rather than implying uniform protection.
 */

import fs from "node:fs";
import path from "node:path";

const DATA_FILE = path.join(process.cwd(), "data", "page-access.json");

type Store = Record<string, boolean>; // pageId -> isPublic

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

export function isPagePublic(pageId: string): boolean {
  return readStore()[pageId] === true;
}

export function setPagePublic(pageId: string, isPublic: boolean): void {
  const store = readStore();
  if (isPublic) store[pageId] = true;
  else delete store[pageId];
  writeStore(store);
}

export function getAllPublicPageIds(): Set<string> {
  const store = readStore();
  return new Set(Object.keys(store).filter((id) => store[id]));
}
