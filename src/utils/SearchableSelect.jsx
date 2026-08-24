import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
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
    onChange({
      target: {
        name,
        value: String(option.value),
      },
    });

    setSearch( "");
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

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      modal={false}
    >
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            name={name}
            value={open ? search : selectedLabel}
            disabled={disabled}
            placeholder={open && selectedLabel ? selectedLabel : placeholder}
            onClick={handleInputClick}
            onChange={handleInputChange}
            className={
              hasError
                ? `${errorInputCls} pr-10 h-10.5`
                : `${inputCls} pr-10 h-10.5`
            }
          />

          <ChevronDown
            size={16}
            className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${disabled ? "text-gray-300" : "text-gray-400"
              }`}
          />
        </div>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="p-0 w-(--radix-popover-trigger-width) overflow-hidden z-100"
      >
        <div className="max-h-52 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
              const isSelected =
                String(value) === String(option.value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(option)}
                  className={`w-[95%] text-left px-3 py-2.5 text-sm mx-1.5 rounded mt-1 hover:bg-[#f5f2f2] ${isSelected
                    ? "bg-[#f5f2f2] text-primary font-medium"
                    : "text-gray-700"
                    }`}
                >
                  {option.label}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-3 text-sm text-gray-500">
              No options found
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;