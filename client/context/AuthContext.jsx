import { createContext, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
const socketUrl = import.meta.env.VITE_SOCKET_URL;

axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [authUser, setAuthUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null);
    const [socketStatus, setSocketStatus] = useState("disconnected");

    const connectSocket = (userData) => {
        // Connect to the persistent Express + Socket.IO backend.
        // In production, VITE_SOCKET_URL should point to the Render service.
        if (!socketUrl || !userData || socket) return;

        setSocketStatus("connecting");
        const newSocket = io(socketUrl, {
            query: { userId: userData._id },
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            timeout: 20000,
        });

        newSocket.on("connect", () => setSocketStatus("connected"));
        newSocket.on("disconnect", (reason) => {
            setSocketStatus(reason === "io client disconnect" ? "disconnected" : "reconnecting");
        });
        newSocket.on("reconnect_attempt", () => setSocketStatus("reconnecting"));
        newSocket.on("connect_error", () => setSocketStatus("reconnecting"));

        newSocket.on("connect_error", (error) => {
            console.error("Socket connection error:", error.message);
        });

        newSocket.on("getOnlineUsers", (userIds) => {
            setOnlineUsers(userIds);
        });

        setSocket(newSocket);
    };

    const clearSession = () => {
        localStorage.removeItem("token");
        delete axios.defaults.headers.common.token;
        setToken(null);
        setAuthUser(null);
        setOnlineUsers([]);
        setSocketStatus("disconnected");
        setSocket((currentSocket) => {
            currentSocket?.disconnect();
            return null;
        });
    };

    const checkAuth = async () => {
        const savedToken = localStorage.getItem("token");

        if (!savedToken) {
            clearSession();
            return;
        }

        axios.defaults.headers.common.token = savedToken;

        try {
            const { data } = await axios.get("/api/auth/check", {
                headers: { token: savedToken },
            });

            if (data.success && data.user) {
                setAuthUser(data.user);
                connectSocket(data.user);
            } else {
                clearSession();
            }
        } catch (error) {
            console.error("Authentication check failed:", error);
            if (error.response?.status === 401) {
                // Remove stale tokens (for example, tokens issued before a JWT secret/database reset).
                clearSession();
            } else {
                toast.error(
                    error.response?.data?.message ||
                    "Unable to verify your session. Please try again."
                );
            }
        }
    };

    const login = async (state, credentials) => {
        try {
            const { data } = await axios.post(
                `/api/auth/${state}`,
                credentials
            );

            if (!data.success) {
                toast.error(data.message || "Authentication failed");
                return;
            }

            localStorage.setItem("token", data.token);
            axios.defaults.headers.common.token = data.token;
            setToken(data.token);
            setAuthUser(data.userData);
            connectSocket(data.userData);
            toast.success(data.message || "Authentication successful");
        } catch (error) {
            console.error("Login/Signup Error:", error);
            toast.error(
                error.response?.data?.message ||
                (error.code === "ERR_NETWORK"
                    ? "Cannot reach the backend. Check the API deployment and CORS settings."
                    : "Authentication failed")
            );
        }
    };

    const logout = () => {
        clearSession();
        toast.success("Logged out successfully");
    };

    const updateProfile = async (body) => {
        try {
            const { data } = await axios.put(
                "/api/auth/update-profile",
                body,
                { headers: { token: localStorage.getItem("token") || "" } }
            );

            if (data.success) {
                setAuthUser(data.user);
                toast.success("Profile updated successfully");
            } else {
                toast.error(data.message || "Profile update failed");
            }
        } catch (error) {
            console.error("Profile Update Error:", error);
            toast.error(
                error.response?.data?.message || "Profile update failed"
            );
        }
    };

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common.token = token;
            checkAuth();
        } else {
            delete axios.defaults.headers.common.token;
        }

        return () => {
            socket?.disconnect();
        };
        // Run once on provider mount to restore the saved session.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value = {
        axios,
        authUser,
        onlineUsers,
        socket,
        socketStatus,
        token,
        login,
        logout,
        updateProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
