import React, { useState, useEffect, useMemo, useRef } from "react";
import Select from "react-select";

const CustomerList = React.memo(({ customers, type, searchQuery, onSearchChange, selectedPrintedCustomer, selectedUnprintedCustomer, handleCustomerClick, unprintedTotal, formatDecimal, allSales }) => (
  <div className="w-full shadow-xl rounded-xl overflow-y-auto max-h-screen border border-black" style={{ backgroundColor: "#1ec139ff" }}>
    <div style={{ backgroundColor: "#006400" }} className="p-1 rounded-t-xl">
      <h2 className="text-base font-bold text-white mb-1 whitespace-nowrap text-center">
        {type === 'printed' ? 'මුද්‍රිත විකුණුම් වාර්තා ' : 'මුද්‍රණය නොකළ වාර්තා '}
      </h2>
      <input
        type="text"
        placeholder={`Search by ${type === 'printed' ? 'Bill No or Code...' : 'Customer Code...'}`}
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value.toUpperCase())}
        className="w-full px-4 py-0.5 border rounded-xl focus:ring-2 focus:ring-blue-300 uppercase"
      />
    </div>
    <div className="p-1">
      {customers.length === 0 ? (
        <p className="text-gray-700">No {type === 'printed' ? 'printed sales' : 'unprinted sales'} found.</p>
      ) : (
        <ul className="flex flex-col items-center">
          {customers.map(customerCode => {
            const customerSales = allSales.filter(s => s.customer_code === customerCode);
            const customerTotal = customerSales.reduce((sum, sale) => sum + (parseFloat(sale.total) || 0), 0);
            const isSelected = (type === 'printed' ? selectedPrintedCustomer : selectedUnprintedCustomer) === customerCode;

            return (
              <li key={customerCode} className="w-full flex justify-center">
                <button
                  onClick={() => handleCustomerClick(type, customerCode)}
                  className={`w-[250px] px-4 py-1 mb-2 rounded-xl border border-black text-left ${isSelected ? "bg-blue-500 text-white border-blue-600" : "bg-gray-50 hover:bg-gray-100 border-gray-200"}`}
                >
                  <span className="font-semibold w-32 text-left truncate">{customerCode}-{formatDecimal(customerTotal)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  </div>
));

export default function SalesEntry() {
  // Initial data
  const getInitialData = () => ({
    sales: (window.__INITIAL_SALES__ || []).filter(s => s.id),
    printed: (window.__PRINTED_SALES__ || []).filter(s => s.id),
    unprinted: (window.__UNPRINTED_SALES__ || []).filter(s => s.id),
    customers: window.__CUSTOMERS__ || [],
    entries: window.__ENTRIES__ || [],
    items: window.__ITEMS__ || [],
    storeUrl: window.__STORE_URL__ || "/grn",
    csrf: document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "",
    routes: window.__ROUTES__ || {}

  });

  const initialData = getInitialData();
  const refs = {
    customerCode: useRef(null), customerSelect: useRef(null), givenAmount: useRef(null),
    grnSelect: useRef(null), itemName: useRef(null), weight: useRef(null),
    packs: useRef(null), pricePerKg: useRef(null), total: useRef(null)
  };

  const fieldOrder = ["customer_code_input", "customer_code_select", "given_amount", "grn_entry_code", "item_name", "weight", "packs", "price_per_kg", "total"];
  const skipMap = { customer_code_input: "grn_entry_code", grn_entry_code: "weight" };

  // State
  const [allSales, setAllSales] = useState([...initialData.sales, ...initialData.printed, ...initialData.unprinted]);
  const [selectedPrintedCustomer, setSelectedPrintedCustomer] = useState(null);
  const [selectedUnprintedCustomer, setSelectedUnprintedCustomer] = useState(null);
  const [editingSaleId, setEditingSaleId] = useState(null);
  const [grnSearchInput, setGrnSearchInput] = useState("");
  const [searchQueries, setSearchQueries] = useState({ printed: "", unprinted: "" });
  const [errors, setErrors] = useState({});
  const [balanceInfo, setBalanceInfo] = useState({ balancePacks: 0, balanceWeight: 0 });
  const [loanAmount, setLoanAmount] = useState(0);
  const [isManualClear, setIsManualClear] = useState(false);

  const initialFormData = {
    customer_code: "", customer_name: "", supplier_code: "", code: "", item_code: "",
    item_name: "", weight: "", price_per_kg: "", pack_due: "", total: "", packs: "", grn_entry_code: "",
    original_weight: "", original_packs: "", given_amount: ""
  };
  const [formData, setFormData] = useState(initialFormData);

  // Derived data
  const { newSales, printedSales, unprintedSales } = useMemo(() => ({
    newSales: allSales.filter(s => s.id && s.bill_printed !== 'Y' && s.bill_printed !== 'N'),
    printedSales: allSales.filter(s => s.bill_printed === 'Y'),
    unprintedSales: allSales.filter(s => s.bill_printed === 'N')
  }), [allSales]);

  const filterCustomers = (sales, query, searchByBillNo = false) => {
    const allCustomers = [...new Set(sales.map(s => s.customer_code))];
    if (!query) return allCustomers;
    const lowerQuery = query.toLowerCase();
    if (searchByBillNo) {
      const byBillNo = sales.filter(s => (s.bill_no?.toString() || '').toLowerCase().includes(lowerQuery)).map(s => s.customer_code);
      const byCode = allCustomers.filter(code => code.toLowerCase().includes(lowerQuery));
      return [...new Set([...byBillNo, ...byCode])];
    }
    return allCustomers.filter(code => code.toLowerCase().includes(lowerQuery));
  };

  const printedCustomers = useMemo(() => filterCustomers(printedSales, searchQueries.printed, true), [printedSales, searchQueries.printed]);
  const unprintedCustomers = useMemo(() => filterCustomers(unprintedSales, searchQueries.unprinted), [unprintedSales, searchQueries.unprinted]);

  const displayedSales = useMemo(() => {
    let sales = newSales;
    if (selectedUnprintedCustomer) sales = [...sales, ...unprintedSales.filter(s => s.customer_code === selectedUnprintedCustomer)];
    else if (selectedPrintedCustomer) sales = [...sales, ...printedSales.filter(s => s.customer_code === selectedPrintedCustomer)];
    return sales;
  }, [newSales, unprintedSales, printedSales, selectedUnprintedCustomer, selectedPrintedCustomer]);

  const autoCustomerCode = useMemo(() =>
    displayedSales.length > 0 && !isManualClear ? displayedSales[0].customer_code || "" : "",
    [displayedSales, isManualClear]
  );

  // Effects
  useEffect(() => {
    const w = parseFloat(formData.weight) || 0;
    const p = parseFloat(formData.price_per_kg) || 0;
    const packs = parseInt(formData.packs) || 0;
    const packDue = parseFloat(formData.pack_due) || 0;
    setFormData(prev => ({ ...prev, total: (w * p) + (packs * packDue) ? Number(((w * p) + (packs * packDue)).toFixed(2)) : "" }));
  }, [formData.weight, formData.price_per_kg, formData.packs, formData.pack_due]);

  useEffect(() => { refs.customerCode.current?.focus(); }, []);

  useEffect(() => {
    if (formData.grn_entry_code) {
      const matchingEntry = initialData.entries.find((en) => en.code === formData.grn_entry_code);
      setBalanceInfo(matchingEntry ? { balancePacks: matchingEntry.packs || 0, balanceWeight: matchingEntry.weight || 0 } : { balancePacks: 0, balanceWeight: 0 });
    } else setBalanceInfo({ balancePacks: 0, balanceWeight: 0 });
  }, [formData.grn_entry_code, initialData.entries]);

  const currentBillNo = useMemo(() =>
    selectedPrintedCustomer ? printedSales.find(s => s.customer_code === selectedPrintedCustomer)?.bill_no || "N/A" : "",
    [selectedPrintedCustomer, printedSales]
  );

  const calculateTotal = (sales) => sales.reduce((acc, s) =>
    acc + (parseFloat(s.total) || parseFloat(s.weight || 0) * parseFloat(s.price_per_kg || 0) || 0), 0
  );

  const mainTotal = calculateTotal(displayedSales);
  const unprintedTotal = calculateTotal(unprintedSales);
  const formatDecimal = (val) => (Number.isFinite(parseFloat(val)) ? parseFloat(val).toFixed(2) : "0.00");

  // API functions
  const fetchLoanAmount = async (customerCode) => {
    if (!customerCode) return setLoanAmount(0);
    try {
      const loanResponse = await fetch(initialData.routes.getLoanAmount, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf },
        body: JSON.stringify({ customer_short_name: customerCode })
      });
      const loanData = await loanResponse.json();
      setLoanAmount(parseFloat(loanData.total_loan_amount) || 0);
    } catch (loanError) {
      console.error('Error fetching loan amount:', loanError);
      setLoanAmount(0);
    }
  };

  const apiCall = async (url, method, body) => {
    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": initialData.csrf,
          ...(method !== "DELETE" && { "Accept": "application/json" })
        },
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Server error: " + res.statusText);
      return data;
    } catch (error) { throw error; }
  };

  // Event handlers
  const handleKeyDown = (e, currentFieldIndex) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (fieldOrder[currentFieldIndex] === "given_amount" && formData.given_amount) return handleSubmitGivenAmount(e);
      if (fieldOrder[currentFieldIndex] === "price_per_kg") return handleSubmit(e);

      let nextIndex = currentFieldIndex + 1;
      if (skipMap[fieldOrder[currentFieldIndex]]) {
        const targetIndex = fieldOrder.findIndex(f => f === skipMap[fieldOrder[currentFieldIndex]]);
        if (targetIndex !== -1) nextIndex = targetIndex;
      }

      requestAnimationFrame(() => setTimeout(() => {
        const nextRef = Object.values(refs)[nextIndex];
        nextRef?.current?.focus?.() || nextRef?.current?.select?.();
      }, 0));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (field === 'customer_code') {
      const trimmedValue = value.trim();
      setIsManualClear(value === '');
      const matchingCustomer = unprintedCustomers.find(code => code.toLowerCase() === trimmedValue.toLowerCase());
      if (matchingCustomer) {
        setSelectedUnprintedCustomer(matchingCustomer);
        setSelectedPrintedCustomer(null);
      } else if (selectedUnprintedCustomer) setSelectedUnprintedCustomer(null);
      if (!trimmedValue) setLoanAmount(0);
      const customer = initialData.customers.find(c => c.short_name === value);
      if (customer) setFormData(prev => ({ ...prev, customer_name: customer.name }));
      fetchLoanAmount(trimmedValue);
    }

    if (field === 'grn_entry_code') {
      const grnEntry = initialData.entries.find(entry => entry.code === value);
      if (grnEntry) {
        const itemCodeToMatch = grnEntry.item_code;
        const matchingItem = initialData.items.find(i => String(i.no) === String(itemCodeToMatch));
        const fetchedPackDue = parseFloat(matchingItem?.pack_due) || 0;
        setFormData(prev => ({
          ...prev,
          supplier_code: grnEntry.supplier_code,
          item_code: grnEntry.item_code,
          item_name: grnEntry.item_name || "",
          pack_due: fetchedPackDue
        }));
      }
    }
  };

  const handleCustomerSelect = (e) => {
    const short = e.target.value;
    const customer = initialData.customers.find(x => String(x.short_name) === String(short));
    const hasUnprintedSales = unprintedCustomers.includes(short);
    setSelectedUnprintedCustomer(hasUnprintedSales ? short : null);
    setSelectedPrintedCustomer(null);
    setFormData(prev => ({ ...prev, customer_code: short || prev.customer_code, customer_name: customer?.name || "" }));
    fetchLoanAmount(short);
    setIsManualClear(false);
  };

  const handleEditClick = (sale) => {
    setFormData({
      ...sale,
      grn_entry_code: sale.grn_entry_code || sale.code || "",
      item_name: sale.item_name || "",
      customer_code: sale.customer_code || "",
      customer_name: sale.customer_name || "",
      supplier_code: sale.supplier_code || "",
      item_code: sale.item_code || "",
      weight: sale.weight || "",
      price_per_kg: sale.price_per_kg || "",
      pack_due: sale.pack_due || "",
      total: sale.total || "",
      packs: sale.packs || "",
      original_weight: sale.original_weight || "",
      original_packs: sale.original_packs || "",
    });
    setEditingSaleId(sale.id);
    setIsManualClear(false);
    setTimeout(() => { refs.weight.current?.focus(); refs.weight.current?.select(); }, 0);
  };

  const handleTableRowKeyDown = (e, sale) => {
    if (e.key === "Enter") { e.preventDefault(); handleEditClick(sale); }
  };

  const handleClearForm = () => {
    setFormData(initialFormData);
    setEditingSaleId(null);
    setGrnSearchInput("");
    setBalanceInfo({ balancePacks: 0, balanceWeight: 0 });
    setLoanAmount(0);
    setIsManualClear(false);
  };

  const handleDeleteClick = async () => {
    if (!editingSaleId || !window.confirm("Are you sure you want to delete this sales record?")) return;
    try {
      await apiCall(`/sales/${editingSaleId}`, "DELETE");
      setAllSales(prev => prev.filter(s => s.id !== editingSaleId));
      handleClearForm();
      alert("Record deleted successfully.");
    } catch (error) { setErrors({ form: error.message }); }
  };

  const handleSubmitGivenAmount = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!formData.customer_code) {
      setErrors({ form: "Please enter a customer code first" }); refs.customerCode.current?.focus(); return;
    }
    if (!formData.given_amount) { setErrors({ form: "Please enter a given amount" }); return; }

    const customerSales = allSales.filter(s => s.customer_code === formData.customer_code);
    const firstSale = customerSales[0];
    if (!firstSale) { setErrors({ form: "No sales records found for this customer. Please add a sales record first." }); return; }

    try {
      // Use the full route from window.__ROUTES__
      const url = window.__ROUTES__.givenAmount.replace(':id', firstSale.id);

      const data = await apiCall(url, "PUT", {
        given_amount: parseFloat(formData.given_amount) || 0
      });

      setAllSales(prev =>
        prev.map(s => s.id === data.sale.id ? data.sale : s)
      );

      setFormData(prev => ({ ...prev, given_amount: "" }));
      refs.grnSelect.current?.focus();
    } catch (error) {
      setErrors({ form: error.message });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    const isEditing = editingSaleId !== null;
    let billPrintedStatus = undefined;
    if (!isEditing) {
      if (selectedPrintedCustomer) billPrintedStatus = 'Y';
      else if (selectedUnprintedCustomer) billPrintedStatus = 'N';
    }

    const customerSales = allSales.filter(s => s.customer_code === formData.customer_code);
    const isFirstRecordForCustomer = customerSales.length === 0 && !isEditing;

    const payload = {
      supplier_code: formData.supplier_code,
      customer_code: (formData.customer_code || "").toUpperCase(),
      customer_name: formData.customer_name,
      code: formData.code || formData.grn_entry_code,
      item_code: formData.item_code,
      item_name: formData.item_name,
      weight: parseFloat(formData.weight) || 0,
      price_per_kg: parseFloat(formData.price_per_kg) || 0,
      pack_due: parseFloat(formData.pack_due) || 0,
      total: parseFloat(formData.total) || 0,
      packs: parseInt(formData.packs) || 0,
      grn_entry_code: formData.grn_entry_code,
      original_weight: formData.original_weight,
      original_packs: formData.original_packs,
      given_amount: (isFirstRecordForCustomer || (isEditing && customerSales[0]?.id === editingSaleId))
        ? (formData.given_amount ? parseFloat(formData.given_amount) : null)
        : null,
      ...(billPrintedStatus && { bill_printed: billPrintedStatus }),
    };

    try {
      const url = isEditing ? `/sales/${editingSaleId}` : initialData.storeUrl;
      const method = isEditing ? "PUT" : "POST";
      const data = await apiCall(url, method, payload);
      let newSale = isEditing ? data.sale : data.data || {};

      // FIX: Preserve grn_entry_code if API doesn't return it
      if (!newSale.grn_entry_code && formData.grn_entry_code) {
        newSale = { ...newSale, grn_entry_code: formData.grn_entry_code };
      }

      // Also preserve code if needed
      if (!newSale.code && formData.code) {
        newSale = { ...newSale, code: formData.code };
      }

      console.log('🔍 DEBUG - After fixing grn_entry_code:', {
        newSale: {
          code: newSale.code,
          grn_entry_code: newSale.grn_entry_code
        }
      });

      if (!isEditing && billPrintedStatus && !newSale.bill_printed) newSale = { ...newSale, bill_printed: billPrintedStatus };

      setAllSales(prev => isEditing ? prev.map(s => s.id === newSale.id ? newSale : s) : [...prev, newSale]);

      setFormData(prevForm => ({
        customer_code: prevForm.customer_code, customer_name: prevForm.customer_name,
        supplier_code: "", code: "", item_code: "", item_name: "", weight: "", price_per_kg: "", pack_due: "", total: "", packs: "",
        grn_entry_code: "", original_weight: "", original_packs: "", given_amount: ""
      }));

      setEditingSaleId(null); setGrnSearchInput(""); setBalanceInfo({ balancePacks: 0, balanceWeight: 0 }); setIsManualClear(false);
      refs.grnSelect.current?.focus();
    } catch (error) { setErrors({ form: error.message }); }
  };

  const handleCustomerClick = async (type, customerCode) => {
    const isPrinted = type === 'printed';
    const isCurrentlySelected = isPrinted ? selectedPrintedCustomer === customerCode : selectedUnprintedCustomer === customerCode;

    if (isPrinted) {
      setSelectedPrintedCustomer(isCurrentlySelected ? null : customerCode);
      setSelectedUnprintedCustomer(null);
    } else {
      setSelectedUnprintedCustomer(isCurrentlySelected ? null : customerCode);
      setSelectedPrintedCustomer(null);
    }

    const customer = initialData.customers.find(x => String(x.short_name) === String(customerCode));
    const customerSale = allSales.find(s => s.customer_code === customerCode);
    const newCustomerCode = isCurrentlySelected ? "" : customerCode;

    setFormData(prev => ({
      ...prev,
      customer_code: newCustomerCode,
      customer_name: isCurrentlySelected ? "" : customer?.name || "",
      given_amount: isCurrentlySelected ? "" : (customerSale?.given_amount || "")
    }));

    setIsManualClear(false);
    fetchLoanAmount(newCustomerCode);

    // If selecting a customer (not deselecting), automatically submit the given amount if it exists
    // If selecting a customer (not deselecting), automatically submit the given amount if it exists
    if (!isCurrentlySelected && newCustomerCode && customerSale?.given_amount) {
      setTimeout(async () => {
        try {
          // Filter all sales for the selected customer
          const customerSales = allSales.filter(s => s.customer_code === newCustomerCode);
          const firstSale = customerSales[0];

          if (firstSale) {
            // Replace :id with actual sale ID
            const url = window.__ROUTES__.givenAmount.replace(':id', firstSale.id);

            // Make PUT request to update given_amount
            const data = await apiCall(url, "PUT", {
              given_amount: parseFloat(customerSale.given_amount) || 0
            });

            // Update local state with returned sale
            setAllSales(prev =>
              prev.map(s => s.id === data.sale.id ? data.sale : s)
            );
          }
        } catch (error) {
          console.error("Error updating given amount:", error);
          setErrors({ form: error.message });
        }
      }, 100);
    }

    if (isCurrentlySelected) {
      refs.customerCode.current?.focus();
      handleClearForm();
    } else {
      refs.grnSelect.current?.focus();
    }
  };

  // Button handlers
  const handleMarkPrinted = async () => {
    try { await handlePrintAndClear(); } catch (error) { alert("Mark printed failed: " + error.message); }
  };

  const handleMarkAllProcessed = async () => {
    const salesToProcess = [...newSales, ...unprintedSales];
    if (salesToProcess.length === 0) return; // no alert

    try {
      const data = await apiCall(initialData.routes.markAllProcessed, "POST", {
        sales_ids: salesToProcess.map(s => s.id)
      });

      if (data.success) {
        setAllSales(prev =>
          prev.map(s =>
            salesToProcess.some(ps => ps.id === s.id)
              ? { ...s, bill_printed: "N" }
              : s
          )
        );
        handleClearForm();
        setSelectedUnprintedCustomer(null);
        setSelectedPrintedCustomer(null);

        // multiple delayed focus attempts
        [50, 100, 150, 200, 250].forEach(timeout =>
          setTimeout(() => refs.customerCode.current?.focus(), timeout)
        );
      }
    } catch (err) {
      console.error("Failed to mark sales as processed:", err.message);
    }
  };
  const handleFullRefresh = () => { window.location.reload(); };

  // Receipt functions
  const printSingleContent = async (html, customerName) => {
    return new Promise((resolve) => {
      const originalContent = document.body.innerHTML;
      document.title = customerName;

      const cleanup = () => {
        document.body.innerHTML = originalContent;
        resolve();
      };

      const tryPrint = () => {
        try {
          window.focus();
          window.print();
        } catch (err) {
          console.error("Print failed:", err);
        } finally {
          resolve();
        }
      };

      const afterPrintHandler = () => {
        window.removeEventListener("afterprint", afterPrintHandler);
        cleanup();
      };
      window.addEventListener("afterprint", afterPrintHandler);

      document.body.innerHTML = html;
      if (document.readyState === "complete") {
        tryPrint();
      } else {
        window.onload = tryPrint;
      }
      setTimeout(cleanup, 3000);
    });
  };

  const buildFullReceiptHTML = (salesData, billNo, customerName, mobile, globalLoanAmount = 0) => {
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();
    let totalAmountSum = 0, totalPacksSum = 0;
    const itemGroups = {};

    const itemsHtml = salesData.map(s => {
      totalAmountSum += parseFloat(s.total) || 0;
      const packs = parseInt(s.packs) || 0;
      totalPacksSum += packs;
      if (!itemGroups[s.item_name]) itemGroups[s.item_name] = { totalWeight: 0, totalPacks: 0 };
      itemGroups[s.item_name].totalWeight += parseFloat(s.weight) || 0;
      itemGroups[s.item_name].totalPacks += packs;
      return `<tr style="font-size:1.2em;">
        <td style="text-align:left;">${s.item_name || ""} <br>${packs}</td>
        <td style="text-align:right; padding-right:18px;">${(parseFloat(s.weight) || 0).toFixed(2)}</td>
        <td style="text-align:right;">${(parseFloat(s.price_per_kg) || 0).toFixed(2)}</td>
        <td style="text-align:right;">${((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)).toFixed(2)}</td>
      </tr>`;
    }).join("");

    const totalPrice = totalAmountSum;
    const totalSalesExcludingPackDue = salesData.reduce((sum, s) => sum + ((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0)), 0);
    const totalPackDueCost = totalPrice - totalSalesExcludingPackDue;
    const givenAmount = salesData.reduce((sum, s) => sum + (parseFloat(s.given_amount) || 0), 0);
    const remaining = givenAmount - totalPrice;

    let itemSummaryHtml = '';
    const entries = Object.entries(itemGroups);
    for (let i = 0; i < entries.length; i += 2) {
      const first = entries[i], second = entries[i + 1];
      itemSummaryHtml += '<div style="display:flex; gap:0.5rem; margin-bottom:0.2rem;">';
      itemSummaryHtml += `<span style="padding:0.1rem 0.3rem;border-radius:0.5rem;background-color:#f3f4f6;font-size:0.6rem;">
        <strong>${first[0]}</strong>:${first[1].totalWeight}/${first[1].totalPacks}</span>`;
      if (second) itemSummaryHtml += `<span style="padding:0.1rem 0.3rem;border-radius:0.5rem;background-color:#f3f4f6;font-size:0.6rem;">
        <strong>${second[0]}</strong>:${second[1].totalWeight}/${second[1].totalPacks}</span>`;
      itemSummaryHtml += '</div>';
    }

    const givenAmountRow = givenAmount > 0 ? `<tr>
      <td style="width:50%;text-align:left;white-space:nowrap;"><span style="font-size:0.75rem;">දුන් මුදල: </span><span style="font-weight:bold;font-size:0.9rem;">${givenAmount.toFixed(2)}</span></td>
      <td style="width:50%;text-align:right;white-space:nowrap;font-size:1rem;"><span style="font-size:0.8rem;">ඉතිරිය: </span><span style="font-weight:bold;font-size:1.5rem;">${Math.abs(remaining).toFixed(2)}</span></td>
    </tr>` : '';

    const loanRow = globalLoanAmount > 0 ? `<tr>
      <td style="font-weight:normal;font-size:0.9rem;text-align:left;">පෙර ණය: Rs. <span>${globalLoanAmount.toFixed(2)}</span></td>
      <td style="font-weight:bold;text-align:right;font-size:1.5em;">Rs. ${(globalLoanAmount + totalPrice).toFixed(2)}</td>
    </tr>` : '';

    return `<div class="receipt-container" style="width:100%;max-width:300px;margin:0 auto;padding:5px;">
      <div style="text-align:center;margin-bottom:5px;">
        <h3 style="font-size:1.8em;font-weight:bold;margin:0;"><span style="border:2px solid #000;padding:0.1em 0.3em;display:inline-block;margin-right:5px;">B32</span>TAG ට්‍රේඩර්ස්</h3>
        <p style="margin:0;font-size:0.7em;">අල, ෆී ළූනු, කුළුබඩු තොග ගෙන්වන්නෝ බෙදාහරින්නෝ</p>
        <p style="margin:0;font-size:0.7em;">වි.ආ.ම. වේයන්ගොඩ</p>
      </div>
      <div style="text-align:left;margin-bottom:5px;">
        <table style="width:100%;font-size:9px;border-collapse:collapse;">
          <tr><td style="width:50%;">දිනය : ${date}</td><td style="width:50%;text-align:right;">${time}</td></tr>
          <tr><td colspan="2">දුර : ${mobile || ''}</td></tr>
          <tr><td>බිල් අංකය : <strong>${billNo}</strong></td><td style="text-align:right;"><strong style="font-size:1.8em;">${customerName.toUpperCase()}</strong></td></tr>
        </table>
      </div>
      <hr style="border:0.5px solid #000;margin:5px 0;">
      <table style="width:100%;font-size:9px;border-collapse:collapse;">
        <thead style="font-size:1.5em;">
          <tr><th style="text-align:left;padding:2px;">වර්ගය<br>මලු</th><th style="padding:2px;">කිලෝ</th><th style="padding:2px;">මිල</th><th style="text-align:right;padding:2px;">අගය</th></tr>
        </thead>
        <tbody>
          <tr><td colspan="4"> <hr style="border:0.5px solid #000;margin:5px 0;"></td></tr>
          ${itemsHtml}
          <tr><td colspan="4"><hr style="border:0.5px solid #000;margin:5px 0;"></td></tr>
          <tr><td colspan="2" style="text-align:left;font-weight:bold;font-size:1.2em;">${totalPacksSum}</td><td colspan="2" style="text-align:right;font-weight:bold;font-size:1.2em;">${totalSalesExcludingPackDue.toFixed(2)}</td></tr>
        </tbody>
      </table>
      <table style="width:100%;font-size:11px;border-collapse:collapse;">
        <tr><td>ප්‍රවාහන ගාස්තු:</td><td style="text-align:right;font-weight:bold;">00</td></tr>
        <tr><td>කුලිය:</td><td style="text-align:right;font-weight:bold;">${totalPackDueCost.toFixed(2)}</td></tr>
        <tr><td>අගය:</td><td style="text-align:right;font-weight:bold;"><span style="display:inline-block;border-top:1px solid #000;border-bottom:3px double #000;padding:2px 4px;min-width:80px;text-align:right;">${(totalPrice).toFixed(2)}</span></td></tr>
        ${givenAmountRow}${loanRow}
      </table>
      <hr style="border:0.5px solid #000;margin:5px 0;">
      <div style="font-size:10px;">${itemSummaryHtml}</div>
      <div style="text-align:center;margin-top:10px;font-size:10px;">
        <p style="margin:0;">භාණ්ඩ පරීක්ෂාකර බලා රැගෙන යන්න</p><p style="margin:0;">නැවත භාර ගනු නොලැබේ</p>
      </div>
    </div>`;
  };

  const handlePrintAndClear = async () => {
    const salesData = displayedSales.filter(s => s.id);
    if (!salesData.length) return alert("No sales records to print!");

    try {
      const [printResponse, loanResponse] = await Promise.allSettled([
        apiCall(initialData.routes.markPrinted, "POST", { sales_ids: salesData.map(s => s.id) }),
        fetch(initialData.routes.getLoanAmount, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': initialData.csrf },
          body: JSON.stringify({ customer_short_name: salesData[0].customer_code || "N/A" })
        }).then(res => res.json())
      ]);

      if (printResponse.status === 'rejected' || printResponse.value.status !== "success") {
        throw new Error(printResponse.value?.message || "Printing failed");
      }

      const customerCode = salesData[0].customer_code || "N/A";
      const customerName = customerCode;
      const mobile = salesData[0].mobile || '0773358518';
      const billNo = printResponse.value.bill_no || "";

      let globalLoanAmount = 0;
      if (loanResponse.status === 'fulfilled') {
        globalLoanAmount = parseFloat(loanResponse.value.total_loan_amount) || 0;
      }

      const receiptHtml = buildFullReceiptHTML(salesData, billNo, customerName, mobile, globalLoanAmount);
      const copyHtml = `<div style="text-align:center;font-size:2em;font-weight:bold;color:red;margin-bottom:10px;">COPY</div>${receiptHtml}`;

      const printPromises = [
        printSingleContent(receiptHtml, customerName),
        printSingleContent(copyHtml, customerName)
      ];

      await Promise.all(printPromises);
      window.location.reload();

      setAllSales(prev => prev.map(s => {
        const isPrinted = salesData.some(d => d.id === s.id);
        return isPrinted ? { ...s, bill_printed: 'Y', bill_no: billNo } : s;
      }));

      setSelectedUnprintedCustomer(null);
      setSelectedPrintedCustomer(null);
      handleClearForm();
    } catch (error) {
      alert("Printing failed: " + error.message);
      setTimeout(() => { window.location.reload(); }, 100);
    }
  };

  const handleCustomerCodeChange = (e) => {
    const code = e.target.value;
    const customer = initialData.customers.find(x => String(x.short_name) === String(code));
    const customerSale = allSales.find(s => s.customer_code === code);
    if (!code) {
      setFormData(prev => ({ ...prev, customer_code: "", customer_name: "", given_amount: "" }));
      setSelectedPrintedCustomer(null); setSelectedUnprintedCustomer(null); fetchLoanAmount("");
    } else {
      setFormData(prev => ({ ...prev, customer_code: code, customer_name: customer?.name || "", given_amount: customerSale?.given_amount || "" }));
      fetchLoanAmount(code);
    }
  };

  // Shortcut effects
  useEffect(() => {
    const handleShortcut = (e) => {
      if (e.key === "F1") {
        e.preventDefault(); handlePrintAndClear().finally(() => {
          [100, 200, 300, 500, 800].forEach(timeout => setTimeout(() => refs.customerCode.current?.focus(), timeout));
        });
      } else if (e.key === "F5") { e.preventDefault(); handleMarkAllProcessed(); }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [displayedSales, newSales]);
  //item summary in sales table
  const calculateItemSummary = (sales) => {
    const summary = {};

    sales.forEach(sale => {
      const itemName = sale.item_name || 'Unknown';
      if (!summary[itemName]) {
        summary[itemName] = {
          totalWeight: 0,
          totalPacks: 0
        };
      }
      summary[itemName].totalWeight += parseFloat(sale.weight) || 0;
      summary[itemName].totalPacks += parseInt(sale.packs) || 0;
    });

    return summary;
  };

  // Then add this component after the table but before the total sales display
  const ItemSummary = ({ sales, formatDecimal }) => {
    const summary = calculateItemSummary(sales);

    if (Object.keys(summary).length === 0) return null;

    return (
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-bold text-gray-700 mb-2 text-center">Item Summary</h3>
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(summary).map(([itemName, data]) => (
            <div
              key={itemName}
              className="px-3 py-1 bg-white border border-gray-300 rounded-full text-xs font-medium"
            >
              <span className="font-semibold">{itemName}:</span>
              <span className="ml-1 text-blue-600">{(data.totalWeight)}kg</span>
              <span className="mx-1 text-gray-400">/</span>
              <span className="text-green-600">{data.totalPacks}p</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="min-h-screen flex flex-row p-4 pt-0 -mt-4" style={{ backgroundColor: "#99ff99" }}>
      <div className="w-1/3 sticky top-0 h-screen overflow-y-auto pr-2 ml-[-30px]">
        <CustomerList customers={printedCustomers} type="printed" searchQuery={searchQueries.printed}
          onSearchChange={(value) => setSearchQueries(prev => ({ ...prev, printed: value }))}
          selectedPrintedCustomer={selectedPrintedCustomer} selectedUnprintedCustomer={selectedUnprintedCustomer}
          handleCustomerClick={handleCustomerClick} unprintedTotal={unprintedTotal} formatDecimal={formatDecimal} allSales={allSales} />
      </div>

      <div className="w-[100%] shadow-2xl rounded-3xl p-6" style={{ backgroundColor: "#111439ff" }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-between items-center bg-gray-50 p-0.5 rounded-xl shadow-sm border border-black">
            <span className="text-gray-600 font-medium">Bill No: {currentBillNo}</span>
            <h2 className="text-2xl font-bold text-red-600">Total Sales: Rs. {formatDecimal(mainTotal)}</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-3 gap-4">
              <input id="customer_code_input" ref={refs.customerCode} name="customer_code"
                value={formData.customer_code || autoCustomerCode} onChange={(e) => {
                  const value = e.target.value.toUpperCase(); handleInputChange("customer_code", value);
                  if (value.trim() === "") {
                    setFormData(prev => ({ ...prev, customer_code: "", customer_name: "", given_amount: "" }));
                    setSelectedPrintedCustomer(null); setSelectedUnprintedCustomer(null);
                  }
                }} onKeyDown={(e) => handleKeyDown(e, 0)} type="text" maxLength={10} placeholder="Customer Code"
                className="px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-300 uppercase" />

              <select id="customer_code_select" ref={refs.customerSelect} value={formData.customer_code}
                onChange={handleCustomerSelect} onKeyDown={(e) => handleKeyDown(e, 1)} className="px-4 py-2 border rounded-xl">
                <option value="">-- Select Customer --</option>
                {initialData.customers.map(c => <option key={c.short_name} value={c.short_name}>{c.name} ({c.short_name})</option>)}
              </select>

              <input type="text" readOnly value={`Loan: Rs. ${formatDecimal(loanAmount)}`} placeholder="Loan Amount"
                className="px-4 py-2 border rounded-xl bg-yellow-100 text-red-600 font-bold" />
            </div>

            <Select
              id="grn_entry_code"
              ref={refs.grnSelect}
              value={formData.grn_entry_code ? {
                value: formData.grn_entry_code,
                label: formData.grn_entry_code,
                data: initialData.entries.find((en) => en.code === formData.grn_entry_code)
              } : null}
              onChange={(selected) => {
                if (selected?.data) {
                  const entry = selected.data;
                  const matchingItem = initialData.items.find(i => String(i.no) === String(entry.item_code));
                  const fetchedPackDue = parseFloat(matchingItem?.pack_due) || 0;
                  setFormData(prev => ({
                    ...prev,
                    grn_entry_code: selected.value,
                    item_name: entry.item_name || "",
                    supplier_code: entry.supplier_code || "",
                    item_code: entry.item_code || "",
                    price_per_kg: entry.price_per_kg || entry.PerKGPrice || entry.SalesKGPrice || "",
                    pack_due: fetchedPackDue,
                    weight: editingSaleId ? prev.weight : "",
                    packs: editingSaleId ? prev.packs : "",
                    total: editingSaleId ? prev.total : ""
                  }));
                  setGrnSearchInput("");
                  requestAnimationFrame(() => setTimeout(() => refs.weight.current?.focus(), 10));
                }
              }}
              onInputChange={(inputValue, { action }) => {
                if (action === "input-change") {
                  const upperValue = inputValue.toUpperCase();
                  setGrnSearchInput(upperValue);
                  return upperValue;
                }
                return inputValue;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && formData.grn_entry_code && !e.isPropagationStopped()) {
                  e.preventDefault(); setTimeout(() => refs.weight.current?.focus(), 0);
                }
              }}
              getOptionLabel={(option) => `${option.data?.code} - ${option.data?.item_name || "Unknown Item"}`}
              getOptionValue={(option) => option.value}
              options={initialData.entries.map((en, index) => ({ value: en.code, label: en.code, data: en, index }))}
              placeholder="Select GRN Entry"
              isSearchable={true}
              noOptionsMessage={() => "No GRN entries found"}
              formatOptionLabel={(option, { context }) => {
                if (context === "value" || !option.data) {
                  const entry = option.data || initialData.entries.find((en) => en.code === option.value);
                  return <span>{option.label} - {entry?.item_name || "Unknown Item"} (<strong>Price:</strong> Rs.{formatDecimal(entry?.price_per_kg || entry?.PerKGPrice || entry?.SalesKGPrice)} / <strong>BW:</strong> {formatDecimal(entry?.weight)} / <strong>BP:</strong> {entry?.packs || 0})</span>;
                }
                const entry = option.data;
                const HeaderRow = () => (
                  <div className="grid grid-cols-[120px_150px_55px_70px_55px_70px_90px] gap-1 px-2 py-1.5 bg-gray-100 font-bold text-xs border-b border-gray-300 items-center">
                    <div className="text-left">Code</div>
                    <div className="text-left">Item Name</div>
                    <div className="text-center">OP</div>
                    <div className="text-center">OW</div>
                    <div className="text-center">BP</div>
                    <div className="text-center">BW</div>
                    <div className="text-right">PRICE</div>
                  </div>
                );
                const DataRow = ({ entry, showHeader = false }) => (
                  <div className="w-full">
                    {showHeader && <HeaderRow />}
                    <div className="grid grid-cols-[120px_150px_55px_70px_55px_70px_90px] gap-1 px-2 py-1 text-sm border-b border-gray-100 hover:bg-gray-50 items-center">
                      <div className="text-left font-medium text-blue-700 truncate" title={entry.code || "-"}>{entry.code || "-"}</div>
                      <div className="text-left truncate" title={entry.item_name || "Unknown Item"}>{entry.item_name || "Unknown Item"}</div>
                      <div className="text-center">{entry.original_packs || "0"}</div>
                      <div className="text-center">{formatDecimal(entry.original_weight)}</div>
                      <div className="text-center">{entry.packs || "0"}</div>
                      <div className="text-center">{formatDecimal(entry.weight)}</div>
                      <div className="text-right font-semibold text-green-600">Rs. {formatDecimal(entry.price_per_kg || entry.PerKGPrice || entry.SalesKGPrice)}</div>
                    </div>
                  </div>
                );
                return <DataRow entry={entry} showHeader={option.index === 0} />;
              }}
              components={{
                Option: ({ innerRef, innerProps, isFocused, isSelected, data }) => {
                  const HeaderRow = () => (
                    <div className="grid grid-cols-[120px_150px_55px_70px_55px_70px_90px] gap-1 px-2 py-1.5 bg-gray-100 font-bold text-xs border-b border-gray-300 items-center">
                      <div className="text-left">Code</div><div className="text-left">Item Name</div><div className="text-center">OP</div>
                      <div className="text-center">OW</div><div className="text-center">BP</div><div className="text-center">BW</div><div className="text-right">PRICE</div>
                    </div>
                  );
                  const DataRow = ({ data, showHeader = false }) => (
                    <div ref={innerRef} {...innerProps} className={`${isFocused ? "bg-blue-50" : ""} ${isSelected ? "bg-blue-100" : ""} cursor-pointer`}>
                      {showHeader && <HeaderRow />}
                      <div className="grid grid-cols-[120px_150px_55px_70px_55px_70px_90px] gap-1 px-2 py-1 text-sm border-b border-gray-100 hover:bg-gray-50 items-center">
                        <div className="text-left font-medium text-blue-700 truncate" title={data.data.code || "-"}>{data.data.code || "-"}</div>
                        <div className="text-left truncate" title={data.data.item_name || "Unknown Item"}>{data.data.item_name || "Unknown Item"}</div>
                        <div className="text-center">{data.data.original_packs || "0"}</div>
                        <div className="text-center">{formatDecimal(data.data.original_weight)}</div>
                        <div className="text-center">{data.data.packs || "0"}</div>
                        <div className="text-center">{formatDecimal(data.data.weight)}</div>
                        <div className="text-right font-semibold text-green-600">Rs. {formatDecimal(data.data.price_per_kg || data.data.PerKGPrice || data.data.SalesKGPrice)}</div>
                      </div>
                    </div>
                  );
                  return <DataRow data={data} showHeader={data.index === 0} />;
                }
              }}
              styles={{
                option: (base) => ({ ...base, padding: 0, backgroundColor: "transparent" }),
                menu: (base) => ({ ...base, width: "680px", maxWidth: "95vw" }),
                menuList: (base) => ({ ...base, padding: 0, maxHeight: "400px" }),
                control: (base) => ({ ...base, minHeight: "44px" })
              }}
            />
            <div className="flex items-center gap-4">
              <div className="relative">
                <input id="item_name" ref={refs.itemName} type="text" value={formData.item_name} readOnly placeholder="අයිතමයේ නාමය" onKeyDown={(e) => handleKeyDown(e, 4)} className="px-4 py-2 border rounded-xl text-base w-40" />
                {balanceInfo.balanceWeight > 0 && <div className="absolute top-full left-0 right-0 mt-1 text-xs text-gray-600 bg-yellow-50 px-2 py-1 rounded border">BW: {formatDecimal(balanceInfo.balanceWeight)} kg</div>}
              </div>

              <input id="weight" ref={refs.weight} name="weight" type="number" step="0.01" value={formData.weight} onChange={(e) => handleInputChange('weight', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 5)} placeholder="බර" className="px-4 py-2 border rounded-xl text-right w-24" />

              <div className="relative">
                <input id="packs" ref={refs.packs} name="packs" type="number" value={formData.packs} onChange={(e) => handleInputChange('packs', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 6)} placeholder="මලු" className="px-4 py-2 border rounded-xl text-right w-24" />
                {balanceInfo.balancePacks > 0 && <div className="absolute top-full left-0 right-0 mt-1 text-xs text-gray-600 bg-yellow-50 px-2 py-1 rounded border">BP: {balanceInfo.balancePacks}</div>}
              </div>

              <input id="price_per_kg" ref={refs.pricePerKg} name="price_per_kg" type="number" step="0.01" value={formData.price_per_kg} onChange={(e) => handleInputChange('price_per_kg', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 7)} placeholder="මිල" className="px-4 py-2 border rounded-xl text-right w-28" />

              <input id="total" ref={refs.total} name="total" type="number" value={formData.total} readOnly placeholder="Total" onKeyDown={(e) => handleKeyDown(e, 8)} onInput={(e) => e.target.value.length > 6 && (e.target.value = e.target.value.slice(0, 6))} className="px-4 py-2 border bg-gray-100 rounded-xl font-semibold text-right w-32" />
            </div>
          </div>

          <div className="flex space-x-4">
            <button type="submit" style={{ display: "none" }} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition">
              {editingSaleId ? "Update Sales Entry" : "Add Sales Entry"}</button>
            {editingSaleId && <button type="button" onClick={handleDeleteClick} className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition">Delete</button>}
            <button type="button" onClick={handleClearForm} className="hidden py-3 px-6 bg-gray-400 hover:bg-gray-500 text-white font-bold rounded-xl shadow-lg transition">Clear</button>
          </div>
        </form>

        {errors.form && <div className="mt-6 p-3 bg-red-100 text-red-700 rounded-xl">{errors.form}</div>}

        <div className="mt-6">
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-xl text-sm">
              <thead className="bg-gray-100"><tr>
                <th className="px-4 py-2 border">කේතය</th><th className="px-4 py-2 border">අයිතමය</th>
                <th className="px-4 py-2 border">බර(kg)</th><th className="px-4 py-2 border min-w-24">මිල</th><th className="px-4 py-2 border">සමස්ත</th><th className="px-4 py-2 border">මලු</th>
              </tr></thead>
              <tbody className="bg-black text-white">{displayedSales.map((s, idx) => (
                <tr key={s.id || idx} tabIndex={0} className="text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-100"
                  onClick={() => handleEditClick(s)} onKeyDown={(e) => handleTableRowKeyDown(e, s)}>
                  <td className="px-4 py-2 border">{s.code}</td><td className="px-4 py-2 border">{s.item_name}</td>
                  <td className="px-4 py-2 border">{formatDecimal(s.weight)}</td><td className="px-4 py-2 border">{formatDecimal(s.price_per_kg)}</td>
                  <td className="px-4 py-2 border">{formatDecimal((parseFloat(s.weight) || 0) * (parseFloat(s.price_per_kg) || 0))}</td>
                  <td className="px-4 py-2 border">{s.packs}</td>
                </tr>
              ))}</tbody>
            </table>
            {/* Add the Item Summary here */}
            <ItemSummary sales={displayedSales} formatDecimal={formatDecimal} />
            <div className="flex items-center justify-between mt-6 mb-4">
              <h2 className="text-2xl font-bold text-red-600">Total Sales: Rs. {formatDecimal(mainTotal)}</h2>
              <input id="given_amount" ref={refs.givenAmount} name="given_amount" type="number" step="0.01" value={formData.given_amount}
                onChange={(e) => handleInputChange('given_amount', e.target.value)} onKeyDown={(e) => handleKeyDown(e, 2)} placeholder="Given Amount"
                className="px-4 py-2 border rounded-xl text-right w-40" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="flex space-x-3">
            <button type="button" onClick={handleMarkPrinted} className="px-4 py-1 text-sm bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow transition">
              Mark Printed</button>
            <button type="button" onClick={handleMarkAllProcessed} className="px-4 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition">
              Mark All Processed</button>
            <button type="button" onClick={handleFullRefresh} className="px-4 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl shadow transition">
              Full Refresh</button>
          </div>
        </div>
      </div>

      <div className="w-1/3 sticky top-0 h-screen overflow-y-auto pl-2 mr-[-30px]">
        <CustomerList customers={unprintedCustomers} type="unprinted" searchQuery={searchQueries.unprinted}
          onSearchChange={(value) => setSearchQueries(prev => ({ ...prev, unprinted: value }))}
          selectedPrintedCustomer={selectedPrintedCustomer} selectedUnprintedCustomer={selectedUnprintedCustomer}
          handleCustomerClick={handleCustomerClick} unprintedTotal={unprintedTotal} formatDecimal={formatDecimal} allSales={allSales} />
      </div>
    </div>
  );
}