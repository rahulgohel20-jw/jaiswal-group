import { POST, GET, PUT, DELETE, UPLOAD } from "./axiosInstance";
import axios from "./axiosInstance";

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