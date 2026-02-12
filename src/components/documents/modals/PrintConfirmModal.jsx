// src/components/documents/modals/PrintConfirmModal.jsx
import React from "react";
import { Printer, X, AlertTriangle } from "lucide-react";

/**
 * PrintConfirmModal - Universal confirmation modal for all document types
 * รองรับ PO (Invoice), RC (Receipt), VC (Voucher)
 * ใช้ UI format เดียวกับ src/pages/View/common/PrintConfirmModal.jsx
 */
const PrintConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,

  // Document type และข้อความ
  documentType = "invoice", // "invoice", "receipt", "voucher"
  title,
  message,
  confirmText,
  loadingText,

  // Custom props (เก็บไว้เพื่อ backward compatibility)
  customTitle,
  customMessage,
  customConfirmText,
  customLoadingText,
}) => {
  if (!isOpen) return null;

  // Configuration สำหรับแต่ละประเภทเอกสาร
  const getDocumentConfig = () => {
    const configs = {
      invoice: {
        title: "ยืนยันการออกใบแจ้งหนี้",
        message:
          "คุณต้องการออกใบแจ้งหนี้นี้หรือไม่? การออกใบแจ้งหนี้จะถือเป็นการออกเลข INV Number",
        confirmText: "ออกใบแจ้งหนี้",
        loadingText: "กำลังสร้าง INV...",
      },
      receipt: {
        title: "ยืนยันการออกใบเสร็จรับเงิน",
        message:
          "คุณต้องการออก ใบเสร็จรับเงิน นี้หรือไม่? การออกใบเสร็จรับเงินจะถือเป็นการออกเลข RC Number",
        confirmText: "ออกใบเสร็จ",
        loadingText: "กำลังสร้าง RC...",
      },
      voucher: {
        title: "ยืนยันการออกวาวเชอร์",
        message:
          "คุณต้องการออกวาวเชอร์นี้หรือไม่? การออกวาวเชอร์จะถือเป็นการออกเลข VC Number",
        confirmText: "ออกวาวเชอร์",
        loadingText: "กำลังสร้าง VC...",
      },
      deposit: {
        title: "ยืนยันการออกใบมัดจำ",
        message:
          "คุณต้องการออกใบมัดจำนี้หรือไม่? สถานะจะเปลี่ยนเป็น 'ออก Deposit แล้ว'",
        confirmText: "ออกใบมัดจำ",
        loadingText: "กำลังสร้างเอกสาร...",
      },
    };

    return configs[documentType] || configs.invoice;
  };

  const config = getDocumentConfig();

  // ใช้ custom props หรือ config default
  const displayTitle = customTitle || title || config.title;
  const displayMessage = customMessage || message || config.message;
  const displayConfirmText =
    customConfirmText || confirmText || config.confirmText;
  const displayLoadingText =
    customLoadingText || loadingText || config.loadingText;

  return (
    <div className="fixed inset-0 modal-backdrop bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              {displayTitle}
            </h3>
          </div>
        </div>
        <div className="mb-6">
          <p className="text-sm text-gray-500">{displayMessage}</p>
        </div>

        <div className="flex justify-end mt-6 space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            disabled={loading}
          >
            ยกเลิก
          </button>

          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            disabled={loading}
          >
            <Printer size={16} className="mr-2" />
            {loading ? displayLoadingText : displayConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintConfirmModal;
