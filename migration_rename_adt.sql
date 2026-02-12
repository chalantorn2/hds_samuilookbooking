-- Migration: Rename CHD/INF to ADT2/ADT3
-- Date: 2026-02-12
-- Description: เปลี่ยนชื่อ columns ใน tickets_pricing จาก adult/child/infant เป็น adt1/adt2/adt3
--              และอัพเดทค่า age ใน tickets_passengers

-- tickets_pricing: rename columns
ALTER TABLE tickets_pricing
  CHANGE adult_net_price adt1_net_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE adult_sale_price adt1_sale_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE adult_pax adt1_pax INT(11) NOT NULL DEFAULT 0,
  CHANGE adult_total adt1_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE child_net_price adt2_net_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE child_sale_price adt2_sale_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE child_pax adt2_pax INT(11) NOT NULL DEFAULT 0,
  CHANGE child_total adt2_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE infant_net_price adt3_net_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE infant_sale_price adt3_sale_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  CHANGE infant_pax adt3_pax INT(11) NOT NULL DEFAULT 0,
  CHANGE infant_total adt3_total DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- tickets_passengers: update age values
UPDATE tickets_passengers SET age = 'ADT1' WHERE age = 'ADT' OR age = 'ADULT';
UPDATE tickets_passengers SET age = 'ADT2' WHERE age = 'CHD' OR age = 'CHILD';
UPDATE tickets_passengers SET age = 'ADT3' WHERE age = 'INF' OR age = 'INFANT';

-- view_daily_report_flight: recreate view with new column names
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
    COALESCE((SELECT `tickets_pricing`.`adt1_pax` + `tickets_pricing`.`adt2_pax` + `tickets_pricing`.`adt3_pax`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0) AS `pax_count`,
    (SELECT GROUP_CONCAT(CONCAT(`tickets_routes`.`origin`, '-', `tickets_routes`.`destination`)
            ORDER BY `tickets_routes`.`id` ASC SEPARATOR ' - ')
     FROM `tickets_routes`
     WHERE `tickets_routes`.`bookings_ticket_id` = `bt`.`id`) AS `routing_detail`,
    COALESCE((SELECT `ticket_additional_info`.`code`
              FROM `ticket_additional_info`
              WHERE `ticket_additional_info`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), '') AS `booking_code`,
    COALESCE((SELECT `tickets_pricing`.`adt1_net_price`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `adt1_net_price`,
    COALESCE((SELECT `tickets_pricing`.`adt1_sale_price`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `adt1_sale_price`,
    COALESCE((SELECT `tickets_pricing`.`adt1_pax`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0) AS `adt1_pax`,
    COALESCE((SELECT `tickets_pricing`.`adt2_net_price`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `adt2_net_price`,
    COALESCE((SELECT `tickets_pricing`.`adt2_sale_price`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `adt2_sale_price`,
    COALESCE((SELECT `tickets_pricing`.`adt2_pax`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0) AS `adt2_pax`,
    COALESCE((SELECT `tickets_pricing`.`adt3_net_price`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `adt3_net_price`,
    COALESCE((SELECT `tickets_pricing`.`adt3_sale_price`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0.00) AS `adt3_sale_price`,
    COALESCE((SELECT `tickets_pricing`.`adt3_pax`
              FROM `tickets_pricing`
              WHERE `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` LIMIT 1), 0) AS `adt3_pax`,
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

-- view_daily_report_all: recreate UNION view with new column names
-- (voucher/other views still use adult/child/infant internally, but aliased to adt1/adt2/adt3)
CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `view_daily_report_all` AS
SELECT * FROM `view_daily_report_flight`
UNION ALL
SELECT
    `booking_type`, `booking_id`, `create_date`, `created_at`, `booking_ref_no`,
    `customer_name`, `customer_code`, `supplier_name`, `supplier_code`,
    `pax_name`, `pax_count`, `routing_detail`, `booking_code`,
    `adult_net_price` AS `adt1_net_price`,
    `adult_sale_price` AS `adt1_sale_price`,
    `adult_pax` AS `adt1_pax`,
    `child_net_price` AS `adt2_net_price`,
    `child_sale_price` AS `adt2_sale_price`,
    `child_pax` AS `adt2_pax`,
    `infant_net_price` AS `adt3_net_price`,
    `infant_sale_price` AS `adt3_sale_price`,
    `infant_pax` AS `adt3_pax`,
    `extras_net_total`, `extras_sale_total`, `total_price`,
    `payment_status`, `payment_method`, `bank_name`, `account_number`,
    `ticket_type`, `ticket_type_details`, `ticket_numbers`
FROM `view_daily_report_voucher`
UNION ALL
SELECT
    `booking_type`, `booking_id`, `create_date`, `created_at`, `booking_ref_no`,
    `customer_name`, `customer_code`, `supplier_name`, `supplier_code`,
    `pax_name`, `pax_count`, `routing_detail`, `booking_code`,
    `adult_net_price` AS `adt1_net_price`,
    `adult_sale_price` AS `adt1_sale_price`,
    `adult_pax` AS `adt1_pax`,
    `child_net_price` AS `adt2_net_price`,
    `child_sale_price` AS `adt2_sale_price`,
    `child_pax` AS `adt2_pax`,
    `infant_net_price` AS `adt3_net_price`,
    `infant_sale_price` AS `adt3_sale_price`,
    `infant_pax` AS `adt3_pax`,
    `extras_net_total`, `extras_sale_total`, `total_price`,
    `payment_status`, `payment_method`, `bank_name`, `account_number`,
    `ticket_type`, `ticket_type_details`, `ticket_numbers`
FROM `view_daily_report_other`;
