<?php
// api/handlers/VoucherHandler.php
// Complete Voucher Handler - Simplified Version
// 1. ไม่มี RC/PO operations
// 2. trip_date เป็น varchar - รับค่าอะไรก็ได้
// 3. ไม่ INSERT voucher_additional_info

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/BaseHandler.php';

/**
 * VoucherHandler Class - Simplified Version
 * Focus เฉพาะ voucher operations พื้นฐาน
 */
class VoucherHandler extends BaseHandler
{
    public function __construct()
    {
        try {
            error_log("VoucherHandler: Constructor starting...");
            parent::__construct();
            error_log("VoucherHandler: Parent constructor completed");

            if (!$this->db->isConnected()) {
                error_log("VoucherHandler: Database connection failed");
                throw new Exception("Database connection failed in VoucherHandler");
            }
            error_log("VoucherHandler: Constructor completed successfully");
        } catch (Exception $e) {
            error_log("VoucherHandler Constructor Error: " . $e->getMessage());
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
                case 'generateVCForVoucher':
                    return $this->generateVCForVoucher();
                case 'createVoucher':
                    return $this->createVoucher();
                case 'getVoucherById':
                    return $this->getVoucherById();
                case 'getVoucherForEdit':
                    return $this->getVoucherForEdit();
                case 'getVouchersList':
                    return $this->getVouchersList();
                case 'getVoucherForView':
                    return $this->getVoucherForView();
                case 'updateVoucherStatus':
                    return $this->updateVoucherStatus();
                case 'updateVoucherComplete':
                    return $this->updateVoucherComplete();
                case 'cancelVoucher':
                    return $this->cancelVoucher();
                case 'generateVoucherReferenceNumber':
                    return $this->generateVoucherReferenceNumber();
                case 'getVoucherSuppliers':
                    return $this->getVoucherSuppliers();


                default:
                    return $this->errorResponse("Unknown voucher action: {$action}");
            }
        } catch (Exception $e) {
            logMessage("VoucherHandler Error ({$action}): " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Voucher operation failed: " . $e->getMessage());
        }
    }

    /**
     * Generate voucher reference number based on service type
     */
    private function generateVoucherReferenceNumber()
    {
        $serviceType = $_REQUEST['serviceType'] ?? 'bus';

        $prefixMap = [
            'bus' => 'BS',
            'boat' => 'BT',
            'tour' => 'TR'
        ];

        $prefix = $prefixMap[$serviceType] ?? 'BS';

        $result = $this->db->generateReferenceNumber(
            'bookings_voucher',
            $prefix,
            'reference_number'
        );

        if ($result['success']) {
            return $this->successResponse([
                'reference_number' => $result['reference_number'],
                'service_type' => $serviceType,
                'prefix' => $prefix
            ]);
        }

        return $this->errorResponse("Failed to generate voucher reference number");
    }

