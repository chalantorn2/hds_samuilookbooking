// src/components/documents/modals/MultiPOReceiptGenerationModal.jsx
import React, { useState, useEffect } from "react";
import {
  Receipt,
  X,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { useNotification } from "../../../hooks/useNotification";
import { DocumentViewer } from "../../../components/documents";

const MultiPOReceiptGenerationModal = ({
  isOpen,
  onClose,
  onRCGenerated,
  filteredInvoices,
}) => {
  const [availablePOs, setAvailablePOs] = useState([]);
  const [selectedPOs, setSelectedPOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  const { showSuccess, showError, NotificationContainer } = useNotification();

  useEffect(() => {
    if (isOpen) {
      resetModal();
      if (filteredInvoices && filteredInvoices.length > 0) {
        // กรองเฉพาะที่มี PO แล้ว แต่ยังไม่มี RC
        const availableForRC = filteredInvoices.filter(
          (inv) => inv.po_number && !inv.rc_number
        );
        setAvailablePOs(availableForRC);
        setLoadingPOs(false);
      } else {
        fetchAvailablePOs();
      }
    }
  }, [isOpen, filteredInvoices]);

  const resetModal = () => {
    setSelectedPOs([]);
    setError(null);
    setSearchTerm("");
    setGenerating(false);
  };

  const fetchAvailablePOs = async () => {
    try {
      setLoadingPOs(true);
      setError(null);

      const response = await apiClient.post("/gateway.php", {
        action: "getAvailablePOsForRC",
      });

      if (response.success) {
        setAvailablePOs(response.data || []);
      } else {
        throw new Error(response.error || "ไม่สามารถโหลดรายการ INV ได้");
      }
    } catch (err) {
      const errorMessage = err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล";
      setError(errorMessage);
      showError(errorMessage, 5000);
    } finally {
      setLoadingPOs(false);
    }
  };

  const toggleSelectPO = (po) => {
    setSelectedPOs((prev) => {
      const isSelected = prev.find((p) => p.id === po.id);

      // ถ้ายังไม่มีการเลือกเลย ให้เลือกได้
      if (prev.length === 0) {
        return [po];
      }

      // ตรวจสอบ customer ต้องเหมือนกัน
      const firstCustomerId = prev[0].customer_id;
      if (po.customer_id !== firstCustomerId && !isSelected) {
        showError("กรุณาเลือก INV ของ Customer เดียวกันเท่านั้น", 3000);
        return prev;
      }

      if (isSelected) {
        return prev.filter((p) => p.id !== po.id);
      } else {
        return [...prev, po];
      }
    });
  };

  const selectAll = () => {
    const filtered = getFilteredPOs();

    // ถ้ามีการเลือกอยู่แล้ว ให้เลือกเฉพาะที่เป็น customer เดียวกัน
    if (selectedPOs.length > 0) {
      const firstCustomerId = selectedPOs[0].customer_id;
      const sameCustomer = filtered.filter(
        (po) => po.customer_id === firstCustomerId
      );
      setSelectedPOs(sameCustomer);
    } else if (filtered.length > 0) {
      // ถ้ายังไม่มีการเลือก ให้เลือก customer แรก
      const firstCustomerId = filtered[0].customer_id;
      const sameCustomer = filtered.filter(
        (po) => po.customer_id === firstCustomerId
      );
      setSelectedPOs(sameCustomer);
    }
  };

  const deselectAll = () => {
    setSelectedPOs([]);
  };

  const getFilteredPOs = () => {
    let result = searchTerm
      ? availablePOs.filter((po) => {
          const term = searchTerm.toLowerCase();
          return (
            po.po_number?.toLowerCase().includes(term) ||
            po.customer?.code?.toLowerCase().includes(term) ||
            po.customer?.name?.toLowerCase().includes(term) ||
            po.supplier?.code?.toLowerCase().includes(term) ||
            po.supplier?.name?.toLowerCase().includes(term) ||
            po.routingDisplay?.toLowerCase().includes(term)
          );
        })
      : availablePOs;

    // เรียงตาม INV No. จากน้อยไปมาก
    return result.sort((a, b) => {
      const poA = a.po_number || "";
      const poB = b.po_number || "";
      return poA.localeCompare(poB, "th", { numeric: true });
    });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "0";
    return Math.floor(parseFloat(amount)).toLocaleString("th-TH");
  };

  const handleGenerateRC = async () => {
    if (selectedPOs.length === 0) {
      setError("กรุณาเลือก INV อย่างน้อย 1 รายการ");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const primaryTicketId = selectedPOs[0].id;
      const linkedTicketIds = selectedPOs.map((po) => po.id);

      // สร้าง RC เลย
      const response = await apiClient.post("/gateway.php", {
        action: "generateRCForTicket",
        ticketId: primaryTicketId,
        linkedTicketIds: linkedTicketIds, // ⭐ ส่ง array ของ ticket IDs
      });

      if (!response.success) {
        throw new Error(response.error || "ไม่สามารถสร้าง RC ได้");
      }

      // แจ้งผู้ใช้
      showSuccess(`สร้าง RC สำเร็จ: ${response.data.rcNumber}`, 3000);

      // ส่งข้อมูลกลับไปให้ parent เปิด DocumentViewer
      if (onRCGenerated) {
        onRCGenerated({
          ...response.data,
          primaryTicketId: primaryTicketId,
        });
      }

      // ปิด modal
      onClose();
    } catch (err) {
      showError(err.message, 5000);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  const filteredPOs = getFilteredPOs();

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
              <Receipt size={20} className="mr-2" />
              สร้าง RC จากหลาย INV
            </h1>
            <button
              className="p-2 hover:bg-blue-700 rounded-full transition-colors"
              onClick={onClose}
              disabled={generating}
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Select POs Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">
                เลือก INV ที่ต้องการรวม RC
              </h2>

              {/* Search */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="ค้นหา INV No, Customer, Supplier, Routing..."
                  className="w-full px-3 py-2 border rounded-md"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Select Actions */}
              <div className="mb-3 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  เลือกแล้ว: {selectedPOs.length} รายการ
                  {selectedPOs.length > 0 && (
                    <span className="ml-2 text-blue-600 font-medium">
                      ({selectedPOs[0].customer?.name})
                    </span>
                  )}
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

              {/* PO List */}
              <div className="border rounded-md max-h-96 overflow-y-auto">
                {loadingPOs ? (
                  <div className="p-4 text-center text-gray-500">
                    กำลังโหลด...
                  </div>
                ) : error && availablePOs.length === 0 ? (
                  <div className="p-4 text-center">
                    <AlertTriangle className="inline-block text-red-500 mb-2" />
                    <p className="text-red-600">{error}</p>
                    <button
                      onClick={fetchAvailablePOs}
                      className="mt-2 text-blue-600 hover:underline"
                    >
                      ลองใหม่
                    </button>
                  </div>
                ) : filteredPOs.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    ไม่พบ INV ที่พร้อมออก RC
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                          เลือก
                        </th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                          INV No.
                        </th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                          Customer
                        </th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                          Supplier
                        </th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                          Routing
                        </th>
                        <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                          Pax
                        </th>
                        <th
                          className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase"
                          style={{ paddingRight: "2rem" }}
                        >
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredPOs.map((po) => {
                        const isSelected = selectedPOs.find(
                          (p) => p.id === po.id
                        );
                        const isDisabled =
                          selectedPOs.length > 0 &&
                          po.customer_id !== selectedPOs[0].customer_id;

                        return (
                          <tr
                            key={po.id}
                            onClick={() => !isDisabled && toggleSelectPO(po)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-blue-50 hover:bg-blue-100"
                                : isDisabled
                                ? "bg-gray-100 cursor-not-allowed opacity-50"
                                : "hover:bg-gray-100"
                            }`}
                          >
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                checked={!!isSelected}
                                disabled={isDisabled}
                                onChange={() => {}}
                                className="h-4 w-4 pointer-events-none"
                              />
                            </td>
                            <td className="px-2 py-2 text-sm font-medium text-blue-600">
                              {po.po_number}
                            </td>
                            <td className="px-2 py-2 text-sm text-center">
                              {po.customer?.code || "-"}
                            </td>
                            <td className="px-2 py-2 text-sm text-center">
                              {po.supplier?.code || "-"}
                            </td>
                            <td className="px-2 py-2 text-sm">
                              {po.routingDisplay || "-"}
                            </td>
                            <td className="px-2 py-2 text-sm text-left">
                              {po.passengersDisplay || "-"}
                            </td>
                            <td
                              className="px-2 py-2 text-sm text-right"
                              style={{ paddingRight: "2rem" }}
                            >
                              ฿{formatCurrency(po.total_amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Summary */}
              {selectedPOs.length > 0 && (
                <div className="mt-4 bg-gray-50 p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">จำนวน INV:</span>
                      <span className="ml-2 font-medium">
                        {selectedPOs.length} รายการ
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 text-lg">
                        ยอดรวมทั้งหมด:
                      </span>
                      <span className="ml-2 font-bold text-blue-600 text-xl">
                        ฿
                        {formatCurrency(
                          selectedPOs.reduce(
                            (sum, po) =>
                              sum + (parseFloat(po.total_amount) || 0),
                            0
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex items-start">
                  <AlertTriangle className="text-red-400 mr-2 mt-1" size={16} />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t flex justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
              disabled={generating}
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleGenerateRC}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={selectedPOs.length === 0 || generating}
            >
              {generating ? (
                <>
                  <Loader className="animate-spin mr-2" size={16} />
                  กำลังสร้าง RC...
                </>
              ) : (
                <>
                  <Receipt size={16} className="mr-2" />
                  สร้าง Receipt ({selectedPOs.length} INV)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default MultiPOReceiptGenerationModal;
