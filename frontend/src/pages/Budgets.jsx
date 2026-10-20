import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { getBudgets, setBudget, deleteBudget } from '../api/budgetApi';
import { getCategories } from '../api/transactionApi';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function barColor(pct, isOver) {
  if (isOver) return 'var(--loss)';
  if (pct >= 80) return '#e0b054';
  return 'var(--gain)';
}

export default function Budgets() {
  const toast = useToast();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ category: '', monthlyLimit: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [error, setError] = useState('');

  const fetchBudgets = () => {
    setLoading(true);
    getBudgets()
      .then((res) => setBudgets(res.data.data))
      .catch(() => toast.error('Could not load budgets.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBudgets();
    getCategories().then((res) => setCategories(res.data.data.expense)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.category) return setError('Select a category.');
    if (!form.monthlyLimit || Number(form.monthlyLimit) <= 0) return setError('Enter a limit greater than 0.');

    setSaving(true);
    try {
      await setBudget({ category: form.category, monthlyLimit: Number(form.monthlyLimit) });
      toast.success(`Budget set for ${form.category}.`);
      setForm({ category: '', monthlyLimit: '' });
      fetchBudgets();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not save budget.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    try {
      await deleteBudget(pendingDelete._id);
      toast.success('Budget removed.');
      fetchBudgets();
    } catch (err) {
      toast.error('Could not remove budget.');
    } finally {
      setPendingDelete(null);
    }
  };

  const usedCategories = budgets.map((b) => b.category);
  const availableCategories = categories.filter((c) => !usedCategories.includes(c));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Budgets</h1>
          <div className="subtitle">Set a monthly ceiling per category and watch it fill up.</div>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <div className="section-title">Set a budget</div>
        <div className="grid grid-3" style={{ alignItems: 'end' }}>
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select…</option>
              {availableCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              {budgets.map((b) => <option key={b.category} value={b.category}>{b.category} (update)</option>)}
            </select>
          </div>
          <div className="field">
            <label>Monthly limit</label>
            <input
              type="number" min="1" step="1" placeholder="e.g. 5000"
              value={form.monthlyLimit}
              onChange={(e) => setForm({ ...form, monthlyLimit: e.target.value })}
            />
          </div>
          <button className="btn" type="submit" disabled={saving}>
            <Plus size={15} /> {saving ? 'Saving…' : 'Save budget'}
          </button>
        </div>
        {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
      </form>

      {loading ? (
        <div className="grid grid-3">
          {[1,2,3].map((i) => <div key={i} className="skeleton" style={{ height: 110 }} />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="card"><div className="empty-state">No budgets set yet. Add one above to start tracking limits.</div></div>
      ) : (
        <div className="grid grid-3">
          {budgets.map((b) => (
            <div className="card" key={b._id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{b.category}</div>
                  <div className="helper-text">Limit: {fmt(b.monthlyLimit)}/mo</div>
                </div>
                <button className="btn ghost icon-only" onClick={() => setPendingDelete(b)} style={{ color: 'var(--loss)' }}>
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(b.percentUsed, 100)}%`, background: barColor(b.percentUsed, b.isOverBudget) }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12.5 }}>
                <span className="num" style={{ color: barColor(b.percentUsed, b.isOverBudget) }}>
                  {fmt(b.spent)} spent
                </span>
                <span className="helper-text">
                  {b.isOverBudget ? `${fmt(Math.abs(b.remaining))} over` : `${fmt(b.remaining)} left`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove budget?"
        message={pendingDelete ? `This will stop tracking a limit for ${pendingDelete.category}.` : ''}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
