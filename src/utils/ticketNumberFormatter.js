// src/utils/ticketNumberFormatter.js
// Standard Ticket Number Formatter - ใช้ตรรกะเดียวกับ useFlightTicketsData
// สร้างเพื่อแก้ปัญหาความไม่สอดคล้องระหว่าง FlightTicketsView, InvoiceList, ReceiptList

/**
 * จัดรูปแบบ Ticket Number Display ตามมาตรฐาน FlightTicketsView
 *
 * ตรรกะ:
 * - ใช้เฉพาะ ticket_code จาก passengers ทั้งหมด
 * - 1 passenger: แสดง ticket_code เดียว
 * - 2+ passengers: แสดง "firstCode-lastThreeDigits"
 * - ไม่มี ticket_code: แสดง "-"
 *
 * @param {Array} passengers - Array ของ passenger objects
 * @param {string} passengers[].ticket_code - รหัสตั๋ว
 * @param {string} passengers[].passenger_name - ชื่อผู้โดยสาร (optional)
 * @returns {string} - Ticket number display
 */
export const formatTicketNumber = (passengers = []) => {
  // ตรวจสอบ input
  if (!Array.isArray(passengers) || passengers.length === 0) {
    return "-";
  }

  // รวบรวม ticket codes ที่ไม่เป็นค่าว่าง
  const ticketCodes = [];

  passengers.forEach((passenger) => {
    const ticketCode = passenger?.ticket_code;

    // ตรวจสอบว่า ticket_code มีค่าและไม่เป็นค่าว่าง
    if (
      ticketCode &&
      typeof ticketCode === "string" &&
      ticketCode.trim() !== ""
    ) {
      ticketCodes.push(ticketCode.trim());
    }
  });

  // ถ้าไม่มี ticket code เลย
  if (ticketCodes.length === 0) {
    return "-";
  }

  // ถ้ามี ticket code เดียว
  if (ticketCodes.length === 1) {
    return ticketCodes[0];
  }

  // ถ้ามีหลาย ticket codes - สร้าง range format
  const firstCode = ticketCodes[0];
  const lastCode = ticketCodes[ticketCodes.length - 1];

  // เอา 3 หลักสุดท้ายของ code สุดท้าย
  const lastThreeDigits = lastCode.slice(-3);

  return `${firstCode}-${lastThreeDigits}`;
};

/**
 * จัดรูปแบบ Passenger Display (bonus utility)
 *
 * @param {Array} passengers - Array ของ passenger objects
 * @param {string} passengers[].passenger_name - ชื่อผู้โดยสาร
 * @returns {string} - Passenger display
 */
export const formatPassengerDisplay = (passengers = []) => {
  if (!Array.isArray(passengers) || passengers.length === 0) {
    return "-";
  }

  // กรองผู้โดยสารที่มีชื่อ
  const validPassengers = passengers.filter(
    (p) =>
      p?.passenger_name &&
      typeof p.passenger_name === "string" &&
      p.passenger_name.trim() !== ""
  );

  if (validPassengers.length === 0) {
    return "-";
  }

  const firstName = validPassengers[0].passenger_name.trim();

  if (validPassengers.length === 1) {
    return firstName;
  }

  const additionalCount = validPassengers.length - 1;
  return `${firstName}...+${additionalCount}`;
};

/**
 * ตรวจสอบว่าข้อมูล passenger มีครบถ้วนหรือไม่
 *
 * @param {Object} passenger - Passenger object
 * @returns {Object} - Validation result
 */
export const validatePassengerData = (passenger) => {
  const result = {
    isValid: false,
    hasName: false,
    hasTicketCode: false,
    hasTicketNumber: false,
    errors: [],
  };

  if (!passenger || typeof passenger !== "object") {
    result.errors.push("Passenger must be an object");
    return result;
  }

  // ตรวจสอบชื่อ
  if (
    passenger.passenger_name &&
    typeof passenger.passenger_name === "string" &&
    passenger.passenger_name.trim() !== ""
  ) {
    result.hasName = true;
  }

  // ตรวจสอบ ticket_code
  if (
    passenger.ticket_code &&
    typeof passenger.ticket_code === "string" &&
    passenger.ticket_code.trim() !== ""
  ) {
    result.hasTicketCode = true;
  }

  // ตรวจสอบ ticket_number
  if (
    passenger.ticket_number &&
    typeof passenger.ticket_number === "string" &&
    passenger.ticket_number.trim() !== ""
  ) {
    result.hasTicketNumber = true;
  }

  // ถือว่า valid ถ้ามีชื่อหรือ ticket code
  result.isValid = result.hasName || result.hasTicketCode;

  if (!result.isValid) {
    result.errors.push("Passenger must have either name or ticket_code");
  }

  return result;
};

/**
 * แปลงข้อมูลจาก API response เป็น format ที่ใช้ได้
 * รองรับทั้ง format จาก PHP backend และ Supabase
 *
 * @param {Array|Object} apiResponse - Response จาก API
 * @returns {Array} - Normalized passenger array
 */
export const normalizePassengerData = (apiResponse) => {
  if (!apiResponse) {
    return [];
  }

  // ถ้าเป็น array แล้ว
  if (Array.isArray(apiResponse)) {
    return apiResponse;
  }

  // ถ้าเป็น object ที่มี passengers field
  if (apiResponse.passengers && Array.isArray(apiResponse.passengers)) {
    return apiResponse.passengers;
  }

  // ถ้าเป็น object ที่มี tickets_passengers field (Supabase format)
  if (
    apiResponse.tickets_passengers &&
    Array.isArray(apiResponse.tickets_passengers)
  ) {
    return apiResponse.tickets_passengers;
  }

  // ถ้าเป็น single passenger object
  if (apiResponse.passenger_name || apiResponse.ticket_code) {
    return [apiResponse];
  }

  return [];
};

// Export ทั้งหมดเป็น default object สำหรับ import แบบ namespace
const TicketFormatter = {
  formatTicketNumber,
  formatPassengerDisplay,
  validatePassengerData,
  normalizePassengerData,
};

export default TicketFormatter;
