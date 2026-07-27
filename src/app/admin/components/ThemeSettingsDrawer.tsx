'use client';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Moon, Palette, Check, RefreshCw, Sparkles, Sliders, Pipette } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  setFullTheme,
  THEME_COLORS,
  ThemeColor,
  ThemeMode,
  applyThemeToDom,
  adjustColorBrightness,
  hexToRgba
} from '@/redux/slices/themeSlice';
import { toast } from 'sonner';

interface ThemeSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_CUSTOM_SWATCHES = [
  '#ec4899', // Pink
  '#f97316', // Orange
  '#0d9488', // Teal
  '#84cc16', // Lime
  '#8b5cf6', // Violet
  '#14b8a6', // Mint
  '#f43f5e', // Coral
];

export default function ThemeSettingsDrawer({ isOpen, onClose }: ThemeSettingsDrawerProps) {
  const dispatch = useAppDispatch();
  const currentMode = useAppSelector((s) => s.theme.mode) || 'light';
  const currentColor = useAppSelector((s) => s.theme.color) || 'blue';
  const currentCustomHex = useAppSelector((s) => s.theme.customHex) || '#ec4899';

  const [mounted, setMounted] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ThemeMode>(currentMode);
  const [selectedColor, setSelectedColor] = useState<ThemeColor>(currentColor);
  const [customHex, setCustomHexValue] = useState<string>(currentCustomHex);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync state when drawer opens
  useEffect(() => {
    if (isOpen) {
      setSelectedMode(currentMode);
      setSelectedColor(currentColor);
      setCustomHexValue(currentCustomHex);
    }
  }, [isOpen, currentMode, currentColor, currentCustomHex]);

  // Live preview when user clicks options
  const handlePreviewMode = (mode: ThemeMode) => {
    setSelectedMode(mode);
    applyThemeToDom(mode, selectedColor, customHex);
  };

  const handlePreviewColor = (color: ThemeColor, hexVal?: string) => {
    const activeHex = hexVal || customHex;
    setSelectedColor(color);
    if (color === 'custom') {
      setCustomHexValue(activeHex);
    }
    applyThemeToDom(selectedMode, color, activeHex);
  };

  const handleCustomHexInput = (hex: string) => {
    let formatted = hex;
    if (!formatted.startsWith('#') && formatted.length > 0) {
      formatted = `#${formatted}`;
    }
    setCustomHexValue(formatted);
    if (selectedColor === 'custom') {
      applyThemeToDom(selectedMode, 'custom', formatted);
    }
  };

  const handleApply = () => {
    dispatch(setFullTheme({ mode: selectedMode, color: selectedColor, customHex }));
    toast.success('Theme & color settings saved successfully!');
    onClose();
  };

  const handleReset = () => {
    setSelectedMode('light');
    setSelectedColor('blue');
    setCustomHexValue('#ec4899');
    dispatch(setFullTheme({ mode: 'light', color: 'blue', customHex: '#ec4899' }));
    toast.info('Theme reset to default (Light & Royal Blue)');
  };

  const handleCloseWithoutSaving = () => {
    // Revert to store state
    applyThemeToDom(currentMode, currentColor, currentCustomHex);
    onClose();
  };

  // Calculate live preview primary hex
  let previewPrimaryHex: string;
  let previewBgSoft: string;

  if (selectedColor === 'custom') {
    const validHex = customHex.startsWith('#') ? customHex : `#${customHex}`;
    previewPrimaryHex = selectedMode === 'dark' ? adjustColorBrightness(validHex, 15) : validHex;
    previewBgSoft = selectedMode === 'dark' ? hexToRgba(validHex, 0.22) : hexToRgba(validHex, 0.12);
  } else {
    const preset = THEME_COLORS[selectedColor as keyof typeof THEME_COLORS] || THEME_COLORS.blue;
    previewPrimaryHex = selectedMode === 'dark' ? preset.primaryDark : preset.primaryLight;
    previewBgSoft = selectedMode === 'dark' ? preset.bgDark : preset.bgLight;
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseWithoutSaving}
            className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm z-[9998]"
          />

          {/* Sliding Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-[9999] w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col h-screen overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Sliders size={20} />
                </div>
                <div>
                  <h2 className="text-base font-700 text-slate-800 dark:text-white leading-tight">Theme & Appearance</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Customize your workspace look and color palette</p>
                </div>
              </div>
              <button
                onClick={handleCloseWithoutSaving}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close theme drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {/* Section 1: Appearance Mode */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sun size={16} className="text-slate-500 dark:text-slate-400" />
                  <h3 className="text-xs font-700 uppercase tracking-wider text-slate-500 dark:text-slate-400">Appearance Mode</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handlePreviewMode('light')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 text-left transition-all ${
                      selectedMode === 'light'
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${selectedMode === 'light' ? 'bg-blue-600 text-white' : 'bg-amber-100 text-amber-600'}`}>
                        <Sun size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-700 text-slate-800 dark:text-white">Light Mode</p>
                        <p className="text-[10px] text-slate-500">Clean & crisp</p>
                      </div>
                    </div>
                    {selectedMode === 'light' && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check size={12} />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePreviewMode('dark')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 text-left transition-all ${
                      selectedMode === 'dark'
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${selectedMode === 'dark' ? 'bg-blue-600 text-white' : 'bg-indigo-900 text-indigo-200'}`}>
                        <Moon size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-700 text-slate-800 dark:text-white">Dark Mode</p>
                        <p className="text-[10px] text-slate-500">Sleek & modern</p>
                      </div>
                    </div>
                    {selectedMode === 'dark' && (
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check size={12} />
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <hr className="border-slate-100 dark:border-slate-800" />

              {/* Section 2: Preset Color Theme Selection */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Palette size={16} className="text-slate-500 dark:text-slate-400" />
                  <h3 className="text-xs font-700 uppercase tracking-wider text-slate-500 dark:text-slate-400">Primary Color Theme</h3>
                </div>

                <div className="grid grid-cols-1 gap-2.5 mb-4">
                  {(Object.keys(THEME_COLORS) as (keyof typeof THEME_COLORS)[]).map((key) => {
                    const preset = THEME_COLORS[key];
                    const isSelected = selectedColor === key;
                    const displayHex = selectedMode === 'dark' ? preset.primaryDark : preset.primaryLight;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handlePreviewColor(key)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                          isSelected
                            ? 'border-slate-800 dark:border-white bg-slate-50 dark:bg-slate-800/80 shadow-md scale-[1.01]'
                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-sm font-700 text-xs"
                            style={{ backgroundColor: displayHex }}
                          >
                            {isSelected && <Check size={14} />}
                          </div>
                          <span className="text-xs font-700 text-slate-800 dark:text-slate-200">{preset.name}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full"
                            style={{ backgroundColor: preset.primaryLight }}
                            title="Light accent"
                          />
                          <span
                            className="w-3.5 h-3.5 rounded-full"
                            style={{ backgroundColor: preset.primaryDark }}
                            title="Dark accent"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Section 3: Custom Color Option */}
                <div
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    selectedColor === 'custom'
                      ? 'border-slate-800 dark:border-white bg-slate-50 dark:bg-slate-800/90 shadow-md'
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/30'
                  }`}
                >
                  <div
                    onClick={() => handlePreviewColor('custom')}
                    className="flex items-center justify-between cursor-pointer mb-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: customHex }}
                      >
                        <Pipette size={15} />
                      </div>
                      <div>
                        <p className="text-xs font-700 text-slate-800 dark:text-white">Custom Color Picker</p>
                        <p className="text-[10px] text-slate-500">Pick any custom hex accent color</p>
                      </div>
                    </div>
                    {selectedColor === 'custom' && (
                      <div className="w-5 h-5 rounded-full bg-slate-800 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
                        <Check size={12} />
                      </div>
                    )}
                  </div>

                  {/* Color Picker & Hex Input Controls */}
                  <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center gap-3">
                      {/* Native HTML Color Picker */}
                      <div className="relative flex-shrink-0">
                        <input
                          type="color"
                          value={customHex.length === 7 ? customHex : '#ec4899'}
                          onChange={(e) => {
                            handleCustomHexInput(e.target.value);
                            if (selectedColor !== 'custom') {
                              handlePreviewColor('custom', e.target.value);
                            }
                          }}
                          className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-transparent overflow-hidden"
                          title="Click to open color wheel"
                        />
                      </div>

                      {/* Hex Text Input */}
                      <div className="flex-1">
                        <label className="text-[10px] font-700 uppercase tracking-wider text-slate-400 block mb-1">
                          Hex Code
                        </label>
                        <input
                          type="text"
                          value={customHex}
                          onChange={(e) => {
                            handleCustomHexInput(e.target.value);
                            if (selectedColor !== 'custom') {
                              handlePreviewColor('custom', e.target.value);
                            }
                          }}
                          placeholder="#ec4899"
                          maxLength={7}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Quick Swatches */}
                    <div>
                      <span className="text-[10px] font-600 text-slate-400 block mb-1.5">Quick Swatches:</span>
                      <div className="flex items-center gap-2">
                        {QUICK_CUSTOM_SWATCHES.map((swatchHex) => (
                          <button
                            key={swatchHex}
                            type="button"
                            onClick={() => {
                              handleCustomHexInput(swatchHex);
                              handlePreviewColor('custom', swatchHex);
                            }}
                            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                              selectedColor === 'custom' && customHex.toLowerCase() === swatchHex.toLowerCase()
                                ? 'border-slate-800 dark:border-white scale-110 shadow-sm'
                                : 'border-transparent'
                            }`}
                            style={{ backgroundColor: swatchHex }}
                            title={swatchHex}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Live Component Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-600 text-slate-500 dark:text-slate-400">
                  <Sparkles size={14} style={{ color: previewPrimaryHex }} />
                  <span>Live Interface Preview</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-xl text-xs font-700 text-white shadow-sm transition-all"
                    style={{ backgroundColor: previewPrimaryHex }}
                  >
                    Primary Button
                  </button>
                  <span
                    className="px-2.5 py-1 rounded-full text-[11px] font-700"
                    style={{
                      backgroundColor: previewBgSoft,
                      color: previewPrimaryHex
                    }}
                  >
                    Active Badge
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw size={13} />
                Reset
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseWithoutSaving}
                  className="px-3.5 py-2 rounded-xl text-xs font-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="px-4 py-2 rounded-xl text-xs font-700 text-white shadow-sm hover:opacity-95 transition-all"
                  style={{ backgroundColor: previewPrimaryHex }}
                >
                  Apply & Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
