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
  id: number;
  code: string;
  module: string;
  description: string;
  icon?: string | null;
  sortOrder: number;
  title?: string;
  screens: MenuScreen[];
  href?: string;
}

export const mockMenuData: MenuModule[] = [
  {
    id: 1,
    code: 'DASH',
    module: 'Dashboard',
    description: 'This module contains multiple dashoards',
    icon: 'LayoutDashboard',
    sortOrder: 0,
    title: 'Dashboard',
    screens: [
      { code: 'DASH_OPS', title: 'Operations Dashboard', href: '/admin/dashboard/operations', actions: ['READ'] },
      { code: 'DASH_SSE', title: 'SSE Dashboard Preview', href: '/preview_sse_dashboard.html?token=erp-init-2025', actions: ['READ'] },
      // { code: 'DASH_ACC', title: 'Accounts Dashboard', href: '/admin/dashboard/accounts', actions: ['READ'] },
      // { code: 'DASH_OWN', title: 'Owner Dashboard', href: '/admin/dashboard/owner', actions: ['READ'] },
    ],
  },
  {
    id: 3,
    code: 'PRODUCT',
    module: 'PROD_MOD',
    description: 'Product Catalog Module',
    icon: 'Package',
    sortOrder: 0,
    title: 'Products',
    screens: [
      { code: 'PROD', title: 'Products', href: '/admin/products/list', actions: ['READ', 'WRITE'] },
      { code: 'EXPLORER', title: 'Media Explorer', href: '/admin/products/explorer', actions: ['READ', 'WRITE'] },
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
    id: 6,
    code: 'CLIENT',
    module: 'CLIENT_MOD',
    description: 'Client Management Module',
    icon: 'Users',
    sortOrder: 0,
    title: 'Clients',
    href: '/admin/clients/profile',
    screens: [],
  },
  {
    id: 7,
    code: 'VENDOR',
    module: 'VENDOR_MOD',
    description: 'Supplier & Vendor Module',
    icon: 'Truck',
    sortOrder: 0,
    title: 'Supplier',
    href: '/admin/suppliers/profile',
    screens: [],
  },
  {
    id: 4,
    code: 'STOCK',
    module: 'STOCK_MOD',
    description: 'Inventory & Stock Module',
    icon: 'Boxes',
    sortOrder: 0,
    title: 'Stock',
    screens: [
      {
        code: 'STK_PROD_REL',
        title: 'Product Relations',
        href: '/admin/stock/product-relations',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'STK_ALT_PROD',
        title: 'Alternate Products',
        href: '/admin/stock/alternate-products',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'STK_PROD_CONFIG',
        title: 'Product Config',
        actions: ['READ', 'WRITE'],
        subScreens: [
          {
            code: 'STK_PACK_QTY',
            title: 'Product Pack Quantity',
            href: '/admin/stock/product-config/pack-quantity',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'STK_MEASUREMENTS',
            title: 'Product Measurements',
            href: '/admin/stock/product-config/measurements',
            actions: ['READ', 'WRITE']
          }
        ]
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
          // { code: 'STK_REP_EXP', title: 'Export Job Status & Download Tracking', href: '/admin/stock/reports/export-jobs', actions: ['READ', 'WRITE'] },
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
    id: 2,
    code: 'ORDER',
    module: 'ORDER_MOD',
    description: 'Orders & Fulfillment Module',
    icon: 'ShoppingCart',
    sortOrder: 0,
    title: 'Orders',
    screens: [
      {
        code: 'ORD_BATCH',
        title: 'Batch Orders',
        href: '/admin/orders/batch-orders',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'ORD_ADHOC_MGMT',
        title: 'Ad-hoc Management',
        href: '/admin/orders/adhoc-management',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'ORD_STOCK_ASSIGN',
        title: 'Stock Assignment',
        href: '/admin/orders/stock-assignment',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'ORD_PREORDER_MGMT',
        title: 'Pre-Order Management',
        actions: ['READ', 'WRITE'],
        subScreens: [
          {
            code: 'ORD_PRE_CONVERT',
            title: 'Convert to Pre-Order',
            href: '/admin/orders/pre-order/convert',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_PRE_SHORTAGE',
            title: 'Record Warehouse Shortage',
            href: '/admin/orders/pre-order/shortage',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_PRE_ACTIVE',
            title: 'Active Pre-Order Queue',
            href: '/admin/orders/pre-order/active-queue',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_PRE_AUDIT',
            title: 'Pre-Order Audit & History',
            href: '/admin/orders/pre-order/audit-history',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_PRE_RELEASE',
            title: 'Pre-Order Release',
            href: '/admin/orders/pre-order/release',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_PRE_MASTER',
            title: 'Master',
            actions: ['READ', 'WRITE'],
            subScreens: [
              {
                code: 'ORD_PRE_M_SHORTAGE_REASONS',
                title: 'Pre-Order Shortage Reasons',
                href: '/admin/orders/pre-order/master/shortage-reasons',
                actions: ['READ', 'WRITE']
              }
            ]
          }
        ]
      },
      {
        code: 'ORD_COURIER_ASSIGN_GROUP',
        title: 'Courier Assignment',
        actions: ['READ', 'WRITE'],
        subScreens: [
          {
            code: 'ORD_COURIER_ASSIGN_BATCH',
            title: 'Assign Batch',
            href: '/admin/orders/courier-assignment',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_MANUAL_COURIER_ASSIGN',
            title: 'Manual Assign',
            href: '/admin/orders/manual-courier-assignment',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_UPLOAD_COURIER_ASSIGN',
            title: 'Upload Courier Assign',
            href: '/admin/orders/upload-courier-assignment',
            actions: ['READ', 'WRITE']
          }
        ]
      },
      {
        code: 'ORD_AWB_ASSIGN_GROUP',
        title: 'AWB Assign',
        actions: ['READ', 'WRITE'],
        subScreens: [
          {
            code: 'ORD_SHARE_TO_COURIER',
            title: 'Share to Courier',
            href: '/admin/orders/awb-assign/share-to-courier',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_COURIER_ASSIGN_BATCH',
            title: 'Courier Assign Batch',
            href: '/admin/orders/awb-assign/courier-assign-batch',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_COURIER_BATCH_UPLOAD',
            title: 'Courier Batch Upload',
            href: '/admin/orders/awb-assign/courier-batch-upload',
            actions: ['READ', 'WRITE']
          }
        ]
      },
      {
        code: 'ORD_PRINT_GROUP',
        title: 'Print',
        actions: ['READ', 'WRITE'],
        subScreens: [
          {
            code: 'ORD_PRINT_INVOICE_LIST',
            title: 'Invoice List',
            href: '/admin/orders/print/invoice-list',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_PRINT_INVOICE',
            title: 'Print Invoice',
            href: '/admin/orders/print/print-invoice',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_REPRINT_INVOICE',
            title: 'Reprint Invoice',
            href: '/admin/orders/print/reprint-invoice',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_BATCH_REPRINT_INVOICE',
            title: 'Batch Reprint',
            href: '/admin/orders/print/batch-reprint',
            actions: ['READ', 'WRITE']
          }
        ]
      },
      {
        code: 'ORD_REPORTS',
        title: 'Reports',
        actions: ['READ', 'WRITE'],
        subScreens: [
          {
            code: 'ORD_REP_DETAIL',
            title: 'Order Detail Report',
            href: '/admin/orders/reports/order-detail',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_REP_STATUS_CHECK',
            title: 'Status Check Report',
            href: '/admin/orders/reports/status-check',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_REP_STATUS_CHECK_BATCH',
            title: 'Status Check Batch',
            href: '/admin/orders/reports/status-check-batch',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_AWB_BATCH_JOBS',
            title: 'AWB Batch Jobs',
            href: '/admin/orders/reports/awb-batch-jobs',
            actions: ['READ', 'WRITE']
          }
        ]
      },
      {
        code: 'ORD_RTO',
        title: 'RTO',
        actions: ['READ', 'WRITE'],
        subScreens: [
          {
            code: 'ORD_RTO_INTAKE',
            title: 'Courier Return Intake',
            href: '/admin/orders/rto/return-intake',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'ORD_RTO_CLAIMS',
            title: 'Courier Claims Ledger',
            href: '/admin/orders/rto/claims-ledger',
            actions: ['READ', 'WRITE']
          }
        ]
      },
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
          },
          {
            code: 'ORD_INVOICE_GROUP',
            title: 'Invoice Group',
            href: '/admin/orders/master-config/invoice-group',
            actions: ['READ', 'WRITE']
          }
        ]
      },
      {
        code: 'ORD_PROD_CONFIG',
        title: 'Product Configuration',
        actions: ['READ', 'WRITE'],
        subScreens: [
          {
            code: 'ORD_SPLIT_SURFACE_CONFIG',
            title: 'Split & Surface Config',
            href: '/admin/orders/product-config/split-surface',
            actions: ['READ', 'WRITE']
          }
        ]
      }
    ]
  },
  {
    id: 11,
    code: 'PREORDER',
    module: 'PREORDER_MOD',
    description: 'Pre-Order Management Module',
    icon: 'Clock',
    sortOrder: 0,
    title: 'Pre-Order Management',
    screens: [
      {
        code: 'ORD_PRE_CONVERT',
        title: 'Convert to Pre-Order',
        href: '/admin/orders/pre-order/convert',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'ORD_PRE_SHORTAGE',
        title: 'Record Warehouse Shortage',
        href: '/admin/orders/pre-order/shortage',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'ORD_PRE_ACTIVE',
        title: 'Active Pre-Order Queue',
        href: '/admin/orders/pre-order/active-queue',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'ORD_PRE_AUDIT',
        title: 'Pre-Order Audit & History',
        href: '/admin/orders/pre-order/audit-history',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'ORD_PRE_RELEASE',
        title: 'Pre-Order Release',
        href: '/admin/orders/pre-order/release',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'ORD_PRE_MASTER',
        title: 'Master',
        actions: ['READ', 'WRITE'],
        subScreens: [
          {
            code: 'ORD_PRE_M_SHORTAGE_REASONS',
            title: 'Pre-Order Shortage Reasons',
            href: '/admin/orders/pre-order/master/shortage-reasons',
            actions: ['READ', 'WRITE']
          }
        ]
      }
    ]
  },
  {
    id: 5,
    code: 'COURIER',
    module: 'COURIER_MOD',
    description: 'Logistics & Courier Module',
    icon: 'Truck',
    sortOrder: 0,
    title: 'Courier',
    screens: [
      {
        code: 'COUR_PARTNER',
        title: 'Courier Partner Management',
        href: '/admin/courier/partners',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'COUR_PINCODE_BLOCK',
        title: 'Bulk Pincode Block Control',
        href: '/admin/courier/pincode-block',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'COUR_EXCLUSIONS',
        title: 'Client & Product Exclusions',
        href: '/admin/courier/exclusions',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'COUR_ACTUALS',
        title: 'Courier Actuals',
        href: '/admin/courier/actuals',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'COUR_PROPOSED_AVG',
        title: 'Proposed Average Prices',
        href: '/admin/courier/proposed-average-prices',
        actions: ['READ', 'WRITE']
      },
      {
        code: 'COUR_PRE_AWB_MASTER',
        title: 'Pre Allotted AWB',
        href: '/admin/orders/master-config/pre-awb-master',
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
        code: 'COUR_WEBHOOKS',
        title: 'Webhooks & Carrier Integrations',
        href: '/admin/courier/webhooks',
        actions: ['READ', 'WRITE']
      }
    ]
  },
  {
    id: 8,
    code: 'FINANCE',
    module: 'FINANCE_MOD',
    description: 'Finance & Billing Module',
    icon: 'BarChart3',
    sortOrder: 0,
    title: 'Finance & Billing',
    screens: [],
  },
  {
    id: 9,
    code: 'USER',
    module: 'USER_MOD',
    description: 'User & Security Module',
    icon: 'User',
    sortOrder: 0,
    title: 'User & Security',
    screens: [
      {
        code: 'USER_CONFIG_GROUP',
        title: 'Users Config',
        actions: ['READ', 'WRITE'],
        subScreens: [
          {
            code: 'USER_CONFIG_USERS',
            title: 'Users',
            href: '/admin/user/users',
            actions: ['READ', 'WRITE']
          }
        ]
      },
      {
        code: 'USER_ROLES_GROUP',
        title: 'Roles & Permissions',
        actions: ['READ', 'WRITE'],
        subScreens: [
          {
            code: 'USER_ROLES_HUB',
            title: 'Security Hub Overview',
            href: '/admin/user/roles',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'USER_ROLES_LIST',
            title: 'Role Management',
            href: '/admin/user/roles/list',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'USER_ROLE_MAPPINGS',
            title: 'User-Role Mappings',
            href: '/admin/user/roles/user-roles',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'USER_PERM_MATRIX',
            title: 'Permission Matrix',
            href: '/admin/user/roles/matrix',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'USER_SCREENS',
            title: 'Screens Catalog',
            href: '/admin/user/roles/screens',
            actions: ['READ', 'WRITE']
          },
          {
            code: 'USER_OVERRIDES_CACHE',
            title: 'Overrides & Redis Cache',
            href: '/admin/user/permissions/overrides',
            actions: ['READ', 'WRITE']
          }
        ]
      }
    ],
  },
  {
    id: 10,
    code: 'MEDIA',
    module: 'MEDIA_MOD',
    description: 'Media Storage & File Asset Module',
    icon: 'Boxes',
    sortOrder: 0,
    title: 'Media Storage',
    screens: [],
  }
];

