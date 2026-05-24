// src/db/persist.ts
import { openDB } from 'idb';

const DB_NAME = 'StockConnoisseurPersistence';
const STORE_NAME = 'dbState';

export const getDB = async () => openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

export const saveDatabase = async (data: Uint8Array) => {
  const db = await getDB();
  await db.put(STORE_NAME, data, 'sqlite-db');
};

export const loadDatabase = async (): Promise<Uint8Array | null> => {
  const db = await getDB();
  return await db.get(STORE_NAME, 'sqlite-db');
};
