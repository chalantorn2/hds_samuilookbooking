// // src/pages/Documents/hooks/useInvoiceData.js - Migrated to API Gateway
// // เปลี่ยนจาก Supabase calls เป็น API Gateway calls
// // รักษา function signatures และ return formats เหมือนเดิม

// import { useState, useEffect } from "react";
// import { apiClient } from "../../../services/apiClient";
// import { toThaiTimeZone } from "../../../utils/helpers";
// // 🔄 MIGRATION PHASE: แปลงจาก Supabase เป็น API Gateway
// // ✅ ACTIVE: ใช้ API Gateway แล้ว
// // import { supabase } from "../../../services/supabase"; // 🔄 Rollback: uncomment หากมีปัญหา

// export const useInvoiceData = ({
//   startDate,
//   endDate,
//   searchTerm = "",
//   filterStatus = "all",
//   sortField = "created_at",
//   sortDirection = "desc",
// }) => {
//   const [loading, setLoading] = useState(true);
//   const [allTickets, setAllTickets] = useState([]);
//   const [filteredTickets, setFilteredTickets] = useState([]);
//   const [error, setError] = useState(null);

//   const fetchInvoiceTickets = async () => {
//     setLoading(true);
//     setError(null);

//     try {
//       const start = new Date(startDate);
//       start.setHours(0, 0, 0, 0);
//       const end = new Date(endDate);
//       end.setHours(23, 59, 59, 999);

//       // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
//       // เรียกใช้ API Gateway สำหรับ invoice tickets data
//       const response = await apiClient.get("/gateway.php", {
//         action: "getInvoiceTickets",
//         start_date: start.toISOString(),
//         end_date: end.toISOString(),
//         filter_status: filterStatus,
//         only_invoiced: true, // เฉพาะที่มี PO Number
//       });

//       if (!response.success) {
//         console.error("Error fetching invoice tickets:", response.error);
//         setError("ไม่สามารถโหลดข้อมูลใบแจ้งหนี้ได้");
//         setAllTickets([]);
//         setFilteredTickets([]);
//         return;
//       }

//       const tickets = response.data || [];

//       if (!tickets || tickets.length === 0) {
//         console.log("No invoice tickets returned from API");
//         setAllTickets([]);
//         setFilteredTickets([]);
//         setLoading(false);
//         return;
//       }

//       // ปรับ created_at ให้อยู่ใน timezone +07:00
//       const adjustedTickets = tickets.map((ticket) => {
//         const createdAt = new Date(ticket.created_at);
//         createdAt.setHours(createdAt.getHours() + 7);
//         return {
//           ...ticket,
//           created_at: createdAt.toISOString(),
//         };
//       });

//       // ✅ API Gateway ส่ง routingDisplay และ passengersDisplay มาแล้ว
//       // ไม่ต้องประมวลผลซ้ำ เพียงแค่เพิ่ม fallback
//       const processedData = adjustedTickets.map((ticket) => {
//         return {
//           ...ticket,
//           code: ticket.code || null,
//           // ✅ ใช้ค่าจาก API โดยตรง (API ใช้ generateMultiSegmentRoute แล้ว)
//           passengersDisplay: ticket.passengersDisplay || "-",
//           routingDisplay: ticket.routingDisplay || "-",
//           ticketNumberDisplay: ticket.ticketNumberDisplay || "-",
//         };
//       });

//       console.log(
//         "Processed invoice tickets with additional data:",
//         processedData
//       );

//       setAllTickets(processedData);
//       filterData(processedData, searchTerm);
//     } catch (error) {
//       console.error("Error in fetchInvoiceTickets:", error);
//       setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
//       setAllTickets([]);
//       setFilteredTickets([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const filterData = (data = allTickets, search = searchTerm) => {
//     if (!data || !Array.isArray(data)) {
//       setFilteredTickets([]);
//       return;
//     }

//     let filtered = [...data];

//     if (search && search.trim() !== "") {
//       const searchLower = search.toLowerCase().trim();

