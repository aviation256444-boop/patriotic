/**
 * Durable JSON helpers — Postgres when DATABASE_URL is set, else local files.
 * Re-exports the durable store so existing imports keep working.
 */

export {
  ensureDir,
  writeAtomic,
  writeWithBackup,
  readJsonFile,
  initDurableStore,
  flushDurableWrites,
  loadStoreAsync,
  saveStoreAsync,
  isDurableReady,
} from "./durable-json";
