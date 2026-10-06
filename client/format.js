export const money = (value) => new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', minimumFractionDigits: 2,
}).format(value);

export const savedDate = (value) => new Intl.DateTimeFormat('en-AU', {
  day: 'numeric', month: 'short', year: 'numeric',
}).format(new Date(value));

export function goTo(path) {
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: 'instant' });
}
