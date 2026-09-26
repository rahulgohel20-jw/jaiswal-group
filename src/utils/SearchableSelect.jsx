import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition-all duration-150 focus:border-[#084E92] focus:ring-2 focus:ring-[#084E92]/15 hover:border-gray-300";

const errorInputCls =
  "w-full border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition-all duration-150 focus:border-red-500 focus:ring-2 focus:ring-red-500/15";

const SearchableSelect = ({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  disabled = false,
  hasError = false,
  name,
  isClearable = true,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = options.find(
    (option) => String(option.value) === String(value)
  );

  const selectedLabel = selectedOption?.label || "";

  const filteredOptions = options.filter((option) =>
    String(option.label || "")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const handleSelect = (option) => {
    const isAlreadySelected = String(value) === String(option.value);
    onChange({
      target: {
        name,
        value: isAlreadySelected ? "" : String(option.value),
      },
    });

    setSearch("");
    setOpen(false);
  };

  const handleClear = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    onChange({
      target: {
        name,
        value: "",
      },
    });
    setSearch("");
    setOpen(false);
  };

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    setSearch(inputValue);
    setOpen(true);
    if (inputValue !== selectedLabel) {
      onChange({
        target: {
          name,
          value: "",
        },
      });
    }
  };

  const handleInputClick = () => {
    if (disabled) return;
    setOpen(true);
    setSearch("");
  };

  const handleOpenChange = (nextOpen) => {
    if (disabled) return;
    setOpen(nextOpen);
    setSearch("");
  };

  const hasValue = value !== undefined && value !== null && String(value).trim() !== "";

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      modal={false}
    >
      <PopoverTrigger asChild>
        <div className="relative w-full group">
          <Input
            name={name}
            value={open ? search : selectedLabel}
            disabled={disabled}
            placeholder={open && selectedLabel ? selectedLabel : placeholder}
            onClick={handleInputClick}
            onChange={handleInputChange}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-autocomplete="none"
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            className={
              hasError
                ? `${errorInputCls} pr-14 h-10.5`
                : `${inputCls} pr-14 h-10.5`
            }
          />

          {hasValue && !disabled && isClearable && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClear}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition cursor-pointer z-10"
              title="Clear selection"
            >
              <X size={14} />
            </button>
          )}

          <ChevronDown
            size={16}
            className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none transition-transform duration-200 ${
              disabled
                ? "text-gray-300"
                : open
                ? "text-[#084E92] rotate-180"
                : "text-gray-400 group-hover:text-gray-600"
            }`}
          />
        </div>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="p-1.5 w-(--radix-popover-trigger-width) min-w-[200px] overflow-hidden z-100 bg-white rounded-xl shadow-xl shadow-slate-900/10 border border-slate-200/90 ring-1 ring-black/[0.03]"
      >
        <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
          {hasValue && isClearable && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClear}
              className="w-full text-left px-3 py-2 text-xs rounded-lg text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 font-medium transition cursor-pointer mb-1 border-b border-gray-100"
            >
              <X size={13} className="shrink-0" />
              Clear selection
            </button>
          )}

          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const isSelected = String(value) === String(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? "bg-blue-50/90 text-[#084E92] font-semibold shadow-xs"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-normal"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected ? (
                    <span className="flex items-center gap-1 text-[11px] text-[#084E92] bg-blue-100/80 px-2 py-0.5 rounded-md font-semibold shrink-0">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      Selected
                    </span>
                  ) : null}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-4 text-xs text-gray-400 text-center flex flex-col items-center justify-center gap-1">
              <Search className="w-4 h-4 text-gray-300" />
              <span>No options found</span>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;