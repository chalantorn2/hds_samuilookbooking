// src/pages/View/BusBoatTour/useBusBoatTourData.js
// Based on useFlightTicketsData.js - Voucher Service Data Hook
// ✅ Updated: เปลี่ยนจาก not_invoiced/invoiced เป็น not_voucher/voucher_issued

import { useState, useEffect } from "react";
import { apiClient } from "../../../services/apiClient";

/**
 * สร้าง Service Description Format สำหรับ vouchers
 * แสดงข้อมูลบริการแทน routing
 */
const generateServiceDescription = (details) => {
  if (!details) return "";

  const parts = [];
  if (details.description) parts.push(details.description);
  if (details.hotel) parts.push(`@${details.hotel}`);
  if (details.pickup_time) parts.push(`${details.pickup_time}`);

  return (
    parts.join(" ").substring(0, 50) +
    (parts.join(" ").length > 50 ? "..." : "")
  );
};

/**
 * Custom Hook for Bus/Boat/Tour Voucher Data Management
 * ✅ Updated: Status mapping เปลี่ยนเป็น voucher terminology (not_voucher/voucher_issued)
 */
export const useBusBoatTourData = ({
  startDate,
  endDate,
  searchTerm = "",
  filterStatus = "all",
  filterServiceType = "all", // เพิ่ม service type filter
  sortField = "created_at",
  sortDirection = "desc",
}) => {
  const [loading, setLoading] = useState(true);
  const [allVouchers, setAllVouchers] = useState([]);
  const [filteredVouchers, setFilteredVouchers] = useState([]);
  const [error, setError] = useState(null);

  const fetchVouchers = async () => {
    setLoading(true);
    setError(null);

    try {
      // 🔄 API Gateway call for vouchers
      // ✅ เมื่อ searchTerm >= 2 ตัวอักษร: ข้ามการกรองวันที่ (ค้นหาข้อมูลทั้งหมด)
      const isSearching = searchTerm && searchTerm.length >= 2;
      const response = await apiClient.get("/gateway.php", {
        action: "getVouchersList",
        startDate: isSearching ? "" : startDate + " 00:00:00",
        endDate: isSearching ? "" : endDate + " 23:59:59",
        searchTerm: searchTerm,
        filterStatus: filterStatus,
        filterServiceType: filterServiceType, // ส่ง service type filter
        sortField: sortField,
        sortDirection: sortDirection,
      });

      if (!response.success) {
        console.error("Error fetching vouchers:", response.error);
        setError("ไม่สามารถโหลดข้อมูล voucher ได้");
        setAllVouchers([]);
        setFilteredVouchers([]);
        return;
      }

      const rawData = response.data || [];

      // เพิ่มการประมวลผล timestamp และ display data
      const processedData = rawData.map((voucher) => {
        // ประมวลผล timestamp เหมือน Flight Tickets
        const timestamp = new Date(voucher.created_at);
        const localTimestamp = new Date(voucher.created_at);
        // สร้าง display data specific สำหรับ vouchers
        return {
          ...voucher,
          timestamp: localTimestamp,
          vcNumberDisplay: voucher.vc_number || "-",
          vcGeneratedAtDisplay: voucher.vc_generated_at
            ? new Date(voucher.vc_generated_at).toLocaleString("th-TH", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "-",

          // ✅ Bus/Boat/Tour specific display fields
          passengersDisplay: voucher.passengers?.length
            ? voucher.passengers.length === 1
              ? voucher.passengers[0].passenger_name // แค่คนเดียว
              : `${voucher.passengers[0].passenger_name} +${
                  voucher.passengers.length - 1
                }` // คนแรก +X
            : "-",

          hotelDisplay: voucher.details?.hotel || "-", // Hotel แทน Routing

          tripDateDisplay: voucher.details?.trip_date || "-", // Date แทน Ticket Number

          serviceTypeDisplay: voucher.service_type?.toUpperCase() || "-", // BS/BT/TR

          serviceDescription: generateServiceDescription(voucher.details),
        };
      });

      console.log("Processed vouchers with additional data:", processedData);

      setAllVouchers(processedData);
      setFilteredVouchers(processedData); // API Gateway handles filtering already
    } catch (error) {
      console.error("Error in fetchVouchers:", error);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setAllVouchers([]);
      setFilteredVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  // เก็บ filterData function ไว้เพื่อ backward compatibility
  const filterData = (data = allVouchers, search = searchTerm) => {
    if (search !== searchTerm) {
      return; // Trigger re-fetch
    }
    setFilteredVouchers(data);
  };

  // เก็บ sortVouchers function ไว้เพื่อ backward compatibility
  const sortVouchers = (vouchers, field, direction) => {
    const sorted = [...vouchers];

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
      fetchVouchers();
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
    allVouchers,
    filteredVouchers,
    fetchVouchers,
    filterData,
  };
};

// Export สำหรับใช้ใน component อื่น
export { generateServiceDescription };

export default useBusBoatTourData;
