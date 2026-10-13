export type PermissionAction = 'READ' | 'WRITE' | 'EDIT' | 'DELETE' | 'EXPORT';

export interface RoleDto {
  id: number;
  name: string;
  description: string;
  statusId?: number; // 1 = Active, 2 = Inactive
  status?: string | number; // 'ACTIVE' | 'INACTIVE' | 1 | 2
  isSuperUser?: boolean;
}

export interface CreateRoleDto {
  name: string;
  description: string;
  statusId: number;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  statusId?: number;
}

export interface UserRoleMapping {
  userId: number;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  phoneNumber?: string | null;
  roles?: string;
  roleNames?: string[];
  roleIds: number[];
  userName?: string; // fallback
  userEmail?: string; // fallback
  userPhone?: string; // fallback
}

export interface UserRoleResponseDto {
  id?: number;
  userId: number;
  roleId: number;
  roleName?: string;
}

export interface ScreenDto {
  id: number;
  code: string;
  title: string;
  description: string;
  moduleCode: string;
  path: string;
  componentName?: string;
  sortOrder: number;
}

export interface ScreenActionPermission {
  screenId?: number;
  screenCode: string;
  actions: PermissionAction[];
  path?: string;
}

export interface EffectiveUserActionDto {
  userId: number;
  screenCode: string;
  actions: PermissionAction[];
  isSuperUser?: boolean;
}

export interface UserPermissionOverrideDto {
  id?: number;
  userId: number;
  screenCode: string;
  action: PermissionAction;
  allowed: boolean;
}

export interface NavigationScreenItem {
  code: string;
  title: string;
  href: string;
  actions: PermissionAction[];
  subScreens?: NavigationScreenItem[];
}

export interface NavigationModuleItem {
  id: number;
  code: string;
  module: string;
  description: string;
  icon?: string;
  sortOrder: number;
  title: string;
  screens: NavigationScreenItem[];
}

export interface ModuleDto {
  id?: number;
  code: string;
  module: string;
  name?: string;
  description?: string;
  icon?: string | null;
  sortOrder?: number;
}

export interface CreateModuleDto {
  code: string;
  module: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

export interface UserItem {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phoneNumber?: string | null;
  clientCode?: string | null;
  statusId?: number;
}

export interface CreateUserDto {
  firstName: string;
  lastName?: string;
  email?: string;
  phoneNumber: string;
  clientCode?: string;
}

export interface UpdateUserDto {
  firstName: string;
  lastName?: string;
  email?: string;
  phoneNumber: string;
  clientCode?: string;
}

export interface ResetUserPasswordDto {
  userId: number;
  phone: string;
  newPassword?: string;
}

