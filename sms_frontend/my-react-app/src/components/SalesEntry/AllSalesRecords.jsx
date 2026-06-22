import React from "react";

export default function AllSalesRecords({
  allSalesRecords,
  isLoadingAllSales,
  editingSaleId,
  handleEditClick,
  formatDecimal,
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
          padding: "0 4px",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#888", fontSize: "15px", fontWeight: "bold" }}>
          📋 All Sales Records ({allSalesRecords.length} total)
        </span>
        {isLoadingAllSales && (
          <span style={{ color: "#ffd700", fontSize: "14px" }}>Loading...</span>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          border: "1px solid #4a5568",
          borderRadius: "0.5rem",
          backgroundColor: "#1a1a2e",
          minHeight: 0,
          width: "100%",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            color: "white",
            fontSize: "16px",
            marginTop: "-6px",
            tableLayout: "auto",
          }}
        >
          <thead
            style={{
              position: "sticky",
              top: 0,
              zIndex: 1,
              background: "transparent",
              backdropFilter: "blur(1px)",
            }}
          >
            <tr
              style={{
                backgroundColor: "transparent",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {[
                "Bill No",
                "Customer",
                "Supplier",
                "Item Code",
                "Item Name",
                "Weight",
                "Price/kg",
                "Packs",
                "Kuliya",
                "Nattami",
                "Total",
              ].map((h, i) => (
                <th
                  key={i}
                  style={{
                    padding: "12px 6px",
                    textAlign:
                      h === "Weight" ||
                      h.includes("Price") ||
                      h.includes("Total") ||
                      h === "Packs" ||
                      h === "Kuliya" ||
                      h === "Nattami"
                        ? "right"
                        : "center",
                    fontWeight: "bold",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoadingAllSales ? (
              <tr>
                <td
                  colSpan="11"
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#888",
                  }}
                >
                  Loading sales records...
                </td>
              </tr>
            ) : allSalesRecords.length === 0 ? (
              <tr>
                <td
                  colSpan="11"
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#888",
                    fontStyle: "italic",
                  }}
                >
                  No sales records found in database.
                </td>
              </tr>
            ) : (
              allSalesRecords.map((sale, index) => (
                <tr
                  key={sale.id || index}
                  onClick={() => handleEditClick(sale)}
                  style={{
                    borderBottom: "1px solid #2a2a3e",
                    cursor: "pointer",
                    backgroundColor:
                      editingSaleId === sale.id ? "#1e3a5f" : "transparent",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (editingSaleId !== sale.id)
                      e.currentTarget.style.backgroundColor = "#252540";
                  }}
                  onMouseLeave={(e) => {
                    if (editingSaleId !== sale.id)
                      e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <td style={{ padding: "10px 6px", textAlign: "center" }}>
                    {sale.bill_no || "-"}
                  </td>
                  <td
                    style={{
                      padding: "10px 6px",
                      textAlign: "center",
                      fontWeight: "500",
                    }}
                  >
                    {sale.customer_code || "-"}
                  </td>
                  <td style={{ padding: "10px 6px", textAlign: "center" }}>
                    {sale.supplier_code || "-"}
                  </td>
                  <td style={{ padding: "10px 6px", textAlign: "center" }}>
                    {sale.item_code || "-"}
                  </td>
                  <td
                    style={{
                      padding: "10px 6px",
                      textAlign: "center",
                      maxWidth: "100px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={sale.item_name}
                  >
                    {sale.item_name || "-"}
                  </td>
                  <td style={{ padding: "10px 6px", textAlign: "right" }}>
                    {formatDecimal(sale.weight)}
                  </td>
                  <td style={{ padding: "10px 6px", textAlign: "right" }}>
                    {formatDecimal(sale.price_per_kg)}
                  </td>
                  <td style={{ padding: "10px 6px", textAlign: "right" }}>
                    {sale.packs || "0"}
                  </td>
                  <td
                    style={{
                      padding: "10px 6px",
                      textAlign: "right",
                      color: sale.Kuliya > 0 ? "#ffd700" : "#888",
                    }}
                  >
                    {formatDecimal(sale.Kuliya || 0)}
                  </td>
                  <td
                    style={{
                      padding: "10px 6px",
                      textAlign: "right",
                      color: sale.Nattami > 0 ? "#ff9800" : "#888",
                    }}
                  >
                    {formatDecimal(sale.Nattami || 0)}
                  </td>
                  <td
                    style={{
                      padding: "10px 6px",
                      textAlign: "right",
                      fontWeight: "bold",
                      color: "#4ade80",
                    }}
                  >
                    {formatDecimal(sale.total || 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {allSalesRecords.length > 0 && !isLoadingAllSales && (
        <div
          style={{
            padding: "15px",
            backgroundColor: "#0f0f23",
            borderRadius: "0.5rem",
            display: "flex",
            justifyContent: "space-between",
            marginTop: "6px",
            flexShrink: 0,
            width: "100%",
          }}
        >
          <span style={{ color: "#888", fontSize: "14px" }}>
            Total Records: {allSalesRecords.length}
          </span>
          <span style={{ color: "#888", fontSize: "14px" }}>
            Total Weight:{" "}
            {formatDecimal(
              allSalesRecords.reduce(
                (sum, s) => sum + (parseFloat(s.weight) || 0),
                0,
              ),
            )}{" "}
            kg
          </span>
          <span
            style={{ color: "#4ade80", fontSize: "14px", fontWeight: "bold" }}
          >
            Total Value: Rs.{" "}
            {formatDecimal(
              allSalesRecords.reduce(
                (sum, s) => sum + (parseFloat(s.total) || 0),
                0,
              ),
            )}
          </span>
        </div>
      )}
    </>
  );
}
