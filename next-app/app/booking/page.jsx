"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./booking.module.css";

function BookingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tripId = searchParams.get("tripId");

    const [user, setUser] = useState(null);
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const [formData, setFormData] = useState({
        weight: "",
        pickupLocation: "",
        dropoffLocation: "",
        reward: ""
    });

    useEffect(() => {
        async function init() {
            if (!tripId) {
                setLoading(false);
                return;
            }

            try {
                const { getCurrentUser } = await import("../../lib/auth");
                const currentUser = await getCurrentUser();

                if (currentUser) {
                    setUser(currentUser);
                }

                // Check for pending booking data
                const pendingData = sessionStorage.getItem(`pendingBooking_${tripId}`);

                const { getTrip } = await import("../../lib/db");
                const tripData = await getTrip(tripId);

                if (!tripData) {
                    setErrorMsg("Trip not found");
                } else {
                    setTrip(tripData);
                    if (pendingData) {
                        setFormData(JSON.parse(pendingData));
                    } else {
                        // Only set default reward if no pending data
                        setFormData(prev => ({ ...prev, reward: tripData.price }));
                    }
                }
            } catch (error) {
                console.error("Error loading booking page:", error);
                setErrorMsg("Failed to load trip details");
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [tripId]);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user) {
            // Save data and redirect to login
            sessionStorage.setItem(`pendingBooking_${tripId}`, JSON.stringify(formData));
            router.push(`/auth?redirect=/booking?tripId=${tripId}`);
            return;
        }

        setSubmitting(true);
        setErrorMsg("");
        setSuccessMsg("");

        try {
            const { bookTrip } = await import("../../lib/db");
            await bookTrip(tripId, formData);

            setSuccessMsg("Booking request sent successfully!");
            sessionStorage.removeItem(`pendingBooking_${tripId}`); // Clear pending data
            setTimeout(() => {
                router.push("/my-trips");
            }, 2000);
        } catch (error) {
            console.error("Booking error:", error);
            setErrorMsg("Failed to book trip: " + error.message);
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className={styles.loading}>Loading trip details...</div>;
    }

    if (!tripId || !trip) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <h2>{tripId ? "Trip not found" : "Invalid Trip"}</h2>
                    <button onClick={() => router.push("/find-a-carrier")} className={styles.backBtn}>
                        Back to Search
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>Book this Trip</h1>

                <div className={styles.tripCard}>
                    <div className={styles.route}>
                        <div className={styles.location}>
                            <span className={styles.label}>From</span>
                            <span className={styles.city}>{trip.from}</span>
                        </div>
                        <div className={styles.arrow}>→</div>
                        <div className={styles.location}>
                            <span className={styles.label}>To</span>
                            <span className={styles.city}>{trip.to}</span>
                        </div>
                    </div>

                    <div className={styles.details}>
                        <div className={styles.detailItem}>
                            <i className="fa-solid fa-calendar"></i>
                            <span>{trip.date ? new Date(trip.date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <i className="fa-solid fa-plane"></i>
                            <span>{trip.transportType}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <i className="fa-solid fa-box"></i>
                            <span>{trip.packageSize}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <i className="fa-solid fa-tag"></i>
                            <span>${trip.price}</span>
                        </div>
                    </div>

                    {trip.description && (
                        <div className={styles.description}>
                            <p>"{trip.description}"</p>
                        </div>
                    )}
                </div>

                <div className={styles.formSection}>
                    <h2>Shipment Details</h2>
                    <form onSubmit={handleSubmit} className={styles.form}>
                        {errorMsg && <div className={styles.errorAlert}>{errorMsg}</div>}
                        {successMsg && <div className={styles.successAlert}>{successMsg}</div>}

                        <div className={styles.inputGroup}>
                            <label>Package Weight (kg)</label>
                            <input
                                type="number"
                                name="weight"
                                value={formData.weight}
                                onChange={handleChange}
                                required
                                min="0.1"
                                step="0.1"
                                placeholder="e.g. 2.5"
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label>Pickup Location</label>
                            <input
                                type="text"
                                name="pickupLocation"
                                value={formData.pickupLocation}
                                onChange={handleChange}
                                required
                                placeholder="Where should the carrier pick it up?"
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label>Dropoff Location</label>
                            <input
                                type="text"
                                name="dropoffLocation"
                                value={formData.dropoffLocation}
                                onChange={handleChange}
                                required
                                placeholder="Where should it be delivered?"
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label>Offer Price ($)</label>
                            <input
                                type="number"
                                name="reward"
                                value={formData.reward}
                                onChange={handleChange}
                                required
                                min="1"
                                step="1"
                            />
                            <small>The carrier asked for ${trip.price}</small>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitBtn}
                            disabled={submitting}
                        >
                            {submitting ? "Processing..." : (user ? "Confirm Booking" : "Login to Book")}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function BookingPage() {
    return (
        <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
            <BookingContent />
        </Suspense>
    );
}
