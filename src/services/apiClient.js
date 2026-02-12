// services/apiClient.js
// HTTP Client สำหรับเชื่อมต่อกับ PHP API Gateway
// แทนที่การใช้ Supabase SDK

/**
 * API Client สำหรับการเรียก PHP API Gateway
 * รักษา interface เดิมให้เหมือน Supabase patterns
 */
class ApiClient {
  constructor() {
    // กำหนด base URL ของ API Gateway
    this.baseURL =
      import.meta.env.VITE_API_BASE_URL || "https://hds.samuilookbiz.com/api";
    this.timeout = 30000; // 30 seconds timeout
  }

  /**
   * สร้าง HTTP request แบบทั่วไป
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {string} endpoint - API endpoint
   * @param {Object} data - ข้อมูลที่จะส่ง
   * @param {Object} options - ตัวเลือกเพิ่มเติม
   * @returns {Promise<Object>} - ผลลัพธ์จาก API
   */
  async request(method, endpoint, data = null, options = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;

      // ตั้งค่า headers
      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      };

      // ตั้งค่า request config
      const config = {
        method: method.toUpperCase(),
        headers,
        ...options,
      };

      // เพิ่มข้อมูลสำหรับ POST, PUT, PATCH
      if (data && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
        config.body = JSON.stringify(data);
      }

      // เพิ่ม query parameters สำหรับ GET
      if (data && method.toUpperCase() === "GET") {
        const params = new URLSearchParams();
        Object.keys(data).forEach((key) => {
          if (data[key] !== null && data[key] !== undefined) {
            params.append(key, data[key]);
          }
        });
        const queryString = params.toString();
        const finalUrl = queryString ? `${url}?${queryString}` : url;

        const response = await fetch(finalUrl, config);
        return await this.handleResponse(response);
      }

      // ส่ง request
      const response = await fetch(url, config);
      return await this.handleResponse(response);
    } catch (error) {
      console.error("API Request Error:", error);
      return {
        success: false,
        error: error.message || "Network error occurred",
        data: null,
      };
    }
  }

  /**
   * จัดการ response จาก API
   * @param {Response} response - Response object จาก fetch
   * @returns {Promise<Object>} - ผลลัพธ์ที่จัดการแล้ว
   */
  async handleResponse(response) {
    try {
      // ตรวจสอบ Content-Type
      const contentType = response.headers.get("content-type");

      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // ถ้า HTTP status ไม่ใช่ 200-299
      if (!response.ok) {
        return {
          success: false,
          error:
            data.error ||
            data.message ||
            `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          data: null,
        };
      }

      // ถ้า API ส่ง success: false กลับมา
      if (typeof data === "object" && data.success === false) {
        return {
          success: false,
          error: data.error || data.message || "API returned error",
          data: data.data || null,
        };
      }

      // ส่งผลลัพธ์สำเร็จกลับไป
      return {
        success: true,
        data:
          typeof data === "object" && data.data !== undefined
            ? data.data
            : data,
        count: data.count || null,
        total: data.total || null,
        message: data.message || null,
      };
    } catch (error) {
      console.error("Response handling error:", error);
      return {
        success: false,
        error: "Failed to process server response",
        data: null,
      };
    }
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - ผลลัพธ์จาก API
   */
  async get(endpoint, params = null, options = {}) {
    return await this.request("GET", endpoint, params, options);
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - ข้อมูลที่จะส่ง
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - ผลลัพธ์จาก API
   */
  async post(endpoint, data = null, options = {}) {
    return await this.request("POST", endpoint, data, options);
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - ข้อมูลที่จะส่ง
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - ผลลัพธ์จาก API
   */
  async put(endpoint, data = null, options = {}) {
    return await this.request("PUT", endpoint, data, options);
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - ข้อมูลที่จะส่ง (optional)
   * @param {Object} options - Request options
   * @returns {Promise<Object>} - ผลลัพธ์จาก API
   */
  async delete(endpoint, data = null, options = {}) {
    return await this.request("DELETE", endpoint, data, options);
  }
}

// สร้าง instance และ export
export const apiClient = new ApiClient();

// Export class สำหรับการใช้งานขั้นสูง
export { ApiClient };

// Default export
export default apiClient;
