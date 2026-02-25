"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/providers/AuthContext";
import { dbAPI } from "@/services/api";
import toast from "react-hot-toast";
import { Database, Play, Table, Columns, Loader2, Copy, Check, AlertCircle } from "lucide-react";

function DbQueryContent() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  
  const [sql, setSql] = useState("SELECT * FROM businesses LIMIT 10");
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [schema, setSchema] = useState([]);
  const [copied, setCopied] = useState(false);

  // Redirect non-owners away
  useEffect(() => {
    if (!isOwner) {
      window.location.href = '/';
    }
  }, [isOwner]);

  // Show loading while checking or redirecting
  if (!isOwner) {
    return null;
  }

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const res = await dbAPI.getTables();
      setTables(res.data.tables || []);
    } catch (err) {
      console.error("Error loading tables:", err);
    }
  };

  const loadSchema = async (tableName) => {
    if (!tableName) {
      setSchema([]);
      return;
    }
    try {
      const res = await dbAPI.getSchema(tableName);
      setSchema(res.data.columns || []);
    } catch (err) {
      console.error("Error loading schema:", err);
    }
  };

  const handleTableSelect = (e) => {
    const tableName = e.target.value;
    setSelectedTable(tableName);
    loadSchema(tableName);
    // Auto-generate SELECT query
    if (tableName) {
      setSql(`SELECT * FROM ${tableName} LIMIT 50`);
    }
  };

  const executeQuery = async () => {
    if (!sql.trim()) {
      toast.error("Please enter a SQL query");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await dbAPI.executeQuery(sql);
      setResults(res.data);
      if (res.data.rows?.length > 0) {
        toast.success(`Query returned ${res.data.rowCount} rows`);
      } else {
        toast.success("Query executed successfully (no rows returned)");
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const copyResults = () => {
    if (results?.rows) {
      const text = JSON.stringify(results.rows, null, 2);
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Results copied to clipboard");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <Database className="text-indigo-400" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Database Query</h1>
          <p className="text-sm text-zinc-500">Run SELECT queries on your database</p>
        </div>
      </div>

      {/* Quick Table Access */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Table size={20} />
          Quick Table Access
        </h2>
        
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Select Table
            </label>
            <select
              value={selectedTable}
              onChange={handleTableSelect}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">-- Select a table --</option>
              {tables.map(table => (
                <option key={table} value={table}>{table}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Schema Display */}
        {schema.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-2 flex items-center gap-2">
              <Columns size={16} />
              Table Schema: {selectedTable}
            </h3>
            <div className="bg-zinc-800/50 rounded-xl p-4 max-h-48 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-700">
                    <th className="text-left py-2 pr-4">Column</th>
                    <th className="text-left py-2 pr-4">Type</th>
                    <th className="text-left py-2 pr-4">Nullable</th>
                    <th className="text-left py-2">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {schema.map((col, idx) => (
                    <tr key={idx} className="border-b border-zinc-800 last:border-0">
                      <td className="py-2 pr-4 text-white font-mono">{col.column_name}</td>
                      <td className="py-2 pr-4 text-zinc-400">{col.data_type}</td>
                      <td className="py-2 pr-4 text-zinc-400">{col.is_nullable}</td>
                      <td className="py-2 text-zinc-500">{col.column_default || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Query Editor */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">SQL Query</h2>
        
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          placeholder="SELECT * FROM table_name WHERE ..."
          className="w-full h-40 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white font-mono text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
        />
        
        <div className="flex gap-3 mt-4">
          <button
            onClick={executeQuery}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play size={18} />
                Execute Query
              </>
            )}
          </button>
          
          {results?.rows && (
            <button
              onClick={copyResults}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy Results
                </>
              )}
            </button>
          )}
        </div>
        
        <p className="text-xs text-zinc-500 mt-2">
          Only SELECT queries are allowed for security reasons.
        </p>
      </div>

      {/* Results */}
      {(results || error) && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Results</h2>
            {results && (
              <span className="text-sm text-zinc-400">
                {results.rowCount} row{results.rowCount !== 1 ? 's' : ''} returned
              </span>
            )}
          </div>
          
          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-red-400 font-medium">Query Error</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}
          
          {results?.rows && results.rows.length > 0 && (
            <div className="overflow-auto max-h-96">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-400 border-b border-zinc-700">
                    {results.columns?.map((col, idx) => (
                      <th key={idx} className="text-left py-3 px-4 font-medium">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                      {results.columns?.map((col, colIdx) => (
                        <td key={colIdx} className="py-3 px-4 text-zinc-300 font-mono text-xs">
                          {row[col] === null ? (
                            <span className="text-zinc-600">NULL</span>
                          ) : typeof row[col] === 'object' ? (
                            JSON.stringify(row[col])
                          ) : (
                            String(row[col])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {results?.rows?.length === 0 && !error && (
            <p className="text-zinc-400 text-center py-8">No results returned</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function DbQueryPage() {
  return (
    <ProtectedRoute>
      <DbQueryContent />
    </ProtectedRoute>
  );
}
