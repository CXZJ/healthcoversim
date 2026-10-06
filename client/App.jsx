import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardList as ClipboardText, Heart, Info, Plus, ShieldCheck, CircleAlert as WarningCircle, X } from 'lucide-react';
import { api } from './api.js';
import { goTo, money, savedDate } from './format.js';
import QuoteForm from './QuoteForm.jsx';
import QuoteDetail from './QuoteDetail.jsx';

function useRoute() {
  const [path, setPath] = useState(window.location.hash.slice(1) || '/quotes');
  useEffect(() => {
    const change = () => setPath(window.location.hash.slice(1) || '/quotes');
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  return path;
}

export default function App() {
  const route = useRoute();
  const [notice, setNotice] = useState('');
  const match = route.match(/^\/quotes\/(\d+)(\/edit)?$/);
  const isNew = route === '/quotes/new';
  const isList = route === '/quotes';
  const mainRef = useRef(null);
  useEffect(() => { mainRef.current?.focus(); }, [route]);

  function navigate(path, message = '') {
    setNotice(message);
    goTo(path);
  }

  return <>
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); mainRef.current?.scrollIntoView(); }}>Skip to content</a>
    <header className="site-header">
      <div className="header-inner">
        <a href="#/quotes" className="brand" aria-label="HealthCoverSim home">
          <span className="brand-mark"><Heart size={22} /></span>
          <span>HealthCover<span className="brand-light">Sim</span></span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#/quotes" className={isList ? 'nav-link current' : 'nav-link'} aria-current={isList ? 'page' : undefined}>Your quotes</a>
          <a href="#/quotes/new" className="button button-small" aria-current={isNew ? 'page' : undefined}><Plus size={17} /> New quote</a>
        </nav>
      </div>
    </header>
    <div className="site-body">
      {notice && <div className="notice" role="status"><Check size={20} /><span>{notice}</span><button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={18} /></button></div>}
      <main id="main-content" tabIndex={-1} ref={mainRef}>
        {isList ? <QuoteList navigate={navigate} />
          : isNew ? <QuoteForm navigate={navigate} />
            : match ? <QuotePage key={route} id={match[1]} editing={Boolean(match[2])} navigate={navigate} />
              : <ErrorState message="This page could not be found." />}
      </main>
    </div>
    <footer className="site-footer"><div><span className="footer-brand"><ShieldCheck size={19} /> A little clarity, for your cover.</span><p>Learning simulator only. Not financial advice. All estimates are in AUD.</p></div></footer>
  </>;
}

function QuoteList({ navigate }) {
  const [state, setState] = useState({ loading: true, quotes: [], error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    api.list().then(({ quotes }) => {
      if (active) setState({ loading: false, quotes, error: '' });
    }).catch((error) => {
      if (active) setState({ loading: false, quotes: [], error: error.message });
    });
    return () => { active = false; };
  }, [attempt]);

  return <>
    <div className="page-heading list-heading">
      <span className="eyebrow">A clearer view of your cover</span>
      <h1>Your quotes, <span>clearly explained.</span></h1>
      <p>Create a health cover estimate and understand exactly where every dollar goes.</p>
    </div>
    <section className="quote-library" aria-labelledby="saved-quotes-heading">
      <div className="library-heading"><h2 id="saved-quotes-heading">Saved quotes <span className="count">{state.loading ? '…' : state.quotes.length}</span></h2><span className="subtle">Your estimates in one place</span></div>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} onRetry={() => setAttempt(attempt + 1)} />
        : state.quotes.length === 0 ? <div className="empty-state">
          <span className="empty-symbol"><ClipboardText size={36} /></span>
          <h3>A fresh start for your cover.</h3>
          <p>Your first quote starts with a few simple details. We’ll take care of the breakdown.</p>
          <button className="button" onClick={() => navigate('/quotes/new')}><Plus size={18} /> New quote</button>
          <span className="empty-footnote">Single, Couple or Family. Every cost explained.</span>
        </div> : <div className="table-scroll"><table className="quotes-table">
          <caption className="sr-only">Saved health cover quotes. Open a customer name to view, edit or delete a quote.</caption>
          <thead><tr><th>Customer</th><th>Cover</th><th>Monthly estimate</th><th>Yearly estimate</th><th>Saved</th><th><span className="sr-only">Action</span></th></tr></thead>
          <tbody>{state.quotes.map((quote) => <tr key={quote.id}>
            <td data-label="Customer"><a className="customer-link" href={`#/quotes/${quote.id}`}>{quote.customer_name}</a><span className="cell-secondary">Quote #{String(quote.id).padStart(3, '0')}</span></td>
            <td data-label="Cover"><span className="cover-badge">{quote.cover_type}</span><span className="cell-secondary">{quote.hospital_cover} hospital · {quote.extras_cover} extras</span></td>
            <td data-label="Monthly estimate"><span className="table-money">{money(quote.breakdown.monthlyPremium)}</span><span className="cell-secondary">per month</span></td>
            <td data-label="Yearly estimate"><span className="table-money">{money(quote.breakdown.yearlyAfterDiscount ?? quote.breakdown.yearlyBeforeDiscount)}</span><span className="cell-secondary">{quote.payment_frequency === 'Yearly' ? `after ${quote.annual_discount}% discount` : 'before any discount'}</span></td>
            <td data-label="Saved"><span className="date-text">{savedDate(quote.created_at)}</span></td>
            <td className="table-action"><a className="icon-button" href={`#/quotes/${quote.id}`} aria-label={`View quote for ${quote.customer_name}`}><ArrowRight size={21} /></a></td>
          </tr>)}</tbody>
        </table></div>}
    </section>
    <section className="clarity-note"><span className="note-icon"><Info size={23} /></span><div><h3>Know what goes into your estimate.</h3><p>Hospital and extras are priced separately. Cover history affects hospital costs only, and yearly payments can include a discount.</p></div></section>
  </>;
}

function QuotePage({ id, editing, navigate }) {
  const [state, setState] = useState({ loading: true, quote: null, error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    api.get(id).then(({ quote }) => {
      if (active) setState({ loading: false, quote, error: '' });
    }).catch((error) => {
      if (active) setState({ loading: false, quote: null, error: error.message });
    });
    return () => { active = false; };
  }, [id, attempt]);
  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error} onRetry={() => setAttempt(attempt + 1)} />;
  return editing ? <QuoteForm initialQuote={state.quote} navigate={navigate} /> : <QuoteDetail quote={state.quote} navigate={navigate} />;
}

export function LoadingState() {
  return <div className="loading-state" role="status"><span className="sr-only">Loading quotes…</span><div className="skeleton skeleton-title" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton skeleton-short" /></div>;
}

export function ErrorState({ message, onRetry }) {
  return <div className="error-state" role="alert"><WarningCircle size={32} /><h2>We couldn’t open that.</h2><p>{message}</p><div className="button-row">{onRetry && <button className="button" onClick={onRetry}>Try again</button>}<a className="button button-secondary" href="#/quotes"><ArrowLeft size={17} /> Your quotes</a></div></div>;
}
