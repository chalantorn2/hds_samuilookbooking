import React from "react";
import SaleStyles from "../common/SaleStyles";

// แก้ไข SupplierSection.jsx - เพิ่มการรองรับ supplier-other
// เปลี่ยนแค่ฟังก์ชัน handleSupplierCodeChange และ title

const SupplierSection = ({
  formData,
  setFormData,
  suppliers = [], // เพิ่ม default value
  onSupplierSearch, // เพิ่ม prop สำหรับ search function
  hideCodeField = false,
  readOnly = false,
  supplierType = "airline", // เพิ่ม prop สำหรับกำหนดประเภท
  showDepositTypeButtons = false, // เพิ่ม prop สำหรับแสดงปุ่ม deposit type
}) => {
  // เพิ่มการกำหนด title ตามประเภท
  const getSectionTitle = () => {
    if (supplierType === "supplier-other" || formData.serviceType) {
      return "ข้อมูลซัพพลายเออร์";
    }
    return "ข้อมูลซัพพลายเออร์"; // default
  };

  const getFieldLabel = () => {
    if (supplierType === "supplier-other" || formData.serviceType) {
      return "รหัส";
    }
    return "สายการบิน"; // default
  };

  // แก้ไขฟังก์ชันจัดการการเปลี่ยนแปลงรหัสซัพพลายเออร์
  const handleSupplierCodeChange = async (value) => {
    // อนุญาตเฉพาะตัวอักษร และตัวเลข (ขยายจาก 2-3 ตัว)
    const cleanValue = value
      .replace(/[^A-Za-z0-9]/g, "")
      .substring(0, 5) // เพิ่มจาก 3 เป็น 5
      .toUpperCase();

    // อัปเดท formData
    setFormData((prev) => ({
      ...prev,
      supplier: cleanValue,
    }));

    // ถ้าลบรหัสออกหมด ให้ clear supplier info
    if (cleanValue === "") {
      setFormData((prev) => ({
        ...prev,
        supplier: "",
        supplierName: "",
        supplierId: null,
        supplierNumericCode: "",
      }));
    }
    // ถ้าพิมพ์ครับ 2 ตัวขึ้นไป ให้ค้นหา supplier
    else if (cleanValue.length >= 2) {
      // เรียกใช้ search function ที่ส่งมาจาก parent
      if (onSupplierSearch) {
        try {
          const searchResults = await onSupplierSearch(cleanValue);
          console.log("Search results:", searchResults);

          // หา supplier ที่ตรงกับ code
          const matchedSupplier = searchResults?.data?.find(
            (supplier) => supplier.code?.toUpperCase() === cleanValue
          );

          if (matchedSupplier) {
            setFormData((prev) => ({
              ...prev,
              supplier: matchedSupplier.code,
              supplierName: matchedSupplier.name,
              supplierId: matchedSupplier.id,
              supplierNumericCode: matchedSupplier.numeric_code || "",
            }));
          }
        } catch (error) {
          console.error("Supplier search error:", error);
        }
      }
    }
  };

  return (
    <div className="col-span-5 self-start">
      <section className={SaleStyles.subsection.container}>
        <div className={SaleStyles.subsection.header}>
          <h2 className={SaleStyles.subsection.title}>{getSectionTitle()}</h2>
        </div>
        <div className={SaleStyles.subsection.content}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {/* ซัพพลายเออร์ */}
            <div className="col-span-1">
              <label className={SaleStyles.form.label}>{getFieldLabel()}</label>
              <input
                type="text"
                className={SaleStyles.form.input}
                value={formData.supplier || ""}
                onChange={(e) => handleSupplierCodeChange(e.target.value)}
                maxLength={5} // เพิ่มจาก 3 เป็น 5
                disabled={readOnly}
                placeholder="รหัส"
              />
            </div>

            <div className="col-span-4">
              <label className={SaleStyles.form.label}>
                ชื่อเต็มซัพพลายเออร์
              </label>
              <input
                type="text"
                className={SaleStyles.form.inputDisabled}
                disabled={readOnly}
                value={formData.supplierName || ""}
                placeholder="ชื่อซัพพลายเออร์"
              />
            </div>

            {!hideCodeField && (
              <div className="col-span-5">
                <label className={SaleStyles.form.label}>Code</label>
                <input
                  type="text"
                  className={SaleStyles.form.input}
                  placeholder=""
                  value={formData.code || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  disabled={readOnly}
                />
              </div>
            )}

            {/* Deposit Type Buttons - แสดงเมื่อ showDepositTypeButtons = true */}
            {showDepositTypeButtons && (
              <div className="col-span-5 mt-3">
                <div className="flex justify-center space-x-4">
                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="airTicket"
                      name="depositType"
                      value="airTicket"
                      checked={formData.depositType === "airTicket"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          depositType: e.target.value,
                        })
                      }
                      className="mr-2"
                      disabled={readOnly}
                    />
                    <label
                      htmlFor="airTicket"
                      className="text-sm text-nowrap font-normal"
                    >
                      AIR TICKET
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="package"
                      name="depositType"
                      value="package"
                      checked={formData.depositType === "package"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          depositType: e.target.value,
                        })
                      }
                      className="mr-2"
                      disabled={readOnly}
                    />
                    <label htmlFor="package" className="text-sm font-normal">
                      PACKAGE
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="land"
                      name="depositType"
                      value="land"
                      checked={formData.depositType === "land"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          depositType: e.target.value,
                        })
                      }
                      className="mr-2"
                      disabled={readOnly}
                    />
                    <label htmlFor="land" className="text-sm font-normal">
                      LAND
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="radio"
                      id="other"
                      name="depositType"
                      value="other"
                      checked={formData.depositType === "other"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          depositType: e.target.value,
                        })
                      }
                      className="mr-2"
                      disabled={readOnly}
                    />
                    <label htmlFor="other" className="text-sm font-normal">
                      OTHER
                    </label>
                  </div>
                </div>

                {/* Input field สำหรับ OTHER */}
                {formData.depositType === "other" && (
                  <div className="mt-2">
                    <input
                      type="text"
                      className={SaleStyles.form.input}
                      placeholder="กรุณาระบุ"
                      value={formData.otherTypeDescription || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          otherTypeDescription: e.target.value,
                        })
                      }
                      disabled={readOnly}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SupplierSection;
