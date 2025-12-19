"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import styles from "./profile.module.css";
import ConfirmationModal from "../components/ConfirmationModal";

function ProfileContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("trips");
  const [isOwnProfile, setIsOwnProfile] = useState(true);
  const [viewedUserId, setViewedUserId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    location: ""
  });

  const [phoneVerified, setPhoneVerified] = useState(false);

  const [modalMessage, setModalMessage] = useState(null);
  const [modalType, setModalType] = useState("success");

  const [myTrips, setMyTrips] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    let unsubscribeAuth;

    async function init() {
      try {
        const { onAuthChange } = await import("../../lib/auth");
        const { getUserProfile, getUserTrips, getUserOrders } = await import("../../lib/db");

        // Get userId from URL params first, fallback to searchParams
        const profileUserId = params?.uid || searchParams.get("userId");

        unsubscribeAuth = onAuthChange(async (currentUser) => {
          if (!currentUser) {
            router.push("/auth");
            return;
          }

          const targetUserId = profileUserId || currentUser.uid;
          setIsOwnProfile(!profileUserId || profileUserId === currentUser.uid);
          setViewedUserId(targetUserId);

          const profile = await getUserProfile(targetUserId);
          
          if (!profile && profileUserId) {
            // User not found
            setLoading(false);
            setUser(null);
            return;
          }

          const userData = profile || {
            uid: targetUserId,
            email: currentUser.email,
            name: currentUser.displayName || "",
            phone: currentUser.phoneNumber || "",
            photoURL: currentUser.photoURL || ""
          };

          setUser({
            ...userData,
            providerData: currentUser.providerData,
            currentUserId: currentUser.uid
          });

          if (!profileUserId || profileUserId === currentUser.uid) {
            setFormData({
              name: userData.name || "",
              email: userData.email || "",
              phone: userData.phone || "",
              bio: userData.bio || "",
              location: userData.location || ""
            });
          }
          
          setPhoneVerified(!!userData.phoneVerified);

          const trips = await getUserTrips(targetUserId);
          setMyTrips(trips);

          const orders = await getUserOrders(targetUserId);
          setMyOrders(orders);

          setLoading(false);
        });
      } catch (error) {
        console.error("Error initializing profile:", error);
        setLoading(false);
      }
    }

    init();
    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [router, params, searchParams]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user || !isOwnProfile) return;

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

    setUploadingImage(true);

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
      setModalMessage("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      const { sendEmailVerification } = await import("../../lib/auth");
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
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.loading}>
        <i className="fa-solid fa-user-slash" style={{ fontSize: '48px', color: '#95a5a6', marginBottom: '20px' }}></i>
        <h2 style={{ color: '#7f8c8d', marginBottom: '10px' }}>User not found</h2>
        <p style={{ color: '#95a5a6', marginBottom: '20px' }}>The profile you're looking for doesn't exist.</p>
        <button onClick={() => router.push('/')} className={styles.saveBtn} style={{ maxWidth: '200px' }}>
          Go to Home
        </button>
      </div>
    );
  }

  const isGoogleAuth = user.providerData?.some(p => p.providerId === 'google.com');
  const memberSince = user.createdAt?.seconds 
    ? new Date(user.createdAt.seconds * 1000).getFullYear() 
    : new Date().getFullYear();

  return (
    <main className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>
              {uploadingImage && (
                <div className={styles.avatarLoading}>
                  <div className={styles.spinner}></div>
                </div>
              )}
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {user.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              {isOwnProfile && (
                <label className={styles.avatarOverlay}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    style={{ display: 'none' }}
                  />
                  <i className="fa-solid fa-camera"></i>
                  <span>Change Photo</span>
                </label>
              )}
            </div>
          </div>

          <div className={styles.userInfo}>
            <h1>{user.name || "User"}</h1>
            <p className={styles.email}>
              <i className="fa-solid fa-envelope"></i> {user.email}
            </p>
            {user.location && (
              <p className={styles.location}>
                <i className="fa-solid fa-location-dot"></i> {user.location}
              </p>
            )}
            {user.bio && <p className={styles.bio}>{user.bio}</p>}
            
            <div className={styles.badges}>
              {(user.emailVerified || isGoogleAuth) && (
                <span className={styles.verifiedBadge}>
                  <i className="fa-solid fa-circle-check"></i> Email Verified
                </span>
              )}
              <span className={styles.memberBadge}>
                <i className="fa-solid fa-calendar-days"></i> Member since {memberSince}
              </span>
            </div>
          </div>

          {isOwnProfile && (
            <button onClick={handleLogout} className={styles.logoutBtn}>
              <i className="fa-solid fa-right-from-bracket"></i>
              Log Out
            </button>
          )}
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <i className="fa-solid fa-plane-departure"></i>
          </div>
          <div className={styles.statInfo}>
            <h3>{myTrips.length}</h3>
            <p>Trips Posted</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <i className="fa-solid fa-box"></i>
          </div>
          <div className={styles.statInfo}>
            <h3>{myOrders.length}</h3>
            <p>Orders Made</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <i className="fa-solid fa-handshake"></i>
          </div>
          <div className={styles.statInfo}>
            <h3>{myTrips.filter(t => t.status === 'completed').length}</h3>
            <p>Completed</p>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <i className="fa-solid fa-clock"></i>
          </div>
          <div className={styles.statInfo}>
            <h3>{myTrips.filter(t => t.status === 'active' || !t.status).length}</h3>
            <p>Active</p>
          </div>
        </div>
      </div>

      <div className={styles.tabsContainer}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'trips' ? styles.active : ''}`}
            onClick={() => setActiveTab('trips')}
          >
            <i className="fa-solid fa-plane"></i>
            My Trips
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'orders' ? styles.active : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <i className="fa-solid fa-shopping-bag"></i>
            My Orders
          </button>
          {isOwnProfile && (
            <button
              className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <i className="fa-solid fa-gear"></i>
              Settings
            </button>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {activeTab === 'trips' && (
          <div className={styles.cardsGrid}>
            {myTrips.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="fa-solid fa-plane-slash"></i>
                <h3>No trips yet</h3>
                <p>{isOwnProfile ? "Start posting your trips to help others!" : "This user hasn't posted any trips yet."}</p>
              </div>
            ) : (
              myTrips.map(trip => (
                <div key={trip.id} className={styles.tripCard}>
                  <div className={styles.cardHeader}>
                    <h3>
                      <i className="fa-solid fa-location-dot"></i>
                      {trip.from}
                    </h3>
                    <i className="fa-solid fa-arrow-right" style={{ color: '#0084ff' }}></i>
                    <h3>
                      <i className="fa-solid fa-location-dot"></i>
                      {trip.to}
                    </h3>
                  </div>
                  <div className={styles.cardBody}>
                    <p>
                      <i className="fa-regular fa-calendar"></i>
                      {trip.date?.toDate ? trip.date.toDate().toLocaleDateString() : trip.date ? new Date(trip.date).toLocaleDateString() : 'N/A'}
                    </p>
                    <p>
                      <i className="fa-solid fa-weight-hanging"></i>
                      Max Weight: {trip.maxWeight || 'N/A'} kg
                    </p>
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={`${styles.status} ${styles['status-' + (trip.status || 'active')]}`}>
                      {trip.status || 'Active'}
                    </span>
                    <span className={styles.price}>${trip.pricePerKg || '0'}/kg</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className={styles.cardsGrid}>
            {myOrders.length === 0 ? (
              <div className={styles.emptyState}>
                <i className="fa-solid fa-box-open"></i>
                <h3>No orders yet</h3>
                <p>{isOwnProfile ? "Start booking trips to send your packages!" : "This user hasn't made any orders yet."}</p>
              </div>
            ) : (
              myOrders.map(order => (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.cardHeader}>
                    <h3>
                      <i className="fa-solid fa-location-dot"></i>
                      {order.from}
                    </h3>
                    <i className="fa-solid fa-arrow-right" style={{ color: '#f5576c' }}></i>
                    <h3>
                      <i className="fa-solid fa-location-dot"></i>
                      {order.to}
                    </h3>
                  </div>
                  <div className={styles.cardBody}>
                    <p>
                      <i className="fa-regular fa-calendar"></i>
                      {order.date?.toDate ? order.date.toDate().toLocaleDateString() : order.date ? new Date(order.date).toLocaleDateString() : 'N/A'}
                    </p>
                    <p>
                      <i className="fa-solid fa-box"></i>
                      Package: {order.packageSize || 'N/A'}
                    </p>
                    {order.weight && (
                      <p>
                        <i className="fa-solid fa-weight-hanging"></i>
                        Weight: {order.weight} kg
                      </p>
                    )}
                  </div>
                  <div className={styles.cardFooter}>
                    <span className={`${styles.status} ${styles['status-' + (order.status || 'pending')]}`}>
                      {order.status || 'Pending'}
                    </span>
                    <span className={styles.price}>${order.price || '0'}</span>
                  </div>
                  {isOwnProfile && (
                    <button
                      onClick={() => router.push('/my-orders')}
                      className={styles.viewDetailsBtn}
                    >
                      View Details
                      <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'settings' && isOwnProfile && (
          <div className={styles.settingsSection}>
            <div className={styles.settingsCard}>
              <h2>
                <i className="fa-solid fa-user-pen"></i>
                Edit Profile
              </h2>
              <form onSubmit={handleUpdateProfile}>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>
                      <i className="fa-solid fa-user"></i>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter your name"
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>
                      <i className="fa-solid fa-location-dot"></i>
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="City, Country"
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>
                    <i className="fa-solid fa-phone"></i>
                    Phone Number
                    {phoneVerified && <span className={styles.verifiedLabel}><i className="fa-solid fa-circle-check"></i> Verified</span>}
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>
                    <i className="fa-solid fa-align-left"></i>
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                    rows="4"
                    placeholder="Tell others about yourself..."
                  />
                </div>

                <button type="submit" className={styles.saveBtn}>
                  <i className="fa-solid fa-floppy-disk"></i>
                  Save Changes
                </button>
              </form>
            </div>

            <div className={styles.dangerZone}>
              <h3>
                <i className="fa-solid fa-triangle-exclamation"></i>
                Danger Zone
              </h3>
              <p>Once you delete your account, there is no going back. Please be certain.</p>
              <button onClick={handleDeleteAccount} className={styles.deleteBtn}>
                <i className="fa-solid fa-trash"></i>
                Delete Account Permanently
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!modalMessage}
        onClose={() => setModalMessage(null)}
        onConfirm={() => setModalMessage(null)}
        title={modalType === 'success' ? 'Success' : 'Notice'}
        message={modalMessage}
        isAlert={true}
      />
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className={styles.loading}><div className={styles.spinner}></div><p>Loading...</p></div>}>
      <ProfileContent />
    </Suspense>
  );
}
