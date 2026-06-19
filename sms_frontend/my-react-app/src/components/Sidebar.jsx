import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // Helper to check if a link is active based on current URL
  const isActive = (path) => location.pathname === path;

  const sidebarStyle = {
    width: "280px", // Slightly increased width for larger fonts
    backgroundColor: "#004d00",
    color: "white",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    top: 0,
    left: 0,
    height: "100vh",
    overflowY: "auto",
    boxShadow: "2px 0 5px rgba(0,0,0,0.2)",
    zIndex: 1000,
  };

  const linkStyle = (path) => ({
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    padding: "12px 15px",
    borderRadius: "8px",
    marginBottom: "10px",
    color: "white",
    fontSize: "18px", // ✅ Increased Font Size
    backgroundColor: isActive(path)
      ? "rgba(255, 255, 255, 0.2)"
      : "transparent",
    fontWeight: isActive(path) ? "bold" : "500",
    transition: "background 0.3s ease",
  });

  return (
    <div style={sidebarStyle}>
      {/* Section Title */}
      <h6
        className="text-uppercase text-light opacity-75 fw-bold mb-4"
        style={{
          fontSize: "16px", // ✅ Increased Title Size
          letterSpacing: "1px",
          textAlign: "left",
        }}
      >
        ප්‍රධාන දත්ත
      </h6>

      {/* Dashboard */}
      <Link
        className="fw-bold d-flex align-items-center mb-4 text-white text-decoration-none"
        to="/sales"
        style={{
          justifyContent: "flex-start",
          textAlign: "left",
          fontSize: "22px", // ✅ Increased Font Size
        }}
      >
        <i className="material-icons me-3" style={{ fontSize: "28px" }}>
          warehouse
        </i>
        මුල් පිටුව
      </Link>

      {/* Navigation */}
      <nav className="flex-grow-1 mt-2">
        <Link
          to="/customers"
          style={{
            ...linkStyle("/customers"),
            justifyContent: "flex-start",
            textAlign: "left",
          }}
        >
          <i className="material-icons me-3" style={{ fontSize: "24px" }}>
            people
          </i>
          ගනුදෙනුකරුවන්
        </Link>

        <Link
          to="/items"
          style={{
            ...linkStyle("/items"),
            justifyContent: "flex-start",
            textAlign: "left",
          }}
        >
          <i className="material-icons me-3" style={{ fontSize: "24px" }}>
            inventory_2
          </i>
          අයිතමය
        </Link>

        <Link
          to="/suppliers"
          style={{
            ...linkStyle("/suppliers"),
            justifyContent: "flex-start",
            textAlign: "left",
          }}
        >
          <i className="material-icons me-3" style={{ fontSize: "24px" }}>
            local_shipping
          </i>
          සැපයුම්කරුවන්
        </Link>

        <Link
          to="/commissions"
          style={{
            ...linkStyle("/commissions"),
            justifyContent: "flex-start",
            textAlign: "left",
          }}
        >
          <i className="material-icons me-3" style={{ fontSize: "24px" }}>
            attach_money
          </i>
          කොමිෂන්
        </Link>
      </nav>

      {/* Logout */}
      <div className="mt-auto pt-3 border-top border-secondary">
        <button
          onClick={handleLogout}
          className="btn btn-outline-light w-100 fw-bold d-flex align-items-center py-2"
          style={{
            fontSize: "18px", // ✅ Increased Font Size
            justifyContent: "flex-start",
            textAlign: "left",
          }}
        >
          <i className="material-icons me-3" style={{ fontSize: "24px" }}>
            logout
          </i>
          ඉවත් වන්න
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
