'use client';
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Building2, Edit3, Save, X, Camera, Activity, ShoppingBag, CheckCircle2, Clock } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { fetchUserProfile } from '@/redux/slices/userSlice';
import { toast } from 'sonner';

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
    </div>
  );
}

const activityCards = [
  { label: 'Total Orders', value: '1,247', icon: ShoppingBag, color: 'blue' },
  { label: 'Completed', value: '1,183', icon: CheckCircle2, color: 'emerald' },
  { label: 'Pending', value: '64', icon: Clock, color: 'amber' },
  { label: 'Active Sessions', value: '3', icon: Activity, color: 'violet' },
];

const colorMap: Record<string, { bg: string; icon: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', icon: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600' },
};

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const { profile, loading } = useAppSelector((s) => s.user);
  const phoneNumber = useAppSelector((s) => s.auth.phoneNumber);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' });

  useEffect(() => {
    if (!profile && phoneNumber) {
      dispatch(fetchUserProfile(phoneNumber));
    }
  }, [dispatch, profile, phoneNumber]);

  useEffect(() => {
    if (profile) {
      setForm({ firstName: profile.firstName, lastName: profile.lastName, email: profile.email });
    }
  }, [profile]);

  const handleSave = () => {
    toast.success('Profile updated successfully');
    setEditing(false);
  };

  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : 'Admin User';
  const initials = profile ? `${profile.firstName[0]}${profile.lastName[0]}` : 'AU';

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-700 text-slate-800 dark:text-white">My Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage your account information</p>
      </motion.div>

      {/* Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl font-700">{initials}</span>
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              <Camera size={13} className="text-slate-500" />
            </button>
          </div>

          <div className="flex-1">
            {loading ? (
              <SkeletonCard />
            ) : (
              <>
                <h2 className="text-xl font-700 text-slate-800 dark:text-white">{displayName}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{profile?.clientCode || 'ADMIN'} · {profile?.phoneNumber || '—'}</p>
              </>
            )}
          </div>

          <button
            onClick={() => setEditing((p) => !p)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-600 transition-all ${
              editing
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' :'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {editing ? <X size={15} /> : <Edit3 size={15} />}
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
      </motion.div>

      {/* Details Form */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm"
      >
        <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-5">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* First Name */}
          <div>
            <label className="text-xs font-600 text-slate-500 dark:text-slate-400 mb-1.5 block">First Name</label>
            {loading ? (
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : editing ? (
              <input
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
            ) : (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <User size={15} className="text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">{profile?.firstName || '—'}</span>
              </div>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="text-xs font-600 text-slate-500 dark:text-slate-400 mb-1.5 block">Last Name</label>
            {loading ? (
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : editing ? (
              <input
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
            ) : (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <User size={15} className="text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">{profile?.lastName || '—'}</span>
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-600 text-slate-500 dark:text-slate-400 mb-1.5 block">Email Address</label>
            {loading ? (
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : editing ? (
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              />
            ) : (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Mail size={15} className="text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">{profile?.email || '—'}</span>
              </div>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-600 text-slate-500 dark:text-slate-400 mb-1.5 block">Phone Number</label>
            {loading ? (
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Phone size={15} className="text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">{profile?.phoneNumber || '—'}</span>
              </div>
            )}
          </div>

          {/* Client Code */}
          <div>
            <label className="text-xs font-600 text-slate-500 dark:text-slate-400 mb-1.5 block">Client Code</label>
            {loading ? (
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ) : (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Building2 size={15} className="text-slate-400" />
                <span className="text-sm text-slate-700 dark:text-slate-300">{profile?.clientCode || '—'}</span>
              </div>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-600 hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Save size={15} />
              Save Changes
            </button>
          </div>
        )}
      </motion.div>

      {/* Activity Summary */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h3 className="text-sm font-700 text-slate-800 dark:text-white mb-3">Activity Summary</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {activityCards.map((card) => {
            const c = colorMap[card.color];
            return (
              <div key={card.label} className={`${c.bg} rounded-2xl p-4 border border-white/60 dark:border-white/5 shadow-sm`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${c.icon}`}>
                  <card.icon size={16} />
                </div>
                <p className="text-xl font-700 text-slate-800 dark:text-white tabular-nums">{card.value}</p>
                <p className="text-xs font-600 text-slate-500 dark:text-slate-400 mt-0.5">{card.label}</p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
