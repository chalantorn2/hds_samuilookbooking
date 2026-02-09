<?php
// api/handlers/UserHandler.php
// User operations handler
// จัดการ CRUD operations สำหรับ users

require_once 'BaseHandler.php';

class UserHandler extends BaseHandler
{
    /**
     * Handle user actions
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
                case 'getUsers':
                    return $this->getUsers();
                case 'getUserById':
                    return $this->getUserById();
                case 'createUser':
                    return $this->createUser();
                case 'updateUser':
                    return $this->updateUser();
                case 'changePassword':
                    return $this->changePassword();
                case 'deleteUser':
                    return $this->deleteUser();
                case 'getUsersByIds':
                    return $this->getUsersByIds();
                case 'login':  // เพิ่มบรรทัดนี้
                    return $this->login();  // เพิ่มบรรทัดนี้
                default:
                    return $this->errorResponse("Unknown user action: {$action}");
            }
        } catch (Exception $e) {
            $this->logMessage("UserHandler error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('User handler error: ' . $e->getMessage(), 500);
        }
    }

    /**
     * ดึงรายการ Users พร้อม search และ limit
     * Copy จาก gateway.php บรรทัด ~600-650
     */
    private function getUsers()
    {
        $search = $this->request['search'] ?? '';
        $limit = $this->request['limit'] ?? 10;

        $result = $this->db->getUsers($search, $limit);

        if ($result['success']) {
            return $this->successResponse($result['data'], null, $result['count']);
        }

        return $this->errorResponse($result['error']);
    }

    /**
     * ดึงข้อมูล User ตาม ID
     * Copy จาก gateway.php บรรทัด ~650-670
     */
    private function getUserById()
    {
        $id = $this->request['id'] ?? null;
        if (!$id) {
            return $this->errorResponse('User ID is required', 400);
        }

        $result = $this->db->getById('users', $id);

        if ($result['success']) {
            return $this->successResponse($result['data']);
        }

        return $this->errorResponse($result['error']);
    }

    /**
     * สร้าง User ใหม่
     * Copy จาก gateway.php บรรทัด ~670-720
     */
    private function createUser()
    {
        $data = $this->request['data'] ?? $this->request;
        unset($data['action']);

        // Check for existing username or email
        $checkSql = "SELECT id FROM users WHERE username = :username OR email = :email";
        $checkResult = $this->db->select($checkSql, [
            'username' => $data['username'] ?? '',
            'email' => $data['email'] ?? ''
        ]);

        if ($checkResult['success'] && count($checkResult['data']) > 0) {
            return $this->errorResponse('ชื่อผู้ใช้หรืออีเมลนี้มีอยู่ในระบบแล้ว', 400);
        }

        $payload = [
            'username' => $data['username'] ?? '',
            'password' => $data['password'] ?? '', // Store plain text as per original
            'fullname' => $data['fullname'] ?? '',
            'email' => $data['email'] ?? '',
            'role' => $data['role'] ?? 'viewer',
            'active' => $data['active'] ?? 1
        ];

        $result = $this->db->insert('users', $payload);

        if ($result['success']) {
            $this->logMessage("Created user: {$data['username']} (ID: {$result['id']})");
            return $this->successResponse(['userId' => $result['id']], 'User created successfully');
        }

        return $this->errorResponse($result['error']);
    }

    /**
     * อัปเดตข้อมูล User
     * Copy จาก gateway.php บรรทัด ~720-760
     */
    private function updateUser()
    {
        $id = $this->request['id'] ?? null;
        $data = $this->request['data'] ?? $this->request;

        if (!$id) {
            return $this->errorResponse('User ID is required', 400);
        }

        unset($data['action'], $data['id']);

        // Check for existing email (excluding current user)
        $checkSql = "SELECT id FROM users WHERE email = :email AND id != :id";
        $checkResult = $this->db->select($checkSql, [
            'email' => $data['email'] ?? '',
            'id' => $id
        ]);

        if ($checkResult['success'] && count($checkResult['data']) > 0) {
            return $this->errorResponse('อีเมลนี้มีอยู่ในระบบแล้ว', 400);
        }

        $payload = [
            'fullname' => $data['fullname'] ?? '',
            'email' => $data['email'] ?? '',
            'role' => $data['role'] ?? 'viewer',
            'active' => $data['active'] ?? 1
        ];

        $result = $this->db->update('users', $payload, 'id = :id', ['id' => $id]);

        if ($result['success']) {
            $this->logMessage("Updated user ID: {$id}");
            return $this->successResponse(null, 'User updated successfully');
        }

        return $this->errorResponse($result['error']);
    }

