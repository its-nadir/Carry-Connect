"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmationModal from "../components/ConfirmationModal";
import styles from "./mytrips.module.css";

export default function MyTripsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [bookingRequests, setBookingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({ title: "", message: "", isAlert: false });
  const [tripToDelete, setTripToDelete] = useState(null);

  useEffect(() => {
    let unsubscribeTrips = () => {};
    let unsubscribeRequests = () => {};

    async function loadData() {
      try {
        const { getCurrentUser } = await import("../../lib/auth");
        const currentUser = await getCurrentUser();

        if (!currentUser) {
          router.push("/auth");
          return;
        }

        setUser(currentUser);

        const {
          listenToMyTrips,
          listenToMyBookingRequests
        } = await import("../../lib/db");

        unsubscribeTrips = listenToMyTrips((userTrips) => {
          setTrips(userTrips);
          setLoading(false);
        });

        unsubscribeRequests = listenToMyBookingRequests((requests) => {
          setBookingRequests(requests);
        });

      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    }

    loadData();
    return () => {
      unsubscribeTrips();
      unsubscribeRequests();
    };
  }, [router]);

  const handleDeleteClick = (trip) => {
    if (trip.status === "booked") {
      setModalConfig({
        title: "Cannot Delete Trip",
        message: "This trip has been booked by a user. To ensure reliability, you cannot delete it directly. Please contact support if you have an urgent issue.",
        isAlert: true
      });
      setIsModalOpen(true);
      return;
    }
    setTripToDelete(trip.id);
    setModalConfig({
      title: "Delete Trip",
      message: "Are you sure you want to delete this trip? This action cannot be undone.",
      isAlert: false
    });
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tripToDelete) return;

    setSuccessMsg("");
    setErrorMsg("");
    setIsModalOpen(false);

    try {
      const { deleteTrip } = await import("../../lib/db");
      await deleteTrip(tripToDelete);
      setSuccessMsg("Trip deleted successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Error deleting trip:", error);
      setErrorMsg("Failed to delete trip");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setTripToDelete(null);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const { acceptBookingRequest } = await import("../../lib/db");
      await acceptBookingRequest(requestId);
      setSuccessMsg("Booking request accepted!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Accept error:", error);
      setErrorMsg("Failed to accept booking request");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const { rejectBookingRequest } = await import("../../lib/db");
      await rejectBookingRequest(requestId);
      setSuccessMsg("Booking request rejected");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Reject error:", error);
      setErrorMsg("Failed to reject booking request");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading your trips...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>My Trips</h1>
        <Link href="/add-trip" className={styles.addBtn}>
          + Add New Trip
        </Link>
      </div>

      {successMsg && <div className={styles.alertSuccess}>{successMsg}</div>}
      {errorMsg && <div className={styles.alertError}>{errorMsg}</div>}

      {/* BOOKING REQUESTS */}
      {bookingRequests.length > 0 && (
        <div className={styles.requestsSection}>
          <h2 className={styles.subtitle}>Pending Booking Requests ({bookingRequests.length})</h2>
          <div className={styles.requestsGrid}>
            {bookingRequests.map(req => (
              <div key={req.id} className={styles.requestCard}>
                <div className={styles.requestCardHeader}>
                  <h3 className={styles.shipperName}>{req.shipperName}</h3>
                  <span className={styles.requestReward}>${req.reward}</span>
                </div>

                <div className={styles.requestCardBody}>
                  <div className={styles.requestItem}>
                    <i className="fa-solid fa-location-dot"></i>
                    <div>
                      <p className={styles.requestLabel}>Pickup</p>
                      <p className={styles.requestValue}>{req.pickupLocation}</p>
                    </div>
                  </div>

                  <div className={styles.requestItem}>
                    <i className="fa-solid fa-location-dot"></i>
                    <div>
                      <p className={styles.requestLabel}>Dropoff</p>
                      <p className={styles.requestValue}>{req.dropoffLocation}</p>
                    </div>
                  </div>

                  <div className={styles.requestItem}>
                    <i className="fa-solid fa-box"></i>
                    <div>
                      <p className={styles.requestLabel}>Weight</p>
                      <p className={styles.requestValue}>{req.weight} kg</p>
                    </div>
                  </div>
                </div>

                <div className={styles.requestActions}>
                  <button 
                    onClick={() => handleAcceptRequest(req.id)} 
                    className={styles.acceptBtn}
                  >
                    <i className="fa-solid fa-check"></i> Accept
                  </button>
                  <button 
                    onClick={() => handleRejectRequest(req.id)} 
                    className={styles.rejectBtn}
                  >
                    <i className="fa-solid fa-times"></i> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {trips.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>✈️</div>
          <h2>No trips yet</h2>
          <p>Start by posting your first trip!</p>
          <Link href="/add-trip" className={styles.emptyBtn}>
            Post a Trip
          </Link>
        </div>
      ) : (
        <div>
          <h2 className={styles.subtitle}>Your Trips ({trips.length})</h2>
          <div className={styles.grid}>
            {trips.map((trip) => (
              <div key={trip.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.badge}>{trip.transportType}</span>
                  <span className={styles.status}>{trip.status}</span>
                </div>

                <div className={styles.route}>
                  <div className={styles.location}>
                    <i className="fa-solid fa-location-dot"></i>
                    <span>{trip.from}</span>
                  </div>
                  <div className={styles.arrow}>→</div>
                  <div className={styles.location}>
                    <i className="fa-solid fa-location-dot"></i>
                    <span>{trip.to}</span>
                  </div>
                </div>

                <div className={styles.details}>
                  <div className={styles.detail}>
                    <i className="fa-solid fa-calendar"></i>
                    <span>{trip.date ? new Date(trip.date).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className={styles.detail}>
                    <i className="fa-solid fa-box"></i>
                    <span>{trip.packageSize}</span>
                  </div>
                  <div className={styles.detail}>
                    <i className="fa-solid fa-dollar-sign"></i>
                    <span>${trip.price}</span>
                  </div>
                </div>

                {trip.description && (
                  <p className={styles.description}>{trip.description}</p>
                )}

                <div className={styles.actions}>
                  <button
                    onClick={() => handleDeleteClick(trip)}
                    className={trip.status === 'booked' ? styles.deleteBtnDisabled : styles.deleteBtn}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={modalConfig.title}
        message={modalConfig.message}
        isAlert={modalConfig.isAlert}
      />
    </div>
  );
}
