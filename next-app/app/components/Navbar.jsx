"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

export default function Navbar() {
  const router = useRouter()
  const notifRef = useRef(null)

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [showNotifPopup, setShowNotifPopup] = useState(false)

  const [trackedTripIds, setTrackedTripIds] = useState([])

  useEffect(() => {
    async function checkAuth() {
      try {
        const { onAuthChange } = await import("../../lib/auth")
        const unsub = onAuthChange((u) => {
          setUser(u)
          setLoading(false)
        })
        return () => unsub()
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
      setNotifications([])
      return
    }

    let mounted = true
    let unsubs = []
    const unreadMap = {}

    async function init() {
      try {
        const {
          getUserTrips,
          getUserOrders,
          listenToTripLastMessage,
          listenToNotifications
        } = await import("../../lib/db")

        const posted = await getUserTrips(user.uid)
        const booked = await getUserOrders(user.uid)

        const trips = [...posted, ...booked].filter(t => t.status === "booked")
        const ids = Array.from(new Set(trips.map(t => t.id)))
        setTrackedTripIds(ids)

        // Listen to last messages for unread indicator
        unsubs = ids.map(tripId =>
          listenToTripLastMessage(tripId, (msg) => {
            if (!mounted || !msg) return

            const seenBy = Array.isArray(msg.seenBy) ? msg.seenBy : []
            // Message is unread if it's not from me and I haven't seen it
            unreadMap[tripId] = msg.senderUid !== user.uid && !seenBy.includes(user.uid)

            // Update badge
            setHasUnreadMessages(Object.values(unreadMap).some(Boolean))
          })
        )

        // Listen to notifications
        const unsubNotif = listenToNotifications((list) => {
          setNotifications(list.slice(0, 12))
          setHasUnreadNotifications(list.some(n => !n.isRead))
        })

        unsubs.push(unsubNotif)
      } catch (err) {
        console.error("Error initializing navbar:", err)
      }
    }

    init()
    return () => {
      mounted = false
      unsubs.forEach(u => u && u())
    }
  }, [user])

  useEffect(() => {
    function close(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifPopup(false)
      }
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])

  const handleLogout = async () => {
    const { logOut } = await import("../../lib/auth")
    await logOut()
    router.push("/")
  }

  // FIXED: Navigate immediately without blocking
  const openMessages = () => {
    router.push("/messages")
  }

  const openNotification = async (n) => {
    const { markNotificationRead } = await import("../../lib/db")
    await markNotificationRead(n.id)
    setShowNotifPopup(false)
    router.push(n.link)
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
            <div className="icon-wrap cc-iconBtn" ref={notifRef}>
              <button
                className="icon-btn-reset"
                onClick={() => setShowNotifPopup(v => !v)}
              >
                <i className="fa-regular fa-bell icon"></i>
                {hasUnreadNotifications && <span className="icon-badge"></span>}
              </button>

              {showNotifPopup && (
                <div className="notif-dropdown">
                  {notifications.length === 0 ? (
                    <div className="notif-empty">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className={`notif-item ${!n.isRead ? "unread" : ""}`}
                        onClick={() => openNotification(n)}
                      >
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-msg">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <button className="icon-wrap cc-iconBtn icon-btn-reset" onClick={openMessages}>
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
