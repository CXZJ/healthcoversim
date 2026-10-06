import { createQuoteStore, defaultDatabasePath } from './db.js';
import { normalizeQuote } from '../shared/quote.js';

const example = normalizeQuote({
  customer_name: 'Mira Hartono',
  cover_type: 'Family',
  applicant1_age: 40,
  applicant1_cover_history: 'No',
  applicant2_age: 35,
  applicant2_cover_history: 'Yes',
  hospital_cover: 'Silver',
  extras_cover: 'Standard',
  payment_frequency: 'Yearly',
  annual_discount: 5,
  notes: 'Assignment worked example (optional demo data).',
});
const store = createQuoteStore(process.env.DATABASE_PATH || defaultDatabasePath);
try {
  const exists = store.list().some((quote) => quote.customer_name === example.customer_name && quote.notes === example.notes);
  if (exists) {
    console.log('The assignment worked example is already present. Existing quotes have been preserved.');
  } else {
    store.create(example);
    console.log('Added Mira Hartono: $472.00/month and $5,380.80/year after the 5% discount.');
  }
} finally {
  store.close();
}
