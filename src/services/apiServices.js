import axiosInstance, { DELETE, GET, POST, PUT, UPLOAD } from './axiosInstance';
import axios from './axiosInstance';

// ---- Auth APIs ----

export const loginUser = (payload) => POST('/auth/login', payload);
export const changePassword = (payload) =>
  POST('/auth/change-password', payload);
// ---- Password Reset APIs ----

export const forgotPassword = (payload) =>
  POST('/auth/forgot-password', payload);

export const resetPassword = (payload) => POST('/auth/reset-password', payload);

// ---- Asset Category APIs ----

export const getAssetCategories = () => {
  return GET('/assets-category/getall');
};

export const createAssetCategory = (payload) => {
  return POST('/assets-category/create', payload);
};

export const getAssetCategoryById = (id) => {
  return GET('/assets-category/getbyid', { id });
};

export const updateAssetCategory = ({ id, ...payload }) => {
  return PUT('/assets-category/update', payload, { id });
};

export const deleteAssetCategory = (id) => {
  return DELETE('/assets-category/delete', { id });
};

// ---- Asset Sub-Category APIs ----

export const getSubCategories = () => {
  return GET('/asset-subcategory/getall');
};

export const getActiveSubCategories = () => {
  return GET('/asset-subcategory/getallactive');
};

export const getSubCategoriesByCategory = (categoryId) => {
  return GET('/asset-subcategory/getbycategory', { categoryId });
};

export const getSubCategoryById = (id) => {
  return GET('/asset-subcategory/get', { id });
};

export const createSubCategory = (payload) => {
  return POST('/asset-subcategory/create', payload);
};

export const updateSubCategory = ({ id, ...payload }) => {
  return PUT('/asset-subcategory/update', payload, { id });
};

export const deleteSubCategory = (id) => {
  return DELETE('/asset-subcategory/delete', { id });
};

// ---- Asset Type APIs ----

export const getAssetTypes = () => {
  return GET('/asset-type/getall');
};

export const getActiveAssetTypes = () => {
  return GET('/asset-type/getallactive');
};

export const getAssetTypeById = (id) => {
  return GET('/asset-type/get', { id });
};

export const createAssetType = (payload) => {
  return POST('/asset-type/create', payload);
};

export const updateAssetType = ({ id, ...payload }) => {
  return PUT('/asset-type/update', payload, { id });
};

export const deleteAssetType = (id) => {
  return DELETE('/asset-type/delete', { id });
};

export const getConditions = () => {
  return GET('/asset-condition/getall');
};

export const getActiveConditions = () => {
  return GET('/asset-condition/getallactive');
};

export const getConditionById = (id) => {
  return GET('/asset-condition/get', { id });
};

export const createCondition = (payload) => {
  return POST('/asset-condition/create', payload);
};

export const updateCondition = ({ id, ...payload }) => {
  return PUT('/asset-condition/update', payload, { id });
};

export const deleteCondition = (id) => {
  return DELETE('/asset-condition/delete', { id });
};

export const getStatuses = () => {
  return GET('/asset-status/getall');
};

export const getActiveStatuses = () => {
  return GET('/asset-status/getallactive');
};

export const getStatusById = (id) => {
  return GET('/asset-status/get', { id });
};

export const createStatus = (payload) => {
  return POST('/asset-status/create', payload);
};

export const updateStatus = ({ id, ...payload }) => {
  return PUT('/asset-status/update', payload, { id });
};

export const deleteStatus = (id) => {
  return DELETE('/asset-status/delete', { id });
};

// ---- Asset Brand APIs ----

export const getAssetBrands = () => {
  return GET('/asset-brand/getall');
};

export const getActiveAssetBrands = () => {
  return GET('/asset-brand/getallactive');
};

export const getActiveAssetBrandsPaginated = (params) => {
  return GET('/asset-brand/getallactive/page', params);
};

export const getAssetBrandById = (id) => {
  return GET('/asset-brand/get', { id });
};

export const createAssetBrand = (payload) => {
  return POST('/asset-brand/create', payload);
};

export const updateAssetBrand = ({ id, ...payload }) => {
  return PUT('/asset-brand/update', payload, { id });
};

export const deleteAssetBrand = (id) => {
  return DELETE('/asset-brand/delete', { id });
};

// ---- Asset Unit APIs ----

export const getAssetUnits = () => {
  return GET('/asset-unit/getall');
};

