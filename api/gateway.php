<?php
// api/gateway.php
// API Gateway - Phase 5 Final - Complete TicketHandler Migration
// ✅ MIGRATION COMPLETE: All ticket operations moved to specialized handlers

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// เริ่มต้น session และ error handling
session_start();
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Load configuration
require_once 'config.php';
require_once 'database.php';

/**
 * API Gateway Class - Phase 5 Final
 * ✅ COMPLETE: All ticket operations migrated to specialized handlers
 * 🗑️ READY: TicketHandler.php can now be safely removed
 */
class ApiGateway
{
    private $handlers = [];
    private $request;
    private $method;

    // ✅ Phase 5 Final: Complete Handler Mapping - NO MORE FALLBACKS
    private $handlerMapping = [
        // ✅ Core Ticket Operations -> TicketCoreHandler (Phase 2)
        'createFlightTicket' => 'TicketCoreHandler',
        'getFlightTicketById' => 'TicketCoreHandler',
        'getFlightTicketsList' => 'TicketCoreHandler',
        'updateTicketStatus' => 'TicketCoreHandler',
        'cancelFlightTicket' => 'TicketCoreHandler',
        'cancelVoucher' => 'VoucherHandler',
        'cancelOther' => 'OtherHandler',
        'cancelDeposit' => 'DepositHandler',
        'generatePOForTicket' => 'TicketCoreHandler',
        'searchBookingsForDelete' => 'TicketCoreHandler',
        'permanentDeleteBookings' => 'TicketCoreHandler',

        // ✅ Detail & Edit Operations -> TicketDetailHandler (Phase 3)
        'getFlightTicketDetailById' => 'TicketDetailHandler',
        'getFlightTicketForEdit' => 'TicketDetailHandler',
        'updateFlightTicketComplete' => 'TicketDetailHandler',
        'getDepositForEdit' => 'DepositHandler',

        // ✅ Invoice & Receipt Operations -> TicketInvoiceHandler (Phase 4)
        'getInvoiceDataForTicket' => 'TicketInvoiceHandler',
        'getInvoiceTickets' => 'TicketInvoiceHandler',
        'getReceiptTickets' => 'TicketInvoiceHandler',
        'getAvailableReceipts' => 'TicketInvoiceHandler',

        // ⭐ Reference Number Generation -> ReferenceHandler
        'generateRCForTicket' => 'ReferenceHandler',  // ⭐ เปลี่ยนจาก TicketInvoiceHandler -> ReferenceHandler (รองรับ multi-PO)
        'generateINVForTicket' => 'ReferenceHandler',
        'generateINVNumber' => 'ReferenceHandler',

        // ⭐ Multi-PO Receipt Generation -> TicketInvoiceHandler
        'getAvailablePOsForRC' => 'TicketInvoiceHandler',
        'getCombinedInvoiceData' => 'TicketInvoiceHandler',

        // ✅ Phase 5 Final: Supplier Operations -> TicketSupplierHandler
        'searchSupplierByNumericCode' => 'TicketSupplierHandler',
        'searchSupplierByCode' => 'TicketSupplierHandler',

        // ⭐ DEPOSIT OPERATIONS -> DepositHandler
        'createDeposit' => 'DepositHandler',
        'getDepositById' => 'DepositHandler',
        'getDepositForEdit' => 'DepositHandler',
        'getDepositsList' => 'DepositHandler',
        'getDepositForView' => 'DepositHandler',
        'updateDepositStatus' => 'DepositHandler',
        'updateDepositComplete' => 'DepositHandler',
        'cancelDeposit' => 'DepositHandler',
        'generateDepositReferenceNumber' => 'DepositHandler',
        'getDepositSuppliers' => 'DepositHandler',

        // 🆕 VOUCHER OPERATIONS -> VoucherHandler
        'createVoucher' => 'VoucherHandler',
        'getVoucherById' => 'VoucherHandler',
        'getVoucherForEdit' => 'VoucherHandler',
        'getVouchersList' => 'VoucherHandler',
        'getVoucherForView' => 'VoucherHandler',
        'updateVoucherStatus' => 'VoucherHandler',
        'updateVoucherComplete' => 'VoucherHandler',
        'cancelVoucher' => 'VoucherHandler',
        'generateVoucherReferenceNumber' => 'VoucherHandler',
        'getVoucherSuppliers' => 'VoucherHandler',
        'generateVCForVoucher' => 'VoucherHandler',

        'createOther' => 'OtherHandler',
        'getOtherById' => 'OtherHandler',
        'getOtherForEdit' => 'OtherHandler',
        'getOthersList' => 'OtherHandler',
        'getOtherForView' => 'OtherHandler',
        'updateOtherStatus' => 'OtherHandler',
        'updateOtherComplete' => 'OtherHandler',
        'cancelOther' => 'OtherHandler',
        'generateOtherReferenceNumber' => 'OtherHandler',
        'getOtherSuppliers' => 'OtherHandler',
        'generateVCForOther' => 'OtherHandler',

        // Reference Number Generation by Service Type
        'generateInsuranceReferenceNumber' => 'OtherHandler',
        'generateHotelReferenceNumber' => 'OtherHandler',
        'generateTrainReferenceNumber' => 'OtherHandler',
        'generateVisaReferenceNumber' => 'OtherHandler',
        'generateOtherServiceReferenceNumber' => 'OtherHandler',

        // ✅ Non-ticket operations (unchanged)
        'getOverviewData' => 'OverviewHandler',
        'getFlightTicketsData' => 'OverviewHandler',
        'getVoucherOverviewData' => 'OverviewHandler',
        'getDepositOverviewData' => 'OverviewHandler',
        'getOtherOverviewData' => 'OverviewHandler',

        'searchAllBookingsForDelete' => 'TicketCoreHandler',
        'permanentDeleteAllBookings' => 'TicketCoreHandler',

        // ✅ EMAIL OPERATIONS -> EmailHandler
        'sendDocumentEmail' => 'EmailHandler',
        'sendInvoiceEmail' => 'EmailHandler',
        'sendReceiptEmail' => 'EmailHandler',
        'sendVoucherEmail' => 'EmailHandler',
        'sendBulkReceiptEmail' => 'EmailHandler',
        'testEmailConnection' => 'EmailHandler',

        // ✅ ACTIVITY LOG OPERATIONS -> ActivityLogHandler
        'getActivityLogs' => 'ActivityLogHandler',
        'logActivity' => 'ActivityLogHandler',

        // ✅ REPORT OPERATIONS -> ReportHandler
        // เมนูเดิม (Ticket Report เท่านั้น)
        'getTicketDailyReport' => 'ReportHandler',
        'getTicketInvoiceReport' => 'ReportHandler',
        'getTicketCustomerReport' => 'ReportHandler',
        'getTicketSupplierReport' => 'ReportHandler',
        'getTicketTypeReport' => 'ReportHandler',
        'updatePaymentStatus' => 'ReportHandler',
        'getPaymentDetails' => 'ReportHandler',

        // เมนูใหม่ (Report ที่รวม Flight+Voucher+Other+Deposit)
        'getDailyReportAll' => 'ReportHandler',
        'getAllInvoiceReportNew' => 'ReportHandler',
        'getCustomerReportNew' => 'ReportHandler',
        'getSupplierReportNew' => 'ReportHandler',
        'getTicketTypeReportNew' => 'ReportHandler',
        'getSpecialReport' => 'ReportHandler',
        'getOutstandingReceivables' => 'ReportHandler',

        // Payment Management
        'savePaymentDetail' => 'ReportHandler',
        'savePaymentDetails' => 'ReportHandler',

        // Payment Group Management (Link Multiple POs)
        'linkPOs' => 'ReportHandler',
        'unlinkPO' => 'ReportHandler',
        'getAvailablePOsForLink' => 'ReportHandler',
        'getPaymentGroupInfo' => 'ReportHandler',

        // ✅ CUSTOMER & SUPPLIER SEARCH -> For AutoComplete
        'getCustomers' => 'CustomerHandler',
        'getSuppliers' => 'SupplierHandler',
    ];

