import React, { useState, useEffect, useMemo, useRef } from "react";
import Select from "react-select";
import Layout from "../Layout/Layout";
import "../../App.css";
import api from "../../api";
import AdminView from "../AdminView";
import { ThermalBillHTML, A4BillHTML } from "../BillTemplates";
import ImagePreviewModal from "../ImagePreviewModal";

// --- IMPORTING THE NEWLY SPLIT COMPONENTS ---
import CustomerList from "./CustomerList";
import ActiveBillTable from "./ActiveBillTable";
import AllSalesRecords from "./AllSalesRecords";
import {
  BreakdownDisplay,
  ItemSummary,
  SalesSummaryFooter,
  ContextMenu,
} from "./SalesHelpers";

const routes = {
  markPrinted: "/sales/mark-printed",
  getLoanAmount: "/get-loan-amount",
  markAllProcessed: "/sales/mark-all-processed",
  givenAmount: "/sales",
  sales: "/sales",
  customers: "/customers",
  items: "/items",
  suppliers: "/suppliers",
  getCustomerGivenAmount: "/sales/customer/given-amount",
  bulkUpdateCustomer: "/sales/bulk-update-customer",
};

const initialFormData = {
  customer_code: "",
  customer_name: "",
  supplier_code: "",
  code: "",
  item_code: "",
  item_name: "",
  weight: "",
  price_per_kg: "",
  pack_due: "",
  total: "",
  packs: "",
  given_amount: "",
  pack_cost: "",
  telephone_no: "",
  kuliya: "",
  nattami: "",
};

const fieldOrder = [
  "customer_code_input",
  "customer_code_select",
  "supplier_code",
  "item_code_select",
  "kuliya",
  "nattami",
  "telephone_no",
  "weight",
  "price_per_kg_grid_item",
  "packs",
];

const skipMap = {
  customer_code_input: "supplier_code",
  customer_code_select: "supplier_code",
  given_amount: "supplier_code",
  supplier_code: "item_code_select",
  item_code_select: "weight",
  kuliya: "nattami",
  nattami: "telephone_no",
  telephone_no: "weight",
  weight: "price_per_kg_grid_item",
  price_per_kg: "packs",
  price_per_kg_grid_item: "packs",
  packs: null,
};

