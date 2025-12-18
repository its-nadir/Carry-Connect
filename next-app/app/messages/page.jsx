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

  const messagesBoxRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  const toMillisSafe = (ts) => {
    if (!ts) return 0;
    if (typeof ts.toMillis === "function") return ts.toMillis();
    if (typeof ts.toDate === "function") return ts.toDate().getTime();
    const d = new Date(ts);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  };

  // Scroll to bottom when new messages arrive
  const scrollToBottom = (force = false) => {
    if (messagesBoxRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesBoxRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (force || isNearBottom) {
        requestAnimationFrame(() => {
          if (messagesBoxRef.current) {
            messagesBoxRef.current.scrollTop = messagesBoxRef.current.scrollHeight;
          }
        });
      }
    }
  };

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

  // Fetch conversations
  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }

    const fetchConversations = async () => {
      const postedTrips = await getUserTrips(user.uid);
      const bookedOrders = await getUserOrders(user.uid);

      const combined = [...postedTrips, ...bookedOrders].filter(
        (t) => t.status === "booked"
      );

      const chats = combined.map((trip) => {
        const isCarrier = trip.carrierUid === user.uid;
        const otherName = isCarrier ? trip.bookedByEmail : trip.carrierName;
        const otherUid = isCarrier ? trip.bookedByUid : trip.carrierUid;

        return {
          tripId: trip.id,
          name: otherName,
          otherUid,
          route: `${trip.from} → ${trip.to}`,
          lastMessage: "No messages yet",
          lastMessageAt: null,
          unread: false,
          avatar: otherName?.[0]?.toUpperCase() || "?"
        };
      });

      // Remove duplicates
      const unique = Array.from(new Set(chats.map((c) => c.tripId))).map((id) =>
        chats.find((c) => c.tripId === id)
      );

      setConversations(unique);
    };

    fetchConversations();
  }, [user]);

  // Listen to last messages and update conversations
  useEffect(() => {
    if (!user || conversations.length === 0) return;

    const unsubs = conversations.map((chat) =>
      listenToTripLastMessage(chat.tripId, (msg) => {
        setConversations((prev) => {
          const updated = prev.map((c) => {
            if (c.tripId !== chat.tripId) return c;

            const seenBy = Array.isArray(msg?.seenBy) ? msg.seenBy : [];
            const isOpenChat = selectedTripId === chat.tripId;

            // Message is unread if:
            // 1. Chat is not currently open
            // 2. Message exists
            // 3. Message is not from me
            // 4. I haven't seen it yet
            const unread =
              !isOpenChat &&
              msg &&
              msg.senderUid !== user.uid &&
              !seenBy.includes(user.uid);

            return {
              ...c,
              lastMessage: msg?.text || "No messages yet",
              lastMessageAt: msg?.sentAt || c.lastMessageAt,
              unread: Boolean(unread)
            };
          });

          // Sort by lastMessageAt - most recent first
          updated.sort((a, b) => {
            const ta = toMillisSafe(a.lastMessageAt);
            const tb = toMillisSafe(b.lastMessageAt);
            return tb - ta; // Descending order
          });

          return [...updated];
        });
      })
    );

    return () => unsubs.forEach((u) => u && u());
  }, [user, conversations.length, selectedTripId]);

  // Listen to chat messages
  useEffect(() => {
    if (!selectedTripId || !user) {
      setMessages([]);
      lastMessageCountRef.current = 0;
      return;
    }

    setCurrentTripId(selectedTripId);

    // Mark messages as seen when opening chat
    setTimeout(() => {
      markTripMessagesSeen(selectedTripId);
    }, 500);

    const unsub = listenToTripChat((msgs) => {
      const hadMessages = lastMessageCountRef.current > 0;
      const newMessageCount = msgs.length;
      const isNewMessage = newMessageCount > lastMessageCountRef.current;

      setMessages(msgs);
      lastMessageCountRef.current = newMessageCount;

      // Mark messages as seen
      if (msgs.length > 0) {
        setTimeout(() => {
          markTripMessagesSeen(selectedTripId);
        }, 300);
      }

      // Clear unread badge immediately for this chat
      setConversations((prev) =>
        prev.map((c) =>
          c.tripId === selectedTripId ? { ...c, unread: false } : c
        )
      );

      // Scroll to bottom
      if (isNewMessage || !hadMessages) {
        scrollToBottom(true);
      }
    });

    return () => {
      unsub();
      setCurrentTripId(null);
      lastMessageCountRef.current = 0;
    };
  }, [selectedTripId, user]);

  const openChat = (tripId) => {
    if (tripId === selectedTripId) return;

    setSelectedTripId(tripId);

    // Clear unread immediately
    setConversations((prev) =>
      prev.map((c) => (c.tripId === tripId ? { ...c, unread: false } : c))
    );

    try {
      window.history.pushState(null, "", `/messages?tripId=${tripId}`);
    } catch {}
  };

  const send = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    // Clear input immediately for better UX
    setInput("");

    try {
      await sendTripMessage(trimmedInput);
      
      // Force scroll to bottom after sending
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Restore input on error
      setInput(trimmedInput);
    }
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (!d || isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const currentChat = conversations.find((c) => c.tripId === selectedTripId);
  const otherUid = currentChat?.otherUid || null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Messages</h3>

          {conversations.length === 0 && user && (
            <div style={{ padding: "20px", textAlign: "center", color: "#65676b" }}>
              No conversations yet
            </div>
          )}

          {conversations.map((chat) => (
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
          {selectedTripId && currentChat ? (
            <>
              <div className={styles.header}>
                <div className={styles.headerAvatar}>{currentChat.avatar}</div>
                <div>
                  <p className={styles.headerName}>{currentChat.name}</p>
                  <p className={styles.headerRoute}>{currentChat.route}</p>
                </div>
              </div>

              <div className={styles.messages} ref={messagesBoxRef}>
                {messages.length === 0 && (
                  <div style={{ 
                    textAlign: "center", 
                    color: "#65676b", 
                    marginTop: "20px",
                    fontSize: "14px" 
                  }}>
                    No messages yet. Start the conversation!
                  </div>
                )}

                {messages.map((m) => {
                  const isMine = m.senderUid === auth?.currentUser?.uid;
                  const seenBy = Array.isArray(m.seenBy) ? m.seenBy : [];

                  // Check if OTHER person has seen my message
                  const seen = isMine && otherUid && seenBy.includes(otherUid);

                  return (
                    <div
                      key={m.id}
                      className={isMine ? styles.msgBoxRight : styles.msgBox}
                    >
                      <div
                        className={
                          isMine ? styles.msgBubbleBlue : styles.msgBubbleGray
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
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    className={styles.inputField}
                    placeholder="Type a message..."
                  />
                  <button 
                    onClick={send} 
                    className={styles.sendBtn}
                    disabled={!input.trim()}
                  >
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

export default function MessagesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
