import React, { useMemo, useEffect, useState } from "react";

export const BreakdownDisplay = ({ sale, formatDecimal }) => {
  if (!sale?.breakdown_history) return null;
  let history = [];
  try {
    history =
      typeof sale.breakdown_history === "string"
        ? JSON.parse(sale.breakdown_history)
        : sale.breakdown_history;
  } catch (e) {
    return null;
  }
  if (!Array.isArray(history) || history.length < 2) return null;

  return (
    <div
      className="mt-4 p-3 bg-white rounded-lg border-2 border-blue-500 shadow-sm"
      style={{ width: "100%", maxWidth: "450px", margin: "10px auto" }}
    >
      <div style={{ maxHeight: "150px", overflowY: "auto" }}>
        <table
          className="w-full text-sm text-black"
          style={{ marginTop: "-6px" }}
        >
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="text-left py-1">(වේලාව)</th>
              <th className="text-right py-1">(බර)</th>
              <th className="text-right py-1">(මලු)</th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="py-1 text-black">{entry.time}</td>
                <td className="py-1 text-right font-bold text-black">
                  {formatDecimal(Math.abs(parseFloat(entry.weight) || 0))} kg
                </td>
                <td className="py-1 text-right font-bold text-black">
                  {Math.abs(parseInt(entry.packs) || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 pt-1 border-t-2 border-blue-200 text-right font-black text-lg text-black">
        Total: {formatDecimal(Math.abs(parseFloat(sale.weight) || 0))}kg /{" "}
        {Math.abs(parseInt(sale.packs) || 0)}p
      </div>
    </div>
  );
};

export const ItemSummary = ({ sales, formatDecimal }) => {
  const formatWeight = (value) => {
    if (!value) return "0";
    const num = parseFloat(value);
    return num % 1 === 0 ? num.toString() : num.toFixed(1);
  };
  const formatPacks = (value) => {
    if (!value) return "0";
    return parseInt(value).toString();
  };

  const summary = useMemo(() => {
    const result = {};
    sales.forEach((sale) => {
      const itemName = sale.item_name || "Unknown";
      if (!result[itemName])
        result[itemName] = { totalWeight: 0, totalPacks: 0 };
      result[itemName].totalWeight += Math.abs(parseFloat(sale.weight) || 0);
      result[itemName].totalPacks += Math.abs(parseInt(sale.packs) || 0);
    });
    return result;
  }, [sales]);

  if (Object.keys(summary).length === 0) return null;
  const items = Object.entries(summary);
  const rows = [];
  for (let i = 0; i < items.length; i += 3) {
    rows.push(items.slice(i, i + 3));
  }

  return (
    <div
      style={{
        width: "100%",
        backgroundColor: "#ffffff",
        color: "#000000",
        fontFamily: "'Segoe UI', Tahoma",
        marginTop: "10px",
        borderRadius: "8px",
        padding: "10px",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "20px", fontWeight: "900" }}>
          Item Summary
        </span>
      </div>
      {rows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "5px",
            backgroundColor: "#ffffff",
          }}
        >
          {row.map(([itemName, data]) => (
            <div key={itemName} style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "block",
                }}
              >
                {itemName}: {formatWeight(data.totalWeight)}kg/
                {formatPacks(data.totalPacks)}p
              </span>
            </div>
          ))}
          {row.length < 3 &&
            Array.from({ length: 3 - row.length }).map((_, idx) => (
              <div key={idx} style={{ flex: 1 }} />
            ))}
        </div>
      ))}
    </div>
  );
};

export const SalesSummaryFooter = ({ sales, formatDecimal }) => {
  const totals = useMemo(() => {
    return sales.reduce(
      (acc, s) => {
        const weight = Math.abs(parseFloat(s.weight) || 0);
        const price = Math.abs(parseFloat(s.price_per_kg) || 0);
        const packs = Math.abs(parseFloat(s.packs) || 0);
        const packCost = Math.abs(parseFloat(s.CustomerPackCost) || 0);
        const packLabour = Math.abs(parseFloat(s.CustomerPackLabour) || 0);
        acc.billTotal += weight * price;
        acc.totalBagPrice += packs * packCost;
        acc.totalLabour += packs * packLabour;
        return acc;
      },
      { billTotal: 0, totalBagPrice: 0, totalLabour: 0 },
    );
  }, [sales]);

  const finalPayable = totals.billTotal + totals.totalBagPrice;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        backgroundColor: "#111827",
        border: "2px solid #3b82f6",
        borderRadius: "0.75rem",
        padding: "15px 30px",
        marginTop: "15px",
        color: "white",
        fontSize: "20px",
        fontWeight: "bold",
        whiteSpace: "nowrap",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
      }}
    >
      <div>
        <span style={{ color: "#9ca3af", marginRight: "8px" }}>එකතුව:</span>
        {formatDecimal(totals.billTotal)}
      </div>
      <div>
        <span style={{ color: "#9ca3af", marginRight: "8px" }}>බෑග් මිල:</span>
        {formatDecimal(totals.totalBagPrice)}
      </div>
      <div>
        <span style={{ color: "#9ca3af", marginRight: "8px" }}>කාම්කරු:</span>0
      </div>
      <div>
        <span style={{ color: "#9ca3af", marginRight: "8px" }}>ගෙවිය:</span>
        <span style={{ color: "#facc15", fontSize: "26px" }}>
          {formatDecimal(finalPayable)}
        </span>
      </div>
    </div>
  );
};

