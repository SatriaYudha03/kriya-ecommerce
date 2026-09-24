export { ApiError, setAccessTokenGetter } from "./http";
export { USE_FIXTURES } from "./http";

export {
  getCategories,
  getProducts,
  getProduct,
  searchProducts,
  getSimilarProducts,
  getAdminProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  createVariant,
  updateVariant,
  deleteVariant,
  addProductImage,
  updateProductImage,
  deleteProductImage,
  type ProductsQuery,
} from "./catalog/api";

export {
  getProfile,
  updateProfile,
  getCart,
  updateCart,
} from "./customer/api";

export {
  getOrders,
  getOrder,
  getAdminOrders,
  updateAdminOrderStatus,
} from "./aftersales/api";

export {
  getAdminStats,
} from "./promo/api";

export {
  createOrder,
} from "./checkout/api";
