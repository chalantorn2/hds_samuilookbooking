-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Feb 11, 2026 at 09:13 AM
-- Server version: 10.11.14-MariaDB-0+deb12u2-log
-- PHP Version: 8.4.16

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `samui_hds`
--

DELIMITER $$
--
-- Procedures
--
$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `activity_logs`
--

CREATE TABLE `activity_logs` (
  `id` int(11) NOT NULL,
  `module` enum('deposit','ticket','voucher','other','invoice','receipt') NOT NULL COMMENT 'โมดูลที่ทำการกระทำ',
  `record_id` int(11) NOT NULL COMMENT 'ID ของรายการที่ถูกกระทำ',
  `reference_number` varchar(50) DEFAULT NULL COMMENT 'เลขอ้างอิงเอกสาร',
  `action` enum('create','update','cancel','issue','print','email') NOT NULL COMMENT 'ประเภทการกระทำ',
  `user_id` int(11) NOT NULL COMMENT 'ผู้ใช้ที่ทำการกระทำ',
  `details` text DEFAULT NULL COMMENT 'รายละเอียดเพิ่มเติม (JSON format)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'เวลาที่ทำการกระทำ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Activity log for tracking user actions';

--
-- Dumping data for table `activity_logs`
--

INSERT INTO `activity_logs` (`id`, `module`, `record_id`, `reference_number`, `action`, `user_id`, `details`, `created_at`) VALUES
(1, 'ticket', 1, 'FT-26-1-0001', 'create', 2, NULL, '2026-02-11 02:12:40');

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

--
-- Dumping data for table `bookings_ticket`
--

INSERT INTO `bookings_ticket` (`id`, `reference_number`, `customer_id`, `information_id`, `deposit_id`, `status`, `payment_status`, `created_at`, `updated_at`, `created_by`, `updated_by`, `cancelled_at`, `cancelled_by`, `cancel_reason`, `po_number`, `po_generated_at`, `invoice_number`, `invoice_generated_at`, `rc_number`, `rc_generated_at`, `rc_selection_data`, `customer_override_data`, `rc_email_sent`, `rc_email_sent_at`, `rc_linked_tickets`, `po_email_sent`, `po_email_sent_at`) VALUES
(1, 'FT-26-1-0001', 22, 13, NULL, 'invoiced', 'unpaid', '2026-02-11 02:12:40', '2026-02-11 02:12:42', 2, 2, NULL, NULL, NULL, NULL, NULL, 'INV260001', '2026-02-11 02:12:40', NULL, NULL, NULL, NULL, 0, NULL, NULL, 0, NULL);

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
-- Table structure for table `booking_payment_details`
--

CREATE TABLE `booking_payment_details` (
  `id` int(11) NOT NULL,
  `booking_type` enum('flight','voucher','other','deposit') NOT NULL,
  `booking_id` int(11) NOT NULL,
  `payment_group_id` varchar(50) DEFAULT NULL COMMENT 'Group ID สำหรับ PO ที่ link กัน',
  `payment_index` tinyint(4) NOT NULL COMMENT 'ครั้งที่ (0-4 for ครั้งที่ 1-5)',
  `payment_date` date DEFAULT NULL COMMENT 'วันที่รับชำระ',
  `amount` decimal(10,2) DEFAULT NULL COMMENT 'ยอดสุทธิ',
  `payment_method` enum('cash','transfer','credit_card','cheque','promptpay') NOT NULL DEFAULT 'cash',
  `bank_name` varchar(100) DEFAULT NULL COMMENT 'ธนาคาร (สำหรับ transfer)',
  `card_type` varchar(50) DEFAULT NULL COMMENT 'ชนิดบัตร (สำหรับ credit_card)',
  `note` text DEFAULT NULL COMMENT 'หมายเหตุ',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `name`, `code`, `email`, `address_line1`, `address_line2`, `address_line3`, `id_number`, `phone`, `branch_type`, `branch_number`, `credit_days`, `active`, `created_at`, `updated_at`) VALUES
(2, 'CHALANTORN', NULL, NULL, 'KRABI', NULL, NULL, '88888', NULL, 'Head Office', NULL, 0, 0, '2025-05-06 20:19:51', '2025-05-06 20:19:51'),
(3, 'TEST', NULL, NULL, 'TEST', NULL, NULL, 'TEST', NULL, 'Head Office', NULL, 0, 0, '2025-05-06 21:33:35', '2025-05-06 21:33:35'),
(4, 'TESTID', NULL, NULL, 'BKK', NULL, NULL, '89203651', NULL, 'Head Office', NULL, 0, 0, '2025-05-06 21:46:12', '2025-05-06 21:46:12'),
(5, 'TEST TIMEZONE', NULL, NULL, 'THANG', NULL, NULL, '8889536', NULL, 'Head Office', NULL, 0, 0, '2025-05-06 22:00:32', '2025-05-06 22:00:32'),
(6, 'TEST TIMEZONE', NULL, NULL, 'THANG', NULL, NULL, '8889536', NULL, 'Head Office', NULL, 0, 0, '2025-05-06 22:01:29', '2025-05-06 22:01:29'),
(7, 'TEST TIMEZONE', NULL, NULL, 'THANG', NULL, NULL, '8889536', NULL, 'Head Office', NULL, 0, 0, '2025-05-06 22:02:21', '2025-05-06 22:02:21'),
(8, 'TEST TIMEZONE', NULL, NULL, 'THANG', NULL, NULL, '8889536', NULL, 'Head Office', NULL, 0, 0, '2025-05-06 22:03:56', '2025-05-06 22:03:56'),
(9, 'ASIA TRAVEL INTERNATIONAL', 'ASIA', 'asiatravel_international@yahoo.com', '99/9 MOO 3 TAWEERATPAKDEE RD', 'ANGTHONG KOH SAMUI SURATTHANI 84140', NULL, '0010020030040', '077421185', 'Head Office', NULL, 7, 1, '2025-05-07 04:09:19', '2025-10-06 07:37:10'),
(12, 'CHALNTORN MANOP', 'MANOP', NULL, 'KRABI', NULL, NULL, '8888887', '0622439182', 'Branch', '010', 30, 1, '2025-05-07 09:07:06', '2025-06-12 09:16:41'),
(13, 'KITTIPHONG', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Head Office', NULL, 0, 0, '2025-05-07 09:08:00', '2025-05-07 09:08:00'),
(14, 'MY TRAVEL', NULL, NULL, 'KOH SAMUI SURATTHANI', NULL, NULL, NULL, NULL, 'Head Office', NULL, 0, 0, '2025-05-08 21:36:30', '2025-10-07 07:09:28'),
(15, 'นายสมชาย ใจดี', NULL, NULL, '123 หมู่ 4 ต.ตลาด อ.เมือง จ.สุราษฎร์ธานี 84000', NULL, NULL, '1234567890123', '081-234-5678', 'Head Office', NULL, 0, 1, '2025-05-09 00:43:47', '2025-06-12 09:16:41'),
(16, 'SEVENSMILE', NULL, NULL, 'KRABI', NULL, NULL, '81000', '0622439182', 'Branch', '007', 15, 1, '2025-05-16 04:42:35', '2025-06-12 09:16:41'),
(17, 'USER', NULL, NULL, 'TETST', NULL, NULL, '88888', '484811', 'Branch', '111', 7, 1, '2025-05-16 05:46:15', '2025-06-12 09:16:41'),
(18, 'TEST01', NULL, NULL, 'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', NULL, NULL, '888888888', '888888888', 'Head Office', NULL, 10, 1, '2025-05-16 05:47:56', '2025-06-12 09:16:41'),
(19, 'บริษัท จาวตาลทัวร์ จำกัด', NULL, NULL, '99/144 หมู่บ้านเฮาส์ 35 หมู่ที่ 2 ซอยแจ้งวัฒนะ-ปากเกร็ด 35 ตำบลคลองเกลือ อำเภอปากเกร็ด จังหวัดนนทบุรี 11120', NULL, NULL, '115557013953', '081-170-1714', 'Head Office', NULL, 10, 0, '2025-05-16 05:48:51', '2025-05-16 05:48:51'),
(20, 'TEST002', 'TES07', NULL, 'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT', NULL, NULL, '123456789', '0825963254', 'Branch', '002', 8, 1, '2025-05-16 05:53:28', '2025-06-12 09:16:41'),
(21, 'KINGDOM', 'KDM', NULL, 'KRABI 8100000000000000000000000000000000000000000000000000000000000000000000000', NULL, NULL, '8526987412', '086-621-5952', 'Head Office', NULL, 8, 1, '2025-05-21 01:05:35', '2025-06-12 09:16:41'),
(22, 'CODE9', 'DDD', NULL, 'TESTTESTTESTTESTTEST', NULL, NULL, '885235', '099-999-9999', 'Branch', '333', 9, 1, '2025-05-23 02:15:56', '2025-08-18 15:32:43'),
(23, 'CODE', 'DDD', NULL, 'TESTTESTTESTTESTTEST', NULL, NULL, '885235', '099-999-9999', 'Branch', '333', 9, 0, '2025-05-23 02:15:56', '2025-05-23 02:15:56'),
(24, 'KHUNGTHAI', 'KTH', NULL, 'BANGKOK', NULL, NULL, '521666', '088-888-8888', 'Head Office', NULL, 9, 1, '2025-05-24 08:15:52', '2025-06-12 09:16:41'),
(25, 'TEST', NULL, NULL, NULL, NULL, NULL, NULL, '08259632540825963254', 'Head Office', NULL, 0, 0, '2025-05-24 08:21:13', '2025-05-24 08:21:13'),
(26, 'JAOTAN TOUR CO.,LTD.', 'JAOT', 'jaotantour_centre@hotmail.com', '99/144 TOWN HOME HAUS 35 MOO 2 CHAENGWATTANA', 'PAK KRET 35 KHLONG KLUEA PAK KRET NONTHABURI 11120', '', '0115557013953', '0-2573-6979', 'Head Office', NULL, 7, 1, '2025-06-01 08:56:37', '2025-12-05 07:51:52'),
(27, 'DDAY', 'DD01', NULL, 'KRABI', NULL, NULL, '15202625', '086-622-2222', 'Branch', '456', 50, 1, '2025-06-01 09:51:03', '2025-06-12 09:16:41'),
(28, 'TRAVEL BEYOND BORDERS CO.,LTD.', 'TBY', NULL, '15TH FLOOR, ROOM 15/2-3, VIBHAVADI TOWER ', '51/3 NGAMWONGWAN RD., LATYAO CHATUCHAK ', 'BANGKOK', '0105547103933', NULL, 'Head Office', NULL, 7, 0, '2025-06-02 02:33:08', '2025-10-08 16:29:22'),
(29, 'ETHAN TORRES', NULL, NULL, 'USA', NULL, NULL, '1829633', '089-210-0599', 'Head Office', NULL, 3, 1, '2025-06-02 03:50:03', '2025-06-12 09:16:41'),
(30, 'MARTHA', 'MT789', NULL, 'ตำบลปากน้ำ อำเภอเมือง จังหวัดกระบี่', NULL, NULL, '152361654', '085-923-5254', 'Head Office', NULL, 0, 1, '2025-06-05 21:37:58', '2025-08-18 15:30:16'),
(31, 'TORNLANCHA MANOP', 'LAY99', 'chalntorn@gmail.com', '33 MAHARAT ROAD, SOI 8,', 'MUEANG KRABI DISTRICT, ', 'KRABI 81000, THAILAND', '181999526', '0622439182', 'Branch', '088', 15, 1, '2025-06-08 20:49:38', '2025-06-12 09:16:41'),
(32, 'NANCY', NULL, NULL, '2086 PINCHELONE STREET, PORTSMOUTH, VA 23704', NULL, NULL, '195211023', '085-739-3327', 'Head Office', NULL, 15, 1, '2025-06-09 16:20:54', '2025-06-12 09:16:41'),
(33, 'JOHNNY', NULL, NULL, '3608 LUCKY DUCK DRIVE, PITTSBURGH, PA 15215', NULL, NULL, '2562010', '0856241269', 'Head Office', NULL, 20, 0, '2025-06-09 16:38:44', '2025-10-15 09:06:11'),
(34, 'MARCUS C. BARR', NULL, NULL, '4932 HOLT STREET MIRAMAR, FL 33025', NULL, NULL, '2563212', '0869515896', 'Head Office', NULL, 30, 1, '2025-06-11 09:14:42', '2025-06-12 09:16:41'),
(35, 'YUTTANA', NULL, NULL, 'PHUKET', NULL, NULL, '331815', '0856662315', 'Head Office', NULL, 10, 1, '2025-06-12 09:18:16', '2025-06-12 09:18:16'),
(36, 'KONNY', 'PB005', 'konnyza002@gmail.com', 'TEST001', 'TEST002', 'TEST003', '699112', '0932155213', 'Branch', '005', 20, 1, '2025-06-12 09:29:52', '2025-06-12 09:29:52'),
(37, 'YOUTUBE', 'YT101', 'youtube@hotmail.com', 'YOUTUBE01', 'YOUTUBE02', 'YOUTUBE03', '9521012', '0958165214', 'Head Office', NULL, 9, 1, '2025-06-12 09:37:29', '2025-06-12 09:37:29'),
(38, 'THUNDER EXPRESS', NULL, NULL, 'BANGKOK', NULL, NULL, '18199123', '0622439182', 'Head Office', NULL, 30, 0, '2025-06-28 04:39:58', '2025-09-15 10:45:08'),
(39, 'ULTRA SKY (1999) CO.,LTD.', 'ULTS', NULL, '48 SOI 6 THETSABAN RANGRAG TAI RD.,', 'LARD YAO CHATUCHAK BANGKOK 10900', NULL, '00939155391', NULL, 'Head Office', NULL, 7, 1, '2025-06-30 20:24:15', '2025-06-30 20:24:15'),
(40, 'EASY TRAVEL GROUP (THAILAND) CO.,LTD', 'EASY', 'booking@easytraveltour.com', '150/2 MOO 4 TAMBON MARET KOH SAMUI SURATTHANI', NULL, NULL, '0845558005371', '0871491797', 'Head Office', NULL, 0, 1, '2025-07-01 02:04:27', '2026-01-06 04:59:10'),
(41, 'HALFMOON FESTIVAL CO.,LTD', 'HALF', NULL, '72/39 MOO2 BANTAI', 'KOH PHANGAN SURATTHANI 84280', NULL, '0845565007367', NULL, 'Head Office', NULL, 0, 0, '2025-07-01 20:26:56', '2025-12-02 03:41:29'),
(42, 'WKIN', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Head Office', NULL, 0, 0, '2025-07-01 20:40:41', '2025-07-01 20:40:41'),
(43, 'SSSS', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Head Office', NULL, 0, 0, '2025-07-01 20:57:36', '2025-09-01 17:34:46'),
(44, 'ASD', NULL, NULL, '-', NULL, NULL, NULL, NULL, 'Head Office', NULL, 7, 0, '2025-07-01 20:58:24', '2025-08-03 15:11:48'),
(45, 'GANE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Head Office', NULL, 0, 0, '2025-07-01 21:01:03', '2025-09-01 17:34:48'),
(46, 'WKIN', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Head Office', NULL, 0, 0, '2025-07-01 21:22:24', '2025-07-01 21:22:24'),
(47, 'TEST', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Head Office', NULL, 0, 0, '2025-07-01 21:36:33', '2025-09-01 17:34:43'),
(48, 'WKIN', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Head Office', NULL, 0, 0, '2025-07-01 22:13:47', '2025-07-01 22:13:47'),
(49, 'CHALANTORN TORN', 'WKIN', NULL, '-', NULL, NULL, NULL, NULL, 'Branch', '4556', 0, 1, '2025-07-03 02:09:59', '2025-07-03 02:09:59'),
(50, 'JAMEBOND MANOP', 'WKIN', NULL, '33 MAHARAT ROAD, SOI 8,', 'MUEANG KRABI DISTRICT,', 'KRABI 81000, THAILAND', NULL, NULL, 'Head Office', NULL, 0, 1, '2025-07-15 19:26:10', '2025-07-15 19:26:10'),
(51, 'THANKYOUAAAW', 'WKIN', NULL, '', NULL, NULL, '', '', 'Head Office', NULL, 0, 0, '2025-07-15 19:32:50', '2025-07-15 19:32:50'),
(52, 'FOCUS TRAVEL & TOUR', 'FOC', 'lalitaprateep@gmail.com', '160/13 MOO 4 MARET KOH SAMUI SURATTHANI 84310', NULL, NULL, NULL, '0855706779', 'Head Office', NULL, 0, 1, '2025-07-16 20:23:09', '2025-07-16 20:23:09'),
(53, 'SABAI SAMUI TRAVEL', 'SAB', 'jee.sabaisamui@gmail.com', '248/9 MOOO 3 MAENAM KOH SAMUI SURATTHANI 84330', NULL, NULL, NULL, '081-7879163', 'Head Office', NULL, 0, 1, '2025-07-16 20:28:32', '2025-07-16 20:28:32'),
(54, 'TESTNAKUB ABC', 'WKIN', NULL, '', NULL, NULL, '', '', 'Head Office', NULL, 0, 1, '2025-07-16 20:37:50', '2025-07-16 20:37:50'),
(55, 'WKIN', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Head Office', NULL, 0, 0, '2025-07-17 02:41:21', '2025-09-01 17:34:39'),
(56, 'HOLIDAY PLANNER THAILAND', 'HLP', 'harley@thaiholidayplanner.com', '157/16 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', NULL, NULL, '0845556003567', '084-0561303', 'Head Office', NULL, 0, 1, '2025-07-28 22:35:55', '2025-07-28 22:35:55'),
(57, 'CHALANTORN TORN', 'AAXAA', NULL, '33 MAHARAT ROAD, SOI 8, MUEANG KRABI DISTRICT,', '9 KRABI 81000, THAILAND', NULL, '151502', '0622439182', 'Branch', '6666', 30, 1, '2025-08-03 15:37:23', '2025-12-11 13:32:26'),
(58, 'TEST CUSTOMER', 'TEST', 'test@example.com', '123 TEST STREET', NULL, NULL, NULL, '0123456789', 'Head Office', NULL, 30, 1, '2025-08-06 09:14:10', '2025-08-06 09:14:10'),
(59, 'M.A TRAVEL', 'MAT', 'ma_travel@hotmail.com', '124/277 MOO 3 MARET KOH SAMUI SURATTHANI 84310', '', '', NULL, '084-8500154', 'Head Office', NULL, 0, 1, '2025-08-07 07:57:08', '2025-08-07 07:57:08'),
(60, 'WKIN', 'WKIN', NULL, NULL, NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-08-20 09:00:33', '2025-08-20 09:00:33'),
(61, 'DEL PINO/FABRICE PIERRE MR', 'WKIN', NULL, '', NULL, NULL, '', '', 'Head Office', '', 0, 1, '2025-08-20 09:00:53', '2025-09-01 09:51:45'),
(62, 'DEL PINO', 'WKIN', NULL, NULL, NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-08-20 09:01:03', '2025-08-20 09:01:03'),
(63, 'SAMUI T.J. AIR TRAVEL', 'STJ', 'chutiwan.sn@gmail.com', '141/28 MOO 4 LAMAI MARET KOH SAMUI SURATTHANI 84310', '', '', NULL, '089-6520883', 'Head Office', NULL, 0, 1, '2025-08-20 09:13:15', '2025-08-20 09:13:15'),
(64, 'M.C.O. TRAVEL SERVICE CO.,LTD.', 'MCO', 'mco.orawan@gmail.com', '77/57 9TH FLOOR RAJTHEVEE TOWER BUILDING', 'PHAYATHAI ROAD RAJTHEVEE BANGKOK 10400', '', '0105533131450', '02-6536955', 'Head Office', NULL, 0, 1, '2025-08-21 09:10:08', '2025-08-21 09:10:08'),
(65, 'YAMADA/TARO MR', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-08-25 09:56:12', '2025-08-25 09:56:12'),
(66, 'YAMADA/TARO MR', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-08-25 09:56:31', '2025-08-25 09:56:31'),
(67, 'YAMADA/TARO MR', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-08-25 09:56:51', '2025-08-25 09:56:51'),
(68, 'YAMADA/TARO MR', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-08-25 09:57:58', '2025-08-25 09:57:58'),
(69, 'HAPPY', 'HDH', 'happy@gmail.com', 'THAILAND', 'KRABI', '81000', '1111596325', '0852692536', 'Branch', '5555', 30, 1, '2025-09-01 17:35:53', '2025-09-01 17:35:53'),
(70, 'HD ENTERPRISES CO.,LTD', 'HDE', 'herbert@inkohsamui.com', '78/29 MOO 6 MAENAM KOH SAMUI SURATTHANI 84330', '', '', '0845542001460', '077-420747', 'Head Office', NULL, 0, 1, '2025-09-19 07:44:01', '2025-09-19 07:44:01'),
(71, 'MR.PITAK SEENIENG', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-09-29 07:42:09', '2025-09-29 07:42:09'),
(72, 'MR.PITAK SEENIENG', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-09-29 07:42:19', '2025-09-29 07:42:19'),
(73, 'BOOK TO GO CO.,LTD', 'BOOK', 'booktogo56@gmail.com', '7 SOI HATCHANA NIWET 2/8,', 'ANUPHAS PHUKETKARN RD.,TARAD YAI PHUKET 83000', '', '0835565009831', '084-6265801', 'Head Office', NULL, 0, 1, '2025-09-30 05:12:47', '2025-12-11 13:56:35'),
(74, 'NEW HOOVER TOUR', 'NEWH', 'parichart-hiang@hotmail.com', '139/1 NIPHAT-UTHIT3 RD.', 'T.HATYAI SONGKHLA 90110', '', NULL, '074-231845 /08878383', 'Head Office', NULL, 0, 1, '2025-10-06 03:19:00', '2025-10-06 03:19:48'),
(75, 'GOLD TICKET 58', 'GOLD', 'goldticket58@hotmail.com', '2/6 MOO.6 T.TUM A.TAKULTUNG', 'PHANG-NGA 82130', '', NULL, '081-5364499 / 081-78', 'Head Office', NULL, 0, 1, '2025-10-06 03:25:15', '2025-10-06 03:25:15'),
(76, 'SUMMER TOUR', 'SUMM', 'pimmnaticha.jnt@gmail.com', '135/4 MOO 3 MARET KOH SAMUI SURATTHANI 84310', '', '', NULL, '094-9363549', 'Head Office', NULL, 0, 1, '2025-10-06 03:30:34', '2025-10-06 04:56:46'),
(77, 'HADYAI HATSIAM', 'HADS', '', '15/10 PADUNGPAKDEE ROAD HADYAI', '', '', '0903535000779', '', 'Head Office', NULL, 0, 1, '2025-10-06 03:35:49', '2025-10-06 03:38:32'),
(78, 'KOHSAMUI THAILAND TRAVEL', 'KOH', 'jkaoanurak@gmail.com', '24/270 MOO BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '083-5056498', 'Head Office', NULL, 0, 1, '2025-10-06 03:41:22', '2025-10-09 10:05:05'),
(79, 'PHANGAN SKYWAYINTER GROUP', 'PIM', 'phangantravel@hotmail.com', '61/1 MOO 1 KOH PHANGAN SURATTHANI', '', '', '0843563000291', '077-238238', 'Head Office', NULL, 0, 1, '2025-10-06 03:41:38', '2025-10-06 03:41:38'),
(80, 'SAMUI AIR TRAVEL', 'SMAS', 'tippayachan_sudarat@hotmail.com', '28/9 MOO 3 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '092-4994544', 'Head Office', NULL, 0, 1, '2025-10-06 03:44:20', '2025-10-06 03:44:20'),
(81, 'IDAY TOUR KOH SAMUI', 'IDAY', 'jkaoanurak@gmail.com', '24/270 MOO 5 BOPHUT KOH SAMUI SURATTHANI 84320', NULL, NULL, NULL, '083-5056498', 'Head Office', NULL, 0, 1, '2025-10-06 03:47:36', '2025-10-08 12:35:03'),
(82, 'AMADEUS TRAVEL', 'AMD', 'aksornsriau@gmail.com', '129/2 MOO 3 MARET KOH SAMUI SURATTHANI 84310', '', '', NULL, '077-424041', 'Head Office', NULL, 0, 1, '2025-10-06 03:48:35', '2025-10-06 03:48:35'),
(83, 'FRIENDY TRAVEL', 'FRIH', 'muay25091966@gmail.com', '12/227 MOO 1 KLONGHAE HATYAI SONGKHLA 90110', '', '', NULL, '074-354015', 'Head Office', NULL, 0, 1, '2025-10-06 03:56:56', '2025-10-06 03:56:56'),
(84, 'FOCUS TRAVEL & TOURS', 'FOC', 'lalitaprateep@gmail.com', '160/13 MOO 4 MARET KOH SAMUI SURATTHANI 84310', '', '', NULL, '089-5869582', 'Head Office', NULL, 0, 1, '2025-10-06 03:59:31', '2025-10-06 03:59:31'),
(85, 'P.C.N TRAVEL & TOUR', 'PCN', 'suetrong.family@gmail.com', 'MOO 3 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '', 'Head Office', NULL, 0, 1, '2025-10-06 04:09:11', '2025-10-06 04:09:11'),
(86, 'SMILE@SAMUI TRAVEL', 'SAS', 'tanitlimyartjay@hotmail.com', '155/16 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '099-3193274', 'Head Office', NULL, 0, 1, '2025-10-06 04:12:07', '2025-10-06 04:12:07'),
(87, 'SAMUI SMILE TOUR', 'SMS', 'smilesamui.tours@gmail.com', '119/23 MOO2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '081-6762343', 'Head Office', NULL, 0, 1, '2025-10-06 04:16:38', '2025-10-06 04:16:38'),
(88, 'RINNY TRAVEL', 'RINY', 'd_rinyarin@iCloud.com', '159/6 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '087-4940405', 'Head Office', NULL, 0, 1, '2025-10-06 04:20:14', '2026-02-06 11:07:13'),
(89, 'TCC HOTEL ASSET MANAGEMENT CO.,LTD.', 'MELS', '', '83 MOO 5 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', '0105549106859', '077-938899', 'Branch', '00010', 10, 1, '2025-10-06 04:24:20', '2026-01-26 09:53:06'),
(90, 'TCC HOTEL COLLECTION CO.,LTD.', 'MELP', '', '370 MOO 9 NONGPRUE BANGLAMUNG CHONBURI 20150', '', '', '0105546025131', '033-168555', 'Branch', '0013', 10, 1, '2025-10-06 04:26:08', '2025-10-06 04:26:08'),
(91, 'TRAVEL BEYOND BORDERS CO.,LTD', 'TBY', 'contact@travel-bb.com', '15TH FLOOR, ROOM15/2-3, VIBHAVADI TOWER', '51/3 NGAMWONGWAN RD LATYAO CHATUCHAK BANGKOK', '', '0105547103933', '02-0561800', 'Head Office', NULL, 7, 1, '2025-10-06 04:34:16', '2025-10-08 16:29:06'),
(92, 'ASIAN ASSISTANCE(THAILAND)CO.,LTD', 'TBY2', 'contact@asian-assistance.com', '15TH FLOOR, ROOM2-3, VIBHAVADI TOWER', '51/3 NGAMWONGWAN RD LATYAO CHATUCHAK BANGKOK', '', '0105545077722', '02-0561800', 'Head Office', NULL, 7, 1, '2025-10-06 04:35:40', '2025-10-08 16:29:48'),
(93, 'MATCHING TRAVEL', 'MATC', 'matchingtravel@gmail.com', '64/65 MOO 1 BANG KRANG MUANG NONTHABURI 11000', '', '', NULL, '081-9578474', 'Head Office', NULL, 0, 1, '2025-10-06 04:41:03', '2025-10-28 07:09:51'),
(94, 'KIRANAR AIR BOOKING', 'KRN', 'kiranarairbooking@gmail.com', '519/51 MOO 10 PATTAYASAISONG NONG PRUE', 'BANG LAMUNG CHON BURI 20150', '', NULL, '064-2693554', 'Head Office', NULL, 0, 1, '2025-10-06 04:47:11', '2025-10-06 04:47:11'),
(95, 'ANDAMAN TRAVEL', 'ANDA', 'a_amista@hotmail.com', '168/52 MOO 5 BANGKUN SURATTHANI 84000', '', '', NULL, '077-275204', 'Head Office', NULL, 0, 1, '2025-10-06 04:50:25', '2025-10-06 04:50:25'),
(96, 'SAMUI TOURIST', 'STOU', 'samuitourist@hotmail.com', '12/17 MOO 6 MARET KOH SAMUI SURATTHANI 84310', '', '', '0845566027981', '090-4909070', 'Head Office', NULL, 0, 1, '2025-10-06 05:00:55', '2025-10-06 05:00:55'),
(97, 'DR.DOLLARS TRAVEL SERVICE', 'DRD', 's_nakngam1@hotmail.com', '161/8 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '081-7971607', 'Head Office', NULL, 0, 1, '2025-10-06 05:03:05', '2025-10-06 05:03:05'),
(98, 'SUNNY TOUR CO.,LTD.', 'SUNNY', 'sunnyhatyai@gmail.com', '1 RATTAKARN RD HATYAI SONGKHLA 90110', '', '', '0105532068517.', '074-354555', 'Head Office', NULL, 0, 1, '2025-10-06 05:08:41', '2025-10-06 05:08:41'),
(99, 'NAKHON DC CO.,LDT.', 'NDC', '', '1612 RATCHADAMNERN ROAD THAWANG NAKHON SI THAMMARAT 80000', '', '', '0805554001052', '075-312500', 'Head Office', NULL, 0, 1, '2025-10-06 05:12:06', '2025-10-06 05:12:06'),
(100, 'SAMUI VISA RUN LTD.', 'SVI', 'stick070194@gmail.com', '81/3 MOO 1 MEANAM KOH SAMUI SURATTHANI 84330', '', '', NULL, '096-6922896', 'Head Office', NULL, 0, 1, '2025-10-06 05:17:02', '2025-10-06 05:17:02'),
(101, 'BLUE STAR BUDGET TRAVEL', 'BSB', 'bluestartravel@hotmail.com', '167/67 MOO2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '077-300643', 'Head Office', NULL, 0, 1, '2025-10-06 05:18:47', '2025-10-08 12:35:36'),
(102, 'SAMUI ICONIC TOUR', 'SICO', '', '162/52 MOO 2 ROOM B4 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '091-871-3208', 'Head Office', NULL, 0, 1, '2025-10-06 05:21:45', '2025-10-06 05:21:45'),
(103, 'PHANGAN TRAVEL 3', 'PUAN', 'phanganhostel99@gmail.com', '94/66 MOO 6 BAN TAI KOH PHANGAN SURATTHANNI 84280', '', '', NULL, '063-2603963', 'Head Office', NULL, 0, 1, '2025-10-06 05:24:52', '2025-10-10 07:44:16'),
(104, 'SAWASDEE HOUSE', 'SWD', '', '124/13 MOO 3 MARET KOH SAMUI SURATTHANI 84310', '', '', NULL, '082-4754646', 'Head Office', NULL, 0, 1, '2025-10-06 05:29:37', '2025-10-06 05:29:37'),
(105, 'PUSIRI TRAVEL', 'PUSI', '', '44/3 MOO 1 KOH PHANGAN SURATTHANI 84280', '', '', NULL, '081-9785608', 'Head Office', NULL, 0, 1, '2025-10-06 05:31:37', '2025-10-06 05:31:37'),
(106, 'LET\'S FLY TRAVEL CO.,LTD.', 'LETS', 'letflytravel@gmail.com', '168/1 PHANGMUANG SAI KOR PATONG KATHU PHUKET 83150', '', '', '0835558003131', '086-9532225', 'Head Office', NULL, 0, 1, '2025-10-06 05:48:02', '2025-10-06 05:48:02'),
(107, 'PAPRIKA TRAVEL KOH PHANGAN', 'PAP', 'paprikatravel@gmail.com', '128/1 MOO 6 HAAD RIN KOH PHANGAN SURATTHANI 84280', '', '', NULL, '087-2671711', 'Head Office', NULL, 0, 1, '2025-10-06 06:09:13', '2025-10-09 03:01:59'),
(108, 'PJ TRAVEL', 'PJT', 'titima25@homail.com', '94/43 MOO 6 BAAN TAI KOH PHANGAN SURATTHANI 84280', '', '', NULL, '081-8938941', 'Head Office', NULL, 0, 1, '2025-10-06 06:11:58', '2025-10-06 06:11:58'),
(109, 'U SAMUI MICE', 'USM', 'panadda.marvin@gmail.com', '72/7 MOO 1 TALING NGAM KOH SAMUI SURATTHANI 84140', '', '', NULL, '084-1415326', 'Head Office', NULL, 0, 1, '2025-10-06 06:14:43', '2025-10-06 06:14:43'),
(110, 'MAMMOTH SAMUI TOUR', 'MAM', 'mamiew19831983@gmail.com', '109/9 MOO 3 MARET KOH SAMUI SURATTHANI 84310', '', '', NULL, '099-3631526', 'Head Office', NULL, 0, 1, '2025-10-06 07:39:51', '2025-10-06 07:39:51'),
(111, 'AFT SAMUI BUSINESS', 'AFT', '', '141/3 MOO 6 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', '0845559000721', '077-270720', 'Head Office', NULL, 0, 1, '2025-10-06 07:42:13', '2025-10-06 07:42:13'),
(112, 'SUI KIN 553 CO.,LTD.', 'SUI', '', '99/9 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', '0105553093499', '077-915100', 'Head Office', NULL, 0, 1, '2025-10-06 07:44:26', '2025-10-06 07:44:26'),
(113, 'RUK SAMUI', 'RUK', 'ruksamuitravel@gmail.com', 'BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '089-8664520', 'Head Office', NULL, 0, 1, '2025-10-06 07:48:53', '2025-10-06 07:48:53'),
(114, 'JS TRAVEL & TOUR', 'JST', 'jureeangel@hotmail.com', '158/20 MOO 1 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '089-6485283', 'Head Office', NULL, 0, 1, '2025-10-06 08:06:40', '2025-10-06 08:06:40'),
(115, 'SAMUI J&K TRAVEL', 'SJK', '', '105/62 MOO 1 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '08918711565', 'Head Office', NULL, 0, 1, '2025-10-06 08:09:02', '2025-10-06 08:09:02'),
(116, 'ANGEL TICKET & TOUR CO.,LTD', 'ANGH', 'angelticket_tour@hotmail.com', '183/3 SOI 19 TALAYLUANG RD BORYANG SONGKHLA 90000', '', '', '0905559000398', '063-0798518', 'Head Office', NULL, 0, 1, '2025-10-06 08:11:05', '2025-10-06 08:11:05'),
(117, 'MEE BOONE TRAVEL & TOUR', 'MEB', '', '38/18 MOO 3 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '064-2516566', 'Head Office', NULL, 0, 1, '2025-10-06 08:13:47', '2025-10-06 08:13:47'),
(118, 'SAMUI P\'SKY TRAVEL', 'PSKY', '', '129/9 MOO 3 MARET KOH SAMUI SURATTHANI 84310', '', '', NULL, '089-4734591', 'Head Office', NULL, 0, 1, '2025-10-06 08:17:00', '2025-12-03 09:31:39'),
(119, 'JANTHARAT TOUR', 'JANT', '', '159 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '080-6785715', 'Head Office', NULL, 0, 1, '2025-10-06 08:18:11', '2025-10-06 08:18:11'),
(120, 'POP TRAVEL & TOUR', 'POP', 'yjaisuk@gmail.com', 'MARET KOH SAMUI SURATTHANI 84310', '', '', NULL, '096-8405725', 'Head Office', NULL, 0, 1, '2025-10-06 08:21:33', '2025-10-06 08:21:33'),
(121, 'BACKPACKER SAMUI TRAVEL', 'BACK', 'backpackersamui@hotmail.com', '12 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', '0775564004110', '081-4769630', 'Head Office', NULL, 0, 1, '2025-10-06 08:24:14', '2025-10-06 08:24:14'),
(122, 'TIWA SAMUI TRAVEL AGENCY', 'TIWA', 'tiwasamui541@gmail.com', '14 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '081-7192663', 'Head Office', NULL, 0, 1, '2025-10-06 08:26:46', '2025-10-08 12:31:47'),
(123, 'PAUSE & BE TRAVEL', 'PAUS', 'pausebetravel@gmail.com', '595/5 PHAHOLYOTHIN RD WIANG MUEANG CHIANG RAI 57000', '', '', NULL, '093-5874364', 'Head Office', NULL, 0, 1, '2025-10-06 08:29:39', '2025-10-06 08:29:39'),
(124, 'CHECKIN PATTANI', 'CHECK', 'checkinpattani@gmail.com', '17/172 CHAROENPRADIT RD RUSAMIRAE MUANG', 'PATTANI 94000', '', NULL, '073-336886', 'Head Office', NULL, 0, 1, '2025-10-06 08:32:33', '2025-10-06 08:32:33'),
(125, 'PICO SAMUI', 'PICO', '', '175/76 MOO1 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '063-3659641', 'Head Office', NULL, 0, 1, '2025-10-06 08:38:20', '2025-10-06 08:38:20'),
(126, 'PLOY TRAVEL', 'PLOY', 'ploytravel@msn.com', '40 PITAKPHANOMKHET ROAD MUANG MUKDAHAN 49000', '', '', NULL, '064-5945622', 'Head Office', NULL, 0, 1, '2025-10-06 08:40:14', '2025-10-06 08:40:14'),
(127, 'TOGETHER TRAVEL', 'TOG', '', '9/109 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '094-4804126', 'Head Office', NULL, 0, 1, '2025-10-06 08:42:23', '2025-10-06 08:42:23'),
(128, 'NALIN TRAVL', 'NAL', '', '85 MOO 5 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '089-2888407', 'Head Office', NULL, 0, 1, '2025-10-06 08:45:34', '2025-10-06 08:45:34'),
(129, 'BONUS TRAVEL AGENCY', 'BON', '', '66/5 MOO 1 MAENAM KOH SAMUI SURATTHANI 84330', '', '', NULL, '081-4323241', 'Head Office', NULL, 0, 1, '2025-10-06 08:47:37', '2025-10-06 08:47:37'),
(130, 'PRACHABODEE TRAVEL', 'PRAC', 'info@prachabodeekrabi.com', '2/6 CITY PLAZA MAHARACH SOI10 RD', 'PAKNAM MUANG KRABI 81000', '', NULL, '075-611511', 'Head Office', NULL, 0, 1, '2025-10-06 08:51:51', '2025-10-06 08:51:51'),
(131, 'N.C.K TRAVEL & TOURS', 'NCK', '', '37/89 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '086-4795952', 'Head Office', NULL, 0, 1, '2025-10-06 08:54:48', '2025-10-06 08:54:48'),
(132, 'UNIVERSAL TICKET', 'UNIV', 'universalticket97@gmail.com', '257/6 NIPATUTHIT 1 RD HATYAI SONGKHLA 90110', '', '', NULL, '074-262837', 'Head Office', NULL, 0, 1, '2025-10-06 08:57:04', '2025-10-06 08:57:04'),
(133, 'DOW SAMUI TRAVEL TOUR & TICKET', 'DAW', '', '17/8 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '093-6096287', 'Head Office', NULL, 0, 1, '2025-10-06 09:01:15', '2025-10-06 09:01:15'),
(134, 'SAMUI TWIN TOUR', 'TWIN', 'n_phomphan@hotmail.com', '60/2 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '082-4681652', 'Head Office', NULL, 0, 1, '2025-10-06 09:04:23', '2025-10-06 09:04:23'),
(135, 'ATXP (THAILAND) CO.,LTD.', 'ATC', '', '112 MOO2 SAMET MUANG CHONBURI 20000', '', '', '0205558033329', '082-4556698', 'Head Office', NULL, 0, 1, '2025-10-06 09:08:12', '2025-10-06 09:08:12'),
(136, 'SAVEWAY TRAVEL', 'SAVE', 'aweonline2006@yahoo.com', '3/123 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '064-9758825', 'Head Office', NULL, 0, 1, '2025-10-06 09:10:55', '2025-10-06 09:10:55'),
(137, 'P&T HOSTEL', 'PAT', 'pandthostel@gmail.com', '73/46-47 MOO 4 BANG RAK BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '098-7042913', 'Head Office', NULL, 0, 1, '2025-10-06 09:13:22', '2025-10-08 16:32:44'),
(138, 'SHANGRILA VIEW CO.,LTD.', 'SHA', 'shangrila.view@gmail.com', '307 SOI SAHAMIT MAHAPUTTARAM RD', 'BANGRAK BANGKOK  10500', '', '0105553012120', '082-8298245', 'Head Office', NULL, 0, 1, '2025-10-06 09:16:38', '2025-10-06 09:16:38'),
(139, 'SAMUI ISLAND RESORT CO.,LTD', 'NPS', '', '65/10 M.5 T.MEANAM KOH SAMUI', 'SURATTHANI 84330', '', '0105540000519', '077-429200', 'Head Office', NULL, 0, 1, '2025-10-06 09:19:57', '2025-10-06 09:19:57'),
(140, 'UNIQUE SAMUI TRAVEL', 'UNIQ', 'bamz_kanya@hotmail.com', '160/12 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '080-9855158', 'Head Office', NULL, 0, 1, '2025-10-06 09:24:12', '2025-10-08 12:37:39'),
(141, 'TICKET & TOUR CENTER', 'TKT', '', '46/15 MOO 3 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '081-3262051', 'Head Office', NULL, 0, 1, '2025-10-06 09:28:08', '2025-10-08 12:30:49'),
(142, 'SOMTHONG TRAVEL', 'SOM', '', 'MARET KOH SAMUI SURATTHANI 84310', '', '', NULL, '087-2692896', 'Head Office', NULL, 0, 1, '2025-10-06 09:32:00', '2025-10-06 09:32:00'),
(143, 'PATTY TRAVEL & TOUR', 'PATTY', 'patsoosomkaew@yahoo.com', '38 MOO 3 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '081-7193591', 'Head Office', NULL, 0, 1, '2025-10-06 09:33:30', '2025-10-08 16:27:43'),
(144, 'POM & TRAVEL SAMUI', 'POM', '', '33/4 MOO 4 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '089-2236184', 'Head Office', NULL, 0, 1, '2025-10-06 09:35:43', '2025-10-08 10:48:13'),
(145, 'TRIPLE S TRAVEL', 'TRPS', 'triple_s4@hotmail.com', '175 MOO 1 MAENAM KOH SAMUI SURATTHANI 84320', '', '', NULL, '084-6890040', 'Head Office', NULL, 0, 1, '2025-10-06 09:59:26', '2025-10-06 09:59:26'),
(146, 'SRIFAH STAR TOUR', 'SRIF', '', '111 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '061-6299493', 'Head Office', NULL, 0, 1, '2025-10-06 10:01:24', '2025-10-06 10:01:24'),
(147, 'SUPANSA TRAVEL & TOUR', 'SUPA', '', '142/30 MOO 4 MARET KO SAMUI SURATTHANI 84310', '', '', NULL, '077-458180', 'Head Office', NULL, 0, 1, '2025-10-06 10:18:04', '2025-10-06 10:18:04'),
(148, 'GOLDEN FRIDAY SAMUI TRAVEL', 'GDF', 'lexlex25@hotmail.com', '20/6 MOO 4 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '081-7477421', 'Head Office', NULL, 0, 1, '2025-10-06 10:19:54', '2025-10-08 10:22:17'),
(149, 'AR ANN', 'BUZ', 'sakunkan.is@hotmail.com', '1/1 MOO 6 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '094-9645440', 'Head Office', NULL, 0, 1, '2025-10-06 10:29:53', '2025-10-06 10:29:53'),
(150, 'SAMUI TRANSPORT & TOUR', 'STT', 'info@samuitoday.com', '101/30 MOO 1 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '097-9254455', 'Head Office', NULL, 0, 1, '2025-10-06 10:32:44', '2025-10-06 10:33:21'),
(151, 'FREEDOM PLUS TRAVEL', 'FRD', '', '38/53 MOO 3 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '063-9577784', 'Head Office', NULL, 0, 1, '2025-10-06 10:42:23', '2025-10-10 07:30:55'),
(152, 'MR. KIM TRAVEL', 'KIM', 'mrkim1960@gmail.com', '17/14 MOO 2 BAN NAISUAN KOH PHANGAN SURATTHANI 84280', '', '', NULL, '081-9582223', 'Head Office', NULL, 0, 1, '2025-10-06 10:43:46', '2025-10-06 10:43:46'),
(153, 'MARISA TRAVEL', 'MRS', 'm.tipsenawong@gmail.com', 'BANGRAK BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '', 'Head Office', NULL, 0, 1, '2025-10-06 10:48:01', '2025-10-06 10:48:01'),
(154, 'VIEW POINT TRAVEL', 'VPD', 'viewpointtravel@live.com', 'CHALOK BAAN KAO KOH TAO SURATTHANI 84280', '', '', NULL, '077-456025', 'Head Office', NULL, 0, 1, '2025-10-06 10:52:02', '2025-10-08 16:35:07'),
(155, 'ANKEXIN INTERNATIONAL TRAVEL SERVICE CO.,LTD', 'NEWS', 'ankexin2018@gmail.com', '128/163 MOO 1 BOPHUT KOH SAMUI SURATTHANI  84320', '', '', '0845561010983', '077-961971', 'Head Office', NULL, 0, 1, '2025-10-06 10:55:31', '2025-10-08 16:34:23'),
(156, 'THE SIAM COMMERCIAL BANK CENTRAL FESTIBAL', 'SCBS', '', '209/1-2 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', '0107536000102', '077-410453', 'Branch', '5393', 0, 1, '2025-10-06 11:00:32', '2025-10-06 11:00:32'),
(157, 'B.B.T. TRAVEL', 'BBT', 'bbtreavel@hotmail.com', '175/11 MOO 1 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '095-9787956', 'Head Office', NULL, 0, 1, '2025-10-06 11:02:57', '2025-10-10 07:46:43'),
(158, 'AOTHAI TRAVEL SAMUI', 'AOT', '', '100/7 MOO 1 MAENAM KOH SAMUI SURATTHANI 84320', '', '', NULL, '099-4789796', 'Head Office', NULL, 0, 1, '2025-10-06 11:04:57', '2025-10-06 11:04:57'),
(159, 'SAMUI IMMIGRATION OFFICES', 'IMM', '', '333 MOO 1 MAENAM SOI 1 MAENAM KOH SAMUI SURATTHANI 84310', '', '', NULL, '077-423440', 'Head Office', NULL, 0, 1, '2025-10-06 11:16:47', '2025-10-06 11:16:47'),
(160, 'EASYWAY', 'EASYW', '', '37/1 MOO 1 MAENAM KOH SAMUI SURATTHANI 84330', '', '', NULL, '098-7326793', 'Head Office', NULL, 0, 1, '2025-10-07 02:35:15', '2025-10-07 02:35:15'),
(161, 'ROYAL TRAVEL & TOURS', 'ROYAL', 'panarat1@gmail.com', '9/2 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '098-7351996', 'Head Office', NULL, 0, 1, '2025-10-07 07:07:54', '2025-10-07 07:07:54'),
(162, 'POPEYE TOUR PHANGAN', 'POPE', 'popeyetour2524@gmail.com', '145/24 MOO6 BAN TAI KOH PHANGAN SURATTHANI 84280', '', '', NULL, '084-2832252', 'Head Office', NULL, 0, 1, '2025-10-08 09:01:21', '2025-10-08 13:57:23'),
(163, 'HALFMOON FESTIVAL CO.,LTD.', 'HALF', 'pimmnaticha.jnt@gmail.com', '72/39 MOO2 BANTAI KOH PHANGAN', 'SURATTHANI 84280', '', '0845565007367', '', 'Head Office', NULL, 0, 1, '2025-10-08 09:03:11', '2025-12-02 03:41:47'),
(164, 'WALK IN', 'WKIN', '', '-', '', '', NULL, '', 'Head Office', NULL, 0, 1, '2025-10-08 09:06:26', '2025-10-08 09:06:26'),
(165, 'WALK IN', 'WKIN', '', '-', '', '', NULL, '', 'Head Office', NULL, 0, 1, '2025-10-08 09:07:39', '2025-10-23 07:55:10'),
(166, 'JAMES TRAVEL LAMAI', 'JAM', 'jameslamaicarrent@yahoo.com', '133/23 MOO3 MARET KOH SAMUI SURATTHANI 84310', '', '', NULL, '085-7848293', 'Head Office', NULL, 0, 1, '2025-10-08 10:25:38', '2025-10-08 10:25:38'),
(167, 'N & A PETROLEUM CO.,LTD.', 'NURUK', 'praditnuruk@gmail.com', '100/9 MOO7 TAKHIANTHONG KANCHANADIT SURATTHANI 84160', '', '', '0845553001695', '081-6337789', 'Head Office', NULL, 0, 1, '2025-10-08 10:32:31', '2025-10-08 10:32:31'),
(168, 'SAMUI HIGHLIGHT TRAVEL', 'SHI', 'samuihighlight@gmail.com', '14/72 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '089-4744482', 'Head Office', NULL, 0, 1, '2025-10-08 10:39:40', '2025-10-08 10:39:40'),
(169, 'AORNANONG TRAVEL', 'AORN', '', '147/31 MOO 2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '089-4726301', 'Head Office', NULL, 0, 1, '2025-10-08 12:42:22', '2025-10-08 12:42:22'),
(170, 'CHOENGMON BEACH VILLAS CO., LTD', 'WHEAT', 'jamesw@williamwheatley.co.uk', '24/3 MOO 5 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', '0845565005003', '0825024897', 'Head Office', NULL, 0, 1, '2025-10-14 09:15:23', '2025-10-14 09:58:24'),
(171, 'JAMES WILLIAMS', 'WKIN', NULL, NULL, NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-10-15 03:15:44', '2025-10-15 03:15:44'),
(172, 'FUNNY DAY SAFARI CO.,LTD.', 'FUN', 'info@funnydaysafari.com', '82 MOO 4 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', '0845562011398', '081-9702779', 'Head Office', NULL, 0, 1, '2025-10-22 10:28:23', '2025-10-22 10:39:30'),
(173, 'NJ TICKET&TOUR SERVICE (KAOKEAW) CO.,LTD.', 'NJT', 'kanawat89@gmail.com', '35/164 MOO2 KAOKEAW MUEANG PHUKET 83000', '', '', '0835555010136', '063-5354288', 'Head Office', NULL, 0, 1, '2025-10-22 10:33:37', '2025-10-22 10:35:12'),
(174, 'WALK IN', 'WKIN', NULL, NULL, NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-10-23 07:48:50', '2025-10-23 07:48:50'),
(175, 'SCHNYDER', 'WKIN', NULL, NULL, NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-10-23 07:52:22', '2025-10-23 07:52:22'),
(176, 'SCHNYDER', 'WKIN', NULL, NULL, NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-10-23 07:52:46', '2025-10-23 07:52:46'),
(177, 'WALK IN', 'WKIN', NULL, NULL, NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-10-23 07:53:18', '2025-10-23 07:53:18'),
(178, 'WALK IN', 'WKIN', NULL, NULL, NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-10-23 07:56:24', '2025-10-23 07:56:24'),
(179, 'WALK-IN', 'WKIN', '', '1', '', '', NULL, '', 'Head Office', NULL, 0, 1, '2025-10-23 07:56:29', '2025-10-23 07:56:29'),
(180, 'WALK IN', 'WKIN', NULL, NULL, NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-10-23 07:56:54', '2025-10-23 07:56:54'),
(181, 'WALK IN', 'WKIN', NULL, NULL, NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-10-23 07:57:43', '2025-10-23 07:57:43'),
(182, 'THARNTIP THAILAND GROUP', 'THARN', 'tharntip888@gmail.com', '132 SUKHUMVIT RD THANG KWIAN KLANG RAYONG 21110', '', '', NULL, '064-6393536', 'Head Office', NULL, 0, 1, '2025-10-23 10:47:34', '2025-10-23 10:47:34'),
(183, 'DRAGON ON TOUR CO.,LTD.', 'DRA', 'dragonontour01@gmail.com', '118 BOROMMARAJCHONNI ROAD TALING-CHAN BANGKOK 10170', '', '', '0105550062282', '094-9454979', 'Head Office', NULL, 0, 1, '2025-10-28 05:25:45', '2025-10-28 05:25:45'),
(184, 'WALK IN', 'WALK', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 0, '2025-11-04 09:10:18', '2025-11-07 04:15:24'),
(185, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-11-07 03:34:41', '2025-11-07 03:34:41'),
(186, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-11-07 04:17:59', '2025-11-07 04:17:59'),
(187, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-11-07 04:19:57', '2025-11-07 04:19:57'),
(188, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-11-07 04:26:48', '2025-11-07 04:26:48'),
(189, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-11-07 04:27:38', '2025-11-07 04:27:38'),
(190, 'WALK IN', 'WKIN', NULL, NULL, NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-11-07 04:27:56', '2025-11-07 04:27:56'),
(191, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-11-07 04:32:29', '2025-11-07 04:32:29'),
(192, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-11-07 04:32:43', '2025-11-07 04:32:43'),
(193, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-11-07 04:33:38', '2025-11-07 04:33:38'),
(194, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-11-07 04:43:21', '2025-11-07 04:43:21'),
(195, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-11-07 04:45:38', '2025-11-07 04:45:38'),
(196, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-11-07 04:45:55', '2025-11-07 04:45:55'),
(197, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-11-07 06:55:19', '2025-11-07 06:55:19'),
(198, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-11-07 06:59:03', '2025-11-07 06:59:03'),
(199, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-12-01 10:02:23', '2025-12-01 10:02:23'),
(200, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-12-01 10:03:54', '2025-12-01 10:03:54'),
(201, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-12-01 10:06:13', '2025-12-01 10:06:13'),
(202, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-12-01 10:11:51', '2025-12-01 10:11:51'),
(203, 'U VILLA & TOUR SAMUI', 'UVI', 'kurukuru_ssvm@hotmail.com', 'MOO2 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '098-9197917', 'Head Office', NULL, 0, 1, '2025-12-02 07:32:19', '2025-12-02 07:32:19'),
(204, 'PARADISE SAMUI TOUR & TRAVEL', 'PARA', '', 'BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '092-5694547', 'Head Office', NULL, 0, 1, '2025-12-02 07:58:29', '2025-12-02 07:58:29'),
(205, 'CHAVALIT IMPORT - EXPORT COMPANY LIMITED', 'CIX', NULL, '8 TAO LUANG ROAD  BO YANG MUEANG', 'SONGKHLA 90000', NULL, '0905540001437', '081-5990881', 'Head Office', NULL, 0, 1, '2025-12-02 09:56:29', '2025-12-08 03:32:04'),
(206, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-12-03 10:13:01', '2025-12-03 10:13:01'),
(207, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-12-05 03:42:08', '2025-12-05 03:42:08'),
(208, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-12-05 07:15:59', '2025-12-05 07:15:59'),
(209, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2025-12-08 03:51:04', '2025-12-08 03:51:04'),
(210, 'บริษัท ศรีตรังแอโกรอินดัสทรี จำกัด (มหาชน)', 'AGR', '', 'เลขที่ 10 ซอย 10 ถนนเพชรเกษม ตำบลหาดใหญ่', 'อำเภอหาดใหญ่ จังหวัดสงขลา 90110', '', '0107536001656', '074-344663', 'Head Office', NULL, 0, 1, '2025-12-09 06:42:39', '2025-12-30 07:34:34'),
(211, 'บริษัท ศรีตรัง ไอบีซี จำกัด', 'IBC', '', '10 ซ.10 ถ.เพชรเกษม ต.หาดใหญ่', 'อ.หาดใหญ่ จ.สงขลา 90110', '', '0905562003432', '074-222900', 'Head Office', NULL, 0, 1, '2025-12-11 05:05:29', '2025-12-30 07:30:57'),
(212, 'บริษัท รับเบอร์แลนด์โปรดักส์ จำกัด สาขามุกดาหาร', 'RUBMD', '', 'เลขที่ 188 หมู่ 10 ตำบลบางทรายใหญ่', 'อำเภอเมืองมุกดาหาร จังหวัดมุกดาหาร 49000', '', '0905531000318', '042-620954', 'Branch', '0007', 0, 1, '2025-12-11 05:06:42', '2026-02-06 12:26:22'),
(213, 'PREMIER SYSTEM ENGINEERING CO., LTD.', 'PREM', '', '123 MOO 8 KANCHANAWANICH RD HATYI  SONGKHLA 90250', '', '', '0905537000433', '074-222912', 'Head Office', NULL, 0, 1, '2025-12-11 05:07:25', '2025-12-11 05:07:25'),
(214, 'BANANA LEAF TOURS', 'BANA', 'bananaleaftours1@gmail.com', '880/2 MOO 9 JETYOD RD WIANG MUANG CHINAG RAI 57000', '', '', NULL, '092-2735933', 'Head Office', NULL, 0, 1, '2025-12-21 04:22:42', '2025-12-21 04:23:33'),
(215, 'PT SRI TRANG LINGGA INDONESIA', 'SLI', '', 'TPA RT 26&29 KERAMASAN', 'PALEMBANG INDONESIA', '', NULL, '', 'Head Office', NULL, 0, 1, '2025-12-30 07:36:43', '2025-12-30 07:36:43'),
(216, 'PT. STAR RUBBER ( JAMBI )', 'PTJ', '', 'JL TRANS KALIMANTAN KM 16 DESA JAWA TENGAH KEC', 'SUNGAI AMBAWANG KABUPATEN KUBU RAYA INDONESIA', '', NULL, '', 'Head Office', NULL, 0, 1, '2025-12-30 07:50:09', '2025-12-30 07:50:09'),
(217, 'บริษัท เซมเพอร์เฟล็กซ์ เอเซีย จำกัด', 'SAC', '', 'เลขที่ 110/1 ถนนกาญจนวนิช ตำบลพะตง', 'อำเภอหาดใหญ่ จังหวัดสงขลา 90230', '', '0905539000848', '', 'Head Office', NULL, 0, 1, '2025-12-30 07:51:13', '2025-12-30 07:51:13'),
(218, 'บริษัท พรีเมียร์ซิสเต็มเอ็นจิเนียริ่ง จำกัด', 'PSE', '', 'เลขที่ 123 หมู่ 8 ถนนกาญจนวนิช ตำบลบ้านพรุ', 'อำเภอหาดใหญ่ จังหวัดสงขลา 90', '', '0905537000433', '', 'Head Office', NULL, 0, 1, '2025-12-30 07:52:05', '2025-12-30 07:52:05'),
(219, 'บริษัท รับเบอร์แลนด์โปรดักส์ จำกัด สาขาบึงกาฬ', 'RUBBL', '', 'เลขที่ 98 หมู่ที่ 2 ตำบลโนนสมบูรณ์', 'อำเภอเมืองบึงกาฬ จังหวัดบึงกาฬ 38000', '', '0905531000318', '', 'Branch', '0019', 0, 1, '2025-12-30 07:55:49', '2025-12-30 07:55:49'),
(220, 'บริษัท รับเบอร์แลนด์โปรดักส์ จำกัด สาขาบึงกาฬ', 'RUBBS', '', 'เลขที่ 338 หมู่ 2 ตำบลโนนสมบูรณ์', 'อำเภอเมืองบึงกาฬ จังหวัดบึงกาฬ 38000', '', '0905531000318', '', 'Branch', '0003', 0, 1, '2025-12-30 07:56:58', '2025-12-30 07:56:58'),
(221, 'บริษัท รับเบอร์แลนด์โปรดักส์ จำกัด สาขาบุรีรัมย์', 'RUBBR', '', 'เลขที่ 338 หมู่ 1 ตำบลโคกม้า', 'อำเภอประโคนชัย จังหวัดบุรีรัมย์ 31140', '', '0905531000318', '', 'Branch', '0004', 0, 1, '2025-12-30 07:57:48', '2025-12-30 07:57:48'),
(222, 'บริษัท รับเบอร์แลนด์โปรดักส์ จำกัด สาขาหาดใหญ่', 'RUBHY', '', 'เลขที่ 10 ซอย 10 ถนนเพชรเกษม ตำบลหาดใหญ่', 'อำเภอหาดใหญ่ จังหวัดสงขลา 90110', '', '0905531000318', '', 'Branch', '0001', 0, 1, '2025-12-30 07:58:42', '2025-12-30 07:58:42'),
(223, 'บริษัท ศรีตรัง รับเบอร์ แอนด์ แพลนเทชั่น จำกัด', 'SRP', '', 'เลขที่ 121 หมู่ 4 ตำบลหนองป่าครั่ง', 'อำเภอเมือง จังหวัดเชียงใหม่ 50000', '', '0925550000239', '', 'Head Office', NULL, 0, 1, '2025-12-30 07:59:36', '2025-12-30 07:59:36'),
(224, 'บริษัท ศรีตรังแอโกรอินดัสทรี จำกัด (มหาชน) สาขาเชียงราย', 'AGRCR', '', 'เลขที่ 272 หมู่ที่ 12 ตำบลยางฮอม', 'อำเภอขุนตาล จังหวัดเชียงราย 57340', '', '0107536001656', '', 'Branch', '0060', 0, 1, '2025-12-30 08:01:14', '2025-12-30 08:01:14'),
(225, 'บริษัท ศรีตรังแอโกรอินดัสทรี จำกัด (มหาชน) สาขาเลย', 'AGRLI', '', 'เลขที่ 171/1 หมู่ที่ 4 ตำบลท่าสะอาด', 'อำเภอนาด้วง จังหวัดเลย 42210', '', '0107536001656', '', 'Branch', '0035', 0, 1, '2025-12-30 08:01:55', '2025-12-30 08:01:55'),
(226, 'บริษัท ศรีตรังแอโกรอินดัสทรี จำกัด (มหาชน) สาขาตรัง', 'AGRTG', '', 'เลขที่ 13/1,13/2,13/3,13/4,13/5 ถนนจริงจิตร ตำบลทับเที่ยง', 'อำเภอเมืองตรัง จังหวัดตรัง 92000', '', '0107536001656', '', 'Branch', '0001', 0, 1, '2025-12-30 08:02:50', '2025-12-30 08:02:50'),
(227, 'บริษัท ศรีตรังแอโกรอินดัสทรี จำกัด (มหาชน) สาขานราธิวาส', 'AGRNW', '', 'เลขที่ 88/8 หมู่ 5 ตำบลลุโบะบือซา', 'อำเภอยี่งอ จังหวัดนราธิวาส 96180', '', '0107536001656', '', 'Branch', '0040', 0, 1, '2025-12-30 08:03:36', '2025-12-30 08:03:36'),
(228, 'บริษัท ศรีตรังแอโกรอินดัสทรี จำกัด (มหาชน) สาขาพิษณุโลก', 'AGRPL', '', 'เลขที่ 28 หมู่ที่ 11 ตำบลหนองพระ', 'อำเภอวังทอง จังหวัดพิษณุโลก 65130', '', '0107536001656', '', 'Branch', '0025', 0, 1, '2025-12-30 08:04:25', '2025-12-30 08:04:25'),
(229, 'บริษัท ศรีตรังแอโกรอินดัสทรี จำกัด (มหาชน) สาขาสิเกา', 'AGRSK', '', 'เลขที่ 139 หมู่ที่ 2 ถนนตรัง-สิเกา ตำบลนาเมืองเพชร', 'อำเภอสิเกา จังหวัดตรัง 92000', '', '0107536001656', '', 'Branch', '0011', 0, 1, '2025-12-30 08:05:21', '2026-01-07 09:22:48'),
(230, 'บริษัท ศรีตรังแอโกรอินดัสทรี จำกัด (มหาชน) สาขาอุดรธานี', 'AGRUD', '', 'เลขที่ 328 หมู่ 7 ตำบลหนองนาคำ', 'อำเภอเมืองอุดรธานี จังหวัดอุดรธานี 41000', '', '0107536001656', '', 'Branch', '0020', 0, 1, '2025-12-30 08:06:03', '2025-12-30 08:06:03'),
(231, 'บริษัท ศรีตรังแอโกรอินดัสทรี จำกัด (มหาชน) สาขาอุบลราชธานี', 'AGRUB', '', 'เลขที่ 218 หมู่ที่ 7 ตำบลเมืองศรีไค', 'อำเภอวารินชำราบ จังหวัดอุบลราชธานี 34190', '', '0107536001656', '', 'Branch', '0023', 0, 1, '2025-12-30 08:06:41', '2025-12-30 08:06:41'),
(232, 'บริษัท ศรีตรังโกลฟส์ (ประเทศไทย) จำกัด (มหาชน)', 'STG', '', 'เลขที่ 110 ถนนกาญจนวนิช ตำบลพะตง', 'อำเภอหาดใหญ่ จังหวัดสงขลา 90230', '', '0107562000106', '', 'Head Office', NULL, 0, 1, '2025-12-30 08:08:46', '2025-12-30 08:08:46'),
(233, 'บริษัท ศรีตรังโกลฟส์ (ประเทศไทย) จำกัด (มหาชน) สาขาตรัง', 'STGTG', '', 'เลขที่ 85 หมู่ที่ 6 ตำบลควนธานี', 'อำเภอกันตัง จังหวัดตรัง 92110', '', '0107562000106', '', 'Branch', '0006', 0, 1, '2025-12-30 08:09:29', '2025-12-30 08:09:29'),
(234, 'บริษัท ศรีตรังโกลฟส์ (ประเทศไทย) จำกัด (มหาชน) สาขาสุราษฎร์ธานี', 'STGSR', '', 'เลขที่ 189 หมู่ที่ 7 บ้านเขาไม้แดง ตำบลพลายวาส', 'อำเภอกาญจนดิษฐ์ จังหวัดสุราษฎร์ธานี 84160', '', '0107562000106', '', 'Branch', '0005', 0, 1, '2025-12-30 08:10:07', '2025-12-30 08:10:07'),
(235, 'บริษัท สตาร์ไลท์ เอ็กซ์เพรส ทรานสปอร์ต จำกัด', 'STL', '', '13/1 ถนนจริงจิตร ตำบลทับเที่ยง', 'อำเภอเมืองตรัง จังหวัดตรัง 92000', '', '0925537000018', '', 'Head Office', NULL, 0, 1, '2025-12-30 08:10:55', '2025-12-30 08:10:55'),
(236, 'บริษัท อันวาร์พาราวูด จำกัด', 'ANV', '', '41 หมู่ที่ 3 ตำบลสำนักขาม', 'อำเภอสะเดา จังหวัดสงขลา 90320', '', '0905530000659', '', 'Head Office', NULL, 0, 1, '2025-12-30 08:11:26', '2025-12-30 08:11:26'),
(237, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-02 04:52:35', '2026-01-02 04:52:35'),
(238, 'SEVEN SMILE TOUR AND TICKET', 'SEVEN', 'sevensmiletour@hotmail.com', '33 MAHARAT ROAD SOI 8 PAK NAM', 'MUEANG KRABI 81000', '', NULL, '095-2655516', 'Head Office', NULL, 0, 1, '2026-01-03 06:20:27', '2026-01-03 06:20:27'),
(239, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-03 09:08:48', '2026-01-03 09:08:48'),
(240, 'SAMUI ISLAND RESORT CO., LTD (NAPASAI SAMUI)', 'NAPA', '', '65/10 MOO 5 MAENAM,', 'KOH SAMUI, SURATTHANI 84330', '', NULL, '077-429200', 'Head Office', NULL, 0, 1, '2026-01-05 13:12:34', '2026-01-05 13:12:34'),
(241, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-06 03:01:20', '2026-01-06 03:01:20'),
(242, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-06 12:57:13', '2026-01-06 12:57:13'),
(243, 'บริษัท ศรีตรังแอโกรอินดัสทรี จำกัด (มหาชน) สาขาสกลนคร', 'AGRSN', '', '192 หมู่ที่ 9 ตำบลนาเพียง อำเภอกุสุมาลย์ จ.สกลนคร 47230', '', '', '0107536001656', '', 'Branch', '0051', 0, 1, '2026-01-07 07:53:11', '2026-01-07 07:53:11'),
(244, 'บริษัท ศรีตรังโกลฟส์ (ประเทศไทย) จำกัด (มหาชน)  สาขาชุมพร', 'STGCP', '', '88/8 หมู่ที่ 11 ตำบลเขาไชยราช อำเภอปะทิว จ.ชุมพร 86210', '', '', '0107562000106', '', 'Branch', '0013', 0, 1, '2026-01-07 08:06:49', '2026-01-07 08:06:49'),
(245, 'บริษัท ศรีตรังแอโกรอินดัสทรี จำกัด (มหาชน) สาขาห้วยนาง', 'AGRHN', '', 'เลขที่ 399 หมู่ที่ 7 ตำบลห้วยนาง อำเภอห้วยยอด จังหวัดตรัง 92130', '', '', '0107536001656', '', 'Branch', '0005', 0, 1, '2026-01-07 08:21:33', '2026-01-07 09:24:34'),
(246, 'บริษัท ศรีตรังแอโกรอินดัสทรี จำกัด (มหาชน) สาขากาฬสินธุ์', 'AGRKS', '', 'เลขที่ 218  หมู่ 4  ตำบลไผ่  อำเภอเมืองกาฬสินธุ์  จังหวัดกาฬสินธุ์  46000', '', '', '0107536001656', '', 'Branch', '0031', 0, 1, '2026-01-07 13:32:08', '2026-01-07 13:32:08'),
(247, 'บริษัท ศรีตรังโกลฟส์ (ประเทศไทย) จำกัด (มหาชน) สาขาสะเดา', 'STANV', '', 'เลขที่ 88/8 หมู่ที่ 3 ตำบลสำนักขาม อำเภอสะเดา จังหวัดสงขลา 90320', '', '', '0107562000106', '', 'Branch', '0012', 0, 1, '2026-01-07 14:00:10', '2026-01-07 14:00:10'),
(248, 'บริษัท หน่ำฮั่วรับเบอร์ จำกัด สาขาสะเดา', 'NHR', '', 'เลขที่ 99 หมู่ที่ 3 ตำบลสำนักขาม อำเภอสะเดา จังหวัด สงขลา 90320', '', '', '0905537001448', '', 'Branch', '0001', 0, 1, '2026-01-07 14:09:59', '2026-01-07 14:09:59'),
(249, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-08 08:27:35', '2026-01-08 08:27:35'),
(250, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-08 09:20:46', '2026-01-08 09:20:46'),
(251, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-08 09:21:54', '2026-01-08 09:21:54'),
(252, 'LAMAI COCONUT BEACH RESORT', 'LCO', '', '124/4 MOO 3, KOH SAMUI, SURAT THANI 84310', '', '', NULL, '099-4100810', 'Head Office', NULL, 0, 1, '2026-01-08 10:14:58', '2026-01-08 10:15:28'),
(253, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-08 10:20:36', '2026-01-08 10:20:36'),
(254, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-08 10:34:09', '2026-01-08 10:34:09'),
(255, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-08 10:36:23', '2026-01-08 10:36:23'),
(256, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-08 10:38:07', '2026-01-08 10:38:07'),
(257, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-08 10:39:31', '2026-01-08 10:39:31'),
(258, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-09 05:37:50', '2026-01-09 05:37:50'),
(259, 'บริษัท ศรีตรังโกลฟส์ (ประเทศไทย) จำกัด (มหาชน) สาขากรุงเทพ', 'STBKK', '', 'อาคารอาคารปาร์คเวนเซอร์ อีโคเพล็กซ์ ห้องเลขที่ 1701,1707-1712 ชั้น 17', 'เลขที่ 57 ถนนวิทยุ แขวงลุมพินี เขตปทุมวัน กรุงเทพฯ 10330', '', '0107562000106', '', 'Branch', '0002', 0, 1, '2026-01-09 08:10:43', '2026-01-09 08:10:43'),
(260, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-09 09:24:59', '2026-01-09 09:24:59'),
(261, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-09 09:41:46', '2026-01-09 09:41:46'),
(262, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-09 10:37:37', '2026-01-09 10:37:37'),
(263, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-09 10:39:26', '2026-01-09 10:39:26'),
(264, 'TA TOUR & CAR RENT', 'TAT', '', '59/8 MOO 5 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '087-2634350', 'Head Office', NULL, 0, 1, '2026-01-12 04:14:27', '2026-01-12 04:14:27'),
(265, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-12 09:03:12', '2026-01-12 09:03:12'),
(266, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-13 05:17:38', '2026-01-13 05:17:38'),
(267, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-13 05:23:24', '2026-01-13 05:23:24'),
(268, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-13 05:30:58', '2026-01-13 05:30:58'),
(269, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-13 05:32:29', '2026-01-13 05:32:29'),
(270, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-13 07:23:41', '2026-01-13 07:23:41');
INSERT INTO `customers` (`id`, `name`, `code`, `email`, `address_line1`, `address_line2`, `address_line3`, `id_number`, `phone`, `branch_type`, `branch_number`, `credit_days`, `active`, `created_at`, `updated_at`) VALUES
(271, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-13 08:33:57', '2026-01-13 08:33:57'),
(272, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-13 08:46:25', '2026-01-13 08:46:25'),
(273, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-13 09:29:32', '2026-01-13 09:29:32'),
(274, 'บริษัท ศรีตรังแอโกรอินดัสทรี จำกัด (มหาชน) สาขาสระแก้ว', 'AGRSG', '', 'เลขที่18 หมู่ที่ 5 ตำบลศาลาลำดวน', 'อำเภอเมืองสระแก้ว จังหวัดสระแก้ว 27000', '', '0107536001656', '', 'Branch', '0029', 0, 1, '2026-01-13 09:53:35', '2026-01-13 09:53:35'),
(275, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-14 06:51:29', '2026-01-14 06:51:29'),
(276, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-14 06:53:31', '2026-01-14 06:53:31'),
(277, 'SRI TRANG AYEYAR RUBBER INDUSTRY COMPANY LIMITED', 'STAY', '', '848/1221, KANKALAY PLOT, KYONE PHITE VILLAGE, MUDON TOWNSHIP MAWLAMYINE DISTRICT,', 'MON STATE 12081, MYANMAR', '', NULL, '', 'Head Office', NULL, 0, 1, '2026-01-14 09:54:42', '2026-01-14 09:54:42'),
(278, 'STEJSKAL/KAMIL', 'KAMIL', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-15 03:21:33', '2026-01-15 03:21:33'),
(279, 'BONNY HOTEL', 'BONNY', '', '124/119 HAD LAMAI RD KOH SAMUI  SURATTHANI 84310', '', '', NULL, '089-8661299', 'Head Office', NULL, 0, 1, '2026-01-15 05:41:47', '2026-01-15 05:41:47'),
(280, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-15 09:19:16', '2026-01-15 09:19:16'),
(281, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-15 09:21:59', '2026-01-15 09:21:59'),
(282, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-15 09:24:28', '2026-01-15 09:24:28'),
(283, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-15 09:31:30', '2026-01-15 09:31:30'),
(284, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-15 09:34:26', '2026-01-15 09:34:26'),
(285, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-15 09:35:58', '2026-01-15 09:35:58'),
(286, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-15 09:49:18', '2026-01-15 09:49:18'),
(287, 'KHOK KLOI TRAVEL CENTER CO.,LTD.', 'KHOK', 'khokkloi_trvl@hotmail.com', '4/69 MOO 1 PHETKASEM ROAD  KHOK KLOI', 'TAKUA THUNG  PHANG NGA 82140', '', '0835543000408', '064-4196326', 'Head Office', NULL, 0, 1, '2026-01-16 07:30:22', '2026-02-06 12:26:07'),
(288, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-16 08:28:03', '2026-01-16 08:28:03'),
(289, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-19 07:09:29', '2026-01-19 07:09:29'),
(290, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-19 07:14:02', '2026-01-19 07:14:02'),
(291, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-19 10:05:05', '2026-01-19 10:05:05'),
(292, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-20 10:05:38', '2026-01-20 10:05:38'),
(293, 'J AND K', 'JKT', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 0, '2026-01-21 07:04:16', '2026-01-22 10:13:25'),
(294, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-23 09:20:54', '2026-01-23 09:20:54'),
(295, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-23 09:28:49', '2026-01-23 09:28:49'),
(296, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-23 09:37:58', '2026-01-23 09:37:58'),
(297, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-23 09:44:58', '2026-01-23 09:44:58'),
(298, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-23 09:47:41', '2026-01-23 09:47:41'),
(299, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-23 09:49:54', '2026-01-23 09:49:54'),
(300, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-23 11:51:36', '2026-01-23 11:51:36'),
(301, 'KB SAMUI CO., LTD.', 'KBS', 'reservation@79samui.com', '51/4 MOO 4 BOPHUT  KOH SAMUI  SURATTHANI 84320', '', '', '0105565120127', '077-427799', 'Branch', '0001', 0, 1, '2026-01-24 14:58:52', '2026-01-24 14:58:52'),
(302, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-26 09:58:09', '2026-01-26 09:58:09'),
(303, 'ENJOY 4 TRAVEL', 'ENJOY', '', '101/4 MOO 2  BOPHUT  KOH SAMUI  SURATTHANI 84320', '', '', NULL, '081-0808185', 'Head Office', NULL, 0, 1, '2026-01-27 07:45:29', '2026-01-27 07:45:29'),
(304, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-27 07:59:07', '2026-01-27 07:59:07'),
(305, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-27 08:01:02', '2026-01-27 08:01:02'),
(306, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-27 09:17:28', '2026-01-27 09:17:28'),
(307, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-28 10:51:21', '2026-01-28 10:51:21'),
(308, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-28 10:53:21', '2026-01-28 10:53:21'),
(309, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-28 11:01:08', '2026-01-28 11:01:08'),
(310, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-28 11:08:11', '2026-01-28 11:08:11'),
(311, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-28 11:20:33', '2026-01-28 11:20:33'),
(312, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-28 11:22:47', '2026-01-28 11:22:47'),
(313, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-28 11:23:58', '2026-01-28 11:23:58'),
(314, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-29 04:02:50', '2026-01-29 04:02:50'),
(315, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-29 05:44:16', '2026-01-29 05:44:16'),
(316, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-29 10:00:44', '2026-01-29 10:00:44'),
(317, 'MALCON PROPERTY CO.,LTD.', 'FIGHT', '', '26/1-3 MOO 3 MARET  KOH SAMUI  SURATTHANI  84310', '', '', '0105551042391', '077-424008', 'Branch', '00001', 0, 1, '2026-01-30 02:14:00', '2026-01-30 02:14:00'),
(318, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-30 02:48:12', '2026-01-30 02:48:12'),
(319, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-30 03:48:03', '2026-01-30 03:48:03'),
(320, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-30 09:04:25', '2026-01-30 09:04:25'),
(321, 'TOOK\'S PLACE KOH PHAYAM', 'TOOK', 'tookta_2000@hotmail.com', '5/27 MOO 1  KOH PHAYAM RANONG 85000', '', '', NULL, '087-0609360', 'Head Office', NULL, 0, 1, '2026-01-30 09:28:17', '2026-01-30 09:28:17'),
(322, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-01-31 09:16:51', '2026-01-31 09:16:51'),
(323, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-02-01 04:42:53', '2026-02-01 04:42:53'),
(324, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-02-02 06:42:17', '2026-02-02 06:42:17'),
(325, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-02-02 06:48:14', '2026-02-02 06:48:14'),
(326, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-02-02 06:57:15', '2026-02-02 06:57:15'),
(327, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-02-02 10:08:44', '2026-02-02 10:08:44'),
(328, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-02-03 09:32:14', '2026-02-03 09:32:14'),
(329, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-02-03 09:35:13', '2026-02-03 09:35:13'),
(330, 'T-SABAR', 'TSAB', '', 'BANGKOK', '', '', NULL, '081-7877398', 'Head Office', NULL, 0, 1, '2026-02-03 10:41:06', '2026-02-03 10:41:06'),
(331, 'GOLD SUPERRICH MONEY EXCHANGE AND TOUR', 'GSR', 'goldsuperrich.tour@gmail.com', '35/1 MOO 1 KOH PHANGAN SURATTHANI 84280', '', '', NULL, '098-0239099', 'Head Office', NULL, 0, 1, '2026-02-03 11:18:53', '2026-02-03 11:18:53'),
(332, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-02-03 14:33:16', '2026-02-03 14:33:16'),
(333, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-02-03 14:37:32', '2026-02-03 14:37:32'),
(334, 'SUPERPRO SAMUI', 'SUPER', 'info@superprosamui.com', '48/10 MOO 3 BOPHUT KOH SAMUI SURATTHANI 84320', '', '', NULL, '077-414393', 'Head Office', NULL, 0, 1, '2026-02-04 03:12:51', '2026-02-04 03:12:51'),
(335, 'NICE TRAVEL', 'NICE', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-02-04 08:51:57', '2026-02-04 08:51:57'),
(336, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-02-04 11:24:04', '2026-02-04 11:24:04'),
(337, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-02-06 10:28:07', '2026-02-06 10:28:07'),
(338, 'WALK IN', 'WKIN', NULL, '', NULL, NULL, NULL, '', 'Head Office', NULL, 0, 1, '2026-02-06 10:29:23', '2026-02-06 10:29:23');

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

--
-- Dumping data for table `information`
--

INSERT INTO `information` (`id`, `category`, `code`, `name`, `phone`, `active`, `created_at`, `type`, `numeric_code`, `is_domestic`) VALUES
(12, 'airline', 'TG', 'THAI AIRWAYS', NULL, 1, '2025-05-06 20:16:45', 'Airline', '217', 1),
(13, 'airline', 'PG', 'BANGKOK AIRWAYS', NULL, 1, '2025-05-06 20:16:45', 'Airline', '829', 1),
(14, 'airline', 'FD', 'THAI AIRASIA', NULL, 1, '2025-05-06 20:16:45', 'Airline', '900', 1),
(15, 'airline', 'DD', 'NOK AIR', NULL, 1, '2025-05-06 20:16:45', 'Airline', '596', 1),
(16, 'airline', 'SL', 'LION AIR', NULL, 1, '2025-05-06 20:16:45', 'Airline', '310', 1),
(17, 'supplier-other', 'PAN', 'PHANTIP', NULL, 0, '2025-05-08 21:34:15', 'Other', NULL, 1),
(18, 'airline', 'MU', 'CHINA EASTERN AIRLINES', NULL, 1, '2025-05-12 03:16:04', 'Airline', '781', 1),
(19, 'airline', 'DF', 'FFF', NULL, 0, '2025-05-15 08:29:26', 'Airline', NULL, 1),
(20, 'supplier-other', 'TETS', 'DDDD', NULL, 0, '2025-05-15 08:30:26', 'Other', NULL, 1),
(21, 'airline', 'KD', 'KINGDOM', NULL, 0, '2025-05-16 04:41:46', 'Airline', '555', 1),
(22, 'airline', 'ET', 'ETHIOPIAN AIRLINES', NULL, 1, '2025-06-02 02:16:17', 'Airline', '071', 1),
(23, 'airline', 'GF', 'GULF AIR', NULL, 1, '2025-06-02 02:16:47', 'Airline', '072', 1),
(24, 'airline', 'JL', 'JAPAN AIRLINES', NULL, 1, '2025-06-02 02:17:11', 'Airline', '131', 1),
(25, 'airline', 'AM', 'AERO MEXICO', NULL, 1, '2025-06-02 02:17:50', 'Airline', '139', 1),
(26, 'airline', 'QR', 'QATAR AIRWAYS', NULL, 1, '2025-06-02 02:18:09', 'Airline', '157', 1),
(27, 'airline', 'CX', 'CATHAY PACIFIC', NULL, 1, '2025-06-02 02:18:44', 'Airline', '160', 1),
(28, 'airline', 'HR', 'HAHN AIR', NULL, 1, '2025-06-02 02:19:09', 'Airline', '169', 1),
(29, 'airline', 'EK', 'EMIRATES', NULL, 1, '2025-06-02 02:19:43', 'Airline', '176', 1),
(30, 'airline', 'LH', 'LUFTHANSA', NULL, 1, '2025-06-02 02:20:01', 'Airline', '220', 1),
(31, 'airline', 'QV', 'LAO AIRLINES', NULL, 1, '2025-06-02 02:20:27', 'Airline', '627', 1),
(32, 'airline', 'BR', 'EVA AIRWAYS', NULL, 1, '2025-06-02 02:20:50', 'Airline', '695', 1),
(33, 'airline', 'HX', 'HONG KONG AIRLINES', NULL, 1, '2025-06-02 02:21:07', 'Airline', '851', 1),
(34, 'airline', 'WY', 'OMAN AIR', NULL, 1, '2025-06-02 02:56:10', 'Airline', '910', 1),
(35, 'airline', 'LX', 'SWISS', NULL, 1, '2025-06-03 01:01:18', 'Airline', '724', 1),
(36, 'airline', 'OS', 'AUSTRIAN AIRLINES', NULL, 1, '2025-06-03 01:02:00', 'Airline', '257', 1),
(37, 'airline', '3U', 'SICHUAN AIRLINES', NULL, 1, '2025-06-03 01:02:53', 'Airline', '876', 1),
(38, 'airline', '7C', 'JEJU AIR', NULL, 1, '2025-06-03 01:03:13', 'Airline', '806', 1),
(39, 'airline', '8M', 'MYANMAR AIRWAYS INTL', NULL, 1, '2025-06-03 01:03:42', 'Airline', '599', 1),
(40, 'airline', 'AA', 'AMERICAN AIRLINES', NULL, 1, '2025-06-03 01:04:14', 'Airline', '001', 1),
(41, 'airline', 'AC', 'AIR CANADA', NULL, 1, '2025-06-03 01:04:55', 'Airline', '014', 1),
(42, 'airline', 'AF', 'AIR FRANCE', NULL, 1, '2025-06-03 01:05:14', 'Airline', '057', 1),
(43, 'airline', 'AI', 'AIR INDIA', NULL, 1, '2025-06-03 01:05:35', 'Airline', '098', 1),
(44, 'airline', 'AY', 'FINNAIR', NULL, 1, '2025-06-03 01:06:00', 'Airline', '105', 1),
(45, 'airline', 'AZ', 'ITA AIRWAYS', NULL, 1, '2025-06-03 01:06:19', 'Airline', '055', 1),
(46, 'airline', 'BA', 'BRITISHS AIRWAYS', NULL, 1, '2025-06-03 01:06:46', 'Airline', '125', 1),
(47, 'airline', 'BG', 'BIMAN BANGLADESH AIRLINES', NULL, 1, '2025-06-03 01:07:13', 'Airline', '997', 1),
(48, 'airline', 'BI', 'ROYAL BRUNEI', NULL, 1, '2025-06-03 01:07:37', 'Airline', '672', 1),
(49, 'airline', 'CA', 'AIR CHINA', NULL, 1, '2025-06-03 01:07:54', 'Airline', '999', 1),
(50, 'airline', 'CI', 'CHINA AIRLINES', NULL, 1, '2025-06-03 01:08:27', 'Airline', '297', 1),
(51, 'airline', 'CZ', 'CHINA SOUTHERN AIRLINES', NULL, 1, '2025-06-03 01:08:55', 'Airline', '784', 1),
(52, 'airline', 'DL', 'DELTA AIRLINES', NULL, 1, '2025-06-03 01:09:15', 'Airline', '006', 1),
(53, 'airline', 'EY', 'ETIHAD AIRWAYS', NULL, 1, '2025-06-03 01:09:48', 'Airline', '607', 1),
(54, 'airline', 'FJ', 'FIJI AIRWAYS', NULL, 1, '2025-06-03 01:10:19', 'Airline', '260', 1),
(55, 'airline', 'GA', 'GARUDA INDONESIA', NULL, 1, '2025-06-03 01:10:42', 'Airline', '126', 1),
(56, 'airline', 'HA', 'HAWAIIAN AIRLINES', NULL, 1, '2025-06-03 01:11:15', 'Airline', '173', 1),
(57, 'airline', 'HM', 'AIR SEYCHELLES', NULL, 1, '2025-06-03 01:11:45', 'Airline', '061', 1),
(58, 'airline', 'HO', 'JUNEYAO AIRLINES', NULL, 1, '2025-06-03 01:12:06', 'Airline', '018', 1),
(59, 'airline', 'HU', 'HAINAN AIRLINES', NULL, 1, '2025-06-03 01:12:43', 'Airline', '880', 1),
(60, 'airline', 'JJ', 'LATAM AIRLINES BRASIL', NULL, 1, '2025-06-03 01:13:42', 'Airline', '957', 1),
(61, 'airline', 'JX', 'STARLUX AIRLINES', NULL, 1, '2025-06-03 01:14:12', 'Airline', '189', 1),
(62, 'airline', 'K6', 'AIR CAMBODIA', NULL, 1, '2025-06-03 01:14:56', 'Airline', '188', 1),
(63, 'airline', 'KC', 'AIR ASTANA', NULL, 1, '2025-06-03 01:15:21', 'Airline', '465', 1),
(64, 'airline', 'KE', 'KOREAN AIR', NULL, 1, '2025-06-03 01:15:44', 'Airline', '180', 1),
(65, 'airline', 'KL', 'KLM ROYAL DUTCH', NULL, 1, '2025-06-03 01:16:08', 'Airline', '074', 1),
(66, 'airline', 'KQ', 'KENYA AIRWAYS', NULL, 1, '2025-06-03 01:16:31', 'Airline', '706', 1),
(67, 'airline', 'KU', 'KUWAIT AIRWAYS', NULL, 1, '2025-06-03 01:16:55', 'Airline', '229', 1),
(68, 'airline', 'LY', 'EL AL ISRAEL', NULL, 1, '2025-06-03 01:17:47', 'Airline', '114', 1),
(69, 'airline', 'MD', 'MADAGASCAR AIRLINES', NULL, 1, '2025-06-03 01:18:20', 'Airline', '258', 1),
(70, 'airline', 'MF', 'XIAMEN AIRLINES', NULL, 1, '2025-06-03 01:18:50', 'Airline', '731', 1),
(71, 'airline', 'MH', 'MALAYSIA AIRLINES', NULL, 1, '2025-06-03 01:19:21', 'Airline', '232', 1),
(72, 'airline', 'MS', 'EGYPT AIR', NULL, 1, '2025-06-03 01:19:41', 'Airline', '077', 1),
(73, 'airline', 'NX', 'AIR MACAU', NULL, 1, '2025-06-03 01:20:02', 'Airline', '675', 1),
(74, 'airline', 'NZ', 'AIR NEW ZEALAND', NULL, 1, '2025-06-03 01:20:26', 'Airline', '086', 1),
(75, 'airline', 'OM', 'MIAT MONGOLIAN', NULL, 1, '2025-06-03 01:21:43', 'Airline', '289', 1),
(76, 'airline', 'AT', 'ROYAL AIR MOROC', NULL, 1, '2025-06-03 01:22:35', 'Airline', '147', 1),
(77, 'airline', 'AK', 'AIR ASIA', NULL, 1, '2025-06-03 01:23:08', 'Airline', '807', 1),
(78, 'airline', 'XJ', 'THAI AIRASIA X', NULL, 1, '2025-06-03 01:23:41', 'Airline', '940', 1),
(79, 'airline', 'E9', 'IBEROJET AIRLINES', NULL, 1, '2025-06-03 01:25:11', 'Airline', '783', 1),
(80, 'airline', 'BS', 'US BANGLA AIRLINES', NULL, 1, '2025-06-03 01:26:13', 'Airline', '779', 1),
(81, 'airline', 'FZ', 'FLYDUBAI', NULL, 1, '2025-06-03 01:26:30', 'Airline', '141', 1),
(82, 'airline', 'B3', 'BHUTAN AIRLINES', NULL, 1, '2025-06-03 01:27:02', 'Airline', '786', 1),
(83, 'airline', 'DE', 'CONDOR', NULL, 1, '2025-06-03 01:27:27', 'Airline', '881', 1),
(84, 'airline', 'GP', 'APG AIRLINES', NULL, 1, '2025-06-03 01:32:12', 'Airline', '275', 1),
(85, 'airline', 'HB', 'GREATER BAY AIRLINES', NULL, 1, '2025-06-03 01:32:36', 'Airline', '283', 1),
(86, 'airline', 'HY', 'UZBEKISTAN AIRWAYS', NULL, 1, '2025-06-03 01:33:20', 'Airline', '250', 1),
(87, 'airline', 'ID', 'BATIK AIR INDONESIA', NULL, 1, '2025-06-03 01:33:43', 'Airline', '938', 1),
(88, 'airline', 'KR', 'CAMBODIA AIRWAYS', NULL, 1, '2025-06-03 01:34:15', 'Airline', '733', 1),
(89, 'airline', 'LJ', 'JIN AIR', NULL, 1, '2025-06-03 01:34:33', 'Airline', '718', 1),
(90, 'airline', 'LT', 'LOT POLISH', NULL, 1, '2025-06-03 01:35:00', 'Airline', '080', 1),
(91, 'airline', 'MK', 'AIR MAURITIUS', NULL, 1, '2025-06-03 01:35:47', 'Airline', '239', 1),
(92, 'airline', 'NS', 'HEBEI AIRLINES', NULL, 1, '2025-06-03 01:36:40', 'Airline', '836', 1),
(93, 'airline', 'OD', 'BATIK AIR MALAYSIA', NULL, 1, '2025-06-03 01:37:01', 'Airline', '816', 1),
(94, 'airline', 'OZ', 'ASIANA AIRLINES', NULL, 1, '2025-06-03 01:37:24', 'Airline', '988', 1),
(95, 'airline', 'PR', 'PHILIPPINE AIRLINES', NULL, 1, '2025-06-03 01:38:01', 'Airline', '079', 1),
(96, 'airline', 'QF', 'QANTAS AIRWAYS', NULL, 1, '2025-06-03 01:38:23', 'Airline', '081', 1),
(97, 'airline', 'RA', 'NEPAL AIRLINES', NULL, 1, '2025-06-03 01:39:09', 'Airline', '285', 1),
(98, 'airline', 'RJ', 'ROYAL JORDANIAN', NULL, 1, '2025-06-03 01:39:25', 'Airline', '512', 1),
(99, 'airline', 'SB', 'AIRCALIN', NULL, 1, '2025-06-03 01:39:42', 'Airline', '063', 1),
(100, 'airline', 'SC', 'SHANDONG AIRLINES', NULL, 1, '2025-06-03 01:40:08', 'Airline', '324', 1),
(101, 'airline', 'SQ', 'SINGAPORE AIRLINES', NULL, 1, '2025-06-03 01:40:32', 'Airline', '618', 1),
(102, 'airline', 'SV', 'SAUDI ARABIAN AIRLINES', NULL, 1, '2025-06-03 01:40:52', 'Airline', '065', 1),
(103, 'airline', 'S7', 'SIBERIA AIRLINES', NULL, 1, '2025-06-03 01:41:16', 'Airline', '421', 1),
(104, 'airline', 'TK', 'TURKISH AIRLINES', NULL, 1, '2025-06-03 01:41:54', 'Airline', '235', 1),
(105, 'airline', 'TP', 'TAP PORTUGAL', NULL, 1, '2025-06-03 01:42:23', 'Airline', '047', 1),
(106, 'airline', 'TR', 'SCOOT', NULL, 1, '2025-06-03 01:42:41', 'Airline', '668', 1),
(107, 'airline', 'TV', 'TIBET AIRLINES', NULL, 1, '2025-06-03 01:43:02', 'Airline', '088', 1),
(108, 'airline', 'TW', 'TWAY AIR', NULL, 1, '2025-06-03 01:43:24', 'Airline', '722', 1),
(109, 'airline', 'UA', 'UNITED AIRLINES', NULL, 1, '2025-06-03 01:43:39', 'Airline', '016', 1),
(110, 'airline', 'UL', 'SRILANKAN AIRLINES', NULL, 1, '2025-06-03 01:44:08', 'Airline', '603', 1),
(111, 'airline', 'UO', 'HONG KONG EXPRESS', NULL, 1, '2025-06-03 01:44:26', 'Airline', '128', 1),
(112, 'airline', 'UU', 'AIR AUSTRAL', NULL, 1, '2025-06-03 01:44:42', 'Airline', '760', 1),
(113, 'airline', 'UX', 'AIR EUROPA', NULL, 1, '2025-06-03 01:44:58', 'Airline', '996', 1),
(114, 'airline', 'VN', 'VIETNAM AIRLINES', NULL, 1, '2025-06-03 01:45:33', 'Airline', '738', 1),
(115, 'airline', 'W2', 'FLEXFLIGHT', NULL, 1, '2025-06-03 01:45:52', 'Airline', '365', 1),
(116, 'airline', 'W5', 'MAHAN AIR', NULL, 1, '2025-06-03 01:46:20', 'Airline', '537', 1),
(117, 'airline', 'YP', 'AIR PREMIA', NULL, 1, '2025-06-03 01:46:38', 'Airline', '350', 1),
(118, 'airline', 'ZE', 'EASTAR JET', NULL, 1, '2025-06-03 01:46:58', 'Airline', '839', 1),
(119, 'airline', '6E', 'INDIGO', NULL, 1, '2025-06-03 01:47:31', 'Airline', '312', 1),
(120, 'airline', 'VZ', 'THAI VIETJET AIR', NULL, 1, '2025-06-03 01:48:12', 'Airline', '863', 1),
(121, 'airline', 'VJ', 'VIETJET AIR', NULL, 1, '2025-06-03 01:48:32', 'Airline', '978', 1),
(122, 'airline', 'ZH', 'SHENZHEN AIRLINES', NULL, 1, '2025-06-03 01:49:17', 'Airline', '479', 1),
(123, 'airline', '9C', 'SPRING AIRLINES', NULL, 1, '2025-06-03 01:50:21', 'Airline', '089', 1),
(124, 'airline', 'JQ', 'JETSTAR', NULL, 1, '2025-06-03 01:50:40', 'Airline', '041', 1),
(125, 'airline', 'QZ', 'AIRASIA INDONESIA', NULL, 1, '2025-06-03 01:51:21', 'Airline', '975', 1),
(126, 'airline', 'KT', 'AIRASIA CAMBODIA', NULL, 1, '2025-06-03 01:51:43', 'Airline', '263', 1),
(127, 'airline', 'IX', 'AIR INDIA EXPRESS', NULL, 1, '2025-06-03 01:52:30', 'Airline', '000', 1),
(128, 'airline', '5J', 'CEBU PACIFIC', NULL, 1, '2025-06-03 01:53:13', 'Airline', '203', 1),
(129, 'airline', 'Z2', 'PHILIPPINES AIRASIA', NULL, 1, '2025-06-03 01:53:40', 'Airline', '457', 1),
(130, 'airline', 'QH', 'BAMBOO AIRWAYS', NULL, 1, '2025-06-03 01:54:31', 'Airline', '926', 1),
(131, 'airline', 'MM', 'PEACH AVIATION', NULL, 1, '2025-06-03 01:54:48', 'Airline', '697', 1),
(132, 'airline', 'ZG', 'ZIPAIR', NULL, 1, '2025-06-03 01:55:31', 'Airline', '000', 1),
(133, 'airline', 'FY', 'FIREFLY', NULL, 1, '2025-06-03 01:56:42', 'Airline', '918', 1),
(134, 'airline', 'SG', 'SPICEJET', NULL, 1, '2025-06-03 01:57:11', 'Airline', '775', 1),
(135, 'airline', 'OV', 'SALAM AIR', NULL, 1, '2025-06-03 01:57:48', 'Airline', '960', 1),
(136, 'airline', 'G9', 'AIR ARABIA', NULL, 1, '2025-06-03 01:58:05', 'Airline', '514', 1),
(137, 'airline', 'DZ', 'DONGHAI AIRLINES', NULL, 1, '2025-06-03 01:59:59', 'Airline', '893', 1),
(138, 'airline', 'D7', 'AIRASIA X', NULL, 1, '2025-06-03 02:01:23', 'Airline', '843', 1),
(139, 'airline', '3K', 'JETSTAR ASIA', NULL, 0, '2025-06-03 02:27:06', 'Airline', '375', 1),
(140, 'supplier-other', 'LOM', 'LOMPRAYAH HIGH SPEED CATAMARAN', '077-950700', 1, '2025-06-03 02:28:10', 'Other', NULL, 1),
(141, 'supplier-other', 'EXP', 'EXPEDIA', NULL, 1, '2025-06-03 02:28:23', 'Other', NULL, 1),
(142, 'supplier-other', 'TBO', 'TBO HOLIDAYS', NULL, 1, '2025-06-03 02:30:26', 'Other', NULL, 1),
(143, 'supplier-other', 'AGO', 'AGODA', NULL, 1, '2025-06-03 02:30:45', 'Other', NULL, 1),
(144, 'supplier-other', 'REZ', 'REZLIVE', NULL, 1, '2025-06-03 02:32:05', 'Other', NULL, 1),
(145, 'airline', 'FI', 'ICELANDAIR', NULL, 1, '2025-06-03 20:41:20', 'Airline', '108', 1),
(146, 'airline', 'NH', 'ALL NIPPON AIRWAYS', NULL, 1, '2025-06-04 20:16:47', 'Airline', '205', 1),
(147, 'airline', 'TST', 'TESTDATABASE9999', NULL, 1, '2025-08-03 14:48:25', 'AIRLINE', '999', 1),
(148, 'airline', 'T8T', 'TESTDATABASE2', NULL, 0, '2025-08-03 14:50:23', 'AIRLINE', '898', 1),
(149, 'airline', 'DE', 'FFFFFFf', NULL, 0, '2025-08-03 15:34:41', 'Airline', '105', 1),
(150, 'supplier-other', 'PAN', 'PHANTIP TRAVEL', '096-6515297', 1, '2025-08-25 10:02:56', 'Other', NULL, 1),
(151, 'AIRLINE', 'DS', 'TESTETSTE', NULL, 0, '2025-09-15 10:45:34', 'AIRLINE', '111', 1),
(152, 'SUPPLIER-OTHER', 'TOKIO', 'TOKIO MARINE INSURANCE GROUP', NULL, 1, '2025-09-29 07:38:44', 'OTHER', NULL, 1),
(153, 'AIRLINE', 'FM', 'SHANGHA AIRLINES', NULL, 0, '2025-10-06 02:59:07', 'AIRLINE', '774', 1),
(154, 'AIRLINE', 'FM', 'SHANGHA AIRLINES', NULL, 0, '2025-10-06 02:59:07', 'AIRLINE', '774', 1),
(155, 'AIRLINE', 'FM', 'SHANGHA AIRLINES', NULL, 0, '2025-10-06 02:59:07', 'AIRLINE', '774', 1),
(156, 'AIRLINE', 'FM', 'SHANGHA AIRLINES', NULL, 1, '2025-10-06 02:59:07', 'AIRLINE', '774', 1),
(157, 'SUPPLIER-OTHER', 'TRAIN', 'STATE RAILWAY OF THAILAND', NULL, 1, '2025-10-06 03:43:51', 'OTHER', NULL, 1),
(158, 'SUPPLIER-OTHER', 'AMA', 'AMADEUS SYSTEM', NULL, 1, '2025-10-08 09:51:42', 'OTHER', NULL, 1),
(159, 'SUPPLIER-OTHER', 'ZEGO', 'ZEGO TRAVEL', NULL, 1, '2025-10-08 10:24:30', 'OTHER', NULL, 1),
(160, 'SUPPLIER-OTHER', 'PGW', 'BANGKOK AIRWAY WEBSITE', NULL, 0, '2025-10-08 10:39:29', 'OTHER', NULL, 1),
(161, 'SUPPLIER-OTHER', 'HKG', 'LAND HONGKONG (OASI TRAVEL)', NULL, 1, '2025-10-13 11:01:05', 'OTHER', NULL, 1),
(162, 'SUPPLIER-OTHER', 'ITRV', 'ITRAVELS CENTER', NULL, 1, '2025-11-06 05:11:34', 'OTHER', NULL, 1),
(163, 'SUPPLIER-OTHER', 'RATE', 'RATEHAWK', NULL, 1, '2025-11-06 05:22:03', 'OTHER', NULL, 1),
(164, 'supplier-other', 'PTN', 'PTN INSURANCE BROCKER CO.,LTD', NULL, 1, '2025-12-02 10:03:44', 'OTHER', NULL, 1),
(165, 'supplier-other', 'SSS', 'Test', '0999999999', 0, '2025-12-04 17:02:40', 'VOUCHER', '999', 1),
(166, 'supplier-other', 'VTN', 'VISA VIETNAM', NULL, 1, '2025-12-23 10:39:10', 'OTHER', NULL, 1),
(167, 'SUPPLIER-OTHER', 'IND', 'VISA INDIA', NULL, 1, '2025-12-23 10:39:29', 'OTHER', NULL, 1),
(168, 'SUPPLIER-OTHER', 'UAE', 'VISA UAE', NULL, 1, '2025-12-25 03:08:25', 'OTHER', NULL, 1),
(169, 'supplier-other', 'PIM', 'PHANGAN SKYWAYINTER GROUP', NULL, 1, '2026-01-03 06:15:02', 'Other', NULL, 1),
(170, 'supplier-other', 'SUN', 'MEEPIANG TRANSFER', NULL, 1, '2026-01-03 06:22:07', 'Other', NULL, 1),
(171, 'supplier-other', 'SRC', 'BANGKOK AIRWAYS', NULL, 1, '2026-01-09 10:56:48', 'OTHER', NULL, 1),
(172, 'AIRLINE', 'SU', 'AEROFLOT', NULL, 1, '2026-02-03 09:22:43', 'AIRLINE', '555', 1);

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
-- Table structure for table `payment_groups`
--

CREATE TABLE `payment_groups` (
  `id` int(11) NOT NULL,
  `group_id` varchar(50) NOT NULL COMMENT 'Payment Group ID (เช่น PG-2026-01-09-001)',
  `booking_type` enum('flight','voucher','other','deposit') NOT NULL,
  `booking_id` int(11) NOT NULL,
  `is_master` tinyint(1) DEFAULT 0 COMMENT '1=PO หลัก (ที่สร้าง group), 0=PO ที่ถูก link เข้ามา',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Payment Groups - เก็บ PO ที่ link กัน';

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

--
-- Dumping data for table `tickets_detail`
--

INSERT INTO `tickets_detail` (`id`, `total_price`, `issue_date`, `due_date`, `credit_days`, `created_at`, `updated_at`, `bookings_ticket_id`, `subtotal_before_vat`, `extras_total`, `pricing_total`, `vat_amount`, `vat_percent`, `grand_total`) VALUES
(1061, 3000.00, '2026-02-11', '2026-02-20', 9, '2026-02-11 02:12:40', '2026-02-11 02:12:40', 1, 3000.00, 0.00, 3000.00, 0.00, 0.00, 3000.00);

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

--
-- Dumping data for table `tickets_passengers`
--

INSERT INTO `tickets_passengers` (`id`, `passenger_name`, `age`, `ticket_number`, `ticket_code`, `created_at`, `updated_at`, `bookings_ticket_id`) VALUES
(3039, 'LAY', 'ADT', '829', '84455', '2026-02-11 02:12:40', '2026-02-11 02:12:40', 1);

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

--
-- Dumping data for table `tickets_pricing`
--

INSERT INTO `tickets_pricing` (`id`, `bookings_ticket_id`, `adult_net_price`, `adult_sale_price`, `adult_pax`, `adult_total`, `child_net_price`, `child_sale_price`, `child_pax`, `child_total`, `infant_net_price`, `infant_sale_price`, `infant_pax`, `infant_total`, `subtotal_amount`, `vat_percent`, `vat_amount`, `total_amount`, `created_at`, `updated_at`) VALUES
(1038, 1, 2000.00, 3000.00, 1, 3000.00, 0.00, 0.00, 0, 0.00, 0.00, 0.00, 0, 0.00, 3000.00, 0.00, 0.00, 3000.00, '2026-02-11 02:12:40', '2026-02-11 02:12:40');

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

--
-- Dumping data for table `tickets_routes`
--

INSERT INTO `tickets_routes` (`id`, `bookings_ticket_id`, `flight_number`, `rbd`, `date`, `origin`, `destination`, `departure_time`, `arrival_time`, `created_at`, `updated_at`) VALUES
(2573, 1, 'PG885', 'Y', '12MAR', 'BKK', 'KBV', '12.00', '15.00', '2026-02-11 02:12:40', '2026-02-11 02:12:40');

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
  `remark` text DEFAULT NULL COMMENT 'หมายเหตุ free text แสดงใน Invoice และ Receipt',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `ticket_additional_info`
--

INSERT INTO `ticket_additional_info` (`id`, `bookings_ticket_id`, `company_payment_method`, `company_payment_details`, `customer_payment_method`, `customer_payment_details`, `code`, `ticket_type`, `ticket_type_details`, `remark`, `created_at`, `updated_at`) VALUES
(1059, 1, NULL, NULL, NULL, NULL, 'REIDF888', NULL, NULL, 'LSDF;ASJFKJLAS;FJKL;AJSDF', '2026-02-11 02:12:40', '2026-02-11 02:12:40');

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

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `fullname`, `email`, `role`, `active`, `created_at`, `updated_at`, `last_login`) VALUES
(1, 'Test', 'Test123', 'TEST', 'Test@gmail.com', 'viewer', 1, '2025-05-04 11:05:51', '2025-10-19 08:25:03', '2025-10-19 08:25:03'),
(2, 'admin', '01112567', 'ADMIN USER', 'admin@samuilookbooking.com', 'admin', 1, '2025-05-04 10:41:09', '2026-02-10 07:54:35', '2026-02-10 07:54:35'),
(3, 'Pnong88', 'samuilook88', 'Nisarat ', 'samuilook@gmail.com', 'admin', 1, '2025-05-06 20:38:46', '2026-01-28 12:03:30', '2026-01-28 12:03:30'),
(4, 'Nabe', 'nabe1177', 'Watanabe', 'samuilook@yahoo.com', 'admin', 1, '2025-05-16 05:32:28', '2026-01-25 10:13:35', '2026-01-25 10:13:35'),
(5, 'Tuk', 'Tuk1234', 'Thanyathorn', 'usmlook@yahoo.com.sg', 'manager', 1, '2025-09-19 07:50:20', '2026-01-13 01:49:36', '2026-01-13 01:49:36'),
(6, 'Fung', 'Fung1234', 'Somsri ', 'samuilook.s@gmail.com', 'manager', 1, '2025-10-06 11:06:52', '2026-01-23 10:01:08', '2026-01-23 10:01:08'),
(7, 'Nuan', 'Nuan1234', 'Nuanchan', 'samuilook.n@gmail.com', 'manager', 1, '2025-10-06 11:07:52', '2025-12-11 13:49:41', '2025-12-08 03:30:05');

-- --------------------------------------------------------

--
-- Stand-in structure for view `view_daily_report_all`
-- (See below for the actual view)
--
CREATE TABLE `view_daily_report_all` (
`booking_type` varchar(15)
,`booking_id` int(11)
,`create_date` date
,`created_at` datetime /* mariadb-5.3 */
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
,`ticket_type_details` longtext
,`ticket_numbers` longtext
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
,`created_at` datetime /* mariadb-5.3 */
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
,`ticket_type_details` mediumtext
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
,`created_at` datetime /* mariadb-5.3 */
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
,`ticket_type_details` char(0)
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
,`created_at` datetime /* mariadb-5.3 */
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
,`ticket_type_details` char(0)
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
-- Indexes for table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_module_record` (`module`,`record_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_reference_number` (`reference_number`);

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
-- Indexes for table `booking_payment_details`
--
ALTER TABLE `booking_payment_details`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_payment` (`booking_type`,`booking_id`,`payment_index`),
  ADD KEY `idx_booking` (`booking_type`,`booking_id`),
  ADD KEY `idx_payment_group_id` (`payment_group_id`);

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
-- Indexes for table `payment_groups`
--
ALTER TABLE `payment_groups`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_po_in_group` (`group_id`,`booking_type`,`booking_id`),
  ADD KEY `idx_group_id` (`group_id`),
  ADD KEY `idx_booking` (`booking_type`,`booking_id`);

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
-- AUTO_INCREMENT for table `activity_logs`
--
ALTER TABLE `activity_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `bookings_deposit`
--
ALTER TABLE `bookings_deposit`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bookings_other`
--
ALTER TABLE `bookings_other`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT for table `bookings_ticket`
--
ALTER TABLE `bookings_ticket`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `bookings_voucher`
--
ALTER TABLE `bookings_voucher`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `booking_payment_details`
--
ALTER TABLE `booking_payment_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=855;

--
-- AUTO_INCREMENT for table `city`
--
ALTER TABLE `city`
  MODIFY `city_id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'รหัสเมือง (Primary Key)', AUTO_INCREMENT=420;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=339;

--
-- AUTO_INCREMENT for table `delete_log`
--
ALTER TABLE `delete_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `deposit_additional_info`
--
ALTER TABLE `deposit_additional_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `deposit_details`
--
ALTER TABLE `deposit_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `deposit_extras`
--
ALTER TABLE `deposit_extras`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=54;

--
-- AUTO_INCREMENT for table `deposit_pricing`
--
ALTER TABLE `deposit_pricing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `deposit_routes`
--
ALTER TABLE `deposit_routes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=121;

--
-- AUTO_INCREMENT for table `deposit_terms`
--
ALTER TABLE `deposit_terms`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `information`
--
ALTER TABLE `information`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=173;

--
-- AUTO_INCREMENT for table `other_additional_info`
--
ALTER TABLE `other_additional_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT for table `other_details`
--
ALTER TABLE `other_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT for table `other_passengers`
--
ALTER TABLE `other_passengers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=343;

--
-- AUTO_INCREMENT for table `other_pricing`
--
ALTER TABLE `other_pricing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=76;

--
-- AUTO_INCREMENT for table `payment_groups`
--
ALTER TABLE `payment_groups`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=211;

--
-- AUTO_INCREMENT for table `payment_tracking`
--
ALTER TABLE `payment_tracking`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `tickets_detail`
--
ALTER TABLE `tickets_detail`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1062;

--
-- AUTO_INCREMENT for table `tickets_extras`
--
ALTER TABLE `tickets_extras`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=256;

--
-- AUTO_INCREMENT for table `tickets_passengers`
--
ALTER TABLE `tickets_passengers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3040;

--
-- AUTO_INCREMENT for table `tickets_pricing`
--
ALTER TABLE `tickets_pricing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1039;

--
-- AUTO_INCREMENT for table `tickets_routes`
--
ALTER TABLE `tickets_routes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2574;

--
-- AUTO_INCREMENT for table `ticket_additional_info`
--
ALTER TABLE `ticket_additional_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1060;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `voucher_additional_info`
--
ALTER TABLE `voucher_additional_info`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `voucher_details`
--
ALTER TABLE `voucher_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `voucher_passengers`
--
ALTER TABLE `voucher_passengers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=69;

--
-- AUTO_INCREMENT for table `voucher_pricing`
--
ALTER TABLE `voucher_pricing`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

-- --------------------------------------------------------

--
-- Structure for view `view_daily_report_all`
--
DROP TABLE IF EXISTS `view_daily_report_all`;

CREATE ALGORITHM=UNDEFINED DEFINER=`admin`@`localhost` SQL SECURITY DEFINER VIEW `view_daily_report_all`  AS SELECT `view_daily_report_flight`.`booking_type` AS `booking_type`, `view_daily_report_flight`.`booking_id` AS `booking_id`, `view_daily_report_flight`.`create_date` AS `create_date`, `view_daily_report_flight`.`created_at` AS `created_at`, `view_daily_report_flight`.`booking_ref_no` AS `booking_ref_no`, `view_daily_report_flight`.`customer_name` AS `customer_name`, `view_daily_report_flight`.`customer_code` AS `customer_code`, `view_daily_report_flight`.`supplier_name` AS `supplier_name`, `view_daily_report_flight`.`supplier_code` AS `supplier_code`, `view_daily_report_flight`.`pax_name` AS `pax_name`, `view_daily_report_flight`.`pax_count` AS `pax_count`, `view_daily_report_flight`.`routing_detail` AS `routing_detail`, `view_daily_report_flight`.`booking_code` AS `booking_code`, `view_daily_report_flight`.`adult_net_price` AS `adult_net_price`, `view_daily_report_flight`.`adult_sale_price` AS `adult_sale_price`, `view_daily_report_flight`.`adult_pax` AS `adult_pax`, `view_daily_report_flight`.`child_net_price` AS `child_net_price`, `view_daily_report_flight`.`child_sale_price` AS `child_sale_price`, `view_daily_report_flight`.`child_pax` AS `child_pax`, `view_daily_report_flight`.`infant_net_price` AS `infant_net_price`, `view_daily_report_flight`.`infant_sale_price` AS `infant_sale_price`, `view_daily_report_flight`.`infant_pax` AS `infant_pax`, `view_daily_report_flight`.`extras_net_total` AS `extras_net_total`, `view_daily_report_flight`.`extras_sale_total` AS `extras_sale_total`, `view_daily_report_flight`.`total_price` AS `total_price`, `view_daily_report_flight`.`payment_status` AS `payment_status`, `view_daily_report_flight`.`payment_method` AS `payment_method`, `view_daily_report_flight`.`bank_name` AS `bank_name`, `view_daily_report_flight`.`account_number` AS `account_number`, `view_daily_report_flight`.`ticket_type` AS `ticket_type`, `view_daily_report_flight`.`ticket_type_details` AS `ticket_type_details`, `view_daily_report_flight`.`ticket_numbers` AS `ticket_numbers` FROM `view_daily_report_flight`union all select `view_daily_report_voucher`.`booking_type` AS `booking_type`,`view_daily_report_voucher`.`booking_id` AS `booking_id`,`view_daily_report_voucher`.`create_date` AS `create_date`,`view_daily_report_voucher`.`created_at` AS `created_at`,`view_daily_report_voucher`.`booking_ref_no` AS `booking_ref_no`,`view_daily_report_voucher`.`customer_name` AS `customer_name`,`view_daily_report_voucher`.`customer_code` AS `customer_code`,`view_daily_report_voucher`.`supplier_name` AS `supplier_name`,`view_daily_report_voucher`.`supplier_code` AS `supplier_code`,`view_daily_report_voucher`.`pax_name` AS `pax_name`,`view_daily_report_voucher`.`pax_count` AS `pax_count`,`view_daily_report_voucher`.`routing_detail` AS `routing_detail`,`view_daily_report_voucher`.`booking_code` AS `booking_code`,`view_daily_report_voucher`.`adult_net_price` AS `adult_net_price`,`view_daily_report_voucher`.`adult_sale_price` AS `adult_sale_price`,`view_daily_report_voucher`.`adult_pax` AS `adult_pax`,`view_daily_report_voucher`.`child_net_price` AS `child_net_price`,`view_daily_report_voucher`.`child_sale_price` AS `child_sale_price`,`view_daily_report_voucher`.`child_pax` AS `child_pax`,`view_daily_report_voucher`.`infant_net_price` AS `infant_net_price`,`view_daily_report_voucher`.`infant_sale_price` AS `infant_sale_price`,`view_daily_report_voucher`.`infant_pax` AS `infant_pax`,`view_daily_report_voucher`.`extras_net_total` AS `extras_net_total`,`view_daily_report_voucher`.`extras_sale_total` AS `extras_sale_total`,`view_daily_report_voucher`.`total_price` AS `total_price`,`view_daily_report_voucher`.`payment_status` AS `payment_status`,`view_daily_report_voucher`.`payment_method` AS `payment_method`,`view_daily_report_voucher`.`bank_name` AS `bank_name`,`view_daily_report_voucher`.`account_number` AS `account_number`,`view_daily_report_voucher`.`ticket_type` AS `ticket_type`,`view_daily_report_voucher`.`ticket_type_details` AS `ticket_type_details`,`view_daily_report_voucher`.`ticket_numbers` AS `ticket_numbers` from `view_daily_report_voucher` union all select `view_daily_report_other`.`booking_type` AS `booking_type`,`view_daily_report_other`.`booking_id` AS `booking_id`,`view_daily_report_other`.`create_date` AS `create_date`,`view_daily_report_other`.`created_at` AS `created_at`,`view_daily_report_other`.`booking_ref_no` AS `booking_ref_no`,`view_daily_report_other`.`customer_name` AS `customer_name`,`view_daily_report_other`.`customer_code` AS `customer_code`,`view_daily_report_other`.`supplier_name` AS `supplier_name`,`view_daily_report_other`.`supplier_code` AS `supplier_code`,`view_daily_report_other`.`pax_name` AS `pax_name`,`view_daily_report_other`.`pax_count` AS `pax_count`,`view_daily_report_other`.`routing_detail` AS `routing_detail`,`view_daily_report_other`.`booking_code` AS `booking_code`,`view_daily_report_other`.`adult_net_price` AS `adult_net_price`,`view_daily_report_other`.`adult_sale_price` AS `adult_sale_price`,`view_daily_report_other`.`adult_pax` AS `adult_pax`,`view_daily_report_other`.`child_net_price` AS `child_net_price`,`view_daily_report_other`.`child_sale_price` AS `child_sale_price`,`view_daily_report_other`.`child_pax` AS `child_pax`,`view_daily_report_other`.`infant_net_price` AS `infant_net_price`,`view_daily_report_other`.`infant_sale_price` AS `infant_sale_price`,`view_daily_report_other`.`infant_pax` AS `infant_pax`,`view_daily_report_other`.`extras_net_total` AS `extras_net_total`,`view_daily_report_other`.`extras_sale_total` AS `extras_sale_total`,`view_daily_report_other`.`total_price` AS `total_price`,`view_daily_report_other`.`payment_status` AS `payment_status`,`view_daily_report_other`.`payment_method` AS `payment_method`,`view_daily_report_other`.`bank_name` AS `bank_name`,`view_daily_report_other`.`account_number` AS `account_number`,`view_daily_report_other`.`ticket_type` AS `ticket_type`,`view_daily_report_other`.`ticket_type_details` AS `ticket_type_details`,`view_daily_report_other`.`ticket_numbers` AS `ticket_numbers` from `view_daily_report_other`  ;

-- --------------------------------------------------------

--
-- Structure for view `view_daily_report_flight`
--
DROP TABLE IF EXISTS `view_daily_report_flight`;

CREATE ALGORITHM=UNDEFINED DEFINER=`admin`@`localhost` SQL SECURITY DEFINER VIEW `view_daily_report_flight`  AS SELECT 'Flight' AS `booking_type`, `bt`.`id` AS `booking_id`, cast(coalesce(`bt`.`invoice_generated_at`,`bt`.`po_generated_at`,convert_tz(`bt`.`created_at`,'+00:00','+07:00')) as date) AS `create_date`, coalesce(`bt`.`invoice_generated_at`,`bt`.`po_generated_at`,convert_tz(`bt`.`created_at`,'+00:00','+07:00')) AS `created_at`, coalesce(`bt`.`invoice_number`,`bt`.`po_number`) AS `booking_ref_no`, `c`.`name` AS `customer_name`, `c`.`code` AS `customer_code`, `i`.`name` AS `supplier_name`, `i`.`code` AS `supplier_code`, (select `tickets_passengers`.`passenger_name` from `tickets_passengers` where `tickets_passengers`.`bookings_ticket_id` = `bt`.`id` order by `tickets_passengers`.`id` limit 1) AS `pax_name`, coalesce((select `tickets_pricing`.`adult_pax` + `tickets_pricing`.`child_pax` + `tickets_pricing`.`infant_pax` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0) AS `pax_count`, (select group_concat(concat(`tickets_routes`.`origin`,'-',`tickets_routes`.`destination`) order by `tickets_routes`.`id` ASC separator ' - ') from `tickets_routes` where `tickets_routes`.`bookings_ticket_id` = `bt`.`id`) AS `routing_detail`, coalesce((select `ticket_additional_info`.`code` from `ticket_additional_info` where `ticket_additional_info`.`bookings_ticket_id` = `bt`.`id` limit 1),'') AS `booking_code`, coalesce((select `tickets_pricing`.`adult_net_price` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0.00) AS `adult_net_price`, coalesce((select `tickets_pricing`.`adult_sale_price` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0.00) AS `adult_sale_price`, coalesce((select `tickets_pricing`.`adult_pax` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0) AS `adult_pax`, coalesce((select `tickets_pricing`.`child_net_price` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0.00) AS `child_net_price`, coalesce((select `tickets_pricing`.`child_sale_price` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0.00) AS `child_sale_price`, coalesce((select `tickets_pricing`.`child_pax` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0) AS `child_pax`, coalesce((select `tickets_pricing`.`infant_net_price` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0.00) AS `infant_net_price`, coalesce((select `tickets_pricing`.`infant_sale_price` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0.00) AS `infant_sale_price`, coalesce((select `tickets_pricing`.`infant_pax` from `tickets_pricing` where `tickets_pricing`.`bookings_ticket_id` = `bt`.`id` limit 1),0) AS `infant_pax`, coalesce((select sum(`tickets_extras`.`net_price` * `tickets_extras`.`quantity`) from `tickets_extras` where `tickets_extras`.`bookings_ticket_id` = `bt`.`id`),0.00) AS `extras_net_total`, coalesce((select sum(`tickets_extras`.`sale_price` * `tickets_extras`.`quantity`) from `tickets_extras` where `tickets_extras`.`bookings_ticket_id` = `bt`.`id`),0.00) AS `extras_sale_total`, coalesce((select `tickets_detail`.`grand_total` from `tickets_detail` where `tickets_detail`.`bookings_ticket_id` = `bt`.`id` limit 1),0.00) AS `total_price`, `bt`.`payment_status` AS `payment_status`, (select `payment_tracking`.`payment_method` from `payment_tracking` where `payment_tracking`.`booking_type` = 'flight' and `payment_tracking`.`booking_id` = `bt`.`id` limit 1) AS `payment_method`, (select `payment_tracking`.`bank_name` from `payment_tracking` where `payment_tracking`.`booking_type` = 'flight' and `payment_tracking`.`booking_id` = `bt`.`id` limit 1) AS `bank_name`, (select `payment_tracking`.`account_number` from `payment_tracking` where `payment_tracking`.`booking_type` = 'flight' and `payment_tracking`.`booking_id` = `bt`.`id` limit 1) AS `account_number`, coalesce((select `ticket_additional_info`.`ticket_type` from `ticket_additional_info` where `ticket_additional_info`.`bookings_ticket_id` = `bt`.`id` limit 1),'') AS `ticket_type`, coalesce((select `ticket_additional_info`.`ticket_type_details` from `ticket_additional_info` where `ticket_additional_info`.`bookings_ticket_id` = `bt`.`id` limit 1),'') AS `ticket_type_details`, coalesce((select group_concat(`tickets_passengers`.`ticket_code` separator ', ') from `tickets_passengers` where `tickets_passengers`.`bookings_ticket_id` = `bt`.`id` and `tickets_passengers`.`ticket_code` is not null and trim(`tickets_passengers`.`ticket_code`) <> '' order by `tickets_passengers`.`id`),'') AS `ticket_numbers` FROM ((`bookings_ticket` `bt` left join `customers` `c` on(`bt`.`customer_id` = `c`.`id`)) left join `information` `i` on(`bt`.`information_id` = `i`.`id`)) WHERE `bt`.`status` <> 'cancelled' AND ((`bt`.`invoice_number` is not null AND `bt`.`invoice_number` <> '') OR (`bt`.`po_number` is not null AND `bt`.`po_number` <> '')) ;

-- --------------------------------------------------------

--
-- Structure for view `view_daily_report_other`
--
DROP TABLE IF EXISTS `view_daily_report_other`;

CREATE ALGORITHM=UNDEFINED DEFINER=`admin`@`localhost` SQL SECURITY DEFINER VIEW `view_daily_report_other`  AS SELECT concat('Other-',ucase(`bo`.`service_type`)) AS `booking_type`, `bo`.`id` AS `booking_id`, cast(coalesce(`bo`.`vc_generated_at`,convert_tz(`bo`.`created_at`,'+00:00','+07:00')) as date) AS `create_date`, coalesce(`bo`.`vc_generated_at`,convert_tz(`bo`.`created_at`,'+00:00','+07:00')) AS `created_at`, `bo`.`reference_number` AS `booking_ref_no`, `c`.`name` AS `customer_name`, `c`.`code` AS `customer_code`, `i`.`name` AS `supplier_name`, `i`.`code` AS `supplier_code`, (select `other_passengers`.`passenger_name` from `other_passengers` where `other_passengers`.`bookings_other_id` = `bo`.`id` order by `other_passengers`.`id` limit 1) AS `pax_name`, coalesce((select `other_pricing`.`adult_pax` + `other_pricing`.`child_pax` + `other_pricing`.`infant_pax` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0) AS `pax_count`, (select `other_details`.`description` from `other_details` where `other_details`.`bookings_other_id` = `bo`.`id` limit 1) AS `routing_detail`, coalesce((select `other_additional_info`.`code` from `other_additional_info` where `other_additional_info`.`bookings_other_id` = `bo`.`id` limit 1),'') AS `booking_code`, coalesce((select `other_pricing`.`adult_net_price` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0.00) AS `adult_net_price`, coalesce((select `other_pricing`.`adult_sale_price` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0.00) AS `adult_sale_price`, coalesce((select `other_pricing`.`adult_pax` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0) AS `adult_pax`, coalesce((select `other_pricing`.`child_net_price` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0.00) AS `child_net_price`, coalesce((select `other_pricing`.`child_sale_price` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0.00) AS `child_sale_price`, coalesce((select `other_pricing`.`child_pax` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0) AS `child_pax`, coalesce((select `other_pricing`.`infant_net_price` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0.00) AS `infant_net_price`, coalesce((select `other_pricing`.`infant_sale_price` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0.00) AS `infant_sale_price`, coalesce((select `other_pricing`.`infant_pax` from `other_pricing` where `other_pricing`.`bookings_other_id` = `bo`.`id` limit 1),0) AS `infant_pax`, 0.00 AS `extras_net_total`, 0.00 AS `extras_sale_total`, coalesce((select `other_details`.`grand_total` from `other_details` where `other_details`.`bookings_other_id` = `bo`.`id` limit 1),0.00) AS `total_price`, `bo`.`payment_status` AS `payment_status`, (select `payment_tracking`.`payment_method` from `payment_tracking` where `payment_tracking`.`booking_type` = 'other' and `payment_tracking`.`booking_id` = `bo`.`id` limit 1) AS `payment_method`, (select `payment_tracking`.`bank_name` from `payment_tracking` where `payment_tracking`.`booking_type` = 'other' and `payment_tracking`.`booking_id` = `bo`.`id` limit 1) AS `bank_name`, (select `payment_tracking`.`account_number` from `payment_tracking` where `payment_tracking`.`booking_type` = 'other' and `payment_tracking`.`booking_id` = `bo`.`id` limit 1) AS `account_number`, '' AS `ticket_type`, '' AS `ticket_type_details`, '' AS `ticket_numbers` FROM ((`bookings_other` `bo` left join `customers` `c` on(`bo`.`customer_id` = `c`.`id`)) left join `information` `i` on(`bo`.`information_id` = `i`.`id`)) WHERE `bo`.`status` <> 'cancelled' ;

-- --------------------------------------------------------

--
-- Structure for view `view_daily_report_voucher`
--
DROP TABLE IF EXISTS `view_daily_report_voucher`;

CREATE ALGORITHM=UNDEFINED DEFINER=`admin`@`localhost` SQL SECURITY DEFINER VIEW `view_daily_report_voucher`  AS SELECT concat('Voucher-',ucase(`bv`.`service_type`)) AS `booking_type`, `bv`.`id` AS `booking_id`, cast(coalesce(`bv`.`vc_generated_at`,convert_tz(`bv`.`created_at`,'+00:00','+07:00')) as date) AS `create_date`, coalesce(`bv`.`vc_generated_at`,convert_tz(`bv`.`created_at`,'+00:00','+07:00')) AS `created_at`, `bv`.`vc_number` AS `booking_ref_no`, `c`.`name` AS `customer_name`, `c`.`code` AS `customer_code`, `i`.`name` AS `supplier_name`, `i`.`code` AS `supplier_code`, (select `voucher_passengers`.`passenger_name` from `voucher_passengers` where `voucher_passengers`.`bookings_voucher_id` = `bv`.`id` order by `voucher_passengers`.`id` limit 1) AS `pax_name`, coalesce((select `voucher_pricing`.`adult_pax` + `voucher_pricing`.`child_pax` + `voucher_pricing`.`infant_pax` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0) AS `pax_count`, (select `voucher_details`.`description` from `voucher_details` where `voucher_details`.`bookings_voucher_id` = `bv`.`id` limit 1) AS `routing_detail`, coalesce((select `voucher_details`.`reference` from `voucher_details` where `voucher_details`.`bookings_voucher_id` = `bv`.`id` limit 1),'') AS `booking_code`, coalesce((select `voucher_pricing`.`adult_net_price` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0.00) AS `adult_net_price`, coalesce((select `voucher_pricing`.`adult_sale_price` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0.00) AS `adult_sale_price`, coalesce((select `voucher_pricing`.`adult_pax` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0) AS `adult_pax`, coalesce((select `voucher_pricing`.`child_net_price` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0.00) AS `child_net_price`, coalesce((select `voucher_pricing`.`child_sale_price` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0.00) AS `child_sale_price`, coalesce((select `voucher_pricing`.`child_pax` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0) AS `child_pax`, coalesce((select `voucher_pricing`.`infant_net_price` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0.00) AS `infant_net_price`, coalesce((select `voucher_pricing`.`infant_sale_price` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0.00) AS `infant_sale_price`, coalesce((select `voucher_pricing`.`infant_pax` from `voucher_pricing` where `voucher_pricing`.`bookings_voucher_id` = `bv`.`id` limit 1),0) AS `infant_pax`, 0.00 AS `extras_net_total`, 0.00 AS `extras_sale_total`, coalesce((select `voucher_details`.`grand_total` from `voucher_details` where `voucher_details`.`bookings_voucher_id` = `bv`.`id` limit 1),0.00) AS `total_price`, `bv`.`payment_status` AS `payment_status`, (select `payment_tracking`.`payment_method` from `payment_tracking` where `payment_tracking`.`booking_type` = 'voucher' and `payment_tracking`.`booking_id` = `bv`.`id` limit 1) AS `payment_method`, (select `payment_tracking`.`bank_name` from `payment_tracking` where `payment_tracking`.`booking_type` = 'voucher' and `payment_tracking`.`booking_id` = `bv`.`id` limit 1) AS `bank_name`, (select `payment_tracking`.`account_number` from `payment_tracking` where `payment_tracking`.`booking_type` = 'voucher' and `payment_tracking`.`booking_id` = `bv`.`id` limit 1) AS `account_number`, '' AS `ticket_type`, '' AS `ticket_type_details`, '' AS `ticket_numbers` FROM ((`bookings_voucher` `bv` left join `customers` `c` on(`bv`.`customer_id` = `c`.`id`)) left join `information` `i` on(`bv`.`information_id` = `i`.`id`)) WHERE `bv`.`status` <> 'cancelled' AND `bv`.`vc_number` is not null AND `bv`.`vc_number` <> '' ;

-- --------------------------------------------------------

--
-- Structure for view `v_booking_summary`
--
DROP TABLE IF EXISTS `v_booking_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`admin`@`localhost` SQL SECURITY DEFINER VIEW `v_booking_summary`  AS SELECT `bt`.`id` AS `id`, `bt`.`reference_number` AS `reference_number`, `bt`.`status` AS `status`, `bt`.`payment_status` AS `payment_status`, `bt`.`created_at` AS `created_at`, `c`.`name` AS `customer_name`, `c`.`code` AS `customer_code`, `i`.`name` AS `supplier_name`, `i`.`code` AS `supplier_code`, `td`.`grand_total` AS `grand_total`, `td`.`issue_date` AS `issue_date`, `td`.`due_date` AS `due_date`, `bt`.`po_number` AS `po_number`, `bt`.`po_generated_at` AS `po_generated_at`, `bt`.`rc_number` AS `rc_number`, `bt`.`rc_generated_at` AS `rc_generated_at`, `u`.`fullname` AS `created_by_name` FROM ((((`bookings_ticket` `bt` left join `customers` `c` on(`bt`.`customer_id` = `c`.`id`)) left join `information` `i` on(`bt`.`information_id` = `i`.`id`)) left join `tickets_detail` `td` on(`bt`.`id` = `td`.`bookings_ticket_id`)) left join `users` `u` on(`bt`.`created_by` = `u`.`id`)) ;

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
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
