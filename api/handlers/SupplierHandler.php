<?php
// api/handlers/SupplierHandler.php
// Supplier operations handler
// จัดการ CRUD operations สำหรับ suppliers (information table)

require_once 'BaseHandler.php';

class SupplierHandler extends BaseHandler
{
    /**
     * Handle supplier actions
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
                case 'getSuppliers':
                    return $this->getSuppliers();
                case 'getSupplierById':
                    return $this->getSupplierById();
                case 'createSupplier':
                    return $this->createSupplier();
                case 'updateSupplier':
                    return $this->updateSupplier();
                case 'searchSupplierByNumericCode':
                    return $this->searchSupplierByNumericCode();
                case 'searchSupplierByCode':
                    return $this->searchSupplierByCode();
                case 'deactivateSupplier':
                    return $this->deactivateSupplier();
                default:
                    return $this->errorResponse("Unknown supplier action: {$action}");
            }
        } catch (Exception $e) {
            $this->logMessage("SupplierHandler error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Supplier handler error: ' . $e->getMessage(), 500);
        }
    }

    /**
     * ดึงรายการ Suppliers ตามประเภทและค้นหา
     */
    private function getSuppliers()
    {
        $type = $this->request['type'] ?? 'all';
        $search = $this->request['search'] ?? '';
        $limit = $this->request['limit'] ?? 100;

        $result = $this->db->getSuppliers($type, $search, $limit);

        if ($result['success']) {
            return $this->successResponse($result['data'], null, $result['count']);
        }

        return $this->errorResponse($result['error']);
    }

    /**
     * ดึงข้อมูล Supplier ตาม ID
     */
    private function getSupplierById()
    {
        $id = $this->request['id'] ?? null;
        if (!$id) {
            return $this->errorResponse('Supplier ID is required', 400);
        }

        $result = $this->db->getById('information', $id);

        if ($result['success']) {
            return $this->successResponse($result['data']);
        }

        return $this->errorResponse($result['error']);
    }

    /**
     * สร้าง Supplier ใหม่
     */
    private function createSupplier()
    {
        $data = $this->request['data'] ?? $this->request;
        unset($data['action']);

        // Map type to category
        $category = 'supplier-other';
        if (($data['type'] ?? '') === 'Airline') {
            $category = 'airline';
        } elseif (($data['type'] ?? '') === 'Voucher') {
            // ✅ Changed: Voucher now uses 'supplier-other' (2026-01-09)
            $category = 'supplier-other';
        }

        // Validate required fields
        if (empty($data['code']) || empty($data['name']) || empty($data['type'])) {
            return $this->errorResponse('Code, name, and type are required', 400);
        }

        // Validate numeric_code if provided
        if (isset($data['numeric_code']) && $data['numeric_code'] && strlen($data['numeric_code']) !== 3) {
            return $this->errorResponse('Numeric code must be exactly 3 digits', 400);
        }

        $payload = [
            'category' => $category,
            'code' => $data['code'] ?? '',
            'name' => $data['name'] ?? '',
            'phone' => $data['phone'] ?? null,
            'type' => $data['type'] ?? 'Other',
            'numeric_code' => $data['numeric_code'] ?? null,
            'active' => 1
        ];

        $result = $this->db->insert('information', $payload);

        if ($result['success']) {
            $this->logMessage("Created supplier: {$data['name']} (ID: {$result['id']})");
            return $this->successResponse(['supplierId' => $result['id']], 'Supplier created successfully');
        }

        return $this->errorResponse($result['error']);
    }

