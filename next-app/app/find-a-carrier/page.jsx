"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SearchBox from "../components/SearchBox";
import styles from "./find.module.css";

// Add this import at the top
import { listenToAvailableTrips, onAuthChange } from "../../lib/db";

function FindCarrierContent() {
  const searchParams = useSearchParams();
  const [carriers, setCarriers] = useState([]);
  const [filteredCarriers, setFilteredCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState(1000);
  const [selectedTransport, setSelectedTransport] = useState("All");

  useEffect(() => {
    let unsubscribeAuth = null;
    let unsubscribeTrips = null;

    function loadCarriers() {
      try {
        // Remove dynamic import - use direct function calls
        unsubscribeAuth = onAuthChange((u) => setUser(u));

        unsubscribeTrips = listenToAvailableTrips((data) => {
          setCarriers(Array.isArray(data) ? data : []);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error loading carriers:", error);
        setLoading(false);
      }
    }

    loadCarriers();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeTrips) unsubscribeTrips();
    };
  }, []);

  useEffect(() => {
    if (!Array.isArray(carriers) || carriers.length === 0) {
      setFilteredCarriers([]);
      return;
    }

    const fromQuery = searchParams.get("from")?.toLowerCase() || "";
    const toQuery = searchParams.get("to")?.toLowerCase() || "";
    const dateQuery = searchParams.get("date");
    const sizeQuery = searchParams.get("size");

    const filtered = carriers.filter((trip) => {
      if (!trip) return false;

      const matchesFrom = !fromQuery || trip.from?.toLowerCase().includes(fromQuery);
      const matchesTo = !toQuery || trip.to?.toLowerCase().includes(toQuery);

      let matchesDate = true;
      if (dateQuery && trip.date) {
        const tripDateObj = trip.date?.toDate ? trip.date.toDate() : new Date(trip.date);
        const tripDate = tripDateObj.setHours(0, 0, 0, 0);
        const queryDate = new Date(dateQuery).setHours(0, 0, 0, 0);
        matchesDate = tripDate >= queryDate;
      }

      const matchesSize = !sizeQuery || trip.packageSize === sizeQuery;
      const matchesPrice = trip.price <= priceRange;
      const matchesTransport =
        selectedTransport === "All" || trip.transportType === selectedTransport;

      return (
        matchesFrom &&
        matchesTo &&
        matchesDate &&
        matchesSize &&
        matchesPrice &&
        matchesTransport
      );
    });

    setFilteredCarriers(filtered);
  }, [carriers, searchParams, priceRange, selectedTransport]);

  if (loading) {
    return <div className={styles.loading}>Loading carriers...</div>;
  }

  return (
    <>
      <SearchBox className={styles.searchBoxFind} />

      <div className={styles.topActions}>
        <button
          className={`${styles.filterBtn} ${showFilters ? styles.active : ""}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <i className="fa-solid fa-filter"></i> Filters
        </button>
        <button
          className={styles.listBtn}
          onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
        >
          <i className={`fa-solid ${viewMode === "grid" ? "fa-list" : "fa-border-all"}`}></i>
          {viewMode === "grid" ? " List View" : " Grid View"}
        </button>
      </div>

      {/* ADDED BACK THE FILTERS SECTION THAT WAS MISSING */}
      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <label>Max Price: ${priceRange}</label>
            <input
              type="range"
              min="50"
              max="5000"
              step="50"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className={styles.priceSlider}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Transport Type</label>
            <select
              value={selectedTransport}
              onChange={(e) => setSelectedTransport(e.target.value)}
              className={styles.transportSelect}
            >
              <option value="All">All Types</option>
              <option value="Car">Car</option>
              <option value="Van">Van</option>
              <option value="Truck">Truck</option>
              <option value="Motorcycle">Motorcycle</option>
            </select>
          </div>
        </div>
      )}

      <h2 className={styles.sectionTitle}>Available Carriers</h2>
      <p className={styles.resultCount}>{filteredCarriers.length} carriers found</p>

      <div className={viewMode === "grid" ? styles.cardsGrid : styles.cardsList}>
        {filteredCarriers.map((carrier) => {
          const isMyTrip = user && carrier.carrierUid === user.uid;

          return (
            <div key={carrier.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.avatar}>
                  {carrier.carrierName?.charAt(0) || "U"}
                </div>
                <h3 className={styles.cardName}>
                  {carrier.carrierName || "Carrier"}
                  {isMyTrip && <span className={styles.youBadge}>(You)</span>}
                </h3>
                <span className={styles.badge}>{carrier.transportType}</span>
              </div>

              <div className={styles.cardFooter}>
                <h3 className={styles.price}>${carrier.price}</h3>
                {isMyTrip ? (
                  <button disabled className={styles.bookBtnDisabled}>
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
    </>
  );
}

export default function FindCarrierPage() {
  return (
    <main className={styles.pageWrapper}>
      <Suspense fallback={<div>Loading...</div>}>
        <FindCarrierContent />
      </Suspense>
    </main>
  );
}
