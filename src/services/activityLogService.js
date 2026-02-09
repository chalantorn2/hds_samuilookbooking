// src/services/activityLogService.js
import { apiClient } from "./apiClient";

/**
 * Get activity logs with filters
 */
export const getActivityLogs = async (filters = {}) => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "getActivityLogs",
      ...filters,
    });

    if (!response.success) {
      console.error("Error fetching activity logs:", response.error);
      return {
        success: false,
        error: response.error || "Failed to fetch activity logs",
      };
    }

    return response;
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch activity logs",
    };
  }
};
