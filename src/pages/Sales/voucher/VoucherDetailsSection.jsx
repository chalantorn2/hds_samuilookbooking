import React from "react";
import SaleStyles, { combineClasses } from "../common/SaleStyles";

const VoucherDetailsSection = ({ formData, setFormData, readOnly = false }) => {
  // Handle form field changes
  const handleFieldChange = (fieldName, value) => {
    if (readOnly) return;

    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  // Format date input (DDMMMYY format)
  const handleDateChange = (value) => {
    if (readOnly) return;

    // Allow user to type freely, but provide guidance
    let formattedValue = value.toUpperCase();

    // Remove any characters that aren't letters or numbers
    formattedValue = formattedValue.replace(/[^A-Z0-9]/g, "");

    // Limit to 7 characters (DDMMMYY)
    if (formattedValue.length > 7) {
      formattedValue = formattedValue.substring(0, 7);
    }

    handleFieldChange("tripDate", formattedValue);
  };

  // Format time input (HH:MM format)
  const handleTimeChange = (value) => {
    if (readOnly) return;

    // Remove any non-digit characters except colon
    let cleanValue = value.replace(/[^\d:]/g, "");

    // Auto-format time (add colon after 2 digits)
    if (cleanValue.length === 2 && !cleanValue.includes(":")) {
      cleanValue = cleanValue + ":";
    }

    // Limit to HH:MM format
    if (cleanValue.length > 5) {
      cleanValue = cleanValue.substring(0, 5);
    }

    handleFieldChange("pickupTime", cleanValue);
  };

  return (
    <section
      className={combineClasses(SaleStyles.subsection.container, "col-span-15")}
    >
      <div className={SaleStyles.section.headerWrapper2}>
        <h2 className={SaleStyles.section.headerTitle}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
          </svg>
          รายละเอียดบริการ
        </h2>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-12 gap-4">
          {/* คอลัมน์ 1 */}
          <div className="col-span-6">
            {/* 1. รายละเอียด */}
            <div className="mb-2">
              <label className={SaleStyles.form.label}>รายละเอียด</label>
              <textarea
                className={SaleStyles.form.textarea}
                placeholder="รายละเอียดบริการ"
                value={formData.description || ""}
                onChange={(e) =>
                  handleFieldChange("description", e.target.value)
                }
                disabled={readOnly}
                rows={3}
              />
            </div>

            {/* 2. โรงแรม */}
            <div className="mb-4">
              <label className={SaleStyles.form.label}>โรงแรม</label>
              <input
                type="text"
                className={SaleStyles.form.input}
                placeholder="ชื่อโรงแรม"
                value={formData.hotel || ""}
                onChange={(e) => handleFieldChange("hotel", e.target.value)}
                disabled={readOnly}
              />
            </div>

            {/* 3. เลขห้องพัก */}
            <div className="mb-4">
              <label className={SaleStyles.form.label}>เลขห้องพัก</label>
              <input
                type="text"
                className={SaleStyles.form.input}
                placeholder="เลขห้องพัก"
                value={formData.roomNo || ""}
                onChange={(e) => handleFieldChange("roomNo", e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>

          {/* คอลัมน์ 2 */}
          <div className="col-span-6">
            {/* 1. วันที่เดินทาง */}
            <div className="mb-4">
              <label className={SaleStyles.form.label}>วันที่เดินทาง </label>
              <input
                type="text"
                className={SaleStyles.form.input}
                placeholder="ตัวอย่าง: 15JAN25"
                value={formData.tripDate || ""}
                onChange={(e) => handleDateChange(e.target.value)}
                maxLength={7}
                disabled={readOnly}
              />
            </div>

            {/* 2. เวลารับ */}
            <div className="mb-4">
              <label className={SaleStyles.form.label}>เวลารับ</label>
              <input
                type="text"
                className={SaleStyles.form.input}
                placeholder="ตัวอย่าง: 09:30"
                value={formData.pickupTime || ""}
                onChange={(e) => handleTimeChange(e.target.value)}
                maxLength={5}
                disabled={readOnly}
              />
            </div>

            {/* 3. หมายเหตุ */}
            <div className="mb-4">
              <label className={SaleStyles.form.label}>หมายเหตุ</label>
              <textarea
                className={SaleStyles.form.textarea}
                placeholder="หมายเหตุเพิ่มเติม"
                value={formData.remark || ""}
                onChange={(e) => handleFieldChange("remark", e.target.value)}
                disabled={readOnly}
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VoucherDetailsSection;
