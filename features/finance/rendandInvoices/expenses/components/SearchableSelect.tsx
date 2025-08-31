import React, { useState, useRef, useEffect } from "react";

export interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MAX_VISIBLE = 5;

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlighted, setHighlighted] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );
  const visible = filtered.slice(0, MAX_VISIBLE);
  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    setHighlighted(visible.findIndex((opt) => opt.value === value));
  }, [open, value, search]);

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => (h < visible.length - 1 ? h + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => (h > 0 ? h - 1 : visible.length - 1));
    } else if (e.key === "Enter" && highlighted >= 0) {
      e.preventDefault();
      onValueChange(visible[highlighted].value);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className={`relative ${className}`}> 
      <button
        type="button"
        className={`w-full px-3 py-2 border rounded-lg text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          open ? "border-blue-500" : "border-gray-300"
        }`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? selected.label : <span className="text-gray-400">{placeholder}</span>}
      </button>
      {open && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto"
        >
          <input
            ref={inputRef}
            type="text"
            className="w-full px-3 py-2 border-b border-gray-100 focus:outline-none"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search options"
          />
          <div role="listbox">
            {visible.length === 0 ? (
              <div className="px-3 py-2 text-gray-400">No options</div>
            ) : (
              visible.map((opt, i) => (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={value === opt.value}
                  className={`px-3 py-2 cursor-pointer select-none ${
                    value === opt.value
                      ? "bg-blue-100 text-blue-700 font-semibold"
                      : highlighted === i
                      ? "bg-gray-100"
                      : ""
                  }`}
                  onMouseDown={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect; 