<?php
// api/config.php  
// Configuration file สำหรับ API Gateway

// ===========================================
// SUPABASE CONFIGURATION (Phase 1)
// ===========================================

// Supabase URL และ API Key (จากไฟล์ .env เดิม)
define('SUPABASE_URL', 'https://ljvegvwwrudrqmduuayb.supabase.co');
define('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqdmVndnd3cnVkcnFtZHV1YXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MzcyMjAsImV4cCI6MjA2MTUxMzIyMH0.Mbd1cbzxaNv8KGR2QV6dSUSezROMeeixgitf-KTuFRA');

// ===========================================
// MYSQL CONFIGURATION (Phase 2 - Future)
// ===========================================

// MySQL Database Configuration (Production)
define('DB_HOST', 'localhost');
define('DB_NAME', 'samui_hds');
define('DB_USER', 'samui_hds');
define('DB_PASS', 'Bm7g&6x92');
define('DB_CHARSET', 'utf8mb4');

// ===========================================
// API CONFIGURATION
// ===========================================

// API Settings
define('API_VERSION', '1.0');
define('API_TIMEOUT', 30); // seconds
define('API_MAX_REQUESTS_PER_MINUTE', 1000);

// CORS Settings
define('CORS_ALLOWED_ORIGINS', [
    'http://localhost:3000',           // Development
    'http://localhost:5173',           // Vite dev server
    'https://hds.samuilookbiz.com',    // Production domain
    'http://hds.samuilookbiz.com',     // Production domain (HTTP)
    'https://203.170.190.137',         // Server IP (HTTPS)
    'http://203.170.190.137'           // Server IP (HTTP)
]);

// ===========================================
// SECURITY CONFIGURATION
// ===========================================

// Security Settings
define('ENABLE_API_KEY_AUTH', false);  // Set to true if you want API key authentication
define('API_KEY', 'your-secret-api-key-here');

// Rate Limiting
define('ENABLE_RATE_LIMITING', false);  // Set to true to enable rate limiting

// Logging
define('ENABLE_LOGGING', true);
define('LOG_FILE', __DIR__ . '/logs/api.log');

// ===========================================
// ENVIRONMENT SETTINGS
// ===========================================

// Environment (development, staging, production)
define('ENVIRONMENT', 'production'); // Production environment

// Debug mode
define('DEBUG_MODE', false); // Disabled for production

// Error reporting
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get database connection (สำหรับ Phase 2)
 * @return PDO|null
 */
function getDbConnection()
{
    static $pdo = null;

    if ($pdo === null) {
        try {
            $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            error_log("Database connection error: " . $e->getMessage());
            return null;
        }
    }

    return $pdo;
}

/**
 * Log API requests and errors
 * @param string $message
 * @param string $level
 */
function logMessage($message, $level = 'INFO')
{
    if (!ENABLE_LOGGING) {
        return;
    }

    $logDir = dirname(LOG_FILE);
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }

    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;

    file_put_contents(LOG_FILE, $logEntry, FILE_APPEND | LOCK_EX);
}

/**
 * Check if request origin is allowed
 * @param string $origin
 * @return bool
 */
function isOriginAllowed($origin)
{
    return in_array($origin, CORS_ALLOWED_ORIGINS) || in_array('*', CORS_ALLOWED_ORIGINS);
}

/**
 * Set CORS headers
 */
function setCorsHeaders()
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (isOriginAllowed($origin)) {
        header("Access-Control-Allow-Origin: {$origin}");
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400'); // 24 hours
}

/**
 * Validate API key (ถ้าเปิดใช้งาน)
 * @return bool
 */
function validateApiKey()
{
    if (!ENABLE_API_KEY_AUTH) {
        return true;
    }

    $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? $_GET['api_key'] ?? '';

    return $apiKey === API_KEY;
}

/**
 * Check rate limit (ถ้าเปิดใช้งาน)
 * @param string $identifier
 * @return bool
 */
