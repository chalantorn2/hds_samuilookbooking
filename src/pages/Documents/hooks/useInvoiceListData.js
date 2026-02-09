// src/pages/Documents/hooks/useInvoiceListData.js
// Invoice List Data Hook - ตาม pattern ของ useDepositListData.js

import { useState, useEffect } from "react";
import { getInvoiceTickets } from "../../../services/ticketService";

export const useInvoiceListData = ({
  startDate,
  endDate,
  searchTerm = "",
  searchField = "all",
  filterStatus = "all",
  sortField = "po_generated_at",
  sortDirection = "desc",
}) => {
  const [loading, setLoading] = useState(true);
  const [allInvoices, setAllInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [error, setError] = useState(null);

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("🔍 Fetching invoices with params:", {
        startDate,
        endDate,
        searchTerm,
        filterStatus,
        sortField,
        sortDirection,
      });

      // ✅ เมื่อ searchTerm >= 2 ตัวอักษร: ข้ามการกรองวันที่ (ค้นหาข้อมูลทั้งหมด)
      const isSearching = searchTerm && searchTerm.length >= 2;
      const response = await getInvoiceTickets({
        startDate: isSearching ? "" : startDate,
        endDate: isSearching ? "" : endDate,
        searchTerm,
        filterStatus,
        sortField,
        sortDirection,
      });

      if (!response.success) {
        console.error("Error fetching invoices:", response.error);
        setError(response.error || "ไม่สามารถโหลดข้อมูลได้");
        setAllInvoices([]);
        setFilteredInvoices([]);
        return;
      }

      const invoiceData = response.data || [];
      console.log("✅ Fetched invoices:", invoiceData.length, "items");

      setAllInvoices(invoiceData);
      filterData(invoiceData, searchTerm, searchField);
    } catch (err) {
      console.error("Error in fetchInvoices:", err);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      setAllInvoices([]);
      setFilteredInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  // กรองข้อมูลสำหรับการค้นหา (local filtering สำหรับ real-time search)
  const filterData = (data = allInvoices, search = searchTerm, field = searchField) => {
    if (!data || !Array.isArray(data)) {
      setFilteredInvoices([]);
      return;
    }

    let filtered = [...data];

    // กรองด้วย search term (ถ้า backend ยังไม่ได้กรองให้)
    if (search && search.trim() !== "") {
      const searchLower = search.toLowerCase().trim();

      filtered = filtered.filter((invoice) => {
        switch (field) {
          case "customer":
            return (
              (invoice.customer?.code &&
                invoice.customer.code.toLowerCase().includes(searchLower)) ||
              (invoice.customer?.name &&
                invoice.customer.name.toLowerCase().includes(searchLower))
            );
          case "supplier":
            return (
              (invoice.supplier?.code &&
                invoice.supplier.code.toLowerCase().includes(searchLower)) ||
              (invoice.supplier?.name &&
                invoice.supplier.name.toLowerCase().includes(searchLower))
            );
          case "pax_name":
            return (
              invoice.passengersDisplay &&
              invoice.passengersDisplay.toLowerCase().includes(searchLower)
            );
          case "ticket_number":
            return (
              invoice.ticketNumberDisplay &&
              invoice.ticketNumberDisplay.toLowerCase().includes(searchLower)
            );
          case "code":
            return (
              (invoice.code &&
                invoice.code.toLowerCase().includes(searchLower)) ||
              (invoice.reference_code &&
                invoice.reference_code.toLowerCase().includes(searchLower))
            );
          case "doc_no":
            return (
              invoice.po_number &&
              invoice.po_number.toLowerCase().includes(searchLower)
            );
          case "all":
          default:
            return (
              // ค้นหาใน PO Number / VC Number
              (invoice.po_number &&
                invoice.po_number.toLowerCase().includes(searchLower)) ||
              // ค้นหาใน Customer
              (invoice.customer?.code &&
                invoice.customer.code.toLowerCase().includes(searchLower)) ||
              (invoice.customer?.name &&
                invoice.customer.name.toLowerCase().includes(searchLower)) ||
              // ค้นหาใน Supplier
              (invoice.supplier?.code &&
                invoice.supplier.code.toLowerCase().includes(searchLower)) ||
              (invoice.supplier?.name &&
                invoice.supplier.name.toLowerCase().includes(searchLower)) ||
              // ค้นหาใน Passengers
              (invoice.passengersDisplay &&
                invoice.passengersDisplay.toLowerCase().includes(searchLower)) ||
              // ค้นหาใน Ticket Number
              (invoice.ticketNumberDisplay &&
                invoice.ticketNumberDisplay.toLowerCase().includes(searchLower)) ||
              // ค้นหาใน Code
              (invoice.code &&
                invoice.code.toLowerCase().includes(searchLower)) ||
              // ค้นหาใน RC Number
              (invoice.rc_number &&
                invoice.rc_number.toLowerCase().includes(searchLower)) ||
              // ⭐ ค้นหาใน Description (สำหรับ VC, HTL, TRN, VSA, OTH)
              (invoice.description &&
                invoice.description.toLowerCase().includes(searchLower)) ||
              // ⭐ ค้นหาใน Reference Code (สำหรับ TRN)
              (invoice.reference_code &&
                invoice.reference_code.toLowerCase().includes(searchLower)) ||
              // ⭐ ค้นหาใน Service Type
              (invoice.service_type &&
                invoice.service_type.toLowerCase().includes(searchLower))
            );
        }
      });
    }

    setFilteredInvoices(filtered);
  };

  // Re-fetch เมื่อพารามิเตอร์เปลี่ยน
  useEffect(() => {
    // ✅ เมื่อค้นหา >= 2 ตัวอักษร: re-fetch ข้ามวันที่ / ไม่ถึง 2 ตัว: local filter
    const isSearching = searchTerm && searchTerm.length >= 2;
    if (isSearching || (startDate && endDate)) {
      fetchInvoices();
    }
  }, [startDate, endDate, filterStatus, sortField, sortDirection, searchTerm]);

  // กรองข้อมูลเมื่อ search field เปลี่ยน (local filter เฉพาะ field)
  useEffect(() => {
    filterData(allInvoices, searchTerm, searchField);
  }, [searchField]);

  return {
    loading,
    error,
    allInvoices,
    filteredInvoices,
    fetchInvoices,
    filterData,
  };
};

export default useInvoiceListData;
