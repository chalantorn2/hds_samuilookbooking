// src/services/otherService.js
// Other Services API Service - Based on voucherService.js Pattern
// Support: 5 Service Types (Insurance, Hotel, Train, Visa, Other)

import { apiClient } from "./apiClient";

/**
 * Create new other services booking
 * @param {Object} otherData - Complete other services data
 * @returns {Object} API response
 */
export const createOther = async (otherData) => {
  try {
    console.log("🚀 otherService.createOther called with:", otherData);

    const response = await apiClient.post("/gateway.php", {
      action: "createOther",
      data: otherData,
    });

    console.log("✅ otherService.createOther response:", response);

    if (!response.success) {
      console.error("Error creating other services:", response.error);
      return {
        success: false,
        error: response.error,
      };
    }

    // Unwrap data from response (same pattern as voucherService.js)
    return {
      success: true,
      referenceNumber: response.data.referenceNumber,
      otherId: response.data.otherId,
      serviceType: response.data.serviceType,
      grandTotal: response.data.grandTotal,
      message: response.data.message,
    };
  } catch (error) {
    console.error("❌ otherService.createOther error:", error);
    return {
      success: false,
      error: error.message || "Failed to create other services booking",
    };
  }
};

/**
 * Get other services by ID
 * @param {number} otherId - Other services ID
 * @returns {Object} API response
 */
export const getOtherById = async (otherId) => {
  try {
    console.log("🚀 otherService.getOtherById called with ID:", otherId);

    const response = await apiClient.get("/gateway.php", {
      action: "getOtherById",
      otherId: otherId,
    });

    console.log("✅ otherService.getOtherById response:", response);
    return response;
  } catch (error) {
    console.error("❌ otherService.getOtherById error:", error);
    return {
      success: false,
      error: error.message || "Failed to get other services record",
    };
  }
};

/**
 * Get other services for edit
 * @param {number} otherId - Other services ID
 * @returns {Object} API response
 */
export const getOtherForEdit = async (otherId) => {
  try {
    console.log("🚀 otherService.getOtherForEdit called with ID:", otherId);

    const response = await apiClient.get("/gateway.php", {
      action: "getOtherForEdit",
      otherId: otherId,
    });

    console.log("✅ otherService.getOtherForEdit response:", response);
    return response;
  } catch (error) {
    console.error("❌ otherService.getOtherForEdit error:", error);
    return {
      success: false,
      error: error.message || "Failed to get other services for edit",
    };
  }
};

/**
 * Get other services list with filters
 * @param {Object} params - Query parameters
 * @returns {Object} API response
 */
export const getOthersList = async (params = {}) => {
  try {
    console.log("🚀 otherService.getOthersList called with params:", params);

    const response = await apiClient.get("/gateway.php", {
      action: "getOthersList",
      ...params,
    });

    console.log("✅ otherService.getOthersList response:", response);
    return response;
  } catch (error) {
    console.error("❌ otherService.getOthersList error:", error);
    return {
      success: false,
      error: error.message || "Failed to get other services list",
    };
  }
};

/**
 * Update other services status
 * @param {number} otherId - Other services ID
 * @param {string} status - New status
 * @param {number} userId - User ID
 * @param {string} cancelReason - Cancel reason (if cancelling)
 * @returns {Object} API response
 */
export const updateOtherStatus = async (
  otherId,
  status,
  userId,
  cancelReason = ""
) => {
  try {
    console.log("🚀 otherService.updateOtherStatus called:", {
      otherId,
      status,
      userId,
    });

    const response = await apiClient.post("/gateway.php", {
      action: "updateOtherStatus",
      otherId: otherId,
      status: status,
      userId: userId,
      cancelReason: cancelReason,
    });

    console.log("✅ otherService.updateOtherStatus response:", response);
    return response;
  } catch (error) {
    console.error("❌ otherService.updateOtherStatus error:", error);
    return {
      success: false,
      error: error.message || "Failed to update other services status",
    };
  }
};

/**
 * Cancel other services booking
 * @param {number} otherId - Other services ID
 * @param {number} userId - User ID
 * @param {string} cancelReason - Reason for cancellation
 * @returns {Object} API response
 */
export const cancelOther = async (otherId, userId, cancelReason) => {
  try {
    console.log("🚀 otherService.cancelOther called:", {
      otherId,
      userId,
      cancelReason,
    });

    const response = await apiClient.post("/gateway.php", {
      action: "cancelOther",
      otherId: otherId,
      userId: userId,
      cancelReason: cancelReason,
    });

    console.log("✅ otherService.cancelOther response:", response);
    return response;
  } catch (error) {
    console.error("❌ otherService.cancelOther error:", error);
    return {
      success: false,
      error: error.message || "Failed to cancel other services booking",
    };
  }
};

/**
 * Update other services complete (full update)
 * @param {number} otherId - Other services ID
 * @param {Object} updateData - Complete update data
 * @returns {Object} API response
 */
export const updateOtherComplete = async (otherId, updateData) => {
  try {
    console.log("🚀 otherService.updateOtherComplete called:", {
      otherId,
      updateData,
    });

    const response = await apiClient.post("/gateway.php", {
      action: "updateOtherComplete",
      id: otherId,
      data: updateData,
    });

    console.log("✅ otherService.updateOtherComplete response:", response);
    return response;
  } catch (error) {
    console.error("❌ otherService.updateOtherComplete error:", error);
    return {
      success: false,
      error: error.message || "Failed to update other services",
    };
  }
};

