-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Jan 09, 2026 at 01:16 AM
-- Server version: 10.11.14-MariaDB-0+deb12u2-log
-- PHP Version: 8.4.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `samui_booking`
--

-- --------------------------------------------------------

--
-- Table structure for table `bookings_deposit`
--

CREATE TABLE `bookings_deposit` (
  `id` int(11) NOT NULL,
  `reference_number` varchar(50) NOT NULL COMMENT 'DP-YY-M-XXXX format',
  `customer_id` int(11) NOT NULL,
  `supplier_id` int(11) DEFAULT NULL COMMENT 'information table (airlines)',
  `flight_ticket_id` int(11) DEFAULT NULL COMMENT 'FK to flight_tickets.id when DP converted to FT',
  `deposit_type` enum('airTicket','package','land','other') DEFAULT 'airTicket',
  `other_type_description` varchar(100) DEFAULT NULL COMMENT 'คำอธิบายเมื่อเลือก other',
  `group_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อกรุ๊ป',
  `status` enum('pending','issued','cancelled') NOT NULL DEFAULT 'pending',
  `payment_status` enum('unpaid','paid','partial') DEFAULT 'unpaid',
  `issue_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `credit_days` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancelled_by` int(11) DEFAULT NULL,
  `cancel_reason` text DEFAULT NULL,
  `customer_override_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`customer_override_data`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางหลักสำหรับการจอง Deposit';

-- --------------------------------------------------------

--
-- Table structure for table `bookings_other`
--

CREATE TABLE `bookings_other` (
  `id` int(11) NOT NULL,
  `reference_number` varchar(50) NOT NULL COMMENT 'INS/HTL/TRN/VSA/OTH-YY-M-XXXX format',
  `vc_number` varchar(50) DEFAULT NULL,
  `vc_generated_at` timestamp NULL DEFAULT NULL,
  `customer_id` int(11) NOT NULL,
  `information_id` int(11) DEFAULT NULL COMMENT 'FK to information table (suppliers)',
  `service_type` enum('insurance','hotel','train','visa','other') DEFAULT 'other',
  `status` enum('not_invoiced','invoiced','cancelled','confirmed') DEFAULT 'not_invoiced',
  `payment_status` enum('unpaid','paid','partial') DEFAULT 'unpaid',
  `issue_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `credit_days` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancelled_by` int(11) DEFAULT NULL,
  `cancel_reason` text DEFAULT NULL,
  `customer_override_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`customer_override_data`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Main table for Other services bookings';

-- --------------------------------------------------------

--
-- Table structure for table `bookings_ticket`
--

CREATE TABLE `bookings_ticket` (
  `id` int(11) NOT NULL,
  `reference_number` varchar(50) NOT NULL,
  `customer_id` int(11) NOT NULL,
  `information_id` int(11) NOT NULL,
  `deposit_id` int(11) DEFAULT NULL COMMENT 'FK to bookings_deposit.id when FT created from DP',
  `status` enum('not_invoiced','invoiced','cancelled','confirmed') NOT NULL DEFAULT 'not_invoiced',
  `payment_status` enum('unpaid','paid','partial') NOT NULL DEFAULT 'unpaid',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancelled_by` int(11) DEFAULT NULL,
  `cancel_reason` text DEFAULT NULL,
  `po_number` varchar(50) DEFAULT NULL,
  `po_generated_at` timestamp NULL DEFAULT NULL,
  `invoice_number` varchar(50) DEFAULT NULL,
  `invoice_generated_at` timestamp NULL DEFAULT NULL,
  `rc_number` varchar(50) DEFAULT NULL,
  `rc_generated_at` timestamp NULL DEFAULT NULL,
  `rc_selection_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`rc_selection_data`)),
  `customer_override_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`customer_override_data`)),
  `rc_email_sent` tinyint(1) DEFAULT 0 COMMENT 'Receipt email sent status (0=not sent, 1=sent)',
  `rc_email_sent_at` datetime DEFAULT NULL COMMENT 'Receipt email sent timestamp',
  `rc_linked_tickets` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON array of ticket IDs that share this RC number' CHECK (json_valid(`rc_linked_tickets`)),
  `po_email_sent` tinyint(1) DEFAULT 0 COMMENT 'Invoice/PO email sent status (0=not sent, 1=sent)',
  `po_email_sent_at` datetime DEFAULT NULL COMMENT 'Invoice/PO email sent timestamp'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bookings ticket table with receipt email tracking';

-- --------------------------------------------------------

--
-- Table structure for table `bookings_voucher`
--

