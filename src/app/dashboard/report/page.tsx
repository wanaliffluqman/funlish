"use client";

import { useState, useRef } from "react";
import {
  useAttendance,
  type AttendanceRecord,
  type LocationData,
} from "@/context/AttendanceContext";

export default function ReportPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Use shared attendance context - same data as attendance page
  const { members: attendanceData, stats } = useAttendance();

  const filteredData = attendanceData.filter((record) => {
    const matchesSearch =
      record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || record.status === filterStatus;
    return matchesSearch && matchesStatus;
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
          body * {
            visibility: hidden;
          }
          #print-area,
          #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 10px;
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
          .print-card {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print-break {
            page-break-after: always;
          }
          .print-break-before {
            page-break-before: always;
            break-before: page;
          }
          @page {
            margin: 0.5cm;
            size: A4;
          }
        }
      `}</style>

      <div className="p-4 md:p-6 lg:p-8">
        {/* Header with Export Button */}
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
              placeholder="Search by name or role..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
            />
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
              <option value="all">All</option>
              <option value="attend">Attend</option>
              <option value="absent">Absent</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Printable Area */}
        <div id="print-area" ref={printRef}>
          {/* Report Header - For Print */}
          <div className="hidden print:block mb-8 text-center border-b-2 border-gray-300 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">FUNLISH</h1>
            <h2 className="text-xl font-semibold text-gray-700 mt-1">
              Committee Attendance Report
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Generated on:{" "}
              {new Date().toLocaleDateString("en-MY", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Print-Only Card Grid - Shows full details for each committee member */}
          {/* 6 cards per page: 2 columns x 3 rows */}
          <div className="hidden print:block">
            {Array.from({ length: Math.ceil(filteredData.length / 6) }).map((_, pageIndex) => (
              <div key={pageIndex} className={pageIndex > 0 ? "print-break-before" : ""}>
                <div className="grid grid-cols-2 gap-4" style={{ height: "calc(100vh - 120px)" }}>
                  {filteredData.slice(pageIndex * 6, (pageIndex + 1) * 6).map((record, index) => (
                    <div
                      key={record.id}
                      className="print-card border-2 border-gray-300 rounded-lg p-3 bg-white"
                      style={{ height: "calc((100vh - 160px) / 3)" }}
                    >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-2">
                    {/* Card Number */}
                    <span className="text-xs font-bold text-gray-500">
                      #{pageIndex * 6 + index + 1}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        record.status === "attend"
                          ? "bg-green-100 text-green-700 border border-green-300"
                          : record.status === "absent"
                          ? "bg-red-100 text-red-700 border border-red-300"
                          : "bg-yellow-100 text-yellow-700 border border-yellow-300"
                      }`}
                    >
                      {record.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Photo */}
                  <div className="flex justify-center mb-3">
                    {record.photoUrl ? (
                      <div className="w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={record.photoUrl}
                          alt={`${record.name} verification photo`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                          <svg
                            className="w-10 h-10 mx-auto text-gray-400"
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
                          <p className="text-xs text-gray-400 mt-1">No Photo</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-1 text-center">
                    <h3 className="font-bold text-gray-900 text-sm">
                      {record.name}
                    </h3>
                    <p className="text-xs text-gray-600">{record.role}</p>
                  </div>

                  {/* Check-in Info */}
                  {record.timestamp && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
                        <svg
                          className="w-3 h-3"
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
                          {formatDateTime(record.timestamp).date}{" "}
                          {formatDateTime(record.timestamp).time}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Location Info */}
                  {record.location && (
                    <div className="mt-1">
                      <div className="flex items-center justify-center gap-1 text-xs text-green-700">
                        <svg
                          className="w-3 h-3 flex-shrink-0"
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
                        <span className="truncate">
                          {record.location.address}
                        </span>
                      </div>
                      <p className="text-center text-xs text-gray-400 mt-0.5">
                        ({record.location.latitude.toFixed(4)},{" "}
                        {record.location.longitude.toFixed(4)}) ±{" "}
                        {record.location.accuracy}m
                      </p>
                    </div>
                  )}
                </div>
              ))}
                </div>
              </div>
            ))}
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
                      Role
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
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        {record.photoUrl ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100">
                            <img
                              src={record.photoUrl}
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
                        {record.role}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            record.status === "attend"
                              ? "bg-green-100 text-green-700"
                              : record.status === "absent"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {record.status.charAt(0).toUpperCase() +
                            record.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {record.timestamp ? (
                          <div>
                            <div>{formatDateTime(record.timestamp).date}</div>
                            <div className="text-xs text-gray-500">
                              {formatDateTime(record.timestamp).time}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {record.location ? (
                          <div>
                            <div className="text-gray-600 truncate max-w-[200px]">
                              {record.location.address}
                            </div>
                            <div className="text-xs text-gray-400">
                              ± {record.location.accuracy}m accuracy
                            </div>
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
                <div key={record.id} className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {/* Photo or Avatar */}
                    {record.photoUrl ? (
                      <div className="w-14 h-14 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100 flex-shrink-0">
                        <img
                          src={record.photoUrl}
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
                      <p className="text-sm text-gray-600">{record.role}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                        record.status === "attend"
                          ? "bg-green-100 text-green-700"
                          : record.status === "absent"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {record.status.charAt(0).toUpperCase() +
                        record.status.slice(1)}
                    </span>
                  </div>

                  {record.timestamp && (
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
                          {formatDateTime(record.timestamp).date}{" "}
                          {formatDateTime(record.timestamp).time}
                        </span>
                      </div>
                    </div>
                  )}

                  {record.location && (
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
                      <span className="truncate">
                        {record.location.address}
                      </span>
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
