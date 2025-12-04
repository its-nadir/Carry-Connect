import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import SearchBox from "./components/SearchBox";

export default function Home() {
  return (
    <main>
      {/* HERO SECTION */}
      <section className="main">
        <div className="main-content">
          <div className="text-content">
            <h1>
              Send Packages Globally
              <br />
              with Trusted Travelers
            </h1>

            <p>
              Connect with travelers heading to your destination and send your
              packages safely and affordably. Or earn extra by delivering
              packages on your trip.
            </p>

            <div className="buttons">
              <Link href="/find-a-carrier">
                <button className="primary-btn">
                  <i className="fa-solid fa-box-open"></i> Find a Carrier
                </button>
              </Link>
              <Link href="/add-trip">
                <button className="secondary-btn">
                  <i className="fa-solid fa-plane"></i> Add Your Trip
                </button>
              </Link>
            </div>
          </div>

          {/* HERO IMAGE */}
          <div className="image-content">
            <Image
              src="https://images.unsplash.com/photo-1522199710521-72d69614c702?auto=format&q=80&w=1172"
              alt="Travel bag"
              width={600}
              height={400}
              className="hero-image"
            />
          </div>
        </div>

        {/* SEARCH BOX */}
        {/* SEARCH BOX */}
        <Suspense fallback={<div>Loading search...</div>}>
          <SearchBox />
        </Suspense>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <div className="inner">
          <h2>How CarryConnect Works</h2>
          <p className="subtitle">
            A simple process to connect travelers and senders worldwide
          </p>

          <div className="steps">
            <div className="step">
              <div className="icon-circle">
                <i className="fa-solid fa-location-dot"></i>
              </div>
              <h3>List or Find a Trip</h3>
              <p>
                Travelers list their trips with available space. Senders search
                for travelers going to their destination.
              </p>
            </div>

            <div className="step">
              <div className="icon-circle">
                <i className="fa-regular fa-comments"></i>
              </div>
              <h3>Connect & Agree</h3>
              <p>
                Chat within the platform to discuss package details and agree on
                delivery terms.
              </p>
            </div>

            <div className="step">
              <div className="icon-circle">
                <i className="fa-regular fa-credit-card"></i>
              </div>
              <h3>Pay & Ship</h3>
              <p>
                Make secure payments through our platform. Funds are released
                when delivery is confirmed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST & SAFETY */}
      <section className="trust-safety">
        <div className="inner">
          <div className="trust-left">
            <h2>Trust & Safety First</h2>
            <p className="trust-subtitle">
              We’ve built CarryConnect with security and trust as our top
              priorities.
            </p>

            <div className="trust-feature">
              <div className="trust-icon">
                <i className="fa-regular fa-id-badge"></i>
              </div>
              <div>
                <h4>Verified Users</h4>
                <p>
                  All users undergo ID verification and background checks for
                  added security.
                </p>
              </div>
            </div>

            <div className="trust-feature">
              <div className="trust-icon">
                <i className="fa-regular fa-credit-card"></i>
              </div>
              <div>
                <h4>Secure Payments</h4>
                <p>
                  Escrow payment system ensures money is only released when
                  delivery is confirmed.
                </p>
              </div>
            </div>

            <div className="trust-feature">
              <div className="trust-icon">
                <i className="fa-regular fa-envelope-open"></i>
              </div>
              <div>
                <h4>Package Protection</h4>
                <p>
                  Optional insurance coverage for your packages during transit.
                </p>
              </div>
            </div>
          </div>

          <div className="trust-right">
            <Image
              src="https://images.unsplash.com/photo-1556741533-6e6a62bd8b49?q=80&w=1470"
              alt="Customer service counter"
              width={800}
              height={400}
              className="trust-image"
            />
          </div>
        </div>
      </section>

      {/* TRANSPORT OPTIONS */}
      <section className="transport-options">
        <div className="inner">
          <h2>Global Transport Options</h2>
          <p className="subtitle">
            Connect with travelers using various transportation methods
            worldwide
          </p>

          <div className="transport-grid">
            <div className="transport-card">
              <i className="fa-solid fa-plane"></i>
              <h3>Air Travel</h3>
              <p>Fast delivery across continents with travelers on flights.</p>
            </div>

            <div className="transport-card">
              <i className="fa-solid fa-ship"></i>
              <h3>Sea Travel</h3>
              <p>Economical option for larger packages across oceans.</p>
            </div>

            <div className="transport-card">
              <i className="fa-solid fa-truck"></i>
              <h3>Road Travel</h3>
              <p>Perfect for shorter distances and neighboring countries.</p>
            </div>

            <div className="transport-card">
              <i className="fa-solid fa-globe"></i>
              <h3>Multi-modal</h3>
              <p>Combined transport options for complex routes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="cta-global">
        <div className="inner">
          <h2>Ready to Connect Globally?</h2>
          <p>
            Join thousands of users already sending packages and earning while
            traveling.
          </p>

          <div className="cta-buttons">
            <Link href="/find-a-carrier">
              <button className="white-btn">
                <i className="fa-solid fa-box"></i> Find a Carrier
              </button>
            </Link>
            <Link href="/add-trip">
              <button className="white-outline-btn">
                <i className="fa-solid fa-plane"></i> Add Your Trip
              </button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
