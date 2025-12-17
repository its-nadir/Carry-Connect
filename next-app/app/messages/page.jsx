"use client";

import { useEffect, useState } from "react";
import styles from "./messages.module.css";
import {
  setCurrentTripId,
  sendTripMessage,
  listenToTripChat,
  listenToTripLastMessage,
  auth,
  onAuthChange,
  getUserTrips,
  getUserOrders
} from "../../lib/db";

export default function MessagesPage() {
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthChange(async (u) => {
      setUser(u);
      if (!u) return;

      const carrierTrips = await getUserTrips(u.uid);
      const bookedTrips = await getUserOrders(u.uid);

      const allTrips = [...carrierTrips, ...bookedTrips].filter(
        (trip) => trip.status === "accepted"
      );

      setTrips(allTrips);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedTripId) return;

    const unsubscribeMessages = listenToTripChat(selectedTripId, setMessages);
    const unsubscribeLast = listenToTripLastMessage(selectedTripId, (msg) => {
      setLastMessages((prev) => ({
        ...prev,
        [selectedTripId]: msg
      }));
    });

    setCurrentTripId(selectedTripId);

    return () => {
      unsubscribeMessages();
      unsubscribeLast();
    };
  }, [selectedTripId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTripId) return;
    await sendTripMessage(selectedTripId, newMessage);
    setNewMessage("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <h2>Conversations</h2>
        {trips.map((trip) => (
          <div
            key={trip.id}
            className={`${styles.tripItem} ${
              selectedTripId === trip.id ? styles.active : ""
            }`}
            onClick={() => setSelectedTripId(trip.id)}
          >
            <p>
              {trip.from} → {trip.to}
            </p>
            <span>{lastMessages[trip.id]?.text || ""}</span>
          </div>
        ))}
      </div>

      <div className={styles.chat}>
        <div className={styles.messages}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.senderUid === user?.uid
                  ? styles.sent
                  : styles.received
              }
            >
              {msg.text}
            </div>
          ))}
        </div>

        {selectedTripId && (
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
