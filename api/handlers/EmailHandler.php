<?php
// api/handlers/EmailHandler.php
require_once 'BaseHandler.php';

/**
 * EmailHandler - ส่ง email ผ่าน PHP mail() function
 */
class EmailHandler extends BaseHandler
{
    private $fromEmail = 'no-reply@samuilookbiz.com';

    public function handle($action)
    {
        switch ($action) {
            case 'sendDocumentEmail':
                return $this->sendDocumentEmail();
            case 'sendBulkReceiptEmail':
                return $this->sendBulkReceiptEmail();
            case 'testEmailConnection':
                return $this->testEmailConnection();
            default:
                return $this->errorResponse("Unknown email action: {$action}");
        }
    }

    /**
     * ส่ง email พร้อม PDF attachment
     */
    private function sendDocumentEmail()
    {
        try {
            $data = $this->request;

            // Validate required fields
            $required = ['to', 'subject', 'message', 'documentType'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    return $this->errorResponse("Missing required field: {$field}");
                }
            }

            // Validate และ clean TO emails
            $emails = array_map('trim', explode(',', $data['to']));
            $emails = array_filter($emails);

            if (empty($emails)) {
                return $this->errorResponse("No valid email address provided");
            }

            foreach ($emails as $email) {
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    return $this->errorResponse("Invalid TO email format: {$email}");
                }
            }

            $subject = $data['subject'];
            $boundary = md5(time());

            // สร้าง email body (ใช้ร่วมกันสำหรับทุกคน)
            if (!empty($data['pdfBase64'])) {
                $body = $this->createEmailWithPDF($data, $boundary);
            } else {
                $body = $this->createSimpleEmail($data, $boundary);
            }

            // ส่งอีเมลทีละคน (แต่ละคนเห็นเฉพาะตัวเอง)
            $successCount = 0;
            $failedEmails = [];

            foreach ($emails as $recipientEmail) {
                // สร้าง headers แยกสำหรับแต่ละคน (ไม่มี CC/BCC)
                $headers = $this->createEmailHeaders($boundary, null, null);

                // ส่งอีเมลไปที่ละคน (แต่ละคนเห็นว่าส่งให้เขาคนเดียว)
                $result = mail($recipientEmail, $subject, $body, $headers);

                if ($result) {
                    $successCount++;
                } else {
                    $failedEmails[] = $recipientEmail;
                }
            }

            // ตรวจสอบผลลัพธ์
            $result = ($successCount > 0);