    /**
     * เปลี่ยนรหัสผ่าน User
     * Copy จาก gateway.php บรรทัด ~760-780
     */
    private function changePassword()
    {
        $userId = $this->request['userId'] ?? null;
        $newPassword = $this->request['newPassword'] ?? null;

        if (!$userId || !$newPassword) {
            return $this->errorResponse('User ID and new password are required', 400);
        }

        $result = $this->db->update('users', ['password' => $newPassword], 'id = :id', ['id' => $userId]);

        if ($result['success']) {
            $this->logMessage("Changed password for user ID: {$userId}");
            return $this->successResponse(null, 'Password changed successfully');
        }

        return $this->errorResponse($result['error']);
    }

    /**
     * ลบ User
     * Copy จาก gateway.php บรรทัด ~780-800
     */
    private function deleteUser()
    {
        $userId = $this->request['userId'] ?? null;
        $hardDelete = $this->request['hardDelete'] ?? false;

        if (!$userId) {
            return $this->errorResponse('User ID is required', 400);
        }

        if ($hardDelete) {
            $result = $this->db->delete('users', 'id = :id', ['id' => $userId]);
        } else {
            $result = $this->db->update('users', ['active' => 0], 'id = :id', ['id' => $userId]);
        }

        if ($result['success']) {
            $this->logMessage("Deleted user ID: {$userId} (hard: " . ($hardDelete ? 'yes' : 'no') . ")");
            return $this->successResponse(null, 'User deleted successfully');
        }

        return $this->errorResponse($result['error']);
    }

    /**
     * ดึงข้อมูล Users ตาม IDs (สำหรับ FlightTicketDetail.jsx)
     * Copy จาก gateway.php บรรทัด ~1800-1830
     */
    private function getUsersByIds()
    {
        $userIds = $this->request['userIds'] ?? [];

        if (empty($userIds) || !is_array($userIds)) {
            return $this->errorResponse('User IDs array is required', 400);
        }

        try {
            // Filter out null/empty values
            $cleanUserIds = array_filter($userIds, function ($id) {
                return $id !== null && $id !== '';
            });

            if (empty($cleanUserIds)) {
                return $this->successResponse([]);
            }

            $placeholders = implode(',', array_fill(0, count($cleanUserIds), '?'));
            $sql = "SELECT id, fullname FROM users WHERE id IN ({$placeholders})";

            $result = $this->db->raw($sql, array_values($cleanUserIds));

            if (!$result['success']) {
                return $this->errorResponse($result['error']);
            }

            $this->logMessage("Retrieved " . count($result['data']) . " users by IDs");
            return $this->successResponse($result['data'], null, count($result['data']));
        } catch (Exception $e) {
            $this->logMessage("Error in getUsersByIds: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch users', 500);
        }
    }
    /**
     * Login authentication
     * Copy จาก gateway.php login logic
     */
    private function login()
    {
        $username = $this->request['username'] ?? null;
        $password = $this->request['password'] ?? null;
        $rememberMe = $this->request['rememberMe'] ?? false;

        if (!$username || !$password) {
            return $this->errorResponse('Username and password are required', 400);
        }

        try {
            // ค้นหา user
            $sql = "SELECT * FROM users WHERE username = :username AND active = 1";
            $result = $this->db->select($sql, ['username' => $username]);

            if (!$result['success'] || empty($result['data'])) {
                return $this->errorResponse('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
            }

            $user = $result['data'][0];

            // ตรวจสอบรหัสผ่าน (plain text comparison)
            if ($user['password'] !== $password) {
                return $this->errorResponse('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401);
            }

            // อัปเดต last_login
            $this->db->update('users', ['last_login' => date('Y-m-d H:i:s')], 'id = :id', ['id' => $user['id']]);

            // ลบรหัสผ่านออกจาก response
            unset($user['password']);

            $this->logMessage("User login successful: {$username}");
            return $this->successResponse([
                'user' => $user,
                'rememberMe' => $rememberMe
            ], 'Login successful');
        } catch (Exception $e) {
            $this->logMessage("Login error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 500);
        }
    }
}
