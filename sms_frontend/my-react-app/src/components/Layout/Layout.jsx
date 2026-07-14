import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../../api";
import ItemReportModal from "../Itemrepo/ItemReportModal";
import WeightReportModal from "../WeightReport/WeightReportModal";
import GrnSaleReportModal from "../GrnSale/ReportModal";
import GrnReportModal from "../GrnReport/GrnReportModal";
import SalesAdjustmentReportModal from "../SalesAdjustmentReport/SalesAdjustmentReportModal";
import GrnSalesOverviewReport from "../GrnSalesOverview/GrnSalesOverviewReport";
import GrnSalesOverviewReport2 from "../GrnSalesOverview/GrnSalesOverviewReport2";
import SalesReportModal from "../SalesReport/SalesReportModal";
import DayProcessModal from "../Modals/DayProcessModal";
import TodaysKuliyaModal from "../Kuliya/TodaysKuliyaModal";

const Layout = ({
  children,
  billSize,
  handleBillSizeChange,
  printMode,
  setPrintMode,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get base URL dynamically
  const getBaseUrl = () => {
    const { protocol, hostname, port } = window.location;
    if (hostname.includes("goviraju.lk")) {
      return `${protocol}//${hostname}/vts_sales_frontend`;
    }
    if (port === "5173" || hostname === "localhost") {
      return "http://localhost:5173";
    }
    return window.location.origin;
  };

  const BASE_URL = getBaseUrl();

  // Check if current page should hide the navbar
  const hideNavbarRoutes = [
    "/supplierreport",
    "/suppliers/printed-report",
    "/supplier-finalreport",
  ];
  const shouldHideNavbar = hideNavbarRoutes.includes(location.pathname);
  const isSalesEntryPage =
    location.pathname === "/sales" || location.pathname === "/sales-entry";

  // Modal States
  const [isItemReportModalOpen, setIsItemReportModalOpen] = useState(false);
  const [isWeightReportModalOpen, setIsWeightReportModalOpen] = useState(false);
  const [isGrnSaleReportModalOpen, setIsGrnSaleReportModalOpen] =
    useState(false);
  const [
    isSalesAdjustmentReportModalOpen,
    setIsSalesAdjustmentReportModalOpen,
  ] = useState(false);
  const [isGrnSalesOverviewReportOpen, setIsGrnSalesOverviewReportOpen] =
    useState(false);
  const [isGrnSalesOverviewReport2Open, setIsGrnSalesOverviewReport2Open] =
    useState(false);
  const [isSalesReportModalOpen, setIsSalesReportModalOpen] = useState(false);
  const [isGrnReportModalOpen, setIsGrnReportModalOpen] = useState(false);
  const [isDayProcessModalOpen, setIsDayProcessModalOpen] = useState(false);
  const [isTodaysKuliyaModalOpen, setIsTodaysKuliyaModalOpen] = useState(false);

  // User & Settings State
  const [user, setUser] = useState(null);
  const [settingValue, setSettingValue] = useState("");

  // Bottom Password States
  const [bottomPassword, setBottomPassword] = useState("");
  const [isBottomUnlocked, setIsBottomUnlocked] = useState(true);

  // Local Print Mode State
  const [localPrintMode, setLocalPrintMode] = useState(() => {
    const savedPrintMode = localStorage.getItem("printMode");
    return savedPrintMode || "thermal";
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/login");
    }

    const fetchSettings = async () => {
      try {
        const response = await api.get("/settings");
        if (response.data) {
          setSettingValue(response.data.value || response.data[0]?.value || "");
        }
      } catch (error) {
        console.error("Error fetching settings data:", error);
      }
    };

    fetchSettings();
  }, [navigate]);

  useEffect(() => {
    if (setPrintMode && typeof setPrintMode === "function") {
      setPrintMode(localPrintMode);
    }
  }, [localPrintMode, setPrintMode]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Modal Handlers
  const openItemReportModal = () => setIsItemReportModalOpen(true);
  const closeItemReportModal = () => setIsItemReportModalOpen(false);
  const openWeightReportModal = () => setIsWeightReportModalOpen(true);
  const closeWeightReportModal = () => setIsWeightReportModalOpen(false);
  const openGrnSaleReportModal = () => setIsGrnSaleReportModalOpen(true);
  const closeGrnSaleReportModal = () => setIsGrnSaleReportModalOpen(false);
  const openSalesAdjustmentReportModal = () =>
    setIsSalesAdjustmentReportModalOpen(true);
  const closeSalesAdjustmentReportModal = () =>
    setIsSalesAdjustmentReportModalOpen(false);
  const openGrnSalesOverviewReport = () =>
    setIsGrnSalesOverviewReportOpen(true);
  const closeGrnSalesOverviewReport = () =>
    setIsGrnSalesOverviewReportOpen(false);
  const openGrnSalesOverviewReport2 = () =>
    setIsGrnSalesOverviewReport2Open(true);
  const closeGrnSalesOverviewReport2 = () =>
    setIsGrnSalesOverviewReport2Open(false);
  const openSalesReportModal = () => setIsSalesReportModalOpen(true);
  const closeSalesReportModal = () => setIsSalesReportModalOpen(false);
  const openGrnReportModal = () => setIsGrnReportModalOpen(true);
  const closeGrnReportModal = () => setIsGrnReportModalOpen(false);
  const openDayProcessModal = () => setIsDayProcessModalOpen(true);
  const closeDayProcessModal = () => setIsDayProcessModalOpen(false);
  const openTodaysKuliyaModal = () => setIsTodaysKuliyaModalOpen(true);
  const closeTodaysKuliyaModal = () => setIsTodaysKuliyaModalOpen(false);

  const handleProfitReportClick = () => {
    navigate("/supplier-profit");
  };

  const handleSupplierReportClick = () => {
    navigate("/reports/supplier");
  };

  const handleBottomPasswordChange = (e) => {
    setBottomPassword(e.target.value);
  };

  const handlePrintModeChange = (e) => {
    const newMode = e.target.value;
    setLocalPrintMode(newMode);
    localStorage.setItem("printMode", newMode);
    if (setPrintMode && typeof setPrintMode === "function") {
      setPrintMode(newMode);
    }
  };

  const navigateTo = (path) => {
    navigate(path);
  };

  return (
    <div>
      {/* Top Navigation Bar */}
      {!shouldHideNavbar && (
        <nav
          className="navbar navbar-expand-lg navbar-dark fixed-top shadow"
          style={{
            backgroundColor: "#004d00",
            width: "100%",
            zIndex: 1030,
            paddingTop: "4px",
            paddingBottom: "4px",
          }}
        >
          <div className="container-fluid d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center">
              {/* Home Button */}
              <Link
                className="navbar-brand fw-bold d-flex align-items-center me-3"
                to="/"
                style={{ fontSize: "20px", letterSpacing: "0.5px" }}
              >
                <i
                  className="material-icons align-middle me-1"
                  style={{ fontSize: "26px" }}
                >
                  warehouse
                </i>
                මුල් පිටුව
              </Link>

              <div className="navbar-nav d-flex flex-row align-items-center">
                <div className="nav-item dropdown mx-1">
                  {/* Dropdown Button */}
                  <button
                    className="btn btn-outline-light dropdown-toggle fw-bold py-1 px-3"
                    id="masterDropdown"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    style={{ fontSize: "16px" }}
                  >
                    <i
                      className="material-icons align-middle me-1"
                      style={{ fontSize: "20px" }}
                    >
                      menu_book
                    </i>{" "}
                    ප්‍රධාන ගොනුව
                  </button>
                  <ul
                    className="dropdown-menu dropdown-menu-dark shadow-lg"
                    aria-labelledby="masterDropdown"
                    style={{ fontSize: "16px" }}
                  >
                    <li>
                      <Link to="/customers" className="dropdown-item py-1">
                        <i
                          className="material-icons align-middle me-2"
                          style={{ fontSize: "20px" }}
                        >
                          people
                        </i>{" "}
                        පාරිභෝගිකයින්
                      </Link>
                    </li>
                    <li>
                      <Link to="/items" className="dropdown-item py-1">
                        <i
                          className="material-icons align-middle me-2"
                          style={{ fontSize: "20px" }}
                        >
                          inventory_2
                        </i>{" "}
                        භාණ්ඩ
                      </Link>
                    </li>
                    <li>
                      <Link to="/suppliers" className="dropdown-item py-1">
                        <i
                          className="material-icons align-middle me-2"
                          style={{ fontSize: "20px" }}
                        >
                          local_shipping
                        </i>{" "}
                        සැපයුම්කරුවන්
                      </Link>
                    </li>
                    <li>
                      <Link to="/commissions" className="dropdown-item py-1">
                        <i
                          className="material-icons align-middle me-2"
                          style={{ fontSize: "20px" }}
                        >
                          attach_money
                        </i>
                        කොමිස් මුදල්
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/reports/printed-sales"
                        className="dropdown-item flex items-center py-1"
                      >
                        <i
                          className="material-icons me-2"
                          style={{ fontSize: "20px" }}
                        >
                          analytics
                        </i>
                        ප්‍රින්ට් කළ වාර්තා
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/reports/printed-sales2"
                        className="dropdown-item flex items-center py-1"
                      >
                        <i
                          className="material-icons me-2"
                          style={{ fontSize: "20px" }}
                        >
                          analytics
                        </i>
                        ප්‍රින්ට් කළ වාර්තා 2
                      </Link>
                    </li>
                    <li>
                      <hr className="dropdown-divider" />
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item text-warning py-1 fw-bold"
                        onClick={() => navigateTo("/customers-loans/report")}
                      >
                        <i
                          className="material-icons align-middle me-2 text-warning"
                          style={{ fontSize: "20px" }}
                        >
                          account_balance
                        </i>{" "}
                        ණය වාර්තාව
                      </button>
                    </li>
                    {/* ✅ අලුතින් එකතු කළ "ගොවි ණය වාර්තාව" බොත්තම */}
                    <li>
                      <button
                        type="button"
                        className="dropdown-item text-info py-1 fw-bold"
                        onClick={() => navigateTo("/farmer-loan-report")}
                      >
                        <i
                          className="material-icons align-middle me-2 text-info"
                          style={{ fontSize: "20px" }}
                        >
                          assessment
                        </i>{" "}
                        ගොවි ණය වාර්තාව
                      </button>
                    </li>
                    <li>
                      <hr className="dropdown-divider" />
                    </li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item text-success py-1 fw-bold"
                        onClick={openTodaysKuliyaModal}
                      >
                        <i
                          className="material-icons align-middle me-2 text-success"
                          style={{ fontSize: "20px" }}
                        >
                          account_balance_wallet
                        </i>{" "}
                        අද කුලිය (Today's Kuliya)
                      </button>
                    </li>
                  </ul>
                </div>

                {/* Top Action Buttons */}
                {user?.role !== "Admin" && (
                  <>
                    <Link
                      to="/customers-loans"
                      className="btn btn-outline-success mx-1 py-1 px-3 shadow-sm"
                      style={{
                        fontWeight: "bold",
                        color: "#fff",
                        fontSize: "16px",
                      }}
                    >
                      ණය දීම/ගැනීම
                    </Link>
                    <Link
                      to="/supplierreport"
                      className="btn btn-outline-success mx-1 py-1 px-3 shadow-sm"
                      style={{
                        fontWeight: "bold",
                        color: "#fff",
                        fontSize: "16px",
                      }}
                    >
                      සැපයුම්කරු බිල්පත්
                    </Link>
                    <button
                      type="button"
                      className="btn btn-outline-success mx-1 py-1 px-3 shadow-sm"
                      style={{
                        fontWeight: "bold",
                        color: "#fff",
                        fontSize: "16px",
                      }}
                      onClick={openDayProcessModal}
                    >
                      දින අවසාන ක්‍රියාවලිය
                    </button>
                  </>
                )}
              </div>

              {/* Print Mode */}
              {isSalesEntryPage && user?.role !== "Admin" && (
                <div className="d-flex align-items-center ms-3">
                  <label
                    className="text-white me-2 fw-bold"
                    style={{ fontSize: "16px", whiteSpace: "nowrap" }}
                  >
                    Print Mode:
                  </label>
                  <select
                    value={localPrintMode}
                    onChange={handlePrintModeChange}
                    className="form-select fw-bold py-1"
                    style={{
                      width: "120px",
                      backgroundColor: "#006400",
                      color: "white",
                      border: "2px solid #4a5568",
                      fontSize: "16px",
                    }}
                  >
                    <option value="thermal">Thermal</option>
                    <option value="a4">A4 Paper</option>
                  </select>
                </div>
              )}
            </div>

            {/* User details & Logout Button */}
            {user && (
              <div className="d-flex align-items-center text-white ms-2">
                <span
                  className="me-3 fw-black"
                  style={{ color: "#ff4444", fontSize: "20px" }}
                >
                  {settingValue}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn btn-outline-light fw-bold py-1 px-3 shadow-sm"
                  style={{ fontSize: "16px" }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main
        className={isSalesEntryPage ? "p-0" : "container-fluid py-4"}
        style={{
          marginTop: shouldHideNavbar ? "20px" : "110px",
          marginBottom: "100px",
          width: "100%",
          maxWidth: isSalesEntryPage ? "100%" : undefined,
        }}
      >
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      {!shouldHideNavbar && (
        <nav
          className="navbar navbar-expand-lg navbar-dark fixed-bottom shadow-lg"
          style={{
            backgroundColor: "#004d00",
            width: "100%",
            zIndex: 1030,
            paddingTop: "4px",
            paddingBottom: "4px",
            minHeight: "50px",
          }}
        >
          <div className="container-fluid d-flex justify-content-start align-items-center overflow-auto">
            {/* Bottom Password Input */}
            <input
              type="password"
              placeholder="Password"
              value={bottomPassword}
              onChange={handleBottomPasswordChange}
              className="form-control fw-bold px-2 py-1 me-3"
              style={{
                width: "120px",
                backgroundColor: "#003300",
                color: "#fff",
                border: "2px solid #66bb6a",
                fontSize: "14px",
                height: "32px",
              }}
            />

            {/* Bottom Navigation Links */}
            <div className="d-flex flex-nowrap align-items-center">
              <button
                type="button"
                onClick={openItemReportModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "14px",
                  margin: "0 12px",
                  padding: "4px 6px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.3px",
                }}
              >
                එළවළු
              </button>
              <button
                type="button"
                onClick={openWeightReportModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "14px",
                  margin: "0 12px",
                  padding: "4px 6px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.3px",
                }}
              >
                බර මත
              </button>
              <button
                type="button"
                onClick={openSalesAdjustmentReportModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "14px",
                  margin: "0 12px",
                  padding: "4px 6px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.3px",
                }}
              >
                වෙනස් කිරීම
              </button>
              <button
                type="button"
                onClick={() => navigate("/financial-report")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "14px",
                  margin: "0 12px",
                  padding: "4px 6px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.3px",
                }}
              >
                ආදායම් / වියදම්
              </button>
              <button
                type="button"
                onClick={openSalesReportModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "14px",
                  margin: "0 12px",
                  padding: "4px 6px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.3px",
                }}
              >
                විකුණුම් වාර්තාව
              </button>
              <button
                type="button"
                onClick={handleProfitReportClick}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "14px",
                  margin: "0 12px",
                  padding: "4px 6px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.3px",
                }}
              >
                සැපයුම් ලාභ
              </button>
              <button
                type="button"
                onClick={handleSupplierReportClick}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "14px",
                  margin: "0 12px",
                  padding: "4px 6px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.3px",
                }}
              >
                සැපයුම් වාර්තාව
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Modals */}
      <ItemReportModal
        isOpen={isItemReportModalOpen}
        onClose={closeItemReportModal}
        onGenerateReport={() => {}}
        loading={false}
      />
      <WeightReportModal
        isOpen={isWeightReportModalOpen}
        onClose={closeWeightReportModal}
      />
      <GrnSaleReportModal
        isOpen={isGrnSaleReportModalOpen}
        onClose={closeGrnSaleReportModal}
      />
      <SalesAdjustmentReportModal
        isOpen={isSalesAdjustmentReportModalOpen}
        onClose={closeSalesAdjustmentReportModal}
      />
      <GrnSalesOverviewReport
        isOpen={isGrnSalesOverviewReportOpen}
        onClose={closeGrnSalesOverviewReport}
      />
      <GrnSalesOverviewReport2
        isOpen={isGrnSalesOverviewReport2Open}
        onClose={closeGrnSalesOverviewReport2}
      />
      <SalesReportModal
        isOpen={isSalesReportModalOpen}
        onClose={closeSalesReportModal}
      />
      <GrnReportModal
        isOpen={isGrnReportModalOpen}
        onClose={closeGrnReportModal}
      />
      <DayProcessModal
        isOpen={isDayProcessModalOpen}
        onClose={closeDayProcessModal}
      />
      <TodaysKuliyaModal
        isOpen={isTodaysKuliyaModalOpen}
        onClose={closeTodaysKuliyaModal}
      />
    </div>
  );
};

export default Layout;
