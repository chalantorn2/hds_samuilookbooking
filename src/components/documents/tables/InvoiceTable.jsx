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
  remark,
}) => {
  // 🔧 คำนวณความกว้างของ route-path สำหรับ dynamic grid
  const dynamicRouteGridCSS = useMemo(() => {
    if (!flights?.routes || flights.routes.length === 0) {
      return "";
    }

    const routesList = flights.routes.slice(0, 5).map((route) => {
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
            {/* NAME Section - แสดงชื่อผู้โดยสาร + ราคาตามประเภท */}
            <tr>
              <td className="print-section-header">NAME /ชื่อผู้โดยสาร</td>
              <td className="print-td-amount"></td>
            </tr>
            {(() => {
              const priceList = [];
              const adt1Entry = passengerTypes?.find((p) => p.type === "ADT 1");
              const adt2Entry = passengerTypes?.find((p) => p.type === "ADT 2");
              const adt3Entry = passengerTypes?.find((p) => p.type === "ADT 3");
              if (adt1Entry?.priceDisplay) priceList.push({ label: "ADT 1", price: adt1Entry.priceDisplay });
              if (adt2Entry?.priceDisplay) priceList.push({ label: "ADT 2", price: adt2Entry.priceDisplay });
              if (adt3Entry?.priceDisplay) priceList.push({ label: "ADT 3", price: adt3Entry.priceDisplay });

              return passengers.map((passenger, index) => (
                <tr key={`passenger-${index}`}>
                  <td className="print-passenger-item print-airline-row">
                    <div className="print-passenger-grid">
                      <span className="passenger-index">
                        {passenger.displayData?.index || ""}
                      </span>
                      <span className="passenger-name">
                        {passenger.displayData?.name || "\u00A0"}
                      </span>
                    </div>
                    <span className="print-passenger-type">
                      {priceList[index]?.label || ""}
                    </span>
                  </td>
                  <td className="print-td-amount">{priceList[index]?.price || ""}</td>
                </tr>
              ));
            })()}

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

              // เตรียม routes สำหรับแสดง (สูงสุด 5 routes) - เปลี่ยนเป็น object
              let routesList = [];
              if (flights?.routes && flights.routes.length > 0) {
                const maxRoutes = 5;
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

              // เติมบรรทัดว่างให้ครบ 5 routes
              while (routesList.length < 5) {
                routesList.push({
                  flight: "",
                  /* rbd: "", */ date: "",
                  path: "",
                  time: "",
                });
              }

              // บรรทัดที่ 1-5: Route[0]-Route[4] (แสดงแค่ route ไม่มีราคา)
              for (let i = 0; i < 5; i++) {
                airTicketRows.push(
                  <tr key={`air-${i + 1}`}>
                    <td className="print-section-item print-airline-row">
                      <div className="print-airline-name print-route-grid">
                        <span className="route-flight">
                          {routesList[i]?.flight || ""}
                        </span>
                        <span className="route-date">
                          {routesList[i]?.date || ""}
                        </span>
                        <span className="route-path">
                          {routesList[i]?.path || ""}
                        </span>
                        <span className="route-time">
                          {routesList[i]?.time || ""}
                        </span>
                      </div>
                    </td>
                    <td className="print-td-amount"></td>
                  </tr>,
                );
              }

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

            {/* OTHER Section - 3 บรรทัดเสมอ (แสดง Remark แทน) */}
            <tr>
              <td className="print-section-header">Remark</td>
              <td className="print-td-amount"></td>
            </tr>
            {(() => {
              const MIN_OTHER_ROWS = 3;
              const rows = [];
              // บรรทัดแรก: แสดง Remark
              rows.push(
                <tr key="other-remark">
                  <td className="print-section-item">
                    {remark || "\u00A0"}
                  </td>
                  <td className="print-td-amount">{"\u00A0"}</td>
                </tr>
              );
              // เติมบรรทัดว่างให้ครบ 3 บรรทัด
              for (let i = rows.length; i < MIN_OTHER_ROWS; i++) {
                rows.push(
                  <tr key={`other-empty-${i}`}>
                    <td className="print-section-item">{"\u00A0"}</td>
                    <td className="print-td-amount">{"\u00A0"}</td>
                  </tr>
                );
              }
              return rows;
            })()}

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
