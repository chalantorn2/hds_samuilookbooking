import React, { useState, useEffect } from "react";
import SaleStyles from "../common/SaleStyles";

const VoucherServiceSection = ({
  formData,
  setFormData,
  readOnly = false,
  onSupplierSearch,
}) => {
  // Service type options with their prefixes
  const serviceTypes = [
    { value: "bus", label: "BUS", prefix: "BS" },
    { value: "boat", label: "BOAT", prefix: "BT" },
    { value: "tour", label: "TOUR", prefix: "TR" },
  ];

  // Handle service type change
  const handleServiceTypeChange = (serviceType) => {
    if (readOnly) return;

    setFormData((prev) => ({
      ...prev,
      serviceType: serviceType,
      // Clear supplier when changing service type
      supplier: "",
      supplierName: "",
      supplierId: null,
    }));
  };

  // Handle supplier input change with auto-search only
  const handleSupplierInputChange = async (value) => {
    if (readOnly) return;

    // Clean and uppercase the input
    const cleanValue = value
      .replace(/[^A-Za-z0-9]/g, "")
      .substring(0, 10)
      .toUpperCase();

    // Update supplier code
    setFormData((prev) => ({ ...prev, supplier: cleanValue }));

    // If empty, clear everything
    if (!cleanValue || cleanValue.trim() === "") {
      setFormData((prev) => ({
        ...prev,
        supplier: "",
        supplierName: "",
        supplierId: null,
      }));
      return;
    }

    // Auto-search when typing (minimum 2 characters)
    if (cleanValue.length >= 2 && onSupplierSearch) {
      try {
        const results = await onSupplierSearch(cleanValue);

        // Find exact match and auto-select
        const exactMatch = results.find(
          (supplier) => supplier.code.toUpperCase() === cleanValue.toUpperCase()
        );

        if (exactMatch) {
          setFormData((prev) => ({
            ...prev,
            supplier: exactMatch.code,
            supplierName: exactMatch.name,
            supplierId: exactMatch.id,
          }));
        } else {
          // No exact match - clear supplier name
          setFormData((prev) => ({
            ...prev,
            supplierName: "",
            supplierId: null,
          }));
        }
      } catch (error) {
        console.error("Error searching suppliers:", error);
      }
    }
  };

  // Select supplier from search results
  const selectSupplier = (supplier) => {
    setFormData((prev) => ({
      ...prev,
      supplier: supplier.code,
      supplierName: supplier.name,
      supplierId: supplier.id,
    }));
  };

  // Clear supplier selection
  const clearSupplier = () => {
    setFormData((prev) => ({
      ...prev,
      supplier: "",
      supplierName: "",
      supplierId: null,
    }));
  };

  return (
    <div className="col-span-5 self-start">
      <section className={SaleStyles.subsection.container}>
        <div className={SaleStyles.subsection.header}>
          <h2 className={SaleStyles.subsection.title}>ข้อมูลซัพพลายเออร์</h2>
        </div>

        <div className={SaleStyles.subsection.content}>
          {/* Supplier Selection */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            {/* Supplier Code */}
            <div className="col-span-1">
              <label className={SaleStyles.form.label}>ผู้ให้บริการ</label>
              <input
                type="text"
                className={SaleStyles.form.input}
                value={formData.supplier || ""}
                onChange={(e) => handleSupplierInputChange(e.target.value)}
                placeholder="รหัส"
                maxLength={3}
                disabled={readOnly}
              />
            </div>

            {/* Supplier Full Name */}
            <div className="col-span-3">
              <label className={SaleStyles.form.label}>
                ชื่อเต็มผู้ให้บริการ
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  className={SaleStyles.form.inputDisabled}
                  value={formData.supplierName || ""}
                  placeholder="ชื่อผู้ให้บริการ"
                  readOnly
                />
                {formData.supplier && !readOnly && (
                  <button
                    type="button"
                    onClick={clearSupplier}
                    className="text-red-500 hover:text-red-700 px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Service Type Radio Buttons */}
          <div className="flex justify-center space-x-8 pb-2 relative">
            {serviceTypes.map((service) => (
              <div key={service.value} className="flex items-center">
                <input
                  type="radio"
                  id={service.value}
                  name="serviceType"
                  value={service.value}
                  checked={formData.serviceType === service.value}
                  onChange={(e) => handleServiceTypeChange(e.target.value)}
                  className="mr-2 focus:ring-blue-500"
                  disabled={readOnly}
                />
                <label
                  htmlFor={service.value}
                  className={`cursor-pointer ${
                    readOnly
                      ? "text-gray-900"
                      : "text-gray-900 hover:text-blue-600"
                  }`}
                >
                  {service.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default VoucherServiceSection;
