"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./my-orders.module.css";

export default function MyOrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("requests"); // 'requests' or 'booked'

    useEffect(() => {
        let unsubOrders;
        let unsubRequests;

        async function init() {
            try {
                const { onAuthChange } = await import("../../lib/auth");
                const { listenToMyBookings, listenToMySentRequests } = await import("../../lib/db");

                onAuthChange((user) => {
                    if (!user) {
                        router.push("/auth");
                        return;
                    }

                    // Listen to booked trips
                    unsubOrders = listenToMyBookings((bookings) => {
                        setOrders(bookings);
                    });

                    // Listen to sent booking requests
                    unsubRequests = listenToMySentRequests((requests) => {
                        setSentRequests(requests);
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
            if (unsubOrders) unsubOrders();
            if (unsubRequests) unsubRequests();
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

                {/* TABS */}
                <div className={styles.tabs}>
                    <button 
                        className={`${styles.tab} ${activeTab === 'requests' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('requests')}>
                        Booking Requests ({sentRequests.length})
                    </button>
                    <button 
                        className={`${styles.tab} ${activeTab === 'booked' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('booked')}>
                        Booked Trips ({orders.length})
                    </button>
                </div>

                {/* REQUESTS TAB */}
                {activeTab === 'requests' && (
                    sentRequests.length === 0 ? (
                        <div className={styles.emptyState}>
                            <i className="fa-solid fa-inbox"></i>
                            <h3>No booking requests yet</h3>
                            <p>Find a carrier and send a booking request to get started!</p>
                            <button className={styles.browseBtn} onClick={() => router.push("/find-a-carrier")}>
                                Find a Carrier
                            </button>
                        </div>
                    ) : (
                        <div className={styles.requestsGrid}>
                            {sentRequests.map((req) => (
                                <RequestCard key={req.id} request={req} />
                            ))}
                        </div>
                    )
                )}

                {/* BOOKED TRIPS TAB */}
                {activeTab === 'booked' && (
                    orders.length === 0 ? (
                        <div className={styles.emptyState}>
                            <i className="fa-solid fa-box-open"></i>
                            <h3>No booked trips yet</h3>
                            <p>Once a carrier accepts your booking request, it will appear here.</p>
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
                    )
                )}
            </div>
        </main>
    );
}

// REQUEST CARD COMPONENT
function RequestCard({ request }) {
    const [expanded, setExpanded] = useState(false);

    const getStatusColor = (status) => {
        switch(status) {
            case 'pending': return '#ffc107';
            case 'accepted': return '#4caf50';
            case 'rejected': return '#f44336';
            default: return '#999';
        }
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'pending': return 'fa-hourglass-end';
            case 'accepted': return 'fa-check-circle';
            case 'rejected': return 'fa-times-circle';
            default: return 'fa-circle';
        }
    };

    return (
        <div className={styles.requestCard}>
            <div className={styles.requestHeader}>
                <div className={styles.requestStatus} style={{ backgroundColor: getStatusColor(request.status) }}>
                    <i className={`fa-solid ${getStatusIcon(request.status)}`}></i>
                    <span>{request.status.toUpperCase()}</span>
                </div>
                <span className={styles.requestPrice}>${request.reward}</span>
            </div>

            <div className={styles.requestBody}>
                <p><strong>Weight:</strong> {request.weight} kg</p>
                <p><strong>Pickup:</strong> {request.pickupLocation}</p>
                <p><strong>Dropoff:</strong> {request.dropoffLocation}</p>
                <p><strong>Sent:</strong> {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleDateString() : new Date(request.createdAt?.seconds * 1000).toLocaleDateString()}</p>
            </div>

            {request.status === 'accepted' && (
                <div className={styles.acceptedMessage}>
                    ✅ Carrier accepted! Check messages for details.
                </div>
            )}

            {request.status === 'rejected' && (
                <div className={styles.rejectedMessage}>
                    ❌ Carrier rejected this request. Try another trip.
                </div>
            )}

            <button
                className={styles.expandBtn}
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? "Hide Details" : "View Details"}
            </button>

            {expanded && (
                <div className={styles.expandedDetails}>
                    <div>
                        <p className={styles.detailLabel}>Request ID</p>
                        <p className={styles.detailValue}>{request.id}</p>
                    </div>
                    <div>
                        <p className={styles.detailLabel}>Status</p>
                        <p className={styles.detailValue}>{request.status}</p>
                    </div>
                    {request.respondedAt && (
                        <div>
                            <p className={styles.detailLabel}>Responded On</p>
                            <p className={styles.detailValue}>{request.respondedAt.toDate ? request.respondedAt.toDate().toLocaleDateString() : new Date(request.respondedAt?.seconds * 1000).toLocaleDateString()}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ORDER CARD COMPONENT
function OrderCard({ order }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className={styles.orderCard}>
            <div className={styles.orderHeader}>
                <span className={styles.badge}>{order.transportType}</span>
                <span className={styles.status}>{order.status}</span>
            </div>

            <div className={styles.route}>
                <div className={styles.location}>
                    <i className="fa-solid fa-location-dot"></i>
                    <span>{order.from}</span>
                </div>
                <div className={styles.arrow}>→</div>
                <div className={styles.location}>
                    <i className="fa-solid fa-location-dot"></i>
                    <span>{order.to}</span>
                </div>
            </div>

            <div className={styles.details}>
                <div className={styles.detailItem}>
                    <i className="fa-solid fa-calendar"></i>
                    <span>{order.date?.toDate ? order.date.toDate().toLocaleDateString() : new Date(order.date).toLocaleDateString()}</span>
                </div>
                <div className={styles.detailItem}>
                    <i className="fa-solid fa-weight-hanging"></i>
                    <span>{order.weight} kg</span>
                </div>
                <div className={styles.detailItem}>
                    <i className="fa-solid fa-tag"></i>
                    <span>${order.reward}</span>
                </div>
            </div>

            <div className={styles.carrierInfo}>
                <p><strong>Carrier:</strong> {order.carrierName}</p>
                <p><strong>Email:</strong> {order.carrierEmail}</p>
            </div>

            <button
                className={styles.expandBtn}
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? "Hide Details" : "View Details"}
            </button>

            {expanded && (
                <div className={styles.expandedDetails}>
                    <div>
                        <p className={styles.detailLabel}>Order ID</p>
                        <p className={styles.detailValue}>{order.id}</p>
                    </div>
                    <div>
                        <p className={styles.detailLabel}>Booked On</p>
                        <p className={styles.detailValue}>{order.bookedAt?.toDate ? order.bookedAt.toDate().toLocaleDateString() : "N/A"}</p>
                    </div>
                    <div>
                        <p className={styles.detailLabel}>Status</p>
                        <p className={styles.detailValue}>{order.status || "Pending"}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
