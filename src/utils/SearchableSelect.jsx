import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition focus:border-blue-400 focus:ring-1 focus:ring-blue-300 hover:border-gray-300";

const errorInputCls =
  "w-full border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 bg-white " +
  "placeholder-gray-400 outline-none transition focus:border-red-400 focus:ring-1 focus:ring-red-300";

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
            className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
              disabled ? "text-gray-300" : "text-gray-400"
            }`}
          />
        </div>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="p-1 w-(--radix-popover-trigger-width) overflow-hidden z-100 bg-white rounded-xl shadow-lg border border-gray-100"
      >
        <div className="max-h-52 overflow-y-auto">
          {hasValue && isClearable && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleClear}
              className="w-[95%] text-left px-3 py-2 text-xs mx-1.5 rounded text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 font-semibold transition cursor-pointer mb-1 border-b border-gray-100"
            >
              <X size={13} />
              Clear selection (Unselect)
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
                  className={`w-[95%] text-left px-3 py-2.5 text-sm mx-1.5 rounded mt-0.5 transition cursor-pointer ${
                    isSelected
                      ? "bg-blue-50 text-[#084E92] font-semibold flex items-center justify-between"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && (
                    <span className="text-[10px] text-[#084E92] bg-blue-100 px-1.5 py-0.5 rounded font-medium ml-2">
                      Selected
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-3 text-sm text-gray-400 text-center">
              No options found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;