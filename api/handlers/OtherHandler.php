<?php
// api/handlers/OtherHandler.php
// Complete Other Services Handler - Based on VoucherHandler Pattern
// Support: 5 Service Types (Insurance, Hotel, Train, Visa, Other)

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/BaseHandler.php';

/**
 * OtherHandler Class - Based on VoucherHandler Pattern
 * Handles all Other Services operations (Insurance, Hotel, Train, Visa, Other)
 */
class OtherHandler extends BaseHandler
{
    public function __construct()
    {
        try {
            error_log("OtherHandler: Constructor starting...");
            parent::__construct();
            error_log("OtherHandler: Parent constructor completed");

            if (!$this->db->isConnected()) {
                error_log("OtherHandler: Database connection failed");
                throw new Exception("Database connection failed in OtherHandler");
            }
            error_log("OtherHandler: Constructor completed successfully");
        } catch (Exception $e) {
            error_log("OtherHandler Constructor Error: " . $e->getMessage());
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
                case 'createOther':
                    return $this->createOther();
                case 'getOtherById':
                    return $this->getOtherById();
                case 'getOtherForEdit':
                    return $this->getOtherForEdit();
                case 'getOthersList':
                    return $this->getOthersList();
                case 'getOtherForView':
                    return $this->getOtherForView();
                case 'updateOtherStatus':
                    return $this->updateOtherStatus();
                case 'updateOtherComplete':
                    return $this->updateOtherComplete();
                case 'cancelOther':
                    return $this->cancelOther();
                case 'generateOtherReferenceNumber':
                    return $this->generateOtherReferenceNumber();
                case 'getOtherSuppliers':
                    return $this->getOtherSuppliers();
                case 'generateVCForOther':
                    return $this->generateVCForOther();

                    // Individual service type reference number generation
                case 'generateInsuranceReferenceNumber':
                    return $this->generateServiceReferenceNumber('insurance');
                case 'generateHotelReferenceNumber':
                    return $this->generateServiceReferenceNumber('hotel');
                case 'generateTrainReferenceNumber':
                    return $this->generateServiceReferenceNumber('train');
                case 'generateVisaReferenceNumber':
                    return $this->generateServiceReferenceNumber('visa');
                case 'generateOtherServiceReferenceNumber':
                    return $this->generateServiceReferenceNumber('other');

                default:
                    return $this->errorResponse("Unknown other services action: {$action}");
            }
        } catch (Exception $e) {
            logMessage("OtherHandler Error ({$action}): " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Other services operation failed: " . $e->getMessage());
        }
    }

    /**
     * Generate reference number based on service type
     */
    private function generateOtherReferenceNumber()
    {
        $serviceType = $_REQUEST['serviceType'] ?? 'other';
        return $this->generateServiceReferenceNumber($serviceType);
    }