/**
 * Generate reference number for specific service type
 * @param {string} serviceType - Service type (insurance, hotel, train, visa, other)
 * @returns {Object} API response
 */
export const generateOtherReferenceNumber = async (serviceType) => {
  try {
    console.log(
      "🚀 otherService.generateOtherReferenceNumber called with serviceType:",
      serviceType
    );

    const response = await apiClient.get("/gateway.php", {
      action: "generateOtherReferenceNumber",
      serviceType: serviceType,
    });

    console.log(
      "✅ otherService.generateOtherReferenceNumber response:",
      response
    );
    return response;
  } catch (error) {
    console.error("❌ otherService.generateOtherReferenceNumber error:", error);
    return {
      success: false,
      error: error.message || "Failed to generate reference number",
    };
  }
};

/**
 * Get other services suppliers by service type
 * @param {string} serviceType - Service type for supplier filtering
 * @param {string} search - Search term
 * @returns {Object} API response
 */
export const getOtherSuppliers = async (serviceType = "", search = "") => {
  try {
    console.log("🚀 otherService.getOtherSuppliers called:", {
      serviceType,
      search,
    });

    const response = await apiClient.get("/gateway.php", {
      action: "getOtherSuppliers",
      serviceType: serviceType || "",
      search: search || "",
      limit: 100,
    });

    console.log("✅ otherService.getOtherSuppliers response:", response);

    // Handle API response properly
    if (response.success) {
      return {
        success: true,
        data: response.data || [],
      };
    } else {
      return {
        success: false,
        error: response.error || "Failed to get suppliers",
        data: [],
      };
    }
  } catch (error) {
    console.error("❌ otherService.getOtherSuppliers error:", error);
    return {
      success: false,
      error: error.message || "Failed to get other services suppliers",
      data: [],
    };
  }
};

/**
 * Service-specific reference number generators
 */
export const generateInsuranceReferenceNumber = async () => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "generateInsuranceReferenceNumber",
    });
    return response;
  } catch (error) {
    console.error("❌ generateInsuranceReferenceNumber error:", error);
    return { success: false, error: error.message };
  }
};

export const generateHotelReferenceNumber = async () => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "generateHotelReferenceNumber",
    });
    return response;
  } catch (error) {
    console.error("❌ generateHotelReferenceNumber error:", error);
    return { success: false, error: error.message };
  }
};

export const generateTrainReferenceNumber = async () => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "generateTrainReferenceNumber",
    });
    return response;
  } catch (error) {
    console.error("❌ generateTrainReferenceNumber error:", error);
    return { success: false, error: error.message };
  }
};

export const generateVisaReferenceNumber = async () => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "generateVisaReferenceNumber",
    });
    return response;
  } catch (error) {
    console.error("❌ generateVisaReferenceNumber error:", error);
    return { success: false, error: error.message };
  }
};

export const generateOtherServiceReferenceNumber = async () => {
  try {
    const response = await apiClient.get("/gateway.php", {
      action: "generateOtherServiceReferenceNumber",
    });
    return response;
  } catch (error) {
    console.error("❌ generateOtherServiceReferenceNumber error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Generate and save VC Number for Other Services booking
 * @param {number} otherId - ID ของ Other Services booking
 * @returns {Promise<Object>} - ผลลัพธ์การสร้าง VC
 */
export const generateVCForOther = async (otherId) => {
  try {
    console.log("🚀 otherService.generateVCForOther called with ID:", otherId);

    const response = await apiClient.post("/gateway.php", {
      action: "generateVCForOther",
      otherId: otherId,
    });

    console.log("✅ otherService.generateVCForOther response:", response);

    if (!response.success) {
      console.error("❌ Error generating VC Number:", response.error);
      return {
        success: false,
        error: response.error,
        vcNumber: null,
      };
    }

    return {
      success: true,
      vcNumber: response.data.vcNumber,
      isNew: response.data.isNew,
      message: response.data.message,
    };
  } catch (error) {
    console.error("❌ otherService.generateVCForOther error:", error);
    return {
      success: false,
      error: error.message,
      vcNumber: null,
    };
  }
};

/**
 * ตรวจสอบว่า Other Services สามารถออก VC ได้หรือไม่
 * @param {Object} other - ข้อมูล other services
 * @returns {boolean} - สามารถออก VC ได้หรือไม่
 */
export const canGenerateVC = (other) => {
  if (!other) return false;

  // ไม่สามารถออก VC ให้ other services ที่ถูกยกเลิกแล้ว
  if (other.status === "cancelled") return false;

  // ถ้ามี VC แล้วไม่ต้องออกใหม่
  if (other.vc_number && other.vc_number.trim() !== "") return false;

  return true;
};

// Export all functions as default
export default {
  createOther,
  getOtherById,
  getOtherForEdit,
  getOthersList,
  updateOtherStatus,
  cancelOther,
  updateOtherComplete,
  generateOtherReferenceNumber,
  getOtherSuppliers,
  generateVCForOther,
  canGenerateVC,
  generateInsuranceReferenceNumber,
  generateHotelReferenceNumber,
  generateTrainReferenceNumber,
  generateVisaReferenceNumber,
  generateOtherServiceReferenceNumber,
};
