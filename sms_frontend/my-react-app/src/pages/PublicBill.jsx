import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import html2pdf from "html2pdf.js";

// Generates the HTML layout for the thermal customer bill receipt
const ThermalBillHTML = ({
  salesData,
  billNo,
  customerName,
  mobile,
  globalLoanAmount = 0,
  billSize = "3inch",
}) => {
  // Format numbers with comma separation and 2 decimal places
  const formatNumber = (num) => {
    if (typeof num !== "number" && typeof num !== "string") return "0";
    const number = parseFloat(num);
    if (isNaN(number)) return "0";

    if (Number.isInteger(number)) {
      return number.toLocaleString("en-US");
    } else {
      const parts = number.toFixed(2).split(".");
      const wholePart = parseInt(parts[0]).toLocaleString("en-US");
      return `${wholePart}.${parts[1]}`;
    }
  };

  const date = new Date().toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
  const time = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  });

  // Group items by ID to prevent duplicates and calculate totals correctly
  const groupedById = new Map();
  salesData.forEach((s) => {
    const id = s.id;
    if (!groupedById.has(id)) {
      groupedById.set(id, {
        ...s,
        weight: parseFloat(s.weight) || 0,
        price_per_kg: parseFloat(s.price_per_kg) || 0,
        packs: parseInt(s.packs) || 0,
        CustomerPackCost: parseFloat(s.CustomerPackCost) || 0,
        Kuliya: parseFloat(s.Kuliya) || 0,
        Nattami: parseFloat(s.Nattami) || 0,
      });
    } else {
      const existing = groupedById.get(id);
      existing.weight += parseFloat(s.weight) || 0;
      existing.packs += parseInt(s.packs) || 0;
      existing.Kuliya += parseFloat(s.Kuliya) || 0;
      existing.Nattami += parseFloat(s.Nattami) || 0;
    }
  });

  const uniqueSalesData = Array.from(groupedById.values());

  let totalSales = 0;
  let totalPackCost = 0;
  let totalKuliyaSum = 0;
  let totalNattamiSum = 0;
  const consolidatedSummary = {};

  // Calculate totals and populate the summary section
  uniqueSalesData.forEach((s) => {
    const itemName = s.item_name || "Unknown";
    const weight = s.weight;
    const price = s.price_per_kg;
    const packs = s.packs;
    const packCost = s.CustomerPackCost;
    const kuliya = s.Kuliya;
    const nattami = s.Nattami;

    if (!consolidatedSummary[itemName])
      consolidatedSummary[itemName] = { totalWeight: 0, totalPacks: 0 };
    consolidatedSummary[itemName].totalWeight += weight;
    consolidatedSummary[itemName].totalPacks += packs;

    totalSales += weight * price;
    totalPackCost += packs * packCost;
    totalKuliyaSum += kuliya;
    totalNattamiSum += nattami;
  });

  const totalPacksSum = Object.values(consolidatedSummary).reduce(
    (sum, item) => sum + item.totalPacks,
    0,
  );

  // Subtotal (Matches the 21850 in your screenshot)
  const finalGrandTotal = totalSales + totalPackCost + totalKuliyaSum;

  // Convert globalLoanAmount to an absolute number
  const loanAmount = Math.abs(parseFloat(globalLoanAmount || 0));

  // Net Total (Matches the 26850 in your screenshot)
  const netTotal = finalGrandTotal + loanAmount;

  // Generate inline item summary string e.g. "(වම්බටු 70/3) (අමු මිරිස් 50/2)"
  const summaryString = Object.entries(consolidatedSummary)
    .map(
      ([name, data]) =>
        `(${name} ${formatNumber(data.totalWeight)}/${data.totalPacks})`,
    )
    .join(" ");

  const receiptMaxWidth = "280px";

  // Generate HTML for the item rows
  const itemsHtml = uniqueSalesData
    .map((s) => {
      const weight = s.weight;
      const price = s.price_per_kg;
      const value = (weight * price).toFixed(2);

      return `
        <tr style="font-size:16px; font-weight: bold; color: #000;">
            <td style="text-align:left; padding:8px 0;">
                ${s.item_name || ""}<br>${formatNumber(s.packs)}
            </td>
            <td style="text-align:right; padding:8px 2px;">
                ${formatNumber(weight.toFixed(2))}
            </td>
            <td style="text-align:right; padding:8px 2px;">
                ${formatNumber(price.toFixed(2))}
            </td>
            <td style="text-align:right; padding:8px 0;">
                <div style="font-size:20px;">${s.supplier_code || "ASW"}</div>
                <div>${formatNumber(value)}</div>
            </td>
        <tr>`;
    })
    .join("");

  // Return the complete HTML structure exactly matching the requested design
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', sans-serif; background: white; color: #000; }
            .receipt-main { width: ${receiptMaxWidth}; margin: 0 auto; padding: 5px; }
            @media print {
                @page { margin: 0; size: 80mm auto; }
                body { width: 80mm; }
            }
            .header { text-align: center; }
            .badge { border: 2px solid #000; padding: 4px 8px; font-size: 18px; font-weight: bold; }
            .info-section { font-size: 16px; margin-top: 10px; }
            hr { border: none; border-top: 2px solid #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            .total-table { margin-top: 15px; font-weight: bold; font-size: 20px; }
        </style>
    </head>
    <body>
        <div class="receipt-main">
            <div class="header">
                <div style="display:flex; justify-content:center; align-items:center; gap:10px;">
                    <span style="border:2px solid #000; padding: 2px 8px; font-size: 24px; font-weight: bold;">276</span>
                    <span style="font-size: 22px; font-weight: bold;">නිමල් අත්තනායක(පුද්) සමාගම</span>
                </div>
                <div style="font-size: 11px; margin-top: 5px; font-weight: bold;">
                    එළවළු, පළතුරු හා චයිනීස් එළවළු ගෙන්වන්නෝ හා බෙදා හරින්නෝ<br>
                    No, 276 පෑලියගොඩ නව මැනිං වෙළද සංකීර්ණය
                </div>
            </div>

            <div class="info-section">
                <div style="font-weight: bold; font-size: 12px; text-align: center;">දුර : 0112333375, 0777220468</div>
                <div style="display:flex; justify-content:space-between; align-items: flex-end; font-size: 13px; margin-top: 10px;">
                    <div>
                        <div style="margin-bottom: 5px;">දිනය : ${date} &nbsp;&nbsp; ${time}</div>
                        <div>බිල් අංකය : ${billNo}</div>
                    </div>
                    <div style="text-align:right;">
                        <span>ගණුදෙනුකරු : <span class="badge" style="font-size: 18px; padding: 2px 8px;">${customerName.toUpperCase()}</span></span>
                    </div>
                </div>
            </div>

            <hr />

            <table>
                <colgroup>
                    <col style="width:30%;">
                    <col style="width:20%;">
                    <col style="width:20%;">
                    <col style="width:30%;">
                </colgroup>
                <thead>
                    <tr style="border-bottom:2px solid #000; font-weight:bold; font-size:14px;">
                        <th style="text-align:left;">වර්ගය<br>මලු</th>
                        <th style="text-align:right;">කිලෝ</th>
                        <th style="text-align:right;">මිල</th>
                        <th style="text-align:right;">අගය &nbsp;&nbsp;&nbsp; අයිතිය</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot>
                    <tr style="border-top:2px solid #000;">
                        <td colspan="4" style="padding-top:10px;">
                            <div style="display:flex; justify-content:space-between; font-size:22px; font-weight:bold;">
                                <span style="margin-left: 20px;">${formatNumber(totalPacksSum)}</span>
                                <span>${Number(totalSales).toFixed(2)}</span>
                            </div>
                        </td>
                    </tr>
                </tfoot>
            </table>

            <table class="total-table" style="width: 100%;">
                <tr>
                    <td style="padding-top:5px; font-size: 16px; width:50%;">පෙට්ටි / මලු</td>
                    <td style="text-align:right; font-size: 16px; width:50%;">${formatNumber(totalPackCost.toFixed(2))}</td>
                </tr>
                <tr>
                    <td style="padding-top:5px; font-size: 16px;">කුලිය</td>
                    <td style="text-align:right; font-size: 16px;">${formatNumber(totalKuliyaSum.toFixed(2))}</td>
                </tr>
                <tr>
                    <td style="padding-top:10px;"></td>
                    <td style="text-align:right; padding-top:10px;">
                        <div style="border-bottom:4px double #000; border-top:1px solid #000; font-size:20px; width:130px; float:right; text-align:right; padding: 2px 0; color: #000;">
                            ${formatNumber(finalGrandTotal.toFixed(2))}
                        </div>
                        <div style="clear:both;"></div>
                    </td>
                </tr>
                
                ${
                  loanAmount !== 0
                    ? `
                <tr>
                    <td style="font-size:14px; padding-top:15px; white-space:nowrap; vertical-align:bottom;">
                        <div style="margin-bottom: 5px;">${date} &nbsp;&nbsp; මුදල් ලැබුණා</div>
                        <div style="margin-bottom: 5px;">නාට්ටාමි: ${formatNumber(totalNattamiSum.toFixed(2))}</div>
                        <div style="font-size: 16px; font-weight: 900; color: #000;">හිඟ : ${formatNumber(loanAmount.toFixed(2))}</div>
                    </td>
                    <td style="text-align:right; font-size:28px; padding-top:15px; font-weight:bold; color: #000; vertical-align:bottom;">
                        ${formatNumber(netTotal.toFixed(2))}
                    </td>
                </tr>
                `
                    : `
                <tr>
                    <td colspan="2" style="font-size:14px; padding-top:15px; white-space:nowrap; vertical-align:bottom;">
                        <div style="margin-bottom: 5px;">${date} &nbsp;&nbsp; මුදල් ලැබුණා</div>
                        <div>නාට්ටාමි: ${formatNumber(totalNattamiSum.toFixed(2))}</div>
                    </td>
                </tr>
                `
                }
            </table>
            
            <div style="font-size: 13px; font-weight: bold; margin-top: 10px; text-align: left;">
                ${summaryString}
            </div>

            <hr />
            <div style="text-align: center; font-size: 11px; font-weight: bold; margin-top: 5px;">
                මෙවැනි පරිගණක පද්ධතියක් සඳහා අමතන්න : 0714806727
            </div>
        </div>
    </body>
    </html>`;
};

const PublicBill = () => {
  const { token } = useParams();
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch bill data based on the token
  useEffect(() => {
    axios
      .get(`https://goviraju.lk/vts_sales_backend/api/public/bill/${token}`)
      .then((res) => {
        setBillData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Bill fetch error:", err);
        setLoading(false);
      });
  }, [token]);

  // Generate and download the bill as a PDF using html2pdf
  const handleDownload = () => {
    const element = document.getElementById("bill-content");
    const opt = {
      margin: [10, 5, 10, 5],
      filename: `Bill_${billData.bill_no}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 3, useCORS: true, letterRendering: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(opt).from(element).save();
  };

  if (loading)
    return <div className="p-10 text-center text-xl">Loading Bill...</div>;
  if (!billData)
    return <div className="p-10 text-center text-red-500">Bill Not Found.</div>;

  // Parse sales_data JSON safely
  const salesArray =
    typeof billData.sales_data === "string"
      ? JSON.parse(billData.sales_data)
      : billData.sales_data;

  return (
    <div className="bg-gray-200 min-h-screen p-4 flex flex-col items-center">
      <button
        onClick={handleDownload}
        className="mb-6 text-white px-12 py-4 rounded-full font-black shadow-2xl uppercase tracking-widest transition-all transform hover:scale-105 active:scale-95 border-b-4 border-red-900"
        style={{
          backgroundColor: "#dc2626",
          display: "block",
          margin: "0 auto 24px auto",
        }}
      >
        Download PDF (බාගත කරන්න)
      </button>

      <div id="bill-content" className="bg-white shadow-2xl p-2 rounded-sm">
        <div
          dangerouslySetInnerHTML={{
            __html: ThermalBillHTML({
              salesData: salesArray,
              billNo: billData.bill_no,
              customerName: billData.customer_name,
              mobile: billData.customer_mobile || "0777672838 / 0714371115",
              globalLoanAmount: billData.loan_amount || 0,
              billSize: "3inch",
            }),
          }}
        />
      </div>
    </div>
  );
};

export default PublicBill;
