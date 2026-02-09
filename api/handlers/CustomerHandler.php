<?php
// api/handlers/CustomerHandler.php
// Customer operations handler
// จัดการ CRUD operations สำหรับ customers

require_once 'BaseHandler.php';

class CustomerHandler extends BaseHandler
{
    /**
     * Handle customer actions
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
                case 'getCustomers':
                    return $this->getCustomers();
                case 'getCustomerById':
                    return $this->getCustomerById();
                case 'createCustomer':
                    return $this->createCustomer();
                case 'updateCustomer':
                    return $this->updateCustomer();
                case 'deactivateCustomer':
                    return $this->deactivateCustomer();
                default:
                    return $this->errorResponse("Unknown customer action: {$action}");
            }
        } catch (Exception $e) {
            $this->logMessage("CustomerHandler error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Customer handler error: ' . $e->getMessage(), 500);
        }
    }

    // ✨ เพิ่มฟังก์ชันใหม่
    /**
     * ปิดการใช้งานลูกค้า (Soft Delete)
     */
    private function deactivateCustomer()
    {
        $id = $this->request['id'] ?? null;

        if (!$id) {
            return $this->errorResponse('Customer ID is required', 400);
        }

        try {
            $result = $this->db->update('customers', ['active' => 0], 'id = :id', ['id' => $id]);

            if ($result['success']) {
                $this->logMessage("Deactivated customer ID: {$id}");
                return $this->successResponse(null, 'Customer deactivated successfully');
            }

            return $this->errorResponse($result['error'] ?? 'Failed to deactivate customer');
        } catch (Exception $e) {
            $this->logMessage("Error deactivating customer: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to deactivate customer: ' . $e->getMessage());
        }
    }

    /**
     * ดึงรายการลูกค้า พร้อม search และ limit
     * Copy จาก gateway.php เดิม
     */
    private function getCustomers()
    {
        $search = $this->request['search'] ?? '';
        $limit = $this->request['limit'] ?? 10;
        $active = $this->request['active'] ?? true;

        $result = $this->db->getCustomers($search, $limit, $active);

        if ($result['success']) {
            // Process data to match original service format
            $processedData = array_map(function ($customer) {
                // Create full_address from address lines
                $addressParts = array_filter([
                    $customer['address_line1'] ?? '',
                    $customer['address_line2'] ?? '',
                    $customer['address_line3'] ?? ''
                ]);

                $customer['address'] = implode(' ', $addressParts);
                $customer['full_address'] = $customer['address'];
                $customer['full_name'] = $customer['name'];

                return $customer;
            }, $result['data']);

            return $this->successResponse($processedData, null, $result['count']);
        }

        return $this->errorResponse($result['error']);
    }

    /**
     * ดึงข้อมูลลูกค้าตาม ID
     */
    private function getCustomerById()
    {
        $id = $this->request['id'] ?? null;
        if (!$id) {
            return $this->errorResponse('Customer ID is required', 400);
        }

        $result = $this->db->getById('customers', $id);

        if ($result['success']) {
            $customer = $result['data'];

            // Process address data
            $addressParts = array_filter([
                $customer['address_line1'] ?? '',
                $customer['address_line2'] ?? '',
                $customer['address_line3'] ?? ''
            ]);

            $customer['address'] = implode(' ', $addressParts);
            $customer['full_address'] = $customer['address'];

            return $this->successResponse($customer);
        }

        return $this->errorResponse($result['error']);
    }

    /**
     * สร้างลูกค้าใหม่
     */
    private function createCustomer()
    {
        $data = $this->request['data'] ?? $this->request;

        // Remove action from data if present
        unset($data['action']);

        // Validate required fields
        if (empty($data['name'])) {
            return $this->errorResponse('Customer name is required', 400);
        }

        // Validate code length if provided
        if (isset($data['code']) && $data['code']) {
            if (strlen($data['code']) < 3 || strlen($data['code']) > 5) {
                return $this->errorResponse('รหัสลูกค้าต้องเป็น 3-5 ตัวอักษร', 400);
            }

            // ตรวจสอบรหัสซ้ำ (ยกเว้น WKIN และ WALK IN ที่ซ้ำได้)
            $allowDuplicateCodes = ['WKIN', 'WALK IN'];
            if (!in_array(strtoupper($data['code']), $allowDuplicateCodes)) {
                $existingCustomer = $this->db->select(
                    "SELECT id FROM customers WHERE code = :code AND active = 1",
                    ['code' => $data['code']]
                );

                if ($existingCustomer['success'] && !empty($existingCustomer['data'])) {
                    return $this->errorResponse('รหัสลูกค้านี้มีอยู่ในระบบแล้ว', 400);
                }
            }
        }

        // Validate email format
        if (isset($data['email']) && $data['email'] && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return $this->errorResponse('รูปแบบอีเมลไม่ถูกต้อง', 400);
        }

        // Handle address backward compatibility
        $addressLine1 = $data['address_line1'] ?? $data['address'] ?? null;

        // Prepare data for insertion
        $payload = [
            'name' => $data['name'],
            'code' => $data['code'] ?? null,
            'email' => $data['email'] ?? null,
            'address_line1' => $addressLine1,
            'address_line2' => $data['address_line2'] ?? null,
            'address_line3' => $data['address_line3'] ?? null,
            'id_number' => $data['id_number'] ?? null,
            'phone' => $data['phone'] ?? null,
            'credit_days' => $data['credit_days'] ?? 0,
            'branch_type' => $data['branch_type'] ?? 'Head Office',
            'branch_number' => $data['branch_number'] ?? null,
            'active' => 1
        ];

        $result = $this->db->insert('customers', $payload);

        if ($result['success']) {
            $this->logMessage("Created customer: {$data['name']} (ID: {$result['id']})");
            return $this->successResponse(['customerId' => $result['id']], 'Customer created successfully');
        }

        return $this->errorResponse($result['error']);
    }

    /**
     * อัปเดตข้อมูลลูกค้า
     */
    private function updateCustomer()
    {
        $id = $this->request['id'] ?? null;
        $data = $this->request['data'] ?? $this->request;

        if (!$id) {
            return $this->errorResponse('Customer ID is required', 400);
        }

        // Remove action and id from data if present
        unset($data['action'], $data['id']);

        // Validate required fields
        if (empty($data['name'])) {
            return $this->errorResponse('Customer name is required', 400);
        }

        // Validate address
        if (empty($data['address_line1']) && empty($data['address'])) {
            return $this->errorResponse('ที่อยู่บรรทัดที่ 1 เป็นข้อมูลที่จำเป็น', 400);
        }

        // Validate code if provided
        if (isset($data['code']) && $data['code']) {
            if (strlen($data['code']) < 3 || strlen($data['code']) > 5) {
                return $this->errorResponse('รหัสลูกค้าต้องเป็น 3-5 ตัวอักษร', 400);
            }

            // ตรวจสอบรหัสซ้ำ (ยกเว้น WKIN และ WALK IN ที่ซ้ำได้)
            $allowDuplicateCodes = ['WKIN', 'WALK IN'];
            if (!in_array(strtoupper($data['code']), $allowDuplicateCodes)) {
                $existingCustomer = $this->db->select(
                    "SELECT id FROM customers WHERE code = :code AND id != :id AND active = 1",
                    ['code' => $data['code'], 'id' => $id]
                );

                if ($existingCustomer['success'] && !empty($existingCustomer['data'])) {
                    return $this->errorResponse('รหัสลูกค้านี้มีอยู่ในระบบแล้ว', 400);
                }
            }
        }

        // Validate email
        if (isset($data['email']) && $data['email'] && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return $this->errorResponse('รูปแบบอีเมลไม่ถูกต้อง', 400);
        }

        // Validate branch data
        if (($data['branch_type'] ?? '') === 'Branch' && empty($data['branch_number'])) {
            return $this->errorResponse('Branch number is required when branch type is Branch', 400);
        }

        // Handle address backward compatibility
        $addressLine1 = $data['address_line1'] ?? $data['address'] ?? null;

        // Prepare data for update
        $payload = [
            'name' => $data['name'],
            'code' => $data['code'] ?? null,
            'email' => $data['email'] ?? null,
            'address_line1' => $addressLine1,
            'address_line2' => $data['address_line2'] ?? null,
            'address_line3' => $data['address_line3'] ?? null,
            'id_number' => $data['id_number'] ?? null,
            'phone' => $data['phone'] ?? null,
            'branch_type' => $data['branch_type'] ?? 'Head Office',
            'branch_number' => ($data['branch_type'] ?? '') === 'Branch' ? $data['branch_number'] : null,
            'credit_days' => $data['credit_days'] ?? 0
        ];

        $result = $this->db->update('customers', $payload, 'id = :id', ['id' => $id]);

        if ($result['success']) {
            // Get updated customer data
            $customerResult = $this->db->getById('customers', $id);
            if ($customerResult['success']) {
                $customer = $customerResult['data'];

                // Add address for backward compatibility
                $addressParts = array_filter([
                    $customer['address_line1'] ?? '',
                    $customer['address_line2'] ?? '',
                    $customer['address_line3'] ?? ''
                ]);

                $customer['address'] = implode(' ', $addressParts);
                $customer['full_address'] = $customer['address'];

                $this->logMessage("Updated customer ID: {$id}");
                return $this->successResponse(['customer' => $customer], 'Customer updated successfully');
            }
        }

        return $this->errorResponse($result['error'] ?? 'Failed to update customer');
    }
}
