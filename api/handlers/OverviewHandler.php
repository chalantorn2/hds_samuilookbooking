    <?php
    // api/handlers/OverviewHandler.php
    // Overview and reporting operations handler
    // จัดการ complex queries สำหรับ dashboard และ reporting

    require_once 'BaseHandler.php';

    class OverviewHandler extends BaseHandler
    {
        /**
         * Handle overview actions
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
                    case 'getOverviewData':
                        return $this->getOverviewData();
                    case 'getVoucherOverviewData':
                        return $this->getVoucherOverviewData();
                    case 'getInvoiceTickets':
                        return $this->getInvoiceTickets();
                    case 'getFlightTicketsData':
                        return $this->getFlightTicketsData();
                    case 'getDepositOverviewData':
                        return $this->getDepositOverviewData();
                    case 'getOtherOverviewData':
                        return $this->getOtherOverviewData();
                    default:
                        return $this->errorResponse("Unknown overview action: {$action}");
                }
            } catch (Exception $e) {
                $this->logMessage("OverviewHandler error: " . $e->getMessage(), 'ERROR');
                return $this->errorResponse('Overview handler error: ' . $e->getMessage(), 500);
            }
        }
        /**
         * Get Voucher Overview Data - Bus/Boat/Tour Only
         * เพิ่ม method นี้ที่ท้ายไฟล์ OverviewHandler.php
         */
        private function getVoucherOverviewData()
        {
            $startDate = $this->request['start_date'] ?? null;
            $endDate = $this->request['end_date'] ?? null;
            $serviceTypeFilter = $this->request['service_type_filter'] ?? 'all';

            try {
                // Convert ISO dates to MySQL format (optional)
                $mysqlStartDate = null;
                $mysqlEndDate = null;
                if (!empty($startDate) && !empty($endDate)) {
                    $startDateTime = new DateTime($startDate);
                    $endDateTime = new DateTime($endDate);
                    $mysqlStartDate = $startDateTime->format('Y-m-d H:i:s');
                    $mysqlEndDate = $endDateTime->format('Y-m-d H:i:s');
                }

                // ถ้า filter เป็น "voucher" ให้รวม bus, boat, tour
                // ถ้า filter ไม่ใช่ "all" และไม่ใช่ "voucher" ให้ return ข้อมูลเปล่า (เพราะนี่คือ voucher endpoint)
                $this->logMessage("Voucher filter: {$serviceTypeFilter}");
                if ($serviceTypeFilter !== 'all' && $serviceTypeFilter !== 'voucher') {
                    $this->logMessage("Voucher filter not matched, returning empty");
                    return $this->successResponse([], null, 0);
                }
                $this->logMessage("Voucher filter matched, proceeding with query");

                // Voucher query with joins
                $sql = "
        SELECT
            bv.service_type,
            bv.id,
            bv.reference_number,
            bv.status,
            bv.vc_number,
            bv.vc_generated_at,
            bv.created_at,
            bv.updated_at,
            bv.created_by,
            bv.cancelled_at,
            bv.cancelled_by,
            bv.cancel_reason,
            c.name as customer_name,
            c.code as customer_code,
            i.name as supplier_name,
            i.code as supplier_code,
            u.username as user_username,
            u.fullname as user_fullname,
            cu.fullname as cancelled_user_fullname,
            vd.trip_date as issue_date,
            vd.description as service_description,
            vd.grand_total,
            GROUP_CONCAT(DISTINCT vp.passenger_name ORDER BY vp.id SEPARATOR '|||') as passengers
        FROM bookings_voucher bv
        LEFT JOIN customers c ON bv.customer_id = c.id
        LEFT JOIN information i ON bv.information_id = i.id
        LEFT JOIN users u ON bv.created_by = u.id
        LEFT JOIN users cu ON bv.cancelled_by = cu.id
        LEFT JOIN voucher_details vd ON bv.id = vd.bookings_voucher_id
        LEFT JOIN voucher_passengers vp ON bv.id = vp.bookings_voucher_id
        WHERE bv.service_type IN ('bus', 'boat', 'tour')"
                . (!empty($mysqlStartDate) ? " AND bv.created_at >= :start_date AND bv.created_at <= :end_date" : "")
                . " GROUP BY bv.id ORDER BY bv.created_at DESC"
                . (empty($mysqlStartDate) ? " LIMIT 200" : "") . "
    ";

                $params = [];
                if (!empty($mysqlStartDate)) {
                    $params['start_date'] = $mysqlStartDate;
                    $params['end_date'] = $mysqlEndDate;
                }

                $result = $this->db->raw($sql, $params);

                if (!$result['success']) {
                    $this->logMessage("Voucher query failed: " . $result['error'], 'ERROR');
                    return $this->errorResponse($result['error']);
                }

                $this->logMessage("Voucher query returned " . count($result['data']) . " rows");

                // Process data to match React component expectations
                $processedData = array_map(function ($row) {
                    $passengers = [];
                    $passengersDisplay = '-';
                    if ($row['passengers']) {
                        $passengers = explode('|||', $row['passengers']);
                        if (count($passengers) > 0) {
                            $firstName = $passengers[0];
                            if (count($passengers) === 1) {
                                $passengersDisplay = $firstName;
                            } else {
                                $additionalCount = count($passengers) - 1;
                                $passengersDisplay = "{$firstName}...+{$additionalCount}";
                            }
                        }
                    }

                    // Normalize voucher status
                    $status = $row['status'];
                    if ($status === 'cancelled') {
                        $status = 'cancelled';
                    } elseif (!empty($row['vc_number'])) {
                        $status = 'voucher_issued';
                    } else {
                        $status = 'not_voucher';
                    }

                    // Convert bus/boat/tour to 'voucher' for display
                    $serviceType = $row['service_type'];
                    if (in_array($serviceType, ['bus', 'boat', 'tour'])) {
                        $serviceType = 'voucher';
                    }

                    return [
                        'id' => $row['id'],
                        'reference_number' => $row['reference_number'],
                        'status' => $status,
                        'service_type' => $serviceType,
                        'vc_number' => $row['vc_number'],
                        'vc_generated_at' => $row['vc_generated_at'],
                        'created_at' => $row['created_at'],
                        'updated_at' => $row['updated_at'],
                        'created_by' => $row['created_by'],
                        'cancelled_at' => $row['cancelled_at'],
                        'cancelled_by' => $row['cancelled_by'],
                        'cancel_reason' => $row['cancel_reason'],
                        'customer' => [
                            'name' => $row['customer_name'],
                            'code' => $row['customer_code']  // เพิ่มใหม่
                        ],
                        'supplier' => [
                            'name' => $row['supplier_name'],
                            'code' => $row['supplier_code']  // เพิ่มใหม่
                        ],
                        'user' => [
                            'fullname' => $row['user_fullname'],
                            'username' => $row['user_username']  // เพิ่มใหม่
                        ],
                        'cancelled_user' => [
                            'fullname' => $row['cancelled_user_fullname']
                        ],
                        'service_description' => $row['service_description'],  // เพิ่มใหม่
                        'passengers_display' => $passengersDisplay,  // เพิ่มใหม่
                        'tickets_detail' => [[
                            'issue_date' => $row['issue_date'],
                            'total_price' => $row['grand_total']
                        ]]
                    ];
                }, $result['data']);

                return $this->successResponse($processedData, null, count($processedData));
            } catch (Exception $e) {
                $this->logMessage("Error in getVoucherOverviewData: " . $e->getMessage(), 'ERROR');
                return $this->errorResponse('Failed to fetch voucher overview data', 500);
            }
        }

        /**
         * Get Overview Dashboard Data - Flight Tickets Only
         * Clean version without unnecessary logging
         * Frontend will handle combining with Vouchers separately
         */
        private function getOverviewData()
        {
            $startDate = $this->request['start_date'] ?? null;
            $endDate = $this->request['end_date'] ?? null;
            $serviceTypeFilter = $this->request['service_type_filter'] ?? 'all';

            // ถ้า filter ไม่ใช่ "all" และไม่ใช่ "flight" ให้ return ข้อมูลเปล่า (เพราะนี่คือ flight endpoint)
            if ($serviceTypeFilter !== 'all' && $serviceTypeFilter !== 'flight') {
                return $this->successResponse([], null, 0);
            }

            try {
                // Convert ISO dates to MySQL format (optional)
                $mysqlStartDate = null;
                $mysqlEndDate = null;
                if (!empty($startDate) && !empty($endDate)) {
                    $startDateTime = new DateTime($startDate);
                    $endDateTime = new DateTime($endDate);
                    $mysqlStartDate = $startDateTime->format('Y-m-d H:i:s');
                    $mysqlEndDate = $endDateTime->format('Y-m-d H:i:s');
                }

                // Flight tickets query with joins
                $sql = "
        SELECT
            'flight' as service_type,
            bt.id,
            bt.reference_number,
            bt.status,
            bt.created_at,
            bt.updated_at,
            bt.created_by,
            bt.po_number,
            bt.po_generated_at,
            bt.invoice_number,
            bt.invoice_generated_at,
            bt.cancelled_at,
            bt.cancelled_by,
            bt.cancel_reason,
            c.name as customer_name,
            c.code as customer_code,
            i.name as supplier_name,
            i.code as supplier_code,
            u.username as user_username,
            u.fullname as user_fullname,
            cu.fullname as cancelled_user_fullname,
            td.issue_date,
            td.total_price,
            td.grand_total,
            tai.code as additional_code,
            GROUP_CONCAT(DISTINCT tp.passenger_name ORDER BY tp.id SEPARATOR '|||') as passengers,
            GROUP_CONCAT(DISTINCT CONCAT(tp.ticket_number, ':::', tp.ticket_code) ORDER BY tp.id SEPARATOR '|||') as passenger_tickets,
            GROUP_CONCAT(DISTINCT CONCAT(tr.origin, '-', tr.destination) ORDER BY tr.id SEPARATOR '|||') as routes
        FROM bookings_ticket bt
        LEFT JOIN customers c ON bt.customer_id = c.id
        LEFT JOIN information i ON bt.information_id = i.id
        LEFT JOIN users u ON bt.created_by = u.id
        LEFT JOIN users cu ON bt.cancelled_by = cu.id
        LEFT JOIN tickets_detail td ON bt.id = td.bookings_ticket_id
        LEFT JOIN ticket_additional_info tai ON bt.id = tai.bookings_ticket_id
        LEFT JOIN tickets_passengers tp ON bt.id = tp.bookings_ticket_id
        LEFT JOIN tickets_routes tr ON bt.id = tr.bookings_ticket_id
        WHERE 1=1"
                . (!empty($mysqlStartDate) ? " AND bt.created_at >= :start_date AND bt.created_at <= :end_date" : "")
                . " GROUP BY bt.id ORDER BY bt.created_at DESC"
                . (empty($mysqlStartDate) ? " LIMIT 200" : "") . "
    ";

                $params = [];
                if (!empty($mysqlStartDate)) {
                    $params['start_date'] = $mysqlStartDate;
                    $params['end_date'] = $mysqlEndDate;
                }

                $result = $this->db->raw($sql, $params);

                if (!$result['success']) {
                    return $this->errorResponse($result['error']);
                }

                // Process data to match React component expectations
                $self = $this; // ⭐ สร้างตัวแปรเพื่อใช้ใน closure
                $processedData = array_map(function ($row) use ($self) {
                    // Process passengers display
                    $passengersDisplay = '-';
                    if ($row['passengers']) {
                        $passengers = explode('|||', $row['passengers']);
                        if (count($passengers) > 0) {
                            $firstName = $passengers[0];
                            if (count($passengers) === 1) {
                                $passengersDisplay = $firstName;
                            } else {
                                $additionalCount = count($passengers) - 1;
                                $passengersDisplay = "{$firstName}...+{$additionalCount}";
                            }
                        }
                    }

                    // Process routing display using Multi-Segment Route Format
                    $routingDisplay = '-';
                    if ($row['routes']) {
                        $routes = explode('|||', $row['routes']);
                        if (count($routes) > 0) {
                            // Parse routes to array format for generateMultiSegmentRoute
                            $routesArray = [];
                            foreach ($routes as $route) {
                                $parts = explode('-', $route, 2);
                                if (count($parts) === 2) {
                                    $routesArray[] = [
                                        'origin' => $parts[0],
                                        'destination' => $parts[1]
                                    ];
                                }
                            }
                            $routingDisplay = $self->generateMultiSegmentRoute($routesArray);
                        }
                    }

                    // Process ticket number display
                    $ticketNumberDisplay = '-';
                    if ($row['passenger_tickets']) {
                        $ticketInfos = explode('|||', $row['passenger_tickets']);
                        $ticketCodes = [];
                        foreach ($ticketInfos as $ticketInfo) {
                            $parts = explode(':::', $ticketInfo);
                            if (isset($parts[1]) && !empty(trim($parts[1]))) {
                                $ticketCodes[] = $parts[1];
                            }
                        }

                        if (count($ticketCodes) === 1) {
                            $ticketNumberDisplay = $ticketCodes[0];
                        } elseif (count($ticketCodes) > 1) {
                            $firstCode = $ticketCodes[0];
                            $lastCode = $ticketCodes[count($ticketCodes) - 1];
                            $lastThreeDigits = substr($lastCode, -3);
                            $ticketNumberDisplay = "{$firstCode}-{$lastThreeDigits}";
                        }
                    }

                    return [
                        'id' => $row['id'],
                        'reference_number' => $row['reference_number'],
                        'status' => $row['status'],
                        'service_type' => $row['service_type'],
                        'created_at' => $row['created_at'],
                        'updated_at' => $row['updated_at'],
                        'created_by' => $row['created_by'],
                        'po_number' => $row['po_number'],
                        'po_generated_at' => $row['po_generated_at'],
                        'invoice_number' => $row['invoice_number'],
                        'invoice_generated_at' => $row['invoice_generated_at'],
                        'cancelled_at' => $row['cancelled_at'],
                        'cancelled_by' => $row['cancelled_by'],
                        'cancel_reason' => $row['cancel_reason'],
                        'customer' => [
                            'name' => $row['customer_name'],
                            'code' => $row['customer_code']
                        ],
                        'supplier' => [
                            'name' => $row['supplier_name'],
                            'code' => $row['supplier_code']
                        ],
                        'user' => [
                            'fullname' => $row['user_fullname'],
                            'username' => $row['user_username']
                        ],
                        'cancelled_user' => [
                            'fullname' => $row['cancelled_user_fullname']
                        ],
                        'code' => $row['additional_code'],
                        'passengers_display' => $passengersDisplay,
                        'routing_display' => $routingDisplay,
                        'ticket_number_display' => $ticketNumberDisplay,
                        'tickets_detail' => [[
                            'issue_date' => $row['issue_date'],
                            'total_price' => $row['total_price'] ?: $row['grand_total']
                        ]]
                    ];
                }, $result['data']);

                return $this->successResponse($processedData, null, count($processedData));
            } catch (Exception $e) {
                $this->logMessage("Error in getOverviewData: " . $e->getMessage(), 'ERROR');
                return $this->errorResponse('Failed to fetch overview data', 500);
            }
        }



        /**
         * Get Invoice Tickets Data
         * Complex query for invoice/document management
         * Copy จาก gateway.php บรรทัด ~1100-1200
         */
        private function getInvoiceTickets()
        {
            $startDate = $this->request['start_date'] ?? null;
            $endDate = $this->request['end_date'] ?? null;
            $filterStatus = $this->request['filter_status'] ?? 'all';
            $onlyInvoiced = $this->request['only_invoiced'] ?? false;

            if (!$startDate || !$endDate) {
                return $this->errorResponse('Start date and end date are required', 400);
            }

            try {
                // Complex query for invoice tickets with all related data
                $sql = "
                SELECT 
                    bt.id,
                    bt.reference_number,
                    bt.status,
                    bt.payment_status,
                    bt.created_at,
                    bt.updated_at,
                    bt.po_number,
                    bt.po_generated_at,
                    c.name as customer_name,
                    c.code as customer_code,
                    i.name as supplier_name,
                    i.code as supplier_code,
                    tai.code as additional_code,
                    GROUP_CONCAT(DISTINCT tp.passenger_name ORDER BY tp.id SEPARATOR '|||') as passengers,
                    GROUP_CONCAT(DISTINCT CONCAT(tp.ticket_number, ':::', tp.ticket_code) ORDER BY tp.id SEPARATOR '|||') as passenger_tickets,
                    GROUP_CONCAT(DISTINCT CONCAT(tr.origin, '-', tr.destination) ORDER BY tr.id SEPARATOR '|||') as routes
                FROM bookings_ticket bt
                LEFT JOIN customers c ON bt.customer_id = c.id
                LEFT JOIN information i ON bt.information_id = i.id
                LEFT JOIN ticket_additional_info tai ON bt.id = tai.bookings_ticket_id
                LEFT JOIN tickets_passengers tp ON bt.id = tp.bookings_ticket_id
                LEFT JOIN tickets_routes tr ON bt.id = tr.bookings_ticket_id
                WHERE bt.created_at >= :start_date 
                AND bt.created_at <= :end_date
            ";

                $params = [
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ];

                // Add PO Number filter for invoiced tickets only
                if ($onlyInvoiced) {
                    $sql .= " AND bt.po_number IS NOT NULL AND bt.po_number != ''";
                }

                // Add status filter
                if ($filterStatus && $filterStatus !== 'all') {
                    $sql .= " AND bt.status = :status";
                    $params['status'] = $filterStatus;
                }

                $sql .= " GROUP BY bt.id ORDER BY bt.created_at DESC";

                $result = $this->db->raw($sql, $params);

                if (!$result['success']) {
                    return $this->errorResponse($result['error']);
                }

                // Process data to match React component expectations
                $processedData = array_map(function ($row) {
                    // Process passengers
                    $passengers = [];
                    if ($row['passengers']) {
                        $passengers = explode('|||', $row['passengers']);
                    }

                    // Process passenger ticket info (first passenger)
                    $firstPassengerTicketInfo = null;
                    if ($row['passenger_tickets']) {
                        $ticketInfos = explode('|||', $row['passenger_tickets']);
                        if (count($ticketInfos) > 0) {
                            $firstTicket = explode(':::', $ticketInfos[0]);
                            $firstPassengerTicketInfo = [
                                'ticket_number' => $firstTicket[0] ?? null,
                                'ticket_code' => $firstTicket[1] ?? null
                            ];
                        }
                    }

                    // Process routes
                    $routes = [];
                    if ($row['routes']) {
                        $routes = explode('|||', $row['routes']);
                    }

                    return [
                        'id' => $row['id'],
                        'reference_number' => $row['reference_number'],
                        'status' => $row['status'],
                        'service_type' => $row['service_type'],
                        'created_at' => $row['created_at'],
                        'updated_at' => $row['updated_at'],
                        'created_by' => $row['created_by'],
                        'po_number' => $row['po_number'],
                        'po_generated_at' => $row['po_generated_at'],
                        'cancelled_at' => $row['cancelled_at'],
                        'cancelled_by' => $row['cancelled_by'],
                        'cancel_reason' => $row['cancel_reason'],
                        'customer' => [
                            'name' => $row['customer_name'],
                            'code' => $row['customer_code']  // เพิ่มใหม่
                        ],
                        'supplier' => [
                            'name' => $row['supplier_name'],
                            'code' => $row['supplier_code']  // เพิ่มใหม่
                        ],
                        'user' => [
                            'fullname' => $row['user_fullname'],
                            'username' => $row['user_username']  // เพิ่มใหม่
                        ],
                        'cancelled_user' => [
                            'fullname' => $row['cancelled_user_fullname']
                        ],
                        'tickets_detail' => [[
                            'issue_date' => $row['issue_date'],
                            'total_price' => $row['total_price'] ?: $row['grand_total']
                        ]]
                    ];
                }, $result['data']);

                $this->logMessage("Retrieved " . count($processedData) . " invoice tickets for date range: {$startDate} to {$endDate}");
                return $this->successResponse($processedData, null, count($processedData));
            } catch (Exception $e) {
                $this->logMessage("Error in getInvoiceTickets: " . $e->getMessage(), 'ERROR');
                return $this->errorResponse('Failed to fetch invoice tickets', 500);
            }
        }

        /**
         * Get Flight Tickets Data with complex joins and processing
         * Replicates the functionality of useFlightTicketsData.js hook
         * Copy จาก gateway.php บรรทัด ~1200-1400
         */
        private function getFlightTicketsData()
        {
            $startDate = $this->request['startDate'] ?? null;
            $endDate = $this->request['endDate'] ?? null;
            $searchTerm = $this->request['searchTerm'] ?? '';
            $searchField = $this->request['searchField'] ?? 'all'; // เพิ่มตัวแปร searchField
            $filterStatus = $this->request['filterStatus'] ?? 'all';
            $sortField = $this->request['sortField'] ?? 'created_at';
            $sortDirection = $this->request['sortDirection'] ?? 'desc';

            try {
                // Build WHERE conditions
                $whereConditions = [];
                $params = [];

                // Date Range Filter - optional: ข้ามเมื่อค้นหาแบบไม่มีวันที่
                if (!empty($startDate) && !empty($endDate)) {
                    $start = new DateTime($startDate);
                    $start->setTime(0, 0, 0);
                    $end = new DateTime($endDate);
                    $end->setTime(23, 59, 59);

                    $whereConditions[] = "bt.created_at >= :start_date";
                    $whereConditions[] = "bt.created_at <= :end_date";
                    $params['start_date'] = $start->format('Y-m-d H:i:s');
                    $params['end_date'] = $end->format('Y-m-d H:i:s');
                }

                // Status filter
                if ($filterStatus === 'all_except_cancelled') {
                    $whereConditions[] = "bt.status != 'cancelled'";
                } elseif ($filterStatus !== 'all') {
                    $whereConditions[] = "bt.status = :status";
                    $params['status'] = $filterStatus;
                }

                $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

                // ไม่ใส่ LIMIT เมื่อมี searchTerm เพราะ PHP filter จะกรองให้
                // ใส่ LIMIT 200 เฉพาะเมื่อไม่มีทั้ง date range และ searchTerm
                $noDateRange = empty($startDate) || empty($endDate);
                $limitClause = ($noDateRange && empty($searchTerm)) ? 'LIMIT 200' : '';

                // Main query with joins - replicating Supabase select with joins
                $sql = "
                SELECT
                    bt.id,
                    bt.reference_number,
                    bt.status,
                    bt.payment_status,
                    bt.created_at,
                    bt.updated_at,
                    bt.po_number,
                    bt.po_generated_at,
                    bt.po_email_sent,
                    bt.po_email_sent_at,
                    bt.invoice_number,
                    bt.invoice_generated_at,
                    bt.cancelled_at,
                    bt.cancelled_by,
                    bt.cancel_reason,
                    c.name as customer_name,
                    c.code as customer_code,
                    i.name as supplier_name,
                    i.code as supplier_code,
                    cu.fullname as cancelled_user_fullname
                FROM bookings_ticket bt
                LEFT JOIN customers c ON bt.customer_id = c.id
                LEFT JOIN information i ON bt.information_id = i.id
                LEFT JOIN users cu ON bt.cancelled_by = cu.id
                {$whereClause}
                ORDER BY bt.created_at DESC
                {$limitClause}
            ";

                $result = $this->db->raw($sql, $params);

                if (!$result['success']) {
                    return $this->errorResponse($result['error']);
                }

                $tickets = $result['data'];

                if (empty($tickets)) {
                    return $this->successResponse([], null, 0);
                }

                // Get ticket IDs for additional queries
                $ticketIds = array_column($tickets, 'id');

                // Get additional info
                $additionalInfoSql = "
                SELECT bookings_ticket_id, code 
                FROM ticket_additional_info 
                WHERE bookings_ticket_id IN (" . implode(',', array_fill(0, count($ticketIds), '?')) . ")
            ";
                $additionalInfoResult = $this->db->raw($additionalInfoSql, $ticketIds);
                $additionalInfo = $additionalInfoResult['success'] ? $additionalInfoResult['data'] : [];

                // Get passengers data
                $passengersSql = "
                SELECT bookings_ticket_id, passenger_name, ticket_number, ticket_code 
                FROM tickets_passengers 
                WHERE bookings_ticket_id IN (" . implode(',', array_fill(0, count($ticketIds), '?')) . ")
                ORDER BY id
            ";
                $passengersResult = $this->db->raw($passengersSql, $ticketIds);
                $passengers = $passengersResult['success'] ? $passengersResult['data'] : [];

                // Get routes data
                $routesSql = "
                SELECT bookings_ticket_id, origin, destination 
                FROM tickets_routes 
                WHERE bookings_ticket_id IN (" . implode(',', array_fill(0, count($ticketIds), '?')) . ")
                ORDER BY id
            ";
                $routesResult = $this->db->raw($routesSql, $ticketIds);
                $routes = $routesResult['success'] ? $routesResult['data'] : [];

                // Get extras data (fallback for routing display)
                $extrasSql = "
                SELECT bookings_ticket_id, description
                FROM tickets_extras
                WHERE bookings_ticket_id IN (" . implode(',', array_fill(0, count($ticketIds), '?')) . ")
                ORDER BY id
            ";
                $extrasResult = $this->db->raw($extrasSql, $ticketIds);
                $extras = $extrasResult['success'] ? $extrasResult['data'] : [];

                // Process and map data (same logic as original hook)
                $processedData = $this->processFlightTicketsData($tickets, $additionalInfo, $passengers, $routes, $extras);

                // Apply filtering and sorting
                $filteredData = $this->filterFlightTicketsData($processedData, $searchTerm, $searchField, $filterStatus);
                $sortedData = $this->sortFlightTicketsData($filteredData, $sortField, $sortDirection);

                $logMsg = "Retrieved " . count($sortedData) . " flight tickets";
                if (!empty($startDate) && !empty($endDate)) {
                    $logMsg .= " for date range: {$startDate} to {$endDate}";
                } else {
                    $logMsg .= " (search all, no date filter)";
                }
                $this->logMessage($logMsg);
                return $this->successResponse($sortedData, null, count($sortedData));
            } catch (Exception $e) {
                $this->logMessage("Error in getFlightTicketsData: " . $e->getMessage(), 'ERROR');
                return $this->errorResponse('Failed to fetch flight tickets data', 500);
            }
        }

        /**
         * Process flight tickets data - replicates original hook logic
         * Copy จาก gateway.php บรรทัด ~1400-1500
         */
        private function processFlightTicketsData($tickets, $additionalInfo, $passengers, $routes, $extras = [])
        {
            // Create Maps for efficient lookup
            $additionalInfoMap = [];
            foreach ($additionalInfo as $info) {
                $additionalInfoMap[$info['bookings_ticket_id']] = $info['code'];
            }

            $passengersMap = [];
            $firstPassengerTicketMap = [];
            foreach ($passengers as $passenger) {
                $ticketId = $passenger['bookings_ticket_id'];

                if (!isset($passengersMap[$ticketId])) {
                    $passengersMap[$ticketId] = [];
                    // Store first passenger ticket info
                    $firstPassengerTicketMap[$ticketId] = [
                        'ticket_number' => $passenger['ticket_number'],
                        'ticket_code' => $passenger['ticket_code']
                    ];
                }
                $passengersMap[$ticketId][] = $passenger;
            }

            $routesMap = [];
            foreach ($routes as $route) {
                $ticketId = $route['bookings_ticket_id'];
                if (!isset($routesMap[$ticketId])) {
                    $routesMap[$ticketId] = [];
                }
                $routesMap[$ticketId][] = $route;
            }

            // Create extras description map (fallback for routing)
            $extrasDescMap = [];
            foreach ($extras as $extra) {
                $ticketId = $extra['bookings_ticket_id'];
                if (!empty($extra['description'])) {
                    if (!isset($extrasDescMap[$ticketId])) {
                        $extrasDescMap[$ticketId] = [];
                    }
                    $extrasDescMap[$ticketId][] = $extra['description'];
                }
            }

            // Process each ticket
            $processedData = [];
            foreach ($tickets as $ticket) {
                $ticketId = $ticket['id'];
                $ticketPassengers = $passengersMap[$ticketId] ?? [];
                $ticketRoutes = $routesMap[$ticketId] ?? [];
                $firstPassengerTicketInfo = $firstPassengerTicketMap[$ticketId] ?? [];

                // Generate passengers display
                $passengersDisplay = '';
                $allPassengerNames = '';
                if (count($ticketPassengers) > 0) {
                    $firstName = $ticketPassengers[0]['passenger_name'] ?? 'Unknown';
                    if (count($ticketPassengers) === 1) {
                        $passengersDisplay = $firstName;
                    } else {
                        $additionalCount = count($ticketPassengers) - 1;
                        $passengersDisplay = "{$firstName}...+{$additionalCount}";
                    }
                    // เก็บชื่อผู้โดยสารทุกคนสำหรับการค้นหา
                    $allNames = array_map(function ($p) {
                        return $p['passenger_name'] ?? '';
                    }, $ticketPassengers);
                    $allPassengerNames = implode(' ', $allNames);
                }

                // Generate routing display using Multi-Segment Route Format
                // Fallback: ถ้าไม่มี routing ให้ใช้ tickets_extras description แทน
                $routingDisplay = '';
                if (count($ticketRoutes) > 0) {
                    $routingDisplay = $this->generateMultiSegmentRoute($ticketRoutes);
                }
                if (empty($routingDisplay) && !empty($extrasDescMap[$ticketId])) {
                    $routingDisplay = implode(', ', $extrasDescMap[$ticketId]);
                }

                // Generate ticket number display
                $ticketNumberDisplay = '-';
                if (count($ticketPassengers) > 0) {
                    $ticketCodes = [];
                    foreach ($ticketPassengers as $p) {
                        if (!empty($p['ticket_code']) && trim($p['ticket_code']) !== '') {
                            $ticketCodes[] = $p['ticket_code'];
                        }
                    }

                    if (count($ticketCodes) === 1) {
                        $ticketNumberDisplay = $ticketCodes[0];
                    } elseif (count($ticketCodes) > 1) {
                        $firstCode = $ticketCodes[0];
                        $lastCode = $ticketCodes[count($ticketCodes) - 1];
                        $lastThreeDigits = substr($lastCode, -3);
                        $ticketNumberDisplay = "{$firstCode}-{$lastThreeDigits}";
                    }
                }

                // Adjust created_at to Thai timezone (+7 hours)
                $createdAt = new DateTime($ticket['created_at']);
                $createdAt->add(new DateInterval('PT7H'));

                $processedData[] = [
                    'id' => $ticket['id'],
                    'reference_number' => $ticket['reference_number'],
                    'status' => $ticket['status'],
                    'payment_status' => $ticket['payment_status'],
                    'created_at' => $createdAt->format('c'), // ISO format
                    'updated_at' => $ticket['updated_at'],
                    'po_number' => $ticket['po_number'],
                    'po_generated_at' => $ticket['po_generated_at'],
                    'po_email_sent' => $ticket['po_email_sent'],
                    'po_email_sent_at' => $ticket['po_email_sent_at'],
                    'invoice_number' => $ticket['invoice_number'],
                    'invoice_generated_at' => $ticket['invoice_generated_at'],
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
                    'code' => $additionalInfoMap[$ticketId] ?? null,
                    'passengersDisplay' => $passengersDisplay,
                    'allPassengerNames' => $allPassengerNames,
                    'routingDisplay' => $routingDisplay,
                    'passengersCount' => count($ticketPassengers),
                    'ticketNumberDisplay' => $ticketNumberDisplay,
                    'firstPassengerTicketInfo' => $firstPassengerTicketInfo,
                    'cancelled_by_name' => $ticket['cancelled_user_fullname']
                ];
            }

            return $processedData;
        }

        /**
         * Generate Multi-Segment Route Format
         * Copy จาก gateway.php บรรทัด ~1500-1550
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
         * Filter flight tickets data
         * รองรับการค้นหาแบบ specific field (searchField)
         * searchField options: all, customer, supplier, pax_name, ticket_number, code, status
         */
        private function filterFlightTicketsData($data, $search, $searchField = 'all', $filterStatus = 'all')
        {
            if (empty($data)) return [];

            $filtered = $data;

            // Apply search filter
            if (!empty($search)) {
                $searchLower = strtolower(trim($search));

                $filtered = array_filter($filtered, function ($ticket) use ($searchLower, $searchField) {
                    // ถ้าเลือก field เฉพาะ ค้นหาเฉพาะ field นั้น
                    switch ($searchField) {
                        case 'customer':
                            // ค้นหา CUST (customer name หรือ code)
                            return (
                                (isset($ticket['customer']['name']) && strpos(strtolower($ticket['customer']['name']), $searchLower) !== false) ||
                                (isset($ticket['customer']['code']) && strpos(strtolower($ticket['customer']['code']), $searchLower) !== false)
                            );

                        case 'supplier':
                            // ค้นหา SUP (supplier name หรือ code)
                            return (
                                (isset($ticket['supplier']['name']) && strpos(strtolower($ticket['supplier']['name']), $searchLower) !== false) ||
                                (isset($ticket['supplier']['code']) && strpos(strtolower($ticket['supplier']['code']), $searchLower) !== false)
                            );

                        case 'pax_name':
                            // ค้นหา Pax's Name (ค้นหาจากชื่อผู้โดยสารทุกคน)
                            return (
                                isset($ticket['allPassengerNames']) && strpos(strtolower($ticket['allPassengerNames']), $searchLower) !== false
                            );

                        case 'ticket_number':
                            // ค้นหา Ticket Number
                            return (
                                (isset($ticket['ticketNumberDisplay']) && strpos(strtolower($ticket['ticketNumberDisplay']), $searchLower) !== false) ||
                                (isset($ticket['firstPassengerTicketInfo']['ticket_number']) && strpos(strtolower($ticket['firstPassengerTicketInfo']['ticket_number']), $searchLower) !== false) ||
                                (isset($ticket['firstPassengerTicketInfo']['ticket_code']) && strpos(strtolower($ticket['firstPassengerTicketInfo']['ticket_code']), $searchLower) !== false)
                            );

                        case 'code':
                            // ค้นหา Code (additional code)
                            return (
                                isset($ticket['code']) && strpos(strtolower($ticket['code']), $searchLower) !== false
                            );

                        case 'status':
                            // ค้นหา Status (PO Number)
                            return (
                                (isset($ticket['po_number']) && strpos(strtolower($ticket['po_number']), $searchLower) !== false) ||
                                (!empty($ticket['po_number']) && trim($ticket['po_number']) !== '' && strpos('invoiced', $searchLower) !== false) ||
                                ((empty($ticket['po_number']) || trim($ticket['po_number']) === '') && strpos('not invoiced', $searchLower) !== false)
                            );

                        case 'all':
                        default:
                            // ค้นหาทุก field (ยกเว้น ID)
                            return (
                                (isset($ticket['customer']['name']) && strpos(strtolower($ticket['customer']['name']), $searchLower) !== false) ||
                                (isset($ticket['customer']['code']) && strpos(strtolower($ticket['customer']['code']), $searchLower) !== false) ||
                                (isset($ticket['supplier']['name']) && strpos(strtolower($ticket['supplier']['name']), $searchLower) !== false) ||
                                (isset($ticket['supplier']['code']) && strpos(strtolower($ticket['supplier']['code']), $searchLower) !== false) ||
                                (isset($ticket['code']) && strpos(strtolower($ticket['code']), $searchLower) !== false) ||
                                (isset($ticket['allPassengerNames']) && strpos(strtolower($ticket['allPassengerNames']), $searchLower) !== false) ||
                                (isset($ticket['routingDisplay']) && strpos(strtolower($ticket['routingDisplay']), $searchLower) !== false) ||
                                (isset($ticket['po_number']) && strpos(strtolower($ticket['po_number']), $searchLower) !== false) ||
                                (isset($ticket['ticketNumberDisplay']) && strpos(strtolower($ticket['ticketNumberDisplay']), $searchLower) !== false) ||
                                (isset($ticket['firstPassengerTicketInfo']['ticket_number']) && strpos(strtolower($ticket['firstPassengerTicketInfo']['ticket_number']), $searchLower) !== false) ||
                                (isset($ticket['firstPassengerTicketInfo']['ticket_code']) && strpos(strtolower($ticket['firstPassengerTicketInfo']['ticket_code']), $searchLower) !== false) ||
                                // Search by status translations
                                (!empty($ticket['po_number']) && trim($ticket['po_number']) !== '' && strpos('invoiced', $searchLower) !== false) ||
                                ((empty($ticket['po_number']) || trim($ticket['po_number']) === '') && strpos('not invoiced', $searchLower) !== false)
                            );
                    }
                });
            }

            // Apply status filter
            if ($filterStatus && $filterStatus !== 'all') {
                $filtered = array_filter($filtered, function ($ticket) use ($filterStatus) {
                    if ($filterStatus === 'invoiced') {
                        return !empty($ticket['po_number']) && trim($ticket['po_number']) !== '';
                    } elseif ($filterStatus === 'not_invoiced') {
                        return empty($ticket['po_number']) || trim($ticket['po_number']) === '';
                    }
                    return true;
                });
            }

            return array_values($filtered); // Re-index array
        }

        /**
         * Sort flight tickets data
         * Copy จาก gateway.php บรรทัด ~1600-1650
         */
        private function sortFlightTicketsData($data, $field, $direction)
        {
            if (empty($data)) return [];

            usort($data, function ($a, $b) use ($field, $direction) {
                $valueA = null;
                $valueB = null;

                switch ($field) {
                    case 'customer':
                        $valueA = $a['customer']['code'] ?? $a['customer']['name'] ?? '';
                        $valueB = $b['customer']['code'] ?? $b['customer']['name'] ?? '';
                        break;
                    case 'supplier':
                        $valueA = $a['supplier']['code'] ?? $a['supplier']['name'] ?? '';
                        $valueB = $b['supplier']['code'] ?? $b['supplier']['name'] ?? '';
                        break;
                    case 'status':
                        $valueA = $a['status'] ?? 'not_invoiced';
                        $valueB = $b['status'] ?? 'not_invoiced';
                        break;
                    case 'created_at':
                        $valueA = strtotime($a['created_at'] ?? '1970-01-01');
                        $valueB = strtotime($b['created_at'] ?? '1970-01-01');
                        break;
                    case 'ticket_number':
                        $valueA = $a['ticketNumberDisplay'] ?? '';
                        $valueB = $b['ticketNumberDisplay'] ?? '';
                        break;
                    default:
                        $valueA = $a[$field] ?? '';
                        $valueB = $b[$field] ?? '';
                        break;
                }

                if ($direction === 'asc') {
                    return $valueA < $valueB ? -1 : ($valueA > $valueB ? 1 : 0);
                } else {
                    return $valueA > $valueB ? -1 : ($valueA < $valueB ? 1 : 0);
                }
            });

            return $data;
        }
        /**
         * Get Deposit Overview Data - Deposit Only
         * เพิ่ม method นี้ที่ท้าย OverviewHandler.php
         */
        private function getDepositOverviewData()
        {
            $startDate = $this->request['start_date'] ?? null;
            $endDate = $this->request['end_date'] ?? null;
            $serviceTypeFilter = $this->request['service_type_filter'] ?? 'all';

            // ถ้า filter ไม่ใช่ "all" และไม่ใช่ "deposit" ให้ return ข้อมูลเปล่า
            if ($serviceTypeFilter !== 'all' && $serviceTypeFilter !== 'deposit') {
                return $this->successResponse([], null, 0);
            }

            try {
                // Convert ISO dates to MySQL format (optional)
                $mysqlStartDate = null;
                $mysqlEndDate = null;
                if (!empty($startDate) && !empty($endDate)) {
                    $startDateTime = new DateTime($startDate);
                    $endDateTime = new DateTime($endDate);
                    $mysqlStartDate = $startDateTime->format('Y-m-d H:i:s');
                    $mysqlEndDate = $endDateTime->format('Y-m-d H:i:s');
                }

                // Deposit query with joins
                $sql = "
        SELECT
            'deposit' as service_type,
            bd.id,
            bd.reference_number,
            bd.status,
            bd.group_name,
            bd.created_at,
            bd.updated_at,
            bd.created_by,
            bd.cancelled_at,
            bd.cancelled_by,
            bd.cancel_reason,
            c.name as customer_name,
            c.code as customer_code,
            i.name as supplier_name,
            i.code as supplier_code,
            u.username as user_username,
            u.fullname as user_fullname,
            cu.fullname as cancelled_user_fullname,
            bd.issue_date,
            COALESCE(dd.grand_total, 0) as grand_total,
            COALESCE(dd.description, '') as deposit_description,
            GROUP_CONCAT(DISTINCT CONCAT(dr.origin, '-', dr.destination) ORDER BY dr.id SEPARATOR '|||') as routes,
            dai.code as additional_code
        FROM bookings_deposit bd
        LEFT JOIN customers c ON bd.customer_id = c.id
        LEFT JOIN information i ON bd.supplier_id = i.id
        LEFT JOIN users u ON bd.created_by = u.id
        LEFT JOIN users cu ON bd.cancelled_by = cu.id
        LEFT JOIN deposit_details dd ON bd.id = dd.bookings_deposit_id
        LEFT JOIN deposit_routes dr ON bd.id = dr.bookings_deposit_id
        LEFT JOIN deposit_additional_info dai ON bd.id = dai.bookings_deposit_id
        WHERE 1=1"
                . (!empty($mysqlStartDate) ? " AND bd.created_at >= :start_date AND bd.created_at <= :end_date" : "")
                . " GROUP BY bd.id ORDER BY bd.created_at DESC"
                . (empty($mysqlStartDate) ? " LIMIT 200" : "") . "
    ";

                $params = [];
                if (!empty($mysqlStartDate)) {
                    $params['start_date'] = $mysqlStartDate;
                    $params['end_date'] = $mysqlEndDate;
                }

                $result = $this->db->raw($sql, $params);

                if (!$result['success']) {
                    return $this->errorResponse($result['error']);
                }

                // Process data to match React component expectations
                $self = $this; // ⭐ สร้างตัวแปรเพื่อใช้ใน closure
                $processedData = array_map(function ($row) use ($self) {
                    // Process routing display using Multi-Segment Route Format
                    $routingDisplay = '-';
                    if (!empty($row['routes'])) {
                        $routes = explode('|||', $row['routes']);
                        if (count($routes) > 0) {
                            // Parse routes to array format for generateMultiSegmentRoute
                            $routesArray = [];
                            foreach ($routes as $route) {
                                $parts = explode('-', $route, 2);
                                if (count($parts) === 2) {
                                    $routesArray[] = [
                                        'origin' => $parts[0],
                                        'destination' => $parts[1]
                                    ];
                                }
                            }
                            $routingDisplay = $self->generateMultiSegmentRoute($routesArray);
                        }
                    }

                    return [
                        'id' => $row['id'],
                        'reference_number' => $row['reference_number'],
                        'status' => $row['status'],
                        'service_type' => $row['service_type'],
                        'created_at' => $row['created_at'],
                        'updated_at' => $row['updated_at'],
                        'created_by' => $row['created_by'],
                        'cancelled_at' => $row['cancelled_at'],
                        'cancelled_by' => $row['cancelled_by'],
                        'cancel_reason' => $row['cancel_reason'],
                        'customer' => [
                            'name' => $row['customer_name'],
                            'code' => $row['customer_code']
                        ],
                        'supplier' => [
                            'name' => $row['supplier_name'],
                            'code' => $row['supplier_code']
                        ],
                        'user' => [
                            'fullname' => $row['user_fullname'],
                            'username' => $row['user_username']
                        ],
                        'cancelled_user' => [
                            'fullname' => $row['cancelled_user_fullname']
                        ],
                        'group_name' => $row['group_name'],
                        'deposit_description' => $row['deposit_description'],
                        'code' => $row['additional_code'],
                        'routing_display' => $routingDisplay,
                        'tickets_detail' => [[
                            'issue_date' => $row['issue_date'],
                            'total_price' => $row['grand_total']
                        ]]
                    ];
                }, $result['data']);

                return $this->successResponse($processedData, null, count($processedData));
            } catch (Exception $e) {
                $this->logMessage("Error in getDepositOverviewData: " . $e->getMessage(), 'ERROR');
                return $this->errorResponse('Failed to fetch deposit overview data', 500);
            }
        }

        /**
         * Get Other Services Overview Data - Insurance/Hotel/Train/Visa/Other Only
         */
        private function getOtherOverviewData()
        {
            $startDate = $this->request['start_date'] ?? null;
            $endDate = $this->request['end_date'] ?? null;
            $serviceTypeFilter = $this->request['service_type_filter'] ?? 'all';

            // ถ้า filter เป็น specific service type ที่ไม่ใช่ other services ให้ return ข้อมูลเปล่า
            $otherServiceTypes = ['insurance', 'hotel', 'train', 'visa', 'other'];
            if ($serviceTypeFilter !== 'all' && !in_array($serviceTypeFilter, $otherServiceTypes)) {
                return $this->successResponse([], null, 0);
            }

            try {
                // Convert ISO dates to MySQL format (optional)
                $mysqlStartDate = null;
                $mysqlEndDate = null;
                if (!empty($startDate) && !empty($endDate)) {
                    $startDateTime = new DateTime($startDate);
                    $endDateTime = new DateTime($endDate);
                    $mysqlStartDate = $startDateTime->format('Y-m-d H:i:s');
                    $mysqlEndDate = $endDateTime->format('Y-m-d H:i:s');
                }

                // Build WHERE clause with optional date filter
                $whereClause = "WHERE 1=1";
                $params = [];
                if (!empty($mysqlStartDate)) {
                    $whereClause .= " AND bo.created_at >= :start_date AND bo.created_at <= :end_date";
                    $params['start_date'] = $mysqlStartDate;
                    $params['end_date'] = $mysqlEndDate;
                }

                // Add service type filter if not 'all'
                if ($serviceTypeFilter !== 'all') {
                    $whereClause .= " AND bo.service_type = :service_type";
                    $params['service_type'] = $serviceTypeFilter;
                }

                // Other Services query with joins
                $sql = "
        SELECT
            bo.vc_number,
            bo.vc_generated_at,
            bo.service_type,
            bo.id,
            bo.reference_number,
            bo.status,
            bo.created_at,
            bo.updated_at,
            bo.created_by,
            bo.cancelled_at,
            bo.cancelled_by,
            bo.cancel_reason,
            c.name as customer_name,
            c.code as customer_code,
            i.name as supplier_name,
            i.code as supplier_code,
            u.username as user_username,
            u.fullname as user_fullname,
            cu.fullname as cancelled_user_fullname,
            od.service_date as issue_date,
            od.description as service_description,
            od.reference_code,
            od.hotel_name,
            od.nights,
            od.check_in_date,
            od.grand_total,
            GROUP_CONCAT(DISTINCT op.passenger_name ORDER BY op.id SEPARATOR '|||') as passengers
        FROM bookings_other bo
        LEFT JOIN customers c ON bo.customer_id = c.id
        LEFT JOIN information i ON bo.information_id = i.id
        LEFT JOIN users u ON bo.created_by = u.id
        LEFT JOIN users cu ON bo.cancelled_by = cu.id
        LEFT JOIN other_details od ON bo.id = od.bookings_other_id
        LEFT JOIN other_passengers op ON bo.id = op.bookings_other_id
        {$whereClause}
        GROUP BY bo.id
        ORDER BY bo.created_at DESC"
        . (empty($mysqlStartDate) ? " LIMIT 200" : "") . "
    ";

                $result = $this->db->raw($sql, $params);

                if (!$result['success']) {
                    return $this->errorResponse($result['error']);
                }

                // Process data to match React component expectations
                $processedData = array_map(function ($row) {
                    $passengers = [];
                    $passengersDisplay = '-';
                    if ($row['passengers']) {
                        $passengers = explode('|||', $row['passengers']);
                        if (count($passengers) > 0) {
                            $firstName = $passengers[0];
                            if (count($passengers) === 1) {
                                $passengersDisplay = $firstName;
                            } else {
                                $additionalCount = count($passengers) - 1;
                                $passengersDisplay = "{$firstName}...+{$additionalCount}";
                            }
                        }
                    }

                    return [
                        'id' => $row['id'],
                        'reference_number' => $row['reference_number'],
                        'status' => $row['status'],
                        'service_type' => $row['service_type'],
                        'vc_number' => $row['vc_number'],
                        'vc_generated_at' => $row['vc_generated_at'],
                        'created_at' => $row['created_at'],
                        'updated_at' => $row['updated_at'],
                        'created_by' => $row['created_by'],
                        'cancelled_at' => $row['cancelled_at'],
                        'cancelled_by' => $row['cancelled_by'],
                        'cancel_reason' => $row['cancel_reason'],
                        'customer' => [
                            'name' => $row['customer_name'],
                            'code' => $row['customer_code']
                        ],
                        'supplier' => [
                            'name' => $row['supplier_name'],
                            'code' => $row['supplier_code']
                        ],
                        'user' => [
                            'fullname' => $row['user_fullname'],
                            'username' => $row['user_username']
                        ],
                        'cancelled_user' => [
                            'fullname' => $row['cancelled_user_fullname']
                        ],
                        'service_description' => $row['service_description'],
                        'reference_code' => $row['reference_code'],
                        'hotel_name' => $row['hotel_name'],
                        'nights' => $row['nights'],
                        'check_in_date' => $row['check_in_date'],
                        'passengers_display' => $passengersDisplay,
                        'tickets_detail' => [[
                            'issue_date' => $row['issue_date'],
                            'total_price' => $row['grand_total']
                        ]]
                    ];
                }, $result['data']);

                return $this->successResponse($processedData, null, count($processedData));
            } catch (Exception $e) {
                $this->logMessage("Error in getOtherOverviewData: " . $e->getMessage(), 'ERROR');
                return $this->errorResponse('Failed to fetch other overview data', 500);
            }
        }
    }