export const getActiveAssetUnits = () => {
  return GET('/asset-unit/getallactive');
};

export const getActiveAssetUnitsPaginated = (params) => {
  return GET('/asset-unit/getallactive/page', params);
};

export const getAssetUnitById = (id) => {
  return GET('/asset-unit/get', { id });
};

export const createAssetUnit = (payload) => {
  return POST('/asset-unit/create', payload);
};

export const updateAssetUnit = ({ id, ...payload }) => {
  return PUT('/asset-unit/update', payload, { id });
};

export const deleteAssetUnit = (id) => {
  return DELETE('/asset-unit/delete', { id });
};

//-- country API
export const getAllCountry = () => {
  return GET('/country/getall');
};

//-- state API
export const getStateByCountry = (id) => {
  return GET('/state/by-country', { countryId: id });
};

//-- city API
export const getCityByState = (stateId) => {
  return GET('/city/getbystateid', { stateId });
};

// ---Company API and Unit API
export const getRegisteredCompany = () => {
  return GET('/organization/get-all');
};
export const getActiveCompany = () => {
  return GET('/organization/get-all-active');
};
export const getCompanyById = (id) => {
  return GET(`/organization/get/${id}`);
};
export const createCompany = (formData) => {
  return POST('/organization/save',formData)
};


