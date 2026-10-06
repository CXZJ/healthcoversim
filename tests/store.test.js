import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createQuoteStore } from '../server/db.js';

const familyQuote = {
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
  notes: 'Assignment worked example',
};

test('saved quote inputs survive reopening, an edit, and deletion', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'healthcoversim-store-'));
  const dbPath = join(directory, 'quotes.sqlite');
  let store;
  t.after(() => {
    store?.close();
    rmSync(directory, { recursive: true, force: true });
  });
  store = createQuoteStore(dbPath);
  assert.deepEqual(store.list(), []);
  const original = store.create(familyQuote);
  assert.ok(Number.isSafeInteger(original.id));
  assert.ok(original.id > 0);
  assert.ok(Number.isFinite(Date.parse(original.created_at)));
  assert.ok(Number.isFinite(Date.parse(original.updated_at)));
  for (const [field, expected] of Object.entries(familyQuote)) assert.equal(original[field], expected, field);
  assert.deepEqual(store.get(original.id), original);
  assert.deepEqual(store.list(), [original]);

  store.close();
  store = createQuoteStore(dbPath);
  assert.deepEqual(store.get(original.id), original);
  const updated = store.update(original.id, { ...familyQuote, customer_name: 'Mira Updated', annual_discount: 8, notes: 'Saved edit' });
  assert.equal(updated.customer_name, 'Mira Updated');
  assert.equal(updated.annual_discount, 8);
  assert.equal(updated.notes, 'Saved edit');
  assert.equal(updated.created_at, original.created_at);
  assert.deepEqual(store.get(original.id), updated);
  store.close();
  store = createQuoteStore(dbPath);
  assert.deepEqual(store.get(original.id), updated);
  assert.equal(store.delete(original.id), true);
  assert.equal(store.get(original.id), null);
  assert.deepEqual(store.list(), []);
  store.close();
  store = createQuoteStore(dbPath);
  assert.equal(store.get(original.id), null);
  assert.deepEqual(store.list(), []);
  assert.equal(store.delete(original.id), false);
  assert.equal(store.update(original.id, familyQuote), null);
});

test('Single quotes keep both Applicant 2 fields NULL, including when changing from Family', (t) => {
  const store = createQuoteStore(':memory:');
  t.after(() => store.close());
  const singleInput = {
    ...familyQuote,
    cover_type: 'Single',
    applicant2_age: null,
    applicant2_cover_history: null,
  };
  const single = store.create(singleInput);
  assert.equal(store.get(single.id).applicant2_age, null);
  assert.equal(store.get(single.id).applicant2_cover_history, null);
  const family = store.create(familyQuote);
  const updated = store.update(family.id, singleInput);
  assert.equal(updated.cover_type, 'Single');
  assert.equal(updated.applicant2_age, null);
  assert.equal(updated.applicant2_cover_history, null);

  assert.throws(() => store.create({ ...singleInput, applicant2_age: 35, applicant2_cover_history: 'Yes' }));
  assert.throws(() => store.update(family.id, { ...singleInput, applicant2_age: 35, applicant2_cover_history: 'Yes' }));
  assert.deepEqual(store.get(family.id), updated);
  assert.equal(store.list().length, 2);
});

test('SQL-like names and notes are saved literally and cannot alter other quotes', (t) => {
  const store = createQuoteStore(':memory:');
  t.after(() => store.close());
  const existing = store.create(familyQuote);
  const unusual = store.create({
    ...familyQuote,
    customer_name: "Mira'); DROP TABLE quotes; --",
    notes: "UPDATE quotes SET customer_name = 'changed';\n<script>alert('example')</script>",
  });
  assert.equal(store.get(unusual.id).customer_name, "Mira'); DROP TABLE quotes; --");
  assert.equal(store.get(unusual.id).notes, "UPDATE quotes SET customer_name = 'changed';\n<script>alert('example')</script>");
  assert.deepEqual(store.get(existing.id), existing);
  const updated = store.update(unusual.id, {
    ...familyQuote,
    customer_name: "O'Brien",
    notes: "'; DELETE FROM quotes; --",
  });
  assert.equal(updated.customer_name, "O'Brien");
  assert.equal(store.get(unusual.id).notes, "'; DELETE FROM quotes; --");
  assert.deepEqual(store.get(existing.id), existing);
  assert.equal(store.list().length, 2);
});
