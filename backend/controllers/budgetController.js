const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

// @desc    Get all budgets for the user, with current-month spend and progress
// @route   GET /api/budgets
exports.getBudgets = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [budgets, spendAgg] = await Promise.all([
      Budget.find({ user: userId }).sort({ category: 1 }),
      Transaction.aggregate([
        { $match: { user: userId, type: 'expense', date: { $gte: startOfMonth, $lt: startOfNextMonth } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
      ]),
    ]);

    const spendMap = {};
    spendAgg.forEach((s) => (spendMap[s._id] = s.total));

    const data = budgets.map((b) => {
      const spent = spendMap[b.category] || 0;
      const percentUsed = Number(((spent / b.monthlyLimit) * 100).toFixed(1));
      return {
        _id: b._id,
        category: b.category,
        monthlyLimit: b.monthlyLimit,
        spent,
        remaining: Number((b.monthlyLimit - spent).toFixed(2)),
        percentUsed,
        isOverBudget: spent > b.monthlyLimit,
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update a budget for a category (upsert)
// @route   POST /api/budgets
exports.setBudget = async (req, res, next) => {
  try {
    const { category, monthlyLimit } = req.body;
    if (!category || !monthlyLimit || monthlyLimit <= 0) {
      return res.status(400).json({ success: false, message: 'Category and a positive monthlyLimit are required' });
    }

    const budget = await Budget.findOneAndUpdate(
      { user: req.user._id, category },
      { monthlyLimit },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a budget
// @route   DELETE /api/budgets/:id
exports.deleteBudget = async (req, res, next) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    res.json({ success: true, message: 'Budget deleted' });
  } catch (error) {
    next(error);
  }
};
