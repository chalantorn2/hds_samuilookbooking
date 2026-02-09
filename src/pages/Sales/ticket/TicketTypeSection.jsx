import React from "react";
import SaleStyles, { combineClasses } from "../common/SaleStyles";

const TicketTypeSection = ({ formData, setFormData, readOnly = false }) => {
  // ✅ เพิ่มฟังก์ชัน helper สำหรับเปรียบเทียบ ticket type (ไม่สนใจตัวเล็ก-ใหญ่)
  const normalizeTicketType = (type) => (type || "").toLowerCase();
  const isTicketTypeMatch = (type1, type2) => {
    return normalizeTicketType(type1) === normalizeTicketType(type2);
  };

  const RadioButton = ({ id, value, label, checked, onChange }) => {
    if (readOnly) {
      // ReadOnly mode - ใช้ div แทน radio ที่ชัดเจน
      return (
        <div className={SaleStyles.form.radioContainer}>
          <div
            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-2 ${
              checked
                ? "border-blue-500 bg-blue-500"
                : "border-gray-400 bg-white"
            }`}
          >
            {checked && <div className="w-2 h-2 rounded-full bg-white"></div>}
          </div>
          <label className="text-sm">{label}</label>
        </div>
      );
    }

    // Edit mode - radio ปกติ
    return (
      <div className={SaleStyles.form.radioContainer}>
        <input
          type="radio"
          id={id}
          name="ticketType"
          value={value}
          checked={checked}
          onChange={onChange}
          className={SaleStyles.form.radio}
        />
        <label htmlFor={id}>{label}</label>
      </div>
    );
  };

  // ✅ แก้ไขฟังก์ชันเปลี่ยนประเภทตั๋ว - เก็บค่า details ไว้
  const handleTicketTypeChange = (newTicketType) => {
    setFormData({
      ...formData,
      ticketType: newTicketType, // เก็บค่าเป็นตัวเล็ก (value ของ radio)
      // ไม่ต้องล้างค่า details - ให้เก็บไว้
    });
  };

  return (
    <section
      className={combineClasses(
        SaleStyles.subsection.container,
        "col-span-3 self-start"
      )}
    >
      <div className={SaleStyles.subsection.header}>
        <h2 className={SaleStyles.subsection.title}>ประเภทตั๋ว</h2>
      </div>
      <div className={SaleStyles.subsection.content}>
        <div className="flex flex-col gap-2">
          {/* แถวที่ 1: BSP, AIRLINE, WEB */}
          <div className="grid grid-cols-3 gap-2">
            <RadioButton
              id="bsp"
              value="bsp"
              label="BSP"
              checked={isTicketTypeMatch(formData.ticketType, "bsp")}
              onChange={() => handleTicketTypeChange("bsp")}
            />
            <RadioButton
              id="airline"
              value="airline"
              label="AIRLINE"
              checked={isTicketTypeMatch(formData.ticketType, "airline")}
              onChange={() => handleTicketTypeChange("airline")}
            />
            <RadioButton
              id="web"
              value="web"
              label="WEB"
              checked={isTicketTypeMatch(formData.ticketType, "web")}
              onChange={() => handleTicketTypeChange("web")}
            />
          </div>

          {/* แถวที่ 2: TG, B2B, OTHER */}
          <div className="grid grid-cols-3 gap-2">
            <RadioButton
              id="tg"
              value="tg"
              label="TG"
              checked={isTicketTypeMatch(formData.ticketType, "tg")}
              onChange={() => handleTicketTypeChange("tg")}
            />
            <RadioButton
              id="b2b"
              value="b2b"
              label="B2B"
              checked={isTicketTypeMatch(formData.ticketType, "b2b")}
              onChange={() => handleTicketTypeChange("b2b")}
            />
            <RadioButton
              id="other"
              value="other"
              label="OTHER"
              checked={isTicketTypeMatch(formData.ticketType, "other")}
              onChange={() => handleTicketTypeChange("other")}
            />
          </div>

          {/* ✅ Input ที่ขึ้นบรรทัดใหม่เมื่อถูกเลือก - ใช้ฟังก์ชัน normalize */}
          {!readOnly && isTicketTypeMatch(formData.ticketType, "tg") && (
            <div className="grid grid-cols-3 gap-2">
              <div
                className={combineClasses(
                  SaleStyles.form.radioContainer,
                  "col-span-3 flex"
                )}
              >
                <input
                  type="text"
                  className={combineClasses(
                    SaleStyles.form.input,
                    "flex-1 w-full"
                  )}
                  disabled={!isTicketTypeMatch(formData.ticketType, "tg")}
                  value={formData.tgDetails || ""}
                  onChange={(e) => {
                    console.log("Updating tgDetails to:", e.target.value);
                    setFormData({
                      ...formData,
                      tgDetails: e.target.value,
                    });
                  }}
                  placeholder="รายละเอียด TG"
                />
              </div>
            </div>
          )}

          {!readOnly && isTicketTypeMatch(formData.ticketType, "b2b") && (
            <div className="grid grid-cols-3 gap-2">
              <div
                className={combineClasses(
                  SaleStyles.form.radioContainer,
                  "col-span-3 flex"
                )}
              >
                <input
                  type="text"
                  className={combineClasses(
                    SaleStyles.form.input,
                    "flex-1 w-full"
                  )}
                  disabled={!isTicketTypeMatch(formData.ticketType, "b2b")}
                  value={formData.b2bDetails || ""}
                  onChange={(e) => {
                    console.log("Updating b2bDetails to:", e.target.value);
                    setFormData({
                      ...formData,
                      b2bDetails: e.target.value,
                    });
                  }}
                  placeholder="รายละเอียด B2B"
                />
              </div>
            </div>
          )}

          {!readOnly && isTicketTypeMatch(formData.ticketType, "other") && (
            <div className="grid grid-cols-3 gap-2">
              <div
                className={combineClasses(
                  SaleStyles.form.radioContainer,
                  "col-span-3 flex"
                )}
              >
                <input
                  type="text"
                  className={combineClasses(
                    SaleStyles.form.input,
                    "flex-1 w-full"
                  )}
                  disabled={!isTicketTypeMatch(formData.ticketType, "other")}
                  value={formData.otherDetails || ""}
                  onChange={(e) => {
                    console.log("Updating otherDetails to:", e.target.value);
                    setFormData({
                      ...formData,
                      otherDetails: e.target.value,
                    });
                  }}
                  placeholder="รายละเอียดประเภทอื่นๆ"
                />
              </div>
            </div>
          )}

          {/* แสดงรายละเอียดใน readOnly mode */}
          {readOnly &&
            (formData.b2bDetails ||
              formData.otherDetails ||
              formData.tgDetails) && (
              <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-300 text-sm">
                <span className="text-gray-600">รายละเอียด: </span>
                <span className="font-medium">
                  {formData.b2bDetails ||
                    formData.otherDetails ||
                    formData.tgDetails}
                </span>
              </div>
            )}
        </div>
      </div>
    </section>
  );
};

export default TicketTypeSection;
