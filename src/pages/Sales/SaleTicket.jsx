import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FiFileText } from "react-icons/fi";
import SaleHeader from "./common/SaleHeader";
import { DocumentViewer } from "../../components/documents";
import PassengerSection from "./ticket/PassengerSection";
import SupplierSection from "./common/SupplierSection";
import RouteSection from "./ticket/RouteSection";
import PricingSummarySection from "./ticket/PricingSummarySection";
import usePricing from "../../hooks/usePricing";
import SaleStyles, { combineClasses } from "./common/SaleStyles";
import { createFlightTicket } from "../../services/ticketService";
import {
  getSuppliers,
  searchSupplierByNumericCode,
  searchSupplierByCode,
} from "../../services/supplierService";
import { getCustomers, createCustomer } from "../../services/customerService";
import { apiClient } from "../../services/apiClient";
import { useAuth } from "../../pages/Login/AuthContext";
import { getLocalDateString } from "../../utils/helpers";

const SaleTicket = () => {
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [globalEditMode, setGlobalEditMode] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [invoicePreviewData, setInvoicePreviewData] = useState(null);

  const [formData, setFormData] = useState({
    customer: "",
    customerCode: "",
    contactDetails: "",
    phone: "",
    id: "",
    branchType: "Head Office",
    branchNumber: "",
    date: getLocalDateString(),
    creditDays: "0",
    dueDate: "",
    salesName: "",
    supplier: "",
    supplierName: "",
    supplierNumericCode: "",
    remark: "",
    vatPercent: "0",
  });

  const handleSupplierSearch = async (searchTerm) => {
    try {
      const supplier = await searchSupplierByCode(searchTerm);
      if (supplier) {
        setFormData((prev) => ({
          ...prev,
          supplier: supplier.code,
          supplierName: supplier.name,
          supplierId: supplier.id,
          supplierNumericCode: supplier.numeric_code || "",
        }));

        // อัปเดท ticket numbers ด้วย
        const ticketNumber = supplier.numeric_code || "";
        const updatedPassengers = passengers.map((passenger) => ({
          ...passenger,
          ticketNumber: ticketNumber,
        }));
        setPassengers(updatedPassengers);
      }
    } catch (error) {
      console.error("Supplier search error:", error);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      const airlinesData = await getSuppliers("airline");
      setSuppliers(airlinesData);
      const customersData = await getCustomers();
      setCustomers(customersData);
    };
    loadInitialData();
  }, []);

  const { pricing, updatePricing, calculateSubtotal, calculateTotal } =
    usePricing();

  const [passengers, setPassengers] = useState([
    { id: 1, name: "", type: "ADT1", ticketNumber: "", ticketCode: "" },
  ]);

  const [routes, setRoutes] = useState([
    {
      id: 1,
      date: "",
      airline: "",
      flight: "",
      origin: "",
      destination: "",
      departure: "",
      arrival: "",
    },
  ]);

  useEffect(() => {
    const searchSupplier = async () => {
      if (
        formData.searchTicketNumber &&
        formData.searchTicketNumber.length === 3
      ) {
        console.log(
          "Searching supplier by numeric code:",
          formData.searchTicketNumber,
        );

        const supplier = await searchSupplierByNumericCode(
          formData.searchTicketNumber,
        );

        if (supplier) {
          console.log("Found supplier by numeric code:", supplier);
          // เจอ supplier -> อัปเดทข้อมูล
          setFormData((prev) => ({
            ...prev,
            supplier: supplier.code,
            supplierName: supplier.name,
            supplierId: supplier.id,
            supplierNumericCode: supplier.numeric_code,
            searchTicketNumber: "", // clear search flag
          }));
        } else {
          console.log("Supplier not found by numeric code");
          // ไม่เจอ supplier -> clear ข้อมูล supplier ทั้งหมด
          setFormData((prev) => ({
            ...prev,
            supplier: "",
            supplierName: "",
            supplierId: null,
            supplierNumericCode: prev.searchTicketNumber, // เก็บเลขที่พิมพ์ไว้
            searchTicketNumber: "", // clear search flag
          }));
        }
      }
    };

    searchSupplier();
  }, [formData.searchTicketNumber]);

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

      // Clear supplier info ด้วย
      setFormData((prev) => ({
        ...prev,
        supplier: "",
        supplierName: "",
        supplierId: null,
      }));
    }
  }, [formData.supplierNumericCode, passengers.length]);

  // เพิ่ม useEffect สำหรับค้นหาด้วย supplier code
  useEffect(() => {
    const searchSupplierByCodeFunc = async () => {
      if (
        formData.searchSupplierCode &&
        formData.searchSupplierCode.length >= 2
      ) {
        console.log(
          "Searching for supplier code:",
          formData.searchSupplierCode,
        );

        try {
          const supplier = await searchSupplierByCode(
            formData.searchSupplierCode,
          );
          console.log("Search result:", supplier);

          if (supplier) {
            console.log("Found supplier:", supplier.code, supplier.name);
            console.log("Numeric code:", supplier.numeric_code);

            // เจอ supplier -> อัปเดทข้อมูล
            setFormData((prev) => ({
              ...prev,
              supplier: supplier.code,
              supplierName: supplier.name,
              supplierId: supplier.id,
              supplierNumericCode: supplier.numeric_code || "",
              searchSupplierCode: "", // clear search flag
            }));

            // อัปเดท ticket numbers (ถ้ามี numeric_code)
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
              formData.searchSupplierCode,
            );

            // ไม่เจอ supplier -> clear ข้อมูล supplier อื่น (เก็บ code ที่พิมพ์ไว้)
            setFormData((prev) => ({
              ...prev,
              supplierName: "",
              supplierId: null,
              supplierNumericCode: "",
              searchSupplierCode: "", // clear search flag
            }));

            // Clear ticket numbers ด้วย
            const updatedPassengers = passengers.map((passenger) => ({
              ...passenger,
              ticketNumber: "",
            }));
            setPassengers(updatedPassengers);
          }
        } catch (error) {
          console.error("Error in searchSupplierByCodeFunc:", error);

          // Clear search flag ในกรณี error
          setFormData((prev) => ({
            ...prev,
            searchSupplierCode: "",
          }));
        }
      }
    };

    searchSupplierByCodeFunc();
  }, [formData.searchSupplierCode, passengers]);

  // ✅ useEffect สำหรับ auto-fill ข้อมูลจาก Deposit
  useEffect(() => {
    const depositData = location.state?.fromDeposit;

    if (depositData) {
      console.log("Received deposit data:", depositData);

      // Auto-fill formData
      setFormData((prev) => ({
        ...prev,
        customer: depositData.customer || "",
        customerCode: depositData.customerCode || "",
        contactDetails: depositData.contactDetails || "",
        phone: depositData.phone || "",
        id: depositData.id || "",
        date: depositData.date || new Date().toISOString().split("T")[0],
        creditDays: depositData.creditDays || "0",
        dueDate: depositData.dueDate || "",
        supplier: depositData.supplier || "",
        supplierName: depositData.supplierName || "",
        supplierId: depositData.supplierId || null,
        supplierNumericCode: depositData.supplierNumericCode || "",
        code: depositData.code || "",
        vatPercent: depositData.vatPercent || "0",
      }));

      // Auto-fill selectedCustomer
      if (depositData.selectedCustomer) {
        setSelectedCustomer(depositData.selectedCustomer);
      }

      // Auto-fill pricing and generate passengers based on pax count
      if (depositData.pricing) {
        const pricingData = depositData.pricing;

        // อัพเดท pricing (เฉพาะ Adult)
        if (pricingData.adt1) {
          updatePricing("adt1", "net", pricingData.adt1.net || 0, 0);
          updatePricing("adt1", "sale", pricingData.adt1.sale || 0, 0);
          updatePricing(
            "adt1",
            "pax",
            pricingData.adt1.pax || 0,
            pricingData.adt1.total || 0,
          );
        }

        // สร้าง passengers จากจำนวน pax
        const generatedPassengers = [];
        let passengerId = 1;
        const ticketNumber = depositData.supplierNumericCode || "";

        const adultCount = pricingData.adt1?.pax || 0;
        for (let i = 0; i < adultCount; i++) {
          generatedPassengers.push({
            id: passengerId++,
            name: "",
            type: "ADT1",
            ticketNumber: ticketNumber,
            ticketCode: "",
          });
        }

        if (generatedPassengers.length > 0) {
          setPassengers(generatedPassengers);
        }
      }

      // Auto-fill routes
      if (depositData.routes && depositData.routes.length > 0) {
        const mappedRoutes = depositData.routes.map((route, index) => ({
          id: index + 1,
          date: route.date || "",
          airline: route.airline || "",
          flight: route.flight || "",
          rbd: route.rbd || "",
          origin: route.origin || "",
          destination: route.destination || "",
          departure: route.departure || "",
          arrival: route.arrival || "",
        }));
        setRoutes(mappedRoutes);
      }

      console.log("Auto-filled form with deposit data");
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors({});

    try {
      // Validation - ต้องเลือก Supplier
      if (!formData.supplierId) {
        alert("กรุณาเลือก Supplier");
        setLoading(false);
        return;
      }

      let userId = currentUser?.id;
      let userFullname = currentUser?.fullname;

      if (!userId) {
        console.warn("No user ID available from AuthContext");
      }

      let customerId = selectedCustomer?.id;

      if (!customerId && formData.customer) {
        const newCustomerResult = await createCustomer({
          name: formData.customer,
          code: formData.customerCode || null,
          address_line1: formData.contactDetails || "",
          id_number: formData.id || "",
          phone: formData.phone || "",
          credit_days: parseInt(formData.creditDays) || 0,
          branch_type: formData.branchType || "Head Office",
          branch_number: formData.branchNumber || null,
        });

        if (newCustomerResult.success) {
          customerId = newCustomerResult.customerId;
          if (formData.customerCode !== "WKIN") {
            alert(`สร้างลูกค้าใหม่สำเร็จ: ${formData.customer}`);
          }
        } else {
          alert(`ไม่สามารถสร้างลูกค้าใหม่ได้: ${newCustomerResult.error}`);
          setLoading(false);
          return;
        }
      } else if (customerId && formData.creditDays) {
        try {
          await apiClient.post("/gateway.php", {
            action: "updateCustomerCreditDays",
            customerId: customerId,
            creditDays: parseInt(formData.creditDays) || 0,
          });
        } catch (updateError) {
          console.error("Error updating customer credit days:", updateError);
        }
      }

      const subtotalAmount = calculateSubtotal();
      const vatAmount =
        (subtotalAmount * parseFloat(formData.vatPercent || 0)) / 100;
      const totalAmount = subtotalAmount + vatAmount;

      // เพิ่ม depositId จาก location.state
      const depositData = location.state?.fromDeposit;
      const depositId = depositData?.fromDepositId || null;

      const ticketData = {
        customerId: customerId,
        supplierId: formData.supplierId || null,
        depositId: depositId,
        status: "pending",
        paymentStatus: "unpaid",
        createdBy: userId,
        updatedBy: userId,
        bookingDate: formData.date || getLocalDateString(),
        dueDate: formData.dueDate || formData.date || getLocalDateString(),
        creditDays: formData.creditDays,
        totalAmount: totalAmount,
        code: formData.code || "",
        remark: formData.remark || "",
        pricing: pricing,
        subtotalAmount,
        vatPercent: parseFloat(formData.vatPercent || 0),
        vatAmount,
        passengers: passengers
          .filter((p) => p.name.trim())
          .map((p) => ({
            name: p.name,
            age: p.type,
            ticketNumber: p.ticketNumber,
            ticket_code: p.ticketCode || "",
          })),
        routes: routes
          .filter((r) => r.origin || r.destination)
          .map((r) => ({
            flight: r.flight,
            flight_number: r.flight,
            rbd: r.rbd,
            date: r.date,
            origin: r.origin,
            destination: r.destination,
            departure: r.departure,
            arrival: r.arrival,
          })),
        salesName: userFullname || formData.salesName,
      };

      const result = await createFlightTicket(ticketData);

      if (result.success) {
        const bookingId = result.ticketId || result.bookingId;
        const ftNumber = result.referenceNumber;

        // บันทึกสำเร็จ → ออก INV ทันที
        try {
          const invResponse = await apiClient.post("/gateway.php", {
            action: "generateINVForTicket",
            ticketId: bookingId,
          });

          if (invResponse.success) {
            const invNumber = invResponse.data.invoiceNumber;

            alert(`บันทึกและออก Invoice สำเร็จ!\nINV: ${invNumber}`);

            // เปิด DocumentViewer modal แสดง INV
            setInvoicePreviewData({
              ticketId: bookingId,
              documentType: "inv",
              ftNumber: ftNumber,
              invNumber: invNumber,
            });
            setShowInvoicePreview(true);
          } else {
            alert(
              `สร้าง FT สำเร็จ (${ftNumber}) แต่ไม่สามารถสร้าง INV ได้: ${invResponse.error}`,
            );
            window.location.reload();
          }
        } catch (invError) {
          alert(
            `สร้าง FT สำเร็จ (${ftNumber}) แต่เกิดข้อผิดพลาดในการสร้าง INV: ${invError.message}`,
          );
          window.location.reload();
        }
      } else {
        alert(`เกิดข้อผิดพลาด: ${result.error}`);
      }
    } catch (error) {
      console.error("Error saving ticket:", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSuppliers = async () => {
      const data = await getSuppliers("airline");
      setSuppliers(data);
    };
    fetchSuppliers();
  }, []);

  const resetForm = () => {
    setFormData({
      customer: "",
      customerCode: "",
      contactDetails: "",
      phone: "",
      id: "",
      date: new Date().toISOString().split("T")[0],
      creditDays: "0",
      dueDate: "",
      salesName: "",
      supplier: "",
      supplierName: "",
      remark: "",
      vatPercent: "0",
    });

    updatePricing("adt1", "net", "", 0);
    updatePricing("adt1", "sale", "", 0);
    updatePricing("adt1", "pax", 0, 0);

    setPassengers([
      { id: 1, name: "", type: "ADT1", ticketNumber: "", ticketCode: "" },
    ]);
    setRoutes([
      {
        id: 1,
        date: "",
        airline: "",
        flight: "",
        origin: "",
        destination: "",
        departure: "",
        arrival: "",
      },
    ]);
    setSelectedCustomer(null);
    setValidationErrors({});
    setGlobalEditMode(true);
  };

  const calculatedSubtotal = calculateSubtotal();
  const calculatedVatAmount =
    (calculatedSubtotal * parseFloat(formData.vatPercent || 0)) / 100;
  const calculatedTotal = calculatedSubtotal + calculatedVatAmount;

  // ป้องกันการกด Enter ในฟอร์ม
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
      e.preventDefault();
    }
  };

  return (
    <div className={SaleStyles.mainContainer}>
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        className={SaleStyles.contentWrapper}
      >
        <div className={SaleStyles.mainCard}>
          <div className={SaleStyles.header.container}>
            <h1 className={SaleStyles.header.title}>
              Sale Ticket / ขายตั๋วเครื่องบิน
            </h1>
            <div className={SaleStyles.header.buttonContainer}>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <span>กำลังบันทึกและออก INV...</span>
                ) : (
                  <>
                    <FiFileText className={SaleStyles.button.icon} />{" "}
                    บันทึกและออก INV
                  </>
                )}
              </button>
            </div>
          </div>

          <div className={SaleStyles.mainContent}>
            <div className={SaleStyles.grid.twoColumns}>
              <div>
                <h2
                  className={combineClasses(
                    "text-lg font-semibold border-b pb-2",
                    SaleStyles.spacing.mb4,
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
                  globalEditMode={globalEditMode}
                  setGlobalEditMode={setGlobalEditMode}
                />
              </div>
              <div>
                <h2
                  className={combineClasses(
                    "text-lg font-semibold border-b pb-2",
                    SaleStyles.spacing.mb4,
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
                />
              </div>
            </div>

            <div className={SaleStyles.section.container}>
              <div className={SaleStyles.section.headerWrapper}>
                <h2 className={SaleStyles.section.headerTitle}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  ข้อมูลผู้โดยสารและซัพพลายเออร์
                </h2>
              </div>
              <div className={SaleStyles.grid.fifteenColumns}>
                <PassengerSection
                  passengers={passengers}
                  setPassengers={setPassengers}
                  updatePricing={updatePricing}
                  pricing={pricing}
                  formData={formData}
                  setFormData={setFormData}
                />
                <SupplierSection
                  formData={formData}
                  setFormData={setFormData}
                  onSupplierSearch={handleSupplierSearch}
                />
              </div>
            </div>

            <div className={SaleStyles.section.container}>
              <div className={SaleStyles.section.headerWrapper}>
                <h2 className={SaleStyles.section.headerTitle}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                  </svg>
                  เส้นทางการเดินทาง
                </h2>
              </div>
              <div className="grid grid-cols-10 gap-2">
                <RouteSection routes={routes} setRoutes={setRoutes} />
              </div>
            </div>

            <PricingSummarySection
              pricing={pricing}
              updatePricing={updatePricing}
              setFormData={setFormData}
              extras={[]}
              actualVatPercent={formData.vatPercent}
            />

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
          {/* ปุ่มบันทึกและออก INV ด้านล่าง */}
          <div
            className={combineClasses(
              SaleStyles.section.container,
              "border-t-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-6",
            )}
          >
            <div className="flex justify-center gap-4">
              <button
                type="submit"
                className={combineClasses(
                  "px-8 py-3 bg-green-600 text-white rounded-lg flex items-center hover:bg-green-700 text-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200",
                  loading ? "opacity-50 cursor-not-allowed" : "",
                )}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    <span>กำลังบันทึกและออก INV...</span>
                  </>
                ) : (
                  <>
                    <FiFileText className="mr-2" size={20} />
                    บันทึกและออก INV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* DocumentViewer Modal สำหรับแสดง INV */}
      {showInvoicePreview && invoicePreviewData && (
        <DocumentViewer
          isOpen={showInvoicePreview}
          onClose={() => {
            setShowInvoicePreview(false);
            setInvoicePreviewData(null);
            window.location.reload(); // Reload หลังปิด preview
          }}
          documentType={invoicePreviewData.documentType}
          ticketId={invoicePreviewData.ticketId}
        />
      )}
    </div>
  );
};

export default SaleTicket;
