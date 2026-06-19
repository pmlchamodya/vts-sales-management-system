import React, { useState, useEffect } from "react";
import * as faceapi from "face-api.js";
import { supplierService } from "../../services/supplierService";
import { useNavigate, Link } from "react-router-dom";
import Layout from "../Layout/Layout"; // ✅ Added Layout wrapper like in CreateItem.jsx

const CreateSupplier = () => {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    address: "",
    dob: "",
    telephone_no: "",
    bank_name: "",
    payment_to: "",
    account_type: "",
    account_number: "",
    profile_pic: null,
    nic_front: null,
    nic_back: null,
  });

  const [previews, setPreviews] = useState({
    profile_pic: null,
    nic_front: null,
    nic_back: null,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const navigate = useNavigate();

  // =================== Load Face API Models ===================
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        setModelsLoaded(true);
      } catch (err) {
        console.error("Model loading error:", err);
      }
    };
    loadModels();
  }, []);

  // =================== Face Detection ===================
  const detectFace = async (file) => {
    if (!modelsLoaded) return true;
    const img = await faceapi.bufferToImage(file);
    const detection = await faceapi.detectSingleFace(
      img,
      new faceapi.TinyFaceDetectorOptions(),
    );
    return !!detection;
  };

  // =================== Check Duplicate Code ===================
  const checkDuplicateCode = async (code) => {
    try {
      const response = await supplierService.checkCode(code);
      return response.data.exists;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // =================== Handle Input Change ===================
  const handleChange = async (e) => {
    const { name, value } = e.target;

    if (name === "code") {
      const upperCode = value.toUpperCase();
      setFormData((prev) => ({ ...prev, code: upperCode }));

      if (upperCode.length > 0) {
        const isDuplicate = await checkDuplicateCode(upperCode);
        setErrors((prev) => ({
          ...prev,
          code: isDuplicate ? "මෙම කේතය දැනටමත් පවතිනවා" : null,
        }));
      } else {
        setErrors((prev) => ({ ...prev, code: null }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // =================== Handle File Change ===================
  const handleFileChange = async (e) => {
    const { name, files } = e.target;
    if (!files || !files[0]) return;

    const file = files[0];

    if (name === "profile_pic") {
      const hasFace = await detectFace(file);
      if (!hasFace) {
        alert("මුහුණක් හමු නොවීය. කරුණාකර නිවැරදි ඡායාරූපයක් තෝරන්න.");
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: file }));
    const previewURL = URL.createObjectURL(file);

    setPreviews((prev) => {
      if (prev[name] && prev[name].startsWith("blob:")) {
        URL.revokeObjectURL(prev[name]);
      }
      return { ...prev, [name]: previewURL };
    });
  };

  // =================== Handle Submit ===================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (errors.code) {
      alert("මෙම කේතය දැනටමත් පවතිනවා. වෙනත් කේතයක් තෝරන්න.");
      return;
    }

    setLoading(true);
    setErrors({});

    const data = new FormData();
    data.append("code", formData.code);
    data.append("name", formData.name);
    data.append("address", formData.address);
    data.append("dob", formData.dob);
    data.append("telephone_no", formData.telephone_no);
    data.append("bank_name", formData.bank_name);
    data.append("payment_to", formData.payment_to);
    data.append("account_type", formData.account_type);
    data.append("account_number", formData.account_number);

    if (formData.profile_pic) data.append("profile_pic", formData.profile_pic);
    if (formData.nic_front) data.append("nic_front", formData.nic_front);
    if (formData.nic_back) data.append("nic_back", formData.nic_back);

    try {
      await supplierService.create(data);
      navigate("/suppliers");
    } catch (error) {
      if (error.response && error.response.status === 422) {
        setErrors(error.response.data.errors || {});
      } else {
        setErrors({ general: "Error creating supplier" });
      }
    } finally {
      setLoading(false);
    }
  };

  const previewBoxStyle = {
    width: "120px",
    height: "120px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    overflow: "hidden",
    marginTop: "8px",
  };

  const previewImageStyle = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  };

  return (
    <Layout>
      <div className="container-fluid mt-5">
        <div className="row justify-content-center">
          {/* ✅ Made the form take more width for better layout of two columns */}
          <div className="col-md-10 col-lg-8">
            <div className="custom-card">
              <h2
                className="text-center mb-5"
                style={{
                  color: "#ffffff",
                  fontSize: "32px",
                  fontWeight: "bold",
                }}
              >
                + නව සැපයුම්කරු
              </h2>

              {errors.general && (
                <div
                  className="alert alert-danger"
                  style={{ fontSize: "18px" }}
                >
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="row">
                  {/* Code */}
                  <div className="col-md-6 mb-4">
                    <label
                      className="form-label text-white"
                      style={{ fontSize: "20px", fontWeight: "bold" }}
                    >
                      කේතය (Code)
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={handleChange}
                      className={`form-control form-control-lg ${errors.code ? "is-invalid" : ""}`}
                      style={{ fontSize: "20px" }}
                      required
                    />
                    {errors.code && (
                      <div
                        className="invalid-feedback"
                        style={{ fontSize: "16px" }}
                      >
                        {errors.code}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div className="col-md-6 mb-4">
                    <label
                      className="form-label text-white"
                      style={{ fontSize: "20px", fontWeight: "bold" }}
                    >
                      නම (Name)
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-control form-control-lg"
                      style={{ fontSize: "20px" }}
                      required
                    />
                  </div>

                  {/* Telephone Number */}
                  <div className="col-md-6 mb-4">
                    <label
                      className="form-label text-white"
                      style={{ fontSize: "20px", fontWeight: "bold" }}
                    >
                      දුරකථන අංකය (Telephone No)
                    </label>
                    <input
                      type="text"
                      name="telephone_no"
                      value={formData.telephone_no}
                      onChange={handleChange}
                      className="form-control form-control-lg"
                      style={{ fontSize: "20px" }}
                      required
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="col-md-6 mb-4">
                    <label
                      className="form-label text-white"
                      style={{ fontSize: "20px", fontWeight: "bold" }}
                    >
                      උපන් දිනය (Date of Birth)
                    </label>
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className="form-control form-control-lg"
                      style={{ fontSize: "20px" }}
                      required
                    />
                  </div>

                  {/* Address */}
                  <div className="col-12 mb-5">
                    <label
                      className="form-label text-white"
                      style={{ fontSize: "20px", fontWeight: "bold" }}
                    >
                      ලිපිනය (Address)
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="form-control form-control-lg"
                      rows="3"
                      style={{ fontSize: "20px" }}
                      required
                    />
                  </div>

                  {/* ================= NEW BANK DETAILS SECTION ================= */}
                  <div className="col-12 mb-4">
                    <h4
                      className="text-warning mb-3 fw-bold border-bottom pb-2"
                      style={{ fontSize: "24px" }}
                    >
                      Bank Details
                    </h4>
                  </div>

                  {/* Bank Name */}
                  <div className="col-md-6 mb-4">
                    <label
                      className="form-label text-white"
                      style={{ fontSize: "20px", fontWeight: "bold" }}
                    >
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="bank_name"
                      value={formData.bank_name}
                      onChange={handleChange}
                      className="form-control form-control-lg"
                      style={{ fontSize: "20px" }}
                    />
                  </div>

                  {/* Payment To */}
                  <div className="col-md-6 mb-4">
                    <label
                      className="form-label text-white"
                      style={{ fontSize: "20px", fontWeight: "bold" }}
                    >
                      Payment To
                    </label>
                    <input
                      type="text"
                      name="payment_to"
                      value={formData.payment_to}
                      onChange={handleChange}
                      className="form-control form-control-lg"
                      style={{ fontSize: "20px" }}
                    />
                  </div>

                  {/* Account Type */}
                  <div className="col-md-6 mb-4">
                    <label
                      className="form-label text-white"
                      style={{ fontSize: "20px", fontWeight: "bold" }}
                    >
                      Account Type
                    </label>
                    <select
                      name="account_type"
                      value={formData.account_type}
                      onChange={handleChange}
                      className="form-control form-control-lg"
                      style={{ fontSize: "20px" }}
                    >
                      <option value="">-- Select Type --</option>
                      <option value="saving">Saving</option>
                      <option value="current">Current</option>
                    </select>
                  </div>

                  {/* Account Number */}
                  <div className="col-md-6 mb-5">
                    <label
                      className="form-label text-white"
                      style={{ fontSize: "20px", fontWeight: "bold" }}
                    >
                      Account Number
                    </label>
                    <input
                      type="text"
                      name="account_number"
                      value={formData.account_number}
                      onChange={handleChange}
                      className="form-control form-control-lg"
                      style={{ fontSize: "20px" }}
                    />
                  </div>
                  {/* ========================================================== */}

                  {/* File Uploads */}
                  <div className="col-md-4 mb-4 mt-3">
                    <label
                      className="form-label text-white"
                      style={{ fontSize: "18px", fontWeight: "bold" }}
                    >
                      ඡායාරූපය (Photo)
                    </label>
                    <input
                      type="file"
                      name="profile_pic"
                      onChange={handleFileChange}
                      className="form-control form-control-lg"
                      accept="image/*"
                      style={{ fontSize: "16px" }}
                    />
                    {previews.profile_pic && (
                      <div style={previewBoxStyle}>
                        <img
                          src={previews.profile_pic}
                          alt="preview"
                          style={previewImageStyle}
                        />
                      </div>
                    )}
                  </div>

                  <div className="col-md-4 mb-4 mt-3">
                    <label
                      className="form-label text-white"
                      style={{ fontSize: "18px", fontWeight: "bold" }}
                    >
                      NIC (Front)
                    </label>
                    <input
                      type="file"
                      name="nic_front"
                      onChange={handleFileChange}
                      className="form-control form-control-lg"
                      accept="image/*"
                      style={{ fontSize: "16px" }}
                    />
                    {previews.nic_front && (
                      <div style={previewBoxStyle}>
                        <img
                          src={previews.nic_front}
                          alt="preview"
                          style={previewImageStyle}
                        />
                      </div>
                    )}
                  </div>

                  <div className="col-md-4 mb-4 mt-3">
                    <label
                      className="form-label text-white"
                      style={{ fontSize: "18px", fontWeight: "bold" }}
                    >
                      NIC (Back)
                    </label>
                    <input
                      type="file"
                      name="nic_back"
                      onChange={handleFileChange}
                      className="form-control form-control-lg"
                      accept="image/*"
                      style={{ fontSize: "16px" }}
                    />
                    {previews.nic_back && (
                      <div style={previewBoxStyle}>
                        <img
                          src={previews.nic_back}
                          alt="preview"
                          style={previewImageStyle}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center mt-5 d-flex justify-content-center gap-4">
                  <button
                    type="submit"
                    className="btn btn-light btn-lg fw-bold px-5"
                    disabled={loading}
                    style={{ color: "#004d00", fontSize: "22px" }}
                  >
                    {loading ? "Adding..." : "ADD"}
                  </button>
                  <Link
                    to="/suppliers"
                    className="btn btn-outline-light btn-lg px-5 fw-bold"
                    style={{ fontSize: "22px" }}
                  >
                    CANCEL
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
            color: #ffffff;
            font-size: 22px;
            margin-bottom: 10px;
          }
        `}</style>
      </div>
    </Layout>
  );
};

export default CreateSupplier;
