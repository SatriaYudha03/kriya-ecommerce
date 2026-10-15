import { coreId } from "./core";
import { catalogId } from "./catalog";
import { customerId } from "./customer";
import { promoId } from "./promo";
import { aftersalesId } from "./aftersales";
import { checkoutId } from "./checkout";
import { adminId } from "./admin";

export const id = {
  ...coreId,
  ...catalogId,
  ...customerId,
  ...promoId,
  ...aftersalesId,
  ...checkoutId,
  ...adminId,
};
