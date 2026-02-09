<?php
// api/handlers/TicketSupplierHandler.php
// Ticket Supplier Search Operations Handler - Phase 5 Final
// จัดการการค้นหา Supplier สำหรับ ticket operations

require_once 'BaseHandler.php';

class TicketSupplierHandler extends BaseHandler
{
    /**
     * Handle supplier search actions
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
                // Supplier search operations
                case 'searchSupplierByNumericCode':
                    return $this->searchSupplierByNumericCode();
                case 'searchSupplierByCode':
                    return $this->searchSupplierByCode();
                default:
                    return $this->errorResponse("Unknown supplier action: {$action}");
            }
        } catch (Exception $e) {
            $this->logMessage("TicketSupplierHandler error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Supplier handler error: ' . $e->getMessage(), 500);
        }
    }

    // ===========================================
    // SUPPLIER SEARCH OPERATIONS
    // ===========================================

    /**
     * Search supplier by numeric code (สำหรับ SaleTicket.jsx)
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
     * Search supplier by code (สำหรับ SaleTicket.jsx)
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

    // ===========================================
    // VALIDATION & HELPER METHODS
    // ===========================================

    /**
     * Validate supplier search parameters
     */
    private function validateSupplierSearchParams($code, $numericCode = null)
    {
        if (empty($code) && empty($numericCode)) {
            return false;
        }

        // Code validation: should be 2-3 characters
        if (!empty($code) && (strlen($code) < 2 || strlen($code) > 3)) {
            return false;
        }

        // Numeric code validation: should be numeric and 3 digits
        if (!empty($numericCode) && (!is_numeric($numericCode) || strlen($numericCode) !== 3)) {
            return false;
        }

        return true;
    }

    /**
     * Format supplier response for consistency
     */
    private function formatSupplierResponse($supplier)
    {
        if (!$supplier) {
            return null;
        }

        return [
            'id' => $supplier['id'],
            'name' => $supplier['name'],
            'code' => $supplier['code'],
            'numeric_code' => $supplier['numeric_code'],
            'category' => $supplier['category'],
            'active' => $supplier['active']
        ];
    }

    /**
     * Get airline suppliers with enhanced search
     */
    public function getAirlineSuppliers($search = '', $limit = 50)
    {
        try {
            $sql = "
            SELECT id, name, code, numeric_code, category 
            FROM information 
            WHERE category = 'airline' AND active = 1
        ";

            $params = [];

            if (!empty($search)) {
                $sql .= " AND (code LIKE :search1 OR name LIKE :search2 OR numeric_code LIKE :search3)";
                $params['search1'] = "%{$search}%";
                $params['search2'] = "%{$search}%";
                $params['search3'] = "%{$search}%";
            }

            $sql .= " ORDER BY code LIMIT :limit";
            $params['limit'] = (int)$limit;

            $result = $this->db->raw($sql, $params);

            if (!$result['success']) {
                return $this->errorResponse($result['error']);
            }

            $this->logMessage("Retrieved " . count($result['data']) . " airline suppliers");
            return $this->successResponse($result['data'], null, count($result['data']));
        } catch (Exception $e) {
            $this->logMessage("Error getting airline suppliers: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to get airline suppliers', 500);
        }
    }

    /**
     * Validate airline code format
     */
    private function validateAirlineCode($code)
    {
        // IATA airline codes are typically 2-3 characters
        if (empty($code) || strlen($code) < 2 || strlen($code) > 3) {
            return false;
        }

        // Should contain only letters
        if (!ctype_alpha($code)) {
            return false;
        }

        return true;
    }

    /**
     * Validate numeric airline code
     */
    private function validateNumericCode($numericCode)
    {
        // Numeric codes are typically 3 digits
        if (empty($numericCode) || strlen($numericCode) !== 3) {
            return false;
        }

        // Should be numeric
        if (!ctype_digit($numericCode)) {
            return false;
        }

        return true;
    }

    /**
     * Enhanced supplier search with multiple criteria
     */
    public function searchSupplierAdvanced($criteria)
    {
        try {
            $whereConditions = ["category = 'airline'", "active = 1"];
            $params = [];

            // Build dynamic where clause
            if (!empty($criteria['code'])) {
                $whereConditions[] = "code = :code";
                $params['code'] = strtoupper($criteria['code']);
            }

            if (!empty($criteria['numeric_code'])) {
                $whereConditions[] = "numeric_code = :numeric_code";
                $params['numeric_code'] = $criteria['numeric_code'];
            }

            if (!empty($criteria['name'])) {
                $whereConditions[] = "name LIKE :name";
                $params['name'] = "%{$criteria['name']}%";
            }

            $sql = "SELECT * FROM information WHERE " . implode(' AND ', $whereConditions) . " LIMIT 10";

            $result = $this->db->raw($sql, $params);

            if (!$result['success']) {
                return $this->errorResponse($result['error']);
            }

            $this->logMessage("Advanced supplier search completed");
            return $this->successResponse($result['data'], null, count($result['data']));
        } catch (Exception $e) {
            $this->logMessage("Error in advanced supplier search: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Advanced supplier search failed', 500);
        }
    }

    // ===========================================
    // CACHE MANAGEMENT (Future Enhancement)
    // ===========================================

    /**
     * Cache supplier data for faster lookups
     * Note: This is prepared for future Redis/Memcached integration
     */
    private function cacheSupplierData($key, $data, $ttl = 3600)
    {
        // TODO: Implement caching when Redis is available
        // For now, just log the cache operation
        $this->logMessage("Cache operation: storing {$key} for {$ttl} seconds");
        return true;
    }

    /**
     * Get cached supplier data
     */
    private function getCachedSupplierData($key)
    {
        // TODO: Implement cache retrieval when Redis is available
        // For now, return null (cache miss)
        return null;
    }

    /**
     * Clear supplier cache
     */
    public function clearSupplierCache()
    {
        // TODO: Implement cache clearing when Redis is available
        $this->logMessage("Supplier cache cleared");
        return $this->successResponse(null, 'Cache cleared successfully');
    }
}
