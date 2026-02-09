import React, { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

const CancelReasonModal = ({
  isOpen,
  onClose,
  onConfirm,
  ticketNumber,
  loading = false,
}) => {
  const [reason, setReason] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (reason.trim()) {
      onConfirm(reason.trim());
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black modal-backdrop flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              ยืนยันการยกเลิก
            </h3>
            <p className="text-sm text-gray-500">Ticket ID: {ticketNumber}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เหตุผลในการยกเลิก <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              rows="4"
              placeholder="กรุณาระบุเหตุผลในการยกเลิก..."
              required
              disabled={loading}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              disabled={loading}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              disabled={loading || !reason.trim()}
            >
              {loading ? "กำลังยกเลิก..." : "ยืนยันการยกเลิก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelReasonModal;
