// src/components/documents/email/EmailDocument.jsx
import React, { useState, useEffect } from "react";
import {
  Mail,
  X,
  Send,
  FileText,
  Eye,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { sendDocumentEmail } from "./EmailService";
import { generateInvoicePDF } from "../generators/InvoicePDFGenerator";
import { generateReceiptPDFSafely } from "../generators/ReceiptPDFGenerator";
import { generateMultiPOReceiptPDFSafely } from "../generators/MultiPOReceiptPDFGenerator";
import { generateVoucherPDFSafely } from "../generators/VoucherPDFGenerator";
import { generateDepositPDFSafely } from "../generators/DepositPDFGenerator";
import { getInvoiceData } from "../services/documentDataMapper";
import { getReceiptDataForPrint } from "../services/receiptDataService";
import { getVoucherData } from "../services/voucherDataService";
import { getDepositData } from "../services/depositDataService";
import { useNotification } from "../../../hooks/useNotification";

const EmailDocument = ({
  isOpen,
  onClose,
  documentType = "invoice", // "invoice", "receipt", "voucher"
  recordId, // ticketId หรือ voucherId
  receiptData = null, // สำหรับ receipt เท่านั้น
  onEmailSent,
  userId = null, // ✅ เพิ่ม userId สำหรับ Activity Log
}) => {
  const [formData, setFormData] = useState({
    to: "",
    subject: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [error, setError] = useState(null);
  const [pdfBase64, setPdfBase64] = useState(null);
  const [pdfReady, setPdfReady] = useState(false);
  const [sendWithoutPDF, setSendWithoutPDF] = useState(false);
  const [pdfGenerationAttempts, setPdfGenerationAttempts] = useState(0);
  const [documentData, setDocumentData] = useState(null);
  const { showSuccess, showError, NotificationContainer } = useNotification();
  const MAX_PDF_ATTEMPTS = 3;

  useEffect(() => {
    if (isOpen && recordId) {
      // Reset states
      setPdfBase64(null);
      setPdfReady(false);
      setError(null);
      setSendWithoutPDF(false);
      setPdfGenerationAttempts(0);

      fetchDocumentData();
    }
  }, [isOpen, documentType, recordId, receiptData]);

  /**
   * ดึงข้อมูลเอกสารตาม documentType
   */
  const fetchDocumentData = async () => {
    try {
      setError(null);
      let result;

      console.log(`Fetching ${documentType} data:`, {
        documentType,
        recordId,
        hasReceiptData: !!receiptData,
      });

      switch (documentType) {
        case "invoice":
          if (!recordId) throw new Error("ต้องระบุ ticketId สำหรับ Invoice");
          result = await getInvoiceData(recordId);
          break;

        case "receipt":
          if (!recordId) throw new Error("ต้องระบุ ticketId สำหรับ Receipt");
          result = await getReceiptDataForPrint(recordId, receiptData);
          break;

        case "voucher":
          if (!recordId) throw new Error("ต้องระบุ voucherId สำหรับ Voucher");
          result = await getVoucherData(recordId);
          break;

        case "deposit":
          if (!recordId) throw new Error("ต้องระบุ depositId สำหรับ Deposit");
          result = await getDepositData(recordId);
          break;

        default:
          throw new Error(`ประเภทเอกสารไม่ถูกต้อง: ${documentType}`);
      }

      if (result.success) {
        setDocumentData(result.data);

        // เติมข้อมูล form
        setFormData({
          to: result.data.customer?.email || "",
          subject: generateDefaultEmailSubject(result.data, documentType),
          message: generateDefaultEmailContent(result.data, documentType),
        });

        // สร้าง PDF
        generatePDF(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  /**
   * สร้าง PDF ตาม documentType
   */
  const generatePDF = async (data) => {
    setIsGeneratingPDF(true);
    setError(null);
    setPdfReady(false);

    try {
      console.log(`Starting ${documentType} PDF generation...`);
      let result;

      switch (documentType) {
        case "invoice":
          const pdfBase64 = await generateInvoicePDF(data, recordId);
          result = { success: true, pdfBase64 };
          break;

        case "receipt":
          // ✅ เช็คว่าเป็น Multi INV Receipt หรือไม่
          if (data.selectedPOs && data.selectedPOs.length > 0) {
            result = await generateMultiPOReceiptPDFSafely(data, recordId);
          } else {
            result = await generateReceiptPDFSafely(data, recordId);
          }
          break;

        case "voucher":
          result = await generateVoucherPDFSafely(data, recordId);
          break;

        case "deposit":
          result = await generateDepositPDFSafely(data, recordId);
          break;

        default:
          throw new Error(`ไม่รองรับการสร้าง PDF สำหรับ: ${documentType}`);
      }

      if (result.success) {
        setPdfBase64(result.pdfBase64);
        setPdfReady(true);
        setPdfGenerationAttempts(0);
        console.log(`${documentType} PDF generated successfully`);
      } else {
        throw new Error(result.error || result.message);
      }
    } catch (err) {
      const currentAttempts = pdfGenerationAttempts + 1;
      setPdfGenerationAttempts(currentAttempts);

      console.error(`${documentType} PDF generation failed:`, err);

      if (currentAttempts < MAX_PDF_ATTEMPTS) {
        setError(
          `การสร้าง PDF ล้มเหลว (ครั้งที่ ${currentAttempts}/${MAX_PDF_ATTEMPTS}): ${err.message}`
        );
      } else {
        setError(
          `ไม่สามารถสร้าง PDF ได้หลังจากพยายาม ${MAX_PDF_ATTEMPTS} ครั้ง: ${err.message}`
        );
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const retryPDFGeneration = () => {
    if (documentData) {
      generatePDF(documentData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // แยกอีเมลด้วย comma และตรวจสอบแต่ละอีเมล
    const emails = email
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emails.length === 0) {
      return false;
    }

    // ตรวจสอบว่าทุกอีเมลถูกต้อง
    return emails.every((e) => emailRegex.test(e));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.to.trim()) {
      setError("กรุณากรอกอีเมลผู้รับ");
      return;
    }

    if (!isValidEmail(formData.to)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบ");
      return;
    }

    if (!sendWithoutPDF && !pdfReady) {
      setError("PDF ยังไม่พร้อม กรุณารอสักครู่ หรือเลือกส่งโดยไม่แนบไฟล์");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const emailData = {
        to: formData.to,
        subject: formData.subject,
        message: formData.message,
        documentType: documentType,
        documentId: recordId, // ✅ เพิ่มเพื่ออัพเดต rc_email_sent
        documentNumber: getDocumentNumber(),
        pdfBase64: sendWithoutPDF ? null : pdfBase64,
        documentData: documentData,
        // ✅ เพิ่มข้อมูลสำหรับ Activity Log (ใช้เลขเอกสาร PO, VC, RC, DP)
        referenceNumber: getDocumentReferenceNumber(),
        userId: userId,
      };

      const result = await sendDocumentEmail(emailData);

      if (result.success) {
        showSuccess(result.message, 6000);

        setTimeout(() => {
          if (onEmailSent) {
            onEmailSent(result.message);
          }
          onClose();
        }, 3000);
      } else {
        showError(result.message, 6000);
        setError(result.message);
      }
    } catch (err) {
      const errorMessage = `เกิดข้อผิดพลาด: ${err.message || "ไม่ทราบสาเหตุ"}`;
      showError(errorMessage, 6000);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewPDF = () => {
    if (!pdfBase64) return;

    try {
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError("ไม่สามารถเปิด PDF ได้");
    }
  };

  /**
   * สร้างหัวข้ออีเมลเริ่มต้น
   */
  const generateDefaultEmailSubject = (data, docType) => {
    const docNames = {
      invoice: "ใบแจ้งหนี้",
      receipt: "ใบเสร็จรับเงิน",
      voucher: "Voucher",
      deposit: "ใบมัดจำ",
    };

    const docName = docNames[docType] || "เอกสาร";
    const docNumber = getDocumentNumber(data);

    return `${docName}${
      docNumber ? ` ${docNumber}` : ""
    } จาก บริษัท สมุย ลุค จำกัด`;
  };

  /**
   * สร้างเนื้อหาอีเมลเริ่มต้น
   */
  /**
   * สร้างเนื้อหาอีเมลเริ่มต้น
   */
  const generateDefaultEmailContent = (data, docType) => {
    if (!data) return "";

    const docNames = {
      invoice: "ใบแจ้งหนี้",
      receipt: "Receipt",
      voucher: "Voucher",
      deposit: "ใบมัดจำ", // ⭐ เพิ่มบรรทัดนี้
    };

    const docName = docNames[docType] || "เอกสาร";
    const customerName = data.customer?.name || "ลูกค้า";
    const docNumber = getDocumentNumber(data);

    // ⭐ เพิ่ม case พิเศษสำหรับ Deposit
    if (docType === "deposit") {
      return `เรียน ${customerName}

บริษัท สมุย ลุค จำกัด ขอส่ง${docName} ดังรายละเอียดต่อไปนี้:

เลขที่: ${docNumber || ""}
วันที่: ${data.invoice?.date || ""}

รายละเอียด:
- สายการบิน: ${data.flights?.supplierName || "-"}
- เส้นทาง: ${data.flights?.routeDisplay || "-"}
- จำนวนเงินรวม: ฿${formatCurrency(data.summary?.total || 0)}

${
  data.depositInfo?.depositDueDate
    ? `
กรุณาชำระเงินมัดจำ ฿${formatCurrency(
        data.depositInfo?.depositAmount || 0
      )} ภายในวันที่ ${data.depositInfo.depositDueDate}
`
    : ""
}

${
  data.depositInfo?.fullPaymentDueDate
    ? `
กรุณาชำระเงินทั้งหมด ฿${formatCurrency(
        data.depositInfo?.fullPaymentAmount || 0
      )} ภายในวันที่ ${data.depositInfo.fullPaymentDueDate}
`
    : ""
}

${
  data.depositInfo?.passengerInfoDueDate
    ? `
*** กรุณาแจ้งชื่อผู้โดยสารก่อนวันที่ ${data.depositInfo.passengerInfoDueDate} ***
`
    : ""
}

กรุณาตรวจสอบรายละเอียดในไฟล์แนบ

หากมีข้อสงสัยกรุณาติดต่อกลับ

ขอบคุณที่ใช้บริการ
บริษัท สมุย ลุค จำกัด
โทร 077-950550
อีเมล samuilook@yahoo.com, usmlook@ksc.th.com`;
    }

    // Default message สำหรับเอกสารอื่นๆ
    return `เรียน ${customerName}

บริษัท สมุย ลุค จำกัด ขอส่ง${docName} ดังรายละเอียดต่อไปนี้:

เลขที่: ${docNumber || ""}
วันที่: ${data.invoice?.date || ""}
${docType === "invoice" ? `วันครบกำหนด: ${data.invoice?.dueDate || ""}` : ""}

${
  data.passengers?.filter((p) => p.hasData).length > 0
    ? `
รายการผู้โดยสาร:
${data.passengers
  .filter((p) => p.hasData)
  .map(
    (p) =>
      `- ${p.displayData.index} ${p.displayData.name} ${p.displayData.age} ${p.displayData.ticketNumber} ${p.displayData.ticketCode}`
  )
  .join("\n")}`
    : ""
}

${
  data.flights?.routeDisplay
    ? `
เส้นทางการเดินทาง:
- ${data.flights.routeDisplay}`
    : ""
}

${
  data.summary?.total
    ? `
จำนวนเงินรวมทั้งสิ้น: ${formatCurrency(data.summary.total)} บาท`
    : ""
}

${
  docType === "invoice" ? "กรุณาชำระเงิน ภายในกำหนดเวลา " : ""
}หากมีข้อสงสัยกรุณาติดต่อกลับ

ขอบคุณที่ใช้บริการ
บริษัท สมุย ลุค จำกัด
โทร 077-950550
อีเมล samuilook@yahoo.com, usmlook@ksc.th.com`;
  };

  /**
   * ดึงเลขที่เอกสาร
   */
  const getDocumentNumber = (data = documentData) => {
    if (!data?.invoice) return "";

    switch (documentType) {
      case "invoice":
        return data.invoice.poNumber || "";
      case "receipt":
        return data.invoice.poNumber || "";
      case "voucher":
        return data.invoice.vcNumber || "";
      case "deposit":
        return data.invoice.dpNumber || "";
      default:
        return "";
    }
  };

  /**
   * ฟังก์ชันสำหรับหาเลขเอกสารที่ถูกต้องสำหรับ Activity Log
   */
  const getDocumentReferenceNumber = (data = documentData) => {
    if (!data?.invoice) return null;

    switch (documentType) {
      case "invoice":
        return data.invoice.poNumber || null;
      case "receipt":
        return data.invoice.rcNumber || null;
      case "voucher":
        return data.invoice.vcNumber || null;
      case "deposit":
        return data.invoice.referenceNumber || null; // DP Number
      case "other":
        return data.invoice.vcNumber || null;
      default:
        return null;
    }
  };

  /**
   * จัดรูปแบบตัวเลข
   */
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "0";
    return Math.floor(parseFloat(amount)).toLocaleString("th-TH");
  };

  /**
   * สถานะ PDF
   */
  const getPDFStatusMessage = () => {
    if (isGeneratingPDF) {
      return "กำลังสร้าง PDF...";
    }

    if (pdfReady) {
      return "✓ PDF พร้อมส่ง";
    }

    if (error && pdfGenerationAttempts >= MAX_PDF_ATTEMPTS) {
      return "⚠️ ไม่สามารถสร้าง PDF ได้";
    }

    if (error && pdfGenerationAttempts < MAX_PDF_ATTEMPTS) {
      return `⚠️ กำลังลองใหม่... (${pdfGenerationAttempts}/${MAX_PDF_ATTEMPTS})`;
    }

    return "กำลังเตรียม PDF...";
  };

  const getPDFStatusColor = () => {
    if (isGeneratingPDF) return "text-blue-600";
    if (pdfReady) return "text-green-600";
    if (error) return "text-red-600";
    return "text-gray-600";
  };

  /**
   * ชื่อเอกสารที่แสดงใน UI
   */
  const getDocumentDisplayName = () => {
    const names = {
      invoice: "Invoice",
      receipt: "Receipt",
      voucher: "Voucher",
      deposit: "Deposit",
    };
    return names[documentType] || documentType;
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 9999 }}
      >
        <NotificationContainer />
      </div>
      <div className="fixed inset-0 modal-backdrop bg-black flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center shrink-0">
            <h1 className="text-xl font-bold flex items-center">
              <Mail size={20} className="mr-2" />
              ส่ง {getDocumentDisplayName()} ทางอีเมล
            </h1>
            <button
              className="p-2 hover:bg-blue-700 rounded-full transition-colors"
              title="ปิด"
              onClick={onClose}
              disabled={isLoading}
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6">
              {documentData && (
                <div className="mb-6 bg-blue-50 p-4 rounded-md">
                  <h2 className="font-medium text-gray-800 mb-2 flex items-center">
                    <FileText size={16} className="mr-2" />
                    ข้อมูล {getDocumentDisplayName()}
                  </h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">เลขที่:</span>
                      <span className="ml-2 font-medium">
                        {getDocumentNumber()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">วันที่:</span>
                      <span className="ml-2">{documentData.invoice?.date}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">ลูกค้า:</span>
                      <span className="ml-2">
                        {documentData.customer?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">จำนวนเงิน:</span>
                      <span className="ml-2 font-medium">
                        ฿{formatCurrency(documentData.summary?.total || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex items-start">
                    <AlertTriangle
                      className="text-red-400 mr-2 mt-1 flex-shrink-0"
                      size={16}
                    />
                    <div className="flex-1">
                      <p className="text-red-700 text-sm">{error}</p>
                      {pdfGenerationAttempts < MAX_PDF_ATTEMPTS &&
                        error.includes("PDF") && (
                          <button
                            type="button"
                            onClick={retryPDFGeneration}
                            className="mt-2 text-sm text-red-600 hover:text-red-800 underline flex items-center"
                            disabled={isGeneratingPDF}
                          >
                            <RefreshCw size={14} className="mr-1" />
                            ลองสร้าง PDF ใหม่
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-6 bg-gray-50 p-4 rounded-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <FileText size={16} className="mr-2 text-gray-500" />
                    <span className="text-sm font-medium">ไฟล์แนบ PDF</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isGeneratingPDF && (
                      <div className="flex items-center text-sm text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      </div>
                    )}

                    <span className={`text-sm ${getPDFStatusColor()}`}>
                      {getPDFStatusMessage()}
                    </span>

                    {pdfReady && (
                      <button
                        type="button"
                        onClick={handlePreviewPDF}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm flex items-center transition-colors"
                      >
                        <Eye size={14} className="mr-1" />
                        ดูตัวอย่าง
                      </button>
                    )}

                    {error && pdfGenerationAttempts < MAX_PDF_ATTEMPTS && (
                      <button
                        type="button"
                        onClick={retryPDFGeneration}
                        className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-600 rounded text-sm flex items-center transition-colors"
                        disabled={isGeneratingPDF}
                      >
                        <RefreshCw size={14} className="mr-1" />
                        ลองใหม่
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sendWithoutPDF"
                    checked={sendWithoutPDF}
                    onChange={(e) => setSendWithoutPDF(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="sendWithoutPDF"
                    className="ml-2 text-sm text-gray-700"
                  >
                    ส่งอีเมลโดยไม่แนบไฟล์ PDF
                  </label>
                </div>

                {sendWithoutPDF && (
                  <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                    ⚠️ อีเมลจะถูกส่งโดยไม่มีไฟล์ PDF แนบ
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ถึง (อีเมลผู้รับ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="to"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.to}
                    onChange={handleChange}
                    placeholder="example@email.com (หลายอีเมลคั่นด้วย ,)"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    หัวข้ออีเมล
                  </label>
                  <input
                    type="text"
                    name="subject"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="หัวข้ออีเมล"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ข้อความ
                  </label>
                  <textarea
                    name="message"
                    rows="8"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="ข้อความที่ต้องการส่งให้ลูกค้า"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="bg-gray-50 px-6 py-4 border-t flex justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              disabled={isLoading}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || (!sendWithoutPDF && !pdfReady)}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  กำลังส่ง...
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  ส่งอีเมล
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmailDocument;
