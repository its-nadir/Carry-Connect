"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./messages.module.css";

import {
  setCurrentTripId,
  sendTripMessage,
  listenToTripChat,
  listenToTripLastMessage,
  auth,
  onAuthChange,
  getUserTrips,
  getUserOrders,
  markTripMessagesSeen
} from "../../lib/db";

function MessagesContent() {
  const searchParams = useSearchParams();

  const [user, setUser] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const messagesBoxRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      if (messagesBoxRef.current) {
        messagesBoxRef.current.scrollTop =
          messagesBoxRef.current.scrollHeight;
      }
    }, 100);
  };

  useEffect(() => {
    const unsub = onAuthChange(setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    const tripIdFromUrl = searchParams.get("tripId");
    if (tripIdFromUrl) {
      setSelectedTripId(tripIdFromUrl);
      setShowSidebar(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const posted = await getUserTrips(user.uid);
      const booked = await getUserOrders(user.uid);

      const chats = [...posted, ...booked]
        .filter(t => t.status === "booked")
        .map(trip => {
          const isCarrier = trip.carrierUid === user.uid;
          const name = isCarrier ? trip.bookedByEmail : trip.carrierName;
          return {
            tripId: trip.id,
            name,
            otherUid: isCarrier ? trip.bookedByUid : trip.carrierUid,
            route: `${trip.from} → ${trip.to}`,
            avatar: name?.[0]?.toUpperCase() || "?",
            lastMessage: ""
          };
        });

      setConversations(
        Array.from(new Map(chats.map(c => [c.tripId, c])).values())
      );
    })();
  }, [user]);

  useEffect(() => {
    if (!selectedTripId || !user) return;

    setCurrentTripId(selectedTripId);

    const unsub = listenToTripChat(msgs => {
      setMessages(msgs);
      markTripMessagesSeen(selectedTripId);
      scrollToBottom();
    });

    return () => {
      unsub();
      setCurrentTripId(null);
    };
  }, [selectedTripId, user]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input;
    setInput("");
    await sendTripMessage(text);
    setSending(false);
    scrollToBottom();
  };

  const formatTime = ts => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const currentChat = conversations.find(c => c.tripId === selectedTripId);
  const otherUid = currentChat?.otherUid;

  if (!user) return <div className={styles.page}><h3>Please login</h3></div>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {showSidebar && (
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Messages</h3>
            {conversations.map(chat => (
              <div
                key={chat.tripId}
                className={styles.chatItem}
                onClick={() => {
                  setSelectedTripId(chat.tripId);
                  setShowSidebar(false);
                }}
              >
                <div className={styles.chatAvatar}>{chat.avatar}</div>
                <div>
                  <p className={styles.chatName}>{chat.name}</p>
                  <p className={styles.chatRoute}>{chat.route}</p>
                </div>
              </div>
            ))}
          </aside>
        )}

        <main className={styles.chatWindow}>
          {currentChat ? (
            <>
              <header className={styles.header}>
                <button
                  className={styles.backBtn}
                  onClick={() => setShowSidebar(true)}
                >←</button>
                <div>
                  <p className={styles.headerName}>{currentChat.name}</p>
                  <p className={styles.headerRoute}>{currentChat.route}</p>
                </div>
              </header>

              <section className={styles.messages} ref={messagesBoxRef}>
                {messages.map(m => {
                  const mine = m.senderUid === user.uid;
                  const seen = mine && otherUid && m.seenBy?.includes(otherUid);
                  return (
                    <div
                      key={m.id}
                      className={mine ? styles.msgRight : styles.msgLeft}
                    >
                      <div className={mine ? styles.bubbleBlue : styles.bubbleGray}>
                        <span>{m.text}</span>
                        <div className={styles.meta}>
                          <span>{formatTime(m.sentAt)}</span>
                          {mine && <span className={styles.check}>{seen ? "✓✓" : "✓"}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>

              <footer className={styles.inputArea}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && send()}
                  placeholder="Message…"
                />
                <button onClick={send} disabled={sending}>Send</button>
              </footer>
            </>
          ) : (
            <div className={styles.noChatSelected}>
              Select a conversation
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div>Loading…</div>}>
      <MessagesContent />
    </Suspense>
  );
}
