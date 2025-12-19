"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./profile.module.css";
import ConfirmationModal from "../components/ConfirmationModal";

function ProfileContent() {
  const router = useRouter();
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

        // ✅ FIX: read UID from query param
        const profileUserId = searchParams.get("uid");

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
  }, [router, searchParams]);

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
        <h2>User not found</h2>
        <button onClick={() => router.push("/")} className={styles.saveBtn}>
          Go Home
        </button>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      {/* EVERYTHING BELOW IS UNCHANGED */}
      {/* Your existing JSX stays exactly the same */}
      <ConfirmationModal
        isOpen={!!modalMessage}
        onClose={() => setModalMessage(null)}
        onConfirm={() => setModalMessage(null)}
        title={modalType === "success" ? "Success" : "Notice"}
        message={modalMessage}
        isAlert={true}
      />
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
