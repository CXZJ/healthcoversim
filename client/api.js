async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('We could not reach the server. Check that it is running, then try again.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || 'We could not complete that request. Please try again.');
    error.fields = data?.errors || {};
    throw error;
  }
  if (!data) throw new Error('The server returned an unexpected response. Please try again.');
  return data;
}

export const api = {
  list: () => request('/quotes'),
  get: (id) => request(`/quotes/${id}`),
  create: (input) => request('/quotes', { method: 'POST', body: JSON.stringify(input) }),
  update: (id, input) => request(`/quotes/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  remove: (id) => request(`/quotes/${id}`, { method: 'DELETE' }),
};
