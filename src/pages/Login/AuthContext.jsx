// src/pages/Login/AuthContext.jsx - Migrated to API Gateway
// เปลี่ยนจาก Supabase calls เป็น API Gateway calls
// รักษา function signatures และ return formats เหมือนเดิม

import React, { createContext, useContext, useState, useEffect } from "react";
import { apiClient } from "../../services/apiClient";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ตรวจสอบ session จาก localStorage หรือวิธีอื่น (ถ้ามี)
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password, rememberMe = false) => {
    try {
      setLoading(true);

      // เปลี่ยนจาก Supabase เป็น API Gateway
      const response = await apiClient.post("/gateway.php", {
        action: "login",
        username: username,
        password: password,
        rememberMe: rememberMe,
      });

      if (!response.success) {
        return {
          success: false,
          error: response.error || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
        };
      }

      const userData = response.data.user;
      const shouldRemember = response.data.rememberMe;

      setUser(userData);

      // Handle localStorage based on rememberMe option
      if (shouldRemember) {
        localStorage.setItem("rememberedUsername", username);
        localStorage.setItem("user", JSON.stringify(userData));
      } else {
        localStorage.removeItem("rememberedUsername");
        localStorage.removeItem("user");
      }

      return { success: true, user: userData };
    } catch (error) {
      console.error("Login error:", error.message);
      return {
        success: false,
        error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      localStorage.removeItem("user");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error.message);
      return { success: false, error: error.message };
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      setLoading(true);

      // เปลี่ยนจาก Supabase เป็น API Gateway (ใช้ existing getUserById)
      const response = await apiClient.get("/gateway.php", {
        action: "getUserById",
        id: userId,
      });

      if (!response.success) {
        console.error("Error fetching user profile:", response.error);
        return;
      }

      setUser(response.data);
    } catch (error) {
      console.error("Error fetching user profile:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    fetchUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
