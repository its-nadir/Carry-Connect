"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const messagesBoxRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthChange(setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    const tripIdFromUrl = searchParams.get("tripId");
    if (tripIdFromUrl && tripIdFromUrl !== selectedTripId) {
      setSelectedTripId(tripIdFromUrl);
    }
  }, [searchParams, selectedTripId]);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }

    const fetchConversations = async () => {
      const postedTrips = await getUserTrips(user.uid);
      const bookedOrders = await getUserOrders(user.uid);

      const combined = [...postedTrips, ...bookedOrders].filter(
        t => t.status === "booked"
      );

      const chats = combined.map(trip => {
        const isCarrier = trip.carrierUid === user.uid;
        const otherName = isCarrier ? trip.bookedByEmail : trip.carrierName;

        return {
          tripId: trip.id,
          name: otherName,
          route: `${trip.from} → ${trip.to}`,
          lastMessage: "Tap to open chat...",
          lastMessageAt: null,
          unread: false,
          avatar: otherName?.[0]?.toUpperCase() || "?"
        };
      });

      setConversations(
        Array.from(new Set(chats.map(c => c.tripId))).map(id =>
          chats.find(c => c.tripId === id)
        )
      );
    };

    fetchConversations();
  }, [user]);

  const getSeenKey = (uid, tripId) => `cc_seen_${uid}_${tripId}`;

  const getLastSeen = (uid, tripId) => {
    try {
      return Number(localStorage.getItem(getSeenKey(uid, tripId))) || 0;
    } catch {
      return 0;
    }
  };

  const setLastSeen = (uid, tripId) => {
    try {
      localStorage.setItem(getSeenKey(uid, tripId), Date.now());
    } catch {}
  };

  useEffect(() => {
    if (!user || conversations.length === 0) return;

    const unsubs = conversations.map(chat =>
      listenToTripLastMessage(chat.tripId, msg => {
        setConversations(prev =>
          prev.map(c => {
            if (c.tripId !== chat.tripId) return c;

            const msgTime = msg?.sentAt?.toMillis?.() || 0;
            const unread =
              msg &&
              msg.senderUid !== user.uid &&
              msgTime > getLastSeen(user.uid, chat.tripId);

            return {
              ...c,
              lastMessage: msg?.text || "Tap to open chat...",
              lastMessageAt: msg?.sentAt || null,
              unread
            };
          })
        );
      })
    );

    return () => unsubs.forEach(u => u && u());
  }, [user, conversations.length]);

  useEffect(() => {
    if (!selectedTripId) {
      setMessages([]);
      return;
    }

    setCurrentTripId(selectedTripId);

    const unsub = listenToTripChat(msgs => {
      setMessages(msgs);
      requestAnimationFrame(() => {
        if (messagesBoxRef.current) {
          messagesBoxRef.current.scrollTop =
            messagesBoxRef.current.scrollHeight;
        }
      });
    });

    return () => {
      unsub();
      setCurrentTripId(null);
    };
  }, [selectedTripId]);

  // ✅ FIX 2: prevent unnecessary re-push & scroll reset
  const openChat = tripId => {
    if (tripId === selectedTripId) return;
    if (user) setLastSeen(user.uid, tripId);
    router.push(`/messages?tripId=${tripId}`, { scroll: false });
  };

  const send = () => {
    if (!input.trim()) return;
    sendTripMessage(input);
    setInput("");
  };

  const currentChat = conversations.find(c => c.tripId === selectedTripId);

  const formatTime = (ts) => {
    const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
    if (!d || isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const dayKey = (ts) => {
    const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
    if (!d || isNaN(d.getTime())) return "unknown";
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return String(x.getTime());
  };

  const formatDayLabel = (ts) => {
    const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
    if (!d || isNaN(d.getTime())) return "";
    const today = new Date();
    const t0 = new Date(today); t0.setHours(0,0,0,0);
    const d0 = new Date(d); d0.setHours(0,0,0,0);
    const diffDays = Math.round((t0 - d0) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return d0.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
  };

  let lastRenderedDay = null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Messages</h3>

          {conversations.map(chat => (
            <div
              key={chat.tripId}
              className={
                chat.tripId === selectedTripId
                  ? `${styles.chatItem} ${styles.selectedChat}`
                  : styles.chatItem
              }
              onClick={() => openChat(chat.tripId)}
            >
              <div className={styles.chatAvatar}>{chat.avatar}</div>
              <div className={styles.chatInfo}>
                <p className={styles.chatName}>
                  {chat.name}
                  {chat.unread && <span className={styles.unreadDot} />}
                </p>
                <p className={styles.chatRoute}>{chat.route}</p>
                <p
                  className={
                    chat.unread
                      ? `${styles.chatMsg} ${styles.chatMsgUnread}`
                      : styles.chatMsg
                  }
                >
                  {chat.lastMessage}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.chatWindow}>
          {selectedTripId && currentChat ? (
            <>
              <div className={styles.header}>
                <div className={styles.headerAvatar}>
                  {currentChat.avatar}
                </div>
                <div>
                  <p className={styles.headerName}>{currentChat.name}</p>
                  <p className={styles.headerRoute}>{currentChat.route}</p>
                </div>
              </div>

              <div className={styles.messages} ref={messagesBoxRef}>
                {messages.map(m => {
                  const isMine = m.senderUid === auth?.currentUser?.uid;

                  const msgMillis =
                    m.sentAt && typeof m.sentAt.toMillis === "function"
                      ? m.sentAt.toMillis()
                      : m.sentAt
                        ? new Date(m.sentAt).getTime()
                        : 0;

                  const seen =
                    isMine &&
                    msgMillis <= getLastSeen(user.uid, selectedTripId);

                  const thisDay = dayKey(m.sentAt);
                  const showDay = thisDay !== lastRenderedDay;
                  if (showDay) lastRenderedDay = thisDay;

                  return (
                    <div key={m.id}>
                      {showDay && thisDay !== "unknown" && (
                        <div className={styles.dayDivider}>
                          <span className={styles.dayDividerPill}>
                            {formatDayLabel(m.sentAt)}
                          </span>
                        </div>
                      )}

                      <div className={isMine ? styles.msgBoxRight : styles.msgBox}>
                        <div className={isMine ? styles.msgBubbleBlue : styles.msgBubbleGray}>
                          <div className={styles.msgText}>{m.text}</div>

                          <div className={styles.msgMeta}>
                            <span className={styles.msgClock}>
                              {formatTime(m.sentAt)}
                            </span>

                            {isMine && (
                              <span className={styles.msgStatus}>
                                <span className={seen ? styles.statusDoubleSeen : styles.statusSingleDelivered}>
                                  <svg viewBox="0 0 24 24">
                                    <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                                  </svg>
                                  {seen && (
                                    <svg viewBox="0 0 24 24">
                                      <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                                    </svg>
                                  )}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.inputArea}>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && send()}
                    className={styles.inputField}
                    placeholder="Type a message..."
                  />
                  <button onClick={send} className={styles.sendBtn}>
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.noChatSelected}>
              <h3>Select a chat</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div />}>
      <MessagesContent />
    </Suspense>
  );
}
