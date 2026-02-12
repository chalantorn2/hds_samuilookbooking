import React, { useState, useEffect } from "react";
import { X, Unlink, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const PaymentDetailModal = ({
  isOpen,
  onClose,
  booking,
  onSave,
  onRefresh,
  onNavigateToMaster,
}) => {
  // State สำหรับเก็บข้อมูลการชำระ 5 ครั้ง (เก็บเฉพาะ date, amount)
  const [payments, setPayments] = useState([
    { payment_date: "", amount: "" },
    { payment_date: "", amount: "" },
    { payment_date: "", amount: "" },
    { payment_date: "", amount: "" },
    { payment_date: "", amount: "" },
  ]);
  const [loading, setLoading] = useState(false);

  // State สำหรับวิธีการชำระเงิน (ใช้เดียวสำหรับทุกครั้ง)
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [bankName, setBankName] = useState("");
  const [cardType, setCardType] = useState("");

  // State สำหรับ Payment Group (Link Multiple POs)
  const [paymentGroupInfo, setPaymentGroupInfo] = useState({
    in_group: false,
    group_id: null,
    is_master: false,
    linked_pos: [],
  });

  // Fetch payment group info
  const fetchPaymentGroupInfo = async () => {
    if (!booking) return;

    try {
      const response = await fetch("https://hds.samuilookbiz.com/api/gateway.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getPaymentGroupInfo",
          booking_type: booking.booking_type,
          booking_id: booking.booking_id,
        }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        setPaymentGroupInfo(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch payment group info:", error);
    }
  };

  // Unlink PO (เฉพาะ Master - จะ Unlink ทั้งกลุ่ม)
  const handleUnlinkPO = async () => {
    if (
      !confirm(
        "ต้องการ Unlink ทุก PO ในกลุ่มหรือไม่?\n(จะรีเซ็ทข้อมูลการชำระของ PO ที่ถูก Link ทั้งหมด)"
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("https://hds.samuilookbiz.com/api/gateway.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unlinkPO",
          booking_type: booking.booking_type,
          booking_id: booking.booking_id,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert("Unlink ทุก PO สำเร็จ");
        await fetchPaymentGroupInfo(); // Refresh group info
        if (onRefresh) onRefresh(); // Refresh report data
      } else {
        alert("เกิดข้อผิดพลาด: " + (result.error || "ไม่สามารถ Unlink PO ได้"));
      }
    } catch (error) {
      console.error("Failed to unlink PO:", error);
      alert("เกิดข้อผิดพลาดในการ Unlink PO");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && booking) {
      // Reset payment group info ก่อน fetch ใหม่
      setPaymentGroupInfo({
        in_group: false,
        group_id: null,
        is_master: false,
        linked_pos: [],
      });

      // Fetch payment group info
      fetchPaymentGroupInfo();

      // Map payment method from backend to frontend format
      const mapPaymentMethod = (backendMethod) => {
        if (!backendMethod) return "cash";

        // Convert to lowercase for comparison
        const method = backendMethod.toLowerCase().trim();

        // Bank Transfer variants
        if (
          method === "banktransfer" ||
          method === "bank_transfer" ||
          method === "transfer"
        ) {
          return "transfer";
        }
        // Credit Card variants
        else if (
          method === "creditcard" ||
          method === "credit_card" ||
          method === "creditcart"
        ) {
          return "credit_card";
        }
        // Cash
        else if (method === "cash") {
          return "cash";
        }
        // Credit (เครดิต)
        else if (method === "credit") {
          return "cash"; // Map to cash for now, or create new button if needed
        }

        // Default to cash
        return "cash";
      };

      // Get default payment method from booking
      const defaultMethod = mapPaymentMethod(
        booking.payment_method_details?.method
      );
      const defaultDetails = booking.payment_method_details?.details || "";

      // Debug log
      console.log("🔍 Payment Method Mapping:", {
        original: booking.payment_method_details?.method,
        mapped: defaultMethod,
        details: defaultDetails,
      });

      // Set payment method (ใช้เดียวสำหรับทุกครั้ง)
      if (
        booking.payment_details &&
        Array.isArray(booking.payment_details) &&
        booking.payment_details.length > 0
      ) {
        // Load จาก payment detail แรก
        const firstPayment = booking.payment_details[0];
        setPaymentMethod(firstPayment.payment_method || defaultMethod);
        setBankName(firstPayment.bank_name || defaultDetails);
        setCardType(firstPayment.card_type || defaultDetails);
      } else {
        // Load จาก booking default
        setPaymentMethod(defaultMethod);
        setBankName(defaultDetails);
        setCardType(defaultDetails);
      }

      // โหลดข้อมูลการชำระที่มีอยู่แล้ว (เก็บเฉพาะ date, amount)
      const emptyPayments = [
        { payment_date: "", amount: "" },
        { payment_date: "", amount: "" },
        { payment_date: "", amount: "" },
        { payment_date: "", amount: "" },
        { payment_date: "", amount: "" },
      ];

      if (
        booking.payment_details &&
        Array.isArray(booking.payment_details) &&
        booking.payment_details.length > 0
      ) {
        const loadedPayments = [...emptyPayments];
        booking.payment_details.forEach((payment, index) => {
          if (index < 5) {
            loadedPayments[index] = {
              payment_date: payment.payment_date || "",
              amount: payment.amount || "",
            };
          }
        });
        setPayments(loadedPayments);
      } else {
        setPayments(emptyPayments);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, booking?.booking_id, booking?.booking_type]);

  // Handler สำหรับอัปเดตข้อมูลการชำระแต่ละครั้ง
  const updatePayment = (index, field, value) => {
    const updatedPayments = [...payments];
    updatedPayments[index] = {
      ...updatedPayments[index],
      [field]: value,
    };
    setPayments(updatedPayments);
  };

  const handleSave = async () => {
    // กรองเฉพาะข้อมูลที่กรอกครบ
    const filledPayments = payments.filter((p) => p.payment_date && p.amount);

    // ตรวจสอบข้อมูลแต่ละครั้งที่กรอก
    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      if (payment.payment_date || payment.amount) {
        if (!payment.payment_date) {
          alert(`ครั้งที่ ${i + 1}: กรุณาเลือกวันที่รับชำระ`);
          return;
        }
        if (!payment.amount) {
          alert(`ครั้งที่ ${i + 1}: กรุณากรอกยอดสุทธิ`);
          return;
        }
      }
    }

    // ตรวจสอบ payment method
    if (paymentMethod === "transfer" && !bankName) {
      alert("กรุณากรอกบัญชีที่รับเงิน");
      return;
    }
    if (paymentMethod === "credit_card" && !cardType) {
      alert("กรุณากรอก Card Type");
      return;
    }

    setLoading(true);

    try {
      // เพิ่ม payment method ลงในแต่ละ payment
      const paymentsWithMethod = filledPayments.map((p) => ({
        payment_date: p.payment_date,
        amount: p.amount,
        payment_method: paymentMethod,
        bank_name: bankName,
        card_type: cardType,
        note: "", // ไม่มีหมายเหตุแล้ว
      }));

      await onSave({
        booking_type: booking.booking_type,
        booking_id: booking.booking_id,
        payments: paymentsWithMethod,
      });

      alert("บันทึกรายละเอียดการชำระเงินสำเร็จ");
      onClose();
    } catch (error) {
      console.error("Failed to save payment details:", error);
      alert("เกิดข้อผิดพลาด: " + (error.message || "ไม่สามารถบันทึกได้"));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Helper function to format payment method display text
  const getPaymentMethodText = () => {
    if (!booking?.payment_method_details) return "ไม่ระบุ";

    const method = booking.payment_method_details.method;
    const details = booking.payment_method_details.details;

    const methodLabels = {
      bankTransfer: "โอนเงินผ่านธนาคาร",
      creditCard: "เครดิตการ์ด",
      cash: "เงินสด",
      credit: "เครดิต",
      cheque: "เช็ค",
      promptpay: "PromptPay",
    };

    const label = methodLabels[method] || method || "ไม่ระบุ";
    return details ? `${label} ${details}` : label;
  };

  return (
    <div className="fixed inset-0 bg-black modal-backdrop flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-blue-500">
          <h2 className="text-lg font-bold text-blue-600">
            กรอกรายละเอียดการรับชำระ
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Booking Info Header */}
        <div className="mb-6 p-4 bg-gray-50 rounded border border-gray-200">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <span className="text-sm font-semibold text-gray-700">
                Ref No:
              </span>
              <span className="text-sm text-gray-600 ml-2">
                {booking?.booking_ref_no}
              </span>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-700">Date:</span>
              <span className="text-sm text-gray-600 ml-2">
                {booking?.create_date
                  ? format(new Date(booking.create_date), "dd/MM/yyyy")
                  : "-"}
              </span>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-700">
                Customer:
              </span>
              <span className="text-sm text-gray-600 ml-2">
                {booking?.customer_code}
              </span>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-700">
                Amount:
              </span>
              <span className="text-sm text-gray-600 ml-2">
                {Number(booking?.total_amount || 0).toLocaleString("th-TH")} THB
              </span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-300">
            <span className="text-sm font-semibold text-gray-700">
              การชำระเงินของลูกค้า:
            </span>
            <span className="text-sm text-gray-600 ml-2">
              {getPaymentMethodText()}
            </span>
          </div>
        </div>

        {/* ถ้าเป็น PO ที่ถูก Link (ไม่ใช่ Master) - แสดงแค่ข้อมูล Master PO */}
        {paymentGroupInfo.in_group && !paymentGroupInfo.is_master && (
          <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded text-center">
            <div className="text-base text-gray-700">
              <span className="font-medium text-blue-700">
                PO นี้ถูก Link กับ:
              </span>
              <div className="mt-3 text-lg font-semibold text-gray-800">
                {paymentGroupInfo.linked_pos
                  .filter((po) => po.is_master)
                  .map((po) => po.booking_ref_no || `PO-${po.booking_id}`)
                  .join(", ") || "Master PO"}
              </div>
              <div className="mt-4 text-sm text-gray-600">
                รายละเอียดการชำระเงินจัดการที่ Master PO
              </div>
              {/* ปุ่มไปที่ Master PO */}
              {onNavigateToMaster && (
                <button
                  onClick={() => {
                    const masterPO = paymentGroupInfo.linked_pos.find(
                      (po) => po.is_master
                    );
                    if (masterPO) {
                      onNavigateToMaster(masterPO);
                    }
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink size={16} />
                  ไปที่ Master PO
                </button>
              )}
            </div>
          </div>
        )}

        {/* ถ้าเป็น Master PO - แสดง Payment Group Info + Unlink Button */}
        {paymentGroupInfo.in_group && paymentGroupInfo.is_master && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm text-gray-700 flex-1">
                <div className="font-medium text-blue-800 mb-2">
                  Linked POs:
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  {(() => {
                    // แบ่ง PO เป็น chunks ของ 3
                    const chunks = [];
                    for (
                      let i = 0;
                      i < paymentGroupInfo.linked_pos.length;
                      i += 4
                    ) {
                      chunks.push(paymentGroupInfo.linked_pos.slice(i, i + 3));
                    }
                    return chunks.map((chunk, chunkIndex) => (
                      <div key={chunkIndex}>
                        {chunk.map((po, index) => {
                          const amount = parseFloat(
                            po.total_amount || po.amount || 0
                          );
                          return (
                            <span key={index}>
                              <span className="font-medium text-black">
                                {po.booking_ref_no || `PO-${po.booking_id}`}:
                              </span>{" "}
                              <span className="font-medium text-gray-700">
                                {amount.toLocaleString("th-TH")}
                              </span>
                              {index < chunk.length - 1 && " | "}
                            </span>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
                <div className="font-semibold text-blue-800 text-base pt-2 border-t border-blue-300 mt-2">
                  รวมทั้งหมด:{" "}
                  {paymentGroupInfo.linked_pos
                    .reduce(
                      (sum, po) =>
                        sum + parseFloat(po.total_amount || po.amount || 0),
                      0
                    )
                    .toLocaleString("th-TH")}{" "}
                  ฿
                </div>
              </div>
              <button
                onClick={handleUnlinkPO}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
              >
                <Unlink size={14} />
                Unlink
              </button>
            </div>
          </div>
        )}

        {/* Payment Form - แสดงเฉพาะ Master PO หรือ PO ที่ไม่อยู่ใน group */}
        {(!paymentGroupInfo.in_group || paymentGroupInfo.is_master) && (
          <>
            {/* Payment Table - แสดง 5 ครั้งพร้อมกัน */}
            <div className="mb-6">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      ครั้งที่
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      วันที่รับชำระ
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">
                      ยอดรับสุทธิ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment, index) => (
                    <tr key={index}>
                      <td className="px-2 py-1 text-sm font-medium text-center text-gray-700">
                        {index + 1}
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="date"
                          value={payment.payment_date}
                          onChange={(e) =>
                            updatePayment(index, "payment_date", e.target.value)
                          }
                          className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          value={payment.amount}
                          onChange={(e) =>
                            updatePayment(index, "amount", e.target.value)
                          }
                          className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                          step="0.01"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* วิธีการชำระเงิน */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                วิธีการชำระเงิน
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentMethod("cash")}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                    paymentMethod === "cash"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  เงินสด
                </button>
                <button
                  onClick={() => setPaymentMethod("transfer")}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                    paymentMethod === "transfer"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  โอนเงิน
                </button>
                <button
                  onClick={() => setPaymentMethod("credit_card")}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                    paymentMethod === "credit_card"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  เครดิตการ์ด
                </button>
              </div>

              {/* รายละเอียดเพิ่มเติม - เงินสด */}
              {paymentMethod === "cash" && (
                <div className="mt-3">
                  <label className="block text-sm text-gray-600 mb-1">
                    หมายเหตุ
                  </label>
                  <textarea
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="หมายเหตุ"
                  />
                </div>
              )}

              {/* รายละเอียดเพิ่มเติม - โอนเงิน */}
              {paymentMethod === "transfer" && (
                <div className="mt-3">
                  <label className="block text-sm text-gray-600 mb-1">
                    หมายเหตุ
                  </label>
                  <textarea
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="หมายเหตุ (เช่น BBL, SCB, KBANK)"
                  />
                </div>
              )}

              {/* รายละเอียดเพิ่มเติม - เครดิตการ์ด */}
              {paymentMethod === "credit_card" && (
                <div className="mt-3">
                  <label className="block text-sm text-gray-600 mb-1">
                    หมายเหตุ
                  </label>
                  <textarea
                    value={cardType}
                    onChange={(e) => setCardType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="หมายเหตุ (เช่น Visa, MasterCard, AMEX, JCB)"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </>
        )}

        {/* ถ้าเป็น PO ที่ถูก Link - แสดงแค่ปุ่มปิด */}
        {paymentGroupInfo.in_group && !paymentGroupInfo.is_master && (
          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              ปิด
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentDetailModal;
