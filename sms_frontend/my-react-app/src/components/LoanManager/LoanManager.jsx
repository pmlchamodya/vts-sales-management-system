import React, { useState, useEffect, useCallback, useMemo } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import api from "../../api";
import Sidebar from "../Sidebar";
import LoanBreakdownModal from "./LoanBreakdownModal";
// Import the new Farmer Breakdown Modal
import FarmerBreakdownModal from "./FarmerBreakdownModal";

const formatCustomerOptions = (customers) =>
  customers.map((c) => ({
    value: c.id,
    label: `${c.short_name}`,
    shortName: c.short_name,
    creditLimit: c.credit_limit,
  }));

const expenseOptions = [
  { value: "petro", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "other", label: "වෙනත් වියදම්" },
];

const getInitialFormState = () => ({
  loan_id: "",
  _method: "POST",
  loan_type: "old",
  settling_way: "cash",
  customer_id: null,
  supplier_code: null,
  bill_no: "",
  amount: "",
  description: "",
  cheque_no: "",
  bank: "",
  cheque_date: new Date().toISOString().slice(0, 10),
});

const LoanManager = () => {
  const [form, setForm] = useState(getInitialFormState());
  const [customersRaw, setCustomersRaw] = useState([]);
  const [suppliersRaw, setSuppliersRaw] = useState([]);
  const [grnCodes, setGrnCodes] = useState([]);
  const [loans, setLoans] = useState([]);
  const [billNos, setBillNos] = useState([]);
  const [totalLoanDisplay, setTotalLoanDisplay] = useState("");
  const [creditLimitMessage, setCreditLimitMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  // States for the Breakdown Modals
  const [showCustomerBreakdown, setShowCustomerBreakdown] = useState(false);
  const [showFarmerBreakdown, setShowFarmerBreakdown] = useState(false);
  const [breakdownData, setBreakdownData] = useState(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  const isCustomerRelated =
    form.loan_type === "old" || form.loan_type === "today";
  const isSupplierRelated =
    form.loan_type === "supplier_repayment" ||
    form.loan_type === "supplier_sale";
  const isSettlingWayVisible = form.loan_type === "old" || isSupplierRelated;
  const isCheque = form.settling_way === "cheque";
  const isReturns = form.loan_type === "returns";
  const isIncomeOrExpense =
    form.loan_type === "ingoing" || form.loan_type === "outgoing";
  const isExpense = form.loan_type === "outgoing";

  const fetchCustomersAndSuppliers = useCallback(async () => {
    try {
      const [cusRes, supRes] = await Promise.all([
        api.get("/customers"),
        api.get("/suppliers"),
      ]);
      setCustomersRaw(cusRes.data);
      setSuppliersRaw(supRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get("/customers-loans/data");
      if (data.grnCodes && Array.isArray(data.grnCodes)) {
        setGrnCodes(
          data.grnCodes.map((code) => ({ value: code, label: code })),
        );
      }
      setLoans(data.loans || []);
    } catch (error) {
      console.error("Error fetching initial loan data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBillNos = useCallback(async () => {
    try {
      const { data } = await api.get("/api/all-bill-nos");
      if (Array.isArray(data)) {
        setBillNos(data.map((bill) => ({ value: bill, label: bill })));
      }
    } catch (error) {
      console.error("Error fetching bill numbers:", error);
    }
  }, []);

  useEffect(() => {
    fetchCustomersAndSuppliers();
    fetchData();
    fetchBillNos();
  }, [fetchCustomersAndSuppliers, fetchData, fetchBillNos]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name) => (selectedOption) => {
    setForm((prev) => ({
      ...prev,
      [name]: selectedOption ? selectedOption.value : null,
    }));
  };

  const handleDescriptionChange = (selectedOption) => {
    setForm((prev) => ({
      ...prev,
      description: selectedOption
        ? selectedOption.label || selectedOption.value
        : "",
    }));
  };

  const handleLoanTypeChange = (e) => {
    const { value } = e.target;
    const resetFields =
      value === "ingoing" || value === "outgoing" || value === "returns"
        ? {
            customer_id: null,
            supplier_code: null,
            bill_no: "",
            settling_way: "cash",
          }
        : {};

    if (value === "returns") setIsEditMode(false);
    setForm((prev) => ({ ...prev, loan_type: value, ...resetFields }));
  };

  const fetchLoanTotal = useCallback(async (customerId, showTotalLoan) => {
    if (customerId && showTotalLoan) {
      try {
        const res = await api.get(`/customers/${customerId}/loans-total`);
        const totalAmount = Math.abs(parseFloat(res.data.total_amount));
        setTotalLoanDisplay(
          `(Total Loans: ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
        );
      } catch (error) {
        setTotalLoanDisplay("(Could not fetch total loans)");
      }
    } else {
      setTotalLoanDisplay("");
    }
  }, []);

  useEffect(() => {
    if (isEditMode) return;
    const { loan_type, settling_way, bank } = form;
    let newDescription = "";

    if (loan_type === "old")
      newDescription =
        settling_way === "cheque"
          ? `Cheque payment from ${bank || "bank"}`
          : "වෙළෙන්දාගේ ලාද පරණ නය (-)";
    else if (loan_type === "today")
      newDescription = "වෙළෙන්දාගේ අද දින නය ගැනීම (+)";
    else if (loan_type === "ingoing") newDescription = "වෙනත් ලැබීම්/ආදායම්";
    else if (loan_type === "supplier_repayment")
      newDescription = "ගොවියන්ගේ ණය පියවීම (-)";
    else if (loan_type === "supplier_sale")
      newDescription = "ගොවියන්ගේ එළවළු විකුණුම (+)";
    else if (loan_type === "outgoing") newDescription = "වියදම්";

    if (newDescription)
      setForm((prev) => ({ ...prev, description: newDescription }));
  }, [form.loan_type, form.settling_way, form.bank, isEditMode]);

  useEffect(() => {
    fetchLoanTotal(form.customer_id, isCustomerRelated);
  }, [form.customer_id, isCustomerRelated, fetchLoanTotal]);

  useEffect(() => {
    const { customer_id, amount } = form;
    const submitButton = document.getElementById("submitButton");
    const selectedCustomerData = customersRaw.find((c) => c.id === customer_id);
    const creditLimit = selectedCustomerData?.credit_limit
      ? parseFloat(selectedCustomerData.credit_limit)
      : 0;

    setCreditLimitMessage("");
    if (submitButton) submitButton.disabled = false;

    if (
      isCustomerRelated &&
      customer_id &&
      creditLimit > 0 &&
      parseFloat(amount) > 0
    ) {
      if (parseFloat(amount) > creditLimit) {
        setCreditLimitMessage("Amount exceeds credit limit!");
        if (submitButton) submitButton.disabled = true;
      }
    }
  }, [form.customer_id, form.amount, customersRaw, isCustomerRelated]);

  const handleCancelEdit = (preservedDescription = "") => {
    setIsEditMode(false);
    setForm({
      ...getInitialFormState(),
      description: preservedDescription || form.description,
      loan_type: form.loan_type,
      settling_way: form.settling_way,
    });
  };

  const handleSubmit = async (e, isReturn = false) => {
    e.preventDefault();
    setLoading(true);

    const currentDescription = form.description;
    let formData = { ...form };
    let url = isEditMode
      ? `/customers-loans/${form.loan_id}`
      : "/customers-loans";

    if (isReturn) {
      formData = {
        ...form,
        loan_type: "returns",
        amount: 0,
        description: "Return entry",
      };
      url = "/customers-loans";
    }

    try {
      const payload = isEditMode ? { ...formData, _method: "PUT" } : formData;
      await api({ url, method: "POST", data: payload });
      handleCancelEdit(currentDescription);
      fetchData();
      fetchCustomersAndSuppliers();
    } catch (error) {
      alert(error.response?.data?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // --- Handle fetching breakdown for BOTH Customer and Supplier ---
  const handleViewBreakdown = async () => {
    setBreakdownLoading(true);
    try {
      if (isCustomerRelated) {
        if (!form.customer_id) {
          alert("කරුණාකර ණය විස්තරය බැලීමට මුලින්ම ගැනුම්කරුවෙකු තෝරන්න.");
          setBreakdownLoading(false);
          return;
        }
        const res = await api.get(
          `/customers/${form.customer_id}/loan-breakdown`,
        );
        setBreakdownData(res.data);
        setShowCustomerBreakdown(true); // Open Customer Modal
      } else if (isSupplierRelated) {
        if (!form.supplier_code) {
          alert("කරුණාකර ණය විස්තරය බැලීමට මුලින්ම ගොවියෙකු තෝරන්න.");
          setBreakdownLoading(false);
          return;
        }
        const res = await api.get(
          `/suppliers/${form.supplier_code}/loan-breakdown`,
        );
        setBreakdownData(res.data);
        setShowFarmerBreakdown(true); // Open Farmer Modal
      }
    } catch (error) {
      console.error(error);
      alert("දත්ත ලබා ගැනීමේදී දෝෂයක් සිදු විය.");
    } finally {
      setBreakdownLoading(false);
    }
  };

  const handleEdit = (loan) => {
    setIsEditMode(true);
    setForm({
      ...getInitialFormState(),
      loan_id: loan.id,
      _method: "PUT",
      loan_type: loan.loan_type,
      settling_way: loan.settling_way || "cash",
      customer_id: loan.customer_id,
      supplier_code: loan.supplier_code || null,
      bill_no: loan.bill_no || "",
      amount: Math.abs(loan.amount),
      description: loan.description,
      cheque_no: loan.cheque_no || "",
      bank: loan.bank || "",
      cheque_date: loan.cheque_date || new Date().toISOString().slice(0, 10),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await api.delete(`/customers-loans/${id}`);
      fetchData();
      fetchCustomersAndSuppliers();
    } catch (error) {
      alert("Failed to delete record.");
    }
  };

  const customerOptions = useMemo(
    () => formatCustomerOptions(customersRaw),
    [customersRaw],
  );
  const supplierOptions = useMemo(
    () =>
      suppliersRaw.map((s) => ({
        value: s.code,
        label: `${s.code} - ${s.name}`,
      })),
    [suppliersRaw],
  );
  const customFilter = (option, searchText) => {
    const term = searchText.toLowerCase().trim();
    const optionText = option.label.toLowerCase();
    if (term.length === 1 && option.data && option.data.shortName)
      return option.data.shortName.toLowerCase().startsWith(term);
    return optionText.includes(term);
  };

  const selectStyles = {
    option: (provided) => ({ ...provided, color: "#000", fontWeight: "bold" }),
    singleValue: (provided) => ({
      ...provided,
      color: "#000",
      fontWeight: "bold",
    }),
    input: (provided) => ({ ...provided, color: "#000" }),
  };

  if (loading) return <div className="text-center mt-5">Loading...</div>;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <div
        style={{
          marginLeft: "260px",
          flexGrow: 1,
          padding: "20px",
          width: "calc(100vw - 260px)",
        }}
      >
        <style>{`
          body { background-color: #99ff99 !important; }
          .custom-card { background-color: #004d00 !important; color: #fff; padding: 25px; border-radius: 10px; }
          .form-control, .form-select { padding: 0.15rem 0.4rem !important; font-size: 0.75rem !important; border: 1px solid black !important; color: black !important; font-weight: bold !important; background-color: white !important; }
          .table td, .table th { padding: 0.3rem; font-size: 0.875rem; }
          .table th { background-color: #006600; color: white; }
          .bg-custom-dark { background-color: #004d00 !important; color: #fff; }
          .creatable-select__control, .select__control { min-height: 25px !important; border-color: black !important; box-shadow: none !important; }
          .text-form-label { font-weight: bold; margin-bottom: 5px; display: block; color: white;}
          .radio-column { display: flex; flex-direction: column; gap: 8px; }
          .radio-label { display: flex; align-items: center; cursor: pointer; color: white; font-size: 0.95rem; }
          .radio-label input[type="radio"] { margin-right: 8px; cursor: pointer; }
        `}</style>

        <div className="custom-card">
          <h3 className="mb-4">ණය කළමනාකරණ පුවරුව</h3>
          <form
            onSubmit={(e) => handleSubmit(e, isReturns)}
            className="p-3 border border-2 border-dark rounded bg-custom-dark"
          >
            <div className="row gy-3">
              <div className="col-md-9 border-bottom pb-3 border-secondary">
                <div className="row">
                  <div className="col-md-6 radio-column">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="loan_type"
                        value="old"
                        checked={form.loan_type === "old"}
                        onChange={handleLoanTypeChange}
                      />{" "}
                      වෙළෙන්දාගේ ලාද පරණ නය (-)
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="loan_type"
                        value="supplier_repayment"
                        checked={form.loan_type === "supplier_repayment"}
                        onChange={handleLoanTypeChange}
                      />{" "}
                      ගොවියන්ගේ ණය පියවීම (-)
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="loan_type"
                        value="ingoing"
                        checked={form.loan_type === "ingoing"}
                        onChange={handleLoanTypeChange}
                      />{" "}
                      වෙනත් ලැබීම්/ආදායම්
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="loan_type"
                        value="returns"
                        checked={form.loan_type === "returns"}
                        onChange={handleLoanTypeChange}
                      />{" "}
                      Returns
                    </label>
                  </div>
                  <div className="col-md-6 radio-column">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="loan_type"
                        value="today"
                        checked={form.loan_type === "today"}
                        onChange={handleLoanTypeChange}
                      />{" "}
                      වෙළෙන්දාගේ අද දින නය ගැනීම (+)
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="loan_type"
                        value="supplier_sale"
                        checked={form.loan_type === "supplier_sale"}
                        onChange={handleLoanTypeChange}
                      />{" "}
                      ගොවියන්ගේ එළවළු විකුණුම (+)
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="loan_type"
                        value="outgoing"
                        checked={form.loan_type === "outgoing"}
                        onChange={handleLoanTypeChange}
                      />{" "}
                      වියදම්
                    </label>
                  </div>
                </div>
              </div>

              {isSettlingWayVisible && (
                <div className="col-md-3 border-bottom pb-3 border-secondary d-flex flex-column justify-content-center">
                  <label className="text-form-label mb-2">ගෙවීමේ ක්‍රමය:</label>
                  <div className="d-flex gap-4">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="settling_way"
                        value="cash"
                        checked={form.settling_way === "cash"}
                        onChange={handleInputChange}
                      />{" "}
                      Cash
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="settling_way"
                        value="cheque"
                        checked={form.settling_way === "cheque"}
                        onChange={handleInputChange}
                      />{" "}
                      Cheque
                    </label>
                  </div>
                </div>
              )}

              <div className="col-md-4 mt-3">
                {isSupplierRelated ? (
                  <>
                    <label className="text-form-label text-warning">
                      ණය කරු (Supplier) :
                    </label>
                    <Select
                      options={supplierOptions}
                      onChange={handleSelectChange("supplier_code")}
                      value={supplierOptions.find(
                        (opt) => opt.value === form.supplier_code,
                      )}
                      placeholder="-- Select Supplier --"
                      isClearable
                      styles={selectStyles}
                    />
                  </>
                ) : isCustomerRelated ? (
                  <>
                    <label className="text-form-label text-primary">
                      ණය කරු (Customer) :
                    </label>
                    <Select
                      options={customerOptions}
                      onChange={handleSelectChange("customer_id")}
                      value={customerOptions.find(
                        (opt) => opt.value === form.customer_id,
                      )}
                      filterOption={customFilter}
                      placeholder="-- Select Customer --"
                      isClearable
                      styles={selectStyles}
                    />
                  </>
                ) : null}
              </div>

              {/* Bill No & Breakdown Button shown for BOTH customer and supplier */}
              {(isCustomerRelated || isSupplierRelated) && !isCheque ? (
                <div className="col-md-5 mt-3 d-flex align-items-end gap-2">
                  <div style={{ flex: "0 0 150px" }}>
                    <label className="text-form-label">බිල් අං</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      name="bill_no"
                      value={form.bill_no}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* BREAKDOWN BUTTON FOR BOTH */}
                  <button
                    type="button"
                    className="btn btn-sm btn-light fw-bold text-dark border-dark"
                    onClick={handleViewBreakdown}
                    disabled={breakdownLoading}
                    style={{ padding: "3px 12px", marginBottom: "2px" }}
                  >
                    {breakdownLoading ? "Loading..." : "ණය විස්තරය"}
                  </button>
                </div>
              ) : null}

              <div className="w-100 m-0 p-0"></div>

              {!isReturns && (
                <div className="row gx-2 mt-2 w-100 m-0 p-0">
                  <div className={`col-md-${isIncomeOrExpense ? 8 : 5}`}>
                    <label className="text-form-label">විස්තරය</label>
                    {isExpense ? (
                      <CreatableSelect
                        options={expenseOptions}
                        onChange={handleDescriptionChange}
                        onCreateOption={(inputValue) => {
                          setForm((prev) => ({
                            ...prev,
                            description: inputValue,
                          }));
                        }}
                        value={
                          expenseOptions.find(
                            (opt) => opt.label === form.description,
                          ) ||
                          (form.description
                            ? {
                                value: form.description,
                                label: form.description,
                              }
                            : null)
                        }
                        placeholder="Type or select..."
                        isClearable
                        styles={selectStyles}
                      />
                    ) : (
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        name="description"
                        value={form.description}
                        onChange={handleInputChange}
                        placeholder="විස්තරය ඇතුලත් කරන්න"
                      />
                    )}
                    {isCustomerRelated && (
                      <span className="text-white-50 small fw-bold mt-1 d-block">
                        {totalLoanDisplay}
                      </span>
                    )}
                  </div>

                  <div className={`col-md-${isIncomeOrExpense ? 4 : 2}`}>
                    <label className="text-form-label">මුදල</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control form-control-sm"
                      name="amount"
                      value={form.amount}
                      onChange={handleInputChange}
                      required
                    />
                    {isCustomerRelated && (
                      <span className="text-danger small fw-bold mt-1 d-block">
                        {creditLimitMessage}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {isSettlingWayVisible && isCheque && (
                <div className="col-md-7 mt-3">
                  <div
                    className="border border-secondary rounded p-3"
                    style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                  >
                    <h6 className="text-warning fw-bold mb-3">චෙක් විස්තර</h6>
                    <div className="row g-3">
                      <div className="col-4">
                        <label className="text-white small fw-bold">
                          චෙක් දිනය
                        </label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          name="cheque_date"
                          value={form.cheque_date}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="col-4">
                        <label className="text-white small fw-bold">
                          චෙක් අංකය
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="cheque_no"
                          value={form.cheque_no}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="col-4">
                        <label className="text-white small fw-bold">
                          බැංකුව
                        </label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          name="bank"
                          value={form.bank}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isReturns && (
                <div className="col-12 mt-4">
                  <button
                    type="submit"
                    className={`btn btn-sm ${isEditMode ? "btn-success" : "btn-light"}`}
                    id="submitButton"
                    disabled={
                      loading || (isCustomerRelated && creditLimitMessage)
                    }
                    style={{
                      fontWeight: "bold",
                      padding: "6px 40px",
                      fontSize: "1rem",
                    }}
                  >
                    {isEditMode ? "Update" : "Add"}
                  </button>
                  {isEditMode && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary ms-2 fw-bold"
                      onClick={() => handleCancelEdit(form.description)}
                      style={{ padding: "6px 30px", fontSize: "1rem" }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          </form>

          <h4 className="mt-4">අදේණු ණය වාර්තා</h4>
          <div className="table-responsive">
            <table className="table table-bordered table-sm mt-2 bg-white text-dark">
              <thead>
                <tr className="text-center">
                  <th>විස්තරය</th>
                  <th>මුදල</th>
                  <th>විලා / ගොවියා</th>
                  <th>වර්ගය</th>
                  <th>බිල්පත් අං</th>
                  <th>ක්‍රියා</th>
                </tr>
              </thead>
              <tbody>
                {loans.length > 0 ? (
                  loans.map((loan) => {
                    const isNegative =
                      loan.loan_type === "old" ||
                      loan.loan_type === "supplier_repayment" ||
                      loan.loan_type === "outgoing";
                    return (
                      <tr key={loan.id}>
                        <td>{loan.description}</td>
                        <td
                          className={`text-end fw-bold ${isNegative ? "text-danger" : "text-success"}`}
                        >
                          {isNegative ? "-" : ""}
                          {Math.abs(loan.amount).toFixed(2)}
                        </td>
                        <td>
                          {loan.customer_short_name ||
                            loan.supplier_code ||
                            "-"}
                        </td>
                        <td className="text-center">
                          <span
                            className={`badge ${loan.loan_type === "old" ? "bg-primary" : loan.loan_type === "today" ? "bg-success" : loan.loan_type === "ingoing" ? "bg-info text-dark" : loan.loan_type === "outgoing" ? "bg-warning text-dark" : loan.loan_type === "supplier_repayment" ? "bg-danger" : loan.loan_type === "supplier_sale" ? "bg-success" : "bg-secondary"}`}
                          >
                            {loan.loan_type}
                          </span>
                        </td>
                        <td className="text-center">{loan.bill_no || "-"}</td>
                        <td className="text-center">
                          <button
                            className="btn btn-xs btn-warning me-1 fw-bold"
                            onClick={() => handleEdit(loan)}
                          >
                            සංස්කරණය
                          </button>
                          <button
                            className="btn btn-xs btn-danger fw-bold"
                            onClick={() => handleDelete(loan.id)}
                          >
                            මකන්න
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-3">
                      අද සඳහා ණය වාර්තා කිසිවක් සොයාගත නොහැක
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="d-flex flex-wrap gap-2 mt-3">
              <a
                href="/vts_sales_frontend/loan-report"
                className="btn btn-sm btn-dark fw-bold"
              >
                ණය වාර්තාව
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      <LoanBreakdownModal
        show={showCustomerBreakdown}
        onHide={() => setShowCustomerBreakdown(false)}
        data={breakdownData}
      />

      {/* Farmer Modal */}
      <FarmerBreakdownModal
        show={showFarmerBreakdown}
        onHide={() => setShowFarmerBreakdown(false)}
        data={breakdownData}
      />
    </div>
  );
};

export default LoanManager;
