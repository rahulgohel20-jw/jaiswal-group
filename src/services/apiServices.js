import axiosInstance, { POST, GET, PUT, DELETE, UPLOAD } from "./axiosInstance";
import axios from "./axiosInstance";

// ---- Auth APIs ----
  
export const loginUser = (payload) => POST('/auth/login', payload);

// ---- Password Reset APIs ----

export const forgotPassword = (payload) => POST('/auth/forgot-password', payload);

export const resetPassword = (payload) => POST('/auth/reset-password', payload);

// ---- Asset Category APIs ----

export const getAssetCategories = () => {
  return GET("/assets-category/getall");
};

export const createAssetCategory = (payload) => {
  return POST("/assets-category/create", payload);
};

export const getAssetCategoryById = (id) => {
  return GET("/assets-category/getbyid", { id });
};

export const updateAssetCategory = ({ id, ...payload }) => {
  return PUT("/assets-category/update", payload, { id });
};

export const deleteAssetCategory = (id) => {
  return DELETE("/assets-category/delete", { id });
};

// ---- Asset Sub-Category APIs ----

export const getSubCategories = () => {
  return GET("/asset-subcategory/getall");
};

export const getActiveSubCategories = () => {
  return GET("/asset-subcategory/getallactive");
};

export const getSubCategoriesByCategory = (categoryId) => {
  return GET("/asset-subcategory/getbycategory", { categoryId });
};

export const getSubCategoryById = (id) => {
  return GET("/asset-subcategory/get", { id });
};

export const createSubCategory = (payload) => {
  return POST("/asset-subcategory/create", payload);
};

export const updateSubCategory = ({ id, ...payload }) => {
  return PUT("/asset-subcategory/update", payload, { id });
};

export const deleteSubCategory = (id) => {
  return DELETE("/asset-subcategory/delete", { id });
};

// ---- Asset Type APIs ----

export const getAssetTypes = () => {
  return GET("/asset-type/getall");
};

export const getActiveAssetTypes = () => {
  return GET("/asset-type/getallactive");
};

export const getAssetTypeById = (id) => {
  return GET("/asset-type/get", { id });
};

export const createAssetType = (payload) => {
  return POST("/asset-type/create", payload);
};

export const updateAssetType = ({ id, ...payload }) => {
  return PUT("/asset-type/update", payload, { id });
};

export const deleteAssetType = (id) => {
  return DELETE("/asset-type/delete", { id });
};

export const getConditions = () => {
  return GET("/asset-condition/getall");
};

export const getActiveConditions = () => {
  return GET("/asset-condition/getallactive");
};

export const getConditionById = (id) => {
  return GET("/asset-condition/get", { id });
};

export const createCondition = (payload) => {
  return POST("/asset-condition/create", payload);
};

export const updateCondition = ({ id, ...payload }) => {
  return PUT("/asset-condition/update", payload, { id });
};

export const deleteCondition = (id) => {
  return DELETE("/asset-condition/delete", { id });
};

export const getStatuses = () => {
  return GET("/asset-status/getall");
};

export const getActiveStatuses = () => {
  return GET("/asset-status/getallactive");
};

export const getStatusById = (id) => {
  return GET("/asset-status/get", { id });
};

export const createStatus = (payload) => {
  return POST("/asset-status/create", payload);
};

export const updateStatus = ({ id, ...payload }) => {
  return PUT("/asset-status/update", payload, { id });
};

export const deleteStatus = (id) => {
  return DELETE("/asset-status/delete", { id });
};

// ---- Asset Brand APIs ----

export const getAssetBrands = () => {
  return GET("/asset-brand/getall");
};

export const getActiveAssetBrands = () => {
  return GET("/asset-brand/getallactive");
};

export const getActiveAssetBrandsPaginated = (params) => {
  return GET("/asset-brand/getallactive/page", params);
};

export const getAssetBrandById = (id) => {
  return GET("/asset-brand/get", { id });
};

export const createAssetBrand = (payload) => {
  return POST("/asset-brand/create", payload);
};

export const updateAssetBrand = ({ id, ...payload }) => {
  return PUT("/asset-brand/update", payload, { id });
};

export const deleteAssetBrand = (id) => {
  return DELETE("/asset-brand/delete", { id });
};

// ---- Asset Unit APIs ----

export const getAssetUnits = () => {
  return GET("/asset-unit/getall");
};

export const getActiveAssetUnits = () => {
  return GET("/asset-unit/getallactive");
};

export const getActiveAssetUnitsPaginated = (params) => {
  return GET("/asset-unit/getallactive/page", params);
};

export const getAssetUnitById = (id) => {
  return GET("/asset-unit/get", { id });
};

export const createAssetUnit = (payload) => {
  return POST("/asset-unit/create", payload);
};

export const updateAssetUnit = ({ id, ...payload }) => {
  return PUT("/asset-unit/update", payload, { id });
};

export const deleteAssetUnit = (id) => {
  return DELETE("/asset-unit/delete", { id });
};

//-- country API
export const getAllCountry = () => {
  return GET('/country/getall')
}

//-- state API
export const getStateByCountry = (id) => {
  return GET('/state/by-country',  { countryId: id });
}

//-- city API
export const getCityByState = (stateId) => {
  return GET('/city/getbystateid', { stateId });
};

// ---Company API and Unit API
export const getRegisteredCompany = () => {
  return GET("/organization/get-all");
};
export const getActiveCompany = () => {
  return GET("/organization/get-all-active");
};
export const getCompanyById = (id) => {
  return GET(`/organization/get/${id}`);
};
export const createCompany = (params, formData) => {
  return axiosInstance.post(
    "/organization/save",
    formData,
    { params }
  );
};

export const updateCompany = (params) => {
  return axiosInstance.put(
    "/organization/update",
    null,
    { params }
  );
};

export const deleteCompany = (id) => {
  return DELETE(`/organization/delete/${id}`);
};

export const getAllCountries = () => {
  return GET("/country/getall");
};

export const getStatesByCountry = (countryId) => {
  return GET("/state/by-country", { countryId });
};

export const getCitiesByState = (stateId) => {
  return GET("/city/getbystateid", { stateId });
};

 
export const getAllEmployees = () => {
   return GET('/employee/get-all');
}

export const getAllActiveEmployees = () => {
  return GET('/employee/get-all-active');
}

export const getEmployeeById = (id) => {
   return GET(`/employee/get/${id}`);
}

export const saveEmployee = (payload) => {
  return POST('/employee/save', payload);
}

export const updateEmployee = (payload) => {
  return PUT('/employee/update', payload, { id: payload.id });
};

export const deleteEmployeeById = (id) => {
  return DELETE(`/employee/delete/${id}`);
}

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
