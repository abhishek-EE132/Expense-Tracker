const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const validateTransaction = require('../middleware/validateTransaction');
const {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getCategories,
  getMonthlySummary,
  getYearlySummary,
  getCategoryBreakdown,
  getOverview,
  getTopCategories,
  exportCSV,
} = require('../controllers/transactionController');

router.use(protect);

// Summary / analytics / export routes (before /:id to avoid collision)
router.get('/meta/categories', getCategories);
router.get('/summary/monthly', getMonthlySummary);
router.get('/summary/yearly', getYearlySummary);
router.get('/summary/by-category', getCategoryBreakdown);
router.get('/summary/overview', getOverview);
router.get('/summary/top-categories', getTopCategories);
router.get('/export/csv', exportCSV);

// Core CRUD routes
router.route('/').get(getTransactions).post(validateTransaction, createTransaction);
router
  .route('/:id')
  .get(getTransaction)
  .put(validateTransaction, updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
