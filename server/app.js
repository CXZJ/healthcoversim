import express from 'express';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createQuoteStore, defaultDatabasePath } from './db.js';
import { calculateQuote, normalizeQuote, QuoteValidationError } from '../shared/quote.js';

const distPath = fileURLToPath(new URL('../dist/', import.meta.url));
const indexPath = fileURLToPath(new URL('../dist/index.html', import.meta.url));

const withBreakdown = (row) => ({ ...row, breakdown: calculateQuote(row) });

export function createApp({ dbPath = defaultDatabasePath } = {}) {
  const app = express();
  const store = createQuoteStore(dbPath);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.close = () => store.close();

  app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
  app.get('/api/quotes', (_request, response) => response.json({ quotes: store.list().map(withBreakdown) }));
  app.post('/api/quotes', (request, response) => {
    const input = normalizeQuote(request.body);
    response.status(201).json({ quote: withBreakdown(store.create(input)) });
  });

  app.param('id', (request, response, next, value) => {
    const id = Number(value);
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(id)) {
      response.status(404).json({ message: 'Quote not found.' });
      return;
    }
    request.quoteId = id;
    next();
  });
  app.get('/api/quotes/:id', (request, response) => {
    const quote = store.get(request.quoteId);
    if (!quote) return response.status(404).json({ message: 'Quote not found.' });
    return response.json({ quote: withBreakdown(quote) });
  });
  app.put('/api/quotes/:id', (request, response) => {
    if (!store.get(request.quoteId)) return response.status(404).json({ message: 'Quote not found.' });
    const input = normalizeQuote(request.body);
    const quote = store.update(request.quoteId, input);
    return response.json({ quote: withBreakdown(quote) });
  });
  app.delete('/api/quotes/:id', (request, response) => {
    if (!store.delete(request.quoteId)) return response.status(404).json({ message: 'Quote not found.' });
    return response.status(204).end();
  });

  app.use('/api', (_request, response) => response.status(404).json({ message: 'API route not found.' }));
  app.use(express.static(distPath));
  if (existsSync(indexPath)) {
    app.get(/^\/(?!api(?:\/|$)).*/, (_request, response) => response.sendFile(indexPath));
  }
  app.use((_request, response) => response.status(404).json({ message: 'Page not found. Run npm run dev or build the frontend first.' }));

  app.use((error, _request, response, _next) => {
    if (error instanceof QuoteValidationError) {
      response.status(400).json({ message: error.message, errors: error.errors });
    } else if (error.type === 'entity.parse.failed') {
      response.status(400).json({ message: 'Send valid JSON in the request body.' });
    } else if (error.type === 'entity.too.large') {
      response.status(413).json({ message: 'The quote request is too large.' });
    } else {
      console.error(error);
      response.status(500).json({ message: 'The quote could not be processed. Please try again.' });
    }
  });
  return app;
}
