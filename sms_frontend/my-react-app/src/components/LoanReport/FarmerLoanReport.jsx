import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import api from "../../api";

const FarmerLoanReport = () => {
  const [reportData, setReportData] = useState([]);
  const [totals, setTotals] = useState({ receivable: 0, payable: 0 });
  // Set default company name
  const [companyName, setCompanyName] = useState("මහතුන් වෙළඳසැල");
  const [settingDate, setSettingDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      // Fetching report data from the backend API
      const response = await api.get("/reports/farmer-loan-payable");
      const data = response.data;

      setReportData(data.data || []);
      setTotals({
        receivable: data.totalReceivable || 0,
        payable: data.totalPayable || 0,
      });

      // Override 'Default Company' or 'Company' with the actual shop name
      const fetchedCompanyName = data.companyName;
      if (
        fetchedCompanyName &&
        fetchedCompanyName !== "Default Company" &&
        fetchedCompanyName !== "Company"
      ) {
        setCompanyName(fetchedCompanyName);
      } else {
        setCompanyName("මහතුන් වෙළඳසැල");
      }

      setSettingDate(data.filterDate || new Date().toISOString().split("T")[0]);
    } catch (error) {
      console.error("❌ Error fetching farmer loan report:", error);
      alert(
        "Error loading report: " +
          (error.response?.data?.message || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/vts_sales_frontend/login";
  };

  // EXCEL EXPORT FUNCTION
  const handleExportExcel = () => {
    const excelData = [
      [
        "ගොවියාගේ නම (Farmer Name)",
        "ලැබිය යුතු (Receivable Rs)",
        "ගෙවිය යුතු (Payable Rs)",
      ],
    ];

    reportData.forEach((row) => {
      excelData.push([
        `${row.code} - ${row.name}`,
        row.receivable > 0 ? Number(row.receivable).toFixed(2) : "-",
        row.payable > 0 ? Number(row.payable).toFixed(2) : "-",
      ]);
    });

    excelData.push([
      "අවසන් එකතුව (GRAND TOTAL)",
      Number(totals.receivable).toFixed(2),
      Number(totals.payable).toFixed(2),
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Farmer_Receivable_Payable",
    );
    XLSX.writeFile(workbook, `Farmer_Loan_Report_${settingDate}.xlsx`);
  };

  // PDF PRINT FUNCTION (Matches Old System Print Preview exactly)
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return alert("Please allow popups for printing");

    const printContent = `
            <html>
            <head>
                <title>Farmer Loan Report</title>
                <style>
                    body { font-family: 'Arial', sans-serif; font-size: 13px; margin: 40px; color: black; }
                    .header-section { margin-bottom: 20px; }
                    .company-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
                    .report-title { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 5px;}
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { padding: 6px 0; text-align: left; border-bottom: 1px solid #000; }
                    th { font-weight: bold; }
                    .text-end { text-align: right; }
                    .text-center { text-align: center; }
                    .footer-row th { border-top: 2px solid #000; border-bottom: 4px double #000; font-size: 14px; padding: 10px 0; }
                    .diff-row td { padding-top: 10px; font-weight: bold; font-size: 14px; border: none; }
                </style>
            </head>
            <body>
                <div class="header-section">
                    <div class="company-name">${companyName}</div>
                    <div class="report-title">
                        <span>${new Date(settingDate).toLocaleDateString("en-GB")} දිනට ගොවි ලැබිය යුතු හා ගෙවිය යුතු වාර්තාව</span>
                        <span>දිනය : ${new Date(settingDate).toLocaleDateString("en-GB")}</span>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 40%;">ගොවියාගේ නම</th>
                            <th class="text-end" style="width: 30%;">ලැබිය යුතු</th>
                            <th class="text-end" style="width: 30%;">ගෙවිය යුතු</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData
                          .map(
                            (row) => `
                            <tr>
                                <td>${row.code} &nbsp;&nbsp;&nbsp; ${row.name}</td>
                                <td class="text-end">${row.receivable > 0 ? Number(row.receivable).toLocaleString("en-US", { minimumFractionDigits: 2 }) : ""}</td>
                                <td class="text-end">${row.payable > 0 ? Number(row.payable).toLocaleString("en-US", { minimumFractionDigits: 2 }) : ""}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                    <tfoot>
                        <tr class="footer-row">
                            <th>අවසන් එකතුවන් :</th>
                            <th class="text-end">${Number(totals.receivable).toLocaleString("en-US", { minimumFractionDigits: 2 })}</th>
                            <th class="text-end">${Number(totals.payable).toLocaleString("en-US", { minimumFractionDigits: 2 })}</th>
                        </tr>
                        <tr class="diff-row">
                            <td>වෙනස :</td>
                            <td colspan="2" style="padding-left: 50px;">
                                ${(totals.payable - totals.receivable).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  if (loading)
    return (
      <div
        className="d-flex justify-content-center align-items-center vh-100"
        style={{ backgroundColor: "#99ff99" }}
      >
        <div className="spinner-border text-success"></div>
      </div>
    );

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#99ff99",
      }}
    >
      {/* --- VERTICAL SIDEBAR --- */}
      <div
        className="d-print-none"
        style={{
          width: "260px",
          backgroundColor: "#004d00",
          color: "white",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          height: "100vh",
          overflowY: "auto",
          boxShadow: "2px 0 5px rgba(0,0,0,0.2)",
          zIndex: 1000,
        }}
      >
        <Link
          className="navbar-brand fw-bold d-flex align-items-center mb-4 text-white text-decoration-none"
          to="/sales"
        >
          <i className="material-icons me-2">warehouse</i> මුල් පිටුව
        </Link>

        <h6 className="text-uppercase text-light opacity-50 small fw-bold mb-3">
          ප්‍රධාන දත්ත
        </h6>
        <ul className="list-unstyled flex-grow-1">
          <li className="mb-2">
            <Link
              to="/customers"
              className="nav-link text-white d-flex align-items-center p-2 rounded text-decoration-none"
            >
              <i className="material-icons me-2">people</i> පාරිභෝගිකයින්
            </Link>
          </li>
          <li className="mb-2">
            <Link
              to="/suppliers"
              className="nav-link text-white d-flex align-items-center p-2 rounded text-decoration-none"
            >
              <i className="material-icons me-2">local_shipping</i> ගොවියන්
              (Farmers)
            </Link>
          </li>
          <hr className="bg-light" />
          <li className="mb-2">
            <button
              type="button"
              className="btn btn-warning text-dark fw-bold d-flex align-items-center w-100 border-0 p-2 rounded"
              onClick={() => window.location.reload()}
            >
              <i className="material-icons me-2">assessment</i> ගොවි ණය වාර්තාව
            </button>
          </li>
        </ul>

        {/* Logout Button */}
        <div className="mt-auto pt-3 border-top border-secondary">
          <button
            onClick={handleLogout}
            className="btn btn-outline-light w-100 fw-bold d-flex align-items-center justify-content-center"
          >
            <i className="material-icons me-2">logout</i> ඉවත් වන්න
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div
        style={{
          marginLeft: "260px",
          flexGrow: 1,
          padding: "30px",
          width: "calc(100vw - 260px)",
        }}
      >
        <div
          className="card shadow-lg border-0 rounded-4"
          style={{
            backgroundColor: "#006400",
            color: "#fff",
            overflow: "hidden",
          }}
        >
          {/* Header Section */}
          <div className="card-header border-0 py-4 text-center">
            <h2 className="fw-bold mb-0">{companyName}</h2>
            <h4 className="opacity-75">
              ගොවි ණය වාර්තාව (Farmer Receivable & Payable)
            </h4>
          </div>

          {/* Report Body */}
          <div className="card-body bg-light text-dark">
            <div className="d-flex justify-content-between mb-4">
              <div className="text-muted small">
                <strong>Date:</strong>{" "}
                {new Date(settingDate).toLocaleDateString("en-GB")}
              </div>
              <div>
                <button
                  className="btn btn-success me-2 fw-bold shadow-sm"
                  onClick={handleExportExcel}
                >
                  <i className="material-icons align-middle me-1">
                    description
                  </i>{" "}
                  Excel Export
                </button>
                <button
                  className="btn btn-danger fw-bold shadow-sm"
                  onClick={handlePrint}
                >
                  <i className="material-icons align-middle me-1">
                    picture_as_pdf
                  </i>{" "}
                  PDF Print
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div className="table-responsive">
              <table className="table table-hover table-bordered align-middle bg-white shadow-sm">
                <thead style={{ backgroundColor: "#004d00", color: "white" }}>
                  <tr className="text-center">
                    <th style={{ width: "40%" }}>ගොවියාගේ නම (Farmer Name)</th>
                    <th className="text-end" style={{ width: "30%" }}>
                      ලැබිය යුතු (Receivable Rs.)
                    </th>
                    <th className="text-end" style={{ width: "30%" }}>
                      ගෙවිය යුතු (Payable Rs.)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, index) => (
                    <tr key={index}>
                      <td className="ps-4 fw-bold text-dark">
                        {row.code} - {row.name}
                      </td>
                      <td className="text-end pe-4 fw-bold text-primary">
                        {row.receivable > 0
                          ? Math.abs(Number(row.receivable)).toLocaleString(
                              "en-US",
                              { minimumFractionDigits: 2 },
                            )
                          : "-"}
                      </td>
                      <td className="text-end pe-4 fw-bold text-danger">
                        {row.payable > 0
                          ? Math.abs(Number(row.payable)).toLocaleString(
                              "en-US",
                              { minimumFractionDigits: 2 },
                            )
                          : "-"}
                      </td>
                    </tr>
                  ))}
                  {reportData.length === 0 && (
                    <tr>
                      <td colSpan="3" className="text-center text-muted py-4">
                        ගනුදෙනු කිසිවක් හමු නොවීය
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="table-secondary">
                  <tr className="fw-bold fs-5">
                    <td className="text-end">අවසන් එකතුව (Grand Total):</td>
                    <td className="text-end pe-4 text-primary">
                      Rs.{" "}
                      {Math.abs(Number(totals.receivable)).toLocaleString(
                        "en-US",
                        { minimumFractionDigits: 2 },
                      )}
                    </td>
                    <td className="text-end pe-4 text-danger">
                      Rs.{" "}
                      {Math.abs(Number(totals.payable)).toLocaleString(
                        "en-US",
                        { minimumFractionDigits: 2 },
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerLoanReport;
