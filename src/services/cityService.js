// src/services/cityService.js
// City service สำหรับจัดการข้อมูลเมือง

import { apiClient } from './apiClient';

/**
 * ดึงรายการเมืองทั้งหมด
 * @param {string} search - คำค้นหา (optional)
 * @param {number} limit - จำนวนข้อมูลสูงสุด (default 100)
 * @returns {Promise<Array>} - รายการเมือง
 */
export async function getCities(search = '', limit = 100) {
  try {
    const response = await apiClient.get('/gateway.php', {
      action: 'getCities',
      search,
      limit,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch cities');
    }

    return response.data || [];
  } catch (error) {
    console.error('Error fetching cities:', error);
    throw error;
  }
}

/**
 * ดึงข้อมูลเมืองตาม ID
 * @param {number} cityId - รหัสเมือง
 * @returns {Promise<Object>} - ข้อมูลเมือง
 */
export async function getCityById(cityId) {
  try {
    const response = await apiClient.get('/gateway.php', {
      action: 'getCityById',
      id: cityId,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch city');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching city:', error);
    throw error;
  }
}

/**
 * สร้างเมืองใหม่
 * @param {Object} cityData - ข้อมูลเมือง { city_code, city_name }
 * @returns {Promise<Object>} - ผลลัพธ์การสร้าง
 */
export async function createCity(cityData) {
  try {
    const response = await apiClient.post('/gateway.php', {
      action: 'createCity',
      data: cityData,
    });

    return response;
  } catch (error) {
    console.error('Error creating city:', error);
    return {
      success: false,
      error: error.message || 'Failed to create city',
    };
  }
}

/**
 * อัปเดตข้อมูลเมือง
 * @param {number} cityId - รหัสเมือง
 * @param {Object} cityData - ข้อมูลเมืองที่ต้องการอัปเดต
 * @returns {Promise<Object>} - ผลลัพธ์การอัปเดต
 */
export async function updateCity(cityId, cityData) {
  try {
    const response = await apiClient.post('/gateway.php', {
      action: 'updateCity',
      id: cityId,
      data: cityData,
    });

    return response;
  } catch (error) {
    console.error('Error updating city:', error);
    return {
      success: false,
      error: error.message || 'Failed to update city',
    };
  }
}

/**
 * ลบเมือง
 * @param {number} cityId - รหัสเมือง
 * @returns {Promise<Object>} - ผลลัพธ์การลบ
 */
export async function deleteCity(cityId) {
  try {
    const response = await apiClient.post('/gateway.php', {
      action: 'deleteCity',
      id: cityId,
    });

    return response;
  } catch (error) {
    console.error('Error deleting city:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete city',
    };
  }
}
