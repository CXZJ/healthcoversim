import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../server/app.js';

async function startApp(t, options) {
  const app = createApp(options);
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
  } catch (error) {
    app.close();
    throw error;
  }
  const address = `http://127.0.0.1:${server.address().port}`;
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    app.close();
  };
  t.after(close);
  return {
    close,
    async request(method, path, payload, expectedStatus = 200, raw = false) {
      const response = await fetch(`${address}${path}`, {
        method,
        ...(payload !== undefined && { body: raw ? payload : JSON.stringify(payload) }),
        headers: { 'Content-Type': 'application/json' },
      });
      const text = await response.text();
      const body = text ? JSON.parse(text) : null;
      assert.equal(response.status, expectedStatus, `${method} ${path}: ${text}`);
      return { body, headers: response.headers };
    },
  };
}

const workedExample = {
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

test('a customer can create a quote, then read its saved inputs and explanation', async (t) => {
  const app = await startApp(t, { dbPath: ':memory:' });
  await app.request('GET', '/api/health');
  assert.deepEqual((await app.request('GET', '/api/quotes')).body, { quotes: [] });
  const created = (await app.request('POST', '/api/quotes', workedExample, 201)).body.quote;
  assert.equal(created.customer_name, 'Mira Hartono');
  assert.equal(created.breakdown.monthlyPremium, 472);
  assert.equal(created.breakdown.yearlyAfterDiscount, 5380.8);
  assert.ok(created.created_at);
  assert.ok(created.updated_at);
  const detail = (await app.request('GET', `/api/quotes/${created.id}`)).body.quote;
  assert.deepEqual(detail, created);
  const list = (await app.request('GET', '/api/quotes')).body.quotes;
  assert.equal(list.length, 1);
  assert.deepEqual(list[0], created);
});

test('a quote persists across reopening and can be edited to Single then deleted', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'healthcoversim-api-'));
  const dbPath = join(directory, 'quotes.sqlite');
  let app;
  t.after(async () => {
    await app?.close();
    rmSync(directory, { recursive: true, force: true });
  });
  app = await startApp(t, { dbPath });
  const original = (await app.request('POST', '/api/quotes', workedExample, 201)).body.quote;
  await app.close();
  app = await startApp(t, { dbPath });
  const persisted = (await app.request('GET', `/api/quotes/${original.id}`)).body.quote;
  assert.deepEqual(persisted, original);
  const updated = (await app.request('PUT', `/api/quotes/${original.id}`, {
    ...workedExample,
    customer_name: '  Mira Updated  ',
    cover_type: 'Single',
    hospital_cover: 'None',
    extras_cover: 'Premium',
    payment_frequency: 'Monthly',
    annual_discount: 10,
    notes: '  Saved edit  ',
  })).body.quote;
  assert.equal(updated.customer_name, 'Mira Updated');
  assert.equal(updated.notes, 'Saved edit');
  assert.equal(updated.applicant2_age, null);
  assert.equal(updated.applicant2_cover_history, null);
  assert.equal(updated.created_at, original.created_at);
  assert.equal(updated.breakdown.applicants.length, 1);
  assert.equal(updated.breakdown.monthlyPremium, 70);
  assert.equal(updated.breakdown.yearlyBeforeDiscount, 840);
  assert.equal(updated.breakdown.yearlyAfterDiscount, null);
  assert.equal(updated.breakdown.annualDiscountPercent, 0);
  assert.equal((await app.request('GET', `/api/quotes/${original.id}`)).body.quote.notes, 'Saved edit');
  await app.request('DELETE', `/api/quotes/${original.id}`, undefined, 204);
  await app.request('GET', `/api/quotes/${original.id}`, undefined, 404);
  assert.deepEqual((await app.request('GET', '/api/quotes')).body.quotes, []);
  await app.close();
  app = await startApp(t, { dbPath });
  assert.deepEqual((await app.request('GET', '/api/quotes')).body.quotes, []);
});

test('direct invalid API inputs return field errors and never save or overwrite a quote', async (t) => {
  const app = await startApp(t, { dbPath: ':memory:' });
  for (const [field, value] of [
    ['customer_name', ' '], ['customer_name', {}], ['cover_type', ''],
    ['applicant1_age', true], ['applicant1_age', [40]], ['applicant1_age', 0],
    ['applicant1_age', 17], ['applicant1_age', 101], ['applicant1_age', 40.5],
    ['applicant1_cover_history', ''], ['applicant2_age', null], ['applicant2_cover_history', ''],
    ['hospital_cover', ['Silver']], ['hospital_cover', '__proto__'], ['hospital_cover', { toString: null }],
    ['extras_cover', ''], ['payment_frequency', 'Weekly'], ['annual_discount', -1],
    ['annual_discount', 11], ['annual_discount', true], ['notes', {}],
  ]) {
    const response = await app.request('POST', '/api/quotes', { ...workedExample, [field]: value }, 400);
    assert.ok(response.body.errors[field], `${field}: ${JSON.stringify(value)}`);
    assert.equal(typeof response.body.message, 'string');
  }
  await app.request('POST', '/api/quotes', [], 400);
  await app.request('POST', '/api/quotes', {}, 400);
  await app.request('POST', '/api/quotes', 'null', 400, true);
  await app.request('POST', '/api/quotes', '{invalid', 400, true);
  assert.deepEqual((await app.request('GET', '/api/quotes')).body.quotes, []);

  const original = (await app.request('POST', '/api/quotes', workedExample, 201)).body.quote;
  await app.request('PUT', `/api/quotes/${original.id}`, { ...workedExample, applicant2_age: null }, 400);
  const unchanged = (await app.request('GET', `/api/quotes/${original.id}`)).body.quote;
  assert.deepEqual(unchanged, original);
});

test('missing or malformed quote ids and unknown API routes consistently return JSON 404s', async (t) => {
  const app = await startApp(t, { dbPath: ':memory:' });
  for (const id of ['0', '-1', '1.5', '01', 'abc', '9007199254740992', '999']) {
    for (const method of ['get', 'put', 'delete']) {
      const response = await app.request(method.toUpperCase(), `/api/quotes/${id}`, method === 'put' ? workedExample : undefined, 404);
      assert.equal(response.body.message, 'Quote not found.');
    }
  }
  const unknown = await app.request('GET', '/api/unknown', undefined, 404);
  assert.match(unknown.headers.get('content-type'), /json/);
  assert.equal(unknown.body.message, 'API route not found.');
});

test('the API accepts boundary ages and warns without loading unknown or absent hospital cover', async (t) => {
  const app = await startApp(t, { dbPath: ':memory:' });
  const response = await app.request('POST', '/api/quotes', {
    ...workedExample,
    applicant1_age: 18,
    applicant1_cover_history: 'Not sure',
    applicant2_age: 100,
    applicant2_cover_history: 'Not sure',
    hospital_cover: 'None',
    annual_discount: 10,
  }, 201);
  const quote = response.body.quote;
  assert.equal(quote.breakdown.hospitalTotal, 0);
  assert.equal(quote.breakdown.extrasTotal, 90);
  assert.equal(quote.breakdown.familyFee, 30);
  assert.equal(quote.breakdown.monthlyPremium, 120);
  assert.equal(quote.breakdown.yearlyAfterDiscount, 1296);
  assert.deepEqual(quote.breakdown.applicants.map((applicant) => applicant.loadingPercent), [0, 0]);
  assert.equal(quote.breakdown.warnings.length, 2);
});
