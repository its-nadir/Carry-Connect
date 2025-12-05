"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./profile.module.css";
import ConfirmationModal from "../components/ConfirmationModal";

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

  // Generic Modal State
  const [modalMessage, setModalMessage] = useState(null);
  const [modalType, setModalType] = useState("success"); // success, error

  // Data Lists
  const [myTrips, setMyTrips] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [myReviews, setMyReviews] = useState([]);

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

          setUser({
            ...userData,
            providerData: currentUser.providerData
          });
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

          // Fetch Reviews
          const { getUserReviews } = await import("../../lib/db");
          const reviews = await getUserReviews(currentUser.uid);
          setMyReviews(reviews);

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
      setModalType("success");
      setModalMessage("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      setModalType("error");
      setModalMessage("Failed to update profile.");
    }
  };

  const handleVerifyPhone = async () => {
    if (!formData.phone) {
      setModalType("error");
      setModalMessage("Please enter a phone number first.");
      return;
    }

    setVerifyError("");
    setVerifySuccess("");
    setIsVerifyingPhone(true);

    try {
      const { linkPhoneNumber, setupRecaptcha } = await import("../../lib/auth");
      const { auth } = await import("../../lib/firebase"); // Import auth instance

      const appVerifier = setupRecaptcha("recaptcha-container");
      if (!appVerifier) {
        throw new Error("Recaptcha not initialized");
      }

      // Format phone number if needed (basic check)
      let phoneToVerify = formData.phone;
      if (!phoneToVerify.startsWith("+")) {
        // Assume US/Spain for now or ask user, but for test we use +1
        // If user didn't add +, warn them or try to add it?
        // Better to let Firebase handle validation or show error
      }

      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }

      const confirmationResult = await linkPhoneNumber(auth.currentUser, phoneToVerify, appVerifier);
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

      setModalType("success");
      setModalMessage("Phone verified successfully!");
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setModalType("error");
      setModalMessage("File size should be less than 5MB");
      return;
    }

    try {
      const { uploadProfileImage, updateUserProfile } = await import("../../lib/db");
      const downloadURL = await uploadProfileImage(user.uid, file);

      await updateUserProfile(user.uid, { photoURL: downloadURL });
      setUser(prev => ({ ...prev, photoURL: downloadURL }));
      setModalType("success");
      setModalMessage("Profile picture updated!");
    } catch (error) {
      console.error("Error uploading image:", error);
      setModalType("error");
      setModalMessage("Failed to upload image.");
    }
  };

  const handleVerifyEmail = async () => {
    try {
      const { sendEmailVerification } = await import("../../lib/auth");
      // We need the current auth user object, not just our state user
      const { auth } = await import("../../lib/firebase");
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        setModalType("success");
        setModalMessage(`Verification email sent to ${user.email}. Please check your inbox.`);
      }
    } catch (error) {
      console.error("Error sending verification email:", error);
      setModalType("error");
      setModalMessage("Failed to send verification email. Try again later.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    try {
      const { deleteUserAccount } = await import("../../lib/auth");
      const { auth } = await import("../../lib/firebase");

      if (auth.currentUser) {
        await deleteUserAccount(auth.currentUser);
        alert("Account deleted successfully.");
        router.push("/");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        setModalType("error");
        setModalMessage("For security, please log out and log in again before deleting your account.");
      } else {
        setModalType("error");
        setModalMessage("Failed to delete account.");
      }
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading profile...</div>;
  }

  if (!user) return null;

  const isGoogleAuth = user.providerData?.some(p => p.providerId === 'google.com');

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {user.photoURL ? <img src={user.photoURL} alt="Profile" /> : (user.name?.[0] || "U")}
          <label className={styles.avatarOverlay}>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <i className="fa-solid fa-camera"></i>
          </label>
        </div>
        <div className={styles.userInfo}>
          <h1>{user.name || "User"}</h1>
          <p>{user.email}</p>
          <div className={styles.badges}>
            {user.emailVerified || isGoogleAuth ? (
              <span className={styles.verifiedBadge}><i className="fa-solid fa-check"></i> Email Verified</span>
            ) : (
              <button onClick={handleVerifyEmail} className={styles.unverifiedBadge} title="Click to verify email">
                <i className="fa-solid fa-triangle-exclamation"></i> Email Pending
              </button>
            )}
            {phoneVerified ? (
              <span className={styles.verifiedBadge}><i className="fa-solid fa-check"></i> Phone Verified</span>
            ) : (
              <button onClick={handleVerifyPhone} className={styles.unverifiedBadge} title="Click to verify phone">
                <i className="fa-solid fa-triangle-exclamation"></i> Phone Pending
              </button>
            )}
          </div>
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>Log Out</button>
      </div>

      {/* Stats Section */}
      <div className={styles.statsGrid}>
        <div className={styles.statBox}>
          <i className="fa-solid fa-plane"></i>
          <h3>{myTrips.length}</h3>
          <p>Trips Posted</p>
        </div>
        <div className={styles.statBoxGreen}>
          <i className="fa-solid fa-box"></i>
          <h3>{myOrders.length}</h3>
          <p>Orders Made</p>
        </div>
        <div className={styles.statBoxYellow}>
          <i className="fa-solid fa-star"></i>
          <h3>
            {myReviews.length > 0
              ? (myReviews.reduce((acc, r) => acc + r.rating, 0) / myReviews.length).toFixed(1)
              : "-"}
          </h3>
          <p>Rating</p>
        </div>
        <div className={styles.statBoxPurple}>
          <i className="fa-solid fa-calendar"></i>
          <h3>{new Date(user.createdAt?.seconds * 1000).getFullYear() || 2024}</h3>
          <p>Member Since</p>
        </div>
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
          className={`${styles.tab} ${activeTab === 'reviews' ? styles.active : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0 }}>{order.from} → {order.to}</h3>
                    <span className={`${styles.status} ${order.status === 'accepted' ? styles.statusAccepted : order.status === 'rejected' ? styles.statusRejected : ''}`}>
                      {order.status || "Pending"}
                    </span>
                  </div>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-regular fa-calendar"></i>
                    {order.date?.toDate ? order.date.toDate().toLocaleDateString() : new Date(order.date).toLocaleDateString()}
                  </p>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-box"></i> {order.packageSize}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '18px' }}>${order.price}</span>
                    <button
                      onClick={() => router.push('/my-orders')}
                      style={{ background: '#2d5bff', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className={styles.reviewsSection}>
            {myReviews.length === 0 ? (
              <p>No reviews yet.</p>
            ) : (
              myReviews.map(review => (
                <div key={review.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <h4>{review.reviewerName || "Anonymous"}</h4>
                    <span className={styles.reviewDate}>
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <div className={styles.reviewStars}>
                    {[...Array(5)].map((_, i) => (
                      <i
                        key={i}
                        className={`fa-solid fa-star ${i < review.rating ? styles.starFilled : styles.starEmpty}`}
                        style={{ color: i < review.rating ? '#ffb400' : '#ddd' }}
                      ></i>
                    ))}
                  </div>
                  <p className={styles.reviewText}>{review.comment}</p>
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

            <div className={styles.dangerZone}>
              <h3>Danger Zone</h3>
              <p>Once you delete your account, there is no going back. Please be certain.</p>
              <button onClick={handleDeleteAccount} className={styles.deleteBtn}>
                <i className="fa-solid fa-trash"></i> Delete Account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recaptcha Container */}
      <div id="recaptcha-container"></div>

      {/* Generic Success/Error Modal */}
      <ConfirmationModal
        isOpen={!!modalMessage}
        onClose={() => setModalMessage(null)}
        onConfirm={() => setModalMessage(null)}
        title={modalType === 'success' ? 'Success' : 'Notice'}
        message={modalMessage}
        isAlert={true}
      />

      {/* Phone Verification Modal - Kept custom for now as it has inputs */}
      {isVerifyingPhone && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Verify Phone Number</h3>
            <p className={styles.modalText}>
              Enter the 6-digit code sent to {formData.phone}
            </p>

            {verifyError && (
              <div className={styles.errorText} style={{ marginBottom: '15px', color: '#dc3545' }}>
                {verifyError}
                <button
                  onClick={() => setIsVerifyingPhone(false)}
                  style={{ display: 'block', marginTop: '10px', background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            )}
            {verifySuccess && <p className={styles.successText}>{verifySuccess}</p>}

            {!verificationId && !verifyError ? (
              <div className={styles.loadingSpinner}>Sending code...</div>
            ) : (
              !verifyError && (
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
              )
            )}
          </div>
        </div>
      )}
    </main>
  );
}
