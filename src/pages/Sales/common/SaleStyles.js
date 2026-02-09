// src/components/modules/Sale/common/SaleStyles.js
const SaleStyles = {
  // Layout หลัก
  mainContainer: "bg-gray-100 min-h-screen p-4",
  contentWrapper: "max-w-7xl mx-auto",
  mainCard: "bg-white rounded-lg shadow-md overflow-hidden",
  mainContent: "p-6",

  // ส่วนหัว
  header: {
    container: "bg-blue-600 p-4 text-white flex justify-between items-center",
    title: "text-xl font-bold",
    buttonContainer: "flex space-x-2",
  },

  // หัวข้อส่วน
  section: {
    headerWrapper:
      "bg-gradient-to-r from-blue-600 to-blue-400 p-1 rounded-lg shadow-md ",
    headerWrapper2:
      "bg-gradient-to-r from-blue-600 to-blue-400 p-1 shadow-md overflow-hidden",
    headerTitle: "text-white font-bold px-3 py-2 flex items-center",
    container: "space-y-2 mt-6",
    content: "p-4",
  },

  // หัวข้อย่อย
  subsection: {
    header: "bg-blue-100 text-blue-600 p-3 flex justify-between items-center",
    title: "font-semibold",
    container: "border border-gray-400 rounded-lg overflow-hidden",
    content: "p-4",
  },

  // Grid Layouts
  grid: {
    twoColumns: "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6",
    twoColumnsCompact: "grid grid-cols-2 gap-4 mt-4",
    threeColumns: "grid grid-cols-1 md:grid-cols-3 gap-4",
    fifteenColumns: "grid grid-cols-1 lg:grid-cols-15 gap-2",
    autoColumns: "grid grid-cols-1 md:grid-cols-auto gap-4",
    fullWidthHalf: "col-span-1",
    spaceBetween: "flex justify-between items-center",
  },

  // Form elements
  form: {
    group: "mb-4",
    label: "block text-sm font-medium mb-1",
    labelRequired:
      "block text-sm font-medium mb-1 after:content-['*'] after:ml-0.5 after:text-red-500",
    input:
      "w-full border border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 text-transform uppercase",
    inputNoUppercase:
      "w-full border border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500",
    select:
      "w-full border border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 text-transform uppercase",
    textarea:
      "w-full border border-gray-400 rounded-md p-2 h-24 focus:ring-blue-500 focus:border-blue-500 text-transform uppercase",
    dateInput:
      "w-full border border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500",
    inputWithIcon:
      "pl-10 w-full border border-gray-400 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 text-transform uppercase",
    iconContainer:
      "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none",
    inputDisabled: "w-full border border-gray-400 rounded-md p-2 bg-gray-100",
    radioContainer: "flex items-center",
    radio: "mr-2 focus:ring-blue-500",
    checkbox:
      "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded",
  },

  // ปุ่ม
  button: {
    primary:
      "px-4 py-2 bg-green-500 text-white rounded-md flex items-center hover:bg-green-600",
    secondary:
      "bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium flex items-center",
    danger:
      "px-4 py-2 bg-red-500 text-white rounded-md flex items-center hover:bg-red-600",
    small: "px-3 py-1 text-sm",
    icon: "mr-1",
    link: "text-blue-500 flex items-center text-sm",
    disabled: "opacity-50 cursor-not-allowed",
    addButton:
      "mt-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-md py-2 px-3 text-sm hover:bg-blue-100 transition-colors w-full flex items-center justify-center",
    actionButton: "ml-2 text-red-500 hover:text-red-700",
  },

  // ตาราง
  table: {
    container: "overflow-x-auto",
    table: "min-w-full divide-y divide-gray-200 border",
    thead: "bg-gray-50",
    th: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider",
    thSortable: "cursor-pointer",
    tbody: "bg-white divide-y divide-gray-200",
    tr: "hover:bg-gray-50",
    td: "px-6 py-4 whitespace-nowrap text-sm",
    tdFirst: "px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600",
    tdCenter: "px-6 py-4 whitespace-nowrap text-center",
    tdRight: "px-6 py-4 whitespace-nowrap text-right",
    sortIcon: "ml-1",
  },

  // สรุปราคา
  priceInfo: {
    container: "bg-blue-50 p-4 rounded-md mb-4",
    title: "text-sm text-gray-600 mb-1",
    price: "text-2xl font-bold text-blue-600",
    summaryContainer:
      "bg-blue-50 p-4 rounded-md shadow-sm h-full flex flex-col justify-center",
    summaryRow: "flex justify-between mb-3 items-center",
    summaryLabel: "font-medium",
    summaryValue: "font-bold text-blue-600 text-xl",
    summaryTotal:
      "flex justify-between items-center border-t border-blue-200 pt-3 mt-2",
    summaryTotalLabel: "font-semibold",
    summaryTotalValue: "font-bold text-blue-600 text-2xl",
  },

  // Status badges
  badge: {
    success:
      "px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium",
    warning:
      "px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium",
    danger:
      "px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium",
    info: "px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium",
    default:
      "px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium",
  },

  // Spacing
  spacing: {
    mt1: "mt-1",
    mt2: "mt-2",
    mt4: "mt-4",
    mt6: "mt-6",
    mb1: "mb-1",
    mb2: "mb-2",
    mb4: "mb-4",
    mb6: "mb-6",
    ml1: "ml-1",
    ml2: "ml-2",
    ml4: "ml-4",
    mr1: "mr-1",
    mr2: "mr-2",
    mr4: "mr-4",
    mx1: "mx-1",
    mx2: "mx-2",
    mx4: "mx-4",
    my1: "my-1",
    my2: "my-2",
    my4: "my-4",
    p1: "p-1",
    p2: "p-2",
    p4: "p-4",
    p6: "p-6",
  },
};

export const combineClasses = (...classes) => {
  return classes.filter(Boolean).join(" ");
};

export default SaleStyles;
