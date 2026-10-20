import client from './client';

export const getTransactions = (params) => client.get('/transactions', { params });
export const getTransaction = (id) => client.get(`/transactions/${id}`);
export const createTransaction = (data) => client.post('/transactions', data);
export const updateTransaction = (id, data) => client.put(`/transactions/${id}`, data);
export const deleteTransaction = (id) => client.delete(`/transactions/${id}`);
export const getCategories = () => client.get('/transactions/meta/categories');
export const getOverview = () => client.get('/transactions/summary/overview');
export const getMonthlySummary = (year) =>
  client.get('/transactions/summary/monthly', { params: { year } });
export const getYearlySummary = () => client.get('/transactions/summary/yearly');
export const getCategoryBreakdown = (params) =>
  client.get('/transactions/summary/by-category', { params });
export const getTopCategories = (limit = 5) =>
  client.get('/transactions/summary/top-categories', { params: { limit } });

export const exportTransactionsCSV = async (params) => {
  const token = localStorage.getItem('token');
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/transactions/export/csv${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};
