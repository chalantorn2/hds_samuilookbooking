// src/pages/View/OtherServices/useOtherServicesData.js
// Based on useBusBoatTourData.js - Other Services Data Hook
// ✅ Status: not_voucher/voucher_issued/cancelled (เหมือน voucher ไม่ใช่ invoice)

import { useState, useEffect } from "react";
import { apiClient } from "../../../services/apiClient";

/**
 * สร้าง Service Description Format สำหรับ other services
 * แสดงข้อมูลบริการแทน routing
 */
const generateServiceDescription = (details, serviceType) => {
  if (!details) return "";

  const parts = [];

  // เพิ่มรายละเอียดตามประเภทบริการ
  if (details.description) parts.push(details.description);

  switch (serviceType) {
    case "hotel":
      if (details.hotel_name) parts.push(`${details.hotel_name}`);
      if (details.nights) parts.push(`${details.nights}คืน`);
      break;
    case "train":
      if (details.route) parts.push(details.route);
      if (details.departure_time) parts.push(details.departure_time);
      break;
    case "visa":
      if (details.country) parts.push(details.country);
      if (details.visa_type) parts.push(details.visa_type);
      break;
    case "insurance":
      // ไม่ต้องใส่ service_date เพราะมีคอลัมน์ Date แยกแล้ว
      break;
    default:
      // ไม่ต้องใส่ service_date เพราะมีคอลัมน์ Date แยกแล้ว
      break;
  }

  return (
    parts.join(" ").substring(0, 50) +
    (parts.join(" ").length > 50 ? "..." : "")
  );
};

/**
 * สร้าง Date Display สำหรับแต่ละประเภทบริการ
 * Hotel ใช้ Check In date, อื่นๆ ใช้ Service date
 */
const getServiceDateDisplay = (details, serviceType) => {
  if (!details) return "-";

  switch (serviceType) {
    case "hotel":
      // ✅ แก้ไข: ใช้ check_in_date จากฐานข้อมูล
      return details.check_in_date || details.service_date || "-";
    default:
      return details.service_date || "-";
  }
};

/**
 * Custom Hook for Other Services Data Management
 * ✅ Status mapping: not_voucher/voucher_issued/cancelled
 */
