import React, { useRef, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import api from "../../api"; // axios instance

const ItemReportView = ({ reportData, onClose }) => {
  const printRef = useRef();
  const [isClient, setIsClient] = useState(false);
  // ✅ ප්‍රධාන නම (Company Name) ඔයා ඉල්ලපු විදියටම හැදුවා
  const [companyName, setCompanyName] = useState("නිමල් අත්තනායක(පුද්) සමාගම");
  const [reportDate, setReportDate] = useState("N/A");

  const { sales, filters } = reportData;

  useEffect(() => setIsClient(true), []);

  // Fetch settings from backend
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");
        if (response.data) {
          setReportDate(response.data.value || new Date().toLocaleDateString());
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        setReportDate(new Date().toLocaleDateString());
      }
    };
    fetchSettings();
  }, []);

  // Total Calculation
  const totals = sales.reduce(
    (acc, sale) => {
      acc.total_packs += Number(sale.packs) || 0;
      acc.total_weight += Number(sale.weight) || 0;
      acc.total_amount += Number(sale.total) || 0;
      return acc;
    },
    { total_packs: 0, total_weight: 0, total_amount: 0 },
  );

  const handlePrint = () => {
    if (!isClient) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return alert("Please allow popups for printing");
    const printContent = printRef.current.innerHTML;
    printWindow.document.write(`
            <html>
            <head>
                <title>Item-wise Report</title>
                <style>
                    /* ✅ පරණ සිස්ටම් එකේ වගේම Print වෙන්න හදපු CSS */
                    body { font-family: Arial, sans-serif; color: black !important; }
                    .btn, .filters { display: none !important; }
                    .card { box-shadow: none !important; border: none !important; padding: 0 !important; background: white !important;}
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; color: black !important; }
                    th, td { border: 1px solid #000 !important; padding: 8px; text-align: center; color: black !important; font-size: 14px; }
                    .table-dark th { background-color: white !important; color: black !important; border-bottom: 2px solid black !important; border-top: 2px solid black !important; }
                    .report-header { background: white !important; color: black !important; padding: 0 !important; box-shadow: none !important; border-bottom: 2px solid black; margin-bottom: 20px;}
                    .report-header h2, .report-header h4, .report-header p { color: black !important; }
                    .totals-row td { font-weight: bold; border-top: 2px solid black !important; border-bottom: 2px solid black !important; }
                </style>
            </head>
            <body>${printContent}</body>
            </html>
        `);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  // ✅ Excel Download එකටත් අලුත් තීරු (Columns) ටික එකතු කළා
  const handleExportExcel = () => {
    const excelData = [];
    excelData.push([
      "බිල් අංකය",
      "වර්ගය",
      "මලු",
      "කිලෝ",
      "බැගින්",
      "වටිනාකම",
      "ගැණුම්කරු",
      "අයිතිකරු",
    ]);

    sales.forEach((sale) => {
      excelData.push([
        sale.bill_no,
        sale.item_name,
        Number(sale.packs),
        Number(sale.weight).toFixed(2),
        Number(sale.price_per_kg).toFixed(2),
        Number(sale.total).toFixed(2),
        sale.customer_code,
        sale.supplier_code,
      ]);
    });

    excelData.push([
      "", // බිල් අංකය හිස්
      "මුළු එකතුව:", // වර්ගය තීරුවේ 'මුළු එකතුව' පෙන්වයි
      totals.total_packs,
      totals.total_weight.toFixed(2),
      "", // බැගින් හිස්
      totals.total_amount.toFixed(2),
      "", // ගැණුම්කරු හිස්
      "", // අයිතිකරු හිස්
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Item-wise Report");
    XLSX.writeFile(workbook, `Item_Report_${reportDate}.xlsx`);
  };

  return (
    <div
      ref={printRef}
      className="card shadow-sm border-0 rounded-3 p-4"
      style={{ backgroundColor: "#f0f4f8" }}
    >
      {/* Header */}
      <div
        className="report-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "20px",
          background: "linear-gradient(90deg, #004d00, #007700)",
          color: "white",
          padding: "15px 20px",
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div>
          <h2 style={{ fontWeight: "700", margin: 0, fontSize: "26px" }}>
            {companyName}
          </h2>
          {/* ✅ පරණ සිස්ටම් එකේ වගේම "[අයිතමය] වල සම්පූර්ණ විකුණුම් සටහන" */}
          <h4
            style={{
              margin: "5px 0 0 0",
              fontSize: "18px",
              fontWeight: "normal",
            }}
          >
            {sales.length > 0
              ? `${sales[0].item_name} වල සම්පූර්ණ විකුණුම් සටහන`
              : "අයිතමය අනුව වාර්තාව"}
          </h4>
          {sales.length > 0 && (
            <div
              style={{ marginTop: "5px", fontSize: "15px", fontWeight: "bold" }}
            >
              දුර: {sales[0].item_code}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: "16px", margin: 0, fontWeight: "bold" }}>
            දිනය : {reportDate}
          </p>
        </div>
      </div>

      {(filters.start_date || filters.end_date) && (
        <div
          className="filters"
          style={{ marginBottom: "15px", fontSize: "0.95rem" }}
        >
          <strong>දින පරාසය:</strong>
          {filters.start_date && ` ${filters.start_date}`}
          {filters.end_date && ` සිට ${filters.end_date} දක්වා`}
        </div>
      )}

      {/* ✅ FIXED: Added Quick Print button back */}
      <div className="d-flex justify-content-between mb-3">
        <div>
          <button
            className="btn btn-success btn-sm me-2 fw-bold"
            onClick={handleExportExcel}
          >
            📊 Excel
          </button>
          <button
            className="btn btn-primary btn-sm me-2 fw-bold"
            onClick={handlePrint}
          >
            📄 PDF
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

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="table table-bordered table-striped table-sm text-center align-middle">
          <thead
            className="table-dark"
            style={{ backgroundColor: "#343a40", color: "white" }}
          >
            <tr>
              {/* ✅ පරණ සිස්ටම් එකේ තීරු අනුපිළිවෙල හරියටම හැදුවා */}
              <th className="py-2">බිල් අංකය</th>
              <th className="py-2">වර්ගය</th>
              <th className="py-2">මලු</th>
              <th className="py-2">කිලෝ</th>
              <th className="py-2">බැගින්</th>
              <th className="py-2">වටිනාකම</th>
              <th className="py-2">ගැණුම්කරු</th>
              <th className="py-2">අයිතිකරු</th>
            </tr>
          </thead>

          <tbody style={{ fontSize: "15px" }}>
            {sales.map((sale, idx) => (
              <tr key={idx}>
                <td>{sale.bill_no}</td>
                <td>{sale.item_name}</td>
                <td className="text-end fw-bold">{Number(sale.packs)}</td>
                <td className="text-end fw-bold">
                  {Number(sale.weight).toFixed(2)}
                </td>
                <td className="text-end">
                  {Number(sale.price_per_kg).toFixed(2)}
                </td>
                <td className="text-end fw-bold">
                  {Number(sale.total).toFixed(2)}
                </td>
                <td>{sale.customer_code}</td>
                <td>{sale.supplier_code}</td>
              </tr>
            ))}
          </tbody>

          {/* ✅ මුළු එකතුව (Totals) පරණ විදියටම හැදුවා */}
          <tfoot>
            <tr
              className="totals-row"
              style={{
                fontWeight: "bold",
                backgroundColor: "#e6ffe6",
                fontSize: "16px",
              }}
            >
              <td></td>
              <td className="text-end">මුළු එකතුව:</td>
              <td className="text-end">{totals.total_packs}</td>
              <td className="text-end">{totals.total_weight.toFixed(2)}</td>
              <td></td>
              <td className="text-end">{totals.total_amount.toFixed(2)}</td>
              <td colSpan="2"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Web View Print Styles Fallback */}
      <style jsx>{`
        @media print {
          .btn {
            display: none !important;
          }
          .card {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            background: white !important;
          }
          .report-header {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-bottom: 2px solid black;
            margin-bottom: 20px;
          }
          .report-header h2,
          .report-header h4,
          .report-header div,
          .report-header p {
            color: black !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            color: black !important;
          }
          th,
          td {
            border: 1px solid #000 !important;
            padding: 8px;
            text-align: center;
            color: black !important;
            font-size: 14px;
          }
          .table-dark th {
            background-color: white !important;
            color: black !important;
            border-bottom: 2px solid black !important;
            border-top: 2px solid black !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ItemReportView;
