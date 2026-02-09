import React, { useState, useEffect } from "react";
import { X, DollarSign, Calendar, FileText } from "lucide-react";
import { formatCurrency, formatDateOnly } from "../../../utils/helpers";

const PaymentStatusModal = ({ isOpen, onClose, booking, onUpdate }) => {
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentDetails, setPaymentDetails] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState("");

  useEffect(() => {
    if (booking) {
      setPaymentStatus(booking.payment_status || "pending");
      setPaidAmount(booking.total_sales || 0);
      setPaymentDate(formatDateOnly(new Date()));
      setPaymentMethod("");
      setPaymentDetails("");
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const paymentData = {
      booking_type: booking.booking_type,
      booking_id: booking.booking_id,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      payment_details: paymentDetails,
      paid_amount: paidAmount,
      payment_date: paymentDate,
    };

    onUpdate(paymentData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <DollarSign size={24} className="mr-2 text-blue-500" />
            Payment Status
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Booking Info */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Reference Number:</span>
              <span className="ml-2 font-medium text-gray-900">
                {booking.reference_number}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Date:</span>
              <span className="ml-2 font-medium text-gray-900">
                {formatDateOnly(booking.date)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Customer:</span>
              <span className="ml-2 font-medium text-gray-900">
                {booking.customer_code} - {booking.customer}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Total Amount:</span>
              <span className="ml-2 font-medium text-blue-600">
                {formatCurrency(booking.total_sales)}
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Status *
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            {/* Payment Method */}
            {(paymentStatus === "paid" || paymentStatus === "partial") && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select payment method</option>
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Paid Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paid Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={booking.total_sales}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Payment Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Details
                  </label>
                  <textarea
                    value={paymentDetails}
                    onChange={(e) => setPaymentDetails(e.target.value)}
                    rows={3}
                    placeholder="Enter payment details (e.g., bank name, transaction ID, check number, etc.)"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Update Payment Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentStatusModal;
