"use client";

import { useEffect, useState } from "react";
import styles from "./messages.module.css";
import {
  auth,
  listenToUserTrips,
  listenToUserOrders,
  listenToMessages,
  sendMessage
} from "../../lib/db";

export default function MessagesPage() {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubCarrier = listenToUserTrips(auth.currentUser.uid, (carrierTrips) => {
      setTrips((prev) => {
        const merged = [...prev.filter(t => t.carrierUid !== auth.currentUser.uid), ...carrierTrips];
        return merged.filter(t => t.status === "accepted");
      });
    });

    const unsubOrders = listenToUserOrders(auth.currentUser.uid, (orders) => {
      setTrips((prev) => {
        const merged = [...prev.filter(t => t.bookedByUid !== auth.currentUser.uid), ...orders];
        return merged.filter(t => t.status === "accepted");
      });
    });

    return () => {
      unsubCarrier();
      unsubOrders();
    };
  }, []);

  useEffect(() => {
    if (!selectedTrip) return;
    const unsub = listenToMessages(selectedTrip.id, setMessages);
    return () => unsub();
  }, [selectedTrip]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTrip) return;
    await sendMessage(selectedTrip.id, newMessage);
    setNewMessage("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <h2>Conversations</h2>
        {trips.map((trip) => (
          <div
            key={trip.id}
            className={`${styles.tripItem} ${selectedTrip?.id === trip.id ? styles.active : ""}`}
            onClick={() => setSelectedTrip(trip)}
          >
            {trip.from} → {trip.to}
          </div>
        ))}
      </div>

      <div className={styles.chat}>
        <div className={styles.messages}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.senderUid === auth.currentUser.uid ? styles.sent : styles.received}
            >
              {msg.text}
            </div>
          ))}
        </div>

        {selectedTrip && (
          <form onSubmit={handleSend} className={styles.inputArea}>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
            />
            <button type="submit">Send</button>
          </form>
        )}
      </div>
    </div>
  );
}
