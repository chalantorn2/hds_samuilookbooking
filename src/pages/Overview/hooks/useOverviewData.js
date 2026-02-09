// src/pages/Overview/hooks/useOverviewData.js - Updated for new Overview format
// Enhanced data processing for Flight/Voucher/Deposit integration

import { useState, useEffect } from "react";
import { apiClient } from "../../../services/apiClient";
import { toThaiTimeZone } from "../../../utils/helpers";

export const serviceTypes = [
  { id: "all", name: "All Services", icon: "Activity" },
  { id: "flight", name: "Flight Tickets", icon: "Plane" },
  { id: "voucher", name: "Voucher", icon: "Package" },
  { id: "deposit", name: "Deposits", icon: "Database" },
  { id: "insurance", name: "Insurance", icon: "Shield" },
  { id: "hotel", name: "Hotel", icon: "Hotel" },
  { id: "train", name: "Train", icon: "Train" },
  { id: "visa", name: "Visa", icon: "FileText" },
  { id: "other", name: "Other Services", icon: "AlertCircle" },
];

// Updated statusMap for new status display logic
export const statusMap = {
  // Flight statuses
  not_invoiced: { label: "Not Invoiced", color: "yellow" },
  invoiced: { label: "Invoiced", color: "green" },

  // Voucher statuses
  not_voucher: { label: "Not Voucher", color: "yellow" },
  voucher_issued: { label: "Voucher Issued", color: "green" },

  // Deposit statuses
  pending: { label: "Pending", color: "yellow" },
  confirmed: { label: "Confirmed", color: "green" },
  not_deposit: { label: "Not Deposit", color: "yellow" },

  // Common statuses
  cancelled: { label: "Cancelled", color: "red" },
};

