export const COVER_TYPES = ['Single', 'Couple', 'Family'];
export const COVER_HISTORIES = ['Yes', 'No', 'Not sure'];
export const PAYMENT_FREQUENCIES = ['Monthly', 'Yearly'];
export const HOSPITAL_RATES = Object.freeze({ None: 0, Basic: 90, Bronze: 120, Silver: 160, Gold: 220 });
export const EXTRAS_RATES = Object.freeze({ None: 0, Basic: 25, Standard: 45, Premium: 70 });

export const LHC_STATEMENT = 'Lifetime Health Cover loading applies only to hospital cover. It does not apply to extras cover.';

// Scale the floating-point tolerance to the amount before rounding to cents.
const roundMoney = (value) => Math.round((value + Number.EPSILON * Math.max(1, Math.abs(value))) * 100) / 100;
const dollars = (value) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);

// HTML number inputs supply strings; reject coercions such as true, [], or hexadecimal.
function numericValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return NaN;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

export function validateQuote(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { _form: 'Send a quote object with the required fields.' };
  }
  const errors = {};
  if (typeof input.customer_name !== 'string' || !input.customer_name.trim()) {
    errors.customer_name = 'Enter the customer name.';
  } else if (input.customer_name.trim().length > 120) {
    errors.customer_name = 'Use 120 characters or fewer for the customer name.';
  }
  if (!COVER_TYPES.includes(input.cover_type)) errors.cover_type = 'Choose Single, Couple, or Family cover.';
  if (typeof input.hospital_cover !== 'string' || !Object.hasOwn(HOSPITAL_RATES, input.hospital_cover)) errors.hospital_cover = 'Choose a hospital cover level, including None if needed.';
  if (typeof input.extras_cover !== 'string' || !Object.hasOwn(EXTRAS_RATES, input.extras_cover)) errors.extras_cover = 'Choose an extras cover level, including None if needed.';
  if (!PAYMENT_FREQUENCIES.includes(input.payment_frequency)) errors.payment_frequency = 'Choose Monthly or Yearly payment.';

  const adultCount = input.cover_type === 'Couple' || input.cover_type === 'Family' ? 2 : 1;
  for (let number = 1; number <= adultCount; number += 1) {
    const ageKey = `applicant${number}_age`;
    const historyKey = `applicant${number}_cover_history`;
    const age = numericValue(input[ageKey]);
    if (!Number.isInteger(age) || age < 18 || age > 100) {
      errors[ageKey] = `Enter Applicant ${number}'s age as a whole number from 18 to 100.`;
    }
    if (!COVER_HISTORIES.includes(input[historyKey])) {
      errors[historyKey] = `Choose Applicant ${number}'s hospital cover history.`;
    }
  }
  const discount = input.annual_discount === undefined ? 0 : numericValue(input.annual_discount);
  if (!Number.isFinite(discount) || discount < 0 || discount > 10) {
    errors.annual_discount = 'Enter an annual-payment discount from 0 to 10%.';
  }
  if (input.notes !== undefined && input.notes !== null && typeof input.notes !== 'string') {
    errors.notes = 'Enter notes as text.';
  } else if (typeof input.notes === 'string' && input.notes.trim().length > 2000) {
    errors.notes = 'Use 2,000 characters or fewer for notes.';
  }
  return errors;
}

export class QuoteValidationError extends Error {
  constructor(errors) {
    super('Please correct the highlighted quote fields.');
    this.name = 'QuoteValidationError';
    this.errors = errors;
  }
}

export function normalizeQuote(input) {
  const errors = validateQuote(input);
  if (Object.keys(errors).length) throw new QuoteValidationError(errors);
  const single = input.cover_type === 'Single';
  return {
    customer_name: input.customer_name.trim(),
    cover_type: input.cover_type,
    applicant1_age: numericValue(input.applicant1_age),
    applicant1_cover_history: input.applicant1_cover_history,
    applicant2_age: single ? null : numericValue(input.applicant2_age),
    applicant2_cover_history: single ? null : input.applicant2_cover_history,
    hospital_cover: input.hospital_cover,
    extras_cover: input.extras_cover,
    payment_frequency: input.payment_frequency,
    annual_discount: input.annual_discount === undefined ? 0 : numericValue(input.annual_discount),
    notes: input.notes?.trim() ?? '',
  };
}

