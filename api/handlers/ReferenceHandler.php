<?php
// api/handlers/ReferenceHandler.php
// Reference number generation handler
// จัดการการสร้างเลขอ้างอิงและ PO Number และ RC Number

require_once 'BaseHandler.php';

class ReferenceHandler extends BaseHandler
{
    /**
     * Handle reference actions
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
                case 'generateReferenceNumber':
                    return $this->generateReferenceNumber();
                case 'generatePONumber':
                    return $this->generatePONumber();
                case 'generatePOForTicket':
                    return $this->generatePOForTicket();
                case 'generateRCNumber':  // ใหม่
                    return $this->generateRCNumber();
                case 'generateRCForTicket':  // ใหม่
                    return $this->generateRCForTicket();
                case 'generateINVNumber':  // ใหม่ - สำหรับ Invoice
                    return $this->generateINVNumber();
                case 'generateINVForTicket':  // ใหม่ - สำหรับ Invoice
                    return $this->generateINVForTicket();
                default:
                    return $this->errorResponse("Unknown reference action: {$action}");
            }
        } catch (Exception $e) {
            $this->logMessage("ReferenceHandler error: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Reference handler error: ' . $e->getMessage(), 500);
        }
    }

    /**
     * สร้าง Reference Number สำหรับตารางใดๆ
     * Copy จาก gateway.php บรรทัด ~900-920
     */
    private function generateReferenceNumber()
    {
        $table = $this->request['table'] ?? 'bookings_ticket';
        $prefix = $this->request['prefix'] ?? 'FT';
        $column = $this->request['column'] ?? 'reference_number';

        $result = $this->db->generateReferenceNumber($table, $prefix, $column);

        if ($result['success']) {
            $this->logMessage("Generated reference number: {$result['reference_number']} for table: {$table}");
            return $this->successResponse($result['reference_number']);
        }

        $this->logMessage("Failed to generate reference number for table: {$table}", 'ERROR');
        return $this->errorResponse($result['error'] ?? 'Failed to generate reference number');
    }

    /**
     * สร้าง PO Number
     * Copy จาก gateway.php บรรทัด ~920-935
     */
    private function generatePONumber()
    {
        $result = $this->db->generateReferenceNumber('bookings_ticket', 'PO', 'po_number');

        if ($result['success']) {
            $this->logMessage("Generated PO number: {$result['reference_number']}");
            return $this->successResponse($result['reference_number']);
        }

        $this->logMessage("Failed to generate PO number", 'ERROR');
        return $this->errorResponse($result['error'] ?? 'Failed to generate PO number');
    }

    /**
     * สร้าง RC Number (ใหม่)
     */
    private function generateRCNumber()
    {
        $result = $this->db->generateReferenceNumber('bookings_ticket', 'RC', 'rc_number');

        if ($result['success']) {
            $this->logMessage("Generated RC number: {$result['reference_number']}");
            return $this->successResponse($result['reference_number']);
        }

        $this->logMessage("Failed to generate RC number", 'ERROR');
        return $this->errorResponse($result['error'] ?? 'Failed to generate RC number');
    }

