import { useEffect, useState, useCallback } from 'react';
import { Search, Download, Pencil, Trash2 } from 'lucide-react';
import { getTransactions, deleteTransaction, getCategories, exportTransactionsCSV } from '../api/transactionApi';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from './ConfirmDialog';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function TransactionList({ onEdit, refreshKey }) {
  const toast = useToast();
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [categories, setCategories] = useState({ income: [], expense: [] });
  const [filters, setFilters] = useState({ type: '', category: '', sortBy: 'date', sortOrder: 'desc', search: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data.data)).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters, page, limit: 8 };
      if (!params.type) delete params.type;
      if (!params.category) delete params.category;
      if (!params.search) delete params.search;
      const res = await getTransactions(params);
      setTransactions(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Could not load transactions.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  useEffect(() => { fetchData(); }, [fetchData, refreshKey]);

  const handleDeleteConfirmed = async () => {
    try {
      await deleteTransaction(pendingDelete._id);
      toast.success('Transaction deleted.');
      fetchData();
    } catch (err) {
      toast.error('Could not delete this transaction.');
    } finally {
      setPendingDelete(null);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (filters.type) params.type = filters.type;
      await exportTransactionsCSV(params);
      toast.success('Export downloaded.');
    } catch (err) {
      toast.error('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const currentCategories = filters.type === 'income'
    ? categories.income
    : filters.type === 'expense'
    ? categories.expense
    : [...categories.income, ...categories.expense];

  return (
    <div className="card">
      <div className="filters-bar">
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-faint)' }} />
          <input
            style={{ paddingLeft: 30 }}
            placeholder="Search description…"
            value={filters.search}
            onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
          />
        </div>

        <select
          value={filters.type}
          onChange={(e) => { setFilters({ ...filters, type: e.target.value, category: '' }); setPage(1); }}
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <select
          value={filters.category}
          onChange={(e) => { setFilters({ ...filters, category: e.target.value }); setPage(1); }}
        >
          <option value="">All categories</option>
          {[...new Set(currentCategories)].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={`${filters.sortBy}:${filters.sortOrder}`}
          onChange={(e) => { const [sortBy, sortOrder] = e.target.value.split(':'); setFilters({ ...filters, sortBy, sortOrder }); }}
        >
          <option value="date:desc">Newest first</option>
          <option value="date:asc">Oldest first</option>
          <option value="amount:desc">Amount: high to low</option>
          <option value="amount:asc">Amount: low to high</option>
        </select>

        <button className="btn secondary sm" onClick={handleExport} disabled={exporting} style={{ marginLeft: 'auto' }}>
          <Download size={14} /> {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3,4].map((i) => <div key={i} className="skeleton" style={{ height: 40 }} />)}
        </div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">No transactions match these filters.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th><th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t._id}>
                <td className="num" style={{ color: 'var(--text-dim)' }}>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                <td><span className={`type-tag ${t.type}`}>{t.type === 'income' ? 'Income' : 'Expense'}</span></td>
                <td>{t.category}</td>
                <td style={{ color: 'var(--text-dim)' }}>{t.description || '—'}</td>
                <td className={`num ${t.type === 'income' ? 'gain' : 'loss'}`}>
                  {t.type === 'income' ? '+' : '−'}{fmt(t.amount)}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                    <button className="btn ghost icon-only" onClick={() => onEdit(t)} title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button className="btn ghost icon-only" onClick={() => setPendingDelete(t)} title="Delete" style={{ color: 'var(--loss)' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 14, fontSize: 13, color: 'var(--text-dim)' }}>
        <span>Page {pagination.page} of {pagination.totalPages || 1} · {pagination.total} total</span>
        <button className="btn secondary sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <button className="btn secondary sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete transaction?"
        message={pendingDelete ? `This will permanently remove the ${pendingDelete.category} entry of ${fmt(pendingDelete.amount)}.` : ''}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
