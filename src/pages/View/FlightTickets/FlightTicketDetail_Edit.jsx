import React, { useState, useEffect } from "react";
import { apiClient } from "../../../services/apiClient";
import {
  User,
  Calendar,
  Save,
  ChevronLeft,
  Trash2,
  X,
  Phone,
  FileText,
  Tag,
  MapPin,
} from "lucide-react";
import { useAlertDialogContext } from "../../../contexts/AlertDialogContext";
import usePricing from "../../../hooks/usePricing";
import SaleStyles, { combineClasses } from "../../Sales/common/SaleStyles";
import PassengerSection from "../../Sales/ticket/PassengerSection";
import SupplierSection from "../../Sales/common/SupplierSection";
import RouteSection from "../../Sales/ticket/RouteSection";
import ExtrasSection from "../../Sales/ticket/ExtrasSection";
import PricingSummarySection from "../../Sales/ticket/PricingSummarySection";
import SaleHeader from "../../Sales/common/SaleHeader";
import { formatCustomerAddress } from "../../../utils/helpers";
import CancelReasonModal from "../common/CancelReasonModal";
import { useAuth } from "../../Login/AuthContext";
import { getCustomers } from "../../../services/customerService";
import { createCustomerOverrideData } from "../../../utils/helpers";
import {
  getDisplayCustomerName,
  getDisplayCustomerAddress,
  getDisplayCustomerPhone,
  getDisplayCustomerIdNumber,
  getDisplayCustomerBranchType,
  getDisplayCustomerBranchNumber,
} from "../../../utils/helpers";

