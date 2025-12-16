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

    const getSeenKey = (uid, tripId) =>
      `cc_seen_${uid}_${tripId}`

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
        const {
          getUserTrips,
          getUserOrders,
          listenToTripLastMessage,
        } = await import("../../lib/db")

        const postedTrips = await getUserTrips(user.uid)
        const bookedOrders = await getUserOrders(user.uid)
        const trips = [...postedTrips, ...bookedOrders].filter(
          (t) => t.status === "booked"
        )

        const uniqueTripIds = Array.from(new Set(trips.map((t) => t.id)))

        unsubs = uniqueTripIds.map((tripId) =>
          listenToTripLastMessage(tripId, (msg) => {
            if (!isMounted) return
            if (!msg || !msg.sentAt || msg.senderUid === user.uid) return
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
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* LOGO */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-[2px] shadow-md group-hover:shadow-lg transition-all duration-200 group-hover:scale-105">
              <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                <Image
                  src="/favicon.ico"
                  alt="CarryConnect"
                  width={20}
                  height={20}
                  priority
                />
              </div>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              CarryConnect
            </span>
          </Link>

          {/* LINKS */}
          <div className="hidden lg:flex items-center gap-1">
            <Link href="/find-a-carrier" className="nav-link">Find a Carrier</Link>
            <Link href="/add-trip" className="nav-link">Add Trip</Link>
            {user && (
              <>
                <Link href="/my-trips" className="nav-link">My Trips</Link>
                <Link href="/my-orders" className="nav-link">My Orders</Link>
              </>
            )}
          </div>

          {/* ACTIONS */}
          <div className="hidden md:flex items-center gap-2">
            <button className="icon-btn">
              <i className="fa-solid fa-search"></i>
            </button>

            {user && (
              <Link href="/messages" className="icon-btn relative">
                <i className="fa-regular fa-comments"></i>
                {hasUnread && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </Link>
            )}

            {user ? (
              <>
                <Link href="/profile" className="icon-btn">
                  <i className="fa-regular fa-user"></i>
                </Link>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </>
            ) : (
              !loading && (
                <Link href="/auth" className="login-btn">
                  Login / Sign Up
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
