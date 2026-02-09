<?php
// api/handlers/TicketCoreHandler.php
// Core Ticket Operations Handler - Phase 1 Split
// จัดการ CRUD operations หลักสำหรับ flight tickets

require_once 'BaseHandler.php';

class TicketCoreHandler extends BaseHandler
{
    /**
     * Handle core ticket actions
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
                // Core CRUD operations
                case 'createFlightTicket':
                    return $this->createFlightTicket();
                case 'getFlightTicketById':
                    return $this->getFlightTicketById();
                case 'getFlightTicketsList':
                    return $this->getFlightTicketsList();
                case 'updateTicketStatus':
                    return $this->updateTicketStatus();
                case 'cancelFlightTicket':
                    return $this->cancelFlightTicket();
                case 'generatePOForTicket':
                    return $this->generatePOForTicket();
                case 'searchBookingsForDelete':
                    return $this->searchBookingsForDelete();
                case 'permanentDeleteBookings':
                    return $this->permanentDeleteBookings();
                case 'searchAllBookingsForDelete':
                    return $this->searchAllBookingsForDelete();
                case 'permanentDeleteAllBookings':
                    return $this->permanentDeleteAllBookings();

                default:
                    return $this->errorResponse("Unknown core ticket action: {$action}");
            }
        } catch (Exception $e) {
            $this->logMessage("TicketCoreHandler error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Core ticket handler error: ' . $e->getMessage(), 500);
        }
    }

    // ===========================================
    // CORE TICKET OPERATIONS
    // ===========================================

    /**
     * สร้าง Flight Ticket ใหม่ (Complex Transaction)
     */
    private function createFlightTicket()
    {
        $data = $this->request['data'] ?? $this->request;
        unset($data['action']);

        try {
            // เริ่ม transaction
            $this->db->beginTransaction();

            // 1. สร้าง reference number
            $refResult = $this->db->generateReferenceNumber('bookings_ticket', 'FT', 'reference_number');
            if (!$refResult['success']) {
                throw new Exception('ไม่สามารถสร้าง reference number ได้');
            }

            $referenceNumber = $refResult['reference_number'];

            // 2. คำนวณยอดรวม
            $pricingSubtotal = $this->calculatePricingSubtotal($data['pricing'] ?? []);
            $extrasSubtotal = $this->calculateExtrasSubtotal($data['extras'] ?? []);
            $subtotalBeforeVat = $pricingSubtotal + $extrasSubtotal;
            $vatAmount = ($subtotalBeforeVat * floatval($data['vatPercent'] ?? 0)) / 100;
            $grandTotal = $subtotalBeforeVat + $vatAmount;

            // 3. บันทึกข้อมูลหลัก bookings_ticket
            $depositId = $data['depositId'] ?? null;
            logMessage("🔍 Backend Debug - depositId from request: " . ($depositId ? $depositId : 'NULL'), 'INFO');

            $mainTicketData = [
                'reference_number' => $referenceNumber,
                'customer_id' => $data['customerId'] ?? null,
                'information_id' => $data['supplierId'] ?? null,
                'deposit_id' => $depositId, // ✅ เพิ่ม deposit_id
                'status' => 'not_invoiced',
                'payment_status' => $data['paymentStatus'] ?? 'unpaid',
                'created_by' => $data['createdBy'] ?? null,
                'updated_by' => $data['updatedBy'] ?? null,
                'po_number' => null,
                'po_generated_at' => null
            ];

            logMessage("🔍 mainTicketData: " . json_encode($mainTicketData), 'INFO');

            $ticketResult = $this->db->insert('bookings_ticket', $mainTicketData);
            if (!$ticketResult['success']) {
                throw new Exception('ไม่สามารถบันทึกข้อมูลตั๋วได้');
            }

            $ticketId = $ticketResult['id'];

            // 4. บันทึกข้อมูลรายละเอียด tickets_detail
            $detailData = [
                'bookings_ticket_id' => $ticketId,
                'total_price' => $grandTotal,
                'pricing_total' => $pricingSubtotal,
                'extras_total' => $extrasSubtotal,
                'subtotal_before_vat' => $subtotalBeforeVat,
                'vat_percent' => floatval($data['vatPercent'] ?? 0),
                'vat_amount' => $vatAmount,
                'grand_total' => $grandTotal,
                'issue_date' => $data['bookingDate'] ?? null,
                'due_date' => $data['dueDate'] ?? null,
                'credit_days' => intval($data['creditDays'] ?? 0)
            ];

            $detailResult = $this->db->insert('tickets_detail', $detailData);
            if (!$detailResult['success']) {
                throw new Exception('ไม่สามารถบันทึกรายละเอียดตั๋วได้');
            }

            // 5. บันทึกข้อมูลเพิ่มเติม ticket_additional_info
            $additionalData = [
                'bookings_ticket_id' => $ticketId,
                'company_payment_method' => $data['companyPaymentMethod'] ?? null,
                'company_payment_details' => $data['companyPaymentDetails'] ?? null,
                'customer_payment_method' => $data['customerPaymentMethod'] ?? null,
                'customer_payment_details' => $data['customerPaymentDetails'] ?? null,
                'code' => $data['code'] ?? null,
                'ticket_type' => strtolower($data['ticketType'] ?? 'bsp'),
                'ticket_type_details' => $data['ticketTypeDetails'] ?? null
            ];

            $additionalResult = $this->db->insert('ticket_additional_info', $additionalData);
            if (!$additionalResult['success']) {
                throw new Exception('ไม่สามารถบันทึกข้อมูลเพิ่มเติมได้');
            }

            // 6. บันทึกข้อมูลผู้โดยสาร (ถ้ามี)
            if (!empty($data['passengers'])) {
                $this->insertPassengers($ticketId, $data['passengers']);
            }

            // 7. บันทึกข้อมูลราคา (ถ้ามี)
            if (!empty($data['pricing'])) {
                $this->insertPricing($ticketId, $data['pricing'], $pricingSubtotal, $vatAmount);
            }

            // 8. บันทึกข้อมูลเส้นทาง (ถ้ามี)
            if (!empty($data['routes'])) {
                $this->insertRoutes($ticketId, $data['routes']);
            }

            // 9. บันทึกข้อมูลรายการเพิ่มเติม (ถ้ามี)
            if (!empty($data['extras'])) {
                $this->insertExtras($ticketId, $data['extras']);
            }

            // ✅ 10. ถ้ามี depositId ให้อัพเดท bookings_deposit.flight_ticket_id
            if (!empty($data['depositId'])) {
                $updateDepositResult = $this->db->update(
                    'bookings_deposit',
                    ['flight_ticket_id' => $ticketId],
                    'id = :depositId',
                    ['depositId' => $data['depositId']]
                );

                if ($updateDepositResult['success']) {
                    $this->logMessage("Updated deposit {$data['depositId']} with flight_ticket_id: {$ticketId}");
                } else {
                    $this->logMessage("Warning: Failed to update deposit {$data['depositId']} with flight_ticket_id", 'WARN');
                }
            }

            // Commit transaction
            $this->db->commit();

            // Log activity with user_id
            $userId = $data['createdBy'] ?? null;
            $this->logActivity('ticket', $ticketId, $referenceNumber, 'create', $userId);

            $this->logMessage("Created flight ticket: {$referenceNumber} (ID: {$ticketId})");
            return $this->successResponse([
                'ticketId' => $ticketId,
                'referenceNumber' => $referenceNumber,
                'grandTotal' => $grandTotal,
                'subtotal' => $subtotalBeforeVat,
                'vatAmount' => $vatAmount
            ], 'สร้างตั๋วเครื่องบินสำเร็จ');
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logMessage("Error creating flight ticket: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * ดึงข้อมูล Flight Ticket ตาม ID (Single ticket)
     */
    private function getFlightTicketById()
    {
        $ticketId = $this->request['ticketId'] ?? $this->request['id'] ?? null;

        if (!$ticketId) {
            return $this->errorResponse('Ticket ID is required', 400);
        }

        try {
            // ดึงข้อมูลหลัก
            $sql = "
            SELECT 
                bt.*,
                c.name as customer_name, c.code as customer_code, c.email as customer_email,
                c.address_line1, c.address_line2, c.address_line3, c.phone as customer_phone,
                c.id_number as customer_id_number, c.branch_type, c.branch_number, c.credit_days as customer_credit_days,
                i.name as supplier_name, i.code as supplier_code, i.numeric_code as supplier_numeric_code,
                td.*,
                tai.*
            FROM bookings_ticket bt
            LEFT JOIN customers c ON bt.customer_id = c.id
            LEFT JOIN information i ON bt.information_id = i.id
            LEFT JOIN tickets_detail td ON bt.id = td.bookings_ticket_id
            LEFT JOIN ticket_additional_info tai ON bt.id = tai.bookings_ticket_id
            WHERE bt.id = :ticketId
        ";

            $result = $this->db->raw($sql, ['ticketId' => $ticketId]);
            if (!$result['success'] || empty($result['data'])) {
                return $this->errorResponse('Ticket not found', 404);
            }

            $ticket = $result['data'][0];

            // ดึงข้อมูล related tables
            $passengers = $this->getTicketPassengers($ticketId);
            $routes = $this->getTicketRoutes($ticketId);
            $pricing = $this->getTicketPricing($ticketId);
            $extras = $this->getTicketExtras($ticketId);

            // รวมข้อมูล
            $fullTicketData = [
                'ticket' => $ticket,
                'passengers' => $passengers,
                'routes' => $routes,
                'pricing' => $pricing,
                'extras' => $extras
            ];

            $this->logMessage("Retrieved flight ticket: {$ticketId}");
            return $this->successResponse($fullTicketData);
        } catch (Exception $e) {
            $this->logMessage("Error getting flight ticket: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to get flight ticket', 500);
        }
    }

    /**
     * ดึงรายการ Flight Tickets (List with filters)
     */
    private function getFlightTicketsList()
    {
        $filters = $this->request['filters'] ?? [];
        $startDate = $this->request['startDate'] ?? null;
        $endDate = $this->request['endDate'] ?? null;
        $limit = $this->request['limit'] ?? 50;
        $offset = $this->request['offset'] ?? 0;

        try {
            $sql = "
            SELECT 
                bt.id, bt.reference_number, bt.status, bt.payment_status,
                bt.created_at, bt.updated_at, bt.po_number, bt.po_generated_at,
                c.name as customer_name, c.code as customer_code,
                i.name as supplier_name, i.code as supplier_code,
                td.issue_date, td.due_date, td.grand_total
            FROM bookings_ticket bt
            LEFT JOIN customers c ON bt.customer_id = c.id
            LEFT JOIN information i ON bt.information_id = i.id
            LEFT JOIN tickets_detail td ON bt.id = td.bookings_ticket_id
            WHERE 1=1
        ";

            $params = [];

            // Add date filters
            if ($startDate && $endDate) {
                $sql .= " AND bt.created_at >= :startDate AND bt.created_at <= :endDate";
                $params['startDate'] = $startDate;
                $params['endDate'] = $endDate;
            }

            // Add other filters
            if (!empty($filters['status'])) {
                $sql .= " AND bt.status = :status";
                $params['status'] = $filters['status'];
            }

            if (!empty($filters['payment_status'])) {
                $sql .= " AND bt.payment_status = :payment_status";
                $params['payment_status'] = $filters['payment_status'];
            }

            if (!empty($filters['customer_id'])) {
                $sql .= " AND bt.customer_id = :customer_id";
                $params['customer_id'] = $filters['customer_id'];
            }

            $sql .= " ORDER BY bt.created_at DESC LIMIT :limit OFFSET :offset";
            $params['limit'] = (int)$limit;
            $params['offset'] = (int)$offset;

            $result = $this->db->raw($sql, $params);

            if (!$result['success']) {
                return $this->errorResponse($result['error']);
            }

            $this->logMessage("Retrieved " . count($result['data']) . " flight tickets");
            return $this->successResponse($result['data'], null, count($result['data']));
        } catch (Exception $e) {
            $this->logMessage("Error getting flight tickets list: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to get flight tickets list', 500);
        }
    }

    /**
     * สร้าง PO Number สำหรับ ticket
     */
    private function generatePOForTicket()
    {
        $ticketId = $this->request['ticketId'] ?? null;
        $userId = $this->request['userId'] ?? null; // ✅ เพิ่มรับ userId

        if (!$ticketId) {
            return $this->errorResponse('Ticket ID is required', 400);
        }

        try {
            // ตรวจสอบ ticket มีอยู่และมี PO หรือยัง
            $checkResult = $this->db->raw(
                "SELECT po_number, po_generated_at, status FROM bookings_ticket WHERE id = :id",
                ['id' => $ticketId]
            );

            if (!$checkResult['success'] || empty($checkResult['data'])) {
                return $this->errorResponse('Ticket not found', 404);
            }

            $ticket = $checkResult['data'][0];

            // ถ้ามี PO แล้ว return PO เดิม
            if ($ticket['po_number']) {
                $this->logMessage("PO already exists for ticket: {$ticketId}");
                return $this->successResponse([
                    'poNumber' => $ticket['po_number'],
                    'isNew' => false,
                    'message' => 'PO Number already exists'
                ]);
            }

            // สร้าง PO Number ใหม่
            $poResult = $this->db->generateReferenceNumber('bookings_ticket', 'PO', 'po_number');
            if (!$poResult['success']) {
                return $this->errorResponse('ไม่สามารถสร้าง PO Number ได้');
            }

            $poNumber = $poResult['reference_number'];

            // อัปเดต ticket ด้วย PO Number และเปลี่ยนสถานะ
            $updateData = [
                'po_number' => $poNumber,
                'po_generated_at' => date('Y-m-d H:i:s'),
                'status' => 'invoiced'
            ];

            // ✅ เพิ่ม updated_by ถ้ามี userId
            if ($userId) {
                $updateData['updated_by'] = $userId;
            }

            $updateResult = $this->db->update(
                'bookings_ticket',
                $updateData,
                'id = :id',
                ['id' => $ticketId]
            );

            if (!$updateResult['success']) {
                return $this->errorResponse('ไม่สามารถบันทึก PO Number ได้');
            }

            // Log activity - issue PO (ใช้ PO Number ที่เพิ่งสร้าง)
            $this->logActivity('ticket', $ticketId, $poNumber, 'issue', $userId);

            $this->logMessage("Generated PO for ticket: {$ticketId} - {$poNumber}");
            return $this->successResponse([
                'poNumber' => $poNumber,
                'isNew' => true,
                'message' => 'PO Number generated successfully'
            ]);
        } catch (Exception $e) {
            $this->logMessage("Error generating PO: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to generate PO Number', 500);
        }
    }

    /**
     * อัปเดตสถานะ ticket
     */
    private function updateTicketStatus()
    {
        $ticketId = $this->request['ticketId'] ?? null;
        $status = $this->request['status'] ?? null;
        $userId = $this->request['userId'] ?? null;

        if (!$ticketId || !$status) {
            return $this->errorResponse('Ticket ID and status are required', 400);
        }

        try {
            $updateData = ['status' => $status];

            if ($status === 'cancelled') {
                $updateData['cancelled_at'] = date('Y-m-d H:i:s');
                $updateData['cancelled_by'] = $userId;
                $updateData['cancel_reason'] = $this->request['cancelReason'] ?? '';
            }

            $result = $this->db->update('bookings_ticket', $updateData, 'id = :id', ['id' => $ticketId]);

            if (!$result['success']) {
                return $this->errorResponse('Failed to update ticket status');
            }

            $this->logMessage("Updated ticket status: {$ticketId} to {$status}");
            return $this->successResponse(null, 'Ticket status updated successfully');
        } catch (Exception $e) {
            $this->logMessage("Error updating ticket status: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to update ticket status', 500);
        }
    }

    /**
     * ยกเลิกตั๋วเครื่องบิน
     */
    private function cancelFlightTicket()
    {
        $ticketId = $this->request['ticketId'] ?? $this->request['id'] ?? null;
        $userId = $this->request['userId'] ?? null;
        $cancelReason = $this->request['cancelReason'] ?? '';

        if (!$ticketId || !$userId) {
            return $this->errorResponse('Ticket ID and User ID are required', 400);
        }

        try {
            $updateData = [
                'status' => 'cancelled',
                'cancelled_at' => date('Y-m-d H:i:s'),
                'cancelled_by' => $userId,
                'cancel_reason' => $cancelReason
            ];

            $result = $this->db->update('bookings_ticket', $updateData, 'id = :id', ['id' => $ticketId]);

            if (!$result['success']) {
                return $this->errorResponse('Failed to cancel ticket');
            }

            // Get PO number for activity log (ใช้ PO Number แทน reference_number)
            $ticketResult = $this->db->getById('bookings_ticket', $ticketId, 'po_number, reference_number');
            $poNumber = $ticketResult['data']['po_number'] ?? $ticketResult['data']['reference_number'] ?? null;

            // Log activity with user_id as parameter
            $this->logActivity('ticket', $ticketId, $poNumber, 'cancel', $userId);

            $this->logMessage("Cancelled flight ticket: {$ticketId} by user: {$userId}");
            return $this->successResponse(null, 'Ticket cancelled successfully');
        } catch (Exception $e) {
            $this->logMessage("Error in cancelFlightTicket: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to cancel ticket', 500);
        }
    }



    /**
     * Calculate pricing subtotal
     */
    private function calculatePricingSubtotal($pricing)
    {
        $total = 0;
        foreach (['adult', 'child', 'infant'] as $type) {
            if (isset($pricing[$type])) {
                $total += floatval($pricing[$type]['total'] ?? 0);
            }
        }
        return $total;
    }

    /**
     * Calculate extras subtotal
     */
    private function calculateExtrasSubtotal($extras)
    {
        return array_reduce($extras, function ($sum, $item) {
            return $sum + floatval($item['total_amount'] ?? 0);
        }, 0);
    }

    // ===========================================
    // DATA INSERTION HELPERS
    // ===========================================

    /**
     * Insert passengers data
     */
    private function insertPassengers($ticketId, $passengers)
    {
        foreach ($passengers as $passenger) {
            if (!empty($passenger['name'])) {
                $this->db->insert('tickets_passengers', [
                    'bookings_ticket_id' => $ticketId,
                    'passenger_name' => $passenger['name'],
                    'age' => $passenger['age'] ?? null,
                    'ticket_number' => $passenger['ticketNumber'] ?? null,
                    'ticket_code' => $passenger['ticket_code'] ?? null
                ]);
            }
        }
    }

    /**
     * Insert pricing data
     */
    private function insertPricing($ticketId, $pricing, $subtotal, $vatAmount)
    {
        $pricingData = [
            'bookings_ticket_id' => $ticketId,
            'adult_net_price' => floatval($pricing['adult']['net'] ?? 0),
            'adult_sale_price' => floatval($pricing['adult']['sale'] ?? 0),
            'adult_pax' => intval($pricing['adult']['pax'] ?? 0),
            'adult_total' => floatval($pricing['adult']['total'] ?? 0),
            'child_net_price' => floatval($pricing['child']['net'] ?? 0),
            'child_sale_price' => floatval($pricing['child']['sale'] ?? 0),
            'child_pax' => intval($pricing['child']['pax'] ?? 0),
            'child_total' => floatval($pricing['child']['total'] ?? 0),
            'infant_net_price' => floatval($pricing['infant']['net'] ?? 0),
            'infant_sale_price' => floatval($pricing['infant']['sale'] ?? 0),
            'infant_pax' => intval($pricing['infant']['pax'] ?? 0),
            'infant_total' => floatval($pricing['infant']['total'] ?? 0),
            'subtotal_amount' => $subtotal,
            'vat_amount' => $vatAmount,
            'total_amount' => $subtotal
        ];

        $this->db->insert('tickets_pricing', $pricingData);
    }

    /**
     * Insert routes data
     */
    private function insertRoutes($ticketId, $routes)
    {
        foreach ($routes as $route) {
            if (!empty($route['origin']) || !empty($route['destination'])) {
                $this->db->insert('tickets_routes', [
                    'bookings_ticket_id' => $ticketId,
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
     * Insert extras data
     */
    private function insertExtras($ticketId, $extras)
    {
        foreach ($extras as $extra) {
            if (!empty($extra['description'])) {
                $this->db->insert('tickets_extras', [
                    'bookings_ticket_id' => $ticketId,
                    'description' => $extra['description'],
                    'net_price' => floatval($extra['net_price'] ?? 0),
                    'sale_price' => floatval($extra['sale_price'] ?? 0),
                    'quantity' => intval($extra['quantity'] ?? 1),
                    'total_amount' => floatval($extra['total_amount'] ?? 0)
                ]);
            }
        }
    }

    // ===========================================
    // DATA RETRIEVAL HELPERS
    // ===========================================

    /**
     * Get ticket passengers data
     */
    private function getTicketPassengers($ticketId)
    {
        $result = $this->db->raw(
            "SELECT * FROM tickets_passengers WHERE bookings_ticket_id = :ticketId ORDER BY id",
            ['ticketId' => $ticketId]
        );
        return $result['success'] ? $result['data'] : [];
    }

    /**
     * Get ticket routes data
     */
    private function getTicketRoutes($ticketId)
    {
        $result = $this->db->raw(
            "SELECT * FROM tickets_routes WHERE bookings_ticket_id = :ticketId ORDER BY id",
            ['ticketId' => $ticketId]
        );
        return $result['success'] ? $result['data'] : [];
    }

    /**
     * Get ticket pricing data
     */
    private function getTicketPricing($ticketId)
    {
        $result = $this->db->raw(
            "SELECT * FROM tickets_pricing WHERE bookings_ticket_id = :ticketId LIMIT 1",
            ['ticketId' => $ticketId]
        );
        return $result['success'] && !empty($result['data']) ? $result['data'][0] : null;
    }

    /**
     * Get ticket extras data
     */
    private function getTicketExtras($ticketId)
    {
        $result = $this->db->raw(
            "SELECT * FROM tickets_extras WHERE bookings_ticket_id = :ticketId ORDER BY id",
            ['ticketId' => $ticketId]
        );
        return $result['success'] ? $result['data'] : [];
    }

    /**
     * ค้นหา bookings สำหรับลบ
     */
    private function searchBookingsForDelete()
    {
        try {
            $searchTerm = $this->request['searchTerm'] ?? '';

            $sql = "SELECT 
                bt.id,
                bt.reference_number,
                bt.status,
                bt.created_at,
                c.name as customer_name,
                COALESCE((SELECT COUNT(*) FROM tickets_passengers tp WHERE tp.bookings_ticket_id = bt.id), 0) as passenger_count
            FROM bookings_ticket bt
            LEFT JOIN customers c ON bt.customer_id = c.id";

            $params = [];

            // ถ้ามี searchTerm ให้ค้นหา ถ้าไม่มีให้แสดงทั้งหมด
            if (!empty($searchTerm)) {
                $sql .= " WHERE CAST(bt.id AS CHAR) LIKE :searchLike
                     OR bt.reference_number LIKE :searchLike
                     OR c.name LIKE :searchLike";
                $params['searchLike'] = "%{$searchTerm}%";
            }

            $sql .= " ORDER BY bt.created_at DESC LIMIT 100";

            $result = $this->db->raw($sql, $params);

            if (!$result['success']) {
                return $this->errorResponse('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' . $result['error']);
            }

            return $this->successResponse($result['data']);
        } catch (Exception $e) {
            $this->logMessage("Error in searchBookingsForDelete: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' . $e->getMessage());
        }
    }

    /**
     * ลบ bookings ถาวร
     */
    private function permanentDeleteBookings()
    {
        try {
            $bookingIds = $this->request['bookingIds'] ?? [];

            if (empty($bookingIds) || !is_array($bookingIds)) {
                return $this->errorResponse('ไม่มีรายการที่จะลบ', 400);
            }

            // เริ่ม transaction
            $this->db->beginTransaction();

            $deletedCount = 0;

            foreach ($bookingIds as $bookingId) {
                // ตรวจสอบว่า booking มีอยู่จริง
                $checkResult = $this->db->raw(
                    "SELECT reference_number FROM bookings_ticket WHERE id = :id",
                    ['id' => $bookingId]
                );

                if ($checkResult['success'] && !empty($checkResult['data'])) {
                    $booking = $checkResult['data'][0];

                    // ลบ booking (CASCADE จะจัดการ related tables)
                    $deleteResult = $this->db->raw(
                        "DELETE FROM bookings_ticket WHERE id = :id",
                        ['id' => $bookingId]
                    );

                    if ($deleteResult['success']) {
                        $deletedCount++;
                        $this->logMessage("Permanently deleted booking: {$booking['reference_number']} (ID: {$bookingId})", 'WARNING');
                    }
                }
            }

            // ยืนยัน transaction
            $this->db->commit();

            $this->logMessage("Permanently deleted {$deletedCount} bookings", 'WARNING');

            return $this->successResponse([
                'deletedCount' => $deletedCount,
                'message' => "ลบสำเร็จ {$deletedCount} รายการ"
            ]);
        } catch (Exception $e) {
            // ยกเลิก transaction
            $this->db->rollBack();

            $this->logMessage("Error in permanentDeleteBookings: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('เกิดข้อผิดพลาดในการลบ: ' . $e->getMessage());
        }
    }
    /**
     * ✨ เพิ่มใหม่: ค้นหาข้อมูลทั้ง Tickets และ Vouchers สำหรับการลบ
     */
    private function searchAllBookingsForDelete()
    {
        try {
            $results = [];

            // 1. ดึงข้อมูล Flight Tickets
            $ticketSql = "
            SELECT 
                bt.id,
                bt.reference_number,
                bt.status,
                bt.created_at,
                c.name as customer_name,
                'ticket' as type,
                COUNT(tp.id) as passenger_count,
                '' as service_type,
                '' as hotel,
                '' as trip_date,
                '' as additional_info
            FROM bookings_ticket bt
            LEFT JOIN customers c ON bt.customer_id = c.id
            LEFT JOIN tickets_passengers tp ON bt.id = tp.bookings_ticket_id
            GROUP BY bt.id
            ORDER BY bt.created_at DESC
        ";

            $ticketResult = $this->db->raw($ticketSql);
            if ($ticketResult['success']) {
                $results = array_merge($results, $ticketResult['data']);
            }

            // 2. ดึงข้อมูล Vouchers (Bus/Boat/Tour)
            $voucherSql = "
            SELECT 
                bv.id,
                bv.reference_number,
                bv.status,
                bv.created_at,
                c.name as customer_name,
                'voucher' as type,
                COUNT(vp.id) as passenger_count,
                bv.service_type,
                COALESCE(vd.hotel, '') as hotel,
                COALESCE(vd.trip_date, '') as trip_date,
                CONCAT_WS(' | ', 
                    CASE WHEN vd.hotel IS NOT NULL THEN CONCAT('Hotel: ', vd.hotel) END,
                    CASE WHEN vd.trip_date IS NOT NULL THEN CONCAT('Trip: ', vd.trip_date) END
                ) as additional_info
            FROM bookings_voucher bv
            LEFT JOIN customers c ON bv.customer_id = c.id
            LEFT JOIN voucher_passengers vp ON bv.id = vp.bookings_voucher_id
            LEFT JOIN voucher_details vd ON bv.id = vd.bookings_voucher_id
            GROUP BY bv.id
            ORDER BY bv.created_at DESC
        ";

            $voucherResult = $this->db->raw($voucherSql);
            if ($voucherResult['success']) {
                $results = array_merge($results, $voucherResult['data']);
            }

            // 3. ดึงข้อมูล Deposits
            $depositSql = "
            SELECT
                bd.id,
                bd.reference_number,
                bd.status,
                bd.created_at,
                c.name as customer_name,
                'deposit' as type,
                0 as passenger_count,
                bd.deposit_type as service_type,
                COALESCE(bd.group_name, '') as hotel,
                '' as trip_date,
                CONCAT_WS(' | ',
                    CASE WHEN bd.group_name IS NOT NULL AND bd.group_name != '' THEN CONCAT('Group: ', bd.group_name) END,
                    CASE WHEN bd.deposit_type IS NOT NULL THEN CONCAT('Type: ', bd.deposit_type) END
                ) as additional_info
            FROM bookings_deposit bd
            LEFT JOIN customers c ON bd.customer_id = c.id
            ORDER BY bd.created_at DESC
        ";

            $depositResult = $this->db->raw($depositSql);
            if ($depositResult['success']) {
                $results = array_merge($results, $depositResult['data']);
            }

            // 4. ดึงข้อมูล Other Services
            $otherSql = "
            SELECT
                bo.id,
                bo.reference_number,
                bo.status,
                bo.created_at,
                c.name as customer_name,
                'other' as type,
                0 as passenger_count,
                bo.service_type,
                COALESCE(od.hotel_name, '') as hotel,
                COALESCE(od.service_date, '') as trip_date,
                CONCAT_WS(' | ',
                    CASE WHEN od.hotel_name IS NOT NULL AND od.hotel_name != '' THEN CONCAT('Hotel: ', od.hotel_name) END,
                    CASE WHEN od.service_date IS NOT NULL THEN CONCAT('Date: ', od.service_date) END,
                    CASE WHEN od.country IS NOT NULL AND od.country != '' THEN CONCAT('Country: ', od.country) END,
                    CASE WHEN od.route IS NOT NULL AND od.route != '' THEN CONCAT('Route: ', od.route) END
                ) as additional_info
            FROM bookings_other bo
            LEFT JOIN customers c ON bo.customer_id = c.id
            LEFT JOIN other_details od ON bo.id = od.bookings_other_id
            ORDER BY bo.created_at DESC
        ";

            $otherResult = $this->db->raw($otherSql);
            if ($otherResult['success']) {
                $results = array_merge($results, $otherResult['data']);
            }

            // 5. เรียงลำดับตาม created_at ใหม่
            usort($results, function ($a, $b) {
                return strtotime($b['created_at']) - strtotime($a['created_at']);
            });

            $this->logMessage("Retrieved " . count($results) . " bookings for delete (Tickets + Vouchers + Deposits + Others)");

            return $this->successResponse($results);
        } catch (Exception $e) {
            $this->logMessage("Error searching all bookings for delete: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to search bookings: ' . $e->getMessage());
        }
    }

    /**
     * ✨ เพิ่มใหม่: ลบข้อมูลทั้ง Tickets และ Vouchers แบบถาวร
     */
    private function permanentDeleteAllBookings()
    {
        $ticketIds = $this->request['ticketIds'] ?? [];
        $voucherIds = $this->request['voucherIds'] ?? [];
        $depositIds = $this->request['depositIds'] ?? [];
        $otherIds = $this->request['otherIds'] ?? [];

        if (empty($ticketIds) && empty($voucherIds) && empty($depositIds) && empty($otherIds)) {
            return $this->errorResponse('No booking IDs provided for deletion', 400);
        }

        try {
            $this->db->beginTransaction();

            $deletedTickets = 0;
            $deletedVouchers = 0;

            // 1. ลบ Flight Tickets
            if (!empty($ticketIds)) {
                foreach ($ticketIds as $ticketId) {
                    $deleteResult = $this->db->delete('bookings_ticket', 'id = :id', ['id' => $ticketId]);
                    if ($deleteResult['success']) {
                        $deletedTickets++;
                        $this->logMessage("Permanently deleted ticket ID: {$ticketId}");
                    }
                }
            }

            // 2. ลบ Vouchers
            if (!empty($voucherIds)) {
                foreach ($voucherIds as $voucherId) {
                    $deleteResult = $this->db->delete('bookings_voucher', 'id = :id', ['id' => $voucherId]);
                    if ($deleteResult['success']) {
                        $deletedVouchers++;
                        $this->logMessage("Permanently deleted voucher ID: {$voucherId}");
                    }
                }
            }

            // 3. ลบ Deposits
            $deletedDeposits = 0;
            if (!empty($depositIds)) {
                foreach ($depositIds as $depositId) {
                    $deleteResult = $this->db->delete('bookings_deposit', 'id = :id', ['id' => $depositId]);
                    if ($deleteResult['success']) {
                        $deletedDeposits++;
                        $this->logMessage("Permanently deleted deposit ID: {$depositId}");
                    }
                }
            }

            // 4. ลบ Other Services
            $deletedOthers = 0;
            if (!empty($otherIds)) {
                foreach ($otherIds as $otherId) {
                    $deleteResult = $this->db->delete('bookings_other', 'id = :id', ['id' => $otherId]);
                    if ($deleteResult['success']) {
                        $deletedOthers++;
                        $this->logMessage("Permanently deleted other service ID: {$otherId}");
                    }
                }
            }

            $this->db->commit();

            $this->logMessage("Permanent deletion completed - Tickets: {$deletedTickets}, Vouchers: {$deletedVouchers}, Deposits: {$deletedDeposits}, Others: {$deletedOthers}");

            return $this->successResponse([
                'deletedTickets' => $deletedTickets,
                'deletedVouchers' => $deletedVouchers,
                'deletedDeposits' => $deletedDeposits,
                'deletedOthers' => $deletedOthers,
                'totalDeleted' => $deletedTickets + $deletedVouchers + $deletedDeposits + $deletedOthers,
                'message' => 'Bookings deleted permanently'
            ]);
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logMessage("Error in permanent delete all bookings: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to delete bookings: ' . $e->getMessage());
        }
    }
}