//       filtered = filtered.filter(
//         (ticket) =>
//           (ticket.reference_number &&
//             ticket.reference_number.toLowerCase().includes(searchLower)) ||
//           (ticket.customer?.name &&
//             ticket.customer.name.toLowerCase().includes(searchLower)) ||
//           (ticket.customer?.code &&
//             ticket.customer.code.toLowerCase().includes(searchLower)) ||
//           (ticket.supplier?.name &&
//             ticket.supplier.name.toLowerCase().includes(searchLower)) ||
//           (ticket.supplier?.code &&
//             ticket.supplier.code.toLowerCase().includes(searchLower)) ||
//           (ticket.code && ticket.code.toLowerCase().includes(searchLower)) ||
//           (ticket.passengersDisplay &&
//             ticket.passengersDisplay.toLowerCase().includes(searchLower)) ||
//           (ticket.routingDisplay &&
//             ticket.routingDisplay.toLowerCase().includes(searchLower)) ||
//           (ticket.po_number &&
//             ticket.po_number.toLowerCase().includes(searchLower)) ||
//           // เพิ่มการค้นหาด้วย ticket_number และ ticket_code
//           (ticket.firstPassengerTicketInfo?.ticket_number &&
//             ticket.firstPassengerTicketInfo.ticket_number
//               .toLowerCase()
//               .includes(searchLower)) ||
//           (ticket.firstPassengerTicketInfo?.ticket_code &&
//             ticket.firstPassengerTicketInfo.ticket_code
//               .toLowerCase()
//               .includes(searchLower))
//       );
//     }

//     // กรองตามสถานะ
//     if (filterStatus && filterStatus !== "all") {
//       filtered = filtered.filter((ticket) => {
//         if (filterStatus === "invoiced") {
//           return ticket.status === "invoiced";
//         } else if (filterStatus === "not_invoiced") {
//           return ticket.status === "not_invoiced";
//         }
//         return true;
//       });
//     }

//     filtered = sortTickets(filtered, sortField, sortDirection);
//     setFilteredTickets(filtered);
//   };

//   const sortTickets = (tickets, field, direction) => {
//     const sorted = [...tickets];

//     sorted.sort((a, b) => {
//       let valueA, valueB;

//       if (field === "customer") {
//         valueA = a.customer?.code || a.customer?.name || "";
//         valueB = b.customer?.code || b.customer?.name || "";
//       } else if (field === "supplier") {
//         valueA = a.supplier?.code || a.supplier?.name || "";
//         valueB = b.supplier?.code || b.supplier?.name || "";
//       } else if (field === "status") {
//         // ใช้ status field โดยตรง
//         valueA = a.status || "not_invoiced";
//         valueB = b.status || "not_invoiced";
//       } else if (field === "created_at") {
//         valueA = a.created_at ? new Date(a.created_at) : new Date(0);
//         valueB = b.created_at ? new Date(b.created_at) : new Date(0);
//       } else if (field === "po_number") {
//         valueA = a.po_number || "";
//         valueB = b.po_number || "";
//       } else {
//         valueA = a[field] || "";
//         valueB = b[field] || "";
//       }

//       if (direction === "asc") {
//         if (valueA < valueB) return -1;
//         if (valueA > valueB) return 1;
//         return 0;
//       } else {
//         if (valueA > valueB) return -1;
//         if (valueA < valueB) return 1;
//         return 0;
//       }
//     });

//     return sorted;
//   };

//   useEffect(() => {
//     filterData(allTickets, searchTerm);
//   }, [searchTerm]);

//   useEffect(() => {
//     setFilteredTickets(sortTickets(filteredTickets, sortField, sortDirection));
//   }, [sortField, sortDirection]);

//   return {
//     loading,
//     error,
//     allTickets,
//     filteredTickets,
//     fetchFlightTickets: fetchInvoiceTickets, // alias สำหรับความเข้ากันได้
//     filterData,
//   };
// };

// export default useInvoiceData;
