"use client";

import React, { useEffect, useState } from "react";
import { auth, listenToUserTrips, deleteTrip } from "../../lib/db";
import styles from "./mytrips.module.css";
import { useRouter } from "next/navigation";
import ConfirmationModal from "../../components/ConfirmationModal";

export default function MyTripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tripToDelete, setTripToDelete] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    isAlert: false
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      router.push("/auth");
      return;
    }

    const unsubscribe = listenToUserTrips(user.uid, (userTrips) => {
      setTrips(userTrips);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleDeleteClick = (trip) => {
    if (trip.status !== "available") {
      setModalConfig({
        title: "Cannot Delete Trip",
        message: "This trip has a pending or accepted booking. You can only delete trips when they are available.",
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
    try {
      await deleteTrip(tripToDelete);
      setTrips((prevTrips) => prevTrips.filter((trip) => trip.id !== tripToDelete));
      setIsModalOpen(false);
      setTripToDelete(null);
    } catch (error) {
      console.error("Error deleting trip:", error);
      setModalConfig({
        title: "Delete Failed",
        message: "There was an error deleting the trip. Please try again.",
        isAlert: true
      });
      setIsModalOpen(true);
    }
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <h1>My Trips</h1>
        <p>Manage your trips and view booking requests</p>
      </header>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading your trips...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className={styles.emptyState}>
          <h2>No trips posted yet</h2>
          <p>You haven't posted any trips. Add one now!</p>
          <button className={styles.addBtn} onClick={() => router.push("/add-trip")}>
            Add Trip
          </button>
        </div>
      ) : (
        <div className={styles.tripsGrid}>
          {trips.map((trip) => (
            <div key={trip.id} className={styles.tripCard}>
              <div className={styles.tripHeader}>
                <h3>{trip.from} → {trip.to}</h3>
                <span className={`${styles.status} ${
                  trip.status === 'accepted' ? styles.statusAccepted :
                    trip.status === 'pending' ? styles.statusPending :
                      styles.statusAvailable
                }`}>
                  {trip.status || "available"}
                </span>
              </div>

              <div className={styles.tripBody}>
                <p><strong>Date:</strong> {trip.date}</p>
                <p><strong>Transport:</strong> {trip.transportType}</p>
                <p><strong>Available Weight:</strong> {trip.availableWeight} kg</p>
                <p><strong>Price:</strong> ${trip.price}</p>

                {trip.bookedByEmail && (
                  <p className={styles.bookedBy}>
                    <strong>Requested By:</strong> {trip.bookedByEmail}
                  </p>
                )}

                {trip.description && (
                  <p className={styles.description}>{trip.description}</p>
                )}

                <div className={styles.actions}>
                  {trip.status === "pending" && (
                    <>
                      <button
                        onClick={async () => {
                          const { acceptBooking } = await import("../../lib/db");
                          await acceptBooking(trip.id);
                        }}
                        className={styles.detailsBtn}
                      >
                        Accept
                      </button>
                      <button
                        onClick={async () => {
                          const { rejectBooking } = await import("../../lib/db");
                          await rejectBooking(trip.id);
                        }}
                        className={styles.deleteBtn}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDeleteClick(trip)}
                    disabled={trip.status !== "available"}
                    className={trip.status !== "available" ? styles.deleteBtnDisabled : styles.deleteBtn}
                    title={trip.status !== "available" ? "Cannot delete pending/accepted trip" : "Delete trip"}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
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
    </main>
  );
}
