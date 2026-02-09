<?php
// api/handlers/DepositHandler.php
// Complete Deposit Handler - ตาม Pattern ของ VoucherHandler
// สำหรับจัดการ SaleDeposit operations

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/BaseHandler.php';

/**
 * DepositHandler Class
 * จัดการการดำเนินการทั้งหมดของ Deposit System
 */
class DepositHandler extends BaseHandler
{
    public function __construct()
    {
        try {
            error_log("DepositHandler: Constructor starting...");
            parent::__construct();
            error_log("DepositHandler: Parent constructor completed");

            if (!$this->db->isConnected()) {
                error_log("DepositHandler: Database connection failed");
                throw new Exception("Database connection failed in DepositHandler");
            }
            error_log("DepositHandler: Constructor completed successfully");
        } catch (Exception $e) {
            error_log("DepositHandler Constructor Error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            throw $e;
        }
    }

    /**
     * Main action router
     */
    public function handle($action)
    {
        try {
            switch ($action) {
                case 'createDeposit':
                    return $this->createDeposit();
                case 'getDepositById':
                    return $this->getDepositById();
                case 'getDepositForEdit':
                    return $this->getDepositForEdit();
                case 'getDepositsList':
                    return $this->getDepositsList();
                case 'getDepositForView':
                    return $this->getDepositForView();
                case 'updateDepositStatus':
                    return $this->updateDepositStatus();
                case 'updateDepositComplete':
                    return $this->updateDepositComplete();
                case 'cancelDeposit':
                    return $this->cancelDeposit();
                case 'generateDepositReferenceNumber':
                    return $this->generateDepositReferenceNumber();
                case 'getDepositSuppliers':
                    return $this->getDepositSuppliers();
                default:
                    return $this->errorResponse("Unknown deposit action: {$action}");
            }
        } catch (Exception $e) {
            logMessage("DepositHandler Error ({$action}): " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Deposit operation failed: " . $e->getMessage());
        }
    }

    /**
     * Generate deposit reference number based on type
     */
    private function generateDepositReferenceNumber()
    {
        $depositType = $_REQUEST['depositType'] ?? 'deposit';

        // ใช้ prefix เดียวคือ DP (ไม่แยกตาม type)
        $prefix = 'DP';

        $result = $this->db->generateReferenceNumber(
            'bookings_deposit',
            $prefix,
            'reference_number'
        );

        if ($result['success']) {
            return $this->successResponse([
                'reference_number' => $result['reference_number'],
                'deposit_type' => $depositType,
                'prefix' => $prefix
            ]);
        }

        return $this->errorResponse("Failed to generate deposit reference number");
    }

    /**
     * Create new deposit booking
     */
    private function createDeposit()
    {
        try {
            logMessage("=== DepositHandler createDeposit START ===", 'INFO');

            // 1. Get and validate data
            $data = $this->request['data'] ?? [];
            logMessage("Received data: " . json_encode($data), 'INFO');

            // 2. Validate required fields
            $required = ['customerId'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    logMessage("❌ Missing required field: {$field}", 'ERROR');
                    return $this->errorResponse("Missing required field: {$field}");
                }
            }

            // 3. Check database connection
            if (!$this->db->isConnected()) {
                logMessage("❌ Database connection failed", 'ERROR');
                return $this->errorResponse("Database connection failed");
            }

            // 4. Start transaction
            logMessage("🔄 Starting database transaction", 'INFO');

            try {
                $this->db->beginTransaction();

                // 5. Generate reference number
                $prefix = 'DP';
                logMessage("🔄 Generating reference number with prefix: {$prefix}", 'INFO');
                $refResult = $this->db->generateReferenceNumber('bookings_deposit', $prefix, 'reference_number');

                if (!$refResult['success']) {
                    throw new Exception("Failed to generate reference number: " . ($refResult['error'] ?? 'Unknown'));
                }
                $referenceNumber = $refResult['reference_number'];
                logMessage("✅ Generated reference: {$referenceNumber}", 'INFO');

                // 6. Insert main deposit record
                $depositData = [
                    'reference_number' => $referenceNumber,
                    'customer_id' => intval($data['customerId']),
                    'supplier_id' => isset($data['supplierId']) ? intval($data['supplierId']) : null,
                    'deposit_type' => $data['depositType'] ?? 'airTicket',
                    'other_type_description' => $data['otherTypeDescription'] ?? null,
                    'group_name' => $data['groupName'] ?? null,
                    'status' => $data['status'] ?? 'pending',
                    'payment_status' => $data['paymentStatus'] ?? 'unpaid',
                    'issue_date' => $this->convertToMySQLDate($data['issueDate'] ?? null),
                    'due_date' => $this->convertToMySQLDate($data['dueDate'] ?? null),
                    'credit_days' => intval($data['creditDays'] ?? 0),
                    'created_by' => isset($data['createdBy']) ? intval($data['createdBy']) : null,
                    'updated_by' => isset($data['updatedBy']) ? intval($data['updatedBy']) : null
                ];

                logMessage("🔄 Inserting deposit data: " . json_encode($depositData), 'INFO');
                $depositResult = $this->db->insert('bookings_deposit', $depositData);

                if (!$depositResult['success']) {
                    throw new Exception("Failed to create deposit booking: " . ($depositResult['error'] ?? 'Unknown error'));
                }
                $depositId = $depositResult['id'];
                logMessage("✅ Created deposit ID: {$depositId}", 'INFO');

                // 7. Calculate totals
                $grandTotal = 0.00;
                $pricingTotal = 0.00;
                $extrasTotal = 0.00;
                $depositTotal = 0.00;
                $vatAmount = 0.00;

                if (!empty($data['pricing'])) {
                    $pricing = $data['pricing'];
                    $pricingTotal = (floatval($pricing['adult']['sale'] ?? 0) * intval($pricing['adult']['pax'] ?? 0)) +
                        (floatval($pricing['child']['sale'] ?? 0) * intval($pricing['child']['pax'] ?? 0)) +
                        (floatval($pricing['infant']['sale'] ?? 0) * intval($pricing['infant']['pax'] ?? 0));
                }

                // Calculate extras totals (✅ เพิ่มใหม่)
                if (!empty($data['extras'])) {
                    foreach ($data['extras'] as $extra) {
                        $extrasTotal += floatval($extra['total_amount'] ?? 0);
                    }
                }

                // Calculate deposit total (แยกต่างหาก)
                $depositAmount = floatval($data['depositAmount'] ?? 0);
                $depositPax = intval($data['depositPax'] ?? 0);
                $depositTotal = $depositAmount * $depositPax;

                // Calculate final totals (ไม่รวม depositTotal ใน subtotal)
                $subtotalBeforeVat = $pricingTotal + $extrasTotal;
                $vatPercent = floatval($data['vatPercent'] ?? 0);
                $vatAmount = ($subtotalBeforeVat * $vatPercent) / 100;
                $grandTotal = $subtotalBeforeVat + $vatAmount;

                logMessage("✅ Calculated totals - Pricing: {$pricingTotal}, Extras: {$extrasTotal}, Subtotal: {$subtotalBeforeVat}, VAT: {$vatAmount}, Grand: {$grandTotal}, Deposit: {$depositTotal}", 'INFO');

                // 8. INSERT DEPOSIT_DETAILS
                $detailsData = [
                    'bookings_deposit_id' => $depositId,
                    'description' => $data['description'] ?? null,
                    'subtotal_before_vat' => $subtotalBeforeVat,
                    'pricing_total' => $pricingTotal,
                    'deposit_amount' => $depositAmount,
                    'deposit_pax' => $depositPax,
                    'deposit_total' => $depositTotal,
                    'deposit_amount_2' => floatval($data['depositAmount2'] ?? 0),
                    'deposit_pax_2' => intval($data['depositPax2'] ?? 0),
                    'deposit_total_2' => floatval($data['depositAmount2'] ?? 0) * intval($data['depositPax2'] ?? 0),
                    'vat_amount' => $vatAmount,
                    'vat_percent' => $vatPercent,
                    'grand_total' => $grandTotal
                ];

                logMessage("📄 Inserting deposit_details: " . json_encode($detailsData), 'INFO');
                $detailsResult = $this->db->insert('deposit_details', $detailsData);

                if (!$detailsResult['success']) {
                    throw new Exception("Failed to insert deposit details: " . ($detailsResult['error'] ?? 'Unknown'));
                }
                logMessage("✅ Inserted deposit_details successfully", 'INFO');

                // 9. INSERT DEPOSIT_TERMS (4 วันที่)
                $termsData = [
                    'bookings_deposit_id' => $depositId,
                    'deposit_due_date' => $this->convertToMySQLDate($data['depositDueDate'] ?? null),
                    'second_deposit_due_date' => $this->convertToMySQLDate($data['secondDepositDueDate'] ?? null),
                    'passenger_info_due_date' => $this->convertToMySQLDate($data['passengerInfoDueDate'] ?? null),
                    'full_payment_due_date' => $this->convertToMySQLDate($data['fullPaymentDueDate'] ?? null)
                ];

                logMessage("🔄 Inserting deposit_terms: " . json_encode($termsData), 'INFO');
                $termsResult = $this->db->insert('deposit_terms', $termsData);

                if (!$termsResult['success']) {
                    throw new Exception("Failed to insert deposit terms: " . ($termsResult['error'] ?? 'Unknown'));
                }
                logMessage("✅ Inserted deposit_terms successfully", 'INFO');

                // 10. INSERT DEPOSIT_PRICING
                if (!empty($data['pricing'])) {
                    $pricing = $data['pricing'];

                    $pricingData = [
                        'bookings_deposit_id' => $depositId,
                        'adult_net_price' => floatval($pricing['adult']['net'] ?? 0),
                        'adult_sale_price' => floatval($pricing['adult']['sale'] ?? 0),
                        'adult_pax' => intval($pricing['adult']['pax'] ?? 0),
                        'adult_total' => floatval($pricing['adult']['sale'] ?? 0) * intval($pricing['adult']['pax'] ?? 0),
                        'child_net_price' => floatval($pricing['child']['net'] ?? 0),
                        'child_sale_price' => floatval($pricing['child']['sale'] ?? 0),
                        'child_pax' => intval($pricing['child']['pax'] ?? 0),
                        'child_total' => floatval($pricing['child']['sale'] ?? 0) * intval($pricing['child']['pax'] ?? 0),
                        'infant_net_price' => floatval($pricing['infant']['net'] ?? 0),
                        'infant_sale_price' => floatval($pricing['infant']['sale'] ?? 0),
                        'infant_pax' => intval($pricing['infant']['pax'] ?? 0),
                        'infant_total' => floatval($pricing['infant']['sale'] ?? 0) * intval($pricing['infant']['pax'] ?? 0),
                        'deposit_sale_price' => $depositAmount,
                        'deposit_pax' => $depositPax,
                        'deposit_total' => $depositTotal,
                        'subtotal_amount' => $subtotalBeforeVat,
                        'vat_percent' => $vatPercent,
                        'vat_amount' => $vatAmount,
                        'total_amount' => $grandTotal
                    ];

                    logMessage("🔄 Inserting deposit_pricing: " . json_encode($pricingData), 'INFO');
                    $pricingResult = $this->db->insert('deposit_pricing', $pricingData);

                    if (!$pricingResult['success']) {
                        throw new Exception("Failed to insert deposit pricing: " . ($pricingResult['error'] ?? 'Unknown'));
                    }
                    logMessage("✅ Inserted deposit_pricing successfully", 'INFO');
                }

                logMessage("⚡ CHECKPOINT: Before payment processing", 'INFO');

                // 11. INSERT DEPOSIT_ADDITIONAL_INFO
                // แปลง payments arrays เป็น JSON สำหรับเก็บใน database
                logMessage("🔍 DEBUG companyPayments: " . json_encode($data['companyPayments'] ?? 'NOT SET'), 'INFO');
                logMessage("🔍 DEBUG customerPayments: " . json_encode($data['customerPayments'] ?? 'NOT SET'), 'INFO');

                $companyPaymentsJson = null;
                if (isset($data['companyPayments']) && is_array($data['companyPayments'])) {
                    $companyPaymentsJson = json_encode($data['companyPayments']);
                    logMessage("✅ Encoded company_payments: " . $companyPaymentsJson, 'INFO');
                }

                $customerPaymentsJson = null;
                if (isset($data['customerPayments']) && is_array($data['customerPayments'])) {
                    $customerPaymentsJson = json_encode($data['customerPayments']);
                    logMessage("✅ Encoded customer_payments: " . $customerPaymentsJson, 'INFO');
                }

                $additionalInfoData = [
                    'bookings_deposit_id' => $depositId,
                    'company_payment_method' => $data['companyPaymentMethod'] ?? null,
                    'company_payment_details' => $data['companyPaymentDetails'] ?? null,
                    'customer_payment_method' => $data['customerPaymentMethod'] ?? null,
                    'customer_payment_details' => $data['customerPaymentDetails'] ?? null,
                    'company_payments' => $companyPaymentsJson,
                    'customer_payments' => $customerPaymentsJson,
                    'code' => $data['code'] ?? null
                ];

                logMessage("📝 additionalInfoData to insert: " . json_encode($additionalInfoData), 'INFO');

                // 12. INSERT DEPOSIT_ROUTES (ถ้ามี)
                if (!empty($data['routes'])) {
                    logMessage("📄 Inserting deposit_routes", 'INFO');
                    $this->insertDepositRoutes($depositId, $data['routes']);
                    logMessage("✅ Inserted deposit_routes successfully", 'INFO');
                }

                // 13. INSERT DEPOSIT_EXTRAS (ถ้ามี)
                if (!empty($data['extras'])) {
                    logMessage("📄 Inserting deposit_extras", 'INFO');
                    $this->insertDepositExtras($depositId, $data['extras']);
                    logMessage("✅ Inserted deposit_extras successfully", 'INFO');
                }

                logMessage("🔄 Inserting deposit_additional_info: " . json_encode($additionalInfoData), 'INFO');
                $additionalInfoResult = $this->db->insert('deposit_additional_info', $additionalInfoData);

                if (!$additionalInfoResult['success']) {
                    throw new Exception("Failed to insert deposit additional info: " . ($additionalInfoResult['error'] ?? 'Unknown'));
                }
                logMessage("✅ Inserted deposit_additional_info successfully", 'INFO');

                // 12. Commit transaction
                logMessage("🔄 Committing transaction", 'INFO');
                $this->db->commit();
                logMessage("✅ Transaction committed successfully", 'INFO');

                // 12.5. Log activity
                $userId = $data['createdBy'] ?? null;
                $this->logActivity('deposit', $depositId, $referenceNumber, 'create', $userId);

                // 13. Return success response
                $result = [
                    'depositId' => $depositId,
                    'referenceNumber' => $referenceNumber,
                    'depositType' => $data['depositType'] ?? 'airTicket',
                    'grandTotal' => $grandTotal,
                    'message' => 'Deposit created successfully'
                ];

                logMessage("✅ SUCCESS RESULT: " . json_encode($result), 'INFO');
                logMessage("=== DepositHandler createDeposit END SUCCESS ===", 'INFO');

                return $this->successResponse($result);
            } catch (Exception $e) {
                logMessage("❌ Transaction Exception: " . $e->getMessage(), 'ERROR');

                if ($this->db) {
                    $this->db->rollback();
                    logMessage("🔄 Transaction rolled back", 'INFO');
                }

                return $this->errorResponse("Failed to create deposit: " . $e->getMessage());
            }
        } catch (Exception $e) {
            logMessage("❌ Fatal Exception in createDeposit: " . $e->getMessage(), 'ERROR');
            logMessage("=== DepositHandler createDeposit END ERROR ===", 'ERROR');

            return $this->errorResponse("System error occurred while creating deposit. Please try again.");
        }
    }

    /**
     * Get deposit by ID
     * ✅ Print = Edit: อัปเดต updated_by ทุกครั้งที่ Print
     */
    private function getDepositById()
    {
        $depositId = $_REQUEST['depositId'] ?? null;
        $printUserId = $_REQUEST['userId'] ?? null; // รับ userId จาก Frontend

        if (empty($depositId)) {
            return $this->errorResponse("Deposit ID is required");
        }

        try {
            // ✅ Print = Edit: อัปเดต updated_by ก่อนดึงข้อมูล
            if ($printUserId) {
                $updateData = [
                    'updated_by' => $printUserId,
                    'updated_at' => date('Y-m-d H:i:s')
                ];

                $this->db->update(
                    'bookings_deposit',
                    $updateData,
                    'id = :id',
                    ['id' => $depositId]
                );
                error_log("Updated deposit {$depositId} with updated_by={$printUserId} (Print action)");
            }

            // Get deposit with complete customer and supplier data
            $sql = "
                SELECT
                    bd.*,
                    c.name as customer_name,
                    c.code as customer_code,
                    c.email as customer_email,
                    c.address_line1 as customer_address_line1,
                    c.address_line2 as customer_address_line2,
                    c.address_line3 as customer_address_line3,
                    c.phone as customer_phone,
                    c.id_number as customer_id_number,
                    c.branch_type as customer_branch_type,
                    c.branch_number as customer_branch_number,
                    i.name as supplier_name,
                    ft.reference_number as flight_ticket_reference,
                    i.code as supplier_code,
                    i.numeric_code as supplier_numeric_code
                FROM bookings_deposit bd
                LEFT JOIN customers c ON bd.customer_id = c.id
                LEFT JOIN information i ON bd.supplier_id = i.id
                LEFT JOIN bookings_ticket ft ON bd.flight_ticket_id = ft.id
                WHERE bd.id = :depositId
            ";

            $depositResult = $this->db->select($sql, ['depositId' => $depositId]);

            if (!$depositResult['success'] || empty($depositResult['data'])) {
                return $this->errorResponse("Deposit not found");
            }

            $deposit = $depositResult['data'][0];

            // ✅ Debug: ดูว่า $deposit มีข้อมูล flight_ticket_reference หรือไม่
            error_log("🔍 Deposit ID: " . $deposit['id']);
            error_log("🔍 Flight Ticket ID: " . ($deposit['flight_ticket_id'] ?? 'null'));
            error_log("🔍 Flight Ticket Reference: " . ($deposit['flight_ticket_reference'] ?? 'null'));

            // Get deposit details
            $detailsResult = $this->db->select(
                "SELECT * FROM deposit_details WHERE bookings_deposit_id = :depositId",
                ['depositId' => $depositId]
            );
            $details = $detailsResult['success'] && !empty($detailsResult['data']) ? $detailsResult['data'][0] : null;

            // Get deposit terms
            $termsResult = $this->db->select(
                "SELECT * FROM deposit_terms WHERE bookings_deposit_id = :depositId",
                ['depositId' => $depositId]
            );
            $terms = $termsResult['success'] && !empty($termsResult['data']) ? $termsResult['data'][0] : null;

            // Get pricing
            $pricingResult = $this->db->select(
                "SELECT * FROM deposit_pricing WHERE bookings_deposit_id = :depositId",
                ['depositId' => $depositId]
            );
            $pricing = $pricingResult['success'] && !empty($pricingResult['data']) ? $pricingResult['data'][0] : null;

            // Get additional info
            $additionalInfoResult = $this->db->select(
                "SELECT * FROM deposit_additional_info WHERE bookings_deposit_id = :depositId",
                ['depositId' => $depositId]
            );
            $additionalInfo = $additionalInfoResult['success'] && !empty($additionalInfoResult['data']) ? $additionalInfoResult['data'][0] : null;

            // Decode JSON payments if exists
            if ($additionalInfo) {
                if (isset($additionalInfo['company_payments']) && $additionalInfo['company_payments']) {
                    $decoded = json_decode($additionalInfo['company_payments'], true);
                    // แปลง keys เป็นตัวเล็กทั้งหมด
                    $additionalInfo['company_payments'] = array_map(function ($payment) {
                        return array_change_key_case($payment, CASE_LOWER);
                    }, $decoded);
                }
                if (isset($additionalInfo['customer_payments']) && $additionalInfo['customer_payments']) {
                    $decoded = json_decode($additionalInfo['customer_payments'], true);
                    // แปลง keys เป็นตัวเล็กทั้งหมด
                    $additionalInfo['customer_payments'] = array_map(function ($payment) {
                        return array_change_key_case($payment, CASE_LOWER);
                    }, $decoded);
                }
            }

            $overrideResult = $this->db->select(
                "SELECT customer_override_data FROM bookings_deposit WHERE id = :id",
                ['id' => $depositId]
            );

            $customerOverrideData = null;
            if ($overrideResult['success'] && !empty($overrideResult['data'])) {
                $customerOverrideData = $overrideResult['data'][0]['customer_override_data'];
            }

            // Get routes
            $routes = $this->getDepositRoutes($depositId);

            // Get extras
            $extras = $this->getDepositExtras($depositId);

            $overrideResult = $this->db->select(
                "SELECT customer_override_data FROM bookings_deposit WHERE id = :id",
                ['id' => $depositId]
            );

            $customerOverrideData = null;
            if ($overrideResult['success'] && !empty($overrideResult['data'])) {
                $customerOverrideData = $overrideResult['data'][0]['customer_override_data'];
            }

            // Return complete data structure
            return $this->successResponse([
                'deposit' => $deposit,
                'details' => $details,
                'terms' => $terms,
                'pricing' => $pricing,
                'additionalInfo' => $additionalInfo,
                'routes' => $routes,  // ✅ เพิ่ม
                'extras' => $extras,  // ✅ เพิ่ม
                'customer_override_data' => $customerOverrideData,
                'customer' => [
                    'id' => $deposit['customer_id'],
                    'name' => $deposit['customer_name'],
                    'code' => $deposit['customer_code'],
                    'email' => $deposit['customer_email'],
                    'address_line1' => $deposit['customer_address_line1'],
                    'address_line2' => $deposit['customer_address_line2'],
                    'address_line3' => $deposit['customer_address_line3'],
                    'phone' => $deposit['customer_phone'],
                    'id_number' => $deposit['customer_id_number'],
                    'branch_type' => $deposit['customer_branch_type'],
                    'branch_number' => $deposit['customer_branch_number'],
                ],
                'supplier' => [
                    'id' => $deposit['supplier_id'],
                    'name' => $deposit['supplier_name'],
                    'code' => $deposit['supplier_code'],
                    'numeric_code' => $deposit['supplier_numeric_code'],
                ]
            ]);
        } catch (Exception $e) {
            logMessage("Get deposit by ID error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to retrieve deposit: " . $e->getMessage());
        }
    }

    /**
     * Get deposits list
     */
    private function getDepositsList()
    {
        $filters = $_REQUEST['filters'] ?? [];
        $limit = $_REQUEST['limit'] ?? 50;
        $offset = $_REQUEST['offset'] ?? 0;
        $filterType = $_REQUEST['filterType'] ?? 'all';
        $filterStatus = $_REQUEST['filterStatus'] ?? 'all';
        $searchTerm = $_REQUEST['searchTerm'] ?? '';

        // ✅ เพิ่มการรับ date parameters
        $startDate = $_REQUEST['startDate'] ?? null;
        $endDate = $_REQUEST['endDate'] ?? null;

        // 🔍 Debug log
        error_log("🔍 getDepositsList - filterStatus: " . $filterStatus);
        error_log("🔍 getDepositsList - startDate: " . $startDate);
        error_log("🔍 getDepositsList - endDate: " . $endDate);
        error_log("🔍 getDepositsList - all REQUEST: " . json_encode($_REQUEST));

        try {
            $sql = "
        SELECT
            bd.*,
            c.name as customer_name,
            c.code as customer_code,
            i.name as supplier_name,
            i.code as supplier_code,
            dd.grand_total,
            dd.subtotal_before_vat,
            dd.vat_amount,
            dd.vat_percent,
            dd.description,
            dd.deposit_total,
            dd.deposit_total_2,
            dt.deposit_due_date,
            dt.second_deposit_due_date,
            dt.passenger_info_due_date,
            dt.full_payment_due_date,
            dp.adult_pax,
            dp.child_pax,
            dp.infant_pax,
            dai.customer_payments,
            ft.reference_number as flight_ticket_reference
        FROM bookings_deposit bd
        LEFT JOIN customers c ON bd.customer_id = c.id
        LEFT JOIN information i ON bd.supplier_id = i.id
        LEFT JOIN deposit_details dd ON bd.id = dd.bookings_deposit_id
        LEFT JOIN deposit_terms dt ON bd.id = dt.bookings_deposit_id
        LEFT JOIN deposit_pricing dp ON bd.id = dp.bookings_deposit_id
        LEFT JOIN deposit_additional_info dai ON bd.id = dai.bookings_deposit_id
        LEFT JOIN bookings_ticket ft ON bd.flight_ticket_id = ft.id
        WHERE 1=1
    ";

            $params = [];

            // ✅ เพิ่ม Date Range Filter
            if (!empty($startDate) && !empty($endDate)) {
                // Parse ISO date และแปลงเป็น MySQL datetime format
                $start = new DateTime($startDate);
                $end = new DateTime($endDate);

                $sql .= " AND bd.created_at BETWEEN :startDate AND :endDate";
                $params['startDate'] = $start->format('Y-m-d H:i:s');
                $params['endDate'] = $end->format('Y-m-d H:i:s');

                error_log("🔍 Date filter - Start: " . $params['startDate'] . ", End: " . $params['endDate']);
            }

            // Deposit Type Filter
            if (!empty($filterType) && $filterType !== 'all') {
                $sql .= " AND bd.deposit_type = :depositType";
                $params['depositType'] = $filterType;
            }

            // Status Filter
            if ($filterStatus === 'all_except_cancelled') {
                $sql .= " AND bd.status != 'cancelled'";
                error_log("🔍 Applied filter: status != 'cancelled'");
            } elseif ($filterStatus === 'cancelled') {
                $sql .= " AND bd.status = 'cancelled'";
                error_log("🔍 Applied filter: status = 'cancelled'");
            } elseif (!empty($filterStatus) && $filterStatus !== 'all') {
                $sql .= " AND bd.status = :status";
                $params['status'] = $filterStatus;
                error_log("🔍 Applied filter: status = '{$filterStatus}'");
            } else {
                error_log("🔍 No status filter applied (filterStatus = '{$filterStatus}')");
            }

            // Search Term
            if (!empty($searchTerm)) {
                $sql .= " AND (
            bd.reference_number LIKE :search1 OR 
            c.name LIKE :search2 OR 
            c.code LIKE :search3 OR
            bd.group_name LIKE :search4 OR
            dd.description LIKE :search5
        )";
                $searchPattern = '%' . $searchTerm . '%';
                $params['search1'] = $searchPattern;
                $params['search2'] = $searchPattern;
                $params['search3'] = $searchPattern;
                $params['search4'] = $searchPattern;
                $params['search5'] = $searchPattern;
            }

            // ✅ เพิ่ม debug log
            logMessage("Deposit List SQL: " . $sql, 'INFO');
            logMessage("Deposit List Params: " . json_encode($params), 'INFO');

            // ✅ เพิ่ม GROUP BY สำหรับ GROUP_CONCAT
            $sql .= " GROUP BY bd.id";

            // Sorting
            $sortField = $_REQUEST['sortField'] ?? 'created_at';
            $sortDirection = $_REQUEST['sortDirection'] ?? 'desc';

            $sortFieldMap = [
                'customer' => 'c.name',
                'supplier' => 'i.name',
                'deposit_type' => 'bd.deposit_type',
                'status' => 'bd.status',
                'created_at' => 'bd.created_at',
                'id' => 'bd.reference_number'
            ];

            $dbSortField = $sortFieldMap[$sortField] ?? 'bd.created_at';
            $sql .= " ORDER BY {$dbSortField} {$sortDirection}";

            // Pagination
            $sql .= " LIMIT :limit OFFSET :offset";
            $params['limit'] = (int)$limit;
            $params['offset'] = (int)$offset;

            error_log("🔍 Final SQL: " . $sql);
            error_log("🔍 Final Params: " . json_encode($params));

            $result = $this->db->select($sql, $params);

            error_log("🔍 Query result count: " . (isset($result['data']) ? count($result['data']) : 0));
            if (!$result['success']) {
                error_log("❌ Query error: " . ($result['error'] ?? 'unknown'));
            }

            if ($result['success']) {
                // ✅ Process routing display for each deposit
                $processedData = [];
                foreach ($result['data'] as $deposit) {
                    // Get routes for this deposit
                    $routes = $this->getDepositRoutes($deposit['id']);
                    $routingDisplay = '';

                    if (!empty($routes)) {
                        $routingDisplay = $this->generateMultiSegmentRoute($routes);
                    }

                    $deposit['routingDisplay'] = $routingDisplay;

                    // ✅ Decode customer_payments JSON
                    if (isset($deposit['customer_payments']) && $deposit['customer_payments']) {
                        $decoded = json_decode($deposit['customer_payments'], true);
                        // ✅ แปลง keys เป็นตัวเล็กทั้งหมด (เหมือน getDepositById)
                        $deposit['customer_payments'] = array_map(function ($payment) {
                            return array_change_key_case($payment, CASE_LOWER);
                        }, $decoded);
                    } else {
                        $deposit['customer_payments'] = [];
                    }

                    $processedData[] = $deposit;
                }

                return $this->successResponse($processedData);
            }

            return $this->errorResponse("Failed to retrieve deposits list");
        } catch (Exception $e) {
            logMessage("Get deposits list error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to retrieve deposits: " . $e->getMessage());
        }
    }

