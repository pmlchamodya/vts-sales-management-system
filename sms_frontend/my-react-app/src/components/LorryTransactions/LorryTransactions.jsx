import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import api from "../../api";

const LorryTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    lorry_name: "",
    customer_code: "",
    total_amount: "", // Used as Quantity
    box_type: "",
    lorry_amount: "",
    nattami: "",
  });
  const [errors, setErrors] = useState({});

  // Fetch all transactions
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/lorry-transactions");
      setTransactions(response.data);
    } catch (error) {
      toast.error("Error fetching transactions");
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      lorry_name: "",
      customer_code: "",
      total_amount: "",
      box_type: "",
      lorry_amount: "",
      nattami: "",
    });
    setErrors({});
    setEditingTransaction(null);
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Validate form
  const validate = () => {
    const newErrors = {};
    if (!formData.lorry_name.trim())
      newErrors.lorry_name = "Lorry name is required";
    if (!formData.customer_code.trim())
      newErrors.customer_code = "Customer code is required";
    if (!formData.total_amount) newErrors.total_amount = "Quantity is required";
    if (formData.total_amount && isNaN(formData.total_amount))
      newErrors.total_amount = "Quantity must be a number";
    if (parseFloat(formData.total_amount) < 0)
      newErrors.total_amount = "Quantity must be positive";
    if (!formData.box_type.trim()) newErrors.box_type = "Box type is required";
    if (!formData.lorry_amount)
      newErrors.lorry_amount = "Lorry amount is required";
    if (formData.lorry_amount && isNaN(formData.lorry_amount))
      newErrors.lorry_amount = "Lorry amount must be a number";
    if (parseFloat(formData.lorry_amount) < 0)
      newErrors.lorry_amount = "Lorry amount must be positive";
    if (!formData.nattami) newErrors.nattami = "Nattami is required";
    if (formData.nattami && isNaN(formData.nattami))
      newErrors.nattami = "Nattami must be a number";
    if (parseFloat(formData.nattami) < 0)
      newErrors.nattami = "Nattami must be positive";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Create new transaction
  const createTransaction = async (transactionData) => {
    try {
      const response = await api.post("/lorry-transactions", transactionData);
      setTransactions([...transactions, response.data.data]);
      toast.success("Transaction created successfully!");
      resetForm();
    } catch (error) {
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const formattedErrors = {};
        Object.keys(validationErrors).forEach((key) => {
          formattedErrors[key] = validationErrors[key][0];
        });
        setErrors(formattedErrors);
        toast.error("Please fix validation errors");
      } else {
        toast.error("Error creating transaction");
      }
      console.error("Error:", error);
    }
  };

  // Update transaction
  const updateTransaction = async (id, transactionData) => {
    try {
      const response = await api.put(
        `/lorry-transactions/${id}`,
        transactionData,
      );
      setTransactions(
        transactions.map((t) => (t.id === id ? response.data.data : t)),
      );
      toast.success("Transaction updated successfully!");
      resetForm();
    } catch (error) {
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const formattedErrors = {};
        Object.keys(validationErrors).forEach((key) => {
          formattedErrors[key] = validationErrors[key][0];
        });
        setErrors(formattedErrors);
        toast.error("Please fix validation errors");
      } else {
        toast.error("Error updating transaction");
      }
      console.error("Error:", error);
    }
  };

  // Delete transaction
  const deleteTransaction = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?"))
      return;

    try {
      await api.delete(`/lorry-transactions/${id}`);
      setTransactions(transactions.filter((t) => t.id !== id));
      toast.success("Transaction deleted successfully!");
    } catch (error) {
      toast.error("Error deleting transaction");
      console.error("Error:", error);
    }
  };

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const submitData = {
        lorry_name: formData.lorry_name.trim(),
        customer_code: formData.customer_code.trim(),
        total_amount: Math.abs(parseFloat(formData.total_amount)), // Safe Absolute value
        box_type: formData.box_type.trim(),
        lorry_amount: Math.abs(parseFloat(formData.lorry_amount)), // Safe Absolute value
        nattami: Math.abs(parseFloat(formData.nattami)), // Safe Absolute value
      };

      if (editingTransaction) {
        updateTransaction(editingTransaction.id, submitData);
      } else {
        createTransaction(submitData);
      }
    }
  };

  // Edit transaction - populate form
  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      lorry_name: transaction.lorry_name || "",
      customer_code: transaction.customer_code || "",
      total_amount: Math.abs(
        parseFloat(transaction.total_amount) || 0,
      ).toString(),
      box_type: transaction.box_type || "",
      lorry_amount: Math.abs(
        parseFloat(transaction.lorry_amount) || 0,
      ).toString(),
      nattami: Math.abs(parseFloat(transaction.nattami) || 0).toString(),
    });
    setErrors({});
    // Scroll to form
    document
      .querySelector(".form-section")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  // Load transactions on component mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Calculate summary stats
  const totalTransactions = transactions.length;

  // Total Quantity logic
  const totalQuantity = transactions.reduce(
    (sum, t) => sum + Math.abs(parseFloat(t.total_amount || 0)),
    0,
  );
  const totalLorryAmount = transactions.reduce(
    (sum, t) => sum + Math.abs(parseFloat(t.lorry_amount || 0)),
    0,
  );
  const totalNattami = transactions.reduce(
    (sum, t) => sum + Math.abs(parseFloat(t.nattami || 0)),
    0,
  );

  return (
    <div className="lorry-transactions-container">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#363636",
            color: "#fff",
          },
          success: {
            duration: 3000,
            style: {
              background: "#2ecc71",
              color: "#fff",
            },
          },
          error: {
            duration: 4000,
            style: {
              background: "#e74c3c",
              color: "#fff",
            },
          },
        }}
      />

      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1>🚛 Lorry Transaction Dashboard</h1>
            <p>Manage all lorry transactions with ease</p>
          </div>
          <div className="header-stats">
            <div className="stat-badge">
              <span className="stat-label">Total Transactions</span>
              <span className="stat-value">{totalTransactions}</span>
            </div>
            <div className="stat-badge">
              <span className="stat-label">Total Quantity</span>
              <span className="stat-value">{totalQuantity}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card card-primary">
          <div className="summary-icon">📦</div>
          <div className="summary-content">
            <h3>Total Quantity</h3>
            <p className="summary-number">{totalQuantity}</p>
          </div>
        </div>
        <div className="summary-card card-secondary">
          <div className="summary-icon">🚛</div>
          <div className="summary-content">
            <h3>Lorry Amount</h3>
            <p className="summary-number">Rs {totalLorryAmount.toFixed(2)}</p>
          </div>
        </div>
        <div className="summary-card card-success">
          <div className="summary-icon">👷</div>
          <div className="summary-content">
            <h3>Total Nattami</h3>
            <p className="summary-number">Rs {totalNattami.toFixed(2)}</p>
          </div>
        </div>
        <div className="summary-card card-info">
          <div className="summary-icon">📋</div>
          <div className="summary-content">
            <h3>Total Records</h3>
            <p className="summary-number">{totalTransactions}</p>
          </div>
        </div>
      </div>

      <div className="content-grid">
        {/* Form Section */}
        <div className="form-section card">
          <div className="section-header">
            <div className="section-title">
              <h2>
                {editingTransaction
                  ? "✏️ Edit Transaction"
                  : "➕ Add New Transaction"}
              </h2>
            </div>
            {editingTransaction && (
              <button className="btn-clear" onClick={resetForm}>
                Clear Form
              </button>
            )}
          </div>

          <form className="transaction-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="lorry_name">
                  Lorry Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="lorry_name"
                  name="lorry_name"
                  value={formData.lorry_name}
                  onChange={handleChange}
                  placeholder="Enter lorry name"
                  className={errors.lorry_name ? "error" : ""}
                  disabled={isLoading}
                />
                {errors.lorry_name && (
                  <span className="error-message">{errors.lorry_name}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="customer_code">
                  Customer Code <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="customer_code"
                  name="customer_code"
                  value={formData.customer_code}
                  onChange={handleChange}
                  placeholder="Enter customer code"
                  className={errors.customer_code ? "error" : ""}
                  disabled={isLoading}
                />
                {errors.customer_code && (
                  <span className="error-message">{errors.customer_code}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="total_amount">
                  Quantity (ප්‍රමාණය) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="total_amount"
                  name="total_amount"
                  value={formData.total_amount}
                  onChange={handleChange}
                  placeholder="Enter quantity"
                  step="1"
                  min="0"
                  className={errors.total_amount ? "error" : ""}
                  disabled={isLoading}
                />
                {errors.total_amount && (
                  <span className="error-message">{errors.total_amount}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="box_type">
                  Box Type <span className="required">*</span>
                </label>
                <select
                  id="box_type"
                  name="box_type"
                  value={formData.box_type}
                  onChange={handleChange}
                  className={errors.box_type ? "error" : ""}
                  disabled={isLoading}
                >
                  <option value="">-- Box Type --</option>
                  <option value="BAG">BAG - බෑග් (Rs 40)</option>
                  <option value="CARD">CARD - කාඩ් බෝඩ් (Rs 40)</option>
                  <option value="LEEP">LEEP - ලී පෙට්ටි (Rs 30)</option>
                  <option value="TAKB">TAKB - තක්කාලි කා.බෝ (Rs 30)</option>
                  <option value="TK">TK - ට්‍රේ ප්ලාස්ටික් කුඩා (Rs 40)</option>
                  <option value="TL">TL - ට්‍රේ ප්ලාස්ටික් ලොකු (Rs 50)</option>
                </select>
                {errors.box_type && (
                  <span className="error-message">{errors.box_type}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="lorry_amount">
                  Lorry Amount <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="lorry_amount"
                  name="lorry_amount"
                  value={formData.lorry_amount}
                  onChange={handleChange}
                  placeholder="Enter lorry amount"
                  step="0.01"
                  min="0"
                  className={errors.lorry_amount ? "error" : ""}
                  disabled={isLoading}
                />
                {errors.lorry_amount && (
                  <span className="error-message">{errors.lorry_amount}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="nattami">
                  Nattami <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="nattami"
                  name="nattami"
                  value={formData.nattami}
                  onChange={handleChange}
                  placeholder="Enter nattami"
                  step="0.01"
                  min="0"
                  className={errors.nattami ? "error" : ""}
                  disabled={isLoading}
                />
                {errors.nattami && (
                  <span className="error-message">{errors.nattami}</span>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit" disabled={isLoading}>
                {isLoading
                  ? "Processing..."
                  : editingTransaction
                    ? "Update Transaction"
                    : "Add Transaction"}
              </button>
              {editingTransaction && (
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={resetForm}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List Section */}
        <div className="list-section card">
          <div className="section-header">
            <div className="section-title">
              <h2>📋 Transaction List</h2>
            </div>
            <span className="transaction-count">
              {transactions.length} records
            </span>
          </div>

          {isLoading && transactions.length === 0 ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No transactions found</p>
              <p className="empty-subtext">
                Add your first transaction using the form
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Lorry Name</th>
                    <th>Customer Code</th>
                    <th>Quantity</th>
                    <th>Box Type</th>
                    <th>Lorry Amount</th>
                    <th>Nattami</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        <span className="id-badge">#{transaction.id}</span>
                      </td>
                      <td>
                        <strong>{transaction.lorry_name}</strong>
                      </td>
                      <td>{transaction.customer_code}</td>
                      <td className="amount-cell">
                        {Math.abs(parseFloat(transaction.total_amount)).toFixed(
                          0,
                        )}
                      </td>
                      <td>
                        <span className="box-type-badge">
                          {transaction.box_type}
                        </span>
                      </td>
                      <td className="amount-cell">
                        Rs{" "}
                        {Math.abs(parseFloat(transaction.lorry_amount)).toFixed(
                          2,
                        )}
                      </td>
                      <td className="amount-cell">
                        Rs{" "}
                        {Math.abs(parseFloat(transaction.nattami)).toFixed(2)}
                      </td>
                      <td>
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(transaction)}
                          disabled={isLoading}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => deleteTransaction(transaction.id)}
                          disabled={isLoading}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .lorry-transactions-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
            Ubuntu, sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
        }

        .page-header {
          background: linear-gradient(135deg, #2c3e50 0%, #3498db 100%);
          border-radius: 16px;
          padding: 24px 32px;
          margin-bottom: 30px;
          box-shadow: 0 8px 32px rgba(52, 152, 219, 0.3);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-text h1 {
          color: #ffffff;
          font-size: 2rem;
          margin: 0 0 4px 0;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .header-text p {
          color: rgba(255, 255, 255, 0.85);
          margin: 0;
          font-size: 1rem;
        }

        .header-stats {
          display: flex;
          gap: 16px;
        }

        .stat-badge {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          padding: 8px 20px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .stat-label {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          color: #ffffff;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 30px;
        }

        .summary-card {
          background: white;
          border-radius: 16px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          transition:
            transform 0.2s,
            box-shadow 0.2s;
          cursor: default;
        }

        .summary-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .summary-icon {
          font-size: 2rem;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: rgba(52, 152, 219, 0.1);
        }

        .summary-content h3 {
          margin: 0 0 4px 0;
          font-size: 0.85rem;
          color: #7f8c8d;
          font-weight: 500;
        }

        .summary-number {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #2c3e50;
        }

        .card-primary .summary-icon {
          background: rgba(52, 152, 219, 0.15);
        }
        .card-secondary .summary-icon {
          background: rgba(155, 89, 182, 0.15);
        }
        .card-success .summary-icon {
          background: rgba(46, 204, 113, 0.15);
        }
        .card-info .summary-icon {
          background: rgba(241, 196, 15, 0.15);
        }

        .content-grid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 30px;
        }

        .card {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          padding: 24px;
          transition: box-shadow 0.3s ease;
        }

        .card:hover {
          box-shadow: 0 6px 28px rgba(0, 0, 0, 0.12);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 2px solid #ecf0f1;
        }

        .section-title h2 {
          color: #2c3e50;
          font-size: 1.2rem;
          margin: 0;
        }

        .transaction-count {
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .btn-clear {
          background: #95a5a6;
          color: white;
          border: none;
          padding: 6px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-clear:hover {
          background: #7f8c8d;
          transform: translateY(-1px);
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          margin-bottom: 5px;
          font-weight: 500;
          color: #34495e;
          font-size: 0.9rem;
        }

        .required {
          color: #e74c3c;
        }

        .form-group input,
        .form-group select {
          padding: 10px 14px;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          font-size: 0.95rem;
          transition: all 0.3s;
          background: #fafafa;
          font-family: inherit;
          color: #000000 !important;
        }

        .form-group select option {
          color: #000000;
          background: #ffffff;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.15);
          background: white;
        }

        .form-group input.error,
        .form-group select.error {
          border-color: #e74c3c;
          background: #fff5f5;
        }

        .form-group input:disabled,
        .form-group select:disabled {
          background: #f0f0f0;
          cursor: not-allowed;
        }

        .error-message {
          color: #e74c3c;
          font-size: 0.8rem;
          margin-top: 5px;
          font-weight: 500;
        }

        .form-actions {
          margin-top: 25px;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn-submit {
          padding: 10px 32px;
          background: linear-gradient(135deg, #3498db, #2980b9);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
        }

        .btn-submit:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
          box-shadow: none;
        }

        .btn-cancel {
          padding: 10px 32px;
          background: #95a5a6;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-cancel:hover {
          background: #7f8c8d;
          transform: translateY(-2px);
        }

        .table-responsive {
          overflow-x: auto;
        }

        .transaction-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 0.9rem;
        }

        .transaction-table thead {
          background: linear-gradient(135deg, #2c3e50, #34495e);
          color: white;
        }

        .transaction-table th {
          padding: 14px 16px;
          text-align: left;
          font-weight: 600;
          white-space: nowrap;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .transaction-table th:first-child {
          border-radius: 10px 0 0 0;
        }
        .transaction-table th:last-child {
          border-radius: 0 10px 0 0;
        }

        .transaction-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #ecf0f1;
          vertical-align: middle;
        }

        .transaction-table tbody tr {
          transition: background 0.2s;
        }

        .transaction-table tbody tr:hover {
          background: #f8f9fa;
        }

        .transaction-table tbody tr:last-child td {
          border-bottom: none;
        }

        .id-badge {
          background: #ecf0f1;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #2c3e50;
        }

        .box-type-badge {
          background: linear-gradient(135deg, #f39c12, #e67e22);
          color: white;
          padding: 4px 14px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .amount-cell {
          font-weight: 600;
          color: #2c3e50;
        }

        .transaction-table .btn-edit,
        .transaction-table .btn-delete {
          padding: 6px 16px;
          border: none;
          border-radius: 8px;
          font-size: 0.8rem;
          cursor: pointer;
          margin: 0 4px;
          transition: all 0.3s;
          font-weight: 600;
        }

        .transaction-table .btn-edit:hover:not(:disabled),
        .transaction-table .btn-delete:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .transaction-table .btn-edit:disabled,
        .transaction-table .btn-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .transaction-table .btn-edit {
          background: linear-gradient(135deg, #f39c12, #e67e22);
          color: white;
          box-shadow: 0 2px 8px rgba(243, 156, 18, 0.3);
        }

        .transaction-table .btn-edit:hover:not(:disabled) {
          box-shadow: 0 4px 16px rgba(243, 156, 18, 0.4);
        }

        .transaction-table .btn-delete {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          color: white;
          box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
        }

        .transaction-table .btn-delete:hover:not(:disabled) {
          box-shadow: 0 4px 16px rgba(231, 76, 60, 0.4);
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #7f8c8d;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 16px;
        }

        .empty-state p {
          margin: 6px 0;
        }

        .empty-subtext {
          font-size: 0.9rem;
          color: #95a5a6;
        }

        .loading-state {
          text-align: center;
          padding: 60px 20px;
          color: #7f8c8d;
        }

        .spinner {
          width: 44px;
          height: 44px;
          margin: 0 auto 16px;
          border: 4px solid #ecf0f1;
          border-top-color: #3498db;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1024px) {
          .content-grid {
            grid-template-columns: 1fr;
          }
          .summary-cards {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          .header-content {
            flex-direction: column;
            align-items: flex-start;
          }
          .header-stats {
            width: 100%;
            justify-content: space-between;
          }
          .stat-badge {
            flex: 1;
          }
          .transaction-table {
            font-size: 0.8rem;
          }
          .transaction-table td,
          .transaction-table th {
            padding: 10px 12px;
          }
          .form-actions {
            flex-direction: column;
          }
          .btn-submit,
          .btn-cancel {
            width: 100%;
          }
          .page-header h1 {
            font-size: 1.6rem;
          }
          .card {
            padding: 16px;
          }
          .summary-cards {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .summary-card {
            padding: 16px;
          }
          .summary-number {
            font-size: 1.2rem;
          }
        }

        @media (max-width: 480px) {
          .lorry-transactions-container {
            padding: 12px;
          }
          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          .transaction-table .btn-edit,
          .transaction-table .btn-delete {
            padding: 4px 12px;
            font-size: 0.7rem;
          }
          .summary-cards {
            grid-template-columns: 1fr;
          }
          .header-stats {
            flex-direction: column;
          }
          .stat-badge {
            flex-direction: row;
            justify-content: space-between;
            padding: 8px 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default LorryTransactions;
