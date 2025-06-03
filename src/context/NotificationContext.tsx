import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../context/AuthContext";
import { Notification } from "../types/index";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    // console.log("fetching notification");
    if (!user?.id) return;

    setLoading(true);

    const { data: userData, error: userError } = await supabase.from("users").select("notification_preferences").eq("id", user.id);
    const preferences=userData[0].notification_preferences;
    // console.log(" preferences", preferences);
    let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });
    
    if (user.role === "admin") {
      query = query.eq("receiver_role", "admin");
    } else if (user.role === "client") {
      query = query.eq("receiver_role", "client").eq("receiver_id", user.clientId);
    }

      // 🔍 Filter based on preferences
  const allowedTypes = [];
  if (preferences.app_tasks) allowedTypes.push("task");
  if (preferences.app_clients) allowedTypes.push("client");
  if (preferences.app_payments) allowedTypes.push("payment");

  if (allowedTypes.length > 0) {
    query = query.in("type", allowedTypes);
  } else {
    setNotifications([]);
    setLoading(false);
    return;
  }

    const { data, error } = await query;
    if (!error) setNotifications(data ?? []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within NotificationProvider");
  return context;
};