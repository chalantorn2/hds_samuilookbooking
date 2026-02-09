-- =====================================================
-- Migration: Fix Timezone in Report Views
-- Description:
--   แก้ไขปัญหา timezone ที่ทำให้วันที่แสดงผิดไป 1 วัน
--   - created_at เก็บเป็น UTC ต้องแปลงเป็น +07:00 (Thailand)
--   - po_generated_at, vc_generated_at เก็บเป็น local time แล้ว ใช้ตรงๆ ได้
-- Date: 2026-02-04
-- =====================================================

-- Drop existing views (จากล่างขึ้นบน เพราะ view_daily_report_all ขึ้นอยู่กับ views อื่น)
DROP VIEW IF EXISTS `view_daily_report_all`;
DROP VIEW IF EXISTS `view_daily_report_flight`;
DROP VIEW IF EXISTS `view_daily_report_voucher`;
DROP VIEW IF EXISTS `view_daily_report_other`;

-- =====================================================
-- 1. Recreate view_daily_report_flight
--    - ใช้ po_generated_at (local time) ถ้ามี
--    - ถ้าไม่มี fallback ไป created_at โดยแปลง UTC -> +07:00
-- =====================================================
CREATE VIEW `view_daily_report_flight` AS
SELECT
    'Flight' AS `booking_type`,
    `bt`.`id` AS `booking_id`,
    CAST(
        COALESCE(
            `bt`.`po_generated_at`,
            CONVERT_TZ(`bt`.`created_at`, '+00:00', '+07:00')
        ) AS DATE
    ) AS `create_date`,
    COALESCE(
        `bt`.`po_generated_at`,
        CONVERT_TZ(`bt`.`created_at`, '+00:00', '+07:00')
    ) AS `created_at`,
    `bt`.`po_number` AS `booking_ref_no`,
    `c`.`name` AS `customer_name`,
    `c`.`code` AS `customer_code`,
    `i`.`name` AS `supplier_name`,
    `i`.`code` AS `supplier_code`,
    (SELECT `passenger_name` FROM `tickets_passengers` WHERE `bookings_ticket_id` = `bt`.`id` ORDER BY `id` LIMIT 1) AS `pax_name`,
    COALESCE((SELECT `adult_pax` + `child_pax` + `infant_pax` FROM `tickets_pricing` WHERE `bookings_ticket_id` = `bt`.`id` LIMIT 1), 0) AS `pax_count`,
    (SELECT GROUP_CONCAT(CONCAT(`origin`, '-', `destination`) ORDER BY `id` ASC SEPARATOR ' - ') FROM `tickets_routes` WHERE `bookings_ticket_id` = `bt`.`id`) AS `routing_detail`,
    COALESCE((SELECT `code` FROM `ticket_additional_info` WHERE `bookings_ticket_id` = `bt`.`id` LIMIT 1), '') AS `booking_code`,
    COALESCE((SELECT `adult_net_price` FROM `tickets_pricing` WHERE `bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `adult_net_price`,
    COALESCE((SELECT `adult_sale_price` FROM `tickets_pricing` WHERE `bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `adult_sale_price`,
    COALESCE((SELECT `adult_pax` FROM `tickets_pricing` WHERE `bookings_ticket_id` = `bt`.`id` LIMIT 1), 0) AS `adult_pax`,
    COALESCE((SELECT `child_net_price` FROM `tickets_pricing` WHERE `bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `child_net_price`,
    COALESCE((SELECT `child_sale_price` FROM `tickets_pricing` WHERE `bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `child_sale_price`,
    COALESCE((SELECT `child_pax` FROM `tickets_pricing` WHERE `bookings_ticket_id` = `bt`.`id` LIMIT 1), 0) AS `child_pax`,
    COALESCE((SELECT `infant_net_price` FROM `tickets_pricing` WHERE `bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `infant_net_price`,
    COALESCE((SELECT `infant_sale_price` FROM `tickets_pricing` WHERE `bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `infant_sale_price`,
    COALESCE((SELECT `infant_pax` FROM `tickets_pricing` WHERE `bookings_ticket_id` = `bt`.`id` LIMIT 1), 0) AS `infant_pax`,
    COALESCE((SELECT SUM(`net_price` * `quantity`) FROM `tickets_extras` WHERE `bookings_ticket_id` = `bt`.`id`), 0.00) AS `extras_net_total`,
    COALESCE((SELECT SUM(`sale_price` * `quantity`) FROM `tickets_extras` WHERE `bookings_ticket_id` = `bt`.`id`), 0.00) AS `extras_sale_total`,
    COALESCE((SELECT `grand_total` FROM `tickets_detail` WHERE `bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `total_price`,
    `bt`.`payment_status` AS `payment_status`,
    (SELECT `payment_method` FROM `payment_tracking` WHERE `booking_type` = 'flight' AND `booking_id` = `bt`.`id` LIMIT 1) AS `payment_method`,
    (SELECT `bank_name` FROM `payment_tracking` WHERE `booking_type` = 'flight' AND `booking_id` = `bt`.`id` LIMIT 1) AS `bank_name`,
    (SELECT `account_number` FROM `payment_tracking` WHERE `booking_type` = 'flight' AND `booking_id` = `bt`.`id` LIMIT 1) AS `account_number`,
    COALESCE((SELECT `ticket_type` FROM `ticket_additional_info` WHERE `bookings_ticket_id` = `bt`.`id` LIMIT 1), '') AS `ticket_type`,
    COALESCE((SELECT GROUP_CONCAT(`ticket_code` SEPARATOR ', ') FROM `tickets_passengers` WHERE `bookings_ticket_id` = `bt`.`id` AND `ticket_code` IS NOT NULL AND TRIM(`ticket_code`) != '' ORDER BY `id`), '') AS `ticket_numbers`
FROM `bookings_ticket` `bt`
LEFT JOIN `customers` `c` ON `bt`.`customer_id` = `c`.`id`
LEFT JOIN `information` `i` ON `bt`.`information_id` = `i`.`id`
WHERE `bt`.`status` <> 'cancelled'
  AND `bt`.`po_number` IS NOT NULL
  AND `bt`.`po_number` <> '';

-- =====================================================
-- 2. Recreate view_daily_report_voucher
--    - ใช้ vc_generated_at (local time) ถ้ามี
--    - ถ้าไม่มี fallback ไป created_at โดยแปลง UTC -> +07:00
-- =====================================================
CREATE VIEW `view_daily_report_voucher` AS
SELECT
    CONCAT('Voucher-', UPPER(`bv`.`service_type`)) AS `booking_type`,
    `bv`.`id` AS `booking_id`,
    CAST(
        COALESCE(
            `bv`.`vc_generated_at`,
            CONVERT_TZ(`bv`.`created_at`, '+00:00', '+07:00')
        ) AS DATE
    ) AS `create_date`,
    COALESCE(
        `bv`.`vc_generated_at`,
        CONVERT_TZ(`bv`.`created_at`, '+00:00', '+07:00')
    ) AS `created_at`,
    `bv`.`vc_number` AS `booking_ref_no`,
    `c`.`name` AS `customer_name`,
    `c`.`code` AS `customer_code`,
    `i`.`name` AS `supplier_name`,
    `i`.`code` AS `supplier_code`,
    (SELECT `passenger_name` FROM `voucher_passengers` WHERE `bookings_voucher_id` = `bv`.`id` ORDER BY `id` LIMIT 1) AS `pax_name`,
    COALESCE((SELECT `adult_pax` + `child_pax` + `infant_pax` FROM `voucher_pricing` WHERE `bookings_voucher_id` = `bv`.`id` LIMIT 1), 0) AS `pax_count`,
    (SELECT `description` FROM `voucher_details` WHERE `bookings_voucher_id` = `bv`.`id` LIMIT 1) AS `routing_detail`,
    COALESCE((SELECT `reference` FROM `voucher_details` WHERE `bookings_voucher_id` = `bv`.`id` LIMIT 1), '') AS `booking_code`,
    COALESCE((SELECT `adult_net_price` FROM `voucher_pricing` WHERE `bookings_voucher_id` = `bv`.`id` LIMIT 1), 0.00) AS `adult_net_price`,
    COALESCE((SELECT `adult_sale_price` FROM `voucher_pricing` WHERE `bookings_voucher_id` = `bv`.`id` LIMIT 1), 0.00) AS `adult_sale_price`,
    COALESCE((SELECT `adult_pax` FROM `voucher_pricing` WHERE `bookings_voucher_id` = `bv`.`id` LIMIT 1), 0) AS `adult_pax`,
    COALESCE((SELECT `child_net_price` FROM `voucher_pricing` WHERE `bookings_voucher_id` = `bv`.`id` LIMIT 1), 0.00) AS `child_net_price`,
    COALESCE((SELECT `child_sale_price` FROM `voucher_pricing` WHERE `bookings_voucher_id` = `bv`.`id` LIMIT 1), 0.00) AS `child_sale_price`,
    COALESCE((SELECT `child_pax` FROM `voucher_pricing` WHERE `bookings_voucher_id` = `bv`.`id` LIMIT 1), 0) AS `child_pax`,
    COALESCE((SELECT `infant_net_price` FROM `voucher_pricing` WHERE `bookings_voucher_id` = `bv`.`id` LIMIT 1), 0.00) AS `infant_net_price`,
    COALESCE((SELECT `infant_sale_price` FROM `voucher_pricing` WHERE `bookings_voucher_id` = `bv`.`id` LIMIT 1), 0.00) AS `infant_sale_price`,
    COALESCE((SELECT `infant_pax` FROM `voucher_pricing` WHERE `bookings_voucher_id` = `bv`.`id` LIMIT 1), 0) AS `infant_pax`,
    0.00 AS `extras_net_total`,
    0.00 AS `extras_sale_total`,
    COALESCE((SELECT `grand_total` FROM `voucher_details` WHERE `bookings_voucher_id` = `bv`.`id` LIMIT 1), 0.00) AS `total_price`,
    `bv`.`payment_status` AS `payment_status`,
    (SELECT `payment_method` FROM `payment_tracking` WHERE `booking_type` = 'voucher' AND `booking_id` = `bv`.`id` LIMIT 1) AS `payment_method`,
    (SELECT `bank_name` FROM `payment_tracking` WHERE `booking_type` = 'voucher' AND `booking_id` = `bv`.`id` LIMIT 1) AS `bank_name`,
    (SELECT `account_number` FROM `payment_tracking` WHERE `booking_type` = 'voucher' AND `booking_id` = `bv`.`id` LIMIT 1) AS `account_number`,
    '' AS `ticket_type`,
    '' AS `ticket_numbers`
FROM `bookings_voucher` `bv`
LEFT JOIN `customers` `c` ON `bv`.`customer_id` = `c`.`id`
LEFT JOIN `information` `i` ON `bv`.`information_id` = `i`.`id`
WHERE `bv`.`status` <> 'cancelled'
  AND `bv`.`vc_number` IS NOT NULL
  AND `bv`.`vc_number` <> '';

-- =====================================================
-- 3. Recreate view_daily_report_other
--    - ใช้ vc_generated_at (local time) ถ้ามี
--    - ถ้าไม่มี fallback ไป created_at โดยแปลง UTC -> +07:00
-- =====================================================
CREATE VIEW `view_daily_report_other` AS
SELECT
    CONCAT('Other-', UPPER(`bo`.`service_type`)) AS `booking_type`,
    `bo`.`id` AS `booking_id`,
    CAST(
        COALESCE(
            `bo`.`vc_generated_at`,
            CONVERT_TZ(`bo`.`created_at`, '+00:00', '+07:00')
        ) AS DATE
    ) AS `create_date`,
    COALESCE(
        `bo`.`vc_generated_at`,
        CONVERT_TZ(`bo`.`created_at`, '+00:00', '+07:00')
    ) AS `created_at`,
    `bo`.`reference_number` AS `booking_ref_no`,
    `c`.`name` AS `customer_name`,
    `c`.`code` AS `customer_code`,
    `i`.`name` AS `supplier_name`,
    `i`.`code` AS `supplier_code`,
    (SELECT `passenger_name` FROM `other_passengers` WHERE `bookings_other_id` = `bo`.`id` ORDER BY `id` LIMIT 1) AS `pax_name`,
    COALESCE((SELECT `adult_pax` + `child_pax` + `infant_pax` FROM `other_pricing` WHERE `bookings_other_id` = `bo`.`id` LIMIT 1), 0) AS `pax_count`,
    (SELECT `description` FROM `other_details` WHERE `bookings_other_id` = `bo`.`id` LIMIT 1) AS `routing_detail`,
    COALESCE((SELECT `code` FROM `other_additional_info` WHERE `bookings_other_id` = `bo`.`id` LIMIT 1), '') AS `booking_code`,
    COALESCE((SELECT `adult_net_price` FROM `other_pricing` WHERE `bookings_other_id` = `bo`.`id` LIMIT 1), 0.00) AS `adult_net_price`,
    COALESCE((SELECT `adult_sale_price` FROM `other_pricing` WHERE `bookings_other_id` = `bo`.`id` LIMIT 1), 0.00) AS `adult_sale_price`,
    COALESCE((SELECT `adult_pax` FROM `other_pricing` WHERE `bookings_other_id` = `bo`.`id` LIMIT 1), 0) AS `adult_pax`,
    COALESCE((SELECT `child_net_price` FROM `other_pricing` WHERE `bookings_other_id` = `bo`.`id` LIMIT 1), 0.00) AS `child_net_price`,
    COALESCE((SELECT `child_sale_price` FROM `other_pricing` WHERE `bookings_other_id` = `bo`.`id` LIMIT 1), 0.00) AS `child_sale_price`,
    COALESCE((SELECT `child_pax` FROM `other_pricing` WHERE `bookings_other_id` = `bo`.`id` LIMIT 1), 0) AS `child_pax`,
    COALESCE((SELECT `infant_net_price` FROM `other_pricing` WHERE `bookings_other_id` = `bo`.`id` LIMIT 1), 0.00) AS `infant_net_price`,
    COALESCE((SELECT `infant_sale_price` FROM `other_pricing` WHERE `bookings_other_id` = `bo`.`id` LIMIT 1), 0.00) AS `infant_sale_price`,
    COALESCE((SELECT `infant_pax` FROM `other_pricing` WHERE `bookings_other_id` = `bo`.`id` LIMIT 1), 0) AS `infant_pax`,
    0.00 AS `extras_net_total`,
    0.00 AS `extras_sale_total`,
    COALESCE((SELECT `grand_total` FROM `other_details` WHERE `bookings_other_id` = `bo`.`id` LIMIT 1), 0.00) AS `total_price`,
    `bo`.`payment_status` AS `payment_status`,
    (SELECT `payment_method` FROM `payment_tracking` WHERE `booking_type` = 'other' AND `booking_id` = `bo`.`id` LIMIT 1) AS `payment_method`,
    (SELECT `bank_name` FROM `payment_tracking` WHERE `booking_type` = 'other' AND `booking_id` = `bo`.`id` LIMIT 1) AS `bank_name`,
    (SELECT `account_number` FROM `payment_tracking` WHERE `booking_type` = 'other' AND `booking_id` = `bo`.`id` LIMIT 1) AS `account_number`,
    '' AS `ticket_type`,
    '' AS `ticket_numbers`
FROM `bookings_other` `bo`
LEFT JOIN `customers` `c` ON `bo`.`customer_id` = `c`.`id`
LEFT JOIN `information` `i` ON `bo`.`information_id` = `i`.`id`
WHERE `bo`.`status` <> 'cancelled';

-- =====================================================
-- 4. Recreate view_daily_report_all (UNION ALL จาก 3 views)
-- =====================================================
CREATE VIEW `view_daily_report_all` AS
SELECT * FROM `view_daily_report_flight`
UNION ALL
SELECT * FROM `view_daily_report_voucher`
UNION ALL
SELECT * FROM `view_daily_report_other`;

-- =====================================================
-- Migration Complete
-- =====================================================
