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
      <nav className="cc-navbar">
        <div className="cc-navContainer">
          {/* LEFT - Logo */}
          <div className="cc-navLeft">
            <Link href="/" className="cc-logo">
              <span className="cc-logoMark">
                <Image src="/favicon.ico" alt="CarryConnect" width={18} height={18} priority />
              </span>
              <span className="cc-brandText">CarryConnect</span>
            </Link>
          </div>

          {/* CENTER - Navigation Links */}
          <div className="cc-navCenter">
            <Link href="/find-a-carrier" className="cc-navLink">
              Find a Carrier
            </Link>
            <Link href="/add-trip" className="cc-navLink">
              Add Trip
            </Link>

            {user && (
              <>
                <Link href="/my-trips" className="cc-navLink">
                  My Trips
                </Link>
                <Link href="/my-orders" className="cc-navLink">
                  My Orders
                </Link>
              </>
            )}
          </div>

          {/* RIGHT - Actions */}
          <div className="cc-navRight">
            {/* Search */}
            <div className="cc-searchWrapper">
              {isSearchOpen ? (
                <div className="cc-searchExpanded">
                  <i className="fa-solid fa-magnifying-glass cc-searchIconExpanded"></i>
                  <input
                    className="cc-searchInput"
                    placeholder="Search trips, orders..."
                    autoFocus
                    onBlur={() => setTimeout(() => setIsSearchOpen(false), 150)}
                  />
                  <button
                    className="cc-searchCloseBtn"
                    onClick={() => setIsSearchOpen(false)}
                    aria-label="Close search"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              ) : (
                <button
                  className="cc-navIconBtn"
                  onClick={() => setIsSearchOpen(true)}
                  aria-label="Search"
                  title="Search"
                >
                  <i className="fa-solid fa-magnifying-glass"></i>
                </button>
              )}
            </div>

            {user ? (
              <>
                {/* Messages */}
                <Link href="/messages" className="cc-navIconBtn" aria-label="Messages" title="Messages">
                  <i className="fa-regular fa-comments"></i>
                  {hasUnread && <span className="cc-notificationDot"></span>}
                </Link>

                {/* Profile */}
                <Link href="/profile" className="cc-navIconBtn" aria-label="Profile" title="Profile">
                  <i className="fa-regular fa-user"></i>
                </Link>

                {/* Logout Button */}
                <button onClick={handleLogout} className="cc-navBtn cc-navBtnSecondary">
                  Logout
                </button>
              </>
            ) : (
              !loading && (
                <Link href="/auth" className="cc-navBtn cc-navBtnPrimary">
                  Sign In
                </Link>
              )
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="cc-mobileMenuBtn"
              onClick={() => setIsMobileMenuOpen((s) => !s)}
              aria-label="Toggle menu"
            >
              <i className={`fa-solid ${isMobileMenuOpen ? "fa-xmark" : "fa-bars"}`}></i>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`cc-mobileMenuOverlay ${isMobileMenuOpen ? "cc-mobileMenuOpen" : ""}`}>
        <div className="cc-mobileMenuContent">
          <div className="cc-mobileMenuLinks">
            <Link href="/find-a-carrier" onClick={() => setIsMobileMenuOpen(false)} className="cc-mobileLink">
              <i className="fa-solid fa-truck"></i>
              <span>Find a Carrier</span>
            </Link>
            <Link href="/add-trip" onClick={() => setIsMobileMenuOpen(false)} className="cc-mobileLink">
              <i className="fa-solid fa-plus-circle"></i>
              <span>Add Trip</span>
            </Link>

            {user && (
              <>
                <Link href="/my-trips" onClick={() => setIsMobileMenuOpen(false)} className="cc-mobileLink">
                  <i className="fa-solid fa-route"></i>
                  <span>My Trips</span>
                </Link>
                <Link href="/my-orders" onClick={() => setIsMobileMenuOpen(false)} className="cc-mobileLink">
                  <i className="fa-solid fa-box"></i>
                  <span>My Orders</span>
                </Link>
                <Link href="/messages" onClick={() => setIsMobileMenuOpen(false)} className="cc-mobileLink">
                  <i className="fa-regular fa-comments"></i>
                  <span>Messages</span>
                  {hasUnread && <span className="cc-mobileBadge">•</span>}
                </Link>
                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} className="cc-mobileLink">
                  <i className="fa-regular fa-user"></i>
                  <span>Profile</span>
                </Link>
              </>
            )}
          </div>

          <div className="cc-mobileMenuFooter">
            {user ? (
              <button
                onClick={() => {
                  handleLogout()
                  setIsMobileMenuOpen(false)
                }}
                className="cc-mobileActionBtn cc-mobileLogoutBtn"
              >
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>Logout</span>
              </button>
            ) : (
              !loading && (
                <Link
                  href="/auth"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="cc-mobileActionBtn cc-mobileAuthBtn"
                >
                  <i className="fa-solid fa-arrow-right-to-bracket"></i>
                  <span>Sign In</span>
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </>
  )
}
