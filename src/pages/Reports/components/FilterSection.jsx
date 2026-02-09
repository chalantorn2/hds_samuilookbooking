import React, { useState, useRef, useEffect } from "react";
import { Calendar, Search, X, ChevronDown } from "lucide-react";

const FilterSection = ({
  selectedDate,
  setSelectedDate,
  searchTerm,
  setSearchTerm,
  serviceTypeFilter,
  setServiceTypeFilter,
  paymentStatusFilter,
  setPaymentStatusFilter,
  customers,
  suppliers,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searchType, setSearchType] = useState("all");
  const [showServiceTypeDropdown, setShowServiceTypeDropdown] = useState(false);
  const searchRef = useRef(null);
  const serviceTypeRef = useRef(null);

  // Service type options - Updated to match API booking_type values
  const serviceTypes = [
    { value: "Flight", label: "Flight Ticket" },
    { value: "Voucher-BUS", label: "Voucher - Bus" },
    { value: "Voucher-BOAT", label: "Voucher - Boat" },
    { value: "Voucher-TOUR", label: "Voucher - Tour" },
    { value: "Other-INSURANCE", label: "Other - Insurance" },
    { value: "Other-HOTEL", label: "Other - Hotel" },
    { value: "Other-TRAIN", label: "Other - Train" },
    { value: "Other-VISA", label: "Other - Visa" },
    { value: "Other-OTHER", label: "Other - Other" },
    { value: "Deposit-AIRTICKET", label: "Deposit - Air Ticket" },
    { value: "Deposit-PACKAGE", label: "Deposit - Package" },
    { value: "Deposit-LAND", label: "Deposit - Land" },
    { value: "Deposit-OTHER", label: "Deposit - Other" },
  ];

  // Close suggestions and dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (
        serviceTypeRef.current &&
        !serviceTypeRef.current.contains(event.target)
      ) {
        setShowServiceTypeDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Generate suggestions based on search term and search type
  const handleSearchChange = (value) => {
    setSearchTerm(value);

    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchLower = value.toLowerCase();
    const newSuggestions = [];

    // Add customer suggestions if search type is "all" or "customer"
    if (
      (searchType === "all" || searchType === "customer") &&
      customers &&
      customers.length > 0
    ) {
      customers.forEach((customer) => {
        const matchesCode =
          customer.code && customer.code.toLowerCase().includes(searchLower);
        const matchesName =
          customer.name && customer.name.toLowerCase().includes(searchLower);

        if (matchesCode || matchesName) {
          newSuggestions.push({
            type: "customer",
            code: customer.code,
            name: customer.name,
            display: `${customer.code} - ${customer.name}`,
            value: customer.code,
          });
        }
      });
    }

    // Add supplier suggestions if search type is "all" or "supplier"
    if (
      (searchType === "all" || searchType === "supplier") &&
      suppliers &&
      suppliers.length > 0
    ) {
      suppliers.forEach((supplier) => {
        const matchesCode =
          supplier.code && supplier.code.toLowerCase().includes(searchLower);
        const matchesName =
          supplier.name && supplier.name.toLowerCase().includes(searchLower);

        if (matchesCode || matchesName) {
          newSuggestions.push({
            type: "supplier",
            code: supplier.code,
            name: supplier.name,
            display: `${supplier.code} - ${supplier.name}`,
            value: supplier.code,
          });
        }
      });
    }

    setSuggestions(newSuggestions.slice(0, 10)); // Limit to 10 suggestions
    setShowSuggestions(newSuggestions.length > 0);
  };

  // Re-generate suggestions when search type changes
  useEffect(() => {
    if (searchTerm) {
      handleSearchChange(searchTerm);
    }
  }, [searchType]);

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion.value);
    setShowSuggestions(false);
  };

  // Handle service type checkbox change
  const handleServiceTypeChange = (value) => {
    const currentTypes = Array.isArray(serviceTypeFilter)
      ? serviceTypeFilter
      : [];

    if (currentTypes.includes(value)) {
      // Remove the type
      const newTypes = currentTypes.filter((type) => type !== value);
      setServiceTypeFilter(newTypes);
    } else {
      // Add the type
      setServiceTypeFilter([...currentTypes, value]);
    }
  };

  // Check if a service type is selected
  const isServiceTypeSelected = (value) => {
    if (!Array.isArray(serviceTypeFilter)) return false;
    return serviceTypeFilter.includes(value);
  };

  return (
    <div className="bg-white shadow-sm p-4 mb-4">
      {/* Single row with all filters */}
      <div className="flex gap-4 items-center">
        {/* Single Date Selector */}
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Auto Complete Search Bar with Search Type Dropdown */}
        <div className="flex-1 min-w-[300px]" ref={searchRef}>
          <div className="flex gap-2">
            {/* Search Type Dropdown */}
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">ALL</option>
              <option value="customer">Customer</option>
              <option value="supplier">Supplier</option>
            </select>

            {/* Search Input */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder={`Search ${
                  searchType === "all" ? "customer or supplier" : searchType
                }...`}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={`${suggestion.type}-${suggestion.code}-${index}`}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {suggestion.code}
                          </div>
                          <div className="text-xs text-gray-500">
                            {suggestion.name}
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                          {suggestion.type === "customer"
                            ? "Customer"
                            : "Supplier"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Service Type Dropdown with Checkboxes */}
        <div className="relative" ref={serviceTypeRef}>
          <button
            onClick={() => setShowServiceTypeDropdown(!showServiceTypeDropdown)}
            className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:bg-gray-50"
          >
            <span>
              Service Type{" "}
              {Array.isArray(serviceTypeFilter) &&
                serviceTypeFilter.length > 0 &&
                `(${serviceTypeFilter.length})`}
            </span>
            <ChevronDown size={16} className="text-gray-500" />
          </button>

          {/* Service Type Dropdown */}
          {showServiceTypeDropdown && (
            <div className="absolute z-10 mt-1 bg-white border border-gray-300 rounded-md shadow-lg w-64 max-h-80 overflow-y-auto">
              <div className="p-2">
                {serviceTypes.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer rounded"
                  >
                    <input
                      type="checkbox"
                      checked={isServiceTypeSelected(type.value)}
                      onChange={() => handleServiceTypeChange(type.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Status Filter */}
        <div>
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Payment Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterSection;