    public function __construct()
    {
        $this->method = $_SERVER['REQUEST_METHOD'];
        $this->parseRequest();
    }

    /**
     * Parse incoming request
     */
    private function parseRequest()
    {
        $this->request = [];

        // Get request data based on method
        switch ($this->method) {
            case 'GET':
                $this->request = $_GET;
                break;
            case 'POST':
            case 'PUT':
            case 'DELETE':
                $input = file_get_contents('php://input');
                $decoded = json_decode($input, true);
                if ($decoded) {
                    $this->request = $decoded;
                }
                // Merge with GET parameters if any
                $this->request = array_merge($this->request, $_GET);
                break;
        }
    }

    /**
     * Main request handler - Phase 5 Final
     */
    public function handleRequest()
    {
        try {
            // ตรวจสอบว่ามี action หรือไม่
            if (!isset($this->request['action'])) {
                return $this->errorResponse('Action parameter is required', 400);
            }

            $action = $this->request['action'];

            // ✅ Phase 5 Final Debug Log
            $this->logAction($action);

            // Route to appropriate handler
            $result = $this->routeToHandler($action);

            return $result;
        } catch (Exception $e) {
            error_log("API Gateway Error: " . $e->getMessage());
            return $this->errorResponse('Internal server error', 500);
        }
    }

