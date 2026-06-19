// src/components/BillTemplates.jsx

export const ThermalBillHTML = ({
  salesData,
  billNo,
  customerName,
  globalLoanAmount = 0,
  billSize = "3inch",
}) => {
  const formatNumber = (num) => {
    if (typeof num !== "number" && typeof num !== "string") return "0.00";
    const number = parseFloat(num);
    if (isNaN(number)) return "0.00";

    if (Number.isInteger(number)) {
      return number.toLocaleString("en-US") + ".00";
    } else {
      const parts = number.toFixed(2).split(".");
      const wholePart = parseInt(parts[0]).toLocaleString("en-US");
      const decimalPart = parts[1]
        ? parts[1].length === 1
          ? parts[1] + "0"
          : parts[1]
        : "00";
      return `${wholePart}.${decimalPart}`;
    }
  };

  const date = new Date().toLocaleDateString("en-US");
  const time = new Date().toLocaleTimeString("en-US");

  const groupedById = new Map();
  salesData.forEach((s) => {
    const id = s.id || Math.random().toString();
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
  const finalGrandTotal =
    totalSales + totalPackCost + totalKuliyaSum + totalNattamiSum;

  const receiptMaxWidth = billSize === "4inch" ? "380px" : "320px";

  const itemsHtml = uniqueSalesData
    .map((s) => {
      const weight = s.weight;
      const price = s.price_per_kg;
      const value = (weight * price).toFixed(2);

      return `
        <tr style="vertical-align: top;">
            <td style="text-align:left; padding:4px 0;">${s.item_name || ""}</td>
            <td style="text-align:center; padding:4px 0;">${parseInt(s.packs)}</td>
            <td style="text-align:right; padding:4px 0;">${formatNumber(weight)}</td>
            <td style="text-align:right; padding:4px 0;">${formatNumber(price)}</td>
            <td style="text-align:right; padding:4px 0;">${formatNumber(value)}</td>
            <td style="text-align:right; padding:4px 0;">${s.supplier_code || "ASW"}</td>
        </tr>`;
    })
    .join("");

  const summaryHtmlContentInline = Object.entries(consolidatedSummary)
    .map(
      ([name, data]) =>
        `(${name} ${parseFloat(data.totalWeight)}/${parseInt(data.totalPacks)})`,
    )
    .join(" ");

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', sans-serif; background: white; color: #000; }
            .receipt-main { width: ${receiptMaxWidth}; margin: 0 auto; border: 1px solid #000; padding: 6px; }
            @media print {
                @page { margin: 0; size: auto; }
                body { width: 100%; margin: 0; }
                .receipt-main { border: 1px solid #000 !important; }
            }
        </style>
    </head>
    <body>
        <div class="receipt-main">
            <!-- Header Row -->
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 5px;">
                <div style="border: 2px solid #000; font-size: 26px; font-weight: bold; padding: 2px 10px; margin-right: 10px;">
                    276
                </div>
                <div style="font-size: 20px; font-weight: bold;">
                    නිමල් අත්තනායක(පුද්) සමාගම
                </div>
            </div>
            
            <!-- Address/Info -->
            <div style="text-align: center; font-size: 11px; font-weight: bold; line-height: 1.4;">
                එළවළු, පළතුරු හා චයිනීස් එළවළු ගෙන්වන්නෝ හා බෙදා හරින්නෝ<br>
                No, 276 පෑලියගොඩ නව මැනිං වෙළද සංකීර්ණය<br>
                දුර : 0112333375, 0777220468
            </div>

            <!-- Date, Bill, Customer -->
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-top: 10px; align-items: flex-end;">
                <div style="line-height: 1.5;">
                    <div>දිනය : ${date} &nbsp;&nbsp;&nbsp; ${time}</div>
                    <div>බිල් අංකය : ${billNo || ""}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="margin-bottom: 2px;">ගණුම්කරු :</div>
                    <div style="border: 1px solid #000; font-size: 20px; padding: 2px 15px;">
                        ${customerName ? customerName.toUpperCase() : ""}
                    </div>
                </div>
            </div>

            <!-- Table -->
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; font-weight: bold;">
                <colgroup>
                    <col style="width: 25%;">
                    <col style="width: 10%;">
                    <col style="width: 15%;">
                    <col style="width: 15%;">
                    <col style="width: 20%;">
                    <col style="width: 15%;">
                </colgroup>
                <thead>
                    <tr style="border-top: 1px solid #000; border-bottom: 1px solid #000;">
                        <th style="text-align: left; padding: 4px 0;">වර්ගය</th>
                        <th style="text-align: center; padding: 4px 0;">මලු</th>
                        <th style="text-align: right; padding: 4px 0;">කිලෝ</th>
                        <th style="text-align: right; padding: 4px 0;">බැගින්</th>
                        <th style="text-align: right; padding: 4px 0;">අගය</th>
                        <th style="text-align: right; padding: 4px 0;">අයිතිය</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <!-- Totals Table -->
            <!-- ✅ FIXED: Made this table use the EXACT SAME column widths as the table above -->
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; font-weight: bold; border-top: 1px solid #000; margin-top: 2px;">
                <colgroup>
                    <col style="width: 25%;">
                    <col style="width: 10%;">
                    <col style="width: 15%;">
                    <col style="width: 15%;">
                    <col style="width: 20%;">
                    <col style="width: 15%;">
                </colgroup>
                <tr>
                    <td></td>
                    <td style="text-align: center; padding-top: 4px;">${totalPacksSum}</td>
                    <td colspan="2"></td>
                    <td style="text-align: right; padding-top: 4px;">${formatNumber(totalSales)}</td>
                    <td></td> <!-- ✅ Empty 6th column to match 'අයිතිය' -->
                </tr>
                ${
                  totalPackCost > 0
                    ? `
                <tr>
                    <td colspan="4" style="text-align: left; padding-top: 2px;">පෙට්ටි / මලු</td>
                    <td style="text-align: right; padding-top: 2px;">${formatNumber(totalPackCost)}</td>
                    <td></td> <!-- ✅ Empty 6th column -->
                </tr>`
                    : ""
                }
                ${
                  totalKuliyaSum > 0
                    ? `
                <tr>
                    <td colspan="4" style="text-align: left; padding-top: 2px;">කුලිය</td>
                    <td style="text-align: right; padding-top: 2px;">${formatNumber(totalKuliyaSum)}</td>
                    <td></td> <!-- ✅ Empty 6th column -->
                </tr>`
                    : ""
                }
                <tr>
                    <td colspan="4"></td>
                    <td style="text-align: right; padding-top: 2px;">
                        <div style="border-top: 1px solid #000; border-bottom: 3px double #000; padding: 2px 0; font-size: 16px;">
                            ${formatNumber(finalGrandTotal)}
                        </div>
                    </td>
                    <td></td> <!-- ✅ Empty 6th column -->
                </tr>
            </table>

            <!-- Bottom Info -->
            <table style="width: 100%; margin-top: 10px; font-size: 13px; font-weight: bold; border-collapse: collapse;">
                <tr>
                    <td style="text-align: left; width: 60%;">${date} &nbsp;&nbsp;&nbsp; මුදල් ලැබුණා</td>
                    <td style="text-align: right; width: 40%; font-size: 14px;"></td>
                </tr>
                <tr>
                    <td style="text-align: left;">නාට්ටාමි: ${formatNumber(totalNattamiSum)}</td>
                    <td style="text-align: right;">හිග : &nbsp;&nbsp; ${formatNumber(globalLoanAmount)}</td>
                </tr>
                <tr>
                    <td colspan="2" style="text-align: left; font-size: 11px; padding-top: 4px;">
                        ${summaryHtmlContentInline}
                    </td>
                </tr>
            </table>

            <!-- Footer Section -->
            <div style="text-align: center; font-size: 11px; font-weight: bold; margin-top: 10px; border-top: 1px solid #000; padding-top: 4px;">
                මෙවැනි කම්පියුටර් සිස්ටම් සදහා අමතන්න : 0714806727
            </div>
        </div>
    </body>
    </html>`;
};

// A4 Template is exactly identical visually, but allows wider scaling if selected from the dropdown
export const A4BillHTML = (props) => {
  return ThermalBillHTML({ ...props, billSize: "4inch" });
};
