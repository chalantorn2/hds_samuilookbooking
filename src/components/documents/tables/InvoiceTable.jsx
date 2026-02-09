// src/components/documents/tables/InvoiceTable.jsx
import React, { useMemo } from "react";
import {
  formatCurrencyWithDecimal,
  formatCurrency,
  numberToEnglishText,
} from "../services/documentDataMapper";

/**
 * InvoiceTable - ตารางสำหรับ Invoice และ Receipt
 * แยกจาก PrintInvoice.jsx โดยเก็บ structure และ logic เดิมทั้งหมด
 */
const InvoiceTable = ({
  passengers,
  flights,
  passengerTypes,
  extras,
  summary,
}) => {
  // 🔧 คำนวณความกว้างของ route-path สำหรับ dynamic grid
  const dynamicRouteGridCSS = useMemo(() => {
    if (!flights?.routes || flights.routes.length === 0) {
      return "";
    }

    const routesList = flights.routes.slice(0, 4).map((route) => {
      return route.origin_city_name && route.destination_city_name
        ? `${route.origin_city_name.toUpperCase()}-${route.destination_city_name.toUpperCase()}`
        : route.origin && route.destination
          ? `${route.origin}-${route.destination}`
          : "";
    });

    const maxPathLength = Math.max(...routesList.map((r) => r.length));
    const pathWidthPx = Math.max(120, maxPathLength * 7 + 40); // เพิ่ม padding 30px สำหรับ gap

    return `.print-route-grid { grid-template-columns: 40px 40px ${pathWidthPx}px 100px !important; }`;
  }, [flights]);

  return (
    <>
      {dynamicRouteGridCSS && <style>{dynamicRouteGridCSS}</style>}
      <div className="print-items-table">
        <table className="print-table">
          <thead>
            <tr>
              <th className="print-th-detail">รายละเอียด</th>
              <th className="print-th-amount">จำนวน</th>
            </tr>
          </thead>
          <tbody>
            {/* NAME Section - แสดง 6 บรรทัดเสมอ */}
            <tr>
              <td className="print-section-header">NAME /ชื่อผู้โดยสาร</td>
              <td className="print-td-amount"></td>
            </tr>
            {passengers.map((passenger, index) => (
              <tr key={`passenger-${index}`}>
                <td className="print-passenger-item">
                  <div className="print-passenger-grid">
                    <span className="passenger-index">
                      {passenger.displayData?.index || ""}
                    </span>
                    <span className="passenger-name">
                      {passenger.displayData?.name
                        ? passenger.displayData.name.length > 25
                          ? passenger.displayData.name.substring(0, 25) + "..."
                          : passenger.displayData.name
                        : "\u00A0"}
                    </span>
                    <span className="passenger-age">
                      {passenger.displayData?.age || "\u00A0"}
                    </span>
                    <span className="passenger-ticket">
                      {passenger.displayData?.ticketNumber || "\u00A0"}
                    </span>
                    <span className="passenger-code">
                      {passenger.displayData?.ticketCode || "\u00A0"}
                    </span>
                  </div>
                </td>
                <td className="print-td-amount"></td>
              </tr>
            ))}

            {/* AIR TICKET Section - 7 บรรทัดเสมอ (แบบ Deposit) */}
            <tr>
              <td className="print-section-header">
                AIR TICKET /ตั๋วเครื่องบิน
              </td>
              <td className="print-td-amount"></td>
            </tr>

            {/* AIR TICKET Section - 7 บรรทัดเสมอ (ฟิกซ์) */}
            {(() => {
              const MAX_AIR_TICKET_ROWS = 7;
              const airTicketRows = [];

              // เตรียม routes สำหรับแสดง (สูงสุด 4 routes) - เปลี่ยนเป็น object
              let routesList = [];
              if (flights?.routes && flights.routes.length > 0) {
                const maxRoutes = 4;
                routesList = flights.routes.slice(0, maxRoutes).map((route) => {
                  return {
                    flight: route.flight_number || route.flight || "",
                    // rbd: route.rbd || "",
                    date: route.date || "",
                    path:
                      route.origin_city_name && route.destination_city_name
                        ? `${route.origin_city_name.toUpperCase()}-${route.destination_city_name.toUpperCase()}`
                        : route.origin && route.destination
                          ? `${route.origin}-${route.destination}`
                          : "",
                    time:
                      route.departure_time && route.arrival_time
                        ? `${route.departure_time}-${route.arrival_time}`
                        : "",
                  };
                });
              } else if (flights?.routeDisplay) {
                routesList = [
                  {
                    flight: flights.routeDisplay,
                    // rbd: "",
                    date: "",
                    path: "",
                    time: "",
                  },
                ];
              }

              // เติมบรรทัดว่างให้ครบ 4 routes
              while (routesList.length < 4) {
                routesList.push({
                  flight: "",
                  /* rbd: "", */ date: "",
                  path: "",
                  time: "",
                });
              }

              // บรรทัดที่ 1: Supplier only
              airTicketRows.push(
                <tr key="air-0">
                  <td className="print-section-item print-airline-row">
                    <span className="print-airline-name">
                      {flights?.supplierName || ""}
                    </span>
                  </td>
                  <td className="print-td-amount"></td>
                </tr>,
              );

              const adultPrice =
                passengerTypes?.find((p) => p.type === "ADULT")?.priceDisplay ||
                "";
              const childPrice =
                passengerTypes?.find((p) => p.type === "CHILD")?.priceDisplay ||
                "";
              const infantPrice =
                passengerTypes?.find((p) => p.type === "INFANT")
                  ?.priceDisplay || "";

              // บรรทัดที่ 2: Route[0] + ADULT (ซ่อนข้อความถ้าไม่มีราคา)
              airTicketRows.push(
                <tr key="air-1">
                  <td className="print-section-item print-airline-row">
                    <div className="print-airline-name print-route-grid">
                      <span className="route-flight">
                        {routesList[0]?.flight || ""}
                      </span>
                      {/* <span className="route-rbd">{routesList[0]?.rbd || ""}</span> */}
                      <span className="route-date">
                        {routesList[0]?.date || ""}
                      </span>
                      <span className="route-path">
                        {routesList[0]?.path || ""}
                      </span>
                      <span className="route-time">
                        {routesList[0]?.time || ""}
                      </span>
                    </div>
                    <span className="print-passenger-type">
                      {adultPrice ? "ADULT" : ""}
                    </span>
                  </td>
                  <td className="print-td-amount">{adultPrice}</td>
                </tr>,
              );

              // บรรทัดที่ 3: Route[1] + CHILD (ซ่อนข้อความถ้าไม่มีราคา)
              airTicketRows.push(
                <tr key="air-2">
                  <td className="print-section-item print-airline-row">
                    <div className="print-airline-name print-route-grid">
                      <span className="route-flight">
                        {routesList[1]?.flight || ""}
                      </span>
                      {/* <span className="route-rbd">{routesList[1]?.rbd || ""}</span> */}
                      <span className="route-date">
                        {routesList[1]?.date || ""}
                      </span>
                      <span className="route-path">
                        {routesList[1]?.path || ""}
                      </span>
                      <span className="route-time">
                        {routesList[1]?.time || ""}
                      </span>
                    </div>
                    <span className="print-passenger-type">
                      {childPrice ? "CHILD" : ""}
                    </span>
                  </td>
                  <td className="print-td-amount">{childPrice}</td>
                </tr>,
              );

              // บรรทัดที่ 4: Route[2] + INFANT (ซ่อนข้อความถ้าไม่มีราคา)
              airTicketRows.push(
                <tr key="air-3">
                  <td className="print-section-item print-airline-row">
                    <div className="print-airline-name print-route-grid">
                      <span className="route-flight">
                        {routesList[2]?.flight || ""}
                      </span>
                      {/* <span className="route-rbd">{routesList[2]?.rbd || ""}</span> */}
                      <span className="route-date">
                        {routesList[2]?.date || ""}
                      </span>
                      <span className="route-path">
                        {routesList[2]?.path || ""}
                      </span>
                      <span className="route-time">
                        {routesList[2]?.time || ""}
                      </span>
                    </div>
                    <span className="print-passenger-type">
                      {infantPrice ? "INFANT" : ""}
                    </span>
                  </td>
                  <td className="print-td-amount">{infantPrice}</td>
                </tr>,
              );

              // บรรทัดที่ 5: Route[3] (แสดงแค่ route ไม่มีราคา)
              airTicketRows.push(
                <tr key="air-4">
                  <td className="print-section-item print-airline-row">
                    <div className="print-airline-name print-route-grid">
                      <span className="route-flight">
                        {routesList[3]?.flight || ""}
                      </span>
                      {/* <span className="route-rbd">{routesList[3]?.rbd || ""}</span> */}
                      <span className="route-date">
                        {routesList[3]?.date || ""}
                      </span>
                      <span className="route-path">
                        {routesList[3]?.path || ""}
                      </span>
                      <span className="route-time">
                        {routesList[3]?.time || ""}
                      </span>
                    </div>
                  </td>
                  <td className="print-td-amount"></td>
                </tr>,
              );

              // เติมบรรทัดว่างให้ครบ 7 บรรทัด
              while (airTicketRows.length < MAX_AIR_TICKET_ROWS) {
                airTicketRows.push(
                  <tr key={`empty-air-${airTicketRows.length}`}>
                    <td className="print-section-item">{"\u00A0"}</td>
                    <td className="print-td-amount">{"\u00A0"}</td>
                  </tr>,
                );
              }

              return airTicketRows;
            })()}

            {/* OTHER Section - 3 บรรทัดเสมอ */}
            <tr>
              <td className="print-section-header">Other</td>
              <td className="print-td-amount"></td>
            </tr>
            {(extras || []).map((extra, index) => (
              <tr key={`extra-${index}`}>
                <td className="print-section-item">
                  {extra.description || "\u00A0"}
                </td>
                <td className="print-td-amount">
                  {extra.priceDisplay || "\u00A0"}
                </td>
              </tr>
            ))}

            {/* Summary */}
            <tr className="print-summary-row">
              <td className="print-td-amount print-summary-label">Sub-Total</td>
              <td className="print-td-amount print-summary-value">
                {formatCurrencyWithDecimal(summary?.subtotal || 0)} Baht
              </td>
            </tr>
            <tr className="print-summary-row">
              <td className="print-td-amount print-summary-label">
                VAT {Math.floor(summary?.vatPercent || 0)}%
              </td>
              <td className="print-td-amount print-summary-value">
                {formatCurrency(summary?.vat || 0)} Baht
              </td>
            </tr>
            <tr className="print-total-row">
              <td className="print-total-label-cell">
                <span className="print-total-english-text">
                  ({numberToEnglishText(summary?.total || 0)} Baht)
                </span>
                <span className="print-td-amount print-summary-label">
                  Total
                </span>
              </td>
              <td className="print-td-amount print-summary-value">
                {formatCurrencyWithDecimal(summary?.total || 0)} Baht
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

export default InvoiceTable;
