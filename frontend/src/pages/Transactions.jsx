import { useState } from 'react';
import { createTransaction, updateTransaction } from '../api/transactionApi';
import { useToast } from '../context/ToastContext';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';

export default function Transactions() {
  const toast = useToast();
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSubmit = async (data) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction._id, data);
      toast.success('Transaction updated.');
      setEditingTransaction(null);
    } else {
      await createTransaction(data);
      toast.success('Transaction added.');
    }
    setRefreshKey((k) => k + 1);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <div className="subtitle">Every income and expense entry, in one place.</div>
        </div>
      </div>

      <TransactionForm
        onSubmit={handleSubmit}
        editingTransaction={editingTransaction}
        onCancelEdit={() => setEditingTransaction(null)}
      />
      <TransactionList onEdit={setEditingTransaction} refreshKey={refreshKey} />
    </div>
  );
}