export const useOtherServicesData = ({
  startDate,
  endDate,
  searchTerm = "",
  filterStatus = "all",
  filterServiceType = "all",
  sortField = "created_at",
  sortDirection = "desc",
}) => {
  const [loading, setLoading] = useState(true);
  const [allOthers, setAllOthers] = useState([]);
  const [filteredOthers, setFilteredOthers] = useState([]);
  const [error, setError] = useState(null);

  const fetchOthers = async () => {
    setLoading(true);
    setError(null);

    try {
      // 🔄 API Gateway call for other services
      // ✅ เมื่อ searchTerm >= 2 ตัวอักษร: ข้ามการกรองวันที่ (ค้นหาข้อมูลทั้งหมด)
      const isSearching = searchTerm && searchTerm.length >= 2;
      const response = await apiClient.get("/gateway.php", {
        action: "getOthersList",
        startDate: isSearching ? "" : startDate + " 00:00:00",
        endDate: isSearching ? "" : endDate + " 23:59:59",
        searchTerm: searchTerm,
        filterStatus: filterStatus,
        filterServiceType: filterServiceType,
        sortField: sortField,
        sortDirection: sortDirection,
      });

      if (!response.success) {
        console.error("Error fetching other services:", response.error);
        setError("ไม่สามารถโหลดข้อมูล other services ได้");
        setAllOthers([]);
        setFilteredOthers([]);
        return;
      }

      const rawData = response.data || [];

      // เพิ่มการประมวลผล timestamp และ display data
      const processedData = rawData.map((other) => {
        // ประมวลผล timestamp
        const timestamp = new Date(other.created_at);
        const localTimestamp = new Date(other.created_at);

        // สร้าง display data specific สำหรับ other services
        return {
          ...other,
          timestamp: localTimestamp,
          vcNumberDisplay: other.vc_number || "-",
          vcGeneratedAtDisplay: other.vc_generated_at
            ? new Date(other.vc_generated_at).toLocaleString("th-TH", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",

          // ✅ Other Services specific display fields
          passengersDisplay: other.passengers?.length
            ? other.passengers.length === 1
              ? other.passengers[0].passenger_name // แค่คนเดียว
              : `${other.passengers[0].passenger_name} +${
                  other.passengers.length - 1
                }` // คนแรก +X
            : "-",

          // ✅ Service Date Display - Hotel ใช้ Check In, อื่นๆ ใช้ Service Date
          serviceDateDisplay: getServiceDateDisplay(
            other.details,
            other.service_type
          ),

          // Service Type Display
          serviceTypeDisplay: (() => {
            switch (other.service_type) {
              case "insurance":
                return "INS";
              case "hotel":
                return "HTL";
              case "train":
                return "TRN";
              case "visa":
                return "VSA";
              case "other":
                return "OTH";
              default:
                return other.service_type?.toUpperCase() || "-";
            }
          })(),

          // Service Description
          serviceDescription: generateServiceDescription(
            other.details,
            other.service_type
          ),
        };
      });

      console.log(
        "Processed other services with additional data:",
        processedData
      );

      setAllOthers(processedData);
      setFilteredOthers(processedData); // API Gateway handles filtering already
    } catch (error) {
      console.error("Error in fetchOthers:", error);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setAllOthers([]);
      setFilteredOthers([]);
    } finally {
      setLoading(false);
    }
  };

  // เก็บ filterData function ไว้เพื่อ backward compatibility
  const filterData = (data = allOthers, search = searchTerm) => {
    if (search !== searchTerm) {
      return; // Trigger re-fetch
    }
    setFilteredOthers(data);
  };

  // เก็บ sortOthers function ไว้เพื่อ backward compatibility
  const sortOthers = (others, field, direction) => {
    const sorted = [...others];

    sorted.sort((a, b) => {
      let valueA, valueB;

      if (field === "customer") {
        valueA = a.customer?.code || a.customer?.name || "";
        valueB = b.customer?.code || b.customer?.name || "";
      } else if (field === "supplier") {
        valueA = a.supplier?.code || a.supplier?.name || "";
        valueB = b.supplier?.code || b.supplier?.name || "";
      } else if (field === "service_type") {
        valueA = a.service_type || "";
        valueB = b.service_type || "";
      } else if (field === "status") {
        valueA = a.status || "not_voucher";
        valueB = b.status || "not_voucher";
      } else if (field === "created_at") {
        valueA = a.created_at ? new Date(a.created_at) : new Date(0);
        valueB = b.created_at ? new Date(b.created_at) : new Date(0);
      } else {
        valueA = a[field] || "";
        valueB = b[field] || "";
      }

      if (direction === "asc") {
        if (valueA < valueB) return -1;
        if (valueA > valueB) return 1;
        return 0;
      } else {
        if (valueA > valueB) return -1;
        if (valueA < valueB) return 1;
        return 0;
      }
    });

    return sorted;
  };

  // Re-fetch when search parameters change
  useEffect(() => {
    // ✅ อนุญาตให้ fetch ได้เมื่อค้นหา (searchTerm >= 2) แม้ไม่มี date range
    const isSearching = searchTerm && searchTerm.length >= 2;
    if (isSearching || (startDate && endDate)) {
      fetchOthers();
    }
  }, [
    startDate,
    endDate,
    searchTerm,
    filterStatus,
    filterServiceType,
    sortField,
    sortDirection,
  ]);

  return {
    loading,
    error,
    allOthers,
    filteredOthers,
    fetchOthers,
    filterData,
  };
};

// Export สำหรับใช้ใน component อื่น
export { generateServiceDescription, getServiceDateDisplay };

export default useOtherServicesData;
