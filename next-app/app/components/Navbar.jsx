"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { onAuthChange } = await import("../../lib/auth");
        const unsubscribe = onAuthChange((currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });
        return () => unsubscribe();
      } catch (error) {
        console.error("Auth error:", error);
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      const { logOut } = await import("../../lib/auth");
      await logOut();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <nav className="navbar">
      {/* LEFT SIDE */}
      <div className="navbar-left">
        <i
          className="fa-regular fa-globe"
          style={{ color: "#0077ff", fontSize: "1.6rem" }}
        ></i>

        <Link href="/" className="logo">
          CarryConnect
        </Link>
      </div>

      {/* CENTER LINKS */}
      <div className="navbar-center">

        <Link href="/find-a-carrier">Find a Carrier</Link>
        {user && <Link href="/my-trips">My Trips</Link>}
      </div>

      {/* RIGHT ICONS */}
      <div className="navbar-right">
        {user ? (
          <>
            <Link href="/messages" className="icon">
              <i className="fa-regular fa-comments"></i>
            </Link>

            <Link href="/profile" className="icon">
              <i className="fa-regular fa-user"></i>
            </Link>

            <Link href="/add-trip" className="add-trip-btn">
              Add Trip
            </Link>

            <button
              onClick={handleLogout}
              className="logout-btn"
              style={{
                background: '#f44336',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            {!loading && (
              <Link href="/auth" className="add-trip-btn">
                Login / Sign Up
              </Link>
            )}
          </>
        )}
      </div>
    </nav>
  );
}
