// src/pages/View/hooks/useFlightTicketsData.js - Migrated to API Gateway
// เปลี่ยนจาก Supabase calls เป็น API Gateway calls
// รักษา function signatures และ return formats เหมือนเดิม

import { useState, useEffect } from "react";
import { apiClient } from "../../../services/apiClient";
// 🔄 MIGRATION PHASE: แปลงจาก Supabase เป็น API Gateway
// ✅ ACTIVE: ใช้ API Gateway แล้ว
// import { supabase } from "../../../services/supabase"; // 🔄 Rollback: uncomment หากมีปัญหา
// import { toThaiTimeZone } from "../../../utils/helpers"; // 🔄 ยังใช้ function นี้อยู่

/**
 * สร้าง Multi-Segment Route Format (จำกัดแสดงสูงสุด 5 airports)
 */
const generateMultiSegmentRoute = (routes) => {
  if (!routes || routes.length === 0) return "";

  const routeSegments = [];
  let currentSegment = [];
  let totalAirports = 0;
  const MAX_AIRPORTS = 5;

  for (let index = 0; index < routes.length; index++) {
    const route = routes[index];
    const origin = route.origin;
    const destination = route.destination;

    if (currentSegment.length === 0) {
      currentSegment = [origin, destination];
      totalAirports = 2;
    } else {
      const lastDestination = currentSegment[currentSegment.length - 1];

      if (origin === lastDestination) {
        if (totalAirports + 1 <= MAX_AIRPORTS) {
          currentSegment.push(destination);
          totalAirports++;
        } else {
          routeSegments.push(currentSegment.join("-"));
          break;
        }
      } else {
        routeSegments.push(currentSegment.join("-"));

        if (totalAirports + 2 <= MAX_AIRPORTS) {
          currentSegment = [origin, destination];
          totalAirports += 2;
        } else {
          break;
        }
      }
    }

    if (index === routes.length - 1 && currentSegment.length > 0) {
      routeSegments.push(currentSegment.join("-"));
    }
  }

  return routeSegments.join("//");
};

// ⭐ เพิ่มบรรทัดนี้ - Export ฟังก์ชันออกมา
export { generateMultiSegmentRoute };

export const useFlightTicketsData = ({
  startDate,
  endDate,
  searchTerm = "",
  searchField = "all",
  filterStatus = "all",
  sortField = "created_at",
  sortDirection = "desc",
}) => {
  const [loading, setLoading] = useState(true);
  const [allTickets, setAllTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [error, setError] = useState(null);

  const fetchFlightTickets = async () => {
    setLoading(true);
    setError(null);

    try {
      // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
      // ✅ เมื่อ searchTerm >= 2 ตัวอักษร: ข้ามการกรองวันที่ (ค้นหาข้อมูลทั้งหมด)
      const isSearching = searchTerm && searchTerm.length >= 2;
      const response = await apiClient.get("/gateway.php", {
        action: "getFlightTicketsData",
        startDate: isSearching ? "" : startDate + " 00:00:00",
        endDate: isSearching ? "" : endDate + " 23:59:59",
        searchTerm: searchTerm,
        searchField: searchField,
        filterStatus: filterStatus,
        sortField: sortField,
        sortDirection: sortDirection,
      });

      if (!response.success) {
        console.error("Error fetching flight tickets:", response.error);
        setError("ไม่สามารถโหลดข้อมูลตั๋วเครื่องบินได้");
        setAllTickets([]);
        setFilteredTickets([]);
        return;
      }
      const rawData = response.data || [];

      // เพิ่มการประมวลผล timestamp
      const processedData = rawData.map((ticket) => {
        // ✅ ใช้ logic เดียวกับ useOverviewData.js
        // ลบการบวก timezone ออก - ใช้ข้อมูลตรงๆ
        const timestamp = new Date(ticket.created_at);

        // ✅ ปรับเป็น local time (ลบ +7 ออก)
        const localTimestamp = new Date(
          timestamp.getTime() - 7 * 60 * 60 * 1000
        );

        return {
          ...ticket,
          timestamp: localTimestamp,
        };
      });

      setAllTickets(processedData);
      setFilteredTickets(processedData); // API Gateway handles filtering and sorting already
    } catch (error) {
      console.error("Error in fetchFlightTickets:", error);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setAllTickets([]);
      setFilteredTickets([]);
    } finally {
      setLoading(false);
    }
  };

  // เก็บ filterData function ไว้เพื่อ backward compatibility
  // แต่ตอนนี้ API Gateway handle filtering แล้ว
  const filterData = (data = allTickets, search = searchTerm) => {
    // Re-fetch data with new search term instead of local filtering
    if (search !== searchTerm) {
      // This will trigger fetchFlightTickets via useEffect
      return;
    }
    setFilteredTickets(data);
  };

  // เก็บ sortTickets function ไว้เพื่อ backward compatibility
  const sortTickets = (tickets, field, direction) => {
    // API Gateway handles sorting, but keep this for any local sorting needs
    const sorted = [...tickets];

    sorted.sort((a, b) => {
      let valueA, valueB;

      if (field === "customer") {
        valueA = a.customer?.code || a.customer?.name || "";
        valueB = b.customer?.code || b.customer?.name || "";
      } else if (field === "supplier") {
        valueA = a.supplier?.code || a.supplier?.name || "";
        valueB = b.supplier?.code || b.supplier?.name || "";
      } else if (field === "status") {
        valueA = a.status || "not_invoiced";
        valueB = b.status || "not_invoiced";
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
      fetchFlightTickets();
    }
  }, [startDate, endDate, searchTerm, searchField, filterStatus, sortField, sortDirection]);

  return {
    loading,
    error,
    allTickets,
    filteredTickets,
    fetchFlightTickets,
    filterData,
  };
};

export default useFlightTicketsData;
