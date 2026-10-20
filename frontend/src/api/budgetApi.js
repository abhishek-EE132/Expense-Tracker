import client from './client';

export const getBudgets = () => client.get('/budgets');
export const setBudget = (data) => client.post('/budgets', data);
export const deleteBudget = (id) => client.delete(`/budgets/${id}`);
