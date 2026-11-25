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
  Edit,
  Sparkles,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router";
import { Container } from "@/components/common/container";
import { PageHeader } from "@/components/common/PageHeader";
import {
  getKitchenMenuItemRecipe,
  getKitchenCaptainReceipeById,
  getKitchenCaptainReceipeByIdAndOrg,
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
  const [enrichedCaptainRecipes, setEnrichedCaptainRecipes] = useState([]);
  const [captainLoading, setCaptainLoading] = useState(false);

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

  // Enrich Captain Recipes with Rates and Amounts
  useEffect(() => {
    const rawCaptainList =
      (Array.isArray(recipeData?.captainReceipes)
        ? recipeData.captainReceipes
        : Array.isArray(recipeData?.captainRecipes)
          ? recipeData.captainRecipes
          : []) || [];

    if (rawCaptainList.length === 0) {
      setEnrichedCaptainRecipes([]);
      return;
    }

    let isCancelled = false;

    const enrich = async () => {
      setCaptainLoading(true);
      try {
        const results = await Promise.all(
          rawCaptainList.map(async (cr) => {
            const captainRecipeId = cr.captainRecipeId || cr.kcaptainReceipeMaster?.id || cr.id;
            const rowDbId = cr.id || 0;
            const crWeight = Number(cr.weight ?? 0);

            let crPerUnitRate = Number(cr.perUnitRate ?? 0);
            let crAmount = Number(cr.rate ?? cr.amount ?? 0);

            if (crPerUnitRate <= 0 && crAmount > 0 && crWeight > 0) {
              crPerUnitRate = Number((crAmount / crWeight).toFixed(2));
            } else if (crAmount <= 0 && crPerUnitRate > 0 && crWeight > 0) {
              crAmount = Number((crWeight * crPerUnitRate).toFixed(2));
            }

            if (crPerUnitRate <= 0 && captainRecipeId) {
              try {
                const res = outletId
                  ? await getKitchenCaptainReceipeByIdAndOrg(captainRecipeId, outletId)
                  : await getKitchenCaptainReceipeById(captainRecipeId);
                const data = res?.data?.data || res?.data;
                if (data) {
                  const bw = Number(data.weight || 0);
                  const br = Number(data.recipeRate ?? data.rate ?? 0);
                  crPerUnitRate = bw > 0 ? Number((br / bw).toFixed(2)) : (Number(data.costPerKg) || 0);
                  if (crAmount <= 0) {
                    crAmount = Number((crWeight * crPerUnitRate).toFixed(2));
                  }
                }
              } catch (e) {
                console.warn("Could not fetch captain recipe for view:", captainRecipeId, e);
              }
            }

            const resolvedName =
              cr.captainRecipeName ||
              cr.name ||
              cr.kcaptainReceipeMaster?.name ||
              `Captain Recipe #${captainRecipeId}`;

            const resolvedUnitName =
              cr.unitName ||
              cr.unitHierarchy?.nameEnglish ||
              cr.unit?.nameEnglish ||
              cr.unit ||
              "—";

            return {
              ...cr,
              id: rowDbId,
              captainRecipeId: captainRecipeId,
              name: resolvedName,
              weight: crWeight,
              unitName: resolvedUnitName,
              perUnitRate: crPerUnitRate,
              rate: crPerUnitRate,
              amount: crAmount,
            };
          })
        );

        if (!isCancelled) {
          setEnrichedCaptainRecipes(results);
        }
      } catch (err) {
        console.error("Failed to enrich captain recipes:", err);
      } finally {
        if (!isCancelled) setCaptainLoading(false);
      }
    };

    enrich();

    return () => {
      isCancelled = true;
    };
  }, [recipeData, outletId]);

  const rawMaterials = useMemo(() => {
    const list = Array.isArray(recipeData?.rawMaterials) ? recipeData.rawMaterials : [];
    return list.map((rm) => {
      const rmWeight = Number(rm.weight ?? 0);
      const rmPerUnitRate = Number(
        rm.perUnitRate != null && Number(rm.perUnitRate) > 0
          ? rm.perUnitRate
          : rm.rate ?? rm.price ?? rm.unitPrice ?? 0
      );
      const rmTotalRate = Number(
        rm.rate != null && rm.perUnitRate != null
          ? rm.rate
          : rm.amount != null
            ? rm.amount
            : rmPerUnitRate * rmWeight
      );
      return {
        ...rm,
        weight: rmWeight,
        perUnitRate: rmPerUnitRate,
        amount: rmTotalRate,
      };
    });
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

  const getItemUnitName = (item) => {
    return item?.unit?.nameEnglish || item?.unit?.symbolEnglish || item?.unitName || "—";
  };

  const totalRawMaterialCost = useMemo(() => {
    return rawMaterials.reduce((sum, rm) => sum + (Number(rm.amount) || 0), 0);
  }, [rawMaterials]);

  const totalCaptainCost = useMemo(() => {
    return enrichedCaptainRecipes.reduce((sum, cr) => sum + (Number(cr.amount) || 0), 0);
  }, [enrichedCaptainRecipes]);

  const totalCaptainWeight = useMemo(() => {
    return enrichedCaptainRecipes.reduce((sum, cr) => sum + (Number(cr.weight) || 0), 0);
  }, [enrichedCaptainRecipes]);

  const resolvedFuelCost = useMemo(() => {
    if (header?.fuelUtilityCost != null && Number(header.fuelUtilityCost) >= 0) {
      return Number(header.fuelUtilityCost);
    }
    if (header?.lpgCost != null && Number(header.lpgCost) >= 0) {
      return Number(header.lpgCost);
    }
    return 0;
  }, [header]);

  const itemWeight = Number(header?.weight ?? recipeData?.weight ?? 0);

  const totalRecipeCost = useMemo(() => {
    const savedRate = Number(header?.recipeRate ?? header?.rate ?? recipeData?.recipeRate ?? recipeData?.rate ?? 0);
    if (savedRate > 0) return savedRate;
    return totalRawMaterialCost + totalCaptainCost + resolvedFuelCost;
  }, [header, recipeData, totalRawMaterialCost, totalCaptainCost, resolvedFuelCost]);

  const perKgRate = useMemo(() => {
    const savedPerKg = Number(header?.costPerKg ?? recipeData?.costPerKg ?? 0);
    if (savedPerKg > 0) return savedPerKg;
    if (itemWeight <= 0) return 0;
    return totalRecipeCost / itemWeight;
  }, [header, recipeData, itemWeight, totalRecipeCost]);

  const perPlateCost = useMemo(() => {
    const savedPerPerson = Number(header?.costPerPerson ?? recipeData?.costPerPerson ?? 0);
    if (savedPerPerson > 0) return savedPerPerson;
    const pax = Number(header?.paxQty ?? 100);
    if (pax > 0) return totalRecipeCost / pax;
    if (itemWeight > 0) return totalRecipeCost / itemWeight;
    return totalRecipeCost;
  }, [header, recipeData, totalRecipeCost, itemWeight]);

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
          description="Standard recipe formulation, ingredient breakdowns, and costing."
          actions={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate(`/menu-item/update-recipe/${menuItemId}`, {
                    state: { orgId: outletId, menuItemId, returnUrl },
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#084E92] hover:bg-[#063b6f] text-white text-xs font-semibold cursor-pointer transition shadow-2xs"
              >
                <Edit size={13} />
                <span>Edit Recipe</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(returnUrl)}
                className="flex items-center gap-1.5 text-sm font-semibold text-[#084E92] hover:text-[#063b6f] cursor-pointer bg-transparent border-0 p-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Recipe</span>
              </button>
            </div>
          }
        />

        {/* Overview Information Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <span className="text-xs text-gray-400 font-medium block">Menu Item</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {header?.menuItemName || recipeData?.name || `Item #${menuItemId}`}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium block">Unit / Outlet</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{outletName}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium block">Weight</span>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {header?.weight ?? recipeData?.weight ?? "-"}{" "}
                <span className="text-xs font-normal text-gray-500">
                  {header?.unitName || "-"}
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
            <div>
              <span className="text-xs text-gray-400 font-medium block">Total Recipe Cost</span>
              <p className="text-sm font-extrabold text-[#084E92] mt-0.5">
                ₹{totalRecipeCost.toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-xs text-gray-400 font-medium block">Per KG Rate</span>
              <p className="text-sm font-bold text-emerald-700 mt-0.5">
                ₹{perKgRate.toFixed(2)} / kg
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
                  <th className="py-2.5 px-4 w-[8%] text-center">Sr No.</th>
                  <th className="py-2.5 px-4 w-[24%] truncate">Raw Material Name</th>
                  <th className="py-2.5 px-4 w-[18%] truncate">Category</th>
                  <th className="py-2.5 px-4 w-[14%] truncate">Weight / Qty</th>
                  <th className="py-2.5 px-4 w-[12%] truncate">Unit</th>
                  <th className="py-2.5 px-4 w-[12%] truncate">Rate (₹)</th>
                  <th className="py-2.5 px-4 w-[12%] truncate text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {rawMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-400">
                      No raw material ingredients found.
                    </td>
                  </tr>
                ) : (
                  rawMaterials.map((rm, idx) => (
                    <tr key={rm.id || idx} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-4 text-center text-gray-400">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <td
                        className="py-2.5 px-4 font-semibold text-gray-900 truncate"
                        title={rm.rawMaterial?.nameEnglish || rm.rawMaterialName || rm.name}
                      >
                        {rm.rawMaterial?.nameEnglish ||
                          rm.rawMaterialName ||
                          rm.name ||
                          `Material #${rm.id}`}
                      </td>
                      <td
                        className="py-2.5 px-4 text-gray-500 truncate"
                        title={rm.rawMaterial?.rawMaterialCat?.nameEnglish || rm.category}
                      >
                        {rm.rawMaterial?.rawMaterialCat?.nameEnglish || rm.category || "—"}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-gray-900 truncate">
                        {rm.weight ?? "-"}
                      </td>
                      <td className="py-2.5 px-4 text-gray-600 truncate">
                        {getItemUnitName(rm)}
                      </td>
                      <td className="py-2.5 px-4 text-gray-700 font-medium truncate">
                        ₹{Number(rm.perUnitRate || 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-gray-900 truncate text-right">
                        ₹{Number(rm.amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-[#EFF4FF] border-t border-[#C3C6D1] flex flex-wrap items-center justify-between text-xs font-semibold text-gray-700">
            <span>
              Total Items: <strong className="text-gray-900">{rawMaterials.length}</strong>
            </span>
            <span>
              Total RM Cost: <strong className="text-[#084E92] font-bold">₹{totalRawMaterialCost.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* Captain Recipes Table */}
        {enrichedCaptainRecipes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                Captain Sub-Recipes ({enrichedCaptainRecipes.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-4 w-[8%] text-center">Sr No.</th>
                    <th className="py-2.5 px-4 w-[35%] truncate">Recipe Name</th>
                    <th className="py-2.5 px-4 w-[15%] truncate">Weight</th>
                    <th className="py-2.5 px-4 w-[12%] truncate">Unit</th>
                    <th className="py-2.5 px-4 w-[15%] truncate">Rate (₹)</th>
                    <th className="py-2.5 px-4 w-[15%] truncate text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {enrichedCaptainRecipes.map((cr, idx) => (
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
                        {cr.unitName || "—"}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-gray-700 truncate">
                        ₹{Number(cr.perUnitRate ?? cr.rate ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-gray-900 truncate text-right">
                        ₹{Number(cr.amount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-[#EFF4FF] border-t border-[#C3C6D1] flex flex-wrap items-center gap-4 text-xs font-semibold text-gray-700">
              <span>
                Total Items: <strong className="text-gray-900">{enrichedCaptainRecipes.length}</strong>
              </span>
              <span>
                Total Captain Cost:{" "}
                <strong className="text-[#084E92] font-bold">₹{totalCaptainCost.toFixed(2)}</strong>
              </span>
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
                <div
                  key={idx}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between"
                >
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
                    <span className="text-[11px] text-gray-500">{item.unitName || "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recipe Cost Summary */}
        <div className="p-5 rounded-2xl border border-blue-100 bg-[#F8FAFC] shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-gray-800">Recipe Cost Summary</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Summary of ingredient costs and calculated rates for this recipe
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 min-w-[120px] shadow-2xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Raw Material Cost
                </span>
                <span className="text-sm font-bold text-gray-900 block mt-0.5">
                  ₹{totalRawMaterialCost.toFixed(2)}
                </span>
              </div>

              {totalCaptainCost > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 min-w-[120px] shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Captain Recipe Cost
                  </span>
                  <span className="text-sm font-bold text-[#084E92] block mt-0.5">
                    ₹{totalCaptainCost.toFixed(2)}
                  </span>
                </div>
              )}

              {resolvedFuelCost > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 min-w-[120px] shadow-2xs">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Fuel Overhead
                  </span>
                  <span className="text-sm font-bold text-amber-600 block mt-0.5">
                    ₹{resolvedFuelCost.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 min-w-[120px] shadow-2xs">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                  Per KG Rate
                </span>
                <span className="text-sm font-bold text-emerald-700 block mt-0.5">
                  ₹{perKgRate.toFixed(2)} / kg
                </span>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 min-w-[120px] shadow-2xs">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                  Per Plate Cost
                </span>
                <span className="text-sm font-bold text-indigo-700 block mt-0.5">
                  ₹{perPlateCost.toFixed(2)}
                </span>
              </div>

              <div className="bg-white border border-[#084E92]/30 rounded-xl px-4 py-2.5 min-w-[140px] shadow-xs bg-blue-50/40">
                <span className="text-[10px] font-bold text-[#084E92] uppercase tracking-wider block">
                  Total Recipe Cost
                </span>
                <span className="text-base font-extrabold text-[#084E92] block mt-0.5">
                  ₹{totalRecipeCost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

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