    /**
     * Generate service-specific reference number
     */
    private function generateServiceReferenceNumber($serviceType)
    {
        $prefixMap = [
            'insurance' => 'INS',
            'hotel' => 'HTL',
            'train' => 'TRN',
            'visa' => 'VSA',
            'other' => 'OTH'
        ];

        $prefix = $prefixMap[$serviceType] ?? 'OTH';

        $result = $this->db->generateReferenceNumber(
            'bookings_other',
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

        return $this->errorResponse("Failed to generate {$serviceType} reference number");
    }

    /**
     * Create new other services booking - Based on VoucherHandler Pattern
     */
    private function createOther()
    {
        try {
            logMessage("=== OtherHandler createOther START ===", 'INFO');

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
                $prefixMap = [
                    'insurance' => 'INS',
                    'hotel' => 'HTL',
                    'train' => 'TRN',
                    'visa' => 'VSA',
                    'other' => 'OTH'
                ];
                $prefix = $prefixMap[$serviceType] ?? 'OTH';

                logMessage("🔄 Generating reference number with prefix: {$prefix}", 'INFO');
                $refResult = $this->db->generateReferenceNumber('bookings_other', $prefix, 'reference_number');

                if (!$refResult['success']) {
                    throw new Exception("Failed to generate reference number: " . ($refResult['error'] ?? 'Unknown'));
                }
                $referenceNumber = $refResult['reference_number'];
                logMessage("✅ Generated reference: {$referenceNumber}", 'INFO');

                // 6. Insert main other services record
                $otherData = [
                    'reference_number' => $referenceNumber,
                    'customer_id' => intval($data['customerId']),
                    'information_id' => isset($data['supplierId']) ? intval($data['supplierId']) : null,
                    'service_type' => $serviceType,
                    'status' => $data['status'] ?? 'not_invoiced',
                    'payment_status' => $data['paymentStatus'] ?? 'unpaid',
                    'issue_date' => $this->convertToMySQLDate($data['issueDate'] ?? null),
                    'due_date' => $this->convertToMySQLDate($data['dueDate'] ?? null),
                    'credit_days' => intval($data['creditDays'] ?? 0),
                    'created_by' => isset($data['createdBy']) ? intval($data['createdBy']) : null,
                    'updated_by' => isset($data['updatedBy']) ? intval($data['updatedBy']) : null
                ];

                logMessage("🔄 Inserting other services data: " . json_encode($otherData), 'INFO');
                $otherResult = $this->db->insert('bookings_other', $otherData);

                if (!$otherResult['success']) {
                    throw new Exception("Failed to create other services booking: " . ($otherResult['error'] ?? 'Unknown error'));
                }
                $otherId = $otherResult['id'];
                logMessage("✅ Created other services ID: {$otherId}", 'INFO');

                // 7. Calculate totals
                $grandTotal = 0.00;
                $pricingTotal = 0.00;
                $extrasTotal = 0.00;
                $vatAmount = 0.00;

                // Calculate pricing totals
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
                $vatPercent = floatval($data['vatPercent'] ?? 0);
                $vatAmount = ($subtotalBeforeVat * $vatPercent) / 100;
                $grandTotal = $subtotalBeforeVat + $vatAmount;

                logMessage("✅ Calculated totals - Subtotal: {$subtotalBeforeVat}, VAT: {$vatAmount}, Grand: {$grandTotal}", 'INFO');

                // 8. INSERT OTHER_DETAILS
                $detailsData = [
                    'bookings_other_id' => $otherId,
                    'description' => $data['details']['description'] ?? null,
                    'service_date' => $data['details']['serviceDate'] ?? null,
                    'reference_code' => $data['details']['reference'] ?? null,
                    'hotel_name' => $data['details']['hotel'] ?? null,
                    'check_in_date' => $data['details']['checkIn'] ?? null,
                    'check_out_date' => $data['details']['checkOut'] ?? null,
                    'nights' => isset($data['details']['nights']) ? intval($data['details']['nights']) : null,
                    'country' => $data['details']['country'] ?? null,
                    'visa_type' => $data['details']['visaType'] ?? null,
                    'route' => $data['details']['route'] ?? null,
                    'departure_time' => $data['details']['departureTime'] ?? null,
                    'arrival_time' => $data['details']['arrivalTime'] ?? null,
                    'remark' => $data['details']['remark'] ?? null,
                    'subtotal_before_vat' => $subtotalBeforeVat,
                    'extras_total' => $extrasTotal,
                    'pricing_total' => $pricingTotal,
                    'vat_amount' => $vatAmount,
                    'vat_percent' => $vatPercent,
                    'grand_total' => $grandTotal
                ];

                logMessage("🔄 Inserting other_details: " . json_encode($detailsData), 'INFO');
                $detailsResult = $this->db->insert('other_details', $detailsData);

                if (!$detailsResult['success']) {
                    throw new Exception("Failed to insert other details: " . ($detailsResult['error'] ?? 'Unknown'));
                }
                logMessage("✅ Inserted other_details successfully", 'INFO');

                // 9. INSERT OTHER_PASSENGERS
                if (!empty($data['passengers'])) {
                    logMessage("🔄 Processing " . count($data['passengers']) . " passengers", 'INFO');

                    foreach ($data['passengers'] as $index => $passenger) {
                        if (!empty($passenger['name'])) {
                            $passengerData = [
                                'bookings_other_id' => $otherId,
                                'passenger_name' => $passenger['name'],
                                'passenger_type' => $passenger['type'] ?? 'ADT',
                                'service_number' => $passenger['serviceNumber'] ?? null
                            ];

                            logMessage("🔄 Inserting passenger {$index}: " . json_encode($passengerData), 'INFO');
                            $passengerResult = $this->db->insert('other_passengers', $passengerData);

                            if (!$passengerResult['success']) {
                                throw new Exception("Failed to insert passenger {$index}: " . ($passengerResult['error'] ?? 'Unknown'));
                            }
                            logMessage("✅ Inserted passenger {$index} successfully", 'INFO');
                        }
                    }
                }

                // 10. INSERT OTHER_PRICING
                if (!empty($data['pricing'])) {
                    $pricing = $data['pricing'];

                    $pricingData = [
                        'bookings_other_id' => $otherId,
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

                    logMessage("🔄 Inserting other_pricing: " . json_encode($pricingData), 'INFO');
                    $pricingResult = $this->db->insert('other_pricing', $pricingData);

                    if (!$pricingResult['success']) {
                        throw new Exception("Failed to insert other pricing: " . ($pricingResult['error'] ?? 'Unknown'));
                    }
                    logMessage("✅ Inserted other_pricing successfully", 'INFO');
                }

                // 11. INSERT OTHER_ADDITIONAL_INFO
                $additionalInfoData = [
                    'bookings_other_id' => $otherId,
                    'company_payment_method' => $data['companyPaymentMethod'] ?? null,
                    'company_payment_details' => $data['companyPaymentDetails'] ?? null,
                    'customer_payment_method' => $data['customerPaymentMethod'] ?? null,
                    'customer_payment_details' => $data['customerPaymentDetails'] ?? null,
                    'code' => $data['code'] ?? null
                ];

                logMessage("🔄 Inserting other_additional_info: " . json_encode($additionalInfoData), 'INFO');
                $additionalInfoResult = $this->db->insert('other_additional_info', $additionalInfoData);

                if (!$additionalInfoResult['success']) {
                    throw new Exception("Failed to insert other additional info: " . ($additionalInfoResult['error'] ?? 'Unknown'));
                }
                logMessage("✅ Inserted other_additional_info successfully", 'INFO');

                // 12. Commit transaction
                logMessage("🔄 Committing transaction", 'INFO');
                $this->db->commit();
                logMessage("✅ Transaction committed successfully", 'INFO');

                // 12.5. Log activity
                $userId = $data['createdBy'] ?? null;
                $this->logActivity('other', $otherId, $referenceNumber, 'create', $userId);

                // 13. Return success response
                $result = [
                    'otherId' => $otherId,
                    'referenceNumber' => $referenceNumber,
                    'serviceType' => $serviceType,
                    'grandTotal' => $grandTotal,
                    'message' => 'Other services booking created successfully'
                ];

                logMessage("✅ SUCCESS RESULT: " . json_encode($result), 'INFO');
                logMessage("=== OtherHandler createOther END SUCCESS ===", 'INFO');

                return $this->successResponse($result);
            } catch (Exception $e) {
                logMessage("❌ Transaction Exception: " . $e->getMessage(), 'ERROR');

                if ($this->db) {
                    $this->db->rollback();
                    logMessage("🔄 Transaction rolled back", 'INFO');
                }

                return $this->errorResponse("Failed to create other services booking: " . $e->getMessage());
            }
        } catch (Exception $e) {
            logMessage("❌ Fatal Exception in createOther: " . $e->getMessage(), 'ERROR');
            logMessage("=== OtherHandler createOther END ERROR ===", 'ERROR');

            return $this->errorResponse("System error occurred while creating other services booking. Please try again.");
        }
    }

    /**
     * Get other services by ID
     * ✅ Print = Edit: อัปเดต updated_by ทุกครั้งที่ Print
     */
    private function getOtherById()
    {
        $otherId = $_REQUEST['otherId'] ?? null;
        $printUserId = $_REQUEST['userId'] ?? null; // รับ userId จาก Frontend

        if (empty($otherId)) {
            return $this->errorResponse("Other services ID is required");
        }

        try {
            // ✅ Print = Edit: อัปเดต updated_by ก่อนดึงข้อมูล
            if ($printUserId) {
                $updateData = [
                    'updated_by' => $printUserId,
                    'updated_at' => date('Y-m-d H:i:s')
                ];

                $this->db->update(
                    'bookings_other',
                    $updateData,
                    'id = :id',
                    ['id' => $otherId]
                );
                error_log("Updated other service {$otherId} with updated_by={$printUserId} (Print action)");
            }

            // Get main record with customer and supplier data
            $sql = "
                SELECT 
                    bo.*,
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
                FROM bookings_other bo
                LEFT JOIN customers c ON bo.customer_id = c.id
                LEFT JOIN information i ON bo.information_id = i.id
                WHERE bo.id = :otherId
            ";

            $otherResult = $this->db->select($sql, ['otherId' => $otherId]);

            if (!$otherResult['success'] || empty($otherResult['data'])) {
                return $this->errorResponse("Other services record not found");
            }

            $other = $otherResult['data'][0];

            // Get details
            $detailsResult = $this->db->select(
                "SELECT * FROM other_details WHERE bookings_other_id = :otherId",
                ['otherId' => $otherId]
            );
            $details = $detailsResult['success'] && !empty($detailsResult['data']) ? $detailsResult['data'][0] : null;

            // Get passengers
            $passengersResult = $this->db->select(
                "SELECT * FROM other_passengers WHERE bookings_other_id = :otherId ORDER BY id",
                ['otherId' => $otherId]
            );
            $passengers = $passengersResult['success'] ? $passengersResult['data'] : [];

            // Get pricing
            $pricingResult = $this->db->select(
                "SELECT * FROM other_pricing WHERE bookings_other_id = :otherId",
                ['otherId' => $otherId]
            );
            $pricing = $pricingResult['success'] && !empty($pricingResult['data']) ? $pricingResult['data'][0] : null;

            // Get additional info
            $additionalInfoResult = $this->db->select(
                "SELECT * FROM other_additional_info WHERE bookings_other_id = :otherId",
                ['otherId' => $otherId]
            );
            $additionalInfo = $additionalInfoResult['success'] && !empty($additionalInfoResult['data']) ? $additionalInfoResult['data'][0] : null;

            // Get customer override data
            $overrideResult = $this->db->select(
                "SELECT customer_override_data FROM bookings_other WHERE id = :id",
                ['id' => $otherId]
            );

            $customerOverrideData = null;
            if ($overrideResult['success'] && !empty($overrideResult['data'])) {
                $customerOverrideData = $overrideResult['data'][0]['customer_override_data'];
            }

            // Return complete data structure
            return $this->successResponse([
                'other' => $other,
                'details' => $details,
                'passengers' => $passengers,
                'pricing' => $pricing,
                'additionalInfo' => $additionalInfo,
                'customer_override_data' => $customerOverrideData,
                'customer' => [
                    'id' => $other['customer_id'],
                    'name' => $other['customer_name'],
                    'address_line1' => $other['customer_address_line1'],
                    'address_line2' => $other['customer_address_line2'],
                    'address_line3' => $other['customer_address_line3'],
                    'phone' => $other['customer_phone'],
                    'id_number' => $other['customer_id_number'],
                    'branch_type' => $other['customer_branch_type'],
                    'branch_number' => $other['customer_branch_number'],
                    'code' => $other['customer_code'],
                    'email' => $other['customer_email'],
                    'customer_override_data' => $other['customer_override_data']
                ],
                'supplier' => [
                    'id' => $other['information_id'],
                    'name' => $other['supplier_name'],
                    'code' => $other['supplier_code'],
                    'numeric_code' => $other['supplier_numeric_code'],
                    'phone' => $other['supplier_phone'],
                ]
            ]);
        } catch (Exception $e) {
            logMessage("Get other services by ID error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to retrieve other services record: " . $e->getMessage());
        }
    }

    /**
     * Get other services for edit (same as getOtherById)
     */
    private function getOtherForEdit()
    {
        return $this->getOtherById();
    }

    /**
     * Get other services list with filters
     */
    private function getOthersList()
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
            $sql = "
    SELECT 
        bo.*,
        c.name as customer_name,
        c.code as customer_code,
        i.name as supplier_name,
        i.code as supplier_code,
        od.grand_total,
        od.service_date,
        od.hotel_name,
        od.description,
        od.reference_code,
        od.remark,
        od.check_in_date,
        od.check_out_date,
        od.nights,
        u_cancelled.fullname as cancelled_by_name
    FROM bookings_other bo
    LEFT JOIN customers c ON bo.customer_id = c.id
    LEFT JOIN information i ON bo.information_id = i.id
    LEFT JOIN other_details od ON bo.id = od.bookings_other_id
    LEFT JOIN users u_cancelled ON bo.cancelled_by = u_cancelled.id
                WHERE 1=1
            ";

            $params = [];

            // Service Type Filter
            if (!empty($filterServiceType) && $filterServiceType !== 'all') {
                $sql .= " AND bo.service_type = :serviceType";
                $params['serviceType'] = $filterServiceType;
            }

            // Status Filter
            if ($filterStatus === 'all_except_cancelled') {
                $sql .= " AND bo.status != 'cancelled'";
            } elseif (!empty($filterStatus) && $filterStatus !== 'all') {
                $sql .= " AND bo.status = :status";
                $params['status'] = $filterStatus;
            }

            // Search Term
            if (!empty($searchTerm)) {
                $sql .= " AND (
                    bo.reference_number LIKE :search1 OR 
                    c.name LIKE :search2 OR 
                    c.code LIKE :search3 OR
                    od.hotel_name LIKE :search4 OR
                    od.description LIKE :search5 OR
                    od.reference_code LIKE :search6
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
                $sql .= " AND bo.created_at BETWEEN :startDate AND :endDate";
                $params['startDate'] = $startDate;
                $params['endDate'] = $endDate;
            }

            // Sorting
            $sortField = $_REQUEST['sortField'] ?? 'created_at';
            $sortDirection = $_REQUEST['sortDirection'] ?? 'desc';

            $sortFieldMap = [
                'customer' => 'c.name',
                'supplier' => 'i.name',
                'service_type' => 'bo.service_type',
                'status' => 'bo.status',
                'created_at' => 'bo.created_at',
                'id' => 'bo.reference_number'
            ];

            $dbSortField = $sortFieldMap[$sortField] ?? 'bo.created_at';
            $sql .= " ORDER BY {$dbSortField} {$sortDirection}";

            // Pagination
            $sql .= " LIMIT :limit OFFSET :offset";
            $params['limit'] = (int)$limit;
            $params['offset'] = (int)$offset;

            $result = $this->db->select($sql, $params);

            if ($result['success']) {
                $processedData = array_map(function ($other) {
                    return $this->enhanceOtherDataForView($other);
                }, $result['data']);

                return $this->successResponse($processedData);
            }

            return $this->errorResponse("Failed to retrieve other services list");
        } catch (Exception $e) {
            logMessage("Get other services list error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to retrieve other services: " . $e->getMessage());
        }
    }

    /**
     * Enhance other services data for view
     */
    private function enhanceOtherDataForView($other)
    {
        // Get passengers for display
        $passengersResult = $this->db->select(
            "SELECT passenger_name, passenger_type FROM other_passengers WHERE bookings_other_id = :otherId ORDER BY id",
            ['otherId' => $other['id']]
        );

        $passengers = $passengersResult['success'] ? $passengersResult['data'] : [];

        // Create customer object
        $customer = null;
        if ($other['customer_id']) {
            $customer = [
                'id' => $other['customer_id'],
                'name' => $other['customer_name'],
                'code' => $other['customer_code']
            ];
        }

        // Create supplier object  
        $supplier = null;
        if ($other['information_id']) {
            $supplier = [
                'id' => $other['information_id'],
                'name' => $other['supplier_name'],
                'code' => $other['supplier_code']
            ];
        }

        // Create details object
        $details = [
            'hotel_name' => $other['hotel_name'],
            'service_date' => $other['service_date'],
            'description' => $other['description'],
            'reference_code' => $other['reference_code'],
            'remark' => $other['remark'],
            'check_in_date' => $other['check_in_date'],
            'check_out_date' => $other['check_out_date'],
            'nights' => $other['nights']
        ];

        return [
            'id' => $other['id'],
            'reference_number' => $other['reference_number'],
            'service_type' => $other['service_type'],
            'status' => $other['status'],
            'payment_status' => $other['payment_status'],
            'created_at' => $other['created_at'],
            'updated_at' => $other['updated_at'],
            'grand_total' => $other['grand_total'],
            'customer' => $customer,
            'supplier' => $supplier,
            'details' => $details,
            'passengers' => $passengers,
            'vc_number' => $other['vc_number'] ?? null,
            'vc_generated_at' => $other['vc_generated_at'] ?? null,
            'cancelled_at' => $other['cancelled_at'],
            'cancelled_by' => $other['cancelled_by'],
            'cancelled_by_name' => $other['cancelled_by_name'] ?? null,
            'cancel_reason' => $other['cancel_reason']
        ];
    }

    /**
     * Get other services for view (detailed)
     */
    private function getOtherForView()
    {
        $otherId = $_REQUEST['otherId'] ?? null;

        if (empty($otherId)) {
            return $this->errorResponse("Other services ID is required");
        }

        try {
            $otherResult = $this->getOtherById();

            if (!$otherResult['success']) {
                return $otherResult;
            }

            $otherData = $otherResult['data'];

            $enhancedData = [
                'other' => $otherData['other'],
                'details' => $otherData['details'],
                'passengers' => $otherData['passengers'],
                'pricing' => $otherData['pricing'],
                'additionalInfo' => $this->getOtherAdditionalInfo($otherId)
            ];

            return $this->successResponse($enhancedData);
        } catch (Exception $e) {
            logMessage("Get other services for view error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to retrieve other services: " . $e->getMessage());
        }
    }

    /**
     * Get additional info for other services
     */
    private function getOtherAdditionalInfo($otherId)
    {
        $result = $this->db->select(
            "SELECT * FROM other_additional_info WHERE bookings_other_id = :otherId",
            ['otherId' => $otherId]
        );

        return $result['success'] && !empty($result['data']) ? $result['data'][0] : null;
    }

    /**
     * Get other services suppliers
     */
    private function getOtherSuppliers()
    {
        $search = $_REQUEST['search'] ?? '';
        $limit = $_REQUEST['limit'] ?? 100;
        $serviceType = $_REQUEST['serviceType'] ?? '';

        try {
            // 🔥 แก้ไข: ใช้ supplier-other เท่านั้น ไม่แบ่งตาม serviceType
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

            // 🔥 เพิ่ม debug log
            logMessage("getOtherSuppliers SQL: " . $sql, 'INFO');
            logMessage("getOtherSuppliers Params: " . json_encode($params), 'INFO');

            $result = $this->db->select($sql, $params);

            // 🔥 เพิ่ม debug log
            logMessage("getOtherSuppliers Result: " . json_encode($result), 'INFO');

            if ($result['success']) {
                return $this->successResponse($result['data']);
            }

            return $this->errorResponse("Failed to retrieve other services suppliers");
        } catch (Exception $e) {
            logMessage("Get other services suppliers error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to retrieve suppliers: " . $e->getMessage());
        }
    }

    /**
     * Update other services status
     */
    private function updateOtherStatus()
    {
        $otherId = $this->request['otherId'] ?? null;
        $status = $this->request['status'] ?? null;
        $userId = $this->request['userId'] ?? null;
        $cancelReason = $this->request['cancelReason'] ?? '';

        if (empty($otherId) || empty($status)) {
            return $this->errorResponse("Other services ID and status are required");
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
                'bookings_other',
                $updateData,
                'id = :id',
                ['id' => $otherId]
            );

            if ($result['success']) {
                return $this->successResponse([
                    'message' => 'Other services status updated successfully',
                    'status' => $status
                ]);
            }

            return $this->errorResponse("Failed to update other services status");
        } catch (Exception $e) {
            logMessage("Update other services status error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to update status: " . $e->getMessage());
        }
    }

    /**
     * Cancel other services booking
     */
    private function cancelOther()
    {
        $otherId = $this->request['otherId'] ?? null;
        $userId = $this->request['userId'] ?? null;
        $cancelReason = $this->request['cancelReason'] ?? '';

        // Set status to cancelled and use existing updateOtherStatus method
        $this->request['status'] = 'cancelled';

        $result = $this->updateOtherStatus();

        // Log activity after successful cancellation (ใช้ VC Number แทน reference_number)
        if ($result['success']) {
            $refResult = $this->db->getById('bookings_other', $otherId, 'vc_number, reference_number');
            $vcNumber = $refResult['data']['vc_number'] ?? $refResult['data']['reference_number'] ?? null;
            $this->logActivity('other', $otherId, $vcNumber, 'cancel', $userId);
        }

        return $result;
    }

    /**
     * Update other services complete (full update)
     */
    private function updateOtherComplete()
    {
        logMessage("=== updateOtherComplete DEBUG ===", 'INFO');
        logMessage("Received this->request: " . json_encode($this->request), 'INFO');

        $otherId = $this->request['id'] ?? $this->request['otherId'] ?? null;
        $updateData = $this->request['data'] ?? [];

        logMessage("Extracted otherId: " . $otherId, 'INFO');
        logMessage("Extracted updateData keys: " . json_encode(array_keys($updateData)), 'INFO');

        if (empty($otherId)) {
            logMessage("❌ No otherId found in request", 'ERROR');
            return $this->errorResponse("Other services ID is required");
        }

        try {
            logMessage("=== UpdateOtherComplete START ===", 'INFO');

            // Start transaction
            $this->db->beginTransaction();

            // 1. Update main other services record
            if (!empty($updateData['mainOther'])) {
                $mainOtherData = $updateData['mainOther'];

                $result = $this->db->update(
                    'bookings_other',
                    $mainOtherData,
                    'id = :id',
                    ['id' => $otherId]
                );

                if (!$result['success']) {
                    throw new Exception("Failed to update main other services record: " . ($result['error'] ?? 'Unknown'));
                }
            }

            // 2. Update other services details
            if (!empty($updateData['otherDetails'])) {
                $detailsData = $updateData['otherDetails'];

                $result = $this->db->update(
                    'other_details',
                    $detailsData,
                    'bookings_other_id = :id',
                    ['id' => $otherId]
                );

                if (!$result['success']) {
                    throw new Exception("Failed to update other services details: " . ($result['error'] ?? 'Unknown'));
                }
            }

            // 3. Update additional info
            if (!empty($updateData['additionalInfo'])) {
                $additionalData = $updateData['additionalInfo'];

                $result = $this->db->update(
                    'other_additional_info',
                    $additionalData,
                    'bookings_other_id = :id',
                    ['id' => $otherId]
                );

                if (!$result['success']) {
                    throw new Exception("Failed to update additional info: " . ($result['error'] ?? 'Unknown'));
                }
            }

            // 4. Update pricing
            if (!empty($updateData['pricing'])) {
                $pricingData = $updateData['pricing'];

                $result = $this->db->update(
                    'other_pricing',
                    $pricingData,
                    'bookings_other_id = :id',
                    ['id' => $otherId]
                );

                if (!$result['success']) {
                    throw new Exception("Failed to update pricing: " . ($result['error'] ?? 'Unknown'));
                }
            }

            // 5. Update customer override data
            if (isset($updateData['customerOverride'])) {
                $customerOverrideJson = null;
                if (!empty($updateData['customerOverride'])) {
                    $customerOverrideJson = json_encode($updateData['customerOverride']);
                }

                $result = $this->db->update(
                    'bookings_other',
                    ['customer_override_data' => $customerOverrideJson],
                    'id = :id',
                    ['id' => $otherId]
                );

                if (!$result['success']) {
                    throw new Exception("Failed to update customer override data: " . ($result['error'] ?? 'Unknown'));
                }
            }

            // 6. Update passengers (delete old, insert new)
            if (isset($updateData['passengers'])) {
                // Delete old passengers
                $deleteResult = $this->db->delete(
                    'other_passengers',
                    'bookings_other_id = :id',
                    ['id' => $otherId]
                );

                if (!$deleteResult['success']) {
                    throw new Exception("Failed to delete old passengers: " . ($deleteResult['error'] ?? 'Unknown'));
                }

                // Insert new passengers
                foreach ($updateData['passengers'] as $passenger) {
                    $passengerData = [
                        'bookings_other_id' => $otherId,
                        'passenger_name' => $passenger['passenger_name'],
                        'passenger_type' => $passenger['passenger_type'],
                        'service_number' => $passenger['service_number'] ?? null,
                    ];

                    $insertResult = $this->db->insert('other_passengers', $passengerData);

                    if (!$insertResult['success']) {
                        throw new Exception("Failed to insert passenger: " . ($insertResult['error'] ?? 'Unknown'));
                    }
                }
            }

            // Commit transaction
            $this->db->commit();
            logMessage("=== UpdateOtherComplete SUCCESS ===", 'INFO');

            // Log activity (ใช้ VC Number แทน reference_number)
            $result = $this->db->getById('bookings_other', $otherId, 'vc_number, reference_number');
            $vcNumber = $result['data']['vc_number'] ?? $result['data']['reference_number'] ?? null;
            $userId = $updateData['mainOther']['updated_by'] ?? null;
            $this->logActivity('other', $otherId, $vcNumber, 'update', $userId);

            return $this->successResponse([
                'message' => 'Other services updated successfully',
                'otherId' => $otherId
            ]);
        } catch (Exception $e) {
            $this->db->rollback();
            logMessage("UpdateOtherComplete Error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to update other services: " . $e->getMessage());
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
     * Get display customer address with override support
     */
    private function getDisplayCustomerAddress($mainData)
    {
        $override = $this->parseCustomerOverride($mainData['customer_override_data'] ?? null);

        if (!empty($override['address'])) {
            return $override['address'];
        }

        if (!empty($override['address_line1'])) {
            return $override['address_line1'];
        }

        // Fallback to original data (combine 3 lines)
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

    /**
     * Generate VC Number for Other Services
     */
    private function generateVCForOther()
    {
        $otherId = $this->request['otherId'] ?? null;

        if (empty($otherId)) {
            return $this->errorResponse("Other ID is required");
        }

        try {
            // ตรวจสอบว่า record มีอยู่และไม่ถูกยกเลิก
            $otherResult = $this->db->select(
                "SELECT * FROM bookings_other WHERE id = :id",
                ['id' => $otherId]
            );

            if (!$otherResult['success'] || empty($otherResult['data'])) {
                return $this->errorResponse("Other services record not found");
            }

            $other = $otherResult['data'][0];

            if ($other['status'] === 'cancelled') {
                return $this->errorResponse("Cannot generate VC for cancelled booking");
            }

            // ถ้ามี VC Number อยู่แล้ว ให้ return เลข VC เก่า
            if (!empty($other['vc_number'])) {
                return $this->successResponse([
                    'vcNumber' => $other['vc_number'],
                    'isNew' => false,
                    'message' => 'VC Number already exists'
                ]);
            }

            // ใช้ method ที่มีอยู่ในฐานข้อมูล
            $vcResult = $this->db->generateReferenceNumber(
                'bookings_other',
                'VC',
                'vc_number'
            );

            if (!$vcResult['success']) {
                return $this->errorResponse("Failed to generate VC Number");
            }

            // อัปเดต database
            $updateData = [
                'vc_number' => $vcResult['reference_number'],
                'vc_generated_at' => date('Y-m-d H:i:s'),
                'status' => 'voucher_issued'
            ];

            $updateResult = $this->db->update(
                'bookings_other',
                $updateData,
                'id = :id',
                ['id' => $otherId]
            );

            if (!$updateResult['success']) {
                return $this->errorResponse("Failed to save VC Number: " . $updateResult['error']);
            }

            // Log activity - issue VC (ใช้ VC Number ที่เพิ่งสร้าง)
            $userId = $this->request['userId'] ?? null;
            $this->logActivity('other', $otherId, $vcResult['reference_number'], 'issue', $userId);

            return $this->successResponse([
                'vcNumber' => $vcResult['reference_number'],
                'isNew' => true,
                'message' => 'VC Number generated successfully'
            ]);
        } catch (Exception $e) {
            logMessage("Generate VC for Other error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse("Failed to generate VC Number: " . $e->getMessage());
        }
    }
}
