import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Heart, Info, ShieldCheck, User, Users } from 'lucide-react';
import { COVER_HISTORIES, COVER_TYPES, EXTRAS_RATES, HOSPITAL_RATES, PAYMENT_FREQUENCIES, validateQuote } from '../shared/quote.js';
import { api } from './api.js';
import { money } from './format.js';

const emptyQuote = {
  customer_name: '', cover_type: '', applicant1_age: '', applicant1_cover_history: '',
  applicant2_age: '', applicant2_cover_history: '', hospital_cover: '', extras_cover: '',
  payment_frequency: '', annual_discount: '0', notes: '',
};

const fieldNames = {
  customer_name: 'Customer name', cover_type: 'Cover type', applicant1_age: 'Applicant 1 age',
  applicant1_cover_history: 'Applicant 1 hospital cover history', applicant2_age: 'Applicant 2 age',
  applicant2_cover_history: 'Applicant 2 hospital cover history', hospital_cover: 'Hospital cover level',
  extras_cover: 'Extras cover level', payment_frequency: 'Payment frequency', annual_discount: 'Annual-payment discount', notes: 'Notes',
};

export default function QuoteForm({ initialQuote, navigate }) {
  const editing = Boolean(initialQuote);
  const [values, setValues] = useState(() => Object.fromEntries(Object.keys(emptyQuote).map((key) => [key, initialQuote?.[key] ?? emptyQuote[key]])));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const errorRef = useRef(null);
  const activeRef = useRef(true);
  const savingRef = useRef(false);
  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);
  const hasSecondApplicant = values.cover_type === 'Couple' || values.cover_type === 'Family';

  function change(event) {
    const { name, value } = event.target;
    setValues((previous) => ({
      ...previous, [name]: value,
      ...(name === 'cover_type' && value === 'Single' ? { applicant2_age: '', applicant2_cover_history: '' } : {}),
      ...(name === 'payment_frequency' && value === 'Monthly' ? { annual_discount: '0' } : {}),
    }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next[name];
      if (name === 'cover_type' && value === 'Single') { delete next.applicant2_age; delete next.applicant2_cover_history; }
      if (name === 'payment_frequency' && value === 'Monthly') delete next.annual_discount;
      return next;
    });
  }

  function focusErrors() {
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  async function submit(event) {
    event.preventDefault();
    if (savingRef.current) return;
    const validationErrors = validateQuote(values);
    setErrors(validationErrors);
    setServerError('');
    if (Object.keys(validationErrors).length) { focusErrors(); return; }
    savingRef.current = true;
    setSaving(true);
    try {
      const { quote } = editing ? await api.update(initialQuote.id, values) : await api.create(values);
      if (activeRef.current) navigate(`/quotes/${quote.id}`, editing ? 'Quote updated. Your estimate has been recalculated.' : 'Quote saved. Here is your personalised breakdown.');
    } catch (error) {
      if (activeRef.current) {
        setErrors(error.fields || {});
        setServerError(error.message);
        focusErrors();
      }
    } finally {
      savingRef.current = false;
      if (activeRef.current) setSaving(false);
    }
  }

  const inputProps = (name) => ({
    id: name, name, value: values[name], onChange: change,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  });
  const errorText = (name) => errors[name] && <span className="field-error" id={`${name}-error`}>{errors[name]}</span>;

  return <>
    <a className="back-link" href={editing ? `#/quotes/${initialQuote.id}` : '#/quotes'}><ArrowLeft size={17} /> {editing ? 'Back to quote' : 'Your quotes'}</a>
    <div className="page-heading"><h1>{editing ? 'Let’s update your quote.' : 'Let’s find your cover estimate.'}</h1><p>{editing ? 'Change your details, then save to see the updated breakdown.' : 'A few details. A clear breakdown. No surprises in the numbers.'}</p></div>
    <div className="form-layout">
      <form onSubmit={submit} noValidate className="quote-form" aria-label={editing ? 'Edit quote' : 'Create quote'}>
        {(Object.keys(errors).length > 0 || serverError) && <div className="error-summary" role="alert" ref={errorRef} tabIndex={-1}><h2>Please check your details</h2>{serverError && <p>{serverError}</p>}<ul>{Object.entries(errors).map(([name, message]) => <li key={name}><a href={`#${name}`} onClick={(event) => { event.preventDefault(); document.getElementById(name)?.focus(); }}>{fieldNames[name] || name}: {message}</a></li>)}</ul></div>}
        <fieldset className="form-section"><legend><User size={22} /> Customer details</legend><p className="section-description">Who is this quote for?</p><div className="field"><label htmlFor="customer_name">Customer name <span className="required">*</span></label><input {...inputProps('customer_name')} autoComplete="name" maxLength={120} placeholder="Enter full name" required />{errorText('customer_name')}</div>
          <fieldset className="choice-field" id="cover_type" tabIndex={-1} aria-describedby={errors.cover_type ? 'cover_type-error' : undefined}><legend>Cover type <span className="required">*</span></legend><div className="cover-choices">{COVER_TYPES.map((type) => {
            const Icon = type === 'Single' ? User : Users;
            return <label className={`cover-choice ${values.cover_type === type ? 'selected' : ''}`} key={type}><input type="radio" name="cover_type" value={type} checked={values.cover_type === type} onChange={change} required /><Icon size={24} /><span><strong>{type}</strong><small>{type === 'Single' ? 'One adult' : type === 'Couple' ? 'Two adults' : 'Two adults + children'}</small></span>{values.cover_type === type && <Check className="choice-check" size={17} weight="bold" />}</label>;
          })}</div>{errorText('cover_type')}</fieldset>
          {values.cover_type === 'Family' && <p className="inline-info"><Info size={18} /> Family cover includes a $30 monthly upgrade fee. Children’s ages are not required.</p>}
        </fieldset>
        <fieldset className="form-section"><legend><Users size={22} /> Applicant details</legend><p className="section-description">Cover history helps us calculate hospital loading correctly.</p>{[1, ...(hasSecondApplicant ? [2] : [])].map((number) => <div className="applicant-fields" key={number}><h3>Applicant {number}</h3><div className="field-grid"><div className="field"><label htmlFor={`applicant${number}_age`}>Age <span className="required">*</span></label><input {...inputProps(`applicant${number}_age`)} type="number" inputMode="numeric" min={18} max={100} step={1} placeholder="18 to 100" required />{errorText(`applicant${number}_age`)}</div><div className="field"><label htmlFor={`applicant${number}_cover_history`}>Hospital cover history <span className="required">*</span></label><select {...inputProps(`applicant${number}_cover_history`)} required><option value="">Select cover history</option>{COVER_HISTORIES.map((history) => <option key={history} value={history}>{history === 'Yes' ? 'Yes, had hospital cover before' : history === 'No' ? 'No, no prior hospital cover' : history}</option>)}</select>{errorText(`applicant${number}_cover_history`)}</div></div>{values[`applicant${number}_cover_history`] === 'Not sure' && <p className="inline-warning">Applicant {number}: LHC loading will not be applied. Your estimate may be inaccurate.</p>}</div>)}</fieldset>
        <fieldset className="form-section"><legend><ShieldCheck size={22} /> Your cover</legend><p className="section-description">Choose hospital and extras separately. Prices shown are per adult, per month.</p><div className="field-grid"><div className="field"><label htmlFor="hospital_cover">Hospital cover level <span className="required">*</span></label><select {...inputProps('hospital_cover')} required><option value="">Select hospital cover</option>{Object.entries(HOSPITAL_RATES).map(([level, rate]) => <option key={level} value={level}>{level} ({money(rate)})</option>)}</select>{errorText('hospital_cover')}</div><div className="field"><label htmlFor="extras_cover">Extras cover level <span className="required">*</span></label><select {...inputProps('extras_cover')} required><option value="">Select extras cover</option>{Object.entries(EXTRAS_RATES).map(([level, rate]) => <option key={level} value={level}>{level} ({money(rate)})</option>)}</select>{errorText('extras_cover')}</div></div></fieldset>
        <fieldset className="form-section"><legend><ClipboardIcon /> Payment & notes</legend><p className="section-description">A yearly payment can include an annual-payment discount.</p><fieldset className="choice-field" id="payment_frequency" tabIndex={-1} aria-describedby={errors.payment_frequency ? 'payment_frequency-error' : undefined}><legend>Payment frequency <span className="required">*</span></legend><div className="payment-choices">{PAYMENT_FREQUENCIES.map((frequency) => <label key={frequency} className={`payment-choice ${values.payment_frequency === frequency ? 'selected' : ''}`}><input type="radio" name="payment_frequency" value={frequency} checked={values.payment_frequency === frequency} onChange={change} required /><span>{frequency}</span></label>)}</div>{errorText('payment_frequency')}</fieldset>{values.payment_frequency === 'Yearly' && <div className="field discount-field"><label htmlFor="annual_discount">Annual-payment discount (%) <span className="required">*</span></label><input {...inputProps('annual_discount')} type="number" inputMode="decimal" min={0} max={10} step="any" required aria-describedby={errors.annual_discount ? 'annual_discount-error' : 'discount-help'} /><span className="field-hint" id="discount-help">0% to 10%. Applied to the yearly total only.</span>{errorText('annual_discount')}</div>}<div className="field"><label htmlFor="notes">Notes <span className="optional">Optional</span></label><textarea {...inputProps('notes')} rows={3} maxLength={2000} placeholder="Anything you’d like to remember about this quote" />{errorText('notes')}</div></fieldset>
        <div className="form-actions"><span><span className="required">*</span> Required fields</span><div className="button-row"><a className="button button-secondary" href={editing ? `#/quotes/${initialQuote.id}` : '#/quotes'}>Cancel</a><button className="button" type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Save quote'}<ArrowRight size={18} /></button></div></div>
      </form>
      <aside className="form-aside"><div className="guide-panel"><span className="guide-symbol"><Heart size={30} weight="duotone" /></span><h2>Made to make<br />the numbers clear.</h2><p>Save your quote to see a personalised explanation of every part of your premium.</p><div className="guide-item"><ShieldCheck size={22} /><div><h3>Hospital cover</h3><p>Treatment as an admitted patient. Your age and cover history may affect this cost.</p></div></div><div className="guide-item"><Heart size={22} /><div><h3>Extras cover</h3><p>Everyday services like dental, optical and physio. No LHC loading applies.</p></div></div><div className="guide-item"><Check size={22} /><div><h3>One complete picture</h3><p>Monthly and yearly estimates, with any Family fee or annual discount explained.</p></div></div></div><p className="aside-disclaimer"><Info size={17} /> An estimate for learning, not an insurance offer or financial advice.</p></aside>
    </div>
  </>;
}

function ClipboardIcon() { return <Info size={22} />; }