    /**
     * Get deposit suppliers (airlines)
     */
    private function getDepositSuppliers()
    {
        $search = $_REQUEST['search'] ?? '';
        $limit = $_REQUEST['limit'] ?? 100;

        try {
            $category = 'supplier-airline'; // สำหรับ deposit ใช้ airline

            $sql = "SELECT * FROM information WHERE active = 1 AND category = :category";
            $params = ['category' => $category];

            if (!empty($search)) {
                $sql .= " AND (code LIKE :search1 OR name LIKE :search2)";
                $params['search1'] = '%' . $search . '%';
                $params['search2'] = '%' . $search . '%';
            }

            $sql .= " ORDER BY code LIMIT :limit";
            $params['limit'] = (int)$limit;

            $result = $this->db->select($sql, $params);

            if ($result['success']) {
                return $this->successResponse($result['data']);
            }

            return $this->errorResponse("Failed to retrieve deposit suppliers");
        } catch (Exception $e) {
            logMessage("Get deposit suppliers error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to retrieve suppliers: " . $e->getMessage());
        }
    }

    /**
     * Update deposit status
     */
    private function updateDepositStatus()
    {
        $depositId = $this->request['depositId'] ?? null;
        $status = $this->request['status'] ?? null;
        $userId = $this->request['userId'] ?? null;
        $cancelReason = $this->request['cancelReason'] ?? '';

        if (empty($depositId) || empty($status)) {
            return $this->errorResponse("Deposit ID and status are required");
        }
        $allowedStatuses = ['pending', 'issued', 'cancelled'];
        if (!in_array($status, $allowedStatuses)) {
            return $this->errorResponse("Invalid status. Allowed: pending, issued, cancelled");
        }

        try {
            $updateData = [
                'status' => $status,
                'updated_by' => $userId
            ];

            if ($status === 'cancelled') {
                $updateData['cancelled_at'] = date('Y-m-d H:i:s');
                $updateData['cancelled_by'] = $userId;
                if (!empty($cancelReason)) {
                    $updateData['cancel_reason'] = $cancelReason;
                }
            }

            $result = $this->db->update(
                'bookings_deposit',
                $updateData,
                'id = :id',
                ['id' => $depositId]
            );

            if ($result['success']) {
                return $this->successResponse([
                    'message' => 'Deposit status updated successfully',
                    'status' => $status
                ]);
            }

            return $this->errorResponse("Failed to update deposit status");
        } catch (Exception $e) {
            logMessage("Update deposit status error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to update status: " . $e->getMessage());
        }
    }