CREATE TABLE `bookings_voucher` (
  `id` int(11) NOT NULL,
  `reference_number` varchar(50) NOT NULL COMMENT 'VC-25-1-0001 (Voucher แบบเดียว)',
  `customer_id` int(11) NOT NULL,
  `information_id` int(11) DEFAULT NULL COMMENT 'Links to information table (supplier-voucher) - Optional for testing',
  `service_type` enum('bus','boat','tour') NOT NULL DEFAULT 'bus' COMMENT 'แยกประเภทใน Frontend เท่านั้น',
  `status` enum('not_voucher','voucher_issued','cancelled','confirmed') NOT NULL DEFAULT 'not_voucher',
  `vc_number` varchar(50) DEFAULT NULL,
  `vc_generated_at` timestamp NULL DEFAULT NULL,
  `payment_status` enum('unpaid','paid','partial') NOT NULL DEFAULT 'unpaid',
  `issue_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `credit_days` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `cancelled_by` int(11) DEFAULT NULL,
  `cancel_reason` text DEFAULT NULL,
  `customer_override_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`customer_override_data`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Main voucher bookings table';

-- --------------------------------------------------------

--
-- Table structure for table `city`
--

CREATE TABLE `city` (
  `city_id` int(11) NOT NULL COMMENT 'รหัสเมือง (Primary Key)',
  `city_code` varchar(3) NOT NULL COMMENT 'รหัสเมือง 3 ตัวอักษร เช่น BKK, SMI, CNX',
  `city_name` varchar(100) NOT NULL COMMENT 'ชื่อเมือง',
  `created_at` timestamp NULL DEFAULT current_timestamp() COMMENT 'วันที่สร้างข้อมูล',
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp() COMMENT 'วันที่แก้ไขข้อมูลล่าสุด'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ตารางข้อมูลเมือง';

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(10) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address_line1` text DEFAULT NULL,
  `address_line2` text DEFAULT NULL,
  `address_line3` text DEFAULT NULL,
  `id_number` varchar(20) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `branch_type` enum('Head Office','Branch') NOT NULL DEFAULT 'Head Office',
  `branch_number` varchar(10) DEFAULT NULL,
  `credit_days` int(11) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `delete_log`
--

CREATE TABLE `delete_log` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `deleted_by` int(11) DEFAULT NULL,
  `deleted_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `backup_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`backup_data`)),
  `ip_address` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `deposit_additional_info`
--

CREATE TABLE `deposit_additional_info` (
  `id` int(11) NOT NULL,
  `bookings_deposit_id` int(11) NOT NULL,
  `company_payment_method` varchar(100) DEFAULT NULL COMMENT 'วิธีการชำระเงินของบริษัท',
  `company_payment_details` text DEFAULT NULL COMMENT 'รายละเอียดการชำระเงินของบริษัท',
  `company_payments` longtext DEFAULT NULL COMMENT 'JSON array of company payment details [{"amount":"","date":"","by":""}]',
  `customer_payment_method` varchar(100) DEFAULT NULL COMMENT 'วิธีการชำระเงินของลูกค้า',
  `customer_payment_details` text DEFAULT NULL COMMENT 'รายละเอียดการชำระเงินของลูกค้า',
  `customer_payments` longtext DEFAULT NULL COMMENT 'JSON array of customer payment details [{"amount":"","date":"","by":""}]',
  `code` varchar(50) DEFAULT NULL COMMENT 'รหัสอ้างอิงเพิ่มเติม',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='ข้อมูลการชำระเงินและข้อมูลเพิ่มเติม';

-- --------------------------------------------------------

--
-- Table structure for table `deposit_details`
--

CREATE TABLE `deposit_details` (
  `id` int(11) NOT NULL,
  `bookings_deposit_id` int(11) NOT NULL,
  `description` text DEFAULT NULL COMMENT 'รายละเอียดการจองและการเดินทาง',
  `subtotal_before_vat` decimal(10,2) DEFAULT 0.00,
  `pricing_total` decimal(10,2) DEFAULT 0.00 COMMENT 'ยอดรวมจาก Adult+Child+Infant',
  `deposit_amount` decimal(10,2) DEFAULT 0.00 COMMENT 'จำนวนเงิน Deposit per pax',
  `deposit_pax` int(11) DEFAULT 0 COMMENT 'จำนวน Pax สำหรับ Deposit',
  `deposit_total` decimal(10,2) DEFAULT 0.00 COMMENT 'ยอดรวม Deposit',
  `deposit_amount_2` decimal(10,2) NOT NULL DEFAULT 0.00,
  `deposit_pax_2` int(11) NOT NULL DEFAULT 0,
  `deposit_total_2` decimal(10,2) NOT NULL DEFAULT 0.00,
  `vat_amount` decimal(10,2) DEFAULT 0.00,
  `vat_percent` decimal(5,2) DEFAULT 7.00,
  `grand_total` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='รายละเอียดและราคา Deposit';

-- --------------------------------------------------------

--
-- Table structure for table `deposit_extras`
--

CREATE TABLE `deposit_extras` (
  `id` int(11) NOT NULL,
  `bookings_deposit_id` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `net_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `sale_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Deposit extras/additional items';

-- --------------------------------------------------------

--
-- Table structure for table `deposit_pricing`
--

CREATE TABLE `deposit_pricing` (
  `id` int(11) NOT NULL,
  `bookings_deposit_id` int(11) NOT NULL,
  `adult_net_price` decimal(10,2) DEFAULT 0.00,
  `adult_sale_price` decimal(10,2) DEFAULT 0.00,
  `adult_pax` int(11) DEFAULT 0,
  `adult_total` decimal(10,2) DEFAULT 0.00,
  `child_net_price` decimal(10,2) DEFAULT 0.00,
  `child_sale_price` decimal(10,2) DEFAULT 0.00,
  `child_pax` int(11) DEFAULT 0,
  `child_total` decimal(10,2) DEFAULT 0.00,
  `infant_net_price` decimal(10,2) DEFAULT 0.00,
  `infant_sale_price` decimal(10,2) DEFAULT 0.00,
  `infant_pax` int(11) DEFAULT 0,
  `infant_total` decimal(10,2) DEFAULT 0.00,
  `deposit_sale_price` decimal(10,2) DEFAULT 0.00,
  `deposit_pax` int(11) DEFAULT 0,
  `deposit_total` decimal(10,2) DEFAULT 0.00,
  `subtotal_amount` decimal(10,2) DEFAULT 0.00,
  `vat_percent` decimal(5,2) DEFAULT 0.00,
  `vat_amount` decimal(10,2) DEFAULT 0.00,
  `total_amount` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='รายละเอียดราคาแบบแยกประเภท';

-- --------------------------------------------------------

--
-- Table structure for table `deposit_routes`
--

CREATE TABLE `deposit_routes` (
  `id` int(11) NOT NULL,
  `bookings_deposit_id` int(11) NOT NULL,
  `flight_number` varchar(20) DEFAULT NULL,
  `rbd` varchar(10) DEFAULT NULL,
  `date` varchar(10) DEFAULT NULL,
  `origin` varchar(10) NOT NULL,
  `destination` varchar(10) NOT NULL,
  `departure_time` varchar(10) DEFAULT NULL,
  `arrival_time` varchar(10) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Deposit routes information';

-- --------------------------------------------------------

--
-- Table structure for table `deposit_terms`
--

CREATE TABLE `deposit_terms` (
  `id` int(11) NOT NULL,
  `bookings_deposit_id` int(11) NOT NULL,
  `deposit_due_date` date DEFAULT NULL COMMENT 'ชำระเงินมัดจำภายในวันที่',
  `second_deposit_due_date` date DEFAULT NULL,
  `passenger_info_due_date` date DEFAULT NULL COMMENT 'แจ้งชื่อผู้โดยสารก่อนวันที่',
  `full_payment_due_date` date DEFAULT NULL COMMENT 'ชำระทั้งหมดภายในวันที่',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='เงื่อนไขและวันที่สำคัญของ Deposit';

-- --------------------------------------------------------

--
-- Table structure for table `information`
--

CREATE TABLE `information` (
  `id` int(11) NOT NULL,
  `category` varchar(50) NOT NULL,
  `code` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL COMMENT 'เบอร์โทร Supplier',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `type` varchar(50) DEFAULT NULL,
  `numeric_code` varchar(10) DEFAULT NULL,
  `is_domestic` tinyint(1) DEFAULT 1 COMMENT '1=Domestic (ในประเทศ), 0=International (ต่างประเทศ)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `other_additional_info`
--

CREATE TABLE `other_additional_info` (
  `id` int(11) NOT NULL,
  `bookings_other_id` int(11) NOT NULL,
  `company_payment_method` varchar(100) DEFAULT NULL,
  `company_payment_details` text DEFAULT NULL,
  `customer_payment_method` varchar(100) DEFAULT NULL,
  `customer_payment_details` text DEFAULT NULL,
  `code` varchar(50) DEFAULT NULL COMMENT 'รหัสอ้างอิงเพิ่มเติม',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Other services additional information and payment methods';

-- --------------------------------------------------------

--
-- Table structure for table `other_details`
--

CREATE TABLE `other_details` (
  `id` int(11) NOT NULL,
  `bookings_other_id` int(11) NOT NULL,
  `description` text DEFAULT NULL COMMENT 'รายละเอียดบริการ',
  `service_date` varchar(50) DEFAULT NULL COMMENT 'วันที่ใช้บริการ (flexible format)',
  `reference_code` varchar(100) DEFAULT NULL COMMENT 'รหัสอ้างอิง',
  `hotel_name` varchar(255) DEFAULT NULL COMMENT 'ชื่อโรงแรม (สำหรับ hotel service)',
  `check_in_date` varchar(50) DEFAULT NULL COMMENT 'วันเช็คอิน (สำหรับ hotel)',
  `check_out_date` varchar(50) DEFAULT NULL COMMENT 'วันเช็คเอาต์ (สำหรับ hotel)',
  `nights` varchar(10) DEFAULT NULL COMMENT 'จำนวนคืน (สำหรับ hotel)',
  `country` varchar(100) DEFAULT NULL COMMENT 'ประเทศ (สำหรับ visa)',
  `visa_type` varchar(100) DEFAULT NULL COMMENT 'ประเภทวีซ่า',
  `route` varchar(255) DEFAULT NULL COMMENT 'เส้นทาง (สำหรับ train)',
  `departure_time` varchar(10) DEFAULT NULL COMMENT 'เวลาออกเดินทาง',
  `arrival_time` varchar(10) DEFAULT NULL COMMENT 'เวลาถึง',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ',
  `subtotal_before_vat` decimal(10,2) NOT NULL DEFAULT 0.00,
  `extras_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `pricing_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `vat_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `vat_percent` decimal(5,2) NOT NULL DEFAULT 7.00,
  `grand_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Other services details and pricing summary';

-- --------------------------------------------------------

--
-- Table structure for table `other_passengers`
--

CREATE TABLE `other_passengers` (
  `id` int(11) NOT NULL,
  `bookings_other_id` int(11) NOT NULL,
  `passenger_name` varchar(255) NOT NULL,
  `passenger_type` enum('ADT','CHD','INF') NOT NULL DEFAULT 'ADT' COMMENT 'Adult/Child/Infant',
  `service_number` varchar(50) DEFAULT NULL COMMENT 'Generated service number for passenger',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Other services passengers information';

-- --------------------------------------------------------

--
-- Table structure for table `other_pricing`
--

CREATE TABLE `other_pricing` (
  `id` int(11) NOT NULL,
  `bookings_other_id` int(11) NOT NULL,
  `adult_net_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `adult_sale_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `adult_pax` int(11) NOT NULL DEFAULT 0,
  `adult_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `child_net_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `child_sale_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `child_pax` int(11) NOT NULL DEFAULT 0,
  `child_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `infant_net_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `infant_sale_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `infant_pax` int(11) NOT NULL DEFAULT 0,
  `infant_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `subtotal_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `vat_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `vat_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Other services pricing breakdown';

-- --------------------------------------------------------

--
-- Table structure for table `payment_tracking`
--

CREATE TABLE `payment_tracking` (
  `id` int(11) NOT NULL,
  `booking_type` enum('flight','voucher','deposit','other') NOT NULL COMMENT 'Type of booking',
  `booking_id` int(11) NOT NULL COMMENT 'FK to respective booking table',
  `reference_number` varchar(50) NOT NULL COMMENT 'Reference number from booking',
  `payment_status` enum('pending','paid','partial') NOT NULL DEFAULT 'pending' COMMENT 'Payment status from customer',
  `total_amount` decimal(10,2) DEFAULT 0.00 COMMENT 'Total amount to be paid',
  `paid_amount` decimal(10,2) DEFAULT 0.00 COMMENT 'Amount already paid',
  `payment_method` varchar(100) DEFAULT NULL COMMENT 'Payment method (cash, transfer, etc.)',
  `payment_details` text DEFAULT NULL COMMENT 'Additional payment details',
  `payment_date` date DEFAULT NULL COMMENT 'Date of payment',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_by` int(11) DEFAULT NULL COMMENT 'FK to users table',
  `updated_by` int(11) DEFAULT NULL COMMENT 'FK to users table',
  `bank_name` varchar(100) DEFAULT NULL COMMENT 'ชื่อธนาคาร (KBANK, SCB, BBL, KTB)',
  `account_number` varchar(50) DEFAULT NULL COMMENT 'เลขที่บัญชี (123-4-56789)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Payment tracking for all booking types';

-- --------------------------------------------------------

--
-- Table structure for table `tickets_detail`
--

CREATE TABLE `tickets_detail` (
  `id` int(11) NOT NULL,
  `total_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `issue_date` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `credit_days` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `bookings_ticket_id` int(11) NOT NULL,
  `subtotal_before_vat` decimal(10,2) NOT NULL DEFAULT 0.00,
  `extras_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `pricing_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `vat_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `vat_percent` decimal(5,2) NOT NULL DEFAULT 7.00,
  `grand_total` decimal(10,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tickets_extras`
--

CREATE TABLE `tickets_extras` (
  `id` int(11) NOT NULL,
  `bookings_ticket_id` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `net_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `sale_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tickets_passengers`
--

CREATE TABLE `tickets_passengers` (
  `id` int(11) NOT NULL,
  `passenger_name` varchar(255) NOT NULL,
  `age` varchar(255) DEFAULT NULL,
  `ticket_number` varchar(50) DEFAULT NULL,
  `ticket_code` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `bookings_ticket_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tickets_pricing`
--

CREATE TABLE `tickets_pricing` (
  `id` int(11) NOT NULL,
  `bookings_ticket_id` int(11) NOT NULL,
  `adult_net_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `adult_sale_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `adult_pax` int(11) NOT NULL DEFAULT 0,
  `adult_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `child_net_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `child_sale_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `child_pax` int(11) NOT NULL DEFAULT 0,
  `child_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `infant_net_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `infant_sale_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `infant_pax` int(11) NOT NULL DEFAULT 0,
  `infant_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `subtotal_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `vat_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `vat_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tickets_routes`
--

CREATE TABLE `tickets_routes` (
  `id` int(11) NOT NULL,
  `bookings_ticket_id` int(11) NOT NULL,
  `flight_number` varchar(20) DEFAULT NULL,
  `rbd` varchar(10) DEFAULT NULL,
  `date` varchar(10) DEFAULT NULL,
  `origin` varchar(10) NOT NULL,
  `destination` varchar(10) NOT NULL,
  `departure_time` varchar(10) DEFAULT NULL,
  `arrival_time` varchar(10) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ticket_additional_info`
--

CREATE TABLE `ticket_additional_info` (
  `id` int(11) NOT NULL,
  `bookings_ticket_id` int(11) NOT NULL,
  `company_payment_method` varchar(100) DEFAULT NULL,
  `company_payment_details` text DEFAULT NULL,
  `customer_payment_method` varchar(100) DEFAULT NULL,
  `customer_payment_details` text DEFAULT NULL,
  `code` varchar(50) DEFAULT NULL,
  `ticket_type` varchar(50) DEFAULT NULL,
  `ticket_type_details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `fullname` varchar(100) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `role` enum('admin','manager','viewer') NOT NULL DEFAULT 'viewer',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_daily_report_all`
-- (See below for the actual view)
--
CREATE TABLE `view_daily_report_all` (
`booking_type` varchar(15)
,`booking_id` int(11)
,`create_date` date
,`created_at` timestamp /* mariadb-5.3 */
,`booking_ref_no` varchar(50)
,`customer_name` varchar(255)
,`customer_code` varchar(10)
,`supplier_name` varchar(255)
,`supplier_code` varchar(20)
,`pax_name` varchar(255)
,`pax_count` bigint(20)
,`routing_detail` longtext
,`booking_code` varchar(100)
,`adult_net_price` decimal(10,2)
,`adult_sale_price` decimal(10,2)
,`adult_pax` int(11)
,`child_net_price` decimal(10,2)
,`child_sale_price` decimal(10,2)
,`child_pax` int(11)
,`infant_net_price` decimal(10,2)
,`infant_sale_price` decimal(10,2)
,`infant_pax` int(11)
,`extras_net_total` decimal(42,2)
,`extras_sale_total` decimal(42,2)
,`total_price` decimal(10,2)
,`payment_status` varchar(7)
,`payment_method` varchar(100)
,`bank_name` varchar(100)
,`account_number` varchar(50)
,`ticket_type` varchar(50)
,`ticket_numbers` longtext
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_daily_report_deposit`
-- (See below for the actual view)
--
CREATE TABLE `view_daily_report_deposit` (
`booking_type` varchar(7)
,`booking_id` int(11)
,`create_date` date
,`created_at` timestamp
,`booking_ref_no` varchar(50)
,`customer_name` varchar(255)
,`customer_code` varchar(10)
,`supplier_name` varchar(255)
,`supplier_code` varchar(20)
,`pax_name` varchar(255)
,`pax_count` bigint(13)
,`routing_detail` mediumtext
,`booking_code` varchar(50)
,`adult_net_price` decimal(10,2)
,`adult_sale_price` decimal(10,2)
,`adult_pax` int(11)
,`child_net_price` decimal(10,2)
,`child_sale_price` decimal(10,2)
,`child_pax` int(11)
,`infant_net_price` decimal(10,2)
,`infant_sale_price` decimal(10,2)
,`infant_pax` int(11)
,`extras_net_total` decimal(42,2)
,`extras_sale_total` decimal(42,2)
,`total_price` decimal(10,2)
,`payment_status` enum('unpaid','paid','partial')
,`payment_method` varchar(100)
,`bank_name` varchar(100)
,`account_number` varchar(50)
,`ticket_type` char(0)
,`ticket_numbers` char(0)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_daily_report_flight`
-- (See below for the actual view)
--
CREATE TABLE `view_daily_report_flight` (
`booking_type` varchar(6)
,`booking_id` int(11)
,`create_date` date
,`created_at` timestamp
,`booking_ref_no` varchar(50)
,`customer_name` varchar(255)
,`customer_code` varchar(10)
,`supplier_name` varchar(255)
,`supplier_code` varchar(20)
,`pax_name` varchar(255)
,`pax_count` bigint(13)
,`routing_detail` mediumtext
,`booking_code` varchar(50)
,`adult_net_price` decimal(10,2)
,`adult_sale_price` decimal(10,2)
,`adult_pax` int(11)
,`child_net_price` decimal(10,2)
,`child_sale_price` decimal(10,2)
,`child_pax` int(11)
,`infant_net_price` decimal(10,2)
,`infant_sale_price` decimal(10,2)
,`infant_pax` int(11)
,`extras_net_total` decimal(42,2)
,`extras_sale_total` decimal(42,2)
,`total_price` decimal(10,2)
,`payment_status` enum('unpaid','paid','partial')
,`payment_method` varchar(100)
,`bank_name` varchar(100)
,`account_number` varchar(50)
,`ticket_type` varchar(50)
,`ticket_numbers` mediumtext
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_daily_report_other`
-- (See below for the actual view)
--
CREATE TABLE `view_daily_report_other` (
`booking_type` varchar(15)
,`booking_id` int(11)
,`create_date` date
,`created_at` timestamp
,`booking_ref_no` varchar(50)
,`customer_name` varchar(255)
,`customer_code` varchar(10)
,`supplier_name` varchar(255)
,`supplier_code` varchar(20)
,`pax_name` varchar(255)
,`pax_count` bigint(13)
,`routing_detail` mediumtext
,`booking_code` varchar(50)
,`adult_net_price` decimal(10,2)
,`adult_sale_price` decimal(10,2)
,`adult_pax` int(11)
,`child_net_price` decimal(10,2)
,`child_sale_price` decimal(10,2)
,`child_pax` int(11)
,`infant_net_price` decimal(10,2)
,`infant_sale_price` decimal(10,2)
,`infant_pax` int(11)
,`extras_net_total` decimal(3,2)
,`extras_sale_total` decimal(3,2)
,`total_price` decimal(10,2)
,`payment_status` enum('unpaid','paid','partial')
,`payment_method` varchar(100)
,`bank_name` varchar(100)
,`account_number` varchar(50)
,`ticket_type` char(0)
,`ticket_numbers` char(0)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_daily_report_voucher`
-- (See below for the actual view)
--
CREATE TABLE `view_daily_report_voucher` (
`booking_type` varchar(12)
,`booking_id` int(11)
,`create_date` date
,`created_at` timestamp
,`booking_ref_no` varchar(50)
,`customer_name` varchar(255)
,`customer_code` varchar(10)
,`supplier_name` varchar(255)
,`supplier_code` varchar(20)
,`pax_name` varchar(255)
,`pax_count` bigint(13)
,`routing_detail` mediumtext
,`booking_code` varchar(100)
,`adult_net_price` decimal(10,2)
,`adult_sale_price` decimal(10,2)
,`adult_pax` int(11)
,`child_net_price` decimal(10,2)
,`child_sale_price` decimal(10,2)
,`child_pax` int(11)
,`infant_net_price` decimal(10,2)
,`infant_sale_price` decimal(10,2)
,`infant_pax` int(11)
,`extras_net_total` decimal(3,2)
,`extras_sale_total` decimal(3,2)
,`total_price` decimal(10,2)
,`payment_status` enum('unpaid','paid','partial')
,`payment_method` varchar(100)
,`bank_name` varchar(100)
,`account_number` varchar(50)
,`ticket_type` char(0)
,`ticket_numbers` char(0)
);

-- --------------------------------------------------------

--
-- Table structure for table `voucher_additional_info`
--

CREATE TABLE `voucher_additional_info` (
  `id` int(11) NOT NULL,
  `bookings_voucher_id` int(11) NOT NULL,
  `company_payment_method` varchar(100) DEFAULT NULL,
  `company_payment_details` text DEFAULT NULL,
  `customer_payment_method` varchar(100) DEFAULT NULL,
  `customer_payment_details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Voucher additional information and payment methods';

-- --------------------------------------------------------

--
-- Table structure for table `voucher_details`
--

CREATE TABLE `voucher_details` (
  `id` int(11) NOT NULL,
  `bookings_voucher_id` int(11) NOT NULL,
  `description` text DEFAULT NULL COMMENT 'รายละเอียดบริการ',
  `trip_date` varchar(50) DEFAULT NULL COMMENT 'วันที่เดินทาง',
  `pickup_time` varchar(10) DEFAULT NULL COMMENT 'เวลารับ (HH:MM format)',
  `hotel` varchar(255) DEFAULT NULL COMMENT 'โรงแรม',
  `room_no` varchar(50) DEFAULT NULL COMMENT 'เลขห้องพัก',
  `reference` varchar(100) DEFAULT NULL COMMENT 'เลขอ้างอิง',
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ',
  `subtotal_before_vat` decimal(10,2) NOT NULL DEFAULT 0.00,
  `extras_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `pricing_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `vat_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `vat_percent` decimal(5,2) NOT NULL DEFAULT 7.00,
  `grand_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Voucher service details and pricing summary';

-- --------------------------------------------------------

--
-- Table structure for table `voucher_passengers`
--

CREATE TABLE `voucher_passengers` (
  `id` int(11) NOT NULL,
  `bookings_voucher_id` int(11) NOT NULL,
  `passenger_name` varchar(255) NOT NULL,
  `passenger_type` enum('ADT','CHD','INF') NOT NULL DEFAULT 'ADT' COMMENT 'Adult/Child/Infant',
  `voucher_number` varchar(50) DEFAULT NULL COMMENT 'Generated voucher number for passenger',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Voucher passengers information';

-- --------------------------------------------------------

--
-- Table structure for table `voucher_pricing`
--

CREATE TABLE `voucher_pricing` (
  `id` int(11) NOT NULL,
  `bookings_voucher_id` int(11) NOT NULL,
  `adult_net_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `adult_sale_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `adult_pax` int(11) NOT NULL DEFAULT 0,
  `adult_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `child_net_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `child_sale_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `child_pax` int(11) NOT NULL DEFAULT 0,
  `child_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `infant_net_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `infant_sale_price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `infant_pax` int(11) NOT NULL DEFAULT 0,
  `infant_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `subtotal_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `vat_percent` decimal(5,2) NOT NULL DEFAULT 0.00,
  `vat_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Voucher pricing breakdown';

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_booking_summary`
-- (See below for the actual view)
--
CREATE TABLE `v_booking_summary` (
`id` int(11)
,`reference_number` varchar(50)
,`status` enum('not_invoiced','invoiced','cancelled','confirmed')
,`payment_status` enum('unpaid','paid','partial')
,`created_at` timestamp
,`customer_name` varchar(255)
,`customer_code` varchar(10)
,`supplier_name` varchar(255)
,`supplier_code` varchar(20)
,`grand_total` decimal(10,2)
,`issue_date` date
,`due_date` date
,`po_number` varchar(50)
,`po_generated_at` timestamp
,`rc_number` varchar(50)
,`rc_generated_at` timestamp
,`created_by_name` varchar(100)
);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings_deposit`
--
ALTER TABLE `bookings_deposit`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reference_number` (`reference_number`),
  ADD KEY `idx_reference_number` (`reference_number`),
  ADD KEY `idx_customer_id` (`customer_id`),
  ADD KEY `idx_supplier_id` (`supplier_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `created_by` (`created_by`),
  ADD KEY `updated_by` (`updated_by`),
  ADD KEY `cancelled_by` (`cancelled_by`),
  ADD KEY `idx_deposit_type` (`deposit_type`),
  ADD KEY `idx_group_name` (`group_name`),
  ADD KEY `idx_issue_date` (`issue_date`),
  ADD KEY `idx_due_date` (`due_date`),
  ADD KEY `idx_customer_status` (`customer_id`,`status`),
  ADD KEY `idx_supplier_type` (`supplier_id`,`deposit_type`),
  ADD KEY `idx_flight_ticket_id` (`flight_ticket_id`),
  ADD KEY `idx_created_at_for_report` (`created_at`,`payment_status`);

--
-- Indexes for table `bookings_other`
--
ALTER TABLE `bookings_other`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reference_number` (`reference_number`),
  ADD KEY `idx_reference_number` (`reference_number`),
  ADD KEY `idx_customer_id` (`customer_id`),
  ADD KEY `idx_information_id` (`information_id`),
  ADD KEY `idx_service_type` (`service_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_payment_status` (`payment_status`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_issue_date` (`issue_date`),
  ADD KEY `idx_due_date` (`due_date`),
  ADD KEY `fk_other_created_by` (`created_by`),
  ADD KEY `fk_other_updated_by` (`updated_by`),
  ADD KEY `fk_other_cancelled_by` (`cancelled_by`),
  ADD KEY `idx_other_customer_service` (`customer_id`,`service_type`),
  ADD KEY `idx_other_status_created` (`status`,`created_at`),
  ADD KEY `idx_other_service_status` (`service_type`,`status`),
  ADD KEY `idx_created_at_for_report` (`created_at`,`payment_status`);

--
-- Indexes for table `bookings_ticket`
--
ALTER TABLE `bookings_ticket`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reference_number` (`reference_number`),
  ADD UNIQUE KEY `uk_reference_number` (`reference_number`),
  ADD KEY `idx_customer_id` (`customer_id`),
  ADD KEY `idx_information_id` (`information_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_payment_status` (`payment_status`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_po_number` (`po_number`),
  ADD KEY `fk_bookings_created_by` (`created_by`),
  ADD KEY `fk_bookings_updated_by` (`updated_by`),
  ADD KEY `fk_bookings_cancelled_by` (`cancelled_by`),
  ADD KEY `idx_bookings_created_at_status` (`created_at`,`status`),
  ADD KEY `idx_rc_number` (`rc_number`),
  ADD KEY `idx_bookings_rc_created_at` (`rc_generated_at`),
  ADD KEY `idx_rc_email_sent` (`rc_email_sent`),
  ADD KEY `idx_invoice_number` (`invoice_number`),
  ADD KEY `idx_deposit_id` (`deposit_id`),
  ADD KEY `idx_created_at_for_report` (`created_at`,`payment_status`),
  ADD KEY `idx_po_email_sent` (`po_email_sent`);

--
-- Indexes for table `bookings_voucher`
--
ALTER TABLE `bookings_voucher`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `reference_number` (`reference_number`),
  ADD KEY `idx_customer_id` (`customer_id`),
  ADD KEY `idx_information_id` (`information_id`),
  ADD KEY `idx_service_type` (`service_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_payment_status` (`payment_status`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_issue_date` (`issue_date`),
  ADD KEY `fk_voucher_created_by` (`created_by`),
  ADD KEY `fk_voucher_updated_by` (`updated_by`),
  ADD KEY `fk_voucher_cancelled_by` (`cancelled_by`),
  ADD KEY `idx_vc_number` (`vc_number`),
  ADD KEY `idx_created_at_for_report` (`created_at`,`payment_status`);

--
-- Indexes for table `city`
--
ALTER TABLE `city`
  ADD PRIMARY KEY (`city_id`),
  ADD UNIQUE KEY `city_code` (`city_code`),
  ADD KEY `idx_city_code` (`city_code`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_code` (`code`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_active` (`active`),
  ADD KEY `idx_customers_name_code` (`name`,`code`);

--
-- Indexes for table `delete_log`
--
ALTER TABLE `delete_log`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `deposit_additional_info`
--
ALTER TABLE `deposit_additional_info`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bookings_deposit_id` (`bookings_deposit_id`);

--
-- Indexes for table `deposit_details`
--
ALTER TABLE `deposit_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bookings_deposit_id` (`bookings_deposit_id`);

--
-- Indexes for table `deposit_extras`
--
ALTER TABLE `deposit_extras`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_deposit_id` (`bookings_deposit_id`);

--
-- Indexes for table `deposit_pricing`
--
ALTER TABLE `deposit_pricing`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bookings_deposit_id` (`bookings_deposit_id`);

--
-- Indexes for table `deposit_routes`
--
ALTER TABLE `deposit_routes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_deposit_id` (`bookings_deposit_id`),
  ADD KEY `idx_origin_destination` (`origin`,`destination`),
  ADD KEY `idx_date` (`date`);

--
-- Indexes for table `deposit_terms`
--
ALTER TABLE `deposit_terms`
  ADD PRIMARY KEY (`id`),
  ADD KEY `bookings_deposit_id` (`bookings_deposit_id`);

--
-- Indexes for table `information`
--
ALTER TABLE `information`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_code` (`code`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_active` (`active`),
  ADD KEY `idx_information_category_active` (`category`,`active`),
  ADD KEY `idx_is_domestic` (`is_domestic`);

--
-- Indexes for table `other_additional_info`
--
ALTER TABLE `other_additional_info`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_other_id` (`bookings_other_id`);

--
-- Indexes for table `other_details`
--
ALTER TABLE `other_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_other_id` (`bookings_other_id`),
  ADD KEY `idx_service_date` (`service_date`);

--
-- Indexes for table `other_passengers`
--
ALTER TABLE `other_passengers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_other_id` (`bookings_other_id`),
  ADD KEY `idx_passenger_name` (`passenger_name`),
  ADD KEY `idx_passenger_type` (`passenger_type`);

--
-- Indexes for table `other_pricing`
--
ALTER TABLE `other_pricing`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_other_id` (`bookings_other_id`);

--
-- Indexes for table `payment_tracking`
--
ALTER TABLE `payment_tracking`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_booking_type_id` (`booking_type`,`booking_id`),
  ADD KEY `idx_reference_number` (`reference_number`),
  ADD KEY `idx_payment_status` (`payment_status`),
  ADD KEY `idx_created_by` (`created_by`),
  ADD KEY `idx_updated_by` (`updated_by`),
  ADD KEY `idx_booking_lookup` (`booking_type`,`booking_id`),
  ADD KEY `idx_payment_date` (`payment_date`),
  ADD KEY `idx_payment_method` (`payment_method`),
  ADD KEY `idx_bank_name` (`bank_name`);

--
-- Indexes for table `tickets_detail`
--
ALTER TABLE `tickets_detail`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_ticket_id` (`bookings_ticket_id`),
  ADD KEY `idx_issue_date` (`issue_date`),
  ADD KEY `idx_due_date` (`due_date`);

--
-- Indexes for table `tickets_extras`
--
ALTER TABLE `tickets_extras`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_ticket_id` (`bookings_ticket_id`);

--
-- Indexes for table `tickets_passengers`
--
ALTER TABLE `tickets_passengers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_ticket_id` (`bookings_ticket_id`),
  ADD KEY `idx_passenger_name` (`passenger_name`),
  ADD KEY `idx_ticket_code` (`ticket_code`),
  ADD KEY `idx_passengers_name_ticket` (`passenger_name`,`ticket_code`);

--
-- Indexes for table `tickets_pricing`
--
ALTER TABLE `tickets_pricing`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_ticket_id` (`bookings_ticket_id`);

--
-- Indexes for table `tickets_routes`
--
ALTER TABLE `tickets_routes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_ticket_id` (`bookings_ticket_id`),
  ADD KEY `idx_origin_destination` (`origin`,`destination`),
  ADD KEY `idx_date` (`date`),
  ADD KEY `idx_routes_origin_dest_date` (`origin`,`destination`,`date`);

--
-- Indexes for table `ticket_additional_info`
--
ALTER TABLE `ticket_additional_info`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_ticket_id` (`bookings_ticket_id`),
  ADD KEY `idx_ticket_type` (`ticket_type`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_active` (`active`);

--
-- Indexes for table `voucher_additional_info`
--
ALTER TABLE `voucher_additional_info`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_voucher_id` (`bookings_voucher_id`);

--
-- Indexes for table `voucher_details`
--
ALTER TABLE `voucher_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_voucher_id` (`bookings_voucher_id`),
  ADD KEY `idx_trip_date` (`trip_date`);

--
-- Indexes for table `voucher_passengers`
--
ALTER TABLE `voucher_passengers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_voucher_id` (`bookings_voucher_id`),
  ADD KEY `idx_passenger_name` (`passenger_name`),
  ADD KEY `idx_passenger_type` (`passenger_type`);

--
-- Indexes for table `voucher_pricing`
--
ALTER TABLE `voucher_pricing`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bookings_voucher_id` (`bookings_voucher_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookings_deposit`
--
ALTER TABLE `bookings_deposit`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bookings_other`
--
ALTER TABLE `bookings_other`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bookings_ticket`
--
ALTER TABLE `bookings_ticket`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bookings_voucher`
--
ALTER TABLE `bookings_voucher`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `city`
--
ALTER TABLE `city`
  MODIFY `city_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสเมือง (Primary Key)';

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `delete_log`
--
ALTER TABLE `delete_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deposit_additional_info`
--
ALTER TABLE `deposit_additional_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deposit_details`
--
ALTER TABLE `deposit_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deposit_extras`
--
ALTER TABLE `deposit_extras`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deposit_pricing`
--
ALTER TABLE `deposit_pricing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deposit_routes`
--
ALTER TABLE `deposit_routes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deposit_terms`
--
ALTER TABLE `deposit_terms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `information`
--
ALTER TABLE `information`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `other_additional_info`
--
ALTER TABLE `other_additional_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `other_details`
--
ALTER TABLE `other_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `other_passengers`
--
ALTER TABLE `other_passengers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `other_pricing`
--
ALTER TABLE `other_pricing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_tracking`
--
ALTER TABLE `payment_tracking`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tickets_detail`
--
ALTER TABLE `tickets_detail`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tickets_extras`
--
ALTER TABLE `tickets_extras`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tickets_passengers`
--
ALTER TABLE `tickets_passengers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tickets_pricing`
--
ALTER TABLE `tickets_pricing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tickets_routes`
--
ALTER TABLE `tickets_routes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ticket_additional_info`
--
ALTER TABLE `ticket_additional_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `voucher_additional_info`
--
ALTER TABLE `voucher_additional_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `voucher_details`
--
ALTER TABLE `voucher_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `voucher_passengers`
--
ALTER TABLE `voucher_passengers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `voucher_pricing`
--
ALTER TABLE `voucher_pricing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------

--
-- Structure for view `view_daily_report_all`
--
DROP TABLE IF EXISTS `view_daily_report_all`;

CREATE ALGORITHM=UNDEFINED DEFINER=`samui_booking`@`%` SQL SECURITY DEFINER VIEW `view_daily_report_all`  AS SELECT `view_daily_report_flight`.`booking_type` AS `booking_type`, `view_daily_report_flight`.`booking_id` AS `booking_id`, `view_daily_report_flight`.`create_date` AS `create_date`, `view_daily_report_flight`.`created_at` AS `created_at`, `view_daily_report_flight`.`booking_ref_no` AS `booking_ref_no`, `view_daily_report_flight`.`customer_name` AS `customer_name`, `view_daily_report_flight`.`customer_code` AS `customer_code`, `view_daily_report_flight`.`supplier_name` AS `supplier_name`, `view_daily_report_flight`.`supplier_code` AS `supplier_code`, `view_daily_report_flight`.`pax_name` AS `pax_name`, `view_daily_report_flight`.`pax_count` AS `pax_count`, `view_daily_report_flight`.`routing_detail` AS `routing_detail`, `view_daily_report_flight`.`booking_code` AS `booking_code`, `view_daily_report_flight`.`adult_net_price` AS `adult_net_price`, `view_daily_report_flight`.`adult_sale_price` AS `adult_sale_price`, `view_daily_report_flight`.`adult_pax` AS `adult_pax`, `view_daily_report_flight`.`child_net_price` AS `child_net_price`, `view_daily_report_flight`.`child_sale_price` AS `child_sale_price`, `view_daily_report_flight`.`child_pax` AS `child_pax`, `view_daily_report_flight`.`infant_net_price` AS `infant_net_price`, `view_daily_report_flight`.`infant_sale_price` AS `infant_sale_price`, `view_daily_report_flight`.`infant_pax` AS `infant_pax`, `view_daily_report_flight`.`extras_net_total` AS `extras_net_total`, `view_daily_report_flight`.`extras_sale_total` AS `extras_sale_total`, `view_daily_report_flight`.`total_price` AS `total_price`, `view_daily_report_flight`.`payment_status` AS `payment_status`, `view_daily_report_flight`.`payment_method` AS `payment_method`, `view_daily_report_flight`.`bank_name` AS `bank_name`, `view_daily_report_flight`.`account_number` AS `account_number`, `view_daily_report_flight`.`ticket_type` AS `ticket_type`, `view_daily_report_flight`.`ticket_numbers` AS `ticket_numbers` FROM `view_daily_report_flight`union all select `view_daily_report_voucher`.`booking_type` AS `booking_type`,`view_daily_report_voucher`.`booking_id` AS `booking_id`,`view_daily_report_voucher`.`create_date` AS `create_date`,`view_daily_report_voucher`.`created_at` AS `created_at`,`view_daily_report_voucher`.`booking_ref_no` AS `booking_ref_no`,`view_daily_report_voucher`.`customer_name` AS `customer_name`,`view_daily_report_voucher`.`customer_code` AS `customer_code`,`view_daily_report_voucher`.`supplier_name` AS `supplier_name`,`view_daily_report_voucher`.`supplier_code` AS `supplier_code`,`view_daily_report_voucher`.`pax_name` AS `pax_name`,`view_daily_report_voucher`.`pax_count` AS `pax_count`,`view_daily_report_voucher`.`routing_detail` AS `routing_detail`,`view_daily_report_voucher`.`booking_code` AS `booking_code`,`view_daily_report_voucher`.`adult_net_price` AS `adult_net_price`,`view_daily_report_voucher`.`adult_sale_price` AS `adult_sale_price`,`view_daily_report_voucher`.`adult_pax` AS `adult_pax`,`view_daily_report_voucher`.`child_net_price` AS `child_net_price`,`view_daily_report_voucher`.`child_sale_price` AS `child_sale_price`,`view_daily_report_voucher`.`child_pax` AS `child_pax`,`view_daily_report_voucher`.`infant_net_price` AS `infant_net_price`,`view_daily_report_voucher`.`infant_sale_price` AS `infant_sale_price`,`view_daily_report_voucher`.`infant_pax` AS `infant_pax`,`view_daily_report_voucher`.`extras_net_total` AS `extras_net_total`,`view_daily_report_voucher`.`extras_sale_total` AS `extras_sale_total`,`view_daily_report_voucher`.`total_price` AS `total_price`,`view_daily_report_voucher`.`payment_status` AS `payment_status`,`view_daily_report_voucher`.`payment_method` AS `payment_method`,`view_daily_report_voucher`.`bank_name` AS `bank_name`,`view_daily_report_voucher`.`account_number` AS `account_number`,`view_daily_report_voucher`.`ticket_type` AS `ticket_type`,`view_daily_report_voucher`.`ticket_numbers` AS `ticket_numbers` from `view_daily_report_voucher` union all select `view_daily_report_other`.`booking_type` AS `booking_type`,`view_daily_report_other`.`booking_id` AS `booking_id`,`view_daily_report_other`.`create_date` AS `create_date`,`view_daily_report_other`.`created_at` AS `created_at`,`view_daily_report_other`.`booking_ref_no` AS `booking_ref_no`,`view_daily_report_other`.`customer_name` AS `customer_name`,`view_daily_report_other`.`customer_code` AS `customer_code`,`view_daily_report_other`.`supplier_name` AS `supplier_name`,`view_daily_report_other`.`supplier_code` AS `supplier_code`,`view_daily_report_other`.`pax_name` AS `pax_name`,`view_daily_report_other`.`pax_count` AS `pax_count`,`view_daily_report_other`.`routing_detail` AS `routing_detail`,`view_daily_report_other`.`booking_code` AS `booking_code`,`view_daily_report_other`.`adult_net_price` AS `adult_net_price`,`view_daily_report_other`.`adult_sale_price` AS `adult_sale_price`,`view_daily_report_other`.`adult_pax` AS `adult_pax`,`view_daily_report_other`.`child_net_price` AS `child_net_price`,`view_daily_report_other`.`child_sale_price` AS `child_sale_price`,`view_daily_report_other`.`child_pax` AS `child_pax`,`view_daily_report_other`.`infant_net_price` AS `infant_net_price`,`view_daily_report_other`.`infant_sale_price` AS `infant_sale_price`,`view_daily_report_other`.`infant_pax` AS `infant_pax`,`view_daily_report_other`.`extras_net_total` AS `extras_net_total`,`view_daily_report_other`.`extras_sale_total` AS `extras_sale_total`,`view_daily_report_other`.`total_price` AS `total_price`,`view_daily_report_other`.`payment_status` AS `payment_status`,`view_daily_report_other`.`payment_method` AS `payment_method`,`view_daily_report_other`.`bank_name` AS `bank_name`,`view_daily_report_other`.`account_number` AS `account_number`,`view_daily_report_other`.`ticket_type` AS `ticket_type`,`view_daily_report_other`.`ticket_numbers` AS `ticket_numbers` from `view_daily_report_other` union all select `view_daily_report_deposit`.`booking_type` AS `booking_type`,`view_daily_report_deposit`.`booking_id` AS `booking_id`,`view_daily_report_deposit`.`create_date` AS `create_date`,`view_daily_report_deposit`.`created_at` AS `created_at`,`view_daily_report_deposit`.`booking_ref_no` AS `booking_ref_no`,`view_daily_report_deposit`.`customer_name` AS `customer_name`,`view_daily_report_deposit`.`customer_code` AS `customer_code`,`view_daily_report_deposit`.`supplier_name` AS `supplier_name`,`view_daily_report_deposit`.`supplier_code` AS `supplier_code`,`view_daily_report_deposit`.`pax_name` AS `pax_name`,`view_daily_report_deposit`.`pax_count` AS `pax_count`,`view_daily_report_deposit`.`routing_detail` AS `routing_detail`,`view_daily_report_deposit`.`booking_code` AS `booking_code`,`view_daily_report_deposit`.`adult_net_price` AS `adult_net_price`,`view_daily_report_deposit`.`adult_sale_price` AS `adult_sale_price`,`view_daily_report_deposit`.`adult_pax` AS `adult_pax`,`view_daily_report_deposit`.`child_net_price` AS `child_net_price`,`view_daily_report_deposit`.`child_sale_price` AS `child_sale_price`,`view_daily_report_deposit`.`child_pax` AS `child_pax`,`view_daily_report_deposit`.`infant_net_price` AS `infant_net_price`,`view_daily_report_deposit`.`infant_sale_price` AS `infant_sale_price`,`view_daily_report_deposit`.`infant_pax` AS `infant_pax`,`view_daily_report_deposit`.`extras_net_total` AS `extras_net_total`,`view_daily_report_deposit`.`extras_sale_total` AS `extras_sale_total`,`view_daily_report_deposit`.`total_price` AS `total_price`,`view_daily_report_deposit`.`payment_status` AS `payment_status`,`view_daily_report_deposit`.`payment_method` AS `payment_method`,`view_daily_report_deposit`.`bank_name` AS `bank_name`,`view_daily_report_deposit`.`account_number` AS `account_number`,`view_daily_report_deposit`.`ticket_type` AS `ticket_type`,`view_daily_report_deposit`.`ticket_numbers` AS `ticket_numbers` from `view_daily_report_deposit`  ;

-- --------------------------------------------------------

--
-- Structure for view `view_daily_report_deposit`
--
DROP TABLE IF EXISTS `view_daily_report_deposit`;

CREATE ALGORITHM=UNDEFINED DEFINER=`samui_booking`@`%` SQL SECURITY DEFINER VIEW `view_daily_report_deposit`  AS SELECT 'Deposit' AS `booking_type`, `bd`.`id` AS `booking_id`, cast(`bd`.`created_at` as date) AS `create_date`, `bd`.`created_at` AS `created_at`, `bd`.`reference_number` AS `booking_ref_no`, `c`.`name` AS `customer_name`, `c`.`code` AS `customer_code`, `i`.`name` AS `supplier_name`, `i`.`code` AS `supplier_code`, `bd`.`group_name` AS `pax_name`, coalesce((select `deposit_pricing`.`adult_pax` + `deposit_pricing`.`child_pax` + `deposit_pricing`.`infant_pax` from `deposit_pricing` where `deposit_pricing`.`bookings_deposit_id` = `bd`.`id` limit 1),0) AS `pax_count`, (select `deposit_details`.`description` from `deposit_details` where `deposit_details`.`bookings_deposit_id` = `bd`.`id` limit 1) AS `routing_detail`, coalesce((select `deposit_additional_info`.`code` from `deposit_additional_info` where `deposit_additional_info`.`bookings_deposit_id` = `bd`.`id` limit 1),'') AS `booking_code`, coalesce((select `deposit_pricing`.`adult_net_price` from `deposit_pricing` where `deposit_pricing`.`bookings_deposit_id` = `bd`.`id` limit 1),0.00) AS `adult_net_price`, coalesce((select `deposit_pricing`.`adult_sale_price` from `deposit_pricing` where `deposit_pricing`.`bookings_deposit_id` = `bd`.`id` limit 1),0.00) AS `adult_sale_price`, coalesce((select `deposit_pricing`.`adult_pax` from `deposit_pricing` where `deposit_pricing`.`bookings_deposit_id` = `bd`.`id` limit 1),0) AS `adult_pax`, coalesce((select `deposit_pricing`.`child_net_price` from `deposit_pricing` where `deposit_pricing`.`bookings_deposit_id` = `bd`.`id` limit 1),0.00) AS `child_net_price`, coalesce((select `deposit_pricing`.`child_sale_price` from `deposit_pricing` where `deposit_pricing`.`bookings_deposit_id` = `bd`.`id` limit 1),0.00) AS `child_sale_price`, coalesce((select `deposit_pricing`.`child_pax` from `deposit_pricing` where `deposit_pricing`.`bookings_deposit_id` = `bd`.`id` limit 1),0) AS `child_pax`, coalesce((select `deposit_pricing`.`infant_net_price` from `deposit_pricing` where `deposit_pricing`.`bookings_deposit_id` = `bd`.`id` limit 1),0.00) AS `infant_net_price`, coalesce((select `deposit_pricing`.`infant_sale_price` from `deposit_pricing` where `deposit_pricing`.`bookings_deposit_id` = `bd`.`id` limit 1),0.00) AS `infant_sale_price`, coalesce((select `deposit_pricing`.`infant_pax` from `deposit_pricing` where `deposit_pricing`.`bookings_deposit_id` = `bd`.`id` limit 1),0) AS `infant_pax`, coalesce((select sum(`deposit_extras`.`net_price` * `deposit_extras`.`quantity`) from `deposit_extras` where `deposit_extras`.`bookings_deposit_id` = `bd`.`id`),0.00) AS `extras_net_total`, coalesce((select sum(`deposit_extras`.`sale_price` * `deposit_extras`.`quantity`) from `deposit_extras` where `deposit_extras`.`bookings_deposit_id` = `bd`.`id`),0.00) AS `extras_sale_total`, coalesce((select `deposit_details`.`grand_total` from `deposit_details` where `deposit_details`.`bookings_deposit_id` = `bd`.`id` limit 1),0.00) AS `total_price`, `bd`.`payment_status` AS `payment_status`, (select `payment_tracking`.`payment_method` from `payment_tracking` where `payment_tracking`.`booking_type` = 'deposit' and `payment_tracking`.`booking_id` = `bd`.`id` limit 1) AS `payment_method`, (select `payment_tracking`.`bank_name` from `payment_tracking` where `payment_tracking`.`booking_type` = 'deposit' and `payment_tracking`.`booking_id` = `bd`.`id` limit 1) AS `bank_name`, (select `payment_tracking`.`account_number` from `payment_tracking` where `payment_tracking`.`booking_type` = 'deposit' and `payment_tracking`.`booking_id` = `bd`.`id` limit 1) AS `account_number`, '' AS `ticket_type`, '' AS `ticket_numbers` FROM ((`bookings_deposit` `bd` left join `customers` `c` on(`bd`.`customer_id` = `c`.`id`)) left join `information` `i` on(`bd`.`supplier_id` = `i`.`id`)) WHERE `bd`.`status` <> 'cancelled' ;

-- --------------------------------------------------------

--
-- Structure for view `view_daily_report_flight`
--
DROP TABLE IF EXISTS `view_daily_report_flight`;

CREATE ALGORITHM=UNDEFINED DEFINER=`samui_booking`@`%` SQL SECURITY DEFINER VIEW `view_daily_report_flight`  AS SELECT 'Flight' AS `booking_type`, `bt`.`id` AS `booking_id`, cast(`bt`.`created_at` as date) AS `create_date`, `bt`.`created_at` AS `created_at`, `bt`.`po_number` AS `booking_ref_no`, `c`.`name` AS `customer_name`, `c`.`code` AS `customer_code`, `i`.`name` AS `supplier_name`, `i`.`code` AS `supplier_code`, (select `tickets_passengers`.`passenger_name` from `tickets_passengers` where `tickets_passengers`.`bookings_ticket_id` = `bt`.`id` order by `tickets_passengers`.`id` limit 1) AS `pax_name`, coalesce((select `tickets_pricing`.`adult_pax` + `tickets_pricing`.`child_pax` + `tickets_pricing`.`infant_pax` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0) AS `pax_count`, (select group_concat(concat(`tickets_routes`.`origin`,'-',`tickets_routes`.`destination`) order by `tickets_routes`.`id` ASC separator ' - ') from `tickets_routes` where `tickets_routes`.`bookings_ticket_id` = `bt`.`id`) AS `routing_detail`, coalesce((select `ticket_additional_info`.`code` from `ticket_additional_info` where `ticket_additional_info`.`bookings_ticket_id` = `bt`.`id` limit 1),'') AS `booking_code`, coalesce((select `tickets_pricing`.`adult_net_price` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0.00) AS `adult_net_price`, coalesce((select `tickets_pricing`.`adult_sale_price` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0.00) AS `adult_sale_price`, coalesce((select `tickets_pricing`.`adult_pax` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0) AS `adult_pax`, coalesce((select `tickets_pricing`.`child_net_price` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0.00) AS `child_net_price`, coalesce((select `tickets_pricing`.`child_sale_price` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0.00) AS `child_sale_price`, coalesce((select `tickets_pricing`.`child_pax` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0) AS `child_pax`, coalesce((select `tickets_pricing`.`infant_net_price` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0.00) AS `infant_net_price`, coalesce((select `tickets_pricing`.`infant_sale_price` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0.00) AS `infant_sale_price`, coalesce((select `tickets_pricing`.`infant_pax` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0) AS `infant_pax`, coalesce((select sum(`tickets_extras`.`net_price` * `tickets_extras`.`quantity`) from `tickets_extras` where `tickets_extras`.`bookings_ticket_id` = `bt`.`id`),0.00) AS `extras_net_total`, coalesce((select sum(`tickets_extras`.`sale_price` * `tickets_extras`.`quantity`) from `tickets_extras` where `tickets_extras`.`bookings_ticket_id` = `bt`.`id`),0.00) AS `extras_sale_total`, coalesce((select `tickets_detail`.`grand_total` from `tickets_detail` where `tickets_detail`.`bookings_ticket_id` = `bt`.`id` limit 1),0.00) AS `total_price`, `bt`.`payment_status` AS `payment_status`, (select `payment_tracking`.`payment_method` from `payment_tracking` where `payment_tracking`.`booking_type` = 'flight' and `payment_tracking`.`booking_id` = `bt`.`id` limit 1) AS `payment_method`, (select `payment_tracking`.`bank_name` from `payment_tracking` where `payment_tracking`.`booking_type` = 'flight' and `payment_tracking`.`booking_id` = `bt`.`id` limit 1) AS `bank_name`, (select `payment_tracking`.`account_number` from `payment_tracking` where `payment_tracking`.`booking_type` = 'flight' and `payment_tracking`.`booking_id` = `bt`.`id` limit 1) AS `account_number`, coalesce((select `ticket_additional_info`.`ticket_type` from `ticket_additional_info` where `ticket_additional_info`.`bookings_ticket_id` = `bt`.`id` limit 1),'') AS `ticket_type`, coalesce((select group_concat(`tickets_passengers`.`ticket_number` separator ', ') from `tickets_passengers` where `tickets_passengers`.`bookings_ticket_id` = `bt`.`id`),'') AS `ticket_numbers` FROM ((`bookings_ticket` `bt` left join `customers` `c` on(`bt`.`customer_id` = `c`.`id`)) left join `information` `i` on(`bt`.`information_id` = `i`.`id`)) WHERE `bt`.`status` <> 'cancelled' AND `bt`.`po_number` is not null AND `bt`.`po_number` <> '' ;

-- --------------------------------------------------------

--
-- Structure for view `view_daily_report_other`
--
DROP TABLE IF EXISTS `view_daily_report_other`;

CREATE ALGORITHM=UNDEFINED DEFINER=`samui_booking`@`%` SQL SECURITY DEFINER VIEW `view_daily_report_other`  AS SELECT concat('Other-',ucase(`bo`.`service_type`)) AS `booking_type`, `bo`.`id` AS `booking_id`, cast(`bo`.`created_at` as date) AS `create_date`, `bo`.`created_at` AS `created_at`, `bo`.`reference_number` AS `booking_ref_no`, `c`.`name` AS `customer_name`, `c`.`code` AS `customer_code`, `i`.`name` AS `supplier_name`, `i`.`code` AS `supplier_code`, (select `other_passengers`.`passenger_name` from `other_passengers` where `other_passengers`.`bookings_other_id` = `bo`.`id` order by `other_passengers`.`id` limit 1) AS `pax_name`, coalesce((select `other_pricing`.`adult_pax` + `other_pricing`.`child_pax` + `other_pricing`.`infant_pax` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0) AS `pax_count`, (select `other_details`.`description` from `other_details` where `other_details`.`bookings_other_id` = `bo`.`id` limit 1) AS `routing_detail`, coalesce((select `other_additional_info`.`code` from `other_additional_info` where `other_additional_info`.`bookings_other_id` = `bo`.`id` limit 1),'') AS `booking_code`, coalesce((select `other_pricing`.`adult_net_price` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0.00) AS `adult_net_price`, coalesce((select `other_pricing`.`adult_sale_price` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0.00) AS `adult_sale_price`, coalesce((select `other_pricing`.`adult_pax` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0) AS `adult_pax`, coalesce((select `other_pricing`.`child_net_price` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0.00) AS `child_net_price`, coalesce((select `other_pricing`.`child_sale_price` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0.00) AS `child_sale_price`, coalesce((select `other_pricing`.`child_pax` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0) AS `child_pax`, coalesce((select `other_pricing`.`infant_net_price` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0.00) AS `infant_net_price`, coalesce((select `other_pricing`.`infant_sale_price` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0.00) AS `infant_sale_price`, coalesce((select `other_pricing`.`infant_pax` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0) AS `infant_pax`, 0.00 AS `extras_net_total`, 0.00 AS `extras_sale_total`, coalesce((select `other_details`.`grand_total` from `other_details` where `other_details`.`bookings_other_id` = `bo`.`id` limit 1),0.00) AS `total_price`, `bo`.`payment_status` AS `payment_status`, (select `payment_tracking`.`payment_method` from `payment_tracking` where `payment_tracking`.`booking_type` = 'other' and `payment_tracking`.`booking_id` = `bo`.`id` limit 1) AS `payment_method`, (select `payment_tracking`.`bank_name` from `payment_tracking` where `payment_tracking`.`booking_type` = 'other' and `payment_tracking`.`booking_id` = `bo`.`id` limit 1) AS `bank_name`, (select `payment_tracking`.`account_number` from `payment_tracking` where `payment_tracking`.`booking_type` = 'other' and `payment_tracking`.`booking_id` = `bo`.`id` limit 1) AS `account_number`, '' AS `ticket_type`, '' AS `ticket_numbers` FROM ((`bookings_other` `bo` left join `customers` `c` on(`bo`.`customer_id` = `c`.`id`)) left join `information` `i` on(`bo`.`information_id` = `i`.`id`)) WHERE `bo`.`status` <> 'cancelled' ;

-- --------------------------------------------------------

--
-- Structure for view `view_daily_report_voucher`
--
DROP TABLE IF EXISTS `view_daily_report_voucher`;

CREATE ALGORITHM=UNDEFINED DEFINER=`samui_booking`@`%` SQL SECURITY DEFINER VIEW `view_daily_report_voucher`  AS SELECT concat('Voucher-',ucase(`bv`.`service_type`)) AS `booking_type`, `bv`.`id` AS `booking_id`, cast(`bv`.`created_at` as date) AS `create_date`, `bv`.`created_at` AS `created_at`, `bv`.`vc_number` AS `booking_ref_no`, `c`.`name` AS `customer_name`, `c`.`code` AS `customer_code`, `i`.`name` AS `supplier_name`, `i`.`code` AS `supplier_code`, (select `voucher_passengers`.`passenger_name` from `voucher_passengers` where `voucher_passengers`.`bookings_voucher_id` = `bv`.`id` order by `voucher_passengers`.`id` limit 1) AS `pax_name`, coalesce((select `voucher_pricing`.`adult_pax` + `voucher_pricing`.`child_pax` + `voucher_pricing`.`infant_pax` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0) AS `pax_count`, (select `voucher_details`.`description` from `voucher_details` where `voucher_details`.`bookings_voucher_id` = `bv`.`id` limit 1) AS `routing_detail`, coalesce((select `voucher_details`.`reference` from `voucher_details` where `voucher_details`.`bookings_voucher_id` = `bv`.`id` limit 1),'') AS `booking_code`, coalesce((select `voucher_pricing`.`adult_net_price` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0.00) AS `adult_net_price`, coalesce((select `voucher_pricing`.`adult_sale_price` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0.00) AS `adult_sale_price`, coalesce((select `voucher_pricing`.`adult_pax` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0) AS `adult_pax`, coalesce((select `voucher_pricing`.`child_net_price` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0.00) AS `child_net_price`, coalesce((select `voucher_pricing`.`child_sale_price` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0.00) AS `child_sale_price`, coalesce((select `voucher_pricing`.`child_pax` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0) AS `child_pax`, coalesce((select `voucher_pricing`.`infant_net_price` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0.00) AS `infant_net_price`, coalesce((select `voucher_pricing`.`infant_sale_price` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0.00) AS `infant_sale_price`, coalesce((select `voucher_pricing`.`infant_pax` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0) AS `infant_pax`, 0.00 AS `extras_net_total`, 0.00 AS `extras_sale_total`, coalesce((select `voucher_details`.`grand_total` from `voucher_details` where `voucher_details`.`bookings_voucher_id` = `bv`.`id` limit 1),0.00) AS `total_price`, `bv`.`payment_status` AS `payment_status`, (select `payment_tracking`.`payment_method` from `payment_tracking` where `payment_tracking`.`booking_type` = 'voucher' and `payment_tracking`.`booking_id` = `bv`.`id` limit 1) AS `payment_method`, (select `payment_tracking`.`bank_name` from `payment_tracking` where `payment_tracking`.`booking_type` = 'voucher' and `payment_tracking`.`booking_id` = `bv`.`id` limit 1) AS `bank_name`, (select `payment_tracking`.`account_number` from `payment_tracking` where `payment_tracking`.`booking_type` = 'voucher' and `payment_tracking`.`booking_id` = `bv`.`id` limit 1) AS `account_number`, '' AS `ticket_type`, '' AS `ticket_numbers` FROM ((`bookings_voucher` `bv` left join `customers` `c` on(`bv`.`customer_id` = `c`.`id`)) left join `information` `i` on(`bv`.`information_id` = `i`.`id`)) WHERE `bv`.`status` <> 'cancelled' ;

-- --------------------------------------------------------

--
-- Structure for view `v_booking_summary`
--
DROP TABLE IF EXISTS `v_booking_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`samui_booking`@`%` SQL SECURITY DEFINER VIEW `v_booking_summary`  AS SELECT `bt`.`id` AS `id`, `bt`.`reference_number` AS `reference_number`, `bt`.`status` AS `status`, `bt`.`payment_status` AS `payment_status`, `bt`.`created_at` AS `created_at`, `c`.`name` AS `customer_name`, `c`.`code` AS `customer_code`, `i`.`name` AS `supplier_name`, `i`.`code` AS `supplier_code`, `td`.`grand_total` AS `grand_total`, `td`.`issue_date` AS `issue_date`, `td`.`due_date` AS `due_date`, `bt`.`po_number` AS `po_number`, `bt`.`po_generated_at` AS `po_generated_at`, `bt`.`rc_number` AS `rc_number`, `bt`.`rc_generated_at` AS `rc_generated_at`, `u`.`fullname` AS `created_by_name` FROM ((((`bookings_ticket` `bt` left join `customers` `c` on(`bt`.`customer_id` = `c`.`id`)) left join `information` `i` on(`bt`.`information_id` = `i`.`id`)) left join `tickets_detail` `td` on(`bt`.`id` = `td`.`bookings_ticket_id`)) left join `users` `u` on(`bt`.`created_by` = `u`.`id`)) ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings_deposit`
--
ALTER TABLE `bookings_deposit`
  ADD CONSTRAINT `bookings_deposit_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  ADD CONSTRAINT `bookings_deposit_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `information` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `bookings_deposit_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `bookings_deposit_ibfk_4` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `bookings_deposit_ibfk_5` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `bookings_other`
--
ALTER TABLE `bookings_other`
  ADD CONSTRAINT `fk_other_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_other_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_other_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_other_information` FOREIGN KEY (`information_id`) REFERENCES `information` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_other_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `bookings_ticket`
--
ALTER TABLE `bookings_ticket`
  ADD CONSTRAINT `fk_bookings_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bookings_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bookings_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bookings_information` FOREIGN KEY (`information_id`) REFERENCES `information` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_bookings_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `bookings_voucher`
--
ALTER TABLE `bookings_voucher`
  ADD CONSTRAINT `fk_voucher_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_voucher_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_voucher_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_voucher_information` FOREIGN KEY (`information_id`) REFERENCES `information` (`id`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_voucher_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `deposit_additional_info`
--
ALTER TABLE `deposit_additional_info`
  ADD CONSTRAINT `deposit_additional_info_ibfk_1` FOREIGN KEY (`bookings_deposit_id`) REFERENCES `bookings_deposit` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `deposit_details`
--
ALTER TABLE `deposit_details`
  ADD CONSTRAINT `deposit_details_ibfk_1` FOREIGN KEY (`bookings_deposit_id`) REFERENCES `bookings_deposit` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `deposit_extras`
--
ALTER TABLE `deposit_extras`
  ADD CONSTRAINT `fk_deposit_extras_booking` FOREIGN KEY (`bookings_deposit_id`) REFERENCES `bookings_deposit` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `deposit_pricing`
--
ALTER TABLE `deposit_pricing`
  ADD CONSTRAINT `deposit_pricing_ibfk_1` FOREIGN KEY (`bookings_deposit_id`) REFERENCES `bookings_deposit` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `deposit_routes`
--
ALTER TABLE `deposit_routes`
  ADD CONSTRAINT `fk_deposit_routes_booking` FOREIGN KEY (`bookings_deposit_id`) REFERENCES `bookings_deposit` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `deposit_terms`
--
ALTER TABLE `deposit_terms`
  ADD CONSTRAINT `deposit_terms_ibfk_1` FOREIGN KEY (`bookings_deposit_id`) REFERENCES `bookings_deposit` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `other_additional_info`
--
ALTER TABLE `other_additional_info`
  ADD CONSTRAINT `fk_other_additional_info_booking` FOREIGN KEY (`bookings_other_id`) REFERENCES `bookings_other` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `other_details`
--
ALTER TABLE `other_details`
  ADD CONSTRAINT `fk_other_detail_booking` FOREIGN KEY (`bookings_other_id`) REFERENCES `bookings_other` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `other_passengers`
--
ALTER TABLE `other_passengers`
  ADD CONSTRAINT `fk_other_passenger_booking` FOREIGN KEY (`bookings_other_id`) REFERENCES `bookings_other` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `other_pricing`
--
ALTER TABLE `other_pricing`
  ADD CONSTRAINT `fk_other_pricing_booking` FOREIGN KEY (`bookings_other_id`) REFERENCES `bookings_other` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tickets_detail`
--
ALTER TABLE `tickets_detail`
  ADD CONSTRAINT `fk_detail_booking` FOREIGN KEY (`bookings_ticket_id`) REFERENCES `bookings_ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tickets_extras`
--
ALTER TABLE `tickets_extras`
  ADD CONSTRAINT `fk_extras_booking` FOREIGN KEY (`bookings_ticket_id`) REFERENCES `bookings_ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tickets_passengers`
--
ALTER TABLE `tickets_passengers`
  ADD CONSTRAINT `fk_passengers_booking` FOREIGN KEY (`bookings_ticket_id`) REFERENCES `bookings_ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tickets_pricing`
--
ALTER TABLE `tickets_pricing`
  ADD CONSTRAINT `fk_pricing_booking` FOREIGN KEY (`bookings_ticket_id`) REFERENCES `bookings_ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `tickets_routes`
--
ALTER TABLE `tickets_routes`
  ADD CONSTRAINT `fk_routes_booking` FOREIGN KEY (`bookings_ticket_id`) REFERENCES `bookings_ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `ticket_additional_info`
--
ALTER TABLE `ticket_additional_info`
  ADD CONSTRAINT `fk_additional_info_booking` FOREIGN KEY (`bookings_ticket_id`) REFERENCES `bookings_ticket` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `voucher_additional_info`
--
ALTER TABLE `voucher_additional_info`
  ADD CONSTRAINT `fk_voucher_additional_info_booking` FOREIGN KEY (`bookings_voucher_id`) REFERENCES `bookings_voucher` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `voucher_details`
--
ALTER TABLE `voucher_details`
  ADD CONSTRAINT `fk_voucher_detail_booking` FOREIGN KEY (`bookings_voucher_id`) REFERENCES `bookings_voucher` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `voucher_passengers`
--
ALTER TABLE `voucher_passengers`
  ADD CONSTRAINT `fk_voucher_passenger_booking` FOREIGN KEY (`bookings_voucher_id`) REFERENCES `bookings_voucher` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `voucher_pricing`
--
ALTER TABLE `voucher_pricing`
  ADD CONSTRAINT `fk_voucher_pricing_booking` FOREIGN KEY (`bookings_voucher_id`) REFERENCES `bookings_voucher` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
---- Migration: Merge Voucher suppliers into Other category (2026-01-09)--UPDATE `information`SET `category` = 'supplier-other', `type` = 'Other'WHERE `category` = 'supplier-voucher' AND `type` = 'Voucher';
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
