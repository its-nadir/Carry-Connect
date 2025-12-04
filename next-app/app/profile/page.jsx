"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./profile.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("trips"); // trips, orders, settings

  // Profile Data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    location: ""
  });

  // Phone Verification State
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [verificationId, setVerificationId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySuccess, setVerifySuccess] = useState("");

  // Data Lists
  const [myTrips, setMyTrips] = useState([]);
  const [myOrders, setMyOrders] = useState([]);

  useEffect(() => {
    let unsubscribeAuth;

    async function init() {
      try {
        const { onAuthChange, setupRecaptcha } = await import("../../lib/auth");
        const { getUserProfile, getUserTrips, getUserOrders } = await import("../../lib/db");

        unsubscribeAuth = onAuthChange(async (currentUser) => {
          if (!currentUser) {
            router.push("/auth");
            return;
          }

          // Fetch full profile from Firestore
          const profile = await getUserProfile(currentUser.uid);
          const userData = profile || {
            uid: currentUser.uid,
            email: currentUser.email,
            name: currentUser.displayName || "",
            phone: currentUser.phoneNumber || "",
            photoURL: currentUser.photoURL || ""
          };

          setUser(userData);
          setFormData({
            name: userData.name || "",
            email: userData.email || "",
            phone: userData.phone || "",
            bio: userData.bio || "",
            location: userData.location || ""
          });
          setPhoneVerified(!!userData.phoneVerified); // Ensure boolean

          // Fetch Trips and Orders
          const trips = await getUserTrips(currentUser.uid);
          setMyTrips(trips);

          const orders = await getUserOrders(currentUser.uid);
          setMyOrders(orders);

          setLoading(false);

          // Setup Recaptcha for phone verification
          setupRecaptcha("recaptcha-container");
        });
      } catch (error) {
        console.error("Error initializing profile:", error);
        setLoading(false);
      }
    }

    init();
    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      // Clear recaptcha on unmount
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, [router]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { updateUserProfile } = await import("../../lib/db");
      await updateUserProfile(user.uid, formData);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    }
  };

  const handleVerifyPhone = async () => {
    if (!formData.phone) {
      alert("Please enter a phone number first.");
      return;
    }

    setVerifyError("");
    setVerifySuccess("");
    setIsVerifyingPhone(true);

    try {
      const { linkPhoneNumber, setupRecaptcha } = await import("../../lib/auth");
      const appVerifier = setupRecaptcha("recaptcha-container");

      // Format phone number if needed (basic check)
      let phoneToVerify = formData.phone;
      if (!phoneToVerify.startsWith("+")) {
        // Assume US/Spain for now or ask user, but for test we use +1
        // If user didn't add +, warn them or try to add it?
        // Better to let Firebase handle validation or show error
      }

      const confirmationResult = await linkPhoneNumber(user, phoneToVerify, appVerifier);
      setVerificationId(confirmationResult);
      setVerifySuccess("Code sent! Please check your SMS.");
    } catch (error) {
      console.error("Error sending code:", error);
      let msg = "Failed to send code.";
      if (error.code === 'auth/invalid-phone-number') msg = "Invalid phone number format. Use +[CountryCode][Number] (e.g. +15555555555)";
      if (error.code === 'auth/operation-not-allowed') msg = "Phone auth not enabled in Firebase Console.";
      setVerifyError(msg);
    }
  };

  const handleConfirmPhone = async () => {
    if (!verificationId || !verificationCode) return;

    try {
      // Confirm the code
      await verificationId.confirm(verificationCode);

      // Update Firestore
      const { updateUserProfile } = await import("../../lib/db");
      await updateUserProfile(user.uid, {
        phone: formData.phone,
        phoneVerified: true
      });

      setPhoneVerified(true);
      setIsVerifyingPhone(false);
      setVerifySuccess("Phone verified successfully!");
      alert("Phone verified!");
    } catch (error) {
      console.error("Error confirming code:", error);
      setVerifyError("Invalid code. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      const { logOut } = await import("../../lib/auth");
      await logOut();
      router.push("/auth");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading profile...</div>;
  }

  if (!user) return null;

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {user.photoURL ? <img src={user.photoURL} alt="Profile" /> : (user.name?.[0] || "U")}
        </div>
        <div className={styles.userInfo}>
          <h1>{user.name || "User"}</h1>
          <p>{user.email}</p>
          <div className={styles.badges}>
            {phoneVerified ? (
              <span className={styles.verifiedBadge}><i className="fa-solid fa-check"></i> Phone Verified</span>
            ) : (
              <span className={styles.unverifiedBadge}>Phone Pending</span>
            )}
          </div>
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>Log Out</button>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'trips' ? styles.active : ''}`}
          onClick={() => setActiveTab('trips')}
        >
          My Trips
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'orders' ? styles.active : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          My Orders
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'trips' && (
          <div className={styles.grid}>
            {myTrips.length === 0 ? (
              <p>No trips posted yet.</p>
            ) : (
              myTrips.map(trip => (
                <div key={trip.id} className={styles.card}>
                  <h3>{trip.from} → {trip.to}</h3>
                  <p>{new Date(trip.date).toLocaleDateString()}</p>
                  <span className={styles.status}>{trip.status || 'Active'}</span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className={styles.grid}>
            {myOrders.length === 0 ? (
              <p>No orders yet.</p>
            ) : (
              myOrders.map(order => (
                <div key={order.id} className={styles.card}>
                  <h3>Order #{order.id.slice(0, 8)}</h3>
                  <p>Status: {order.status}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className={styles.settingsForm}>
            <h2>Edit Profile</h2>
            <form onSubmit={handleUpdateProfile}>
              <div className={styles.inputGroup}>
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Phone Number</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                  {!phoneVerified && (
                    <button type="button" onClick={handleVerifyPhone} className={styles.verifyBtn}>
                      Verify
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  rows="3"
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <button type="submit" className={styles.saveBtn}>Save Changes</button>
            </form>
          </div>
        )}
      </div>

      {/* Recaptcha Container */}
      <div id="recaptcha-container"></div>

      {/* Phone Verification Modal */}
      {isVerifyingPhone && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Verify Phone Number</h3>
            <p className={styles.modalText}>
              Enter the 6-digit code sent to {formData.phone}
            </p>

            {verifyError && <p className={styles.errorText}>{verifyError}</p>}
            {verifySuccess && <p className={styles.successText}>{verifySuccess}</p>}

            {!verificationId ? (
              <div className={styles.loadingSpinner}>Sending code...</div>
            ) : (
              <>
                <input
                  type="text"
                  className={styles.modalInput}
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                />
                <div className={styles.modalActions}>
                  <button
                    className={styles.cancelBtn}
                    onClick={() => setIsVerifyingPhone(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.confirmBtn}
                    onClick={handleConfirmPhone}
                  >
                    Verify
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
