"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasUnread, setHasUnread] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const { onAuthChange } = await import("../../lib/auth")
        const unsubscribe = onAuthChange((currentUser) => {
          setUser(currentUser)
          setLoading(false)
        })
        return () => unsubscribe()
      } catch (error) {
        console.error("Auth error:", error)
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (!user) {
      setHasUnread(false)
      return
    }

    let isMounted = true
    let unsubs = []

    const getSeenKey = (uid, tripId) => `cc_seen_${uid}_${tripId}`
    const getLastSeen = (uid, tripId) => {
      try {
        const raw = localStorage.getItem(getSeenKey(uid, tripId))
        return raw ? Number(raw) : 0
      } catch {
        return 0
      }
    }

    async function initUnread() {
      try {
        const { getUserTrips, getUserOrders, listenToTripLastMessage } =
          await import("../../lib/db")

        const postedTrips = await getUserTrips(user.uid)
        const bookedOrders = await getUserOrders(user.uid)
        const trips = [...postedTrips, ...bookedOrders].filter(
          (t) => t.status === "booked"
        )

        const uniqueTripIds = Array.from(new Set(trips.map((t) => t.id)))

        unsubs = uniqueTripIds.map((tripId) =>
          listenToTripLastMessage(tripId, (msg) => {
            if (!isMounted) return
            if (!msg || !msg.sentAt || !msg.senderUid || msg.senderUid === user.uid) return
            const lastSeen = getLastSeen(user.uid, tripId)
            const msgTime = new Date(msg.sentAt).getTime()
            if (msgTime > lastSeen) setHasUnread(true)
          })
        )
      } catch {
        if (isMounted) setHasUnread(false)
      }
    }

    initUnread()
    return () => {
      isMounted = false
      unsubs.forEach((u) => {
        try {
          u && u()
        } catch {}
      })
    }
  }, [user])

  const handleLogout = async () => {
    try {
      const { logOut } = await import("../../lib/auth")
      await logOut()
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <>
      <nav className="navbar">
        {/* LEFT */}
        <div className="navbar-left">
          <Link href="/" className="logo cc-logo">
            <span className="cc-logoMark">
              <Image src="/favicon.ico" alt="CarryConnect" width={18} height={18} priority />
            </span>
            <span className="cc-brandText">CarryConnect</span>
          </Link>
        </div>

        {/* CENTER (desktop) */}
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

        {/* RIGHT */}
        <div className="navbar-right">
          {/* Search */}
          <div className="cc-search">
            {isSearchOpen ? (
              <div className="cc-searchBox">
                <i className="fa-solid fa-magnifying-glass cc-searchIcon"></i>
                <input
                  className="cc-searchInput"
                  placeholder="Search..."
                  autoFocus
                  onBlur={() => setTimeout(() => setIsSearchOpen(false), 150)}
                />
                <button
                  className="cc-searchClose"
                  onClick={() => setIsSearchOpen(false)}
                  aria-label="Close search"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            ) : (
              <button
                className="icon-wrap cc-iconBtn"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search"
              >
                <i className="fa-solid fa-magnifying-glass icon"></i>
              </button>
            )}
          </div>

          {user ? (
            <>
              {/* Messages */}
              <Link href="/messages" className="icon-wrap cc-iconBtn" aria-label="Messages">
                <i className="fa-regular fa-comments icon"></i>
                {hasUnread && <span className="icon-badge"></span>}
              </Link>

              {/* Profile */}
              <Link href="/profile" className="icon-wrap cc-iconBtn" aria-label="Profile">
                <i className="fa-regular fa-user icon"></i>
              </Link>

              {/* Logout */}
              <button onClick={handleLogout} className="cc-btn cc-btnDanger">
                Logout
              </button>
            </>
          ) : (
            !loading && (
              <Link href="/auth" className="cc-btn cc-btnPrimary">
                Login / Sign Up
              </Link>
            )
          )}

          {/* Mobile Toggle */}
          <button
            className="cc-mobileToggle"
            onClick={() => setIsMobileMenuOpen((s) => !s)}
            aria-label="Toggle menu"
          >
            <i className={`fa-solid ${isMobileMenuOpen ? "fa-xmark" : "fa-bars"}`}></i>
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="cc-mobileMenu">
          <Link href="/find-a-carrier" onClick={() => setIsMobileMenuOpen(false)}>
            Find a Carrier
          </Link>
          <Link href="/add-trip" onClick={() => setIsMobileMenuOpen(false)}>
            Add Trip
          </Link>

          {user && (
            <>
              <Link href="/my-trips" onClick={() => setIsMobileMenuOpen(false)}>
                My Trips
              </Link>
              <Link href="/my-orders" onClick={() => setIsMobileMenuOpen(false)}>
                My Orders
              </Link>
              <Link href="/messages" onClick={() => setIsMobileMenuOpen(false)}>
                Messages {hasUnread ? "•" : ""}
              </Link>
              <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                Profile
              </Link>
              <button
                onClick={() => {
                  handleLogout()
                  setIsMobileMenuOpen(false)
                }}
                className="cc-mobileLogout"
              >
                Logout
              </button>
            </>
          )}

          {!user && !loading && (
            <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)} className="cc-mobileAuth">
              Login / Sign Up
            </Link>
          )}
        </div>
      )}
    </>
  )
}
