import React, { useMemo } from "react";

const CustomerList = React.memo(
  ({
    type,
    searchQuery,
    onSearchChange,
    selectedPrintedCustomer,
    selectedUnprintedCustomer,
    handleCustomerClick,
    allSales,
    lastUpdate,
    isCashFilterActive,
    toggleCashFilter,
  }) => {
    const getPrintedCustomerGroups = () => {
      const groups = {};
      allSales
        .filter((s) => s.bill_printed === "Y" && s.bill_no)
        .forEach((sale) => {
          if (type === "printed") {
            if (isCashFilterActive) {
              if (sale.credit_transaction !== "Y") return;
            } else {
              if (sale.credit_transaction !== "N") return;
            }
          }

          const groupKey = `${sale.customer_code}-${sale.bill_no}`;
          if (!groups[groupKey])
            groups[groupKey] = {
              customerCode: sale.customer_code,
              billNo: sale.bill_no,
              displayText: sale.customer_code,
            };
        });
      return groups;
    };

    // ONLY Strict "N" means unprinted
    const getUnprintedCustomers = () => {
      const customerMap = {};
      allSales
        .filter((s) => s.bill_printed === "N")
        .forEach((sale) => {
          const customerCode = sale.customer_code;
          const saleTimestamp = new Date(
            sale.timestamp || sale.created_at || sale.date || sale.id,
          );
          if (
            !customerMap[customerCode] ||
            saleTimestamp > new Date(customerMap[customerCode].latestTimestamp)
          ) {
            customerMap[customerCode] = {
              customerCode,
              latestTimestamp:
                sale.timestamp || sale.created_at || sale.date || sale.id,
              originalItem: customerCode,
            };
          }
        });
      return customerMap;
    };

    const printedCustomerGroups =
      type === "printed" ? getPrintedCustomerGroups() : {};
    const unprintedCustomerMap =
      type === "unprinted" ? getUnprintedCustomers() : {};

    const filteredPrintedGroups = useMemo(() => {
      if (type !== "printed") return [];
      let groupsArray = Object.values(printedCustomerGroups);
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        groupsArray = groupsArray.filter(
          (g) =>
            (g.customerCode || "").toLowerCase().startsWith(lowerQuery) ||
            (g.billNo || "").toString().toLowerCase().startsWith(lowerQuery) ||
            (g.displayText || "").toLowerCase().startsWith(lowerQuery),
        );
      }
      return groupsArray.sort(
        (a, b) => (parseInt(b.billNo) || 0) - (parseInt(a.billNo) || 0),
      );
    }, [printedCustomerGroups, searchQuery, type]);

    const filteredUnprintedCustomers = useMemo(() => {
      if (type !== "unprinted") return [];
      let customersArray = Object.values(unprintedCustomerMap);
      if (searchQuery)
        customersArray = customersArray.filter((c) =>
          (c.customerCode || "")
            .toLowerCase()
            .startsWith(searchQuery.toLowerCase()),
        );
      return customersArray.sort(
        (a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp),
      );
    }, [unprintedCustomerMap, searchQuery, type]);

    const displayItems =
      type === "printed" ? filteredPrintedGroups : filteredUnprintedCustomers;
    const isSelected = (item) =>
      type === "printed"
        ? selectedPrintedCustomer === `${item.customerCode}-${item.billNo}`
        : selectedUnprintedCustomer === item.customerCode;

    return (
      <div
        key={`${type}-${lastUpdate || ""}`}
        className="w-full shadow-xl rounded-xl overflow-y-auto border border-black flex flex-col"
        style={{
          backgroundColor: "#1ec139ff",
          height: "100%",
          overflow: "hidden",
          marginTop: "-10px"
        }}
      >
        <div
          style={{ backgroundColor: "#006400" }}
          className="p-2 rounded-t-xl flex-shrink-0"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2
              className="font-bold text-white whitespace-nowrap"
              style={{ fontSize: "16px" }}
            >
              {type === "printed" ? "මුද්‍රණය කළ" : "මුද්‍රණය නොකළ"}
            </h2>

            {type === "printed" && (
              <div
                onClick={() => toggleCashFilter()}
                className="cursor-pointer transition-all border border-white rounded"
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: isCashFilterActive
                    ? "#2563eb"
                    : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginLeft: "auto",
                  marginTop: "-25px",
                }}
              >
                {isCashFilterActive && (
                  <span
                    style={{
                      color: "white",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
            )}
          </div>

          <input
            type="text"
            name="prevent_browser_autofill_search"
            autoComplete="new-password"
            placeholder={`සෙවීම...`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value.toUpperCase())}
            className="px-3 py-1 border rounded-xl focus:ring-2 focus:ring-blue-300 uppercase block mx-auto w-11/12 text-center font-bold"
            style={{ fontSize: "14px" }}
          />
        </div>

        <div className="py-2 flex-1 overflow-y-auto min-h-0">
          {displayItems.length === 0 ? (
            <p className="text-gray-700 p-2 text-center text-sm font-bold">
              වාර්තා නොමැත.
            </p>
          ) : (
            <ul className="flex flex-col px-2 w-full gap-1">
              {displayItems.map((item) => {
                let customerCode, displayText, billSales;
                if (type === "printed") {
                  customerCode = item.customerCode;
                  displayText = `${item.customerCode}-${item.billNo}`;
                  billSales = allSales.filter(
                    (s) =>
                      s.customer_code === item.customerCode &&
                      s.bill_no === item.billNo,
                  );
                } else {
                  customerCode = item.customerCode;
                  displayText = item.customerCode;
                  billSales = allSales.filter(
                    (s) =>
                      (s.customer_code || "").trim().toUpperCase() ===
                        (item.customerCode || "").trim().toUpperCase() &&
                      s.bill_printed === "N",
                  );
                }
                const isItemSelected = isSelected(item);
                const buttonText = displayText
                  ? displayText.replace(/\n/g, " ")
                  : "";

                return (
                  <li
                    key={
                      type === "printed"
                        ? `${item.customerCode}-${item.billNo}`
                        : item.customerCode
                    }
                    className="flex w-full justify-center"
                  >
                    <button
                      onClick={() =>
                        handleCustomerClick(
                          type,
                          customerCode,
                          item.billNo || null,
                          billSales,
                        )
                      }
                      className={`py-2 mb-1 rounded-lg border text-left px-3 shadow-sm transition-all duration-200 ${
                        isItemSelected 
                          ? "border-blue-400 bg-blue-200 hover:bg-blue-300" 
                          : "bg-gray-50 hover:bg-gray-200 border-gray-300"
                      }`}
                      style={{ width: "150px" }}
                    >
                      <span
                        style={{
                          display: "block",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          width: "100%",
                          fontSize: "15px",
                        }}
                        className={`font-bold ${isItemSelected ? "text-blue-900" : "text-gray-800"}`}
                        title={buttonText}
                      >
                        {buttonText}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    );
  },
  // FIXED: Proper comparison - return FALSE if props changed, TRUE if they're the same
  (prevProps, nextProps) => {
    // Check if any of the critical props have changed
    const hasChanged = 
      prevProps.type !== nextProps.type ||
      prevProps.searchQuery !== nextProps.searchQuery ||
      prevProps.selectedPrintedCustomer !== nextProps.selectedPrintedCustomer ||
      prevProps.selectedUnprintedCustomer !== nextProps.selectedUnprintedCustomer ||
      prevProps.isCashFilterActive !== nextProps.isCashFilterActive ||
      prevProps.lastUpdate !== nextProps.lastUpdate ||
      prevProps.allSales !== nextProps.allSales;
    
    // Return true if NO changes (skip re-render), false if changes (re-render)
    return !hasChanged;
  }
);

export default CustomerList;