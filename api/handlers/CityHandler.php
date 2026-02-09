<?php
// api/handlers/CityHandler.php
// City operations handler
// จัดการ CRUD operations สำหรับ city (เมือง)

require_once 'BaseHandler.php';

class CityHandler extends BaseHandler
{
    /**
     * Handle city actions
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
                case 'getCities':
                    return $this->getCities();
                case 'getCityById':
                    return $this->getCityById();
                case 'createCity':
                    return $this->createCity();
                case 'updateCity':
                    return $this->updateCity();
                case 'deleteCity':
                    return $this->deleteCity();
                default:
                    return $this->errorResponse("Unknown city action: {$action}");
            }
        } catch (Exception $e) {
            $this->logMessage("CityHandler error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('City handler error: ' . $e->getMessage(), 500);
        }
    }

    /**
     * ดึงรายการเมืองทั้งหมด พร้อม search
     */
    private function getCities()
    {
        $search = $this->request['search'] ?? '';
        $limit = $this->request['limit'] ?? 100;

        $result = $this->db->getCitiesData($search, $limit);

        if ($result['success']) {
            return $this->successResponse($result['data'], null, $result['count']);
        }

        return $this->errorResponse($result['error']);
    }

    /**
     * ดึงข้อมูลเมืองตาม ID
     */
    private function getCityById()
    {
        $id = $this->request['id'] ?? null;
        if (!$id) {
            return $this->errorResponse('City ID is required', 400);
        }

        try {
            $query = "SELECT city_id, city_code, city_name, created_at, updated_at
                     FROM city
                     WHERE city_id = :id
                     LIMIT 1";

            $result = $this->db->select($query, ['id' => $id]);

            if ($result['success'] && count($result['data']) > 0) {
                return $this->successResponse($result['data'][0]);
            }

            return $this->errorResponse('City not found');
        } catch (Exception $e) {
            $this->logMessage("Error getting city by ID: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to get city: ' . $e->getMessage());
        }
    }

    /**
     * สร้างเมืองใหม่
     */
    private function createCity()
    {
        $data = $this->request['data'] ?? $this->request;

        // Remove action from data if present
        unset($data['action']);

        // Validate required fields
        if (empty($data['city_code'])) {
            return $this->errorResponse('รหัสเมืองเป็นข้อมูลที่จำเป็น', 400);
        }

        if (empty($data['city_name'])) {
            return $this->errorResponse('ชื่อเมืองเป็นข้อมูลที่จำเป็น', 400);
        }

        // Validate code length (must be exactly 3 characters)
        if (strlen($data['city_code']) !== 3) {
            return $this->errorResponse('รหัสเมืองต้องเป็น 3 ตัวอักษรเท่านั้น', 400);
        }

        // Convert code to uppercase
        $data['city_code'] = strtoupper($data['city_code']);

        // Check for duplicate code
        try {
            $existingCity = $this->db->select(
                "SELECT city_id FROM city WHERE city_code = :code",
                ['code' => $data['city_code']]
            );

            if ($existingCity['success'] && !empty($existingCity['data'])) {
                return $this->errorResponse('รหัสเมืองนี้มีอยู่ในระบบแล้ว', 400);
            }
        } catch (Exception $e) {
            $this->logMessage("Error checking duplicate city code: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to validate city code: ' . $e->getMessage());
        }

        // Prepare data for insertion
        $payload = [
            'city_code' => $data['city_code'],
            'city_name' => $data['city_name']
        ];

        try {
            $result = $this->db->insert('city', $payload);

            if ($result['success']) {
                $this->logMessage("Created city: {$data['city_name']} ({$data['city_code']}) - ID: {$result['id']}");
                return $this->successResponse(['cityId' => $result['id']], 'City created successfully');
            }

            return $this->errorResponse($result['error']);
        } catch (Exception $e) {
            $this->logMessage("Error creating city: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to create city: ' . $e->getMessage());
        }
    }

    /**
     * อัปเดตข้อมูลเมือง
     */
    private function updateCity()
    {
        $id = $this->request['id'] ?? null;
        $data = $this->request['data'] ?? $this->request;

        if (!$id) {
            return $this->errorResponse('City ID is required', 400);
        }

        // Remove action and id from data if present
        unset($data['action'], $data['id']);

        // Validate required fields
        if (empty($data['city_code'])) {
            return $this->errorResponse('รหัสเมืองเป็นข้อมูลที่จำเป็น', 400);
        }

        if (empty($data['city_name'])) {
            return $this->errorResponse('ชื่อเมืองเป็นข้อมูลที่จำเป็น', 400);
        }

        // Validate code length (must be exactly 3 characters)
        if (strlen($data['city_code']) !== 3) {
            return $this->errorResponse('รหัสเมืองต้องเป็น 3 ตัวอักษรเท่านั้น', 400);
        }

        // Convert code to uppercase
        $data['city_code'] = strtoupper($data['city_code']);

        // Check for duplicate code (excluding current record)
        try {
            $existingCity = $this->db->select(
                "SELECT city_id FROM city WHERE city_code = :code AND city_id != :id",
                ['code' => $data['city_code'], 'id' => $id]
            );

            if ($existingCity['success'] && !empty($existingCity['data'])) {
                return $this->errorResponse('รหัสเมืองนี้มีอยู่ในระบบแล้ว', 400);
            }
        } catch (Exception $e) {
            $this->logMessage("Error checking duplicate city code: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to validate city code: ' . $e->getMessage());
        }

        try {
            // Use raw SQL query to avoid uppercase transformation issues
            $updateQuery = "UPDATE city
                           SET city_code = :city_code,
                               city_name = :city_name,
                               updated_at = NOW()
                           WHERE city_id = :id";

            $updateParams = [
                'city_code' => $data['city_code'],
                'city_name' => $data['city_name'],
                'id' => $id
            ];

            $updateResult = $this->db->raw($updateQuery, $updateParams);

            if ($updateResult['success']) {
                // Get updated city data
                $selectQuery = "SELECT city_id, city_code, city_name, created_at, updated_at
                               FROM city
                               WHERE city_id = :id
                               LIMIT 1";

                $cityResult = $this->db->select($selectQuery, ['id' => $id]);

                if ($cityResult['success'] && count($cityResult['data']) > 0) {
                    $this->logMessage("Updated city ID: {$id}");
                    return $this->successResponse(['city' => $cityResult['data'][0]], 'City updated successfully');
                }
            }

            return $this->errorResponse('Failed to update city');
        } catch (Exception $e) {
            $this->logMessage("Error updating city: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to update city: ' . $e->getMessage());
        }
    }

    /**
     * ลบเมือง (Hard Delete)
     */
    private function deleteCity()
    {
        $id = $this->request['id'] ?? null;

        if (!$id) {
            return $this->errorResponse('City ID is required', 400);
        }

        try {
            $result = $this->db->delete('city', 'city_id = :id', ['id' => $id]);

            if ($result['success']) {
                $this->logMessage("Deleted city ID: {$id}");
                return $this->successResponse(null, 'City deleted successfully');
            }

            return $this->errorResponse($result['error'] ?? 'Failed to delete city');
        } catch (Exception $e) {
            $this->logMessage("Error deleting city: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to delete city: ' . $e->getMessage());
        }
    }
}
