import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Heart, Info, Pencil as PencilSimple, ShieldCheck, Trash, Users, CircleAlert as WarningCircle } from 'lucide-react';
import { api } from './api.js';
import { money, savedDate } from './format.js';

export default function QuoteDetail({ quote, navigate }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const activeRef = useRef(true);
  const deletingRef = useRef(false);
  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);
  const breakdown = quote.breakdown;
  const yearly = quote.payment_frequency === 'Yearly';

  async function remove() {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setError('');
    try {
      await api.remove(quote.id);
      if (activeRef.current) navigate('/quotes', `Quote for ${quote.customer_name} deleted.`);
    } catch (caught) {
      deletingRef.current = false;
      if (activeRef.current) { setError(caught.message); setDeleting(false); }
    }
  }

  return <>
    <a className="back-link" href="#/quotes"><ArrowLeft size={17} /> Your quotes</a>
    <div className="detail-heading"><div className="page-heading"><span className="eyebrow">Your cover, explained</span><h1>{quote.customer_name}</h1><p><span className="cover-badge">{quote.cover_type} cover</span><span className="detail-meta">Quote #{String(quote.id).padStart(3, '0')} · Saved {savedDate(quote.created_at)}</span></p></div><div className="button-row"><a className="button button-secondary" href={`#/quotes/${quote.id}/edit`}><PencilSimple size={18} /> Edit quote</a><button className="button button-quiet-danger" onClick={() => setConfirming(true)}><Trash size={18} /> Delete</button></div></div>
    <div className="detail-layout"><div className="breakdown-content">
      {breakdown.warnings.length > 0 && <section className="warning-panel" aria-label="Quote warnings"><WarningCircle size={23} /><div><h2>A detail worth checking</h2>{breakdown.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div></section>}
      <section className="breakdown-section"><div className="breakdown-heading"><span className="section-icon"><ShieldCheck size={24} /></span><div><h2>Hospital cover</h2><p>{quote.hospital_cover} cover, calculated for each adult</p></div><strong>{money(breakdown.hospitalTotal)}<small>/ month</small></strong></div><div className="applicant-breakdown">{breakdown.applicants.map((applicant) => <div className="applicant-row" key={applicant.number}><div><h3>Applicant {applicant.number}<span>Age {applicant.age}</span></h3><p>Cover history: {applicant.coverHistory}</p><p className="loading-explanation">{applicant.explanation}</p></div><div className="applicant-cost"><span className="loading-badge">{applicant.loadingPercent}% LHC loading</span><strong>{money(applicant.hospitalPremium)}</strong></div></div>)}</div></section>
      <section className="breakdown-section"><div className="breakdown-heading"><span className="section-icon"><Heart size={24} /></span><div><h2>Extras cover</h2><p>{quote.extras_cover} cover for {breakdown.applicants.length} {breakdown.applicants.length === 1 ? 'adult' : 'adults'}. No LHC loading.</p></div><strong>{money(breakdown.extrasTotal)}<small>/ month</small></strong></div></section>
      {quote.cover_type === 'Family' && <section className="breakdown-section"><div className="breakdown-heading"><span className="section-icon"><Users size={24} /></span><div><h2>Family upgrade fee</h2><p>A single flat fee for dependent children on your cover.</p></div><strong>{money(breakdown.familyFee)}<small>/ month</small></strong></div></section>}
      <section className="calculation-note"><h2>How we arrived at your estimate</h2><p>{breakdown.explanation}</p><div className="lhc-statement"><Info size={21} /><p>{breakdown.statement}</p></div></section>
      {quote.notes && <section className="notes-section"><h2>Your notes</h2><p>{quote.notes}</p></section>}
    </div><aside className="premium-summary"><div className="summary-top"><span className="summary-icon"><Check size={20} weight="bold" /></span><span>Your estimated premium</span></div><div className="final-estimate"><strong>{money(breakdown.finalTotal)}</strong><span>{yearly ? 'per year, after discount' : 'per month'}</span></div><div className="summary-lines"><div><span>Monthly premium</span><strong>{money(breakdown.monthlyPremium)}</strong></div><div><span>Yearly before discount</span><strong>{money(breakdown.yearlyBeforeDiscount)}</strong></div>{yearly && <><div><span>Annual discount ({breakdown.annualDiscountPercent}%)</span><strong>−{money(breakdown.discountAmount)}</strong></div><div className="summary-final"><span>Yearly after discount</span><strong>{money(breakdown.yearlyAfterDiscount)}</strong></div></>}</div><p className="payment-explanation">{yearly ? `You selected Yearly payment. Your ${breakdown.annualDiscountPercent}% discount applies to the yearly total only.` : 'You selected Monthly payment. The annual-payment discount is not applied.'}</p><p className="summary-disclaimer">Estimated costs in AUD. A learning simulator, not financial advice.</p></aside></div>
    {confirming && <DeleteDialog customer={quote.customer_name} deleting={deleting} error={error} onCancel={() => { setConfirming(false); setError(''); }} onDelete={remove} />}
  </>;
}

function DeleteDialog({ customer, deleting, error, onCancel, onDelete }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog className="delete-dialog" ref={dialogRef} aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={(event) => { if (deleting) event.preventDefault(); else onCancel(); }}><span className="delete-symbol"><Trash size={27} /></span><h2 id="delete-title">Delete this quote?</h2><p id="delete-description">The saved quote for <strong>{customer}</strong> will be permanently removed. This cannot be undone.</p>{error && <p className="field-error" role="alert">{error}</p>}<div className="button-row"><button className="button button-secondary" autoFocus onClick={onCancel} disabled={deleting}>Keep quote</button><button className="button button-danger" onClick={onDelete} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete quote'}</button></div></dialog>;
}
