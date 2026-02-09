// src/components/documents/services/otherDataService.js
import { apiClient } from "../../../services/apiClient";
import { generateVCForOther } from "../../../services/otherService";
import {
  getDisplayCustomerName,
  getDisplayCustomerAddress,
  getDisplayCustomerPhone,
  getDisplayCustomerIdNumber,
  getDisplayCustomerBranchType,
  getDisplayCustomerBranchNumber,
} from "../../../utils/customerOverrideHelpers";

export const getOtherData = async (otherId, userId = null) => {
  try {
    // สร้าง VC Number
    const vcResult = await generateVCForOther(otherId);

    // ดึงข้อมูล
    // ✅ Print = Edit: ส่ง userId ไปด้วยเพื่ออัปเดต updated_by
    const response = await apiClient.get("/gateway.php", {
      action: "getOtherById",
      otherId: otherId,
      userId: userId, // ส่ง userId เพื่ออัปเดต updated_by
    });

    if (!response.success) {
      throw new Error(
        response.error || "ไม่สามารถดึงข้อมูล other services ได้"
      );
    }

    const other = response.data.other;
    const details = response.data.details || {};
    const passengers = response.data.passengers || [];
    const pricing = response.data.pricing || {};
    const rawCustomer = response.data.customer || {};

    // ดึงข้อมูลผู้ใช้ (updated_by หรือ created_by)
    const displayUserId = other.updated_by || other.created_by;
    const userIds = [displayUserId].filter(Boolean);
    let updatedByName = null;

    if (userIds.length > 0) {
      const usersResponse = await apiClient.post("/gateway.php", {
        action: "getUsersByIds",
        userIds: userIds,
      });

      if (usersResponse.success && usersResponse.data) {
        const userMap = new Map(
          usersResponse.data.map((user) => [user.id, user.fullname])
        );
        updatedByName = userMap.get(displayUserId) || null;
      }
    }

    // สร้าง customer object
    const otherWithOverride = {
      ...other,
      customer: rawCustomer,
      customer_override_data:
        other.customer_override_data || response.data.customer_override_data,
    };

    const customerInfo = {
      name: getDisplayCustomerName(otherWithOverride),
      address: getDisplayCustomerAddress(otherWithOverride),
      phone: getDisplayCustomerPhone(otherWithOverride),
      email: rawCustomer.email,
      taxId: getDisplayCustomerIdNumber(otherWithOverride),
      branch: getBranchDisplay(
        getDisplayCustomerBranchType(otherWithOverride),
        getDisplayCustomerBranchNumber(otherWithOverride)
      ),
    };

    // แปลงข้อมูลเอกสาร
    const voucherInfo = {
      vcNumber: other.vc_number || vcResult.vcNumber,
      date: formatDate(other.issue_date), // ✅ ใช้ other.issue_date แทน
      dueDate: formatDate(other.due_date), // ✅ เพิ่ม due_date
      salesPerson: "System",
    };

    // แปลงผู้โดยสาร
    const voucherPassengers = passengers.map((p, index) => ({
      id: p.id,
      passenger_name: p.passenger_name || "",
      passenger_type: p.passenger_type || "ADT",
    }));

    // แปลงข้อมูลบริการให้เข้ากับ VoucherTable
    // แปลงข้อมูลบริการให้เข้ากับ VoucherTable
    const voucherData = {
      serviceType: other.service_type,
      description: details.description || "",

      // ข้อมูลสำหรับแต่ละ serviceType
      tripDate: details.service_date || "",
      hotel: details.hotel_name || "",
      roomNo: "",
      pickupTime: "",
      reference: details.reference_code || "",
      remark: details.remark || "",

      // Hotel specific fields
      checkIn: details.check_in_date || "",
      checkOut: details.check_out_date || "",
      nights: details.nights || "",
    };

    return {
      success: true,
      data: {
        customer: customerInfo,
        invoice: voucherInfo,
        voucherData: voucherData,
        otherData: voucherData, // เพิ่มสำหรับ DocumentViewer
        passengers: voucherPassengers,
        pricing: pricing,
        customer_override_data: otherWithOverride.customer_override_data,
        vcResult: vcResult,
        updatedByName: updatedByName,
        issueDate: other.updated_at || other.created_at, // ใช้ updated_at หรือ created_at
      },
    };
  } catch (error) {
    console.error("Error in getOtherData:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateString;
  }
};

const getBranchDisplay = (branchType, branchNumber) => {
  if (branchType === "Branch" && branchNumber) {
    return `${branchType} ${branchNumber}`;
  }
  return branchType || "Head Office";
};
