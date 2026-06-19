import React, { useState, useEffect } from "react";
import api from "../../api"; // ← Use global axios instance
import { Link, useNavigate } from "react-router-dom";

const SupplierList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // ⭐ LOCALHOST STORAGE LINK
  const STORAGE_URL =
    "https://goviraju.lk/DBS_backend_30500/application/public/storage/";

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const response = await api.get("/suppliers");
      setSuppliers(response.data);
    } catch (error) {
      console.error("Error loading suppliers:", error);
      setMessage("Error loading suppliers");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const handleSearch = async (value) => {
    setSearchTerm(value);

    if (value.trim() === "") {
      loadSuppliers();
      return;
    }

    try {
      const response = await api.get(`/suppliers/search/${value}`);
      setSuppliers(response.data);
    } catch (error) {
      console.error("Error searching suppliers:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("මෙම සැපයුම්කරු මකන්නද?")) {
      try {
        await api.delete(`/suppliers/${id}`);
        setMessage("Supplier deleted successfully!");
        loadSuppliers();
      } catch (error) {
        console.error("Error deleting supplier:", error);
        setMessage("Error deleting supplier");
      }
    }
  };

  // Helper to render images in table cells
  const renderImage = (path, alt) => {
    if (!path)
      return (
        <span className="text-muted fw-bold" style={{ fontSize: "16px" }}>
          නැත
        </span>
      );
    return (
      <a href={`${STORAGE_URL}${path}`} target="_blank" rel="noreferrer">
        <img
          src={`${STORAGE_URL}${path}`}
          alt={alt}
          className="rounded shadow-sm"
          style={{
            width: "60px",
            height: "60px",
            objectFit: "cover",
            border: "2px solid #dee2e6",
          }}
        />
      </a>
    );
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center vh-100"
        style={{ backgroundColor: "#99ff99" }}
      >
        <div
          className="spinner-border text-success"
          role="status"
          style={{ width: "3rem", height: "3rem" }}
        >
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

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
        style={{
          width: "280px", // ✅ Sidebar width slightly increased
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
          style={{ fontSize: "24px" }} // ✅ Font size increased
        >
          <i className="material-icons me-2" style={{ fontSize: "28px" }}>
            warehouse
          </i>
          මුල් පිටුව
        </Link>

        <h6
          className="text-uppercase text-light opacity-75 fw-bold mb-3 mt-2"
          style={{ fontSize: "18px" }} // ✅ Font size increased
        >
          ප්‍රධාන දත්ත
        </h6>
        <ul className="list-unstyled flex-grow-1">
          <li className="mb-2 mt-2">
            <Link
              to="/customers"
              className="nav-link text-white d-flex align-items-center p-2 rounded"
              style={{ fontSize: "20px" }} // ✅ Font size increased
            >
              <i className="material-icons me-2" style={{ fontSize: "24px" }}>
                people
              </i>{" "}
              ගනුදෙනුකරුවන්
            </Link>
          </li>
          <li className="mb-2 mt-2">
            <Link
              to="/items"
              className="nav-link text-white d-flex align-items-center p-2 rounded"
              style={{ fontSize: "20px" }} // ✅ Font size increased
            >
              <i className="material-icons me-2" style={{ fontSize: "24px" }}>
                inventory_2
              </i>{" "}
              අයිතමය
            </Link>
          </li>
          <li className="mb-2 mt-2">
            <Link
              to="/suppliers"
              className="nav-link text-white d-flex align-items-center p-2 rounded"
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                fontSize: "20px", // ✅ Font size increased
              }}
            >
              <i className="material-icons me-2" style={{ fontSize: "24px" }}>
                local_shipping
              </i>{" "}
              සැපයුම්කරුවන්
            </Link>
          </li>
          <li className="mb-2 mt-2">
            <Link
              to="/commissions"
              className="nav-link text-white d-flex align-items-center p-2 rounded"
              style={{ fontSize: "20px" }} // ✅ Font size increased
            >
              <i className="material-icons me-2" style={{ fontSize: "24px" }}>
                attach_money
              </i>{" "}
              කොමිෂන්
            </Link>
          </li>
          <hr className="bg-light mt-4" />
        </ul>

        <div className="mt-auto pt-3 border-top border-secondary">
          <button
            onClick={handleLogout}
            className="btn btn-outline-light w-100 fw-bold d-flex align-items-center justify-content-center"
            style={{ fontSize: "20px", padding: "12px" }} // ✅ Font size increased
          >
            <i className="material-icons me-2" style={{ fontSize: "24px" }}>
              logout
            </i>
            ඉවත් වන්න
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div
        style={{
          marginLeft: "280px", // Adjusted for wider sidebar
          flexGrow: 1,
          padding: "40px 50px", // Increased padding
          width: "calc(100vw - 280px)",
        }}
      >
        <div
          className="card shadow-lg border-0 rounded-4"
          style={{
            backgroundColor: "#006400",
            color: "#fff",
            overflow: "hidden",
            padding: "30px", // Increased padding
          }}
        >
          <div className="card-header border-0 pb-4 text-center bg-transparent">
            <h2
              className="fw-bold mb-0 text-white"
              style={{ fontSize: "34px" }} // ✅ Font size increased
            >
              📦 සැපයුම්කරුවන් (Suppliers)
            </h2>
          </div>

          <div className="card-body bg-light text-dark rounded-3 p-4">
            {/* Top Bar */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-4 gap-3">
              <Link
                to="/suppliers/create"
                className="btn btn-success fw-bold px-4 py-2 shadow-sm"
                style={{ fontSize: "18px" }} // ✅ Font size increased
              >
                + නව සැපයුම්කරු
              </Link>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value.toUpperCase())}
                className="form-control py-2 px-3 border-secondary shadow-sm"
                placeholder="සොයන්න..."
                style={{
                  maxWidth: "400px",
                  textTransform: "uppercase",
                  fontSize: "18px", // ✅ Font size increased
                  fontWeight: "bold",
                  padding: "10px 15px",
                }}
              />
            </div>

            {/* Message */}
            {message && (
              <div
                className={`alert ${message.includes("Error") ? "alert-danger" : "alert-success"} text-center py-3 fw-bold`}
                style={{ fontSize: "18px" }} // ✅ Font size increased
              >
                {message}
              </div>
            )}

            {/* Table */}
            <div className="table-responsive">
              <table className="table table-hover table-bordered align-middle mb-0 bg-white shadow-sm">
                <thead style={{ backgroundColor: "#004d00", color: "white" }}>
                  <tr className="text-center" style={{ fontSize: "20px" }}>
                    {" "}
                    {/* ✅ Font size increased */}
                    <th className="py-3">ඡායාරූපය</th>
                    <th className="py-3">සංකේතය</th>
                    <th className="py-3">නම</th>
                    <th className="py-3">උපන් දිනය</th>
                    <th className="py-3">දුරකථන</th>
                    <th className="py-3">ලිපිනය</th>
                    <th className="py-3">NIC (F/B)</th>
                    <th className="py-3">මෙහෙයුම්</th>
                  </tr>
                </thead>

                <tbody style={{ fontSize: "18px" }}>
                  {" "}
                  {/* ✅ Font size increased */}
                  {suppliers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="text-center text-danger fw-bold py-5"
                        style={{ fontSize: "20px" }} // ✅ Font size increased
                      >
                        සැපයුම්කරුවන් නොමැත
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((supplier) => (
                      <tr key={supplier.id} className="text-center">
                        <td className="py-3">
                          {renderImage(supplier.profile_pic, "Profile")}
                        </td>
                        <td
                          style={{ textTransform: "uppercase" }}
                          className="fw-bold text-primary py-3"
                        >
                          {supplier.code}
                        </td>
                        <td className="py-3 fw-semibold">{supplier.name}</td>
                        <td className="py-3">{supplier.dob || "---"}</td>
                        <td className="py-3 fw-bold text-secondary">
                          {supplier.telephone_no}
                        </td>
                        <td
                          className="py-3"
                          style={{
                            maxWidth: "200px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={supplier.address}
                        >
                          {supplier.address}
                        </td>
                        <td className="py-3">
                          <div className="d-flex justify-content-center gap-3">
                            {renderImage(supplier.nic_front, "NIC Front")}
                            {renderImage(supplier.nic_back, "NIC Back")}
                          </div>
                        </td>
                        <td className="py-3">
                          <Link
                            to={`/suppliers/edit/${supplier.id}`}
                            className="btn btn-warning px-3 py-2 me-2 fw-bold shadow-sm"
                            style={{ fontSize: "16px" }} // ✅ Font size increased
                          >
                            සංස්කරණය
                          </Link>

                          <button
                            onClick={() => handleDelete(supplier.id)}
                            className="btn btn-danger px-3 py-2 fw-bold shadow-sm"
                            style={{ fontSize: "16px" }} // ✅ Font size increased
                          >
                            මකන්න
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ⭐ NEW BIRTHDAY REPORT BUTTON BELOW TABLE */}
            <div className="d-flex justify-content-end mt-4">
              <Link
                to="/suppliers/dobreport"
                className="btn btn-primary fw-bold px-4 py-2 shadow-sm d-flex align-items-center"
                style={{ fontSize: "18px" }} // ✅ Font size increased
              >
                <i className="material-icons me-2" style={{ fontSize: "24px" }}>
                  cake
                </i>
                උපන් දින වාර්තාව (Birthday Report)
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierList;
