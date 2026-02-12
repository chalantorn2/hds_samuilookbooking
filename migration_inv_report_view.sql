-- Migration: Update view_daily_report_flight to use invoice_number instead of po_number
-- Date: 2026-02-11
-- Description: เปลี่ยน booking_ref_no จาก po_number เป็น COALESCE(invoice_number, po_number)
--              เพื่อให้ Report แสดง INV Number แทน PO Number

CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `view_daily_report_flight` AS
SELECT
    'Flight' AS `booking_type`,
    `bt`.`id` AS `booking_id`,
    CAST(COALESCE(`bt`.`invoice_generated_at`, `bt`.`po_generated_at`, CONVERT_TZ(`bt`.`created_at`, '+00:00', '+07:00')) AS DATE) AS `create_date`,
    COALESCE(`bt`.`invoice_generated_at`, `bt`.`po_generated_at`, CONVERT_TZ(`bt`.`created_at`, '+00:00', '+07:00')) AS `created_at`,
    COALESCE(`bt`.`invoice_number`, `bt`.`po_number`) AS `booking_ref_no`,
    `c`.`name` AS `customer_name`,
    `c`.`code` AS `customer_code`,
    `i`.`name` AS `supplier_name`,
    `i`.`code` AS `supplier_code`,
    (SELECT `tickets_passengers`.`passenger_name`
     FROM `tickets_passengers`
     WHERE `tickets_passengers`.`bookings_ticket_id` = `bt`.`id`
     ORDER BY `tickets_passengers`.`id` LIMIT 1) AS `pax_name`,
    COALESCE((SELECT `tickets_pricing`.`adult_pax` + `tickets_pricing`.`child_pax` + `tickets_pricing`.`infant_pax`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0) AS `pax_count`,
    (SELECT GROUP_CONCAT(CONCAT(`tickets_routes`.`origin`, '-', `tickets_routes`.`destination`)
            ORDER BY `tickets_routes`.`id` ASC SEPARATOR ' - ')
     FROM `tickets_routes`
     WHERE `tickets_routes`.`bookings_ticket_id` = `bt`.`id`) AS `routing_detail`,
    COALESCE((SELECT `ticket_additional_info`.`code`
              FROM `ticket_additional_info`
              WHERE `ticket_additional_info`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), '') AS `booking_code`,
    COALESCE((SELECT `tickets_pricing`.`adult_net_price`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `adult_net_price`,
    COALESCE((SELECT `tickets_pricing`.`adult_sale_price`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `adult_sale_price`,
    COALESCE((SELECT `tickets_pricing`.`adult_pax`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0) AS `adult_pax`,
    COALESCE((SELECT `tickets_pricing`.`child_net_price`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `child_net_price`,
    COALESCE((SELECT `tickets_pricing`.`child_sale_price`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `child_sale_price`,
    COALESCE((SELECT `tickets_pricing`.`child_pax`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0) AS `child_pax`,
    COALESCE((SELECT `tickets_pricing`.`infant_net_price`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `infant_net_price`,
    COALESCE((SELECT `tickets_pricing`.`infant_sale_price`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `infant_sale_price`,
    COALESCE((SELECT `tickets_pricing`.`infant_pax`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0) AS `infant_pax`,
    COALESCE((SELECT SUM(`tickets_extras`.`net_price` * `tickets_extras`.`quantity`)
              FROM `tickets_extras`
              WHERE `tickets_extras`.`bookings_ticket_id` = `bt`.`id`), 0.00) AS `extras_net_total`,
    COALESCE((SELECT SUM(`tickets_extras`.`sale_price` * `tickets_extras`.`quantity`)
              FROM `tickets_extras`
              WHERE `tickets_extras`.`bookings_ticket_id` = `bt`.`id`), 0.00) AS `extras_sale_total`,
    COALESCE((SELECT `tickets_detail`.`grand_total`
              FROM `tickets_detail`
              WHERE `tickets_detail`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `total_price`,
    `bt`.`payment_status` AS `payment_status`,
    (SELECT `payment_tracking`.`payment_method`
     FROM `payment_tracking`
     WHERE `payment_tracking`.`booking_type` = 'flight' AND `payment_tracking`.`booking_id` = `bt`.`id` LIMIT 1) AS `payment_method`,
    (SELECT `payment_tracking`.`bank_name`
     FROM `payment_tracking`
     WHERE `payment_tracking`.`booking_type` = 'flight' AND `payment_tracking`.`booking_id` = `bt`.`id` LIMIT 1) AS `bank_name`,
    (SELECT `payment_tracking`.`account_number`
     FROM `payment_tracking`
     WHERE `payment_tracking`.`booking_type` = 'flight' AND `payment_tracking`.`booking_id` = `bt`.`id` LIMIT 1) AS `account_number`,
    COALESCE((SELECT `ticket_additional_info`.`ticket_type`
              FROM `ticket_additional_info`
              WHERE `ticket_additional_info`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), '') AS `ticket_type`,
    COALESCE((SELECT `ticket_additional_info`.`ticket_type_details`
              FROM `ticket_additional_info`
              WHERE `ticket_additional_info`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), '') AS `ticket_type_details`,
    COALESCE((SELECT GROUP_CONCAT(`tickets_passengers`.`ticket_code` SEPARATOR ', ')
              FROM `tickets_passengers`
              WHERE `tickets_passengers`.`bookings_ticket_id` = `bt`.`id`
              AND `tickets_passengers`.`ticket_code` IS NOT NULL
              AND TRIM(`tickets_passengers`.`ticket_code`) <> ''
              ORDER BY `tickets_passengers`.`id`), '') AS `ticket_numbers`
FROM ((`bookings_ticket` `bt`
    LEFT JOIN `customers` `c` ON (`bt`.`customer_id` = `c`.`id`))
    LEFT JOIN `information` `i` ON (`bt`.`information_id` = `i`.`id`))
WHERE `bt`.`status` <> 'cancelled'
  AND (
    (`bt`.`invoice_number` IS NOT NULL AND `bt`.`invoice_number` <> '')
    OR (`bt`.`po_number` IS NOT NULL AND `bt`.`po_number` <> '')
  );
