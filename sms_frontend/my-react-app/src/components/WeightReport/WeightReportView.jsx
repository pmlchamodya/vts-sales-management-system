import React, { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import api from "../../api";

const WeightReportView = ({ reportData, onClose }) => {
  const printRef = useRef();
  const [isClient, setIsClient] = useState(false);
  // ✅ පරණ සිස්ටම් එකේ වගේම Company Name එක
  const [companyName, setCompanyName] = useState("නිමල් අත්තනායක(පුද්) සමාගම");
  const [currentDate, setCurrentDate] = useState("N/A");

  const { sales, filters } = reportData;

  useEffect(() => {
    setIsClient(true);
    setCurrentDate(new Date().toLocaleDateString());
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");
        if (response.data) {
          // Date එක විතරක් ගන්නවා Company name එක වෙනස් වෙන එක නවත්තන්න
          setCurrentDate(
            response.data.value || new Date().toLocaleDateString(),
          );
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  // ================= AGGREGATE BY ITEM (අයිතම අනුව එකතු කිරීම) =================
  const aggregatedSalesMap = {};
  sales.forEach((sale) => {
    const code = sale.item_code || "-";
    if (!aggregatedSalesMap[code]) {
      aggregatedSalesMap[code] = {
        item_code: code,
        item_name: sale.item_name || "-",
        weight: 0,
        packs: 0,
      };
    }
    aggregatedSalesMap[code].weight += Number(sale.weight) || 0;
    aggregatedSalesMap[code].packs += Number(sale.packs) || 0;
  });

  // Code එකේ අනුපිළිවෙලට Sort කිරීම
  const aggregatedSales = Object.values(aggregatedSalesMap).sort((a, b) =>
    a.item_code.localeCompare(b.item_code),
  );

  // ================= TOTAL CALCULATIONS (යටින් එන මුළු එකතුව) =================
  const totals = aggregatedSales.reduce(
    (acc, sale) => {
      acc.total_packs += sale.packs;
      acc.total_weight += sale.weight;
      return acc;
    },
    { total_packs: 0, total_weight: 0 },
  );

  // ================= PRINT =================
  const handlePrint = () => {
    if (!isClient) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return alert("Please allow popups");

    const printContent = printRef.current.innerHTML;
    printWindow.document.write(`
            <html>
            <head>
                <title>Weight Report</title>
                <style>
                    /* ✅ පරණ සිස්ටම් එකේ වගේම Print වෙන්න හදපු CSS */
                    body { font-family: Arial, sans-serif; color: black !important; padding: 20px; }
                    .no-print, .btn, .filters { display: none !important; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; color: black !important; }
                    th, td { border: 1px solid #000 !important; padding: 8px; text-align: center; color: black !important; font-size: 15px; }
                    th { background-color: white !important; font-weight: bold; }
                    .totals-row td { 
                        font-weight: bold; 
                        border-top: 2px solid black !important; 
                        border-bottom: 4px double black !important; 
                    }
                    .totals-empty { border: none !important; }
                </style>
            </head>
            <body>${printContent}</body>
            </html>
        `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  // ================= EXCEL EXPORT =================
  const handleExcel = () => {
    const data = [["කේ නාම", "වර්ගය", "කිලෝ", "මලු"]];

    aggregatedSales.forEach((s) => {
      data.push([
        s.item_code,
        s.item_name,
        Number(s.weight).toFixed(2),
        s.packs,
      ]);
    });

    data.push([
      "",
      "",
      Number(totals.total_weight).toFixed(2),
      totals.total_packs,
    ]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weight Report");
    XLSX.writeFile(wb, `Weight_Report_${currentDate}.xlsx`);
  };

  return (
    <div className="report-container p-4 bg-light rounded shadow-sm">
      <div className="d-flex justify-content-between mb-3 no-print">
        <div>
          <button
            className="btn btn-success btn-sm me-2 fw-bold"
            onClick={handleExcel}
          >
            📊 Excel
          </button>
          <button
            className="btn btn-primary btn-sm me-2 fw-bold"
            onClick={handlePrint}
          >
            📄 PDF / Print
          </button>
          <button
            className="btn btn-info btn-sm me-2 fw-bold"
            onClick={() => window.print()}
          >
            🖨️ Quick Print
          </button>
        </div>
        <button className="btn btn-secondary btn-sm fw-bold" onClick={onClose}>
          Close
        </button>
      </div>

      {/* Print Area */}
      <div
        ref={printRef}
        style={{ background: "white", padding: "20px", color: "black" }}
      >
        {/* Header matches screenshot exactly */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "10px",
          }}
        >
          <div>
            <h2
              style={{
                fontWeight: "bold",
                margin: 0,
                fontSize: "26px",
                color: "black",
              }}
            >
              {companyName}
            </h2>
            <h4
              style={{
                margin: "5px 0 0 0",
                fontSize: "20px",
                color: "black",
                fontWeight: "normal",
              }}
            >
              විකුණන ලද භාණ්ඩ වල මුළු කිලෝ ගණන එකතුවක් ලෙස
            </h4>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "16px", margin: 0, color: "black" }}>
              දිනය : {currentDate}
            </p>
          </div>
        </div>

        {(filters.start_date || filters.end_date) && (
          <div
            className="filters"
            style={{ marginBottom: "15px", fontSize: "14px", color: "black" }}
          >
            <strong>දින පරාසය:</strong>
            {filters.start_date && ` ${filters.start_date}`}
            {filters.end_date && ` සිට ${filters.end_date} දක්වා`}
          </div>
        )}

        <div className="table-responsive">
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "10px",
              color: "black",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    border: "1px solid black",
                    padding: "10px",
                    textAlign: "left",
                    fontWeight: "bold",
                  }}
                >
                  කේ නාම
                </th>
                <th
                  style={{
                    border: "1px solid black",
                    padding: "10px",
                    textAlign: "left",
                    fontWeight: "bold",
                  }}
                >
                  වර්ගය
                </th>
                <th
                  style={{
                    border: "1px solid black",
                    padding: "10px",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  කිලෝ
                </th>
                <th
                  style={{
                    border: "1px solid black",
                    padding: "10px",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  මලු
                </th>
              </tr>
            </thead>
            <tbody>
              {aggregatedSales.map((sale, i) => (
                <tr key={i}>
                  <td
                    style={{
                      border: "1px solid black",
                      padding: "10px",
                      textAlign: "left",
                    }}
                  >
                    {sale.item_code}
                  </td>
                  <td
                    style={{
                      border: "1px solid black",
                      padding: "10px",
                      textAlign: "left",
                    }}
                  >
                    {sale.item_name}
                  </td>
                  <td
                    style={{
                      border: "1px solid black",
                      padding: "10px",
                      textAlign: "center",
                    }}
                  >
                    {Number(sale.weight).toFixed(2)}
                  </td>
                  <td
                    style={{
                      border: "1px solid black",
                      padding: "10px",
                      textAlign: "center",
                    }}
                  >
                    {sale.packs}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td
                  colSpan="2"
                  className="totals-empty"
                  style={{ border: "none" }}
                ></td>
                <td
                  style={{
                    borderTop: "2px solid black",
                    borderBottom: "4px double black",
                    padding: "10px",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  {Number(totals.total_weight).toFixed(2)}
                </td>
                <td
                  style={{
                    borderTop: "2px solid black",
                    borderBottom: "4px double black",
                    padding: "10px",
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  {totals.total_packs}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Web View Print Styles Fallback */}
      <style jsx>{`
        @media print {
          .btn,
          .no-print,
          .filters {
            display: none !important;
          }
          .report-container {
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default WeightReportView;
