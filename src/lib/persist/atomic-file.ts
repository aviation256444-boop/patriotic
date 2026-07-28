/**
 * Durable JSON file helpers: atomic write + rolling backup so data
 * is not lost on crash / partial write. (Free hosts still wipe on
 * full redeploy — use Super Admin → Backup regularly.)
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
  copyFileSync,
  unlinkSync,
} from "fs";
import { dirname, join } from "path";

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

/** Keep a restore copy next to the file: users.json.bak */
export function writeWithBackup(filePath: string, content: string) {
  ensureDir(dirname(filePath));
  if (existsSync(filePath)) {
    try {
      copyFileSync(filePath, `${filePath}.bak`);
    } catch {
      /* ignore backup failure */
    }
    // Also keep a dated snapshot (max noise: overwrite "latest")
    try {
      const snapDir = join(dirname(filePath), "backups");
      ensureDir(snapDir);
      const base = filePath.split(/[/\\]/).pop() || "data.json";
      copyFileSync(filePath, join(snapDir, `${base}.latest`));
    } catch {
      /* ignore */
    }
  }
  writeAtomic(filePath, content);
}

export function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!existsSync(filePath)) {
      // try .bak
      if (existsSync(`${filePath}.bak`)) {
        const raw = readFileSync(`${filePath}.bak`, "utf8");
        return JSON.parse(raw) as T;
      }
      const base = filePath.split(/[/\\]/).pop() || "data.json";
      const latest = join(dirname(filePath), "backups", `${base}.latest`);
      if (existsSync(latest)) {
        return JSON.parse(readFileSync(latest, "utf8")) as T;
      }
      return null;
    }
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    try {
      if (existsSync(`${filePath}.bak`)) {
        return JSON.parse(readFileSync(`${filePath}.bak`, "utf8")) as T;
      }
    } catch {
      /* ignore */
    }
    return null;
  }
}