    /**
     * อัปเดต Supplier
     */
    private function updateSupplier()
    {
        $id = $this->request['id'] ?? null;
        $data = $this->request['data'] ?? $this->request;

        if (!$id) {
            return $this->errorResponse('Supplier ID is required', 400);
        }

        unset($data['action'], $data['id']);

        // Validate required fields
        if (empty($data['code']) || empty($data['name']) || empty($data['type'])) {
            return $this->errorResponse('Code, name, and type are required', 400);
        }

        // Validate numeric_code if provided
        if (isset($data['numeric_code']) && $data['numeric_code'] && strlen($data['numeric_code']) !== 3) {
            return $this->errorResponse('Numeric code must be exactly 3 digits', 400);
        }

        // Map type to category
        $category = 'supplier-other';
        if (($data['type'] ?? '') === 'Airline') {
            $category = 'airline';
        } elseif (($data['type'] ?? '') === 'Voucher') {
            // ✅ Changed: Voucher now uses 'supplier-other' (2026-01-09)
            $category = 'supplier-other';
        }

        // ใช้ raw SQL เพราะตาราง information ไม่มี updated_at
        $sql = "UPDATE information SET
                category = :category,
                code = :code,
                name = :name,
                phone = :phone,
                type = :type,
                numeric_code = :numeric_code
                WHERE id = :id";

        $params = [
            'category' => $category,
            'code' => $data['code'] ?? '',
            'name' => $data['name'] ?? '',
            'phone' => $data['phone'] ?? null,
            'type' => $data['type'] ?? 'Other',
            'numeric_code' => $data['numeric_code'] ?? null,
            'id' => $id
        ];

        $result = $this->db->raw($sql, $params);

        if ($result['success']) {
            // Get updated supplier data
            $supplierResult = $this->db->getById('information', $id);
            if ($supplierResult['success']) {
                $this->logMessage("Updated supplier ID: {$id}");
                return $this->successResponse($supplierResult['data'], 'Supplier updated successfully');
            }
        }

        return $this->errorResponse($result['error'] ?? 'Failed to update supplier');
    }

    /**
     * ค้นหา Supplier ด้วย numeric_code
     * ใช้ใน SaleTicket.jsx สำหรับ supplier lookup
     */
    private function searchSupplierByNumericCode()
    {
        $numericCode = $this->request['numericCode'] ?? null;

        if (!$numericCode) {
            return $this->errorResponse('Numeric code is required', 400);
        }

        try {
            $sql = "
            SELECT * FROM information 
            WHERE category = 'airline' 
            AND active = 1 
            AND numeric_code = :numericCode
            LIMIT 1
        ";

            $result = $this->db->raw($sql, ['numericCode' => $numericCode]);

            if (!$result['success']) {
                return $this->errorResponse($result['error']);
            }

            if (empty($result['data'])) {
                return $this->successResponse(null, 'Supplier not found');
            }

            $this->logMessage("Found supplier by numeric code: {$numericCode}");
            return $this->successResponse($result['data'][0], 'Supplier found');
        } catch (Exception $e) {
            $this->logMessage("Error in searchSupplierByNumericCode: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to search supplier', 500);
        }
    }

    /**
     * ค้นหา Supplier ด้วย code
     * ใช้ใน SaleTicket.jsx สำหรับ supplier lookup
     */
    private function searchSupplierByCode()
    {
        $code = $this->request['code'] ?? null;

        if (!$code) {
            return $this->errorResponse('Code is required', 400);
        }

        try {
            $sql = "
            SELECT * FROM information 
            WHERE category = 'airline' 
            AND active = 1 
            AND code = :code
            LIMIT 1
        ";

            $result = $this->db->raw($sql, ['code' => strtoupper($code)]);

            if (!$result['success']) {
                return $this->errorResponse($result['error']);
            }

            if (empty($result['data'])) {
                return $this->successResponse(null, 'Supplier not found');
            }

            $this->logMessage("Found supplier by code: {$code}");
            return $this->successResponse($result['data'][0], 'Supplier found');
        } catch (Exception $e) {
            $this->logMessage("Error in searchSupplierByCode: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to search supplier', 500);
        }
    }
    /**
     * ปิดการใช้งาน Supplier (Soft Delete)
     */
    private function deactivateSupplier()
    {
        $id = $this->request['id'] ?? null;

        if (!$id) {
            return $this->errorResponse('Supplier ID is required', 400);
        }

        try {
            // ใช้ raw SQL เพราะตาราง information ไม่มี updated_at
            $sql = "UPDATE information SET active = 0 WHERE id = :id";
            $result = $this->db->raw($sql, ['id' => $id]);

            if ($result['success']) {
                $this->logMessage("Deactivated supplier ID: {$id}");
                return $this->successResponse(null, 'Supplier deactivated successfully');
            }

            return $this->errorResponse($result['error'] ?? 'Failed to deactivate supplier');
        } catch (Exception $e) {
            $this->logMessage("Error in deactivateSupplier: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to deactivate supplier', 500);
        }
    }
}
