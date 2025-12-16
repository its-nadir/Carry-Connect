"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasUnread, setHasUnread] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      try {
        const { onAuthChange } = await import("../../lib/auth")
        const unsubscribe = onAuthChange((currentUser: any) => {
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
    let unsubs: any[] = []

    const getSeenKey = (uid: string, tripId: string) =>
      `cc_seen_${uid}_${tripId}`

    const getLastSeen = (uid: string, tripId: string) => {
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
          listenToTripLastMessage(tripId, (msg: any) => {
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

          {/* DESKTOP LINKS */}
          <div className="hidden lg:flex items-center gap-1">
            <Link
              href="/find-a-carrier"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition"
            >
              Find a Carrier
            </Link>
            <Link
              href="/add-trip"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition"
            >
              Add Trip
            </Link>

            {user && (
              <>
                <Link
                  href="/my-trips"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition"
                >
                  My Trips
                </Link>
                <Link
                  href="/my-orders"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600 rounded-lg transition"
                >
                  My Orders
                </Link>
              </>
            )}
          </div>

          {/* ACTIONS */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              <i className="fa-solid fa-search"></i>
            </button>

            {user && (
              <Link
                href="/messages"
                className="relative p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <i className="fa-regular fa-comments"></i>
                {hasUnread && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                )}
              </Link>
            )}

            {user ? (
              <>
                <Link
                  href="/profile"
                  className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <i className="fa-regular fa-user"></i>
                </Link>
                <button
                  onClick={handleLogout}
                  className="ml-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  Logout
                </button>
              </>
            ) : (
              !loading && (
                <Link
                  href="/auth"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  Login / Sign Up
                </Link>
              )
            )}
          </div>

          {/* MOBILE TOGGLE */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <i
              className={`fa-solid ${
                isMobileMenuOpen ? "fa-xmark" : "fa-bars"
              } text-xl`}
            ></i>
          </button>
        </div>
      </div>
    </nav>
  )
}
