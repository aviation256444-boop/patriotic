/**
 * Durable JSON file helpers: atomic write + rolling backup.
 * Also restores from .bak / backups/*.latest before treating data as empty.
 *
 * Note: free Render wipes the whole disk on redeploy. Use Super Admin backup
 * + browser snapshot (users) so accounts can be restored automatically.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  copyFileSync,
  unlinkSync,
  readdirSync,
} from "fs";
import { dirname, join, basename } from "path";

export function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function writeAtomic(filePath: string, content: string) {
  ensureDir(dirname(filePath));
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, content, "utf8");
  try {
    renameSync(tmp, filePath);
  } catch {
    writeFileSync(filePath, content, "utf8");
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

/** Keep restore copies: file.bak + data/backups/<name>.latest + timestamped */
export function writeWithBackup(filePath: string, content: string) {
  ensureDir(dirname(filePath));
  if (existsSync(filePath)) {
    try {
      copyFileSync(filePath, `${filePath}.bak`);
    } catch {
      /* ignore */
    }
    try {
      const snapDir = join(dirname(filePath), "backups");
      ensureDir(snapDir);
      const base = basename(filePath);
      copyFileSync(filePath, join(snapDir, `${base}.latest`));
      // keep one timestamped copy (overwrite same hour bucket to limit growth)
      const hour = new Date().toISOString().slice(0, 13).replace(/[-:T]/g, "");
      copyFileSync(filePath, join(snapDir, `${base}.${hour}`));
    } catch {
      /* ignore */
    }
  }
  writeAtomic(filePath, content);
}

function tryParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Read primary file, then .bak, then backups/*.latest, then newest timestamped backup */
export function readJsonFile<T>(filePath: string): T | null {
  const candidates: string[] = [];
  if (existsSync(filePath)) candidates.push(filePath);
  if (existsSync(`${filePath}.bak`)) candidates.push(`${filePath}.bak`);

  const base = basename(filePath);
  const snapDir = join(dirname(filePath), "backups");
  if (existsSync(snapDir)) {
    const latest = join(snapDir, `${base}.latest`);
    if (existsSync(latest)) candidates.push(latest);
    try {
      const stamped = readdirSync(snapDir)
        .filter((f) => f.startsWith(`${base}.`) && f !== `${base}.latest`)
        .sort()
        .reverse();
      for (const f of stamped.slice(0, 5)) {
        candidates.push(join(snapDir, f));
      }
    } catch {
      /* ignore */
    }
  }

  for (const p of candidates) {
    try {
      const parsed = tryParseJson<T>(readFileSync(p, "utf8"));
      if (parsed != null) {
        // If we recovered from a backup, re-materialize primary file
        if (p !== filePath) {
          try {
            writeAtomic(filePath, JSON.stringify(parsed, null, 2));
            console.warn(`[persist] Restored ${base} from backup: ${p}`);
          } catch {
            /* still return parsed */
          }
        }
        return parsed;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}
