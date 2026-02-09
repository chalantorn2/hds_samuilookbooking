import React from "react";
import SaleStyles from "./SaleStyles";

const PaymentMethodSection = ({
  title,
  sectionType,
  options,
  formData,
  setFormData,
  fieldName = "paymentMethod",
  detailsFieldName = "paymentDetails",
  showDetailInput = true,
  detailPlaceholder = "รายละเอียดการชำระเงิน",
  className,
}) => {
  const selectedValue = formData[fieldName];

  // กำหนดฟิลด์สำหรับเก็บรายละเอียดการชำระเงินตามประเภท
  const detailsField =
    sectionType === "company"
      ? "companyPaymentDetails"
      : sectionType === "customer"
      ? "customerPaymentDetails"
      : detailsFieldName;

  // console.log(`PaymentMethodSection (${sectionType}):`, {
  //   fieldName,
  //   detailsField,
  //   selectedValue,
  //   currentDetailsValue: formData[detailsField],
  // });

  const handlePaymentMethodChange = (method) => {
    setFormData({
      ...formData,
      [fieldName]: method,
    });
  };

  const handleDetailsChange = (e) => {
    console.log(`Updating ${detailsField} to:`, e.target.value);
    setFormData({
      ...formData,
      [detailsField]: e.target.value,
    });
  };

  return (
    <div className={`bg-gray-50 p-4 rounded-md ${className || ""}`}>
      <h3 className="font-semibold mb-3 text-blue-600 text-lg">{title}</h3>
      <div className="space-y-3">
        {options.map(({ id, value, label, showInput = true }) => (
          <div key={id} className="flex items-center">
            <div className="flex items-center mt-1">
              <input
                type="radio"
                id={id}
                name={`${fieldName}_${sectionType || "default"}`}
                value={value}
                checked={selectedValue === value}
                onChange={() => handlePaymentMethodChange(value)}
                className={SaleStyles.form.radio}
              />
              <label htmlFor={id} className="text-sm">
                {label}
              </label>
            </div>

            {showDetailInput && showInput && selectedValue === value && (
              <input
                type="text"
                className={SaleStyles.form.input}
                placeholder={detailPlaceholder}
                value={formData[detailsField] || ""}
                onChange={handleDetailsChange}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaymentMethodSection;
