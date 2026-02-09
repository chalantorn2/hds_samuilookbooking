// src/utils/customerOverrideHelpers.js
// Helper functions สำหรับจัดการ Customer Override Data

import { formatCustomerAddress } from "./helpers";

/**
 * Parse customer override data safely
 */
export const getCustomerOverride = (booking) => {
  if (!booking?.customer_override_data) return null;

  try {
    if (typeof booking.customer_override_data === "string") {
      return JSON.parse(booking.customer_override_data);
    }
    return booking.customer_override_data;
  } catch (error) {
    console.error("Invalid customer override JSON:", error);
    return null;
  }
};

export const getDisplayCustomerName = (booking) => {
  const override = getCustomerOverride(booking);

  // ✅ เพิ่มการเช็ค uppercase และ lowercase
  const overrideName = override?.name || override?.NAME;

  return overrideName || booking.customer?.name || "";
};

// แก้ไขฟังก์ชันอื่นๆ เหมือนกัน
export const getDisplayCustomerAddress = (booking) => {
  const override = getCustomerOverride(booking);

  // ✅ เพิ่มการเช็ค uppercase และ lowercase
  const overrideAddress = override?.address || override?.ADDRESS;

  return overrideAddress || formatCustomerAddress(booking.customer) || "";
};

export const getDisplayCustomerPhone = (booking) => {
  const override = getCustomerOverride(booking);

  // ✅ เพิ่มการเช็ค uppercase และ lowercase
  const overridePhone = override?.phone || override?.PHONE;

  return overridePhone || booking.customer?.phone || "";
};

export const getDisplayCustomerIdNumber = (booking) => {
  const override = getCustomerOverride(booking);

  // ✅ เพิ่มการเช็ค uppercase และ lowercase
  const overrideIdNumber = override?.id_number || override?.ID_NUMBER;

  const result = overrideIdNumber || booking.customer?.id_number || "";

  console.log("🔍 getDisplayCustomerIdNumber:", {
    hasOverride: !!override,
    overrideIdNumber: overrideIdNumber,
    customerIdNumber: booking.customer?.id_number,
    result: result,
  });

  return result;
};

export const getDisplayCustomerBranchType = (booking) => {
  const override = getCustomerOverride(booking);

  // ✅ เพิ่มการเช็ค uppercase และ lowercase
  const overrideBranchType = override?.branch_type || override?.BRANCH_TYPE;

  return overrideBranchType || booking.customer?.branch_type || "Head Office";
};

export const getDisplayCustomerBranchNumber = (booking) => {
  const override = getCustomerOverride(booking);

  // ✅ เพิ่มการเช็ค uppercase และ lowercase
  const overrideBranchNumber =
    override?.branch_number || override?.BRANCH_NUMBER;

  return overrideBranchNumber || booking.customer?.branch_number || "";
};

/**
 * Check if customer data has been overridden
 */
export const hasCustomerOverride = (booking) => {
  return !!booking.customer_override_data;
};

/**
 * Create customer override object from form data
 */
export const createCustomerOverrideData = (formData, originalCustomer) => {
  if (!formData || !originalCustomer) return null;

  const override = {};
  let hasChanges = false;

  // Check name changes
  if (formData.customer !== originalCustomer.name) {
    override.name = formData.customer;
    hasChanges = true;
  }

  // Check address changes
  const originalAddress = formatCustomerAddress(originalCustomer);
  if (formData.contactDetails !== originalAddress) {
    override.address = formData.contactDetails;
    hasChanges = true;
  }

  // Check phone changes
  if (formData.phone !== originalCustomer.phone) {
    override.phone = formData.phone;
    hasChanges = true;
  }

  // Check ID number changes
  if (formData.id !== originalCustomer.id_number) {
    override.id_number = formData.id;
    hasChanges = true;
  }

  // Check branch type changes
  if (formData.branchType !== originalCustomer.branch_type) {
    override.branch_type = formData.branchType;
    hasChanges = true;
  }

  // Check branch number changes
  if (formData.branchNumber !== originalCustomer.branch_number) {
    override.branch_number = formData.branchNumber;
    hasChanges = true;
  }

  return hasChanges ? override : null;
};
