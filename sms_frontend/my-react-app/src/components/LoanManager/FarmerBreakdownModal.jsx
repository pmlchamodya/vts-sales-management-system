import React from "react";

const FarmerBreakdownModal = ({ show, onHide, data }) => {
  if (!show || !data) return null;

  const handlePrintBreakdown = () => {
    const printContents = document.getElementById(
      "print-breakdown-area",
    ).innerHTML;
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
            <html>
                <head>
                    <title>Farmer Loan Breakdown</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Sinhala:wght@400;700&display=swap');
                        body { font-family: 'Noto Sans Sinhala', 'Iskoola Pota', Arial, sans-serif; padding: 20px; font-size: 14px;}
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid black; padding: 5px; }
                        th { text-align: center; }
                        .text-end { text-align: right; }
                        .fw-bold { font-weight: bold; }
                        .text-danger { color: red !important; }
                        .text-primary { color: blue !important; }
                    </style>
                </head>
                <body>
                    ${printContents}
                </body>
            </html>
        `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.8)", zIndex: 1050 }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content rounded-0">
          <div className="modal-header border-0 bg-light">
            <button
              type="button"
              className="btn-close"
              onClick={onHide}
            ></button>
          </div>
          <div
            className="modal-body bg-white text-dark p-4"
            id="print-breakdown-area"
          >
            {/* Header Section */}
            <div className="d-flex justify-content-between border-bottom border-dark pb-2 mb-2">
              <div>
                <h5 className="text-primary fw-bold mb-1">මහතුන් වෙළඳසැල</h5>
                <p className="mb-0 small fw-bold">
                  වාර්තාව ලබා ගත් දිනය : {data.report_date.split(" ")[0]}
                </p>
                <h5 className="text-danger fw-bold mt-2">
                  {data.customer_short_name}{" "}
                  <span className="text-dark mx-3">{data.customer_name}</span>
                </h5>
              </div>
              <div className="text-end">
                <h5 className="text-primary fw-bold mb-1">
                  ගොවියාගේ ණය විස්තරය
                </h5>
                <p className="mb-0 small fw-bold">
                  {data.report_date.split(" ")[1]}{" "}
                  {data.report_date.split(" ")[2]}
                </p>
              </div>
            </div>

            <div className="d-flex justify-content-center gap-5 mb-2 small fw-bold">
              <span>මුළු පිටු ගණන : 1</span>
              <span>පිටු අංකය : 1</span>
            </div>

            {/* Data Table */}
            <table
              className="table table-bordered border-dark table-sm mb-2"
              style={{ fontSize: "0.85rem" }}
            >
              <thead>
                <tr className="text-center">
                  <th style={{ width: "15%" }}>දිනය</th>
                  <th style={{ width: "40%" }}>විස්තරය / බිල් අංකය</th>
                  <th style={{ width: "15%" }}>අඩු වීම (-)</th>
                  <th style={{ width: "15%" }}>වැඩි වීම (+)</th>
                  <th style={{ width: "15%" }}>එදිනට හිඟ/ඉතිරිය</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.date}</td>
                    <td>
                      {row.description} {row.bill_no ? `/ ${row.bill_no}` : ""}
                    </td>
                    <td className="text-end">{row.decrease}</td>
                    <td className="text-end">{row.increase}</td>
                    <td className="text-end fw-bold">{row.balance}</td>
                  </tr>
                ))}
                {data.data.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted">
                      ගනුදෙනු කිසිවක් හමු නොවීය.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <h6 className="text-danger fw-bold mt-3">
              අද දිනට ණය ශේෂය : {data.final_balance}
            </h6>
          </div>

          <div className="modal-footer border-0 d-print-none">
            <button
              type="button"
              className="btn btn-secondary fw-bold"
              onClick={onHide}
            >
              වසන්න
            </button>
            <button
              type="button"
              className="btn btn-primary fw-bold"
              onClick={handlePrintBreakdown}
            >
              මුද්‍රණය (Print)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmerBreakdownModal;
