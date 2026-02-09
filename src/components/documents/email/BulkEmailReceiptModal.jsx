// src/components/documents/email/BulkEmailReceiptModal.jsx
import React, { useState, useEffect } from "react";
import {
  Mail,
  X,
  Send,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader,
  Check,
} from "lucide-react";
import { sendBulkReceiptEmail } from "./EmailService";
import { generateReceiptPDFSafely } from "../generators/ReceiptPDFGenerator";
import { generateMultiPOReceiptPDFSafely } from "../generators/MultiPOReceiptPDFGenerator";
import { getReceiptDataForPrint } from "../services/receiptDataService";
import { useNotification } from "../../../hooks/useNotification";
import { apiClient } from "../../../services/apiClient";

const BulkEmailReceiptModal = ({
  isOpen,
  onClose,
  onEmailSent,
  filteredReceipts: initialReceipts,
}) => {
  const [availableReceipts, setAvailableReceipts] = useState([]);
  const [selectedReceipts, setSelectedReceipts] = useState([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    to: "",
    subject: "",
    message: "",
  });

  const [pdfFiles, setPdfFiles] = useState([]);
  const [generatingPDFs, setGeneratingPDFs] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfReady, setPdfReady] = useState(false);

  const { showSuccess, showError, NotificationContainer } = useNotification();

  useEffect(() => {
    if (isOpen) {
      resetModal();
      // ใช้ initialReceipts ถ้ามี ไม่เช่นนั้นถึงเรียก API
      if (initialReceipts && initialReceipts.length > 0) {
        setAvailableReceipts(initialReceipts);
        setLoadingReceipts(false);
      } else {
        fetchAvailableReceipts();
      }
    }
  }, [isOpen, initialReceipts]);

  const resetModal = () => {
    setSelectedReceipts([]);
    setPdfFiles([]);
    setError(null);
    setPdfReady(false);
    setGeneratingPDFs(false);
    setGenerationProgress({});
    setSearchTerm("");
  };

  const fetchAvailableReceipts = async () => {
    try {
      setLoadingReceipts(true);
      setError(null);

      // ✅ ใช้ apiClient แทน fetch
      const response = await apiClient.post("/gateway.php", {
        action: "getAvailableReceipts",
      });

      console.log("✅ Receipts loaded:", response);

      if (response.success) {
        setAvailableReceipts(response.data || []);
      } else {
        throw new Error(response.error || "ไม่สามารถโหลดรายการ Receipt ได้");
      }
    } catch (err) {
      const errorMessage = err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล";
      setError(errorMessage);
      showError(errorMessage, 5000);
      console.error("❌ Fetch error:", err);
    } finally {
      setLoadingReceipts(false);
    }
  };

  const toggleSelectReceipt = (receipt) => {
    setSelectedReceipts((prev) => {
      const isSelected = prev.find((r) => r.id === receipt.id);
      if (isSelected) {
        return prev.filter((r) => r.id !== receipt.id);
      } else {
        return [...prev, receipt];
      }
    });
  };

  const selectAll = () => {
    const filtered = getFilteredReceipts();
    setSelectedReceipts(filtered);
  };

  const deselectAll = () => {
    setSelectedReceipts([]);
  };

  const getFilteredReceipts = () => {
    if (!searchTerm) return availableReceipts;

    const term = searchTerm.toLowerCase();
    return availableReceipts.filter(
      (r) =>
        r.rc_number?.toLowerCase().includes(term) ||
        r.supplier?.code?.toLowerCase().includes(term) ||
        r.supplier?.name?.toLowerCase().includes(term) ||
        r.routingDisplay?.toLowerCase().includes(term) ||
        r.code?.toLowerCase().includes(term)
    );
  };

  const generateAllPDFs = async () => {
    if (selectedReceipts.length === 0) {
      setError("กรุณาเลือก Receipt อย่างน้อย 1 รายการ");
      return;
    }

    setGeneratingPDFs(true);
    setError(null);
    setPdfReady(false);
    setPdfFiles([]);

    const results = [];
    const progress = {};

    for (let i = 0; i < selectedReceipts.length; i++) {
      const receipt = selectedReceipts[i];

      try {
        progress[receipt.id] = "generating";
        setGenerationProgress({ ...progress });

        // Fetch data
        const dataResult = await getReceiptDataForPrint(
          receipt.id,
          receipt.rc_selection_data
        );

        if (!dataResult.success) {
          throw new Error(dataResult.error);
        }

        // Generate PDF
        // ✅ เช็คว่าเป็น Multi PO Receipt หรือไม่
        const pdfResult =
          dataResult.data.selectedPOs && dataResult.data.selectedPOs.length > 0
            ? await generateMultiPOReceiptPDFSafely(dataResult.data, receipt.id)
            : await generateReceiptPDFSafely(dataResult.data, receipt.id);

        if (pdfResult.success) {
          results.push({
            receiptId: receipt.id,
            receiptNumber: receipt.rc_number,
            pdfBase64: pdfResult.pdfBase64,
            filename: `Receipt-${receipt.rc_number}.pdf`,
          });
          progress[receipt.id] = "success";
        } else {
          throw new Error(pdfResult.error);
        }
      } catch (err) {
        console.error(`Failed to generate PDF for ${receipt.rc_number}:`, err);
        progress[receipt.id] = "failed";
        results.push({
          receiptId: receipt.id,
          receiptNumber: receipt.rc_number,
          error: err.message,
        });
      }

      setGenerationProgress({ ...progress });
    }

    setPdfFiles(results);

    const successCount = results.filter((r) => !r.error).length;
    if (successCount === 0) {
      setError("ไม่สามารถสร้าง PDF ได้เลย กรุณาลองใหม่");
      setPdfReady(false);
    } else if (successCount < selectedReceipts.length) {
      setError(
        `สร้าง PDF สำเร็จ ${successCount}/${selectedReceipts.length} ไฟล์`
      );
      setPdfReady(true);
    } else {
      setPdfReady(true);
    }

    setGeneratingPDFs(false);

    // Auto-fill form data
    if (selectedReceipts.length > 0 && selectedReceipts[0].customer?.email) {
      const customerName = selectedReceipts[0].customer?.name || "ลูกค้า";
      const customerEmail = selectedReceipts[0].customer?.email || "";

      const totalAmount = selectedReceipts.reduce(
        (sum, r) => sum + (parseFloat(r.total_amount) || 0),
        0
      );

      setFormData({
        to: customerEmail,
        subject: `ใบเสร็จรับเงิน ${selectedReceipts.length} ฉบับ จาก บริษัท สมุย ลุค จำกัด`,
        message: generateBulkEmailMessage(
          selectedReceipts,
          customerName,
          totalAmount
        ),
      });
    }
  };

  const generateBulkEmailMessage = (receipts, customerName, totalAmount) => {
    const receiptList = receipts
      .map((r) => `- ${r.rc_number} (฿${formatCurrency(r.total_amount || 0)})`)
      .join("\n");

    return `เรียน ${customerName}

บริษัท สมุย ลุค จำกัด ขอส่งใบเสร็จรับเงินจำนวน ${receipts.length} ฉบับ:

${receiptList}

รวมเป็นเงินทั้งสิ้น: ฿${formatCurrency(totalAmount)} บาท

กรุณาตรวจสอบรายละเอียดในไฟล์แนบทั้งหมด ${receipts.length} ไฟล์

หากมีข้อสงสัยกรุณาติดต่อกลับ

ขอบคุณที่ใช้บริการ
บริษัท สมุย ลุค จำกัด
โทร 077-950550
อีเมล samuilook@yahoo.com, usmlook@ksc.th.com`;
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "0";
    return Math.floor(parseFloat(amount)).toLocaleString("th-TH");
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

    if (!formData.to.trim()) {
      setError("กรุณากรอกอีเมลผู้รับ");
      return;
    }

    if (!isValidEmail(formData.to)) {
      setError("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    if (!pdfReady || pdfFiles.length === 0) {
      setError("กรุณาสร้าง PDF ก่อนส่งอีเมล");
      return;
    }

    const validPDFs = pdfFiles.filter((pdf) => !pdf.error);
    if (validPDFs.length === 0) {
      setError("ไม่มี PDF ที่พร้อมส่ง");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const emailData = {
        to: formData.to,
        subject: formData.subject,
        message: formData.message,
        attachments: validPDFs,
        receiptIds: validPDFs.map((pdf) => pdf.receiptId),
      };

      const result = await sendBulkReceiptEmail(emailData);

      if (result.success) {
        showSuccess(result.message, 6000);

        setTimeout(() => {
          if (onEmailSent) {
            onEmailSent(result.message);
          }
          onClose();
        }, 2000);
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

  const getPDFStatusIcon = (receiptId) => {
    const status = generationProgress[receiptId];

    if (status === "generating") {
      return <Loader className="animate-spin text-blue-500" size={16} />;
    } else if (status === "success") {
      return <CheckCircle className="text-green-500" size={16} />;
    } else if (status === "failed") {
      return <XCircle className="text-red-500" size={16} />;
    }
    return null;
  };

  const totalSize = pdfFiles.reduce((sum, pdf) => {
    if (pdf.pdfBase64) {
      return sum + (pdf.pdfBase64.length * 0.75) / 1024 / 1024; // Approximate MB
    }
    return sum;
  }, 0);

  if (!isOpen) return null;

  const filteredReceipts = getFilteredReceipts();

  return (
    <>
      <div
        style={{ position: "fixed", top: "1rem", right: "1rem", zIndex: 9999 }}
      >
        <NotificationContainer />
      </div>

      <div className="fixed inset-0 modal-backdrop bg-black flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center shrink-0">
            <h1 className="text-xl font-bold flex items-center">
              <Mail size={20} className="mr-2" />
              ส่ง Receipt หลายฉบับพร้อมกัน
            </h1>
            <button
              className="p-2 hover:bg-blue-700 rounded-full transition-colors"
              onClick={onClose}
              disabled={isLoading || generatingPDFs}
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 1: Select Receipts */}
            {!pdfReady && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">
                  1. เลือก Receipts ที่ต้องการส่ง
                </h2>

                {/* Search */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="ค้นหา RC No, Supplier, Code, Routing..."
                    className="w-full px-3 py-2 border rounded-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Select Actions */}
                <div className="mb-3 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    เลือกแล้ว: {selectedReceipts.length} รายการ
                  </div>
                  <div className="space-x-2">
                    <button
                      onClick={selectAll}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      เลือกทั้งหมด
                    </button>
                    <button
                      onClick={deselectAll}
                      className="text-sm text-red-600 hover:underline"
                    >
                      ยกเลิกทั้งหมด
                    </button>
                  </div>
                </div>

                {/* Receipt List */}
                <div className="border rounded-md max-h-60 overflow-y-auto">
                  {loadingReceipts ? (
                    <div className="p-4 text-center text-gray-500">
                      กำลังโหลด...
                    </div>
                  ) : error ? (
                    <div className="p-4 text-center">
                      <AlertTriangle className="inline-block text-red-500 mb-2" />
                      <p className="text-red-600">{error}</p>
                      <button
                        onClick={fetchAvailableReceipts}
                        className="mt-2 text-blue-600 hover:underline"
                      >
                        ลองใหม่
                      </button>
                    </div>
                  ) : filteredReceipts.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      ไม่พบ Receipt
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            เลือก
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            RC No.
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            วันที่
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            CUST
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            Sup
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Routing
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            Code
                          </th>
                          <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Amount
                          </th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            Email
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredReceipts.map((receipt) => {
                          const isSelected = selectedReceipts.find(
                            (r) => r.id === receipt.id
                          );

                          // Format date
                          const formatDate = (dateString) => {
                            if (!dateString) return "-";
                            const date = new Date(dateString);
                            return date.toLocaleDateString("th-TH", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "2-digit",
                            });
                          };

                          return (
                            <tr
                              key={receipt.id}
                              onClick={() => toggleSelectReceipt(receipt)}
                              className={`hover:bg-gray-100 cursor-pointer transition-colors ${
                                isSelected ? "bg-blue-50 hover:bg-blue-100" : ""
                              }`}
                            >
                              <td className="px-2 py-2">
                                <input
                                  type="checkbox"
                                  checked={!!isSelected}
                                  onChange={() => {}}
                                  className="h-4 w-4 pointer-events-none"
                                />
                              </td>
                              <td className="px-2 py-2 text-sm font-medium text-blue-600">
                                {receipt.rc_number}
                              </td>
                              <td className="px-2 py-2 text-sm">
                                {formatDate(receipt.rc_generated_at)}
                              </td>
                              <td className="px-2 py-2 text-sm text-center">
                                {receipt.customer?.code || "-"}
                              </td>
                              <td className="px-2 py-2 text-sm text-center">
                                {receipt.supplier?.code || "-"}
                              </td>
                              <td className="px-2 py-2 text-sm">
                                {receipt.routingDisplay || "-"}
                              </td>
                              <td className="px-2 py-2 text-sm text-center">
                                {receipt.code || "-"}
                              </td>
                              <td className="px-2 py-2 text-sm text-right">
                                ฿{formatCurrency(receipt.total_amount)}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {receipt.rc_email_sent === 1 ||
                                receipt.rc_email_sent === "1" ||
                                receipt.rc_email_sent === true ? (
                                  <Check
                                    className="text-green-600 inline-block"
                                    size={16}
                                  />
                                ) : (
                                  <Mail
                                    className="text-gray-400 inline-block"
                                    size={16}
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Generate Button */}
                <div className="mt-4">
                  <button
                    onClick={generateAllPDFs}
                    disabled={selectedReceipts.length === 0 || generatingPDFs}
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {generatingPDFs ? (
                      <>
                        <Loader className="animate-spin mr-2" size={16} />
                        กำลังสร้าง PDF...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2" size={16} />
                        สร้าง PDF ทั้งหมด ({selectedReceipts.length} ไฟล์)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Review PDFs */}
            {pdfReady && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">
                  2. ตรวจสอบไฟล์ PDF
                </h2>

                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">จำนวนไฟล์:</span>
                      <span className="ml-2 font-medium">
                        {pdfFiles.filter((f) => !f.error).length} /{" "}
                        {pdfFiles.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">ขนาดรวม:</span>
                      <span className="ml-2 font-medium">
                        ~{totalSize.toFixed(2)} MB
                      </span>
                    </div>
                  </div>

                  {totalSize > 20 && (
                    <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                      ⚠️ ขนาดไฟล์รวมใหญ่เกิน 20MB อาจส่งไม่สำเร็จ
                    </div>
                  )}
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {pdfFiles.map((pdf) => (
                    <div
                      key={pdf.receiptId}
                      className={`flex items-center justify-between p-2 rounded ${
                        pdf.error ? "bg-red-50" : "bg-green-50"
                      }`}
                    >
                      <div className="flex items-center">
                        {pdf.error ? (
                          <XCircle className="text-red-500 mr-2" size={16} />
                        ) : (
                          <CheckCircle
                            className="text-green-500 mr-2"
                            size={16}
                          />
                        )}
                        <span className="text-sm font-medium">
                          {pdf.filename}
                        </span>
                      </div>
                      {pdf.error && (
                        <span className="text-xs text-red-600">
                          {pdf.error}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Email Form */}
            {pdfReady && (
              <div>
                <h2 className="text-lg font-semibold mb-3">
                  3. ตรวจสอบและส่งอีเมล
                </h2>

                {error && (
                  <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex items-start">
                      <AlertTriangle
                        className="text-red-400 mr-2 mt-1"
                        size={16}
                      />
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ถึง (อีเมลผู้รับ) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="to"
                      className="w-full px-3 py-2 border rounded-md"
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
                      className="w-full px-3 py-2 border rounded-md"
                      value={formData.subject}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ข้อความ
                    </label>
                    <textarea
                      name="message"
                      rows="10"
                      className="w-full px-3 py-2 border rounded-md"
                      value={formData.message}
                      onChange={handleChange}
                      disabled={isLoading}
                    />
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              disabled={isLoading || generatingPDFs}
            >
              ยกเลิก
            </button>

            {pdfReady && (
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading || !pdfReady}
              >
                {isLoading ? (
                  <>
                    <Loader className="animate-spin mr-2" size={16} />
                    กำลังส่ง...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    ส่งอีเมล ({pdfFiles.filter((f) => !f.error).length} ไฟล์)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BulkEmailReceiptModal;
