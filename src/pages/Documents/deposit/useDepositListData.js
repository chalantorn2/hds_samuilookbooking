// src/pages/Documents/deposit/useDepositListData.js
// Deposit List Data Hook - ตาม pattern ของ useFlightTicketsData.js
// ใช้ API Gateway สำหรับจัดการข้อมูล Deposit

import { useState, useEffect } from "react";
import { apiClient } from "../../../services/apiClient";

export const useDepositListData = ({
  startDate,
  endDate,
  searchTerm = "",
  filterStatus = "all",
  sortField = "created_at",
  sortDirection = "desc",
}) => {
  const [loading, setLoading] = useState(true);
  const [allDeposits, setAllDeposits] = useState([]);
  const [filteredDeposits, setFilteredDeposits] = useState([]);
  const [error, setError] = useState(null);

  const fetchDeposits = async () => {
    setLoading(true);
    setError(null);

    try {
      // ✅ ส่ง all_except_cancelled ไปที่ backend เพื่อไม่ให้โหลด cancelled มา
      // ส่วน filter อื่นๆ จะทำที่ frontend
      const backendFilterStatus =
        filterStatus === "cancelled" ? "cancelled" : "all_except_cancelled";

      // ✅ ใช้ format YYYY-MM-DD เท่านั้น ไม่ใช้ ISO string เพื่อหลีกเลี่ยงปัญหา timezone
      const startDateStr = startDate + " 00:00:00";
      const endDateStr = endDate + " 23:59:59";

      console.log("🔍 Fetching deposits with params:", {
        startDate: startDateStr,
        endDate: endDateStr,
        searchTerm,
        filterStatus,
        backendFilterStatus,
        sortField,
        sortDirection,
      });

      // เรียกใช้ API Gateway สำหรับ deposit list
      const response = await apiClient.get("/gateway.php", {
        action: "getDepositsList",
        startDate: startDateStr,
        endDate: endDateStr,
        searchTerm: searchTerm,
        filterType: "all",
        filterStatus: backendFilterStatus,
        sortField: sortField,
        sortDirection: sortDirection,
        limit: 1000,
        offset: 0,
      });

      if (!response.success) {
        console.error("Error fetching deposits:", response.error);
        setError("ไม่สามารถโหลดข้อมูลรายการมัดจำได้");
        setAllDeposits([]);
        setFilteredDeposits([]);
        return;
      }

      const rawData = response.data || [];

      // ประมวลผลข้อมูลเพิ่มเติม
      const processedData = rawData.map((deposit) => {
        // ปรับ timestamp ให้อยู่ใน local timezone
        const timestamp = new Date(deposit.created_at);
        const localTimestamp = new Date(
          timestamp.getTime() - 7 * 60 * 60 * 1000
        );

        // ✅ คำนวณ status แบบใหม่
        const calculatedStatus = calculateDepositStatus(deposit);

        return {
          ...deposit,
          timestamp: localTimestamp,
          // เพิ่มข้อมูลที่จำเป็นสำหรับการแสดงผล
          customer_code: deposit.customer_code || null,
          customer_name: deposit.customer_name || null,
          supplier_code: deposit.supplier_code || null,
          supplier_name: deposit.supplier_name || null,
          // แปลง deposit_type ให้เป็น human readable
          deposit_type_display: getDepositTypeDisplay(deposit.deposit_type),
          // ✅ เพิ่ม calculated status
          calculated_status: calculatedStatus,
        };
      });

      console.log("✅ Processed deposits data:", processedData.length, "items");

      setAllDeposits(processedData);
      filterData(processedData, searchTerm);
    } catch (error) {
      console.error("Error in fetchDeposits:", error);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setAllDeposits([]);
      setFilteredDeposits([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Helper function คำนวณ status ใหม่
  const calculateDepositStatus = (deposit) => {
    // 1. ถ้ามี flight_ticket_reference แสดงว่าออกตั๋วแล้ว → แสดงเลข FT
    if (deposit.flight_ticket_reference) {
      return {
        type: "issued_ticket",
        label: deposit.flight_ticket_reference,
        color: "blue",
      };
    }

    // 2. คำนวณยอดที่ลูกค้าชำระแล้ว
    const customerPayments = deposit.customer_payments || [];
    const totalPaid = customerPayments.reduce((sum, payment) => {
      return sum + (parseFloat(payment.amount) || 0);
    }, 0);

    // 3. คำนวณ grand_total
    const grandTotal = parseFloat(deposit.grand_total) || 0;

    // 4. ถ้าชำระครบแล้ว (sum = grand_total) → รอออกตั๋ว
    if (totalPaid >= grandTotal && grandTotal > 0 && totalPaid > 0) {
      return {
        type: "awaiting_ticket",
        label: "รอออก Invoice",
        color: "purple",
      };
    }

    // 5. คำนวณ deposit ที่ต้องชำระทั้งหมด (deposit1 + deposit2)
    const depositTotal1 = parseFloat(deposit.deposit_total) || 0;
    const depositTotal2 = parseFloat(deposit.deposit_total_2) || 0;
    const totalDepositRequired = depositTotal1 + depositTotal2;

    // ถ้าลูกค้าชำระครบเท่ากับ deposit ทั้งหมดแล้ว (แต่ยังไม่ครบ grand_total) → Wait Payment
    if (totalPaid >= totalDepositRequired && totalDepositRequired > 0 && totalPaid > 0 && totalPaid < grandTotal) {
      return {
        type: "awaiting_payment",
        label: "Wait Payment",
        color: "yellow",
      };
    }

    // 6. Default → รอมัดจำ (ยังไม่ได้รับเงินเลย หรือชำระไม่ครบ deposit)
    return {
      type: "awaiting_deposit",
      label: "Wait Deposit",
      color: "red",
    };
  };

  // Helper function แปลง deposit type
  const getDepositTypeDisplay = (type) => {
    const typeMap = {
      airTicket: "Air Ticket",
      package: "Package",
      land: "Land",
      other: "Other",
    };
    return typeMap[type] || type;
  };

  // กรองข้อมูลสำหรับการค้นหา (local filtering สำหรับ real-time search)
  const filterData = (data = allDeposits, search = searchTerm) => {
    if (!data || !Array.isArray(data)) {
      setFilteredDeposits([]);
      return;
    }

    let filtered = [...data];

    // กรองด้วย search term
    if (search && search.trim() !== "") {
      const searchLower = search.toLowerCase().trim();

      filtered = filtered.filter(
        (deposit) =>
          // ค้นหาในเลข DP Number
          (deposit.reference_number &&
            deposit.reference_number.toLowerCase().includes(searchLower)) ||
          // ค้นหาในชื่อลูกค้า
          (deposit.customer_name &&
            deposit.customer_name.toLowerCase().includes(searchLower)) ||
          // ค้นหาในรหัสลูกค้า
          (deposit.customer_code &&
            deposit.customer_code.toLowerCase().includes(searchLower)) ||
          // ค้นหาในชื่อ supplier
          (deposit.supplier_name &&
            deposit.supplier_name.toLowerCase().includes(searchLower)) ||
          // ค้นหาในรหัส supplier
          (deposit.supplier_code &&
            deposit.supplier_code.toLowerCase().includes(searchLower)) ||
          // ค้นหาในชื่อกลุ่ม
          (deposit.group_name &&
            deposit.group_name.toLowerCase().includes(searchLower)) ||
          // ค้นหาในคำอธิบาย
          (deposit.description &&
            deposit.description.toLowerCase().includes(searchLower))
      );
    }

    // กรองตาม calculated_status (frontend filtering)
    if (
      filterStatus &&
      filterStatus !== "all" &&
      filterStatus !== "all_except_cancelled"
    ) {
      filtered = filtered.filter((deposit) => {
        // ถ้าเป็น cancelled ให้ filter จาก database status
        if (filterStatus === "cancelled") {
          return deposit.status === "cancelled";
        }
        // ถ้าไม่ใช่ ให้ filter จาก calculated_status
        return deposit.calculated_status?.type === filterStatus;
      });
    }

    // เรียงลำดับข้อมูล
    filtered = sortDeposits(filtered, sortField, sortDirection);
    setFilteredDeposits(filtered);
  };

  // เรียงลำดับข้อมูล
  const sortDeposits = (deposits, field, direction) => {
    const sorted = [...deposits];

    sorted.sort((a, b) => {
      let valueA, valueB;

      if (field === "customer") {
        valueA = a.customer_code || a.customer_name || "";
        valueB = b.customer_code || b.customer_name || "";
      } else if (field === "supplier") {
        valueA = a.supplier_code || a.supplier_name || "";
        valueB = b.supplier_code || b.supplier_name || "";
      } else if (field === "status") {
        valueA = a.status || "pending";
        valueB = b.status || "pending";
      } else if (field === "created_at") {
        valueA = a.created_at ? new Date(a.created_at) : new Date(0);
        valueB = b.created_at ? new Date(b.created_at) : new Date(0);
      } else if (field === "reference_number") {
        valueA = a.reference_number || "";
        valueB = b.reference_number || "";
      } else if (field === "deposit_type") {
        valueA = a.deposit_type || "";
        valueB = b.deposit_type || "";
      } else if (field === "grand_total") {
        valueA = parseFloat(a.grand_total || 0);
        valueB = parseFloat(b.grand_total || 0);
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

  // Re-fetch เมื่อพารามิเตอร์เปลี่ยน
  useEffect(() => {
    if (startDate && endDate) {
      fetchDeposits();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, filterStatus, sortField, sortDirection]);

  // กรองข้อมูลเมื่อ search term เปลี่ยน (real-time search)
  useEffect(() => {
    filterData(allDeposits, searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return {
    loading,
    error,
    allDeposits,
    filteredDeposits,
    fetchDeposits,
    filterData,
  };
};

export default useDepositListData;
