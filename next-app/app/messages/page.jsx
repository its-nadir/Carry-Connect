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
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});

  const messagesBoxRef = useRef(null);
  const inputRef = useRef(null);
  const unsubscribesRef = useRef({});

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
            lastMessage: "",
            lastMessageTime: null
          };
        });

      const uniqueChats = Array.from(new Map(chats.map(c => [c.tripId, c])).values());
      setConversations(uniqueChats);

      // Listen to last messages for each conversation
      uniqueChats.forEach(chat => {
        if (unsubscribesRef.current[chat.tripId]) {
          unsubscribesRef.current[chat.tripId]();
        }
        
        unsubscribesRef.current[chat.tripId] = listenToTripLastMessage(
          chat.tripId,
          (lastMsg) => {
            if (lastMsg) {
              setLastMessages(prev => ({
                ...prev,
                [chat.tripId]: lastMsg
              }));

              // Calculate unread count
              if (lastMsg.senderUid !== user.uid && !lastMsg.seenBy?.includes(user.uid)) {
                setUnreadCounts(prev => ({
                  ...prev,
                  [chat.tripId]: (prev[chat.tripId] || 0) + 1
                }));
              }
            }
          }
        );
      });
    })();

    return () => {
      Object.values(unsubscribesRef.current).forEach(unsub => unsub());
      unsubscribesRef.current = {};
    };
  }, [user]);

  useEffect(() => {
    if (!selectedTripId || !user) return;

    setCurrentTripId(selectedTripId);
    setUnreadCounts(prev => ({ ...prev, [selectedTripId]: 0 }));

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
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    
    if (msgDate.getTime() === today.getTime()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (msgDate.getTime() === today.getTime() - 86400000) {
      return "Yesterday";
    } else {
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const getMessageStatus = (msg) => {
    if (!msg || msg.senderUid !== user.uid) return null;
    
    const otherUid = currentChat?.otherUid;
    if (!otherUid) return "✓";
    
    if (msg.seenBy?.includes(otherUid)) {
      return "✓✓";
    } else if (msg.deliveredTo?.includes(otherUid)) {
      return "✓✓";
    } else {
      return "✓";
    }
  };

  const getStatusColor = (msg) => {
    if (!msg || msg.senderUid !== user.uid) return "";
    
    const otherUid = currentChat?.otherUid;
    if (msg.seenBy?.includes(otherUid)) {
      return styles.statusRead;
    }
    return styles.statusSent;
  };

  const currentChat = conversations.find(c => c.tripId === selectedTripId);
  const otherUid = currentChat?.otherUid;

  // Sort conversations by last message time
  const sortedConversations = [...conversations].sort((a, b) => {
    const timeA = lastMessages[a.tripId]?.sentAt?.toDate?.() || new Date(0);
    const timeB = lastMessages[b.tripId]?.sentAt?.toDate?.() || new Date(0);
    return timeB - timeA;
  });

  if (!user) return <div className={styles.page}><h3>Please login</h3></div>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {showSidebar && (
          <aside className={styles.sidebar}>
            <h3 className={styles.sidebarTitle}>Messages</h3>
            {sortedConversations.map(chat => {
              const lastMsg = lastMessages[chat.tripId];
              const unreadCount = unreadCounts[chat.tripId] || 0;
              const isUnread = lastMsg && lastMsg.senderUid !== user.uid && !lastMsg.seenBy?.includes(user.uid);
              
              return (
                <div
                  key={chat.tripId}
                  className={`${styles.chatItem} ${isUnread ? styles.chatItemUnread : ''}`}
                  onClick={() => {
                    setSelectedTripId(chat.tripId);
                    setShowSidebar(false);
                  }}
                >
                  <div className={styles.chatAvatar}>{chat.avatar}</div>
                  <div className={styles.chatInfo}>
                    <div className={styles.chatHeader}>
                      <p className={styles.chatName}>{chat.name}</p>
                      {lastMsg && (
                        <span className={styles.chatTime}>
                          {formatTime(lastMsg.sentAt)}
                        </span>
                      )}
                    </div>
                    <div className={styles.chatPreview}>
                      <p className={styles.chatRoute}>
                        {lastMsg ? (
                          <>
                            {lastMsg.senderUid === user.uid && <span className={styles.youPrefix}>You: </span>}
                            {lastMsg.text}
                          </>
                        ) : chat.route}
                      </p>
                      {unreadCount > 0 && (
                        <span className={styles.unreadBadge}>{unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
                <div className={styles.headerInfo}>
                  <p className={styles.headerName}>{currentChat.name}</p>
                  <p className={styles.headerRoute}>{currentChat.route}</p>
                </div>
              </header>

              <section className={styles.messages} ref={messagesBoxRef}>
                {messages.map((m, idx) => {
                  const mine = m.senderUid === user.uid;
                  const showAvatar = !mine && (idx === 0 || messages[idx - 1].senderUid !== m.senderUid);
                  const status = getMessageStatus(m);
                  
                  return (
                    <div
                      key={m.id}
                      className={mine ? styles.msgRight : styles.msgLeft}
                    >
                      {showAvatar && (
                        <div className={styles.msgAvatar}>
                          {currentChat.avatar}
                        </div>
                      )}
                      {!showAvatar && !mine && <div className={styles.msgAvatarSpacer} />}
                      <div className={mine ? styles.bubbleBlue : styles.bubbleGray}>
                        <span className={styles.msgText}>{m.text}</span>
                        <div className={styles.meta}>
                          <span className={styles.time}>{formatTime(m.sentAt)}</span>
                          {mine && status && (
                            <span className={`${styles.check} ${getStatusColor(m)}`}>
                              {status}
                            </span>
                          )}
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
                  className={styles.messageInput}
                />
                <button 
                  onClick={send} 
                  disabled={sending || !input.trim()}
                  className={styles.sendBtn}
                >
                  {sending ? "..." : "Send"}
                </button>
              </footer>
            </>
          ) : (
            <div className={styles.noChatSelected}>
              <div className={styles.noChatIcon}>💬</div>
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading…</div>}>
      <MessagesContent />
    </Suspense>
  );
}
