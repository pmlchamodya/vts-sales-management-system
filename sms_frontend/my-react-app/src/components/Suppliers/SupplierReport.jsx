import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import api from "../../api";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

const SupplierReport = () => {
  const navigate = useNavigate();

  // State for all data
  const [summary, setSummary] = useState({ printed: [], unprinted: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Bill size selector (3mm or 4mm) - PERSISTED
  const [billSize, setBillSize] = useState(() => {
    const saved = localStorage.getItem("supplier_bill_size");
    return saved || "3mm";
  });

  // Print Format selector (Thermal or A4) - PERSISTED
  const [printFormat, setPrintFormat] = useState(() => {
    const saved = localStorage.getItem("supplier_print_format");
    return saved || "thermal";
  });

  const [printedSearchTerm, setPrintedSearchTerm] = useState("");
  const [unprintedSearchTerm, setUnprintedSearchTerm] = useState("");
  const [isPhoneManuallyChanged, setIsPhoneManuallyChanged] = useState(false);

  // States for telephone no
  const [phoneNo, setPhoneNo] = useState("");
  const [phoneStatus, setPhoneStatus] = useState("");

  // For loan/paying amount
  const [payingAmount, setPayingAmount] = useState("");
  const [loanStatus, setLoanStatus] = useState("");

  const [currentView, setCurrentView] = useState("summary");
  const [profilePic, setProfilePic] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [supplierDocs, setSupplierDocs] = useState({
    title: "",
    profile: null,
    nic_front: null,
    nic_back: null,
  });

  // Lorry Transactions Data
  const [lorryTransactions, setLorryTransactions] = useState([]);

  // Lorry Editing States
  const [editingLorryId, setEditingLorryId] = useState(null);
  const [editLorryFormData, setEditLorryFormData] = useState({});

  // State to hold supplier specific loan transactions (Repayments & Sales)
  const [supplierLoans, setSupplierLoans] = useState([]);

  // Lorry Transaction Form State
  const [lorryFormData, setLorryFormData] = useState({
    lorry_name: "",
    customer_code: "",
    total_amount: "", // Used as Quantity
    box_type: "",
    lorry_amount: "",
    nattami: "",
  });
  const [isLorryLoading, setIsLorryLoading] = useState(false);

  // Load saved values from localStorage on component mount
  useEffect(() => {
    const savedBillSize = localStorage.getItem("supplier_bill_size");
    if (savedBillSize) setBillSize(savedBillSize);

    const savedPrintFormat = localStorage.getItem("supplier_print_format");
    if (savedPrintFormat) setPrintFormat(savedPrintFormat);
  }, []);

  // Save settings to localStorage
  useEffect(
    () => localStorage.setItem("supplier_bill_size", billSize),
    [billSize],
  );
  useEffect(
    () => localStorage.setItem("supplier_print_format", printFormat),
    [printFormat],
  );

  // State for Details Panel
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedBillNo, setSelectedBillNo] = useState(null);
  const [isUnprintedBill, setIsUnprintedBill] = useState(false);
  const [supplierDetails, setSupplierDetails] = useState([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const [advanceAmount, setAdvanceAmount] = useState(0);

  const [advancePayload, setAdvancePayload] = useState({
    code: "",
    advance_amount: "",
  });
  const [advanceLoading, setAdvanceLoading] = useState(false);
  const [advanceStatus, setAdvanceStatus] = useState({ type: "", text: "" });

  const [editingRecord, setEditingRecord] = useState(null);
  const [newFarmerCode, setNewFarmerCode] = useState("");
  const [newCustomerCode, setNewCustomerCode] = useState("");
  const [applyToAllSameItems, setApplyToAllSameItems] = useState(true);

  const refreshIntervalRef = useRef(null);
  const isPrintingOrUpdatingRef = useRef(false);

  // FORMATTER
  const formatDecimal = (value, decimals = 2) =>
    Math.abs(parseFloat(value) || 0).toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const fetchLorryTransactions = async () => {
    try {
      const response = await api.get("/lorry-transactions");
      setLorryTransactions(response.data);
    } catch (error) {
      console.error("Error fetching lorry transactions:", error);
    }
  };

  // Function to fetch supplier specific loans for the print out
  const fetchSupplierLoans = useCallback(async (supplierCode) => {
    if (!supplierCode) return;
    try {
      const response = await api.get(`/customers-loans/data`);
      const filteredLoans = (response.data.loans || []).filter(
        (loan) =>
          loan.supplier_code === supplierCode &&
          (loan.loan_type === "supplier_repayment" ||
            loan.loan_type === "supplier_sale"),
      );
      setSupplierLoans(filteredLoans);
    } catch (error) {
      console.error("Error fetching supplier loans:", error);
    }
  }, []);

  const fetchSummary = useCallback(async (isAutoRefresh = false) => {
    if (isPrintingOrUpdatingRef.current) return;

    if (isAutoRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    setCurrentView("summary");
    try {
      const response = await api.get("/suppliers/bill-status-summary");
      if (response.data) {
        setSummary({
          printed: response.data.printed || [],
          unprinted: response.data.unprinted || [],
        });
      } else {
        setSummary({ printed: [], unprinted: [] });
      }
    } catch (error) {
      console.error("Error fetching summary data:", error.message);
      setSummary({ printed: [], unprinted: [] });
    } finally {
      if (isAutoRefresh) setIsRefreshing(false);
      else setIsLoading(false);
    }
  }, []);

  const fetchSupplierProfile = useCallback(
    async (supplierCode) => {
      if (!supplierCode || isPrintingOrUpdatingRef.current) return;

      try {
        const supRes = await api.get(
          `/suppliers/search-by-code/${supplierCode}`,
        );
        if (supRes.data) {
          setAdvanceAmount(parseFloat(supRes.data.advance_amount) || 0);
          setProfilePic(supRes.data.profile_pic);

          if (!isPhoneManuallyChanged) {
            setPhoneNo(supRes.data.telephone_no || "");
          }

          setSupplierDocs({
            title: supRes.data.name || supplierCode,
            profile: supRes.data.profile_pic,
            nic_front: supRes.data.nic_front,
            nic_back: supRes.data.nic_back,
          });
        }
      } catch (error) {
        console.warn(`Supplier profile not found for code: ${supplierCode}`);
      }
    },
    [isPhoneManuallyChanged],
  );

  const refreshBillDetails = useCallback(async () => {
    if (!selectedSupplier || isPrintingOrUpdatingRef.current) return;

    try {
      if (isUnprintedBill) {
        const response = await api.get(
          `/suppliers/${selectedSupplier}/unprinted-details`,
        );
        setSupplierDetails(response.data || []);
      } else if (selectedBillNo) {
        const response = await api.get(
          `/suppliers/bill/${selectedBillNo}/details`,
        );
        setSupplierDetails(response.data || []);
      }
    } catch (error) {
      console.warn(`No bill details found for: ${selectedSupplier}`);
      setSupplierDetails([]);
    }
  }, [selectedSupplier, selectedBillNo, isUnprintedBill]);

  useEffect(() => {
    fetchLorryTransactions();

    refreshIntervalRef.current = setInterval(async () => {
      await fetchSummary(true);
      if (selectedSupplier && !editingLorryId) {
        await refreshBillDetails();
        await fetchSupplierProfile(selectedSupplier);
        await fetchLorryTransactions();
        await fetchSupplierLoans(selectedSupplier);
      }
    }, 3000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [
    fetchSummary,
    refreshBillDetails,
    fetchSupplierProfile,
    fetchSupplierLoans,
    selectedSupplier,
    editingLorryId,
  ]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const goToSalesEntry = () => {
    navigate("/sales");
  };

  const {
    totalWeight,
    totalPacksSum,
    totalsupplierSales,
    totalCustomerPackCost,
    totalCommission,
    itemSummaryData,
  } = useMemo(() => {
    let tWeight = 0,
      tPacks = 0,
      tSupplierSales = 0,
      tPackCost = 0;
    const itemSummary = {};

    supplierDetails.forEach((record) => {
      const weight = Math.abs(parseFloat(record.weight) || 0);
      const price = Math.abs(parseFloat(record.price_per_kg) || 0);
      const packs = Math.abs(parseInt(record.packs) || 0);
      const packUnitCost = Math.abs(parseFloat(record.CustomerPackCost) || 0);

      const rowGross = weight * price;
      const rowBagCost = packs * packUnitCost;

      tWeight += weight;
      tPacks += packs;
      tSupplierSales += rowGross;
      tPackCost += rowBagCost;

      const itemName = record.item_name || "Unknown Item";
      if (!itemSummary[itemName]) {
        itemSummary[itemName] = { totalWeight: 0, totalPacks: 0 };
      }
      itemSummary[itemName].totalWeight += weight;
      itemSummary[itemName].totalPacks += packs;
    });

    const tComm = tSupplierSales * 0.1;

    return {
      totalWeight: tWeight,
      totalPacksSum: tPacks,
      totalsupplierSales: tSupplierSales,
      totalCustomerPackCost: tPackCost,
      totalCommission: tComm,
      itemSummaryData: itemSummary,
    };
  }, [supplierDetails]);

  const getBoxRate = (type) => {
    if (!type) return 0;
    const t = type.trim().toUpperCase();
    if (["BAG", "CARD", "TK"].includes(t)) return 40;
    if (["LEEP", "TAKB"].includes(t)) return 30;
    if (t === "TL") return 50;
    return 0;
  };

  const {
    lorryTotalLorryAmount,
    lorryTotalNattami,
    lorryTotalQuantity,
    lorryTotalRecords,
    totalLorryDeduction,
    hasLorryTransaction,
    currentLorryTx,
  } = useMemo(() => {
    let lAmount = 0,
      nAmount = 0,
      bCost = 0,
      qty = 0;
    const currentLorryTx = lorryTransactions.filter(
      (t) => t.customer_code === selectedSupplier,
    );

    currentLorryTx.forEach((t) => {
      lAmount += Math.abs(parseFloat(t.lorry_amount) || 0);
      nAmount += Math.abs(parseFloat(t.nattami) || 0);
      const q = Math.abs(parseFloat(t.total_amount) || 0);
      qty += q;
      bCost += q * getBoxRate(t.box_type);
    });

    return {
      lorryTotalLorryAmount: lAmount,
      lorryTotalNattami: nAmount,
      lorryTotalQuantity: qty,
      lorryTotalRecords: currentLorryTx.length,
      totalLorryDeduction: lAmount + nAmount + bCost,
      hasLorryTransaction: currentLorryTx.length > 0,
      currentLorryTx,
    };
  }, [lorryTransactions, selectedSupplier]);

  const paidAmountValue = Math.abs(parseFloat(payingAmount) || 0);

  const safeAdvanceAmount = parseFloat(advanceAmount) || 0;

  const thisBillPayable =
    totalsupplierSales + totalCustomerPackCost - totalCommission;

  const finalNetPayable =
    thisBillPayable - totalLorryDeduction + safeAdvanceAmount - paidAmountValue;

  const handleLorryChange = (e) => {
    const { name, value } = e.target;
    setLorryFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditLorryChange = (e) => {
    const { name, value } = e.target;
    setEditLorryFormData((prev) => ({ ...prev, [name]: value }));
  };

  const startEditingLorry = (tx) => {
    setEditingLorryId(tx.id);
    setEditLorryFormData(tx);
  };

  const cancelEditingLorry = () => {
    setEditingLorryId(null);
    setEditLorryFormData({});
  };

  const saveEditedLorry = async () => {
    try {
      const payload = {
        ...editLorryFormData,
        nattami: parseFloat(editLorryFormData.nattami) || 0,
        lorry_amount: parseFloat(editLorryFormData.lorry_amount) || 0,
        total_amount: parseFloat(editLorryFormData.total_amount) || 0,
      };
      await api.put(`/lorry-transactions/${editingLorryId}`, payload);
      toast.success("Lorry transaction updated successfully!");
      setEditingLorryId(null);
      fetchLorryTransactions();
    } catch (error) {
      toast.error("Failed to update lorry transaction.");
      console.error(error);
    }
  };

  const deleteLorry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this lorry record?"))
      return;
    try {
      await api.delete(`/lorry-transactions/${id}`);
      toast.success("Lorry transaction deleted!");
      fetchLorryTransactions();
    } catch (error) {
      toast.error("Failed to delete lorry transaction.");
      console.error(error);
    }
  };

  const handleLorrySubmit = async (e) => {
    e.preventDefault();

    if (
      !lorryFormData.lorry_name ||
      !lorryFormData.customer_code ||
      !lorryFormData.total_amount ||
      !lorryFormData.box_type ||
      !lorryFormData.lorry_amount ||
      !lorryFormData.nattami
    ) {
      toast.error("Please fill all lorry details.");
      return;
    }

    setIsLorryLoading(true);
    try {
      const nattamiNum = parseFloat(lorryFormData.nattami) || 0;
      await api.post("/lorry-transactions", {
        lorry_name: lorryFormData.lorry_name.trim(),
        customer_code: lorryFormData.customer_code.trim(),
        total_amount: Math.abs(parseFloat(lorryFormData.total_amount) || 0),
        box_type: lorryFormData.box_type.trim(),
        lorry_amount: Math.abs(parseFloat(lorryFormData.lorry_amount) || 0),
        nattami: Math.abs(nattamiNum),
      });
      toast.success("Lorry added successfully!");
      setLorryFormData({
        lorry_name: "",
        customer_code: selectedSupplier || "",
        total_amount: "",
        box_type: "",
        lorry_amount: "",
        nattami: "",
      });
      await fetchLorryTransactions();
    } catch (error) {
      toast.error("Failed to add lorry data.");
      console.error(error);
    } finally {
      setIsLorryLoading(false);
    }
  };

  const handleAdvanceSubmit = async (e) => {
    e.preventDefault();
    setAdvanceLoading(true);
    setAdvanceStatus({ type: "", text: "" });

    isPrintingOrUpdatingRef.current = true;

    try {
      const response = await api.post("/suppliers/advance", {
        ...advancePayload,
        advance_amount: parseFloat(advancePayload.advance_amount),
      });
      setAdvanceStatus({
        type: "success",
        text: `Success! Advance updated.`,
      });
      setAdvanceAmount(parseFloat(response.data.data.advance_amount) || 0);
      setAdvancePayload({ ...advancePayload, advance_amount: "" });
      await fetchSummary();
      if (selectedSupplier) {
        await fetchSupplierProfile(selectedSupplier);
      }
    } catch (error) {
      console.error("Advance Update Error:", error);
      setAdvanceStatus({
        type: "error",
        text: "Update Failed.",
      });
    } finally {
      setAdvanceLoading(false);
      setTimeout(() => {
        isPrintingOrUpdatingRef.current = false;
      }, 500);
    }
  };

  const handleUpdateFarmer = async () => {
    const finalSupplierCode = newFarmerCode || editingRecord.supplier_code;
    const finalCustomerCode = newCustomerCode || editingRecord.customer_code;

    let idsToUpdate = [editingRecord.id];
    if (applyToAllSameItems) {
      idsToUpdate = supplierDetails
        .filter((item) => item.item_name === editingRecord.item_name)
        .map((item) => item.id);
    }

    isPrintingOrUpdatingRef.current = true;

    try {
      setIsDetailsLoading(true);
      const response = await api.put(`/sales/bulk-update-supplier`, {
        transaction_ids: idsToUpdate,
        supplier_code: finalSupplierCode,
        customer_code: finalCustomerCode,
      });

      if (response.status === 200) {
        setEditingRecord(null);
        setNewFarmerCode("");
        setNewCustomerCode("");
        setApplyToAllSameItems(true);

        if (isUnprintedBill) {
          await handleUnprintedBillClick(selectedSupplier, null);
        } else {
          await handlePrintedBillClick(selectedSupplier, selectedBillNo);
        }
        await fetchSummary();
      }
    } catch (error) {
      console.error("Update failed:", error);
      alert("Failed to update records.");
    } finally {
      setIsDetailsLoading(false);
      setTimeout(() => {
        isPrintingOrUpdatingRef.current = false;
      }, 500);
    }
  };

  const filteredPrintedItems = useMemo(() => {
    const lowerCaseSearch = printedSearchTerm.toLowerCase();
    return summary.printed.filter(
      (item) =>
        item.supplier_code.toLowerCase().includes(lowerCaseSearch) ||
        (item.supplier_bill_no &&
          item.supplier_bill_no.toLowerCase().includes(lowerCaseSearch)),
    );
  }, [printedSearchTerm, summary.printed]);

  const filteredUnprintedItems = useMemo(() => {
    const lowerCaseSearch = unprintedSearchTerm.toLowerCase();
    return summary.unprinted.filter((item) =>
      item.supplier_code.toLowerCase().includes(lowerCaseSearch),
    );
  }, [unprintedSearchTerm, summary.unprinted]);

  const handlePrintedBillClick = async (supplierCode, billNo) => {
    isPrintingOrUpdatingRef.current = true;

    setSelectedSupplier(supplierCode);
    setSelectedBillNo(billNo);
    setIsUnprintedBill(false);
    setSupplierDetails([]);
    setAdvanceAmount(0);
    setProfilePic(null);
    setPhoneNo("");
    setIsPhoneManuallyChanged(false);
    setPayingAmount("");
    setAdvancePayload({ code: supplierCode, advance_amount: "" });

    setLorryFormData((prev) => ({
      ...prev,
      customer_code: supplierCode,
      total_amount: "",
    }));
    setIsDetailsLoading(true);

    try {
      const response = await api.get(`/suppliers/bill/${billNo}/details`);
      setSupplierDetails(response.data || []);
    } catch (error) {
      console.warn(`No bill details found for: ${billNo}`);
      setSupplierDetails([]);
    }

    try {
      const supRes = await api.get(`/suppliers/search-by-code/${supplierCode}`);
      if (supRes.data) {
        setAdvanceAmount(parseFloat(supRes.data.advance_amount) || 0);
        setProfilePic(supRes.data.profile_pic);
        setPhoneNo(supRes.data.telephone_no || "");

        setSupplierDocs({
          title: supRes.data.name || supplierCode,
          profile: supRes.data.profile_pic,
          nic_front: supRes.data.nic_front,
          nic_back: supRes.data.nic_back,
        });
      }
    } catch (error) {
      console.warn(`Profile not found for: ${supplierCode}`);
    }

    await fetchSupplierLoans(supplierCode);

    setIsDetailsLoading(false);
    setTimeout(() => {
      isPrintingOrUpdatingRef.current = false;
    }, 500);
  };

  const handleUnprintedBillClick = async (supplierCode, billNo) => {
    isPrintingOrUpdatingRef.current = true;

    setSelectedSupplier(supplierCode);
    setSelectedBillNo(billNo);
    setIsUnprintedBill(true);
    setSupplierDetails([]);
    setAdvanceAmount(0);
    setProfilePic(null);
    setPhoneNo("");
    setIsPhoneManuallyChanged(false);
    setPayingAmount("");
    setAdvancePayload({ code: supplierCode, advance_amount: "" });

    setLorryFormData((prev) => ({
      ...prev,
      customer_code: supplierCode,
      total_amount: "",
    }));
    setIsDetailsLoading(true);

    try {
      const response = await api.get(
        `/suppliers/${supplierCode}/unprinted-details`,
      );
      setSupplierDetails(response.data || []);
    } catch (error) {
      console.warn(`No unprinted details found for: ${supplierCode}`);
      setSupplierDetails([]);
    }

    try {
      const supRes = await api.get(`/suppliers/search-by-code/${supplierCode}`);
      if (supRes.data) {
        setAdvanceAmount(parseFloat(supRes.data.advance_amount) || 0);
        setProfilePic(supRes.data.profile_pic);
        setPhoneNo(supRes.data.telephone_no || "");

        setSupplierDocs({
          title: supRes.data.name || supplierCode,
          profile: supRes.data.profile_pic,
          nic_front: supRes.data.nic_front,
          nic_back: supRes.data.nic_back,
        });
      }
    } catch (error) {
      console.warn(`Profile not found for: ${supplierCode}`);
    }

    await fetchSupplierLoans(supplierCode);

    setIsDetailsLoading(false);
    setTimeout(() => {
      isPrintingOrUpdatingRef.current = false;
    }, 500);
  };

  const handlePhoneSubmit = async (e) => {
    if (e.key === "Enter") {
      if (!selectedSupplier) return;
      isPrintingOrUpdatingRef.current = true;
      setPhoneStatus("Updating...");
      try {
        await api.post("/suppliers/update-phone", {
          code: selectedSupplier,
          telephone_no: phoneNo,
        });
        setPhoneStatus("✅ Saved");
        setTimeout(() => setPhoneStatus(""), 2000);
        await fetchSupplierProfile(selectedSupplier);
      } catch (error) {
        console.error("Phone Update Error:", error);
        setPhoneStatus("❌ Error");
      } finally {
        setTimeout(() => {
          isPrintingOrUpdatingRef.current = false;
        }, 500);
      }
    }
  };

  const handleLoanSubmit = async (e) => {
    if (e.key === "Enter") {
      if (!selectedSupplier || !payingAmount || parseFloat(payingAmount) <= 0) {
        setLoanStatus("⚠️ Invalid amount");
        setTimeout(() => setLoanStatus(""), 2000);
        return;
      }

      isPrintingOrUpdatingRef.current = true;
      setLoanStatus("Processing...");

      try {
        await api.post("/supplier-loan", {
          code: selectedSupplier,
          loan_amount: paidAmountValue,
          total_amount: finalNetPayable,
          bill_no: selectedBillNo || null,
        });

        // --- NEW CODE: Update Ledger When Money is Paid Manually ---
        await api.post("/customers-loans", {
          loan_type: "supplier_repayment",
          supplier_code: selectedSupplier,
          amount: paidAmountValue,
          description: `මුදල් ගෙවීම (බිල් ${selectedBillNo || ""})`,
          bill_no: selectedBillNo || "",
          settling_way: "cash",
        });
        // -----------------------------------------------------------

        setLoanStatus("✅ Loan saved");
        setPayingAmount("");

        setTimeout(() => {
          handlePrint();
        }, 300);
      } catch (error) {
        console.error("Loan Update Error:", error);
        setLoanStatus("❌ Error");
        setTimeout(() => setLoanStatus(""), 2000);
      } finally {
        setTimeout(() => {
          isPrintingOrUpdatingRef.current = false;
        }, 1000);
      }
    }
  };

  const getRowStyle = (index) =>
    index % 2 === 0
      ? { backgroundColor: "#f8f9fa" }
      : { backgroundColor: "#ffffff" };

  // PRINT TEMPLATES
  const getA4Content = useCallback(
    (
      currentBillNo,
      billWidth = "101mm",
      topMargin = "13mm",
      overrideValues = null,
    ) => {
      const tSupplierSales =
        overrideValues?.totalsupplierSales ?? totalsupplierSales;
      const tPackCost =
        overrideValues?.totalCustomerPackCost ?? totalCustomerPackCost;
      const tComm = overrideValues?.totalCommission ?? totalCommission;
      const tLorry = overrideValues?.totalLorryDeduction ?? totalLorryDeduction;
      const tAdvance = overrideValues?.safeAdvanceAmount ?? safeAdvanceAmount;
      const tPaid = overrideValues?.payingAmount ?? paidAmountValue;
      const tFinal = overrideValues?.finalNetPayable ?? finalNetPayable;
      const tBillPayable = overrideValues?.thisBillPayable ?? thisBillPayable;
      const tTotalPacks = overrideValues?.totalPacksSum ?? totalPacksSum;

      const date = new Date().toLocaleDateString("si-LK");
      const time = new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      const mobile = "0777220468, 0715663390";

      const detailedItemsHtml = supplierDetails
        .map((record) => {
          const weight = Math.abs(parseFloat(record.weight) || 0);
          const price = Math.abs(parseFloat(record.price_per_kg) || 0);
          const rowTotal = weight * price;
          const itemName = record.item_name || "";

          return `
            <tr style="border-bottom: 1px solid #000;">
                <td style="padding: 5px; font-size: 14px;">${itemName}</td>
                <td style="padding: 5px; text-align: right; font-size: 14px;">${formatDecimal(weight)}</td>
                <td style="padding: 5px; text-align: right; font-size: 14px;">${formatDecimal(price)}</td>
                <td style="padding: 5px; text-align: right; font-size: 14px;">${formatDecimal(rowTotal)}</td>
            </tr>`;
        })
        .join("");

      // Formatting Loans Below the advance text in brackets (SHOW ONLY THE LATEST UPDATE)
      let supplierLoansHtml = "";
      if (supplierLoans && supplierLoans.length > 0) {
        // Find the most recent loan by getting the one with the highest ID
        const latestLoan = supplierLoans.reduce((prev, current) =>
          prev.id > current.id ? prev : current,
        );

        const lDate = latestLoan.date || date;
        const typeSign =
          latestLoan.loan_type === "supplier_repayment" ? "-" : "+";
        const desc =
          latestLoan.description ||
          (latestLoan.loan_type === "supplier_repayment"
            ? "ණය පියවීම"
            : "විකුණුම");

        supplierLoansHtml = `
            <div style="font-size: 12px; color: #555; padding-top: 2px; font-weight: normal;">
                (${lDate} / ${desc} / ${typeSign}${formatDecimal(latestLoan.amount)})
            </div>
        `;
      }

      return `
        <div style="width: 100mm; margin: 0 auto; border: 1px solid #000; padding: 10px; font-family: Arial, sans-serif; background: white; color: black;">
            
            <!-- Header -->
            <div style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 10px;">
                <h1 style="font-size: 22px; margin: 0;">
                    <span style="border: 2px solid #000; padding: 2px 10px; margin-right: 10px;">N.A.276</span>
                    නිමල් අත්තනායක(පුද්) සමාගම
                </h1>
                <p style="font-size: 12px; margin: 5px 0 0 0;">එළවළු වැවීම, බෙදාහැරීම සහ කොමිස්පිට අලෙවි කිරීම</p>
                <p style="font-size: 12px; margin: 2px 0;">අංකය 276, නව මැනිං වෙළඳ සංකීර්ණය, පෑලියගොඩ.</p>
                <p style="font-size: 12px; margin: 2px 0;">E-mail : nimalattanayake254@gmail.com</p>
            </div>

            <!-- Bill Info -->
            <div style="font-size: 13px; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between;">
                    <span>බිල් අංකය: <strong>${currentBillNo || "N/A"}</strong></span>
                    <span>දිනය : ${date} ${time}</span>
                </div>
                <div style="margin-top: 5px;">දුර : ${mobile}</div>
            </div>

            <!-- Supplier Code Box -->
            <div style="margin-bottom: 15px; border-bottom: 1px solid #000; padding-bottom: 10px;">
                <div style="font-size: 13px; margin-bottom: 5px;">ගෙවිය යුතු :</div>
                <div style="border: 2px solid #000; display: inline-block; padding: 5px 20px; font-size: 20px; font-weight: bold;">
                    ${(selectedSupplier || "").toUpperCase()}
                </div>
            </div>

            <!-- Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; border-bottom: 1px solid #000;">
                <thead>
                    <tr style="border-bottom: 1px solid #000; border-top: 1px solid #000;">
                        <th style="text-align: left; padding: 5px; font-size: 14px; font-weight: normal;">වර්ගය</th>
                        <th style="text-align: right; padding: 5px; font-size: 14px; font-weight: normal; border-left: 1px solid #000;">කිලෝ</th>
                        <th style="text-align: right; padding: 5px; font-size: 14px; font-weight: normal; border-left: 1px solid #000;">බැගින්</th>
                        <th style="text-align: right; padding: 5px; font-size: 14px; font-weight: normal; border-left: 1px solid #000;">එකතුව</th>
                    </tr>
                </thead>
                <tbody>
                    ${detailedItemsHtml}
                </tbody>
            </table>

            <!-- Calculations -->
            <div style="font-size: 14px;">
                <div style="text-align: right; padding: 5px 0;">${formatDecimal(tSupplierSales)}</div>
                
                ${
                  tPackCost > 0
                    ? `
                <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                    <span>පෙටි/මලු කුලිය</span>
                    <span style="text-align: right;">${formatDecimal(tPackCost)}</span>
                </div>`
                    : ""
                }

                <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                    <span>අඩු කලා &nbsp;&nbsp;&nbsp;: ලොරි කුලිය</span>
                    <span style="text-align: right;">${formatDecimal(tLorry)}</span>
                </div>

                <div style="display: flex; justify-content: space-between; padding: 2px 0;">
                    <span>අඩු කලා &nbsp;&nbsp;&nbsp;: කොමිස් අය කිරීම</span>
                    <span style="text-align: right;">${formatDecimal(tComm)}</span>
                </div>

                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: bold; margin-top: 5px;">
                    <span>මෙම බිලට ඉතිරි (බිල් අංකය ${currentBillNo || ""} )</span>
                    <span style="text-align: right; font-size: 16px;">${formatDecimal(tBillPayable - tLorry)}</span>
                </div>

                <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                    <div>
                        <div>ඉදිරියට ගෙනා ඉතිරිය :</div>
                        ${supplierLoansHtml}
                    </div>
                    <div style="text-align: right;">${tAdvance < 0 ? `-${formatDecimal(Math.abs(tAdvance))}` : formatDecimal(tAdvance)}</div>
                </div>

                ${
                  tPaid > 0
                    ? `
                <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                    <span>ගෙවූ මුදල :</span>
                    <span style="text-align: right;">${formatDecimal(tPaid)}</span>
                </div>`
                    : ""
                }

                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px double #000; border-top: 1px solid #000; font-weight: bold; font-size: 18px; margin-top: 10px;">
                    <span>ඉතිරිය :</span>
                    <span style="text-align: right;">${
                      tFinal < 0
                        ? `-${formatDecimal(Math.abs(tFinal))}`
                        : formatDecimal(tFinal)
                    }</span>
                </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; font-size: 11px; margin-top: 20px;">
                මෙම කිසියම් වරදක් ඇතොත් සතියක් තුලදි දැනුම් දෙන්න<br>
                (මලු ගණන: ${formatDecimal(tTotalPacks)})
            </div>
        </div>
        `;
    },
    [
      selectedSupplier,
      supplierDetails,
      totalsupplierSales,
      totalCustomerPackCost,
      totalCommission,
      totalLorryDeduction,
      safeAdvanceAmount,
      paidAmountValue,
      finalNetPayable,
      thisBillPayable,
      totalPacksSum,
      supplierLoans,
    ],
  );

  const getBillContent = useCallback(
    (currentBillNo, overrideValues = null) => {
      return getA4Content(currentBillNo, "80mm", "0mm", overrideValues);
    },
    [getA4Content],
  );

  const handlePrint = useCallback(async () => {
    if (!supplierDetails || supplierDetails.length === 0) return;

    if (isUnprintedBill && !hasLorryTransaction) {
      toast.error("Please add lorry details before printing!");
      return;
    }

    let latestAdvanceAmount = safeAdvanceAmount;
    if (selectedSupplier) {
      try {
        const supRes = await api.get(
          `/suppliers/search-by-code/${selectedSupplier}`,
        );
        if (supRes.data) {
          latestAdvanceAmount = parseFloat(supRes.data.advance_amount) || 0;
          setAdvanceAmount(latestAdvanceAmount);
        }
      } catch (error) {
        console.warn("Could not fetch latest advance amount:", error);
      }
    }

    isPrintingOrUpdatingRef.current = true;
    let finalBillNo = selectedBillNo;

    let tSupplierSales = 0,
      tPackCost = 0;

    supplierDetails.forEach((record) => {
      const weight = Math.abs(parseFloat(record.weight) || 0);
      const price = Math.abs(parseFloat(record.price_per_kg) || 0);
      const packs = Math.abs(parseInt(record.packs) || 0);
      const packUnitCost = Math.abs(parseFloat(record.CustomerPackCost) || 0);

      tSupplierSales += weight * price;
      tPackCost += packs * packUnitCost;
    });

    const tComm = tSupplierSales * 0.1;

    let lAmount = 0,
      nAmount = 0,
      bCost = 0;
    const currentLorryTx = lorryTransactions.filter(
      (t) => t.customer_code === selectedSupplier,
    );
    currentLorryTx.forEach((t) => {
      lAmount += Math.abs(parseFloat(t.lorry_amount) || 0);
      nAmount += Math.abs(parseFloat(t.nattami) || 0);
      const q = Math.abs(parseFloat(t.total_amount) || 0);
      bCost += q * getBoxRate(t.box_type);
    });
    const totalLorryDeduction = lAmount + nAmount + bCost;

    const latestPaidAmount = Math.abs(parseFloat(payingAmount) || 0);

    const thisBillPayable = tSupplierSales + tPackCost - tComm;

    const finalNetPayable =
      thisBillPayable -
      totalLorryDeduction +
      latestAdvanceAmount -
      latestPaidAmount;

    // --- Continue with original print logic ---
    if (isUnprintedBill) {
      setIsDetailsLoading(true);
      try {
        const response = await api.post("/suppliers/mark-as-printed", {
          transaction_ids: supplierDetails.map((r) => r.id),
          telephone_no: phoneNo,
          advance_amount: latestAdvanceAmount,
          supplier_code: selectedSupplier,
        });

        finalBillNo = response.data.new_bill_no;
        setSelectedBillNo(finalBillNo);

        // --- NEW CODE: Record the bill total as a ledger entry automatically ---
        // This makes sure the Database Balance (advance_amount) updates permanently!
        const billNetAmount = thisBillPayable - totalLorryDeduction;
        if (billNetAmount !== 0) {
          try {
            await api.post("/customers-loans", {
              loan_type:
                billNetAmount > 0 ? "supplier_sale" : "supplier_repayment",
              supplier_code: selectedSupplier,
              amount: Math.abs(billNetAmount),
              description: `බිල් අංක ${finalBillNo}`,
              bill_no: finalBillNo,
              settling_way: "cash",
            });
          } catch (loanErr) {
            console.error("Failed to update ledger balance", loanErr);
          }
        }
        // -----------------------------------------------------------------------

        if (phoneNo) {
          console.log(
            `Finalized Bill ${finalBillNo}. SMS triggered for ${phoneNo}`,
          );
        }
      } catch (err) {
        console.error("Finalize/SMS Error:", err);
        alert("Finalize failed. SMS could not be sent.");
        setIsDetailsLoading(false);
        isPrintingOrUpdatingRef.current = false;
        return;
      } finally {
        setIsDetailsLoading(false);
      }
    } else {
      if (phoneNo) {
        setIsDetailsLoading(true);
        try {
          await api.post("/suppliers/resend-sms", {
            bill_no: selectedBillNo,
            telephone_no: phoneNo,
            supplier_code: selectedSupplier,
            transaction_ids: supplierDetails.map((r) => r.id),
            advance_amount: latestAdvanceAmount,
            is_reprint: true,
          });
          setPhoneStatus("📱 SMS resent");
          setTimeout(() => setPhoneStatus(""), 2000);
        } catch (err) {
          console.error("SMS Resend Error:", err);
          setPhoneStatus("⚠️ SMS failed");
          setTimeout(() => setPhoneStatus(""), 2000);
        } finally {
          setIsDetailsLoading(false);
        }
      }
    }

    const isA4 = printFormat === "a4";
    const topMargin = "20mm";

    const content = isA4
      ? getA4Content(finalBillNo, "105mm", topMargin, {
          totalsupplierSales: tSupplierSales,
          totalCustomerPackCost: tPackCost,
          totalCommission: tComm,
          totalLorryDeduction: totalLorryDeduction,
          safeAdvanceAmount: latestAdvanceAmount,
          payingAmount: latestPaidAmount,
          finalNetPayable: finalNetPayable,
          thisBillPayable: thisBillPayable,
          totalPacksSum: totalPacksSum,
        })
      : getBillContent(finalBillNo, {
          totalsupplierSales: tSupplierSales,
          totalCustomerPackCost: tPackCost,
          totalCommission: tComm,
          totalLorryDeduction: totalLorryDeduction,
          safeAdvanceAmount: latestAdvanceAmount,
          payingAmount: latestPaidAmount,
          finalNetPayable: finalNetPayable,
          thisBillPayable: thisBillPayable,
          totalPacksSum: totalPacksSum,
        });

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>Print Bill</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    @media print {
                        @page {
                            margin: 0;
                            size: ${isA4 ? "A4" : "80mm auto"};
                        }
                        body {
                            margin: 0 !important;
                            padding: 0 !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .print-container { margin-top: ${isA4 ? topMargin : "0"} !important; }
                    }
                    body { background: white; font-family: Arial, sans-serif; }
                </style>
            </head>
            <body>
                <div class="print-container">${content}</div>
            </body>
        </html>
        `);
    iframeDoc.close();

    iframe.contentWindow.focus();

    setTimeout(() => {
      iframe.contentWindow.print();

      const checkPrintDone = setInterval(() => {
        try {
          if (!iframe.contentWindow.document.hasFocus()) {
            clearInterval(checkPrintDone);
            setTimeout(() => {
              if (iframe && iframe.parentNode)
                document.body.removeChild(iframe);
              window.location.reload();
            }, 500);
          }
        } catch (e) {
          clearInterval(checkPrintDone);
          setTimeout(() => {
            if (iframe && iframe.parentNode) document.body.removeChild(iframe);
            window.location.reload();
          }, 500);
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(checkPrintDone);
        if (iframe && iframe.parentNode) document.body.removeChild(iframe);
        window.location.reload();
      }, 10000);

      setTimeout(() => {
        isPrintingOrUpdatingRef.current = false;
      }, 1000);
    }, 300);
  }, [
    supplierDetails,
    selectedBillNo,
    isUnprintedBill,
    phoneNo,
    selectedSupplier,
    getBillContent,
    getA4Content,
    printFormat,
    hasLorryTransaction,
    lorryTransactions,
    payingAmount,
    totalPacksSum,
    getBoxRate,
    safeAdvanceAmount,
  ]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "F1" || event.keyCode === 112) {
        event.preventDefault();
        return false;
      }
      if (
        (event.key === "F4" || event.keyCode === 115) &&
        supplierDetails.length > 0 &&
        !isDetailsLoading
      ) {
        event.preventDefault();

        if (isUnprintedBill && !hasLorryTransaction) {
          toast.error("Please add lorry details before printing!");
          return;
        }

        handlePrint();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    supplierDetails,
    handlePrint,
    isDetailsLoading,
    isUnprintedBill,
    hasLorryTransaction,
  ]);

  const renderImageModal = () => {
    if (!isImageModalOpen) return null;
    const formatUrl = (path) =>
      path
        ? path.startsWith("http")
          ? path
          : `https://goviraju.lk/vts_sales_backend/application/public/storage/${path}`
        : null;
    const onClose = () => setIsImageModalOpen(false);

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: "#1f2937",
            borderRadius: "20px",
            width: "95%",
            maxWidth: "1000px",
            maxHeight: "95vh",
            padding: "25px",
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
              borderBottom: "1px solid #374151",
              paddingBottom: "15px",
            }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                color: "white",
                margin: 0,
              }}
            >
              {supplierDocs.title} - Documents
            </h2>
            <button
              onClick={onClose}
              style={{
                background: "#374151",
                border: "none",
                color: "white",
                width: "35px",
                height: "35px",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              {" "}
              ✕{" "}
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.5fr 1.5fr",
              gap: "20px",
              overflowY: "auto",
              padding: "5px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: "#60a5fa",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                }}
              >
                Profile Photo
              </span>
              <div
                style={{
                  width: "100%",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "2px solid #3b82f6",
                  backgroundColor: "#111827",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                }}
              >
                <img
                  src={formatUrl(supplierDocs.profile)}
                  style={{ width: "100%", height: "auto", display: "block" }}
                  alt="Profile"
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: "#9ca3af",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                }}
              >
                NIC Front
              </span>
              <div
                style={{
                  width: "100%",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "2px solid #4b5563",
                  backgroundColor: "#111827",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                }}
              >
                {supplierDocs.nic_front ? (
                  <img
                    src={formatUrl(supplierDocs.nic_front)}
                    style={{
                      width: "100%",
                      height: "auto",
                      maxHeight: "500px",
                      display: "block",
                      objectFit: "contain",
                    }}
                    alt="NIC Front"
                  />
                ) : (
                  <div
                    style={{
                      height: "200px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6b7280",
                    }}
                  >
                    No Photo Available
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: "#9ca3af",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                }}
              >
                NIC Back
              </span>
              <div
                style={{
                  width: "100%",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "2px solid #4b5563",
                  backgroundColor: "#111827",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                }}
              >
                {supplierDocs.nic_back ? (
                  <img
                    src={formatUrl(supplierDocs.nic_back)}
                    style={{
                      width: "100%",
                      height: "auto",
                      maxHeight: "500px",
                      display: "block",
                      objectFit: "contain",
                    }}
                    alt="NIC Back"
                  />
                ) : (
                  <div
                    style={{
                      height: "200px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6b7280",
                    }}
                  >
                    No Photo Available
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "25px",
              display: "flex",
              justifyContent: "flex-end",
              borderTop: "1px solid #374151",
              paddingTop: "15px",
            }}
          >
            <button
              onClick={onClose}
              style={{
                backgroundColor: "#ef4444",
                color: "white",
                border: "none",
                padding: "12px 30px",
                borderRadius: "10px",
                fontWeight: "bold",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Close{" "}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditModal = () => {
    if (!editingRecord) return null;
    const sameItemCount = supplierDetails.filter(
      (item) => item.item_name === editingRecord.item_name,
    ).length;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.7)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2000,
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "30px",
            borderRadius: "8px",
            width: "400px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              color: "#091d3d",
              borderBottom: "2px solid #007bff",
              paddingBottom: "10px",
            }}
          >
            Edit Transaction
          </h3>

          <div
            style={{
              margin: "15px 0",
              fontSize: "0.9rem",
              color: "#666",
              backgroundColor: "#f8f9fa",
              padding: "10px",
              borderRadius: "4px",
            }}
          >
            <p style={{ margin: "2px 0" }}>
              <strong>Bill No:</strong>{" "}
              {editingRecord.bill_no || selectedBillNo}
            </p>
            <p style={{ margin: "2px 0" }}>
              <strong>Item:</strong> {editingRecord.item_name} |{" "}
              {Math.abs(editingRecord.weight)} kg
            </p>
          </div>

          {sameItemCount > 1 && (
            <div
              style={{
                backgroundColor: "#fff3cd",
                padding: "10px",
                borderRadius: "4px",
                marginBottom: "15px",
                border: "1px solid #ffeeba",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  color: "#856404",
                  fontWeight: "bold",
                }}
              >
                <input
                  type="checkbox"
                  checked={applyToAllSameItems}
                  onChange={(e) => setApplyToAllSameItems(e.target.checked)}
                  style={{ width: "18px", height: "18px" }}
                />
                Apply to all "{editingRecord.item_name}" ({sameItemCount}) items
              </label>
            </div>
          )}

          <div style={{ marginTop: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
                color: "#555",
              }}
            >
              New Supplier Code (Optional):
            </label>
            <input
              type="text"
              placeholder={editingRecord.supplier_code}
              value={newFarmerCode}
              onChange={(e) => setNewFarmerCode(e.target.value.toUpperCase())}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "1rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
              autoFocus
            />
          </div>

          <div style={{ marginTop: "15px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
                color: "#555",
              }}
            >
              New Customer Code (Optional):
            </label>
            <input
              type="text"
              placeholder={editingRecord.customer_code}
              value={newCustomerCode}
              onChange={(e) => setNewCustomerCode(e.target.value.toUpperCase())}
              style={{
                width: "100%",
                padding: "10px",
                fontSize: "1rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "25px" }}>
            <button
              onClick={handleUpdateFarmer}
              style={{
                flex: 1,
                padding: "12px",
                backgroundColor: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              OK
            </button>
            <button
              onClick={() => {
                setEditingRecord(null);
                setNewFarmerCode("");
                setNewCustomerCode("");
                setApplyToAllSameItems(true);
              }}
              style={{
                flex: 1,
                padding: "12px",
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SupplierCodeList = ({ items, type, searchTerm }) => {
    const groupedItems = useMemo(() => {
      return items.reduce((acc, item) => {
        const { supplier_code, supplier_bill_no } = item;
        if (!supplier_code) return acc;
        if (!acc[supplier_code]) acc[supplier_code] = [];
        if (type === "printed" && supplier_bill_no)
          acc[supplier_code].push(supplier_bill_no);
        else if (
          type === "unprinted" &&
          !acc[supplier_code].includes(supplier_code)
        )
          acc[supplier_code].push(supplier_code);
        return acc;
      }, {});
    }, [items, type]);

    const supplierCodes = Object.keys(groupedItems);
    const buttonBaseStyle = {
      width: "100%",
      display: "block",
      textAlign: "left",
      padding: "10px 15px",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "600",
      border: "none",
      boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      fontSize: "1rem",
      marginBottom: "4px",
      boxSizing: "border-box",
    };
    const buttonStyle =
      type === "printed"
        ? { ...buttonBaseStyle, backgroundColor: "#1E88E5", color: "white" }
        : { ...buttonBaseStyle, backgroundColor: "#FF7043", color: "white" };

    if (items.length === 0)
      return (
        <p style={{ color: "#6c757d", padding: "10px" }}>
          {searchTerm ? `No results found` : "No Suppliers found"}
        </p>
      );

    return (
      <div style={listContainerStyle}>
        {supplierCodes.map((code) => (
          <div key={code}>
            {groupedItems[code].map((id) => (
              <button
                key={id}
                onClick={() =>
                  type === "printed"
                    ? handlePrintedBillClick(code, id)
                    : handleUnprintedBillClick(code, null)
                }
                style={buttonStyle}
              >
                <span
                  style={{
                    display: "block",
                    textAlign: "left",
                    fontSize: "15px",
                    fontWeight: "600",
                  }}
                >
                  {type === "printed" ? `${code}-${id}` : `${code}`}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  };

  const renderDetailsPanel = () => {
    const panelContainerStyle = {
      backgroundColor: "#091d3d",
      padding: "30px",
      borderRadius: "12px",
      maxWidth: "100%",
      maxHeight: "calc(100vh - 60px)",
      overflowY: "auto",
      position: "relative",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
      fontFamily: "Roboto, Arial, sans-serif",
      marginTop: "-10px",
      width: "850px",
      minHeight: "550px",
      marginLeft: "0",
    };
    const headerStyle = {
      color: "#007bff",
      borderBottom: "2px solid #e9ecef",
      paddingBottom: "10px",
      marginTop: "0",
      marginBottom: "20px",
      fontSize: "1.8rem",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    };
    const thStyle = {
      backgroundColor: "#007bff",
      color: "white",
      fontWeight: "600",
      padding: "6px 8px",
      textAlign: "left",
      position: "sticky",
      top: "0",
      zIndex: 10,
      fontSize: "0.8rem",
      whiteSpace: "nowrap",
    };
    const tdStyle = {
      padding: "6px 8px",
      textAlign: "left",
      borderBottom: "1px solid #dee2e6",
      whiteSpace: "normal",
    };

    const renderDataRows = () => (
      <tbody>
        {supplierDetails.map((record, index) => {
          const weight = Math.abs(parseFloat(record.weight) || 0);
          const price = Math.abs(parseFloat(record.price_per_kg) || 0);
          const rowGross = weight * price;
          const rowComm = rowGross * 0.1;

          return (
            <tr
              key={record.id || index}
              style={{ ...getRowStyle(index), cursor: "pointer" }}
              onClick={() => setEditingRecord(record)}
            >
              <td style={tdStyle}>{record.bill_no || selectedBillNo}</td>
              <td style={tdStyle}>{record.customer_code}</td>
              <td style={tdStyle}>
                <strong>{record.item_name}</strong>
              </td>
              <td style={tdStyle}>{Math.abs(parseInt(record.packs) || 0)}</td>
              <td style={tdStyle}>{weight}</td>
              <td style={tdStyle}>{formatDecimal(price)}</td>
              <td style={tdStyle}>
                {formatDecimal(record.SupplierPricePerKg)}
              </td>
              <td style={tdStyle}>
                {formatDecimal(
                  Math.abs(
                    (record?.total || 0) - (record?.CustomerPackLabour || 0),
                  ),
                )}
              </td>
              <td style={tdStyle}>{formatDecimal(rowGross)}</td>
              <td style={tdStyle}>{formatDecimal(rowComm)}</td>
              <td style={tdStyle}>{formatDecimal(record.CustomerPackCost)}</td>
            </tr>
          );
        })}
      </tbody>
    );

    const getRowStyle = (index) =>
      index % 2 === 0
        ? { backgroundColor: "#f8f9fa" }
        : { backgroundColor: "#ffffff" };

    return (
      <div style={panelContainerStyle}>
        <div style={headerStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <h2 style={{ fontSize: "1.5rem", color: "white", margin: 0 }}>
              Transaction Details (Bill No:{" "}
              <strong>{selectedBillNo || "N/A"}</strong>)
            </h2>

            {selectedSupplier && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <input
                  type="text"
                  placeholder="Phone No..."
                  value={phoneNo}
                  onChange={(e) => {
                    setPhoneNo(e.target.value);
                    setIsPhoneManuallyChanged(true);
                  }}
                  onKeyDown={handlePhoneSubmit}
                  disabled={!isUnprintedBill}
                  style={{
                    padding: "10px 15px",
                    borderRadius: "8px",
                    border: "2px solid #ffc107",
                    fontSize: "1rem",
                    width: "200px",
                    backgroundColor: !isUnprintedBill ? "#e9ecef" : "#ffffff",
                    color: "#000000",
                    fontWeight: "bold",
                    outline: "none",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                    cursor: !isUnprintedBill ? "not-allowed" : "text",
                    opacity: !isUnprintedBill ? "0.8" : 1,
                  }}
                />
                {phoneStatus && (
                  <span
                    style={{
                      fontSize: "0.9rem",
                      color: "#00ff00",
                      fontWeight: "bold",
                      backgroundColor: "rgba(0,0,0,0.3)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {phoneStatus}
                  </span>
                )}
              </div>
            )}
          </div>

          {profilePic && (
            <div style={{ marginLeft: "20px" }}>
              <img
                src={
                  profilePic.startsWith("http")
                    ? profilePic
                    : `https://goviraju.lk/vts_sales_backend/application/public/storage/${profilePic}`
                }
                alt="Supplier"
                onClick={() => setIsImageModalOpen(true)}
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  border: "2px solid white",
                  objectFit: "cover",
                  backgroundColor: "#ccc",
                  cursor: "pointer",
                }}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            </div>
          )}
        </div>

        <div style={{ marginTop: "20px", overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "250px",
              fontSize: "0.9rem",
              marginBottom: "10px",
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Bill No:</th>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>Item</th>
                <th style={thStyle}>Packs</th>
                <th style={thStyle}>Weight</th>
                <th style={thStyle}>Cust Price</th>
                <th style={thStyle}>Sup Price</th>
                <th style={thStyle}>Cust Total</th>
                <th style={thStyle}>Sup Total</th>
                <th style={thStyle}>Comm</th>
                <th style={thStyle}>Pack Cost</th>
              </tr>
            </thead>
            {selectedSupplier && supplierDetails.length > 0 ? (
              renderDataRows()
            ) : (
              <tbody>
                <tr>
                  <td
                    colSpan="11"
                    style={{
                      textAlign: "center",
                      color: "#6c757d",
                      fontStyle: "italic",
                      padding: "50px 0",
                    }}
                  >
                    Select a bill to view details
                  </td>
                </tr>
              </tbody>
            )}
          </table>

          {selectedSupplier && supplierDetails.length > 0 && (
            <div
              style={{
                backgroundColor: "#1E88E5",
                borderRadius: "4px",
                overflow: "hidden",
                border: "1px solid #90CAF9",
                marginBottom: "30px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 15px",
                  borderBottom: "1px solid #64B5F6",
                  fontSize: "1.05rem",
                  fontWeight: "bold",
                }}
              >
                <div style={{ color: "white" }}>
                  Total :{" "}
                  <span style={{ color: "#FF5252", marginLeft: "5px" }}>
                    {formatDecimal(totalsupplierSales)}
                  </span>
                </div>
                <div style={{ color: "white" }}>
                  Pack Cost :{" "}
                  <span style={{ color: "#FF5252", marginLeft: "5px" }}>
                    {formatDecimal(totalCustomerPackCost)}
                  </span>
                </div>
                <div style={{ color: "white" }}>
                  Commission Total :{" "}
                  <span style={{ color: "white", marginLeft: "5px" }}>
                    {formatDecimal(totalCommission)}
                  </span>
                </div>
                <div style={{ color: "white" }}>
                  Payable Amount :{" "}
                  <span style={{ color: "#FF5252", marginLeft: "5px" }}>
                    {formatDecimal(
                      totalsupplierSales +
                        totalCustomerPackCost -
                        totalCommission -
                        totalLorryDeduction,
                    )}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 15px",
                  fontSize: "1.05rem",
                  fontWeight: "bold",
                }}
              >
                <div style={{ color: "white" }}>
                  Lorry / Nattami :{" "}
                  <span style={{ color: "#FF5252", marginLeft: "5px" }}>
                    {formatDecimal(totalLorryDeduction)}
                  </span>
                </div>
                <div style={{ color: "white" }}>
                  Forward Balance :{" "}
                  <span style={{ color: "#FFEB3B", marginLeft: "5px" }}>
                    {formatDecimal(advanceAmount)}
                  </span>
                </div>
                <div style={{ color: "white" }}>
                  Net Payable Today :{" "}
                  <span
                    style={{
                      color: "#FFEB3B",
                      marginLeft: "5px",
                      fontSize: "1.2rem",
                    }}
                  >
                    {finalNetPayable < 0
                      ? `-${formatDecimal(Math.abs(finalNetPayable))}`
                      : formatDecimal(finalNetPayable)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedSupplier && Object.keys(itemSummaryData).length > 0 && (
          <>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: "0px",
              }}
            >
              <thead>
                <tr>
                  <th style={{ ...thStyle, backgroundColor: "#6c757d" }}>
                    Item Name
                  </th>
                  <th style={{ ...thStyle, backgroundColor: "#6c757d" }}>
                    Total Weight
                  </th>
                  <th style={{ ...thStyle, backgroundColor: "#6c757d" }}>
                    Total Packs
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(itemSummaryData).map((name, i) => (
                  <tr key={name} style={getRowStyle(i)}>
                    <td style={tdStyle}>{name}</td>
                    <td style={tdStyle}>
                      {formatDecimal(itemSummaryData[name].totalWeight, 3)}
                    </td>
                    <td style={tdStyle}>
                      {formatDecimal(itemSummaryData[name].totalPacks)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isUnprintedBill && (
              <div
                style={{
                  marginTop: "30px",
                  padding: "20px",
                  border: "1px solid #3498db88",
                  borderRadius: "8px",
                  backgroundColor: "#3498db11",
                }}
              >
                <h3
                  style={{
                    color: "#60a5fa",
                    marginTop: 0,
                    fontSize: "1.2rem",
                    marginBottom: "15px",
                  }}
                >
                  🚛 Add Lorry
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "15px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "rgba(52, 152, 219, 0.15)",
                      padding: "15px",
                      borderRadius: "8px",
                      border: "1px solid #3498db",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>📦</span>
                    <div>
                      <div style={{ fontSize: "12px", color: "#ccc" }}>
                        Total Quantity
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "bold",
                          color: "white",
                        }}
                      >
                        {formatDecimal(lorryTotalQuantity, 0)}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: "rgba(155, 89, 182, 0.15)",
                      padding: "15px",
                      borderRadius: "8px",
                      border: "1px solid #9b59b6",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>🚛</span>
                    <div>
                      <div style={{ fontSize: "12px", color: "#ccc" }}>
                        Lorry Amount
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "bold",
                          color: "white",
                        }}
                      >
                        Rs {formatDecimal(lorryTotalLorryAmount)}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: "rgba(46, 204, 113, 0.15)",
                      padding: "15px",
                      borderRadius: "8px",
                      border: "1px solid #2ecc71",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>📦</span>
                    <div>
                      <div style={{ fontSize: "12px", color: "#ccc" }}>
                        Total Nattami
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "bold",
                          color: "white",
                        }}
                      >
                        Rs {formatDecimal(lorryTotalNattami)}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: "rgba(241, 196, 15, 0.15)",
                      padding: "15px",
                      borderRadius: "8px",
                      border: "1px solid #f1c40f",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>📋</span>
                    <div>
                      <div style={{ fontSize: "12px", color: "#ccc" }}>
                        Total Records
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "bold",
                          color: "white",
                        }}
                      >
                        {lorryTotalRecords}
                      </div>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={handleLorrySubmit}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "15px",
                    alignItems: "end",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "#eee",
                        display: "block",
                        marginBottom: "5px",
                      }}
                    >
                      Lorry Name *
                    </label>
                    <input
                      type="text"
                      name="lorry_name"
                      value={lorryFormData.lorry_name}
                      onChange={handleLorryChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "none",
                        color: "#000",
                        fontWeight: "bold",
                      }}
                      placeholder="Enter Lorry Name"
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "#eee",
                        display: "block",
                        marginBottom: "5px",
                      }}
                    >
                      Supplier Code *
                    </label>
                    <input
                      type="text"
                      name="customer_code"
                      value={lorryFormData.customer_code}
                      readOnly
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "none",
                        backgroundColor: "#ccc",
                        color: "#000",
                        fontWeight: "bold",
                      }}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "#eee",
                        display: "block",
                        marginBottom: "5px",
                      }}
                    >
                      Quantity *
                    </label>
                    <input
                      type="number"
                      step="1"
                      name="total_amount"
                      value={lorryFormData.total_amount}
                      onChange={handleLorryChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "none",
                        color: "#000",
                        fontWeight: "bold",
                      }}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "#eee",
                        display: "block",
                        marginBottom: "5px",
                      }}
                    >
                      Box Type *
                    </label>
                    <select
                      name="box_type"
                      value={lorryFormData.box_type}
                      onChange={handleLorryChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "none",
                        color: "#000",
                        backgroundColor: "#fff",
                        fontWeight: "bold",
                      }}
                      required
                    >
                      <option value="">-- Box Type --</option>
                      <option value="BAG">BAG - Bags (Rs 40)</option>
                      <option value="CARD">CARD - Card Board (Rs 40)</option>
                      <option value="LEEP">LEEP - Wood Box (Rs 30)</option>
                      <option value="TAKB">TAKB - Tomato C.B (Rs 30)</option>
                      <option value="TK">
                        TK - Tray Plastic Small (Rs 40)
                      </option>
                      <option value="TL">
                        TL - Tray Plastic Large (Rs 50)
                      </option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "#eee",
                        display: "block",
                        marginBottom: "5px",
                      }}
                    >
                      Lorry Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="lorry_amount"
                      value={lorryFormData.lorry_amount}
                      onChange={handleLorryChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "none",
                        color: "#000",
                        fontWeight: "bold",
                      }}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "#eee",
                        display: "block",
                        marginBottom: "5px",
                      }}
                    >
                      Nattami *
                    </label>
                    <input
                      type="text"
                      name="nattami"
                      value={lorryFormData.nattami}
                      onChange={handleLorryChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "4px",
                        border: "none",
                        color: "#000",
                        fontWeight: "bold",
                      }}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: "5px",
                    }}
                  >
                    <button
                      type="submit"
                      disabled={isLorryLoading || !selectedSupplier}
                      style={{
                        padding: "10px 20px",
                        backgroundColor: "#3498db",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      {isLorryLoading ? "Saving..." : "Add Lorry Transaction"}
                    </button>
                  </div>
                </form>

                {/* Added Lorry Data Table (View / Edit / Delete) */}
                {currentLorryTx.length > 0 && (
                  <div style={{ marginTop: "25px" }}>
                    <h4
                      style={{
                        color: "#3498db",
                        fontSize: "1rem",
                        marginBottom: "10px",
                      }}
                    >
                      Added Lorry Records
                    </h4>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        color: "white",
                        fontSize: "0.9rem",
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: "#3498db33",
                            borderBottom: "1px solid #3498db",
                          }}
                        >
                          <th style={{ padding: "8px", textAlign: "left" }}>
                            Lorry Name
                          </th>
                          <th style={{ padding: "8px", textAlign: "right" }}>
                            Quantity
                          </th>
                          <th style={{ padding: "8px", textAlign: "left" }}>
                            Box Type
                          </th>
                          <th style={{ padding: "8px", textAlign: "right" }}>
                            Lorry Amt
                          </th>
                          <th style={{ padding: "8px", textAlign: "right" }}>
                            Nattami
                          </th>
                          <th style={{ padding: "8px", textAlign: "center" }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentLorryTx.map((tx) => (
                          <tr
                            key={tx.id}
                            style={{ borderBottom: "1px solid #ffffff22" }}
                          >
                            {editingLorryId === tx.id ? (
                              <>
                                <td style={{ padding: "8px" }}>
                                  <input
                                    type="text"
                                    name="lorry_name"
                                    value={editLorryFormData.lorry_name}
                                    onChange={handleEditLorryChange}
                                    style={{
                                      width: "100%",
                                      padding: "4px",
                                      borderRadius: "4px",
                                      border: "1px solid #ccc",
                                      color: "black",
                                      fontSize: "0.9rem",
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "8px" }}>
                                  <input
                                    type="number"
                                    name="total_amount"
                                    value={editLorryFormData.total_amount}
                                    onChange={handleEditLorryChange}
                                    style={{
                                      width: "100%",
                                      padding: "4px",
                                      borderRadius: "4px",
                                      border: "1px solid #ccc",
                                      color: "black",
                                      fontSize: "0.9rem",
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "8px" }}>
                                  <select
                                    name="box_type"
                                    value={editLorryFormData.box_type}
                                    onChange={handleEditLorryChange}
                                    style={{
                                      width: "100%",
                                      padding: "4px",
                                      borderRadius: "4px",
                                      border: "1px solid #ccc",
                                      color: "black",
                                      fontSize: "0.9rem",
                                    }}
                                  >
                                    <option value="BAG">BAG (Rs 40)</option>
                                    <option value="CARD">CARD (Rs 40)</option>
                                    <option value="LEEP">LEEP (Rs 30)</option>
                                    <option value="TAKB">TAKB (Rs 30)</option>
                                    <option value="TK">TK (Rs 40)</option>
                                    <option value="TL">TL (Rs 50)</option>
                                  </select>
                                </td>
                                <td style={{ padding: "8px" }}>
                                  <input
                                    type="number"
                                    name="lorry_amount"
                                    value={editLorryFormData.lorry_amount}
                                    onChange={handleEditLorryChange}
                                    style={{
                                      width: "100%",
                                      padding: "4px",
                                      borderRadius: "4px",
                                      border: "1px solid #ccc",
                                      color: "black",
                                      fontSize: "0.9rem",
                                    }}
                                  />
                                </td>
                                <td style={{ padding: "8px" }}>
                                  <input
                                    type="text"
                                    name="nattami"
                                    value={editLorryFormData.nattami}
                                    onChange={handleEditLorryChange}
                                    style={{
                                      width: "100%",
                                      padding: "4px",
                                      borderRadius: "4px",
                                      border: "1px solid #ccc",
                                      color: "black",
                                      fontSize: "0.9rem",
                                    }}
                                  />
                                </td>
                                <td
                                  style={{
                                    padding: "8px",
                                    textAlign: "center",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <button
                                    onClick={saveEditedLorry}
                                    style={{
                                      background: "#2ecc71",
                                      color: "white",
                                      border: "none",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      marginRight: "5px",
                                      fontSize: "12px",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={cancelEditingLorry}
                                    style={{
                                      background: "#e74c3c",
                                      color: "white",
                                      border: "none",
                                      padding: "4px 8px",
                                      borderRadius: "4px",
                                      cursor: "pointer",
                                      fontSize: "12px",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: "8px" }}>
                                  {tx.lorry_name}
                                </td>
                                <td
                                  style={{ padding: "8px", textAlign: "right" }}
                                >
                                  {formatDecimal(tx.total_amount, 0)}
                                </td>
                                <td style={{ padding: "8px" }}>
                                  {tx.box_type}
                                </td>
                                <td
                                  style={{ padding: "8px", textAlign: "right" }}
                                >
                                  {formatDecimal(tx.lorry_amount)}
                                </td>
                                <td
                                  style={{ padding: "8px", textAlign: "right" }}
                                >
                                  {tx.nattami}
                                </td>
                                <td
                                  style={{
                                    padding: "8px",
                                    textAlign: "center",
                                  }}
                                >
                                  <button
                                    onClick={() => startEditingLorry(tx)}
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      cursor: "pointer",
                                      fontSize: "16px",
                                      marginRight: "10px",
                                    }}
                                    title="Edit"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => deleteLorry(tx.id)}
                                    style={{
                                      background: "transparent",
                                      border: "none",
                                      cursor: "pointer",
                                      fontSize: "16px",
                                      marginRight: "10px",
                                    }}
                                    title="Delete"
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                marginTop: "30px",
                padding: "20px",
                border: "1px solid #ffffff33",
                borderRadius: "8px",
                backgroundColor: "#ffffff11",
              }}
            >
              <h3
                style={{ color: "#ffc107", marginTop: 0, fontSize: "1.2rem" }}
              >
                Advance Entry
              </h3>
              <form
                onSubmit={handleAdvanceSubmit}
                style={{ display: "flex", gap: "15px", alignItems: "flex-end" }}
              >
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      fontSize: "0.8rem",
                      color: "#eee",
                      display: "block",
                      marginBottom: "5px",
                    }}
                  >
                    Supplier Code
                  </label>
                  <input
                    type="text"
                    value={advancePayload.code}
                    readOnly
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "4px",
                      border: "none",
                      backgroundColor: "#eee",
                      color: "#000",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      fontSize: "0.8rem",
                      color: "#eee",
                      display: "block",
                      marginBottom: "5px",
                    }}
                  >
                    Amount (Rs)
                  </label>
                  <input
                    type="number"
                    name="advance_amount"
                    value={advancePayload.advance_amount}
                    onChange={(e) =>
                      setAdvancePayload({
                        ...advancePayload,
                        advance_amount: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "4px",
                      border: "none",
                      color: "#000",
                    }}
                    placeholder="0.00"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={advanceLoading || !selectedSupplier}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    height: "40px",
                  }}
                >
                  {advanceLoading ? "Saving..." : "Update Advance"}
                </button>
              </form>
              {advanceStatus.text && (
                <p
                  style={{
                    color:
                      advanceStatus.type === "success" ? "#28a745" : "#ff4444",
                    marginTop: "10px",
                    fontWeight: "bold",
                  }}
                >
                  {advanceStatus.text}
                </p>
              )}
            </div>

            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                border: "2px solid #17a2b8",
                borderRadius: "8px",
                backgroundColor: "#091d3d",
              }}
            >
              <label
                style={{
                  color: "#17a2b8",
                  fontWeight: "bold",
                  display: "block",
                  marginBottom: "8px",
                }}
              >
                Enter Paying Amount & Hit Enter:
              </label>
              <input
                type="number"
                value={payingAmount}
                onChange={(e) => setPayingAmount(e.target.value)}
                onKeyDown={handleLoanSubmit}
                placeholder="0.00"
                style={{
                  width: "100%",
                  padding: "12px",
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  borderRadius: "6px",
                  border: "2px solid #ffc107",
                }}
              />
              {loanStatus && (
                <p style={{ color: "white", marginTop: "5px" }}>{loanStatus}</p>
              )}
            </div>
          </>
        )}
        <div style={{ textAlign: "center" }}>
          <button
            style={{
              padding: "10px 20px",
              fontSize: "1.1rem",
              fontWeight: "bold",
              backgroundColor: "#ffc107",
              color: "#343a40",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              marginTop: "20px",
              opacity: selectedSupplier ? 1 : 0.5,
            }}
            onClick={() => {
              if (isUnprintedBill && !hasLorryTransaction) {
                toast.error("Please add lorry details before printing!");
                return;
              }
              handlePrint();
            }}
            disabled={
              !selectedSupplier ||
              isDetailsLoading ||
              supplierDetails.length === 0
            }
          >
            🖨️{" "}
            {isDetailsLoading
              ? "Processing..."
              : selectedSupplier
                ? isUnprintedBill
                  ? `Print & Finalize Bill (F4)`
                  : `Print Copy (F4)`
                : "Select a Bill First"}
          </button>
        </div>
      </div>
    );
  };

  const navBarStyle = {
    backgroundColor: "#343a40",
    padding: "15px 50px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1030,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  };
  const reportContainerStyle = {
    minHeight: "100vh",
    padding: "90px 50px 50px 50px",
    fontFamily: "Roboto, Arial, sans-serif",
    boxSizing: "border-box",
    backgroundColor: "#1ec139ff",
    marginTop: "-25px",
  };

  if (isLoading)
    return <div style={loadingStyle}>Loading Supplier Report...</div>;

  return (
    <>
      <Toaster position="top-right" />
      <nav style={navBarStyle}>
        <h1 style={{ color: "white", fontSize: "1.5rem", margin: 0 }}>
          Supplier Report
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div
            style={{
              backgroundColor: isRefreshing ? "#28a745" : "#6c757d",
              padding: "5px 10px",
              borderRadius: "5px",
              fontSize: "0.8rem",
              color: "white",
              fontWeight: "bold",
              transition: "background-color 0.3s ease",
              animation: isRefreshing ? "pulse 1s infinite" : "none",
            }}
          >
            🔄 {isRefreshing ? "Refreshing..." : "Auto-refresh (3s)"}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "#495057",
              padding: "5px 10px",
              borderRadius: "5px",
              gap: "10px",
            }}
          >
            <label
              style={{ color: "white", fontSize: "0.9rem", fontWeight: "bold" }}
            >
              Format:
            </label>
            <select
              value={printFormat}
              onChange={(e) => setPrintFormat(e.target.value)}
              style={{
                padding: "5px",
                borderRadius: "4px",
                border: "none",
                backgroundColor: "white",
                fontWeight: "bold",
              }}
            >
              <option value="thermal">Thermal</option>
              <option value="a4">A4 Paper</option>
            </select>
          </div>

          {printFormat === "thermal" && (
            <button
              style={{
                padding: "8px 15px",
                fontSize: "0.9rem",
                fontWeight: "bold",
                backgroundColor: "#17a2b8",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
              onClick={() =>
                setBillSize(billSize === "3inch" ? "4inch" : "3inch")
              }
            >
              Size: {billSize}
            </button>
          )}
          <button
            style={{
              padding: "8px 15px",
              fontSize: "1rem",
              fontWeight: "bold",
              backgroundColor: "#e83e8c",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
            onClick={() => navigate("/suppliers/printed-report")}
          >
            Supplier Loans
          </button>
          <button
            style={{
              padding: "10px 20px",
              fontSize: "1rem",
              fontWeight: "bold",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
            onClick={goToSalesEntry}
          >
            Home
          </button>
        </div>
      </nav>

      <div style={reportContainerStyle}>
        <div style={sectionsContainerStyle}>
          <div style={printedContainerStyle}>
            <div style={printedSectionStyle}>
              <h2
                style={{
                  ...printedHeaderStyle,
                  padding: "0 25px 10px 25px",
                  marginBottom: "15px",
                }}
              >
                {" "}
                Printed{" "}
              </h2>
              <input
                type="text"
                placeholder="🔍 Search printed..."
                value={printedSearchTerm}
                onChange={(e) => setPrintedSearchTerm(e.target.value)}
                style={{
                  ...searchBarStyle,
                  marginBottom: "20px",
                  height: "22px",
                  padding: "12px 25px",
                }}
              />
              <SupplierCodeList
                items={filteredPrintedItems}
                type="printed"
                searchTerm={printedSearchTerm}
              />
            </div>
          </div>

          <div style={centerPanelContainerStyle}>{renderDetailsPanel()}</div>

          <div style={unprintedContainerStyle}>
            <div style={unprintedSectionStyle}>
              <h2
                style={{
                  ...unprintedHeaderStyle,
                  padding: "0 25px 10px 25px",
                  marginBottom: "15px",
                  whiteSpace: "nowrap",
                }}
              >
                Unprinted
              </h2>
              <input
                type="text"
                placeholder="🔍 Search unprinted..."
                value={unprintedSearchTerm}
                onChange={(e) => setUnprintedSearchTerm(e.target.value)}
                style={{
                  ...searchBarStyle,
                  marginBottom: "20px",
                  height: "22px",
                  padding: "12px 25px",
                }}
              />
              <SupplierCodeList
                items={filteredUnprintedItems}
                type="unprinted"
                searchTerm={unprintedSearchTerm}
              />
            </div>
          </div>
        </div>
      </div>
      {renderImageModal()}
      {renderEditModal()}
    </>
  );
};

const style = document.createElement("style");
style.textContent = `
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
`;
document.head.appendChild(style);

// --- STYLES ---
const searchBarStyle = {
  width: "100%",
  fontSize: "1rem",
  borderRadius: "6px",
  border: "1px solid #E0E0E0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  boxSizing: "border-box",
  backgroundColor: "white",
};
const sectionsContainerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
};
const printedContainerStyle = {
  width: "200px",
  flexShrink: 0,
  marginLeft: "-45px",
  marginTop: "-10px",
  border: "2px solid black",
};
const unprintedContainerStyle = {
  width: "180px",
  flexShrink: 0,
  marginRight: "-45px",
  marginTop: "-10px",
  marginLeft: "0",
  border: "2px solid black",
};
const centerPanelContainerStyle = {
  flex: "3",
  minWidth: "700px",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
};
const baseSectionStyle = {
  padding: "25px 0 25px 0",
  borderRadius: "12px",
  boxShadow: "0 6px 15px rgba(0, 0, 0, 0.08)",
  display: "flex",
  flexDirection: "column",
  height: "calc(100vh - 210px)",
};
const printedSectionStyle = {
  ...baseSectionStyle,
  backgroundColor: "#1ec139ff",
  borderLeft: "5px solid #FFFFFF",
  minHeight: "550px",
};
const unprintedSectionStyle = {
  ...baseSectionStyle,
  backgroundColor: "#1ec139ff",
  borderLeft: "5px solid #FFFFFF",
  minHeight: "550px",
};
const printedHeaderStyle = {
  color: "#07090ae6",
  borderBottom: "2px solid #1E88E530",
  flexShrink: 0,
  fontSize: "1.3rem",
};
const unprintedHeaderStyle = {
  color: "#07090ae6",
  borderBottom: "2px solid #FF704330",
  flexShrink: 0,
  fontSize: "1.3rem",
};
const listContainerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0px",
  marginTop: "5px",
  overflowY: "auto",
  padding: "0 5px 0 5px",
  flexGrow: 1,
  height: "900px",
};
const loadingStyle = {
  textAlign: "center",
  padding: "50px",
  fontSize: "1.5rem",
  color: "#1E88E5",
  backgroundColor: "#1ec139ff",
};

export default SupplierReport;
