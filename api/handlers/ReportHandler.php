<?php
// api/handlers/ReportHandler.php
// Report handler for Ticket Reports (PO with Invoice only)

require_once 'BaseHandler.php';
require_once __DIR__ . '/../helpers/ReportCalculator.php';

class ReportHandler extends BaseHandler
{
    /**
     * Handle report actions
     */
    public function handle($action)
    {
        try {
            // Check database connection
            $dbCheck = $this->checkDatabaseConnection();
            if ($dbCheck) {
                return $dbCheck;
            }

            switch ($action) {
                // ===== เมนูเดิม (Ticket Report เท่านั้น) =====
                case 'getTicketDailyReport':
                    return $this->getTicketDailyReport();
                case 'getTicketInvoiceReport':
                    return $this->getTicketInvoiceReport();
                case 'getTicketCustomerReport':
                    return $this->getTicketCustomerReport();
                case 'getTicketSupplierReport':
                    return $this->getTicketSupplierReport();
                case 'getTicketTypeReport':
                    return $this->getTicketTypeReport();
                case 'updatePaymentStatus':
                    return $this->updatePaymentStatus();
                case 'getPaymentDetails':
                    return $this->getPaymentDetails();

                    // ===== เมนูใหม่ (Report ที่รวม Flight+Voucher+Other+Deposit) =====
                case 'getDailyReportAll':
                    return $this->getDailyReportAll();
                case 'getAllInvoiceReportNew':
                    return $this->getAllInvoiceReportNew();
                case 'getCustomerReportNew':
                    return $this->getCustomerReportNew();
                case 'getSupplierReportNew':
                    return $this->getSupplierReportNew();
                case 'getTicketTypeReportNew':
                    return $this->getTicketTypeReportNew();
                case 'getSpecialReport':
                    return $this->getSpecialReport();
                case 'getOutstandingReceivables':
                    return $this->getOutstandingReceivables();

                    // ===== Payment Management =====
                case 'updatePaymentStatus':
                    return $this->updatePaymentStatus();
                case 'savePaymentDetail':
                    return $this->savePaymentDetail();
                case 'savePaymentDetails':
                    return $this->savePaymentDetails();

                    // ===== Payment Group Management (Link Multiple POs) =====
                case 'linkPOs':
                    return $this->linkPOs();
                case 'unlinkPO':
                    return $this->unlinkPO();
                case 'getAvailablePOsForLink':
                    return $this->getAvailablePOsForLink();
                case 'getPaymentGroupInfo':
                    return $this->getPaymentGroupInfo();
                case 'getBookingDetails':
                    return $this->getBookingDetails();

                default:
                    return $this->errorResponse("Unknown report action: {$action}");
            }
        } catch (Exception $e) {
            $this->logMessage("ReportHandler error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Report handler error: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 1. Daily Report - Ticket Report with date range selection
     */
    private function getTicketDailyReport()
    {
        $startDate = $this->request['start_date'] ?? null;
        $endDate = $this->request['end_date'] ?? null;

        if (!$startDate || !$endDate) {
            return $this->errorResponse('Start date and end date are required', 400);
        }

        try {
            $tickets = $this->getTicketsWithInvoice($startDate, $endDate);

            return $this->successResponse($tickets, 'Daily report retrieved successfully', count($tickets));
        } catch (Exception $e) {
            $this->logMessage("Error in getTicketDailyReport: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch daily report', 500);
        }
    }

    /**
     * 2. Report All Invoice - With daily summary and grand total
     */
    private function getTicketInvoiceReport()
    {
        $startDate = $this->request['start_date'] ?? null;
        $endDate = $this->request['end_date'] ?? null;

        if (!$startDate || !$endDate) {
            return $this->errorResponse('Start date and end date are required', 400);
        }

        try {
            $tickets = $this->getTicketsWithInvoice($startDate, $endDate);

            // Group by date and calculate daily totals
            $dailySummary = [];
            $grandTotal = 0;

            foreach ($tickets as $ticket) {
                $date = date('Y-m-d', strtotime($ticket['issue_date']));

                if (!isset($dailySummary[$date])) {
                    $dailySummary[$date] = [
                        'date' => $date,
                        'total_sales' => 0,
                        'ticket_count' => 0,
                        'tickets' => []
                    ];
                }

                $dailySummary[$date]['total_sales'] += floatval($ticket['grand_total'] ?? 0);
                $dailySummary[$date]['ticket_count']++;
                $dailySummary[$date]['tickets'][] = $ticket;

                $grandTotal += floatval($ticket['grand_total'] ?? 0);
            }

            // Sort by date descending
            krsort($dailySummary);

            $result = [
                'daily_summary' => array_values($dailySummary),
                'grand_total' => $grandTotal,
                'total_tickets' => count($tickets),
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate
                ]
            ];

            return $this->successResponse($result, 'Invoice report retrieved successfully');
        } catch (Exception $e) {
            $this->logMessage("Error in getTicketInvoiceReport: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch invoice report', 500);
        }
    }

    /**
     * 3. Report By Customer
     */
    private function getTicketCustomerReport()
    {
        $startDate = $this->request['start_date'] ?? null;
        $endDate = $this->request['end_date'] ?? null;
        $customerCode = $this->request['customer_code'] ?? null;

        if (!$startDate || !$endDate) {
            return $this->errorResponse('Start date and end date are required', 400);
        }

        try {
            $tickets = $this->getTicketsWithInvoice($startDate, $endDate, [
                'customer_code' => $customerCode
            ]);

            // If no customer specified, group by customer
            if (empty($customerCode)) {
                $grouped = $this->groupByCustomer($tickets);
                return $this->successResponse($grouped, 'Customer report retrieved successfully');
            }

            return $this->successResponse($tickets, 'Customer report retrieved successfully', count($tickets));
        } catch (Exception $e) {
            $this->logMessage("Error in getTicketCustomerReport: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch customer report', 500);
        }
    }

    /**
     * 4. Report By Supplier (Airline)
     */
    private function getTicketSupplierReport()
    {
        $startDate = $this->request['start_date'] ?? null;
        $endDate = $this->request['end_date'] ?? null;
        $supplierCode = $this->request['supplier_code'] ?? null;

        if (!$startDate || !$endDate) {
            return $this->errorResponse('Start date and end date are required', 400);
        }

        try {
            $tickets = $this->getTicketsWithInvoice($startDate, $endDate, [
                'supplier_code' => $supplierCode
            ]);

            // If no supplier specified, group by supplier
            if (empty($supplierCode)) {
                $grouped = $this->groupBySupplier($tickets);
                return $this->successResponse($grouped, 'Supplier report retrieved successfully');
            }

            return $this->successResponse($tickets, 'Supplier report retrieved successfully', count($tickets));
        } catch (Exception $e) {
            $this->logMessage("Error in getTicketSupplierReport: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch supplier report', 500);
        }
    }

    /**
     * 5. Report By Ticket Type
     */
    private function getTicketTypeReport()
    {
        $startDate = $this->request['start_date'] ?? null;
        $endDate = $this->request['end_date'] ?? null;
        $ticketType = $this->request['ticket_type'] ?? null;

        if (!$startDate || !$endDate) {
            return $this->errorResponse('Start date and end date are required', 400);
        }

        try {
            $tickets = $this->getTicketsWithInvoice($startDate, $endDate, [
                'ticket_type' => $ticketType
            ]);

            // If no type specified, group by ticket type
            if (empty($ticketType)) {
                $grouped = $this->groupByTicketType($tickets);
                return $this->successResponse($grouped, 'Ticket type report retrieved successfully');
            }

            return $this->successResponse($tickets, 'Ticket type report retrieved successfully', count($tickets));
        } catch (Exception $e) {
            $this->logMessage("Error in getTicketTypeReport: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch ticket type report', 500);
        }
    }

    /**
     * Helper: Get Tickets with Invoice only (PO with invoice_date not null)
     */
    private function getTicketsWithInvoice($startDate, $endDate, $filters = [])
    {
        // Build WHERE clause with filters
        $whereConditions = [
            "td.issue_date IS NOT NULL", // Only tickets with invoice
            "td.issue_date >= :start_date",
            "td.issue_date <= :end_date",
            "bt.status != 'cancelled'"
        ];

        $params = [
            'start_date' => $startDate,
            'end_date' => $endDate
        ];

        // Add customer filter
        if (!empty($filters['customer_code'])) {
            $whereConditions[] = "c.code = :customer_code";
            $params['customer_code'] = $filters['customer_code'];
        }

        // Add supplier filter
        if (!empty($filters['supplier_code'])) {
            $whereConditions[] = "i.code = :supplier_code";
            $params['supplier_code'] = $filters['supplier_code'];
        }

        // Add ticket type filter
        if (!empty($filters['ticket_type'])) {
            $whereConditions[] = "tai.ticket_type = :ticket_type";
            $params['ticket_type'] = $filters['ticket_type'];
        }

        $whereClause = implode(' AND ', $whereConditions);

        $sql = "
            SELECT
                bt.id as booking_id,
                bt.reference_number,
                bt.po_number,
                td.issue_date,
                td.grand_total,
                c.name as customer_name,
                c.code as customer_code,
                i.name as supplier_name,
                i.code as supplier_code,
                GROUP_CONCAT(DISTINCT tp.passenger_name ORDER BY tp.id SEPARATOR ', ') as pax_names,
                COUNT(DISTINCT tp.id) as pax_count,
                GROUP_CONCAT(DISTINCT CONCAT(tr.origin, '-', tr.destination) ORDER BY tr.id SEPARATOR ' / ') as routing,
                GROUP_CONCAT(DISTINCT tp.ticket_number ORDER BY tp.id SEPARATOR ', ') as ticket_numbers,
                tai.ticket_type,
                bt.payment_status,
                bt.created_at,
                bt.status
            FROM bookings_ticket bt
            LEFT JOIN customers c ON bt.customer_id = c.id
            LEFT JOIN information i ON bt.information_id = i.id
            LEFT JOIN tickets_detail td ON bt.id = td.bookings_ticket_id
            LEFT JOIN tickets_passengers tp ON bt.id = tp.bookings_ticket_id
            LEFT JOIN tickets_routes tr ON bt.id = tr.bookings_ticket_id
            LEFT JOIN ticket_additional_info tai ON bt.id = tai.bookings_ticket_id
            WHERE {$whereClause}
            GROUP BY bt.id
            ORDER BY td.issue_date DESC
        ";

        $result = $this->db->raw($sql, $params);

        if (!$result['success']) {
            $this->logMessage("Error fetching tickets: " . ($result['error'] ?? 'Unknown error'), 'ERROR');
            return [];
        }

        return array_map(function ($row) {
            $formattedRouting = $this->generateMultiSegmentRouteFromString($row['routing'] ?? '-');

            return [
                'booking_id' => $row['booking_id'],
                'reference_number' => $row['reference_number'],
                'po_number' => $row['po_number'],
                'issue_date' => $row['issue_date'],
                'customer_name' => $row['customer_name'],
                'customer_code' => $row['customer_code'],
                'supplier_name' => $row['supplier_name'],
                'supplier_code' => $row['supplier_code'],
                'pax_names' => $row['pax_names'] ?? '-',
                'pax_count' => $row['pax_count'] ?? 0,
                'routing' => $formattedRouting,
                'ticket_numbers' => $row['ticket_numbers'] ?? '-',
                'ticket_type' => $row['ticket_type'] ?? 'N/A',
                'grand_total' => floatval($row['grand_total'] ?? 0),
                'payment_status' => $row['payment_status'] ?? 'pending',
                'created_at' => $row['created_at'],
                'status' => $row['status']
            ];
        }, $result['data']);
    }

    /**
     * Helper: Group tickets by customer
     */
    private function groupByCustomer($tickets)
    {
        $grouped = [];

        foreach ($tickets as $ticket) {
            $customerCode = $ticket['customer_code'] ?? 'N/A';
            $customerName = $ticket['customer_name'] ?? 'Unknown';

            if (!isset($grouped[$customerCode])) {
                $grouped[$customerCode] = [
                    'customer_code' => $customerCode,
                    'customer_name' => $customerName,
                    'total_sales' => 0,
                    'ticket_count' => 0,
                    'tickets' => []
                ];
            }

            $grouped[$customerCode]['total_sales'] += $ticket['grand_total'];
            $grouped[$customerCode]['ticket_count']++;
            $grouped[$customerCode]['tickets'][] = $ticket;
        }

        // Sort by total_sales descending
        usort($grouped, function ($a, $b) {
            return $b['total_sales'] <=> $a['total_sales'];
        });

        return array_values($grouped);
    }

    /**
     * Helper: Group tickets by supplier (airline)
     */
    private function groupBySupplier($tickets)
    {
        $grouped = [];

        foreach ($tickets as $ticket) {
            $supplierCode = $ticket['supplier_code'] ?? 'N/A';
            $supplierName = $ticket['supplier_name'] ?? 'Unknown';

            if (!isset($grouped[$supplierCode])) {
                $grouped[$supplierCode] = [
                    'supplier_code' => $supplierCode,
                    'supplier_name' => $supplierName,
                    'total_sales' => 0,
                    'ticket_count' => 0,
                    'tickets' => []
                ];
            }

            $grouped[$supplierCode]['total_sales'] += $ticket['grand_total'];
            $grouped[$supplierCode]['ticket_count']++;
            $grouped[$supplierCode]['tickets'][] = $ticket;
        }

        // Sort by total_sales descending
        usort($grouped, function ($a, $b) {
            return $b['total_sales'] <=> $a['total_sales'];
        });

        return array_values($grouped);
    }

    /**
     * Helper: Group tickets by ticket type
     */
    private function groupByTicketType($tickets)
    {
        $grouped = [];

        foreach ($tickets as $ticket) {
            $ticketType = $ticket['ticket_type'] ?? 'N/A';

            if (!isset($grouped[$ticketType])) {
                $grouped[$ticketType] = [
                    'ticket_type' => $ticketType,
                    'total_sales' => 0,
                    'ticket_count' => 0,
                    'tickets' => []
                ];
            }

            $grouped[$ticketType]['total_sales'] += $ticket['grand_total'];
            $grouped[$ticketType]['ticket_count']++;
            $grouped[$ticketType]['tickets'][] = $ticket;
        }

        // Sort by total_sales descending
        usort($grouped, function ($a, $b) {
            return $b['total_sales'] <=> $a['total_sales'];
        });

        return array_values($grouped);
    }

    /**
     * Update payment status (รองรับทุก booking type)
     */
    private function updatePaymentStatus()
    {
        $bookingType = $this->request['booking_type'] ?? null;
        $bookingId = $this->request['booking_id'] ?? null;
        $paymentStatus = $this->request['payment_status'] ?? null;

        if (!$bookingType || !$bookingId || !$paymentStatus) {
            return $this->errorResponse('Missing required fields', 400);
        }

        try {
            $this->db->beginTransaction();

            // Map booking_type to table name
            $tableMap = [
                'Flight' => 'bookings_ticket',
                'Voucher-BUS' => 'bookings_voucher',
                'Voucher-BOAT' => 'bookings_voucher',
                'Voucher-TOUR' => 'bookings_voucher',
                'Other-INSURANCE' => 'bookings_other',
                'Other-HOTEL' => 'bookings_other',
                'Other-TRAIN' => 'bookings_other',
                'Other-VISA' => 'bookings_other',
                'Other-OTHER' => 'bookings_other',
                'Deposit' => 'bookings_deposit'
            ];

            $tableName = $tableMap[$bookingType] ?? null;

            if (!$tableName) {
                $this->db->rollback();
                return $this->errorResponse('Invalid booking type', 400);
            }

            // Update payment status in booking table
            $updateData = ['payment_status' => $paymentStatus];
            $result = $this->db->update($tableName, $updateData, 'id = :id', ['id' => $bookingId]);

            if (!$result['success']) {
                $this->db->rollback();
                return $this->errorResponse('Failed to update payment status', 500);
            }

            $this->db->commit();

            return $this->successResponse([
                'message' => 'Payment status updated successfully'
            ]);
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logMessage("Error updating payment status: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to update payment status', 500);
        }
    }

    /**
     * Save payment detail (Cash/Transfer info)
     */
    private function savePaymentDetail()
    {
        $bookingType = $this->request['booking_type'] ?? null;
        $bookingId = $this->request['booking_id'] ?? null;
        $paymentMethod = $this->request['payment_method'] ?? null;
        $amount = $this->request['amount'] ?? null;
        $bankName = $this->request['bank_name'] ?? null;
        $accountNumber = $this->request['account_number'] ?? null;

        if (!$bookingType || !$bookingId || !$paymentMethod) {
            return $this->errorResponse('Missing required fields: booking_type, booking_id, or payment_method', 400);
        }

        try {
            $this->db->beginTransaction();

            // Map booking_type to payment_tracking type
            $typeMap = [
                'Flight' => 'flight',
                'Voucher-BUS' => 'voucher',
                'Voucher-BOAT' => 'voucher',
                'Voucher-TOUR' => 'voucher',
                'Other-INSURANCE' => 'other',
                'Other-HOTEL' => 'other',
                'Other-TRAIN' => 'other',
                'Other-VISA' => 'other',
                'Other-OTHER' => 'other',
                'Deposit' => 'deposit'
            ];

            $trackingType = $typeMap[$bookingType] ?? null;

            if (!$trackingType) {
                $this->db->rollback();
                return $this->errorResponse('Invalid booking type', 400);
            }

            // Check if payment tracking record exists
            $checkSql = "SELECT id FROM payment_tracking WHERE booking_type = :booking_type AND booking_id = :booking_id";
            $checkResult = $this->db->raw($checkSql, [
                'booking_type' => $trackingType,
                'booking_id' => $bookingId
            ]);

            $paymentData = [
                'payment_method' => $paymentMethod,
                'bank_name' => $bankName,
                'account_number' => $accountNumber,
                'paid_amount' => $amount,
                'payment_date' => date('Y-m-d')
            ];

            if ($checkResult['success'] && count($checkResult['data']) > 0) {
                // Update existing
                $this->db->update('payment_tracking', $paymentData, 'id = :id', ['id' => $checkResult['data'][0]['id']]);
            } else {
                // Insert new
                $paymentData['booking_type'] = $trackingType;
                $paymentData['booking_id'] = $bookingId;
                $paymentData['reference_number'] = ''; // Will be updated from booking table if needed
                $this->db->insert('payment_tracking', $paymentData);
            }

            // Format payment_detail for response
            $paymentDetail = '';
            if ($paymentMethod === 'Cash') {
                $paymentDetail = 'เงินสด ' . number_format($amount, 2);
            } elseif ($paymentMethod === 'Transfer' && $bankName) {
                $paymentDetail = trim($bankName . ' ' . $accountNumber);
            }

            $this->db->commit();

            return $this->successResponse([
                'message' => 'Payment detail saved successfully',
                'payment_detail' => $paymentDetail
            ]);
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logMessage("Error saving payment detail: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to save payment detail', 500);
        }
    }

    /**
     * Get payment details for a booking
     */
    private function getPaymentDetails()
    {
        $bookingId = $this->request['booking_id'] ?? null;

        if (!$bookingId) {
            return $this->errorResponse('Booking ID is required', 400);
        }

        try {
            $sql = "SELECT * FROM payment_tracking WHERE booking_type = 'ticket' AND booking_id = :booking_id";
            $result = $this->db->raw($sql, ['booking_id' => $bookingId]);

            if ($result['success'] && count($result['data']) > 0) {
                return $this->successResponse($result['data'][0]);
            }

            return $this->successResponse(null);
        } catch (Exception $e) {
            $this->logMessage("Error getting payment details: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to get payment details', 500);
        }
    }

    /**
     * Generate Multi-Segment Route Format
     * Converts routes array to formatted string like "BKK-HKT-CNX" or "BKK-HKT//CNX-BKK"
     */
    private function generateMultiSegmentRouteFromString($routingString)
    {
        if (empty($routingString) || $routingString === '-') {
            return '-';
        }

        // Parse the routing string "BKK-HKT / HKT-CNX" into routes array
        $segments = explode(' / ', $routingString);
        $routes = [];

        foreach ($segments as $segment) {
            $parts = explode('-', $segment);
            if (count($parts) === 2) {
                $routes[] = [
                    'origin' => trim($parts[0]),
                    'destination' => trim($parts[1])
                ];
            }
        }

        if (empty($routes)) {
            return $routingString;
        }

        // Use the same logic as generateMultiSegmentRoute
        $routeSegments = [];
        $currentSegment = [];
        $totalAirports = 0;
        $maxAirports = 5;

        foreach ($routes as $index => $route) {
            $origin = $route['origin'];
            $destination = $route['destination'];

            if (empty($currentSegment)) {
                // Start new segment
                $currentSegment = [$origin, $destination];
                $totalAirports = 2;
            } else {
                // Check if continuous with current segment
                $lastDestination = end($currentSegment);

                if ($origin === $lastDestination) {
                    // Continuous - check if adding destination exceeds limit
                    if ($totalAirports + 1 <= $maxAirports) {
                        $currentSegment[] = $destination;
                        $totalAirports++;
                    } else {
                        // Exceeds limit - save current segment and stop
                        $routeSegments[] = implode('-', $currentSegment);
                        break;
                    }
                } else {
                    // Not continuous - save current segment and check if new segment fits
                    $routeSegments[] = implode('-', $currentSegment);

                    if ($totalAirports + 2 <= $maxAirports) {
                        $currentSegment = [$origin, $destination];
                        $totalAirports += 2;
                    } else {
                        // Exceeds limit - stop
                        break;
                    }
                }
            }

            // If last route, save current segment
            if ($index === count($routes) - 1 && !empty($currentSegment)) {
                $routeSegments[] = implode('-', $currentSegment);
            }
        }

        return implode('//', $routeSegments);
    }

    // ============================================================================
    // NEW REPORT METHODS (ใช้ Database Views)
    // ============================================================================

    /**
     * 1. Daily Report All - รายงานรายวัน (รวมทุกประเภท: Flight+Voucher+Other+Deposit)
     * ใช้ view_daily_report_all
     */
    private function getDailyReportAll()
    {
        $date = $this->request['date'] ?? date('Y-m-d'); // Default: วันนี้

        try {
            $sql = "
                SELECT
                    booking_type,
                    booking_id,
                    create_date,
                    booking_ref_no,
                    customer_name,
                    customer_code,
                    supplier_name,
                    supplier_code,
                    pax_name,
                    pax_count,
                    routing_detail,
                    booking_code,
                    total_price,
                    payment_status,
                    payment_method,
                    bank_name,
                    account_number,
                    ticket_type,
                    ticket_numbers
                FROM view_daily_report_all
                WHERE create_date = :date
                ORDER BY created_at DESC
            ";

            $result = $this->db->raw($sql, ['date' => $date]);

            if (!$result['success']) {
                return $this->errorResponse('Failed to fetch daily report', 500);
            }

            $data = $result['data'];

            // Format payment_detail ตาม Requirements
            $formattedData = array_map(function ($row) {
                $paymentDetail = '';

                if ($row['payment_method'] === 'Cash') {
                    $paymentDetail = 'เงินสด ' . number_format($row['total_price'], 2);
                } elseif ($row['payment_method'] === 'Transfer' && !empty($row['bank_name'])) {
                    $paymentDetail = $row['bank_name'] . ' ' . ($row['account_number'] ?? '');
                } else {
                    $paymentDetail = $row['payment_method'] ?? 'N/A';
                }

                return [
                    'booking_type' => $row['booking_type'],
                    'booking_id' => $row['booking_id'],
                    'create_date' => $row['create_date'],
                    'booking_ref_no' => $row['booking_ref_no'],
                    'customer_name' => $row['customer_name'],
                    'customer_code' => $row['customer_code'],
                    'supplier_name' => $row['supplier_name'],
                    'supplier_code' => $row['supplier_code'],
                    'pax_name' => $row['pax_name'],
                    'pax_count' => intval($row['pax_count']),
                    'routing_detail' => $row['routing_detail'],
                    'booking_code' => $row['booking_code'],
                    'total_price' => floatval($row['total_price']),
                    'payment_status' => $row['payment_status'],
                    'payment_detail' => $paymentDetail, // Formatted!
                    'payment_method' => $row['payment_method'],
                    'bank_name' => $row['bank_name'],
                    'account_number' => $row['account_number'],
                    'ticket_type' => $row['ticket_type'],
                    'ticket_numbers' => $row['ticket_numbers']
                ];
            }, $data);

            // คำนวณ Summary
            $summary = $this->calculateSummary($formattedData);

            return $this->successResponse([
                'date' => $date,
                'data' => $formattedData,
                'summary' => $summary
            ], 'Daily report retrieved successfully', count($formattedData));
        } catch (Exception $e) {
            $this->logMessage("Error in getDailyReportAll: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch daily report', 500);
        }
    }

    /**
     * 2. REPORT ALL INVOICE (New) - รายงานทั้งหมดตามช่วงวันที่ (แยก Sub Total ตามวัน)
     */
    private function getAllInvoiceReportNew()
    {
        $startDate = $this->request['start_date'] ?? null;
        $endDate = $this->request['end_date'] ?? null;
        $filterType = $this->request['filter_type'] ?? 'all';
        $customerCode = $this->request['customer_code'] ?? null;
        $supplierCode = $this->request['supplier_code'] ?? null;
        $ticketType = $this->request['ticket_type'] ?? null;
        $documentTypes = $this->request['document_types'] ?? ['PO']; // รับ document_types จาก frontend

        if (!$startDate || !$endDate) {
            return $this->errorResponse('Start date and end date are required', 400);
        }

        try {
            // Build WHERE conditions (แบบเดิมที่ทำงานได้)
            $whereConditions = ["create_date BETWEEN :start_date AND :end_date"];
            $params = [
                'start_date' => $startDate,
                'end_date' => $endDate
            ];

            $whereClause = implode(' AND ', $whereConditions);

            $sql = "
                SELECT DISTINCT
                    vdr.booking_type,
                    vdr.booking_id,
                    vdr.create_date,
                    vdr.created_at,
                    vdr.booking_ref_no,
                    vdr.customer_name,
                    vdr.customer_code,
                    vdr.supplier_name,
                    vdr.supplier_code,
                    vdr.pax_name,
                    vdr.pax_count,
                    vdr.routing_detail,
                    vdr.booking_code,
                    vdr.total_price,
                    vdr.payment_status,
                    vdr.payment_method,
                    vdr.bank_name,
                    vdr.account_number,
                    vdr.ticket_type,
                    vdr.ticket_type_details,
                    vdr.ticket_numbers,
                    vdr.adt1_net_price,
                    vdr.adt1_sale_price,
                    vdr.adt1_pax,
                    vdr.adt2_net_price,
                    vdr.adt2_sale_price,
                    vdr.adt2_pax,
                    vdr.adt3_net_price,
                    vdr.adt3_sale_price,
                    vdr.adt3_pax,
                    vdr.extras_net_total,
                    vdr.extras_sale_total,
                    i.is_domestic
                FROM view_daily_report_all vdr
                LEFT JOIN information i ON vdr.supplier_code = i.code
                WHERE " . $whereClause . "
                ORDER BY vdr.create_date DESC, vdr.created_at DESC
            ";

            $result = $this->db->raw($sql, $params);

            if (!$result['success']) {
                return $this->errorResponse('Failed to fetch invoice report', 500);
            }

            $data = $result['data'];

            // Filter ทั้งหมดใน PHP (หลีกเลี่ยง collation error)

            // 1. กรองตาม document_types (แมป document_types กับ booking_type)
            // PO = Flight, VC = Voucher-*, HTL = Other-HOTEL, TRN = Other-TRAIN, VSA = Other-VISA, OTH = Other-OTHER/INSURANCE
            $allowedBookingTypes = [];

            foreach ($documentTypes as $docType) {
                switch ($docType) {
                    case 'PO':
                    case 'INV':
                        $allowedBookingTypes[] = 'Flight';
                        break;
                    case 'VC':
                        $allowedBookingTypes[] = 'Voucher-BUS';
                        $allowedBookingTypes[] = 'Voucher-BOAT';
                        $allowedBookingTypes[] = 'Voucher-TOUR';
                        break;
                    case 'HTL':
                        $allowedBookingTypes[] = 'Other-HOTEL';
                        break;
                    case 'TRN':
                        $allowedBookingTypes[] = 'Other-TRAIN';
                        break;
                    case 'VSA':
                        $allowedBookingTypes[] = 'Other-VISA';
                        break;
                    case 'OTH':
                        $allowedBookingTypes[] = 'Other-OTHER';
                        $allowedBookingTypes[] = 'Other-INSURANCE';
                        break;
                }
            }

            $data = array_filter($data, function ($row) use ($allowedBookingTypes) {
                return in_array($row['booking_type'], $allowedBookingTypes);
            });

            // 2. Filter ตาม filter_type
            if ($filterType === 'customer' && !empty($customerCode)) {
                $data = array_filter($data, function ($row) use ($customerCode) {
                    return $row['customer_code'] === $customerCode;
                });
            } elseif ($filterType === 'supplier' && !empty($supplierCode)) {
                $data = array_filter($data, function ($row) use ($supplierCode) {
                    return $row['supplier_code'] === $supplierCode;
                });
            } elseif ($filterType === 'ticket_type' && !empty($ticketType)) {
                $data = array_filter($data, function ($row) use ($ticketType) {
                    return $row['ticket_type'] === $ticketType;
                });
            }

            // 3. Remove duplicate bookings
            $uniqueData = [];
            $seen = [];

            foreach ($data as $row) {
                $key = $row['booking_type'] . '-' . $row['booking_id'];
                if (!isset($seen[$key])) {
                    $seen[$key] = true;
                    $uniqueData[] = $row;
                }
            }

            $data = array_values($uniqueData); // Re-index array

            // Fallback: Flight bookings ที่ไม่มี routing_detail → ใช้ tickets_extras.description แทน
            $flightIdsNeedExtras = [];
            foreach ($data as $index => $row) {
                if ($row['booking_type'] === 'Flight' && empty($row['routing_detail'])) {
                    $flightIdsNeedExtras[$row['booking_id']] = $index;
                }
            }

            if (!empty($flightIdsNeedExtras)) {
                $ids = array_keys($flightIdsNeedExtras);
                $placeholders = str_repeat('?,', count($ids) - 1) . '?';
                $extrasSql = "SELECT bookings_ticket_id, description FROM tickets_extras WHERE bookings_ticket_id IN ({$placeholders}) ORDER BY id";
                $extrasResult = $this->db->raw($extrasSql, $ids);

                if ($extrasResult['success']) {
                    $extrasMap = [];
                    foreach ($extrasResult['data'] as $extra) {
                        $tid = $extra['bookings_ticket_id'];
                        if (!empty($extra['description'])) {
                            if (!isset($extrasMap[$tid])) {
                                $extrasMap[$tid] = [];
                            }
                            $extrasMap[$tid][] = $extra['description'];
                        }
                    }
                    foreach ($extrasMap as $tid => $descriptions) {
                        if (isset($flightIdsNeedExtras[$tid])) {
                            $data[$flightIdsNeedExtras[$tid]]['routing_detail'] = implode(', ', $descriptions);
                        }
                    }
                }
            }

            // ใช้ ReportCalculator คำนวณ Daily Summary และ Grand Total
            $result = ReportCalculator::processDailySummary($data);

            return $this->successResponse([
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate
                ],
                'daily_summary' => $result['daily_summary'],
                'grand_total' => $result['grand_total']
            ], 'Invoice report retrieved successfully');
        } catch (Exception $e) {
            $this->logMessage("Error in getAllInvoiceReportNew: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch invoice report', 500);
        }
    }

    /**
     * 3. REPORT BY CUSTOMER (New)
     */
    private function getCustomerReportNew()
    {
        $customerCode = $this->request['customer_code'] ?? null;
        $startDate = $this->request['start_date'] ?? null;
        $endDate = $this->request['end_date'] ?? null;

        if (!$startDate || !$endDate) {
            return $this->errorResponse('Start date and end date are required', 400);
        }

        try {
            $whereConditions = [
                "create_date BETWEEN :start_date AND :end_date"
            ];

            $params = [
                'start_date' => $startDate,
                'end_date' => $endDate
            ];

            if (!empty($customerCode)) {
                $whereConditions[] = "customer_code = :customer_code";
                $params['customer_code'] = $customerCode;
            }

            $whereClause = implode(' AND ', $whereConditions);

            $sql = "
                SELECT
                    *
                FROM view_daily_report_all
                WHERE {$whereClause}
                ORDER BY create_date DESC, created_at DESC
            ";

            $result = $this->db->raw($sql, $params);

            if (!$result['success']) {
                return $this->errorResponse('Failed to fetch customer report', 500);
            }

            $data = $result['data'];

            // คำนวณ Grand Total
            $grandTotal = $this->calculateGrandTotal($data);

            return $this->successResponse([
                'customer_code' => $customerCode,
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate
                ],
                'data' => $data,
                'grand_total' => $grandTotal
            ], 'Customer report retrieved successfully', count($data));
        } catch (Exception $e) {
            $this->logMessage("Error in getCustomerReportNew: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch customer report', 500);
        }
    }

    /**
     * 4. REPORT BY SUPPLIER (New) - แยก DOM/INT
     */
    private function getSupplierReportNew()
    {
        $supplierCode = $this->request['supplier_code'] ?? null;
        $startDate = $this->request['start_date'] ?? null;
        $endDate = $this->request['end_date'] ?? null;

        if (!$startDate || !$endDate) {
            return $this->errorResponse('Start date and end date are required', 400);
        }

        try {
            $whereConditions = [
                "create_date BETWEEN :start_date AND :end_date"
            ];

            $params = [
                'start_date' => $startDate,
                'end_date' => $endDate
            ];

            if (!empty($supplierCode)) {
                $whereConditions[] = "supplier_code = :supplier_code";
                $params['supplier_code'] = $supplierCode;
            }

            $whereClause = implode(' AND ', $whereConditions);

            $sql = "
                SELECT
                    vdr.*,
                    i.is_domestic
                FROM view_daily_report_all vdr
                LEFT JOIN information i ON vdr.supplier_code = i.code
                WHERE {$whereClause}
                ORDER BY i.is_domestic DESC, create_date DESC
            ";

            $result = $this->db->raw($sql, $params);

            if (!$result['success']) {
                return $this->errorResponse('Failed to fetch supplier report', 500);
            }

            $data = $result['data'];

            // แยก DOM และ INT
            $domesticData = [];
            $internationalData = [];

            foreach ($data as $row) {
                if ($row['is_domestic'] == 1) {
                    $domesticData[] = $row;
                } else {
                    $internationalData[] = $row;
                }
            }

            $domTotal = $this->calculateGrandTotal($domesticData);
            $intTotal = $this->calculateGrandTotal($internationalData);
            $grandTotal = [
                'of_ticket' => $domTotal['of_ticket'] + $intTotal['of_ticket'],
                'total_price' => $domTotal['total_price'] + $intTotal['total_price']
            ];

            return $this->successResponse([
                'supplier_code' => $supplierCode,
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate
                ],
                'domestic' => [
                    'data' => $domesticData,
                    'sub_total' => $domTotal
                ],
                'international' => [
                    'data' => $internationalData,
                    'sub_total' => $intTotal
                ],
                'grand_total' => $grandTotal
            ], 'Supplier report retrieved successfully');
        } catch (Exception $e) {
            $this->logMessage("Error in getSupplierReportNew: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch supplier report', 500);
        }
    }

    /**
     * 5. REPORT BY TICKET TYPE (New)
     */
    private function getTicketTypeReportNew()
    {
        $ticketType = $this->request['ticket_type'] ?? null;
        $startDate = $this->request['start_date'] ?? null;
        $endDate = $this->request['end_date'] ?? null;

        if (!$startDate || !$endDate) {
            return $this->errorResponse('Start date and end date are required', 400);
        }

        try {
            $whereConditions = [
                "create_date BETWEEN :start_date AND :end_date"
            ];

            $params = [
                'start_date' => $startDate,
                'end_date' => $endDate
            ];

            if (!empty($ticketType)) {
                $whereConditions[] = "ticket_type = :ticket_type";
                $params['ticket_type'] = $ticketType;
            }

            $whereClause = implode(' AND ', $whereConditions);

            $sql = "
                SELECT
                    *
                FROM view_daily_report_all
                WHERE {$whereClause}
                ORDER BY create_date DESC, created_at DESC
            ";

            $result = $this->db->raw($sql, $params);

            if (!$result['success']) {
                return $this->errorResponse('Failed to fetch ticket type report', 500);
            }

            $data = $result['data'];
            $grandTotal = $this->calculateGrandTotal($data);

            return $this->successResponse([
                'ticket_type' => $ticketType,
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate
                ],
                'data' => $data,
                'grand_total' => $grandTotal
            ], 'Ticket type report retrieved successfully', count($data));
        } catch (Exception $e) {
            $this->logMessage("Error in getTicketTypeReportNew: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch ticket type report', 500);
        }
    }

    /**
     * 6. Special Report (สุดหนี่งสร้าง) - แสดงเฉพาะราคาขาย ไม่แสดง Cost/Profit
     */
    private function getSpecialReport()
    {
        $customerCode = $this->request['customer_code'] ?? null;
        $startDate = $this->request['start_date'] ?? null;
        $endDate = $this->request['end_date'] ?? null;

        if (!$startDate || !$endDate) {
            return $this->errorResponse('Start date and end date are required', 400);
        }

        try {
            $whereConditions = [
                "create_date BETWEEN :start_date AND :end_date"
            ];

            $params = [
                'start_date' => $startDate,
                'end_date' => $endDate
            ];

            if (!empty($customerCode)) {
                $whereConditions[] = "customer_code = :customer_code";
                $params['customer_code'] = $customerCode;
            }

            $whereClause = implode(' AND ', $whereConditions);

            $sql = "
                SELECT
                    booking_type,
                    booking_id,
                    create_date,
                    booking_ref_no,
                    supplier_name,
                    supplier_code,
                    pax_name,
                    routing_detail,
                    booking_code,
                    pax_count,
                    total_price AS ticket_sale,
                    0 AS option_sale,
                    total_price AS total_sale
                FROM view_daily_report_all
                WHERE {$whereClause}
                ORDER BY create_date DESC, created_at DESC
            ";

            $result = $this->db->raw($sql, $params);

            if (!$result['success']) {
                return $this->errorResponse('Failed to fetch special report', 500);
            }

            $data = $result['data'];
            $grandTotal = [
                'of_ticket' => 0,
                'ticket_sale' => 0,
                'option_sale' => 0,
                'total_sale' => 0
            ];

            foreach ($data as $row) {
                $grandTotal['of_ticket'] += intval($row['pax_count']);
                $grandTotal['ticket_sale'] += floatval($row['ticket_sale']);
                $grandTotal['option_sale'] += floatval($row['option_sale']);
                $grandTotal['total_sale'] += floatval($row['total_sale']);
            }

            return $this->successResponse([
                'customer_code' => $customerCode,
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate
                ],
                'data' => $data,
                'grand_total' => $grandTotal
            ], 'Special report retrieved successfully', count($data));
        } catch (Exception $e) {
            $this->logMessage("Error in getSpecialReport: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch special report', 500);
        }
    }

    // ============================================================================
    // HELPER METHODS สำหรับ New Reports
    // ============================================================================

    /**
     * คำนวณ Summary สำหรับ Daily Report
     */
    private function calculateSummary($data)
    {
        $summary = [
            'total_bookings' => count($data),
            'total_amount' => 0,
            'paid_count' => 0,
            'waiting_count' => 0,
            'paid_amount' => 0,
            'waiting_amount' => 0
        ];

        foreach ($data as $row) {
            $summary['total_amount'] += floatval($row['total_price']);

            if ($row['payment_status'] === 'paid') {
                $summary['paid_count']++;
                $summary['paid_amount'] += floatval($row['total_price']);
            } else {
                $summary['waiting_count']++;
                $summary['waiting_amount'] += floatval($row['total_price']);
            }
        }

        return $summary;
    }

    /**
     * คำนวณ Grand Total
     */
    private function calculateGrandTotal($data)
    {
        $grandTotal = [
            'of_ticket' => 0,
            'total_price' => 0
        ];

        foreach ($data as $row) {
            $grandTotal['of_ticket'] += intval($row['pax_count'] ?? 0);
            $grandTotal['total_price'] += floatval($row['total_price'] ?? 0);
        }

        return $grandTotal;
    }

    /**
     * 7. Outstanding Receivables Report - รายงานลูกหนี้คงค้าง
     * แสดงรายการที่ payment_status != 'paid' และเฉพาะ Flight (PO) เท่านั้น
     */
    private function getOutstandingReceivables()
    {
        try {
            $statusFilter = $this->request['status_filter'] ?? ['unpaid', 'partial'];
            $searchTerm = $this->request['search_term'] ?? '';
            $page = isset($this->request['page']) ? max(1, intval($this->request['page'])) : 1;
            $limit = isset($this->request['limit']) ? intval($this->request['limit']) : 30;
            $exportAll = isset($this->request['export']) && $this->request['export'] === true;

            // If export mode or limit=0, get all records
            if ($exportAll || $limit === 0) {
                $limit = 0; // No limit for export
            }

            // Ensure statusFilter is an array
            if (!is_array($statusFilter)) {
                $statusFilter = ['unpaid', 'partial'];
            }

            // Sanitize search term
            $searchTerm = trim($searchTerm);

            $this->logMessage("getOutstandingReceivables - statusFilter: " . json_encode($statusFilter) . ", searchTerm: " . $searchTerm . ", page: " . $page . ", limit: " . $limit, 'INFO');

            // Build base query with LEFT JOIN to get payment details in single query
            $baseSql = "
                SELECT DISTINCT
                    vdr.booking_type,
                    vdr.booking_id,
                    vdr.create_date,
                    vdr.created_at,
                    vdr.booking_ref_no,
                    vdr.customer_name,
                    vdr.customer_code,
                    vdr.supplier_name,
                    vdr.supplier_code,
                    vdr.pax_name,
                    vdr.pax_count,
                    vdr.routing_detail,
                    vdr.booking_code AS code,
                    vdr.ticket_numbers AS ticket_number,
                    vdr.total_price AS total_amount,
                    vdr.payment_status,
                    vdr.ticket_type,
                    COALESCE(bpd_sum.paid_amount, 0) AS paid_amount
                FROM view_daily_report_all vdr
                LEFT JOIN (
                    SELECT booking_type, booking_id, SUM(amount) AS paid_amount
                    FROM booking_payment_details
                    GROUP BY booking_type, booking_id
                ) bpd_sum ON (
                    bpd_sum.booking_id = vdr.booking_id
                    AND bpd_sum.booking_type = CASE
                        WHEN vdr.booking_type = 'Flight' THEN 'flight'
                        WHEN vdr.booking_type LIKE 'Voucher-%' THEN 'voucher'
                        WHEN vdr.booking_type LIKE 'Other-%' THEN 'other'
                        WHEN vdr.booking_type = 'Deposit' THEN 'deposit'
                    END
                )
                WHERE vdr.booking_type COLLATE utf8mb4_unicode_ci IN (
                    'Flight' COLLATE utf8mb4_unicode_ci,
                    'Voucher-BUS' COLLATE utf8mb4_unicode_ci,
                    'Voucher-BOAT' COLLATE utf8mb4_unicode_ci,
                    'Voucher-TOUR' COLLATE utf8mb4_unicode_ci,
                    'Other-HOTEL' COLLATE utf8mb4_unicode_ci,
                    'Other-TRAIN' COLLATE utf8mb4_unicode_ci,
                    'Other-VISA' COLLATE utf8mb4_unicode_ci,
                    'Other-OTHER' COLLATE utf8mb4_unicode_ci,
                    'Other-INSURANCE' COLLATE utf8mb4_unicode_ci
                )
            ";

            $params = [];

            // Add search filter to SQL
            if (!empty($searchTerm)) {
                $baseSql .= " AND (
                    vdr.booking_ref_no LIKE :search1
                    OR vdr.customer_code LIKE :search2
                    OR vdr.supplier_code LIKE :search3
                    OR vdr.ticket_numbers LIKE :search4
                    OR vdr.booking_code LIKE :search5
                    OR vdr.pax_name LIKE :search6
                )";
                $searchPattern = '%' . $searchTerm . '%';
                $params['search1'] = $searchPattern;
                $params['search2'] = $searchPattern;
                $params['search3'] = $searchPattern;
                $params['search4'] = $searchPattern;
                $params['search5'] = $searchPattern;
                $params['search6'] = $searchPattern;
            }

            $baseSql .= " ORDER BY vdr.create_date DESC, vdr.created_at DESC";

            $result = $this->db->raw($baseSql, $params);

            if (!$result['success']) {
                $this->logMessage("SQL Error in getOutstandingReceivables: " . ($result['error'] ?? 'Unknown'), 'ERROR');
                return $this->errorResponse('Failed to fetch outstanding receivables report', 500);
            }

            $data = $result['data'];
            $this->logMessage("Query returned " . count($data) . " rows", 'INFO');

            // Remove duplicates
            $uniqueData = [];
            $seen = [];

            foreach ($data as $row) {
                $key = $row['booking_type'] . '-' . $row['booking_id'];
                if (!isset($seen[$key])) {
                    $seen[$key] = true;
                    $uniqueData[] = $row;
                }
            }

            $data = array_values($uniqueData);

            // Filter by payment status (must be done in PHP since it depends on paid_amount calculation)
            $this->logMessage("Starting status filter with: " . json_encode($statusFilter), 'INFO');
            $statusFilteredData = [];
            foreach ($data as $row) {
                $totalAmount = floatval($row['total_amount'] ?? 0);
                $paidAmount = floatval($row['paid_amount'] ?? 0);

                $status = '';
                if ($paidAmount === 0 || $paidAmount < 0.01) {
                    $status = 'unpaid';
                } elseif ($paidAmount >= $totalAmount) {
                    $status = 'paid';
                } else {
                    $status = 'partial';
                }

                if (in_array($status, $statusFilter)) {
                    $statusFilteredData[] = $row;
                }
            }

            $data = $statusFilteredData;
            $this->logMessage("After status filter: " . count($data) . " records", 'INFO');

            // Total count and sum after filtering (before pagination)
            $totalCount = count($data);
            $totalAmountSum = array_reduce($data, function ($sum, $row) {
                return $sum + floatval($row['total_amount'] ?? 0);
            }, 0);

            // Apply pagination (only if limit > 0)
            if ($limit > 0) {
                $offset = ($page - 1) * $limit;
                $data = array_slice($data, $offset, $limit);
            }

            $totalPages = $limit > 0 ? ceil($totalCount / $limit) : 1;

            // Enrich only the paginated data (much smaller dataset)
            $this->logMessage("Starting to enrich " . count($data) . " records (page $page)", 'INFO');

            $enrichedData = [];
            foreach ($data as $index => $row) {
                try {
                    // Map booking_type to payment_tracking type
                    $typeMap = [
                        'Flight' => 'flight',
                        'Voucher-BUS' => 'voucher',
                        'Voucher-BOAT' => 'voucher',
                        'Voucher-TOUR' => 'voucher',
                        'Other-INSURANCE' => 'other',
                        'Other-HOTEL' => 'other',
                        'Other-TRAIN' => 'other',
                        'Other-VISA' => 'other',
                        'Other-OTHER' => 'other',
                        'Deposit' => 'deposit'
                    ];

                    $trackingType = isset($typeMap[$row['booking_type']]) ? $typeMap[$row['booking_type']] : 'flight';

                    // Check if this PO is part of a payment group
                    $checkGroupSql = "SELECT group_id, is_master FROM payment_groups
                                 WHERE booking_type = :booking_type AND booking_id = :booking_id";
                    $checkGroupResult = $this->db->raw($checkGroupSql, [
                        'booking_type' => $trackingType,
                        'booking_id' => $row['booking_id']
                    ]);

                    $groupId = null;
                    $isMaster = false;
                    $groupTotalAmount = floatval($row['total_amount']);
                    $linkedPOs = [];

                    if ($checkGroupResult['success'] && count($checkGroupResult['data']) > 0) {
                        // This PO is in a group
                        $groupInfo = $checkGroupResult['data'][0];
                        $groupId = $groupInfo['group_id'];
                        $isMaster = $groupInfo['is_master'] == 1;

                        // Get total_amount of all POs in this group
                        $groupTotalSql = "
                        SELECT SUM(vdr.total_price) as group_total,
                               GROUP_CONCAT(CONCAT(vdr.booking_ref_no, ' (', CAST(vdr.total_price AS CHAR), ')') SEPARATOR ', ') as po_list
                        FROM payment_groups pg
                        LEFT JOIN view_daily_report_all vdr
                            ON pg.booking_id = vdr.booking_id
                            AND pg.booking_type = CASE
                                WHEN vdr.booking_type = 'Flight' THEN 'flight'
                                WHEN vdr.booking_type LIKE 'Voucher-%' THEN 'voucher'
                                WHEN vdr.booking_type LIKE 'Other-%' THEN 'other'
                                WHEN vdr.booking_type = 'Deposit' THEN 'deposit'
                            END
                        WHERE pg.group_id = :group_id
                    ";
                        $groupTotalResult = $this->db->raw($groupTotalSql, ['group_id' => $groupId]);

                        if ($groupTotalResult['success'] && count($groupTotalResult['data']) > 0) {
                            $groupTotalAmount = floatval($groupTotalResult['data'][0]['group_total'] ?? $groupTotalAmount);
                            $linkedPOs = $groupTotalResult['data'][0]['po_list'] ?? '';
                        }
                    }

                    // Get payment details from booking_payment_details table
                    $paymentDetailsSql = "
                    SELECT payment_date, amount, payment_method, bank_name, card_type, note
                    FROM booking_payment_details
                    WHERE booking_type = :booking_type AND booking_id = :booking_id
                    ORDER BY payment_index ASC
                ";

                    $paymentDetailsResult = $this->db->raw($paymentDetailsSql, [
                        'booking_type' => $trackingType,
                        'booking_id' => $row['booking_id']
                    ]);

                    $paymentDetails = [];
                    $paidAmount = 0;

                    if ($paymentDetailsResult['success'] && count($paymentDetailsResult['data']) > 0) {
                        $paymentDetails = $paymentDetailsResult['data'];
                        foreach ($paymentDetails as $payment) {
                            $paidAmount += floatval($payment['amount'] ?? 0);
                        }
                    }

                    $row['payment_details'] = $paymentDetails;
                    $row['paid_amount'] = $paidAmount;

                    // If in a group, use group totals for status calculation
                    $row['payment_group_id'] = $groupId;
                    $row['is_master'] = $isMaster;
                    $row['linked_pos'] = $linkedPOs;
                    $row['group_total_amount'] = $groupTotalAmount; // Total amount of all POs in group
                    $row['display_total_amount'] = $groupTotalAmount; // Use this for status calculation

                    // Get payment method details from additional_info table
                    $additionalInfoTable = '';
                    $foreignKeyField = '';

                    switch ($row['booking_type']) {
                        case 'Flight':
                            $additionalInfoTable = 'ticket_additional_info';
                            $foreignKeyField = 'bookings_ticket_id';
                            break;
                        case 'Voucher-BUS':
                        case 'Voucher-BOAT':
                        case 'Voucher-TOUR':
                            $additionalInfoTable = 'voucher_additional_info';
                            $foreignKeyField = 'bookings_voucher_id';
                            break;
                        case 'Other-INSURANCE':
                        case 'Other-HOTEL':
                        case 'Other-TRAIN':
                        case 'Other-VISA':
                        case 'Other-OTHER':
                            $additionalInfoTable = 'other_additional_info';
                            $foreignKeyField = 'bookings_other_id';
                            break;
                        case 'Deposit':
                            $additionalInfoTable = 'deposit_additional_info';
                            $foreignKeyField = 'bookings_deposit_id';
                            break;
                    }

                    if ($additionalInfoTable && $foreignKeyField) {
                        $additionalInfoSql = "
                        SELECT customer_payment_method, customer_payment_details
                        FROM {$additionalInfoTable}
                        WHERE {$foreignKeyField} = :booking_id
                    ";

                        $additionalInfoResult = $this->db->raw($additionalInfoSql, ['booking_id' => $row['booking_id']]);

                        if ($additionalInfoResult['success'] && count($additionalInfoResult['data']) > 0) {
                            $additionalInfoData = $additionalInfoResult['data'][0];
                            $row['payment_method_details'] = [
                                'method' => $additionalInfoData['customer_payment_method'] ?? '',
                                'details' => $additionalInfoData['customer_payment_details'] ?? ''
                            ];
                        } else {
                            $row['payment_method_details'] = ['method' => '', 'details' => ''];
                        }
                    } else {
                        $row['payment_method_details'] = ['method' => '', 'details' => ''];
                    }

                    // Fallback: Flight ที่ไม่มี routing_detail → ใช้ tickets_extras.description แทน
                    if ($row['booking_type'] === 'Flight' && empty($row['routing_detail'])) {
                        $extrasSql = "SELECT description FROM tickets_extras WHERE bookings_ticket_id = :booking_id ORDER BY id";
                        $extrasResult = $this->db->raw($extrasSql, ['booking_id' => $row['booking_id']]);
                        if ($extrasResult['success'] && !empty($extrasResult['data'])) {
                            $descriptions = array_filter(array_column($extrasResult['data'], 'description'));
                            if (!empty($descriptions)) {
                                $row['routing_detail'] = implode(', ', $descriptions);
                            }
                        }
                    }

                    // Get description and ref based on booking type
                    $row['description'] = '';
                    $row['ref'] = '';

                    if (strpos($row['booking_type'], 'Voucher') === 0) {
                        // Voucher bookings - get description from voucher_details
                        $voucherDetailSql = "SELECT description FROM voucher_details WHERE bookings_voucher_id = :booking_id LIMIT 1";
                        $voucherDetailResult = $this->db->raw($voucherDetailSql, ['booking_id' => $row['booking_id']]);
                        if ($voucherDetailResult['success'] && count($voucherDetailResult['data']) > 0) {
                            $row['description'] = $voucherDetailResult['data'][0]['description'] ?? '';
                        }
                    } elseif (strpos($row['booking_type'], 'Other') === 0) {
                        // Other bookings - get description and reference_code from other_details
                        $otherDetailSql = "SELECT description, reference_code FROM other_details WHERE bookings_other_id = :booking_id LIMIT 1";
                        $otherDetailResult = $this->db->raw($otherDetailSql, ['booking_id' => $row['booking_id']]);
                        if ($otherDetailResult['success'] && count($otherDetailResult['data']) > 0) {
                            $row['description'] = $otherDetailResult['data'][0]['description'] ?? '';
                            $row['ref'] = $otherDetailResult['data'][0]['reference_code'] ?? '';
                        }
                    }

                    $enrichedData[] = $row;
                } catch (Exception $e) {
                    $this->logMessage("Error enriching row $index: " . $e->getMessage(), 'ERROR');
                    // Skip this row on error
                    continue;
                }
            }

            $data = $enrichedData;
            $this->logMessage("Enriched " . count($data) . " records successfully", 'INFO');

            // Re-index array
            $data = array_values($data);

            $this->logMessage("Final result: " . count($data) . " records (total: $totalCount, page: $page, limit: $limit)", 'INFO');

            return $this->successResponse(
                [
                    'items' => $data,
                    'total' => $totalCount,
                    'page' => $page,
                    'limit' => $limit,
                    'total_pages' => $totalPages,
                    'total_amount_sum' => $totalAmountSum
                ],
                'Outstanding receivables report retrieved successfully',
                count($data)
            );
        } catch (Exception $e) {
            $this->logMessage("Error in getOutstandingReceivables: " . $e->getMessage(), 'ERROR');
            $this->logMessage("Stack trace: " . $e->getTraceAsString(), 'ERROR');
            return $this->errorResponse('Failed to fetch outstanding receivables report: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Save multiple payment details for a booking
     * If booking is in a payment group, updates all POs in the group
     */
    private function savePaymentDetails()
    {
        $bookingType = $this->request['booking_type'] ?? null;
        $bookingId = $this->request['booking_id'] ?? null;
        $payments = $this->request['payments'] ?? [];

        if (!$bookingType || !$bookingId || !is_array($payments)) {
            return $this->errorResponse('Missing required fields: booking_type, booking_id, or payments', 400);
        }

        try {
            $this->db->beginTransaction();

            // Map booking_type to payment_tracking type
            $typeMap = [
                'Flight' => 'flight',
                'Voucher-BUS' => 'voucher',
                'Voucher-BOAT' => 'voucher',
                'Voucher-TOUR' => 'voucher',
                'Other-INSURANCE' => 'other',
                'Other-HOTEL' => 'other',
                'Other-TRAIN' => 'other',
                'Other-VISA' => 'other',
                'Other-OTHER' => 'other',
                'Deposit' => 'deposit'
            ];

            $trackingType = $typeMap[$bookingType] ?? null;

            if (!$trackingType) {
                $this->db->rollback();
                return $this->errorResponse('Invalid booking type', 400);
            }

            // Check if this booking is part of a payment group
            $checkGroupSql = "SELECT group_id FROM payment_groups
                             WHERE booking_type = :booking_type AND booking_id = :booking_id";
            $checkGroupResult = $this->db->raw($checkGroupSql, [
                'booking_type' => $trackingType,
                'booking_id' => $bookingId
            ]);

            $groupId = null;
            $posToUpdate = [['booking_type' => $trackingType, 'booking_id' => $bookingId]];

            if ($checkGroupResult['success'] && count($checkGroupResult['data']) > 0) {
                // This PO is in a group - get all POs in the same group
                $groupId = $checkGroupResult['data'][0]['group_id'];

                $groupPOsSql = "SELECT booking_type, booking_id FROM payment_groups
                               WHERE group_id = :group_id";
                $groupPOsResult = $this->db->raw($groupPOsSql, ['group_id' => $groupId]);

                if ($groupPOsResult['success'] && count($groupPOsResult['data']) > 0) {
                    $posToUpdate = $groupPOsResult['data'];
                }
            }

            // Update payment details for all POs (either just this one, or all in the group)
            foreach ($posToUpdate as $po) {
                $poType = $po['booking_type'];
                $poId = $po['booking_id'];

                // Delete existing payment details for this PO
                $deleteSql = "DELETE FROM booking_payment_details
                             WHERE booking_type = :booking_type AND booking_id = :booking_id";
                $this->db->raw($deleteSql, [
                    'booking_type' => $poType,
                    'booking_id' => $poId
                ]);

                // Insert new payment details
                foreach ($payments as $index => $payment) {
                    if (!isset($payment['payment_date']) || !isset($payment['amount'])) {
                        continue;
                    }

                    $paymentData = [
                        'booking_type' => $poType,
                        'booking_id' => $poId,
                        'payment_group_id' => $groupId, // Set group_id if in group
                        'payment_index' => $index,
                        'payment_date' => $payment['payment_date'],
                        'amount' => $payment['amount'],
                        'payment_method' => $payment['payment_method'] ?? 'cash',
                        'bank_name' => $payment['bank_name'] ?? null,
                        'card_type' => $payment['card_type'] ?? null,
                        'note' => $payment['note'] ?? null
                    ];

                    $this->db->insert('booking_payment_details', $paymentData);
                }
            }

            $this->db->commit();

            $message = $groupId
                ? 'Payment details saved successfully for all linked POs'
                : 'Payment details saved successfully';

            return $this->successResponse([
                'message' => $message,
                'updated_pos_count' => count($posToUpdate)
            ]);
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logMessage("Error saving payment details: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to save payment details: ' . $e->getMessage(), 500);
        }
    }

    // ============================================================================
    // PAYMENT GROUP MANAGEMENT (Link Multiple POs)
    // ============================================================================

    /**
     * Link multiple POs together - สร้าง payment group
     * Request: {
     *   master_booking_type: "Flight",
     *   master_booking_id: 123,
     *   linked_pos: [
     *     { booking_type: "Flight", booking_id: 124 },
     *     { booking_type: "Flight", booking_id: 125 }
     *   ]
     * }
     */
    private function linkPOs()
    {
        $masterBookingType = $this->request['master_booking_type'] ?? null;
        $masterBookingId = $this->request['master_booking_id'] ?? null;
        $linkedPOs = $this->request['linked_pos'] ?? [];

        if (!$masterBookingType || !$masterBookingId || !is_array($linkedPOs) || empty($linkedPOs)) {
            return $this->errorResponse('Missing required fields: master_booking_type, master_booking_id, or linked_pos', 400);
        }

        try {
            $this->db->beginTransaction();

            // Map booking_type to tracking type
            $typeMap = [
                'Flight' => 'flight',
                'Voucher-BUS' => 'voucher',
                'Voucher-BOAT' => 'voucher',
                'Voucher-TOUR' => 'voucher',
                'Other-INSURANCE' => 'other',
                'Other-HOTEL' => 'other',
                'Other-TRAIN' => 'other',
                'Other-VISA' => 'other',
                'Other-OTHER' => 'other',
                'Deposit' => 'deposit'
            ];

            $masterTrackingType = $typeMap[$masterBookingType] ?? null;

            if (!$masterTrackingType) {
                $this->db->rollback();
                return $this->errorResponse('Invalid master booking type', 400);
            }

            // Generate payment_group_id (format: PG-YYYY-MM-DD-NNN)
            $date = date('Y-m-d');
            $checkSql = "SELECT group_id FROM payment_groups WHERE group_id LIKE :pattern ORDER BY group_id DESC LIMIT 1";
            $checkResult = $this->db->raw($checkSql, ['pattern' => "PG-{$date}-%"]);

            $sequence = 1;
            if ($checkResult['success'] && count($checkResult['data']) > 0) {
                $lastGroupId = $checkResult['data'][0]['group_id'];
                $parts = explode('-', $lastGroupId);
                if (count($parts) === 5) {
                    $sequence = intval($parts[4]) + 1;
                }
            }

            $groupId = sprintf("PG-%s-%03d", $date, $sequence);

            // Insert master PO into payment_groups
            $this->db->insert('payment_groups', [
                'group_id' => $groupId,
                'booking_type' => $masterTrackingType,
                'booking_id' => $masterBookingId,
                'is_master' => 1
            ]);

            // Insert linked POs into payment_groups
            foreach ($linkedPOs as $linkedPO) {
                $linkedType = $typeMap[$linkedPO['booking_type']] ?? null;
                $linkedId = $linkedPO['booking_id'] ?? null;

                if (!$linkedType || !$linkedId) {
                    continue;
                }

                $this->db->insert('payment_groups', [
                    'group_id' => $groupId,
                    'booking_type' => $linkedType,
                    'booking_id' => $linkedId,
                    'is_master' => 0
                ]);
            }

            // Update payment_group_id in booking_payment_details for master PO
            $updateSql = "UPDATE booking_payment_details SET payment_group_id = :group_id
                         WHERE booking_type = :booking_type AND booking_id = :booking_id";
            $this->db->raw($updateSql, [
                'group_id' => $groupId,
                'booking_type' => $masterTrackingType,
                'booking_id' => $masterBookingId
            ]);

            // Copy payment details from master to linked POs
            $masterPaymentsSql = "SELECT * FROM booking_payment_details
                                 WHERE booking_type = :booking_type AND booking_id = :booking_id";
            $masterPaymentsResult = $this->db->raw($masterPaymentsSql, [
                'booking_type' => $masterTrackingType,
                'booking_id' => $masterBookingId
            ]);

            if ($masterPaymentsResult['success'] && count($masterPaymentsResult['data']) > 0) {
                $masterPayments = $masterPaymentsResult['data'];

                foreach ($linkedPOs as $linkedPO) {
                    $linkedType = $typeMap[$linkedPO['booking_type']] ?? null;
                    $linkedId = $linkedPO['booking_id'] ?? null;

                    if (!$linkedType || !$linkedId) {
                        continue;
                    }

                    // Delete existing payment details for linked PO
                    $deleteSql = "DELETE FROM booking_payment_details
                                 WHERE booking_type = :booking_type AND booking_id = :booking_id";
                    $this->db->raw($deleteSql, [
                        'booking_type' => $linkedType,
                        'booking_id' => $linkedId
                    ]);

                    // Insert copied payment details with payment_group_id
                    foreach ($masterPayments as $payment) {
                        $this->db->insert('booking_payment_details', [
                            'booking_type' => $linkedType,
                            'booking_id' => $linkedId,
                            'payment_group_id' => $groupId,
                            'payment_index' => $payment['payment_index'],
                            'payment_date' => $payment['payment_date'],
                            'amount' => $payment['amount'],
                            'payment_method' => $payment['payment_method'],
                            'bank_name' => $payment['bank_name'],
                            'card_type' => $payment['card_type'],
                            'note' => $payment['note']
                        ]);
                    }
                }
            }

            $this->db->commit();

            return $this->successResponse([
                'message' => 'POs linked successfully',
                'group_id' => $groupId
            ]);
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logMessage("Error linking POs: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to link POs: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Unlink entire payment group (เฉพาะ Master PO เท่านั้น)
     * - จะ Unlink ทุก PO ในกลุ่ม
     * - ลบ payment details ของ PO ที่ไม่ใช่ Master
     * - รีเซ็ท payment_group_id ของ Master (เก็บ payment details ไว้)
     *
     * Request: {
     *   booking_type: "Flight",
     *   booking_id: 124  // Master PO ID
     * }
     */
    private function unlinkPO()
    {
        $bookingType = $this->request['booking_type'] ?? null;
        $bookingId = $this->request['booking_id'] ?? null;

        if (!$bookingType || !$bookingId) {
            return $this->errorResponse('Missing required fields: booking_type or booking_id', 400);
        }

        try {
            $this->db->beginTransaction();

            // Map booking_type to tracking type
            $typeMap = [
                'Flight' => 'flight',
                'Voucher-BUS' => 'voucher',
                'Voucher-BOAT' => 'voucher',
                'Voucher-TOUR' => 'voucher',
                'Other-INSURANCE' => 'other',
                'Other-HOTEL' => 'other',
                'Other-TRAIN' => 'other',
                'Other-VISA' => 'other',
                'Other-OTHER' => 'other',
                'Deposit' => 'deposit'
            ];

            $trackingType = $typeMap[$bookingType] ?? null;

            if (!$trackingType) {
                $this->db->rollback();
                return $this->errorResponse('Invalid booking type', 400);
            }

            // ✅ Get group_id and is_master
            $getGroupSql = "SELECT group_id, is_master FROM payment_groups
                           WHERE booking_type = :booking_type AND booking_id = :booking_id";
            $groupResult = $this->db->raw($getGroupSql, [
                'booking_type' => $trackingType,
                'booking_id' => $bookingId
            ]);

            if (!$groupResult['success'] || count($groupResult['data']) == 0) {
                $this->db->rollback();
                return $this->errorResponse('PO นี้ไม่ได้อยู่ใน Payment Group', 400);
            }

            $groupId = $groupResult['data'][0]['group_id'];
            $isMaster = $groupResult['data'][0]['is_master'] == 1;

            // ✅ ต้องเป็น Master PO เท่านั้น
            if (!$isMaster) {
                $this->db->rollback();
                return $this->errorResponse('สามารถ Unlink ได้เฉพาะจาก Master PO เท่านั้น', 400);
            }

            // ✅ Get all POs in this group
            $getAllPOsSql = "SELECT booking_type, booking_id, is_master FROM payment_groups
                            WHERE group_id = :group_id";
            $allPOsResult = $this->db->raw($getAllPOsSql, ['group_id' => $groupId]);

            if ($allPOsResult['success'] && count($allPOsResult['data']) > 0) {
                foreach ($allPOsResult['data'] as $po) {
                    $poType = $po['booking_type'];
                    $poId = $po['booking_id'];
                    $poIsMaster = $po['is_master'] == 1;

                    if (!$poIsMaster) {
                        // ✅ ลบ payment details ของ PO ที่ไม่ใช่ Master (ข้อมูลที่ Copy มา)
                        $deletePaymentsSql = "DELETE FROM booking_payment_details
                                             WHERE booking_type = :booking_type AND booking_id = :booking_id";
                        $this->db->raw($deletePaymentsSql, [
                            'booking_type' => $poType,
                            'booking_id' => $poId
                        ]);
                    } else {
                        // ✅ รีเซ็ท payment_group_id ของ Master (เก็บ payment details ไว้)
                        $updateMasterSql = "UPDATE booking_payment_details SET payment_group_id = NULL
                                           WHERE booking_type = :booking_type AND booking_id = :booking_id";
                        $this->db->raw($updateMasterSql, [
                            'booking_type' => $poType,
                            'booking_id' => $poId
                        ]);
                    }
                }
            }

            // ✅ ลบ records ทั้งหมดใน payment_groups ที่มี group_id นี้
            $deleteGroupSql = "DELETE FROM payment_groups WHERE group_id = :group_id";
            $this->db->raw($deleteGroupSql, ['group_id' => $groupId]);

            $this->db->commit();

            $this->logMessage("Unlinked entire payment group: {$groupId}", 'INFO');

            return $this->successResponse([
                'message' => 'Unlink ทุก PO สำเร็จ'
            ]);
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logMessage("Error unlinking PO: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to unlink PO: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get available POs that can be linked (same customer, not in a group yet, and not cancelled)
     * Request: {
     *   booking_type: "Flight",
     *   booking_id: 123
     * }
     */
    private function getAvailablePOsForLink()
    {
        $bookingType = $this->request['booking_type'] ?? null;
        $bookingId = $this->request['booking_id'] ?? null;

        if (!$bookingType || !$bookingId) {
            return $this->errorResponse('Missing required fields: booking_type or booking_id', 400);
        }

        try {
            // Map booking_type to tracking type
            $typeMap = [
                'Flight' => 'flight',
                'Voucher-BUS' => 'voucher',
                'Voucher-BOAT' => 'voucher',
                'Voucher-TOUR' => 'voucher',
                'Other-INSURANCE' => 'other',
                'Other-HOTEL' => 'other',
                'Other-TRAIN' => 'other',
                'Other-VISA' => 'other',
                'Other-OTHER' => 'other',
                'Deposit' => 'deposit'
            ];

            $trackingType = $typeMap[$bookingType] ?? null;

            if (!$trackingType) {
                return $this->errorResponse('Invalid booking type', 400);
            }

            // Get customer_code from view_daily_report_all for the current booking
            $customerSql = "
                SELECT customer_code
                FROM view_daily_report_all
                WHERE booking_type = :booking_type AND booking_id = :booking_id
                LIMIT 1
            ";

            $customerResult = $this->db->raw($customerSql, [
                'booking_type' => $bookingType,
                'booking_id' => $bookingId
            ]);

            if (!$customerResult['success'] || count($customerResult['data']) === 0) {
                return $this->errorResponse('Booking not found', 404);
            }

            $customerCode = $customerResult['data'][0]['customer_code'];

            // Get available POs from view (same customer, same type, not in group, not cancelled, no payment details)
            $availableSql = "
                SELECT DISTINCT
                    vdr.booking_id,
                    vdr.booking_ref_no,
                    vdr.create_date,
                    vdr.created_at,
                    vdr.total_price as total_amount,
                    vdr.customer_name,
                    vdr.customer_code
                FROM view_daily_report_all vdr
                WHERE vdr.booking_type = :booking_type
                    AND vdr.customer_code = :customer_code
                    AND vdr.booking_id != :booking_id
                    AND vdr.booking_id NOT IN (
                        SELECT booking_id FROM payment_groups
                        WHERE booking_type = :tracking_type1
                    )
                    AND vdr.booking_id NOT IN (
                        SELECT DISTINCT booking_id FROM booking_payment_details
                        WHERE booking_type = :tracking_type2
                    )
                ORDER BY vdr.created_at DESC
            ";

            $availableResult = $this->db->raw($availableSql, [
                'booking_type' => $bookingType,
                'customer_code' => $customerCode,
                'booking_id' => $bookingId,
                'tracking_type1' => $trackingType,
                'tracking_type2' => $trackingType
            ]);

            if (!$availableResult['success']) {
                $this->logMessage("SQL Error in getAvailablePOsForLink: " . ($availableResult['error'] ?? 'Unknown'), 'ERROR');
                return $this->errorResponse('Failed to fetch available POs: ' . ($availableResult['error'] ?? 'Unknown'), 500);
            }

            return $this->successResponse(
                $availableResult['data'],
                'Available POs retrieved successfully',
                count($availableResult['data'])
            );
        } catch (Exception $e) {
            $this->logMessage("Error getting available POs: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to get available POs: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get payment group info for a PO
     * Request: {
     *   booking_type: "Flight",
     *   booking_id: 123
     * }
     */
    private function getPaymentGroupInfo()
    {
        $bookingType = $this->request['booking_type'] ?? null;
        $bookingId = $this->request['booking_id'] ?? null;

        if (!$bookingType || !$bookingId) {
            return $this->errorResponse('Missing required fields: booking_type or booking_id', 400);
        }

        try {
            // Map booking_type to tracking type
            $typeMap = [
                'Flight' => 'flight',
                'Voucher-BUS' => 'voucher',
                'Voucher-BOAT' => 'voucher',
                'Voucher-TOUR' => 'voucher',
                'Other-INSURANCE' => 'other',
                'Other-HOTEL' => 'other',
                'Other-TRAIN' => 'other',
                'Other-VISA' => 'other',
                'Other-OTHER' => 'other',
                'Deposit' => 'deposit'
            ];

            $trackingType = $typeMap[$bookingType] ?? null;

            if (!$trackingType) {
                return $this->errorResponse('Invalid booking type', 400);
            }

            // Get group info
            $groupSql = "SELECT group_id, is_master FROM payment_groups
                        WHERE booking_type = :booking_type AND booking_id = :booking_id";
            $groupResult = $this->db->raw($groupSql, [
                'booking_type' => $trackingType,
                'booking_id' => $bookingId
            ]);

            if (!$groupResult['success'] || count($groupResult['data']) === 0) {
                return $this->successResponse([
                    'in_group' => false,
                    'group_id' => null,
                    'is_master' => false,
                    'linked_pos' => []
                ]);
            }

            $groupInfo = $groupResult['data'][0];
            $groupId = $groupInfo['group_id'];
            $isMaster = $groupInfo['is_master'] == 1;

            // Get all POs in this group
            $linkedSql = "
                SELECT
                    pg.booking_type as tracking_type,
                    pg.booking_id,
                    pg.is_master,
                    vdr.booking_ref_no,
                    vdr.booking_type,
                    vdr.total_price as total_amount
                FROM payment_groups pg
                LEFT JOIN view_daily_report_all vdr
                    ON pg.booking_id = vdr.booking_id
                    AND pg.booking_type = CASE
                        WHEN vdr.booking_type = 'Flight' THEN 'flight'
                        WHEN vdr.booking_type LIKE 'Voucher-%' THEN 'voucher'
                        WHEN vdr.booking_type LIKE 'Other-%' THEN 'other'
                        WHEN vdr.booking_type = 'Deposit' THEN 'deposit'
                    END
                WHERE pg.group_id = :group_id
                ORDER BY pg.is_master DESC, pg.created_at ASC
            ";

            $linkedResult = $this->db->raw($linkedSql, ['group_id' => $groupId]);

            $linkedPOs = [];
            if ($linkedResult['success']) {
                $linkedPOs = $linkedResult['data'];
            }

            return $this->successResponse([
                'in_group' => true,
                'group_id' => $groupId,
                'is_master' => $isMaster,
                'linked_pos' => $linkedPOs
            ]);
        } catch (Exception $e) {
            $this->logMessage("Error getting payment group info: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to get payment group info: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get booking details by booking_type and booking_id
     * ใช้สำหรับ Navigate to Master PO
     */
    private function getBookingDetails()
    {
        $bookingType = $this->request['booking_type'] ?? null;
        $bookingId = $this->request['booking_id'] ?? null;

        if (!$bookingType || !$bookingId) {
            return $this->errorResponse('Missing required fields: booking_type or booking_id', 400);
        }

        try {
            // ดึงข้อมูลจาก view_daily_report_all
            $sql = "
                SELECT
                    vdr.booking_id,
                    vdr.booking_type,
                    vdr.booking_ref_no,
                    vdr.create_date,
                    vdr.customer_code,
                    vdr.supplier_code,
                    vdr.pax_name,
                    vdr.pax_count,
                    vdr.routing_detail,
                    vdr.ticket_number,
                    vdr.code,
                    vdr.total_price as total_amount,
                    vdr.description,
                    vdr.ref,
                    vdr.payment_method,
                    vdr.payment_detail
                FROM view_daily_report_all vdr
                WHERE vdr.booking_type = :booking_type
                AND vdr.booking_id = :booking_id
                LIMIT 1
            ";

            $result = $this->db->raw($sql, [
                'booking_type' => $bookingType,
                'booking_id' => $bookingId
            ]);

            if (!$result['success'] || count($result['data']) === 0) {
                return $this->errorResponse('Booking not found', 404);
            }

            $booking = $result['data'][0];

            // Parse payment method details
            $paymentMethodDetails = null;
            if (!empty($booking['payment_method'])) {
                $paymentMethodDetails = [
                    'method' => $booking['payment_method'],
                    'details' => $booking['payment_detail'] ?? ''
                ];
            }

            // Get payment details from payment_tracking
            $paymentDetails = [];
            $trackingType = null;

            // Map booking_type to tracking type
            if ($bookingType === 'Flight') {
                $trackingType = 'flight';
            } elseif (strpos($bookingType, 'Voucher') === 0) {
                $trackingType = 'voucher';
            } elseif (strpos($bookingType, 'Other') === 0) {
                $trackingType = 'other';
            } elseif ($bookingType === 'Deposit') {
                $trackingType = 'deposit';
            }

            if ($trackingType) {
                $paymentSql = "
                    SELECT payment_date, amount, payment_method, bank_name, card_type, note
                    FROM payment_tracking
                    WHERE booking_type = :tracking_type AND booking_id = :booking_id
                    ORDER BY payment_date ASC
                ";
                $paymentResult = $this->db->raw($paymentSql, [
                    'tracking_type' => $trackingType,
                    'booking_id' => $bookingId
                ]);

                if ($paymentResult['success']) {
                    $paymentDetails = $paymentResult['data'];
                }
            }

            // Calculate paid amount
            $paidAmount = array_reduce($paymentDetails, function ($sum, $p) {
                return $sum + floatval($p['amount'] ?? 0);
            }, 0);

            return $this->successResponse([
                'booking_id' => $booking['booking_id'],
                'booking_type' => $booking['booking_type'],
                'booking_ref_no' => $booking['booking_ref_no'],
                'create_date' => $booking['create_date'],
                'customer_code' => $booking['customer_code'],
                'supplier_code' => $booking['supplier_code'],
                'pax_name' => $booking['pax_name'],
                'pax_count' => $booking['pax_count'],
                'routing_detail' => $booking['routing_detail'],
                'ticket_number' => $booking['ticket_number'],
                'code' => $booking['code'],
                'total_amount' => $booking['total_amount'],
                'description' => $booking['description'],
                'ref' => $booking['ref'],
                'payment_method_details' => $paymentMethodDetails,
                'payment_details' => $paymentDetails,
                'paid_amount' => $paidAmount
            ]);
        } catch (Exception $e) {
            $this->logMessage("Error getting booking details: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to get booking details: ' . $e->getMessage(), 500);
        }
    }
}
