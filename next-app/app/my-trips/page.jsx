"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./mytrips.module.css";
import { auth, listenToUserTrips, deleteTrip } from "../../lib/db";

export default function MyTripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) {
      router.push("/auth");
      return;
    }

    const unsubscribe = listenToUserTrips(auth.currentUser.uid, setTrips);
    return () => unsubscribe();
  }, [router]);

  const handleDelete = async (trip) => {
    if (trip.status !== "available") return;
    await deleteTrip(trip.id);
  };

  return (
    <div className={styles.container}>
      <h1>My Trips</h1>

      <div className={styles.grid}>
        {trips.map((trip) => (
          <div key={trip.id} className={styles.card}>
            <h3>
              {trip.from} → {trip.to}
            </h3>
            <p>Status: {trip.status}</p>

            {trip.status === "pending" && (
              <>
                <button
                  onClick={async () => {
                    const { acceptBooking } = await import("../../lib/db");
                    await acceptBooking(trip.id);
                  }}
                >
                  Accept
                </button>

                <button
                  onClick={async () => {
                    const { rejectBooking } = await import("../../lib/db");
                    await rejectBooking(trip.id);
                  }}
                >
                  Reject
                </button>
              </>
            )}

            <button
              onClick={() => handleDelete(trip)}
              disabled={trip.status !== "available"}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
