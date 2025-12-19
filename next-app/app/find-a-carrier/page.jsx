"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import SearchBox from "../components/SearchBox";
import styles from "./find.module.css";

function FindCarrierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [carriers, setCarriers] = useState([]);
  const [filteredCarriers, setFilteredCarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);

  const [priceRange, setPriceRange] = useState(1000);
  const [selectedTransport, setSelectedTransport] = useState("All");

  // Generate consistent avatar color based on name
  const getAvatarColor = (name) => {
    if (!name) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)'
    ];
    
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  useEffect(() => {
    let unsubscribeAuth;
    let unsubscribeTrips;

    (async () => {
      try {
        const { listenToAvailableTrips, onAuthChange } = await import("../../lib/db");

        unsubscribeAuth = onAuthChange((u) => setUser(u));
        unsubscribeTrips = listenToAvailableTrips((data) => {
          setCarriers(data);
          setLoading(false);
        });
      } catch (error) {
        console.error("Error loading carriers:", error);
        setLoading(false);
      }
    })();

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeTrips) unsubscribeTrips();
    };
  }, []);

  useEffect(() => {
    if (!carriers.length) {
      setFilteredCarriers([]);
      return;
    }

    const fromQuery = searchParams.get("from")?.toLowerCase() || "";
    const toQuery = searchParams.get("to")?.toLowerCase() || "";
    const dateQuery = searchParams.get("date");
    const sizeQuery = searchParams.get("size");

    const filtered = carriers.filter((trip) => {
      const matchesFrom = !fromQuery || trip.from.toLowerCase().includes(fromQuery);
      const matchesTo = !toQuery || trip.to.toLowerCase().includes(toQuery);

      let matchesDate = true;
      if (dateQuery) {
        const tripDateObj = trip.date?.toDate ? trip.date.toDate() : new Date(trip.date);
        const tripDate = tripDateObj.setHours(0, 0, 0, 0);
        const queryDate = new Date(dateQuery).setHours(0, 0, 0, 0);
        matchesDate = tripDate >= queryDate;
      }

      const matchesSize = !sizeQuery || trip.packageSize === sizeQuery;

      const matchesPrice = trip.price <= priceRange;
      const matchesTransport = selectedTransport === "All" || trip.transportType === selectedTransport;

      return matchesFrom && matchesTo && matchesDate && matchesSize && matchesPrice && matchesTransport;
    });

    setFilteredCarriers(filtered);
  }, [carriers, searchParams, priceRange, selectedTransport]);

  const getTransportIcon = (type) => {
    switch(type) {
      case 'Flight': return 'fa-plane';
      case 'Train': return 'fa-train';
      case 'Car': return 'fa-car';
      case 'Ship': return 'fa-ship';
      default: return 'fa-circle';
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Finding carriers...</p>
      </div>
    );
  }

  return (
    <>
      <SearchBox className={styles.searchBoxFind} />

      <div className={styles.topBar}>
        <div className={styles.topActions}>
          <button
            className={`${styles.filterBtn} ${showFilters ? styles.active : ""}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <i className="fa-solid fa-sliders"></i>
            <span>Filters</span>
          </button>
          <button
            className={styles.viewToggle}
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          >
            <i className={`fa-solid ${viewMode === "grid" ? "fa-list" : "fa-grid-2"}`}></i>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <label>
              <i className="fa-solid fa-dollar-sign"></i>
              Max Price: <strong>${priceRange}</strong>
            </label>
            <input
              type="range"
              min="0"
              max="1000"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>
              <i className="fa-solid fa-shuttle-space"></i>
              Transport Type
            </label>
            <select
              value={selectedTransport}
              onChange={(e) => setSelectedTransport(e.target.value)}
              className={styles.selectInput}
            >
              <option value="All">All Types</option>
              <option value="Flight">✈️ Flight</option>
              <option value="Train">🚆 Train</option>
              <option value="Car">🚗 Car</option>
              <option value="Ship">🚢 Ship</option>
            </select>
          </div>
          <button
            onClick={() => {
              setPriceRange(1000);
              setSelectedTransport("All");
            }}
            className={styles.clearFiltersBtn}
            title="Reset Filters"
          >
            <i className="fa-solid fa-rotate-right"></i>
          </button>
        </div>
      )}

      <div className={styles.resultsHeader}>
        <h2 className={styles.sectionTitle}>
          <i className="fa-solid fa-truck-fast"></i>
          Available Carriers
        </h2>
        <p className={styles.resultCount}>
          <strong>{filteredCarriers.length}</strong> {filteredCarriers.length === 1 ? 'carrier' : 'carriers'} found
        </p>
      </div>

      {filteredCarriers.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <i className="fa-solid fa-magnifying-glass"></i>
          </div>
          <h3 className={styles.emptyTitle}>No carriers found</h3>
          <p className={styles.emptyText}>Try adjusting your search criteria or filters to find more options.</p>
          <button
            onClick={() => {
              setPriceRange(1000);
              setSelectedTransport("All");
            }}
            className={styles.clearBtn}
          >
            <i className="fa-solid fa-filter-circle-xmark"></i>
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? styles.cardsGrid : styles.cardsList}>
          {filteredCarriers.map((carrier) => {
            const isMyTrip = user && carrier.carrierUid === user.uid;
            const carrierName = carrier.carrierName || carrier.userName || carrier.name || "Anonymous";
            const avatarLetter = carrierName.charAt(0).toUpperCase();
            
            return (
              <div
                key={carrier.id}
                className={`${styles.card} ${viewMode === "list" ? styles.cardList : ""} ${isMyTrip ? styles.myTripCard : ""}`}
              >
                <div className={styles.cardHeader}>
                  <div 
                    className={styles.avatarWrapper}
                    onClick={() => !isMyTrip && router.push(`/profile?userId=${carrier.carrierUid}`)}
                    style={{ cursor: isMyTrip ? 'default' : 'pointer' }}
                  >
                    <div 
                      className={styles.avatar}
                      style={{ background: getAvatarColor(carrierName) }}
                    >
                      {avatarLetter}
                    </div>
                    {!isMyTrip && (
                      <div className={styles.viewProfileHint}>
                        <i className="fa-solid fa-eye"></i>
                        View Profile
                      </div>
                    )}
                  </div>
                  <div className={styles.headerInfo}>
                    <h3 className={styles.cardName}>
                      {carrierName}
                      {isMyTrip && <span className={styles.youBadge}>Your Trip</span>}
                    </h3>
                    <div className={styles.routeInfo}>
                      <div className={styles.route}>
                        <i className="fa-solid fa-location-dot" style={{ color: '#667eea' }}></i>
                        <span className={styles.routeText}>{carrier.from}</span>
                        <i className="fa-solid fa-arrow-right" style={{ color: '#a0aec0' }}></i>
                        <i className="fa-solid fa-location-dot" style={{ color: '#f5576c' }}></i>
                        <span className={styles.routeText}>{carrier.to}</span>
                      </div>
                    </div>
                  </div>
                  <div className={styles.transportBadge}>
                    <i className={`fa-solid ${getTransportIcon(carrier.transportType)}`}></i>
                    {carrier.transportType}
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <i className="fa-regular fa-calendar"></i>
                      <span>
                        {(carrier.date?.toDate
                          ? carrier.date.toDate()
                          : new Date(carrier.date)
                        ).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <div className={styles.infoItem}>
                      <i className="fa-solid fa-box"></i>
                      <span>{carrier.packageSize}</span>
                    </div>
                    {carrier.maxWeight && (
                      <div className={styles.infoItem}>
                        <i className="fa-solid fa-weight-hanging"></i>
                        <span>{carrier.maxWeight} kg max</span>
                      </div>
                    )}
                  </div>
                  
                  {carrier.description && (
                    <p className={styles.description}>
                      <i className="fa-solid fa-quote-left"></i>
                      {carrier.description}
                    </p>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.priceSection}>
                    <span className={styles.priceLabel}>Total Price</span>
                    <h3 className={styles.price}>${carrier.price}</h3>
                  </div>
                  {isMyTrip ? (
                    <button disabled className={styles.bookBtnDisabled}>
                      <i className="fa-solid fa-ban"></i>
                      Your Trip
                    </button>
                  ) : (
                    <Link
                      href={`/booking?tripId=${carrier.id}`}
                      className={styles.bookBtn}
                    >
                      <i className="fa-solid fa-calendar-check"></i>
                      Book Now
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

export default function FindCarrierPage() {
  return (
    <main className={styles.pageWrapper}>
      <Suspense fallback={
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      }>
        <FindCarrierContent />
      </Suspense>
    </main>
  );
}
