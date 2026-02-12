import React, { useState, useEffect } from "react";
import { X, Users, Package, Calculator, Receipt } from "lucide-react";

const ReceiptSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  ticketData,
  loading = false,
}) => {
  // State สำหรับผู้โดยสารที่เลือก
  const [selectedPassengers, setSelectedPassengers] = useState([]);

  // State สำหรับ extras ที่เลือก
  const [selectedExtras, setSelectedExtras] = useState([]);

  // State สำหรับการคำนวณราคา
  const [calculatedTotals, setCalculatedTotals] = useState({
    subtotal: 0,
    vatAmount: 0,
    total: 0,
  });

  // เมื่อเปิด modal ให้เลือกผู้โดยสารทั้งหมดเป็นค่าเริ่มต้น
  useEffect(() => {
    if (isOpen && ticketData) {
      // เลือกผู้โดยสารทั้งหมดเป็นค่าเริ่มต้น
      const allPassengers =
        ticketData.tickets_passengers?.map((passenger, index) => ({
          ...passenger,
          originalIndex: index,
          selected: true,
        })) || [];

      setSelectedPassengers(allPassengers);

      // เซ็ต extras เป็นค่าเริ่มต้น (ไม่เลือก แต่แสดงทั้งหมด)
      const allExtras =
        ticketData.tickets_extras?.map((extra, index) => ({
          ...extra,
          originalIndex: index,
          selected: false,
          selectedQuantity: 0,
          maxQuantity: extra.quantity || 1,
        })) || [];

      setSelectedExtras(allExtras);
    }
  }, [isOpen, ticketData]);

  // คำนวณราคาใหม่เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    calculateTotals();
  }, [selectedPassengers, selectedExtras, ticketData]);

  // ฟังก์ชันคำนวณราคาตามผู้โดยสารและ extras ที่เลือก
  const calculateTotals = () => {
    if (!ticketData) return;

    const pricingData = ticketData.tickets_pricing?.[0] || {};
    const vatPercent = ticketData.tickets_detail?.[0]?.vat_percent || 0;

    // คำนวณราคาผู้โดยสารตามที่เลือก
    let passengerSubtotal = 0;

    // ตรวจสอบว่ามีการเลือกผู้โดยสารหรือไม่
    const hasSelection = selectedPassengers.some((p) => !p.selected);

    let selectedPassengerTypes;

    if (hasSelection) {
      // ถ้ามีการเลือก (ไม่ได้เลือกทั้งหมด) ให้นับจากผู้โดยสารที่เลือกจริงๆ
      selectedPassengerTypes = {
        ADT1: 0,
        ADT2: 0,
        ADT3: 0,
      };

      selectedPassengers.forEach((passenger) => {
        if (passenger.selected) {
          const age = (passenger.age || "").toUpperCase();
          let type = "ADT1";
          if (age === "ADT2" || age === "CHD" || age === "CHILD") type = "ADT2";
          else if (age === "ADT3" || age === "INF" || age === "INFANT") type = "ADT3";
          selectedPassengerTypes[type] = (selectedPassengerTypes[type] || 0) + 1;
        }
      });
    } else {
      // ถ้าไม่มีการเลือก (เลือกทั้งหมด) ให้ใช้จำนวนจาก tickets_pricing
      selectedPassengerTypes = {
        ADT1: pricingData.adt1_pax || 0,
        ADT2: pricingData.adt2_pax || 0,
        ADT3: pricingData.adt3_pax || 0,
      };
    }

    const passengerTypeTotals = {
      ADT1: selectedPassengerTypes.ADT1 * (pricingData.adt1_sale_price || 0),
      ADT2: selectedPassengerTypes.ADT2 * (pricingData.adt2_sale_price || 0),
      ADT3: selectedPassengerTypes.ADT3 * (pricingData.adt3_sale_price || 0),
    };

    // คำนวณราคาตามประเภทผู้โดยสาร
    passengerSubtotal +=
      selectedPassengerTypes.ADT1 * (pricingData.adt1_sale_price || 0);
    passengerSubtotal +=
      selectedPassengerTypes.ADT2 * (pricingData.adt2_sale_price || 0);
    passengerSubtotal +=
      selectedPassengerTypes.ADT3 * (pricingData.adt3_sale_price || 0);

    // คำนวณราคา extras ที่เลือก
    let extrasSubtotal = 0;
    selectedExtras.forEach((extra) => {
      if (extra.selected && extra.selectedQuantity > 0) {
        extrasSubtotal += (extra.sale_price || 0) * extra.selectedQuantity;
      }
    });

    // คำนวณยอดรวม
    const subtotal = passengerSubtotal + extrasSubtotal;
    const vatAmount = (subtotal * vatPercent) / 100;
    const total = subtotal + vatAmount;

    setCalculatedTotals({
      subtotal,
      vatAmount,
      total,
      selectedPassengerTypes,
      passengerTypeTotals,
    });
  };

  // จัดการการเลือก/ไม่เลือกผู้โดยสาร
  const handlePassengerToggle = (index) => {
    setSelectedPassengers((prev) =>
      prev.map((passenger, i) =>
        i === index
          ? { ...passenger, selected: !passenger.selected }
          : passenger
      )
    );
  };

  // จัดการการเลือก/ไม่เลือก Extra
  const handleExtraToggle = (index) => {
    setSelectedExtras((prev) =>
      prev.map((extra, i) =>
        i === index
          ? {
              ...extra,
              selected: !extra.selected,
              selectedQuantity: !extra.selected ? extra.maxQuantity : 0,
            }
          : extra
      )
    );
  };

  // จัดการการเปลี่ยนจำนวน Extra
  const handleExtraQuantityChange = (index, quantity) => {
    const numQuantity = parseInt(quantity) || 0;
    setSelectedExtras((prev) =>
      prev.map((extra, i) =>
        i === index
          ? {
              ...extra,
              selectedQuantity: Math.min(
                Math.max(0, numQuantity),
                extra.maxQuantity
              ),
              selected: numQuantity > 0,
            }
          : extra
      )
    );
  };

  // ยืนยันการเลือก
  const handleConfirm = () => {
    const selectedPassengerData = selectedPassengers.filter((p) => p.selected);
    const selectedExtraData = selectedExtras.filter(
      (e) => e.selected && e.selectedQuantity > 0
    );

    if (selectedPassengerData.length === 0) {
      alert("กรุณาเลือกผู้โดยสารอย่างน้อย 1 คน");
      return;
    }

    onConfirm({
      passengers: selectedPassengerData,
      extras: selectedExtraData,
      totals: calculatedTotals,
    });
  };

  // ปุ่มเลือก/ไม่เลือกผู้โดยสารทั้งหมด
  const handleSelectAllPassengers = () => {
    const allSelected = selectedPassengers.every((p) => p.selected);
    setSelectedPassengers((prev) =>
      prev.map((passenger) => ({
        ...passenger,
        selected: !allSelected,
      }))
    );
  };

  if (!isOpen) return null;

  const allPassengersSelected = selectedPassengers.every((p) => p.selected);
  const selectedPassengerCount = selectedPassengers.filter(
    (p) => p.selected
  ).length;
  const selectedExtraCount = selectedExtras.filter((e) => e.selected).length;

  return (
    <div className="fixed inset-0 modal-backdrop bg-black flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center">
            <Receipt size={24} className="mr-3" />
            <div>
              <h1 className="text-xl font-bold">สร้าง Receipt</h1>
              <p className="text-blue-100 text-sm">
                เลือกผู้โดยสารและรายการที่ต้องการ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-700 rounded-md transition-colors"
            title="ปิด"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ส่วนเลือกผู้โดยสาร */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users size={20} className="text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold">ผู้โดยสาร</h2>
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {selectedPassengerCount}/{selectedPassengers.length}
                  </span>
                </div>
                <button
                  onClick={handleSelectAllPassengers}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {allPassengersSelected ? "ไม่เลือกทั้งหมด" : "เลือกทั้งหมด"}
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedPassengers.map((passenger, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      passenger.selected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handlePassengerToggle(index)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={passenger.selected}
                        onChange={() => handlePassengerToggle(index)}
                        className="mr-3"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {passenger.passenger_name || "ไม่ระบุชื่อ"}
                          </span>
                          <span className="text-sm text-gray-500 px-2 py-1 bg-gray-100 rounded">
                            {passenger.age || "ADT1"}
                          </span>
                        </div>
                        {(passenger.ticket_number || passenger.ticket_code) && (
                          <div className="text-sm text-gray-600 mt-1">
                            {passenger.ticket_number} {passenger.ticket_code}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedPassengers.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  ไม่มีผู้โดยสารในการจองนี้
                </div>
              )}
            </div>

            {/* ส่วนเลือก Extras */}
            <div className="space-y-4">
              <div className="flex items-center">
                <Package size={20} className="text-green-600 mr-2" />
                <h2 className="text-lg font-semibold">รายการเพิ่มเติม</h2>
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {selectedExtraCount}/{selectedExtras.length}
                </span>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {selectedExtras.map((extra, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg transition-colors ${
                      extra.selected
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        checked={extra.selected}
                        onChange={() => handleExtraToggle(index)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {extra.description || "ไม่ระบุรายการ"}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          ราคา: ฿{(extra.sale_price || 0).toLocaleString()} x
                          หน่วย
                        </div>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className="text-sm">จำนวน:</span>
                          <input
                            type="number"
                            min="0"
                            max={extra.maxQuantity}
                            value={extra.selectedQuantity}
                            onChange={(e) =>
                              handleExtraQuantityChange(index, e.target.value)
                            }
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                            disabled={!extra.selected}
                          />
                          <span className="text-sm text-gray-500">
                            / {extra.maxQuantity}
                          </span>
                          {extra.selected && extra.selectedQuantity > 0 && (
                            <span className="text-sm font-medium text-green-700">
                              = ฿
                              {(
                                (extra.sale_price || 0) * extra.selectedQuantity
                              ).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedExtras.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  ไม่มีรายการเพิ่มเติมในการจองนี้
                </div>
              )}
            </div>
          </div>

          {/* สรุปราคา */}
          <div className="mt-6 border-t pt-6">
            <div className="flex items-center mb-4">
              <Calculator size={20} className="text-purple-600 mr-2" />
              <h2 className="text-lg font-semibold">สรุปราคา Receipt</h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ผู้โดยสาร */}
                <div>
                  <h3 className="font-medium mb-2">ผู้โดยสารที่เลือก:</h3>
                  <div className="space-y-1 text-sm">
                    {calculatedTotals.selectedPassengerTypes?.ADT1 > 0 && (
                      <div className="flex justify-between">
                        <span>
                          ADT 1: {calculatedTotals.selectedPassengerTypes.ADT1}{" "}
                          คน
                        </span>
                        <span>
                          ฿
                          {(
                            calculatedTotals.passengerTypeTotals?.ADT1 || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {calculatedTotals.selectedPassengerTypes?.ADT2 > 0 && (
                      <div className="flex justify-between">
                        <span>
                          ADT 2: {calculatedTotals.selectedPassengerTypes.ADT2}{" "}
                          คน
                        </span>
                        <span>
                          ฿
                          {(
                            calculatedTotals.passengerTypeTotals?.ADT2 || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {calculatedTotals.selectedPassengerTypes?.ADT3 > 0 && (
                      <div className="flex justify-between">
                        <span>
                          ADT 3: {calculatedTotals.selectedPassengerTypes.ADT3}{" "}
                          คน
                        </span>
                        <span>
                          ฿
                          {(
                            calculatedTotals.passengerTypeTotals?.ADT3 || 0
                          ).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ยอดเงิน */}
                <div>
                  <h3 className="font-medium mb-2">ยอดเงิน:</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>฿{calculatedTotals.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        VAT ({Math.floor(ticketData?.tickets_detail?.[0]?.vat_percent || 0)}
                        %):
                      </span>
                      <span>
                        ฿{Math.floor(calculatedTotals.vatAmount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-1">
                      <span>Total:</span>
                      <span>฿{calculatedTotals.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedPassengerCount > 0
              ? `เลือกผู้โดยสาร ${selectedPassengerCount} คน${
                  selectedExtraCount > 0
                    ? ` และรายการเพิ่มเติม ${selectedExtraCount} รายการ`
                    : ""
                }`
              : "กรุณาเลือกผู้โดยสารอย่างน้อย 1 คน"}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              disabled={loading}
            >
              ยกเลิก
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedPassengerCount === 0 || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  กำลังสร้าง...
                </>
              ) : (
                "สร้าง Receipt"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptSelectionModal;
