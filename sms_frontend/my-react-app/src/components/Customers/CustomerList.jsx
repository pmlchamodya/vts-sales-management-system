import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomerForm from "./CustomerForm";
import api from "../../api";

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // ✅ State for search
  const navigate = useNavigate();

  const STORAGE_URL =
    "https://goviraju.lk/DBS_backend_30500/application/public/storage/";

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // ✅ Filter Logic: Matches the start of the short_name
  const filteredCustomers = customers.filter((c) =>
    c.short_name.toLowerCase().startsWith(searchTerm.toLowerCase()),
  );

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  const handleCreate = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("මෙම පාරිභෝගිකයා මකන්නද?")) return;
    try {
      const res = await api.delete(`/customers/${id}`);
      if (res.status === 200) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        alert("පාරිභෝගිකයා සාර්ථකව මකන ලදී!");
      }
    } catch (err) {
      console.error("Failed to delete customer:", err);
      alert("දෝෂයක් සිදු විය.");
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingCustomer) {
        await api.post(`/customers/update/${editingCustomer.id}`, data);
      } else {
        await api.post("/customers", data);
      }
      setShowForm(false);
      fetchCustomers();
      alert("සාර්ථකව සුරැකිණි!");
    } catch (err) {
      console.error("Failed to save customer:", err);
    }
  };

  const renderImage = (path, alt) => {
    if (!path) return <span className="text-muted small">නැත</span>;
    return (
      <a href={`${STORAGE_URL}${path}`} target="_blank" rel="noreferrer">
        <img
          src={`${STORAGE_URL}${path}`}
          alt={alt}
          style={{
            width: "60px",
            height: "60px",
            objectFit: "cover",
            borderRadius: "8px",
            border: "1px solid #ddd",
          }}
        />
      </a>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#99ff99",
      }}
    >
      {/* --- SIDEBAR --- */}
      <div
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
          style={{ fontSize: "20px" }}
        >
          <i className="material-icons me-2" style={{ fontSize: "24px" }}>
            warehouse
          </i>{" "}
          මුල් පිටුව
        </Link>
        <h6
          className="text-uppercase text-light opacity-75 fw-bold mb-3"
          style={{ fontSize: "16px" }}
        >
          ප්‍රධාන දත්ත
        </h6>
        <ul className="list-unstyled flex-grow-1">
          <li className="mb-2">
            <Link
              to="/customers"
              className="nav-link text-white d-flex align-items-center p-2 rounded"
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                fontSize: "18px",
              }}
            >
              <i className="material-icons me-2" style={{ fontSize: "22px" }}>
                people
              </i>{" "}
              ගනුදෙනුකරුවන්
            </Link>
          </li>
          <li className="mb-2">
            <Link
              to="/items"
              className="nav-link text-white d-flex align-items-center p-2 rounded"
              style={{ fontSize: "18px" }}
            >
              <i className="material-icons me-2" style={{ fontSize: "22px" }}>
                inventory_2
              </i>{" "}
              අයිතමය
            </Link>
          </li>
          <li className="mb-2">
            <Link
              to="/suppliers"
              className="nav-link text-white d-flex align-items-center p-2 rounded"
              style={{ fontSize: "18px" }}
            >
              <i className="material-icons me-2" style={{ fontSize: "22px" }}>
                local_shipping
              </i>{" "}
              සැපයුම්කරුවන්
            </Link>
          </li>
        </ul>
        <div className="mt-auto pt-3 border-top border-secondary">
          <button
            onClick={handleLogout}
            className="btn btn-outline-light w-100 fw-bold d-flex align-items-center justify-content-center"
            style={{ fontSize: "18px", padding: "10px" }}
          >
            <i className="material-icons me-2" style={{ fontSize: "22px" }}>
              logout
            </i>
            ඉවත් වන්න
          </button>
        </div>
      </div>

      {/* --- CONTENT --- */}
      <div
        style={{
          marginLeft: "260px",
          flexGrow: 1,
          padding: "30px",
          width: "calc(100vw - 260px)",
        }}
      >
        {!showForm ? (
          <div
            style={{
              backgroundColor: "#006400",
              borderRadius: "12px",
              padding: "30px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <h2
              className="text-center text-white mb-4"
              style={{ fontSize: "32px", fontWeight: "bold" }}
            >
              පාරිභෝගික ලැයිස්තුව
            </h2>

            <div className="row mb-4 align-items-center">
              {/* ✅ SEARCH BAR COMPONENT */}
              <div className="col-md-6">
                <div className="input-group">
                  <span className="input-group-text bg-light border-0 px-3">
                    <i
                      className="material-icons text-dark"
                      style={{ fontSize: "24px" }}
                    >
                      search
                    </i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-0 shadow-none py-2"
                    placeholder="කෙටි නම අනුව සොයන්න (Search by Short Name)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      textTransform: "uppercase",
                      fontSize: "18px",
                      fontWeight: "bold",
                    }}
                  />
                </div>
              </div>
              <div className="col-md-6 text-end">
                <button
                  className="btn btn-success fw-bold py-2 px-4"
                  onClick={handleCreate}
                  style={{ fontSize: "18px" }}
                >
                  + නව පාරිභෝගිකයෙකු එකතු කරන්න
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-bordered table-hover align-middle bg-white">
                <thead>
                  <tr
                    style={{
                      backgroundColor: "#e6f0ff",
                      color: "#003366",
                      textAlign: "center",
                      fontSize: "20px",
                    }}
                  >
                    <th className="py-3">ඡායාරූපය</th>
                    <th className="py-3">කෙටි නම</th>
                    <th className="py-3">සම්පූර්ණ නම</th>
                    <th className="py-3">දුරකථන අංකය</th>
                    <th className="py-3">NIC (F / B)</th>
                    <th className="py-3">ණය සීමාව (Rs.)</th>
                    <th className="py-3">මෙහෙයුම්</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: "18px" }}>
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="7"
                        className="text-center py-5 fw-bold text-danger"
                        style={{ fontSize: "20px" }}
                      >
                        {searchTerm
                          ? `"${searchTerm}" නම සහිත පාරිභෝගිකයන් හමු නොවීය`
                          : "පාරිභෝගිකයන් නොමැත"}
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => (
                      <tr key={c.id} style={{ textAlign: "center" }}>
                        <td className="py-2">
                          {renderImage(c.profile_pic, "Profile")}
                        </td>
                        <td className="text-uppercase fw-bold text-primary py-3">
                          {c.short_name}
                        </td>
                        <td className="py-3 fw-semibold">{c.name}</td>
                        <td className="fw-bold py-3 text-secondary">
                          {c.telephone_no || (
                            <span className="text-muted small">නැත</span>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="d-flex justify-content-center gap-2">
                            {renderImage(c.nic_front, "NIC Front")}
                            {renderImage(c.nic_back, "NIC Back")}
                          </div>
                        </td>
                        <td className="py-3 fw-bold text-success">
                          Rs. {Number(c.credit_limit).toFixed(2)}
                        </td>
                        <td className="py-3">
                          <button
                            className="btn btn-warning fw-bold px-3 py-2 me-2"
                            onClick={() => handleEdit(c)}
                            style={{ fontSize: "16px" }}
                          >
                            යාවත්කාලීන
                          </button>
                          <button
                            className="btn btn-danger fw-bold px-3 py-2"
                            onClick={() => handleDelete(c.id)}
                            style={{ fontSize: "16px" }}
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
          </div>
        ) : (
          <div className="card shadow-lg border-0">
            <div className="card-body p-0">
              <CustomerForm
                customer={editingCustomer}
                onSubmit={handleFormSubmit}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
