import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateQuote, normalizeQuote, validateQuote } from '../shared/quote.js';

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
  notes: '',
};

test('the assignment worked example explains the monthly and yearly estimate', () => {
  const quote = calculateQuote(workedExample);
  assert.equal(quote.applicants[0].loadingPercent, 20);
  assert.equal(quote.applicants[0].hospitalPremium, 192);
  assert.equal(quote.applicants[1].loadingPercent, 0);
  assert.equal(quote.applicants[1].hospitalPremium, 160);
  assert.equal(quote.hospitalTotal, 352);
  assert.equal(quote.extrasTotal, 90);
  assert.equal(quote.familyFee, 30);
  assert.equal(quote.monthlyPremium, 472);
  assert.equal(quote.yearlyBeforeDiscount, 5664);
  assert.equal(quote.discountAmount, 283.2);
  assert.equal(quote.yearlyAfterDiscount, 5380.8);
  assert.equal(quote.finalTotal, 5380.8);
  assert.equal(quote.statement, 'Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover.');
  assert.match(quote.explanation, /hospital/i);
  assert.match(quote.explanation, /extras/i);
});

test('unknown history warns separately for both applicants, including extras-only cover', () => {
  const quote = calculateQuote({
    ...workedExample,
    applicant1_cover_history: 'Not sure',
    applicant2_cover_history: 'Not sure',
    hospital_cover: 'None',
  });
  assert.deepEqual(quote.applicants.map((applicant) => applicant.loadingPercent), [0, 0]);
  assert.equal(quote.hospitalTotal, 0);
  assert.equal(quote.warnings.length, 2);
  assert.match(quote.warnings[0], /Applicant 1:.*unknown.*not been applied.*inaccurate/);
  assert.match(quote.warnings[1], /Applicant 2:.*unknown.*not been applied.*inaccurate/);
  assert.match(quote.applicants[0].explanation, /No hospital cover/);
});

test('invalid inputs cannot produce a final quote and errors point to the relevant fields', () => {
  const invalid = {
    ...workedExample,
    customer_name: '  ',
    applicant1_age: true,
    applicant2_age: '',
    applicant2_cover_history: '',
    annual_discount: 11,
  };
  const errors = validateQuote(invalid);
  assert.ok(errors.customer_name);
  assert.ok(errors.applicant1_age);
  assert.ok(errors.applicant2_age);
  assert.ok(errors.applicant2_cover_history);
  assert.ok(errors.annual_discount);
  assert.throws(() => calculateQuote(invalid), { name: 'QuoteValidationError' });
  for (const input of [null, [], true, 'quote']) {
    assert.ok(validateQuote(input)._form);
    assert.throws(() => calculateQuote(input), { name: 'QuoteValidationError' });
  }
  const single = normalizeQuote({
    ...workedExample,
    customer_name: '  Mira Hartono  ',
    cover_type: 'Single',
    applicant1_age: '40',
    applicant2_age: { invalid: true },
    applicant2_cover_history: [],
    annual_discount: '5',
    notes: '  Learning example  ',
  });
  assert.equal(single.customer_name, 'Mira Hartono');
  assert.equal(single.applicant1_age, 40);
  assert.equal(single.annual_discount, 5);
  assert.equal(single.applicant2_age, null);
  assert.equal(single.applicant2_cover_history, null);
  assert.equal(single.notes, 'Learning example');
});

test('validation refuses hostile field types and permits only stated age and discount boundaries', () => {
  for (const value of [true, false, [], [40], {}, null, '', '0x28', '1e2', 17, 101, 30.5]) {
    assert.ok(validateQuote({ ...workedExample, applicant1_age: value }).applicant1_age, `age ${JSON.stringify(value)}`);
  }
  for (const value of [true, [], [5], {}, null, '', '0x05', '1e1', -0.1, 10.1]) {
    assert.ok(validateQuote({ ...workedExample, annual_discount: value }).annual_discount, `discount ${JSON.stringify(value)}`);
  }
  for (const value of [[], ['Silver'], { toString: null }, '__proto__', 'constructor']) {
    assert.ok(validateQuote({ ...workedExample, hospital_cover: value }).hospital_cover);
  }
  for (const value of [[], ['Standard'], { toString: null }, '__proto__', 'constructor']) {
    assert.ok(validateQuote({ ...workedExample, extras_cover: value }).extras_cover);
  }
  assert.ok(validateQuote({ ...workedExample, notes: {} }).notes);
  assert.ok(validateQuote({ ...workedExample, customer_name: 'x'.repeat(121) }).customer_name);
  assert.ok(validateQuote({ ...workedExample, notes: 'x'.repeat(2001) }).notes);
  for (const [age, discount] of [[18, 0], [100, 10]]) {
    assert.deepEqual(validateQuote({ ...workedExample, applicant1_age: age, annual_discount: discount }), {});
  }
});