    /**
     * Create new voucher booking - SIMPLIFIED VERSION
     */
    private function createVoucher()
    {
        try {
            logMessage("=== VoucherHandler createVoucher START (FIXED) ===", 'INFO');

            // 1. Get and validate data
            $data = $this->request['data'] ?? [];
            logMessage("Received data: " . json_encode($data), 'INFO');

            // 2. Validate required fields
            $required = ['customerId', 'serviceType'];
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
                $serviceType = $data['serviceType'];
                $prefixMap = ['bus' => 'BS', 'boat' => 'BT', 'tour' => 'TR'];
                $prefix = $prefixMap[$serviceType] ?? 'BS';

                logMessage("🔄 Generating reference number with prefix: {$prefix}", 'INFO');
                $refResult = $this->db->generateReferenceNumber('bookings_voucher', $prefix, 'reference_number');

                if (!$refResult['success']) {
                    throw new Exception("Failed to generate reference number: " . ($refResult['error'] ?? 'Unknown'));
                }
                $referenceNumber = $refResult['reference_number'];
                logMessage("✅ Generated reference: {$referenceNumber}", 'INFO');

                // 6. Insert main voucher record with FIXED data types
                $voucherData = [
                    'reference_number' => $referenceNumber,
                    'customer_id' => intval($data['customerId']), // ✅ Fix: Convert to int
                    'information_id' => isset($data['supplierId']) ? intval($data['supplierId']) : null, // ✅ Fix: Convert to int
                    'service_type' => $serviceType,
                    'status' => $data['status'] ?? 'not_invoiced',
                    'payment_status' => $data['paymentStatus'] ?? 'unpaid',
                    'issue_date' => $this->convertToMySQLDate($data['issueDate'] ?? null), // ✅ Fix: Date conversion
                    'due_date' => $this->convertToMySQLDate($data['dueDate'] ?? null), // ✅ Fix: Date conversion
                    'credit_days' => intval($data['creditDays'] ?? 0), // ✅ Fix: Convert to int
                    'created_by' => isset($data['createdBy']) ? intval($data['createdBy']) : null, // ✅ Fix: Convert to int
                    'updated_by' => isset($data['updatedBy']) ? intval($data['updatedBy']) : null // ✅ Fix: Convert to int
                ];

                logMessage("🔄 Inserting voucher data: " . json_encode($voucherData), 'INFO');
                $voucherResult = $this->db->insert('bookings_voucher', $voucherData);

                if (!$voucherResult['success']) {
                    throw new Exception("Failed to create voucher booking: " . ($voucherResult['error'] ?? 'Unknown error'));
                }
                $voucherId = $voucherResult['id'];
                logMessage("✅ Created voucher ID: {$voucherId}", 'INFO');

                // 7. Calculate totals with FIXED data types
                $grandTotal = 0.00;
                $pricingTotal = 0.00;
                $extrasTotal = 0.00;
                $vatAmount = 0.00;

                // Calculate pricing totals with proper type conversion
                if (!empty($data['pricing'])) {
                    $pricing = $data['pricing'];
                    $pricingTotal = (floatval($pricing['adult']['sale'] ?? 0) * intval($pricing['adult']['pax'] ?? 0)) +
                        (floatval($pricing['child']['sale'] ?? 0) * intval($pricing['child']['pax'] ?? 0)) +
                        (floatval($pricing['infant']['sale'] ?? 0) * intval($pricing['infant']['pax'] ?? 0));
                }

                // Calculate extras total
                if (!empty($data['extras'])) {
                    foreach ($data['extras'] as $extra) {
                        $extrasTotal += floatval($extra['total_amount'] ?? 0);
                    }
                }

                // Calculate final totals
                $subtotalBeforeVat = $pricingTotal + $extrasTotal;
                $vatPercent = floatval($data['vatPercent'] ?? 0); // ✅ Fix: Convert to float
                $vatAmount = ($subtotalBeforeVat * $vatPercent) / 100;
                $grandTotal = $subtotalBeforeVat + $vatAmount;

                logMessage("✅ Calculated totals - Subtotal: {$subtotalBeforeVat}, VAT: {$vatAmount}, Grand: {$grandTotal}", 'INFO');

                // 8. INSERT VOUCHER_DETAILS with FIXED data types
                $detailsData = [
                    'bookings_voucher_id' => $voucherId,
                    'description' => $data['details']['description'] ?? null,
                    'trip_date' => $data['details']['tripDate'] ?? null, // ✅ VARCHAR - รับค่าอะไรก็ได้
                    'pickup_time' => $data['details']['pickupTime'] ?? null,
                    'hotel' => $data['details']['hotel'] ?? null,
                    'room_no' => $data['details']['roomNo'] ?? null,
                    'reference' => $data['details']['reference'] ?? null,
                    'remark' => $data['details']['remark'] ?? null,
                    'subtotal_before_vat' => $subtotalBeforeVat,
                    'extras_total' => $extrasTotal,
                    'pricing_total' => $pricingTotal,
                    'vat_amount' => $vatAmount,
                    'vat_percent' => $vatPercent,
                    'grand_total' => $grandTotal
                ];

                logMessage("🔄 Inserting voucher_details: " . json_encode($detailsData), 'INFO');
                $detailsResult = $this->db->insert('voucher_details', $detailsData);

                if (!$detailsResult['success']) {
                    throw new Exception("Failed to insert voucher details: " . ($detailsResult['error'] ?? 'Unknown'));
                }
                logMessage("✅ Inserted voucher_details successfully", 'INFO');

                // 9. INSERT VOUCHER_PASSENGERS
                if (!empty($data['passengers'])) {
                    logMessage("🔄 Processing " . count($data['passengers']) . " passengers", 'INFO');

                    foreach ($data['passengers'] as $index => $passenger) {
                        if (!empty($passenger['name'])) {
                            $passengerData = [
                                'bookings_voucher_id' => $voucherId,
                                'passenger_name' => $passenger['name'],
                                'passenger_type' => $passenger['type'] ?? 'ADT',
                                'voucher_number' => $passenger['voucherNumber'] ?? null
                            ];

                            logMessage("🔄 Inserting passenger {$index}: " . json_encode($passengerData), 'INFO');
                            $passengerResult = $this->db->insert('voucher_passengers', $passengerData);

                            if (!$passengerResult['success']) {
                                throw new Exception("Failed to insert passenger {$index}: " . ($passengerResult['error'] ?? 'Unknown'));
                            }
                            logMessage("✅ Inserted passenger {$index} successfully", 'INFO');
                        }
                    }
                }

                // 10. INSERT VOUCHER_PRICING with FIXED data types
                if (!empty($data['pricing'])) {
                    $pricing = $data['pricing'];

                    $pricingData = [
                        'bookings_voucher_id' => $voucherId,
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
                        'vat_percent' => floatval($vatPercent),
                        'subtotal_amount' => $pricingTotal,
                        'vat_amount' => $vatAmount,
                        'total_amount' => $grandTotal
                    ];

                    logMessage("🔄 Inserting voucher_pricing: " . json_encode($pricingData), 'INFO');
                    $pricingResult = $this->db->insert('voucher_pricing', $pricingData);

                    if (!$pricingResult['success']) {
                        throw new Exception("Failed to insert voucher pricing: " . ($pricingResult['error'] ?? 'Unknown'));
                    }
                    logMessage("✅ Inserted voucher_pricing successfully", 'INFO');
                }

                // ✅ 11. INSERT VOUCHER_ADDITIONAL_INFO (เพิ่มกลับมา)
                $additionalInfoData = [
                    'bookings_voucher_id' => $voucherId,
                    'company_payment_method' => $data['companyPaymentMethod'] ?? null,
                    'company_payment_details' => $data['companyPaymentDetails'] ?? null,
                    'customer_payment_method' => $data['customerPaymentMethod'] ?? null,
                    'customer_payment_details' => $data['customerPaymentDetails'] ?? null
                ];

                logMessage("🔄 Inserting voucher_additional_info: " . json_encode($additionalInfoData), 'INFO');
                $additionalInfoResult = $this->db->insert('voucher_additional_info', $additionalInfoData);

                if (!$additionalInfoResult['success']) {
                    throw new Exception("Failed to insert voucher additional info: " . ($additionalInfoResult['error'] ?? 'Unknown'));
                }
                logMessage("✅ Inserted voucher_additional_info successfully", 'INFO');

                // 12. Commit transaction (เปลี่ยนเลขลำดับจาก 11 เป็น 12)
                logMessage("🔄 Committing transaction", 'INFO');
                $this->db->commit();
                logMessage("✅ Transaction committed successfully", 'INFO');

                // 12.5. Log activity
                $userId = $data['createdBy'] ?? null;
                $this->logActivity('voucher', $voucherId, $referenceNumber, 'create', $userId);

                // 13. Return success response
                $result = [
                    'voucherId' => $voucherId,
                    'referenceNumber' => $referenceNumber,
                    'serviceType' => $serviceType,
                    'grandTotal' => $grandTotal,
                    'message' => 'Voucher created successfully'
                ];

                logMessage("✅ SUCCESS RESULT: " . json_encode($result), 'INFO');
                logMessage("=== VoucherHandler createVoucher END SUCCESS ===", 'INFO');

                return $this->successResponse($result);
            } catch (Exception $e) {
                logMessage("❌ Transaction Exception: " . $e->getMessage(), 'ERROR');

                if ($this->db) {
                    $this->db->rollback();
                    logMessage("🔄 Transaction rolled back", 'INFO');
                }

                return $this->errorResponse("Failed to create voucher: " . $e->getMessage());
            }
        } catch (Exception $e) {
            logMessage("❌ Fatal Exception in createVoucher: " . $e->getMessage(), 'ERROR');
            logMessage("=== VoucherHandler createVoucher END ERROR ===", 'ERROR');

            return $this->errorResponse("System error occurred while creating voucher. Please try again.");
        }
    }

    /**
     * Get voucher by ID
     */
    private function getVoucherById()
    {
        $voucherId = $_REQUEST['voucherId'] ?? null;
        $currentUserId = $_REQUEST['userId'] ?? null; // รับ userId จาก Frontend

        if (empty($voucherId)) {
            return $this->errorResponse("Voucher ID is required");
        }

        try {
            // ✅ Print = Edit: อัปเดต updated_by ก่อนดึงข้อมูล
            if ($currentUserId) {
                $updateData = [
                    'updated_by' => $currentUserId,
                    'updated_at' => date('Y-m-d H:i:s')
                ];

                $this->db->update(
                    'bookings_voucher',
                    $updateData,
                    'id = :id',
                    ['id' => $voucherId]
                );
                error_log("Updated voucher {$voucherId} with updated_by={$currentUserId} (Print action)");
            }

            // ✅ Get voucher with complete customer and supplier data
            $sql = "
    SELECT
        bv.*,
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
        i.numeric_code as supplier_numeric_code,
        i.phone as supplier_phone
    FROM bookings_voucher bv
    LEFT JOIN customers c ON bv.customer_id = c.id
    LEFT JOIN information i ON bv.information_id = i.id
    WHERE bv.id = :voucherId
";

            $voucherResult = $this->db->select($sql, ['voucherId' => $voucherId]);

            if (!$voucherResult['success'] || empty($voucherResult['data'])) {
                return $this->errorResponse("Voucher not found");
            }

            $voucher = $voucherResult['data'][0];

            // ✅ Get updated_by name separately
            $updatedByName = null;
            if (!empty($voucher['updated_by'])) {
                $userResult = $this->db->select(
                    "SELECT name FROM users WHERE id = :userId",
                    ['userId' => $voucher['updated_by']]
                );
                if ($userResult['success'] && !empty($userResult['data'])) {
                    $updatedByName = $userResult['data'][0]['name'];
                }
            }

            // ✅ Get voucher details
            $detailsResult = $this->db->select(
                "SELECT * FROM voucher_details WHERE bookings_voucher_id = :voucherId",
                ['voucherId' => $voucherId]
            );
            $details = $detailsResult['success'] && !empty($detailsResult['data']) ? $detailsResult['data'][0] : null;

            // ✅ Get passengers
            $passengersResult = $this->db->select(
                "SELECT * FROM voucher_passengers WHERE bookings_voucher_id = :voucherId ORDER BY id",
                ['voucherId' => $voucherId]
            );
            $passengers = $passengersResult['success'] ? $passengersResult['data'] : [];

            // ✅ Get pricing
            $pricingResult = $this->db->select(
                "SELECT * FROM voucher_pricing WHERE bookings_voucher_id = :voucherId",
                ['voucherId' => $voucherId]
            );
            $pricing = $pricingResult['success'] && !empty($pricingResult['data']) ? $pricingResult['data'][0] : null;

            // ✅ Get additional info (payment methods)
            $additionalInfoResult = $this->db->select(
                "SELECT * FROM voucher_additional_info WHERE bookings_voucher_id = :voucherId",
                ['voucherId' => $voucherId]
            );
            $additionalInfo = $additionalInfoResult['success'] && !empty($additionalInfoResult['data']) ? $additionalInfoResult['data'][0] : null;

            $overrideResult = $this->db->select(
                "SELECT customer_override_data FROM bookings_voucher WHERE id = :id",
                ['id' => $voucherId]
            );

            $customerOverrideData = null;
            if ($overrideResult['success'] && !empty($overrideResult['data'])) {
                $customerOverrideData = $overrideResult['data'][0]['customer_override_data'];
            }

            // ✅ Return complete data structure
            return $this->successResponse([
                'voucher' => $voucher,
                'details' => $details,
                'passengers' => $passengers,
                'pricing' => $pricing,
                'additionalInfo' => $additionalInfo,
                'customer_override_data' => $customerOverrideData,
                'updatedByName' => $updatedByName,
                'issueDate' => $voucher['issue_date'] ?? null,
                'customer' => [
                    'id' => $voucher['customer_id'],
                    'name' => $voucher['customer_name'],
                    'address_line1' => $voucher['customer_address_line1'],
                    'address_line2' => $voucher['customer_address_line2'],
                    'address_line3' => $voucher['customer_address_line3'],
                    'phone' => $voucher['customer_phone'],
                    'id_number' => $voucher['customer_id_number'],
                    'branch_type' => $voucher['customer_branch_type'],
                    'branch_number' => $voucher['customer_branch_number'],
                    'code' => $voucher['customer_code'],
                    'email' => $voucher['customer_email'],
                    'customer_override_data' => $voucher['customer_override_data']
                ],
                // ✅ เพิ่ม supplier object สำหรับ compatibility
                'supplier' => [
                    'id' => $voucher['information_id'],
                    'name' => $voucher['supplier_name'],
                    'code' => $voucher['supplier_code'],
                    'numeric_code' => $voucher['supplier_numeric_code'],
                    'phone' => $voucher['supplier_phone'],
                ]
            ]);
        } catch (Exception $e) {
            logMessage("Get voucher by ID error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to retrieve voucher: " . $e->getMessage());
        }
    }

    /**
     * Get vouchers list
     */
    private function getVouchersList()
    {
        $filters = $_REQUEST['filters'] ?? [];
        $limit = $_REQUEST['limit'] ?? 50;
        $offset = $_REQUEST['offset'] ?? 0;
        $filterServiceType = $_REQUEST['filterServiceType'] ?? 'all';
        $filterStatus = $_REQUEST['filterStatus'] ?? 'all';
        $searchTerm = $_REQUEST['searchTerm'] ?? '';

        // ✅ Fix: อ่าน startDate/endDate ตรงจาก $_REQUEST (เหมือน OverviewHandler)
        $startDate = $_REQUEST['startDate'] ?? null;
        $endDate = $_REQUEST['endDate'] ?? null;

        try {
            // 🔥 แก้ไข: รวม UNION ของ Voucher + Other Services ที่มี VC Number
            $sql = "
        SELECT 
            'voucher' as source_type,
            bv.id,
            bv.reference_number,
            bv.service_type,
            bv.status,
            bv.payment_status,
            bv.created_at,
            bv.updated_at,
            bv.vc_number,
            bv.vc_generated_at,
            bv.cancelled_at,
            bv.cancelled_by,
            bv.cancel_reason,
            c.name as customer_name,
            c.code as customer_code,
            i.name as supplier_name,
            i.code as supplier_code,
            vd.grand_total,
            vd.trip_date,
            vd.hotel,
            vd.description,
            vd.pickup_time,
            vd.reference as voucher_reference,
            vd.remark,
            u_cancelled.fullname as cancelled_by_name
        FROM bookings_voucher bv
        LEFT JOIN customers c ON bv.customer_id = c.id
        LEFT JOIN information i ON bv.information_id = i.id
        LEFT JOIN voucher_details vd ON bv.id = vd.bookings_voucher_id
        LEFT JOIN users u_cancelled ON bv.cancelled_by = u_cancelled.id

        UNION ALL

        SELECT 
            'other' as source_type,
            bo.id,
            bo.reference_number,
            bo.service_type,
            bo.status,
            bo.payment_status,
            bo.created_at,
            bo.updated_at,
            bo.vc_number,
            bo.vc_generated_at,
            bo.cancelled_at,
            bo.cancelled_by,
            bo.cancel_reason,
            c.name as customer_name,
            c.code as customer_code,
            i.name as supplier_name,
            i.code as supplier_code,
            od.grand_total,
            od.service_date as trip_date,
            od.hotel_name as hotel,
            od.description,
            NULL as pickup_time,
            od.reference_code as voucher_reference,
            od.remark,
            u_cancelled.fullname as cancelled_by_name
        FROM bookings_other bo
        LEFT JOIN customers c ON bo.customer_id = c.id
        LEFT JOIN information i ON bo.information_id = i.id
        LEFT JOIN other_details od ON bo.id = od.bookings_other_id
        LEFT JOIN users u_cancelled ON bo.cancelled_by = u_cancelled.id
        WHERE bo.vc_number IS NOT NULL
        ";

            $params = [];

            // Wrap UNION in subquery for filtering
            $sql = "SELECT * FROM ($sql) as combined_data WHERE 1=1";

            // 🔥 Status Filter - แสดงเฉพาะที่มี VC
            if ($filterStatus === 'voucher_issued') {
                $sql .= " AND vc_number IS NOT NULL";
            } elseif ($filterStatus === 'all_except_cancelled') {
                $sql .= " AND status != 'cancelled'";
            } elseif (!empty($filterStatus) && $filterStatus !== 'all') {
                $sql .= " AND status = :status";
                $params['status'] = $filterStatus;
            }

            // Service Type Filter
            if (!empty($filterServiceType) && $filterServiceType !== 'all') {
                // ✅ รองรับ special value 'bus_boat_tour' = กรองเฉพาะ bus, boat, tour (ไม่รวม other)
                if ($filterServiceType === 'bus_boat_tour') {
                    $sql .= " AND service_type IN ('bus', 'boat', 'tour')";
                } else {
                    $sql .= " AND service_type = :serviceType";
                    $params['serviceType'] = $filterServiceType;
                }
            }

            // Search Term
            if (!empty($searchTerm)) {
                $sql .= " AND (
                reference_number LIKE :search1 OR 
                customer_name LIKE :search2 OR 
                customer_code LIKE :search3 OR
                hotel LIKE :search4 OR
                description LIKE :search5 OR
                vc_number LIKE :search6
            )";
                $searchPattern = '%' . $searchTerm . '%';
                $params['search1'] = $searchPattern;
                $params['search2'] = $searchPattern;
                $params['search3'] = $searchPattern;
                $params['search4'] = $searchPattern;
                $params['search5'] = $searchPattern;
                $params['search6'] = $searchPattern;
            }

            // Date Range Filter - ✅ Fixed: ใช้ $startDate/$endDate แทน $filters
            if (!empty($startDate) && !empty($endDate)) {
                $sql .= " AND created_at BETWEEN :startDate AND :endDate";
                $params['startDate'] = $startDate;
                $params['endDate'] = $endDate;
            }

            // Sorting
            $sortField = $_REQUEST['sortField'] ?? 'created_at';
            $sortDirection = $_REQUEST['sortDirection'] ?? 'desc';

            $sortFieldMap = [
                'customer' => 'customer_name',
                'supplier' => 'supplier_name',
                'service_type' => 'service_type',
                'status' => 'status',
                'created_at' => 'created_at',
                'vc_number' => 'vc_number',
                'id' => 'reference_number'
            ];

            $dbSortField = $sortFieldMap[$sortField] ?? 'created_at';
            $sql .= " ORDER BY {$dbSortField} {$sortDirection}";

            // Pagination
            $sql .= " LIMIT :limit OFFSET :offset";
            $params['limit'] = (int)$limit;
            $params['offset'] = (int)$offset;

            $result = $this->db->select($sql, $params);

            if ($result['success']) {
                // 🔥 Process data ตาม source_type
                $processedData = array_map(function ($item) {
                    return $this->enhanceVoucherDataForView($item);
                }, $result['data']);

                return $this->successResponse($processedData);
            }

            return $this->errorResponse("Failed to retrieve vouchers list");
        } catch (Exception $e) {
            logMessage("Get vouchers list error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to retrieve vouchers: " . $e->getMessage());
        }
    }

    /**
     * ⭐ เพิ่ม method ใหม่: เสริมข้อมูลสำหรับ View component
     */
    private function enhanceVoucherDataForView($item)
    {
        // 🔥 แก้ไข: Handle ทั้ง voucher และ other services
        $sourceType = $item['source_type'] ?? 'voucher';
        $tableName = ($sourceType === 'voucher') ? 'voucher_passengers' : 'other_passengers';
        $idColumn = ($sourceType === 'voucher') ? 'bookings_voucher_id' : 'bookings_other_id';

        // ดึงข้อมูล passengers
        $passengersResult = $this->db->select(
            "SELECT passenger_name, passenger_type FROM {$tableName} WHERE {$idColumn} = :itemId ORDER BY id",
            ['itemId' => $item['id']]
        );

        $passengers = $passengersResult['success'] ? $passengersResult['data'] : [];

        // สร้าง customer object
        $customer = null;
        if (!empty($item['customer_name'])) {
            $customer = [
                'id' => $item['customer_id'] ?? null,
                'name' => $item['customer_name'],
                'code' => $item['customer_code']
            ];
        }

        // สร้าง supplier object
        $supplier = null;
        if (!empty($item['supplier_name'])) {
            $supplier = [
                'id' => $item['information_id'] ?? null,
                'name' => $item['supplier_name'],
                'code' => $item['supplier_code']
            ];
        }

        // สร้าง details object
        $details = [
            'hotel' => $item['hotel'] ?? null,
            'trip_date' => $item['trip_date'] ?? null,
            'description' => $item['description'] ?? null,
            'pickup_time' => $item['pickup_time'] ?? null,
            'reference' => $item['voucher_reference'] ?? null,
            'remark' => $item['remark'] ?? null
        ];

        return [
            'id' => $item['id'],
            'source_type' => $sourceType, // 🔥 เพิ่ม field นี้
            'reference_number' => $item['reference_number'],
            'service_type' => $item['service_type'],
            'status' => $item['status'],
            'payment_status' => $item['payment_status'],
            'created_at' => $item['created_at'],
            'updated_at' => $item['updated_at'],
            'grand_total' => $item['grand_total'],
            'customer' => $customer,
            'supplier' => $supplier,
            'details' => $details,
            'passengers' => $passengers,
            'vc_number' => $item['vc_number'] ?? null,
            'vc_generated_at' => $item['vc_generated_at'] ?? null,
            'cancelled_at' => $item['cancelled_at'],
            'cancelled_by' => $item['cancelled_by'],
            'cancelled_by_name' => $item['cancelled_by_name'] ?? null,
            'cancel_reason' => $item['cancel_reason']
        ];
    }

    /**
     * ⭐ เพิ่ม method ใหม่: ดึงข้อมูล voucher detail สำหรับ View
     */
    private function getVoucherForView()
    {
        $voucherId = $_REQUEST['voucherId'] ?? null;

        if (empty($voucherId)) {
            return $this->errorResponse("Voucher ID is required");
        }

        try {
            // Get main voucher data
            $voucherResult = $this->getVoucherById();

            if (!$voucherResult['success']) {
                return $voucherResult;
            }

            $voucherData = $voucherResult['data'];

            // ⭐ เพิ่มข้อมูลเสริมสำหรับ View
            $enhancedData = [
                'voucher' => $voucherData['voucher'],
                'details' => $voucherData['details'],
                'passengers' => $voucherData['passengers'],
                'pricing' => $voucherData['pricing'],

                // ⭐ เพิ่ม additional info (ถ้ามี)
                'additionalInfo' => $this->getVoucherAdditionalInfo($voucherId)
            ];

            return $this->successResponse($enhancedData);
        } catch (Exception $e) {
            logMessage("Get voucher for view error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to retrieve voucher: " . $e->getMessage());
        }
    }

    /**
     * ⭐ เพิ่ม method ใหม่: ดึง additional info
     */
    private function getVoucherAdditionalInfo($voucherId)
    {
        $result = $this->db->select(
            "SELECT * FROM voucher_additional_info WHERE bookings_voucher_id = :voucherId",
            ['voucherId' => $voucherId]
        );

        return $result['success'] && !empty($result['data']) ? $result['data'][0] : null;
    }

    /**
     * Get voucher suppliers
     */
    private function getVoucherSuppliers()
    {
        $search = $_REQUEST['search'] ?? '';
        $limit = $_REQUEST['limit'] ?? 100;

        try {
            // ✅ Changed from 'supplier-voucher' to 'supplier-other' (2026-01-09)
            // Reason: Voucher and Other suppliers are now unified
            $category = 'supplier-other';

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

            return $this->errorResponse("Failed to retrieve voucher suppliers");
        } catch (Exception $e) {
            logMessage("Get voucher suppliers error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to retrieve suppliers: " . $e->getMessage());
        }
    }

    /**
     * Update voucher status
     */
    private function updateVoucherStatus()
    {
        $voucherId = $this->request['voucherId'] ?? null;
        $status = $this->request['status'] ?? null;
        $userId = $this->request['userId'] ?? null;
        $cancelReason = $this->request['cancelReason'] ?? '';;

        if (empty($voucherId) || empty($status)) {
            return $this->errorResponse("Voucher ID and status are required");
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
                'bookings_voucher',
                $updateData,
                'id = :id',
                ['id' => $voucherId]
            );

            if ($result['success']) {
                return $this->successResponse([
                    'message' => 'Voucher status updated successfully',
                    'status' => $status
                ]);
            }

            return $this->errorResponse("Failed to update voucher status");
        } catch (Exception $e) {
            logMessage("Update voucher status error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to update status: " . $e->getMessage());
        }
    }

    /**
     * Cancel voucher
     */
    private function cancelVoucher()
    {
        // ✅ เปลี่ยนจาก $_REQUEST เป็น $this->request
        $voucherId = $this->request['voucherId'] ?? null;
        $userId = $this->request['userId'] ?? null;
        $cancelReason = $this->request['cancelReason'] ?? '';

        // ✅ เปลี่ยนให้ส่งผ่าน $this->request แทน $_REQUEST
        $this->request['status'] = 'cancelled';

        $result = $this->updateVoucherStatus();

        // Log activity after successful cancellation (ใช้ VC Number แทน reference_number)
        if ($result['success']) {
            $refResult = $this->db->getById('bookings_voucher', $voucherId, 'vc_number, reference_number');
            $vcNumber = $refResult['data']['vc_number'] ?? $refResult['data']['reference_number'] ?? null;
            $this->logActivity('voucher', $voucherId, $vcNumber, 'cancel', $userId);
        }

        return $result;
    }
    /**
     * ✅ Helper method to convert various date formats to MySQL date format
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
    private function getVoucherForEdit()
    {
        // ใช้ logic เดียวกับ getVoucherById
        return $this->getVoucherById();
    }

    /**
     * ⭐ เพิ่ม method ใหม่: Update voucher complete
     */
    private function updateVoucherComplete()
    {
        logMessage("=== updateVoucherComplete DEBUG ===", 'INFO');
        logMessage("Received this->request: " . json_encode($this->request), 'INFO');

        $voucherId = $this->request['id'] ?? $this->request['voucherId'] ?? null;
        $updateData = $this->request['data'] ?? [];

        logMessage("Extracted voucherId: " . $voucherId, 'INFO');
        logMessage("Extracted updateData keys: " . json_encode(array_keys($updateData)), 'INFO');

        if (empty($voucherId)) {
            logMessage("❌ No voucherId found in request", 'ERROR');
            return $this->errorResponse("Voucher ID is required");
        }

        try {
            logMessage("=== UpdateVoucherComplete START ===", 'INFO');

            // Start transaction
            $this->db->beginTransaction();

            // 1. Update main voucher
            if (!empty($updateData['mainVoucher'])) {
                $mainVoucherData = $updateData['mainVoucher'];

                $result = $this->db->update(
                    'bookings_voucher',
                    $mainVoucherData,
                    'id = :id',
                    ['id' => $voucherId]
                );

                if (!$result['success']) {
                    throw new Exception("Failed to update main voucher: " . ($result['error'] ?? 'Unknown'));
                }
            }

            // 2. Update voucher details
            if (!empty($updateData['voucherDetails'])) {
                $detailsData = $updateData['voucherDetails'];

                $result = $this->db->update(
                    'voucher_details',
                    $detailsData,
                    'bookings_voucher_id = :id',
                    ['id' => $voucherId]
                );

                if (!$result['success']) {
                    throw new Exception("Failed to update voucher details: " . ($result['error'] ?? 'Unknown'));
                }
            }

            // 3. Update additional info
            if (!empty($updateData['additionalInfo'])) {
                $additionalData = $updateData['additionalInfo'];

                $result = $this->db->update(
                    'voucher_additional_info',
                    $additionalData,
                    'bookings_voucher_id = :id',
                    ['id' => $voucherId]
                );

                if (!$result['success']) {
                    throw new Exception("Failed to update additional info: " . ($result['error'] ?? 'Unknown'));
                }
            }

            // 4. Update pricing
            if (!empty($updateData['pricing'])) {
                $pricingData = $updateData['pricing'];

                $result = $this->db->update(
                    'voucher_pricing',
                    $pricingData,
                    'bookings_voucher_id = :id',
                    ['id' => $voucherId]
                );

                if (!$result['success']) {
                    throw new Exception("Failed to update pricing: " . ($result['error'] ?? 'Unknown'));
                }
            }

            if (isset($updateData['customerOverride'])) {
                $customerOverrideJson = null;
                if (!empty($updateData['customerOverride'])) {
                    $customerOverrideJson = json_encode($updateData['customerOverride']);
                }

                // Update voucher with override data
                $result = $this->db->update(
                    'bookings_voucher',
                    ['customer_override_data' => $customerOverrideJson],
                    'id = :id',
                    ['id' => $voucherId]
                );

                if (!$result['success']) {
                    throw new Exception("Failed to update customer override data: " . ($result['error'] ?? 'Unknown'));
                }
            }


            // 6. Update passengers (delete old, insert new)
            if (isset($updateData['passengers'])) {
                // Delete old passengers
                $deleteResult = $this->db->delete(
                    'voucher_passengers',
                    'bookings_voucher_id = :id',
                    ['id' => $voucherId]
                );

                if (!$deleteResult['success']) {
                    throw new Exception("Failed to delete old passengers: " . ($deleteResult['error'] ?? 'Unknown'));
                }

                // Insert new passengers
                foreach ($updateData['passengers'] as $passenger) {
                    $passengerData = [
                        'bookings_voucher_id' => $voucherId,
                        'passenger_name' => $passenger['passenger_name'],
                        'passenger_type' => $passenger['passenger_type'],
                        'voucher_number' => $passenger['voucher_number'] ?? null,
                    ];

                    $insertResult = $this->db->insert('voucher_passengers', $passengerData);

                    if (!$insertResult['success']) {
                        throw new Exception("Failed to insert passenger: " . ($insertResult['error'] ?? 'Unknown'));
                    }
                }
            }

            // Commit transaction
            $this->db->commit();
            logMessage("=== UpdateVoucherComplete SUCCESS ===", 'INFO');

            // Log activity (ใช้ VC Number แทน reference_number)
            $result = $this->db->getById('bookings_voucher', $voucherId, 'vc_number, reference_number');
            $vcNumber = $result['data']['vc_number'] ?? $result['data']['reference_number'] ?? null;
            $userId = $updateData['mainVoucher']['updated_by'] ?? null;
            $this->logActivity('voucher', $voucherId, $vcNumber, 'update', $userId);

            return $this->successResponse([
                'message' => 'Voucher updated successfully',
                'voucherId' => $voucherId
            ]);
        } catch (Exception $e) {
            $this->db->rollback();
            logMessage("UpdateVoucherComplete Error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to update voucher: " . $e->getMessage());
        }
    }
    /**
     * สร้าง VC Number สำหรับ voucher และอัปเดตสถานะ
     * Copy pattern จาก generatePOForTicket ใน TicketCoreHandler
     */
    private function generateVCForVoucher()
    {
        $voucherId = $this->request['voucherId'] ?? null;
        $userId = $this->request['userId'] ?? null;

        if (!$voucherId) {
            return $this->errorResponse('Voucher ID is required', 400);
        }

        try {
            // ตรวจสอบ voucher มีอยู่และมี VC หรือยัง
            $checkResult = $this->db->raw(
                "SELECT vc_number, vc_generated_at, status FROM bookings_voucher WHERE id = :id",
                ['id' => $voucherId]
            );

            if (!$checkResult['success'] || empty($checkResult['data'])) {
                return $this->errorResponse('Voucher not found', 404);
            }

            $voucher = $checkResult['data'][0];

            // ถ้ามี VC แล้ว return VC เดิม
            if ($voucher['vc_number']) {
                $this->logMessage("VC already exists for voucher ID: {$voucherId} - VC: {$voucher['vc_number']}");
                return $this->successResponse([
                    'vcNumber' => $voucher['vc_number'],
                    'isNew' => false,
                    'message' => 'VC Number already exists'
                ]);
            }

            // สร้าง VC Number ใหม่
            $vcResult = $this->db->generateReferenceNumber('bookings_voucher', 'VC', 'vc_number');
            if (!$vcResult['success']) {
                return $this->errorResponse('ไม่สามารถสร้าง VC Number ได้');
            }

            $vcNumber = $vcResult['reference_number'];

            // อัปเดต voucher ด้วย VC Number และเปลี่ยนสถานะ
            $updateResult = $this->db->update(
                'bookings_voucher',
                [
                    'vc_number' => $vcNumber,
                    'vc_generated_at' => date('Y-m-d H:i:s'),
                    'status' => 'voucher_issued'
                ],
                'id = :id',
                ['id' => $voucherId]
            );

            if (!$updateResult['success']) {
                return $this->errorResponse('ไม่สามารถบันทึก VC Number ได้');
            }

            // Log activity - issue VC (ใช้ VC Number ที่เพิ่งสร้าง)
            $this->logActivity('voucher', $voucherId, $vcNumber, 'issue', $userId);

            $this->logMessage("Generated new VC for voucher ID: {$voucherId} - VC: {$vcNumber}");
            return $this->successResponse([
                'vcNumber' => $vcNumber,
                'isNew' => true,
                'message' => 'VC Number generated successfully'
            ]);
        } catch (Exception $e) {
            $this->logMessage("Error generating VC: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to generate VC Number', 500);
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
     * Get display customer address with override support (combined format)
     */
    private function getDisplayCustomerAddress($mainData)
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

        // fallback ไปใช้ข้อมูลเดิม (รวม 3 บรรทัด)
        $addressParts = [
            $mainData['customer_address_line1'] ?? '',
            $mainData['customer_address_line2'] ?? '',
            $mainData['customer_address_line3'] ?? ''
        ];

        $addressParts = array_filter($addressParts, function ($part) {
            return !empty(trim($part));
        });

        return implode(' ', $addressParts);
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
}
