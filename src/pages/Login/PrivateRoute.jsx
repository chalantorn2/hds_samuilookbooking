import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

const PrivateRoute = ({ requiredRole = null }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="ml-3 text-gray-700">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requiredRole) {
    if (user.role === "admin") {
      return <Outlet />;
    }

    if (requiredRole === "admin" && user.role !== "admin") {
      return <Navigate to="/" replace />;
    }

    if (requiredRole === "manager" && user.role === "viewer") {
      return <Navigate to="/" replace />;
    }
  }

  return <Outlet />;
};

export default PrivateRoute;
