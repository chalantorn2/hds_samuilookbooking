import { useState, useEffect } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://samuilookbiz.com/api";
const API_URL = `${API_BASE_URL}/gateway.php`;

export const useReportData = ({
  date,
  searchTerm,
  customerFilter,
  supplierFilter,
  serviceTypeFilter,
  paymentStatusFilter,
  sortField,
  sortDirection,
}) => {
  const [loading, setLoading] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const fetchData = async () => {
    setLoading(true);

    try {
      // Use new getDailyReportAll API
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "getDailyReportAll",
          date: date,
        }),
      });

      const result = await response.json();

      console.log('🔍 Daily Report API Response:', result);

      // Check for both success formats: "success" or true
      if (result.success === true || result.status === "success") {
        let data = result.data?.data || [];
        const summaryData = result.data?.summary || null;

        console.log('📊 Total records from API:', data.length);
        console.log('📋 Raw data:', data);

        // Client-side filtering
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          data = data.filter(item =>
            (item.booking_ref_no && item.booking_ref_no.toLowerCase().includes(search)) ||
            (item.customer_name && item.customer_name.toLowerCase().includes(search)) ||
            (item.customer_code && item.customer_code.toLowerCase().includes(search)) ||
            (item.supplier_name && item.supplier_name.toLowerCase().includes(search)) ||
            (item.supplier_code && item.supplier_code.toLowerCase().includes(search)) ||
            (item.pax_name && item.pax_name.toLowerCase().includes(search)) ||
            (item.booking_code && item.booking_code.toLowerCase().includes(search))
          );
        }

        // Filter by customer
        if (customerFilter && customerFilter !== 'all') {
          data = data.filter(item => item.customer_code === customerFilter);
        }

        // Filter by supplier
        if (supplierFilter && supplierFilter !== 'all') {
          data = data.filter(item => item.supplier_code === supplierFilter);
        }

        // Filter by service type
        if (serviceTypeFilter && serviceTypeFilter.length > 0) {
          data = data.filter(item => serviceTypeFilter.includes(item.booking_type));
        }

        // Filter by payment status
        if (paymentStatusFilter && paymentStatusFilter !== 'all') {
          data = data.filter(item => item.payment_status === paymentStatusFilter);
        }

        // Client-side sorting
        data.sort((a, b) => {
          let aVal = a[sortField];
          let bVal = b[sortField];

          if (sortField === "create_date") {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
          } else if (typeof aVal === "string") {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
          }

          if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
          if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
          return 0;
        });

        setFilteredData(data);
        setSummary(summaryData);

        // Extract unique customers and suppliers for filters
        const allData = result.data?.data || [];
        const uniqueCustomers = [
          ...new Set(allData.map((item) => item.customer_code).filter(Boolean)),
        ].map((code) => {
          const item = allData.find((d) => d.customer_code === code);
          return { code, name: item.customer_name };
        });

        const uniqueSuppliers = [
          ...new Set(allData.map((item) => item.supplier_code).filter(Boolean)),
        ].map((code) => {
          const item = allData.find((d) => d.supplier_code === code);
          return { code, name: item.supplier_name };
        });

        setCustomers(uniqueCustomers);
        setSuppliers(uniqueSuppliers);
      } else {
        console.error("Failed to fetch report data:", result.message);
        setFilteredData([]);
        setSummary(null);
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
      setFilteredData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (date) {
      fetchData();
    }
  }, [
    date,
    searchTerm,
    customerFilter,
    supplierFilter,
    serviceTypeFilter,
    paymentStatusFilter,
    sortField,
    sortDirection,
  ]);

  return {
    loading,
    filteredData,
    summary,
    fetchData,
    customers,
    suppliers,
  };
};
