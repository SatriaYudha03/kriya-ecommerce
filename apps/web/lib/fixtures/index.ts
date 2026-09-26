
export { categories, productList, productListMeta, productDetails, fixtures as catalogFixtures } from "../catalog/fixtures";
export { cart, profile, fixtures as customerFixtures } from "../customer/fixtures";
export { orders, fixtures as aftersalesFixtures } from "../aftersales/fixtures";

import { fixtures as catalog } from "../catalog/fixtures";
import { fixtures as customer } from "../customer/fixtures";
import { fixtures as aftersales } from "../aftersales/fixtures";

export const fixtures = {
  ...catalog,
  ...customer,
  ...aftersales,
};
