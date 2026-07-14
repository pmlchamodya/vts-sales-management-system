import React from "react";

export default function ActiveBillTable({
  displayedSales,
  selectedSalesIds,
  toggleSaleSelection,
  handleEditClick,
  handleRightClick,
  handleDeleteRecord,
  formatDecimal,
}) {
  return (
    <table
      className="min-w-full border-gray-200 rounded-xl"
      style={{
        backgroundColor: "#000000",
        color: "white",
        borderCollapse: "collapse",
        margin: "0px 0",
        width: "100%",
        fontSize: "16px",
        tableLayout: "auto",
      }}
    >
      <thead>
        <tr style={{ backgroundColor: "#000000" }}>
          <th
            className="border text-center"
            style={{
              backgroundColor: "#f5fafb",
              color: "#000000",
              width: "30px",
              padding: "12px 6px",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          ></th>
          {[
            "Sup code",
            "කේතය",
            "අයිතමය",
            "බර(kg)",
            "මිල",
            "අගය",
            "මලු",
            "කුලිය",
            "නාට්ටාමි",
            "Actions",
          ].map((header, index) => (
            <th
              key={index}
              className="border text-center"
              style={{
                backgroundColor: "#f5fafb",
                color: "#000000",
                whiteSpace: "nowrap",
                fontWeight: "bold",
                padding: "12px 6px",
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {displayedSales.map((s, idx) => {
          const isSelected = selectedSalesIds.includes(s.id);
          return (
            <tr
              key={idx}
              tabIndex={0}
              className={`text-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSelected ? "bg-blue-900" : ""}`}
              onClick={() => handleEditClick(s)}
              onContextMenu={(e) => handleRightClick(e, s)}
              style={{
                backgroundColor: isSelected ? "#1e40af" : "transparent",
              }}
            >
              <td
                className="border text-center"
                style={{ padding: "10px 6px" }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSaleSelection(s.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    cursor: "pointer",
                    width: "18px",
                    height: "18px",
                  }}
                />
              </td>
              <td className="border" style={{ padding: "10px 6px" }}>
                {s.supplier_code}
              </td>
              <td className="border" style={{ padding: "10px 6px" }}>
                {s.item_code}
              </td>
              <td className="border" style={{ padding: "10px 6px" }}>
                {s.item_name}
              </td>
              <td
                className="border text-right pr-3"
                style={{ padding: "10px 6px" }}
              >
                {formatDecimal(Math.abs(parseFloat(s.weight) || 0))}
              </td>
              <td
                className="border text-right pr-3"
                style={{ padding: "10px 6px" }}
              >
                {formatDecimal(Math.abs(parseFloat(s.price_per_kg) || 0))}
              </td>
              <td
                className="border text-right pr-3"
                style={{ padding: "10px 6px" }}
              >
                {formatDecimal(
                  Math.abs(parseFloat(s.weight) || 0) *
                    Math.abs(parseFloat(s.price_per_kg) || 0),
                )}
              </td>
              <td
                className="border text-center"
                style={{ padding: "10px 6px" }}
              >
                {Math.abs(parseInt(s.packs) || 0)}
              </td>
              <td
                className="border text-red-500 font-bold text-right pr-3"
                style={{ padding: "10px 6px" }}
              >
                {formatDecimal(Math.abs(parseFloat(s.Kuliya) || 0))}
              </td>
              <td
                className="border text-orange-500 font-bold text-right pr-3"
                style={{ padding: "10px 6px" }}
              >
                {formatDecimal(Math.abs(parseFloat(s.Nattami) || 0))}
              </td>
              <td
                className="border text-center"
                style={{ padding: "10px 6px", width: "70px" }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRecord(s.id);
                  }}
                  className="text-black font-bold py-1 px-2 rounded-md bg-white hover:bg-red-500 hover:text-white transition-colors"
                  style={{ minWidth: "40px", fontSize: "16px" }}
                >
                  🗑️
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
