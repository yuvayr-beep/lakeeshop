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
        actions: ['READ', 'WRITE'],
        subScreens: [
          { code: 'STK_REC_RCV', title: 'Receive', href: '/admin/stock/receive', actions: ['READ', 'WRITE'] },
          { code: 'STK_REC_VER', title: 'Verify', href: '/admin/stock/receive/verify', actions: ['READ', 'WRITE'] },
          { code: 'STK_REC_DMG', title: 'Damaged', href: '/admin/stock/receive/damaged', actions: ['READ', 'WRITE'] },
        ]
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
        code: 'STK_TAKING',
        title: 'Stocktaking',
        href: '/admin/stock/stocktaking',
        actions: ['READ', 'WRITE']
      },
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
  }
];
