<?php
// api/helpers/ReportCalculator.php
// Helper class สำหรับคำนวณ Cost/Sale/Profit ของ Reports
// ทำให้แก้ไข logic ง่าย ไม่ต้อง DROP/CREATE Views บ่อยๆ

class ReportCalculator
{
    /**
     * คำนวณ Cost/Sale/Profit สำหรับ booking เดียว
     *
     * @param array $booking ข้อมูล booking จาก database
     * @return array booking พร้อมคอลัมน์ที่คำนวณแล้ว
     */
    public static function calculateBookingFinancials($booking)
    {
        // 1. คำนวณ Ticket Cost (ต้นทุนตั๋ว)
        $ticket_cost = self::calculateTicketCost($booking);

        // 2. คำนวณ Ticket Sale (ราคาขายตั๋ว)
        $ticket_sale = self::calculateTicketSale($booking);

        // 3. คำนวณ Option Cost/Sale (บริการเสริม)
        $option_cost = self::calculateOptionCost($booking);
        $option_sale = self::calculateOptionSale($booking);

        // 4. คำนวณ Total Cost/Sale
        $total_cost = $ticket_cost + $option_cost;
        $total_sale = $ticket_sale + $option_sale;

        // 5. คำนวณ Profit
        $profit = $total_sale - $total_cost;

        // 6. Format Payment Detail
        $payment_detail = self::formatPaymentDetail($booking);

        // เพิ่มข้อมูลที่คำนวณแล้วลงใน booking
        $booking['ticket_cost'] = $ticket_cost;
        $booking['ticket_sale'] = $ticket_sale;
        $booking['option_cost'] = $option_cost;
        $booking['option_sale'] = $option_sale;
        $booking['total_cost'] = $total_cost;
        $booking['total_sale'] = $total_sale;
        $booking['profit'] = $profit;
        $booking['payment_detail'] = $payment_detail;

        return $booking;
    }

    /**
     * Format Payment Detail ตาม Requirements
     * - Cash: "เงินสด {amount}"
     * - Transfer: "{bank_name} {account_number}"
     * - No data: "" (empty string, ไม่ใช่ 'N/A')
     *
     * @param array $booking
     * @return string
     */
    private static function formatPaymentDetail($booking)
    {
        $paymentMethod = $booking['payment_method'] ?? '';
        $totalSale = floatval($booking['total_price'] ?? 0);
        $bankName = $booking['bank_name'] ?? '';
        $accountNumber = $booking['account_number'] ?? '';

        // ถ้า payment_method เป็น 'N/A' หรือว่าง ให้ return empty string
        if (empty($paymentMethod) || $paymentMethod === 'N/A') {
            return '';
        }

        if ($paymentMethod === 'Cash') {
            return 'เงินสด ' . number_format($totalSale, 2);
        } elseif ($paymentMethod === 'Transfer' && !empty($bankName)) {
            return trim($bankName . ' ' . $accountNumber);
        }

        return '';
    }

    /**
     * คำนวณ Ticket Cost (ต้นทุนตั๋ว)
     * = (adult_net_price * adult_pax) + (child_net_price * child_pax) + (infant_net_price * infant_pax)
     */
    private static function calculateTicketCost($booking)
    {
        $adult_cost = floatval($booking['adult_net_price'] ?? 0) * intval($booking['adult_pax'] ?? 0);
        $child_cost = floatval($booking['child_net_price'] ?? 0) * intval($booking['child_pax'] ?? 0);
        $infant_cost = floatval($booking['infant_net_price'] ?? 0) * intval($booking['infant_pax'] ?? 0);

        return $adult_cost + $child_cost + $infant_cost;
    }

    /**
     * คำนวณ Ticket Sale (ราคาขายตั๋ว)
     * = (adult_sale_price * adult_pax) + (child_sale_price * child_pax) + (infant_sale_price * infant_pax)
     */
    private static function calculateTicketSale($booking)
    {
        $adult_sale = floatval($booking['adult_sale_price'] ?? 0) * intval($booking['adult_pax'] ?? 0);
        $child_sale = floatval($booking['child_sale_price'] ?? 0) * intval($booking['child_pax'] ?? 0);
        $infant_sale = floatval($booking['infant_sale_price'] ?? 0) * intval($booking['infant_pax'] ?? 0);

        return $adult_sale + $child_sale + $infant_sale;
    }

    /**
     * คำนวณ Option Cost (ต้นทุนบริการเสริม)
     * สำหรับ Flight และ Deposit ที่มี *_extras table
     * สำหรับ Voucher และ Other = 0 (รวมอยู่ใน pricing แล้ว)
     */
    private static function calculateOptionCost($booking)
    {
        // Flight และ Deposit มี extras_net_total
        return floatval($booking['extras_net_total'] ?? 0);
    }

    /**
     * คำนวณ Option Sale (ราคาขายบริการเสริม)
     * สำหรับ Flight และ Deposit ที่มี *_extras table
     * สำหรับ Voucher และ Other = 0 (รวมอยู่ใน pricing แล้ว)
     */
    private static function calculateOptionSale($booking)
    {
        // Flight และ Deposit มี extras_sale_total
        return floatval($booking['extras_sale_total'] ?? 0);
    }