test('each hospital and extras tier uses the assignment per-adult price', () => {
  for (const [hospital_cover, premium] of [['None', 0], ['Basic', 90], ['Bronze', 120], ['Silver', 160], ['Gold', 220]]) {
    const quote = calculateQuote({ ...workedExample, cover_type: 'Single', applicant1_cover_history: 'Yes', hospital_cover, extras_cover: 'None' });
    assert.equal(quote.monthlyPremium, premium, hospital_cover);
  }
  for (const [extras_cover, premium] of [['None', 0], ['Basic', 25], ['Standard', 45], ['Premium', 70]]) {
    const quote = calculateQuote({ ...workedExample, cover_type: 'Single', hospital_cover: 'None', extras_cover });
    assert.equal(quote.monthlyPremium, premium, extras_cover);
    assert.equal(quote.applicants[0].loadingPercent, 0);
  }
});

test('Single counts one adult; Couple counts two; Family adds its fee exactly once', () => {
  for (const [cover_type, monthly, yearly, count] of [['Single', 115, 1380, 1], ['Couple', 230, 2760, 2], ['Family', 260, 3120, 2]]) {
    const quote = calculateQuote({ ...workedExample, cover_type, applicant1_cover_history: 'Yes', hospital_cover: 'Basic', extras_cover: 'Basic', annual_discount: 0 });
    assert.equal(quote.monthlyPremium, monthly, cover_type);
    assert.equal(quote.yearlyBeforeDiscount, yearly, cover_type);
    assert.equal(quote.applicants.length, count, cover_type);
  }
  assert.equal(calculateQuote({ ...workedExample, hospital_cover: 'None', extras_cover: 'None' }).monthlyPremium, 30);
});

test('loading applies only to selected hospital cover after age 30 without a history cap', () => {
  for (const [age, loadingPercent, hospitalPremium] of [[18, 0, 90], [30, 0, 90], [31, 2, 91.8], [100, 140, 216]]) {
    const quote = calculateQuote({ ...workedExample, cover_type: 'Single', applicant1_age: age, hospital_cover: 'Basic', extras_cover: 'Premium' });
    assert.equal(quote.applicants[0].loadingPercent, loadingPercent, `age ${age}`);
    assert.equal(quote.applicants[0].hospitalPremium, hospitalPremium, `age ${age}`);
    assert.equal(quote.extrasTotal, 70);
  }
  const quote = calculateQuote({ ...workedExample, cover_type: 'Couple', applicant2_age: 35, applicant2_cover_history: 'No' });
  assert.deepEqual(quote.applicants.map((applicant) => applicant.loadingPercent), [20, 10]);
  assert.equal(quote.hospitalTotal, 368);
});

test('monthly payment excludes annual discounts while yearly payment rounds to cents', () => {
  const monthly = calculateQuote({ ...workedExample, payment_frequency: 'Monthly', annual_discount: 10 });
  assert.equal(monthly.monthlyPremium, 472);
  assert.equal(monthly.yearlyBeforeDiscount, 5664);
  assert.equal(monthly.annualDiscountPercent, 0);
  assert.equal(monthly.discountAmount, 0);
  assert.equal(monthly.yearlyAfterDiscount, null);
  assert.equal(monthly.finalTotal, 472);
  assert.match(monthly.explanation, /Monthly payment does not apply/);
  const yearly = calculateQuote({ ...workedExample, annual_discount: 5.555 });
  assert.equal(yearly.discountAmount, 314.64);
  assert.equal(yearly.yearlyAfterDiscount, 5349.36);
  assert.equal(calculateQuote({ ...workedExample, annual_discount: 10 }).finalTotal, 5097.6);
  assert.equal(calculateQuote({ ...workedExample, annual_discount: 0 }).finalTotal, 5664);
  assert.ok(validateQuote({ ...workedExample, payment_frequency: 'Monthly', annual_discount: 20 }).annual_discount);
});

test('a fractional discount rounds an exact half-cent up rather than losing a cent to floating point', () => {
  const quote = calculateQuote({
    ...workedExample,
    cover_type: 'Single',
    applicant1_age: 31,
    hospital_cover: 'Basic',
    extras_cover: 'None',
    annual_discount: 0.625,
  });
  assert.equal(quote.monthlyPremium, 91.8);
  assert.equal(quote.yearlyBeforeDiscount, 1101.6);
  assert.equal(quote.yearlyAfterDiscount, 1094.72);
  assert.equal(quote.discountAmount, 6.88);
});