    /**
     * สร้าง PO Number สำหรับ ticket และอัปเดตสถานะ
     * Copy จาก gateway.php บรรทัด ~1700-1750
     */
    private function generatePOForTicket()
    {
        $ticketId = $this->request['ticketId'] ?? null;

        if (!$ticketId) {
            return $this->errorResponse('Ticket ID is required', 400);
        }

        try {
            // ตรวจสอบ ticket มีอยู่และมี PO หรือยัง
            $checkResult = $this->db->raw(
                "SELECT po_number, po_generated_at, status FROM bookings_ticket WHERE id = :id",
                ['id' => $ticketId]
            );

            if (!$checkResult['success'] || empty($checkResult['data'])) {
                return $this->errorResponse('Ticket not found', 404);
            }

            $ticket = $checkResult['data'][0];

            // ถ้ามี PO แล้ว return PO เดิม
            if ($ticket['po_number']) {
                $this->logMessage("PO already exists for ticket ID: {$ticketId} - PO: {$ticket['po_number']}");
                return $this->successResponse([
                    'poNumber' => $ticket['po_number'],
                    'isNew' => false,
                    'message' => 'PO Number already exists'
                ]);
            }

            // สร้าง PO Number ใหม่
            $poResult = $this->db->generateReferenceNumber('bookings_ticket', 'PO', 'po_number');
            if (!$poResult['success']) {
                return $this->errorResponse('ไม่สามารถสร้าง PO Number ได้');
            }

            $poNumber = $poResult['reference_number'];

            // อัปเดต ticket ด้วย PO Number และเปลี่ยนสถานะ
            $updateResult = $this->db->update(
                'bookings_ticket',
                [
                    'po_number' => $poNumber,
                    'po_generated_at' => date('Y-m-d H:i:s'),
                    'status' => 'invoiced'
                ],
                'id = :id',
                ['id' => $ticketId]
            );

            if (!$updateResult['success']) {
                return $this->errorResponse('ไม่สามารถบันทึก PO Number ได้');
            }

            $this->logMessage("Generated new PO for ticket ID: {$ticketId} - PO: {$poNumber}");
            return $this->successResponse([
                'poNumber' => $poNumber,
                'isNew' => true,
                'message' => 'PO Number generated successfully'
            ]);
        } catch (Exception $e) {
            $this->logMessage("Error generating PO: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to generate PO Number', 500);
        }
    }

    /**
     * สร้าง RC Number สำหรับ ticket (ใหม่)
     * คล้ายๆ generatePOForTicket แต่สำหรับ Receipt
     * รองรับทั้ง single ticket และ multiple tickets
     */
    private function generateRCForTicket()
    {
        $ticketId = $this->request['ticketId'] ?? null;
        $linkedTicketIds = $this->request['linkedTicketIds'] ?? null;  // ⭐ Multi INV Receipt
        $selectionData = $this->request['selectionData'] ?? null;      // ✅ Regular Receipt
        $allowOverwrite = $this->request['allowOverwrite'] ?? false;

        if (!$ticketId) {
            return $this->errorResponse('Ticket ID is required', 400);
        }

        // ✅ DEBUG
        $this->logMessage("ReferenceHandler::generateRCForTicket - ticketId={$ticketId}, hasSelectionData=" . ($selectionData ? 'YES' : 'NO') . ", hasLinkedTicketIds=" . ($linkedTicketIds ? 'YES' : 'NO'));

        // ⭐ สร้าง array ของ ticket IDs (อาจเป็น single หรือ multiple)
        $ticketIds = $linkedTicketIds ? array_map('intval', $linkedTicketIds) : [$ticketId];

        try {
            // ตรวจสอบทุก tickets - ✅ เพิ่ม invoice_number
            $placeholders = implode(',', array_fill(0, count($ticketIds), '?'));
            $checkResult = $this->db->raw(
                "SELECT id, po_number, invoice_number, rc_number, rc_generated_at, status, customer_id
                 FROM bookings_ticket
                 WHERE id IN ($placeholders)",
                $ticketIds
            );

            if (!$checkResult['success'] || empty($checkResult['data'])) {
                return $this->errorResponse('Ticket not found', 404);
            }

            $tickets = $checkResult['data'];

            // ⭐ ตรวจสอบว่าทุก tickets เป็น customer เดียวกัน (สำหรับ multi-PO)
            if (count($ticketIds) > 1) {
                $customerIds = array_unique(array_column($tickets, 'customer_id'));
                if (count($customerIds) > 1) {
                    return $this->errorResponse('ไม่สามารถสร้าง RC จากหลาย INV ที่มี Customer ต่างกันได้', 400);
                }
            }

            // ⭐ ตรวจสอบว่าทุก tickets ต้องมี INV หรือ PO Number ก่อน
            foreach ($tickets as $ticket) {
                if (!$ticket['invoice_number'] && !$ticket['po_number']) {
                    return $this->errorResponse("ไม่สามารถสร้าง RC ได้ เนื่องจาก Ticket ID {$ticket['id']} ยังไม่มี Invoice Number", 400);
                }
            }

            // ✅ ถ้า ticket แรกมี RC แล้ว
            $mainTicket = $tickets[0];
            $rcNumber = $mainTicket['rc_number'];
            $isNew = false;

            if ($rcNumber) {
                $this->logMessage("RC already exists for ticket ID: {$ticketId} - RC: {$rcNumber}");

                // ⭐ ถ้าไม่ให้ overwrite และไม่มีข้อมูลใหม่ให้อัพเดต → return เลย
                if (!$allowOverwrite && !$selectionData && !$linkedTicketIds) {
                    return $this->successResponse([
                        'rcNumber' => $rcNumber,
                        'isNew' => false,
                        'message' => 'RC Number already exists'
                    ]);
                }
                // ⭐ แต่ถ้ามี selectionData หรือ linkedTicketIds → ให้อัพเดตต่อ
            } else {
                // ยังไม่มี RC Number → สร้างใหม่
                $rcResult = $this->db->generateReferenceNumber('bookings_ticket', 'RC', 'rc_number');
                if (!$rcResult['success']) {
                    return $this->errorResponse('ไม่สามารถสร้าง RC Number ได้');
                }
                $rcNumber = $rcResult['reference_number'];
                $isNew = true;
            }

            $rcGeneratedAt = date('Y-m-d H:i:s');

            // ✅ เตรียมข้อมูลสำหรับ update
            $updateData = [
                'rc_number' => $rcNumber,
                'rc_generated_at' => $rcGeneratedAt
            ];

            // ✅ ตรวจสอบว่าเป็น Regular Receipt หรือ Multi INV Receipt
            if ($selectionData && !$linkedTicketIds) {
                // Regular Receipt - บันทึก selection data
                $this->logMessage("Regular Receipt: Saving selection data");
                $updateData['rc_selection_data'] = json_encode($selectionData);

                // ลบ rc_linked_tickets
                $this->db->raw(
                    "UPDATE bookings_ticket SET rc_linked_tickets = NULL WHERE id = :id",
                    ['id' => $ticketId]
                );

            } elseif ($linkedTicketIds && count($ticketIds) > 1) {
                // Multi INV Receipt - บันทึก linked tickets
                $this->logMessage("Multi INV Receipt: Saving linked tickets");
                $linkedData = json_encode([
                    'ticket_ids' => $ticketIds,
                    'primary_ticket_id' => $ticketId
                ]);
                $updateData['rc_linked_tickets'] = $linkedData;

                // ลบ rc_selection_data สำหรับทุก ticket
                foreach ($ticketIds as $tid) {
                    $this->db->raw(
                        "UPDATE bookings_ticket SET rc_selection_data = NULL WHERE id = :id",
                        ['id' => $tid]
                    );
                }
            }

            // ⭐ อัปเดตทุก tickets ด้วย RC Number เดียวกัน
            $updateSuccessCount = 0;
            foreach ($ticketIds as $tid) {
                $updateResult = $this->db->update(
                    'bookings_ticket',
                    $updateData,
                    'id = :id',
                    ['id' => $tid]
                );

                if ($updateResult['success']) {
                    $updateSuccessCount++;
                }
            }

            if ($updateSuccessCount === 0) {
                return $this->errorResponse('ไม่สามารถบันทึก RC Number ได้');
            }

            $this->logMessage(($isNew ? "Generated new" : "Updated") . " RC for {$updateSuccessCount} ticket(s) - RC: {$rcNumber} - Ticket IDs: " . implode(', ', $ticketIds));
            return $this->successResponse([
                'rcNumber' => $rcNumber,
                'isNew' => $isNew,
                'ticketsUpdated' => $updateSuccessCount,
                'selectionDataSaved' => !empty($selectionData),
                'linkedTicketsSaved' => !empty($linkedTicketIds),
                'message' => $isNew
                    ? (count($ticketIds) > 1 ? "RC Number generated successfully for {$updateSuccessCount} POs" : 'RC Number generated successfully')
                    : 'RC Number updated successfully'
            ]);
        } catch (Exception $e) {
            $this->logMessage("Error generating RC: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to generate RC Number', 500);
        }
    }

    /**
     * สร้าง INV Number (ใหม่)
     */
    private function generateINVNumber()
    {
        $result = $this->db->generateReferenceNumber('bookings_ticket', 'INV', 'invoice_number');

        if ($result['success']) {
            $this->logMessage("Generated INV number: {$result['reference_number']}");
            return $this->successResponse($result['reference_number']);
        }

        $this->logMessage("Failed to generate INV number", 'ERROR');
        return $this->errorResponse($result['error'] ?? 'Failed to generate INV number');
    }

    /**
     * สร้าง INV Number สำหรับ ticket พร้อม FT
     * รูปแบบ: INV260001 (INV + ปี 2 หลัก + running number 4 หลัก)
     */
    private function generateINVForTicket()
    {
        $ticketId = $this->request['ticketId'] ?? null;

        if (!$ticketId) {
            return $this->errorResponse('Ticket ID is required', 400);
        }

        try {
            // ตรวจสอบ ticket มีอยู่และมี INV หรือยัง
            $checkResult = $this->db->raw(
                "SELECT reference_number, invoice_number, invoice_generated_at, status FROM bookings_ticket WHERE id = :id",
                ['id' => $ticketId]
            );

            if (!$checkResult['success'] || empty($checkResult['data'])) {
                return $this->errorResponse('Ticket not found', 404);
            }

            $ticket = $checkResult['data'][0];

            // ถ้ามี INV แล้ว return INV เดิม
            if ($ticket['invoice_number']) {
                $this->logMessage("INV already exists for ticket ID: {$ticketId} - INV: {$ticket['invoice_number']}");
                return $this->successResponse([
                    'invoiceNumber' => $ticket['invoice_number'],
                    'ftNumber' => $ticket['reference_number'],
                    'isNew' => false,
                    'message' => 'Invoice Number already exists'
                ]);
            }

            // สร้าง INV Number ใหม่ รูปแบบ INV260001
            $year = date('y'); // 2 หลักท้ายของปี เช่น 26
            $pattern = 'INV' . $year . '%';

            $lastResult = $this->db->raw(
                "SELECT invoice_number FROM bookings_ticket WHERE invoice_number LIKE :pattern ORDER BY invoice_number DESC LIMIT 1",
                ['pattern' => $pattern]
            );

            $sequence = 1;
            if ($lastResult['success'] && !empty($lastResult['data'])) {
                $lastInv = $lastResult['data'][0]['invoice_number'];
                // Extract sequence from INV260001 → 0001 → 1
                $lastSequence = (int)substr($lastInv, 5); // ตัด "INV26" ออก เหลือ "0001"
                $sequence = $lastSequence + 1;
            }

            $formattedSequence = str_pad($sequence, 4, '0', STR_PAD_LEFT);
            $invNumber = "INV{$year}{$formattedSequence}";

            // อัปเดต ticket ด้วย INV Number และเปลี่ยนสถานะเป็น invoiced
            $updateResult = $this->db->update(
                'bookings_ticket',
                [
                    'invoice_number' => $invNumber,
                    'invoice_generated_at' => date('Y-m-d H:i:s'),
                    'status' => 'invoiced'
                ],
                'id = :id',
                ['id' => $ticketId]
            );

            if (!$updateResult['success']) {
                return $this->errorResponse('ไม่สามารถบันทึก Invoice Number ได้');
            }

            $this->logMessage("Generated new INV for ticket ID: {$ticketId} - INV: {$invNumber}, FT: {$ticket['reference_number']}");
            return $this->successResponse([
                'invoiceNumber' => $invNumber,
                'ftNumber' => $ticket['reference_number'],
                'isNew' => true,
                'message' => 'Invoice Number generated successfully'
            ]);
        } catch (Exception $e) {
            $this->logMessage("Error generating INV: " . $e->getMessage(), 'ERROR');
            return $this->errorResponse('Failed to generate Invoice Number', 500);
        }
    }
}
