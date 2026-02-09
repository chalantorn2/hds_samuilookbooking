import React from "react";
import {
  X,
  Printer,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Zoom options ที่รองรับ
const ZOOM_OPTIONS = [
  { value: "fitToWidth", label: "Fit to Width" },
  { value: "100%", label: "100%" },
  { value: "125%", label: "125%" },
  { value: "150%", label: "150%" },
  { value: "200%", label: "200%" },
];

/**
 * DocumentToolbar - Shared toolbar component สำหรับทุกประเภทเอกสาร
 * เก็บ functionality เดิมจาก PrintInvoice ทั้งหมด
 */
const DocumentToolbar = ({
  // Document info
  documentType = "invoice",
  documentNumber = "",
  customerName = "",

  // Zoom controls
  zoomLevel = "fitToWidth",
  onZoomChange = () => {},

  // Page navigation
  currentPage = 1,
  totalPages = 1,
  onPageChange = () => {},

  // Actions
  onPrint = () => {},
  onClose = () => {},
  loading = false,
}) => {
  // Title สำหรับแต่ละประเภทเอกสาร
  const getDocumentTitle = () => {
    const titles = {
      invoice: "Invoice",
      receipt: "Receipt",
      voucher: "Voucher",
    };
    return titles[documentType] || "Document";
  };

  // Navigation helpers
  const goToPrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Zoom helpers
  const zoomIn = () => {
    const currentIndex = ZOOM_OPTIONS.findIndex(
      (opt) => opt.value === zoomLevel
    );
    if (currentIndex < ZOOM_OPTIONS.length - 1) {
      onZoomChange(ZOOM_OPTIONS[currentIndex + 1].value);
    }
  };

  const zoomOut = () => {
    const currentIndex = ZOOM_OPTIONS.findIndex(
      (opt) => opt.value === zoomLevel
    );
    if (currentIndex > 0) {
      onZoomChange(ZOOM_OPTIONS[currentIndex - 1].value);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
      {/* Document Title */}
      <div className="text-lg font-semibold text-gray-800">
        {documentNumber} - {customerName}
      </div>

      <div className="flex items-center gap-4">
        {/* Page Navigation - แสดงเฉพาะเมื่อมีหลายหน้า */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <button
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              title="หน้าก่อนหน้า"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page Selector Dropdown */}
            <select
              className="text-sm font-medium text-gray-700 bg-transparent border-0 focus:outline-none cursor-pointer px-2 py-1 rounded hover:bg-gray-100"
              value={currentPage}
              onChange={(e) => onPageChange(parseInt(e.target.value))}
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
              disabled={currentPage === totalPages}
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
            onClick={zoomOut}
            disabled={zoomLevel === ZOOM_OPTIONS[0].value}
            title="ซูมออก"
          >
            <ZoomOut size={16} />
          </button>

          <select
            className="mx-1 px-3 py-1.5 text-sm bg-transparent border-0 focus:outline-none text-gray-700 font-medium min-w-[120px] text-center"
            value={zoomLevel}
            onChange={(e) => onZoomChange(e.target.value)}
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
            onClick={zoomIn}
            disabled={zoomLevel === ZOOM_OPTIONS[ZOOM_OPTIONS.length - 1].value}
            title="ซูมเข้า"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onPrint}
            disabled={loading}
            title="พิมพ์ (Ctrl+P)"
          >
            <Printer size={16} />
            {loading ? "กำลังพิมพ์..." : "พิมพ์"}
          </button>

          <button
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-gray-200 text-white font-medium rounded-lg transition-colors"
            onClick={onClose}
            title="ปิด (Esc)"
          >
            <X size={16} />
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentToolbar;
