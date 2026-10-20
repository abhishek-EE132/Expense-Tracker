import { useEffect, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { getCategories } from '../api/transactionApi';

const emptyForm = {
  type: 'expense',
  amount: '',
  category: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
};

export default function TransactionForm({ onSubmit, editingTransaction, onCancelEdit }) {
  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (editingTransaction) {
      setForm({
        type: editingTransaction.type,
        amount: editingTransaction.amount,
        category: editingTransaction.category,
        description: editingTransaction.description || '',
        date: editingTransaction.date?.slice(0, 10) || emptyForm.date,
      });
    } else {
      setForm(emptyForm);
    }
  }, [editingTransaction]);

  const currentCategories = form.type === 'income' ? categories.income : categories.expense;

  const handleTypeChange = (type) => setForm((f) => ({ ...f, type, category: '' }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.amount || Number(form.amount) <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!form.category) {
      setError('Select a category.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({ ...form, amount: Number(form.amount) });
      if (!editingTransaction) setForm(emptyForm);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save this transaction.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
      <div className="section-title">{editingTransaction ? 'Edit transaction' : 'Add a transaction'}</div>
      <div className="grid grid-4" style={{ marginBottom: 14 }}>
        <div className="field">
          <label>Type</label>
          <select value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div className="field">
          <label>Amount</label>
          <input
            type="number" step="0.01" min="0.01" placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">Select…</option>
            {currentCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 14 }}>
        <label>Description (optional)</label>
        <input
          type="text" maxLength={200} placeholder="e.g. Groceries at Big Bazaar"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="submit" className="btn" disabled={saving}>
          {editingTransaction ? <Save size={15} /> : <Plus size={15} />}
          {saving ? 'Saving…' : editingTransaction ? 'Update' : 'Add transaction'}
        </button>
        {editingTransaction && (
          <button type="button" className="btn secondary" onClick={onCancelEdit}>
            <X size={15} /> Cancel
          </button>
        )}
        {error && <span className="error-text">{error}</span>}
      </div>
    </form>
  );
}
