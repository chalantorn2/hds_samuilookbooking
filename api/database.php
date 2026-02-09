        <?php
        // api/database.php
        // MySQL Database Handler
        // Direct connection to MySQL instead of Supabase

        /**
         * Database Handler Class
         * จัดการการเชื่อมต่อและ query MySQL database
         */
        class DatabaseHandler
        {
            private $pdo;
            private $connected = false;

            public function __construct()
            {
                $this->connect();
            }

            /**
             * เชื่อมต่อกับ MySQL database
             */
            private function connect()
            {
                try {
                    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
                    $this->pdo = new PDO($dsn, DB_USER, DB_PASS, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
                    ]);

                    $this->connected = true;
                    logMessage("Database connected successfully");
                } catch (PDOException $e) {
                    $this->connected = false;
                    logMessage("Database connection failed: " . $e->getMessage(), 'ERROR');
                    throw new Exception("Database connection failed");
                }
            }

            /**
             * ตรวจสอบว่าเชื่อมต่อฐานข้อมูลหรือไม่
             */
            public function isConnected()
            {
                return $this->connected;
            }

            /**
             * Get PDO instance
             */
            public function getPdo()
            {
                return $this->pdo;
            }

            /**
             * Execute SELECT query with parameters
             */
            public function select($sql, $params = [])
            {
                try {
                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute($params);
                    $result = $stmt->fetchAll();

                    return [
                        'success' => true,
                        'data' => $result,
                        'count' => count($result)
                    ];
                } catch (PDOException $e) {
                    logMessage("SELECT Error: " . $e->getMessage(), 'ERROR');
                    return [
                        'success' => false,
                        'error' => $e->getMessage(),
                        'data' => []
                    ];
                }
            }

            /**
             * Execute SELECT query with LIMIT parameter binding
             * ใช้สำหรับ query ที่มี LIMIT เพื่อหลีกเลี่ยงปัญหา parameter binding
             */
            public function selectWithLimit($sql, $params = [], $limit = null)
            {
                try {
                    $stmt = $this->pdo->prepare($sql);

                    // Bind LIMIT parameter with PDO::PARAM_INT if exists
                    if ($limit !== null && strpos($sql, ':limit') !== false) {
                        $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
                    }

                    // Execute with remaining params
                    $stmt->execute($params);
                    $result = $stmt->fetchAll();

                    return [
                        'success' => true,
                        'data' => $result,
                        'count' => count($result)
                    ];
                } catch (PDOException $e) {
                    logMessage("SELECT Error: " . $e->getMessage(), 'ERROR');
                    return [
                        'success' => false,
                        'error' => $e->getMessage(),
                        'data' => []
                    ];
                }
            }

            /**
             * Execute INSERT query with parameters
             */
            public function insert($table, $data)
            {
                try {
                    // Transform data to uppercase (except excluded fields)
                    $data = transformToUpperCase($data);

                    // Add created_at timestamp
                    if (!isset($data['created_at'])) {
                        $data['created_at'] = date('Y-m-d H:i:s');
                    }

                    $columns = implode(',', array_keys($data));
                    $placeholders = ':' . implode(', :', array_keys($data));

                    $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";

                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute($data);

                    $insertId = $this->pdo->lastInsertId();

                    return [
                        'success' => true,
                        'id' => $insertId,
                        'affected_rows' => $stmt->rowCount()
                    ];
                } catch (PDOException $e) {
                    logMessage("INSERT Error: " . $e->getMessage(), 'ERROR');
                    return [
                        'success' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }

            /**
             * Execute UPDATE query with parameters
             */
            public function update($table, $data, $where, $whereParams = [])
            {
                try {
                    // Transform data to uppercase (except excluded fields)
                    $data = transformToUpperCase($data);

                    // Add updated_at timestamp
                    $data['updated_at'] = date('Y-m-d H:i:s');

                    $setClause = [];
                    foreach (array_keys($data) as $key) {
                        $setClause[] = "{$key} = :{$key}";
                    }
                    $setClause = implode(', ', $setClause);

                    $sql = "UPDATE {$table} SET {$setClause} WHERE {$where}";

                    // Merge data and where parameters
                    $params = array_merge($data, $whereParams);

                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute($params);

                    return [
                        'success' => true,
                        'affected_rows' => $stmt->rowCount()
                    ];
                } catch (PDOException $e) {
                    logMessage("UPDATE Error: " . $e->getMessage(), 'ERROR');
                    return [
                        'success' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }

            /**
             * Execute DELETE query with parameters
             */
            public function delete($table, $where, $whereParams = [])
            {
                try {
                    $sql = "DELETE FROM {$table} WHERE {$where}";

                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute($whereParams);

                    return [
                        'success' => true,
                        'affected_rows' => $stmt->rowCount()
                    ];
                } catch (PDOException $e) {
                    logMessage("DELETE Error: " . $e->getMessage(), 'ERROR');
                    return [
                        'success' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }

            /**
             * Get single record by ID
             */
            public function getById($table, $id, $columns = '*')
            {
                $sql = "SELECT {$columns} FROM {$table} WHERE id = :id LIMIT 1";
                $result = $this->select($sql, ['id' => $id]);

                if ($result['success'] && count($result['data']) > 0) {
                    return [
                        'success' => true,
                        'data' => $result['data'][0]
                    ];
                }

                return [
                    'success' => false,
                    'error' => 'Record not found',
                    'data' => null
                ];
            }

            // ===========================================
            // CUSTOMER SPECIFIC METHODS
            // ===========================================

            /**
             * Get customers with search and filters
             */
            public function getCustomers($search = '', $limit = 10, $active = true)
            {
                try {
                    $sql = "SELECT * FROM customers WHERE 1=1";
                    $params = [];

                    // Add active filter
                    if ($active !== null) {
                        $sql .= " AND active = :active";
                        $params['active'] = $active ? 1 : 0;
                    }

                    // ✨ เพิ่มเงื่อนไขซ่อน WKIN
                    $sql .= " AND UPPER(COALESCE(code, '')) != 'WKIN'";

                    // Add search filter - ใช้ parameter แยกกันเพื่อหลีกเลี่ยงการซ้ำ
                    if ($search) {
                        $sql .= " AND (
                            name LIKE :search1 OR 
                            COALESCE(code, '') LIKE :search2 OR 
                            COALESCE(email, '') LIKE :search3 OR 
                            COALESCE(phone, '') LIKE :search4 OR 
                            COALESCE(address_line1, '') LIKE :search5
                        )";
                        $params['search1'] = '%' . $search . '%';
                        $params['search2'] = '%' . $search . '%';
                        $params['search3'] = '%' . $search . '%';
                        $params['search4'] = '%' . $search . '%';
                        $params['search5'] = '%' . $search . '%';
                    }

                    $sql .= " ORDER BY name";

                    if ($limit) {
                        $sql .= " LIMIT :limit";
                        $params['limit'] = (int)$limit;
                    }

                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute($params);
                    $result = $stmt->fetchAll();

                    return [
                        'success' => true,
                        'data' => $result,
                        'count' => count($result)
                    ];
                } catch (PDOException $e) {
                    logMessage("getCustomers Error: " . $e->getMessage(), 'ERROR');
                    return [
                        'success' => false,
                        'error' => $e->getMessage(),
                        'data' => []
                    ];
                }
            }

            // ===========================================
            // SUPPLIER SPECIFIC METHODS
            // ===========================================

            public function getSuppliers($type = 'all', $search = '', $limit = 100)
            {
                try {
                    $sql = "SELECT * FROM information WHERE active = 1";
                    $params = [];

                    // Filter by type/category - ถ้าไม่ใช่ "all" ให้ filter
                    if ($type !== 'all' && !empty($type)) {
                        if ($type === 'Airline') {
                            $sql .= " AND category = :category";
                            $params['category'] = 'airline';
                        } elseif ($type === 'Voucher') {
                            // ✅ Changed: Voucher now uses 'supplier-other' (2026-01-09)
                            $sql .= " AND category = :category";
                            $params['category'] = 'supplier-other';
                        } elseif ($type === 'Other') {
                            $sql .= " AND category = :category";
                            $params['category'] = 'supplier-other';
                        }
                    }
                    // ถ้า type = 'all' จะไม่เพิ่ม filter ใดๆ = ค้นหาทุก category

                    // Add search - ใช้ parameter แยกกันเพื่อหลีกเลี่ยงการซ้ำ
                    if ($search) {
                        $sql .= " AND (code LIKE :search1 OR name LIKE :search2 OR COALESCE(numeric_code, '') LIKE :search3)";
                        $params['search1'] = '%' . $search . '%';
                        $params['search2'] = '%' . $search . '%';
                        $params['search3'] = '%' . $search . '%';
                    }

                    $sql .= " ORDER BY code";

                    if ($limit) {
                        $sql .= " LIMIT :limit";
                        $params['limit'] = (int)$limit;
                    }

                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute($params);
                    $result = $stmt->fetchAll();

                    return [
                        'success' => true,
                        'data' => $result,
                        'count' => count($result)
                    ];
                } catch (PDOException $e) {
                    logMessage("getSuppliers Error: " . $e->getMessage(), 'ERROR');
                    return [
                        'success' => false,
                        'error' => $e->getMessage(),
                        'data' => []
                    ];
                }
            }

            // ===========================================
            // CITY SPECIFIC METHODS
            // ===========================================

            public function getCitiesData($search = '', $limit = 100)
            {
                try {
                    $sql = "SELECT city_id, city_code, city_name, created_at, updated_at FROM city WHERE 1=1";
                    $params = [];

                    // Add search filter
                    if ($search) {
                        $sql .= " AND (city_code LIKE :search1 OR city_name LIKE :search2)";
                        $params['search1'] = '%' . $search . '%';
                        $params['search2'] = '%' . $search . '%';
                    }

                    $sql .= " ORDER BY city_code ASC";

                    if ($limit) {
                        $sql .= " LIMIT :limit";
                        $params['limit'] = (int)$limit;
                    }

                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute($params);
                    $result = $stmt->fetchAll();

                    return [
                        'success' => true,
                        'data' => $result,
                        'count' => count($result)
                    ];
                } catch (PDOException $e) {
                    logMessage("getCitiesData Error: " . $e->getMessage(), 'ERROR');
                    return [
                        'success' => false,
                        'error' => $e->getMessage(),
                        'data' => []
                    ];
                }
            }

            // ===========================================
            // USER SPECIFIC METHODS
            // ===========================================

            /**
             * Get users with search
             */
            public function getUsers($search = '', $limit = 10)
            {
                try {
                    $sql = "SELECT * FROM users WHERE 1=1";
                    $params = [];

                    if ($search) {
                        $sql .= " AND fullname LIKE :search";
                        $params['search'] = '%' . $search . '%';
                    }

                    $sql .= " ORDER BY fullname";

                    if ($limit) {
                        $sql .= " LIMIT :limit";
                        $params['limit'] = (int)$limit;
                    }

                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute($params);
                    $result = $stmt->fetchAll();

                    return [
                        'success' => true,
                        'data' => $result,
                        'count' => count($result)
                    ];
                } catch (PDOException $e) {
                    logMessage("getUsers Error: " . $e->getMessage(), 'ERROR');
                    return [
                        'success' => false,
                        'error' => $e->getMessage(),
                        'data' => []
                    ];
                }
            }

            /**
             * Generate reference number for any table - UPDATED for shared VC
             */
            public function generateReferenceNumber($table, $prefix, $column = 'reference_number')
            {
                try {
                    $year = date('y'); // Get last 2 digits of year

                    // Special handling for VC numbers - shared across tables
                    if ($prefix === 'VC' && $column === 'vc_number') {
                        logMessage("VC Number sharing activated for year: {$year}", 'INFO');

                        // หาเลข VC สูงสุดจาก 2 ตาราง
                        $sql1 = "SELECT vc_number FROM bookings_voucher WHERE vc_number LIKE :pattern AND vc_number IS NOT NULL ORDER BY vc_number DESC LIMIT 1";
                        $sql2 = "SELECT vc_number FROM bookings_other WHERE vc_number LIKE :pattern AND vc_number IS NOT NULL ORDER BY vc_number DESC LIMIT 1";

                        $pattern = 'VC-' . $year . '-%';
                        $maxVc = null;
                        $maxSequence = 0;

                        // ดึงจากตาราง voucher
                        $stmt1 = $this->pdo->prepare($sql1);
                        $stmt1->execute(['pattern' => $pattern]);
                        $result1 = $stmt1->fetch();
                        if ($result1 && $result1['vc_number']) {
                            $parts = explode('-', $result1['vc_number']);
                            if (count($parts) >= 4) {
                                $sequence = (int)$parts[3];
                                if ($sequence > $maxSequence) {
                                    $maxSequence = $sequence;
                                    $maxVc = $result1['vc_number'];
                                }
                            }
                        }

                        // ดึงจากตาราง other
                        $stmt2 = $this->pdo->prepare($sql2);
                        $stmt2->execute(['pattern' => $pattern]);
                        $result2 = $stmt2->fetch();
                        if ($result2 && $result2['vc_number']) {
                            $parts = explode('-', $result2['vc_number']);
                            if (count($parts) >= 4) {
                                $sequence = (int)$parts[3];
                                if ($sequence > $maxSequence) {
                                    $maxSequence = $sequence;
                                    $maxVc = $result2['vc_number'];
                                }
                            }
                        }

                        $nextSequence = $maxSequence + 1;
                        $batchNumber = 1;

                        // If sequence exceeds 9999, increment batch and reset sequence
                        if ($nextSequence > 9999) {
                            $batchNumber++;
                            $nextSequence = 1;
                        }

                        $formattedSequence = str_pad($nextSequence, 4, '0', STR_PAD_LEFT);
                        $referenceNumber = "VC-{$year}-{$batchNumber}-{$formattedSequence}";

                        logMessage("Generated shared VC: {$referenceNumber} (previous max: {$maxVc}, sequence: {$maxSequence})", 'INFO');

                        return [
                            'success' => true,
                            'reference_number' => $referenceNumber
                        ];
                    }

                    // Original logic for other references (unchanged)
                    $sql = "SELECT {$column} FROM {$table} WHERE {$column} LIKE :pattern ORDER BY {$column} DESC LIMIT 1";
                    $params = ['pattern' => $prefix . '-' . $year . '-%'];

                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute($params);
                    $result = $stmt->fetch();

                    $batchNumber = 1;
                    $sequence = 1;

                    if ($result) {
                        $lastRef = $result[$column];
                        $parts = explode('-', $lastRef);

                        if (count($parts) >= 4) {
                            $lastYear = $parts[1];

                            if ($lastYear === $year) {
                                $batchNumber = (int)$parts[2];
                                $sequence = (int)$parts[3] + 1;

                                // If sequence exceeds 9999, increment batch and reset sequence
                                if ($sequence > 9999) {
                                    $batchNumber++;
                                    $sequence = 1;
                                }
                            }
                        }
                    }

                    $formattedSequence = str_pad($sequence, 4, '0', STR_PAD_LEFT);
                    $referenceNumber = "{$prefix}-{$year}-{$batchNumber}-{$formattedSequence}";

                    return [
                        'success' => true,
                        'reference_number' => $referenceNumber
                    ];
                } catch (PDOException $e) {
                    logMessage("generateReferenceNumber Error: " . $e->getMessage(), 'ERROR');

                    // Fallback: create simple reference number
                    $randomPart = str_pad(rand(1000, 9999), 4, '0', STR_PAD_LEFT);
                    $referenceNumber = "{$prefix}-" . date('y') . "-1-{$randomPart}";

                    logMessage("Using fallback reference number: {$referenceNumber}", 'WARNING');

                    return [
                        'success' => true,
                        'reference_number' => $referenceNumber
                    ];
                }
            }

            /**
             * 🔥 NEW: Generate shared VC number across voucher and other services - DEBUG VERSION
             */
            private function generateSharedVCNumber($year)
            {
                try {
                    logMessage("DEBUG: Starting generateSharedVCNumber for year: {$year}", 'INFO');

                    // Find all VC numbers from both tables
                    $sql = "
                    SELECT vc_number FROM bookings_voucher 
                    WHERE vc_number LIKE :pattern AND vc_number IS NOT NULL
                    UNION ALL
                    SELECT vc_number FROM bookings_other 
                    WHERE vc_number LIKE :pattern AND vc_number IS NOT NULL
                    ORDER BY vc_number
                ";

                    $params = ['pattern' => 'VC-' . $year . '-%'];

                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute($params);
                    $results = $stmt->fetchAll();

                    logMessage("DEBUG: Found " . count($results) . " existing VC numbers", 'INFO');

                    $maxSequence = 0;
                    $batchNumber = 1;

                    foreach ($results as $row) {
                        $vcNumber = $row['vc_number'];
                        logMessage("DEBUG: Processing VC: {$vcNumber}", 'INFO');

                        $parts = explode('-', $vcNumber);
                        if (count($parts) >= 4) {
                            $vcYear = $parts[1];
                            $vcBatch = (int)$parts[2];
                            $vcSequence = (int)$parts[3];

                            if ($vcYear === $year && $vcBatch === $batchNumber) {
                                if ($vcSequence > $maxSequence) {
                                    $maxSequence = $vcSequence;
                                }
                            }
                        }
                    }

                    $nextSequence = $maxSequence + 1;

                    // If sequence exceeds 9999, increment batch and reset sequence
                    if ($nextSequence > 9999) {
                        $batchNumber++;
                        $nextSequence = 1;
                    }

                    $formattedSequence = str_pad($nextSequence, 4, '0', STR_PAD_LEFT);
                    $referenceNumber = "VC-{$year}-{$batchNumber}-{$formattedSequence}";

                    logMessage("DEBUG: Generated shared VC number: {$referenceNumber} (max was: {$maxSequence})", 'INFO');

                    return [
                        'success' => true,
                        'reference_number' => $referenceNumber
                    ];
                } catch (PDOException $e) {
                    logMessage("generateSharedVCNumber Error: " . $e->getMessage(), 'ERROR');

                    // Fallback
                    $randomPart = str_pad(rand(1000, 9999), 4, '0', STR_PAD_LEFT);
                    $referenceNumber = "VC-" . date('y') . "-1-{$randomPart}";

                    logMessage("DEBUG: Fallback VC number: {$referenceNumber}", 'INFO');

                    return [
                        'success' => true,
                        'reference_number' => $referenceNumber
                    ];
                }
            }


            /**
             * Begin transaction
             */
            public function beginTransaction()
            {
                return $this->pdo->beginTransaction();
            }

            /**
             * Commit transaction
             */
            public function commit()
            {
                return $this->pdo->commit();
            }

            /**
             * Rollback transaction
             */
            public function rollback()
            {
                return $this->pdo->rollback();
            }

            /**
             * Execute raw SQL (use with caution)
             */
            public function raw($sql, $params = [])
            {
                try {
                    $stmt = $this->pdo->prepare($sql);
                    $stmt->execute($params);

                    // Check if it's a SELECT query
                    if (stripos(trim($sql), 'SELECT') === 0) {
                        $result = $stmt->fetchAll();
                        return [
                            'success' => true,
                            'data' => $result,
                            'count' => count($result)
                        ];
                    } else {
                        return [
                            'success' => true,
                            'affected_rows' => $stmt->rowCount()
                        ];
                    }
                } catch (PDOException $e) {
                    logMessage("Raw SQL Error: " . $e->getMessage(), 'ERROR');
                    return [
                        'success' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }
        }