            if ($result) {
                // Update email sent status for receipt or invoice
                if (!empty($data['documentId'])) {
                    if ($data['documentType'] === 'receipt') {
                        $this->updateSingleReceiptEmailStatus($data['documentId']);
                    } elseif ($data['documentType'] === 'invoice') {
                        $this->updateSingleInvoiceEmailStatus($data['documentId']);
                    }
                }

                // Log activity for email sent
                if (!empty($data['documentId']) && !empty($data['documentType'])) {
                    // Map documentType to module
                    $moduleMap = [
                        'invoice' => 'ticket',
                        'receipt' => 'ticket',
                        'voucher' => 'voucher',
                        'deposit' => 'deposit',
                        'other' => 'other'
                    ];

                    $module = $moduleMap[$data['documentType']] ?? 'ticket';
                    $userId = $data['userId'] ?? null;
                    $referenceNumber = $data['referenceNumber'] ?? null;

                    $this->logActivity($module, $data['documentId'], $referenceNumber, 'email', $userId);
                }

                $message = "Email sent successfully to {$successCount} recipient(s)";
                if (!empty($failedEmails)) {
                    $message .= ". Failed: " . implode(', ', $failedEmails);
                }

                return $this->successResponse([
                    'message' => $message,
                    'totalRecipients' => count($emails),
                    'successCount' => $successCount,
                    'failedCount' => count($failedEmails),
                    'documentType' => $data['documentType'],
                    'sentAt' => date('Y-m-d H:i:s')
                ]);
            } else {
                return $this->errorResponse("Failed to send email to all recipients");
            }
        } catch (Exception $e) {
            error_log("Email handler error: " . $e->getMessage());
            return $this->errorResponse("Email processing failed: " . $e->getMessage());
        }
    }

    /**
     * ส่ง email พร้อม multiple PDF attachments
     */
    private function sendBulkReceiptEmail()
    {
        try {
            $data = $this->request;

            // Validate required fields
            $required = ['to', 'subject', 'message', 'attachments'];
            foreach ($required as $field) {
                if (empty($data[$field])) {
                    return $this->errorResponse("Missing required field: {$field}");
                }
            }

            // Validate และ clean TO emails
            $emails = array_map('trim', explode(',', $data['to']));
            $emails = array_filter($emails);

            if (empty($emails)) {
                return $this->errorResponse("No valid email address provided");
            }

            foreach ($emails as $email) {
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    return $this->errorResponse("Invalid TO email format: {$email}");
                }
            }

            // Validate attachments is array
            if (!is_array($data['attachments']) || count($data['attachments']) === 0) {
                return $this->errorResponse("No attachments provided");
            }

            $subject = $data['subject'];
            $boundary = md5(time());

            // สร้าง email body (ใช้ร่วมกันสำหรับทุกคน)
            $body = $this->createEmailWithMultiplePDFs($data, $boundary);

            // ส่งอีเมลทีละคน (แต่ละคนเห็นเฉพาะตัวเอง)
            $successCount = 0;
            $failedEmails = [];

            foreach ($emails as $recipientEmail) {
                // สร้าง headers แยกสำหรับแต่ละคน (ไม่มี CC/BCC)
                $headers = $this->createEmailHeaders($boundary, null, null);

                // ส่งอีเมลไปที่ละคน (แต่ละคนเห็นว่าส่งให้เขาคนเดียว)
                $result = mail($recipientEmail, $subject, $body, $headers);

                if ($result) {
                    $successCount++;
                } else {
                    $failedEmails[] = $recipientEmail;
                }
            }

            // ตรวจสอบผลลัพธ์
            $result = ($successCount > 0);

            if ($result) {
                // Update rc_email_sent status for all receipts
                if (!empty($data['receiptIds']) && is_array($data['receiptIds'])) {
                    $this->updateReceiptEmailStatus($data['receiptIds']);
                }

                $message = "Bulk email sent successfully to {$successCount} recipient(s)";
                if (!empty($failedEmails)) {
                    $message .= ". Failed: " . implode(', ', $failedEmails);
                }

                return $this->successResponse([
                    'message' => $message,
                    'totalRecipients' => count($emails),
                    'successCount' => $successCount,
                    'failedCount' => count($failedEmails),
                    'attachmentCount' => count($data['attachments']),
                    'sentAt' => date('Y-m-d H:i:s')
                ]);
            } else {
                return $this->errorResponse("Failed to send email to all recipients");
            }
        } catch (Exception $e) {
            error_log("Bulk email handler error: " . $e->getMessage());
            return $this->errorResponse("Bulk email processing failed: " . $e->getMessage());
        }
    }

    /**
     * Update rc_email_sent status for single receipt
     */
    private function updateSingleReceiptEmailStatus($receiptId)
    {
        try {
            $sql = "
                UPDATE bookings_ticket
                SET rc_email_sent = 1,
                    rc_email_sent_at = NOW()
                WHERE id = :receiptId
            ";

            $result = $this->db->raw($sql, ['receiptId' => $receiptId]);

            if ($result['success']) {
                error_log("Updated rc_email_sent for receipt ID: {$receiptId}");
            } else {
                error_log("Failed to update rc_email_sent: " . ($result['error'] ?? 'Unknown error'));
            }
        } catch (Exception $e) {
            error_log("Failed to update rc_email_sent status: " . $e->getMessage());
        }
    }

    /**
     * Update po_email_sent status for single invoice/PO
     */
    private function updateSingleInvoiceEmailStatus($invoiceId)
    {
        try {
            $sql = "
                UPDATE bookings_ticket
                SET po_email_sent = 1,
                    po_email_sent_at = NOW()
                WHERE id = :invoiceId
            ";

            $result = $this->db->raw($sql, ['invoiceId' => $invoiceId]);

            if ($result['success']) {
                error_log("Updated po_email_sent for invoice ID: {$invoiceId}");
            } else {
                error_log("Failed to update po_email_sent: " . ($result['error'] ?? 'Unknown error'));
            }
        } catch (Exception $e) {
            error_log("Failed to update po_email_sent status: " . $e->getMessage());
        }
    }

    /**
     * Update rc_email_sent status in database (for bulk emails)
     */
    private function updateReceiptEmailStatus($receiptIds)
    {
        try {
            $placeholders = implode(',', array_fill(0, count($receiptIds), '?'));

            $sql = "
                UPDATE bookings_ticket
                SET rc_email_sent = 1,
                    rc_email_sent_at = NOW()
                WHERE id IN ($placeholders)
            ";

            // Use DatabaseHandler's raw method
            $params = [];
            foreach ($receiptIds as $index => $id) {
                $params["id{$index}"] = $id;
            }

            // Build dynamic placeholders for raw query
            $placeholderNames = array_keys($params);
            $placeholderString = ':' . implode(', :', $placeholderNames);

            $sql = "
                UPDATE bookings_ticket
                SET rc_email_sent = 1,
                    rc_email_sent_at = NOW()
                WHERE id IN ({$placeholderString})
            ";

            $result = $this->db->raw($sql, $params);

            if ($result['success']) {
                error_log("Updated rc_email_sent for " . count($receiptIds) . " receipts");
            } else {
                error_log("Failed to update rc_email_sent: " . ($result['error'] ?? 'Unknown error'));
            }
        } catch (Exception $e) {
            error_log("Failed to update rc_email_sent status: " . $e->getMessage());
        }
    }

    /**
     * สร้าง email body พร้อม multiple PDFs
     */
    private function createEmailWithMultiplePDFs($data, $boundary)
    {
        $altBoundary = "alt-{$boundary}";

        $body = "--{$boundary}\r\n";
        $body .= "Content-Type: multipart/alternative; boundary=\"{$altBoundary}\"\r\n\r\n";

        // Plain text version
        $body .= "--{$altBoundary}\r\n";
        $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $body .= $this->createBulkPlainTextContent($data) . "\r\n\r\n";

        // HTML version
        $body .= "--{$altBoundary}\r\n";
        $body .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $body .= $this->createBulkHTMLContent($data) . "\r\n\r\n";

        $body .= "--{$altBoundary}--\r\n\r\n";

        // Multiple PDF attachments
        foreach ($data['attachments'] as $attachment) {
            if (empty($attachment['pdfBase64']) || empty($attachment['filename'])) {
                continue; // Skip invalid attachments
            }

            $body .= "--{$boundary}\r\n";
            $body .= "Content-Type: application/pdf; name=\"{$attachment['filename']}\"\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n";
            $body .= "Content-Disposition: attachment; filename=\"{$attachment['filename']}\"\r\n\r\n";
            $body .= chunk_split($attachment['pdfBase64']) . "\r\n";
        }

        $body .= "--{$boundary}--\r\n";

        return $body;
    }

    /**
     * สร้าง HTML content สำหรับ bulk email
     */
    private function createBulkHTMLContent($data)
    {
        $message = nl2br(htmlspecialchars($data['message']));
        $attachmentCount = count($data['attachments']);

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>บริษัท สมุย ลุค จำกัด - ใบเสร็จรับเงิน</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #881f7e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .footer { background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
                .badge { background-color: #4CAF50; color: white; padding: 5px 10px; border-radius: 12px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>บริษัท สมุย ลุค จำกัด</h1>
                    <h2>ใบเสร็จรับเงิน</h2>
                    <p><span class='badge'>{$attachmentCount} ไฟล์แนบ</span></p>
                </div>

                <div class='content'>
                    <p>{$message}</p>
                </div>

                <div class='footer'>
                    <p><strong>บริษัท สมุย ลุค จำกัด</strong></p>
                    <p>63/27 ม.3 ต.บ่อผุด อ.เกาะสมุย จ.สุราษฎร์ธานี 84320</p>
                    <p>โทร 077-950550 | Email: samuilook@yahoo.com</p>
                </div>
            </div>
        </body>
        </html>";
    }

    /**
     * สร้าง Plain text content สำหรับ bulk email
     */
    private function createBulkPlainTextContent($data)
    {
        $attachmentCount = count($data['attachments']);

        return "บริษัท สมุย ลุค จำกัด\n" .
            "ใบเสร็จรับเงิน ({$attachmentCount} ไฟล์)\n\n" .
            "{$data['message']}\n\n" .
            "บริษัท สมุย ลุค จำกัด\n" .
            "63/27 ม.3 ต.บ่อผุด อ.เกาะสมุย จ.สุราษฎร์ธานี 84320\n" .
            "โทร 077-950550 | Email: samuilook@yahoo.com";
    }

    /**
     * สร้าง email headers รองรับ CC และ BCC
     */
    private function createEmailHeaders($boundary, $cc = null, $bcc = null)
    {
        $headers = "From: \"Samui Look Co., Ltd.\" <{$this->fromEmail}>\r\n";
        $headers .= "Reply-To: {$this->fromEmail}\r\n";
        $headers .= "Return-Path: {$this->fromEmail}\r\n";

        // เพิ่ม CC header ถ้ามี
        if (!empty($cc)) {
            $headers .= "Cc: {$cc}\r\n";
        }

        // เพิ่ม BCC header ถ้ามี
        if (!empty($bcc)) {
            $headers .= "Bcc: {$bcc}\r\n";
        }

        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
        $headers .= "X-Priority: 3\r\n";
        $headers .= "X-MSMail-Priority: Normal\r\n";
        $headers .= "Message-ID: <" . time() . "." . md5($this->fromEmail . rand()) . "@samuilookbiz.com>\r\n";
        $headers .= "Date: " . date('r') . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";
        $headers .= "X-Auto-Response-Suppress: All\r\n";

        return $headers;
    }

    /**
     * สร้าง email body พร้อม PDF
     */
    private function createEmailWithPDF($data, $boundary)
    {
        $altBoundary = "alt-{$boundary}";

        $body = "--{$boundary}\r\n";
        $body .= "Content-Type: multipart/alternative; boundary=\"{$altBoundary}\"\r\n\r\n";

        // Plain text version
        $body .= "--{$altBoundary}\r\n";
        $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $body .= $this->createPlainTextContent($data) . "\r\n\r\n";

        // HTML version
        $body .= "--{$altBoundary}\r\n";
        $body .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $body .= $this->createHTMLContent($data) . "\r\n\r\n";

        $body .= "--{$altBoundary}--\r\n\r\n";

        // PDF attachment
        $body .= "--{$boundary}\r\n";
        $body .= "Content-Type: application/pdf; name=\"{$this->generateFileName($data)}\"\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n";
        $body .= "Content-Disposition: attachment; filename=\"{$this->generateFileName($data)}\"\r\n\r\n";
        $body .= chunk_split($data['pdfBase64']) . "\r\n";

        $body .= "--{$boundary}--\r\n";

        return $body;
    }

    /**
     * สร้าง simple email (ไม่มี PDF)
     */
    private function createSimpleEmail($data, $boundary)
    {
        $body = "--{$boundary}\r\n";
        $body .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $body .= $this->createHTMLContent($data) . "\r\n\r\n";
        $body .= "--{$boundary}--\r\n";

        return $body;
    }

    /**
     * สร้าง HTML content
     */
    private function createHTMLContent($data)
    {
        $documentTypes = [
            'invoice' => 'ใบแจ้งหนี้',
            'receipt' => 'ใบเสร็จรับเงิน',
            'voucher' => 'Voucher'
        ];

        $documentName = $documentTypes[$data['documentType']] ?? $data['documentType'];
        $message = nl2br(htmlspecialchars($data['message']));

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1.0'>
            <title>บริษัท สมุย ลุค จำกัด - {$documentName}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #881f7e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .footer { background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>บริษัท สมุย ลุค จำกัด</h1>
                    <h2>{$documentName}</h2>
                </div>
                
                <div class='content'>
                    <p>{$message}</p>
                </div>
                
                <div class='footer'>
                    <p><strong>บริษัท สมุย ลุค จำกัด</strong></p>
                    <p>63/27 ม.3 ต.บ่อผุด อ.เกาะสมุย จ.สุราษฎร์ธานี 84320</p>
                    <p>โทร 077-950550 | Email: samuilook@yahoo.com</p>
                </div>
            </div>
        </body>
        </html>";
    }

    /**
     * สร้าง Plain text content
     */
    private function createPlainTextContent($data)
    {
        $documentTypes = [
            'invoice' => 'ใบแจ้งหนี้',
            'receipt' => 'ใบเสร็จรับเงิน',
            'voucher' => 'Voucher'
        ];

        $documentName = $documentTypes[$data['documentType']] ?? $data['documentType'];

        return "บริษัท สมุย ลุค จำกัด\n" .
            "{$documentName}\n\n" .
            "{$data['message']}\n\n" .
            "บริษัท สมุย ลุค จำกัด\n" .
            "63/27 ม.3 ต.บ่อผุด อ.เกาะสมุย จ.สุราษฎร์ธานี 84320\n" .
            "โทร 077-950550 | Email: samuilook@yahoo.com";
    }

    /**
     * สร้างชื่อไฟล์ PDF
     */
    private function generateFileName($data)
    {
        $prefix = [
            'invoice' => 'Invoice',
            'receipt' => 'Receipt',
            'voucher' => 'Voucher'
        ];

        $docPrefix = $prefix[$data['documentType']] ?? 'Document';
        $docNumber = $data['documentNumber'] ?? date('YmdHis');

        return "{$docPrefix}_{$docNumber}.pdf";
    }

    /**
     * ทดสอบการส่ง email
     */
    private function testEmailConnection()
    {
        try {
            $testSubject = "Test Email - " . date('Y-m-d H:i:s');
            $testMessage = "This is a test email from SamuiLook system.";
            $testHeaders = "From: {$this->fromEmail}\r\n";
            $testHeaders .= "Reply-To: {$this->fromEmail}\r\n";

            $result = mail($this->fromEmail, $testSubject, $testMessage, $testHeaders);

            if ($result) {
                return $this->successResponse(['message' => 'Test email sent successfully']);
            } else {
                return $this->errorResponse("Test email failed");
            }
        } catch (Exception $e) {
            return $this->errorResponse("Test failed: " . $e->getMessage());
        }
    }
}
