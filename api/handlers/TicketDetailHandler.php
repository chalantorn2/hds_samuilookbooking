<?php
// api/handlers/TicketDetailHandler.php
// Ticket Detail & Edit Operations Handler - Phase 3 Split
// จัดการรายละเอียดและการแก้ไข flight tickets

require_once 'BaseHandler.php';

class TicketDetailHandler extends BaseHandler
{
    /**
     * Handle detail ticket actions
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
                // Detail operations
                case 'getFlightTicketDetailById':
                    return $this->getFlightTicketDetailById();
                case 'getFlightTicketForEdit':
                    return $this->getFlightTicketForEdit();
                case 'updateFlightTicketComplete':
                    return $this->updateFlightTicketComplete();
                default:
                    return $this->errorResponse("Unknown detail ticket action: {$action}");
            }
        } catch (Exception $e) {
            $this->logMessage("TicketDetailHandler error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Detail ticket handler error: ' . $e->getMessage(), 500);
        }
    }

    // ===========================================
    // DETAILED TICKET OPERATIONS
    // ===========================================

    /**
     * Get Flight Ticket Detail by ID (for FlightTicketDetail.jsx)
     */
    private function getFlightTicketDetailById()
    {
        $ticketId = $this->request['ticketId'] ?? $this->request['id'] ?? null;

        if (!$ticketId) {
            return $this->errorResponse('Ticket ID is required', 400);
        }

        try {
            // Main ticket data with joins (replicating Supabase complex select)
            $sql = "
        SELECT 
            bt.id, bt.reference_number, bt.status, bt.payment_status,
            bt.created_at, bt.updated_at, bt.created_by, bt.updated_by,
            bt.cancelled_at, bt.cancelled_by, bt.cancel_reason,
            bt.po_number, bt.po_generated_at,
            bt.rc_number, bt.rc_generated_at,  -- ⭐ เพิ่ม RC fields
            bt.invoice_number, bt.invoice_generated_at,  -- ⭐ เพิ่ม INV fields
            bt.customer_override_data, 
            
            -- Customer data
            c.id as customer_id, c.name as customer_name, c.code as customer_code,
            c.email as customer_email, c.address_line1 as customer_address_line1,
            c.address_line2 as customer_address_line2, c.address_line3 as customer_address_line3,
            c.phone as customer_phone, c.id_number as customer_id_number,
            c.branch_type as customer_branch_type, c.branch_number as customer_branch_number,
            c.credit_days as customer_credit_days,
            
            -- Supplier data
            i.id as supplier_id, i.name as supplier_name, i.code as supplier_code,
            i.numeric_code as supplier_numeric_code,
            
            -- ⭐ User names (NEW)
            u_created.fullname as created_by_name,
            u_updated.fullname as updated_by_name,
            u_cancelled.fullname as cancelled_by_name,
            
            -- Tickets detail data
            td.id as detail_id, td.total_price, td.issue_date, td.due_date, td.credit_days,
            td.subtotal_before_vat, td.extras_total, td.pricing_total,
            td.vat_amount, td.vat_percent, td.grand_total,
            
            -- Additional info data
            tai.id as additional_info_id, tai.company_payment_method, tai.company_payment_details,
            tai.customer_payment_method, tai.customer_payment_details,
            tai.code, tai.ticket_type, tai.ticket_type_details
            
        FROM bookings_ticket bt
        LEFT JOIN customers c ON bt.customer_id = c.id
        LEFT JOIN information i ON bt.information_id = i.id
        LEFT JOIN tickets_detail td ON bt.id = td.bookings_ticket_id
        LEFT JOIN ticket_additional_info tai ON bt.id = tai.bookings_ticket_id
        -- ⭐ เพิ่ม JOIN กับ users (NEW)
        LEFT JOIN users u_created ON bt.created_by = u_created.id
        LEFT JOIN users u_updated ON bt.updated_by = u_updated.id
        LEFT JOIN users u_cancelled ON bt.cancelled_by = u_cancelled.id
        WHERE bt.id = :ticketId
    ";

            $result = $this->db->raw($sql, ['ticketId' => $ticketId]);

            if (!$result['success'] || empty($result['data'])) {
                return $this->errorResponse('Ticket not found', 404);
            }

            $mainData = $result['data'][0];

            $pricingData = $this->getTicketPricingData($ticketId);
            $passengersData = $this->getTicketPassengersData($ticketId);
            $routesData = $this->getTicketRoutesData($ticketId);
            $extrasData = $this->getTicketExtrasData($ticketId);

            $ticketData = [
                'id' => $mainData['id'],
                'reference_number' => $mainData['reference_number'],
                'customer_override_data' => $mainData['customer_override_data'],
                'status' => $mainData['status'],
                'payment_status' => $mainData['payment_status'],
                'created_at' => $mainData['created_at'],
                'updated_at' => $mainData['updated_at'],
                'created_by' => $mainData['created_by'],
                'updated_by' => $mainData['updated_by'],
                'cancelled_at' => $mainData['cancelled_at'],
                'cancelled_by' => $mainData['cancelled_by'],
                'cancel_reason' => $mainData['cancel_reason'],
                'po_number' => $mainData['po_number'],
                'po_generated_at' => $mainData['po_generated_at'],
                'rc_number' => $mainData['rc_number'],  // ⭐ เพิ่ม RC fields
                'rc_generated_at' => $mainData['rc_generated_at'],
                'invoice_number' => $mainData['invoice_number'],  // ⭐ เพิ่ม INV fields
                'invoice_generated_at' => $mainData['invoice_generated_at'],

                // ⭐ เพิ่ม User names ตรงนี้
                'createdByName' => $mainData['created_by_name'],
                'updatedByName' => $mainData['updated_by_name'],
                'cancelledByName' => $mainData['cancelled_by_name'],

                // Customer object (same structure as Supabase)
                'customer' => $mainData['customer_id'] ? [
                    'id' => $mainData['customer_id'],
                    'name' => $mainData['customer_name'],
                    'code' => $mainData['customer_code'],
                    'email' => $mainData['customer_email'],
                    'address_line1' => $mainData['customer_address_line1'],
                    'address_line2' => $mainData['customer_address_line2'],
                    'address_line3' => $mainData['customer_address_line3'],
                    'phone' => $mainData['customer_phone'],
                    'id_number' => $mainData['customer_id_number'],
                    'branch_type' => $mainData['customer_branch_type'],
                    'branch_number' => $mainData['customer_branch_number'],
                    'credit_days' => $mainData['customer_credit_days']
                ] : null,

                // Supplier object
                'supplier' => $mainData['supplier_id'] ? [
                    'id' => $mainData['supplier_id'],
                    'name' => $mainData['supplier_name'],
                    'code' => $mainData['supplier_code'],
                    'numeric_code' => $mainData['supplier_numeric_code']
                ] : null,

                // Tickets detail array
                'tickets_detail' => $mainData['detail_id'] ? [[
                    'id' => $mainData['detail_id'],
                    'total_price' => $mainData['total_price'],
                    'issue_date' => $mainData['issue_date'],
                    'due_date' => $mainData['due_date'],
                    'credit_days' => $mainData['credit_days'],
                    'subtotal_before_vat' => $mainData['subtotal_before_vat'],
                    'extras_total' => $mainData['extras_total'],
                    'pricing_total' => $mainData['pricing_total'],
                    'vat_amount' => $mainData['vat_amount'],
                    'vat_percent' => $mainData['vat_percent'],
                    'grand_total' => $mainData['grand_total']
                ]] : [],

                // Additional info array
                'ticket_additional_info' => $mainData['additional_info_id'] ? [[
                    'id' => $mainData['additional_info_id'],
                    'company_payment_method' => $mainData['company_payment_method'],
                    'company_payment_details' => $mainData['company_payment_details'],
                    'customer_payment_method' => $mainData['customer_payment_method'],
                    'customer_payment_details' => $mainData['customer_payment_details'],
                    'code' => $mainData['code'],
                    'ticket_type' => $mainData['ticket_type'],
                    'ticket_type_details' => $mainData['ticket_type_details']
                ]] : [],

                // Related data arrays
                'tickets_pricing' => $pricingData,
                'tickets_passengers' => $passengersData,
                'tickets_routes' => $routesData,
                'tickets_extras' => $extrasData
            ];

            $this->logMessage("Retrieved detailed flight ticket: {$ticketId}");
            return $this->successResponse($ticketData);
        } catch (Exception $e) {
            $this->logMessage("Error in getFlightTicketDetailById: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch ticket details', 500);
        }
    }

    /**
     * Get Flight Ticket for Edit (Complex data structure for editing)
     */
    private function getFlightTicketForEdit()
    {
        $ticketId = $this->request['ticketId'] ?? $this->request['id'] ?? null;

        if (!$ticketId) {
            return $this->errorResponse('Ticket ID is required', 400);
        }

        try {
            // Main ticket data with all joins (same as detail but optimized for editing)
            $sql = "
            SELECT 
                bt.*, bt.customer_override_data,
                bt.*, c.id as customer_id, c.name as customer_name, c.code as customer_code,
                c.email as customer_email, c.address_line1, c.address_line2, c.address_line3,
                c.phone as customer_phone, c.id_number as customer_id_number,
                c.branch_type, c.branch_number, c.credit_days as customer_credit_days,
                i.id as supplier_id, i.name as supplier_name, i.code as supplier_code,
                i.numeric_code as supplier_numeric_code,
                td.*, tai.*
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

            // Get related data for editing
            $pricing = $this->getTicketPricingData($ticketId);
            $passengers = $this->getTicketPassengersData($ticketId);
            $routes = $this->getTicketRoutesData($ticketId);
            $extras = $this->getTicketExtrasData($ticketId);

            // Structure data for React editing component
            $editData = [
                // Main ticket data
                'id' => $ticket['id'],
                'reference_number' => $ticket['reference_number'],
                'status' => $ticket['status'],
                'payment_status' => $ticket['payment_status'],
                'created_at' => $ticket['created_at'],
                'updated_at' => $ticket['updated_at'],
                'created_by' => $ticket['created_by'],
                'updated_by' => $ticket['updated_by'],
                'cancelled_at' => $ticket['cancelled_at'],
                'cancelled_by' => $ticket['cancelled_by'],
                'cancel_reason' => $ticket['cancel_reason'],
                'po_number' => $ticket['po_number'],
                'po_generated_at' => $ticket['po_generated_at'],
                'invoice_number' => $ticket['invoice_number'],

                // Customer data (structured for editing)
                'customer' => $ticket['customer_id'] ? [
                    'id' => $ticket['customer_id'],
                    'name' => $ticket['customer_name'],
                    'code' => $ticket['customer_code'],
                    'email' => $ticket['customer_email'],
                    'address_line1' => $ticket['address_line1'],
                    'address_line2' => $ticket['address_line2'],
                    'address_line3' => $ticket['address_line3'],
                    'phone' => $ticket['customer_phone'],
                    'id_number' => $ticket['customer_id_number'],
                    'branch_type' => $ticket['branch_type'],
                    'branch_number' => $ticket['branch_number'],
                    'credit_days' => $ticket['customer_credit_days']
                ] : null,

                // Supplier data (structured for editing)
                'supplier' => $ticket['supplier_id'] ? [
                    'id' => $ticket['supplier_id'],
                    'name' => $ticket['supplier_name'],
                    'code' => $ticket['supplier_code'],
                    'numeric_code' => $ticket['supplier_numeric_code']
                ] : null,

                // Detail data (structured for editing)
                'tickets_detail' => [[
                    'issue_date' => $ticket['issue_date'],
                    'due_date' => $ticket['due_date'],
                    'credit_days' => $ticket['credit_days'],
                    'total_price' => $ticket['total_price'],
                    'subtotal_before_vat' => $ticket['subtotal_before_vat'],
                    'extras_total' => $ticket['extras_total'],
                    'pricing_total' => $ticket['pricing_total'],
                    'vat_amount' => $ticket['vat_amount'],
                    'vat_percent' => $ticket['vat_percent'],
                    'grand_total' => $ticket['grand_total']
                ]],

                // Additional info (structured for editing)
                'ticket_additional_info' => [[
                    'company_payment_method' => $ticket['company_payment_method'],
                    'company_payment_details' => $ticket['company_payment_details'],
                    'customer_payment_method' => $ticket['customer_payment_method'],
                    'customer_payment_details' => $ticket['customer_payment_details'],
                    'code' => $ticket['code'],
                    'ticket_type' => $ticket['ticket_type'],
                    'ticket_type_details' => $ticket['ticket_type_details'],
                    'remark' => $ticket['remark'] ?? ''
                ]],

                // Related arrays for editing
                'tickets_pricing' => $pricing,
                'tickets_passengers' => $passengers,
                'tickets_routes' => $routes,
                'tickets_extras' => $extras
            ];

            $overrideResult = $this->db->select(
                "SELECT customer_override_data FROM bookings_ticket WHERE id = :id",
                ['id' => $ticketId]
            );

            if ($overrideResult['success'] && !empty($overrideResult['data'])) {
                $editData['customer_override_data'] = $overrideResult['data'][0]['customer_override_data'];
            }

            $this->logMessage("Retrieved flight ticket for edit: {$ticketId}");
            return $this->successResponse($editData);
        } catch (Exception $e) {
            $this->logMessage("Error in getFlightTicketForEdit: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch ticket for editing', 500);
        }
    }

    /**
     * Update Flight Ticket Complete (Complex Transaction)
     */
    private function updateFlightTicketComplete()
    {
        $ticketId = $this->request['ticketId'] ?? $this->request['id'] ?? null;
        $data = $this->request['data'] ?? $this->request;

        if (!$ticketId) {
            return $this->errorResponse('Ticket ID is required', 400);
        }

        if (empty($data)) {
            return $this->errorResponse('Update data is required', 400);
        }

        try {
            // Start transaction for data integrity
            $this->db->beginTransaction();

            // 1. Update customer data (if provided)
            if (isset($data['customerOverride'])) {
                $customerOverrideJson = null;
                if (!empty($data['customerOverride'])) {
                    $customerOverrideJson = json_encode($data['customerOverride']);
                }

                // Update ticket with override data
                $this->db->update(
                    'bookings_ticket',
                    ['customer_override_data' => $customerOverrideJson],
                    'id = :id',
                    ['id' => $ticketId]
                );
            }

            // 2. Update main ticket data
            if (isset($data['mainTicket'])) {
                $this->updateMainTicketData($ticketId, $data['mainTicket']);
            }

            // 3. Update tickets_detail
            if (isset($data['ticketDetail'])) {
                $this->updateTicketDetail($ticketId, $data['ticketDetail']);
            }

            // 4. Update ticket_additional_info
            if (isset($data['additionalInfo'])) {
                $this->updateTicketAdditionalInfo($ticketId, $data['additionalInfo']);
            }

            // 5. Update tickets_pricing
            if (isset($data['pricing'])) {
                $this->updateTicketPricing($ticketId, $data['pricing']);
            }

            // 6. Update passengers (delete + insert)
            if (isset($data['passengers'])) {
                $this->updateTicketPassengers($ticketId, $data['passengers']);
            }

            // 7. Update routes (delete + insert)
            if (isset($data['routes'])) {
                $this->updateTicketRoutes($ticketId, $data['routes']);
            }

            // 8. Update extras (delete + insert)
            if (isset($data['extras'])) {
                $this->updateTicketExtras($ticketId, $data['extras']);
            }

            // Commit transaction
            $this->db->commit();

            // Get PO number for activity log (ใช้ PO Number แทน reference_number)
            $ticketResult = $this->db->getById('bookings_ticket', $ticketId, 'po_number, reference_number');
            $poNumber = $ticketResult['data']['po_number'] ?? $ticketResult['data']['reference_number'] ?? null;

            // Log activity with user_id from request
            $userId = $data['mainTicket']['updated_by'] ?? null;
            $this->logActivity('ticket', $ticketId, $poNumber, 'update', $userId);

            $this->logMessage("Updated flight ticket complete: {$ticketId}");
            return $this->successResponse(null, 'Ticket updated successfully');
        } catch (Exception $e) {
            $this->db->rollback();
            $this->logMessage("Error in updateFlightTicketComplete: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to update ticket: ' . $e->getMessage(), 500);
        }
    }

    // ===========================================
    // DETAILED DATA HELPERS
    // ===========================================

    /**
     * Get ticket pricing data (detailed version)
     */
    private function getTicketPricingData($ticketId)
    {
        try {
            $sql = "SELECT * FROM tickets_pricing WHERE bookings_ticket_id = :ticketId ORDER BY id";
            $result = $this->db->raw($sql, ['ticketId' => $ticketId]);
            return $result['success'] ? $result['data'] : [];
        } catch (Exception $e) {
            $this->logMessage("Error getting ticket pricing: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }

    /**
     * Get ticket passengers data (detailed version)
     */
    private function getTicketPassengersData($ticketId)
    {
        try {
            $sql = "SELECT * FROM tickets_passengers WHERE bookings_ticket_id = :ticketId ORDER BY id";
            $result = $this->db->raw($sql, ['ticketId' => $ticketId]);
            return $result['success'] ? $result['data'] : [];
        } catch (Exception $e) {
            $this->logMessage("Error getting ticket passengers: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }

    /**
     * Get ticket routes data (detailed version)
     */
    private function getTicketRoutesData($ticketId)
    {
        try {
            $sql = "SELECT * FROM tickets_routes WHERE bookings_ticket_id = :ticketId ORDER BY id";
            $result = $this->db->raw($sql, ['ticketId' => $ticketId]);
            return $result['success'] ? $result['data'] : [];
        } catch (Exception $e) {
            $this->logMessage("Error getting ticket routes: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }

    /**
     * Get ticket extras data (detailed version)
     */
    private function getTicketExtrasData($ticketId)
    {
        try {
            $sql = "SELECT * FROM tickets_extras WHERE bookings_ticket_id = :ticketId ORDER BY id";
            $result = $this->db->raw($sql, ['ticketId' => $ticketId]);
            return $result['success'] ? $result['data'] : [];
        } catch (Exception $e) {
            $this->logMessage("Error getting ticket extras: " . $e->getMessage(), 'ERROR');
            return [];
        }
    }

    // ===========================================
    // UPDATE HELPERS
    // ===========================================

    /**
     * Update customer data for ticket
     */
    private function updateCustomerForTicket($customerData)
    {
        if (!isset($customerData['id']) || empty($customerData['id'])) {
            return;
        }

        $updateData = [];
        if (isset($customerData['name'])) $updateData['name'] = $customerData['name'];
        if (isset($customerData['code'])) $updateData['code'] = $customerData['code'];
        if (isset($customerData['email'])) $updateData['email'] = $customerData['email'];
        if (isset($customerData['address_line1'])) $updateData['address_line1'] = $customerData['address_line1'];
        if (isset($customerData['address_line2'])) $updateData['address_line2'] = $customerData['address_line2'];
        if (isset($customerData['address_line3'])) $updateData['address_line3'] = $customerData['address_line3'];
        if (isset($customerData['phone'])) $updateData['phone'] = $customerData['phone'];
        if (isset($customerData['id_number'])) $updateData['id_number'] = $customerData['id_number'];
        if (isset($customerData['branch_type'])) $updateData['branch_type'] = $customerData['branch_type'];
        if (isset($customerData['branch_number'])) $updateData['branch_number'] = $customerData['branch_number'];
        if (isset($customerData['credit_days'])) $updateData['credit_days'] = $customerData['credit_days'];

        if (!empty($updateData)) {
            $this->db->update('customers', $updateData, 'id = :id', ['id' => $customerData['id']]);
        }
    }

    /**
     * Update main ticket data
     */
    private function updateMainTicketData($ticketId, $mainData)
    {
        $updateData = [];

        if (isset($mainData['customer_id'])) $updateData['customer_id'] = $mainData['customer_id'];
        if (isset($mainData['information_id'])) $updateData['information_id'] = $mainData['information_id'];
        if (isset($mainData['status'])) $updateData['status'] = $mainData['status'];
        if (isset($mainData['payment_status'])) $updateData['payment_status'] = $mainData['payment_status'];
        if (isset($mainData['updated_by'])) $updateData['updated_by'] = $mainData['updated_by']; // ✅ เพิ่มบรรทัดนี้

        if (!empty($updateData)) {
            $this->db->update('bookings_ticket', $updateData, 'id = :id', ['id' => $ticketId]);
        }
    }

    /**
     * Update ticket detail
     */
    private function updateTicketDetail($ticketId, $detailData)
    {
        $updateData = [];

        if (isset($detailData['issue_date'])) $updateData['issue_date'] = $detailData['issue_date'];
        if (isset($detailData['due_date'])) $updateData['due_date'] = $detailData['due_date'];
        if (isset($detailData['credit_days'])) $updateData['credit_days'] = $detailData['credit_days'];
        if (isset($detailData['subtotal_before_vat'])) $updateData['subtotal_before_vat'] = $detailData['subtotal_before_vat'];
        if (isset($detailData['vat_percent'])) $updateData['vat_percent'] = $detailData['vat_percent'];
        if (isset($detailData['vat_amount'])) $updateData['vat_amount'] = $detailData['vat_amount'];
        if (isset($detailData['grand_total'])) $updateData['grand_total'] = $detailData['grand_total'];

        if (!empty($updateData)) {
            $this->db->update('tickets_detail', $updateData, 'bookings_ticket_id = :id', ['id' => $ticketId]);
        }
    }

    /**
     * Update ticket additional info
     */
    private function updateTicketAdditionalInfo($ticketId, $additionalData)
    {
        $updateData = [];

        if (isset($additionalData['code'])) $updateData['code'] = $additionalData['code'];
        if (isset($additionalData['ticket_type'])) $updateData['ticket_type'] = $additionalData['ticket_type'];
        if (isset($additionalData['ticket_type_details'])) $updateData['ticket_type_details'] = $additionalData['ticket_type_details'];
        if (isset($additionalData['company_payment_method'])) $updateData['company_payment_method'] = $additionalData['company_payment_method'];
        if (isset($additionalData['company_payment_details'])) $updateData['company_payment_details'] = $additionalData['company_payment_details'];
        if (isset($additionalData['customer_payment_method'])) $updateData['customer_payment_method'] = $additionalData['customer_payment_method'];
        if (isset($additionalData['customer_payment_details'])) $updateData['customer_payment_details'] = $additionalData['customer_payment_details'];
        if (array_key_exists('remark', $additionalData)) $updateData['remark'] = $additionalData['remark'];

        if (!empty($updateData)) {
            $this->db->update('ticket_additional_info', $updateData, 'bookings_ticket_id = :id', ['id' => $ticketId]);
        }
    }

    /**
     * Update ticket pricing
     */
    private function updateTicketPricing($ticketId, $pricingData)
    {
        $updateData = [];

        // ADT1 pricing
        if (isset($pricingData['adt1_net_price'])) $updateData['adt1_net_price'] = $pricingData['adt1_net_price'];
        if (isset($pricingData['adt1_sale_price'])) $updateData['adt1_sale_price'] = $pricingData['adt1_sale_price'];
        if (isset($pricingData['adt1_pax'])) $updateData['adt1_pax'] = $pricingData['adt1_pax'];
        if (isset($pricingData['adt1_total'])) $updateData['adt1_total'] = $pricingData['adt1_total'];

        // ADT2 pricing
        if (isset($pricingData['adt2_net_price'])) $updateData['adt2_net_price'] = $pricingData['adt2_net_price'];
        if (isset($pricingData['adt2_sale_price'])) $updateData['adt2_sale_price'] = $pricingData['adt2_sale_price'];
        if (isset($pricingData['adt2_pax'])) $updateData['adt2_pax'] = $pricingData['adt2_pax'];
        if (isset($pricingData['adt2_total'])) $updateData['adt2_total'] = $pricingData['adt2_total'];

        // ADT3 pricing
        if (isset($pricingData['adt3_net_price'])) $updateData['adt3_net_price'] = $pricingData['adt3_net_price'];
        if (isset($pricingData['adt3_sale_price'])) $updateData['adt3_sale_price'] = $pricingData['adt3_sale_price'];
        if (isset($pricingData['adt3_pax'])) $updateData['adt3_pax'] = $pricingData['adt3_pax'];
        if (isset($pricingData['adt3_total'])) $updateData['adt3_total'] = $pricingData['adt3_total'];

        // Totals
        if (isset($pricingData['vat_percent'])) $updateData['vat_percent'] = $pricingData['vat_percent'];
        if (isset($pricingData['vat_amount'])) $updateData['vat_amount'] = $pricingData['vat_amount'];
        if (isset($pricingData['total_amount'])) $updateData['total_amount'] = $pricingData['total_amount'];

        if (!empty($updateData)) {
            $this->db->update('tickets_pricing', $updateData, 'bookings_ticket_id = :id', ['id' => $ticketId]);
        }
    }

    /**
     * Update passengers (delete + insert pattern)
     */
    private function updateTicketPassengers($ticketId, $passengers)
    {
        // Delete existing
        $this->db->delete('tickets_passengers', 'bookings_ticket_id = :id', ['id' => $ticketId]);

        // Insert new
        foreach ($passengers as $passenger) {
            if (!empty($passenger['passenger_name']) && trim($passenger['passenger_name']) !== '') {
                $this->db->insert('tickets_passengers', [
                    'bookings_ticket_id' => $ticketId,
                    'passenger_name' => $passenger['passenger_name'],
                    'age' => $passenger['age'] ?? null,
                    'ticket_number' => $passenger['ticket_number'] ?? null,
                    'ticket_code' => $passenger['ticket_code'] ?? null
                ]);
            }
        }
    }

    /**
     * Update routes (delete + insert pattern)
     */
    private function updateTicketRoutes($ticketId, $routes)
    {
        // Delete existing
        $this->db->delete('tickets_routes', 'bookings_ticket_id = :id', ['id' => $ticketId]);

        // Insert new
        foreach ($routes as $route) {
            if (!empty($route['origin']) || !empty($route['destination'])) {
                $this->db->insert('tickets_routes', [
                    'bookings_ticket_id' => $ticketId,
                    'flight_number' => $route['flight_number'] ?? null,
                    'rbd' => $route['rbd'] ?? null,
                    'date' => $route['date'] ?? null,
                    'origin' => $route['origin'] ?? null,
                    'destination' => $route['destination'] ?? null,
                    'departure_time' => $route['departure_time'] ?? null,
                    'arrival_time' => $route['arrival_time'] ?? null
                ]);
            }
        }
    }

    /**
     * Update extras (delete + insert pattern)
     */
    private function updateTicketExtras($ticketId, $extras)
    {
        // Delete existing
        $this->db->delete('tickets_extras', 'bookings_ticket_id = :id', ['id' => $ticketId]);

        // Insert new
        foreach ($extras as $extra) {
            if (!empty($extra['description']) && trim($extra['description']) !== '') {
                $this->db->insert('tickets_extras', [
                    'bookings_ticket_id' => $ticketId,
                    'description' => $extra['description'],
                    'net_price' => $extra['net_price'] ?? 0,
                    'sale_price' => $extra['sale_price'] ?? 0,
                    'quantity' => $extra['quantity'] ?? 1,
                    'total_amount' => $extra['total_amount'] ?? 0
                ]);
            }
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
}
