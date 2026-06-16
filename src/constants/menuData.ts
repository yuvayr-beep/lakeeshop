// Mock menu data based on API format
export interface MenuAction {
  code: string;
}

export interface MenuScreen {
  code: string;
  title: string;
  href: string;
  actions: string[];
  icon?: string;
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
      { code: 'DASH_ACC', title: 'Accounts Dashboard', href: '/admin/dashboard/accounts', actions: ['READ'] },
      { code: 'DASH_OWN', title: 'Owner Dashboard', href: '/admin/dashboard/owner', actions: ['READ'] },
    ],
  },
  {
    code: 'ORDER',
    module: 'Order Process',
    icon: 'ShoppingCart',
    screens: [
      { code: 'BATCH', title: 'Batch Order', href: '/admin/orders/batch', actions: ['READ', 'WRITE'] },
    ],
  },
  {
    code: 'PROD',
    module: 'Products',
    icon: 'Package',
    screens: [
      { code: 'PCAT', title: 'Product Category', href: '/admin/products/category', actions: ['READ', 'WRITE'] },
      { code: 'MFG', title: 'Manufacturer', href: '/admin/products/manufacturer', actions: ['READ', 'WRITE'] },
      { code: 'BRAND', title: 'Brand', href: '/admin/products/brand', actions: ['READ', 'WRITE'] },
      { code: 'TAX', title: 'Tax', href: '/admin/products/tax', actions: ['READ', 'WRITE'] },
      { code: 'SHIP', title: 'Ship Mode', href: '/admin/products/shipmode', actions: ['READ', 'WRITE'] },
      { code: 'PROD', title: 'Products', href: '/admin/products/list', actions: ['READ', 'WRITE'] },
    ],
  },
];