export const updateCompany = (data) =>
  axiosInstance.put('/organization/update', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

export const deleteCompany = (id) => {
  return DELETE(`/organization/delete/${id}`);
};

export const getOrganizationByType = (orgType) => {
  return GET(`/organization/by-type/${orgType}`);
};

export const getAllCountries = () => {
  return GET('/country/getall');
};

export const getStatesByCountry = (countryId) => {
  return GET('/state/by-country', { countryId });
};

export const getCitiesByState = (stateId) => {
  return GET('/city/getbystateid', { stateId });
};

export const getAllEmployees = (roleId = 0) => {
  return GET('/employee/get-all', { roleId });
};

export const getAllActiveEmployees = () => {
  return GET('/employee/get-all-active');
};

export const getEmployeeById = (id) => {
  return GET(`/employee/get/${id}`);
};

export const saveEmployee = (payload) => {
  return POST('/employee/save', payload);
};

export const updateEmployee = (payload) => {
  return PUT('/employee/update', payload, { id: payload.id });
};

export const deleteEmployeeById = (id) => {
  return DELETE(`/employee/delete/${id}`);
};

// ---- Department APIs ----

export const getAllDepartments = () => {
  return GET('/department/get-all');
};

export const getAllActiveDepartments = () => {
  return GET('/department/get-all-active');
};

export const getDepartmentsByOrganization = (orgId) => {
  return GET(`/department/get-by-organization/${orgId}`);
};

export const getDepartmentById = (id) => {
  return GET(`/department/get/${id}`);
};

export const saveDepartment = (payload) => {
  return POST('/department/save', payload);
};

export const updateDepartment = (payload) => {
  return PUT('/department/update', payload, { id: payload.id });
};

export const deleteDepartmentById = (id) => {
  return DELETE(`/department/delete/${id}`);
};

// ---- Asset APIs ----

export const getAllAssets = () => {
  return GET('/assets/getall');
};

export const createAsset = (formData) => {
  return axiosInstance.post('/assets/create', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getAssetById = (id) => {
  return GET(`/assets/get`, { id });
};

// Fetch images for an asset by id
export const getAssetImagesById = (id) => {
  return GET(`/assets/get/images`, { id });
};

export const deleteAsset = (id) => {
  return DELETE('/assets/delete', { id });
};
export const updateAsset = (id, formData) => {
  return axiosInstance.put(`/assets/update?id=${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getAllMenuCategory = () => {
  return GET('/menucategory/getall');
};

export const getMenuCategoryById = (id) => {
  return GET('/menucategory/getid', { id });
};

export const addMenuCategory = (formData) => {
  return axiosInstance.post('/menucategory/add', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const updateMenuCategory = (formData) => {
  return axiosInstance.put('/menucategory/update', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteMenuCategoryById = (id) => {
  return DELETE('/menucategory/deletebyid', { id });
};

export const updateMenuCategoryStatus = ({ id, isActive }) => {
  return PUT(`/menucategory/updatestatus?id=${id}&isActive=${isActive}`);
};

// Subcategory API
export const getAllMenuSubCategoryById = (userId) => {
  return GET(`/menusubcategory/getallbyuserid?userid=${userId}`);
};
export const updateMenuSubCategory = (id, data) => {
  return PUT(`/menusubcategory/update?id=${id}`, data);
};
export const updateMenuSubCategoryStatus = ({ id, isActive }) => {
  return PUT(`/menusubcategory/updatestatus?id=${id}&isActive=${isActive}`);
};
export const deleteMenuSubCategoryById = (id) => {
  return DELETE(`/menusubcategory/deletebyid?id=${id}`);
};
export const addMenuSubCategory = (data) => {
  return axiosInstance.post('/menusubcategory/add', data);
};

//Menu Item API
export const addMenuItem = (data) => {
  return axiosInstance.post('/menuitems/add', data);
};
export const getAllMenuItem = (params) => {
  return axiosInstance.get('/menuitems/getallbyuserid', {
    params,
  });
};
export const getMenuItemById = (id) => {
  return GET(`/menuitems/getbyid?id=${id}`);
};
export const updateMenuItem = (id, data) => {
  return axiosInstance.put('/menuitems/update', data, {
    params: { id },
  });
};
export const deleteMenuItemById = (id) => {
  return DELETE(`/menuitems/deletebyid?id=${id}`);
};
export const updateMenuItemStatus = ({ id, isActive }) => {
  return PUT(`/menuitems/updatestatus?id=${id}&isActive=${isActive}`);
};
// ---- Sub-Outlet APIs ----

export const getAllSubOutlets = () => {
  return GET('/sub-outlet/get-all');
};

export const getAllActiveSubOutlets = () => {
  return GET('/sub-outlet/get-all-active');
};

export const getAllSubOutletsByOrganization = (organizationId) => {
  return GET(`/sub-outlet/get-all-by-organization/${organizationId}`);
};

export const getAllOutletsWithSubOutlets = () => {
  return GET('/sub-outlet/get-all-outlets-with-suboutlets');
};

export const getOutletWithSubOutletsByOrganizationId = (organizationId) => {
  return GET(`/sub-outlet/get-outlet-with-suboutlets/${organizationId}`);
};

export const getSubOutletById = (id) => {
  return GET(`/sub-outlet/get/${id}`);
};

export const saveSubOutlet = (payload) => {
  return POST('/sub-outlet/save', payload);
};

export const updateSubOutlet = ({ id, ...payload }) => {
  return PUT('/sub-outlet/update', payload, { id });
};

export const deleteSubOutletById = (id) => {
  return DELETE(`/sub-outlet/delete/${id}`);
};

export const getAllRawMaterialCategoryType = () => {
  return GET(`/rawmaterialcattype/getall`);
};

export const getRawMaterialCategoryTypeById = (id) => {
  return GET(`/rawmaterialcattype/getbyid?id=${id}`);
};

export const addRawMaterialCategoryType = (data) => {
  return POST(`/rawmaterialcattype/add`, data);
};

export const updateRawMaterialCategoryType = (id, data) => {
  return PUT(`/rawmaterialcattype/update?id=${id}`, data);
};

export const deleteRawMaterialCategoryTypeById = (id) => {
  return DELETE(`/rawmaterialcattype/delete?id=${id}`);
};

export const updateRawMaterialCategoryTypeStatus = (id, active) => {
  return PUT(`/rawmaterialcattype/updatestatus?id=${id}&isActive=${active}`);
};

export const getAllRawMaterialCategory = (categoryTypeId = 0) => {
  return GET(`/rawmaterialcategory/getall`, { categoryTypeId  });
};

export const getRawMaterialCategoryById = (id) => {
  return GET(`/rawmaterialcategory/getbyid?id=${id}`);
};

export const addRawMaterialCategory = (data) => {
  return POST(`/rawmaterialcategory/add`, data);
};

export const updateRawMaterialCategory = (id, data) => {
  return PUT(`/rawmaterialcategory/update?id=${id}`, data);
};

export const deleteRawMaterialCategoryById = (id) => {
  return DELETE(`/rawmaterialcategory/delete?id=${id}`);
};

export const updateRawMaterialCategoryStatus = (id, active) => {
  return PUT(`/rawmaterialcategory/updatestatus?id=${id}&isActive=${active}`);
};

export const getAllRoleMasterByUserId = (userId) => {
  return GET('/rolemaster/getall', { userId });
};

export const getRoleMasterById = (id) => {
  return GET('/rolemaster/gebyid', { id });
};

export const addRoleMaster = (payload) => {
  return POST('/rolemaster/add', payload);
};

export const updateRoleMaster = (payload) => {
  return PUT('/rolemaster/update', payload, { id: payload.id });
};

export const deleteRoleMasterById = (id) => {
  return DELETE('/rolemaster/deletebyid', { id });
};
//Raw Material Unit APIs
export const getAllRawMaterialUnits = () => {
  return GET(`/unit/getall`);
};

export const getRawMaterialUnitById = (id) => {
  return GET(`/unit/getbyid?id=${id}`);
};
export const addUnitMaster = (data) => {
  return POST('/unit/add', data);
};

export const updateUnitMaster = (id, data) => {
  return PUT(`/unit/update?id=${id}`, data);
};

export const deleteUnitMasterById = (id) => {
  return DELETE(`/unit/deletebyid?id=${id}`);
};

export const updateUnitStatusById = (id, isActive) => {
  return PUT(`/unit/updatestatusbyid?id=${id}&isActive=${isActive}`);
};

//Raw Material Item APIs
export const getAllRawMaterialItems = (rawMateriaCatlId, unitid, isActive = "", rawMaterialName = "", pageNo = "", pageSize = "") => {
  return GET(
    `/rawmaterial/getall?rawMateriaCatlId=${rawMateriaCatlId}&unitid=${unitid}&isActive=${isActive}&pageNo=${pageNo}&pageSize=${pageSize}&rawMaterialName=${encodeURIComponent(rawMaterialName)}`
  );
};
export const addRawMaterialItem = (formData) => {
  return POST("/rawmaterial/add", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
export const updateRawMaterialItem = (formData) => {
  return PUT("/rawmaterial/update", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
export const updateRawMaterialItemStatusById = (id, isActive) => {
  return PUT(
    `/rawmaterial/updatestatus?id=${id}&isActive=${isActive}`
  );
};

export const getRawMaterialById = (id) => {
  return GET("/rawmaterial/getbyid?id=" + id);
};

export const deleteRawMaterialItemById = (id) => {
  return DELETE(`/rawmaterial/delete?id=${id}`);
};
// ---- User Rights: Pages APIs ----
// Add these alongside the other exports in apiServices.js
export const getPages = (isAdminRights = false, isCombine = true) => {
  return GET(
    `/user-rights/getPages?isAdminRights=${isAdminRights}&isCombine=${isCombine}`,
  );
};

export const createPage = (payload) => {
  return POST('/user-rights/addPage', payload);
};

// Swagger: POST /user-rights/updatePage/{id} -- note this is POST, not PUT
export const updatePage = (id, payload) => {
  return POST(`/user-rights/updatePage/${id}`, payload);
};

export const deletePage = (id) => {
  return DELETE(`/user-rights/page/delete/${id}`);
};

// ---- User Rights: Role/User rights APIs ----
// Not used by PageMaster itself, but part of the same User Right Master
// module (e.g. the "Module Right Name" screen in the sidebar) — added
// here since the endpoints came in together.

export const addUserRights = (payload) => {
  return POST('/user-rights/addRights', payload);
};

export const getUserRightsByRole = (roleId) => {
  return GET('/user-rights/getByRole', { roleId });
};

export const getUserRightsByUser = (userId) => {
  return GET('/user-rights/getByUser', { userId });
};

// ---- Module Rights APIs ----
// NOTE: these paths include /v1/api/... in full, unlike the /user-rights/*
// endpoints added earlier which were just /user-rights/... (no /api prefix).
// Check what axiosInstance's baseURL is set to — if it already includes
// "/api", these will double up to ".../api/v1/api/modulerights/...".
// Adjust the leading segment here to match your actual baseURL.

export const getModuleRights = () => {
  return GET('/modulerights/getall');
};

export const getModuleRightById = (id) => {
  return GET('/modulerights/getbyid', { id });
};

export const createModuleRight = (payload) => {
  return POST('/modulerights/add', payload);
};

export const updateModuleRight = ({ id, ...payload }) => {
  return PUT('/modulerights/update', payload, { id });
};

export const deleteModuleRight = (id) => {
  return DELETE('/modulerights/deletebyid', { id });
};

//Raw Material Brand Master API
export const createRawMaterialBrand = (payload) => {
  return POST(`/raw-material-brand/create`, payload);
}; 

export const getAllRawMaterialBrand = () => {
  return GET('/raw-material-brand/getall');
}
export const getRawMaterialBrandById = (id) => {
  return GET(`/raw-material-brand/get?id=${id}`)
}
export const updateRawMaterialBrand = (id, payload) => {
  return PUT(`/raw-material-brand/update?id=${id}`, payload);
};
export const getAllActiveRawMaterialBrand = () => {
  return GET('/raw-material-brand/getallactive');
}
export const deleteRawMaterialBrandById = (id) => {
  return DELETE(`/raw-material-brand/delete?id=${id}`)
}

//STATE API
export const getAllStates = () => {
  return GET('/state/getall')
}

export const addState = (payload) => {
  return POST('/state/create' , payload)
}

export const updateState = (id, payload) => {
  return PUT(`/state/update?id=${id}`, payload)
}

export const deleteStateById = (id) => {
  return DELETE(`/state/delete?id=${id}`);
}

//City API
export const getAllCities = () => {
  return GET('/city/getall');
}
export const addCity = (payload) => {
  return POST('/city/add' , payload)
}

export const updateCity = (id, payload) => {
  return PUT(`/city/update?id=${id}`, payload)
}

export const deleteCityById = (id) => {
  return DELETE(`/city/deletebyid?id=${id}`);
}
// ---- Raw Material Category ↔ Brand Mapping APIs ----

export const getAllRawMaterialCategoryBrands = () => {
  return GET('/rawmaterialcategorybrand/getall');
};

export const getRawMaterialCategoryBrandById = (id) => {
  return GET('/rawmaterialcategorybrand/getbyid', { id });
};

export const getRawMaterialCategoryBrandsByCategoryId = (categoryId) => {
  return GET('/rawmaterialcategorybrand/getbycategoryid', { categoryId });
};

export const getRawMaterialCategoryBrandsByBrandId = (brandId) => {
  return GET('/rawmaterialcategorybrand/getbybrandid', { brandId });
};

export const assignBrandsToCategories = (payload) => {
  return POST('/rawmaterialcategorybrand/assign', payload);
};

export const deleteRawMaterialCategoryBrandById = (id) => {
  return DELETE('/rawmaterialcategorybrand/delete', { id });
};

// ---- Vendor APIs ----

export const getAllVendors = () => {
  return GET('/vendor/get-all');
};

export const getAllActiveVendors = () => {
  return GET('/vendor/get-all-active');
};

export const getVendorsByOrganization = (organizationId) => {
  return GET(`/vendor/get-by-organization/${organizationId}`);
};

export const getVendorsPaginated = (params) => {
  return GET('/vendor/get-paginated', params);
};

export const getVendorById = (id) => {
  return GET(`/vendor/get/${id}`);
};

export const saveVendor = (payload) => {
  return POST('/vendor/save', payload);
};

export const updateVendor = (payload) => {
  return PUT('/vendor/update', payload, { id: payload.id });
};

export const deleteVendorById = (id) => {
  return DELETE(`/vendor/delete/${id}`);
};

// ---- Vendor-Outlet Mapping APIs ----

export const assignVendorOutletMapping = (payload) => {
  // payload: { outletIds: number[], username: string, vendorId: number }
  return POST('/vendor-outlet-mapping/assign', payload);
};

export const deleteVendorOutletMapping = (vendorId, outletId) => {
  return DELETE('/vendor-outlet-mapping/delete-by-vendor-and-outlet', {
    vendorId,
    outletId,
  });
};

export const deleteVendorOutletMappingByVendor = (vendorId) => {
  return DELETE(`/vendor-outlet-mapping/delete-by-vendor/${vendorId}`);
};

export const getAllVendorOutletMappings = () => {
  return GET('/vendor-outlet-mapping/get-all');
};

export const getVendorOutletMappingByVendorId = (vendorId) => {
  return GET(`/vendor-outlet-mapping/get-by-vendor/${vendorId}`);
};

//Row Material Sub Category API
export const saveOrUpdateRawMaterialSubCategory = (payload) => {
    return  POST('/raw-material-sub-category', payload);
};

export const getAllRowMaterialSubCategory = () => {
  return GET('/raw-material-sub-category')
}
export const getRawMaterialSubCategoryById = (id) => {
    return GET(`/raw-material-sub-category/${id}`);
};
export const deleteRawMaterialSubCategoryById = (id) => {
  return DELETE(`/raw-material-sub-category/${id}`)
}