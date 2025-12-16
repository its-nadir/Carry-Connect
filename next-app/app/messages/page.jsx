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
  getUserTrips, // IMPORTED FOR FETCHING CARRIER TRIPS
  getUserOrders // IMPORTED FOR FETCHING BOOKED TRIPS
} from "../../lib/db";

export default function MessagesPage() {
  const [user, setUser] = useState(null); // Current logged-in user
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [conversations, setConversations] = useState([]); // REPLACED MOCK CHATS WITH REAL CONVERSATIONS
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // GET CURRENT USER
  useEffect(() => {
    const unsubscribeAuth = onAuthChange((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  // TRIPS THE USER IS INVOLVED IN
  useEffect(() => {
    if (!user) {
        setConversations([]);
        return;
    }

    const fetchConversations = async () => {
        // Fetch trips where the user is the carrier
        const postedTrips = await getUserTrips(user.uid); 
        // Fetch trips where the user is the shipper/booker
        const bookedOrders = await getUserOrders(user.uid); 

        const combinedChats = [...postedTrips, ...bookedOrders].filter((trip) => trip.status === 'booked');
        
        // Map the data for display in the chat sidebar
        const formattedChats = combinedChats.map(trip => {
            // Determine who the other participant is for the display name
            const isCarrier = trip.carrierUid === user.uid;
            // Get the name of the OTHER person
            const otherPersonName = isCarrier 
                ? trip.bookedByEmail // If I am the carrier, the other person is the booker
                : trip.carrierName; // If I am the booker, the other person is the carrier
            
            const route = `${trip.from} → ${trip.to}`;
            
            return {
                tripId: trip.id,
                name: otherPersonName,
                route,
                lastMessage: "Tap to open chat...",
                lastMessageAt: null,
                lastMessageSenderUid: null,
                unread: false,
                avatar: otherPersonName ? otherPersonName[0].toUpperCase() : '?',
                tripData: trip
            };
        });

        // REMOVE DUPLICATES (IF ANY)
        const uniqueChats = Array.from(new Set(formattedChats.map(c => c.tripId)))
          .map(id => formattedChats.find(c => c.tripId === id));

        setConversations(uniqueChats);
    };

    fetchConversations();
  }, [user]); // DEPENDENCY ON USER ENSURES THIS RUNS ONLY WHEN AUTH IS READY

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
            const msgTime = msg?.sentAt ? new Date(msg.sentAt).getTime() : 0;
            const unread = !!(msg && msgTime > lastSeen && msg.senderUid && msg.senderUid !== user.uid);
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



  // REPLACES THE OLD openChat LISTENER LOGIC
  useEffect(() => {
    if (!selectedTripId) {
        setMessages([]); // Clear messages when no trip is selected
        return;
    }

    setCurrentTripId(selectedTripId);

    // Start the listener and get the unsubscribe function
    const unsubscribe = listenToTripChat((msgs) => {
        setMessages(msgs);
    });

    // Cleanup function: runs when the component unmounts or selectedTripId changes
    return () => {
        unsubscribe(); // Stop the old listener
        setCurrentTripId(null); // Clear the ID in the db module
    };
  }, [selectedTripId]); // RE-RUN WHENEVER THE SELECTED TRIP CHANGES


  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // When user clicks a chat (only sets state to trigger the useEffect listener)
  const openChat = (tripId) => {
    if (user) setLastSeen(user.uid, tripId, Date.now());
    setSelectedTripId(tripId);
  };

  // Send message
  const send = () => {
    if (!input.trim() || !selectedTripId) return;
    sendTripMessage(input);
    setInput("");
  };

  // Get the selected chat data for the header
  const currentChat = conversations.find(c => c.tripId === selectedTripId);


  return (
    <div className={styles.page}>
      <div className={styles.container}>
        
        {/* LEFT CHAT LIST */}
        <div className={styles.sidebar}>
          <h3 className={styles.sidebarTitle}>Messages</h3>
          {user ? (
            conversations.length === 0 ? (
                <div className={styles.emptyState}>No active bookings or trips.</div>
            ) : (
                // CHANGED FROM MOCK CHATS TO REAL CONVERSATIONS
                conversations.map((chat) => (
                    <div
                      key={chat.tripId}
                      className={
                        chat.tripId === selectedTripId 
                          ? `${styles.chatItem} ${styles.selectedChat}`
                          : styles.chatItem
                      }
                      onClick={() => openChat(chat.tripId)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className={styles.chatAvatar}>{chat.avatar}</div>
                      <div className={styles.chatInfo}>
                        <p className={styles.chatName}>
                          {chat.name}
                          {chat.unread && <span className={styles.unreadDot} />}
                        </p>
                        <p className={styles.chatRoute}>{chat.route}</p>
                        <p className={chat.unread ? `${styles.chatMsg} ${styles.chatMsgUnread}` : styles.chatMsg}>
                          {chat.lastMessage}
                        </p>
                      </div>
                      <p className={styles.chatTime}>
                        {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </p>
                    </div>
                ))
            )
          ) : (
            <div className={styles.emptyState}>Please login to see messages.</div>
          )}
        </div>

        {/* RIGHT CHAT WINDOW */}
        <div className={styles.chatWindow}>
          {selectedTripId && currentChat ? (
            <>
              {/* Header - NOW USES REAL CURRENTCHAT DATA */}
              <div className={styles.header}>
                <div className={styles.headerAvatar}>
                  {currentChat.avatar}
                </div>
                <div>
                  <p className={styles.headerName}>
                    {currentChat.name}
                  </p>
                  <p className={styles.headerRoute}>
                    {currentChat.route}
                  </p>
                </div>
              </div>

              {/* Messages Area - REMAINS THE SAME (CORRECT) */}
              <div className={styles.messages}>
                {messages.length === 0 ? (
                  <div className={styles.emptyState}>
                    Start the conversation
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={
                        m.senderUid === auth?.currentUser?.uid
                          ? styles.msgBoxRight
                          : styles.msgBox
                      }
                    >
                      {/* USING THE SENDER FIELD (NAME OR EMAIL) FROM DB.JS */}
                      <span className={
                        m.senderUid === auth?.currentUser?.uid
                          ? styles.msgSenderRight
                          : styles.msgSender
                      }>
                        {m.senderUid === auth?.currentUser?.uid ? "You" : m.sender?.[0]}
                      </span>
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
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input - REMAINS THE SAME (CORRECT) */}
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
                  <button
                    onClick={send}
                    className={styles.sendBtn}
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
