// src/pages/Sales/deposit/DepositPricingSection.jsx - PHASE 4 COMPLETE

import React from "react";
import TotalSummary from "../common/TotalSummary";
import SaleStyles, { combineClasses } from "../common/SaleStyles";
import { formatNumber, parseInput } from "../common/FormatNumber";

const DepositPricingSection = ({
  formData,
  setFormData,
  pricing,
  extras = [],
  depositAmount,
  setDepositAmount,
  depositPax,
  setDepositPax,
  depositAmount2,
  setDepositAmount2,
  depositPax2,
  setDepositPax2,
  calculateSubtotal,
  calculateVat,
  calculateTotal,
  vatPercent,
  setVatPercent,
  readOnly = false,
}) => {
  const handleDepositAmountChange = (value) => {
    const cleanValue = parseInput(value);
    const amount = parseFloat(cleanValue) || 0;
    setDepositAmount(amount);

    const total = amount * (depositPax || 1);
    setFormData({
      ...formData,
      depositTotal: total,
    });
  };

  const handleDepositPaxChange = (value) => {
    const pax = parseInt(value) || 0;
    setDepositPax(pax);

    const total = (depositAmount || 0) * pax;
    setFormData({
      ...formData,
      depositTotal: total,
    });
  };

  const handleDepositAmount2Change = (value) => {
    const cleanValue = parseInput(value);
    const amount = parseFloat(cleanValue) || 0;
    setDepositAmount2(amount);

    const total = amount * (depositPax2 || 1);
    setFormData({
      ...formData,
      depositTotal2: total,
    });
  };

  const handleDepositPax2Change = (value) => {
    const pax = parseInt(value) || 0;
    setDepositPax2(pax);

    const total = (depositAmount2 || 0) * pax;
    setFormData({
      ...formData,
      depositTotal2: total,
    });
  };

  // ✅ คำนวณ depositTotal
  const depositTotal = (depositAmount || 0) * (depositPax || 1);
  const depositTotal2 = (depositAmount2 || 0) * (depositPax2 || 1);

  // ✅ คำนวณ extras total
  const extrasTotal =
    extras?.reduce(
      (sum, item) => sum + parseFloat(item.total_amount || 0),
      0
    ) || 0;

  // ✅ คำนวณ pricing subtotal (Adult + Child + Infant)
  const pricingSubtotal = calculateSubtotal();

  // ✅ Subtotal before VAT (Pricing + Extras) - ไม่รวม depositTotal
  const subtotalBeforeVat = pricingSubtotal + extrasTotal;

  // ✅ VAT calculation
  const currentVatPercent = parseFloat(formData.vatPercent || vatPercent || 0);
  const vatAmount = (subtotalBeforeVat * currentVatPercent) / 100;

  // ✅ Grand Total (ยอดรวมทั้งหมด)
  const grandTotal = subtotalBeforeVat + vatAmount;

  // ✅ Balance Due (ยอดคงเหลือหลังหัก deposit 1 + deposit 2)
  const totalDeposit = depositTotal + depositTotal2;
  const balanceDue = grandTotal - totalDeposit;

  return (
    <section className="border border-gray-400 rounded-lg self-start overflow-hidden">
      <div className="pt-2">
        {/* Deposit 1 Input Section */}
        <div className="grid grid-cols-14 gap-2 p-1 pl-3 items-center bg-white">
          <div className="col-span-3 gap-2">
            <span className="col-span-1 font-medium">Deposit 1</span>
          </div>
          <div className="col-span-1"></div>
          <div className="col-span-4">
            <input
              type="text"
              min="0"
              step="1"
              className={combineClasses(
                "w-full border border-gray-400 text-right rounded-md p-2 focus:ring-blue-500 focus:border-blue-500",
                readOnly ? "bg-gray-50 cursor-not-allowed" : ""
              )}
              placeholder="0"
              value={formatNumber(depositAmount) || ""}
              onChange={(e) => handleDepositAmountChange(e.target.value)}
              readOnly={readOnly}
            />
          </div>
          <div className="col-span-2">
            <input
              type="number"
              min="0"
              className={combineClasses(
                "w-full border border-gray-400 text-center rounded-md p-2 focus:ring-blue-500 focus:border-blue-500",
                readOnly ? "bg-gray-50 cursor-not-allowed" : ""
              )}
              placeholder="0"
              value={depositPax || ""}
              onChange={(e) => handleDepositPaxChange(e.target.value)}
              readOnly={readOnly}
            />
          </div>
          <div className="col-span-4">
            <input
              type="text"
              className="w-full border border-gray-400 text-right rounded-md p-2 bg-gray-100"
              placeholder="0"
              value={formatNumber(depositTotal) || ""}
              readOnly
            />
          </div>
        </div>

        {/* Deposit 2 Input Section */}
        <div className="grid grid-cols-14 gap-2 p-1 pl-3 items-center bg-white">
          <div className="col-span-3 gap-2">
            <span className="col-span-1 font-medium">Deposit 2</span>
          </div>
          <div className="col-span-1"></div>
          <div className="col-span-4">
            <input
              type="text"
              min="0"
              step="1"
              className={combineClasses(
                "w-full border border-gray-400 text-right rounded-md p-2 focus:ring-blue-500 focus:border-blue-500",
                readOnly ? "bg-gray-50 cursor-not-allowed" : ""
              )}
              placeholder="0"
              value={formatNumber(depositAmount2) || ""}
              onChange={(e) => handleDepositAmount2Change(e.target.value)}
              readOnly={readOnly}
            />
          </div>
          <div className="col-span-2">
            <input
              type="number"
              min="0"
              className={combineClasses(
                "w-full border border-gray-400 text-center rounded-md p-2 focus:ring-blue-500 focus:border-blue-500",
                readOnly ? "bg-gray-50 cursor-not-allowed" : ""
              )}
              placeholder="0"
              value={depositPax2 || ""}
              onChange={(e) => handleDepositPax2Change(e.target.value)}
              readOnly={readOnly}
            />
          </div>
          <div className="col-span-4">
            <input
              type="text"
              className="w-full border border-gray-400 text-right rounded-md p-2 bg-gray-100"
              placeholder="0"
              value={formatNumber(depositTotal2) || ""}
              readOnly
            />
          </div>
        </div>

        {/* Total Summary Section */}
        <div className="p-1">
          <div className="w-full">
            <TotalSummary
              subtotal={subtotalBeforeVat}
              total={grandTotal}
              setFormData={setFormData}
              readOnly={readOnly}
              actualVatAmount={vatAmount}
              actualVatPercent={currentVatPercent}
              actualTotal={grandTotal}
              // ✅ เพิ่ม props ใหม่สำหรับ Balance Due
              showBalanceDue={true}
              depositTotal={depositTotal}
              balanceDue={balanceDue}
              config={{
                showBorder: true,
                size: "full",
                align: "left",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default DepositPricingSection;