export const ContextMenu = React.memo(
  ({ show, onClose, onUpdate, selectionCriteria, selectedCount }) => {
    const [localCustomerCode, setLocalCustomerCode] = useState("");

    useEffect(() => {
      if (show) setLocalCustomerCode("");
    }, [show]);

    if (!show) return null;

    return (
      <>
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
          }}
          onClick={onClose}
        />
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            zIndex: 10000,
            width: "90%",
            maxWidth: "450px",
            overflow: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              padding: "12px 20px",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              color: "white",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  background: "rgba(255, 255, 255, 0.2)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
              >
                ⚡
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>
                  Bulk Update Customer
                </h2>
                <p
                  style={{
                    margin: "2px 0 0 0",
                    fontSize: "11px",
                    opacity: 0.9,
                  }}
                >
                  Update multiple customer codes at once
                </p>
              </div>
            </div>
          </div>
          <div style={{ padding: "16px 20px" }}>
            {selectionCriteria && (
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  marginBottom: "16px",
                  border: "1px solid #fbbf24",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "14px" }}>📋</span>
                  <span
                    style={{
                      fontWeight: "bold",
                      fontSize: "11px",
                      color: "#92400e",
                      textTransform: "uppercase",
                    }}
                  >
                    Current Selection
                  </span>
                </div>
                <div style={{ display: "grid", gap: "6px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 8px",
                      background: "white",
                      borderRadius: "6px",
                    }}
                  >
                    <span style={{ fontSize: "11px", color: "#78350f" }}>
                      Customer:
                    </span>
                    <span
                      style={{
                        fontWeight: "bold",
                        fontSize: "12px",
                        color: "#92400e",
                        fontFamily: "monospace",
                      }}
                    >
                      {selectionCriteria.customer_code}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 8px",
                      background: "white",
                      borderRadius: "6px",
                    }}
                  >
                    <span style={{ fontSize: "11px", color: "#78350f" }}>
                      Item:
                    </span>
                    <span
                      style={{
                        fontWeight: "bold",
                        fontSize: "12px",
                        color: "#92400e",
                        fontFamily: "monospace",
                      }}
                    >
                      {selectionCriteria.item_code}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 8px",
                      background: "#10b981",
                      borderRadius: "6px",
                      color: "white",
                    }}
                  >
                    <span style={{ fontSize: "11px" }}>Selected:</span>
                    <span style={{ fontWeight: "bold", fontSize: "14px" }}>
                      {selectedCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: "600",
                  fontSize: "12px",
                  color: "#374151",
                }}
              >
                ✏️ New Customer Code
              </label>
              <input
                type="text"
                value={localCustomerCode}
                onChange={(e) =>
                  setLocalCustomerCode(e.target.value.toUpperCase())
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onUpdate(localCustomerCode.trim().toUpperCase());
                    setLocalCustomerCode("");
                  }
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: "500",
                  boxSizing: "border-box",
                  fontFamily: "monospace",
                }}
                autoFocus
                placeholder="e.g., CUST001"
              />
            </div>
            <button
              onClick={() => {
                onUpdate(localCustomerCode.trim().toUpperCase());
                setLocalCustomerCode("");
              }}
              style={{
                width: "100%",
                padding: "12px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px",
                marginBottom: "0",
              }}
            >
              🚀 Update {selectedCount || 0} Record
              {selectedCount !== 1 ? "s" : ""}
            </button>
          </div>
          <div
            style={{
              padding: "12px 20px",
              background: "#f9fafb",
              borderBottomLeftRadius: "16px",
              borderBottomRightRadius: "16px",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              onClick={() => {
                setLocalCustomerCode("");
                onClose();
              }}
              style={{
                padding: "6px 16px",
                background: "transparent",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                color: "#6b7280",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              Cancel (ESC)
            </button>
          </div>
        </div>
      </>
    );
  },
);
