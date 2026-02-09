<?php
// api/handlers/BaseHandler.php
// Base class สำหรับทุก Handler
// มี common functionality ที่ทุก handler ต้องใช้

class BaseHandler
{
    protected $db;
    protected $request;
    protected $method;

    public function __construct()
    {
        // เชื่อมต่อ database (ใช้ DatabaseHandler ที่มีอยู่)
        $this->db = new DatabaseHandler();
        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->parseRequest();
    }

    /**
     * Parse incoming request data
     * รองรับทั้ง GET, POST, PUT, DELETE
     */
    private function parseRequest()
    {
        $this->request = [];

        switch ($this->method) {
            case 'GET':
                $this->request = $_GET;
                break;

            case 'POST':
            case 'PUT':
            case 'DELETE':
                // 1. Parse JSON body first
                $input = file_get_contents('php://input');
                $decoded = json_decode($input, true);

                if ($decoded) {
                    $this->request = $decoded;
                }

                // 2. Add GET params (ไม่ทับ existing keys)
                if (!empty($_GET)) {
                    foreach ($_GET as $key => $value) {
                        // เพิ่มเฉพาะ key ที่ไม่มีใน JSON body
                        if (!isset($this->request[$key])) {
                            $this->request[$key] = $value;
                        }
                    }
                }

                // 3. Log สำหรับ debug (ลบออกเมื่อใช้งานจริง)
                if (isset($_GET['debug'])) {
                    logMessage("Parsed request: " . json_encode($this->request), 'DEBUG');
                }
                break;
        }
    }

    /**
     * ส่ง success response
     * รูปแบบเดียวกับใน gateway.php เดิม
     */
    protected function successResponse($data, $message = null, $count = null)
    {
        $response = [
            'success' => true,
            'data' => $data
        ];

        if ($message) {
            $response['message'] = $message;
        }

        if ($count !== null) {
            $response['count'] = $count;
        }

        return $response;
    }

    /**
     * ส่ง error response
     * รูปแบบเดียวกับใน gateway.php เดิม
     */
    protected function errorResponse($message, $code = 400)
    {
        http_response_code($code);
        return [
            'success' => false,
            'error' => $message
        ];
    }

    /**
     * ตรวจสอบว่า database เชื่อมต่อหรือไม่
     */
    protected function checkDatabaseConnection()
    {
        if (!$this->db->isConnected()) {
            return $this->errorResponse('Database connection failed', 500);
        }
        return null;
    }

    /**
     * Log message (ใช้ function ที่มีใน config.php)
     */
    protected function logMessage($message, $level = 'INFO')
    {
        if (function_exists('logMessage')) {
            logMessage("[" . get_class($this) . "] " . $message, $level);
        }
    }

    /**
     * Validate required parameters
     */
    protected function validateRequired($params, $requiredFields)
    {
        $missing = [];

        foreach ($requiredFields as $field) {
            if (!isset($params[$field]) || empty($params[$field])) {
                $missing[] = $field;
            }
        }

        if (!empty($missing)) {
            return $this->errorResponse(
                'Missing required fields: ' . implode(', ', $missing),
                400
            );
        }

        return null;
    }

    /**
     * Log activity to activity_logs table
     *
     * @param string $module - deposit, ticket, voucher, other, invoice, receipt
     * @param int $recordId - ID of the record
     * @param string|null $referenceNumber - Reference number (optional)
     * @param string $action - create, update, cancel, issue, print, email
     * @param int|null $userId - User ID (optional, will try session if not provided)
     * @return bool - Success status
     */
    protected function logActivity($module, $recordId, $referenceNumber, $action, $userId = null)
    {
        try {
            // Get user_id from parameter first, then fallback to session
            if ($userId === null) {
                if (isset($_SESSION['user_id'])) {
                    $userId = $_SESSION['user_id'];
                } else {
                    $this->logMessage("No user_id provided for activity log - skipping", 'WARNING');
                    return false; // No user logged in, skip logging
                }
            }

            // Insert activity log (without details)
            $sql = "INSERT INTO activity_logs (module, record_id, reference_number, action, user_id, created_at)
                    VALUES (:module, :recordId, :referenceNumber, :action, :userId, NOW())";

            $result = $this->db->raw($sql, [
                'module' => $module,
                'recordId' => $recordId,
                'referenceNumber' => $referenceNumber,
                'action' => $action,
                'userId' => $userId
            ]);

            return $result['success'] ?? false;
        } catch (Exception $e) {
            // Log error but don't fail the main operation
            $this->logMessage("Failed to log activity: " . $e->getMessage(), 'ERROR');
            return false;
        }
    }

    /**
     * Handle method ที่ทุก handler ต้อง implement
     * Abstract method pattern (แต่ไม่ใช้ abstract class เพื่อความง่าย)
     */
    public function handle($action)
    {
        // แต่ละ handler จะ override method นี้
        return $this->errorResponse('Handler method not implemented');
    }
}
