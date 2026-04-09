import { relations } from 'drizzle-orm';
import { categories } from './categories';
import { productGroups } from './product-groups';
import { products } from './products';
import { stores } from './stores';
import { productListings } from './product-listings';
import { priceRecords } from './price-records';
import { users } from './users';
import { alerts } from './alerts';
import { notifications } from './notifications';
import { crawlJobs } from './crawl-jobs';

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productGroupsRelations = relations(productGroups, ({ many }) => ({
  variants: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  group: one(productGroups, {
    fields: [products.groupId],
    references: [productGroups.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  listings: many(productListings),
  alerts: many(alerts),
}));


export const storesRelations = relations(stores, ({ many }) => ({
  listings: many(productListings),
  crawlJobs: many(crawlJobs),
}));

export const productListingsRelations = relations(productListings, ({ one, many }) => ({
  product: one(products, {
    fields: [productListings.productId],
    references: [products.id],
  }),
  store: one(stores, {
    fields: [productListings.storeId],
    references: [stores.id],
  }),
  priceRecords: many(priceRecords),
}));

export const priceRecordsRelations = relations(priceRecords, ({ one }) => ({
  listing: one(productListings, {
    fields: [priceRecords.listingId],
    references: [productListings.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  alerts: many(alerts),
  notifications: many(notifications),
}));

export const alertsRelations = relations(alerts, ({ one, many }) => ({
  user: one(users, {
    fields: [alerts.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [alerts.productId],
    references: [products.id],
  }),
  notifications: many(notifications),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  alert: one(alerts, {
    fields: [notifications.alertId],
    references: [alerts.id],
  }),
}));

export const crawlJobsRelations = relations(crawlJobs, ({ one }) => ({
  store: one(stores, {
    fields: [crawlJobs.storeId],
    references: [stores.id],
  }),
}));
