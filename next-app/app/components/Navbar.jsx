"use client"

import { useState, useEffect, useRef } from "react"
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
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef(null)

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
    function onDocClick(e) {
      if (!notifOpen) return
      if (!notifRef.current) return
      if (!notifRef.current.contains(e.target)) setNotifOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [notifOpen])

  useEffect(() => {
    if (!user) {
      setHasUnreadMessages(false)
      setHasUnreadNotifications(false)
      setTrackedTripIds([])
      setNotifications([])
      setNotifOpen(false)
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
      const t = new Date(ts).getTime()
      return Number.isFinite(t) ? t : 0
    }

    const formatNotifTime = (createdAt) => {
      const t = toMillis(createdAt)
      if (!t) return ""
      const diff = Date.now() - t
      const mins = Math.floor(diff / 60000)
      if (mins < 1) return "Just now"
      if (mins < 60) return `${mins}m`
      const hrs = Math.floor(mins / 60)
      if (hrs < 24) return `${hrs}h`
      const days = Math.floor(hrs / 24)
      return `${days}d`
    }

    async function initUnread() {
      try {
        const {
          getUserTrips,
          getUserOrders,
          listenToTripLastMessage,
          listenToNotifications,
          markNotificationRead
        } = await import("../../lib/db")

        const postedTrips = await getUserTrips(user.uid)
        const bookedOrders = await getUserOrders(user.uid)

        const trips = [...postedTrips, ...bookedOrders].filter((t) => t.status === "booked")
        const uniqueTripIds = Array.from(new Set(trips.map((t) => t.id)))
        setTrackedTripIds(uniqueTripIds)

        unsubs = uniqueTripIds.map((tripId) =>
          listenToTripLastMessage(tripId, (msg) => {
            if (!mounted) return
            if (!msg) {
              unreadMap[tripId] = false
              setHasUnreadMessages(Object.values(unreadMap).some(Boolean))
              return
            }

            const msgTime = toMillis(msg.sentAt)
            const lastSeen = getLastSeen(user.uid, tripId)

            if (msg.senderUid !== user.uid && msgTime > lastSeen) unreadMap[tripId] = true
            else unreadMap[tripId] = false

            setHasUnreadMessages(Object.values(unreadMap).some(Boolean))
          })
        )

        const unsubNotifications = listenToNotifications((notifs) => {
          if (!mounted) return
          setNotifications(notifs.slice(0, 6))
          setHasUnreadNotifications(notifs.some((n) => !n.isRead))
        })

        unsubs.push(unsubNotifications)

        const originalOpen = () => setNotifOpen((v) => !v)
        const openAndAutoRead = () => {
          setNotifOpen((v) => !v)
          setHasUnreadNotifications(false)
          try {
            notifications
              .filter((n) => n && !n.isRead && n.id)
              .forEach((n) => markNotificationRead(n.id))
          } catch {}
        }

        Navbar.__openNotif = openAndAutoRead
        Navbar.__formatNotifTime = formatNotifTime
      } catch {}
    }

    initUnread()
    return () => {
      mounted = false
      unsubs.forEach((u) => u && u())
    }
  }, [user, notifications])

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

  const toggleNotifications = async () => {
    try {
      const { markNotificationRead } = await import("../../lib/db")
      setNotifOpen((v) => !v)
      setHasUnreadNotifications(false)
      notifications
        .filter((n) => n && !n.isRead && n.id)
        .forEach((n) => markNotificationRead(n.id))
    } catch {
      setNotifOpen((v) => !v)
    }
  }

  const openNotifLink = async (n) => {
    try {
      const { markNotificationRead } = await import("../../lib/db")
      if (n?.id) await markNotificationRead(n.id)
    } catch {}
    setNotifOpen(false)
    if (n?.link) router.push(n.link)
  }

  const notifTime = (createdAt) => {
    const t =
      typeof createdAt === "number"
        ? createdAt
        : createdAt?.toMillis
        ? createdAt.toMillis()
        : createdAt?.toDate
        ? createdAt.toDate().getTime()
        : new Date(createdAt || 0).getTime()

    if (!t) return ""
    const diff = Date.now() - t
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    const days = Math.floor(hrs / 24)
    return `${days}d`
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
            <div className="icon-wrap cc-iconBtn" style={{ position: "relative" }} ref={notifRef}>
              <button
                type="button"
                className="icon-wrap cc-iconBtn"
                onClick={toggleNotifications}
                style={{ border: "none", background: "transparent", padding: 0 }}
                aria-label="Notifications"
              >
                <i className="fa-regular fa-bell icon"></i>
                {hasUnreadNotifications && <span className="icon-badge"></span>}
              </button>

              {notifOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "46px",
                    right: 0,
                    width: "320px",
                    background: "#fff",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: "12px",
                    boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
                    overflow: "hidden",
                    zIndex: 9999
                  }}
                >
                  <div
                    style={{
                      padding: "12px 14px",
                      borderBottom: "1px solid rgba(0,0,0,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <strong style={{ fontSize: "14px" }}>Notifications</strong>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#666"
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ padding: "14px", color: "#777", fontSize: "13px" }}>
                      No notifications yet.
                    </div>
                  ) : (
                    <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => openNotifLink(n)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "12px 14px",
                            border: "none",
                            background: n.isRead ? "#fff" : "#f5f7ff",
                            cursor: "pointer",
                            display: "flex",
                            gap: "10px",
                            borderBottom: "1px solid rgba(0,0,0,0.06)"
                          }}
                        >
                          <div
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "999px",
                              background: "#c7d9ff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700
                            }}
                          >
                            <i className="fa-regular fa-bell" />
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                              <div style={{ fontSize: "13px", fontWeight: 700, color: "#111" }}>
                                {n.title || "Notification"}
                              </div>
                              <div style={{ fontSize: "12px", color: "#777", whiteSpace: "nowrap" }}>
                                {notifTime(n.createdAt)}
                              </div>
                            </div>
                            <div style={{ fontSize: "12px", color: "#444", marginTop: "4px" }}>
                              {n.message || ""}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={{ padding: "10px 14px", background: "#fff" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false)
                        router.push("/notifications")
                      }}
                      style={{
                        width: "100%",
                        border: "1px solid rgba(0,0,0,0.12)",
                        background: "#fff",
                        borderRadius: "10px",
                        padding: "10px",
                        cursor: "pointer",
                        fontWeight: 700
                      }}
                    >
                      See all
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="icon-wrap cc-iconBtn"
              onClick={openMessages}
              style={{ border: "none", background: "transparent" }}
              aria-label="Messages"
            >
              <i className="fa-regular fa-comments icon"></i>
              {hasUnreadMessages && <span className="icon-badge"></span>}
            </button>

            <Link href="/profile" className="icon-wrap cc-iconBtn" aria-label="Profile">
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
