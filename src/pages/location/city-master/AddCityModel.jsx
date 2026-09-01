import React, { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import {
  addCity,
  getAllStates,
  updateCity,
} from "../../../services/apiServices";
import { notify } from "@/utils/toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

const AddCityModel = ({ open, onClose, editData, onSuccess, isViewOnly = false }) => {
  const [states, setStates] = useState([]);

  const [form, setForm] = useState({
    name: "",
    stateId: "",
  });

  const [stateSearch, setStateSearch] = useState("");
  const [stateOpen, setStateOpen] = useState(false);

  const isEditMode = !!editData;

  // ---------------- FORM SET / RESET ----------------
  useEffect(() => {
    if (!open) {
      setForm({
        name: "",
        stateId: "",
      });

      setStateSearch("");
      setStateOpen(false);

      return;
    }

    if (editData) {
      setForm({
        name: editData.name ?? "",
        stateId: editData.stateId
          ? String(editData.stateId)
          : editData.state?.id
            ? String(editData.state.id)
            : "",
      });
    } else {
      setForm({
        name: "",
        stateId: "",
      });

      setStateSearch("");
    }
  }, [open, editData]);

  // ---------------- FETCH STATES ----------------
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await getAllStates();
        const payload = res.data;

        if (payload?.success) {
          const mapped = (payload.data || []).map((item) => ({
            id: item.id,
            name: item.name,
          }));

          setStates(mapped);
        } else {
          notify.error("Failed to load states.");
        }
      } catch (err) {
        console.error(err);
        notify.error("Something went wrong while fetching states.");
      }
    };

    if (open) {
      fetchStates();
    }
  }, [open]);

  // ---------------- SYNC STATE SEARCH INPUT ----------------
  useEffect(() => {
    if (!editData || states.length === 0) return;

    const matchedState = states.find(
      (item) =>
        String(item.id) === String(editData.stateId || editData.state?.id)
    );

    if (matchedState) {
      setStateSearch(matchedState.name || "");
    }
  }, [editData, states]);

  // ---------------- SAVE / UPDATE ----------------
  const handleSave = async () => {
    if (!form.stateId) {
      notify.error("Please select a State.");
      return;
    }

    if (!form.name.trim()) {
      notify.error("City Name is required.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      stateId: Number(form.stateId),
    };

    try {
      let res;

      if (isEditMode) {
        res = await updateCity(editData.id, payload);
      } else {
        res = await addCity(payload);
      }

      if (res.data?.success) {
        notify.success(
          isEditMode
            ? "City updated successfully."
            : "City added successfully."
        );

        onSuccess?.();
        onClose();
      } else {
        notify.error(res.data?.message || "Operation failed.");
      }
    } catch (err) {
      console.error(err);
      notify.error("Something went wrong.");
    }
  };

  if (!open) return null;

  const filteredStates = states.filter((item) =>
    item.name
      ?.toLowerCase()
      .includes(stateSearch.trim().toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[90vh] p-6">

        {/* Header */}
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-xl font-semibold">
            {isViewOnly
              ? "View City Details"
              : isEditMode
              ? "Update City"
              : "Create New City"}
          </h2>

          <X
            className="cursor-pointer text-gray-500"
            onClick={onClose}
          />
        </div>

        {/* Form */}
        <div className="mt-4 grid grid-cols-1 gap-4">

          {/* State */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm">
              Select State{" "}
              <span className="text-red-500">*</span>
            </label>

            <Popover
              open={!isViewOnly && stateOpen}
              onOpenChange={!isViewOnly ? setStateOpen : undefined}
              modal={false}
            >
              <PopoverTrigger asChild>
                <div className="relative w-full">
                  <Input
                    type="text"
                    value={stateSearch}
                    placeholder="Select State"
                    disabled={isViewOnly}
                    onClick={() => {
                      if (!isViewOnly) setStateOpen(true);
                    }}
                    onChange={(e) => {
                      if (isViewOnly) return;
                      setStateSearch(e.target.value);
                      setStateOpen(true);

                      if (form.stateId) {
                        setForm((prev) => ({
                          ...prev,
                          stateId: "",
                        }));
                      }
                    }}
                    className="w-full h-10 pr-10"
                  />

                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </PopoverTrigger>

              <PopoverContent
                side="bottom"
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) =>
                  e.preventDefault()
                }
                className="p-0 w-(--radix-popover-trigger-width) overflow-hidden z-100"
              >
                <div className="max-h-52 overflow-y-auto">

                  {filteredStates.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(e) =>
                        e.preventDefault()
                      }
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          stateId: String(item.id),
                        }));

                        setStateSearch(
                          item.name || ""
                        );

                        setStateOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50 ${
                        String(form.stateId) ===
                        String(item.id)
                          ? "bg-blue-50 text-primary font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}

                  {filteredStates.length === 0 && (
                    <div className="px-3 py-3 text-sm text-gray-500">
                      No state found
                    </div>
                  )}

                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* City Name */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm">
              City Name{" "}
              <span className="text-red-500">*</span>
            </label>

            <input
              type="text"
              name="name"
              disabled={isViewOnly}
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="Enter city name"
              className="w-full border rounded px-4 py-2 outline-none focus:ring-2 focus:ring-[#084E92] disabled:bg-gray-50"
            />
          </div>

        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-5">

          <button
            onClick={onClose}
            className="px-6 py-2 rounded bg-gray-200 cursor-pointer text-sm"
          >
            {isViewOnly ? "Close" : "Cancel"}
          </button>

          {!isViewOnly && (
            <button
              onClick={handleSave}
              className="px-6 py-2 rounded bg-[#084E92] text-white cursor-pointer text-sm"
            >
              {isEditMode ? "Update" : "Save"}
            </button>
          )}

        </div>

      </div>
    </div>
  );
};

export default AddCityModel;