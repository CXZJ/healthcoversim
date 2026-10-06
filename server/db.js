import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

export const defaultDatabasePath = fileURLToPath(new URL('../data/healthcoversim.sqlite', import.meta.url));

const inputFields = [
  'customer_name', 'cover_type', 'applicant1_age', 'applicant1_cover_history',
  'applicant2_age', 'applicant2_cover_history', 'hospital_cover', 'extras_cover',
  'payment_frequency', 'annual_discount', 'notes',
];

/** Opening the database initializes it without deleting any existing quotes. */
export function createQuoteStore(dbPath = defaultDatabasePath) {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL CHECK(length(trim(customer_name)) BETWEEN 1 AND 120),
      cover_type TEXT NOT NULL CHECK(cover_type IN ('Single', 'Couple', 'Family')),
      applicant1_age INTEGER NOT NULL CHECK(applicant1_age BETWEEN 18 AND 100),
      applicant1_cover_history TEXT NOT NULL CHECK(applicant1_cover_history IN ('Yes', 'No', 'Not sure')),
      applicant2_age INTEGER,
      applicant2_cover_history TEXT,
      hospital_cover TEXT NOT NULL CHECK(hospital_cover IN ('None', 'Basic', 'Bronze', 'Silver', 'Gold')),
      extras_cover TEXT NOT NULL CHECK(extras_cover IN ('None', 'Basic', 'Standard', 'Premium')),
      payment_frequency TEXT NOT NULL CHECK(payment_frequency IN ('Monthly', 'Yearly')),
      annual_discount REAL NOT NULL DEFAULT 0 CHECK(annual_discount BETWEEN 0 AND 10),
      notes TEXT NOT NULL DEFAULT '' CHECK(length(notes) <= 2000),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (
        (cover_type = 'Single' AND applicant2_age IS NULL AND applicant2_cover_history IS NULL)
        OR
        (cover_type IN ('Couple', 'Family') AND applicant2_age IS NOT NULL
          AND applicant2_age BETWEEN 18 AND 100 AND applicant2_cover_history IS NOT NULL
          AND applicant2_cover_history IN ('Yes', 'No', 'Not sure'))
      )
    );
  `);
  const selectOne = db.prepare('SELECT * FROM quotes WHERE id = ?');
  const selectAll = db.prepare('SELECT * FROM quotes ORDER BY id DESC');
  const insert = db.prepare(`INSERT INTO quotes (${inputFields.join(', ')}, created_at, updated_at) VALUES (${inputFields.map(() => '?').join(', ')}, ?, ?)`);
  const update = db.prepare(`UPDATE quotes SET ${inputFields.map((field) => `${field} = ?`).join(', ')}, updated_at = ? WHERE id = ?`);
  const remove = db.prepare('DELETE FROM quotes WHERE id = ?');
  let closed = false;

  return {
    list: () => selectAll.all(),
    get: (id) => selectOne.get(id) ?? null,
    create(input) {
      const timestamp = new Date().toISOString();
      const result = insert.run(...inputFields.map((field) => input[field]), timestamp, timestamp);
      return selectOne.get(Number(result.lastInsertRowid));
    },
    update(id, input) {
      const result = update.run(...inputFields.map((field) => input[field]), new Date().toISOString(), id);
      return result.changes ? selectOne.get(id) : null;
    },
    delete: (id) => Boolean(remove.run(id).changes),
    close() {
      if (!closed) {
        db.close();
        closed = true;
      }
    },
  };
}