export default function SalesEntry({ printMode: propPrintMode = "thermal" }) {
  const [localPrintMode] = useState(propPrintMode || "thermal");
  const printMode = propPrintMode || localPrintMode;

  const [allSalesRecords, setAllSalesRecords] = useState([]);
  const [isLoadingAllSales, setIsLoadingAllSales] = useState(false);

  const [highlightItemDropdown, setHighlightItemDropdown] = useState(false);

  const fetchAllSalesRecords = async () => {
    try {
      setIsLoadingAllSales(true);
      const response = await api.get(
        `/sales/all-sales-data?_t=${new Date().getTime()}`,
      );
      const salesData =
        response.data.sales || response.data.data || response.data;
      const salesArray = Array.isArray(salesData) ? salesData : [];
      setAllSalesRecords(salesArray);
    } catch (error) {
      console.error("Failed to fetch all sales records:", error);
      setAllSalesRecords([]);
    } finally {
      setIsLoadingAllSales(false);
    }
  };

  const fetchActiveSales = async () => {
    try {
      const res = await api.get(`${routes.sales}?_t=${new Date().getTime()}`);
      const data = res.data.data || res.data.sales || res.data || [];
      updateState({ allSales: Array.isArray(data) ? data : [] });
    } catch (error) {
      console.error("Failed to sync active sales", error);
    }
  };

  useEffect(() => {
    fetchAllSalesRecords();
    fetchActiveSales();
  }, []);

  const refs = {
    telephone_no: useRef(null),
    customer_code_input: useRef(null),
    customer_code_select: useRef(null),
    given_amount: useRef(null),
    supplier_code: useRef(null),
    item_code_select: useRef(null),
    item_name: useRef(null),
    weight: useRef(null),
    price_per_kg: useRef(null),
    packs: useRef(null),
    total: useRef(null),
    price_per_kg_grid_item: useRef(null),
    kuliya: useRef(null),
    nattami: useRef(null),
  };
  const adminViewRef = useRef(null);

  const [state, setState] = useState({
    allSales: [],
    selectedPrintedCustomer: null,
    selectedUnprintedCustomer: null,
    editingSaleId: null,
    searchQueries: {
      printed: "",
      unprinted: "",
    },
    errors: {},
    loanAmount: 0,
    isManualClear: false,
    isSubmitting: false,
    formData: initialFormData,
    customerSearchInput: "",
    itemSearchInput: "",
    supplierSearchInput: "",
    currentBillNo: null,
    isLoading: false,
    customers: [],
    items: [],
    suppliers: [],
    windowFocused: null,
    isPrinting: false,
    billSize: "3inch",
    priceManuallyChanged: false,
    gridPricePerKg: "",
    bulkPrice: "",
    selectedSaleForBreakdown: null,
    showSavePhoneButton: false,
    isTelephoneValid: false,
    currentUser: null,
    bulkUpdateCustomerCode: "",
    isGivenAmountManuallyTouched: false,
    filterOnlyCash: false,
    customerProfilePic: null,
    supplierProfilePic: null,
    customerNameDisplay: "",
    supplierNameDisplay: "",
    isImageModalOpen: false,
    selectedImageData: {
      profile: null,
      nic_front: null,
      nic_back: null,
      title: "",
    },
    selectedSalesIds: [],
    selectionCriteria: null,
    isBulkUpdateModalOpen: false,
    bulkUpdateSupplierCode: "",
    bulkUpdateContextMenu: { x: 0, y: 0, show: false },
    isBulkPrintEnabled: true,
    // FORCE UPDATE TRIGGER - used to force re-render of CustomerList after print
    forceUpdate: Date.now(),
  });

  const setFormData = (updater) =>
    setState((prev) => ({
      ...prev,
      formData:
        typeof updater === "function" ? updater(prev.formData) : updater,
    }));
  const updateState = (updates) =>
    setState((prev) => ({ ...prev, ...updates }));

  const {
    allSales,
    customerSearchInput,
    selectedPrintedCustomer,
    selectedUnprintedCustomer,
    editingSaleId,
    searchQueries,
    errors,
    loanAmount,
    isManualClear,
    formData,
    isLoading,
    customers,
    items,
    suppliers,
    gridPricePerKg,
    selectedSaleForBreakdown,
    currentUser,
  } = state;

  const combineSalesForPrinting = (salesData) => {
    const combinedMap = new Map();

    salesData.forEach((sale) => {
      const key = `${sale.supplier_code}|${sale.item_code}|${sale.price_per_kg}`;

      if (combinedMap.has(key)) {
        const existing = combinedMap.get(key);

        const existingPackCost = parseFloat(existing.CustomerPackCost) || 0;
        const newPackCost = parseFloat(sale.CustomerPackCost) || 0;
        const existingKuliya = parseFloat(existing.Kuliya) || 0;
        const newKuliyaValue = parseFloat(sale.Kuliya) || 0;
        const existingNattami = parseFloat(existing.Nattami) || 0;
        const newNattamiValue = parseFloat(sale.Nattami) || 0;

        if (existingPackCost !== newPackCost) {
          const newKey = `${key}|${newPackCost}|${newKuliyaValue}|${newNattamiValue}`;
          if (!combinedMap.has(newKey)) {
            combinedMap.set(newKey, {
              ...sale,
              original_ids: [sale.id],
            });
          } else {
            const existingAlt = combinedMap.get(newKey);
            existingAlt.weight =
              (parseFloat(existingAlt.weight) || 0) +
              (parseFloat(sale.weight) || 0);
            existingAlt.packs =
              (parseInt(existingAlt.packs) || 0) + (parseInt(sale.packs) || 0);
            existingAlt.total =
              existingAlt.weight * (parseFloat(sale.price_per_kg) || 0);
            existingAlt.Kuliya =
              (parseFloat(existingAlt.Kuliya) || 0) + newKuliyaValue;
            existingAlt.Nattami =
              (parseFloat(existingAlt.Nattami) || 0) + newNattamiValue;
            existingAlt.CustomerPackCost = newPackCost;
            existingAlt.original_ids.push(sale.id);
          }
          return;
        }

        const newWeight =
          (parseFloat(existing.weight) || 0) + (parseFloat(sale.weight) || 0);
        const newPacks =
          (parseInt(existing.packs) || 0) + (parseInt(sale.packs) || 0);
        const newTotal = newWeight * (parseFloat(sale.price_per_kg) || 0);
        const combinedKuliya = existingKuliya + newKuliyaValue;
        const combinedNattami = existingNattami + newNattamiValue;

        combinedMap.set(key, {
          ...existing,
          weight: newWeight,
          packs: newPacks,
          total: newTotal,
          Kuliya: combinedKuliya,
          Nattami: combinedNattami,
          CustomerPackCost: existingPackCost,
          original_ids: [...(existing.original_ids || [existing.id]), sale.id],
        });
      } else {
        combinedMap.set(key, {
          ...sale,
          original_ids: [sale.id],
        });
      }
    });

    return Array.from(combinedMap.values());
  };

  const toggleSaleSelection = (saleId, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const saleToSelect = displayedSales.find((s) => s.id === saleId);
    if (!saleToSelect) return;

    const isCurrentlySelected = state.selectedSalesIds.includes(saleId);

    if (isCurrentlySelected) {
      setState((prev) => {
        const newSelectedIds = prev.selectedSalesIds.filter(
          (id) => id !== saleId,
        );
        return {
          ...prev,
          selectedSalesIds: newSelectedIds,
          selectionCriteria:
            newSelectedIds.length === 0 ? null : prev.selectionCriteria,
        };
      });
      return;
    }

    if (state.selectedSalesIds.length === 0) {
      setState((prev) => ({
        ...prev,
        selectedSalesIds: [saleId],
        selectionCriteria: {
          customer_code: saleToSelect.customer_code,
          item_code: saleToSelect.item_code,
        },
      }));
      return;
    }

    const matchesCriteria =
      saleToSelect.customer_code === state.selectionCriteria?.customer_code &&
      saleToSelect.item_code === state.selectionCriteria?.item_code;

    if (matchesCriteria) {
      setState((prev) => ({
        ...prev,
        selectedSalesIds: [...prev.selectedSalesIds, saleId],
      }));
    } else {
      alert(
        `❌ Cannot select this record!\n\n✓ Current selection allows only:\n   Customer: ${state.selectionCriteria?.customer_code}\n   Item: ${state.selectionCriteria?.item_code}\n\n✗ This record has:\n   Customer: ${saleToSelect.customer_code}\n   Item: ${saleToSelect.item_code}\n\nPlease clear selection or select matching records.`,
      );
    }
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && state.bulkUpdateContextMenu.show) {
        closeContextMenu();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [state.bulkUpdateContextMenu.show]);

  const handleRightClick = (e, sale) => {
    e.preventDefault();
    e.stopPropagation();

    const isSelected = state.selectedSalesIds.includes(sale.id);

    if (!isSelected) {
      if (state.selectedSalesIds.length === 0) {
        setState((prev) => ({
          ...prev,
          selectedSalesIds: [sale.id],
          selectionCriteria: {
            customer_code: sale.customer_code,
            item_code: sale.item_code,
          },
        }));
      } else {
        const matchesCriteria =
          sale.customer_code === state.selectionCriteria?.customer_code &&
          sale.item_code === state.selectionCriteria?.item_code;

        if (matchesCriteria) {
          setState((prev) => ({
            ...prev,
            selectedSalesIds: [...prev.selectedSalesIds, sale.id],
          }));
        } else {
          alert(`Cannot select this record!`);
          return;
        }
      }
    }

    setState((prev) => ({
      ...prev,
      bulkUpdateContextMenu: {
        show: true,
        x: e.clientX,
        y: e.clientY,
      },
      bulkUpdateCustomerCode: "",
    }));
  };

  const handleBulkUpdateCustomer = async (newCustomerCode) => {
    const customerCodeToUpdate =
      newCustomerCode || state.bulkUpdateCustomerCode;
    const finalCustomerCode = customerCodeToUpdate.trim().toUpperCase();

    if (!finalCustomerCode) {
      alert("Please enter a customer code");
      return;
    }

    if (state.selectedSalesIds.length === 0) {
      alert("No sales selected");
      return;
    }

    try {
      updateState({ isSubmitting: true });

      const response = await api.post(routes.bulkUpdateCustomer, {
        sale_ids: state.selectedSalesIds,
        customer_code: finalCustomerCode,
      });

      if (response.data.success) {
        await fetchAllSalesRecords();
        await fetchActiveSales();
        window.location.reload();
      } else {
        throw new Error(response.data.message || "Update failed");
      }
    } catch (error) {
      console.error("Bulk update error:", error);
      alert("Failed to update customer codes. Please try again.");
      updateState({ isSubmitting: false });
    }
  };

  const closeContextMenu = () => {
    setState((prev) => ({
      ...prev,
      bulkUpdateContextMenu: { show: false, x: 0, y: 0 },
      bulkUpdateSupplierCode: "",
      bulkUpdateCustomerCode: "",
    }));
  };

  const printedFarmers = useMemo(() => {
    const groups = {};
    allSales
      .filter((s) => s.supplier_bill_printed === "Y")
      .forEach((sale) => {
        const code = sale.supplier_code;
        if (code && !groups[code]) groups[code] = { supplier_code: code };
      });
    return Object.values(groups);
  }, [allSales]);

  const unprintedFarmers = useMemo(() => {
    const groups = {};
    allSales
      .filter(
        (s) => s.supplier_bill_printed === "N" || !s.supplier_bill_printed,
      )
      .forEach((sale) => {
        const code = sale.supplier_code;
        if (code && !groups[code]) groups[code] = { supplier_code: code };
      });
    return Object.values(groups);
  }, [allSales]);

  const { newSales, printedSales, unprintedSales } = useMemo(
    () => ({
      newSales: allSales.filter(
        (s) => s.id && s.bill_printed !== "Y" && s.bill_printed !== "N",
      ),
      printedSales: allSales.filter((s) => s.bill_printed === "Y"),
      unprintedSales: allSales.filter((s) => s.bill_printed === "N"),
    }),
    [allSales],
  );

  const filterCustomers = (sales, query, searchByBillNo = false) => {
    const allCustomers = [...new Set(sales.map((s) => s.customer_code))];
    if (!query) return allCustomers;
    const lowerQuery = query.toLowerCase();
    if (searchByBillNo) {
      const byBillNo = sales
        .filter((s) =>
          (s.bill_no?.toString() || "").toLowerCase().includes(lowerQuery),
        )
        .map((s) => s.customer_code);
      const byCode = allCustomers.filter((code) =>
        (code || "").toLowerCase().includes(lowerQuery),
      );
      return [...new Set([...byBillNo, ...byCode])];
    }
    return allCustomers.filter((code) =>
      (code || "").toLowerCase().includes(lowerQuery),
    );
  };

  const printedCustomers = useMemo(
    () => filterCustomers(printedSales, searchQueries.printed, true),
    [printedSales, searchQueries.printed],
  );
  const unprintedCustomers = useMemo(
    () => filterCustomers(unprintedSales, searchQueries.unprinted),
    [unprintedSales, searchQueries.unprinted],
  );

  const displayedSales = useMemo(() => {
    let sales = [];

    if (selectedPrintedCustomer) {
      if (selectedPrintedCustomer.includes("-")) {
        const [cCode, bNo] = selectedPrintedCustomer.split("-");
        sales = printedSales.filter(
          (s) =>
            (s.customer_code || "").trim().toUpperCase() ===
              cCode.trim().toUpperCase() && String(s.bill_no) === String(bNo),
        );
      } else {
        sales = printedSales.filter(
          (s) =>
            (s.customer_code || "").trim().toUpperCase() ===
            selectedPrintedCustomer.trim().toUpperCase(),
        );
      }
    } else if (selectedUnprintedCustomer) {
      const safeSelectedUnprinted = selectedUnprintedCustomer
        .trim()
        .toUpperCase();

      const customerNewSales = newSales.filter(
        (s) =>
          (s.customer_code || "").trim().toUpperCase() ===
          safeSelectedUnprinted,
      );
      const customerUnprintedSales = unprintedSales.filter(
        (s) =>
          (s.customer_code || "").trim().toUpperCase() ===
          safeSelectedUnprinted,
      );

      sales = [...customerNewSales, ...customerUnprintedSales];
    } else {
      sales = newSales;
    }

    const uniqueSales = [];
    const map = new Map();
    for (const item of sales) {
      if (!map.has(item.id)) {
        map.set(item.id, true);
        uniqueSales.push(item);
      }
    }

    return uniqueSales.slice().reverse();
  }, [
    newSales,
    unprintedSales,
    printedSales,
    selectedUnprintedCustomer,
    selectedPrintedCustomer,
    allSales,
  ]);

  const autoCustomerCode = useMemo(
    () =>
      displayedSales.length > 0 && !isManualClear
        ? displayedSales[0].customer_code || ""
        : "",
    [displayedSales, isManualClear],
  );
  const currentBillNo = useMemo(() => {
    if (selectedPrintedCustomer && selectedPrintedCustomer.includes("-"))
      return selectedPrintedCustomer.split("-")[1] || "N/A";
    if (selectedPrintedCustomer)
      return (
        printedSales.find((s) => s.customer_code === selectedPrintedCustomer)
          ?.bill_no || "N/A"
      );
    return "";
  }, [selectedPrintedCustomer, printedSales]);

  const formatDecimal = (value) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  };

  const fetchLoanAmount = async (customerCode) => {
    if (!customerCode) return updateState({ loanAmount: 0 });
    try {
      const response = await api.post(routes.getLoanAmount, {
        customer_short_name: customerCode,
      });
      updateState({
        loanAmount: parseFloat(response.data.total_loan_amount) || 0,
      });
    } catch {
      updateState({ loanAmount: 0 });
    }
  };

  const fetchInitialData = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      const [resSales, resCustomers, resItems, resSuppliers] =
        await Promise.all([
          api.get(`${routes.sales}?_t=${new Date().getTime()}`),
          api.get(routes.customers),
          api.get(routes.items),
          api.get(routes.suppliers),
        ]);
      const salesData =
        resSales.data.data || resSales.data.sales || resSales.data || [];
      const customersData =
        resCustomers.data.data ||
        resCustomers.data.customers ||
        resCustomers.data ||
        [];
      const itemsData =
        resItems.data.data || resItems.data.items || resItems.data || [];
      const suppliersData =
        resSuppliers.data.data ||
        resSuppliers.data.suppliers ||
        resSuppliers.data ||
        [];
      updateState({
        allSales: salesData,
        customers: customersData,
        items: itemsData,
        suppliers: suppliersData,
        isLoading: false,
        currentUser: userData,
      });
    } catch {
      updateState({ errors: { form: "Failed to load data. Check console." } });
    }
  };

  useEffect(() => {
    if (displayedSales.length > 0) {
      const totals = displayedSales.reduce(
        (acc, s) => {
          const weight = Math.abs(parseFloat(s.weight) || 0);
          const price = Math.abs(parseFloat(s.price_per_kg) || 0);
          const packs = Math.abs(parseFloat(s.packs) || 0);
          const pCost = Math.abs(parseFloat(s.CustomerPackCost) || 0);
          const pLabour = Math.abs(parseFloat(s.CustomerPackLabour) || 0);
          acc.billTotal += weight * price;
          acc.totalBagPrice += packs * pCost;
          acc.totalLabour += packs * pLabour;
          return acc;
        },
        { billTotal: 0, totalBagPrice: 0, totalLabour: 0 },
      );
    } else {
      setFormData((prev) => ({ ...prev, given_amount: "" }));
    }
  }, [displayedSales]);

  useEffect(() => {
    const code = formData.customer_code || autoCustomerCode;

    if (code && customers.length > 0) {
      const customer = customers.find(
        (c) =>
          String(c.short_name).toUpperCase() === String(code).toUpperCase(),
      );

      if (customer) {
        const baseUrl =
          "https://goviraju.lk/vts_sales_backend/application/public";
        let fileName = customer.profile_pic;
        let fullPath = null;

        if (fileName) {
          if (fileName.startsWith("http")) {
            fullPath = fileName;
          } else {
            const cleanFileName = fileName.replace("public/", "");
            const subPath = cleanFileName.includes("customers")
              ? cleanFileName
              : `customers/${cleanFileName}`;

            fullPath = `${baseUrl}/storage/${subPath}`;
          }
        }

        updateState({
          customerProfilePic: fullPath,
          customerNameDisplay: customer.name || "",
        });
      } else {
        updateState({ customerProfilePic: null, customerNameDisplay: "" });
      }
    } else {
      updateState({ customerProfilePic: null, customerNameDisplay: "" });
    }
  }, [formData.customer_code, autoCustomerCode, customers]);

  useEffect(() => {
    const code = formData.supplier_code;
    if (code && suppliers.length > 0) {
      const supplier = suppliers.find(
        (s) => String(s.code).toUpperCase() === String(code).toUpperCase(),
      );

      if (supplier) {
        const baseUrl =
          "https://goviraju.lk/vts_sales_backend/application/public";
        let fileName = supplier.profile_pic;

        let fullPath = null;

        if (fileName) {
          if (fileName.startsWith("http")) {
            fullPath = fileName;
          } else {
            const subPath = fileName.includes("suppliers/profiles")
              ? fileName.replace("public/", "")
              : `suppliers/profiles/${fileName.replace("public/", "")}`;

            fullPath = `${baseUrl}/storage/${subPath}`;
          }
        }

        updateState({
          supplierProfilePic: fullPath,
          supplierNameDisplay: supplier.name || "",
        });
      } else {
        updateState({ supplierProfilePic: null, supplierNameDisplay: "" });
      }
    } else {
      updateState({ supplierProfilePic: null, supplierNameDisplay: "" });
    }
  }, [formData.supplier_code, suppliers]);

  // CALCULATE TOTAL
  useEffect(() => {
    const w = parseFloat(formData.weight) || 0;
    const p = parseFloat(formData.price_per_kg) || 0;
    const total = Math.abs(w * p);
    setFormData((prev) => ({ ...prev, total: Number(total.toFixed(2)) }));
  }, [formData.weight, formData.price_per_kg, formData.packs]);

  useEffect(() => {
    const handleWindowFocus = () =>
      updateState((prev) => ({ ...prev, windowFocused: Date.now() }));
    window.addEventListener("focus", handleWindowFocus);
    return () => window.removeEventListener("focus", handleWindowFocus);
  }, []);

  useEffect(() => {
    fetchInitialData();
    refs.customer_code_input.current?.focus();
  }, []);

  const handleCustomerSelect = (selectedOption) => {
    const short = selectedOption ? selectedOption.value : "";
    const customer = customers.find(
      (x) => String(x.short_name) === String(short),
    );
    updateState({
      selectedUnprintedCustomer: unprintedCustomers.includes(short)
        ? short
        : null,
      selectedPrintedCustomer: null,
      customerSearchInput: "",
      bulkPrice: "",
    });
    const existingGivenAmount =
      allSales.find((s) => s.customer_code === short)?.given_amount || "";
    setFormData((prev) => ({
      ...prev,
      customer_code: short || "",
      customer_name: customer?.name || "",
      given_amount: existingGivenAmount,
    }));
    fetchLoanAmount(short);
    updateState({ isManualClear: false });

    // Goes to Supplier Input
    setTimeout(() => {
      refs.supplier_code.current?.focus();
      refs.supplier_code.current?.select();
    }, 100);
  };

  const handleInputChange = (field, value) => {
    if (field === "price_per_kg") {
      updateState({ bulkPrice: value });
    } else if (field === "price_per_kg_grid_item") {
      setFormData((prev) => ({ ...prev, price_per_kg: value }));
      updateState({ gridPricePerKg: value, priceManuallyChanged: true });
    } else if (field === "nattami") {
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else if (field === "kuliya") {
      setFormData((prev) => ({ ...prev, [field]: value }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

    if (field === "customer_code") {
      const trimmedValue = value.trim();
      updateState({ isManualClear: value === "" });
      const matchingCustomer = unprintedCustomers.find(
        (code) => code.toLowerCase() === trimmedValue.toLowerCase(),
      );

      if (matchingCustomer)
        updateState({
          selectedUnprintedCustomer: matchingCustomer,
          selectedPrintedCustomer: null,
        });
      else if (selectedUnprintedCustomer)
        updateState({ selectedUnprintedCustomer: null });

      if (!trimmedValue) {
        updateState({ loanAmount: 0 });
        setFormData((prev) => ({ ...prev, given_amount: "" }));
      }

      const customer = customers.find((c) => c.short_name === value);
      const customerSales = allSales.filter(
        (s) => s.customer_code === trimmedValue,
      );
      const firstSale = customerSales[0];
      const givenAmount = firstSale?.given_amount || "";
      setFormData((prev) => ({
        ...prev,
        customer_name: customer?.name || "",
        given_amount: givenAmount,
      }));
      fetchLoanAmount(trimmedValue);

      const telephoneNo = formData.telephone_no || "";
      const hasValidPhone =
        telephoneNo.length === 10 && /^\d+$/.test(telephoneNo);
      updateState({
        showSavePhoneButton: value.trim().length > 0 && hasValidPhone,
      });
    }

    if (field === "telephone_no") {
      const isValidPhone = value.length === 10 && /^\d+$/.test(value);
      updateState({ isTelephoneValid: isValidPhone });

      const customerCode = formData.customer_code || autoCustomerCode;
      updateState({
        showSavePhoneButton: customerCode.trim().length > 0 && isValidPhone,
      });
    }

    if (field === "supplier_code")
      setFormData((prev) => ({ ...prev, supplier_code: value }));
    if (field === "given_amount") {
      updateState({ isGivenAmountManuallyTouched: true });
    }
  };

  const handleItemSelect = (selectedOption) => {
    if (selectedOption) {
      const { item } = selectedOption;
      const fetchedPackDue = parseFloat(item?.pack_due) || 0;
      const fetchedPackCost = parseFloat(item?.pack_cost) || 0;

      // Use Bulk Price if it has a value, otherwise fall back to item price
      const priceToUse = state.bulkPrice !== "" ? state.bulkPrice : "";

      setFormData((prev) => ({
        ...prev,
        item_code: item.no,
        item_name: item.type,
        pack_due: fetchedPackDue,
        price_per_kg: priceToUse,
      }));

      updateState({
        packCost: fetchedPackCost,
        itemSearchInput: "",
        gridPricePerKg: priceToUse,
      });

      // Clear highlight
      setHighlightItemDropdown(false);

      setTimeout(() => refs.weight.current?.focus(), 100);
    } else {
      setFormData((prev) => ({
        ...prev,
        item_code: "",
        item_name: "",
        pack_due: "",
        price_per_kg: "",
      }));
      updateState({ packCost: 0, itemSearchInput: "", gridPricePerKg: "" });
    }
  };

  const handleCustomerClick = async (
    type,
    customerCode,
    billNo = null,
    salesRecords = [],
  ) => {
    // ✅ Allow click even if printing is in progress? We'll show alert but not block entirely
    if (state.isPrinting) {
      alert("Printing in progress. Please wait.");
      return;
    }

    // Admin mode opens via AdminView ref
    if (currentUser?.role === "Admin") {
      if (adminViewRef.current && adminViewRef.current.openCustomerBill) {
        adminViewRef.current.openCustomerBill(
          customerCode,
          billNo,
          salesRecords,
        );
      } else {
        alert("Customer bill view is loading. Please try again.");
      }
      return;
    }

    const isPrinted = type === "printed";
    let selectionKey = customerCode;
    if (isPrinted && billNo) selectionKey = `${customerCode}-${billNo}`;

    const isCurrentlySelected = isPrinted
      ? state.selectedPrintedCustomer === selectionKey
      : state.selectedUnprintedCustomer === selectionKey;

    if (isCurrentlySelected) {
      setState((prev) => ({
        ...prev,
        formData: initialFormData,
        selectedPrintedCustomer: null,
        selectedUnprintedCustomer: null,
        currentBillNo: null,
        editingSaleId: null,
        isManualClear: false,
        customerSearchInput: "",
        priceManuallyChanged: false,
        bulkPrice: "",
        selectedSaleForBreakdown: null,
        gridPricePerKg: "",
        loanAmount: 0,
      }));
      return;
    }

    const customer = customers.find(
      (x) =>
        String(x.short_name).toUpperCase() ===
        String(customerCode).toUpperCase(),
    );

    const totals = salesRecords.reduce(
      (acc, s) => {
        const weight = Math.abs(parseFloat(s.weight) || 0);
        const price = Math.abs(parseFloat(s.price_per_kg) || 0);
        const packs = Math.abs(parseFloat(s.packs) || 0);
        const pCost = Math.abs(parseFloat(s.CustomerPackCost) || 0);

        acc.billTotal += weight * price;
        acc.totalBagPrice += packs * pCost;

        return acc;
      },
      { billTotal: 0, totalBagPrice: 0 },
    );

    const calculatedFinal = totals.billTotal + totals.totalBagPrice;
    let fetchedGivenAmount = calculatedFinal.toFixed(2);

    if (isPrinted) {
      try {
        const response = await api.get(
          `${routes.getCustomerGivenAmount}/${customerCode}`,
        );
        fetchedGivenAmount = response.data?.given_amount ?? fetchedGivenAmount;
      } catch (error) {
        fetchedGivenAmount =
          salesRecords[0]?.given_amount || fetchedGivenAmount;
      }
    } else {
      fetchedGivenAmount =
        salesRecords[salesRecords.length - 1]?.given_amount ||
        fetchedGivenAmount;
    }

    setState((prev) => ({
      ...prev,
      formData: {
        ...initialFormData,
        customer_code: customerCode,
        customer_name: customer?.name || "",
        telephone_no: customer?.telephone_no || "",
        given_amount: fetchedGivenAmount,
      },
      selectedPrintedCustomer: isPrinted ? selectionKey : null,
      selectedUnprintedCustomer: !isPrinted ? selectionKey : null,
      currentBillNo: isPrinted ? billNo : null,
      editingSaleId: null,
      isManualClear: false,
      customerSearchInput: "",
      priceManuallyChanged: false,
      bulkPrice: "",
      selectedSaleForBreakdown: null,
      gridPricePerKg: "",
    }));

    fetchLoanAmount(customerCode);

    setTimeout(() => refs.supplier_code.current?.focus(), 50);
  };

  const handleImageClick = (entityType) => {
    const code =
      entityType === "customer"
        ? formData.customer_code || autoCustomerCode
        : formData.supplier_code;
    const list = entityType === "customer" ? customers : suppliers;

    const person = list.find(
      (p) =>
        String(
          entityType === "customer" ? p.short_name : p.code,
        ).toUpperCase() === String(code).toUpperCase(),
    );

    if (person) {
      updateState({
        isImageModalOpen: true,
        selectedImageData: {
          profile:
            entityType === "customer"
              ? state.customerProfilePic
              : state.supplierProfilePic,
          nic_front: person.nic_front,
          nic_back: person.nic_back,
          title: person.name || code,
          type: entityType,
        },
      });
    }
  };

  const handleEditClick = (sale) => {
    if (state.editingSaleId === sale.id) {
      setFormData((prev) => ({
        ...prev,
        customer_code: sale.customer_code || "",
        customer_name: sale.customer_name || "",
        telephone_no: prev.telephone_no || "",
        supplier_code: "",
        item_code: "",
        item_name: "",
        weight: "",
        price_per_kg: "",
        pack_due: "",
        total: "",
        packs: "",
        kuliya: "",
        nattami: "",
      }));

      updateState({
        editingSaleId: null,
        isManualClear: true,
        priceManuallyChanged: false,
        gridPricePerKg: "",
        bulkPrice: "",
        selectedSaleForBreakdown: null,
      });

      // Turn off highlight when deselected
      setHighlightItemDropdown(false);

      setTimeout(() => {
        refs.supplier_code?.current?.focus();
        refs.supplier_code?.current?.select();
      }, 0);

      return;
    }

    let fetchedPackDue = sale.pack_due || "";
    if (sale.item_code) {
      const matchingItem = items.find(
        (i) => String(i.no) === String(sale.item_code),
      );
      fetchedPackDue =
        parseFloat(matchingItem?.pack_due) || sale.pack_due || "";
    }

    setFormData((prev) => ({
      ...sale,
      item_name: sale.item_name || "",
      customer_code: sale.customer_code || "",
      customer_name: sale.customer_name || "",
      telephone_no: sale.telephone_no || prev.telephone_no || "",
      supplier_code: sale.supplier_code || "",
      item_code: sale.item_code || "",
      weight: Math.abs(parseFloat(sale.weight)) || "",
      price_per_kg: Math.abs(parseFloat(sale.price_per_kg)) || "",
      pack_due: fetchedPackDue,
      total: Math.abs(parseFloat(sale.total)) || "",
      packs: Math.abs(parseInt(sale.packs)) || "",
      kuliya: Math.abs(parseFloat(sale.Kuliya)) || "",
      nattami: Math.abs(parseFloat(sale.Nattami)) || "",
    }));
    updateState({
      editingSaleId: sale.id,
      isManualClear: false,
      priceManuallyChanged: false,
      gridPricePerKg: Math.abs(parseFloat(sale.price_per_kg)) || "",
      bulkPrice: "", // Clear bulk price when editing specific item
      selectedSaleForBreakdown: sale,
    });

    // Turn ON highlight because user clicked edit
    setHighlightItemDropdown(true);

    setTimeout(() => {
      if (refs.weight.current) {
        refs.weight.current.focus();
        refs.weight.current.select();

        const handleWeightEnter = (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            refs.weight.current.removeEventListener(
              "keydown",
              handleWeightEnter,
            );
            if (refs.price_per_kg_grid_item.current) {
              refs.price_per_kg_grid_item.current.focus();
              refs.price_per_kg_grid_item.current.select();
            }
          }
        };

        refs.weight.current.removeEventListener("keydown", handleWeightEnter);
        refs.weight.current.addEventListener("keydown", handleWeightEnter);
      }
    }, 0);
  };

  const handleClearForm = (clearBillNo = false) => {
    setFormData(initialFormData);
    updateState({
      editingSaleId: null,
      loanAmount: 0,
      isManualClear: false,
      packCost: 0,
      customerSearchInput: "",
      itemSearchInput: "",
      supplierSearchInput: "",
      priceManuallyChanged: false,
      gridPricePerKg: "",
      bulkPrice: "",
      isGivenAmountManuallyTouched: false,
      selectedSaleForBreakdown: null,
      ...(clearBillNo && { currentBillNo: null }),
    });
    setHighlightItemDropdown(false); // Reset highlight
  };

  const handleDeleteRecord = async (saleId) => {
    if (
      !saleId ||
      !window.confirm("Are you sure you want to delete this sales record?")
    )
      return;
    try {
      await api.delete(`${routes.sales}/${saleId}`);
      await fetchAllSalesRecords();
      await fetchActiveSales();
      if (editingSaleId === saleId) handleClearForm();
    } catch (error) {
      updateState({
        errors: { form: error.response?.data?.message || error.message },
      });
    }
  };

  const handleSubmitGivenAmount = async (e) => {
    if (e) e.preventDefault();
    updateState({ errors: {} });

    const customerCode = (formData.customer_code || autoCustomerCode)
      .trim()
      .toUpperCase();
    if (!customerCode) return null;

    const salesToUpdate = displayedSales.filter((s) => s.id);
    if (salesToUpdate.length === 0) return null;

    try {
      const currentInputAmount =
        parseFloat(formData.given_amount.toString().replace(/,/g, "")) || 0;

      const totals = salesToUpdate.reduce(
        (acc, s) => {
          const weight = Math.abs(parseFloat(s.weight) || 0);
          const price = Math.abs(parseFloat(s.price_per_kg) || 0);
          const packs = Math.abs(parseFloat(s.packs) || 0);
          const pCost = Math.abs(parseFloat(s.CustomerPackCost) || 0);
          const pLabour = Math.abs(parseFloat(s.CustomerPackLabour) || 0);
          acc.billTotal += weight * price;
          acc.totalBagPrice += packs * pCost;
          acc.totalLabour += packs * pLabour;
          return acc;
        },
        { billTotal: 0, totalBagPrice: 0, totalLabour: 0 },
      );

      const autoCalculatedGrandTotal = totals.billTotal + totals.totalBagPrice;
      const isCredit =
        Math.abs(currentInputAmount - autoCalculatedGrandTotal) > 0.01;
      const creditTransactionStatus = isCredit ? "Y" : "N";

      const updatePromises = salesToUpdate.map((sale) =>
        api.put(`${routes.sales}/${sale.id}/given-amount`, {
          given_amount: currentInputAmount,
          credit_transaction: creditTransactionStatus,
        }),
      );

      const results = await Promise.all(updatePromises);
      updateState({ isGivenAmountManuallyTouched: false });
      await fetchActiveSales();

      const updatedSalesFromApi = results.map((response) => response.data.sale);
      return updatedSalesFromApi;
    } catch (error) {
      updateState({
        errors: { form: error.response?.data?.message || error.message },
      });
      return null;
    }
  };

  const handlePrintAndClear = async () => {
    let salesData = displayedSales.filter(
      (s) => s.customer_code && s.item_code,
    );

    if (!salesData.length) {
      alert("මුද්‍රණය කිරීමට දත්ත නොමැත!");
      return;
    }

    const shouldCombine = state.isBulkPrintEnabled;
    let printData = salesData;

    if (shouldCombine) {
      printData = combineSalesForPrinting(salesData);
    }

    for (const s of printData) {
      if (parseFloat(s.price_per_kg) === parseFloat(s.SupplierPricePerKg)) {
        const errorMsg = `කේතය: ${s.supplier_code} හි කොමිස් මුදල් අඩුකර නොමැත. කරුණාකර පාරිභෝගිකයා පද්ධතියට ඇතුළත් කර අදාළ ඡායාරූප (Profile, NIC) එක් කරන්න.`;
        alert(errorMsg);
        return;
      }
    }

    const hasZeroPrice = printData.some(
      (s) => parseFloat(s.price_per_kg) === 0,
    );
    if (hasZeroPrice) {
      alert("මිල 0 ලෙස ඇති අයිතම මුද්‍රණය කළ නොහැක.");
      return;
    }

    try {
      updateState({ isPrinting: true });

      const customerCode = salesData[0].customer_code || "N/A";
      const customerName =
        salesData[0].customer_code ||
        salesData[0].customer_code ||
        customerCode;
      const mobile = salesData[0].mobile || "0777672838 / 071437115";

      let currentLoan = 0;
      try {
        const loanRes = await api.post(routes.getLoanAmount, {
          customer_short_name: customerCode,
        });
        currentLoan = parseFloat(loanRes.data.total_loan_amount) || 0;
      } catch (e) {
        console.warn("Loan fetch failed");
      }

      let idsToMark = salesData.map((s) => s.id).filter((id) => id);
      if (shouldCombine) {
        idsToMark = printData.flatMap((s) => s.original_ids).filter((id) => id);
      }

      const printResponse = await api.post(routes.markPrinted, {
        sales_ids: idsToMark,
        telephone_no: formData.telephone_no,
        customer_code: customerCode,
        customer_name: customerName,
        loan_amount: currentLoan,
      });

      if (printResponse.data.status !== "success") {
        throw new Error("මුද්‍රණය අසාර්ථකයි");
      }

      const billNo = printResponse.data.bill_no || "";

      let receiptHtml;
      if (printMode === "a4") {
        receiptHtml = A4BillHTML({
          salesData: printData,
          billNo,
          customerName,
          mobile,
          globalLoanAmount: currentLoan,
        });
      } else {
        receiptHtml = ThermalBillHTML({
          salesData: printData,
          billNo,
          customerName,
          mobile,
          globalLoanAmount: currentLoan,
          billSize: state.billSize,
        });
      }

      // ✅ Refresh active sales and all records
      await fetchActiveSales();
      await fetchAllSalesRecords();

      // ✅ Force re-render of CustomerList by updating forceUpdate timestamp
      updateState({ forceUpdate: Date.now() });

      // Clear selected customers and form
      updateState({
        selectedPrintedCustomer: null,
        selectedUnprintedCustomer: null,
        isPrinting: false,
      });

      handleClearForm(true);

      const printWindow = window.open("", "_blank", "width=800,height=600");
      if (!printWindow) {
        alert("Please allow pop-ups for printing");
        window.location.reload();
        return;
      }

      printWindow.document.write(receiptHtml);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 100);
      };
    } catch (error) {
      console.error("Printing error:", error);
      alert("මුද්‍රණය කිරීමේදී දෝෂයක් ඇති විය.");
      updateState({ isPrinting: false });
    }
  };

  const handleMarkAllProcessed = async () => {
    const salesToProcess = displayedSales.filter(
      (s) => s.id && s.bill_printed !== "Y",
    );

    if (salesToProcess.length === 0) {
      handleClearForm(true);
      updateState({
        selectedUnprintedCustomer: null,
        selectedPrintedCustomer: null,
      });
      setTimeout(() => refs.customer_code_input.current?.focus(), 100);
      return;
    }

    updateState({
      allSales: allSales.map((s) =>
        salesToProcess.some((ps) => ps.id === s.id)
          ? { ...s, bill_printed: "N" }
          : s,
      ),
      selectedUnprintedCustomer: null,
      selectedPrintedCustomer: null,
    });
    handleClearForm(true);
    setTimeout(() => refs.customer_code_input.current?.focus(), 100);

    try {
      const response = await api.post(routes.markAllProcessed, {
        sales_ids: salesToProcess.map((s) => s.id),
      });

      if (response.data.success) {
        fetchActiveSales();
        fetchAllSalesRecords();
      }
    } catch (err) {
      console.error("Failed to mark sales as processed:", err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (state.isSubmitting) return;

    const requiredFields = [
      {
        key: "customer_code",
        ref: "customer_code_input",
        label: "Customer Code",
      },
      { key: "supplier_code", ref: "supplier_code", label: "Supplier Code" },
      { key: "item_code", ref: "item_code_select", label: "Item" },
      { key: "weight", ref: "weight", label: "Weight" },
      { key: "packs", ref: "packs", label: "Packs" },
    ];

    for (const field of requiredFields) {
      const value = formData[field.key];
      if (
        value === null ||
        value === undefined ||
        value.toString().trim() === ""
      ) {
        updateState({
          errors: { form: `කරුණාකර ${field.label} ඇතුළත් කරන්න` },
        });
        const targetRef = refs[field.ref];
        if (targetRef?.current) {
          targetRef.current.focus();
          if (!field.ref.includes("select")) targetRef.current.select();
        }
        return;
      }
    }

    updateState({ errors: {}, isSubmitting: true });

    const customerCode = (
      formData.customer_code || autoCustomerCode
    ).toUpperCase();
    const currentSupplierCode = formData.supplier_code;
    const currentCustomerName = formData.customer_name;
    const currentTelephone = formData.telephone_no;
    const shouldUpdateRelatedPrice = state.priceManuallyChanged;

    try {
      const isEditing = editingSaleId !== null;

      let billPrintedStatus = undefined,
        billNoToUse = null;
      if (!isEditing) {
        if (state.currentBillNo) {
          billPrintedStatus = "Y";
          billNoToUse = state.currentBillNo;
        } else if (selectedPrintedCustomer) {
          billPrintedStatus = "Y";
          billNoToUse = selectedPrintedCustomer.includes("-")
            ? selectedPrintedCustomer.split("-")[1]
            : printedSales.find(
                (s) => s.customer_code === selectedPrintedCustomer,
              )?.bill_no;
        } else if (selectedUnprintedCustomer) {
          billPrintedStatus = "N";
        }
      }

      const activePrice = parseFloat(formData.price_per_kg) || 0;

      const finalWeight = parseFloat(formData.weight) || 0;
      const finalPacks = parseFloat(formData.packs) || 0;

      if (finalWeight < 0 || finalPacks < 0 || activePrice < 0) {
        updateState({
          errors: {
            form: "බර, මිල හෝ අසුරුම් සඳහා සෘණ (-) අගයන් ඇතුළත් කළ නොහැක!",
          },
          isSubmitting: false,
        });
        return;
      }

      const payload = {
        supplier_code: currentSupplierCode.toUpperCase(),
        customer_code: customerCode,
        customer_name: currentCustomerName,
        item_code: formData.item_code,
        item_name: formData.item_name,
        weight: Math.abs(finalWeight),
        price_per_kg: Math.abs(activePrice),
        pack_due: parseFloat(formData.pack_due) || 0,
        total: parseFloat(formData.total) || 0,
        packs: Math.abs(finalPacks),
        given_amount: formData.given_amount
          ? parseFloat(formData.given_amount)
          : null,
        // ✅ Kuliya and Nattami are explicitly set to 0 if not provided
        kuliya: formData.kuliya ? parseFloat(formData.kuliya) : 0,
        nattami: formData.nattami ? parseFloat(formData.nattami) : 0,
        ...(billPrintedStatus && { bill_printed: billPrintedStatus }),
        ...(billNoToUse && { bill_no: billNoToUse }),
        update_related_price: shouldUpdateRelatedPrice,
      };

      const url = isEditing ? `${routes.sales}/${editingSaleId}` : routes.sales;
      const method = isEditing ? "put" : "post";

      await api[method](url, payload);

      setFormData({
        ...initialFormData,
        customer_code: customerCode,
        customer_name: currentCustomerName,
        telephone_no: currentTelephone,
        supplier_code: currentSupplierCode,
      });

      updateState({
        editingSaleId: null,
        isManualClear: false,
        isSubmitting: false,
        priceManuallyChanged: false,
        gridPricePerKg: "",
      });

      setHighlightItemDropdown(false);

      await fetchActiveSales();
      await fetchAllSalesRecords();

      if (refs.supplier_code.current) {
        refs.supplier_code.current.focus();
        refs.supplier_code.current.select();
      }
    } catch (error) {
      updateState({
        errors: {
          form:
            error.response?.data?.message ||
            error.message ||
            "An error occurred",
        },
        isSubmitting: false,
      });
    }
  };

  const handleKeyDown = async (e, currentFieldName) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (currentFieldName === "given_amount") {
        const success = await handleSubmitGivenAmount(e);
        if (success) {
          handlePrintAndClear();
        }
        return;
      }

      if (currentFieldName === "kuliya") {
        setTimeout(() => {
          if (refs.nattami.current) {
            refs.nattami.current.focus();
            refs.nattami.current.select();
          }
        }, 50);
        return;
      }

      if (currentFieldName === "nattami") {
        setTimeout(() => {
          if (refs.telephone_no.current) {
            refs.telephone_no.current.focus();
            refs.telephone_no.current.select();
          }
        }, 50);
        return;
      }

      if (currentFieldName === "telephone_no") {
        updateState({ showSavePhoneButton: false });
        refs.weight.current?.focus();
        return;
      }

      if (currentFieldName === "customer_code_input") {
        const code = String(formData.customer_code || autoCustomerCode || "")
          .trim()
          .toUpperCase();

        if (code) {
          const match = customers.find(
            (c) => String(c.short_name).toUpperCase() === code,
          );
          if (match) {
            setFormData((prev) => ({
              ...prev,
              customer_name: match.name || "",
            }));
            fetchLoanAmount(code);
          }
        }

        refs.supplier_code.current?.focus();
        return;
      }

      if (currentFieldName === "supplier_code") {
        setTimeout(() => {
          if (refs.item_code_select.current) {
            refs.item_code_select.current.focus();
          }
        }, 50);
        return;
      }

      if (currentFieldName === "item_code_select") {
        setTimeout(() => {
          if (refs.weight.current) {
            refs.weight.current.focus();
            refs.weight.current.select();
          }
        }, 50);
        return;
      }

      if (currentFieldName === "weight") {
        const customerCode = String(
          formData.customer_code || autoCustomerCode || "",
        ).trim();
        const supplierCode = String(formData.supplier_code || "").trim();
        const itemCode = String(formData.item_code || "").trim();
        const areRequiredFieldsEmpty =
          !customerCode || !supplierCode || !itemCode;

        if (areRequiredFieldsEmpty) {
          updateState({ errors: {} });

          if (!customerCode) {
            setTimeout(() => {
              if (refs.customer_code_input.current) {
                refs.customer_code_input.current.focus();
                refs.customer_code_input.current.select();
              }
            }, 50);
          } else if (!supplierCode) {
            setTimeout(() => {
              if (refs.supplier_code.current) {
                refs.supplier_code.current.focus();
                refs.supplier_code.current.select();
              }
            }, 50);
          } else if (!itemCode) {
            setTimeout(() => {
              if (refs.item_code_select.current) {
                refs.item_code_select.current.focus();
              }
            }, 50);
          }
          return;
        }

        setTimeout(() => {
          if (refs.price_per_kg_grid_item.current) {
            refs.price_per_kg_grid_item.current.focus();
            refs.price_per_kg_grid_item.current.select();
          }
        }, 50);
        return;
      }

      if (currentFieldName === "price_per_kg_grid_item") {
        setTimeout(() => {
          if (refs.packs.current) {
            refs.packs.current.focus();
            refs.packs.current.select();
          }
        }, 50);
        return;
      }

      if (currentFieldName === "packs") {
        await handleSubmit(e);
        return;
      }

      let nextFieldName = skipMap[currentFieldName];

      if (!nextFieldName && currentFieldName !== "packs") {
        const currentIndex = fieldOrder.indexOf(currentFieldName);
        let nextIndex = currentIndex + 1;
        while (
          nextIndex < fieldOrder.length &&
          ["customer_code_select", "item_name"].includes(fieldOrder[nextIndex])
        ) {
          nextIndex++;
        }
        nextFieldName =
          nextIndex < fieldOrder.length ? fieldOrder[nextIndex] : null;
      }

      if (nextFieldName) {
        const nextRef = refs[nextFieldName];
        if (nextRef?.current) {
          requestAnimationFrame(() => {
            setTimeout(() => {
              nextRef.current.focus();
              if (!nextFieldName.includes("select")) nextRef.current.select();
            }, 0);
          });
        }
      }
    }
  };

  const savePhoneNumber = async () => {
    const phoneNumber = formData.telephone_no;
    const customerCode = formData.customer_code || autoCustomerCode;

    if (!phoneNumber || !customerCode) {
      alert("Please enter both phone number and customer code");
      return;
    }

    if (phoneNumber.length !== 10 || !/^\d+$/.test(phoneNumber)) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }

    try {
      const response = await api.post("/customers/check-or-create", {
        short_name: customerCode,
        telephone_no: phoneNumber,
      });

      if (response.data.customer) {
        setFormData((prev) => ({
          ...prev,
          customer_name: response.data.customer.name || prev.customer_name,
        }));
        updateState({
          showSavePhoneButton: false,
          isTelephoneValid: false,
        });
      }
    } catch (err) {
      console.error("Failed to save phone number:", err);
      alert("Failed to save phone number. Please try again.");
    }
  };

  useEffect(() => {
    const handleShortcut = (e) => {
      if (e.key === "F10") {
        e.preventDefault();
        window.location.reload();
      }
      if (selectedPrintedCustomer && e.key === "F5") {
        e.preventDefault();
        return;
      }
      if (e.key === "F1") {
        e.preventDefault();
        handlePrintAndClear();
      } else if (e.key === "F5") {
        e.preventDefault();
        if (typeof handleMarkAllProcessed === "function")
          handleMarkAllProcessed();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [
    displayedSales,
    newSales,
    selectedPrintedCustomer,
    selectedUnprintedCustomer,
    state.isBulkPrintEnabled,
    formData,
    allSales,
  ]);

  const salesTotal = displayedSales.reduce(
    (sum, s) =>
      sum +
      Math.abs(parseFloat(s.weight) || 0) *
        Math.abs(parseFloat(s.price_per_kg) || 0),
    0,
  );
  const packCostTotal = displayedSales.reduce(
    (sum, s) =>
      sum +
      Math.abs(parseFloat(s.CustomerPackCost) || 0) *
        Math.abs(parseFloat(s.packs) || 0),
    0,
  );
  const totalSalesValue = salesTotal + packCostTotal;

  const hasData =
    allSales.length > 0 ||
    customers.length > 0 ||
    items.length > 0 ||
    suppliers.length > 0;

  return (
    <div
      className="sales-layout w-full"
      style={{ width: "100%", margin: "0 auto", padding: "0" }}
    >
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 bg-blue-500 text-white py-1 text-center text-sm z-50">
          Refreshing data...
        </div>
      )}
      {state.isPrinting && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black py-1 text-center text-sm z-50">
          Printing in progress... Please wait
        </div>
      )}

      {/* ✨ CSS GRID WRAPPER ✨ */}
      <div
        className="three-column-layout w-full"
        style={{
          opacity: isLoading ? 0.7 : 1,
          display: "grid",
          gridTemplateColumns: "200px minmax(0, 1fr) 200px",
          width: "100%",
          gap: "10px",
          padding: "10px",
          minHeight: "100vh",
          alignItems: "start",
          boxSizing: "border-box",
        }}
      >
        {/* LEFT SIDEBAR */}
        <div
          className="left-sidebar"
          style={{
            backgroundColor: "#1ec139ff",
            borderRadius: "0.75rem",
            position: "sticky",
            top: "10px",
            height: "calc(100vh - 20px)",
            overflow: "hidden",
          }}
        >
          {hasData ? (
            <CustomerList
              customers={printedCustomers}
              type="printed"
              searchQuery={searchQueries.printed}
              onSearchChange={(value) =>
                updateState({
                  searchQueries: { ...searchQueries, printed: value },
                })
              }
              selectedPrintedCustomer={selectedPrintedCustomer}
              selectedUnprintedCustomer={selectedUnprintedCustomer}
              handleCustomerClick={handleCustomerClick}
              formatDecimal={formatDecimal}
              allSales={allSales}
              lastUpdate={state.forceUpdate || state.windowFocused} // ✅ forceUpdate passed
              isCashFilterActive={state.isCashFilterActive}
              toggleCashFilter={() =>
                updateState({ isCashFilterActive: !state.isCashFilterActive })
              }
            />
          ) : (
            <div
              className="w-full shadow-xl rounded-xl overflow-y-auto border border-black p-4 text-center"
              style={{
                backgroundColor: "#1ec139ff",
                height: "100%",
              }}
            >
              <div
                style={{ backgroundColor: "#006400" }}
                className="p-1 rounded-t-xl"
              >
                <h2
                  className="font-bold text-white mb-1 whitespace-nowrap text-center"
                  style={{ fontSize: "14px" }}
                >
                  මුද්‍රණය කළ
                </h2>
              </div>
              <div className="py-4">
                <p className="text-gray-700">මුද්‍රණය කළ ගනුදෙනු දත්ත නොමැත.</p>
              </div>
            </div>
          )}
        </div>

        {/* CENTER SECTION */}
        <div
          className="center-form shadow-xl"
          style={{
            backgroundColor: "#111439ff",
            padding: "15px 20px 15px 20px",
            borderRadius: "0.75rem",
            color: "white",
            height: "auto",
            boxSizing: "border-box",
            gridColumnStart: 2,
            gridColumnEnd: 3,
            width: "100%",
          }}
        >
          {currentUser?.role === "Admin" ? (
            <AdminView
              ref={adminViewRef}
              allSales={allSales}
              customers={customers}
              items={items}
              suppliers={suppliers}
            />
          ) : (
            <div className="pos-sales-view w-full">
              {/* Form Section */}
              <div className="w-full relative">
                <form onSubmit={handleSubmit} className="w-full relative">
                  {/* Absolute Profile Images */}
                  {state.customerProfilePic && (
                    <div
                      onClick={() => handleImageClick("customer")}
                      className="cursor-pointer hover:scale-105 transition-transform"
                      style={{
                        position: "absolute",
                        right: "120px",
                        top: "-5px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "8px",
                        zIndex: 50,
                      }}
                    >
                      <span className="text-sm font-bold text-gray-400">
                        ගැ
                      </span>
                      <div
                        style={{
                          width: "90px",
                          height: "90px",
                          backgroundColor: "white",
                          border: "3px solid #1ec139",
                          borderRadius: "10px",
                          overflow: "hidden",
                          boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <img
                          src={state.customerProfilePic}
                          alt="Customer"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {state.supplierProfilePic && (
                    <div
                      onClick={() => handleImageClick("supplier")}
                      className="cursor-pointer hover:scale-105 transition-transform"
                      style={{
                        position: "absolute",
                        right: "0px",
                        top: "-5px",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "8px",
                        zIndex: 50,
                      }}
                    >
                      <span className="text-sm font-bold text-gray-400">
                        සැ
                      </span>
                      <div
                        style={{
                          width: "90px",
                          height: "90px",
                          backgroundColor: "white",
                          border: "3px solid #3b82f6",
                          borderRadius: "10px",
                          overflow: "hidden",
                          boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <img
                          src={state.supplierProfilePic}
                          alt="Supplier Profile"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <ImagePreviewModal
                    isOpen={state.isImageModalOpen}
                    onClose={() => updateState({ isImageModalOpen: false })}
                    data={state.selectedImageData}
                  />

                  {/* ✨ Header Row - Telephone Number & Total Fixed ✨ */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "15px",
                      marginBottom: "15px",
                      zIndex: 20,
                      flexWrap: "nowrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "25px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        className="font-bold text-2xl"
                        style={{ color: "red", whiteSpace: "nowrap" }}
                      >
                        බිල් අං: {currentBillNo}
                      </div>
                      <div
                        className="font-bold text-2xl whitespace-nowrap"
                        style={{ color: "red" }}
                      >
                        මුළු විකුණුම්: Rs. {formatDecimal(totalSalesValue)}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <input
                          type="checkbox"
                          id="bulkPrintCheckbox"
                          checked={state.isBulkPrintEnabled}
                          onChange={(e) =>
                            updateState({
                              isBulkPrintEnabled: e.target.checked,
                            })
                          }
                          style={{
                            width: "22px",
                            height: "22px",
                            cursor: "pointer",
                            accentColor: "#4CAF50",
                          }}
                        />
                        <label
                          htmlFor="bulkPrintCheckbox"
                          style={{
                            color: "white",
                            fontSize: "1.1rem",
                            fontWeight: "bold",
                            cursor: "pointer",
                          }}
                        >
                          Bulk Printing
                        </label>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "20px",
                      }}
                    >
                      {/* Total Amount Moved to the LEFT of the Telephone */}
                      <div
                        className="font-bold text-3xl whitespace-nowrap"
                        style={{ color: "#4ade80" }}
                      >
                        Total: Rs. {formatDecimal(formData.total)}
                      </div>

                      {/* 📞 TELEPHONE MOVED TO THE RIGHT */}
                      <div style={{ display: "flex", gap: "4px" }}>
                        <input
                          id="telephone_no"
                          ref={refs.telephone_no}
                          name="telephone_no"
                          value={formData.telephone_no || ""}
                          onChange={(e) =>
                            handleInputChange("telephone_no", e.target.value)
                          }
                          onKeyDown={(e) => handleKeyDown(e, "telephone_no")}
                          type="tel"
                          maxLength="10"
                          placeholder="දුරකථන අංකය"
                          disabled={!!selectedPrintedCustomer}
                          className="px-2 py-1 font-bold border rounded text-black placeholder-gray-500"
                          style={{
                            backgroundColor: selectedPrintedCustomer
                              ? "#4a5568"
                              : "#f6f6ff",
                            border: "1px solid #4a5568",
                            height: "45px",
                            fontSize: "16px",
                            borderRadius: "0.5rem",
                            boxSizing: "border-box",
                            cursor: selectedPrintedCustomer
                              ? "not-allowed"
                              : "text",
                            opacity: selectedPrintedCustomer ? 0.7 : 1,
                            width: "160px",
                          }}
                        />
                        {state.showSavePhoneButton && (
                          <button
                            onClick={savePhoneNumber}
                            type="button"
                            style={{
                              backgroundColor: "#4CAF50",
                              color: "white",
                              border: "none",
                              padding: "0 10px",
                              borderRadius: "0.5rem",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "14px",
                              height: "45px",
                            }}
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ✨ Row 1: Customer + Select + Loan + Bulk Price + Kuliya + Nattami ✨ */}
                  <div
                    className="w-full flex flex-row gap-2 items-end mb-2"
                    style={{ position: "relative", zIndex: 20 }}
                  >
                    {/* 1. Customer Code */}
                    <div style={{ flex: "1.2" }}>
                      <input
                        id="customer_code_input"
                        ref={refs.customer_code_input}
                        name="customer_code"
                        value={formData.customer_code || autoCustomerCode}
                        onChange={(e) =>
                          handleInputChange(
                            "customer_code",
                            e.target.value.toUpperCase(),
                          )
                        }
                        onKeyDown={(e) =>
                          handleKeyDown(e, "customer_code_input")
                        }
                        type="text"
                        placeholder="පාරිභෝගික කේතය"
                        className="px-2 py-1 uppercase font-bold w-full border rounded bg-white text-black placeholder-gray-500"
                        style={{
                          backgroundColor: "#0d0d4d",
                          border: "1px solid #4a5568",
                          color: "white",
                          height: "45px",
                          fontSize: "16px",
                          padding: "0 0.5rem",
                          borderRadius: "0.5rem",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    {/* 2. Customer Select */}
                    <div
                      style={{ flex: "2", position: "relative", zIndex: 12 }}
                    >
                      <Select
                        id="customer_code_select"
                        ref={refs.customer_code_select}
                        components={{ IndicatorSeparator: () => null }}
                        value={
                          formData.customer_code
                            ? {
                                value: formData.customer_code,
                                label: `${formData.customer_code}`,
                              }
                            : null
                        }
                        onChange={handleCustomerSelect}
                        options={customers
                          .filter(
                            (c) =>
                              !customerSearchInput ||
                              (c.short_name || "").charAt(0).toUpperCase() ===
                                customerSearchInput.charAt(0).toUpperCase(),
                          )
                          .map((c) => ({
                            value: c.short_name,
                            label: `${c.short_name}`,
                          }))}
                        onInputChange={(v, { action }) =>
                          action === "input-change" &&
                          updateState({ customerSearchInput: v.toUpperCase() })
                        }
                        inputValue={customerSearchInput}
                        placeholder="පාරිභෝගිකයා"
                        isClearable
                        isSearchable
                        styles={{
                          control: (b) => ({
                            ...b,
                            minHeight: "45px",
                            height: "45px",
                            fontSize: "16px",
                            backgroundColor: "white",
                            borderColor: "#4a5568",
                            borderRadius: "0.5rem",
                          }),
                          valueContainer: (b) => ({
                            ...b,
                            padding: "0 6px",
                            height: "45px",
                          }),
                          indicatorsContainer: (b) => ({
                            ...b,
                            height: "45px",
                            padding: "0px",
                          }),
                          clearIndicator: (b) => ({
                            ...b,
                            padding: "2px",
                          }),
                          dropdownIndicator: (b) => ({
                            ...b,
                            padding: "2px",
                          }),
                          placeholder: (b) => ({
                            ...b,
                            fontSize: "14px",
                            color: "#a0aec0",
                          }),
                          input: (b) => ({
                            ...b,
                            fontSize: "14px",
                            color: "black",
                            fontWeight: "bold",
                          }),
                          singleValue: (b) => ({
                            ...b,
                            color: "black",
                            fontSize: "16px",
                            fontWeight: "bold",
                          }),
                          option: (b, s) => ({
                            ...b,
                            color: "black",
                            fontWeight: "bold",
                            fontSize: "14px",
                            backgroundColor: s.isFocused ? "#e5e7eb" : "white",
                            cursor: "pointer",
                          }),
                          menu: (base) => ({
                            ...base,
                            marginTop: "4px",
                            zIndex: 9999,
                            position: "absolute",
                          }),
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        }}
                        menuPlacement="auto"
                        menuPortalTarget={document.body}
                      />
                    </div>

                    {/* 3. Loan Amount (Moved here) */}
                    <div style={{ flex: "1.5" }}>
                      <div
                        className="rounded-lg border relative bg-white flex items-center justify-start pl-2 pt-1"
                        style={{
                          height: "45px",
                          boxSizing: "border-box",
                        }}
                      >
                        <span
                          className="text-black font-bold"
                          style={{ fontSize: "14px" }}
                        >
                          Rs.{" "}
                          {loanAmount < 0
                            ? formatDecimal(Math.abs(loanAmount))
                            : formatDecimal(loanAmount)}
                        </span>
                      </div>
                    </div>

                    {/* 4. Bulk Price (Moved here) */}
                    <div style={{ flex: "1.2" }}>
                      <input
                        id="price_per_kg"
                        ref={refs.price_per_kg}
                        name="price_per_kg"
                        type="text"
                        value={
                          state.bulkPrice !== undefined ? state.bulkPrice : ""
                        }
                        onChange={(e) => {
                          if (
                            /^\d*\.?\d*$/.test(e.target.value) ||
                            e.target.value === ""
                          ) {
                            updateState({ bulkPrice: e.target.value });
                          }
                        }}
                        onKeyDown={(e) => {
                          const blockedKeys = ["e", "E", "+", "-"];
                          if (blockedKeys.includes(e.key)) e.preventDefault();
                          handleKeyDown(e, "price_per_kg");
                        }}
                        placeholder="එකවර මිල"
                        className="px-2 py-1 uppercase font-bold w-full border rounded bg-white text-black placeholder-gray-500 text-center"
                        style={{
                          backgroundColor: "#0d0d4d",
                          border: "1px solid #4a5568",
                          color: "white",
                          height: "45px",
                          fontSize: "16px",
                          padding: "0 0.5rem",
                          borderRadius: "0.5rem",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    {/* 5 & 6. Kuliya & Nattami */}
                    {[
                      {
                        id: "kuliya",
                        placeholder: "කුලිය",
                        fieldRef: refs.kuliya,
                      },
                      {
                        id: "nattami",
                        placeholder: "නාට්ටාමි",
                        fieldRef: refs.nattami,
                      },
                    ].map(({ id, placeholder, fieldRef }) => (
                      <div key={id} style={{ flex: "1" }}>
                        <input
                          id={id}
                          ref={fieldRef}
                          name={id}
                          type="text"
                          value={formData[id] || ""}
                          onChange={(e) => {
                            handleInputChange(id, e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleKeyDown(e, id);
                            }
                          }}
                          placeholder={placeholder}
                          className="px-2 py-1 uppercase font-bold border rounded bg-white text-black placeholder-gray-500 text-center w-full"
                          style={{
                            backgroundColor: "white",
                            borderRadius: "0.5rem",
                            textAlign: "center",
                            fontSize: "15px",
                            height: "45px",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* ✨ Row 2: Supplier + Item + Weight + Price + Packs ✨ */}
                  <div
                    className="w-full flex flex-row gap-2 items-end mb-2"
                    style={{ position: "relative", zIndex: 10 }}
                  >
                    <div style={{ flex: "1" }}>
                      <input
                        id="supplier_code"
                        ref={refs.supplier_code}
                        name="supplier_code"
                        value={formData.supplier_code || ""}
                        onChange={(e) =>
                          handleInputChange(
                            "supplier_code",
                            e.target.value.toUpperCase(),
                          )
                        }
                        onKeyDown={(e) => handleKeyDown(e, "supplier_code")}
                        type="text"
                        placeholder="සැපයුම්කරු (Supplier)"
                        className="px-2 py-1 uppercase font-bold border rounded bg-white text-black placeholder-gray-500 w-full"
                        style={{
                          backgroundColor: "#0d0d4d",
                          border: "1px solid #4a5568",
                          color: "white",
                          height: "55px",
                          fontSize: "20px",
                          padding: "0 0.75rem",
                          borderRadius: "0.5rem",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div style={{ flex: "1.5" }}>
                      {(() => {
                        const currentFilteredOptions = [...items]
                          .filter((item) => {
                            if (!state.itemSearchInput) return true;
                            const input = state.itemSearchInput.toUpperCase();
                            return String(item.no)
                              .toUpperCase()
                              .startsWith(input);
                          })
                          .sort((a, b) => {
                            const isANumeric = !isNaN(a.no);
                            const isBNumeric = !isNaN(b.no);
                            if (isANumeric && !isBNumeric) return 1;
                            if (!isANumeric && isBNumeric) return -1;
                            return String(a.no)
                              .toUpperCase()
                              .localeCompare(String(b.no).toUpperCase());
                          })
                          .map((item) => ({
                            value: item.no,
                            label: `${item.no} - ${item.type}`,
                            item,
                          }));

                        return (
                          <Select
                            ref={refs.item_code_select}
                            components={{
                              DropdownIndicator: () => null,
                              IndicatorSeparator: () => null,
                            }}
                            openMenuOnFocus={false}
                            isSearchable
                            tabSelectsValue={false}
                            closeMenuOnSelect={true}
                            blurInputOnSelect={true}
                            inputValue={state.itemSearchInput}
                            options={currentFilteredOptions}
                            placeholder="භාණ්ඩය (Item)"
                            defaultMenuIsOpen={false}
                            value={
                              formData.item_code
                                ? {
                                    value: formData.item_code,
                                    label: `${formData.item_code} - ${formData.item_name}`,
                                  }
                                : null
                            }
                            onInputChange={(value, meta) => {
                              if (meta.action === "input-change") {
                                updateState({
                                  itemSearchInput: value.toUpperCase(),
                                });
                              }
                            }}
                            onChange={(selectedOption) => {
                              if (!selectedOption) return;
                              handleItemSelect(selectedOption);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setTimeout(() => {
                                  if (!formData.item_code) {
                                    const shortcutKeys = [
                                      "+",
                                      "0",
                                      "1",
                                      "2",
                                      "3",
                                    ];
                                    if (
                                      shortcutKeys.includes(
                                        state.itemSearchInput,
                                      )
                                    ) {
                                      const searchValue = state.itemSearchInput;
                                      let itemToUse = null;
                                      if (searchValue !== "+") {
                                        const matchingItem = items.find(
                                          (item) =>
                                            String(item.no).toUpperCase() ===
                                            searchValue.toUpperCase(),
                                        );
                                        if (matchingItem) {
                                          itemToUse = {
                                            no: matchingItem.no,
                                            type: matchingItem.type,
                                            pack_due: matchingItem.pack_due,
                                            price_per_kg:
                                              matchingItem.price_per_kg,
                                          };
                                        }
                                      }
                                      if (!itemToUse) {
                                        const lastSale = displayedSales[0];
                                        if (lastSale) {
                                          itemToUse = {
                                            no: lastSale.item_code,
                                            type: lastSale.item_name,
                                            pack_due: lastSale.pack_due,
                                            price_per_kg: lastSale.price_per_kg,
                                          };
                                        }
                                      }
                                      if (itemToUse) {
                                        const mockOption = {
                                          value: itemToUse.no,
                                          label: `${itemToUse.no} - ${itemToUse.type}`,
                                          item: {
                                            no: itemToUse.no,
                                            type: itemToUse.type,
                                            pack_due: itemToUse.pack_due,
                                            pack_cost: itemToUse.pack_cost,
                                            price_per_kg:
                                              itemToUse.price_per_kg,
                                          },
                                        };
                                        handleItemSelect(mockOption);
                                      }
                                    }
                                  }
                                }, 50);
                                return;
                              }
                            }}
                            className="react-select-container font-bold w-full"
                            styles={{
                              control: (base) => ({
                                ...base,
                                height: "55px",
                                minHeight: "55px",
                                fontSize: "1.1rem",
                                backgroundColor: highlightItemDropdown
                                  ? "#fffae6"
                                  : "white",
                                borderColor: highlightItemDropdown
                                  ? "#f59e0b"
                                  : "#4a5568",
                                borderWidth: highlightItemDropdown
                                  ? "2px"
                                  : "1px",
                                borderRadius: "0.5rem",
                                boxShadow: highlightItemDropdown
                                  ? "0 0 8px rgba(245, 158, 11, 0.6)"
                                  : "none",
                              }),
                              valueContainer: (base) => ({
                                ...base,
                                padding: "0 0.5rem",
                                height: "55px",
                              }),
                              indicatorsContainer: (base) => ({
                                ...base,
                                height: "55px",
                                padding: "0px",
                              }),
                              input: (base) => ({
                                ...base,
                                color: highlightItemDropdown
                                  ? "#d97706"
                                  : "black",
                                fontSize: "1.1rem",
                              }),
                              singleValue: (base) => ({
                                ...base,
                                color: highlightItemDropdown
                                  ? "#d97706"
                                  : "black",
                                fontWeight: "bold",
                                fontSize: "1.1rem",
                              }),
                              option: (base, state) => ({
                                ...base,
                                fontWeight: "bold",
                                color: "black",
                                backgroundColor: state.isFocused
                                  ? "#e5e7eb"
                                  : "white",
                                fontSize: "1rem",
                                ...(state.isSelected && {
                                  backgroundColor: "#e5e7eb",
                                }),
                              }),
                              menu: (base) => ({
                                ...base,
                                marginTop: "4px",
                                zIndex: 9999,
                                position: "absolute",
                              }),
                              menuPortal: (base) => ({
                                ...base,
                                zIndex: 9999,
                              }),
                            }}
                            openMenuOnClick={true}
                            menuPlacement="auto"
                            menuPortalTarget={document.body}
                          />
                        );
                      })()}
                    </div>

                    {[
                      {
                        id: "weight",
                        placeholder: "බර",
                        fieldRef: refs.weight,
                      },
                      {
                        id: "price_per_kg_grid_item",
                        placeholder: "මිල",
                        fieldRef: refs.price_per_kg_grid_item,
                      },
                      {
                        id: "packs",
                        placeholder: "අසුරුම්",
                        fieldRef: refs.packs,
                      },
                    ].map(({ id, placeholder, fieldRef }) => (
                      <div key={id} style={{ flex: "0.8" }}>
                        <input
                          id={id}
                          ref={fieldRef}
                          name={id}
                          type="text"
                          value={
                            id === "price_per_kg_grid_item"
                              ? state.gridPricePerKg
                              : formData[id]
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (id === "price_per_kg_grid_item") {
                              if (/^\d*\.?\d*$/.test(val) || val === "")
                                handleInputChange(id, val);
                            } else if (/^\d*\.?\d*$/.test(val) || val === "") {
                              handleInputChange(id, val);
                            }
                          }}
                          onKeyDown={(e) => {
                            const blockedKeys = ["e", "E", "+", "-"];
                            if (blockedKeys.includes(e.key)) {
                              e.preventDefault();
                            }
                            handleKeyDown(e, id);
                          }}
                          placeholder={placeholder}
                          className="px-2 py-1 uppercase font-bold border rounded bg-white text-black placeholder-gray-500 text-center"
                          style={{
                            backgroundColor: "white",
                            borderRadius: "0.5rem",
                            textAlign: "right",
                            fontSize: "22px",
                            height: "55px",
                            boxSizing: "border-box",
                            width: "100%",
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <button type="submit" style={{ display: "none" }}></button>
                </form>

                {errors.form && (
                  <div className="mt-6 p-3 bg-red-100 text-red-700 rounded-xl text-lg">
                    {errors.form}
                  </div>
                )}
              </div>

              {/* ✨ SCROLLABLE MAIN TABLE SECTION - NO INTERNAL SCROLL ✨ */}
              <div className="w-full mt-2">
                {displayedSales.length > 0 ? (
                  <div className="w-full">
                    <div style={{ width: "100%", overflowX: "auto" }}>
                      <ActiveBillTable
                        displayedSales={displayedSales}
                        selectedSalesIds={state.selectedSalesIds}
                        toggleSaleSelection={toggleSaleSelection}
                        handleEditClick={handleEditClick}
                        handleRightClick={handleRightClick}
                        handleDeleteRecord={handleDeleteRecord}
                        formatDecimal={formatDecimal}
                      />
                    </div>

                    <ContextMenu
                      show={state.bulkUpdateContextMenu.show}
                      onClose={closeContextMenu}
                      onUpdate={handleBulkUpdateCustomer}
                      selectionCriteria={state.selectionCriteria}
                      selectedCount={state.selectedSalesIds.length}
                    />

                    <div style={{ marginTop: "10px" }}>
                      <SalesSummaryFooter
                        sales={displayedSales}
                        formatDecimal={formatDecimal}
                      />
                    </div>

                    <div className="flex gap-4 items-start w-full mt-4 pb-2">
                      <ItemSummary
                        sales={displayedSales}
                        formatDecimal={formatDecimal}
                      />
                      <BreakdownDisplay
                        sale={selectedSaleForBreakdown}
                        formatDecimal={formatDecimal}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    <AllSalesRecords
                      allSalesRecords={allSalesRecords}
                      isLoadingAllSales={isLoadingAllSales}
                      editingSaleId={editingSaleId}
                      handleEditClick={handleEditClick}
                      formatDecimal={formatDecimal}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div
          className="right-sidebar"
          style={{
            backgroundColor: "#1ec139ff",
            borderRadius: "0.75rem",
            position: "sticky",
            top: "10px",
            height: "calc(100vh - 20px)",
            overflow: "hidden",
          }}
        >
          {hasData ? (
            <CustomerList
              customers={unprintedCustomers}
              type="unprinted"
              searchQuery={searchQueries.unprinted}
              onSearchChange={(value) =>
                updateState({
                  searchQueries: { ...searchQueries, unprinted: value },
                })
              }
              selectedPrintedCustomer={selectedPrintedCustomer}
              selectedUnprintedCustomer={selectedUnprintedCustomer}
              handleCustomerClick={handleCustomerClick}
              formatDecimal={formatDecimal}
              allSales={allSales}
              lastUpdate={state.forceUpdate || state.windowFocused} // ✅ forceUpdate passed
            />
          ) : (
            <div
              className="w-full shadow-xl rounded-xl overflow-y-auto border border-black p-4 text-center"
              style={{ backgroundColor: "#1ec139ff", height: "100%" }}
            >
              <div
                style={{ backgroundColor: "#006400" }}
                className="p-1 rounded-t-xl"
              >
                <h2
                  className="font-bold text-white mb-1 whitespace-nowrap text-center"
                  style={{ fontSize: "14px" }}
                >
                  මුද්‍රණය නොකළ
                </h2>
              </div>
              <div className="py-4">
                <p className="text-gray-700">
                  මුද්‍රණය නොකළ විකුණුම් කිසිවක් සොයාගත නොහැක.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
