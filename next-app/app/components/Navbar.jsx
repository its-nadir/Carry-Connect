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

  useEffect(() => {
    async function checkAuth() {
      try {
        const { onAuthChange } = await import("../../lib/auth")
        const unsubscribe = onAuthChange((currentUser) => {
          setUser(currentUser)
          setLoading(false)
        })
        return () => unsubscribe()
      } catch {
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

    let mounted = true
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
            if (!mounted) return
            if (!msg || msg.senderUid === user.uid) return
            const lastSeen = getLastSeen(user.uid, tripId)
            const msgTime = new Date(msg.sentAt).getTime()
            if (msgTime > lastSeen) setHasUnread(true)
          })
        )
      } catch {}
    }

    initUnread()
    return () => {
      mounted = false
      unsubs.forEach((u) => u && u())
    }
  }, [user])

  const handleLogout = async () => {
    const { logOut } = await import("../../lib/auth")
    await logOut()
    router.push("/")
  }

  return (
    <>
      <nav className="navbar cc-navbar">
        <div className="navbar-left">
          <Link href="/" className="logo cc-logo">
            <span className="cc-logoMark">
              <Image src="/favicon.ico" alt="CarryConnect" width={18} height={18} />
            </span>
            <span className="cc-brandText">CarryConnect</span>
          </Link>
        </div>

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

        <div className="navbar-right">
          {user ? (
            <>
              <Link href="/messages" className="icon-wrap cc-iconBtn">
                <i className="fa-regular fa-comments icon"></i>
                {hasUnread && <span className="icon-badge"></span>}
              </Link>

              <Link href="/profile" className="icon-wrap cc-iconBtn">
                <i className="fa-regular fa-user icon"></i>
              </Link>

              <button onClick={handleLogout} className="add-trip-btn" style={{background: '#ef4444'}}>
                Logout
              </button>
            </>
          ) : (
            !loading && (
              <Link href="/auth" className="add-trip-btn">
                Login / Sign Up
              </Link>
            )
          )}

          <button
            className="cc-mobileToggle"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
          >
            <i className={`fa-solid ${isMobileMenuOpen ? "fa-xmark" : "fa-bars"}`}></i>
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="cc-mobileMenu">
          <Link href="/find-a-carrier">Find a Carrier</Link>
          <Link href="/add-trip">Add Trip</Link>
          {user && (
            <>
              <Link href="/my-trips">My Trips</Link>
              <Link href="/my-orders">My Orders</Link>
              <Link href="/messages">Messages</Link>
              <Link href="/profile">Profile</Link>
              <button onClick={handleLogout} className="cc-mobileLogout">
                Logout
              </button>
            </>
          )}
          {!user && !loading && (
            <Link href="/auth" className="cc-mobileAuth">
              Login / Sign Up
            </Link>
          )}
        </div>
      )}
    </>
  )
}
