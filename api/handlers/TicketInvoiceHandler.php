<?php
// api/handlers/TicketInvoiceHandler.php
// Ticket Invoice & Receipt Operations Handler - Phase 4 Split
// จัดการ Invoice, Receipt และ PDF generation operations

require_once 'BaseHandler.php';

class TicketInvoiceHandler extends BaseHandler
{
    /**
     * Handle invoice ticket actions
     */
    public function handle($action)
    {
        try {
            // ตรวจสอบ database connection
            $dbCheck = $this->checkDatabaseConnection();
            if ($dbCheck) {
                return $dbCheck;
            }

            switch ($action) {
                // Invoice & Receipt operations
                case 'getInvoiceDataForTicket':
                    return $this->getInvoiceDataForTicket();
                case 'getInvoiceTickets':
                    return $this->getInvoiceTickets();
                case 'getReceiptTickets':
                    return $this->getReceiptTickets();
                case 'getAvailableReceipts':
                    return $this->getAvailableReceipts();
                case 'generateRCForTicket':
                    return $this->generateRCForTicket();

                    // ⭐ Multi-PO Receipt Generation
                case 'getAvailablePOsForRC':
                    return $this->getAvailablePOsForRC();
                case 'getCombinedInvoiceData':
                    return $this->getCombinedInvoiceData();

                default:
                    return $this->errorResponse("Unknown invoice ticket action: {$action}");
            }
        } catch (Exception $e) {
            $this->logMessage("TicketInvoiceHandler error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Invoice ticket handler error: ' . $e->getMessage(), 500);
        }
    }

    // ===========================================
    // INVOICE OPERATIONS
    // ===========================================

    /**
     * Get Invoice Data for Ticket (for documentDataMapper.js)
     * ✅ Print = Edit: อัปเดต updated_by ทุกครั้งที่ Print
     */
    private function getInvoiceDataForTicket()
    {
        $ticketId = $this->request['ticketId'] ?? $this->request['id'] ?? null;
        $printUserId = $this->request['userId'] ?? null; // รับ userId จาก Frontend
        $documentType = $this->request['documentType'] ?? 'invoice'; // ✅ รับ documentType (invoice หรือ receipt)

        if (!$ticketId) {
            return $this->errorResponse('Ticket ID is required', 400);
        }

        try {
            // ✅ Print = Edit: อัปเดต updated_by ก่อนดึงข้อมูล
            if ($printUserId) {
                $updateData = [
                    'updated_by' => $printUserId,
                    'updated_at' => date('Y-m-d H:i:s')
                ];

                $this->db->update(
                    'bookings_ticket',
                    $updateData,
                    'id = :id',
                    ['id' => $ticketId]
                );
                $this->logMessage("Updated ticket {$ticketId} with updated_by={$printUserId} (Print {$documentType})");
            }

            // ✅ แก้ไข SQL เพิ่ม customer_override_data, invoice_number, rc_linked_tickets และ rc_selection_data
            $sql = "
            SELECT
                bt.id, bt.reference_number, bt.po_number, bt.po_generated_at,
                bt.rc_number, bt.rc_generated_at, bt.rc_linked_tickets, bt.rc_selection_data,
                bt.invoice_number, bt.invoice_generated_at,
                bt.created_at, bt.created_by, bt.updated_at, bt.updated_by,
                bt.customer_override_data, 
                
                -- Customer data (full structure)
                c.id as customer_id, c.name as customer_name,
                c.address_line1 as customer_address_line1, c.address_line2 as customer_address_line2,
                c.address_line3 as customer_address_line3, c.phone as customer_phone,
                c.id_number as customer_id_number, c.branch_type as customer_branch_type,
                c.branch_number as customer_branch_number, c.code as customer_code,
                c.email as customer_email,
                
                -- Supplier data
                i.id as supplier_id, i.name as supplier_name, i.code as supplier_code,
                i.numeric_code as supplier_numeric_code,
                
                -- Tickets detail data
                td.issue_date, td.due_date, td.credit_days,
                td.subtotal_before_vat, td.vat_percent, td.vat_amount, td.grand_total,
                
                -- Additional info data
                tai.code as additional_code, tai.ticket_type, tai.ticket_type_details,
                tai.company_payment_method, tai.company_payment_details,
                tai.customer_payment_method, tai.customer_payment_details,
                
                -- User data
                u.fullname as user_fullname
                
            FROM bookings_ticket bt
            LEFT JOIN customers c ON bt.customer_id = c.id
            LEFT JOIN information i ON bt.information_id = i.id
            LEFT JOIN tickets_detail td ON bt.id = td.bookings_ticket_id
            LEFT JOIN ticket_additional_info tai ON bt.id = tai.bookings_ticket_id
            LEFT JOIN users u ON bt.updated_by = u.id
            WHERE bt.id = :ticketId
        ";

            $result = $this->db->raw($sql, ['ticketId' => $ticketId]);

            if (!$result['success'] || empty($result['data'])) {
                return $this->errorResponse('Ticket not found', 404);
            }

            $mainData = $result['data'][0];

            // Get related arrays data
            $pricingData = $this->getInvoicePricingData($ticketId);
            $passengersData = $this->getInvoicePassengersData($ticketId);
            $routesData = $this->getInvoiceRoutesData($ticketId);
            $extrasData = $this->getInvoiceExtrasData($ticketId);

            // ⭐ ประมวลผล rc_linked_tickets สำหรับ MultiPOReceipt
            $selectedPOs = null;
            $multiPOSummary = null;

            $hasLinkedTickets = !empty($mainData['rc_linked_tickets']);
            $hasSelectionData = !empty($mainData['rc_selection_data']) && $mainData['rc_selection_data'] !== 'null';

            $this->logMessage("DEBUG: documentType = {$documentType}, hasLinkedTickets = " . ($hasLinkedTickets ? 'YES' : 'NO') . ", hasSelectionData = " . ($hasSelectionData ? 'YES' : 'NO'));

            // ✅ เช็คว่าไม่มี rc_selection_data (ถ้ามี = Regular Receipt ไม่ใช่ Multi PO)
            if ($hasLinkedTickets && $documentType === 'receipt' && !$hasSelectionData) {
                $this->logMessage("DEBUG: Processing Multi PO Receipt");
                $linkedData = json_decode($mainData['rc_linked_tickets'], true);
                $this->logMessage("DEBUG: linkedData = " . json_encode($linkedData));

                // ⭐ รองรับทั้ง lowercase และ UPPERCASE keys
                $ticketIds = $linkedData['ticket_ids'] ?? $linkedData['TICKET_IDS'] ?? null;

                if ($linkedData && $ticketIds && is_array($ticketIds)) {
                    $this->logMessage("DEBUG: Calling getLinkedPOsData with " . count($ticketIds) . " tickets");
                    $selectedPOs = $this->getLinkedPOsData($ticketIds);
                    $this->logMessage("DEBUG: selectedPOs count = " . count($selectedPOs));

                    // คำนวณ summary รวมจากทุก PO
                    if (!empty($selectedPOs)) {
                        $totalSubtotal = 0;
                        $totalVat = 0;
                        $totalGrandTotal = 0;
                        $vatPercent = 7; // default

                        foreach ($selectedPOs as $po) {
                            $totalSubtotal += floatval($po['subtotal_before_vat'] ?? 0);
                            $totalVat += floatval($po['vat_amount'] ?? 0);
                            $totalGrandTotal += floatval($po['total_amount'] ?? 0);
                            if (isset($po['vat_percent'])) {
                                $vatPercent = floatval($po['vat_percent']);
                            }
                        }

                        $multiPOSummary = [
                            'subtotal' => $totalSubtotal,
                            'vat' => $totalVat,
                            'vatPercent' => $vatPercent,
                            'total' => $totalGrandTotal
                        ];
                    }
                }
            }

            // ✅ แก้ไข customer object ให้ใช้ helper functions
            $invoiceData = [
                'id' => $mainData['id'],
                'reference_number' => $mainData['reference_number'],
                'po_number' => $mainData['po_number'],
                'po_generated_at' => $mainData['po_generated_at'],
                'rc_number' => $mainData['rc_number'],
                'rc_generated_at' => $mainData['rc_generated_at'],
                'invoice_number' => $mainData['invoice_number'],
                'invoice_generated_at' => $mainData['invoice_generated_at'],
                'created_at' => $mainData['created_at'],
                'created_by' => $mainData['created_by'],
                'updated_at' => $mainData['updated_at'],
                'updated_by' => $mainData['updated_by'],


                // ✅ Customer object ใช้ helper functions
                'customer' => $mainData['customer_id'] ? [
                    'name' => $this->getDisplayCustomerName($mainData),
                    'address_line1' => $this->getDisplayCustomerAddressLine1($mainData),
                    'address_line2' => $this->getDisplayCustomerAddressLine2($mainData),
                    'address_line3' => $this->getDisplayCustomerAddressLine3($mainData),
                    'phone' => $this->getDisplayCustomerPhone($mainData),
                    'id_number' => $this->getDisplayCustomerIdNumber($mainData),
                    'branch_type' => $this->getDisplayCustomerBranchType($mainData),
                    'branch_number' => $this->getDisplayCustomerBranchNumber($mainData),
                    'code' => $mainData['customer_code'],
                    'email' => $mainData['customer_email'],
                    'customer_override_data' => $mainData['customer_override_data']
                ] : null,

                // Supplier object (unchanged)
                'supplier' => $mainData['supplier_id'] ? [
                    'name' => $mainData['supplier_name'],
                    'code' => $mainData['supplier_code'],
                    'numeric_code' => $mainData['supplier_numeric_code']
                ] : null,

                // Tickets detail array (unchanged)
                'tickets_detail' => [[
                    'issue_date' => $mainData['issue_date'],
                    'due_date' => $mainData['due_date'],
                    'credit_days' => $mainData['credit_days'],
                    'subtotal_before_vat' => $mainData['subtotal_before_vat'],
                    'vat_percent' => $mainData['vat_percent'],
                    'vat_amount' => $mainData['vat_amount'],
                    'grand_total' => $mainData['grand_total']
                ]],

                // Additional info array (unchanged)
                'ticket_additional_info' => [[
                    'code' => $mainData['additional_code'],
                    'ticket_type' => $mainData['ticket_type'],
                    'ticket_type_details' => $mainData['ticket_type_details'],
                    'company_payment_method' => $mainData['company_payment_method'],
                    'company_payment_details' => $mainData['company_payment_details'],
                    'customer_payment_method' => $mainData['customer_payment_method'],
                    'customer_payment_details' => $mainData['customer_payment_details']
                ]],

                // User object (unchanged)
                'user' => $mainData['user_fullname'] ? [
                    'fullname' => $mainData['user_fullname']
                ] : null,

                // Related arrays (unchanged)
                'tickets_pricing' => $pricingData,
                'tickets_passengers' => $passengersData,
                'tickets_routes' => $routesData,
                'tickets_extras' => $extrasData,

                // ⭐ Multi PO Receipt data
                'selectedPOs' => $selectedPOs,
                'multiPOSummary' => $multiPOSummary
            ];

            $this->logMessage("Retrieved invoice data for ticket: {$ticketId}");
            return $this->successResponse($invoiceData);
        } catch (Exception $e) {
            $this->logMessage("Error in getInvoiceDataForTicket: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch invoice data', 500);
        }
    }

    /**
     * ดึงข้อมูล tickets สำหรับ Invoice List (มี PO number แล้ว)
     * ⭐ รองรับหลาย service types: PO (Flight), VC (Voucher), HTL, TRN, VSA, OTH (Other Services)
     */
    private function getInvoiceTickets()
    {
        try {
            $startDate = $this->request['startDate'] ?? $_REQUEST['startDate'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $this->request['endDate'] ?? $_REQUEST['endDate'] ?? date('Y-m-d');
            $searchTerm = $this->request['searchTerm'] ?? $_REQUEST['searchTerm'] ?? '';
            $filterStatus = $this->request['filterStatus'] ?? $_REQUEST['filterStatus'] ?? 'all';
            $sortField = $this->request['sortField'] ?? $_REQUEST['sortField'] ?? 'created_at';
            $sortDirection = $this->request['sortDirection'] ?? $_REQUEST['sortDirection'] ?? 'desc';

            $processedData = [];

            // ========================================
            // 1. ดึงข้อมูล Flight Tickets (PO)
            // ========================================
            $flightData = $this->getFlightInvoiceData($startDate, $endDate, $searchTerm, $filterStatus);
            $processedData = array_merge($processedData, $flightData);

            // ========================================
            // 2. ดึงข้อมูล Vouchers (VC) ที่มี VC Number
            // ========================================
            $voucherData = $this->getVoucherInvoiceData($startDate, $endDate, $searchTerm, $filterStatus);
            $processedData = array_merge($processedData, $voucherData);

            // ========================================
            // 3. ดึงข้อมูล Other Services (HTL, TRN, VSA, OTH) ที่มี PO Number
            // ========================================
            $otherData = $this->getOtherServicesInvoiceData($startDate, $endDate, $searchTerm, $filterStatus);
            $processedData = array_merge($processedData, $otherData);

            // ========================================
            // Sort all data
            // ========================================
            $sortDir = strtoupper($sortDirection) === 'ASC' ? 1 : -1;
            usort($processedData, function ($a, $b) use ($sortField, $sortDir) {
                $aVal = '';
                $bVal = '';

                switch ($sortField) {
                    case 'po_number':
                        $aVal = $a['po_number'] ?? '';
                        $bVal = $b['po_number'] ?? '';
                        break;
                    case 'customer':
                        $aVal = $a['customer']['name'] ?? '';
                        $bVal = $b['customer']['name'] ?? '';
                        break;
                    case 'supplier':
                        $aVal = $a['supplier']['name'] ?? '';
                        $bVal = $b['supplier']['name'] ?? '';
                        break;
                    case 'total_amount':
                        $aVal = floatval($a['total_amount'] ?? 0);
                        $bVal = floatval($b['total_amount'] ?? 0);
                        return ($aVal <=> $bVal) * $sortDir;
                    case 'po_generated_at':
                    case 'created_at':
                    default:
                        $aVal = $a['po_generated_at'] ?? $a['created_at'] ?? '';
                        $bVal = $b['po_generated_at'] ?? $b['created_at'] ?? '';
                        break;
                }

                return strcmp($aVal, $bVal) * $sortDir;
            });

            $this->logMessage("Fetched " . count($processedData) . " invoice items (PO + VC + Other)");
            return $this->successResponse($processedData, null, count($processedData));
        } catch (Exception $e) {
            $this->logMessage("Error getting invoice tickets: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to get invoice tickets: ' . $e->getMessage(), 500);
        }
    }

    /**
     * ดึงข้อมูล Flight Tickets (PO) สำหรับ Invoice List
     */
    private function getFlightInvoiceData($startDate, $endDate, $searchTerm, $filterStatus)
    {
        $whereConditions = [];
        $params = [];

        // PO number condition
        $whereConditions[] = "bt.po_number IS NOT NULL";
        $whereConditions[] = "bt.po_number != ''";

        // Date range filter - ✅ กรองตาม po_generated_at (วันที่สร้างเอกสาร PO)
        if (!empty($startDate) && !empty($endDate)) {
            $whereConditions[] = "DATE(bt.po_generated_at) BETWEEN :startDate AND :endDate";
            $params['startDate'] = $startDate;
            $params['endDate'] = $endDate;
        }

        // Search filter
        if (!empty($searchTerm) && trim($searchTerm) !== '') {
            $cleanSearchTerm = trim($searchTerm);
            $whereConditions[] = "(
                COALESCE(bt.reference_number, '') LIKE :search1 OR
                COALESCE(bt.po_number, '') LIKE :search2 OR
                COALESCE(c.name, '') LIKE :search3 OR
                COALESCE(c.code, '') LIKE :search4 OR
                COALESCE(i.name, '') LIKE :search5 OR
                COALESCE(i.code, '') LIKE :search6
            )";
            $searchPattern = "%{$cleanSearchTerm}%";
            $params['search1'] = $searchPattern;
            $params['search2'] = $searchPattern;
            $params['search3'] = $searchPattern;
            $params['search4'] = $searchPattern;
            $params['search5'] = $searchPattern;
            $params['search6'] = $searchPattern;
        }

        // Status filter
        if ($filterStatus === 'all_except_cancelled') {
            $whereConditions[] = "bt.status != 'cancelled'";
        } elseif ($filterStatus === 'cancelled') {
            $whereConditions[] = "bt.status = 'cancelled'";
        }

        $whereClause = !empty($whereConditions) ? implode(' AND ', $whereConditions) : '1=1';

        $sql = "
            SELECT
                bt.id, bt.reference_number, bt.status, bt.payment_status,
                bt.created_at, bt.updated_at, bt.po_number, bt.po_generated_at,
                bt.rc_number, bt.rc_generated_at, bt.rc_selection_data,
                bt.rc_email_sent, bt.rc_email_sent_at,
                bt.cancelled_at, bt.cancelled_by, bt.cancel_reason,
                c.id as customer_id, c.name as customer_name, c.code as customer_code,
                i.id as supplier_id, i.name as supplier_name, i.code as supplier_code,
                td.grand_total as total_amount,
                cu.fullname as cancelled_user_fullname
            FROM bookings_ticket bt
            LEFT JOIN customers c ON bt.customer_id = c.id
            LEFT JOIN information i ON bt.information_id = i.id
            LEFT JOIN tickets_detail td ON bt.id = td.bookings_ticket_id
            LEFT JOIN users cu ON bt.cancelled_by = cu.id
            WHERE {$whereClause}
            ORDER BY bt.po_generated_at DESC
        ";

        $result = $this->db->raw($sql, $params);

        if (!$result['success']) {
            return [];
        }

        $tickets = $result['data'];
        $ticketIds = array_column($tickets, 'id');

        if (empty($ticketIds)) {
            return [];
        }

        // Get related data
        $passengersMap = $this->getPassengersByTicketIds($ticketIds);
        $routesMap = $this->getRoutesByTicketIds($ticketIds);
        $additionalInfoMap = $this->getAdditionalInfoByTicketIds($ticketIds);
        $allPassengerTicketCodesMap = $this->getAllPassengerTicketCodesByTicketIds($ticketIds);
        $extrasDescMap = $this->getExtrasDescriptionByTicketIds($ticketIds);

        $processedData = [];
        foreach ($tickets as $ticket) {
            $ticketId = $ticket['id'];
            $ticketPassengers = $passengersMap[$ticketId] ?? [];
            $ticketRoutes = $routesMap[$ticketId] ?? [];
            $allTicketCodes = $allPassengerTicketCodesMap[$ticketId] ?? [];

            // Generate passengers display
            $passengersDisplay = '';
            if (count($ticketPassengers) > 0) {
                $firstName = $ticketPassengers[0]['passenger_name'] ?? 'Unknown';
                if (count($ticketPassengers) === 1) {
                    $passengersDisplay = $firstName;
                } else {
                    $additionalCount = count($ticketPassengers) - 1;
                    $passengersDisplay = "{$firstName}...+{$additionalCount}";
                }
            }

            // Generate routing display
            // Fallback: ถ้าไม่มี routing ให้ใช้ tickets_extras description แทน
            $routingDisplay = '';
            if (count($ticketRoutes) > 0) {
                $routingDisplay = $this->generateMultiSegmentRoute($ticketRoutes);
            }
            if (empty($routingDisplay) && !empty($extrasDescMap[$ticketId])) {
                $routingDisplay = implode(', ', $extrasDescMap[$ticketId]);
            }

            $ticketNumberDisplay = $this->generateTicketNumberDisplay($allTicketCodes);

            // Adjust created_at to Thai timezone (+7 hours)
            $createdAt = new DateTime($ticket['created_at']);
            $createdAt->add(new DateInterval('PT7H'));

            $processedData[] = [
                'id' => $ticket['id'],
                'service_type' => 'PO', // ⭐ Flight Ticket
                'reference_number' => $ticket['reference_number'],
                'status' => $ticket['status'],
                'payment_status' => $ticket['payment_status'],
                'created_at' => $createdAt->format('c'),
                'updated_at' => $ticket['updated_at'],
                'po_number' => $ticket['po_number'],
                'po_generated_at' => $ticket['po_generated_at'],
                'rc_number' => $ticket['rc_number'],
                'rc_generated_at' => $ticket['rc_generated_at'],
                'rc_selection_data' => $ticket['rc_selection_data'],
                'rc_email_sent' => $ticket['rc_email_sent'] ?? 0,
                'rc_email_sent_at' => $ticket['rc_email_sent_at'],
                'cancelled_at' => $ticket['cancelled_at'],
                'cancelled_by' => $ticket['cancelled_by'],
                'cancel_reason' => $ticket['cancel_reason'],
                'customer' => [
                    'name' => $ticket['customer_name'],
                    'code' => $ticket['customer_code']
                ],
                'supplier' => [
                    'name' => $ticket['supplier_name'],
                    'code' => $ticket['supplier_code']
                ],
                'cancelled_user' => [
                    'fullname' => $ticket['cancelled_user_fullname']
                ],
                'code' => $additionalInfoMap[$ticketId] ? $additionalInfoMap[$ticketId]['code'] : null,
                'passengersDisplay' => $passengersDisplay,
                'pax_count' => count($ticketPassengers),
                'routingDisplay' => $routingDisplay,
                'ticketNumberDisplay' => $ticketNumberDisplay,
                'total_amount' => $ticket['total_amount'] ?? 0
            ];
        }

        return $processedData;
    }

    /**
     * ดึงข้อมูล Vouchers (VC) สำหรับ Invoice List
     * เฉพาะที่มี VC Number แล้ว
     */
    private function getVoucherInvoiceData($startDate, $endDate, $searchTerm, $filterStatus)
    {
        $whereConditions = [];
        $params = [];

        // VC number condition
        $whereConditions[] = "bv.vc_number IS NOT NULL";
        $whereConditions[] = "bv.vc_number != ''";

        // Date range filter - ✅ กรองตาม vc_generated_at (วันที่สร้างเอกสาร VC)
        if (!empty($startDate) && !empty($endDate)) {
            $whereConditions[] = "DATE(bv.vc_generated_at) BETWEEN :startDate AND :endDate";
            $params['startDate'] = $startDate;
            $params['endDate'] = $endDate;
        }

        // Search filter
        if (!empty($searchTerm) && trim($searchTerm) !== '') {
            $cleanSearchTerm = trim($searchTerm);
            $whereConditions[] = "(
                COALESCE(bv.reference_number, '') LIKE :search1 OR
                COALESCE(bv.vc_number, '') LIKE :search2 OR
                COALESCE(c.name, '') LIKE :search3 OR
                COALESCE(c.code, '') LIKE :search4 OR
                COALESCE(i.name, '') LIKE :search5 OR
                COALESCE(i.code, '') LIKE :search6
            )";
            $searchPattern = "%{$cleanSearchTerm}%";
            $params['search1'] = $searchPattern;
            $params['search2'] = $searchPattern;
            $params['search3'] = $searchPattern;
            $params['search4'] = $searchPattern;
            $params['search5'] = $searchPattern;
            $params['search6'] = $searchPattern;
        }

        // Status filter
        if ($filterStatus === 'all_except_cancelled') {
            $whereConditions[] = "bv.status != 'cancelled'";
        } elseif ($filterStatus === 'cancelled') {
            $whereConditions[] = "bv.status = 'cancelled'";
        }

        $whereClause = !empty($whereConditions) ? implode(' AND ', $whereConditions) : '1=1';

        $sql = "
            SELECT
                bv.id, bv.reference_number, bv.status, bv.payment_status,
                bv.created_at, bv.updated_at, bv.vc_number, bv.vc_generated_at,
                bv.service_type,
                bv.cancelled_at, bv.cancelled_by, bv.cancel_reason,
                c.id as customer_id, c.name as customer_name, c.code as customer_code,
                i.id as supplier_id, i.name as supplier_name, i.code as supplier_code,
                vd.grand_total as total_amount,
                vd.description,
                vd.trip_date,
                cu.fullname as cancelled_user_fullname
            FROM bookings_voucher bv
            LEFT JOIN customers c ON bv.customer_id = c.id
            LEFT JOIN information i ON bv.information_id = i.id
            LEFT JOIN voucher_details vd ON bv.id = vd.bookings_voucher_id
            LEFT JOIN users cu ON bv.cancelled_by = cu.id
            WHERE {$whereClause}
            ORDER BY bv.vc_generated_at DESC
        ";

        $result = $this->db->raw($sql, $params);

        if (!$result['success']) {
            return [];
        }

        $vouchers = $result['data'];

        if (empty($vouchers)) {
            return [];
        }

        // Get passengers for vouchers
        $voucherIds = array_column($vouchers, 'id');
        $passengersMap = $this->getVoucherPassengersByIds($voucherIds);

        $processedData = [];
        foreach ($vouchers as $voucher) {
            $voucherId = $voucher['id'];
            $passengers = $passengersMap[$voucherId] ?? [];

            // Generate passengers display
            $passengersDisplay = '';
            if (count($passengers) > 0) {
                $firstName = $passengers[0]['passenger_name'] ?? 'Unknown';
                if (count($passengers) === 1) {
                    $passengersDisplay = $firstName;
                } else {
                    $additionalCount = count($passengers) - 1;
                    $passengersDisplay = "{$firstName}...+{$additionalCount}";
                }
            }

            // Adjust created_at to Thai timezone (+7 hours)
            $createdAt = new DateTime($voucher['created_at']);
            $createdAt->add(new DateInterval('PT7H'));

            $processedData[] = [
                'id' => $voucher['id'],
                'service_type' => 'VC', // ⭐ Voucher
                'voucher_service_type' => strtoupper($voucher['service_type'] ?? ''), // BUS, BOAT, TOUR
                'reference_number' => $voucher['reference_number'],
                'status' => $voucher['status'],
                'payment_status' => $voucher['payment_status'],
                'created_at' => $createdAt->format('c'),
                'updated_at' => $voucher['updated_at'],
                'po_number' => $voucher['vc_number'], // ใช้ vc_number แทน po_number
                'po_generated_at' => $voucher['vc_generated_at'],
                'cancelled_at' => $voucher['cancelled_at'],
                'cancelled_by' => $voucher['cancelled_by'],
                'cancel_reason' => $voucher['cancel_reason'],
                'customer' => [
                    'name' => $voucher['customer_name'],
                    'code' => $voucher['customer_code']
                ],
                'supplier' => [
                    'name' => $voucher['supplier_name'],
                    'code' => $voucher['supplier_code']
                ],
                'cancelled_user' => [
                    'fullname' => $voucher['cancelled_user_fullname']
                ],
                'code' => null,
                'passengersDisplay' => $passengersDisplay,
                'pax_count' => count($passengers),
                'routingDisplay' => $voucher['description'] ?? '', // ⭐ ใช้ description แทน routing
                'ticketNumberDisplay' => '-',
                'total_amount' => $voucher['total_amount'] ?? 0,
                'description' => $voucher['description'] ?? '',
                'trip_date' => $voucher['trip_date'] ?? ''
            ];
        }

        return $processedData;
    }

    /**
     * ดึงข้อมูล Other Services (HTL, TRN, VSA, OTH) สำหรับ Invoice List
     * ⭐ แสดงทั้งหมด ไม่เกี่ยวกับว่ามี VC Number หรือไม่ (เหมือน Report ลูกหนี้คงค้าง)
     */
    private function getOtherServicesInvoiceData($startDate, $endDate, $searchTerm, $filterStatus)
    {
        $whereConditions = [];
        $params = [];

        // ⭐ ไม่ต้องมีเงื่อนไข vc_number - แสดงทั้งหมด

        // Date range filter - ✅ กรองตาม vc_generated_at (ถ้ามี) หรือ created_at (ถ้ายังไม่มี VC)
        if (!empty($startDate) && !empty($endDate)) {
            $whereConditions[] = "DATE(COALESCE(bo.vc_generated_at, bo.created_at)) BETWEEN :startDate AND :endDate";
            $params['startDate'] = $startDate;
            $params['endDate'] = $endDate;
        }

        // Search filter
        if (!empty($searchTerm) && trim($searchTerm) !== '') {
            $cleanSearchTerm = trim($searchTerm);
            $whereConditions[] = "(
                COALESCE(bo.reference_number, '') LIKE :search1 OR
                COALESCE(bo.vc_number, '') LIKE :search2 OR
                COALESCE(c.name, '') LIKE :search3 OR
                COALESCE(c.code, '') LIKE :search4 OR
                COALESCE(i.name, '') LIKE :search5 OR
                COALESCE(i.code, '') LIKE :search6
            )";
            $searchPattern = "%{$cleanSearchTerm}%";
            $params['search1'] = $searchPattern;
            $params['search2'] = $searchPattern;
            $params['search3'] = $searchPattern;
            $params['search4'] = $searchPattern;
            $params['search5'] = $searchPattern;
            $params['search6'] = $searchPattern;
        }

        // Status filter
        if ($filterStatus === 'all_except_cancelled') {
            $whereConditions[] = "bo.status != 'cancelled'";
        } elseif ($filterStatus === 'cancelled') {
            $whereConditions[] = "bo.status = 'cancelled'";
        }

        $whereClause = !empty($whereConditions) ? implode(' AND ', $whereConditions) : '1=1';

        $sql = "
            SELECT
                bo.id, bo.reference_number, bo.status, bo.payment_status,
                bo.created_at, bo.updated_at, bo.vc_number, bo.vc_generated_at,
                bo.service_type,
                bo.cancelled_at, bo.cancelled_by, bo.cancel_reason,
                c.id as customer_id, c.name as customer_name, c.code as customer_code,
                i.id as supplier_id, i.name as supplier_name, i.code as supplier_code,
                od.grand_total as total_amount,
                od.description,
                od.reference_code,
                od.service_date,
                od.check_in_date,
                cu.fullname as cancelled_user_fullname
            FROM bookings_other bo
            LEFT JOIN customers c ON bo.customer_id = c.id
            LEFT JOIN information i ON bo.information_id = i.id
            LEFT JOIN other_details od ON bo.id = od.bookings_other_id
            LEFT JOIN users cu ON bo.cancelled_by = cu.id
            WHERE {$whereClause}
            ORDER BY bo.vc_generated_at DESC
        ";

        $result = $this->db->raw($sql, $params);

        if (!$result['success']) {
            return [];
        }

        $others = $result['data'];

        if (empty($others)) {
            return [];
        }

        // Get passengers for other services
        $otherIds = array_column($others, 'id');
        $passengersMap = $this->getOtherPassengersByIds($otherIds);

        // Map service_type to short code
        $serviceTypeMap = [
            'hotel' => 'HTL',
            'train' => 'TRN',
            'visa' => 'VSA',
            'other' => 'OTH',
            'insurance' => 'OTH'
        ];

        $processedData = [];
        foreach ($others as $other) {
            $otherId = $other['id'];
            $passengers = $passengersMap[$otherId] ?? [];

            // Generate passengers display
            $passengersDisplay = '';
            if (count($passengers) > 0) {
                $firstName = $passengers[0]['passenger_name'] ?? 'Unknown';
                if (count($passengers) === 1) {
                    $passengersDisplay = $firstName;
                } else {
                    $additionalCount = count($passengers) - 1;
                    $passengersDisplay = "{$firstName}...+{$additionalCount}";
                }
            }

            // Adjust created_at to Thai timezone (+7 hours)
            $createdAt = new DateTime($other['created_at']);
            $createdAt->add(new DateInterval('PT7H'));

            // Determine service type code
            $serviceType = strtolower($other['service_type'] ?? 'other');
            $serviceTypeCode = $serviceTypeMap[$serviceType] ?? 'OTH';

            // For TRN, use reference_code as code column
            $codeValue = ($serviceTypeCode === 'TRN') ? ($other['reference_code'] ?? null) : null;

            // ⭐ ถ้ามี vc_number ใช้ vc_number, ถ้าไม่มีใช้ reference_number
            $docNumber = !empty($other['vc_number']) ? $other['vc_number'] : $other['reference_number'];
            $docGeneratedAt = !empty($other['vc_generated_at']) ? $other['vc_generated_at'] : $other['created_at'];

            $processedData[] = [
                'id' => $other['id'],
                'service_type' => $serviceTypeCode, // ⭐ HTL, TRN, VSA, OTH
                'other_service_type' => strtoupper($serviceType), // HOTEL, TRAIN, VISA, OTHER, INSURANCE
                'reference_number' => $other['reference_number'],
                'status' => $other['status'],
                'payment_status' => $other['payment_status'],
                'created_at' => $createdAt->format('c'),
                'updated_at' => $other['updated_at'],
                'po_number' => $docNumber, // ⭐ ใช้ vc_number ถ้ามี, ไม่งั้นใช้ reference_number
                'po_generated_at' => $docGeneratedAt, // ⭐ ใช้ vc_generated_at ถ้ามี
                'cancelled_at' => $other['cancelled_at'],
                'cancelled_by' => $other['cancelled_by'],
                'cancel_reason' => $other['cancel_reason'],
                'customer' => [
                    'name' => $other['customer_name'],
                    'code' => $other['customer_code']
                ],
                'supplier' => [
                    'name' => $other['supplier_name'],
                    'code' => $other['supplier_code']
                ],
                'cancelled_user' => [
                    'fullname' => $other['cancelled_user_fullname']
                ],
                'code' => $codeValue, // ⭐ TRN ใช้ reference_code
                'passengersDisplay' => $passengersDisplay,
                'pax_count' => count($passengers),
                'routingDisplay' => $other['description'] ?? '', // ⭐ ใช้ description แทน routing
                'ticketNumberDisplay' => '-',
                'total_amount' => $other['total_amount'] ?? 0,
                'description' => $other['description'] ?? '',
                'reference_code' => $other['reference_code'] ?? '',
                'service_date' => $other['service_date'] ?? '',
                'check_in_date' => $other['check_in_date'] ?? ''
            ];
        }

        return $processedData;
    }

    /**
     * Get voucher passengers by voucher IDs
     */
    private function getVoucherPassengersByIds($voucherIds)
    {
        if (empty($voucherIds)) {
            return [];
        }

        $placeholders = str_repeat('?,', count($voucherIds) - 1) . '?';
        $sql = "SELECT bookings_voucher_id, passenger_name FROM voucher_passengers WHERE bookings_voucher_id IN ({$placeholders}) ORDER BY id";

        $result = $this->db->raw($sql, $voucherIds);

        $passengersMap = [];
        if ($result['success']) {
            foreach ($result['data'] as $passenger) {
                $voucherId = $passenger['bookings_voucher_id'];
                if (!isset($passengersMap[$voucherId])) {
                    $passengersMap[$voucherId] = [];
                }
                $passengersMap[$voucherId][] = $passenger;
            }
        }

        return $passengersMap;
    }

    /**
     * Get other service passengers by other IDs
     */
    private function getOtherPassengersByIds($otherIds)
    {
        if (empty($otherIds)) {
            return [];
        }

        $placeholders = str_repeat('?,', count($otherIds) - 1) . '?';
        $sql = "SELECT bookings_other_id, passenger_name FROM other_passengers WHERE bookings_other_id IN ({$placeholders}) ORDER BY id";

        $result = $this->db->raw($sql, $otherIds);

        $passengersMap = [];
        if ($result['success']) {
            foreach ($result['data'] as $passenger) {
                $otherId = $passenger['bookings_other_id'];
                if (!isset($passengersMap[$otherId])) {
                    $passengersMap[$otherId] = [];
                }
                $passengersMap[$otherId][] = $passenger;
            }
        }

        return $passengersMap;
    }

    // 🔧 NEW: Helper method to get ALL passenger ticket codes
    private function getAllPassengerTicketCodesByTicketIds($ticketIds)
    {
        if (empty($ticketIds)) {
            return [];
        }

        $placeholders = str_repeat('?,', count($ticketIds) - 1) . '?';
        $sql = "
            SELECT bookings_ticket_id, ticket_code 
            FROM tickets_passengers 
            WHERE bookings_ticket_id IN ({$placeholders})
            AND ticket_code IS NOT NULL 
            AND TRIM(ticket_code) != ''
            ORDER BY id
        ";

        $result = $this->db->raw($sql, $ticketIds);

        $ticketCodesMap = [];
        if ($result['success']) {
            foreach ($result['data'] as $passenger) {
                $ticketId = $passenger['bookings_ticket_id'];
                if (!isset($ticketCodesMap[$ticketId])) {
                    $ticketCodesMap[$ticketId] = [];
                }
                $ticketCodesMap[$ticketId][] = trim($passenger['ticket_code']);
            }
        }

        return $ticketCodesMap;
    }

    // 🔧 NEW: Generate ticket number display using same logic as FlightTicketsView
    private function generateTicketNumberDisplay($ticketCodes)
    {
        // ถ้าไม่มี ticket codes
        if (empty($ticketCodes)) {
            return '-';
        }

        // ถ้ามี ticket code เดียว
        if (count($ticketCodes) === 1) {
            return $ticketCodes[0];
        }

        // ถ้ามีหลาย ticket codes - สร้าง range format
        $firstCode = $ticketCodes[0];
        $lastCode = $ticketCodes[count($ticketCodes) - 1];

        // เอา 3 หลักสุดท้ายของ code สุดท้าย
        $lastThreeDigits = substr($lastCode, -3);

        return "{$firstCode}-{$lastThreeDigits}";
    }

    /**
     * ดึงข้อมูล tickets สำหรับ Receipt List (มี RC number แล้ว)
     */
    private function getReceiptTickets()
    {
        try {

            error_log("🔍 DEBUG getReceiptTickets");
            error_log("📦 this->request: " . json_encode($this->request));
            error_log("📦 _REQUEST: " . json_encode($_REQUEST));
            error_log("📦 searchTerm from this->request: " . ($this->request['searchTerm'] ?? 'NOT_FOUND'));
            error_log("📦 searchTerm from _REQUEST: " . ($_REQUEST['searchTerm'] ?? 'NOT_FOUND'));


            $startDate = $this->request['startDate'] ?? $_REQUEST['startDate'] ?? date('Y-m-d', strtotime('-30 days'));
            $endDate = $this->request['endDate'] ?? $_REQUEST['endDate'] ?? date('Y-m-d');
            $searchTerm = $this->request['searchTerm'] ?? $_REQUEST['searchTerm'] ?? '';
            $filterStatus = $this->request['filterStatus'] ?? $_REQUEST['filterStatus'] ?? 'all';
            $sortField = $this->request['sortField'] ?? $_REQUEST['sortField'] ?? 'rc_generated_at';
            $sortDirection = $this->request['sortDirection'] ?? $_REQUEST['sortDirection'] ?? 'desc';

            $whereConditions = [];
            $params = [];

            // ✅ เพิ่ม RC number condition
            $whereConditions[] = "bt.rc_number IS NOT NULL";
            $whereConditions[] = "bt.rc_number != ''";

            // Date range filter - ✅ ตรวจสอบว่ามี date หรือไม่
            if (!empty($startDate) && !empty($endDate)) {
                $whereConditions[] = "DATE(bt.rc_generated_at) BETWEEN :startDate AND :endDate";
                $params['startDate'] = $startDate;
                $params['endDate'] = $endDate;
            }

            // ✅ แก้ไขแล้ว - ใช้ parameter แยกกัน
            if (!empty($searchTerm) && trim($searchTerm) !== '') {
                $cleanSearchTerm = trim($searchTerm);
                $whereConditions[] = "(
        COALESCE(bt.reference_number, '') LIKE :search1 OR 
        COALESCE(bt.rc_number, '') LIKE :search2 OR
        COALESCE(bt.po_number, '') LIKE :search3 OR
        COALESCE(c.name, '') LIKE :search4 OR 
        COALESCE(c.code, '') LIKE :search5 OR
        COALESCE(i.name, '') LIKE :search6 OR
        COALESCE(i.code, '') LIKE :search7
    )";
                // ✅ ส่ง parameter แยกทีละตัว
                $searchPattern = "%{$cleanSearchTerm}%";
                $params['search1'] = $searchPattern;
                $params['search2'] = $searchPattern;
                $params['search3'] = $searchPattern;
                $params['search4'] = $searchPattern;
                $params['search5'] = $searchPattern;
                $params['search6'] = $searchPattern;
                $params['search7'] = $searchPattern;
            }

            // Email Status filter (sent/unsent) for Receipt List
            if ($filterStatus === 'sent') {
                $whereConditions[] = "bt.rc_email_sent = 1";
            } elseif ($filterStatus === 'unsent') {
                $whereConditions[] = "(bt.rc_email_sent = 0 OR bt.rc_email_sent IS NULL)";
            }

            // ✅ สร้าง WHERE clause
            $whereClause = !empty($whereConditions) ? implode(' AND ', $whereConditions) : '1=1';

            // Sort mapping
            $sortMapping = [
                'rc_number' => 'bt.rc_number',
                'customer' => 'c.name',
                'rc_generated_at' => 'bt.rc_generated_at',
                'created_at' => 'bt.created_at',
                'supplier' => 'i.name'
            ];
            $sortColumn = $sortMapping[$sortField] ?? 'bt.rc_generated_at';
            $sortDirection = strtoupper($sortDirection) === 'ASC' ? 'ASC' : 'DESC';


            // Main query
            $sql = "
            SELECT
                bt.id, bt.reference_number, bt.status, bt.payment_status,
                bt.created_at, bt.updated_at, bt.po_number, bt.po_generated_at,
                bt.rc_number, bt.rc_generated_at, bt.rc_selection_data, bt.rc_linked_tickets,
                bt.rc_email_sent, bt.rc_email_sent_at,
                bt.cancelled_at, bt.cancelled_by, bt.cancel_reason,

                -- Customer data
                c.id as customer_id, c.name as customer_name, c.code as customer_code,

                -- Supplier data
                i.id as supplier_id, i.name as supplier_name, i.code as supplier_code,

                -- Cancelled user data
                cu.fullname as cancelled_user_fullname

            FROM bookings_ticket bt
            LEFT JOIN customers c ON bt.customer_id = c.id
            LEFT JOIN information i ON bt.information_id = i.id
            LEFT JOIN users cu ON bt.cancelled_by = cu.id
            WHERE {$whereClause}
            ORDER BY {$sortColumn} {$sortDirection}
        ";

            $result = $this->db->raw($sql, $params);

            if (!$result['success']) {
                return $this->errorResponse('Failed to fetch receipt tickets');
            }

            $tickets = $result['data'];
            $ticketIds = array_column($tickets, 'id');

            if (empty($ticketIds)) {
                return $this->successResponse([], null, 0);
            }

            // Get related data
            $passengersMap = $this->getPassengersByTicketIds($ticketIds);
            $routesMap = $this->getRoutesByTicketIds($ticketIds);
            $additionalInfoMap = $this->getAdditionalInfoByTicketIds($ticketIds);
            $extrasDescMap = $this->getExtrasDescriptionByTicketIds($ticketIds);

            // 🔧 NEW: Get ALL passenger ticket codes (not just first passenger)
            $allPassengerTicketCodesMap = $this->getAllPassengerTicketCodesByTicketIds($ticketIds);

            // Process data
            $processedData = [];
            foreach ($tickets as $ticket) {
                $ticketId = $ticket['id'];

                // ⭐ กรองออก ticket ที่ไม่ใช่ primary ticket สำหรับ Multi PO Receipt
                if (!empty($ticket['rc_linked_tickets'])) {
                    $linkedData = json_decode($ticket['rc_linked_tickets'], true);
                    // ⭐ รองรับทั้ง lowercase และ UPPERCASE keys
                    $primaryTicketId = $linkedData['primary_ticket_id'] ?? $linkedData['PRIMARY_TICKET_ID'] ?? null;

                    if ($linkedData && $primaryTicketId) {
                        // ถ้าไม่ใช่ primary ticket ให้ข้าม
                        if ($ticketId != $primaryTicketId) {
                            continue; // ข้ามไปข้อมูลถัดไป
                        }
                    }
                }

                // ⭐ ดึง selection data จาก JSON field
                $selectionData = null;
                if ($ticket['rc_selection_data']) {
                    $selectionData = json_decode($ticket['rc_selection_data'], true);
                }

                // 🔧 FIXED: ใช้ข้อมูลตาม selection data หรือ fallback เป็นข้อมูลเต็ม
                if ($selectionData && isset($selectionData['PASSENGERS']) && !empty($selectionData['PASSENGERS'])) {
                    // ใช้ passengers ที่เลือกใน RC
                    $selectedPassengers = $selectionData['PASSENGERS'];

                    // สร้าง passengersDisplay ตาม format เดิม
                    $passengersDisplay = '';
                    if (count($selectedPassengers) > 0) {
                        $firstName = $selectedPassengers[0]['PASSENGER_NAME'] ?? 'Unknown';
                        if (count($selectedPassengers) === 1) {
                            $passengersDisplay = $firstName;
                        } else {
                            $additionalCount = count($selectedPassengers) - 1;
                            $passengersDisplay = "{$firstName}...+{$additionalCount}";
                        }
                    }

                    // 🔧 สร้าง ticket number display จาก selected passengers
                    $selectedTicketCodes = [];
                    foreach ($selectedPassengers as $passenger) {
                        if (!empty($passenger['TICKET_CODE']) && trim($passenger['TICKET_CODE']) !== '') {
                            $selectedTicketCodes[] = trim($passenger['TICKET_CODE']);
                        }
                    }
                    $ticketNumberDisplay = $this->generateTicketNumberDisplay($selectedTicketCodes);

                    $this->logMessage("Using RC selection data for ticket {$ticketId}: " . count($selectedPassengers) . " passengers selected");
                } else {
                    // ⭐ Fallback: ใช้ข้อมูลเต็มจากฐานข้อมูล
                    $ticketPassengers = $passengersMap[$ticketId] ?? [];
                    $allTicketCodes = $allPassengerTicketCodesMap[$ticketId] ?? [];

                    $passengersDisplay = '';
                    if (count($ticketPassengers) > 0) {
                        $firstName = $ticketPassengers[0]['passenger_name'] ?? 'Unknown';
                        if (count($ticketPassengers) === 1) {
                            $passengersDisplay = $firstName;
                        } else {
                            $additionalCount = count($ticketPassengers) - 1;
                            $passengersDisplay = "{$firstName}...+{$additionalCount}";
                        }
                    }

                    // 🔧 ใช้ตรรกะใหม่สำหรับ ticket number display
                    $ticketNumberDisplay = $this->generateTicketNumberDisplay($allTicketCodes);

                    $this->logMessage("Using full data for ticket {$ticketId}: " . count($ticketPassengers) . " passengers total");
                }

                // Route ใช้ข้อมูลเต็ม (เพราะ route ไม่มีการเลือก)
                // Fallback: ถ้าไม่มี routing ให้ใช้ tickets_extras description แทน
                $ticketRoutes = $routesMap[$ticketId] ?? [];
                $routingDisplay = '';
                if (count($ticketRoutes) > 0) {
                    error_log("🛫 DEBUG Receipt Ticket {$ticketId} routes: " . json_encode($ticketRoutes));
                    $routingDisplay = $this->generateMultiSegmentRoute($ticketRoutes);
                    error_log("🛫 DEBUG Receipt Ticket {$ticketId} routingDisplay: {$routingDisplay}");
                }
                if (empty($routingDisplay) && !empty($extrasDescMap[$ticketId])) {
                    $routingDisplay = implode(', ', $extrasDescMap[$ticketId]);
                }

                $createdAt = $ticket['created_at'];
                $rcGeneratedAt = $ticket['rc_generated_at'];

                // ✅ Extract total_amount from rc_selection_data
                $totalAmount = 0;
                if ($selectionData) {
                    if (isset($selectionData['TOTALS']['TOTAL'])) {
                        $totalAmount = $selectionData['TOTALS']['TOTAL'];
                    } elseif (isset($selectionData['totals']['total'])) {
                        $totalAmount = $selectionData['totals']['total'];
                    }
                }

                $processedData[] = [
                    'id' => $ticket['id'],
                    'reference_number' => $ticket['reference_number'],
                    'status' => $ticket['status'],
                    'payment_status' => $ticket['payment_status'],
                    'created_at' => $createdAt,
                    'updated_at' => $ticket['updated_at'],
                    'po_number' => $ticket['po_number'],
                    'po_generated_at' => $ticket['po_generated_at'],
                    'rc_number' => $ticket['rc_number'],
                    'rc_generated_at' => $rcGeneratedAt,
                    'rc_selection_data' => $selectionData, // ⭐ ส่ง selection data กลับไป
                    'rc_linked_tickets' => $ticket['rc_linked_tickets'], // ⭐ เพิ่มฟิลด์นี้เพื่อบอกว่าเป็น MultiPOReceipt
                    'rc_email_sent' => $ticket['rc_email_sent'] ?? 0, // ✅ เพิ่มฟิลด์นี้
                    'rc_email_sent_at' => $ticket['rc_email_sent_at'], // ✅ เพิ่มฟิลด์นี้
                    'cancelled_at' => $ticket['cancelled_at'],
                    'cancelled_by' => $ticket['cancelled_by'],
                    'cancel_reason' => $ticket['cancel_reason'],
                    'customer' => [
                        'name' => $ticket['customer_name'],
                        'code' => $ticket['customer_code']
                    ],
                    'supplier' => [
                        'name' => $ticket['supplier_name'],
                        'code' => $ticket['supplier_code']
                    ],
                    'cancelled_user' => [
                        'fullname' => $ticket['cancelled_user_fullname']
                    ],
                    'code' => $additionalInfoMap[$ticketId] ? $additionalInfoMap[$ticketId]['code'] : null,
                    'passengersDisplay' => $passengersDisplay, // ⭐ ข้อมูลที่ปรับแล้ว
                    'routingDisplay' => $routingDisplay,
                    'ticketNumberDisplay' => $ticketNumberDisplay, // 🔧 FIXED: ใช้ตรรกะใหม่
                    'total_amount' => $totalAmount // ✅ เพิ่ม total_amount สำหรับ Bulk Email Modal
                ];
            }

            $this->logMessage("Fetched " . count($processedData) . " receipt tickets");
            return $this->successResponse($processedData, null, count($processedData));
        } catch (Exception $e) {
            $this->logMessage("Error getting receipt tickets: " . $e->getMessage(), 'ERROR');
            // ✅ ส่ง error message ที่แท้จริงกลับไป
            return $this->errorResponse('Failed to get receipt tickets: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get Available Receipts (for Bulk Email Modal)
     * Returns all receipts with RC numbers for selection
     */
    private function getAvailableReceipts()
    {
        try {
            $sql = "
            SELECT
                bt.id,
                bt.rc_number,
                bt.rc_generated_at,
                bt.po_number,
                bt.rc_selection_data,
                bt.rc_email_sent,
                bt.rc_email_sent_at,
                bt.status,

                -- Customer data
                c.id as customer_id,
                c.name as customer_name,
                c.code as customer_code,
                c.email as customer_email,

                -- Supplier data
                i.id as supplier_id,
                i.name as supplier_name,
                i.code as supplier_code,

                -- Calculate total amount
                td.grand_total as total_amount

            FROM bookings_ticket bt
            LEFT JOIN customers c ON bt.customer_id = c.id
            LEFT JOIN information i ON bt.information_id = i.id
            LEFT JOIN tickets_detail td ON bt.id = td.bookings_ticket_id
            WHERE bt.rc_number IS NOT NULL
              AND bt.rc_number != ''
              AND bt.status != 'cancelled'
            ORDER BY bt.rc_generated_at DESC
            LIMIT 500
            ";

            $result = $this->db->raw($sql, []);

            if (!$result['success']) {
                return $this->errorResponse('Failed to fetch available receipts');
            }

            $receipts = $result['data'];

            // Process data
            $processedData = [];
            foreach ($receipts as $receipt) {
                // Decode selection data first
                $selectionData = $receipt['rc_selection_data'] ? json_decode($receipt['rc_selection_data'], true) : null;

                // ✅ Get total_amount from rc_selection_data->totals->total (supports both lowercase and UPPERCASE)
                $totalAmount = 0;
                if ($selectionData) {
                    if (isset($selectionData['totals']['total'])) {
                        $totalAmount = $selectionData['totals']['total'];
                    } elseif (isset($selectionData['TOTALS']['TOTAL'])) {
                        $totalAmount = $selectionData['TOTALS']['TOTAL'];
                    }
                }

                if ($totalAmount == 0) {
                    // Fallback to grand_total from tickets_detail
                    $totalAmount = $receipt['total_amount'] ?? 0;
                }

                $processedData[] = [
                    'id' => $receipt['id'],
                    'rc_number' => $receipt['rc_number'],
                    'rc_generated_at' => $receipt['rc_generated_at'],
                    'po_number' => $receipt['po_number'],
                    'rc_selection_data' => $selectionData,
                    'rc_email_sent' => $receipt['rc_email_sent'] ?? 0, // ✅ เปลี่ยนเป็น integer
                    'rc_email_sent_at' => $receipt['rc_email_sent_at'],
                    'status' => $receipt['status'], // ✅ เพิ่มฟิลด์นี้
                    'total_amount' => $totalAmount, // ✅ ใช้ total จาก selection data
                    'customer' => [
                        'id' => $receipt['customer_id'],
                        'name' => $receipt['customer_name'],
                        'code' => $receipt['customer_code'],
                        'email' => $receipt['customer_email']
                    ],
                    'supplier' => [
                        'id' => $receipt['supplier_id'],
                        'name' => $receipt['supplier_name'],
                        'code' => $receipt['supplier_code']
                    ]
                ];
            }

            $this->logMessage("Fetched " . count($processedData) . " available receipts");
            return $this->successResponse($processedData, null, count($processedData));
        } catch (Exception $e) {
            $this->logMessage("Error getting available receipts: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to get available receipts: ' . $e->getMessage(), 500);
        }
    }

    /**
     * สร้างและบันทึก RC Number สำหรับ booking ticket
     */
    private function generateRCForTicket()
    {
        $ticketId = $this->request['ticketId'] ?? null;
        $selectionData = $this->request['selectionData'] ?? null;
        $allowOverwrite = $this->request['allowOverwrite'] ?? false;
        $userId = $this->request['userId'] ?? null; // ✅ เพิ่มรับ userId
        $linkedTicketIds = $this->request['linkedTicketIds'] ?? null; // ⭐ รับ linkedTicketIds สำหรับ Multi PO Receipt

        // ✅ DEBUG: Log incoming data
        $this->logMessage("generateRCForTicket called with ticketId={$ticketId}, hasSelectionData=" . ($selectionData ? 'YES' : 'NO') . ", hasLinkedTicketIds=" . ($linkedTicketIds ? 'YES' : 'NO'));
        if ($selectionData) {
            $this->logMessage("selectionData keys: " . json_encode(array_keys($selectionData)));
        }

        if (!$ticketId) {
            return $this->errorResponse('Ticket ID is required', 400);
        }

        try {
            // ตรวจสอบ ticket มีอยู่และมี RC หรือยัง
            $checkResult = $this->db->raw(
                "SELECT rc_number, rc_generated_at, status FROM bookings_ticket WHERE id = :id",
                ['id' => $ticketId]
            );

            if (!$checkResult['success'] || empty($checkResult['data'])) {
                return $this->errorResponse('Ticket not found', 404);
            }

            $ticket = $checkResult['data'][0];

            // ✅ แก้ไข: ถ้ามี RC Number อยู่แล้ว
            $rcNumber = $ticket['rc_number'];
            $isNew = false;

            if ($rcNumber) {
                // มี RC Number อยู่แล้ว
                $this->logMessage("RC already exists for ticket: {$ticketId}");

                // ⭐ ถ้าไม่ให้ overwrite และไม่มี selectionData ให้อัพเดต → return เลย
                if (!$allowOverwrite && !$selectionData && !$linkedTicketIds) {
                    return $this->successResponse([
                        'rcNumber' => $rcNumber,
                        'isNew' => false,
                        'message' => 'RC Number already exists'
                    ]);
                }
                // ⭐ แต่ถ้ามี selectionData หรือ linkedTicketIds → ให้อัพเดตต่อ
            } else {
                // ยังไม่มี RC Number → สร้างใหม่
                $rcResult = $this->db->generateReferenceNumber('bookings_ticket', 'RC', 'rc_number');
                if (!$rcResult['success']) {
                    return $this->errorResponse('ไม่สามารถสร้าง RC Number ได้');
                }
                $rcNumber = $rcResult['reference_number'];
                $isNew = true;
                $this->logMessage("Created new RC Number: {$rcNumber}");
            }

            // เตรียมข้อมูลสำหรับ update
            $updateData = [
                'rc_number' => $rcNumber,
                'rc_generated_at' => date('Y-m-d H:i:s')
            ];

            // เพิ่ม selection data ถ้ามี
            $this->logMessage("DEBUG: Checking selectionData - is null? " . ($selectionData === null ? 'YES' : 'NO') . ", is array? " . (is_array($selectionData) ? 'YES' : 'NO') . ", count: " . (is_array($selectionData) ? count($selectionData) : 0));

            if ($selectionData) {
                $this->logMessage("DEBUG: selectionData raw: " . json_encode($selectionData));
                $cleanSelectionData = $this->validateSelectionData($selectionData);
                $this->logMessage("DEBUG: cleanSelectionData after validation: " . json_encode($cleanSelectionData));

                $jsonEncoded = json_encode($cleanSelectionData);
                $this->logMessage("DEBUG: JSON encoded length: " . strlen($jsonEncoded));

                $updateData['rc_selection_data'] = $jsonEncoded;
                $this->logMessage("Regular Receipt: Setting rc_selection_data and clearing rc_linked_tickets for ticket {$ticketId}");

                // ✅ บังคับลบ rc_linked_tickets ด้วย raw SQL เพื่อให้แน่ใจว่าเป็น NULL
                $this->db->raw(
                    "UPDATE bookings_ticket SET rc_linked_tickets = NULL WHERE id = :id",
                    ['id' => $ticketId]
                );
                $this->logMessage("Cleared rc_linked_tickets using raw SQL for ticket {$ticketId}");
            } else {
                $this->logMessage("DEBUG: selectionData is empty/null - NOT setting rc_selection_data");
            }

            // ⭐ ถ้ามี linkedTicketIds = Multi PO Receipt
            if ($linkedTicketIds && is_array($linkedTicketIds) && count($linkedTicketIds) > 1) {
                // สร้าง rc_linked_tickets JSON (ใช้ lowercase keys)
                $linkedData = [
                    'ticket_ids' => $linkedTicketIds,
                    'primary_ticket_id' => $ticketId,
                    'created_at' => date('Y-m-d H:i:s')
                ];
                $updateData['rc_linked_tickets'] = json_encode($linkedData, JSON_UNESCAPED_UNICODE);

                $this->logMessage("Multi PO Receipt: RC {$rcNumber} for " . count($linkedTicketIds) . " tickets");

                // ✅ บังคับลบ rc_selection_data สำหรับทุก ticket ที่เกี่ยวข้อง
                foreach ($linkedTicketIds as $linkedId) {
                    $this->db->raw(
                        "UPDATE bookings_ticket SET rc_selection_data = NULL WHERE id = :id",
                        ['id' => $linkedId]
                    );
                }
                $this->logMessage("Cleared rc_selection_data for all linked tickets");

                // อัปเดตทุก ticket ด้วย RC Number เดียวกัน
                foreach ($linkedTicketIds as $linkedTicketId) {
                    $linkedUpdateResult = $this->db->update(
                        'bookings_ticket',
                        $updateData,
                        'id = :id',
                        ['id' => $linkedTicketId]
                    );

                    if (!$linkedUpdateResult['success']) {
                        $this->logMessage("Failed to update ticket {$linkedTicketId} with RC", 'ERROR');
                    } else {
                        $this->logMessage("Updated ticket {$linkedTicketId} with RC {$rcNumber}");
                    }
                }
            } else {
                // Single ticket receipt - อัปเดตตามปกติ
                $this->logMessage("About to update ticket {$ticketId} with data: " . json_encode(array_keys($updateData)));
                $updateResult = $this->db->update(
                    'bookings_ticket',
                    $updateData,
                    'id = :id',
                    ['id' => $ticketId]
                );

                if (!$updateResult['success']) {
                    $this->logMessage("Update failed: " . ($updateResult['error'] ?? 'unknown error'), 'ERROR');
                    return $this->errorResponse('ไม่สามารถบันทึก RC Number ได้');
                } else {
                    $this->logMessage("Update successful, affected rows: " . ($updateResult['affected_rows'] ?? 0));
                }
            }

            $this->logMessage("Generated/Updated RC for ticket: {$ticketId} - {$rcNumber}" .
                ($selectionData ? " with selection data" : "") .
                ($linkedTicketIds ? " with linked tickets" : ""));

            // Log activity - Generate RC (Receipt) - ใช้ RC Number ที่เพิ่งสร้าง (เฉพาะเมื่อเป็น RC ใหม่)
            if ($isNew) {
                $this->logActivity('ticket', $ticketId, $rcNumber, 'issue', $userId);
            }

            return $this->successResponse([
                'rcNumber' => $rcNumber,
                'isNew' => $isNew,
                'message' => $isNew ? 'RC Number generated successfully' : 'RC Number updated successfully',
                'selectionDataSaved' => !empty($selectionData),
                'linkedTicketsSaved' => !empty($linkedTicketIds)
            ]);
        } catch (Exception $e) {
            $this->logMessage("Error generating RC: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to generate RC Number', 500);
        }
    }

    /**
     * ⭐ ฟังก์ชันใหม่: ตรวจสอบและทำความสะอาด selection data
     */
    private function validateSelectionData($selectionData)
    {
        $cleanData = [];

        // Selected passengers
        if (isset($selectionData['passengers']) && is_array($selectionData['passengers'])) {
            $cleanData['passengers'] = array_map(function ($passenger) {
                return [
                    'id' => $passenger['id'] ?? null,
                    'passenger_name' => $passenger['passenger_name'] ?? '',
                    'age' => $passenger['age'] ?? '',
                    'ticket_number' => $passenger['ticket_number'] ?? '',
                    'ticket_code' => $passenger['ticket_code'] ?? ''
                ];
            }, $selectionData['passengers']);
        }

        // Selected extras
        if (isset($selectionData['extras']) && is_array($selectionData['extras'])) {
            $cleanData['extras'] = array_map(function ($extra) {
                return [
                    'id' => $extra['id'] ?? null,
                    'description' => $extra['description'] ?? '',
                    'sale_price' => floatval($extra['sale_price'] ?? 0),
                    'selectedQuantity' => intval($extra['selectedQuantity'] ?? 1),
                    'total' => floatval($extra['total'] ?? 0)
                ];
            }, $selectionData['extras']);
        }

        // Calculated totals
        if (isset($selectionData['totals'])) {
            $totals = $selectionData['totals'];
            $cleanData['totals'] = [
                'selectedPassengerTypes' => $totals['selectedPassengerTypes'] ?? [],
                'subtotal' => floatval($totals['subtotal'] ?? 0),
                'vatAmount' => floatval($totals['vatAmount'] ?? 0),
                'total' => floatval($totals['total'] ?? 0),
                'vatPercent' => floatval($totals['vatPercent'] ?? 7)
            ];
        }

        // เก็บ timestamp
        $cleanData['created_at'] = date('Y-m-d H:i:s');

        return $cleanData;
    }

    private function getInvoicePricingData($ticketId)
    {
        try {
            $sql = "
            SELECT 
                adult_sale_price, adult_pax, adult_total,
                child_sale_price, child_pax, child_total,
                infant_sale_price, infant_pax, infant_total
            FROM tickets_pricing 
            WHERE bookings_ticket_id = :ticketId
            ORDER BY id
        ";
            $result = $this->db->raw($sql, ['ticketId' => $ticketId]);
            return $result['success'] ? $result['data'] : [];
        } catch (Exception $e) {
            $this->logMessage("Error getting invoice pricing: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }

    /**
     * Get passengers data for invoice (specific fields for PDF)
     */
    private function getInvoicePassengersData($ticketId)
    {
        try {
            $sql = "
            SELECT 
                passenger_name, age, ticket_number, ticket_code
            FROM tickets_passengers 
            WHERE bookings_ticket_id = :ticketId
            ORDER BY id
        ";
            $result = $this->db->raw($sql, ['ticketId' => $ticketId]);
            return $result['success'] ? $result['data'] : [];
        } catch (Exception $e) {
            $this->logMessage("Error getting invoice passengers: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }

    /**
     * Get routes data for invoice (specific fields for PDF)
     */
    private function getInvoiceRoutesData($ticketId)
    {
        try {
            $sql = "
            SELECT
                tr.flight_number, tr.rbd, tr.date, tr.origin, tr.destination,
                tr.departure_time, tr.arrival_time,
                c_origin.city_name as origin_city_name,
                c_dest.city_name as destination_city_name
            FROM tickets_routes tr
            LEFT JOIN city c_origin ON tr.origin = c_origin.city_code
            LEFT JOIN city c_dest ON tr.destination = c_dest.city_code
            WHERE tr.bookings_ticket_id = :ticketId
            ORDER BY tr.id
        ";
            $result = $this->db->raw($sql, ['ticketId' => $ticketId]);
            return $result['success'] ? $result['data'] : [];
        } catch (Exception $e) {
            $this->logMessage("Error getting invoice routes: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }

    /**
     * Get extras data for invoice (specific fields for PDF)
     */
    private function getInvoiceExtrasData($ticketId)
    {
        try {
            $sql = "
            SELECT 
                description, sale_price, quantity, total_amount
            FROM tickets_extras 
            WHERE bookings_ticket_id = :ticketId
            ORDER BY id
        ";
            $result = $this->db->raw($sql, ['ticketId' => $ticketId]);
            return $result['success'] ? $result['data'] : [];
        } catch (Exception $e) {
            $this->logMessage("Error getting invoice extras: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }

    // ===========================================
    // HELPER METHODS สำหรับ getInvoiceTickets และ getReceiptTickets
    // ===========================================

    /**
     * Get extras descriptions grouped by ticket IDs (fallback for routing display)
     */
    private function getExtrasDescriptionByTicketIds($ticketIds)
    {
        if (empty($ticketIds)) {
            return [];
        }

        $placeholders = str_repeat('?,', count($ticketIds) - 1) . '?';
        $sql = "SELECT bookings_ticket_id, description FROM tickets_extras WHERE bookings_ticket_id IN ({$placeholders}) ORDER BY id";

        $result = $this->db->raw($sql, $ticketIds);

        $extrasDescMap = [];
        if ($result['success']) {
            foreach ($result['data'] as $extra) {
                $ticketId = $extra['bookings_ticket_id'];
                if (!empty($extra['description'])) {
                    if (!isset($extrasDescMap[$ticketId])) {
                        $extrasDescMap[$ticketId] = [];
                    }
                    $extrasDescMap[$ticketId][] = $extra['description'];
                }
            }
        }

        return $extrasDescMap;
    }

    /**
     * Get passengers data grouped by ticket IDs
     */
    private function getPassengersByTicketIds($ticketIds)
    {
        if (empty($ticketIds)) {
            return [];
        }

        $placeholders = str_repeat('?,', count($ticketIds) - 1) . '?';
        $sql = "SELECT bookings_ticket_id, passenger_name FROM tickets_passengers WHERE bookings_ticket_id IN ({$placeholders}) ORDER BY id";

        $result = $this->db->raw($sql, $ticketIds);

        $passengersMap = [];
        if ($result['success']) {
            foreach ($result['data'] as $passenger) {
                $ticketId = $passenger['bookings_ticket_id'];
                if (!isset($passengersMap[$ticketId])) {
                    $passengersMap[$ticketId] = [];
                }
                $passengersMap[$ticketId][] = $passenger;
            }
        }

        return $passengersMap;
    }

    /**
     * Get routes data grouped by ticket IDs
     */
    private function getRoutesByTicketIds($ticketIds)
    {
        if (empty($ticketIds)) {
            return [];
        }

        $placeholders = str_repeat('?,', count($ticketIds) - 1) . '?';
        $sql = "SELECT bookings_ticket_id, origin, destination FROM tickets_routes WHERE bookings_ticket_id IN ({$placeholders}) ORDER BY id";

        $result = $this->db->raw($sql, $ticketIds);

        $routesMap = [];
        if ($result['success']) {
            foreach ($result['data'] as $route) {
                $ticketId = $route['bookings_ticket_id'];
                if (!isset($routesMap[$ticketId])) {
                    $routesMap[$ticketId] = [];
                }
                $routesMap[$ticketId][] = $route;
            }
        }

        return $routesMap;
    }

    /**
     * Get additional info data grouped by ticket IDs
     */
    private function getAdditionalInfoByTicketIds($ticketIds)
    {
        if (empty($ticketIds)) {
            return [];
        }

        $placeholders = str_repeat('?,', count($ticketIds) - 1) . '?';
        $sql = "SELECT bookings_ticket_id, code FROM ticket_additional_info WHERE bookings_ticket_id IN ({$placeholders})";

        $result = $this->db->raw($sql, $ticketIds);

        $additionalInfoMap = [];
        if ($result['success']) {
            foreach ($result['data'] as $info) {
                $additionalInfoMap[$info['bookings_ticket_id']] = $info;
            }
        }

        return $additionalInfoMap;
    }

    /**
     * Get first passenger ticket info grouped by ticket IDs
     */
    private function getFirstPassengerTicketInfoByTicketIds($ticketIds)
    {
        if (empty($ticketIds)) {
            return [];
        }

        $placeholders = str_repeat('?,', count($ticketIds) - 1) . '?';
        $sql = "
            SELECT bookings_ticket_id, ticket_number, ticket_code 
            FROM tickets_passengers 
            WHERE bookings_ticket_id IN ({$placeholders}) 
            AND id IN (
                SELECT MIN(id) 
                FROM tickets_passengers 
                WHERE bookings_ticket_id IN ({$placeholders}) 
                GROUP BY bookings_ticket_id
            )
        ";

        $params = array_merge($ticketIds, $ticketIds);
        $result = $this->db->raw($sql, $params);

        $firstPassengerMap = [];
        if ($result['success']) {
            foreach ($result['data'] as $passenger) {
                $firstPassengerMap[$passenger['bookings_ticket_id']] = [
                    'ticket_number' => $passenger['ticket_number'],
                    'ticket_code' => $passenger['ticket_code']
                ];
            }
        }

        return $firstPassengerMap;
    }

    /**
     * Generate Multi-Segment Route Format
     * Matches the logic in OverviewHandler and JavaScript
     */
    private function generateMultiSegmentRoute($routes)
    {
        if (empty($routes)) return '';

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

        // Join segments with "//"
        return implode('//', $routeSegments);
    }
    /**
     * Parse customer override data safely
     */
    private function parseCustomerOverride($overrideJson)
    {
        if (!$overrideJson) return [];
        try {
            return json_decode($overrideJson, true) ?: [];
        } catch (Exception $e) {
            return [];
        }
    }

    /**
     * Get display customer name with override support
     */
    private function getDisplayCustomerName($mainData)
    {
        $override = $this->parseCustomerOverride($mainData['customer_override_data'] ?? null);
        return $override['name'] ?? $mainData['customer_name'] ?? '';
    }

    /**
     * Get display customer address line 1 with override support
     */
    private function getDisplayCustomerAddressLine1($mainData)
    {
        $override = $this->parseCustomerOverride($mainData['customer_override_data'] ?? null);

        // ถ้า override มี address (รูปแบบรวม) ให้ใช้เป็น address_line1
        if (!empty($override['address'])) {
            return $override['address'];
        }

        // ถ้า override มี address_line1 เฉพาะ
        if (!empty($override['address_line1'])) {
            return $override['address_line1'];
        }

        // fallback ไปใช้ข้อมูลเดิม
        return $mainData['customer_address_line1'] ?? '';
    }

    /**
     * Get display customer address line 2 with override support
     */
    private function getDisplayCustomerAddressLine2($mainData)
    {
        $override = $this->parseCustomerOverride($mainData['customer_override_data'] ?? null);

        // ถ้า override มี address_line2 เฉพาะ
        if (!empty($override['address_line2'])) {
            return $override['address_line2'];
        }

        // ถ้า override มี address รวม ให้ address_line2 เป็นว่าง (เพราะใช้ใน line1 แล้ว)
        if (!empty($override['address'])) {
            return '';
        }

        // fallback ไปใช้ข้อมูลเดิม
        return $mainData['customer_address_line2'] ?? '';
    }

    /**
     * Get display customer address line 3 with override support
     */
    private function getDisplayCustomerAddressLine3($mainData)
    {
        $override = $this->parseCustomerOverride($mainData['customer_override_data'] ?? null);

        // ถ้า override มี address_line3 เฉพาะ
        if (!empty($override['address_line3'])) {
            return $override['address_line3'];
        }

        // ถ้า override มี address รวม ให้ address_line3 เป็นว่าง (เพราะใช้ใน line1 แล้ว)
        if (!empty($override['address'])) {
            return '';
        }

        // fallback ไปใช้ข้อมูลเดิม
        return $mainData['customer_address_line3'] ?? '';
    }

    /**
     * Get display customer phone with override support
     */
    private function getDisplayCustomerPhone($mainData)
    {
        $override = $this->parseCustomerOverride($mainData['customer_override_data'] ?? null);
        return $override['phone'] ?? $mainData['customer_phone'] ?? '';
    }

    /**
     * Get display customer ID number with override support
     */
    private function getDisplayCustomerIdNumber($mainData)
    {
        $override = $this->parseCustomerOverride($mainData['customer_override_data'] ?? null);
        return $override['id_number'] ?? $mainData['customer_id_number'] ?? '';
    }

    /**
     * Get display customer branch type with override support
     */
    private function getDisplayCustomerBranchType($mainData)
    {
        $override = $this->parseCustomerOverride($mainData['customer_override_data'] ?? null);
        return $override['branch_type'] ?? $mainData['customer_branch_type'] ?? 'Head Office';
    }

    /**
     * Get display customer branch number with override support
     */
    private function getDisplayCustomerBranchNumber($mainData)
    {
        $override = $this->parseCustomerOverride($mainData['customer_override_data'] ?? null);
        return $override['branch_number'] ?? $mainData['customer_branch_number'] ?? '';
    }

    // ===========================================
    // ⭐ MULTI-PO RECEIPT GENERATION
    // ===========================================

    /**
     * Get Available POs for RC Generation
     * ดึงรายการ PO ที่มี PO Number แล้ว แต่ยังไม่มี RC Number
     */
    private function getAvailablePOsForRC()
    {
        try {
            // ใช้โค้ดจาก getInvoiceTickets แต่กรองเฉพาะที่ยังไม่มี RC
            $result = $this->db->raw("
                SELECT
                    bt.id, bt.reference_number, bt.po_number, bt.po_generated_at,
                    bt.customer_id,
                    c.id as customer_id, c.name as customer_name, c.code as customer_code,
                    i.id as supplier_id, i.name as supplier_name, i.code as supplier_code,
                    td.grand_total as total_amount
                FROM bookings_ticket bt
                LEFT JOIN customers c ON bt.customer_id = c.id
                LEFT JOIN information i ON bt.information_id = i.id
                LEFT JOIN tickets_detail td ON bt.id = td.bookings_ticket_id
                WHERE bt.po_number IS NOT NULL
                  AND (bt.rc_number IS NULL OR bt.rc_number = '')
                  AND bt.status != 'cancelled'
                ORDER BY bt.po_generated_at DESC
            ");

            if (!$result['success']) {
                return $this->errorResponse('ไม่สามารถดึงรายการ PO ได้');
            }

            $tickets = $result['data'];

            $this->logMessage("getAvailablePOsForRC: Found " . count($tickets) . " tickets");

            // ดึงข้อมูล passengers และ routes สำหรับแต่ละ ticket
            foreach ($tickets as &$ticket) {
                // Debug log สำหรับ total_amount
                $this->logMessage("Ticket {$ticket['id']}: total_amount = " . ($ticket['total_amount'] ?? 'NULL'));
                // Passengers
                $passengersResult = $this->db->raw(
                    "SELECT passenger_name FROM tickets_passengers
                     WHERE bookings_ticket_id = :id AND passenger_name IS NOT NULL
                     ORDER BY id LIMIT 3",
                    ['id' => $ticket['id']]
                );

                $passengerNames = [];
                if ($passengersResult['success']) {
                    $passengerNames = array_column($passengersResult['data'], 'passenger_name');
                }

                $ticket['passengersDisplay'] = !empty($passengerNames)
                    ? implode(', ', $passengerNames) . (count($passengerNames) > 2 ? '...' : '')
                    : '-';

                // Routes
                $routesResult = $this->db->raw(
                    "SELECT origin, destination FROM tickets_routes
                     WHERE bookings_ticket_id = :id ORDER BY id",
                    ['id' => $ticket['id']]
                );

                $routeDisplay = '-';
                if ($routesResult['success'] && !empty($routesResult['data'])) {
                    $routes = $routesResult['data'];
                    $routeSegments = [];
                    $currentSegment = [];

                    foreach ($routes as $route) {
                        if (empty($currentSegment)) {
                            $currentSegment = [$route['origin'], $route['destination']];
                        } else {
                            $lastDest = end($currentSegment);
                            if ($route['origin'] === $lastDest) {
                                $currentSegment[] = $route['destination'];
                            } else {
                                $routeSegments[] = implode('-', $currentSegment);
                                $currentSegment = [$route['origin'], $route['destination']];
                            }
                        }
                    }

                    if (!empty($currentSegment)) {
                        $routeSegments[] = implode('-', $currentSegment);
                    }

                    $routeDisplay = implode('//', $routeSegments);
                }

                $ticket['routingDisplay'] = $routeDisplay;

                // Format customer & supplier objects
                $ticket['customer'] = [
                    'id' => $ticket['customer_id'],
                    'name' => $ticket['customer_name'],
                    'code' => $ticket['customer_code']
                ];

                $ticket['supplier'] = [
                    'id' => $ticket['supplier_id'],
                    'name' => $ticket['supplier_name'],
                    'code' => $ticket['supplier_code']
                ];

                // ⭐ ลบ duplicate customer_id, supplier_id fields และเก็บเฉพาะข้อมูลที่จำเป็น
                unset($ticket['customer_id']);
                unset($ticket['customer_name']);
                unset($ticket['customer_code']);
                unset($ticket['supplier_id']);
                unset($ticket['supplier_name']);
                unset($ticket['supplier_code']);
            }

            $this->logMessage("Found " . count($tickets) . " available POs for RC");
            return $this->successResponse($tickets);
        } catch (Exception $e) {
            $this->logMessage("Error getting available POs for RC: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to get available POs: ' . $e->getMessage());
        }
    }

    /**
     * Get Combined Invoice Data from Multiple Tickets
     * รวมข้อมูลจากหลาย POs เพื่อแสดงใน ReceiptSelectionModal
     */
    private function getCombinedInvoiceData()
    {
        $ticketIds = $this->request['ticketIds'] ?? [];

        if (empty($ticketIds) || !is_array($ticketIds)) {
            return $this->errorResponse('Ticket IDs array is required', 400);
        }

        try {
            // ดึงข้อมูลหลักจาก ticket แรก
            $primaryTicketId = $ticketIds[0];

            // ⭐ เปลี่ยน request ชั่วคราว
            $originalRequest = $this->request;
            $this->request['ticketId'] = $primaryTicketId;

            $primaryResult = $this->getInvoiceDataForTicket();

            // ⭐ คืน request เดิม
            $this->request = $originalRequest;

            if (!isset($primaryResult['success']) || !$primaryResult['success']) {
                return $this->errorResponse('Failed to fetch primary ticket data');
            }

            $combinedData = $primaryResult['data'];

            // รวม passengers, extras, routes จากทุก tickets
            $allPassengers = [];
            $allExtras = [];
            $allRoutes = [];
            $totalSubtotal = 0;
            $totalVat = 0;
            $totalGrandTotal = 0;

            foreach ($ticketIds as $ticketId) {
                // ดึง passengers
                $passengersResult = $this->db->raw(
                    "SELECT passenger_name, age, ticket_number, ticket_code
                     FROM tickets_passengers
                     WHERE bookings_ticket_id = :id AND passenger_name IS NOT NULL AND passenger_name != ''
                     ORDER BY id",
                    ['id' => $ticketId]
                );

                if ($passengersResult['success']) {
                    foreach ($passengersResult['data'] as $p) {
                        $allPassengers[] = [
                            'passenger_name' => $p['passenger_name'],
                            'age' => $p['age'],
                            'ticket_number' => $p['ticket_number'],
                            'ticket_code' => $p['ticket_code']
                        ];
                    }
                }

                // ดึง extras
                $extrasResult = $this->db->raw(
                    "SELECT description, sale_price, quantity, total_amount
                     FROM tickets_extras
                     WHERE bookings_ticket_id = :id AND description IS NOT NULL AND description != ''
                     ORDER BY id",
                    ['id' => $ticketId]
                );

                if ($extrasResult['success']) {
                    foreach ($extrasResult['data'] as $e) {
                        $allExtras[] = [
                            'description' => $e['description'],
                            'sale_price' => $e['sale_price'],
                            'quantity' => $e['quantity'],
                            'total_amount' => $e['total_amount']
                        ];
                    }
                }

                // ⭐ ดึง routes (สำหรับการแสดงผลเท่านั้น - ไม่ใช้ใน ReceiptSelectionModal)
                $routesResult = $this->db->raw(
                    "SELECT origin, destination, flight_number, rbd, date, departure_time, arrival_time
                     FROM tickets_routes
                     WHERE bookings_ticket_id = :id
                     ORDER BY id",
                    ['id' => $ticketId]
                );

                if ($routesResult['success']) {
                    foreach ($routesResult['data'] as $r) {
                        $allRoutes[] = $r;
                    }
                }

                // รวมยอดเงิน
                $detailResult = $this->db->raw(
                    "SELECT subtotal_before_vat, vat_amount, grand_total
                     FROM tickets_detail
                     WHERE bookings_ticket_id = :id",
                    ['id' => $ticketId]
                );

                if ($detailResult['success'] && !empty($detailResult['data'])) {
                    $detail = $detailResult['data'][0];
                    $totalSubtotal += floatval($detail['subtotal_before_vat'] ?? 0);
                    $totalVat += floatval($detail['vat_amount'] ?? 0);
                    $totalGrandTotal += floatval($detail['grand_total'] ?? 0);
                }
            }

            // ⭐ สร้าง combined data structure ให้ตรงกับ format ที่ ReceiptSelectionModal คาดหวัง
            $combined = [
                'id' => $primaryTicketId,
                'customer' => $combinedData['customer'],
                'supplier' => $combinedData['supplier'],
                'tickets_passengers' => $allPassengers, // ⭐ รวม passengers จากทุก PO
                'tickets_extras' => $allExtras,          // ⭐ รวม extras จากทุก PO
                'tickets_detail' => [[                   // ⭐ ยอดรวมจากทุก PO
                    'subtotal_before_vat' => $totalSubtotal,
                    'vat_amount' => $totalVat,
                    'vat_percent' => 7,
                    'grand_total' => $totalGrandTotal
                ]],
                'tickets_routes' => $allRoutes,          // ⭐ รวม routes จากทุก PO
                'linkedTicketIds' => $ticketIds
            ];

            $this->logMessage("Combined invoice data for " . count($ticketIds) . " tickets - Total: {$totalGrandTotal}");

            return $this->successResponse($combined);
        } catch (Exception $e) {
            $this->logMessage("Error getting combined invoice data: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to get combined invoice data: ' . $e->getMessage());
        }
    }

    /**
     * ⭐ ดึงข้อมูล PO ของ tickets ที่ linked กันสำหรับแสดงใน MultiPOReceiptTable
     * @param array $ticketIds - Array of ticket IDs
     * @return array - Array of PO data
     */
    private function getLinkedPOsData($ticketIds)
    {
        if (empty($ticketIds) || !is_array($ticketIds)) {
            return [];
        }

        try {
            // สร้าง placeholders สำหรับ IN clause
            $placeholders = implode(',', array_fill(0, count($ticketIds), '?'));

            $sql = "
                SELECT
                    bt.id,
                    bt.po_number,
                    bt.po_generated_at as po_date,
                    bt.reference_number,
                    i.name as supplier_name,
                    i.code as supplier_code,
                    td.grand_total as total_amount,
                    td.subtotal_before_vat,
                    td.vat_amount,
                    td.vat_percent
                FROM bookings_ticket bt
                LEFT JOIN information i ON bt.information_id = i.id
                LEFT JOIN tickets_detail td ON bt.id = td.bookings_ticket_id
                WHERE bt.id IN ($placeholders)
                ORDER BY bt.po_number
            ";

            $result = $this->db->raw($sql, $ticketIds);

            if (!$result['success']) {
                return [];
            }

            // เพิ่มข้อมูล routing สำหรับแต่ละ PO
            $posWithRouting = [];
            foreach ($result['data'] as $po) {
                // ดึง routes สำหรับ PO นี้ (ทุก routes ไม่ใช่แค่ route แรก)
                $routesResult = $this->db->raw(
                    "SELECT origin, destination FROM tickets_routes
                     WHERE bookings_ticket_id = ?
                     ORDER BY id",
                    [$po['id']]
                );

                $routingDisplay = '-';
                if ($routesResult['success'] && !empty($routesResult['data'])) {
                    // ใช้ generateMultiSegmentRoute() เพื่อสร้าง routing display ที่แสดงทุก segments
                    $routingDisplay = $this->generateMultiSegmentRoute($routesResult['data']);
                }

                $posWithRouting[] = [
                    'id' => $po['id'],
                    'po_number' => $po['po_number'],
                    'po_date' => $po['po_date'],
                    'reference_number' => $po['reference_number'],
                    'supplier' => [
                        'name' => $po['supplier_name'],
                        'code' => $po['supplier_code']
                    ],
                    'supplierName' => $po['supplier_name'],
                    'total_amount' => $po['total_amount'],
                    'subtotal_before_vat' => $po['subtotal_before_vat'],
                    'vat_amount' => $po['vat_amount'],
                    'vat_percent' => $po['vat_percent'],
                    'routingDisplay' => $routingDisplay
                ];
            }

            return $posWithRouting;
        } catch (Exception $e) {
            $this->logMessage("Error getting linked POs data: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }
}
