// src/pages/Documents/hooks/useReceiptListData.js
// Receipt List Data Hook - ตาม pattern ของ useDepositListData.js

import { useState, useEffect } from "react";
import { getReceiptTickets } from "../../../services/ticketService";

export const useReceiptListData = ({
  startDate,
  endDate,
  searchTerm = "",
  filterStatus = "all",
  sortField = "rc_generated_at",
  sortDirection = "desc",
}) => {
  const [loading, setLoading] = useState(true);
  const [allReceipts, setAllReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [error, setError] = useState(null);

  const fetchReceipts = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("🔍 Fetching receipts with params:", {
        startDate,
        endDate,
        searchTerm,
        filterStatus,
        sortField,
        sortDirection,
      });

      // ✅ เมื่อ searchTerm >= 2 ตัวอักษร: ข้ามการกรองวันที่ (ค้นหาข้อมูลทั้งหมด)
      const isSearching = searchTerm && searchTerm.length >= 2;
      const response = await getReceiptTickets({
        startDate: isSearching ? "" : startDate,
        endDate: isSearching ? "" : endDate,
        searchTerm,
        filterStatus,
        sortField,
        sortDirection,
      });

      if (!response.success) {
        console.error("Error fetching receipts:", response.error);
        setError(response.error || "ไม่สามารถโหลดข้อมูลได้");
        setAllReceipts([]);
        setFilteredReceipts([]);
        return;
      }

      const receiptData = response.data || [];
      console.log("✅ Fetched receipts:", receiptData.length, "items");

      // Parse rc_selection_data และ rc_linked_tickets ถ้ายังเป็น string
      const processedReceipts = receiptData.map(receipt => {
        if (receipt.rc_selection_data && typeof receipt.rc_selection_data === 'string') {
          try {
            receipt.rc_selection_data = JSON.parse(receipt.rc_selection_data);
          } catch (e) {
            console.error('Failed to parse rc_selection_data:', e);
          }
        }

        if (receipt.rc_linked_tickets && typeof receipt.rc_linked_tickets === 'string') {
          try {
            receipt.rc_linked_tickets = JSON.parse(receipt.rc_linked_tickets);
          } catch (e) {
            console.error('Failed to parse rc_linked_tickets:', e);
          }
        }

        // Mark as MultiINVReceipt
        receipt.isMultiPOReceipt = !!(receipt.rc_linked_tickets &&
          (receipt.rc_linked_tickets.primary_ticket_id || receipt.rc_linked_tickets.PRIMARY_TICKET_ID));

        return receipt;
      });

      // Debug email status
      if (processedReceipts.length > 0) {
        console.log("🔍 First receipt email status:", {
          rc_number: processedReceipts[0].rc_number,
          rc_email_sent: processedReceipts[0].rc_email_sent,
          rc_email_sent_type: typeof processedReceipts[0].rc_email_sent,
          rc_selection_data: processedReceipts[0].rc_selection_data,
        });
      }

      setAllReceipts(processedReceipts);
      filterData(processedReceipts, searchTerm);
    } catch (err) {
      console.error("Error in fetchReceipts:", err);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setAllReceipts([]);
      setFilteredReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  // กรองข้อมูลสำหรับการค้นหา (local filtering สำหรับ real-time search)
  const filterData = (data = allReceipts, search = searchTerm) => {
    if (!data || !Array.isArray(data)) {
      setFilteredReceipts([]);
      return;
    }

    let filtered = [...data];

    // กรองด้วย search term (ถ้า backend ยังไม่ได้กรองให้)
    if (search && search.trim() !== "") {
      const searchLower = search.toLowerCase().trim();

      filtered = filtered.filter(
        (receipt) =>
          // ค้นหาใน RC Number
          (receipt.rc_number &&
            receipt.rc_number.toLowerCase().includes(searchLower)) ||
          // ค้นหาใน Customer
          (receipt.customer?.code &&
            receipt.customer.code.toLowerCase().includes(searchLower)) ||
          (receipt.customer?.name &&
            receipt.customer.name.toLowerCase().includes(searchLower)) ||
          // ค้นหาใน Supplier
          (receipt.supplier?.code &&
            receipt.supplier.code.toLowerCase().includes(searchLower)) ||
          (receipt.supplier?.name &&
            receipt.supplier.name.toLowerCase().includes(searchLower)) ||
          // ค้นหาใน Passengers
          (receipt.passengersDisplay &&
            receipt.passengersDisplay.toLowerCase().includes(searchLower)) ||
          // ค้นหาใน INV Number
          (receipt.po_number &&
            receipt.po_number.toLowerCase().includes(searchLower))
      );
    }

    setFilteredReceipts(filtered);
  };

  // Re-fetch เมื่อพารามิเตอร์เปลี่ยน
  useEffect(() => {
    // ✅ เมื่อค้นหา >= 2 ตัวอักษร: re-fetch ข้ามวันที่ / ไม่ถึง 2 ตัว: local filter
    const isSearching = searchTerm && searchTerm.length >= 2;
    if (isSearching || (startDate && endDate)) {
      fetchReceipts();
    }
  }, [startDate, endDate, filterStatus, sortField, sortDirection, searchTerm]);

  return {
    loading,
    error,
    allReceipts,
    filteredReceipts,
    fetchReceipts,
    filterData,
  };
};

export default useReceiptListData;