/** All pricing lives here so saved quotes and the explanation sheet use one rule set. */
export function calculateQuote(input) {
  input = normalizeQuote(input);
  const adultCount = input.cover_type === 'Single' ? 1 : 2;
  const hospitalBase = HOSPITAL_RATES[input.hospital_cover];
  const applicants = Array.from({ length: adultCount }, (_, index) => {
    const number = index + 1;
    const age = Number(input[`applicant${number}_age`]);
    const coverHistory = input[`applicant${number}_cover_history`];
    const loadingPercent = hospitalBase > 0 && coverHistory === 'No' && age > 30 ? (age - 30) * 2 : 0;
    let explanation;
    if (hospitalBase === 0) {
      explanation = `Applicant ${number}: No hospital cover is selected, so there is no hospital premium or LHC loading.`;
    } else if (coverHistory === 'Not sure') {
      explanation = `Applicant ${number}: hospital cover history is unknown, so LHC loading is 0% for this estimate.`;
    } else if (coverHistory === 'Yes') {
      explanation = `Applicant ${number}: prior hospital cover means LHC loading is 0%.`;
    } else if (age <= 30) {
      explanation = `Applicant ${number}: age ${age} is 30 or younger, so LHC loading is 0%.`;
    } else {
      explanation = `Applicant ${number}: age ${age} with no prior hospital cover gives (${age} − 30) × 2% = ${loadingPercent}% loading on hospital cover.`;
    }
    return {
      number,
      age,
      coverHistory,
      loadingPercent,
      hospitalPremium: roundMoney(hospitalBase * (1 + loadingPercent / 100)),
      explanation,
    };
  });
  const hospitalTotal = roundMoney(applicants.reduce((total, applicant) => total + applicant.hospitalPremium, 0));
  const extrasTotal = roundMoney(EXTRAS_RATES[input.extras_cover] * adultCount);
  const familyFee = input.cover_type === 'Family' ? 30 : 0;
  const monthlyPremium = roundMoney(hospitalTotal + extrasTotal + familyFee);
  const yearlyBeforeDiscount = roundMoney(monthlyPremium * 12);
  const annualDiscountPercent = input.payment_frequency === 'Yearly' ? Number(input.annual_discount ?? 0) : 0;
  const yearlyAfterDiscount = input.payment_frequency === 'Yearly'
    ? roundMoney(yearlyBeforeDiscount * (1 - annualDiscountPercent / 100))
    : null;
  const discountAmount = yearlyAfterDiscount === null ? 0 : roundMoney(yearlyBeforeDiscount - yearlyAfterDiscount);
  const finalTotal = yearlyAfterDiscount ?? monthlyPremium;

  return {
    applicants,
    hospitalTotal,
    extrasTotal,
    familyFee,
    monthlyPremium,
    yearlyBeforeDiscount,
    annualDiscountPercent,
    discountAmount,
    yearlyAfterDiscount,
    finalTotal,
    statement: LHC_STATEMENT,
    warnings: applicants
      .filter((applicant) => applicant.coverHistory === 'Not sure')
      .map((applicant) => `Applicant ${applicant.number}: Cover history is unknown — LHC loading has not been applied. This quote may be inaccurate.`),
    explanation: `${adultCount} adult${adultCount === 1 ? '' : 's'}: hospital ${dollars(hospitalTotal)} + extras ${dollars(extrasTotal)}${familyFee ? ` + Family upgrade fee ${dollars(familyFee)}` : ''} = ${dollars(monthlyPremium)} per month. Twelve months cost ${dollars(yearlyBeforeDiscount)} before discount. ${input.payment_frequency === 'Yearly' ? `Yearly payment applies a ${annualDiscountPercent}% discount of ${dollars(discountAmount)}, giving ${dollars(finalTotal)} per year.` : 'Monthly payment does not apply an annual-payment discount.'}`,
  };
}
