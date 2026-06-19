import React, { useState } from "react";
import api from "../../api";
import { useNavigate, Link } from "react-router-dom";

const CreateItem = () => {
  const [formData, setFormData] = useState({
    no: "",
    type: "",
    pack_cost: "",
    pack_due: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "no" ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      await api.post("/items", formData);
      navigate("/items");
    } catch (error) {
      if (error.response && error.response.status === 422) {
        setErrors(error.response.data.errors || {});
      } else {
        setErrors({ general: "Error creating item" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="custom-card">
            <h2
              className="mb-4 text-center"
              style={{ color: "#ffffff", fontSize: "32px", fontWeight: "bold" }}
            >
              නව භාණ්ඩය එක් කරන්න (Add New Item)
            </h2>

            {errors.general && (
              <div className="alert alert-danger" style={{ fontSize: "18px" }}>
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="no" className="form-label">
                  අංකය
                </label>
                <input
                  type="text"
                  id="no"
                  name="no"
                  value={formData.no}
                  onChange={handleChange}
                  className={`form-control form-control-lg ${errors.no ? "is-invalid" : ""}`}
                  required
                  style={{ textTransform: "uppercase", fontSize: "20px" }}
                />
                {errors.no && (
                  <div
                    className="invalid-feedback"
                    style={{ fontSize: "16px" }}
                  >
                    {errors.no[0]}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="type" className="form-label">
                  වර්ගය
                </label>
                <input
                  type="text"
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className={`form-control form-control-lg ${errors.type ? "is-invalid" : ""}`}
                  required
                  style={{ fontSize: "20px" }}
                />
                {errors.type && (
                  <div
                    className="invalid-feedback"
                    style={{ fontSize: "16px" }}
                  >
                    {errors.type[0]}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label htmlFor="pack_cost" className="form-label">
                  මල්ලක අගය
                </label>
                <input
                  type="number"
                  id="pack_cost"
                  name="pack_cost"
                  step="0.01"
                  value={formData.pack_cost}
                  onChange={handleChange}
                  className={`form-control form-control-lg ${errors.pack_cost ? "is-invalid" : ""}`}
                  required
                  style={{ fontSize: "20px" }}
                />
                {errors.pack_cost && (
                  <div
                    className="invalid-feedback"
                    style={{ fontSize: "16px" }}
                  >
                    {errors.pack_cost[0]}
                  </div>
                )}
              </div>

              <div className="mb-5">
                <label htmlFor="pack_due" className="form-label">
                  මල්ලක කුලිය
                </label>
                <input
                  type="number"
                  id="pack_due"
                  name="pack_due"
                  step="0.01"
                  value={formData.pack_due}
                  onChange={handleChange}
                  className={`form-control form-control-lg ${errors.pack_due ? "is-invalid" : ""}`}
                  required
                  style={{ fontSize: "20px" }}
                />
                {errors.pack_due && (
                  <div
                    className="invalid-feedback"
                    style={{ fontSize: "16px" }}
                  >
                    {errors.pack_due[0]}
                  </div>
                )}
              </div>

              <div className="d-flex justify-content-center mt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-success btn-lg me-3 px-5 py-2"
                  style={{ fontSize: "20px", fontWeight: "bold" }}
                >
                  {loading ? "Adding..." : "එක් කරන්න"}
                </button>
                <Link
                  to="/items"
                  className="btn btn-secondary btn-lg px-5 py-2"
                  style={{ fontSize: "20px", fontWeight: "bold" }}
                >
                  අවලංගු කරන්න
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
      <style jsx>{`
        .custom-card {
          background-color: #006400 !important;
          border-radius: 12px;
          padding: 40px 30px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }
        body {
          background-color: #99ff99;
        }
        .form-label {
          font-weight: 1000;
          color: #ffffff; /* Changed to white for better visibility on dark green */
          font-size: 22px;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
};

export default CreateItem;
