import { POST, GET, PUT, DELETE, UPLOAD } from "./axiosInstance";
import axios from "./axiosInstance";

// ---- Asset Category APIs ----

export const getAssetCategories = () => {
  return GET("/assets-category/getall");
};

export const createAssetCategory = (payload) => {
  return POST("/assets-category/create", payload);
};