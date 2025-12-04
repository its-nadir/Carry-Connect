"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import SearchBox from "../components/SearchBox";
import styles from "./find.module.css";

export default function FindCarrierPage() {
  const [carriers, setCarriers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);

  useEffect(() => {
    // Only load Firebase on client side
    async function loadCarriers() {
      try {
        const { listenToAvailableTrips, auth, onAuthChange } = await import("../../lib/db");

        // Listen to auth state
        const unsubscribeAuth = onAuthChange((u) => setUser(u));

        const unsubscribeTrips = listenToAvailableTrips((data) => {
          setCarriers(data);
          setLoading(false);
        });

        return () => {
          unsubscribeAuth();
          unsubscribeTrips();
        };
      } catch (error) {
        console.error("Error loading carriers:", error);
        setLoading(false);
      }
    }

    loadCarriers();
  }, []);

  if (loading) {
    return (
      <main className={styles.pageWrapper}>
        <div style={{ textAlign: 'center', padding: '100px', fontSize: '20px' }}>
          Loading carriers...
        </div>
      </main>
    );
  }

  return (
    <main className={styles.pageWrapper}>
      <Suspense fallback={<div>Loading search...</div>}>
        <SearchBox className={styles.searchBoxFind} />
      </Suspense>

      <div className={styles.topActions}>
        <button className={styles.filterBtn}>
          <i className="fa-solid fa-filter"></i> Filters
        </button>
        <button className={styles.listBtn}>
          <i className="fa-solid fa-list"></i> List
        </button>
      </div>

      <h2 className={styles.sectionTitle}>Available Carriers</h2>
      <p className={styles.resultCount}>{carriers.length} carriers found</p>

      {carriers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          background: 'white',
          borderRadius: '20px',
          margin: '20px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📦</div>
          <h3 style={{ marginBottom: '10px' }}>No trips available yet</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Be the first to post a trip!
          </p>
          <Link href="/add-trip" style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: '600'
          }}>
            Post a Trip
          </Link>
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {carriers.map((carrier) => {
            const isMyTrip = user && carrier.carrierUid === user.uid;
            return (
              <div key={carrier.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>{carrier.avatar || carrier.userName?.charAt(0) || 'U'}</div>
                  <div>
                    <h3 className={styles.cardName}>
                      {carrier.userName || carrier.name || 'Carrier'}
                      {isMyTrip && <span style={{ fontSize: '12px', color: '#667eea', marginLeft: '8px' }}>(You)</span>}
                    </h3>
                    <p className={styles.cardSub}>{carrier.from} → {carrier.to}</p>
                    <p className={styles.cardDate}>{carrier.date ? new Date(carrier.date).toLocaleDateString() : 'Date'}</p>
                  </div>
                  <span className={styles.badge}>{carrier.transportType}</span>
                </div>

                <div className={styles.cardBody}>
                  <p>
                    <i className="fa-solid fa-box"></i> {carrier.packageSize}
                  </p>
                  {carrier.description && (
                    <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                      {carrier.description}
                    </p>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <h3 className={styles.price}>${carrier.price}</h3>
                  {isMyTrip ? (
                    <button disabled className={styles.bookBtn} style={{ opacity: 0.5, cursor: 'not-allowed', background: '#ccc' }}>
                      Your Trip
                    </button>
                  ) : (
                    <Link href={`/booking?tripId=${carrier.id}`} className={styles.bookBtn}>
                      Book Now
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
