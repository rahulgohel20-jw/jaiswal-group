import { Fragment, useState } from "react";
import { ArrowLeft, Zap } from "lucide-react";
import { Container } from '@/components/common/container';

const StepperInput = ({ value, onChange, min = 0 }) => (
  <div className="flex items-center gap-0 border border-gray-200 rounded-xl overflow-hidden bg-white w-fit">
    <button
      type="button"
      onClick={() => onChange(Math.max(min, value - 1))}
      className="w-9 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition text-lg font-semibold border-0 bg-transparent cursor-pointer select-none"
    >
      −
    </button>
    <div className="w-px h-6 bg-gray-200" />
    <input
      type="number"
      value={value}
      min={min}
      onChange={(e) => onChange(Math.max(min, Number(e.target.value)))}
      className="w-14 text-center text-sm font-semibold text-gray-800 border-0 outline-none bg-transparent py-2"
    />
    <div className="w-px h-6 bg-gray-200" />
    <button
      type="button"
      onClick={() => onChange(value + 1)}
      className="w-9 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition text-lg font-semibold border-0 bg-transparent cursor-pointer select-none"
    >
      +
    </button>
  </div>
);

const CURRENCIES = [
  { value: "INR", label: "Rupees (INR)" },
  { value: "USD", label: "Dollars (USD)" },
  { value: "EUR", label: "Euros (EUR)" },
];

const ConfigurePoints = ({ onBack, outletName = "ahd" }) => {
  const [duePoints, setDuePoints] = useState(3);
  const [overDuePoints, setOverDuePoints] = useState(2);
  const [pointsValue, setPointsValue] = useState(1);
  const [currency, setCurrency] = useState("INR");
  const [currencyValue, setCurrencyValue] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Fragment>
        <Container>

    <div className="">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-blue-800 transition mb-5 border-0 bg-transparent cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Settings
      </button>

      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Zap className="w-4 h-4 text-emerald-600" />
        </div>
        <span className="text-base font-bold text-gray-800">{outletName}</span>
      </div>

      <div className="space-y-4 max-w-3xl">

        {/* ── Section 1: Task Completion Points ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-5">
            Configure Points for Task Completion
          </h3>

          <div className="flex flex-wrap gap-5">
            {/* In Due Time */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-4 flex flex-col gap-3 min-w-[200px]">
              <p className="text-xs font-medium text-gray-500">
                Task completed in due time
              </p>
              <StepperInput value={duePoints} onChange={setDuePoints} />
            </div>

            {/* Over Due Time */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-4 flex flex-col gap-3 min-w-[200px]">
              <p className="text-xs font-medium text-gray-500">
                For tasks completed over due time
              </p>
              <StepperInput value={overDuePoints} onChange={setOverDuePoints} />
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4 leading-relaxed">
            Points / Value of Points if Changed, they will reflect for new tasks only
          </p>
        </div>

        {/* ── Section 2: Points Value ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-5">
            Configure Points Value
          </h3>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Points box */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-4 min-w-[110px]">
              <p className="text-xs font-medium text-gray-500 mb-2">Points</p>
              <input
                type="number"
                min={1}
                value={pointsValue}
                onChange={(e) => setPointsValue(Math.max(1, Number(e.target.value)))}
                className="w-full text-sm font-semibold text-gray-800 border-0 outline-none bg-transparent"
              />
            </div>

            {/* Equals sign */}
            <span className="text-lg font-bold text-gray-300 select-none">=</span>

            {/* Value box */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-4 flex items-center gap-3 flex-1 min-w-[240px]">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Value</p>
                <div className="flex items-center gap-3">
                  {/* Currency dropdown */}
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="appearance-none text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-7 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 cursor-pointer transition"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Value number */}
                  <input
                    type="number"
                    min={1}
                    value={currencyValue}
                    onChange={(e) => setCurrencyValue(Math.max(1, Number(e.target.value)))}
                    className="w-16 text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 transition bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

       

      </div>
    </div>
        </Container>

    </Fragment>
  );
};

export default ConfigurePoints;