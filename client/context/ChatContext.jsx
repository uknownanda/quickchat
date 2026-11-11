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
    const { socket, axios, authUser } = useContext(AuthContext);
    const selectedRef = useRef(null);
    const isChatActive = () =>
    document.visibilityState === "visible" && document.hasFocus();
    useEffect(() => { selectedRef.current = selectedUser; }, [selectedUser]);
    useEffect(() => { setSelectedUser(null); setMessages([]); setUnseenMessages({}); setTypingUsers({}); }, [authUser?._id]);

    const getUsers = async () => { try { const { data } = await axios.get("/api/messages/users"); if (data.success) { setUsers(data.users); setUnseenMessages(data.unseenMessages || {}); } } catch (e) { console.error("Get Users Error:", e); } };
    const getMessages = async (userId) => {
        if (!userId) return;
        try { const { data } = await axios.get(`/api/messages/${userId}`); if (data.success && selectedRef.current?._id === userId) setMessages(data.messages); }
        catch (error) { console.error("Get Messages Error:", error); if (error.response?.status === 403 && selectedRef.current?._id === userId) { setSelectedUser(null); setMessages([]); } toast.error(error.response?.data?.message || "Unable to load messages"); }
    };
    const sendMessage = async (messageData) => {
        if (!selectedRef.current?._id) return toast.error("Select a conversation first");
        try { const { data } = await axios.post(`/api/messages/send/${selectedRef.current._id}`, messageData); if (data.success) setMessages(prev => prev.some(m => m._id === data.newMessage._id) ? prev : [...prev, data.newMessage]); }
        catch (error) { toast.error(error.response?.data?.message || "Message could not be sent"); }
    };
    const updateMessage = async (id, body) => { try { const { data } = await axios.patch(`/api/messages/${id}`, body); if (data.success) setMessages(prev => prev.map(m => m._id === id ? data.message : m)); } catch (e) { toast.error(e.response?.data?.message || "Message update failed"); } };
    const deleteMessage = async (id) => { try { await axios.delete(`/api/messages/${id}`); } catch (e) { toast.error(e.response?.data?.message || "Message deletion failed"); } };
    const togglePinMessage = async (id) => { try { const { data } = await axios.patch(`/api/messages/${id}/pin`); if (data.success) setMessages(prev => prev.map(m => m._id === id ? data.message : m)); } catch (e) { toast.error(e.response?.data?.message || "Pin update failed"); } };
    const searchMessages = async (userId, q) => { try { const { data } = await axios.get(`/api/messages/search/${userId}`, { params: { q } }); return data.messages || []; } catch (e) { toast.error(e.response?.data?.message || "Search failed"); return []; } };
    const sendTyping = (to, isTyping) => socket?.emit("typing", { to, isTyping });

    useEffect(() => {
        if (!socket) return;
        const onNew = (message) => {
    const current = selectedRef.current;
    const isViewingConversation =
        current?._id === message.senderId && isChatActive();

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
            [message.senderId]: (prev[message.senderId] || 0) + 1
        }));
    }
};
        const onUpdate = message => setMessages(prev => prev.map(m => m._id === message._id ? message : m));
        const onDelete = message => setMessages(prev => prev.map(m => m._id === message._id ? { ...m, ...message } : m));
        const onRead = ({ senderId, readerId, readAt }) => { if (authUser?._id === senderId) setMessages(prev => prev.map(m => m.senderId === senderId && m.receiverId === readerId ? { ...m, seen: true, readAt } : m)); };
        const onTyping = ({ from, isTyping }) => setTypingUsers(prev => ({ ...prev, [from]: isTyping }));
        const onPresence = ({ userId, online, lastSeen }) => { setUsers(prev => prev.map(u => u._id === userId ? { ...u, lastSeen: lastSeen || u.lastSeen, isOnline: online } : u)); setSelectedUser(prev => prev?._id === userId ? { ...prev, lastSeen: lastSeen || prev.lastSeen, isOnline: online } : prev); };
        socket.on("presenceUpdated", onPresence); socket.on("newMessage", onNew); socket.on("messageUpdated", onUpdate); socket.on("messageDeleted", onDelete); socket.on("messagesRead", onRead); socket.on("messageRead", onRead); socket.on("typing", onTyping);
        socket.on("contactRequestUpdated", getUsers);
        return () => { socket.off("presenceUpdated", onPresence); socket.off("newMessage", onNew); socket.off("messageUpdated", onUpdate); socket.off("messageDeleted", onDelete); socket.off("messagesRead", onRead); socket.off("messageRead", onRead); socket.off("typing", onTyping); socket.off("contactRequestUpdated", getUsers); };
    }, [socket, authUser?._id]);
    useEffect(() => { if (selectedUser?._id) { setUnseenMessages(prev => ({ ...prev, [selectedUser._id]: 0 })); getMessages(selectedUser._id); } else setMessages([]); }, [selectedUser?._id]);
    // Update browser tab title with total unread messages
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
    return <ChatContext.Provider value={{ messages, users, selectedUser, getUsers, getMessages, sendMessage, setSelectedUser, unseenMessages, setUnseenMessages, typingUsers, sendTyping, updateMessage, deleteMessage, searchMessages, togglePinMessage }}>{children}</ChatContext.Provider>;
};
