"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
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
        const { getUserTrips, getUserOrders, listenToTripLastMessage } = await import("../../lib/db")
        const postedTrips = await getUserTrips(user.uid)
        const bookedOrders = await getUserOrders(user.uid)
        const trips = [...postedTrips, ...bookedOrders].filter((t) => t.status === "booked")
        const uniqueTripIds = Array.from(new Set(trips.map((t) => t.id)))

        unsubs = uniqueTripIds.map((tripId) =>
          listenToTripLastMessage(tripId, (msg) => {
            if (!isMounted) return
            if (!msg || !msg.sentAt || !msg.senderUid || msg.senderUid === user.uid) return
            const lastSeen = getLastSeen(user.uid, tripId)
            const msgTime = new Date(msg.sentAt).getTime()
            if (msgTime > lastSeen) setHasUnread(true)
          }),
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
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200 group-hover:scale-105">
                <i className="fa-regular fa-globe text-white text-lg"></i>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                CarryConnect
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              <Link
                href="/find-a-carrier"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Find a Carrier
              </Link>
              <Link
                href="/add-trip"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                Add Trip
              </Link>
              {user && (
                <>
                  <Link
                    href="/my-trips"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    My Trips
                  </Link>
                  <Link
                    href="/my-orders"
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    My Orders
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {/* Search Button */}
            {isSearchOpen ? (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                <div className="relative">
                  <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                  <input
                    type="text"
                    placeholder="Search..."
                    autoFocus
                    className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)}
                  />
                </div>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <i className="fa-solid fa-times text-sm"></i>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Search"
              >
                <i className="fa-solid fa-search text-base"></i>
              </button>
            )}

            {user ? (
              <>
                {/* Messages with unread indicator */}
                <Link
                  href="/messages"
                  className="relative p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Messages"
                >
                  <i className="fa-regular fa-comments text-base"></i>
                  {hasUnread && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                  )}
                </Link>

                {/* Divider */}
                <div className="w-px h-6 bg-gray-200 mx-1"></div>

                {/* Profile */}
                <Link
                  href="/profile"
                  className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Profile"
                >
                  <i className="fa-regular fa-user text-base"></i>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="ml-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                {!loading && (
                  <Link
                    href="/auth"
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Login / Sign Up
                  </Link>
                )}
              </>
            )}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <i className={`fa-solid ${isMobileMenuOpen ? "fa-times" : "fa-bars"} text-xl`}></i>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white animate-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 space-y-1">
            <Link
              href="/find-a-carrier"
              className="block px-4 py-3 text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Find a Carrier
            </Link>
            <Link
              href="/add-trip"
              className="block px-4 py-3 text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Add Trip
            </Link>
            {user && (
              <>
                <Link
                  href="/my-trips"
                  className="block px-4 py-3 text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  My Trips
                </Link>
                <Link
                  href="/my-orders"
                  className="block px-4 py-3 text-base font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  My Orders
                </Link>
              </>
            )}

            {/* Mobile Actions */}
            <div className="pt-3 border-t border-gray-200 space-y-2">
              {user ? (
                <>
                  <Link
                    href="/messages"
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <i className="fa-regular fa-comments text-lg"></i>
                    <span className="text-sm font-medium">Messages</span>
                    {hasUnread && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full"></span>}
                  </Link>
                  <Link
                    href="/profile"
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <i className="fa-regular fa-user text-lg"></i>
                    <span className="text-sm font-medium">Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMobileMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                  >
                    <i className="fa-solid fa-right-from-bracket text-lg"></i>
                    <span className="text-sm font-semibold">Logout</span>
                  </button>
                </>
              ) : (
                !loading && (
                  <Link
                    href="/auth"
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login / Sign Up
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
