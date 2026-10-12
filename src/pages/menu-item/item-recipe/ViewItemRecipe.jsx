import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Scale,
  Flame,
  Layers,
  FileText,
  ExternalLink,
  Zap,
  Info,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router";
import { Container } from "@/components/common/container";
import { PageHeader } from "@/components/common/PageHeader";
import {
  getKitchenMenuItemRecipe,
  getAllKitchenMenuItem,
  getAllRawMaterialUnits,
} from "../../../services/apiServices";
import { useOrgScope } from "@/hooks/useOrgScope";
import { getOrgIdFromToken } from "../../../utils/auth";
import { notify } from "@/utils/toast";

const ViewItemRecipe = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: paramItemId } = useParams();
  const [searchParams] = useSearchParams();

  const { units, effectiveOutletId } = useOrgScope();

  const returnUrl = useMemo(
    () => location.state?.returnUrl || "/menu-item/recipe",
    [location.state]
  );

  const menuItemId =
    paramItemId ||
    location.state?.menuItemId ||
    searchParams.get("menuItemId") ||
    "";

  const outletId =
    location.state?.orgId ||
    searchParams.get("orgId") ||
    effectiveOutletId ||
    getOrgIdFromToken() ||
    "";

  const [loading, setLoading] = useState(true);
  const [recipeData, setRecipeData] = useState(null);
  const [menuItemDetails, setMenuItemDetails] = useState(null);
  const [unitCatalog, setUnitCatalog] = useState([]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const [unitsRes, menuRes] = await Promise.all([
          getAllRawMaterialUnits(),
          getAllKitchenMenuItem({ page: 1, size: 2000, isAsc: true }),
        ]);

        const rawUnits =
          unitsRes?.data?.data?.["Unit Details"] ||
          unitsRes?.data?.["Unit Details"] ||
          unitsRes?.data?.data ||
          [];
        setUnitCatalog(Array.isArray(rawUnits) ? rawUnits : []);

        const menuList =
          menuRes?.data?.data?.items ||
          menuRes?.data?.data ||
          menuRes?.data ||
          [];
        if (Array.isArray(menuList)) {
          const match = menuList.find((m) => String(m.id) === String(menuItemId));
          setMenuItemDetails(match || null);
        }
      } catch (err) {
        console.error("Failed to load catalog details:", err);
      }
    };
    fetchCatalog();
  }, [menuItemId]);

  useEffect(() => {
    if (!menuItemId || !outletId) {
      setLoading(false);
      return;
    }

    const fetchRecipe = async () => {
      try {
        setLoading(true);
        const res = await getKitchenMenuItemRecipe({
          menuItemId: Number(menuItemId),
          orgId: Number(outletId),
        });
        const payload = res?.data?.data ?? res?.data;
        setRecipeData(payload || null);
      } catch (err) {
        console.error("Failed to load recipe details:", err);
        notify.error("Failed to fetch recipe details");
      } finally {
        setLoading(false);
      }
    };

    fetchRecipe();
  }, [menuItemId, outletId]);

  const header = useMemo(() => {
    if (!recipeData) return null;
    if (Array.isArray(recipeData.headers) && recipeData.headers.length > 0) {
      return (
        recipeData.headers.find(
          (h) =>
            Number(h.menuItemId) === Number(menuItemId) &&
            Number(h.orgId) === Number(outletId)
        ) || recipeData.headers[0]
      );
    }
    return recipeData;
  }, [recipeData, menuItemId, outletId]);

  const rawMaterials = useMemo(
    () => (Array.isArray(recipeData?.rawMaterials) ? recipeData.rawMaterials : []),
    [recipeData]
  );

  const captainRecipes = useMemo(() => {
    return (
      (Array.isArray(recipeData?.captainReceipes)
        ? recipeData.captainReceipes
        : Array.isArray(recipeData?.captainRecipes)
        ? recipeData.captainRecipes
        : []) || []
    );
  }, [recipeData]);

  const otherCosts = useMemo(() => {
    return (
      (Array.isArray(header?.otherCosts)
        ? header.otherCosts
        : Array.isArray(recipeData?.otherCosts)
        ? recipeData.otherCosts
        : []) || []
    );
  }, [header, recipeData]);

  const outletName = useMemo(() => {
    const match = (units || []).find((u) => String(u.id) === String(outletId));
    return match?.name || `Outlet #${outletId}`;
  }, [units, outletId]);

  const getUnitName = (id, fallback) => {
    if (!id) return fallback || "—";
    const match = unitCatalog.find((u) => String(u.id) === String(id));
    return match?.nameEnglish || match?.unitName || fallback || `Unit #${id}`;
  };

  if (loading) {
    return (
      <Container>
        <div className="py-8 text-center text-sm text-gray-500">
          Loading recipe details...
        </div>
      </Container>
    );
  }

  if (!recipeData) {
    return (
      <Container>
        <div className="py-14 text-center">
          <Info size={36} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm font-semibold text-gray-700">No Recipe Details Found</p>
          <button
            onClick={() => navigate(returnUrl)}
            className="mt-4 px-4 py-2 bg-[#084E92] text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Back to List
          </button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="pt-2 pb-8 mx-auto space-y-4">
        {/* Header */}
        <PageHeader
          title="View Recipe Details"
          description="Standard recipe formulation and raw material measurements."
          actions={
            <button
              type="button"
              onClick={() => navigate(returnUrl)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Recipe
            </button>
          }
        />

        {/* Overview Information Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-gray-400 font-medium block">Menu Item</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {menuItemDetails?.nameEnglish || recipeData?.name || `Item #${menuItemId}`}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium block">Unit </span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{outletName}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium block">Weight</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {header?.weight ?? recipeData?.weight ?? "—"}{" "}
                <span className="text-xs font-normal text-gray-500">
                  {getUnitName(header?.unitId ?? recipeData?.unitId)}
                </span>
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium block">Calories</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {header?.calories ?? recipeData?.calories ?? "0"}{" "}
                <span className="text-xs font-normal text-gray-500">kcal</span>
              </p>
            </div>
          </div>
        </div>

       {/* Raw Materials Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              Raw Material Items ({rawMaterials.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-4 w-[10%] text-center">Sr No.</th>
                  <th className="py-2.5 px-4 w-[28%] truncate">Raw Material Name</th>
                  <th className="py-2.5 px-4 w-[22%] truncate">Category</th>
                  <th className="py-2.5 px-4 w-[20%] truncate">Weight / Qty</th>
                  <th className="py-2.5 px-4 w-[20%] truncate">Unit of Measure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {rawMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-400">
                      No raw material ingredients found.
                    </td>
                  </tr>
                ) : (
                  rawMaterials.map((rm, idx) => (
                    <tr key={rm.id || idx} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-4 text-center text-gray-400">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-gray-900 truncate" title={rm.name || rm.rawMaterialName || rm.rawMaterial?.nameEnglish}>
                        {rm.name || rm.rawMaterialName || rm.rawMaterial?.nameEnglish || `Material #${rm.rawMaterialId}`}
                      </td>
                      <td className="py-2.5 px-4 text-gray-500 truncate" title={rm.category || rm.rawMaterial?.rawMaterialCat?.nameEnglish}>
                        {rm.category || rm.rawMaterial?.rawMaterialCat?.nameEnglish || "-"}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-gray-900 truncate">
                        {rm.weight ?? "-"}
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 truncate">
                        {rm.unitName || rm.unit?.nameEnglish || getUnitName(rm.unitId)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Captain Recipes Table */}
        {captainRecipes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                Captain Sub-Recipes ({captainRecipes.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-4 w-[8%] text-center">Sr No.</th>
                    <th className="py-2.5 px-4 w-[30%] truncate">Recipe Name</th>
                    <th className="py-2.5 px-4 w-[20%] truncate">Weight</th>
                    <th className="py-2.5 px-4 w-[20%] truncate">Unit of Measure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {captainRecipes.map((cr, idx) => (
                    <tr key={cr.id || idx} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-4 text-center text-gray-400">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-gray-900 truncate" title={cr.name}>
                        {cr.name || `Captain Recipe #${cr.id}`}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-gray-900 truncate">
                        {cr.weight ?? "-"}
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 truncate">
                        {cr.unitName || getUnitName(cr.unitId)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Other Items / Utilities */}
        {otherCosts.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                Other Items & Fuel ({otherCosts.length})
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {otherCosts.map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase block">
                      {item.itemType || (item.isLpgItem ? "LPG" : "OTHER")}
                    </span>
                    <p className="text-xs font-semibold text-gray-900 mt-0.5">
                      {item.rawMaterialName || `Material #${item.rawMaterialId}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-900">{item.quantity}</span>{" "}
                    <span className="text-[11px] text-gray-500">{item.unitName || getUnitName(item.unitId)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions & Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
            Preparation Instructions & Remarks
          </h3>

          <div>
            <span className="text-xs font-semibold text-gray-700 block mb-1">Instruction:</span>
            <div className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-800 whitespace-pre-line leading-relaxed">
              {header?.instructionEnglish || "No instructions provided."}
            </div>
          </div>

          {header?.url && (
            <div>
              <span className="text-xs font-semibold text-gray-700 block mb-1">Reference URL:</span>
              <a
                href={header.url.startsWith("http") ? header.url : `https://${header.url}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#084E92] hover:underline"
              >
                <span>{header.url}</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          {header?.remarks && (
            <div>
              <span className="text-xs font-semibold text-gray-700 block mb-1">Remarks:</span>
              <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                {header.remarks}
              </p>
            </div>
          )}
        </div>

        {/* Footer Close Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => navigate(returnUrl)}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold cursor-pointer transition"
          >
            Close
          </button>
        </div>
      </div>
    </Container>
  );
};

export default ViewItemRecipe;