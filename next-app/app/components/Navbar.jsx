"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

function LogoMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 8.8c0-.55-.3-1.05-.78-1.31l-6.2-3.45a2.18 2.18 0 0 0-2.04 0l-6.2 3.45c-.48.26-.78.76-.78 1.31v6.4c0 .55.3 1.05.78 1.31l6.2 3.45c.63.35 1.41.35 2.04 0l6.2-3.45c.48-.26.78-.76.78-1.31V8.8Z"
          fill="rgba(255,255,255,.22)"
        />
        <path
          d="M10.2 8.4 16 12l-5.8 3.6V8.4Z"
          fill="white"
        />
      </svg>
    </span>
  );
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = useMemo(() => {
    const base = [
      { href: "/find-a-carrier", label: "Find a Carrier" },
      { href: "/add-trip", label: "Add Trip" }
    ];
    const authed = [
      { href: "/my-trips", label: "My Trips" },
      { href: "/my-orders", label: "My Orders" }
    ];
    return user ? [...base, ...authed] : base;
  }, [user]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { onAuthChange } = await import("../../lib/auth");
        const unsubscribe = onAuthChange((currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });
        return () => unsubscribe();
      } catch (e) {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

        unsubs = uniqueTripIds.map((tripId) =>
          listenToTripLastMessage(tripId, (msg) => {
            if (!isMounted) return;
            if (!msg || !msg.sentAt || !msg.senderUid || msg.senderUid === user.uid) return;
            const lastSeen = getLastSeen(user.uid, tripId);
            const msgTime = new Date(msg.sentAt).getTime();
            if (msgTime > lastSeen) setHasUnread(true);
          })
        );
      } catch {
        if (isMounted) setHasUnread(false);
      }
    }

    initUnread();
    return () => {
      isMounted = false;
      unsubs.forEach((u) => {
        try {
          u && u();
        } catch {}
      });
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      const { logOut } = await import("../../lib/auth");
      await logOut();
      router.push("/");
    } catch {}
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="brand" aria-label="CarryConnect Home">
          <LogoMark />
          <span>CarryConnect</span>
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={pathname === l.href ? "nav-link nav-link-active" : "nav-link"}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="nav-right">
          {user ? (
            <>
              <Link href="/messages" className="icon-btn" aria-label="Messages">
                <i className="fa-regular fa-comments" />
                {hasUnread && <span className="icon-badge" />}
              </Link>

              <Link href="/profile" className="icon-btn" aria-label="Profile">
                <i className="fa-regular fa-user" />
              </Link>

              <button onClick={handleLogout} className="danger-pill" type="button">
                Logout
              </button>

              <button
                type="button"
                className="icon-btn menu-btn"
                aria-label="Open menu"
                onClick={() => setMobileOpen((v) => !v)}
              >
                <i className={mobileOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"} />
              </button>
            </>
          ) : (
            <>
              {!loading && (
                <Link href="/auth" className="primary-pill">
                  Login / Sign Up
                </Link>
              )}
              <button
                type="button"
                className="icon-btn menu-btn"
                aria-label="Open menu"
                onClick={() => setMobileOpen((v) => !v)}
              >
                <i className={mobileOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className={mobileOpen ? "mobile-menu mobile-menu-open" : "mobile-menu"}>
        <div className="mobile-menu-inner">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="mobile-link">
              <span>{l.label}</span>
              <i className="fa-solid fa-chevron-right" />
            </Link>
          ))}
          {user && (
            <Link href="/messages" className="mobile-link">
              <span>Messages</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                {hasUnread ? <span className="icon-badge" style={{ position: "static" }} /> : null}
                <i className="fa-solid fa-chevron-right" />
              </span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
