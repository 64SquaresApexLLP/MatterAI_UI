import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  FileText,
  Edit,
  Trash2,
  Copy,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { timesheetAPI } from "./api/apiService.js";

const TimesheetEntries = ({ onClose }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [filters, setFilters] = useState({
    client: "",
    matter: "",
    timekeeper: "",
    entry_type: "",
    date_from: "",
    date_to: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const loadEntries = async (page = 1, currentFilters = filters) => {
    try {
      setLoading(true);
      setError(null);

      const queryFilters = {
        page,
        page_size: pageSize,
        ...Object.fromEntries(
          Object.entries(currentFilters).filter(
            ([_, value]) => value && value.trim() !== ""
          )
        ),
      };

      console.log("Loading timesheet entries with filters:", queryFilters);
      const response = await timesheetAPI.getEntries(queryFilters);

      if (response.success) {
        setEntries(response.entries || []);
        setTotalCount(response.total_count || 0);
        setCurrentPage(page);
        console.log(
          `Loaded ${response.entries?.length || 0} timesheet entries`
        );
      } else {
        setError(response.message || "Failed to load timesheet entries");
      }
    } catch (err) {
      console.error("Error loading timesheet entries:", err);
      setError(err.message || "Failed to load timesheet entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadEntries(1, filters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      client: "",
      matter: "",
      timekeeper: "",
      entry_type: "",
      date_from: "",
      date_to: "",
    };
    setFilters(clearedFilters);
    setCurrentPage(1);
    loadEntries(1, clearedFilters);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(totalCount / pageSize)) {
      loadEntries(newPage);
    }
  };

  const handleDelete = async (entryId) => {
    if (
      window.confirm("Are you sure you want to delete this timesheet entry?")
    ) {
      try {
        const response = await timesheetAPI.deleteEntry(entryId);
        if (response.success) {
          loadEntries(currentPage); // Reload current page
        } else {
          alert("Failed to delete entry: " + response.message);
        }
      } catch (err) {
        alert("Error deleting entry: " + err.message);
      }
    }
  };

  const handleDuplicate = async (entryId) => {
    try {
      const response = await timesheetAPI.duplicateEntry(entryId);
      if (response.success) {
        loadEntries(currentPage); // Reload current page
        alert("Entry duplicated successfully!");
      } else {
        alert("Failed to duplicate entry: " + response.message);
      }
    } catch (err) {
      alert("Error duplicating entry: " + err.message);
    }
  };

  const formatCurrency = (amount, currency) => {
    const currencySymbols = {
      USD: "$",
      EUR: "€",
      GBP: "£",
    };
    const symbol = currencySymbols[currency] || "$";
    return `${symbol}${parseFloat(amount || 0).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-[#062e69]/30 p-8 rounded-2xl max-w-6xl mx-auto shadow-2xl">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin mr-2" size={24} />
          <span className="text-[#062e69]">Loading timesheet entries...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-md border border-[#062e69]/30 p-8 rounded-2xl max-w-6xl mx-auto shadow-2xl relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#062e69]">Timesheet Entries</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-[#062e69]/10 text-[#062e69] rounded-lg hover:bg-[#062e69]/20 transition-all duration-200 flex items-center gap-2"
          >
            <Filter size={16} />
            Filters
          </button>
          <button
            onClick={() => loadEntries(currentPage)}
            className="px-4 py-2 bg-[#062e69]/10 text-[#062e69] rounded-lg hover:bg-[#062e69]/20 transition-all duration-200 flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 p-4 bg-[#062e69]/5 rounded-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Client"
              value={filters.client}
              onChange={(e) => handleFilterChange("client", e.target.value)}
              className="p-2 border border-[#062e69]/20 rounded-lg focus:outline-none focus:border-[#062e69]"
            />
            <input
              type="text"
              placeholder="Matter"
              value={filters.matter}
              onChange={(e) => handleFilterChange("matter", e.target.value)}
              className="p-2 border border-[#062e69]/20 rounded-lg focus:outline-none focus:border-[#062e69]"
            />
            <input
              type="text"
              placeholder="Timekeeper"
              value={filters.timekeeper}
              onChange={(e) => handleFilterChange("timekeeper", e.target.value)}
              className="p-2 border border-[#062e69]/20 rounded-lg focus:outline-none focus:border-[#062e69]"
            />
            <select
              value={filters.entry_type}
              onChange={(e) => handleFilterChange("entry_type", e.target.value)}
              className="p-2 border border-[#062e69]/20 rounded-lg focus:outline-none focus:border-[#062e69]"
            >
              <option value="">All Types</option>
              <option value="Fee">Fee</option>
              <option value="Cost">Cost</option>
            </select>
            <input
              type="date"
              placeholder="From Date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange("date_from", e.target.value)}
              className="p-2 border border-[#062e69]/20 rounded-lg focus:outline-none focus:border-[#062e69]"
            />
            <input
              type="date"
              placeholder="To Date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange("date_to", e.target.value)}
              className="p-2 border border-[#062e69]/20 rounded-lg focus:outline-none focus:border-[#062e69]"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-[#062e69] text-white rounded-lg hover:bg-[#062e69]/90 transition-all duration-200"
            >
              Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200"
            >
              Clear Filters
            </button>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Entries List */}
      {entries.length === 0 ? (
        <div className="text-center py-12 text-[#062e69]/60">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">No timesheet entries found</p>
          <p className="text-sm">
            Try adjusting your filters or create a new entry
          </p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white border border-[#062e69]/20 rounded-lg p-4 hover:shadow-md transition-all duration-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User size={16} className="text-[#062e69]/60" />
                    <span className="font-medium text-[#062e69]">
                      Client & Matter
                    </span>
                  </div>
                  <p className="text-sm text-[#062e69]/80">{entry.client}</p>
                  <p className="text-xs text-[#062e69]/60 truncate">
                    {entry.matter}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={16} className="text-[#062e69]/60" />
                    <span className="font-medium text-[#062e69]">Details</span>
                  </div>
                  <p className="text-sm text-[#062e69]/80">
                    {entry.timekeeper}
                  </p>
                  <p className="text-xs text-[#062e69]/60">
                    {formatDate(entry.date || entry.entry_date)}
                  </p>
                  <p className="text-xs text-[#062e69]/60 capitalize">
                    {entry.type || entry.entry_type}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-[#062e69]/60" />
                    <span className="font-medium text-[#062e69]">
                      Work/Cost
                    </span>
                  </div>
                  {entry.type === "Fee" || entry.entry_type === "Fee" ? (
                    <>
                      <p className="text-sm text-[#062e69]/80">
                        Hours: {entry.hours_worked || 0}
                      </p>
                      <p className="text-xs text-[#062e69]/60">
                        Billed: {entry.hours_billed || 0}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-[#062e69]/80">
                        Qty: {entry.quantity || 0}
                      </p>
                      <p className="text-xs text-[#062e69]/60">
                        Rate: {formatCurrency(entry.rate, entry.currency)}
                      </p>
                    </>
                  )}
                  <p className="text-xs text-[#062e69]/60">
                    Total: {formatCurrency(entry.total, entry.currency)}
                  </p>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={16} className="text-[#062e69]/60" />
                      <span className="font-medium text-[#062e69]">Status</span>
                    </div>
                    <p className="text-sm text-[#062e69]/80">
                      {entry.status || entry.entry_status}
                    </p>
                    <p className="text-xs text-[#062e69]/60">
                      {entry.bill_code}
                    </p>
                  </div>

                  <div className="flex gap-1 mt-2">
                    <button
                      onClick={() => handleDuplicate(entry.id)}
                      className="p-1 text-[#062e69]/60 hover:text-[#062e69] hover:bg-[#062e69]/10 rounded transition-all duration-200"
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1 text-red-500/60 hover:text-red-500 hover:bg-red-50 rounded transition-all duration-200"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {entry.narrative && (
                <div className="mt-3 pt-3 border-t border-[#062e69]/10">
                  <p className="text-sm text-[#062e69]/70">{entry.narrative}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-[#062e69]/60">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
            entries
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 text-[#062e69] hover:bg-[#062e69]/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="px-3 py-2 text-sm text-[#062e69]">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 text-[#062e69] hover:bg-[#062e69]/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-[#062e69]/70 hover:text-[#062e69] transition-colors duration-200 p-2 hover:bg-[#062e69]/10 rounded-full"
      >
        ×
      </button>
    </div>
  );
};

export default TimesheetEntries;
