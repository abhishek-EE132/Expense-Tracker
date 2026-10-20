const Transaction = require('../models/Transaction');
const { EXPENSE_CATEGORIES, INCOME_CATEGORIES } = require('../models/Transaction');

// @desc    Get all transactions (supports filtering, sorting, pagination)
// @route   GET /api/transactions
exports.getTransactions = async (req, res, next) => {
  try {
    const {
      type,
      category,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (search) filter.description = { $regex: search, $options: 'i' };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

exports.createTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.create({ ...req.body, user: req.user._id });
    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

exports.updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    res.json({ success: true, message: 'Transaction deleted', data: transaction });
  } catch (error) {
    next(error);
  }
};

exports.getCategories = async (req, res) => {
  res.json({
    success: true,
    data: { expense: EXPENSE_CATEGORIES, income: INCOME_CATEGORIES },
  });
};

// @desc    Monthly summary for a given year
exports.getMonthlySummary = async (req, res, next) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const results = await Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: { month: { $month: '$date' }, type: '$type' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    const monthly = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1, income: 0, expense: 0, net: 0,
    }));

    results.forEach((r) => {
      const idx = r._id.month - 1;
      if (r._id.type === 'income') monthly[idx].income = r.total;
      if (r._id.type === 'expense') monthly[idx].expense = r.total;
    });
    monthly.forEach((m) => (m.net = Number((m.income - m.expense).toFixed(2))));

    res.json({ success: true, year, data: monthly });
  } catch (error) {
    next(error);
  }
};

exports.getYearlySummary = async (req, res, next) => {
  try {
    const results = await Transaction.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: { year: { $year: '$date' }, type: '$type' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1 } },
    ]);

    const yearMap = {};
    results.forEach((r) => {
      const y = r._id.year;
      if (!yearMap[y]) yearMap[y] = { year: y, income: 0, expense: 0, net: 0 };
      yearMap[y][r._id.type] = r.total;
    });

    const data = Object.values(yearMap).map((y) => ({
      ...y,
      net: Number((y.income - y.expense).toFixed(2)),
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

exports.getCategoryBreakdown = async (req, res, next) => {
  try {
    const { type = 'expense', startDate, endDate } = req.query;
    const match = { user: req.user._id, type };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) match.date.$lte = new Date(endDate);
    }

    const results = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    const grandTotal = results.reduce((sum, r) => sum + r.total, 0);

    const data = results.map((r) => ({
      category: r._id,
      total: r.total,
      count: r.count,
      percentage: grandTotal ? Number(((r.total / grandTotal) * 100).toFixed(1)) : 0,
    }));

    res.json({ success: true, type, grandTotal, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Dashboard overview with savings rate, this-month totals, month-over-month change
exports.getOverview = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [allTimeAgg, monthAgg, lastMonthAgg, recent] = await Promise.all([
      Transaction.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { user: userId, date: { $gte: startOfMonth, $lt: startOfNextMonth } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { user: userId, date: { $gte: startOfLastMonth, $lt: startOfMonth } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]),
      Transaction.find({ user: userId }).sort({ date: -1 }).limit(5),
    ]);

    const toTotals = (agg) => {
      const t = { income: 0, expense: 0 };
      agg.forEach((a) => (t[a._id] = a.total));
      return t;
    };

    const allTime = toTotals(allTimeAgg);
    const thisMonth = toTotals(monthAgg);
    const lastMonth = toTotals(lastMonthAgg);

    const savingsRate = thisMonth.income > 0
      ? Number((((thisMonth.income - thisMonth.expense) / thisMonth.income) * 100).toFixed(1))
      : 0;

    const pctChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Number((((curr - prev) / prev) * 100).toFixed(1));
    };

    res.json({
      success: true,
      data: {
        balance: Number((allTime.income - allTime.expense).toFixed(2)),
        allTime,
        thisMonth: {
          ...thisMonth,
          net: Number((thisMonth.income - thisMonth.expense).toFixed(2)),
          savingsRate,
          expenseChangeVsLastMonth: pctChange(thisMonth.expense, lastMonth.expense),
          incomeChangeVsLastMonth: pctChange(thisMonth.income, lastMonth.income),
        },
        recentTransactions: recent,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Top N spending categories with trend vs previous month
exports.getTopCategories = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const limit = Number(req.query.limit) || 5;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [thisMonthAgg, lastMonthAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: { user: userId, type: 'expense', date: { $gte: startOfMonth, $lt: startOfNextMonth } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: limit },
      ]),
      Transaction.aggregate([
        { $match: { user: userId, type: 'expense', date: { $gte: startOfLastMonth, $lt: startOfMonth } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
      ]),
    ]);

    const lastMonthMap = {};
    lastMonthAgg.forEach((c) => (lastMonthMap[c._id] = c.total));

    const data = thisMonthAgg.map((c) => {
      const prev = lastMonthMap[c._id] || 0;
      const change = prev === 0 ? (c.total > 0 ? 100 : 0) : Number((((c.total - prev) / prev) * 100).toFixed(1));
      return { category: c._id, total: c.total, previousTotal: prev, changePercent: change };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Export transactions as CSV
exports.exportCSV = async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.query;
    const filter = { user: req.user._id };
    if (type) filter.type = type;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });

    const header = 'Date,Type,Category,Description,Amount\n';
    const rows = transactions.map((t) => {
      const date = t.date.toISOString().slice(0, 10);
      const desc = `"${(t.description || '').replace(/"/g, '""')}"`;
      return `${date},${t.type},${t.category},${desc},${t.amount}`;
    });
    const csv = header + rows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
