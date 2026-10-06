import { createQuoteStore, defaultDatabasePath } from './db.js';

const store = createQuoteStore(process.env.DATABASE_PATH || defaultDatabasePath);
store.close();
console.log('SQLite database initialized. Existing quotes have been preserved.');
