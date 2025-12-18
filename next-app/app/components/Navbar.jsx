"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false)
  const [trackedTripIds, setTrackedTripIds] = useState([])

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
      setHasUnreadMessages(false)
      setHasUnreadNotifications(false)
      setTrackedTripIds([])
      return
    }

    let mounted = true
    let unsubs = []
    const unreadMap = {}

    const getSeenKey = (uid, tripId) => `cc_seen_${uid}_${tripId}`

    const getLastSeen = (uid, tripId) => {
      try {
        const raw = localStorage.getItem(getSeenKey(uid, tripId))
        return raw ? Number(raw) : 0
      } catch {
        return 0
      }
    }

    const toMillis = (ts) => {
      if (!ts) return 0
      if (typeof ts === "number") return ts
      if (ts?.toMillis) return ts.toMillis()
      if (ts?.toDate) return ts.toDate().getTime()
      return new Date(ts).getTime()
    }

    async function initUnread() {
      try {
        const {
          getUserTrips,
          getUserOrders,
          listenToTripLastMessage,
          listenToNotifications
        } = await import("../../lib/db")

        const postedTrips = await getUserTrips(user.uid)
        const bookedOrders = await getUserOrders(user.uid)

        const trips = [...postedTrips, ...bookedOrders].filter(
          (t) => t.status === "booked"
        )

        const uniqueTripIds = Array.from(new Set(trips.map((t) => t.id)))
        setTrackedTripIds(uniqueTripIds)

        unsubs = uniqueTripIds.map((tripId) =>
          listenToTripLastMessage(tripId, (msg) => {
            if (!mounted || !msg) return

            const msgTime = toMillis(msg.sentAt)
            const lastSeen = getLastSeen(user.uid, tripId)

            if (msg.senderUid !== user.uid && msgTime > lastSeen) {
              unreadMap[tripId] = true
            } else {
              unreadMap[tripId] = false
            }

            setHasUnreadMessages(Object.values(unreadMap).some(Boolean))
          })
        )

        const unsubNotifications = listenToNotifications((notifs) => {
          const hasUnread = notifs.some((n) => !n.isRead)
          setHasUnreadNotifications(hasUnread)
        })

        unsubs.push(unsubNotifications)
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

  const openMessages = () => {
    if (!user) return
    const now = Date.now()
    trackedTripIds.forEach((tripId) => {
      localStorage.setItem(`cc_seen_${user.uid}_${tripId}`, String(now))
    })
    setHasUnreadMessages(false)
    router.push("/messages")
  }

  const openNotifications = () => {
    router.push("/notifications")
  }

  return (
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
            <button className="icon-wrap cc-iconBtn" onClick={openNotifications}>
              <i className="fa-regular fa-bell icon"></i>
              {hasUnreadNotifications && <span className="icon-badge"></span>}
            </button>

            <button className="icon-wrap cc-iconBtn" onClick={openMessages}>
              <i className="fa-regular fa-comments icon"></i>
              {hasUnreadMessages && <span className="icon-badge"></span>}
            </button>

            <Link href="/profile" className="icon-wrap cc-iconBtn">
              <i className="fa-regular fa-user icon"></i>
            </Link>

            <button onClick={handleLogout} className="add-trip-btn" style={{ background: "#ef4444" }}>
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
      </div>
    </nav>
  )
}