const FlightTicketDetail_Edit = ({ ticketId, onClose, onSave }) => {
  const { user } = useAuth();
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [globalEditMode, setGlobalEditMode] = useState(false);
  const showAlert = useAlertDialogContext();
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Use same pricing hook as SaleTicket
  const { pricing, updatePricing, calculateSubtotal, calculateTotal } =
    usePricing();

  // Form state matching SaleTicket structure
  const [formData, setFormData] = useState({
    customer: "",
    customerCode: "",
    contactDetails: "",
    phone: "",
    id: "",
    date: "",
    creditDays: "0",
    dueDate: "",
    salesName: "",
    supplier: "",
    supplierName: "",
    supplierId: null,
    supplierNumericCode: "",
    ticketType: "bsp",
    paymentMethod: "",
    companyPaymentDetails: "",
    customerPayment: "",
    customerPaymentDetails: "",
    vatPercent: "0",
    code: "",
    b2bDetails: "",
    otherDetails: "",
    tgDetails: "",
    remark: "",
  });

  // Components state matching SaleTicket
  const [passengers, setPassengers] = useState([
    { id: 1, name: "", type: "ADT1", ticketNumber: "", ticketCode: "" },
  ]);

  const [routes, setRoutes] = useState([
    {
      id: 1,
      date: "",
      flight: "",
      rbd: "",
      origin: "",
      destination: "",
      departure: "",
      arrival: "",
    },
  ]);

  const [extras, setExtras] = useState([
    { id: 1, description: "", net: "", sale: "", pax: 1, total: "" },
  ]);

  // Fetch and map ticket data
  useEffect(() => {
    const fetchTicketData = async () => {
      if (!ticketId) return;

      setLoading(true);
      try {
        // 🔄 เปลี่ยนจาก Supabase complex select เป็น API Gateway
        // OLD: const { data: ticket, error } = await supabase.from("bookings_ticket").select(...)
        const response = await apiClient.get("/gateway.php", {
          action: "getFlightTicketForEdit",
          ticketId: ticketId,
        });

        if (!response.success) {
          throw new Error(response.error || "ไม่สามารถโหลดข้อมูลตั๋วได้");
        }

        const ticket = response.data;
        setTicketData(ticket);
        mapDataToFormState(ticket);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTicketData();
  }, [ticketId]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      // 🔄 เปลี่ยนจาก getSuppliers เป็น API Gateway (ใช้ supplierService ที่ migrate แล้ว)
      // ฟังก์ชันนี้ใช้ supplierService ที่ migrate ไปแล้ว ไม่ต้องแก้
      const data = await getSuppliers("Airline");
      setSuppliers(data);
    };
    fetchSuppliers();
  }, []);

  // Map database data to component state
  const mapDataToFormState = (ticket) => {
    console.log("=== DEBUG FlightTicket mapDataToFormState ===");
    console.log("Full ticket:", ticket);
    console.log("customer_override_data:", ticket.customer_override_data);
    console.log("customer:", ticket.customer);

    // Test helper โดยตรง
    console.log(
      "getDisplayCustomerName result:",
      getDisplayCustomerName(ticket)
    );
    const detail = ticket.tickets_detail?.[0] || {};
    const additional = ticket.ticket_additional_info?.[0] || {};
    const pricingData = ticket.tickets_pricing?.[0] || {};
    const ticketWithOverride = {
      ...ticket,
      customer_override_data: ticket.customer_override_data, // ย้ายจาก root มาใส่ใน ticket object
    };

    // Map formData
    setFormData({
      customer: getDisplayCustomerName(ticketWithOverride),
      customerCode: ticket.customer?.code || "",
      contactDetails: getDisplayCustomerAddress(ticketWithOverride),
      phone: getDisplayCustomerPhone(ticketWithOverride),
      id: getDisplayCustomerIdNumber(ticketWithOverride),
      branchType: getDisplayCustomerBranchType(ticketWithOverride),
      branchNumber: getDisplayCustomerBranchNumber(ticketWithOverride),
      date: detail.issue_date?.split("T")[0] || "",
      creditDays: String(detail.credit_days || 0),
      dueDate: detail.due_date?.split("T")[0] || "",
      salesName: "",
      supplier: ticket.supplier?.code || "",
      supplierName: ticket.supplier?.name || "",
      supplierId: ticket.supplier?.id || null,
      supplierNumericCode: ticket.supplier?.numeric_code || "",
      ticketType: (additional.ticket_type || "bsp").toLowerCase(),
      paymentMethod:
        mapPaymentMethodFromDB(additional.company_payment_method) || "",
      companyPaymentDetails: additional.company_payment_details || "",
      customerPayment:
        mapPaymentMethodFromDB(additional.customer_payment_method) || "",
      customerPaymentDetails: additional.customer_payment_details || "",
      vatPercent: String(detail.vat_percent || 0),
      code: additional.code || "",
      b2bDetails:
        additional.ticket_type?.toLowerCase() === "b2b"
          ? additional.ticket_type_details || ""
          : "",
      otherDetails:
        additional.ticket_type?.toLowerCase() === "other"
          ? additional.ticket_type_details || ""
          : "",
      tgDetails:
        additional.ticket_type?.toLowerCase() === "tg"
          ? additional.ticket_type_details || ""
          : "",
      remark: additional.remark || "",
    });

    // Map pricing - แก้ไขการคำนวณ total ให้ถูกต้อง
    const adt1Total =
      (pricingData.adt1_sale_price || 0) * (pricingData.adt1_pax || 0);
    const adt2Total =
      (pricingData.adt2_sale_price || 0) * (pricingData.adt2_pax || 0);
    const adt3Total =
      (pricingData.adt3_sale_price || 0) * (pricingData.adt3_pax || 0);

    updatePricing("adt1", "net", pricingData.adt1_net_price || 0, 0);
    updatePricing("adt1", "sale", pricingData.adt1_sale_price || 0, 0);
    updatePricing("adt1", "pax", pricingData.adt1_pax || 0, adt1Total);
    updatePricing("adt2", "net", pricingData.adt2_net_price || 0, 0);
    updatePricing("adt2", "sale", pricingData.adt2_sale_price || 0, 0);
    updatePricing("adt2", "pax", pricingData.adt2_pax || 0, adt2Total);
    updatePricing("adt3", "net", pricingData.adt3_net_price || 0, 0);
    updatePricing("adt3", "sale", pricingData.adt3_sale_price || 0, 0);
    updatePricing("adt3", "pax", pricingData.adt3_pax || 0, adt3Total);

    // Map passengers
    const mappedPassengers = ticket.tickets_passengers?.length
      ? ticket.tickets_passengers.map((p, index) => ({
          id: index + 1,
          name: p.passenger_name || "",
          type: p.age || "ADT",
          ticketNumber: p.ticket_number || "",
          ticketCode: p.ticket_code || "",
        }))
      : [{ id: 1, name: "", type: "ADT1", ticketNumber: "", ticketCode: "" }];
    setPassengers(mappedPassengers);

    // Map routes
    const mappedRoutes = ticket.tickets_routes?.length
      ? ticket.tickets_routes.map((r, index) => ({
          id: index + 1,
          date: r.date || "",
          flight: r.flight_number || "",
          rbd: r.rbd || "",
          origin: r.origin || "",
          destination: r.destination || "",
          departure: r.departure_time || "",
          arrival: r.arrival_time || "",
        }))
      : [
          {
            id: 1,
            date: "",
            flight: "",
            rbd: "",
            origin: "",
            destination: "",
            departure: "",
            arrival: "",
          },
        ];
    setRoutes(mappedRoutes);

    // Map extras - แก้ไขการใช้ชื่อฟิลด์ให้ถูกต้อง
    const mappedExtras = ticket.tickets_extras?.length
      ? ticket.tickets_extras.map((e, index) => ({
          id: index + 1,
          description: e.description || "",
          net_price: e.net_price || 0,
          sale_price: e.sale_price || 0,
          quantity: e.quantity || 1,
          total_amount: e.total_amount || 0,
        }))
      : [
          {
            id: 1,
            description: "",
            net_price: 0,
            sale_price: 0,
            quantity: 1,
            total_amount: 0,
          },
        ];
    setExtras(mappedExtras);

    if (ticket.customer) {
      setSelectedCustomer({
        id: ticket.customer.id,
        name: getDisplayCustomerName(ticketWithOverride),
        code: ticket.customer.code,
        address: getDisplayCustomerAddress(ticketWithOverride),
        phone: getDisplayCustomerPhone(ticketWithOverride),
        id_number: getDisplayCustomerIdNumber(ticketWithOverride),
        branch_type: getDisplayCustomerBranchType(ticketWithOverride),
        branch_number: getDisplayCustomerBranchNumber(ticketWithOverride),
        credit_days: ticket.customer.credit_days,
      });
    }
  };

  const searchSupplierByNumericCode = async (numericCode) => {
    try {
      // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
      // OLD: const { data, error } = await supabase.from("information").select(...)
      const response = await apiClient.get("/gateway.php", {
        action: "searchSupplierByNumericCode",
        numericCode: numericCode,
      });

      if (!response.success) {
        console.error("Error searching supplier:", response.error);
        return null;
      }

      // ถ้าไม่พบข้อมูล API Gateway จะส่ง data: null
      return response.data;
    } catch (err) {
      console.error("Error in searchSupplierByNumericCode:", err);
      return null;
    }
  };

  const searchSupplierByCode = async (code) => {
    console.log("searchSupplierByCode called with:", code);

    try {
      // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
      // OLD: const { data, error } = await supabase.from("information").select(...)
      const response = await apiClient.get("/gateway.php", {
        action: "searchSupplierByCode",
        code: code.toUpperCase(),
      });

      if (!response.success) {
        console.error("Error searching supplier by code:", response.error);
        return { success: false, data: [] };
      }

      console.log("Database search result:", response.data);
      // ✅ แก้ให้คืนค่าในรูปแบบ array สำหรับ SupplierSection
      return { success: true, data: response.data ? [response.data] : [] };
    } catch (err) {
      console.error("Error in searchSupplierByCode:", err);
      return { success: false, data: [] };
    }
  };

  // 5. เพิ่ม useEffect สำหรับค้นหาด้วย numeric code (ใส่หลังฟังก์ชันค้นหา)
  useEffect(() => {
    const searchSupplier = async () => {
      if (
        formData.searchTicketNumber &&
        formData.searchTicketNumber.length === 3
      ) {
        const supplier = await searchSupplierByNumericCode(
          formData.searchTicketNumber
        );

        if (supplier) {
          setFormData((prev) => ({
            ...prev,
            supplier: supplier.code,
            supplierName: supplier.name,
            supplierId: supplier.id,
            supplierNumericCode: supplier.numeric_code,
            searchTicketNumber: "",
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            supplier: "",
            supplierName: "",
            supplierId: null,
            supplierNumericCode: prev.searchTicketNumber,
            searchTicketNumber: "",
          }));
        }
      }
    };

    searchSupplier();
  }, [formData.searchTicketNumber]);

  // 6. เพิ่ม useEffect สำหรับค้นหาด้วย supplier code
  useEffect(() => {
    const searchSupplierByCodeFunc = async () => {
      if (
        formData.searchSupplierCode &&
        formData.searchSupplierCode.length >= 2
      ) {
        console.log(
          "Searching for supplier code:",
          formData.searchSupplierCode
        );

        try {
          const supplier = await searchSupplierByCode(
            formData.searchSupplierCode
          );
          console.log("Search result:", supplier);

          if (supplier) {
            console.log("Found supplier:", supplier.code, supplier.name);
            console.log("Numeric code:", supplier.numeric_code);

            setFormData((prev) => ({
              ...prev,
              supplier: supplier.code,
              supplierName: supplier.name,
              supplierId: supplier.id,
              supplierNumericCode: supplier.numeric_code || "",
              searchSupplierCode: "",
            }));

            const ticketNumber = supplier.numeric_code || "";
            console.log("Setting ticket number to:", ticketNumber);

            const updatedPassengers = passengers.map((passenger) => ({
              ...passenger,
              ticketNumber: ticketNumber,
            }));
            setPassengers(updatedPassengers);
          } else {
            console.log(
              "Supplier not found for code:",
              formData.searchSupplierCode
            );

            setFormData((prev) => ({
              ...prev,
              supplierName: "",
              supplierId: null,
              supplierNumericCode: "",
              searchSupplierCode: "",
            }));

            const updatedPassengers = passengers.map((passenger) => ({
              ...passenger,
              ticketNumber: "",
            }));
            setPassengers(updatedPassengers);
          }
        } catch (error) {
          console.error("Error in searchSupplierByCodeFunc:", error);

          setFormData((prev) => ({
            ...prev,
            searchSupplierCode: "",
          }));
        }
      }
    };

    searchSupplierByCodeFunc();
  }, [formData.searchSupplierCode]);

  // 7. เพิ่ม useEffect สำหรับซิงค์ ticket numbers กับ supplier
  useEffect(() => {
    if (formData.supplierNumericCode) {
      const updatedPassengers = passengers.map((passenger) => ({
        ...passenger,
        ticketNumber: formData.supplierNumericCode,
      }));
      setPassengers(updatedPassengers);
    } else {
      const updatedPassengers = passengers.map((passenger) => ({
        ...passenger,
        ticketNumber: "",
      }));
      setPassengers(updatedPassengers);

      setFormData((prev) => ({
        ...prev,
        supplier: "",
        supplierName: "",
        supplierId: null,
      }));
    }
  }, [formData.supplierNumericCode]);

  // Sync selectedCustomer with formData
  useEffect(() => {
    if (selectedCustomer) {
      setFormData((prev) => ({
        ...prev,
        customer: selectedCustomer.name || "",
        customerCode: selectedCustomer.code || "",
        contactDetails:
          selectedCustomer.address || formatCustomerAddress(selectedCustomer),
        phone: selectedCustomer.phone || "",
        id: selectedCustomer.id_number || "",
        branchType: selectedCustomer.branch_type || "Head Office",
        branchNumber: selectedCustomer.branch_number || "",
        creditDays: String(selectedCustomer.credit_days || 0),
      }));
    }
  }, [selectedCustomer]);

  // Calculate totals
  const calculatedSubtotal =
    calculateSubtotal() +
    extras.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
  const dbPricingData = ticketData?.tickets_pricing?.[0];
  // ✅ แก้ให้คำนวณ VAT แบบ dynamic จาก formData.vatPercent แทนใช้ค่าจาก DB
  const calculatedVatAmount =
    (calculatedSubtotal * parseFloat(formData.vatPercent || 0)) / 100;
  const calculatedTotal = parseFloat(
    (calculatedSubtotal + calculatedVatAmount).toFixed(2)
  );

  // Save changes with confirmation
  const handleSubmit = async (e) => {
    e.preventDefault();

    // แสดง confirmation dialog ก่อนบันทึก (เก็บ logic เดิม)
    const confirmed = await showAlert({
      title: "ยืนยันการแก้ไข",
      description: `คุณต้องการบันทึกการแก้ไขตั๋วเครื่องบินรหัส ${ticketData.reference_number} ใช่หรือไม่?`,
      confirmText: "ยืนยัน",
      cancelText: "ยกเลิก",
    });

    if (!confirmed) return; // ถ้าผู้ใช้เลือก "ยกเลิก" ให้หยุดการทำงาน

    setSaving(true);

    try {
      // อัปเดตข้อมูลลูกค้าก่อน (ใช้ฟังก์ชันที่แก้ไปแล้ว)
      const customerOverrideData = createCustomerOverrideData(
        formData,
        selectedCustomer
      );

      // เตรียมข้อมูลสำหรับส่งไป API Gateway
      const updateData = {
        // Customer data (if needed)
        customerOverride: customerOverrideData,

        // Main ticket data
        mainTicket: {
          customer_id: selectedCustomer?.id,
          information_id: formData.supplierId,
          updated_by: user?.id, // ✅ เพิ่ม updated_by
        },

        // Ticket detail data
        ticketDetail: {
          issue_date: formData.date || null,
          due_date: formData.dueDate || null,
          credit_days: parseInt(formData.creditDays) || 0,
          subtotal_before_vat: calculatedSubtotal,
          vat_percent: parseFloat(formData.vatPercent) || 0,
          vat_amount: calculatedVatAmount,
          grand_total: calculatedTotal,
        },

        // Additional info data
        additionalInfo: {
          code: formData.code || "",
          ticket_type: formData.ticketType || "bsp",
          ticket_type_details:
            formData.ticketType?.toLowerCase() === "b2b"
              ? formData.b2bDetails
              : formData.ticketType?.toLowerCase() === "other"
              ? formData.otherDetails
              : formData.ticketType?.toLowerCase() === "tg"
              ? formData.tgDetails
              : "",
          company_payment_method: formData.paymentMethod || "",
          company_payment_details: formData.companyPaymentDetails || "",
          customer_payment_method: formData.customerPayment || "",
          customer_payment_details: formData.customerPaymentDetails || "",
          remark: formData.remark || "",
        },

        // Pricing data
        pricing: {
          adt1_net_price: parseFloat(pricing.adt1?.net || 0),
          adt1_sale_price: parseFloat(pricing.adt1?.sale || 0),
          adt1_pax: parseInt(pricing.adt1?.pax || 0),
          adt1_total: parseFloat(pricing.adt1?.total || 0),
          adt2_net_price: parseFloat(pricing.adt2?.net || 0),
          adt2_sale_price: parseFloat(pricing.adt2?.sale || 0),
          adt2_pax: parseInt(pricing.adt2?.pax || 0),
          adt2_total: parseFloat(pricing.adt2?.total || 0),
          adt3_net_price: parseFloat(pricing.adt3?.net || 0),
          adt3_sale_price: parseFloat(pricing.adt3?.sale || 0),
          adt3_pax: parseInt(pricing.adt3?.pax || 0),
          adt3_total: parseFloat(pricing.adt3?.total || 0),
          vat_percent: parseFloat(formData.vatPercent) || 0,
          vat_amount: calculatedVatAmount,
          total_amount: calculatedTotal,
        },

        // Passengers data (clean data)
        passengers: passengers
          .filter((p) => p.name?.trim())
          .map((p) => ({
            passenger_name: p.name,
            age: p.type,
            ticket_number: p.ticketNumber || "",
            ticket_code: p.ticketCode || "",
          })),

        // Routes data (clean data)
        routes: routes
          .filter((r) => r.origin || r.destination)
          .map((r) => ({
            flight_number: r.flight || "",
            rbd: r.rbd || "",
            date: r.date || "",
            origin: r.origin || "",
            destination: r.destination || "",
            departure_time: r.departure || "",
            arrival_time: r.arrival || "",
          })),

        // Extras data (clean data)
        extras: extras
          .filter((e) => e.description?.trim())
          .map((e) => ({
            description: e.description,
            net_price: parseFloat(e.net_price || 0),
            sale_price: parseFloat(e.sale_price || 0),
            quantity: parseInt(e.quantity || 1),
            total_amount: parseFloat(e.total_amount || 0),
          })),
      };

      // 🔄 เปลี่ยนจาก Multiple Supabase calls เป็น Single API Gateway call
      // OLD: หลายๆ await supabase.from().update() calls
      const response = await apiClient.post("/gateway.php", {
        action: "updateFlightTicketComplete",
        ticketId: ticketId,
        data: updateData,
      });

      if (!response.success) {
        throw new Error(response.error || "ไม่สามารถบันทึกข้อมูลได้");
      }

      // แสดง success message และปิด modal
      onSave?.();
      onClose();
    } catch (err) {
      setError(err.message);
      await showAlert({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้: " + err.message,
        confirmText: "ตกลง",
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete ticket
  const handleCancel = async (reason) => {
    setCancelling(true);
    try {
      // ดึงข้อมูล user ปัจจุบันจาก AuthContext
      const currentUserId = user?.id; // ใช้จาก useAuth()

      if (!currentUserId) {
        throw new Error("ไม่พบข้อมูลผู้ใช้งาน");
      }

      // 🔄 เปลี่ยนจาก Supabase เป็น API Gateway
      // OLD: const { error } = await supabase.from("bookings_ticket").update(...).eq("id", ticketId);
      const response = await apiClient.post("/gateway.php", {
        action: "cancelFlightTicket",
        ticketId: ticketId,
        userId: currentUserId,
        cancelReason: reason,
      });

      if (!response.success) {
        throw new Error(response.error || "ไม่สามารถยกเลิกตั๋วได้");
      }

      setShowCancelModal(false);
      onSave?.();
      onClose();
    } catch (err) {
      setError(err.message);
      await showAlert({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกตั๋วได้: " + err.message,
        confirmText: "ตกลง",
      });
    } finally {
      setCancelling(false);
    }
  };

  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateTime) => {
    if (!dateTime) return "-";
    return new Date(dateTime).toLocaleDateString("th-TH");
  };

  // Helper function to map database payment method to form values
  const mapPaymentMethodFromDB = (dbValue) => {
    if (!dbValue) return "";

    const mapping = {
      // Database values -> Form values
      เครดิตการ์ด: "creditCard",
      โอนเงินผ่านธนาคาร: "bankTransfer",
      เงินสด: "cash",
      เครดิต: "credit",
      "อื่น ๆ": "other",
      อื่นๆ: "other",
      // English values - เพิ่มตัวใหญ่
      CREDITCARD: "creditCard",
      BANKTRANSFER: "bankTransfer",
      CASH: "cash",
      CREDIT: "credit",
      OTHER: "other",
      // camelCase values
      creditCard: "creditCard",
      bankTransfer: "bankTransfer",
      cash: "cash",
      credit: "credit",
      other: "other",
    };

    return mapping[dbValue] || "";
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-center mt-4">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error && !ticketData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <X className="h-12 w-12 mx-auto text-red-500" />
          <p className="text-center text-red-600 mt-4">{error}</p>
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md mx-auto block"
          >
            ปิด
          </button>
        </div>
      </div>
    );
  }

  if (!ticketData) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center shrink-0">
          <h1 className="text-xl font-bold">
            แก้ไขตั๋วเครื่องบิน: {ticketData.invoice_number || ticketData.reference_number}
          </h1>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-700 rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form
          onSubmit={handleSubmit}
          className={`${SaleStyles.contentWrapper} flex-1 overflow-y-auto`}
        >
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
                {error}
              </div>
            )}

            {/* Customer & Dates - ใช้ SaleHeader */}
            <div className={SaleStyles.grid.twoColumns}>
              <div>
                <h2
                  className={combineClasses(
                    "text-lg font-semibold border-b pb-2",
                    SaleStyles.spacing.mb4
                  )}
                >
                  ข้อมูลลูกค้า
                </h2>
                <SaleHeader
                  formData={formData}
                  setFormData={setFormData}
                  section="customer"
                  selectedCustomer={selectedCustomer}
                  setSelectedCustomer={setSelectedCustomer}
                  globalEditMode={true}
                  setGlobalEditMode={setGlobalEditMode}
                  readOnly={false}
                  isEditMode={true}
                  customers={customers}
                  setCustomers={setCustomers}
                />
              </div>
              <div>
                <h2
                  className={combineClasses(
                    "text-lg font-semibold border-b pb-2",
                    SaleStyles.spacing.mb4
                  )}
                >
                  ราคาและวันที่
                </h2>
                <SaleHeader
                  formData={formData}
                  setFormData={setFormData}
                  section="price"
                  totalAmount={calculatedTotal}
                  subtotalAmount={calculatedSubtotal}
                  vatAmount={calculatedVatAmount}
                  globalEditMode={globalEditMode}
                  setGlobalEditMode={setGlobalEditMode}
                  readOnly={true} // true เพื่อให้เป็น readonly
                />
              </div>
            </div>

            {/* Passengers & Supplier */}
            <div className={SaleStyles.section.container}>
              <div className={SaleStyles.section.headerWrapper}>
                <h2 className={SaleStyles.section.headerTitle}>
                  ข้อมูลผู้โดยสารและซัพพลายเออร์
                </h2>
              </div>
              <div className={SaleStyles.grid.fifteenColumns}>
                <PassengerSection
                  passengers={passengers}
                  setPassengers={setPassengers}
                  updatePricing={updatePricing}
                  pricing={pricing}
                  formData={formData} // เพิ่ม props นี้
                  setFormData={setFormData} // เพิ่ม props นี้
                  readOnly={false} // เปลี่ยนจาก true เป็น false เพื่อให้สามารถแก้ไขได้
                />
                <SupplierSection
                  formData={formData}
                  setFormData={setFormData}
                  suppliers={suppliers}
                  onSupplierSearch={searchSupplierByCode}
                  readOnly={false} // เปลี่ยนจาก true เป็น false เพื่อให้สามารถแก้ไขได้
                />
              </div>
            </div>

            {/* Routes */}
            <div className={SaleStyles.section.container}>
              <div className={SaleStyles.section.headerWrapper}>
                <h2 className={SaleStyles.section.headerTitle}>
                  เส้นทางการเดินทาง
                </h2>
              </div>
              <div>
                <RouteSection
                  routes={routes}
                  setRoutes={setRoutes}
                  readOnly={false}
                />
              </div>
            </div>

            {/* Extras */}
            <ExtrasSection
              extras={extras}
              setExtras={setExtras}
              readOnly={false} // เปลี่ยนเป็น false
            />

            {/* Pricing Summary */}
            <PricingSummarySection
              pricing={pricing}
              updatePricing={updatePricing}
              setFormData={setFormData}
              extras={extras}
              readOnly={false}
              // ✅ ในหน้า Edit ส่ง actualVatPercent จาก formData เพื่อแสดง initial value
              // แต่ไม่ส่ง actualVatAmount และ actualTotal เพื่อให้คำนวณแบบ dynamic
              actualVatPercent={parseFloat(formData.vatPercent || 0)}
            />

            {/* Remark */}
            <div className={SaleStyles.section.container}>
              <section className={SaleStyles.subsection.container}>
                <div className={SaleStyles.section.headerWrapper2}>
                  <h2 className={SaleStyles.section.headerTitle}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Remark
                  </h2>
                </div>
                <div className={SaleStyles.subsection.content}>
                  <textarea
                    className="w-full border border-gray-400 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                    placeholder="กรอกหมายเหตุ (ข้อมูลนี้จะแสดงใน Invoice และ Receipt)"
                    value={formData.remark || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        remark: e.target.value,
                      }))
                    }
                  />
                </div>
              </section>
            </div>

          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center shrink-0">
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
              disabled={saving || cancelling}
            >
              <Trash2 size={16} className="mr-2" />
              {cancelling ? "กำลังยกเลิก..." : "ยกเลิกรายการ"}
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 flex items-center"
                disabled={saving || deleting}
              >
                <ChevronLeft size={16} className="mr-2" />
                ยกเลิก
              </button>

              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                disabled={saving || deleting}
              >
                <Save size={16} className="mr-2" />
                {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
              </button>
            </div>
          </div>
        </form>
      </div>
      {/* Cancel Reason Modal */}
      <CancelReasonModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        ticketNumber={ticketData?.reference_number}
        loading={cancelling}
      />
    </div>
  );
};

export default FlightTicketDetail_Edit;
