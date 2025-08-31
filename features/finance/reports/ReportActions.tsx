import React from 'react';

export function ReportActions() {
  return (
    <div className="flex flex-wrap gap-4 mb-8">
      <button className="bg-blue-600 shadow px-4 py-2 rounded text-white">
        Export as PDF
      </button>
      <button className="bg-green-600 shadow px-4 py-2 rounded text-white">
        Export as Excel
      </button>
      <button className="bg-gray-700 shadow px-4 py-2 rounded text-white">
        Email Report
      </button>
      <button className="bg-indigo-600 shadow px-4 py-2 rounded text-white">
        Printable Statement
      </button>

      
    </div>
  );
}
