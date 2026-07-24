import React, { useState, useEffect } from "react";
import api from "../../api";
import toast from "react-hot-toast";

const DayProcessModal = ({ isOpen, onClose }) => {
  const getTodayDate = () => new Date().toISOString().split("T")[0];

  const [processDate, setProcessDate] = useState(getTodayDate());
  const [isLoading, setIsLoading] = useState(false);
  const [billData, setBillData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Reset date whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setProcessDate(getTodayDate());
    }
  }, [isOpen]);

  // Fetch bill data to show in the table
  useEffect(() => {
    const fetchBillData = async () => {
      if (!isOpen) return;
      setIsLoadingData(true);
      try {
        // 1. Fetch all currently printed bills
        const summaryRes = await api.get("/suppliers/bill-status-summary");
        const printedBills = summaryRes.data.printed || [];

        // 2. Fetch lorry transactions
        const lorryRes = await api.get("/lorry-transactions");
        const allLorry = lorryRes.data || [];

        // 3. Fetch details for each printed bill to calculate the exact 'මෙම බිලට ඉතිරි' amount
        const detailedBills = await Promise.all(
          printedBills.map(async (bill) => {
            try {
              const detailsRes = await api.get(
                `/suppliers/bill/${bill.supplier_bill_no}/details`,
              );
              const details = detailsRes.data || [];

              let tSupplierSales = 0;
              let tPackCost = 0;

              details.forEach((record) => {
                const weight = Math.abs(parseFloat(record.weight) || 0);
                const price = Math.abs(parseFloat(record.price_per_kg) || 0);
                const packs = Math.abs(parseInt(record.packs) || 0);
                const packUnitCost = Math.abs(
                  parseFloat(record.CustomerPackCost) || 0,
                );

                tSupplierSales += weight * price;
                tPackCost += packs * packUnitCost;
              });

              const tComm = tSupplierSales * 0.1;

              // Lorry deduction for this supplier
              let lAmount = 0,
                nAmount = 0,
                bCost = 0;
              const supplierLorry = allLorry.filter(
                (t) => t.customer_code === bill.supplier_code,
              );

              supplierLorry.forEach((t) => {
                lAmount += Math.abs(parseFloat(t.lorry_amount) || 0);
                nAmount += Math.abs(parseFloat(t.nattami) || 0);
                const q = Math.abs(parseFloat(t.total_amount) || 0);

                let rate = 0;
                const bType = (t.box_type || "").trim().toUpperCase();
                if (["BAG", "CARD", "TK"].includes(bType)) rate = 40;
                else if (["LEEP", "TAKB"].includes(bType)) rate = 30;
                else if (bType === "TL") rate = 50;

                bCost += q * rate;
              });

              const totalLorryDeduction = lAmount + nAmount + bCost;

              // මෙම බිලට ඉතිරි (Exact Payable Amount matching the Supplier Report)
              const payableAmount =
                tSupplierSales + tPackCost - tComm - totalLorryDeduction;

              return {
                supplier_code: bill.supplier_code,
                bill_no: bill.supplier_bill_no,
                printed: "Y",
                payableAmount: payableAmount,
              };
            } catch (e) {
              return {
                supplier_code: bill.supplier_code,
                bill_no: bill.supplier_bill_no,
                printed: "Y",
                payableAmount: 0,
              };
            }
          }),
        );

        setBillData(detailedBills);
      } catch (error) {
        console.error("Error fetching bill data", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchBillData();
  }, [isOpen]);

  const handleProcess = async () => {
    if (!processDate) {
      toast.error("Please select a date to process.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to move all sales data for ${processDate} to history? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/sales/process-day", {
        date: processDate,
      });

      if (response.data.success) {
        toast.success(
          response.data.message ||
            `Day process completed successfully for ${processDate}!`,
        );

        onClose();
        window.location.href = "/vts_sales_frontend/#/login";
      } else {
        toast.error(
          response.data.message ||
            "An unknown error occurred during day process.",
        );
      }
    } catch (error) {
      console.error("Day Process Error:", error);
      const errorMessage =
        error.response?.data?.message ||
        `Failed to process day for ${processDate}. Check console for details.`;
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (value) =>
    (parseFloat(value) || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1050 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content shadow-lg border-0 rounded-3">
          <div className="modal-header bg-success text-white border-0">
            <h5 className="modal-title fw-bold">
              <i className="material-icons align-middle me-2">
                event_available
              </i>
              Day Process (දින අවසාන කිරීම)
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              disabled={isLoading}
            ></button>
          </div>

          <div className="modal-body p-4 bg-light">
            <div className="d-flex align-items-center justify-content-end gap-2 mb-4">
              <label
                htmlFor="processDate"
                className="form-label fw-bold mb-0 text-nowrap text-success"
              >
                වැඩ පටන් ගන්නා දිනය :
              </label>
              <input
                type="date"
                className="form-control fw-bold border-success"
                id="processDate"
                value={processDate}
                onChange={(e) => setProcessDate(e.target.value)}
                disabled={isLoading}
                style={{ width: "160px" }}
              />
            </div>

            {/* Modern Table matching the new system UI */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom-0 pb-0">
                <h6 className="fw-bold text-dark mb-2">
                  අද දිනට අදාල මුද්‍රිත බිල්පත් තොරතුරු
                </h6>
              </div>
              <div className="card-body p-0">
                <div
                  className="table-responsive"
                  style={{ maxHeight: "300px", overflowY: "auto" }}
                >
                  <table className="table table-hover table-bordered table-sm mb-0 align-middle">
                    <thead
                      className="bg-dark text-white"
                      style={{ position: "sticky", top: 0, zIndex: 1 }}
                    >
                      <tr>
                        <th
                          className="text-center text-white border-secondary"
                          style={{ width: "15%" }}
                        >
                          ගොවියා
                        </th>
                        <th
                          className="text-end text-white border-secondary"
                          style={{ width: "40%" }}
                        >
                          ගොවියන්ගෙන් ගැනීම (Payable)
                        </th>
                        <th
                          className="text-center text-white border-secondary"
                          style={{ width: "15%" }}
                        >
                          Print
                        </th>
                        <th
                          className="text-center text-white border-secondary"
                          style={{ width: "30%" }}
                        >
                          බිල් අංකය
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingData ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="text-center py-4 text-muted fw-bold"
                          >
                            <span
                              className="spinner-border spinner-border-sm me-2"
                              role="status"
                              aria-hidden="true"
                            ></span>
                            දත්ත ලබා ගනිමින් පවතී...
                          </td>
                        </tr>
                      ) : billData.length > 0 ? (
                        billData.map((bill, index) => (
                          <tr key={index}>
                            <td className="text-center fw-bold text-primary">
                              {bill.supplier_code}
                            </td>
                            <td className="text-end fw-bold text-danger">
                              Rs {formatCurrency(bill.payableAmount)}
                            </td>
                            <td className="text-center fw-bold text-success">
                              {bill.printed}
                            </td>
                            <td className="text-center fw-bold">
                              {bill.bill_no}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="4"
                            className="text-center py-4 text-muted"
                          >
                            අද දිනට මුද්‍රණය කළ බිල්පත් නොමැත.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer bg-white border-top-0 pt-0">
            <button
              type="button"
              className="btn btn-secondary fw-bold px-4"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-success fw-bold px-4 shadow-sm"
              onClick={handleProcess}
              disabled={isLoading || isLoadingData}
            >
              {isLoading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Processing...
                </>
              ) : (
                <>
                  <i className="material-icons align-middle me-1">done_all</i>
                  Confirm Process
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayProcessModal;
