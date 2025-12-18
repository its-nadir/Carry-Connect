"use client";
import { useState, useEffect, useRef } from "react";
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
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const messagesEndRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthChange((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }

    const fetchConversations = async () => {
      const postedTrips = await getUserTrips(user.uid);
      const bookedOrders = await getUserOrders(user.uid);

      const combinedChats = [...postedTrips, ...bookedOrders].filter(
        (trip) => trip.status === "booked"
      );

      const formattedChats = combinedChats.map(trip => {
        const isCarrier = trip.carrierUid === user.uid;
        const otherPersonName = isCarrier
          ? trip.bookedByEmail
          : trip.carrierName;

        const route = `${trip.from} → ${trip.to}`;

        return {
          tripId: trip.id,
          name: otherPersonName,
          route,
          lastMessage: "Tap to open chat...",
          lastMessageAt: null,
          lastMessageSenderUid: null,
          unread: false,
          avatar: otherPersonName ? otherPersonName[0].toUpperCase() : "?",
          tripData: trip
        };
      });

      const uniqueChats = Array.from(
        new Set(formattedChats.map(c => c.tripId))
      ).map(id => formattedChats.find(c => c.tripId === id));

      setConversations(uniqueChats);
    };

    fetchConversations();
  }, [user]);

  const getSeenKey = (uid, tripId) => `cc_seen_${uid}_${tripId}`;

  const getLastSeen = (uid, tripId) => {
    try {
      const raw = localStorage.getItem(getSeenKey(uid, tripId));
      return raw ? Number(raw) : 0;
    } catch {
      return 0;
    }
  };

  const setLastSeen = (uid, tripId, ts) => {
    try {
      localStorage.setItem(getSeenKey(uid, tripId), String(ts));
    } catch {}
  };

  useEffect(() => {
    if (!user || conversations.length === 0) return;

    const unsubs = conversations.map((chat) => {
      return listenToTripLastMessage(chat.tripId, (msg) => {
        setConversations((prev) => {
          const next = prev.map((c) => {
            if (c.tripId !== chat.tripId) return c;

            const lastSeen = getLastSeen(user.uid, chat.tripId);
            const msgTime = msg?.sentAt?.toMillis
              ? msg.sentAt.toMillis()
              : 0;

            const unread =
              !!msg &&
              msgTime > lastSeen &&
              msg.senderUid &&
              msg.senderUid !== user.uid;

            return {
              ...c,
              lastMessage: msg?.text || "Tap to open chat...",
              lastMessageAt: msg?.sentAt || null,
              lastMessageSenderUid: msg?.senderUid || null,
              unread
            };
          });
          return next;
        });
      });
    });

    return () => {
      unsubs.forEach((u) => {
        try { u && u(); } catch {}
      });
    };
  }, [user, conversations.length]);

  useEffect(() => {
    if (!selectedTripId) {
      setMessages([]);
      return;
    }

    setCurrentTripId(selectedTripId);

    const unsubscribe = listenToTripChat((msgs) => {
      setMessages(msgs);
    });

    return () => {
      unsubscribe();
      setCurrentTripId(null);
    };
  }, [selectedTripId]);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const openChat = (tripId) => {
    if (user) setLastSeen(user.uid, tripId, Date.now());
    shouldAutoScrollRef.current = true;
    setSelectedTripId(tripId);
  };

  const send = () => {
    if (!input.trim() || !selectedTripId) return;
    shouldAutoScrollRef.current = true;
    sendTripMessage(input);
    setInput("");
  };

  const currentChat = conversations.find(
    c => c.tripId === selectedTripId
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Messages</h3>

          {user ? (
            conversations.length === 0 ? (
              <div className={styles.emptyState}>
                No active bookings or trips.
              </div>
            ) : (
              conversations.map((chat) => (
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
                    <p className={
                      chat.unread
                        ? `${styles.chatMsg} ${styles.chatMsgUnread}`
                        : styles.chatMsg
                    }>
                      {chat.lastMessage}
                    </p>
                  </div>
                </div>
              ))
            )
          ) : (
            <div className={styles.emptyState}>
              Please login to see messages.
            </div>
          )}
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

              <div className={styles.messages}>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.senderUid === auth?.currentUser?.uid
                        ? styles.msgBoxRight
                        : styles.msgBox
                    }
                  >
                    <div
                      className={
                        m.senderUid === auth?.currentUser?.uid
                          ? styles.msgBubbleBlue
                          : styles.msgBubbleGray
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className={styles.inputArea}>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && send()}
                    placeholder="Type a message..."
                    className={styles.inputField}
                  />
                  <button onClick={send} className={styles.sendBtn}>
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.noChatSelected}>
              <h3>Select a chat to start messaging</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
