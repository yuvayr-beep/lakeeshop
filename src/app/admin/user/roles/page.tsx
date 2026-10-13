'use client';

import React from 'react';
import AdminLayout from '@/app/admin/components/AdminLayout';
import Link from 'next/link';
import {
  Shield, Users, Grid, Layout, Zap, ArrowRight, Key
} from 'lucide-react';

export default function UserSecurityHubPage() {
  const cards = [
    {
      title: 'Role Management',
      description: 'Create and manage system roles (Sales, Admin, Warehouse, Catalog, Accounts, etc.) and active statuses.',
      href: '/admin/user/roles/list',
      icon: Shield,
      badge: 'System Roles',
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    },
    {
      title: 'User-Role Mappings',
      description: 'Assign or revoke roles for individual user accounts while strictly hiding SUPER-USER role IDs per policy.',
      href: '/admin/user/roles/user-roles',
      icon: Users,
      badge: 'User Assignments',
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      title: 'Permission Checkbox Matrix',
      description: 'Interactive grid mapping system screens (Y-axis) to actions (READ, WRITE, EDIT, DELETE, EXPORT) (X-axis).',
      href: '/admin/user/roles/matrix',
      icon: Grid,
      badge: 'Permission Matrix',
      color: 'bg-purple-50 text-purple-600 border-purple-200',
    },
    {
      title: 'Screens Management Catalog',
      description: 'Register application screens, routes, module codes, component names, and menu ordering.',
      href: '/admin/user/roles/screens',
      icon: Layout,
      badge: 'Screen Catalog',
      color: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    {
      title: 'Overrides & Redis Cache',
      description: 'Inspect resolved effective user actions and trigger automatic Redis permission cache invalidation.',
      href: '/admin/user/permissions/overrides',
      icon: Zap,
      badge: 'Security Overrides',
      color: 'bg-amber-50 text-amber-600 border-amber-200',
    },
  ];

  return (
    <AdminLayout
      fullWidth={true}
      pageTitle="Permission & Authorization Security Hub"
      pageSubtitle="Manage role-based access control, user permission assignments, screen catalog, and security overrides"
      pageIcon={<Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
    >
      <div className="space-y-6">

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                href={card.href}
                className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-3.5 rounded-xl border ${card.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                      {card.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition flex items-center gap-1.5">
                      {card.title}
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1" />
                    </h3>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                  <span>Open Configuration</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
