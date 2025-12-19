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

              // Calculate unread count only if not currently viewing this chat
              if (lastMsg.senderUid !== user.uid && !lastMsg.seenBy?.includes(user.uid)) {
                setUnreadCounts(prev => {
                  // Don't show unread if we're currently in this chat
                  if (selectedTripId === chat.tripId) {
                    return { ...prev, [chat.tripId]: 0 };
                  }
                  return {
                    ...prev,
                    [chat.tripId]: 1
                  };
                });
              } else if (lastMsg.seenBy?.includes(user.uid)) {
                // Clear unread if message is seen
                setUnreadCounts(prev => ({ ...prev, [chat.tripId]: 0 }));
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
    
    // Clear unread count immediately when opening chat
    setUnreadCounts(prev => ({ ...prev, [selectedTripId]: 0 }));

    const unsub = listenToTripChat(msgs => {
      setMessages(msgs);
      // Mark messages as seen and clear unread count
      markTripMessagesSeen(selectedTripId);
      setUnreadCounts(prev => ({ ...prev, [selectedTripId]: 0 }));
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
    if (!otherUid) return "sent";
    
    if (msg.seenBy?.includes(otherUid)) {
      return "read";
    } else {
      return "sent";
    }
  };

  const currentChat = conversations.find(c => c.tripId === selectedTripId);
  const otherUid = currentChat?.otherUid;

  // Generate consistent avatar color based on user ID
  const getAvatarColor = (name) => {
    if (!name) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)'
    ];
    
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

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
        <aside className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Messages</h3>
          <div className={styles.conversationList}>
            {sortedConversations.map(chat => {
              const lastMsg = lastMessages[chat.tripId];
              const unreadCount = unreadCounts[chat.tripId] || 0;
              const isUnread = unreadCount > 0;
              const isSelected = chat.tripId === selectedTripId;
              
              return (
                <div
                  key={chat.tripId}
                  className={`${styles.chatItem} ${isUnread ? styles.chatItemUnread : ''} ${isSelected ? styles.chatItemSelected : ''}`}
                  onClick={() => setSelectedTripId(chat.tripId)}
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
          </div>
        </aside>

        <main className={styles.chatWindow}>
          {currentChat ? (
            <>
              <header className={styles.header}>
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
                            <span className={styles.checkmarks}>
                              {status === "read" ? (
                                <svg className={styles.checkRead} viewBox="0 0 18 18" width="18" height="18">
                                  <path d="M17.394 5.035l-.57-.444a.434.434 0 0 0-.609.076l-6.39 8.198a.38.38 0 0 1-.577.039l-.427-.388a.381.381 0 0 0-.578.038l-.451.576a.497.497 0 0 0 .043.645l1.575 1.51a.38.38 0 0 0 .577-.039l7.483-9.602a.436.436 0 0 0-.076-.609zm-4.892 0l-.57-.444a.434.434 0 0 0-.609.076l-6.39 8.198a.38.38 0 0 1-.577.039l-2.614-2.556a.435.435 0 0 0-.614.007l-.505.516a.435.435 0 0 0 .007.614l3.887 3.8a.38.38 0 0 0 .577-.039l7.483-9.602a.435.435 0 0 0-.075-.609z" fill="currentColor"/>
                                </svg>
                              ) : (
                                <svg className={styles.checkSent} viewBox="0 0 12 11" width="16" height="16">
                                  <path d="M11.1 2.3L9.5.7c-.2-.2-.5-.2-.7 0L4.5 5.2l-.9-.9c-.2-.2-.5-.2-.7 0L1.4 5.8c-.2.2-.2.5 0 .7l2.5 2.5c.2.2.5.2.7 0L11.1 3c.2-.2.2-.5 0-.7z" fill="currentColor"/>
                                </svg>
                              )}
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
