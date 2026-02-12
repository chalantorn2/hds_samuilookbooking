import React, { useEffect, useRef } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import SaleStyles, { combineClasses } from "../common/SaleStyles";

const PassengerSection = ({
  passengers,
  setPassengers,
  updatePricing,
  pricing,
  formData,
  setFormData,
  readOnly = false,
}) => {
  // ✅ เพิ่ม useRef เพื่อตรวจสอบว่า component mount แล้วหรือยัง (ป้องกัน auto-update ครั้งแรก)
  const isMounted = useRef(false);

  const updatePassengerCount = (passengersList) => {
    const adultCount = passengersList.length;

    const adultSale = pricing?.adt1?.sale || 0;
    const adultTotal = adultCount * parseFloat(adultSale);

    updatePricing("adt1", "pax", adultCount, adultTotal);
  };

  // ✅ แก้ไข: ไม่ auto-update Pax ถ้าอยู่ใน readOnly mode หรือครั้งแรกที่ component mount
  // (เพื่อรักษาค่าที่ผู้ใช้กำหนดเองหรือโหลดจากฐานข้อมูลไว้)
  useEffect(() => {
    if (!readOnly && isMounted.current) {
      updatePassengerCount(passengers);
    }
    isMounted.current = true;
  }, [passengers.length, readOnly]);

  // ✅ แก้ไข: ไม่ auto-update Pax ถ้าอยู่ใน readOnly mode หรือครั้งแรกที่ component mount
  useEffect(() => {
    if (pricing && !readOnly && isMounted.current) {
      updatePassengerCount(passengers);
    }
  }, [pricing.adt1?.sale, readOnly]);

  const addPassenger = () => {
    const newPassenger = {
      id: passengers.length + 1,
      name: "",
      type: "ADT1",
      ticketNumber: formData.supplierNumericCode || "",
      ticketCode: "",
    };

    const updatedPassengers = [...passengers, newPassenger];
    setPassengers(updatedPassengers);
    updatePassengerCount(updatedPassengers);

    // ✅ เพิ่มส่วนนี้ - ให้ cursor ไปที่ชื่อผู้โดยสารคนใหม่
    setTimeout(() => {
      const newPassengerIndex = updatedPassengers.length - 1;
      const nameInput = document.querySelector(
        `input[data-passenger-name="${newPassengerIndex}"]`
      );
      if (nameInput) {
        nameInput.focus();
      }
    }, 100);
  };

  const removePassenger = (id) => {
    if (passengers.length > 1) {
      const updatedPassengers = passengers.filter((p) => p.id !== id);
      setPassengers(updatedPassengers);
      updatePassengerCount(updatedPassengers);
    }
  };

  // ฟังก์ชันจัดการการเปลี่ยนแปลงเลขที่ตั๋ว
  const handleTicketNumberChange = (value) => {
    // อนุญาตเฉพาะตัวเลข 3 หลัก
    const cleanValue = value.replace(/\D/g, "").substring(0, 3);

    // อัปเดทเลขที่ตั๋วในทุกแถว
    const updatedPassengers = passengers.map((passenger) => ({
      ...passenger,
      ticketNumber: cleanValue,
    }));
    setPassengers(updatedPassengers);

    // อัปเดท formData
    setFormData((prev) => ({
      ...prev,
      supplierNumericCode: cleanValue,
    }));

    // ✅ เพิ่มส่วนนี้ - ถ้าพิมพ์ครบ 3 หลัก ให้ cursor เด้งไป ticketCode
    if (cleanValue.length === 3) {
      setTimeout(() => {
        const ticketCodeInput = document.querySelector(
          'input[data-passenger-ticketcode="0"]'
        );
        if (ticketCodeInput) {
          ticketCodeInput.focus();
        }
      }, 100);
    }

    // ถ้าลบเลขออกหมด ให้ clear supplier info
    if (cleanValue === "") {
      setFormData((prev) => ({
        ...prev,
        supplier: "",
        supplierName: "",
        supplierId: null,
        supplierNumericCode: "",
      }));
    }
    // ถ้าพิมพ์ครบ 3 หลัก ให้ค้นหา supplier
    else if (cleanValue.length === 3) {
      // ส่งข้อมูลให้ parent component ค้นหา
      if (setFormData) {
        setFormData((prev) => ({
          ...prev,
          searchTicketNumber: cleanValue, // signal ให้ parent ค้นหา
        }));
      }
    }
  };

  return (
    <div className="col-span-10">
      <section className={SaleStyles.subsection.container}>
        <div className={SaleStyles.subsection.header}>
          <h2 className={SaleStyles.subsection.title}>
            ข้อมูลผู้โดยสาร (ทั้งหมด {passengers.length} คน)
          </h2>
        </div>
        <div className={SaleStyles.subsection.content}>
          <div
            className={combineClasses(
              "grid grid-cols-26 gap-2 font-medium text-sm",
              SaleStyles.spacing.mb2,
              SaleStyles.spacing.mx2
            )}
          >
            <div
              className={combineClasses("col-span-16", SaleStyles.spacing.ml4)}
            >
              ชื่อผู้โดยสาร
            </div>
            <div className="col-span-3 text-center">เลขที่ตั๋ว</div>
          </div>
          {passengers.map((passenger, index) => (
            <div
              key={passenger.id}
              className={combineClasses(
                "grid grid-cols-26 gap-2",
                SaleStyles.spacing.mb2
              )}
            >
              <div className="flex col-span-16">
                <div
                  className={combineClasses(
                    "w-[16px] flex items-center justify-center",
                    SaleStyles.spacing.mr2
                  )}
                >
                  <span className="font-medium">{index + 1}</span>
                </div>
                <input
                  type="text"
                  className={SaleStyles.form.input}
                  value={passenger.name || ""}
                  onChange={(e) => {
                    const updatedPassengers = [...passengers];
                    updatedPassengers[index].name = e.target.value;
                    setPassengers(updatedPassengers);
                  }}
                  data-passenger-name={index}
                  disabled={readOnly}
                />
              </div>
              <div className="col-span-3">
                {index === 0 ? (
                  // แถวแรก: input สำหรับพิมพ์เลขที่ตั๋ว
                  <input
                    type="text"
                    className={combineClasses(
                      SaleStyles.form.input,
                      "text-center"
                    )}
                    value={passenger.ticketNumber || ""}
                    onChange={(e) => handleTicketNumberChange(e.target.value)}
                    maxLength={3}
                    disabled={readOnly}
                  />
                ) : (
                  // แถวอื่นๆ: แสดงค่า readonly
                  <input
                    type="text"
                    className={combineClasses(
                      SaleStyles.form.inputDisabled,
                      "text-center"
                    )}
                    value={passenger.ticketNumber || ""}
                    readOnly
                    disabled={readOnly}
                  />
                )}
              </div>
              <div className="col-span-6">
                <input
                  type="text"
                  className={SaleStyles.form.input}
                  value={passenger.ticketCode || ""}
                  onChange={(e) => {
                    const updatedPassengers = [...passengers];
                    updatedPassengers[index].ticketCode = e.target.value;
                    setPassengers(updatedPassengers);
                  }}
                  data-passenger-ticketcode={index}
                  disabled={readOnly}
                />
              </div>
              <div className="col-span-1 flex items-center justify-center">
                {!readOnly && ( // เพิ่มเงื่อนไขนี้
                  <button
                    type="button"
                    onClick={() => removePassenger(passenger.id)}
                    className={SaleStyles.button.actionButton}
                    disabled={passengers.length === 1}
                  >
                    <FiTrash2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {!readOnly && (
            <button
              type="button"
              onClick={addPassenger}
              className={combineClasses(
                SaleStyles.button.primary,
                SaleStyles.spacing.mt2,
                SaleStyles.spacing.ml4
              )}
            >
              <FiPlus className={SaleStyles.button.icon} /> เพิ่มผู้โดยสาร
            </button>
          )}

          <button
            type="button"
            onClick={() => removePassenger(passenger.id)}
            className={SaleStyles.button.actionButton}
            disabled={passengers.length === 1 || readOnly} // เพิ่ม || readOnly
            style={{ display: readOnly ? "none" : "block" }} // เพิ่มบรรทัดนี้
          >
            {/* <FiTrash2 size={18} /> */}
          </button>
        </div>
      </section>
    </div>
  );
};

export default PassengerSection;
