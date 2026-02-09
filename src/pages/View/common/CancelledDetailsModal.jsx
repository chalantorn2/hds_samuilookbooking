import React from "react";
import { X, Calendar, User, FileText, CreditCard } from "lucide-react";

const CancelledDetailsModal = ({ isOpen, onClose, cancelledData }) => {
  if (!isOpen || !cancelledData) return null;

  const formatDateTime = (dateTime) => {
    if (!dateTime) return "-";
    return new Date(dateTime).toLocaleString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-black modal-backdrop flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="bg-red-600 px-6 py-4 text-white flex justify-between items-center">
          <h2 className="text-lg font-bold">รายละเอียดการยกเลิก</h2>
          <button onClick={onClose} className="p-1 hover:bg-red-700 rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-800 mb-2">
              ตั๋วเครื่องบิน: {cancelledData.referenceNumber}
            </h3>
            <p className="text-red-600 text-sm">สถานะ: ยกเลิกแล้ว</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">
                  วันเวลาที่ยกเลิก
                </p>
                <p className="text-sm text-gray-600">
                  {formatDateTime(cancelledData.cancelledAt)}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">ยกเลิกโดย</p>
                <p className="text-sm text-gray-600">
                  {cancelledData.cancelledBy || "-"}
                </p>
              </div>
            </div>

            {cancelledData.poNumber && (
              <div className="flex items-start space-x-3">
                <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">PO Number</p>
                  <p className="text-sm text-gray-600">
                    {cancelledData.poNumber}
                  </p>
                  <p className="text-xs text-gray-500">(ออกก่อนการยกเลิก)</p>
                </div>
              </div>
            )}

            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="w-full">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  เหตุผลการยกเลิก
                </p>
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-sm text-gray-700">
                    {cancelledData.cancelReason || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelledDetailsModal;
