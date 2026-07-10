import { useState } from "react";
import { Settings, Store, ChevronRight, Zap, ShieldCheck } from "lucide-react";
import ConfigurePoints from "./ConfigurePoints";
import ManageOutlet from "./ManageOutlet";

const NAV_ITEMS = [
  {
    key: "configure_points",
    label: "Configure Points",
    description: "Set up and manage reward point rules",
    icon: <Zap className="w-5 h-5" />,
    iconBg: "bg-amber-50 text-amber-500",
    accent: "hover:border-amber-200 hover:bg-amber-50/30",
    chevronColor: "text-amber-400",
  },
  {
    key: "manage_outlet",
    label: "Manage Outlet",
    description: "Configure outlet locations and details",
    icon: <Store className="w-5 h-5" />,
    iconBg: "bg-blue-50 text-blue-500",
    accent: "hover:border-blue-200 hover:bg-blue-50/30",
    chevronColor: "text-blue-400",
  },
];

const Setting = () => {
  const [activePage, setActivePage] = useState(null);

  if (activePage === "configure_points") {
    return <ConfigurePoints onBack={() => setActivePage(null)} outletName="ahd" />;
  }

  if (activePage === "manage_outlet") {
    return <ManageOutlet onBack={() => setActivePage(null)} />;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-500">
          <Settings className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-none">Settings</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage your preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        {NAV_ITEMS.map((item, i) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActivePage(item.key)}
            style={{ animationDelay: `${i * 60}ms` }}
            className={`group w-full text-left bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm flex items-center justify-between gap-4 transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${item.accent} focus:outline-none focus:ring-2 focus:ring-blue-100`}
          >
            <div className="flex items-center gap-4">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${item.iconBg}`}>
                {item.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-800 leading-snug">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1 ${item.chevronColor}`} />
          </button>
        ))}
      </div>

      <p className="mt-8 text-xs text-gray-300 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" />
        Changes are saved automatically
      </p>
    </div>
  );
};

export default Setting;