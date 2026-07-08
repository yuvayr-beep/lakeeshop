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
    screens: [
      { code: 'CLI_PROFILE', title: 'Profile', href: '/admin/clients/profile', actions: ['READ', 'WRITE'] },
      { code: 'CLI_BU', title: 'Business Unit', href: '/admin/clients/business-unit', actions: ['READ', 'WRITE'] },
      { code: 'CLI_ADDR', title: 'Address', href: '/admin/clients/address', actions: ['READ', 'WRITE'] },
      { code: 'CLI_CONT', title: 'Contacts', href: '/admin/clients/contacts', actions: ['READ', 'WRITE'] },
      { code: 'CLI_BANK', title: 'Banks', href: '/admin/clients/banks', actions: ['READ', 'WRITE'] },
      { code: 'CLI_DOCS', title: 'Documents', href: '/admin/clients/documents', actions: ['READ', 'WRITE'] },
      { code: 'CLI_TAX', title: 'Tax', href: '/admin/clients/tax', actions: ['READ', 'WRITE'] },
    ]
  },
  {
    code: 'SUPPLIERS',
    module: 'Suppliers',
    icon: 'Truck',
    screens: [
      { code: 'SUP_PROFILE', title: 'Profile', href: '/admin/suppliers/profile', actions: ['READ', 'WRITE'] },
      { code: 'SUP_ADDR', title: 'Address', href: '/admin/suppliers/address', actions: ['READ', 'WRITE'] },
      { code: 'SUP_CONT', title: 'Contacts', href: '/admin/suppliers/contacts', actions: ['READ', 'WRITE'] },
      { code: 'SUP_BANK', title: 'Banks', href: '/admin/suppliers/banks', actions: ['READ', 'WRITE'] },
      { code: 'SUP_DOCS', title: 'Documents', href: '/admin/suppliers/documents', actions: ['READ', 'WRITE'] },
      { code: 'SUP_EMAIL', title: 'Emails', href: '/admin/suppliers/emails', actions: ['READ', 'WRITE'] },
      { code: 'SUP_LOGS', title: 'Status Logs', href: '/admin/suppliers/status-logs', actions: ['READ', 'WRITE'] },
      { code: 'SUP_TAX', title: 'Tax', href: '/admin/suppliers/tax', actions: ['READ', 'WRITE'] },
    ]
  }
];
