import React, { useState, useEffect } from "react";

const FormattedNumberInput = ({
  value,
  onChange,
  className,
  placeholder,
  disabled,
  min,
  max,
  ...props
}) => {
  // สร้าง state เก็บค่าที่แสดงผลสำหรับ input นี้โดยเฉพาะ
  const [displayValue, setDisplayValue] = useState("");

  // อัปเดต displayValue เมื่อ prop value เปลี่ยน
  useEffect(() => {
    if (value !== undefined && value !== null) {
      if (typeof value === "string" && value.includes(",")) {
        setDisplayValue(value);
      } else if (value === "") {
        setDisplayValue("");
      } else {
        const numValue = parseFloat(value);
        setDisplayValue(
          isNaN(numValue) ? "" : numValue.toLocaleString("th-TH")
        );
      }
    }
  }, [value]);

  // เมื่อ focus ให้แสดงเป็นตัวเลขปกติ (ไม่มีคอมม่า)
  const handleFocus = (e) => {
    const plainNumber = displayValue.replace(/,/g, "");
    setDisplayValue(plainNumber);
  };

  // เมื่อ blur ให้แสดงเป็นตัวเลขที่มีคอมม่า
  const handleBlur = (e) => {
    if (e.target.value) {
      const numValue = parseFloat(e.target.value.replace(/,/g, ""));
      if (!isNaN(numValue)) {
        setDisplayValue(numValue.toLocaleString("th-TH"));
      }
    } else {
      setDisplayValue("");
    }
  };

  // เมื่อ input เปลี่ยน
  const handleChange = (e) => {
    // อนุญาตเฉพาะตัวเลขและจุดทศนิยม
    const inputValue = e.target.value.replace(/[^0-9.]/g, "");
    setDisplayValue(inputValue);

    // ส่งค่าที่เป็นตัวเลขล้วนๆ กลับไป
    if (onChange) {
      onChange({
        ...e,
        target: {
          ...e.target,
          value: inputValue,
        },
      });
    }
  };

  return (
    <input
      type="text"
      className={className}
      placeholder={placeholder}
      disabled={disabled}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      min={min}
      max={max}
      {...props}
    />
  );
};

export default FormattedNumberInput;
