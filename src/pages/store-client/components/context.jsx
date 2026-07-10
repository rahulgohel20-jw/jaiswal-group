'use client';

import * as React from 'react';

// Define the state interface

// Define the action types

// Initial state
const initialState = {
  isWishlistSheetOpen: false,
  isCartSheetOpen: false,
  isProductDetailsSheetOpen: false,
  productDetailsId: null,
};

// Reducer to manage state
function storeClientReducer(state, action) {
  switch (action.type) {
    case 'SHOW_WISHLIST_SHEET':
      return { ...state, isWishlistSheetOpen: true };
    case 'CLOSE_WISHLIST_SHEET':
      return { ...state, isWishlistSheetOpen: false };
    case 'SHOW_CART_SHEET':
      return { ...state, isCartSheetOpen: true };
    case 'CLOSE_CART_SHEET':
      return { ...state, isCartSheetOpen: false };
    case 'SHOW_PRODUCT_DETAILS_SHEET':
      return {
        ...state,
        isProductDetailsSheetOpen: true,
        productDetailsId: action.productId,
      };
    case 'CLOSE_PRODUCT_DETAILS_SHEET':
      return {
        ...state,
        isProductDetailsSheetOpen: false,
        productDetailsId: null,
      };
    case 'ADD_TO_CART':
      // Log productId for now; extend to update cart state if needed
      console.log(`Added product ${action.productId} to cart`);
      return { ...state, isCartSheetOpen: true }; // Open cart sheet on add
    default:
      return state;
  }
}

// Context interface

// Create context
const StoreClientContext = React.createContext(undefined);

// Provider component
export function StoreClientProvider({ children }) {
  const [state, dispatch] = React.useReducer(storeClientReducer, initialState);

  const showWishlistSheet = () => dispatch({ type: 'SHOW_WISHLIST_SHEET' });
  const closeWishlistSheet = () => dispatch({ type: 'CLOSE_WISHLIST_SHEET' });
  const showCartSheet = () => dispatch({ type: 'SHOW_CART_SHEET' });
  const closeCartSheet = () => dispatch({ type: 'CLOSE_CART_SHEET' });
  const showProductDetailsSheet = (productId) =>
    dispatch({ type: 'SHOW_PRODUCT_DETAILS_SHEET', productId });
  const closeProductDetailsSheet = () =>
    dispatch({ type: 'CLOSE_PRODUCT_DETAILS_SHEET' });
  const handleAddToCart = ({ productId }) =>
    dispatch({ type: 'ADD_TO_CART', productId });

  const value = {
    state,
    showWishlistSheet,
    closeWishlistSheet,
    showCartSheet,
    closeCartSheet,
    showProductDetailsSheet,
    closeProductDetailsSheet,
    handleAddToCart,
  };

  return (
    <StoreClientContext.Provider value={value}>
      {children}
    </StoreClientContext.Provider>
  );
}

// Custom hook to access context
export function useStoreClient() {
  const context = React.useContext(StoreClientContext);
  if (!context) {
    throw new Error('useStoreGood must be used within a StoreClientProvider');
  }
  return context;
}
