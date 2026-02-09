// src/components/documents/viewers/DocumentViewer.jsx
import React, { useRef, useState, useEffect } from "react";
import {
  X,
  Printer,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../../pages/Login/AuthContext"; // ✅ Import useAuth

// Import shared components
import DocumentHeader from "../shared/DocumentHeader";
import DocumentFooter from "../shared/DocumentFooter";
import DocumentToolbar from "../shared/DocumentToolbar";
import PageContainer from "../shared/PageContainer";

// Import table components
import InvoiceTable from "../tables/InvoiceTable";
import VoucherTable from "../tables/VoucherTable";
import ReceiptTable from "../tables/ReceiptTable";
import DepositTable from "../tables/DepositTable";
import MultiPOReceiptTable from "../tables/MultiPOReceiptTable";

// Import data services
import { getInvoiceData } from "../services/documentDataMapper";
import { getVoucherData } from "../services/voucherDataService";
import { getOtherData } from "../services/otherDataService";
import { getReceiptDataForPrint } from "../services/receiptDataService";
import { getDepositData } from "../services/depositDataService";
import { apiClient } from "../../../services/apiClient"; // ✅ Import apiClient for logging

// Import styles
import "../styles/documentStyles.css";

// Import customer helpers
import {
  getDisplayCustomerName,
  getDisplayCustomerAddress,
  getDisplayCustomerPhone,
  getDisplayCustomerIdNumber,
  getDisplayCustomerBranchType,
  getDisplayCustomerBranchNumber,
} from "../../../utils/customerOverrideHelpers";

// Zoom options
const ZOOM_OPTIONS = [
  { value: "fitToWidth", label: "Fit to Width" },
  { value: "100%", label: "100%" },
  { value: "125%", label: "125%" },
  { value: "150%", label: "150%" },
  { value: "200%", label: "200%" },
];

/**
 * DocumentViewer - Main viewer component รองรับทุกประเภทเอกสาร
 * แทนที่ PrintInvoice.jsx และ PrintDocument.jsx
 *
 * รองรับ:
 * - Invoice (ใช้ ticket data)
 * - Receipt (ใช้ ticket data ที่เลือก)
 * - Voucher (ใช้ voucher data)
 */
const DocumentViewer = ({
  isOpen,
  onClose,

  // Document type และ IDs
  documentType = "invoice", // "invoice", "receipt", "voucher"
  ticketId = null, // สำหรับ invoice และ receipt
  voucherId = null, // สำหรับ voucher
  depositId = null,

  otherId = null, // สำหรับ other services

  // Receipt specific
  receiptData = null, // ข้อมูลที่เลือกจาก ReceiptSelectionModal

  // Callbacks
  onPOGenerated = () => {},
  onDocumentGenerated = () => {},
}) => {
  const { user: currentUser } = useAuth(); // ✅ Get current user
  const printRef = useRef();
  const [documentData, setDocumentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState("fitToWidth");
  const [currentViewPage, setCurrentViewPage] = useState(1);

  // Constants
  const PASSENGERS_PER_PAGE = 9;

  useEffect(() => {
    if (isOpen) {
      fetchDocumentData();
    }
  }, [isOpen, documentType, ticketId, voucherId, receiptData]);

  /**
   * ดึงข้อมูลเอกสารตาม documentType
   */
  const fetchDocumentData = async () => {
    setLoading(true);
    setError(null);

    try {
      let result;

      console.log(`Starting ${documentType} data fetch:`, {
        documentType,
        ticketId,
        voucherId,
        hasReceiptData: !!receiptData,
      });

      // ✅ Print = Edit: ส่ง userId ทุกครั้งที่ดึงข้อมูล
      const userId = currentUser?.id || null;

      switch (documentType) {
        case "invoice":
          if (!ticketId) throw new Error("ต้องระบุ ticketId สำหรับ Invoice");
          result = await getInvoiceData(ticketId, userId); // ส่ง userId
          break;

        case "inv":
          // INV ใช้ข้อมูลเหมือน invoice แต่แสดงเลข INV แทน PO
          if (!ticketId) throw new Error("ต้องระบุ ticketId สำหรับ INV");
          result = await getInvoiceData(ticketId, userId, true); // ส่ง userId + flag สำหรับ INV
          break;

        case "receipt":
          if (!ticketId) throw new Error("ต้องระบุ ticketId สำหรับ Receipt");
          result = await getReceiptDataForPrint(ticketId, receiptData, userId); // ✅ ส่ง userId
          break;

        case "voucher":
          if (otherId) {
            // ถ้าเป็น Other Services ใช้ otherDataService
            result = await getOtherData(otherId, userId); // ส่ง userId
          } else if (voucherId) {
            // ถ้าเป็น Voucher ปกติ ใช้ voucherDataService
            result = await getVoucherData(voucherId, userId); // ส่ง userId
          } else {
            throw new Error("ต้องระบุ voucherId หรือ otherId สำหรับ Voucher");
          }
          break;

        case "other":
          if (!otherId)
            throw new Error("ต้องระบุ otherId สำหรับ Other Services");
          result = await getOtherData(otherId, userId); // ส่ง userId
          break;

        case "deposit":
          if (!depositId) throw new Error("ต้องระบุ depositId สำหรับ Deposit");
          result = await getDepositData(depositId, userId); // ส่ง userId
          break;

        default:
          throw new Error(`ประเภทเอกสารไม่ถูกต้อง: ${documentType}`);
      }

      if (result.success) {
        setDocumentData(result.data);

        // เรียก callback ถ้ามีการสร้าง PO/RC/VC
        if (result.data.poResult && onPOGenerated) {
          onPOGenerated();
        }
        if (result.data.rcResult && onDocumentGenerated) {
          onDocumentGenerated();
        }
        if (result.data.vcResult && onDocumentGenerated) {
          onDocumentGenerated();
        }

        console.log(`${documentType} data loaded successfully:`, {
          hasCustomer: !!result.data.customer,
          hasInvoice: !!result.data.invoice,
          passengersCount: result.data.passengers?.length || 0,
        });
      } else {
        setError(result.error);
        console.error(`Error loading ${documentType} data:`, result.error);
      }
    } catch (err) {
      const errorMessage =
        err.message || `ไม่สามารถโหลดข้อมูล ${documentType} ได้`;
      setError(errorMessage);
      console.error(`${documentType} fetch error:`, err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * คำนวดจำนวนหน้าสำหรับ pagination
   */
  const calculatePages = () => {
    if (
      documentType === "voucher" ||
      documentType === "other" ||
      documentType === "deposit"
    ) {
      // Voucher, Other และ Deposit ใช้หน้าเดียวเสมอ
      return { totalPages: 1, dataPages: [{}] };
    }

    // Invoice, INV และ Receipt ใช้ logic pagination แบบเดิม
    if (!documentData?.passengers?.length) {
      return { totalPages: 1, dataPages: [{}] };
    }

    const totalPassengers = documentData.passengers.length;
    const totalPages =
      totalPassengers <= PASSENGERS_PER_PAGE
        ? 1
        : Math.ceil(totalPassengers / PASSENGERS_PER_PAGE);

    // แบ่งผู้โดยสารเป็นหน้าๆ
    const dataPages = [];
    for (let i = 0; i < totalPassengers; i += PASSENGERS_PER_PAGE) {
      dataPages.push({
        passengers: documentData.passengers.slice(i, i + PASSENGERS_PER_PAGE),
      });
    }

    return { totalPages, dataPages };
  };

  /**
   * บันทึก Activity Log สำหรับการพิมพ์
   */
  const logPrintActivity = async () => {
    try {
      // หา documentId จาก props ตาม documentType
      let recordId = null;
      if (
        documentType === "invoice" ||
        documentType === "inv" ||
        documentType === "receipt"
      ) {
        recordId = ticketId;
      } else if (documentType === "voucher") {
        recordId = otherId || voucherId;
      } else if (documentType === "deposit") {
        recordId = depositId;
      } else if (documentType === "other") {
        recordId = otherId;
      }

      // หา module ที่ถูกต้อง
      const moduleMap = {
        invoice: "ticket",
        inv: "ticket", // ✅ เพิ่ม inv
        receipt: "ticket",
        voucher: "voucher",
        deposit: "deposit",
        other: "other",
      };
      const module = moduleMap[documentType] || "ticket";

      // หา referenceNumber (เลขเอกสาร PO, INV, RC, VC, DP)
      let referenceNumber = null;
      if (documentType === "invoice") {
        referenceNumber = documentData?.invoice?.poNumber || null;
      } else if (documentType === "inv") {
        // ✅ เพิ่ม inv
        referenceNumber = documentData?.invoice?.invoiceNumber || null;
      } else if (documentType === "receipt") {
        referenceNumber = documentData?.invoice?.rcNumber || null;
      } else if (documentType === "voucher") {
        referenceNumber = documentData?.invoice?.vcNumber || null;
      } else if (documentType === "deposit") {
        referenceNumber = documentData?.invoice?.referenceNumber || null;
      } else if (documentType === "other") {
        referenceNumber = documentData?.invoice?.vcNumber || null;
      }

      // ส่ง userId
      const userId = currentUser?.id || null;

      if (!recordId || !userId) {
        console.warn("Cannot log print activity: missing recordId or userId", {
          recordId,
          userId,
        });
        return;
      }

      // เรียก API log activity
      await apiClient.post("/gateway.php", {
        action: "logActivity",
        module: module,
        recordId: recordId,
        referenceNumber: referenceNumber,
        activityAction: "print",
        userId: userId,
      });

      console.log("Print activity logged successfully:", {
        module,
        recordId,
        referenceNumber,
        userId,
      });
    } catch (error) {
      console.error("Failed to log print activity:", error);
      // ไม่ throw error เพื่อให้พิมพ์ต่อได้
    }
  };

  /**
   * จัดการการพิมพ์เอกสาร
   */
  const handlePrint = async () => {
    if (!documentData) {
      alert("ไม่สามารถพิมพ์ได้: ข้อมูลเอกสารยังไม่พร้อม");
      return;
    }

    // ✅ Log activity ก่อนพิมพ์
    await logPrintActivity();

    const documentTitles = {
      invoice: "Invoice",
      receipt: "Receipt",
      voucher: "Voucher",
    };

    const documentTitle = documentTitles[documentType] || "Document";
    const documentNumber = getDocumentNumber();

    console.log(`Starting print for ${documentType}:`, {
      documentTitle,
      documentNumber,
      totalPages: calculatePages().totalPages,
      printStylesLength: getPrintStyles().length,
    });

    // สร้าง iframe สำหรับพิมพ์
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.top = "-9999px";
    printFrame.style.left = "-9999px";
    printFrame.style.width = "210mm";
    printFrame.style.height = "297mm";
    printFrame.style.border = "none";

    document.body.appendChild(printFrame);

    const frameDoc =
      printFrame.contentDocument || printFrame.contentWindow.document;
    const printContent = printRef.current.innerHTML;

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>${documentTitle} ${documentNumber}</title>
          <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
          <style>
            ${getPrintStyles()}
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    frameDoc.close();

    // Debug log
    setTimeout(() => {
      console.log("Print iframe created successfully");
      console.log("Print content preview:", printContent.substring(0, 200));
    }, 100);

    // รอให้โหลดเสร็จแล้วค่อยพิมพ์
    setTimeout(() => {
      try {
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        console.log("Print dialog opened successfully");
      } catch (error) {
        console.error("Print error:", error);
        alert("เกิดข้อผิดพลาดในการพิมพ์");
      }

      // ลบ iframe หลังพิมพ์
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 1000);
    }, 500);
  };

  /**
   * ดึงเลขที่เอกสารตาม documentType
   */
  const getDocumentNumber = () => {
    console.log("getDocumentNumber called, documentData:", documentData);
    if (!documentData?.invoice) return "";

    switch (documentType) {
      case "invoice":
        return documentData.invoice.poNumber || "";
      case "inv": // ✅ INV ใช้ invoiceNumber
        return documentData.invoice.invoiceNumber || "";
      case "receipt":
        return documentData.invoice.rcNumber || "";
      case "voucher":
      case "other":
        return documentData.invoice.vcNumber || "";
      case "deposit":
        return documentData.invoice.dpNumber || "";
      default:
        return "";
    }
  };

  /**
   * เลือก Table component ตาม documentType
   */
  const renderTable = (pageData = {}) => {
    const commonProps = {
      ...documentData,
      ...pageData,
    };

    switch (documentType) {
      case "invoice":
      case "inv": // ✅ INV ใช้ InvoiceTable เหมือนกับ invoice
        return <InvoiceTable {...commonProps} />;
      case "receipt":
        // ⭐ เช็คว่าเป็น Multi PO Receipt หรือไม่
        if (documentData.selectedPOs && documentData.selectedPOs.length > 0) {
          return <MultiPOReceiptTable {...commonProps} />;
        }
        return <ReceiptTable {...commonProps} />;
      case "voucher":
        return (
          <VoucherTable {...commonProps} otherData={documentData.otherData} />
        );
      case "deposit":
        return (
          <DepositTable
            {...commonProps}
            depositInfo={documentData.depositInfo}
          />
        );
      default:
        return (
          <div className="p-8 text-center text-red-600">
            <AlertTriangle className="mx-auto mb-4" size={48} />
            <p>ประเภทเอกสารไม่ถูกต้อง: {documentType}</p>
          </div>
        );
    }
  };

  /**
   * สร้าง customer data สำหรับ DocumentHeader
   */
  const getCustomerData = () => {
    console.log("🔍 getCustomerData debug:", {
      documentType,
      hasDocumentData: !!documentData,
      hasCustomer: !!documentData?.customer,
      rawCustomerData: documentData?.customer,
    });

    if (!documentData?.customer) {
      console.warn("❌ No customer data found!");
      return {};
    }

    // ✅ ใช้ customer data ที่ได้จาก data services โดยตรง
    // data services ได้ process override และ format แล้ว
    const result = documentData.customer;

    console.log("✅ Customer data result:", result);

    return result;
  };

  /**
   * 🔥 COMPLETE Print CSS - Copied from PrintInvoice.jsx
   * CSS สำหรับการพิมพ์ - Copy ทั้งหมดจาก PrintInvoice.getDocumentStyles()
   */
  const getPrintStyles = () => {
    return `
      @page {
        size: A4;
        margin: 10mm 15mm 10mm 15mm;
      }
      
      * {
        font-family: 'Prompt', sans-serif !important;
        box-sizing: border-box;
      }
      
      body {
        margin: 0;
        padding: 0;
        color: #333;
        line-height: 1.3;
        font-size: 12px;
      }
      
      .page-break {
        page-break-before: always !important;
        break-before: page !important;
      }
      
      .print-page {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .print-header {
        display: flex;
        justify-content: space-between;
        align-items: stretch;
        margin-bottom: 5px;
        min-height: 100px;
      }

      .print-company-info {
        display: flex;
        align-items: flex-start;
        border-bottom: 4px solid #881f7e;
        padding-bottom: 8px;
        flex: 1;
        box-sizing: border-box;
      }

      .print-company-logo {
        width: 110px;
        height: auto;
        margin-right: 16px;
      }

      .print-company-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 4px;
      }

      .print-company-text {
        font-size: 12px;
        margin: 2px 0;
      }

      .print-document-title {
        width: 256px;
        background-color: #f4bb19 !important;
        padding: 10px;
        text-align: center;
        border-bottom: 4px solid #fbe73a !important;
        display: flex;
        flex-direction: column;
        justify-content: center;
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .print-document-title-text {
        font-size: 22px;
        font-weight: bold;
        color: white !important;
        margin: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* Voucher: ย่อขนาดเฉพาะบรรทัดที่ 2 (VC Number) */
      .voucher-title .print-document-title-text:nth-child(2) {
        color: #777 !important;
        font-size: 16px !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      /* Non Refundable Box */
      .non-refundable-box {
        border: 1px solid #333;
        padding: 5px 12px;
        text-align: left;
        font-size: 13px;
        color: #333;
        border-radius: 4px;
        width: fit-content;
        align-self: flex-start;
        line-height: 1.6;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .non-refundable-box div {
        margin: 1px 0;
      }

      /* Thank You Text */
      .print-thank-you {
        text-align: center;
        font-size: 14px;
        font-style: italic;
        margin-top: 60px;
        color: #333;
      }

      /* Signature area - no logo */
      .print-signature-area {
        height: auto;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-bottom: 1px solid #333;
        width: fit-content;
        margin-left: auto;
        margin-right: auto;
        padding-bottom: 2px;
        min-width: 80px;
      }

      .print-info-section {
        margin: 20px 0;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 12px;
        display: grid;
        grid-template-columns: 5fr 2fr;
        gap: 16px;
      }

      .print-info-row {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 6px;
        margin-bottom: 6px;
        font-size: 12px;
        align-items: start;
      }

      /* Override สำหรับ print-info-invoice - ให้ label แคบลง */
      .print-info-invoice .print-info-row {
        grid-template-columns: 90px 1fr;
      }

      .print-info-label {
        font-weight: bold;
      }

      .print-info-value {
        word-break: normal;
        white-space: normal;
        overflow-wrap: break-word;
      }

      .print-address div {
        margin: 1px 0;
      }

      .print-items-table {
        margin: 18px 0;
      }

      .print-table {
        width: 100%;
        border-collapse: collapse;
        border-top: 1px solid #000;
        border-bottom: 1px solid #000;
      }

      .print-table th {
        background-color: #e5e7eb !important;
        border-top: 1px solid #000;
        border-bottom: 1px solid #000;
        font-weight: bold;
        text-align: center;
        padding: 6px 4px;
        font-size: 12px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .print-th-detail { 
        width: 75%; 
      }
      .print-th-amount { 
        width: 25%; 
        border-left: 1px solid #000; 
      }

      .print-table td {
        padding: 4px;
        font-size: 14px;
        vertical-align: top;
      }

      .print-td-amount {
        text-align: right;
      }

      /* เส้นแบ่งคอลัม - เฉพาะ td ที่ 2 ในแต่ละแถว */
      .print-table td:nth-child(2) {
        border-left: 1px solid #000;
      }

      /* ยกเลิกเส้นซ้ายสุดของตาราง */
      .print-table {
        border-left: none;
      }

      .print-section-header {
        font-weight: bold;
        background-color: transparent;
      }

      .print-section-item {
        padding-left: 30px !important;
      }

      .print-passenger-item {
        padding-left: 30px !important;
      }

      .print-passenger-grid {
        display: grid !important;
        grid-template-columns: 10px minmax(240px, max-content) 40px 30px 80px !important;
        gap: 8px !important;
        align-items: center !important;
      }

      /* เอาการจัดการ text overflow ออก */
      .passenger-name {
        text-align: left !important;
        white-space: nowrap; /* ไม่ให้ขึ้นบรรทัดใหม่ */
      }

      .passenger-index {
        text-align: left !important;
      }

      .passenger-name {
        text-align: left !important;
      }

      .passenger-age {
        text-align: center !important;
      }

      .passenger-ticket {
        text-align: center !important;
      }

      .passenger-code {
        text-align: left !important;
        white-space: nowrap !important;
      }

      /* ใหม่: สำหรับแสดง Airline + Passenger Type */
      .print-airline-row {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding-left: 30px !important;
        padding-right: 8px !important;
      }

      .print-airline-name {
        flex: 1;
        text-align: left;
        white-space: nowrap;
      }

      .print-passenger-type {
        text-align: right;
        min-width: 60px;
      }

      /* Grid Layout สำหรับ Route */
      .print-route-grid {
        display: grid !important;
        grid-template-columns: 40px 40px 200px 100px !important;
        gap: 16px !important;
        align-items: center !important;
      }

      .route-flight {
        text-align: left !important;
      }

      .route-rbd {
        text-align: center !important;
      }

      .route-date {
        text-align: left !important;
      }

      .route-path {
        text-align: left !important;
      }

      .route-time {
        text-align: left !important;
      }

      .print-summary-row {
        border-top: 1px solid #000;
      }

      .print-summary-row td {
        padding: 7px 4px;
      }

      .print-summary-label {
        font-weight: bold;
        text-align: right;
      }

      .print-summary-value {
        font-weight: bold;
        text-align: right;
        padding-right: 8px;
      }

      .print-total-row {
        background-color: #e5e7eb !important;
        border-top: 1px solid #000;
        border-bottom: 1px solid #000;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .print-total-row td {
        padding: 7px 4px;
      }

      .print-bottom-section {
        display: flex;
        justify-content: space-between;
        margin-top: 15px;
        gap: 24px;
      }

      .print-signatures {
        display: flex;
        gap: 32px;
      }

      .print-signature {
        text-align: center;
        font-size: 12px;
        min-width: 120px;
      }

      .print-signature-title {
        font-weight: bold;
        margin-bottom: 20px;
      }

      .print-signature-area {
        border-bottom: 1px solid #333;
        height: auto;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: fit-content;
        margin-left: auto;
        margin-right: auto;
        padding-bottom: 2px;
        min-width: 80px;
      }

      .print-signature-logo {
        width: 40px;
        height: auto;
        opacity: 0.7;
      }

      .print-footer {     
        text-align: right;
        font-size: 12px;
        color: #6b7280;
        padding-top: 30px;
      }
      
      .print-summary-text {
        text-align: left;
        padding-left: 8px;
        font-weight: bold;
      }
      
      .print-total-label-cell {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 4px;
      }

      .print-total-english-text {
        text-align: left;
        font-weight: bold;
        flex: 1;
        margin-left: 4px;
      }
      
      .print-spacer {
        flex: 1;
      }

      /* Voucher specific styles */
      .voucher-passenger-names {
        padding-left: 30px !important;
        line-height: 1.5;
        font-weight: 500;
      }
      
      .voucher-passenger-count {
        margin-top: 8px;
        font-size: 11px;
        color: #666;
        font-style: italic;
      }

      /* Payment Instructions Section */
.deposit-payment-instructions {
  margin-top: 24px;
  margin-bottom: 12px;
  padding: 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: #f9fafb;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* Payment Table - Fixed Column Widths */
.deposit-payment-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.deposit-payment-table td {
  padding: 4px 8px;
}

/* Column 1: Label - Fixed Width */
.payment-label {
  width: 200px;
  font-weight: normal;
  text-align: left;
  white-space: nowrap;
}

/* Column 2: Date - Fixed Width */
.payment-date {
  width: 200px;
  font-weight: bold;
  color: #1f2937;
  text-align: center;
}

/* Column 3: "จำนวน" - Fixed Width */
.payment-amount-label {
  width: 60px;
  font-weight: normal;
  text-align: right;
}

/* Column 4: Amount - Fixed Width */
.payment-amount {
  width: 120px;
  font-weight: bold;
  color: #dc2626;
  font-size: 14px;
  text-align: right;
}

/* Column 5: "บาท" - Fixed Width */
.payment-currency {
  width: 40px;
  font-weight: normal;
  text-align: left;
}

/* Passenger Info Notice - ข้อความใต้กรอบ Payment */
.deposit-passenger-info-notice {
  margin-top: 5px;
  font-size: 14px;
  color: #1e40af !important;
  font-weight: normal;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ===========================================
   Multi PO Receipt Table Styles
   =========================================== */

.multi-po-receipt-table th {
  text-align: center;
  font-size: 12px;
}

/* Column widths */
.multi-po-receipt-table .print-th-no {
  width: 4%;
  text-align: center;
}

.multi-po-receipt-table .print-th-doc-no {
  width: 15%;
  text-align: center;
}

.multi-po-receipt-table .print-th-doc-date {
  width: 14%;
  text-align: center;
}

.multi-po-receipt-table .print-th-airline {
  width: 10%;
  text-align: center;
}

.multi-po-receipt-table .print-th-routing {
  width: 25%;
  text-align: center;
  padding-right: 8px;
}

.multi-po-receipt-table .print-th-payment {
  width: 15%;
  text-align: center;
  border-left: 1px solid #000;
}

/* Cell alignments */
.multi-po-receipt-table .print-td-center {
  text-align: center;
}

.multi-po-receipt-table .print-td-left {
  text-align: left;
  padding-left: 8px;
}

.multi-po-receipt-table .print-td-right {
  text-align: right;
  padding-right: 8px;
}

.multi-po-receipt-table .print-td-amount {
  text-align: right;
  padding-right: 8px;
  padding-left: 8px;
}

/* Override default border for multi-po table */
.multi-po-receipt-table td:nth-child(2) {
  border-left: none;
}

.multi-po-receipt-table td:last-child {
  border-left: 1px solid #000;
}

/* Summary rows alignment - ยกเลิก flex เพราะทำงานไม่ได้กับ colspan */
.multi-po-receipt-table .print-total-row .print-total-label-cell {
  display: table-cell !important;
  padding: 6px 4px;
}

.multi-po-receipt-table .print-total-row .print-total-label-cell::after {
  content: "";
  display: table;
  clear: both;
}

.multi-po-receipt-table .print-total-row .print-total-english-text {
  float: left;
  text-align: left;
  font-weight: bold;
  margin-left: 4px;
}

.multi-po-receipt-table .print-total-row .print-summary-label {
  float: right;
  text-align: right;
  font-weight: bold;
}
    `;
  };

  /**
   * Helper function สำหรับคำนวด zoom scale
   */
  const getZoomScale = (zoomLevel) => {
    switch (zoomLevel) {
      case "fitToWidth":
        return 0.85;
      case "100%":
        return 1.0;
      case "125%":
        return 1.25;
      case "150%":
        return 1.5;
      case "200%":
        return 2.0;
      default:
        return 0.85;
    }
  };

  /**
   * Navigation helpers
   */
  const scrollToPage = (pageNumber) => {
    const pageElement = document.getElementById(`page-${pageNumber}`);
    if (pageElement) {
      pageElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
      setCurrentViewPage(pageNumber);
    }
  };

  const goToNextPage = () => {
    const { totalPages } = calculatePages();
    if (currentViewPage < totalPages) {
      scrollToPage(currentViewPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentViewPage > 1) {
      scrollToPage(currentViewPage - 1);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (event) => {
      if (!isOpen) return;

      if (event.key === "Escape") {
        onClose();
      } else if (event.ctrlKey && event.key === "p") {
        event.preventDefault();
        handlePrint();
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goToPrevPage();
      } else if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        goToNextPage();
      } else if (event.key === "Home") {
        event.preventDefault();
        scrollToPage(1);
      } else if (event.key === "End") {
        event.preventDefault();
        const { totalPages } = calculatePages();
        scrollToPage(totalPages);
      }
    };

    document.addEventListener("keydown", handleKeyboard);
    return () => document.removeEventListener("keydown", handleKeyboard);
  }, [isOpen, onClose, currentViewPage]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Scroll tracking for page navigation
  useEffect(() => {
    const handleScroll = () => {
      const { totalPages } = calculatePages();
      const container = document.querySelector(".print-viewer-content");
      if (!container) return;

      let currentPage = 1;
      for (let i = 1; i <= totalPages; i++) {
        const pageElement = document.getElementById(`page-${i}`);
        if (pageElement) {
          const rect = pageElement.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          if (rect.top <= containerRect.top + containerRect.height / 2) {
            currentPage = i;
          }
        }
      }
      setCurrentViewPage(currentPage);
    };

    const container = document.querySelector(".print-viewer-content");
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [documentData]);

  if (!isOpen) return null;

  const { totalPages, dataPages } = calculatePages();
  const scale = getZoomScale(zoomLevel);

  return (
    <div className="print-viewer-fullscreen">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="text-lg font-semibold text-gray-800">
          {getDocumentNumber()} -{" "}
          {documentData?.customer ? getDisplayCustomerName(documentData) : ""}
        </div>

        <div className="flex items-center gap-4">
          {/* Page Navigation - แสดงเฉพาะเมื่อมีหลายหน้า */}
          {totalPages > 1 && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <button
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={goToPrevPage}
                disabled={currentViewPage === 1}
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft size={16} />
              </button>

              <select
                className="text-sm font-medium text-gray-700 bg-transparent border-0 focus:outline-none cursor-pointer px-2 py-1 rounded hover:bg-gray-100"
                value={currentViewPage}
                onChange={(e) => scrollToPage(parseInt(e.target.value))}
                title="เลือกหน้า"
              >
                {Array.from({ length: totalPages }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    หน้า {i + 1} / {totalPages}
                  </option>
                ))}
              </select>

              <button
                className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                onClick={goToNextPage}
                disabled={currentViewPage === totalPages}
                title="หน้าถัดไป"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1">
            <button
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={() => {
                const currentIndex = ZOOM_OPTIONS.findIndex(
                  (opt) => opt.value === zoomLevel,
                );
                if (currentIndex > 0) {
                  setZoomLevel(ZOOM_OPTIONS[currentIndex - 1].value);
                }
              }}
              disabled={zoomLevel === ZOOM_OPTIONS[0].value}
              title="ซูมออก"
            >
              <ZoomOut size={16} />
            </button>

            <select
              className="mx-1 px-3 py-1.5 text-sm bg-transparent border-0 focus:outline-none text-gray-700 font-medium min-w-[120px] text-center"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(e.target.value)}
              title="ระดับการซูม"
            >
              {ZOOM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-white rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={() => {
                const currentIndex = ZOOM_OPTIONS.findIndex(
                  (opt) => opt.value === zoomLevel,
                );
                if (currentIndex < ZOOM_OPTIONS.length - 1) {
                  setZoomLevel(ZOOM_OPTIONS[currentIndex + 1].value);
                }
              }}
              disabled={
                zoomLevel === ZOOM_OPTIONS[ZOOM_OPTIONS.length - 1].value
              }
              title="ซูมเข้า"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handlePrint}
              disabled={loading || !documentData}
              title="พิมพ์ (Ctrl+P)"
            >
              <Printer size={16} />
              {loading ? "กำลังโหลด..." : "พิมพ์"}
            </button>

            <button
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
              onClick={() => {
                onClose();
                if (window.closeDetailModal) {
                  window.closeDetailModal();
                }
              }}
              title="ปิด (Esc)"
            >
              <X size={16} />
              ปิด
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="print-viewer-content">
        {loading && (
          <div className="print-viewer-loading">
            <Loader2 className="print-viewer-spinner" size={48} />
            <p>กำลังโหลดข้อมูลเอกสาร...</p>
          </div>
        )}

        {error && (
          <div className="print-viewer-error">
            <AlertTriangle className="mx-auto mb-4" size={48} />
            <h3>เกิดข้อผิดพลาด</h3>
            <p>{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mt-4"
            >
              ปิด
            </button>
          </div>
        )}

        {documentData && (
          <div className="print-viewer-document-container">
            <div
              className="print-viewer-paper"
              style={{ transform: `scale(${scale})` }}
            >
              <div className="print-document" ref={printRef}>
                {dataPages.map((pageData, pageIndex) => {
                  const pageNumber = pageIndex + 1;

                  return (
                    <PageContainer
                      key={`page-${pageNumber}`}
                      pageNumber={pageNumber}
                      totalPages={totalPages}
                    >
                      {/* Header - แสดงทุกประเภท (Voucher จะแสดงแค่ Company Header) */}
                      <DocumentHeader
                        documentType={documentType}
                        customerData={getCustomerData()}
                        documentInfo={documentData.invoice || {}}
                        serviceType={
                          documentData.voucherData?.serviceType ||
                          documentData.otherData?.serviceType
                        }
                        isMultiPOReceipt={
                          documentType === "receipt" &&
                          documentData.selectedPOs &&
                          documentData.selectedPOs.length > 0
                        }
                      />

                      {renderTable(pageData)}

                      {/* Footer */}
                      {documentType === "voucher" ? (
                        // Voucher Footer: Non Refundable + Issued by
                        <>
                          <div className="print-bottom-section">
                            <div className="non-refundable-box">
                              <div>
                                - Please present this voucher according to a
                                document
                              </div>
                              <div>
                                &nbsp;&nbsp;for the time to pick up or check in
                              </div>
                              <div>
                                - This voucher is non refundable, Emergecy call
                                063-5153931
                              </div>
                            </div>
                            <div className="print-signatures">
                              <div className="print-signature">
                                <div className="print-signature-title">
                                  Issued by
                                </div>
                                <div className="print-signature-area">
                                  {documentData.updatedByName && (
                                    <div
                                      style={{
                                        fontWeight: 500,
                                        fontSize: "14px",
                                      }}
                                    >
                                      {documentData.updatedByName}
                                    </div>
                                  )}
                                </div>
                                <div className="print-signature-date">
                                  Date:{" "}
                                  {documentData.issueDate
                                    ? (() => {
                                        const date = new Date(
                                          documentData.issueDate,
                                        );
                                        const day = date
                                          .getDate()
                                          .toString()
                                          .padStart(2, "0");
                                        const month = (date.getMonth() + 1)
                                          .toString()
                                          .padStart(2, "0");
                                        const year = date
                                          .getFullYear()
                                          .toString()
                                          .slice(-2);
                                        return `${day}/${month}/${year}`;
                                      })()
                                    : ""}
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        // Other Documents Footer
                        <DocumentFooter
                          documentType={documentType}
                          pageNumber={pageNumber}
                          totalPages={totalPages}
                          updatedByName={documentData.updatedByName}
                          issueDate={documentData.issueDate}
                        />
                      )}
                    </PageContainer>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;
