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
  getUserOrders
} from "../../lib/db";

function MessagesContent() {
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

  const setLastSeen = (uid, tripId, value = Date.now()) => {
    try {
      localStorage.setItem(getSeenKey(uid, tripId), value);
    } catch {}
  };

  /* ================= LAST MESSAGE LISTENER ================= */
  useEffect(() => {
    if (!user || conversations.length === 0) return;

    const unsubs = conversations.map(chat =>
      listenToTripLastMessage(chat.tripId, msg => {
        setConversations(prev => {
          const updated = prev.map(c => {
            if (c.tripId !== chat.tripId) return c;

            const msgTime =
              msg?.sentAt && typeof msg.sentAt.toMillis === "function"
                ? msg.sentAt.toMillis()
                : 0;

            const isOpenChat = selectedTripId === chat.tripId;

            const unread =
              !isOpenChat &&
              msg &&
              msg.senderUid !== user.uid &&
              msgTime > getLastSeen(user.uid, chat.tripId);

            return {
              ...c,
              lastMessage: msg?.text || "Tap to open chat...",
              lastMessageAt: msg?.sentAt || null,
              unread
            };
          });

          /* 🔥 FIX 2: move updated chat to TOP */
          const idx = updated.findIndex(c => c.tripId === chat.tripId);
          if (idx > 0) {
            const [item] = updated.splice(idx, 1);
            updated.unshift(item);
          }

          return updated;
        });
      })
    );

    return () => unsubs.forEach(u => u && u());
  }, [user, conversations.length, selectedTripId]);

  /* ================= CHAT LISTENER ================= */
  useEffect(() => {
    if (!selectedTripId || !user) return;

    setCurrentTripId(selectedTripId);

    const unsub = listenToTripChat(msgs => {
      setMessages(msgs);

      const lastMsg = msgs[msgs.length - 1];
      const lastTime =
        lastMsg?.sentAt && typeof lastMsg.sentAt.toMillis === "function"
          ? lastMsg.sentAt.toMillis()
          : Date.now();

      /* 🔥 FIX 1: mark seen ONLY because user is INSIDE chat */
      setLastSeen(user.uid, selectedTripId, lastTime);

      setConversations(prev =>
        prev.map(c =>
          c.tripId === selectedTripId ? { ...c, unread: false } : c
        )
      );

      requestAnimationFrame(() => {
        messagesBoxRef.current?.scrollTo({
          top: messagesBoxRef.current.scrollHeight
        });
      });
    });

    return () => {
      unsub();
      setCurrentTripId(null);
    };
  }, [selectedTripId, user]);

  const openChat = tripId => {
    if (tripId === selectedTripId) return;
    setSelectedTripId(tripId);
    window.history.pushState(null, "", `/messages?tripId=${tripId}`);
  };

  const send = () => {
    if (!input.trim()) return;
    sendTripMessage(input);
    setInput("");
  };

  const formatTime = ts => {
    const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    if (!d) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Messages</h3>

          {conversations.map(chat => (
            <div
              key={chat.tripId}
              className={`${styles.chatItem} ${
                chat.tripId === selectedTripId ? styles.selectedChat : ""
              }`}
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
          {selectedTripId ? (
            <>
              <div className={styles.messages} ref={messagesBoxRef}>
                {messages.map(m => {
                  const isMine = m.senderUid === auth?.currentUser?.uid;

                  const msgMillis =
                    m.sentAt && typeof m.sentAt.toMillis === "function"
                      ? m.sentAt.toMillis()
                      : 0;

                  const seen =
                    isMine &&
                    msgMillis <= getLastSeen(user.uid, selectedTripId);

                  return (
                    <div
                      key={m.id}
                      className={isMine ? styles.msgBoxRight : styles.msgBox}
                    >
                      <div
                        className={
                          isMine
                            ? styles.msgBubbleBlue
                            : styles.msgBubbleGray
                        }
                      >
                        <div className={styles.msgText}>{m.text}</div>
                        <div className={styles.msgMeta}>
                          <span className={styles.msgClock}>
                            {formatTime(m.sentAt)}
                          </span>
                          {isMine && (
                            <span
                              className={
                                seen
                                  ? styles.statusDoubleSeen
                                  : styles.statusSingleDelivered
                              }
                            >
                              <svg viewBox="0 0 24 24">
                                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                              </svg>
                              {seen && (
                                <svg viewBox="0 0 24 24">
                                  <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                                </svg>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.inputArea}>
                <div className={styles.inputWrapper}>
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && send()}
                    placeholder="Type a message…"
                    className={styles.inputField}
                  />
                  <button onClick={send} className={styles.sendBtn}>
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.noChatSelected}>Select a chat</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesContent />
    </Suspense>
  );
}
