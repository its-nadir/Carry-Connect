"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { onAuthChange } = await import("../../lib/auth");
        const unsubscribe = onAuthChange((currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });
        return () => unsubscribe();
      } catch (error) {
        console.error("Auth error:", error);
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setHasUnread(false);
      return;
    }

    let isMounted = true;
    let unsubs = [];

    const getSeenKey = (uid, tripId) => `cc_seen_${uid}_${tripId}`;
    const getLastSeen = (uid, tripId) => {
      try {
        const raw = localStorage.getItem(getSeenKey(uid, tripId));
        return raw ? Number(raw) : 0;
      } catch {
        return 0;
      }
    };

    async function initUnread() {
      try {
        const { getUserTrips, getUserOrders, listenToTripLastMessage } = await import("../../lib/db");
        const postedTrips = await getUserTrips(user.uid);
        const bookedOrders = await getUserOrders(user.uid);
        const trips = [...postedTrips, ...bookedOrders].filter((t) => t.status === "booked");
        const uniqueTripIds = Array.from(new Set(trips.map((t) => t.id)));

        unsubs = uniqueTripIds.map((tripId) => listenToTripLastMessage(tripId, (msg) => {
          if (!isMounted) return;
          if (!msg || !msg.sentAt || !msg.senderUid || msg.senderUid === user.uid) return;
          const lastSeen = getLastSeen(user.uid, tripId);
          const msgTime = new Date(msg.sentAt).getTime();
          if (msgTime > lastSeen) setHasUnread(true);
        }));
      } catch {
        if (isMounted) setHasUnread(false);
      }
    }

    initUnread();
    return () => {
      isMounted = false;
      unsubs.forEach((u) => {
        try { u && u(); } catch {}
      });
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      const { logOut } = await import("../../lib/auth");
      await logOut();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="navbar">
      {/* LEFT SIDE */}
      <div className="navbar-left">
        <i
          className="fa-regular fa-globe"
          style={{ color: "#0077ff", fontSize: "1.6rem" }}
        ></i>

        <Link href="/" className="logo">
          CarryConnect
        </Link>
      </div>

      {/* CENTER LINKS */}
      <div className="navbar-center">
        <Link href="/find-a-carrier">Find a Carrier</Link>
        <Link href="/add-trip">Add Trip</Link>
        {user && (
          <>
            <Link href="/my-trips">My Trips</Link>
            <Link href="/my-orders">My Orders</Link>
          </>
        )}
      </div>

      {/* RIGHT ICONS */}
      <div className="navbar-right">
        {user ? (
          <>
            <Link href="/messages" className="icon">
              <span className="icon-wrap">
                <i className="fa-regular fa-comments"></i>
                {hasUnread && <span className="icon-badge" />}
              </span>
            </Link>

            <Link href="/profile" className="icon">
              <i className="fa-regular fa-user"></i>
            </Link>

            <button
              onClick={handleLogout}
              className="logout-btn"
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            {!loading && (
              <Link href="/auth" className="add-trip-btn">
                Login / Sign Up
              </Link>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
