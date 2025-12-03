"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./addtrip.module.css";

export default function AddTripPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    from: "",
    to: "",
    date: "",
    transportType: "Flight",
    packageSize: "Small package (up to 2kg)",
    price: "",
    description: ""
  });

  useEffect(() => {
    // Check if user is logged in
    async function checkAuth() {
      try {
        const { getCurrentUser } = await import("../../lib/auth");
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          alert("Please login first!");
          router.push("/auth");
        } else {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Auth error:", error);
        router.push("/auth");
      }
    }
    checkAuth();
  }, [router]);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting trip form...", formData);
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      console.log("Importing postTrip...");
      const { postTrip } = await import("../../lib/db");

      console.log("Calling postTrip...");
      await postTrip({
        ...formData,
        price: parseFloat(formData.price),
      });

      console.log("Trip posted successfully!");
      setSuccessMsg("Trip posted successfully! Redirecting...");
      setTimeout(() => router.push("/my-trips"), 1500);
    } catch (error) {
      console.error("Error creating trip:", error);
      setErrorMsg("Failed to create trip: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Checking authentication...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.formBox}>
        <h1 className={styles.title}>Post Your Trip</h1>
        <p className={styles.subtitle}>
          Share your travel plans and help others send packages
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          {errorMsg && (
            <div style={{ color: 'red', background: '#ffe6e6', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center' }}>
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div style={{ color: 'green', background: '#e6fffa', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center' }}>
              {successMsg}
            </div>
          )}
          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>From (Origin)</label>
              <input
                type="text"
                name="from"
                value={formData.from}
                onChange={handleChange}
                required
                placeholder="e.g., New York, USA"
              />
            </div>

            <div className={styles.inputGroup}>
              <label>To (Destination)</label>
              <input
                type="text"
                name="to"
                value={formData.to}
                onChange={handleChange}
                required
                placeholder="e.g., London, UK"
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Travel Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Transport Type</label>
              <select
                name="transportType"
                value={formData.transportType}
                onChange={handleChange}
                required
              >
                <option value="Flight">Flight</option>
                <option value="Train">Train</option>
                <option value="Car">Car</option>
                <option value="Bus">Bus</option>
              </select>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Package Size</label>
              <select
                name="packageSize"
                value={formData.packageSize}
                onChange={handleChange}
                required
              >
                <option value="Small package (up to 2kg)">Small (up to 2kg)</option>
                <option value="Medium package (2-5kg)">Medium (2-5kg)</option>
                <option value="Large package (5-10kg)">Large (5-10kg)</option>
                <option value="Extra large (10kg+)">Extra Large (10kg+)</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label>Price ($)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="1"
                step="0.01"
                placeholder="e.g., 45"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Description (Optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Any additional information about your trip..."
              rows="4"
            />
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? "Posting..." : "Post Trip"}
          </button>
        </form>
      </div>
    </div>
  );
}
