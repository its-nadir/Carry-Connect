"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, listenToUserOrders } from "../../lib/db";
import styles from "./my-orders.module.css";

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) {
      router.push("/auth");
      return;
    }

    const unsub = listenToUserOrders(auth.currentUser.uid, setOrders);
    return () => unsub();
  }, [router]);

  return (
    <div className={styles.container}>
      <h1>My Orders</h1>

      {orders.map((order) => (
        <div key={order.id} className={styles.card}>
          <h3>{order.from} → {order.to}</h3>
          <p>Status: {order.status}</p>
        </div>
      ))}
    </div>
  );
}
