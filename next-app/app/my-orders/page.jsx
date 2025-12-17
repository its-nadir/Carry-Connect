"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./my-orders.module.css";

export default function MyOrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribe;

        async function init() {
            try {
                const { onAuthChange } = await import("../../lib/auth");
                const { listenToMyBookings } = await import("../../lib/db");

                onAuthChange((user) => {
                    if (!user) {
                        router.push("/auth");
                        return;
                    }

                    unsubscribe = listenToMyBookings((bookings) => {
                        setOrders(bookings);
                        setLoading(false);
                    });
                });
            } catch (error) {
                console.error("Error initializing orders:", error);
                setLoading(false);
            }
        }

        init();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [router]);

    if (loading) {
        return <div style={{ padding: "50px", textAlign: "center" }}>Loading your orders...</div>;
    }

    return (
        <main className={styles.page}>
            <div className={styles.headerBg}></div>

            <div className={styles.container}>
                <h1 className={styles.pageTitle}>My Orders</h1>

                {orders.length === 0 ? (
                    <div className={styles.emptyState}>
                        <i className="fa-solid fa-box-open"></i>
                        <h3>No orders yet</h3>
                        <p>You haven't booked any trips yet. Find a carrier to send your package!</p>
                        <button className={styles.browseBtn} onClick={() => router.push("/find-a-carrier")}>
                            Find a Carrier
                        </button>
                    </div>
                ) : (
                    <div className={styles.ordersGrid}>
                        {orders.map((order) => (
                            <OrderCard key={order.id} order={order} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

function OrderCard({ order }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={styles.orderCard}>
            <div className={styles.orderInfo}>
                <h3>{order.description || "Package Delivery"}</h3>

                <div className={styles.route}>
                    <span>{order.from}</span>
                    <i className="fa-solid fa-arrow-right arrow"></i>
                    <span>{order.to}</span>
                </div>

                <div className={styles.meta}>
                    <span>
                        <i className="fa-regular fa-calendar"></i>
                        {order.date?.toDate ? order.date.toDate().toLocaleDateString() : new Date(order.date).toLocaleDateString()}
                    </span>
                    <span>
                        <i className="fa-solid fa-weight-hanging"></i>
                        {order.packageSize}
                    </span>
                </div>
            </div>

            <div className={styles.actions}>
                <span className={`${styles.status} ${order.status === 'accepted' ? styles.statusAccepted :
                    order.status === 'rejected' ? styles.statusRejected :
                        styles.statusPending
                    }`}>
                    {order.status || "Pending"}
                </span>

                <span className={styles.price}>${order.price}</span>

                <button
                    className={styles.detailsBtn}
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? "Hide Details" : "View Details"}
                </button>
            </div>

            {expanded && (
                <div style={{
                    gridColumn: '1 / -1',
                    marginTop: '20px',
                    paddingTop: '20px',
                    borderTop: '1px solid #eee',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px',
                    fontSize: '14px',
                    color: '#555'
                }}>
                    <div>
                        <p style={{ margin: '0 0 5px', color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order ID</p>
                        <p style={{ margin: 0, fontWeight: '500', fontFamily: 'monospace' }}>{order.id}</p>
                    </div>
                    <div>
                        <p style={{ margin: '0 0 5px', color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Booked On</p>
                        <p style={{ margin: 0, fontWeight: '500' }}>{order.bookedAt?.toDate ? order.bookedAt.toDate().toLocaleDateString() : "N/A"}</p>
                    </div>
                    <div>
                        <p style={{ margin: '0 0 5px', color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Carrier</p>
                        <p style={{ margin: 0, fontWeight: '500' }}>{order.carrierName || "Unknown Carrier"}</p>
                    </div>
                    {/* Placeholder for future tracking info */}
                    <div>
                        <p style={{ margin: '0 0 5px', color: '#888', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tracking</p>
                        <p style={{ margin: 0, fontWeight: '500' }}>Not available</p>
                    </div>
                </div>
            )}
        </div>
    );
}