    /**
     * คำนวณ Sub Total สำหรับกลุ่มข้อมูล (เช่น รายวัน)
     *
     * @param array $bookings รายการ bookings ที่ต้องการรวม
     * @return array sub total ทุกคอลัมน์
     */
    public static function calculateSubTotal($bookings)
    {
        $subTotal = [
            'of_ticket' => 0,
            'ticket_cost' => 0,
            'ticket_sale' => 0,
            'option_cost' => 0,
            'option_sale' => 0,
            'total_cost' => 0,
            'total_sale' => 0,
            'profit' => 0
        ];

        foreach ($bookings as $booking) {
            $subTotal['of_ticket'] += intval($booking['pax_count'] ?? 0);
            $subTotal['ticket_cost'] += floatval($booking['ticket_cost'] ?? 0);
            $subTotal['ticket_sale'] += floatval($booking['ticket_sale'] ?? 0);
            $subTotal['option_cost'] += floatval($booking['option_cost'] ?? 0);
            $subTotal['option_sale'] += floatval($booking['option_sale'] ?? 0);
            $subTotal['total_cost'] += floatval($booking['total_cost'] ?? 0);
            $subTotal['total_sale'] += floatval($booking['total_sale'] ?? 0);
            $subTotal['profit'] += floatval($booking['profit'] ?? 0);
        }

        return $subTotal;
    }

    /**
     * คำนวณ Grand Total จากหลาย Sub Totals
     *
     * @param array $subTotals รายการ sub totals
     * @return array grand total
     */
    public static function calculateGrandTotal($subTotals)
    {
        $grandTotal = [
            'of_ticket' => 0,
            'ticket_cost' => 0,
            'ticket_sale' => 0,
            'option_cost' => 0,
            'option_sale' => 0,
            'total_cost' => 0,
            'total_sale' => 0,
            'profit' => 0
        ];

        foreach ($subTotals as $subTotal) {
            $grandTotal['of_ticket'] += intval($subTotal['of_ticket'] ?? 0);
            $grandTotal['ticket_cost'] += floatval($subTotal['ticket_cost'] ?? 0);
            $grandTotal['ticket_sale'] += floatval($subTotal['ticket_sale'] ?? 0);
            $grandTotal['option_cost'] += floatval($subTotal['option_cost'] ?? 0);
            $grandTotal['option_sale'] += floatval($subTotal['option_sale'] ?? 0);
            $grandTotal['total_cost'] += floatval($subTotal['total_cost'] ?? 0);
            $grandTotal['total_sale'] += floatval($subTotal['total_sale'] ?? 0);
            $grandTotal['profit'] += floatval($subTotal['profit'] ?? 0);
        }

        return $grandTotal;
    }

    /**
     * คำนวณ Grand Total จาก bookings โดยตรง (ไม่ผ่าน sub total)
     *
     * @param array $bookings รายการ bookings ทั้งหมด
     * @return array grand total
     */
    public static function calculateGrandTotalFromBookings($bookings)
    {
        return self::calculateSubTotal($bookings);
    }

    /**
     * คำนวณทั้งชุดสำหรับ Daily Summary (แยกตามวัน)
     *
     * @param array $data ข้อมูลดิบจาก database
     * @return array [daily_summary, grand_total]
     */
    public static function processDailySummary($data)
    {
        $dailySummary = [];
        $allSubTotals = [];

        // 1. คำนวณ financials สำหรับแต่ละ booking
        foreach ($data as &$row) {
            $row = self::calculateBookingFinancials($row);
        }
        unset($row); // CRITICAL: Unset reference to prevent duplicate bug

        // 2. จัดกลุ่มตามวันที่
        foreach ($data as $row) {
            $date = $row['create_date'];

            if (!isset($dailySummary[$date])) {
                $dailySummary[$date] = [
                    'date' => $date,
                    'bookings' => []
                ];
            }

            $dailySummary[$date]['bookings'][] = $row;
        }

        // 3. คำนวณ sub total สำหรับแต่ละวัน
        foreach ($dailySummary as &$day) {
            $day['sub_total'] = self::calculateSubTotal($day['bookings']);
            $allSubTotals[] = $day['sub_total'];
        }
        unset($day); // CRITICAL: Unset reference to prevent bugs

        // 4. คำนวณ grand total
        $grandTotal = self::calculateGrandTotal($allSubTotals);

        return [
            'daily_summary' => array_values($dailySummary),
            'grand_total' => $grandTotal
        ];
    }

    /**
     * Format ตัวเลขเป็น 2 ทศนิยม (ใช้สำหรับ response)
     *
     * @param array $data ข้อมูลที่ต้องการ format
     * @return array ข้อมูลที่ format แล้ว
     */
    public static function formatFinancialData($data)
    {
        $fields = ['ticket_cost', 'ticket_sale', 'option_cost', 'option_sale', 'total_cost', 'total_sale', 'profit'];

        foreach ($fields as $field) {
            if (isset($data[$field])) {
                $data[$field] = round(floatval($data[$field]), 2);
            }
        }

        return $data;
    }
}
