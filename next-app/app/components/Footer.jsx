import Link from "next/link";
import Image from "next/image";
import styles from "./footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {/* BRANDING SECTION */}
        <div className={styles.brand}>
          <Link href="/" className={styles.logoRow}>
            <Image 
              src="/favicon.ico" 
              alt="CarryConnect" 
              width={24} 
              height={24}
            />
            <h3>CarryConnect</h3>
          </Link>

          <p className={styles.brandText}>
            Connecting travelers with senders for global package delivery.
          </p>
        </div>
      </div>

      {/* FOOTER BOTTOM */}
      <div className={styles.bottom}>
        © 2025 CarryConnect. All rights reserved.
      </div>
    </footer>
  );
}
