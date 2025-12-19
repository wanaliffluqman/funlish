"use client";

import { useState, useRef } from "react";
import {
  useAttendance,
  type MemberAttendance,
  DEPARTMENT_DISPLAY_NAMES,
} from "@/context/AttendanceContext";
import type { Department } from "@/types/database.types";

export default function ReportPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Use shared attendance context - same data as attendance page
  const {
    members: attendanceData,
    stats,
    selectedDate,
    setSelectedDate,
  } = useAttendance();

  const filteredData = attendanceData.filter((record) => {
    const matchesSearch =
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || record.status === filterStatus;
    const matchesDepartment =
      filterDepartment === "all" || record.department === filterDepartment;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const attendanceRate =
    stats.total > 0 ? Math.round((stats.attend / stats.total) * 100) : 0;

  const handleExportPDF = () => {
    window.print();
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString("en-MY", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-MY", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          /* Reset everything for consistent print across devices */
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Force A4 dimensions regardless of device */
          html {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 16px !important;
          }

          body {
            width: 210mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
            font-size: 16px !important;
            -webkit-text-size-adjust: 100% !important;
            text-size-adjust: 100% !important;
          }

          /* Hide everything first */
          body * {
            visibility: hidden;
          }

          /* Show only print area */
          #print-area,
          #print-area * {
            visibility: visible;
          }

          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm !important;
            max-width: 210mm !important;
            padding: 0;
            margin: 0;
            transform: none !important;
            zoom: 1 !important;
          }

          .no-print {
            display: none !important;
          }

          .print-only {
            display: block !important;
          }

          .screen-only {
            display: none !important;
          }

          .print-break-before {
            page-break-before: always !important;
            break-before: page !important;
          }

          /* Cover page - centered content */
          .cover-page {
            width: 210mm !important;
            height: 297mm !important;
            max-width: 210mm !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            page-break-after: always !important;
            break-after: page !important;
            padding: 20mm !important;
          }

          /* Card grid pages */
          .print-page {
            width: 210mm !important;
            height: 297mm !important;
            max-width: 210mm !important;
            padding: 12mm 15mm !important;
            margin: 0 !important;
            page-break-inside: avoid !important;
          }

          /* 2x3 grid layout */
          .print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: repeat(3, 1fr) !important;
            gap: 8px !important;
            width: 100% !important;
            height: 100% !important;
          }

          /* Card styling */
          .print-card-item {
            border: 1.5px solid #e5e7eb !important;
            border-radius: 8px !important;
            padding: 10px 12px !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: space-between !important;
            background: white !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /* Hide mobile-specific elements in print */
          .md\\:hidden {
            display: none !important;
          }

          /* Force show desktop elements in print */
          .hidden.md\\:block {
            display: none !important;
          }

          @page {
            size: 210mm 297mm portrait !important;
            margin: 0 !important;
          }
        }
      `}</style>

      <div className="p-4 md:p-6 lg:p-8">
        {/* Header with Export Button and Date Selector */}
        <div className="mb-6 md:mb-8 no-print">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Attendance Report
              </h1>
              <p className="text-sm md:text-base text-gray-600">
                View and export committee attendance records
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Date Selector */}
              <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="border-none focus:outline-none focus:ring-0 text-sm font-medium text-gray-900 bg-transparent cursor-pointer"
                />
              </div>
              <button
                onClick={handleExportPDF}
                className="bg-indigo-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-indigo-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg text-sm md:text-base w-full sm:w-auto"
              >
                <svg
                  className="w-4 h-4 md:w-5 md:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Export PDF
              </button>
            </div>
          </div>
          {/* Show selected date info */}
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">Showing report for:</span>
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-semibold">
              {new Date(selectedDate).toLocaleDateString("en-MY", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            {selectedDate === new Date().toISOString().split("T")[0] && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                Today
              </span>
            )}
          </div>
        </div>

        {/* Filters - Not printed */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-6 mb-6 no-print">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or department..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Department
            </label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            >
              <option value="all">All Departments</option>
              {(Object.keys(DEPARTMENT_DISPLAY_NAMES) as Department[]).map(
                (dept) => (
                  <option key={dept} value={dept}>
                    {DEPARTMENT_DISPLAY_NAMES[dept]}
                  </option>
                )
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            >
              <option value="all">All Status</option>
              <option value="attend">Attend</option>
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>

        {/* Printable Area */}
        <div id="print-area" ref={printRef}>
          {/* Cover Page - For Print */}
          <div className="hidden print:flex cover-page">
            <div className="text-center">
              {/* Logo */}
              <div style={{ marginBottom: "40px" }}>
                <img
                  src="/Pictures/funlish-logo.jpeg"
                  alt="Funlish Logo"
                  style={{ width: "200px", height: "200px", margin: "0 auto" }}
                />
              </div>

              {/* Title */}
              <div style={{ marginTop: "30px" }}>
                <h1
                  style={{
                    fontSize: "32px",
                    fontWeight: "bold",
                    color: "#111827",
                    marginBottom: "16px",
                  }}
                >
                  FUNLISH
                </h1>
                <h2
                  style={{
                    fontSize: "24px",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Committee Attendance Report
                </h2>
              </div>

              {/* Date */}
              <div style={{ marginTop: "40px" }}>
                <p style={{ fontSize: "18px", color: "#4b5563" }}>
                  {new Date(selectedDate).toLocaleDateString("en-MY", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Print-Only Card Grid - Shows full details for each committee member */}
          {/* 6 cards per page: 2 columns x 3 rows */}
          <div className="hidden print:block">
            {Array.from({ length: Math.ceil(filteredData.length / 6) }).map(
              (_, pageIndex) => (
                <div
                  key={pageIndex}
                  className={`print-page ${
                    pageIndex > 0 ? "print-break-before" : ""
                  }`}
                >
                  <div className="print-grid">
                    {filteredData
                      .slice(pageIndex * 6, (pageIndex + 1) * 6)
                      .map((record, index) => (
                        <div key={record.member_id} className="print-card-item">
                          {/* Card Header */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              borderBottom: "2px solid #f3f4f6",
                              paddingBottom: "8px",
                              marginBottom: "12px",
                              width: "100%",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: "700",
                                color: "#374151",
                                backgroundColor: "#f9fafb",
                                padding: "4px 10px",
                                borderRadius: "4px",
                              }}
                            >
                              #{pageIndex * 6 + index + 1}
                            </span>
                            <span
                              style={{
                                padding: "5px 14px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "700",
                                letterSpacing: "0.5px",
                                backgroundColor:
                                  record.status === "attend"
                                    ? "#dcfce7"
                                    : "#fee2e2",
                                color:
                                  record.status === "attend"
                                    ? "#166534"
                                    : "#dc2626",
                                border: `1.5px solid ${
                                  record.status === "attend"
                                    ? "#86efac"
                                    : "#fca5a5"
                                }`,
                              }}
                            >
                              {record.status.toUpperCase()}
                            </span>
                          </div>

                          {/* Photo */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "center",
                              flex: "50",
                              alignItems: "center",
                              width: "100%",
                            }}
                          >
                            {record.photo_url ? (
                              <div
                                style={{
                                  width: "190px",
                                  height: "190px",
                                  border: "3px solid #e5e7eb",
                                  borderRadius: "10px",
                                  overflow: "hidden",
                                  backgroundColor: "#f3f4f6",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                }}
                              >
                                <img
                                  src={record.photo_url}
                                  alt={`${record.name} verification photo`}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                style={{
                                  width: "110px",
                                  height: "110px",
                                  border: "2px dashed #d1d5db",
                                  borderRadius: "10px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: "#f9fafb",
                                }}
                              >
                                <div style={{ textAlign: "center" }}>
                                  <svg
                                    style={{
                                      width: "36px",
                                      height: "36px",
                                      margin: "0 auto",
                                      color: "#9ca3af",
                                    }}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={1.5}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                  <p
                                    style={{
                                      fontSize: "10px",
                                      color: "#9ca3af",
                                      marginTop: "4px",
                                      fontWeight: "500",
                                    }}
                                  >
                                    No Photo
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Name & Department */}
                          <div
                            style={{
                              marginTop: "12px",
                              textAlign: "center",
                              width: "100%",
                              borderTop: "1px solid #f3f4f6",
                              paddingTop: "10px",
                            }}
                          >
                            <h3
                              style={{
                                fontWeight: "700",
                                color: "#111827",
                                fontSize: "13px",
                                marginBottom: "4px",
                                lineHeight: "1.3",
                                wordBreak: "break-word",
                              }}
                            >
                              {record.name}
                            </h3>
                            <p
                              style={{
                                fontSize: "11px",
                                color: "#6b7280",
                                fontWeight: "500",
                              }}
                            >
                              {DEPARTMENT_DISPLAY_NAMES[record.department]}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )
            )}
          </div>

          {/* Screen-Only Table View */}
          <div className="screen-only bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                Attendance Details
              </h2>
            </div>

            {/* Desktop Table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Photo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Check-in Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Location
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredData.map((record, index) => (
                    <tr key={record.member_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        {record.photo_url ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100">
                            <img
                              src={record.photo_url}
                              alt={`${record.name} verification`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback to initials if image fails
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                target.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold">${record.name.charAt(
                                  0
                                )}</div>`;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <svg
                              className="w-5 h-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm print:bg-indigo-500">
                            {record.name.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900 text-sm">
                            {record.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {DEPARTMENT_DISPLAY_NAMES[record.department]}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            record.status === "attend"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {record.status.charAt(0).toUpperCase() +
                            record.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {record.check_in_time ? (
                          <div>
                            <div>
                              {formatDateTime(record.check_in_time).date}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDateTime(record.check_in_time).time}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.address ? (
                          <div>
                            <div className="text-gray-600 truncate max-w-[200px]">
                              {record.address}
                            </div>
                            {record.accuracy && (
                              <div className="text-xs text-gray-400">
                                ± {record.accuracy}m accuracy
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredData.map((record, index) => (
                <div key={record.member_id} className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {/* Photo or Avatar */}
                    {record.photo_url ? (
                      <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100 flex-shrink-0">
                        <img
                          src={record.photo_url}
                          alt={`${record.name} verification`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            target.parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-lg">${record.name.charAt(
                              0
                            )}</div>`;
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {record.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          #{index + 1}
                        </span>
                        <h3 className="font-semibold text-gray-900 truncate">
                          {record.name}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        {DEPARTMENT_DISPLAY_NAMES[record.department]}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                        record.status === "attend"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {record.status.charAt(0).toUpperCase() +
                        record.status.slice(1)}
                    </span>
                  </div>

                  {record.check_in_time && (
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>
                          {formatDateTime(record.check_in_time).date}{" "}
                          {formatDateTime(record.check_in_time).time}
                        </span>
                      </div>
                    </div>
                  )}

                  {record.address && (
                    <div className="flex items-start gap-1 text-sm text-green-600">
                      <svg
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                      </svg>
                      <span className="truncate">{record.address}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* No Records Message */}
        {filteredData.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>No records found</p>
          </div>
        )}
      </div>
    </>
  );
}