export const useOverviewData = ({
  startDate,
  endDate,
  serviceTypeFilter,
  sortField = "timestamp",
  sortDirection = "desc",
  searchTerm,
  currentPage,
  itemsPerPage,
}) => {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState({
    total: 0,
    totalAmount: 0,
    not_invoiced: 0,
    invoiced: 0,
    cancelled: 0,
    flight: 0,
    boat: 0,
    bus: 0,
    tour: 0,
    deposit: 0,
    voucher: 0,
    insurance: 0,
    hotel: 0,
    train: 0,
    visa: 0,
    other: 0,
  });

  // Enhanced sortData function
  const sortData = (data, field, direction) => {
    if (!data || data.length === 0) return data;

    const sortedData = [...data].sort((a, b) => {
      let aValue, bValue;

      switch (field) {
        case "reference_number":
          aValue = a.referenceNumber || "";
          bValue = b.referenceNumber || "";
          break;
        case "date":
          aValue = a.date ? new Date(a.date) : new Date(0);
          bValue = b.date ? new Date(b.date) : new Date(0);
          break;
        case "customer":
          aValue = a.customerCode || a.customer || "";
          bValue = b.customerCode || b.customer || "";
          break;
        case "supplier":
          aValue = a.supplierCode || a.supplier || "";
          bValue = b.supplierCode || b.supplier || "";
          break;
        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          break;
        case "created_by":
          aValue = a.createdByUsername || a.createdBy || "";
          bValue = b.createdByUsername || b.createdBy || "";
          break;
        case "timestamp":
          aValue = a.timestamp ? new Date(a.timestamp) : new Date(0);
          bValue = b.timestamp ? new Date(b.timestamp) : new Date(0);
          break;
        default:
          aValue = a[field] || "";
          bValue = b[field] || "";
      }

      // For Date objects
      if (aValue instanceof Date && bValue instanceof Date) {
        if (direction === "asc") {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }

      // For String values
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue, "th", {
          numeric: true,
          sensitivity: "base",
        });
        return direction === "asc" ? comparison : -comparison;
      }

      // For Number values
      if (typeof aValue === "number" && typeof bValue === "number") {
        if (direction === "asc") {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      }

      // Default comparison
      if (direction === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return sortedData;
  };

  const fetchData = async () => {
    setLoading(true);

    try {
      // ✅ เมื่อ searchTerm >= 2 ตัวอักษร: ข้ามการกรองวันที่ (ค้นหาข้อมูลทั้งหมด)
      const isSearching = searchTerm && searchTerm.length >= 2;
      const startISO = isSearching ? "" : startDate + " 00:00:00";
      const endISO = isSearching ? "" : endDate + " 23:59:59";

      const [flightResponse, voucherResponse, depositResponse, otherResponse] =
        await Promise.all([
          // Flight Tickets API
          apiClient.get("/gateway.php", {
            action: "getOverviewData",
            start_date: startISO,
            end_date: endISO,
            service_type_filter: serviceTypeFilter,
          }),
          // Vouchers API
          apiClient.get("/gateway.php", {
            action: "getVoucherOverviewData",
            start_date: startISO,
            end_date: endISO,
            service_type_filter: serviceTypeFilter,
          }),
          // Deposits API
          apiClient.get("/gateway.php", {
            action: "getDepositOverviewData",
            start_date: startISO,
            end_date: endISO,
            service_type_filter: serviceTypeFilter,
          }),

          apiClient.get("/gateway.php", {
            action: "getOtherOverviewData",
            start_date: startISO,
            end_date: endISO,
            service_type_filter: serviceTypeFilter,
          }),
        ]);

      // Combine data from all APIs
      let combinedData = [];

      if (flightResponse.success) {
        combinedData = [...combinedData, ...flightResponse.data];
      }

      if (voucherResponse.success) {
        combinedData = [...combinedData, ...voucherResponse.data];
      }

      if (depositResponse.success) {
        combinedData = [...combinedData, ...depositResponse.data];
      }

      if (otherResponse.success) {
        combinedData = [...combinedData, ...otherResponse.data];
      }

      if (combinedData.length === 0) {
        console.log("No data returned from all APIs");
        setActivities([]);
        setFilteredData([]);
        setLoading(false);
        return;
      }

      // Enhanced data processing
      const processedData = combinedData.map((item) => {
        let serviceType = item.service_type || "flight";
        let issueDate = null;

        if (item.tickets_detail && item.tickets_detail.length > 0) {
          const rawDate = item.tickets_detail[0].issue_date;
          issueDate = rawDate ? new Date(rawDate) : null;
        }

        const timestamp = new Date(item.created_at);
        let normalizedStatus = item.status;

        // Enhanced status logic for each service type
        if (serviceType === "flight") {
          if (item.status !== "cancelled") {
            if (item.status === "confirmed" || item.status === "invoiced") {
              normalizedStatus = "invoiced";
            } else {
              normalizedStatus = "not_invoiced";
            }
          }
        } else if (serviceType === "deposit") {
          // Deposit status remains as is: pending, confirmed, cancelled
          normalizedStatus = item.status;
        } else {
          // Voucher status (bus, boat, tour)
          if (item.status !== "cancelled") {
            normalizedStatus = "not_voucher";
          }
        }

        // Enhanced data mapping for new Overview format
        return {
          id: item.id,
          referenceNumber: item.reference_number,
          date: issueDate || timestamp,
          customer: item.customer?.name || "",
          customerCode: item.customer?.code || null,
          supplier: item.supplier?.name || "",
          supplierCode: item.supplier?.code || null,
          status: normalizedStatus,
          createdBy: item.user?.fullname || "System",
          createdByUsername: item.user?.username || null,
          timestamp: timestamp,
          serviceType: serviceType,
          amount: 0,

          // Flight-specific data
          po_number: item.po_number,
          invoice_number: item.invoice_number,
          invoice_generated_at: item.invoice_generated_at,
          passengersDisplay: item.passengers_display || null,
          routingDisplay: item.routing_display || null,
          ticketNumberDisplay: item.ticket_number_display || null,
          code: item.code || null,

          // Voucher-specific data
          vc_number: item.vc_number,
          vc_generated_at: item.vc_generated_at,
          serviceDescription: item.service_description || null,

          // Deposit-specific data
          dp_number: item.dp_number || null,
          groupName: item.group_name || null,
          depositDescription: item.deposit_description || null,

          // Other Services data - เพิ่มใหม่
          reference_code: item.reference_code || null,
          hotel_name: item.hotel_name || null,
          nights: item.nights || null,
          check_in_date: item.check_in_date || null,
          service_date: item.service_date || null,
          tickets_detail: item.tickets_detail || null,

          // Common cancellation data
          cancelled_at: item.cancelled_at,
          cancel_reason: item.cancel_reason,
          cancelled_by_name: item.cancelled_user?.fullname || null,
        };
      });

      if (depositResponse.success) {
        console.log("Deposit data sample:", depositResponse.data[0]); // เพิ่มบรรทัดนี้
        combinedData = [...combinedData, ...depositResponse.data];
      }

      if (otherResponse.success) {
        console.log("Other services data sample:", otherResponse.data[0]);
        combinedData = [...combinedData, ...otherResponse.data];
      }

      setActivities(processedData);

      const filtered = getFilteredData(processedData, searchTerm);
      const sorted = sortData(filtered, sortField, sortDirection);
      setFilteredData(sorted);

      const summaryData = calculateSummary(filtered);
      setSummary(summaryData);
    } catch (error) {
      console.error("Error in fetchData:", error);
      setActivities([]);
      setFilteredData([]);
      setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = (data = activities, search = searchTerm) => {
    if (!data || !data.length) {
      return [];
    }

    let filtered = [...data];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item.referenceNumber &&
            item.referenceNumber.toLowerCase().includes(searchLower)) ||
          (item.customer &&
            item.customer.toLowerCase().includes(searchLower)) ||
          (item.customerCode &&
            item.customerCode.toLowerCase().includes(searchLower)) ||
          (item.supplier &&
            item.supplier.toLowerCase().includes(searchLower)) ||
          (item.supplierCode &&
            item.supplierCode.toLowerCase().includes(searchLower)) ||
          (item.createdBy &&
            item.createdBy.toLowerCase().includes(searchLower)) ||
          (item.createdByUsername &&
            item.createdByUsername.toLowerCase().includes(searchLower)) ||
          // Service-specific search
          (item.passengersDisplay &&
            item.passengersDisplay.toLowerCase().includes(searchLower)) ||
          (item.serviceDescription &&
            item.serviceDescription.toLowerCase().includes(searchLower)) ||
          (item.groupName && item.groupName.toLowerCase().includes(searchLower))
      );
    }

    if (serviceTypeFilter !== "all") {
      filtered = filtered.filter(
        (item) => item.serviceType === serviceTypeFilter
      );
    }

    return filtered;
  };

  const calculateSummary = (data) => {
    if (!data || !data.length) {
      return {
        total: 0,
        totalAmount: 0,
        not_invoiced: 0,
        invoiced: 0,
        cancelled: 0,
        flight: 0,
        boat: 0,
        bus: 0,
        tour: 0,
        deposit: 0,
        voucher: 0,
        insurance: 0,
        hotel: 0,
        train: 0,
        visa: 0,
        other: 0,
      };
    }

    const result = data.reduce(
      (summary, item) => {
        summary.total++;
        summary.totalAmount += parseFloat(item.amount || 0);

        // Count status based on service type
        if (item.serviceType === "flight") {
          if (item.status === "not_invoiced") summary.not_invoiced++;
          else if (item.status === "invoiced") summary.invoiced++;
          else if (item.status === "cancelled") summary.cancelled++;
        } else if (item.serviceType === "deposit") {
          // Deposit statuses are different
          if (item.status === "cancelled") summary.cancelled++;
          // You might want to add pending/confirmed counts here
        } else {
          // Voucher statuses
          if (item.status === "cancelled") summary.cancelled++;
          // Add voucher status counts as needed
        }

        if (
          item.serviceType &&
          typeof summary[item.serviceType] !== "undefined"
        ) {
          summary[item.serviceType]++;
        }

        return summary;
      },
      {
        total: 0,
        totalAmount: 0,
        not_invoiced: 0,
        invoiced: 0,
        cancelled: 0,
        flight: 0,
        boat: 0,
        bus: 0,
        tour: 0,
        deposit: 0,
        voucher: 0,
        insurance: 0,
        hotel: 0,
        train: 0,
        visa: 0,
        other: 0,
      }
    );

    return result;
  };

  // Fetch data when dependencies change
  useEffect(() => {
    // ✅ เมื่อค้นหา >= 2 ตัวอักษร: re-fetch ข้ามวันที่
    const isSearching = searchTerm && searchTerm.length >= 2;
    if (isSearching || (startDate && endDate)) {
      fetchData();
    }
  }, [startDate, endDate, serviceTypeFilter, searchTerm]);

  // Handle local filtering when activities change (after re-fetch)
  useEffect(() => {
    const filtered = getFilteredData();
    const sorted = sortData(filtered, sortField, sortDirection);
    setFilteredData(sorted);
    const summaryData = calculateSummary(filtered);
    setSummary(summaryData);
  }, [activities]);

  // Handle sorting separately
  useEffect(() => {
    const sorted = sortData(filteredData, sortField, sortDirection);
    setFilteredData(sorted);
  }, [sortField, sortDirection]);

  return {
    loading,
    activities,
    filteredData,
    summary,
    fetchData,
    getFilteredData,
    calculateSummary,
    error,
  };
};
