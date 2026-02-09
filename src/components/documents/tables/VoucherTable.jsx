// src/components/documents/tables/VoucherTable.jsx
import React from "react";

const VoucherTable = ({
  voucherData = {},
  passengers = [],
  summary = {},
  pricing = {},
  otherData = {},
}) => {
  console.log("VoucherTable received otherData:", otherData);
  console.log("VoucherTable received voucherData:", voucherData);

  const calculateTotalPax = () => {
    // ✅ แก้ไข: ดึง Pax จากฐานข้อมูลแทนนับจากจำนวนช่องชื่อผู้โดยสาร
    console.log("Pricing data:", pricing);
    console.log("Passengers data:", passengers);

    // เช็คว่า pricing object มีข้อมูล pax หรือไม่ (รองรับค่า 0)
    if (
      pricing &&
      typeof pricing === "object" &&
      ("adult_pax" in pricing ||
        "child_pax" in pricing ||
        "infant_pax" in pricing)
    ) {
      const adultPax = parseInt(pricing.adult_pax || 0);
      const childPax = parseInt(pricing.child_pax || 0);
      const infantPax = parseInt(pricing.infant_pax || 0);
      const total = adultPax + childPax + infantPax;
      console.log("Total from pricing (database):", total);
      return total;
    }

    // Fallback: นับจาก passengers array (กรณีไม่มี pricing)
    const passengerCount = passengers ? passengers.length : 0;
    console.log("Total from passengers array (fallback):", passengerCount);
    return passengerCount;
  };

  // จัดรูปแบบรายชื่อผู้โดยสาร - 6 บรรทัดเสมอ (แสดงได้ 5 ชื่อ)
  const formatPassengerNames = () => {
    const passengerSlots = [];
    const maxNames = 5;
    const totalRows = 6;

    // แสดงชื่อได้สูงสุด 5 ชื่อ
    for (let i = 0; i < maxNames; i++) {
      if (
        passengers[i] &&
        passengers[i].passenger_name &&
        passengers[i].passenger_name.trim()
      ) {
        passengerSlots.push(`${i + 1}. ${passengers[i].passenger_name.trim()}`);
      } else {
        passengerSlots.push(""); // บรรทัดว่าง
      }
    }

    // เพิ่มบรรทัดว่างที่ 6 เสมอ
    passengerSlots.push("");

    return passengerSlots;
  };

  const totalPax = calculateTotalPax();
  const passengerList = formatPassengerNames();

  // จัดรูปแบบ Remark ให้เป็น 2 บรรทัดสูงสุด พร้อม ...
  const formatRemark = (remark) => {
    if (!remark || remark.trim() === "") {
      return "";
    }

    // จำกัดความยาวสูงสุดประมาณ 2 บรรทัด (ประมาณ 150 ตัวอักษร)
    const maxLength = 150;
    if (remark.length > maxLength) {
      return remark.substring(0, maxLength) + "...";
    }

    return remark;
  };

  const displayRemark = formatRemark(voucherData?.remark);

  // จัดรูปแบบ Total Pax - เพิ่ม "คน" ถ้ามีข้อมูล
  const displayTotalPax = totalPax > 0 ? `${totalPax} คน` : "";

  // จัดรูปแบบ Pickup Time - เพิ่ม "น." ถ้ามีข้อมูล
  const displayPickupTime = voucherData?.pickupTime
    ? `${voucherData.pickupTime} น.`
    : "";

  return (
    <div className="print-items-table">
      <table className="print-table">
        <thead>
          <tr>
            <th className="print-th-detail">รายละเอียด</th>
          </tr>
        </thead>
        <tbody>
          {/* Row 1: Name และ Total Pax (2 คอลัม fixed width) */}
          <tr>
            <td className="print-section-item" style={{ paddingTop: "16px" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "none",
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        width: "55%",
                        verticalAlign: "top",
                        border: "none",
                        padding: "0",
                        paddingRight: "10px",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          border: "none",
                        }}
                      >
                        <tbody>
                          <tr>
                            <td
                              style={{
                                width: "110px",
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              <strong>Name :</strong>
                            </td>
                            <td
                              style={{
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              {passengerList.map((line, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    lineHeight: "1.5",
                                    minHeight: "20px",
                                  }}
                                >
                                  {line || ""}
                                </div>
                              ))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                    <td
                      style={{
                        width: "45%",
                        verticalAlign: "top",
                        border: "none",
                        padding: "0",
                        paddingLeft: "30px",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          border: "none",
                        }}
                      >
                        <tbody>
                          <tr>
                            <td
                              style={{
                                width: "110px",
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              <strong>Total Pax :</strong>
                            </td>
                            <td
                              style={{
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              {displayTotalPax}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Row 2: Description (เต็มความกว้าง) */}
          <tr>
            <td className="print-section-item">
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "none",
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        width: "110px",
                        verticalAlign: "top",
                        border: "none",
                        padding: "0",
                      }}
                    >
                      <strong>Description :</strong>
                    </td>
                    <td
                      style={{
                        verticalAlign: "top",
                        border: "none",
                        padding: "0",
                      }}
                    >
                      {voucherData?.description ||
                        otherData?.description ||
                        ""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Row 3: Date of Trip และ Pickup Time (2 คอลัม fixed width) */}
          <tr>
            <td className="print-section-item">
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "none",
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        width: "55%",
                        verticalAlign: "top",
                        border: "none",
                        padding: "0",
                        paddingRight: "10px",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          border: "none",
                        }}
                      >
                        <tbody>
                          <tr>
                            <td
                              style={{
                                width: "110px",
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              <strong>Date of Trip :</strong>
                            </td>
                            <td
                              style={{
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              {otherData?.serviceType === "hotel"
                                ? `IN ${otherData?.checkIn || ""} - OUT ${
                                    otherData?.checkOut || ""
                                  }`
                                : voucherData?.tripDate ||
                                  otherData?.tripDate ||
                                  ""}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                    <td
                      style={{
                        width: "45%",
                        verticalAlign: "top",
                        border: "none",
                        padding: "0",
                        paddingLeft: "30px",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          border: "none",
                        }}
                      >
                        <tbody>
                          <tr>
                            <td
                              style={{
                                width: "110px",
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              <strong>Pickup Time :</strong>
                            </td>
                            <td
                              style={{
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              {displayPickupTime}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Row 4: Hotel และ Room No (2 คอลัม fixed width) */}
          <tr>
            <td className="print-section-item">
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "none",
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        width: "55%",
                        verticalAlign: "top",
                        border: "none",
                        padding: "0",
                        paddingRight: "10px",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          border: "none",
                        }}
                      >
                        <tbody>
                          <tr>
                            <td
                              style={{
                                width: "110px",
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              <strong>Hotel :</strong>
                            </td>
                            <td
                              style={{
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              {voucherData?.hotel || otherData?.hotel || ""}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                    <td
                      style={{
                        width: "45%",
                        verticalAlign: "top",
                        border: "none",
                        padding: "0",
                        paddingLeft: "30px",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          border: "none",
                        }}
                      >
                        <tbody>
                          <tr>
                            <td
                              style={{
                                width: "110px",
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              <strong>Room No :</strong>
                            </td>
                            <td
                              style={{
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              {voucherData?.roomNo || ""}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Row 5: Service by และ Tel (2 คอลัม fixed width) */}
          <tr>
            <td className="print-section-item">
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "none",
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        width: "55%",
                        verticalAlign: "top",
                        border: "none",
                        padding: "0",
                        paddingRight: "10px",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          border: "none",
                        }}
                      >
                        <tbody>
                          <tr>
                            <td
                              style={{
                                width: "110px",
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              <strong>Service by :</strong>
                            </td>
                            <td
                              style={{
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              {voucherData?.supplierName || ""}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                    <td
                      style={{
                        width: "45%",
                        verticalAlign: "top",
                        border: "none",
                        padding: "0",
                        paddingLeft: "30px",
                      }}
                    >
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          border: "none",
                        }}
                      >
                        <tbody>
                          <tr>
                            <td
                              style={{
                                width: "110px",
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              <strong>Tel :</strong>
                            </td>
                            <td
                              style={{
                                verticalAlign: "top",
                                border: "none",
                                padding: "0",
                              }}
                            >
                              {voucherData?.supplierPhone || ""}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Row 6: Remark (เต็มความกว้าง, สูงสุด 2 บรรทัด) */}
          <tr>
            <td
              className="print-section-item"
              style={{ paddingBottom: "16px" }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "none",
                }}
              >
                <tbody>
                  <tr>
                    <td
                      style={{
                        width: "110px",
                        verticalAlign: "top",
                        border: "none",
                        padding: "0",
                      }}
                    >
                      <strong>Remark :</strong>
                    </td>
                    <td
                      style={{
                        verticalAlign: "top",
                        border: "none",
                        padding: "0",
                        lineHeight: "1.5",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {displayRemark}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default VoucherTable;
