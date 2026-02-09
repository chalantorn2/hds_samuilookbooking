import React, { useState, useEffect, useRef, useCallback } from "react";
import { FiX } from "react-icons/fi";
import { debounce } from "lodash";

const AutocompleteInput = ({
  value,
  onChange,
  onSelect,
  placeholder,
  options = [],
  displayField = "name", // field to display in dropdown (e.g., "name")
  valueField = "code", // field to use as value (e.g., "code")
  secondaryField = "code", // secondary field to display (e.g., "code")
  disabled = false,
  className = "",
  icon: Icon,
  onSearch, // callback function for API search
}) => {
  const [showResults, setShowResults] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const debouncedSearchRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Initialize debounced search function once
  useEffect(() => {
    debouncedSearchRef.current = debounce(async (term) => {
      if (term.length >= 1) {
        setIsLoading(true);
        try {
          if (onSearch) {
            // Use API search if provided
            const results = await onSearch(term);
            setFilteredOptions(results);
            setShowResults(results.length > 0);
          } else {
            // Fallback to client-side filtering
            const filtered = options.filter((option) => {
              const searchLower = term.toLowerCase();
              const codeMatch = option[valueField]
                ?.toLowerCase()
                .includes(searchLower);
              const nameMatch = option[displayField]
                ?.toLowerCase()
                .includes(searchLower);
              return codeMatch || nameMatch;
            });
            setFilteredOptions(filtered);
            setShowResults(filtered.length > 0);
          }
        } catch (error) {
          console.error("Search error:", error);
          setFilteredOptions([]);
          setShowResults(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setFilteredOptions([]);
        setShowResults(false);
      }
    }, 300);

    return () => {
      if (debouncedSearchRef.current) {
        debouncedSearchRef.current.cancel();
      }
    };
  }, [onSearch, options, displayField, valueField]);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Trigger search
    if (debouncedSearchRef.current) {
      if (newValue.length > 0) {
        debouncedSearchRef.current(newValue);
      } else {
        setFilteredOptions([]);
        setShowResults(false);
      }
    }
  };

  const handleSelect = (option) => {
    const selectedValue = option[valueField];
    setShowResults(false);
    setFilteredOptions([]);
    if (onSelect) {
      onSelect(option);
    }
    onChange(selectedValue);
  };

  const handleClear = () => {
    setShowResults(false);
    setFilteredOptions([]);
    onChange("");
    if (onSelect) {
      onSelect(null);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      {Icon && <Icon size={18} className="text-gray-500 flex-shrink-0" />}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <FiX size={16} />
          </button>
        )}

        {/* Dropdown Results */}
        {!disabled && (showResults || isLoading) && (
          <div
            ref={dropdownRef}
            className="absolute z-30 mt-1 w-full bg-white shadow-lg rounded-md border max-h-60 overflow-y-auto information-dropdown"
          >
            {isLoading ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                กำลังค้นหา...
              </div>
            ) : filteredOptions.length > 0 ? (
              <ul>
                {filteredOptions.map((option) => (
                  <li
                    key={option.id || option[valueField]}
                    onClick={() => handleSelect(option)}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex flex-col"
                  >
                    <span className="font-medium text-sm text-gray-800">
                      {option[displayField]}
                    </span>
                    {secondaryField && option[secondaryField] && (
                      <span className="text-xs text-gray-500">
                        {option[secondaryField]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500">ไม่พบข้อมูล</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AutocompleteInput;