    /**
     * Cancel deposit
     */
    private function cancelDeposit()
    {
        $depositId = $this->request['depositId'] ?? $this->request['id'] ?? null;
        $userId = $this->request['userId'] ?? null;
        $cancelReason = $this->request['cancelReason'] ?? '';

        if (!$depositId || !$userId) {
            return $this->errorResponse('Deposit ID and User ID are required', 400);
        }

        try {
            $updateData = [
                'status' => 'cancelled',
                'cancelled_at' => date('Y-m-d H:i:s'),
                'cancelled_by' => $userId,
                'cancel_reason' => $cancelReason
            ];

            $result = $this->db->update('bookings_deposit', $updateData, 'id = :id', ['id' => $depositId]);

            if (!$result['success']) {
                return $this->errorResponse('Failed to cancel deposit');
            }

            // Log activity
            $result = $this->db->select("SELECT reference_number FROM bookings_deposit WHERE id = ?", [$depositId]);
            $depositData = $result['data'][0] ?? null;
            $referenceNumber = $depositData['reference_number'] ?? null;
            $this->logActivity('deposit', $depositId, $referenceNumber, 'cancel', $userId);

            $this->logMessage("Cancelled deposit: {$depositId} by user: {$userId}");
            return $this->successResponse(null, 'Deposit cancelled successfully');
        } catch (Exception $e) {
            $this->logMessage("Error in cancelDeposit: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to cancel deposit', 500);
        }
    }

    /**
     * Get deposit for edit (Complex data structure for editing)
     */
    private function getDepositForEdit()
    {
        $depositId = $this->request['depositId'] ?? $this->request['id'] ?? null;

        if (!$depositId) {
            return $this->errorResponse('Deposit ID is required', 400);
        }

        try {
            // เหมือนกับ getDepositById แต่ optimize สำหรับ editing
            $sql = "
                SELECT 
                  bd.*, bd.customer_override_data,
                    c.name as customer_name,
                    c.code as customer_code,
                    c.email as customer_email,
                    c.address_line1 as customer_address_line1,
                    c.address_line2 as customer_address_line2,
                    c.address_line3 as customer_address_line3,
                    c.phone as customer_phone,
                    c.id_number as customer_id_number,
                    c.branch_type as customer_branch_type,
                    c.branch_number as customer_branch_number,
                    i.name as supplier_name,
                    i.code as supplier_code,
                    i.numeric_code as supplier_numeric_code
                FROM bookings_deposit bd
                LEFT JOIN customers c ON bd.customer_id = c.id
                LEFT JOIN information i ON bd.supplier_id = i.id
                WHERE bd.id = :depositId
            ";

            $depositResult = $this->db->select($sql, ['depositId' => $depositId]);

            if (!$depositResult['success'] || empty($depositResult['data'])) {
                return $this->errorResponse("Deposit not found", 404);
            }

            $deposit = $depositResult['data'][0];

            // Get related data
            $detailsResult = $this->db->select(
                "SELECT * FROM deposit_details WHERE bookings_deposit_id = :depositId",
                ['depositId' => $depositId]
            );
            $details = $detailsResult['success'] && !empty($detailsResult['data']) ? $detailsResult['data'][0] : null;

            $termsResult = $this->db->select(
                "SELECT * FROM deposit_terms WHERE bookings_deposit_id = :depositId",
                ['depositId' => $depositId]
            );
            $terms = $termsResult['success'] && !empty($termsResult['data']) ? $termsResult['data'][0] : null;

            $pricingResult = $this->db->select(
                "SELECT * FROM deposit_pricing WHERE bookings_deposit_id = :depositId",
                ['depositId' => $depositId]
            );
            $pricing = $pricingResult['success'] && !empty($pricingResult['data']) ? $pricingResult['data'][0] : null;

            $additionalInfoResult = $this->db->select(
                "SELECT * FROM deposit_additional_info WHERE bookings_deposit_id = :depositId",
                ['depositId' => $depositId]
            );
            $additionalInfo = $additionalInfoResult['success'] && !empty($additionalInfoResult['data']) ? $additionalInfoResult['data'][0] : null;

            // Decode JSON payments if exists
            if ($additionalInfo) {
                if (isset($additionalInfo['company_payments']) && $additionalInfo['company_payments']) {
                    $decoded = json_decode($additionalInfo['company_payments'], true);
                    // แปลง keys เป็นตัวเล็กทั้งหมด
                    $additionalInfo['company_payments'] = array_map(function ($payment) {
                        return array_change_key_case($payment, CASE_LOWER);
                    }, $decoded);
                }
                if (isset($additionalInfo['customer_payments']) && $additionalInfo['customer_payments']) {
                    $decoded = json_decode($additionalInfo['customer_payments'], true);
                    // แปลง keys เป็นตัวเล็กทั้งหมด
                    $additionalInfo['customer_payments'] = array_map(function ($payment) {
                        return array_change_key_case($payment, CASE_LOWER);
                    }, $decoded);
                }
            }

            $routes = $this->getDepositRoutes($depositId);
            $extras = $this->getDepositExtras($depositId);
            // Structure data for editing (เหมือน FlightTicketDetail_Edit)
            $editData = [
                'id' => $deposit['id'],
                'reference_number' => $deposit['reference_number'],
                'status' => $deposit['status'],
                'payment_status' => $deposit['payment_status'],
                'created_at' => $deposit['created_at'],
                'updated_at' => $deposit['updated_at'],
                'created_by' => $deposit['created_by'],
                'updated_by' => $deposit['updated_by'],
                'cancelled_at' => $deposit['cancelled_at'],
                'cancelled_by' => $deposit['cancelled_by'],
                'cancel_reason' => $deposit['cancel_reason'],

                // Deposit object
                'deposit' => $deposit,

                // Customer data (structured for editing)
                'customer' => $deposit['customer_id'] ? [
                    'id' => $deposit['customer_id'],
                    'name' => $deposit['customer_name'],
                    'code' => $deposit['customer_code'],
                    'email' => $deposit['customer_email'],
                    'address_line1' => $deposit['customer_address_line1'],
                    'address_line2' => $deposit['customer_address_line2'],
                    'address_line3' => $deposit['customer_address_line3'],
                    'phone' => $deposit['customer_phone'],
                    'id_number' => $deposit['customer_id_number'],
                    'branch_type' => $deposit['customer_branch_type'],
                    'branch_number' => $deposit['customer_branch_number'],
                    'credit_days' => $deposit['credit_days']
                ] : null,

                // Supplier data (structured for editing)
                'supplier' => $deposit['supplier_id'] ? [
                    'id' => $deposit['supplier_id'],
                    'name' => $deposit['supplier_name'],
                    'code' => $deposit['supplier_code'],
                    'numeric_code' => $deposit['supplier_numeric_code']
                ] : null,

                // Related data
                'details' => $details,
                'terms' => $terms,
                'pricing' => $pricing,
                'additionalInfo' => $additionalInfo,
                'routes' => $routes,
                'extras' => $extras
            ];

            $this->logMessage("Retrieved deposit for edit: {$depositId}");
            return $this->successResponse($editData);
        } catch (Exception $e) {
            $this->logMessage("Error in getDepositForEdit: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch deposit for editing', 500);
        }
    }

    /**
     * Get deposit for view
     */
    private function getDepositForView()
    {
        return $this->getDepositById();
    }

    /**
     * Update deposit complete (Complex Transaction)
     */
    private function updateDepositComplete()
    {
        $depositId = $this->request['depositId'] ?? $this->request['id'] ?? null;
        $data = $this->request['data'] ?? $this->request;

        if (!$depositId) {
            return $this->errorResponse('Deposit ID is required', 400);
        }

        if (empty($data)) {
            return $this->errorResponse('Update data is required', 400);
        }

        try {
            // Start transaction for data integrity
            $this->db->beginTransaction();

            // 1. Update customer data (if provided)
            // ✅ เพิ่มส่วนนี้แทน
            if (isset($data['customerOverride'])) {
                $customerOverrideJson = null;
                if (!empty($data['customerOverride'])) {
                    $customerOverrideJson = json_encode($data['customerOverride']);
                }

                // Update deposit with override data
                $this->db->update(
                    'bookings_deposit',
                    ['customer_override_data' => $customerOverrideJson],
                    'id = :id',
                    ['id' => $depositId]
                );
            }

            // 2. Update main deposit data
            if (isset($data['mainDeposit'])) {
                $this->updateMainDepositData($depositId, $data['mainDeposit']);
            }

            // 3. Update deposit_details
            if (isset($data['depositDetails'])) {
                $this->updateDepositDetailData($depositId, $data['depositDetails']);
            }

            // 4. Update deposit_terms
            if (isset($data['depositTerms'])) {
                $this->updateDepositTermsData($depositId, $data['depositTerms']);
            }

            // 5. Update deposit_additional_info
            if (isset($data['additionalInfo'])) {
                $this->updateDepositAdditionalInfo($depositId, $data['additionalInfo']);
            }

            // 6. Update deposit_pricing
            if (isset($data['pricing'])) {
                $this->updateDepositPricingData($depositId, $data['pricing']);
            }

            // 7. Update deposit_routes
            if (isset($data['routes'])) {
                $this->updateDepositRoutes($depositId, $data['routes']);
            }

            // 8. Update deposit_extras
            if (isset($data['extras'])) {
                $this->updateDepositExtras($depositId, $data['extras']);
            }

            // Commit transaction
            $this->db->commit();

            // Log activity
            $result = $this->db->select("SELECT reference_number FROM bookings_deposit WHERE id = ?", [$depositId]);
            $depositData = $result['data'][0] ?? null;
            $referenceNumber = $depositData['reference_number'] ?? null;
            $userId = $data['mainDeposit']['updated_by'] ?? null;
            $this->logActivity('deposit', $depositId, $referenceNumber, 'update', $userId);

            $this->logMessage("Updated deposit complete: {$depositId}");
            return $this->successResponse(null, 'Deposit updated successfully');
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logMessage("Error in updateDepositComplete: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to update deposit: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Helper method to convert various date formats to MySQL date format
     */
    private function convertToMySQLDate($dateInput)
    {
        if (empty($dateInput)) {
            return date('Y-m-d');
        }

        // If already in YYYY-MM-DD format, return as-is
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateInput)) {
            return $dateInput;
        }

        try {
            // Convert ISO format or other formats to MySQL date
            $date = new DateTime($dateInput);
            return $date->format('Y-m-d');
        } catch (Exception $e) {
            error_log("Date conversion error for '{$dateInput}': " . $e->getMessage());
            return date('Y-m-d'); // Fallback to today
        }
    }
    // ===========================================
    // UPDATE HELPERS สำหรับ updateDepositComplete
    // ===========================================

    private function updateCustomerForDeposit($customerData)
    {
        if (!isset($customerData['id']) || empty($customerData['id'])) {
            return;
        }

        $updateData = [];
        if (isset($customerData['name'])) $updateData['name'] = $customerData['name'];
        if (isset($customerData['code'])) $updateData['code'] = $customerData['code'];
        if (isset($customerData['address_line1'])) $updateData['address_line1'] = $customerData['address_line1'];
        if (isset($customerData['phone'])) $updateData['phone'] = $customerData['phone'];
        if (isset($customerData['id_number'])) $updateData['id_number'] = $customerData['id_number'];
        if (isset($customerData['branch_type'])) $updateData['branch_type'] = $customerData['branch_type'];
        if (isset($customerData['branch_number'])) $updateData['branch_number'] = $customerData['branch_number'];
        if (isset($customerData['credit_days'])) $updateData['credit_days'] = $customerData['credit_days'];

        if (!empty($updateData)) {
            $this->db->update('customers', $updateData, 'id = :id', ['id' => $customerData['id']]);
        }
    }

    private function updateMainDepositData($depositId, $mainData)
    {
        $updateData = [];

        if (isset($mainData['customer_id'])) $updateData['customer_id'] = $mainData['customer_id'];
        if (isset($mainData['supplier_id'])) $updateData['supplier_id'] = $mainData['supplier_id'];
        if (isset($mainData['deposit_type'])) $updateData['deposit_type'] = $mainData['deposit_type'];
        if (isset($mainData['other_type_description'])) $updateData['other_type_description'] = $mainData['other_type_description'];
        if (isset($mainData['group_name'])) $updateData['group_name'] = $mainData['group_name'];
        if (isset($mainData['issue_date'])) $updateData['issue_date'] = $mainData['issue_date'];
        if (isset($mainData['due_date'])) $updateData['due_date'] = $mainData['due_date'];
        if (isset($mainData['credit_days'])) $updateData['credit_days'] = $mainData['credit_days'];
        if (isset($mainData['updated_by'])) $updateData['updated_by'] = $mainData['updated_by']; // ✅ เพิ่มบรรทัดนี้

        if (!empty($updateData)) {
            $this->db->update('bookings_deposit', $updateData, 'id = :id', ['id' => $depositId]);
        }
    }

    private function updateDepositDetailData($depositId, $detailData)
    {
        $updateData = [];

        if (isset($detailData['description'])) $updateData['description'] = $detailData['description'];
        if (isset($detailData['subtotal_before_vat'])) $updateData['subtotal_before_vat'] = $detailData['subtotal_before_vat'];
        if (isset($detailData['pricing_total'])) $updateData['pricing_total'] = $detailData['pricing_total'];
        if (isset($detailData['deposit_amount'])) $updateData['deposit_amount'] = $detailData['deposit_amount'];
        if (isset($detailData['deposit_pax'])) $updateData['deposit_pax'] = $detailData['deposit_pax'];
        if (isset($detailData['deposit_total'])) $updateData['deposit_total'] = $detailData['deposit_total'];
        if (isset($detailData['deposit_amount_2'])) $updateData['deposit_amount_2'] = $detailData['deposit_amount_2'];
        if (isset($detailData['deposit_pax_2'])) $updateData['deposit_pax_2'] = $detailData['deposit_pax_2'];
        if (isset($detailData['deposit_total_2'])) $updateData['deposit_total_2'] = $detailData['deposit_total_2'];
        if (isset($detailData['vat_percent'])) $updateData['vat_percent'] = $detailData['vat_percent'];
        if (isset($detailData['vat_amount'])) $updateData['vat_amount'] = $detailData['vat_amount'];
        if (isset($detailData['grand_total'])) $updateData['grand_total'] = $detailData['grand_total'];

        if (!empty($updateData)) {
            $this->db->update('deposit_details', $updateData, 'bookings_deposit_id = :id', ['id' => $depositId]);
        }
    }

    private function updateDepositTermsData($depositId, $termsData)
    {
        $updateData = [];

        if (isset($termsData['deposit_due_date'])) $updateData['deposit_due_date'] = $termsData['deposit_due_date'];
        if (isset($termsData['second_deposit_due_date'])) $updateData['second_deposit_due_date'] = $termsData['second_deposit_due_date'];
        if (isset($termsData['passenger_info_due_date'])) $updateData['passenger_info_due_date'] = $termsData['passenger_info_due_date'];
        if (isset($termsData['full_payment_due_date'])) $updateData['full_payment_due_date'] = $termsData['full_payment_due_date'];

        if (!empty($updateData)) {
            $this->db->update('deposit_terms', $updateData, 'bookings_deposit_id = :id', ['id' => $depositId]);
        }
    }

    private function updateDepositAdditionalInfo($depositId, $additionalData)
    {
        logMessage("🔍 UPDATE DEBUG - additionalData received: " . json_encode($additionalData), 'INFO');

        $updateData = [];

        if (isset($additionalData['code'])) $updateData['code'] = $additionalData['code'];
        if (isset($additionalData['company_payment_method'])) $updateData['company_payment_method'] = $additionalData['company_payment_method'];
        if (isset($additionalData['company_payment_details'])) $updateData['company_payment_details'] = $additionalData['company_payment_details'];
        if (isset($additionalData['customer_payment_method'])) $updateData['customer_payment_method'] = $additionalData['customer_payment_method'];
        if (isset($additionalData['customer_payment_details'])) $updateData['customer_payment_details'] = $additionalData['customer_payment_details'];

        // Handle new payment arrays (company_payments and customer_payments)
        if (isset($additionalData['company_payments']) && is_array($additionalData['company_payments'])) {
            $updateData['company_payments'] = json_encode($additionalData['company_payments']);
            logMessage("✅ UPDATE - Encoded company_payments: " . $updateData['company_payments'], 'INFO');
        } else {
            logMessage("❌ UPDATE - company_payments NOT FOUND or NOT ARRAY in additionalData", 'INFO');
        }

        if (isset($additionalData['customer_payments']) && is_array($additionalData['customer_payments'])) {
            $updateData['customer_payments'] = json_encode($additionalData['customer_payments']);
            logMessage("✅ UPDATE - Encoded customer_payments: " . $updateData['customer_payments'], 'INFO');
        } else {
            logMessage("❌ UPDATE - customer_payments NOT FOUND or NOT ARRAY in additionalData", 'INFO');
        }

        logMessage("📝 UPDATE - Final updateData: " . json_encode($updateData), 'INFO');

        if (!empty($updateData)) {
            $this->db->update('deposit_additional_info', $updateData, 'bookings_deposit_id = :id', ['id' => $depositId]);
            logMessage("✅ UPDATE - deposit_additional_info updated for depositId: " . $depositId, 'INFO');
        } else {
            logMessage("⚠️ UPDATE - No data to update for depositId: " . $depositId, 'INFO');
        }
    }

    private function updateDepositPricingData($depositId, $pricingData)
    {
        $updateData = [];

        // Adult pricing
        if (isset($pricingData['adult_net_price'])) $updateData['adult_net_price'] = $pricingData['adult_net_price'];
        if (isset($pricingData['adult_sale_price'])) $updateData['adult_sale_price'] = $pricingData['adult_sale_price'];
        if (isset($pricingData['adult_pax'])) $updateData['adult_pax'] = $pricingData['adult_pax'];
        if (isset($pricingData['adult_total'])) $updateData['adult_total'] = $pricingData['adult_total'];

        // Child pricing
        if (isset($pricingData['child_net_price'])) $updateData['child_net_price'] = $pricingData['child_net_price'];
        if (isset($pricingData['child_sale_price'])) $updateData['child_sale_price'] = $pricingData['child_sale_price'];
        if (isset($pricingData['child_pax'])) $updateData['child_pax'] = $pricingData['child_pax'];
        if (isset($pricingData['child_total'])) $updateData['child_total'] = $pricingData['child_total'];

        // Infant pricing
        if (isset($pricingData['infant_net_price'])) $updateData['infant_net_price'] = $pricingData['infant_net_price'];
        if (isset($pricingData['infant_sale_price'])) $updateData['infant_sale_price'] = $pricingData['infant_sale_price'];
        if (isset($pricingData['infant_pax'])) $updateData['infant_pax'] = $pricingData['infant_pax'];
        if (isset($pricingData['infant_total'])) $updateData['infant_total'] = $pricingData['infant_total'];

        // Deposit pricing
        if (isset($pricingData['deposit_sale_price'])) $updateData['deposit_sale_price'] = $pricingData['deposit_sale_price'];
        if (isset($pricingData['deposit_pax'])) $updateData['deposit_pax'] = $pricingData['deposit_pax'];
        if (isset($pricingData['deposit_total'])) $updateData['deposit_total'] = $pricingData['deposit_total'];

        // Totals
        if (isset($pricingData['subtotal_amount'])) $updateData['subtotal_amount'] = $pricingData['subtotal_amount'];
        if (isset($pricingData['vat_percent'])) $updateData['vat_percent'] = $pricingData['vat_percent'];
        if (isset($pricingData['vat_amount'])) $updateData['vat_amount'] = $pricingData['vat_amount'];
        if (isset($pricingData['total_amount'])) $updateData['total_amount'] = $pricingData['total_amount'];

        if (!empty($updateData)) {
            $this->db->update('deposit_pricing', $updateData, 'bookings_deposit_id = :id', ['id' => $depositId]);
        }
    }

    /**
     * Create customer override data if changes detected
     */
    private function createCustomerOverrideData($formData, $originalCustomer)
    {
        if (!$formData || !$originalCustomer) return null;

        $override = [];
        $hasChanges = false;

        // Check name changes
        if (isset($formData['customer']) && $formData['customer'] !== $originalCustomer['name']) {
            $override['name'] = $formData['customer'];
            $hasChanges = true;
        }

        // Check address changes
        $originalAddress = $this->formatCustomerAddressFromDB($originalCustomer);
        if (isset($formData['contactDetails']) && $formData['contactDetails'] !== $originalAddress) {
            $override['address'] = $formData['contactDetails'];
            $hasChanges = true;
        }

        // Check phone changes
        if (isset($formData['phone']) && $formData['phone'] !== $originalCustomer['phone']) {
            $override['phone'] = $formData['phone'];
            $hasChanges = true;
        }

        // Check ID number changes
        if (isset($formData['id']) && $formData['id'] !== $originalCustomer['id_number']) {
            $override['id_number'] = $formData['id'];
            $hasChanges = true;
        }

        // Check branch type changes
        if (isset($formData['branchType']) && $formData['branchType'] !== $originalCustomer['branch_type']) {
            $override['branch_type'] = $formData['branchType'];
            $hasChanges = true;
        }

        // Check branch number changes
        if (isset($formData['branchNumber']) && $formData['branchNumber'] !== $originalCustomer['branch_number']) {
            $override['branch_number'] = $formData['branchNumber'];
            $hasChanges = true;
        }

        return $hasChanges ? $override : null;
    }

    /**
     * Format customer address from database record
     */
    private function formatCustomerAddressFromDB($customer)
    {
        if (!$customer) return "";

        $addressParts = [
            $customer['address_line1'] ?? '',
            $customer['address_line2'] ?? '',
            $customer['address_line3'] ?? ''
        ];

        $addressParts = array_filter($addressParts, function ($part) {
            return !empty(trim($part));
        });

        return implode(' ', $addressParts);
    }
    /**
     * Insert deposit routes data
     */
    private function insertDepositRoutes($depositId, $routes)
    {
        if (empty($routes) || !is_array($routes)) {
            return;
        }

        foreach ($routes as $route) {
            if (!empty($route['origin']) || !empty($route['destination'])) {
                $this->db->insert('deposit_routes', [
                    'bookings_deposit_id' => $depositId,
                    'flight_number' => $route['flight_number'] ?? $route['flight'] ?? null,
                    'rbd' => $route['rbd'] ?? null,
                    'date' => $route['date'] ?? null,
                    'origin' => $route['origin'] ?? null,
                    'destination' => $route['destination'] ?? null,
                    'departure_time' => $route['departure'] ?? null,
                    'arrival_time' => $route['arrival'] ?? null
                ]);
            }
        }
    }

    /**
     * Insert deposit extras data
     */
    private function insertDepositExtras($depositId, $extras)
    {
        if (empty($extras) || !is_array($extras)) {
            return;
        }

        foreach ($extras as $extra) {
            if (!empty($extra['description'])) {
                $this->db->insert('deposit_extras', [
                    'bookings_deposit_id' => $depositId,
                    'description' => $extra['description'],
                    'net_price' => floatval($extra['net_price'] ?? 0),
                    'sale_price' => floatval($extra['sale_price'] ?? 0),
                    'quantity' => intval($extra['quantity'] ?? 1),
                    'total_amount' => floatval($extra['total_amount'] ?? 0)
                ]);
            }
        }
    }

    /**
     * Get deposit routes data
     */
    private function getDepositRoutes($depositId)
    {
        $result = $this->db->select(
            "SELECT * FROM deposit_routes WHERE bookings_deposit_id = :depositId ORDER BY id",
            ['depositId' => $depositId]
        );
        return $result['success'] && !empty($result['data']) ? $result['data'] : [];
    }

    /**
     * Get deposit extras data
     */
    private function getDepositExtras($depositId)
    {
        $result = $this->db->select(
            "SELECT * FROM deposit_extras WHERE bookings_deposit_id = :depositId ORDER BY id",
            ['depositId' => $depositId]
        );
        return $result['success'] && !empty($result['data']) ? $result['data'] : [];
    }

    private function updateDepositRoutes($depositId, $routes)
    {
        if (empty($routes) || !is_array($routes)) {
            return;
        }

        // ลบ routes เก่าออกทั้งหมด
        $this->db->delete('deposit_routes', 'bookings_deposit_id = :depositId', ['depositId' => $depositId]);

        // Insert routes ใหม่
        $this->insertDepositRoutes($depositId, $routes);
    }

    private function updateDepositExtras($depositId, $extras)
    {
        if (empty($extras) || !is_array($extras)) {
            return;
        }

        // ลบ extras เก่าออกทั้งหมด
        $this->db->delete('deposit_extras', 'bookings_deposit_id = :depositId', ['depositId' => $depositId]);

        // Insert extras ใหม่
        $this->insertDepositExtras($depositId, $extras);
    }

    /**
     * Generate multi-segment route display (same as TicketInvoiceHandler)
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
}