function checkRateLimit($identifier = null)
{
    if (!ENABLE_RATE_LIMITING) {
        return true;
    }

    // Simple file-based rate limiting (production should use Redis/Memcached)
    $identifier = $identifier ?? $_SERVER['REMOTE_ADDR'];
    $rateLimitFile = __DIR__ . "/cache/rate_limit_{$identifier}";

    $now = time();
    $window = 60; // 1 minute window

    if (file_exists($rateLimitFile)) {
        $data = json_decode(file_get_contents($rateLimitFile), true);

        // Reset counter if window expired
        if ($now > $data['window_start'] + $window) {
            $data = ['count' => 0, 'window_start' => $now];
        }

        $data['count']++;

        if ($data['count'] > API_MAX_REQUESTS_PER_MINUTE) {
            return false; // Rate limit exceeded
        }
    } else {
        $data = ['count' => 1, 'window_start' => $now];

        // Create cache directory if not exists
        $cacheDir = dirname($rateLimitFile);
        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
        }
    }

    file_put_contents($rateLimitFile, json_encode($data));
    return true;
}

/**
 * Transform data to uppercase (maintain original logic) - ปรับปรุงแล้ว
 * @param mixed $data
 * @param array $excludeFields
 * @return mixed
 */
function transformToUpperCase($data, $excludeFields = [])
{
    if (!is_array($data) && !is_object($data)) {
        return $data;
    }

    $defaultExcludeFields = [
        'email',
        'password',
        'phone',
        'username',
        'fullname',
        'password_hash',
        'created_at',
        'updated_at',
        'id',
        'active',
        'credit_days',
        'age',
        'quantity',
        'net_price',
        'sale_price',
        'total_amount',
        'pax',
        'total',
        'vat_percent',
        'vat_amount',
        'grand_total',
        'subtotal_before_vat',
        'pricing_total',
        'extras_total',
        'issue_date',
        'due_date',
        'departure_time',
        'arrival_time',
        'date',
        'po_generated_at',
        'cancelled_at',
        'last_login',
        // เพิ่มฟิลด์ที่ไม่ต้องแปลง
        'search',
        'searchTerm',
        'contactDetails', // ถ้าเป็นที่อยู่อาจมีตัวเลข
        'remarks',
        // ✅ JSON fields ไม่ต้องแปลง uppercase
        'rc_selection_data',
        'rc_linked_tickets',
        'customer_override_data'
    ];

    $allExcludeFields = array_merge($defaultExcludeFields, $excludeFields);

    $result = is_object($data) ? clone $data : $data;

    foreach ($result as $key => $value) {
        // Skip excluded fields
        if (in_array($key, $allExcludeFields)) {
            continue;
        }

        // Transform string to uppercase - ปรับปรุงให้แปลงครบ
        if (is_string($value) && trim($value) !== '') {
            // บังคับแปลงเป็นตัวใหญ่ทั้งหมด
            $uppercaseValue = strtoupper(trim($value));

            if (is_object($result)) {
                $result->$key = $uppercaseValue;
            } else {
                $result[$key] = $uppercaseValue;
            }
        }
        // Recursive transformation for nested data
        elseif (is_array($value) || is_object($value)) {
            if (is_object($result)) {
                $result->$key = transformToUpperCase($value, $excludeFields);
            } else {
                $result[$key] = transformToUpperCase($value, $excludeFields);
            }
        }
    }

    return $result;
}

// ===========================================
// INITIALIZATION
// ===========================================

// Set CORS headers for all requests
setCorsHeaders();

// Validate API key if enabled
if (!validateApiKey()) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Invalid API key'
    ]);
    exit;
}

// Check rate limit if enabled
if (!checkRateLimit()) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'error' => 'Rate limit exceeded'
    ]);
    exit;
}

// Log request if enabled
if (ENABLE_LOGGING) {
    $method = $_SERVER['REQUEST_METHOD'];
    $uri = $_SERVER['REQUEST_URI'];
    $ip = $_SERVER['REMOTE_ADDR'];
    logMessage("API Request: {$method} {$uri} from {$ip}");
}
