import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { getOverview, getMonthlySummary, getCategoryBreakdown, getTopCategories } from '../api/transactionApi';
import { getBudgets } from '../api/budgetApi';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = ['#d4a15c', '#2dd4a7', '#f1707a', '#6ba3e0', '#c084c9', '#8b93a7', '#e0b054', '#5fbf9f', '#e08a92', '#7a8299'];

function StatCard({ label, value, delta, deltaLabel, tone }) {
  const isUp = delta > 0;
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone ? `num ${tone}` : 'num'}`}>{value}</div>
      {delta !== undefined && (
        <div className={`stat-delta ${delta === 0 ? 'neutral' : isUp ? 'up' : 'down'}`}>
          {delta !== 0 && (isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
          {Math.abs(delta)}% {deltaLabel}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getOverview(),
      getCategoryBreakdown({ type: 'expense' }),
      getTopCategories(5),
      getBudgets(),
    ])
      .then(([ov, bd, top, budgets]) => {
        setOverview(ov.data.data);
        setBreakdown(bd.data.data);
        setTopCategories(top.data.data);
        setBudgetAlerts(budgets.data.data.filter((b) => b.percentUsed >= 80));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getMonthlySummary(year).then((res) => {
      setMonthly(res.data.data.map((m) => ({ ...m, label: MONTH_LABELS[m.month - 1] })));
    });
  }, [year]);

  if (loading || !overview) {
    return (
      <div>
        <div className="page-header"><h1>Dashboard</h1></div>
        <div className="grid grid-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 92 }} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="subtitle">A running view of where your money moves.</div>
        </div>
      </div>

      {budgetAlerts.map((b) => (
        <div className="badge-alert" key={b._id}>
          <AlertTriangle size={15} />
          {b.isOverBudget
            ? `You've gone ${fmt(b.spent - b.monthlyLimit)} over budget on ${b.category} this month.`
            : `You've used ${b.percentUsed}% of your ${b.category} budget this month.`}
        </div>
      ))}

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard
          label="Balance"
          value={fmt(overview.balance)}
          tone={overview.balance >= 0 ? 'gain' : 'loss'}
        />
        <StatCard
          label="This month · Income"
          value={fmt(overview.thisMonth.income)}
          tone="gain"
          delta={overview.thisMonth.incomeChangeVsLastMonth}
          deltaLabel="vs last month"
        />
        <StatCard
          label="This month · Expense"
          value={fmt(overview.thisMonth.expense)}
          tone="loss"
          delta={overview.thisMonth.expenseChangeVsLastMonth}
          deltaLabel="vs last month"
        />
        <StatCard
          label="Savings rate"
          value={`${overview.thisMonth.savingsRate}%`}
        />
      </div>

      <div className="grid grid-2-1" style={{ marginBottom: 16, alignItems: 'start' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="section-title" style={{ margin: 0 }}>Income vs expense by month</div>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1b2333" vertical={false} />
              <XAxis dataKey="label" stroke="#5b6478" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#5b6478" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#131a28', border: '1px solid #232c3f', borderRadius: 8, fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="income" fill="#2dd4a7" name="Income" radius={[3,3,0,0]} maxBarSize={28} />
              <Bar dataKey="expense" fill="#f1707a" name="Expense" radius={[3,3,0,0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-title">Top categories this month</div>
          {topCategories.length === 0 ? (
            <div className="empty-state">No expenses yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topCategories.map((c) => (
                <div key={c.category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 4 }}>
                    <span>{c.category}</span>
                    <span className="num">{fmt(c.total)}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: c.changePercent > 0 ? 'var(--loss)' : c.changePercent < 0 ? 'var(--gain)' : 'var(--text-faint)' }}>
                    {c.changePercent === 0 ? 'No change' : `${c.changePercent > 0 ? '+' : ''}${c.changePercent}%`} vs last month
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="section-title">Expense by category</div>
          {breakdown.length === 0 ? (
            <div className="empty-state">No expense data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={breakdown}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label={(entry) => `${entry.percentage}%`}
                  labelLine={false}
                >
                  {breakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#131a28', border: '1px solid #232c3f', borderRadius: 8, fontSize: 13 }} formatter={(v, n) => [fmt(v), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div className="section-title">Net trend, {year}</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1b2333" vertical={false} />
              <XAxis dataKey="label" stroke="#5b6478" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#5b6478" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#131a28', border: '1px solid #232c3f', borderRadius: 8, fontSize: 13 }} formatter={(v) => fmt(v)} />
              <Line type="monotone" dataKey="net" stroke="#d4a15c" strokeWidth={2} dot={{ r: 3, fill: '#d4a15c' }} name="Net" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
