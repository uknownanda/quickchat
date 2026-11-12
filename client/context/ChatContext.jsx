
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});
    const [typingUsers, setTypingUsers] = useState({});
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

    const { socket, axios, authUser, desktopNotifications } = useContext(AuthContext);

    const selectedRef = useRef(null);
    const messagesRef = useRef(messages);
    const usersRef = useRef(users);
    const typingTimersRef = useRef({});
    const loadingOlderLock = useRef(false);
    messagesRef.current = messages;
    usersRef.current = users;

    const isChatActive = () =>
        document.visibilityState === "visible" && document.hasFocus();

    // Keep selected conversation reference updated
    useEffect(() => {
        selectedRef.current = selectedUser;
    }, [selectedUser]);

    // Reset chat data when user changes
    useEffect(() => {
        selectedRef.current = null;
        setSelectedUser(null);
        setMessages([]);
        setHasMoreMessages(false);
        setLoadingOlderMessages(false);
        setUnseenMessages({});
        setTypingUsers({});
    }, [authUser?._id]);

    // Get users and unread counts
    const getUsers = async () => {
        try {
            const { data } = await axios.get("/api/messages/users");

            if (data.success) {
                setUsers(data.users);
                setUnseenMessages(data.unseenMessages || {});
            }
        } catch (error) {
            console.error("Get Users Error:", error);
        }
    };

    // Get messages for a conversation
    const getMessages = async (userId, { sync = false } = {}) => {
        if (!userId) return;

        try {
            const latestKnownMessage = messagesRef.current[messagesRef.current.length - 1];
            const shouldCatchUp = sync && latestKnownMessage?._id;
            const { data } = await axios.get(`/api/messages/${userId}`, {
                params: shouldCatchUp ? { after: latestKnownMessage._id, limit: 100 } : { limit: 50 },
            });

            if (
                data.success &&
                selectedRef.current?._id === userId
            ) {
                if (shouldCatchUp) {
                    setMessages((current) => {
                        const existingIds = new Set(current.map((message) => message._id));
                        const incoming = data.messages.filter((message) => !existingIds.has(message._id));
                        return [...current, ...incoming].sort((a, b) =>
                            new Date(a.createdAt) - new Date(b.createdAt) ||
                            String(a._id).localeCompare(String(b._id))
                        );
                    });
                } else {
                    setMessages(data.messages);
                    setHasMoreMessages(Boolean(data.hasMore));
                }
            }
        } catch (error) {
            console.error("Get Messages Error:", error);

            if (
                error.response?.status === 403 &&
                selectedRef.current?._id === userId
            ) {
                setSelectedUser(null);
                setMessages([]);
            }

            toast.error(
                error.response?.data?.message || "Unable to load messages"
            );
        }
    };

    // Fetch the preceding page without changing the current read position.
    const loadOlderMessages = async () => {
        const userId = selectedRef.current?._id;
        const oldest = messagesRef.current[0];
        if (!userId || !oldest?._id || !hasMoreMessages || loadingOlderLock.current) return;
        loadingOlderLock.current = true;
        setLoadingOlderMessages(true);
        try {
            const { data } = await axios.get(`/api/messages/${userId}`, {
                params: { before: oldest._id, limit: 50 },
            });
            if (data.success && selectedRef.current?._id === userId) {
                setMessages((current) => {
                    const ids = new Set(current.map((message) => message._id));
                    const older = data.messages.filter((message) => !ids.has(message._id));
                    return [...older, ...current];
                });
                setHasMoreMessages(Boolean(data.hasMore));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Unable to load older messages");
        } finally {
            loadingOlderLock.current = false;
            setLoadingOlderMessages(false);
        }
    };

    // Send message
    const sendMessage = async (messageData) => {
        const userId = selectedRef.current?._id;

        if (!userId) {
            return toast.error("Select a conversation first");
        }

        try {
            const { data } = await axios.post(
                `/api/messages/send/${userId}`,
                messageData
            );

            if (data.success) {
                setMessages(prev =>
                    prev.some(m => m._id === data.newMessage._id)
                        ? prev
                        : [...prev, data.newMessage]
                );
                setUsers(prev => prev.map(user =>
                    user._id === userId
                        ? { ...user, lastMessage: data.newMessage }
                        : user
                ));
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Message could not be sent"
            );
        }
    };

    // Update message
    const updateMessage = async (id, body) => {
        try {
            const { data } = await axios.patch(`/api/messages/${id}`, body);

            if (data.success) {
                setMessages(prev =>
                    prev.map(m => m._id === id ? data.message : m)
                );
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Message update failed"
            );
        }
    };

    // Delete message
    const deleteMessage = async (id) => {
        try {
            await axios.delete(`/api/messages/${id}`);
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Message deletion failed"
            );
        }
    };

    // Pin / unpin message
    const togglePinMessage = async (id) => {
        try {
            const { data } = await axios.patch(`/api/messages/${id}/pin`);

            if (data.success) {
                setMessages(prev =>
                    prev.map(m => m._id === id ? data.message : m)
                );
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Pin update failed"
            );
        }
    };

    // Search messages
    const searchMessages = async (userId, q) => {
        try {
            const { data } = await axios.get(
                `/api/messages/search/${userId}`,
                { params: { q } }
            );

            return data.messages || [];
        } catch (error) {
            toast.error(error.response?.data?.message || "Search failed");
            return [];
        }
    };

    // Typing indicator
    const sendTyping = (to, isTyping) => {
        socket?.emit("typing", { to, isTyping });
    };

    // Socket.IO event listeners
    useEffect(() => {
        if (!socket) return;

        // Synchronize after socket reconnects
        const syncAfterReconnect = () => {
            if (document.visibilityState !== "visible") return;

            const userId = selectedRef.current?._id;

            if (userId) {
                getMessages(userId, { sync: true });
            }

            getUsers();
        };

        // Incoming message
        const onNew = (message) => {
            const current = selectedRef.current;

            const isViewingConversation =
                current?._id === message.senderId && isChatActive();

            setUsers(prev => prev.map(user =>
                user._id === message.senderId
                    ? { ...user, lastMessage: message }
                    : user
            ));

            if (desktopNotifications && "Notification" in window &&
                Notification.permission === "granted" && !isViewingConversation) {
                const sender = usersRef.current.find((user) => user._id === message.senderId);
                new Notification(sender?.fullName || "New QuickChat message", {
                    body: message.text || (message.image ? "Sent you a photo" : "New message"),
                    tag: "quickchat-" + message._id,
                });
            }

            if (isViewingConversation) {
                setMessages(prev =>
                    prev.some(m => m._id === message._id)
                        ? prev
                        : [...prev, message]
                );

                axios.put(`/api/messages/mark/${message._id}`)
                    .catch(console.error);
            } else {
                setUnseenMessages(prev => ({
                    ...prev,
                    [message.senderId]:
                        (prev[message.senderId] || 0) + 1
                }));
            }
        };

        // Updated message
        const onUpdate = (message) => {
            setMessages(prev =>
                prev.map(m => m._id === message._id ? message : m)
            );
        };

        // Deleted message
        const onDelete = (message) => {
            setMessages(prev =>
                prev.map(m =>
                    m._id === message._id
                        ? { ...m, ...message }
                        : m
                )
            );
        };

        // Read receipt
        const onRead = ({ messageId, senderId, readerId, readAt }) => {
            if (messageId) {
                setMessages((prev) => prev.map((message) =>
                    message._id === messageId ? { ...message, seen: true, readAt } : message
                ));
                return;
            }
            if (authUser?._id === senderId) {
                setMessages((prev) => prev.map((message) =>
                    message.senderId === senderId && message.receiverId === readerId
                        ? { ...message, seen: true, readAt }
                        : message
                ));
            }
        };

        // Typing status
        const onTyping = ({ from, isTyping }) => {
            clearTimeout(typingTimersRef.current[from]);
            setTypingUsers((prev) => ({ ...prev, [from]: Boolean(isTyping) }));
            if (isTyping) {
                typingTimersRef.current[from] = setTimeout(() => {
                    setTypingUsers((prev) => ({ ...prev, [from]: false }));
                    delete typingTimersRef.current[from];
                }, 4000);
            } else {
                delete typingTimersRef.current[from];
            }
        };

        // Online presence
        const onPresence = ({ userId, online, lastSeen }) => {
            setUsers(prev =>
                prev.map(u =>
                    u._id === userId
                        ? {
                            ...u,
                            lastSeen: lastSeen || u.lastSeen,
                            isOnline: online
                        }
                        : u
                )
            );

            setSelectedUser(prev =>
                prev?._id === userId
                    ? {
                        ...prev,
                        lastSeen: lastSeen || prev.lastSeen,
                        isOnline: online
                    }
                    : prev
            );
        };

        // Register listeners
        socket.on("connect", syncAfterReconnect);
        socket.on("newMessage", onNew);
        socket.on("messageUpdated", onUpdate);
        socket.on("messageDeleted", onDelete);
        socket.on("messagesRead", onRead);
        socket.on("messageRead", onRead);
        socket.on("typing", onTyping);
        socket.on("presenceUpdated", onPresence);
        socket.on("contactRequestUpdated", getUsers);

        // Handle already-connected socket
        if (socket.connected) {
            syncAfterReconnect();
        }

        // Cleanup listeners
        return () => {
            Object.values(typingTimersRef.current).forEach(clearTimeout);
            typingTimersRef.current = {};
            socket.off("connect", syncAfterReconnect);
            socket.off("newMessage", onNew);
            socket.off("messageUpdated", onUpdate);
            socket.off("messageDeleted", onDelete);
            socket.off("messagesRead", onRead);
            socket.off("messageRead", onRead);
            socket.off("typing", onTyping);
            socket.off("presenceUpdated", onPresence);
            socket.off("contactRequestUpdated", getUsers);
        };
    }, [socket, authUser?._id, desktopNotifications]);

    // Existing contact-selection behavior - unchanged
    useEffect(() => {
        if (selectedUser?._id) {
            setMessages([]);
            setHasMoreMessages(false);
            setUnseenMessages(prev => ({
                ...prev,
                [selectedUser._id]: 0
            }));

            getMessages(selectedUser._id);
        } else {
            setMessages([]);
            setHasMoreMessages(false);
        }
    }, [selectedUser?._id]);

    // Refresh conversation when returning to browser tab
    useEffect(() => {
        const refreshMessages = () => {
            if (document.visibilityState !== "visible") return;

            const userId = selectedRef.current?._id;

            if (userId) {
                getMessages(userId);
            }

            getUsers();
        };

        document.addEventListener("visibilitychange", refreshMessages);
        window.addEventListener("focus", refreshMessages);
        window.addEventListener("pageshow", refreshMessages);

        return () => {
            document.removeEventListener("visibilitychange", refreshMessages);
            window.removeEventListener("focus", refreshMessages);
            window.removeEventListener("pageshow", refreshMessages);
        };
    }, []);

    // Browser tab title with unread count
    useEffect(() => {
        const totalUnread = Object.values(unseenMessages).reduce(
            (total, count) => total + (Number(count) || 0),
            0
        );

        document.title = totalUnread > 0
            ? `(${totalUnread}) QuickChat`
            : "QuickChat";

        return () => {
            document.title = "QuickChat";
        };
    }, [unseenMessages]);

    return (
        <ChatContext.Provider
            value={{
                messages,
                hasMoreMessages,
                loadingOlderMessages,
                loadOlderMessages,
                users,
                selectedUser,
                getUsers,
                getMessages,
                sendMessage,
                setSelectedUser,
                unseenMessages,
                setUnseenMessages,
                typingUsers,
                sendTyping,
                updateMessage,
                deleteMessage,
                searchMessages,
                togglePinMessage
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};