    /**
     * Enhanced Route action to appropriate handler - Phase 5 Final
     * ✅ MIGRATION COMPLETE: No more TicketHandler fallbacks
     */
    private function routeToHandler($action)
    {
        // ✅ Phase 5 Final: Use specific mapping first (COMPLETE COVERAGE)
        if (isset($this->handlerMapping[$action])) {
            $handlerName = $this->handlerMapping[$action];
            $this->logMessage("Phase 5 Final: Using {$handlerName} for action: {$action}");
            return $this->loadHandler($handlerName)->handle($action);
        }

        // ✅ Pattern matching for non-ticket operations (unchanged)

        // Customer operations
        if (strpos($action, 'Customer') !== false || strpos($action, 'customer') !== false) {
            return $this->loadHandler('CustomerHandler')->handle($action);
        }

        // City operations
        if (strpos($action, 'City') !== false || strpos($action, 'Cities') !== false) {
            return $this->loadHandler('CityHandler')->handle($action);
        }

        // Supplier operations (general - not ticket-specific)
        if (strpos($action, 'Supplier') !== false || strpos($action, 'supplier') !== false) {
            return $this->loadHandler('SupplierHandler')->handle($action);
        }

        // User operations
        if (
            strpos($action, 'User') !== false || strpos($action, 'user') !== false ||
            $action === 'getUsersByIds' || $action === 'login'
        ) {
            return $this->loadHandler('UserHandler')->handle($action);
        }

        // Reference operations
        if (
            strpos($action, 'generate') !== false ||
            strpos($action, 'PO') !== false ||
            strpos($action, 'RC') !== false ||
            strpos($action, 'Reference') !== false
        ) {
            return $this->loadHandler('ReferenceHandler')->handle($action);
        }

        // Overview operations
        if (strpos($action, 'Overview') !== false) {
            return $this->loadHandler('OverviewHandler')->handle($action);
        }

        // Reference operations that might not have "generate" in name
        if (in_array($action, [
            'generateReferenceNumber',
            'generatePONumber',
            'generateRCNumber'
        ])) {
            return $this->loadHandler('ReferenceHandler')->handle($action);
        }

        // ✅ Final error message - Phase 5
        return $this->errorResponse("Unknown action: {$action}. Phase 5 Final: All ticket operations migrated. Check handlerMapping for coverage.");
    }

    /**
     * Load handler with enhanced error handling - Phase 5 Final
     */
    private function loadHandler($handlerName)
    {
        if (!isset($this->handlers[$handlerName])) {
            $handlerFile = "handlers/{$handlerName}.php";

            // ✅ Special check: Prevent loading old TicketHandler
            if ($handlerName === 'TicketHandler') {
                $this->logMessage("Phase 5 Final: Attempt to load deprecated TicketHandler blocked", 'WARNING');
                throw new Exception("TicketHandler is deprecated. Use specialized handlers instead.");
            }

            if (!file_exists($handlerFile)) {
                $this->logMessage("Phase 5 Final: Handler file not found: {$handlerFile}", 'ERROR');
                throw new Exception("Handler file not found: {$handlerFile}");
            }

            require_once $handlerFile;

            if (!class_exists($handlerName)) {
                $this->logMessage("Phase 5 Final: Handler class not found: {$handlerName}", 'ERROR');
                throw new Exception("Handler class not found: {$handlerName}");
            }

            $this->handlers[$handlerName] = new $handlerName();
            $this->logMessage("Phase 5 Final: Successfully loaded handler: {$handlerName}");
        }

        return $this->handlers[$handlerName];
    }

    /**
     * ✅ Enhanced: Log action requests for debugging (Phase 5 Final)
     */
    private function logAction($action)
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $timestamp = date('Y-m-d H:i:s');

        // Determine which handler will be used
        $handlerInfo = '';
        if (isset($this->handlerMapping[$action])) {
            $handlerName = $this->handlerMapping[$action];
            $phase = '';
            switch ($handlerName) {
                case 'TicketCoreHandler':
                    $phase = 'Phase 2';
                    break;
                case 'TicketDetailHandler':
                    $phase = 'Phase 3';
                    break;
                case 'TicketInvoiceHandler':
                    $phase = 'Phase 4';
                    break;
                case 'TicketSupplierHandler':
                    $phase = 'Phase 5';
                    break;
                default:
                    $phase = 'Non-Ticket';
            }
            $handlerInfo = " -> {$handlerName} ({$phase})";
        } else {
            $handlerInfo = " -> Pattern Matching (Non-Ticket)";
        }

        $this->logMessage("Phase 5 Final: {$method} {$action}{$handlerInfo} from {$ip}");
    }

    /**
     * Enhanced logging method - Phase 5 Final
     */
    private function logMessage($message, $level = 'INFO')
    {
        if (ENABLE_LOGGING) {
            logMessage($message, $level);
        }
    }

    /**
     * ส่ง error response
     */
    private function errorResponse($message, $code = 400)
    {
        http_response_code($code);
        return [
            'success' => false,
            'error' => $message,
            'phase' => 'Phase 5 Final', // ✅ Final debug info
            'migration_status' => 'COMPLETE' // ✅ Migration complete indicator
        ];
    }
}

// ===========================================
// MAIN EXECUTION - Phase 5 Final
// ===========================================

try {
    $gateway = new ApiGateway();
    $result = $gateway->handleRequest();

    // ✅ Add Phase info to successful responses
    if (is_array($result) && !isset($result['phase'])) {
        $result['phase'] = 'Phase 5 Final';
        $result['migration_status'] = 'COMPLETE';
    }

    echo json_encode($result, JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    error_log("Fatal API Gateway Error (Phase 5 Final): " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'phase' => 'Phase 5 Final',
        'migration_status' => 'COMPLETE',
        'timestamp' => date('c')
    ]);
}
