// Mock menu data based on API format
export interface MenuAction {
  code: string;
}

export interface MenuScreen {
  code: string;
  title: string;
  href?: string;
  actions: string[];
  icon?: string;
  subScreens?: MenuScreen[];
}

export interface MenuModule {
  code: string;
  module: string;
  icon?: string;
  screens: MenuScreen[];
  href?: string;
}

export const mockMenuData: MenuModule[] = [
  {
    code: 'DASH',
    module: 'Dashboard',
    icon: 'LayoutDashboard',
    screens: [
      { code: 'DASH_OPS', title: 'Operations Dashboard', href: '/admin/dashboard/operations', actions: ['READ'] },
      // { code: 'DASH_ACC', title: 'Accounts Dashboard', href: '/admin/dashboard/accounts', actions: ['READ'] },
      // { code: 'DASH_OWN', title: 'Owner Dashboard', href: '/admin/dashboard/owner', actions: ['READ'] },
    ],
  },
  // {
  //   code: 'ORDER',
  //   module: 'Order Process',
  //   icon: 'ShoppingCart',
  //   screens: [
  //     { code: 'BATCH', title: 'Batch Order', href: '/admin/orders/batch', actions: ['READ', 'WRITE'] },
  //   ],
  // },
  {
    code: 'PROD',
    module: 'Products',
    icon: 'Package',
    screens: [
      { code: 'PROD', title: 'Products', href: '/admin/products/list', actions: ['READ', 'WRITE'] },
      { code: 'PCAT', title: 'Product Category', href: '/admin/products/category', actions: ['READ', 'WRITE'] },
      { code: 'BRAND', title: 'Brand', href: '/admin/products/brand', actions: ['READ', 'WRITE'] },
      { code: 'CSHAR', title: 'Client Share', href: '/admin/products/client-share', actions: ['READ', 'WRITE'] },
      { code: 'COSHAR', title: 'Supplier Share', href: '/admin/products/courier-share', actions: ['READ', 'WRITE'] },
      {
        code: 'MASTERS',
        title: 'Masters',
        actions: ['READ', 'WRITE'],
        subScreens: [
          { code: 'M_HSN', title: 'HSN CODE', href: '/admin/products/masters/hsn', actions: ['READ', 'WRITE'] },
          { code: 'M_COLOR', title: 'Color', href: '/admin/products/masters/color', actions: ['READ', 'WRITE'] },
          { code: 'M_EDITION', title: 'Edition', href: '/admin/products/masters/edition', actions: ['READ', 'WRITE'] },
          { code: 'M_GENDER', title: 'Gender', href: '/admin/products/masters/gender', actions: ['READ', 'WRITE'] },
          { code: 'M_PROD_TYPE', title: 'Product Type', href: '/admin/products/masters/product-type', actions: ['READ', 'WRITE'] },
          { code: 'M_MATERIAL', title: 'Material', href: '/admin/products/masters/material', actions: ['READ', 'WRITE'] },
          { code: 'M_PATTERN', title: 'Pattern Finish', href: '/admin/products/masters/pattern-finish', actions: ['READ', 'WRITE'] },
          { code: 'M_SHIPMODE', title: 'Shipmode', href: '/admin/products/masters/shipmode', actions: ['READ', 'WRITE'] },
          { code: 'M_HANDLING', title: 'Handling Type', href: '/admin/products/masters/handling-type', actions: ['READ', 'WRITE'] },
          { code: 'M_PRICE', title: 'Price Type', href: '/admin/products/masters/price-type', actions: ['READ', 'WRITE'] },
          { code: 'M_WARRANTY', title: 'Warranty Type', href: '/admin/products/masters/warranty-type', actions: ['READ', 'WRITE'] },
          { code: 'M_UOM', title: 'UOM', href: '/admin/products/masters/uom', actions: ['READ', 'WRITE'] },
        ]
      }
    ],
  },
  {
    code: 'CLIENTS',
    module: 'Clients',
    icon: 'Users',
    href: '/admin/clients/profile',
    screens: [],
  },
  {
    code: 'SUPPLIERS',
    module: 'Suppliers',
    icon: 'Truck',
    href: '/admin/suppliers/profile',
    screens: [],
  },
  {
    code: 'STOCK',
    module: 'Stock',
    icon: 'Boxes',
    screens: [
      {
        code: 'STK_PROD_REL',
        title: 'Product Relations',
        href: '/admin/stock/product-relations',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'STK_PO',
        title: 'Purchase Orders',
        actions: ['READ', 'WRITE'],
        subScreens: [
          { code: 'STK_PO_LIST', title: 'Purchase Order', href: '/admin/stock/purchase-orders/list', actions: ['READ', 'WRITE'] },
          { code: 'STK_PO_AUTO', title: 'Auto-PO Config & Trigger', href: '/admin/stock/purchase-orders/auto-config', actions: ['READ', 'WRITE'] },
        ]
      },
      {
        code: 'STK_REC',
        title: 'Receive Stock',
        href: '/admin/stock/receive',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'STK_TRANS',
        title: 'Transfer',
        href: '/admin/stock/transfer',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'STK_DMG_DEF',
        title: 'Damaged & Defective',
        href: '/admin/stock/damaged-defective',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'STK_ADJ',
        title: 'Adjust Stock',
        href: '/admin/stock/adjust',
        actions: ['READ', 'WRITE']
      },
      // {
      //   code: 'STK_TAKING',
      //   title: 'Stocktaking',
      //   href: '/admin/stock/stocktaking',
      //   actions: ['READ', 'WRITE']
      // },
      {
        code: 'STK_REPORTS',
        title: 'Stock Reports',
        actions: ['READ', 'WRITE'],
        subScreens: [
          { code: 'STK_REP_CURR', title: 'Current Stock Status', href: '/admin/stock/reports/current-status', actions: ['READ', 'WRITE'] },
          { code: 'STK_REP_HIST', title: 'Historic Stock Status', href: '/admin/stock/reports/historic-status', actions: ['READ', 'WRITE'] },
          { code: 'STK_REP_LEDG', title: 'Stock Ledger', href: '/admin/stock/reports/ledger', actions: ['READ', 'WRITE'] },
          { code: 'STK_REP_MOVE', title: 'Stock Movement Audit', href: '/admin/stock/reports/movement-audit', actions: ['READ', 'WRITE'] },
          { code: 'STK_REP_STAG', title: 'Stagnant Stock Report', href: '/admin/stock/reports/stagnant', actions: ['READ', 'WRITE'] },
          { code: 'STK_REP_SLOW', title: 'Slow Moving Stock Report', href: '/admin/stock/reports/slow-moving', actions: ['READ', 'WRITE'] },
          { code: 'STK_REP_ADD', title: 'Addition Report', href: '/admin/stock/reports/additions', actions: ['READ', 'WRITE'] },
          { code: 'STK_REP_ADJ', title: 'Adjustment Report', href: '/admin/stock/reports/adjustments', actions: ['READ', 'WRITE'] },
          { code: 'STK_REP_INV', title: 'Supplier Invoice Report', href: '/admin/stock/reports/supplier-invoices', actions: ['READ', 'WRITE'] },
          { code: 'STK_REP_ADHC', title: 'Ad-hoc Report', href: '/admin/stock/reports/adhoc', actions: ['READ', 'WRITE'] },
          { code: 'STK_REP_EXP', title: 'Export Job Status & Download Tracking', href: '/admin/stock/reports/export-jobs', actions: ['READ', 'WRITE'] },
        ]
      },
      {
        code: 'STK_MASTER',
        title: 'Master',
        actions: ['READ', 'WRITE'],
        subScreens: [
          { code: 'STK_M_WH', title: 'Warehouse Setup', href: '/admin/stock/master/warehouse', actions: ['READ', 'WRITE'] },
          { code: 'STK_M_LOC', title: 'Inventory Storage Locations', href: '/admin/stock/master/locations', actions: ['READ', 'WRITE'] },
        ]
      }
    ]
  },
  {
    code: 'ORDERS',
    module: 'Orders',
    icon: 'ShoppingCart',
    screens: [
      {
        code: 'ORD_MASTER_CONFIG',
        title: 'Master Configuration',
        actions: ['READ', 'WRITE'],
        subScreens: [
          {
            code: 'ORD_COL_MAP',
            title: 'Client Column Mapping Setup',
            href: '/admin/orders/master-config/column-mapping',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_PINCODE_REG',
            title: 'Pincode Registry',
            href: '/admin/orders/master-config/pincode-registry',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_CUST_BLACKLIST',
            title: 'Customer Blacklist Setup',
            href: '/admin/orders/master-config/customer-blacklist',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_MASTER_LOOKUPS',
            title: 'Master Code Lookups',
            href: '/admin/orders/master-config/master-lookups',
            actions: ['READ', 'WRITE']
          }
        ]
      }
    ]
  },
  {
    code: 'COURIER',
    module: 'Courier',
    icon: 'Truck',
    screens: [
      {
        code: 'COUR_PARTNER',
        title: 'Courier Partner Management',
        href: '/admin/courier/partners',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'COUR_EXCLUSIONS',
        title: 'Client & Product Exclusions',
        href: '/admin/courier/exclusions',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'COUR_AWB',
        title: 'AWB Allocation & Pre-Allotted Pools',
        href: '/admin/courier/awb',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'COUR_INV_REG',
        title: 'Invoice & Label Registry',
        href: '/admin/courier/invoice-registry',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'COUR_PRINT',
        title: 'Customer Invoice & Label Printing',
        href: '/admin/courier/label-printing',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'COUR_OUTSCAN',
        title: 'Courier Outscan',
        href: '/admin/courier/outscan',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'COUR_DISPATCH',
        title: 'Courier Dispatches & Manifests',
        href: '/admin/courier/manifests',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'COUR_RETURNS',
        title: 'Logistics Returns Processing',
        href: '/admin/courier/returns',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'COUR_MASTER',
        title: 'Master',
        actions: ['READ', 'WRITE'],
        subScreens: [
          { code: 'COUR_M_PIN', title: 'Master Pincodes', href: '/admin/courier/master/pincodes', actions: ['READ', 'WRITE'] },
          { code: 'COUR_M_RATES', title: 'Courier Rate Cards', href: '/admin/courier/master/rates', actions: ['READ', 'WRITE'] },
          { code: 'COUR_M_ZONES', title: 'Zone Matrix Configuration', href: '/admin/courier/master/zones', actions: ['READ', 'WRITE'] },
          { code: 'COUR_M_ACTUALS', title: 'Actual Weight Audit', href: '/admin/courier/master/actuals', actions: ['READ', 'WRITE'] },
          { code: 'COUR_M_AVG_PRICE', title: 'Proposed Average Prices', href: '/admin/courier/master/proposed-average-prices', actions: ['READ', 'WRITE'] },
          { code: 'COUR_M_PIN_BLOCK', title: 'Pincode Block & Unblock', href: '/admin/courier/master/pincode-block', actions: ['READ', 'WRITE'] },
          { code: 'COUR_M_SYNC', title: 'Outbox Sync Delta', href: '/admin/courier/master/sync-delta', actions: ['READ', 'WRITE'] },
        ]
      },
      {
        code: 'COUR_WEBHOOKS',
        title: 'Webhooks & Carrier Integrations',
        href: '/admin/courier/webhooks',
        actions: ['READ', 'WRITE']
      }
    ]
  }
];
