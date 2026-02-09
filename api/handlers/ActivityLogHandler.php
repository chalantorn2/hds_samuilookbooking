<?php
// api/handlers/ActivityLogHandler.php
// Handler for managing activity logs

require_once __DIR__ . '/BaseHandler.php';

class ActivityLogHandler extends BaseHandler
{
    public function handle($action)
    {
        // Check database connection
        $dbError = $this->checkDatabaseConnection();
        if ($dbError) {
            return $dbError;
        }

        switch ($action) {
            case 'getActivityLogs':
            case 'list':
                return $this->getActivityLogs();
            case 'logActivity':
                return $this->logActivityAction();
            default:
                return $this->errorResponse("Invalid action: {$action}", 400);
        }
    }

    /**
     * บันทึก Activity Log จาก frontend
     */
    private function logActivityAction()
    {
        try {
            $module = $this->request['module'] ?? null;
            $recordId = $this->request['recordId'] ?? null;
            $referenceNumber = $this->request['referenceNumber'] ?? null;
            $activityAction = $this->request['activityAction'] ?? null;
            $userId = $this->request['userId'] ?? null;

            if (!$module || !$recordId || !$activityAction || !$userId) {
                return $this->errorResponse('Missing required parameters: module, recordId, activityAction, userId', 400);
            }

            $result = $this->logActivity($module, $recordId, $referenceNumber, $activityAction, $userId);

            if ($result) {
                return $this->successResponse(null, 'Activity logged successfully');
            } else {
                return $this->errorResponse('Failed to log activity', 500);
            }
        } catch (Exception $e) {
            $this->logMessage("Error logging activity: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to log activity: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get activity logs with filters
     */
    private function getActivityLogs()
    {
        try {
            // Get filter parameters
            $startDate = $this->request['startDate'] ?? null;
            $endDate = $this->request['endDate'] ?? null;
            $filterModule = $this->request['filterModule'] ?? 'all';
            $filterAction = $this->request['filterAction'] ?? 'all';
            $filterUser = $this->request['filterUser'] ?? 'all';
            $searchTerm = $this->request['searchTerm'] ?? '';
            $sortField = $this->request['sortField'] ?? 'created_at';
            $sortDirection = $this->request['sortDirection'] ?? 'desc';

            // Build SQL query
            $sql = "SELECT
                        al.*,
                        u.fullname as username,
                        u.role as user_role
                    FROM activity_logs al
                    LEFT JOIN users u ON al.user_id = u.id
                    WHERE 1=1";

            $params = [];

            // Date range filter
            if ($startDate && $endDate) {
                $sql .= " AND DATE(al.created_at) BETWEEN ? AND ?";
                $params[] = $startDate;
                $params[] = $endDate;
            }

            // Module filter
            if ($filterModule !== 'all') {
                $sql .= " AND al.module = ?";
                $params[] = $filterModule;
            }

            // Action filter
            if ($filterAction !== 'all') {
                $sql .= " AND al.action = ?";
                $params[] = $filterAction;
            }

            // User filter
            if ($filterUser !== 'all') {
                $sql .= " AND al.user_id = ?";
                $params[] = intval($filterUser);
            }

            // Search term
            if (!empty($searchTerm)) {
                $sql .= " AND (al.reference_number LIKE ? OR u.fullname LIKE ? OR al.details LIKE ?)";
                $searchPattern = '%' . $searchTerm . '%';
                $params[] = $searchPattern;
                $params[] = $searchPattern;
                $params[] = $searchPattern;
            }

            // Sorting
            $allowedSortFields = ['id', 'created_at', 'module', 'action', 'username'];
            if (!in_array($sortField, $allowedSortFields)) {
                $sortField = 'created_at';
            }

            $sortDirection = strtoupper($sortDirection) === 'ASC' ? 'ASC' : 'DESC';

            if ($sortField === 'username') {
                $sql .= " ORDER BY u.fullname {$sortDirection}";
            } else {
                $sql .= " ORDER BY al.{$sortField} {$sortDirection}";
            }

            // Execute query
            $result = $this->db->select($sql, $params);

            if (!$result['success']) {
                throw new Exception($result['error'] ?? 'Database query failed');
            }

            $logs = $result['data'];

            // Decode JSON details
            foreach ($logs as &$log) {
                if (!empty($log['details'])) {
                    $log['details'] = json_decode($log['details'], true);
                }
            }

            return $this->successResponse($logs, 'Activity logs retrieved successfully', count($logs));
        } catch (Exception $e) {
            $this->logMessage("Error fetching activity logs: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to fetch activity logs: ' . $e->getMessage(), 500);
        }
    }
}
