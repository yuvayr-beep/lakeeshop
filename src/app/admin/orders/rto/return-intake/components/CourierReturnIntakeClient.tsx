'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  QrCode,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertOctagon,
  Loader2,
  Camera,
  Send,
  Package,
  Layers,
  ShieldCheck,
  ExternalLink,
  UploadCloud,
  X,
  Trash2,
  Video,
  Square,
  Circle,
  Play,
  RefreshCw,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import {
  BarcodeIdentifierType,
  ReturnedStockCondition,
  CourierReturnScanItem
} from '@/types/courierReturn';
import { courierReturnService, MediaUploadResponse } from '@/services/courierReturnApi';

// Deterministic Time Formatter to eliminate SSR Hydration mismatch
const formatTime = (isoString: string): string => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = (hours % 12 || 12).toString().padStart(2, '0');
  return `${formattedHours}:${minutes}:${seconds} ${ampm}`;
};

const STORAGE_KEY = 'lakee_rto_return_scan_history_clean_v2';

export default function CourierReturnIntakeClient() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [identifier, setIdentifier] = useState<string>('');
  const [identifierType, setIdentifierType] = useState<BarcodeIdentifierType>('AWB');
  const [stockCondition, setStockCondition] = useState<ReturnedStockCondition>('AVAILABLE');
  const [remarks, setRemarks] = useState<string>('');
  const [evidenceFileUrl, setEvidenceFileUrl] = useState<string>('');
  const [uploadingMedia, setUploadingMedia] = useState<boolean>(false);
  const [scanSubmitting, setScanSubmitting] = useState<boolean>(false);

  // Scan history list initialized to completely empty array
  const [scanHistory, setScanHistory] = useState<CourierReturnScanItem[]>([]);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk Upload Modal State
  const [showBulkUploadModal, setShowBulkUploadModal] = useState<boolean>(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState<boolean>(false);

  // Proof Upload Source Mode: 'FILE' | 'WEBCAM'
  const [proofSourceMode, setProofSourceMode] = useState<'FILE' | 'WEBCAM'>('FILE');

  // Webcam Capture Modal & Stream State
  const [showWebcamModal, setShowWebcamModal] = useState<boolean>(false);
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start Webcam Stream
  const startWebcam = async () => {
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
        audio: true
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsWebcamActive(true);
    } catch (err: any) {
      console.warn('Webcam audio+video failed, falling back to video only:', err);
      try {
        const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
          audio: false
        });
        streamRef.current = videoOnlyStream;
        if (videoRef.current) {
          videoRef.current.srcObject = videoOnlyStream;
          videoRef.current.play();
        }
        setIsWebcamActive(true);
      } catch (err2: any) {
        setWebcamError(err2.message || 'Could not access webcam camera. Please grant camera permission.');
      }
    }
  };

  // Stop Webcam Stream
  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsWebcamActive(false);
    setIsRecordingVideo(false);
    setRecordingSeconds(0);
  };

  // Open Webcam Modal
  const openWebcamModal = () => {
    setShowWebcamModal(true);
    setTimeout(() => {
      startWebcam();
    }, 150);
  };

  // Close Webcam Modal
  const closeWebcamModal = () => {
    stopWebcam();
    setShowWebcamModal(false);
  };

  // Clean up webcam on unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  // Take Snapshot Photo
  const handleTakeSnapshot = async () => {
    if (!videoRef.current || !streamRef.current) return;
    setUploadingMedia(true);
    setScanMessage(null);

    try {
      const videoEl = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 1280;
      canvas.height = videoEl.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setScanMessage({ type: 'error', text: 'Failed to capture webcam snapshot frame.' });
          setUploadingMedia(false);
          return;
        }

        const file = new File([blob], `webcam_snapshot_${Date.now()}.png`, { type: 'image/png' });
        try {
          const res: MediaUploadResponse = await courierReturnService.uploadMediaProof(file);
          setEvidenceFileUrl(res.publicUrl || res.url || '');
          setScanMessage({ type: 'success', text: 'Webcam snapshot photo saved & uploaded successfully!' });
          closeWebcamModal();
        } catch (err: any) {
          setScanMessage({ type: 'error', text: `Failed to upload webcam photo: ${err.message || 'Upload error'}` });
        } finally {
          setUploadingMedia(false);
        }
      }, 'image/png');
    } catch (err: any) {
      setScanMessage({ type: 'error', text: `Snapshot error: ${err.message}` });
      setUploadingMedia(false);
    }
  };

  // Start Video Recording
  const handleStartRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];
    try {
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

      const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const rawMime = mediaRecorder.mimeType || 'video/mp4';
        const cleanMime = rawMime.split(';')[0].trim();
        const ext = cleanMime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordedChunksRef.current, { type: cleanMime });
        const file = new File([blob], `webcam_video_${Date.now()}.${ext}`, { type: cleanMime });

        setUploadingMedia(true);
        try {
          const res: MediaUploadResponse = await courierReturnService.uploadMediaProof(file);
          setEvidenceFileUrl(res.publicUrl || res.url || '');
          setScanMessage({ type: 'success', text: 'Webcam video recorded & uploaded successfully!' });
          closeWebcamModal();
        } catch (err: any) {
          setScanMessage({ type: 'error', text: `Failed to upload recorded video: ${err.message || 'Upload error'}` });
        } finally {
          setUploadingMedia(false);
        }
      };

      mediaRecorder.start(300);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecordingVideo(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert(`Could not start video recorder: ${err.message}`);
    }
  };

  // Stop Video Recording & Trigger Upload
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecordingVideo(false);
  };

  // Load scan history from clean localStorage key
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      // Clear legacy storage keys if present
      localStorage.removeItem('lakee_rto_return_scan_history_v1');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setScanHistory(parsed);
          }
        } catch (e) {
          console.warn('Failed to parse saved RTO scan history:', e);
        }
      }
    }
    scanInputRef.current?.focus();
  }, []);

  // Helper to update state and save to localStorage
  const saveScanHistory = (newList: CourierReturnScanItem[]) => {
    setScanHistory(newList);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    }
  };

  // Handle Proof Media Upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    setScanMessage(null);
    try {
      const res: MediaUploadResponse = await courierReturnService.uploadMediaProof(file);
      setEvidenceFileUrl(res.publicUrl || res.url || '');
      setScanMessage({ type: 'success', text: `Proof media uploaded successfully!` });
    } catch (err: any) {
      setScanMessage({ type: 'error', text: `Failed to upload media proof: ${err.message || 'Server error'}` });
    } finally {
      setUploadingMedia(false);
    }
  };

  // Submit Inward Return Scan
  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setScanMessage({ type: 'error', text: 'Please enter or scan an AWB or Pack Reference Number.' });
      return;
    }

    setScanSubmitting(true);
    setScanMessage(null);

    const nowIso = new Date().toISOString();
    const scanItem: CourierReturnScanItem = {
      identifier: identifier.trim(),
      statusDate: nowIso,
      stockStatus: stockCondition,
      remarks: remarks.trim() || undefined,
      evidenceFileUrl: evidenceFileUrl.trim() || undefined
    };

    try {
      const response = await courierReturnService.scanReturn({
        type: identifierType,
        statusId: 13, // 13 = RETURNED
        items: [scanItem]
      });

      setScanMessage({
        type: 'success',
        text: `Successfully registered return in DB for ${identifier} (${stockCondition})`
      });

      // ONLY add to session log and clear form if backend API returned success
      const updated = [scanItem, ...scanHistory];
      saveScanHistory(updated);

      setIdentifier('');
      setRemarks('');
      setEvidenceFileUrl('');
      setStockCondition('AVAILABLE');
      scanInputRef.current?.focus();
    } catch (err: any) {
      console.error('Scan submission error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to register return in database.';
      setScanMessage({
        type: 'error',
        text: `API Error: ${errMsg}`
      });
      // Do NOT add to scanHistory if API call failed
    } finally {
      setScanSubmitting(false);
    }
  };

  // Clear Saved Log
  const handleResetLog = () => {
    if (confirm('Are you sure you want to clear session scan history?')) {
      saveScanHistory([]);
    }
  };

  // Bulk Upload Spreadsheet Submit
  const handleBulkUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) return;

    setBulkUploading(true);
    try {
      await courierReturnService.uploadReturnSheet(bulkFile, identifierType);
      alert('Bulk RTO return intake sheet uploaded successfully!');
      setShowBulkUploadModal(false);
      setBulkFile(null);
    } catch (err: any) {
      alert(`Bulk upload error: ${err.response?.data?.message || err.message || 'Failed to process file'}`);
    } finally {
      setBulkUploading(false);
    }
  };

  const totalScannedCount = scanHistory.length;
  const intactCount = scanHistory.filter((s) => s.stockStatus === 'AVAILABLE').length;
  const damagedCount = scanHistory.filter((s) => s.stockStatus !== 'AVAILABLE').length;

  return (
    <div className="w-full space-y-4">
      {/* SUMMARY CONTROL BAR (MATCHING /admin/stock/reports/current-status) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs shrink-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-slate-200 dark:border-slate-800">
            <Package size={16} className="text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Return Intake Overview
            </h3>
          </div>

          {/* Stats 1: Total Scans */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Package size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Total Session Scans:</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {totalScannedCount} <span className="text-[11px] font-normal text-slate-400">scanned</span>
            </span>
          </div>

          <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block shrink-0" />

          {/* Stats 2: Intact */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Intact (Restocked):</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {intactCount} items
            </span>
          </div>

          <div className="h-3.5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block shrink-0" />

          {/* Stats 3: Damaged / Quarantined */}
          <div className="flex items-center gap-1.5 shrink-0">
            <AlertOctagon size={14} className="text-rose-600 dark:text-rose-400" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Damaged / Quarantined:</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {damagedCount} items
            </span>
          </div>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <QrCode className="h-4 w-4 text-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Inward Return Form</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowBulkUploadModal(true)}
              className="h-8 px-3 flex items-center gap-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-white shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Bulk Sheet Upload</span>
            </button>
          </div>

          {scanMessage && (
            <div
              className={`p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-semibold ${
                scanMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800'
              }`}
            >
              {scanMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{scanMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleScanSubmit} className="space-y-4">
            {/* Identifier Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Identifier Type
              </label>
              <select
                value={identifierType}
                onChange={(e) => setIdentifierType(e.target.value as BarcodeIdentifierType)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="AWB">Courier AWB Number</option>
                <option value="PACK_REF_NO">Pack Reference No (PCK-...)</option>
                <option value="EXECUTION_ID">Order Execution ID</option>
              </select>
            </div>

            {/* Identifier Scan Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Scan Barcode / Enter {identifierType} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={scanInputRef}
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Scan package barcode or type AWB..."
                  className="w-full rounded-xl border-2 border-indigo-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:outline-none dark:border-indigo-900 dark:bg-slate-800 dark:text-white"
                />
                <QrCode className="h-4 w-4 text-indigo-400 absolute right-3 top-3" />
              </div>
            </div>

            {/* Stock Condition */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Quality & Stock Condition <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setStockCondition('AVAILABLE')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                    stockCondition === 'AVAILABLE'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  INTACT (OK)
                </button>
                <button
                  type="button"
                  onClick={() => setStockCondition('DAMAGED')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                    stockCondition === 'DAMAGED'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  DAMAGED
                </button>
                <button
                  type="button"
                  onClick={() => setStockCondition('DEFECTIVE')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                    stockCondition === 'DEFECTIVE'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                  }`}
                >
                  DEFECTIVE
                </button>
              </div>
            </div>

            {/* Media Proof Upload (Available for ALL conditions including INTACT) */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-amber-500" />
                  <span>Media Proof / Attachment (Photo / Video)</span>
                </label>
                {uploadingMedia ? (
                  <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                    <Loader2 className="h-3 w-3 animate-spin" /> Uploading media...
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {stockCondition === 'AVAILABLE' ? 'Optional' : 'Proof Required'}
                  </span>
                )}
              </div>

              {/* Proof Option Selector Tabs */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/70 dark:bg-slate-900/70 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setProofSourceMode('FILE')}
                  className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    proofSourceMode === 'FILE'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Upload className="h-3 w-3" />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProofSourceMode('WEBCAM')}
                  className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    proofSourceMode === 'WEBCAM'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Video className="h-3 w-3" />
                  <span>Live Webcam</span>
                </button>
              </div>

              {/* Option 1: File Upload */}
              {proofSourceMode === 'FILE' && (
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-white hover:file:bg-amber-600 cursor-pointer"
                />
              )}

              {/* Option 2: Live Webcam Button */}
              {proofSourceMode === 'WEBCAM' && (
                <button
                  type="button"
                  onClick={openWebcamModal}
                  className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>Open Webcam (Photo / Video)</span>
                </button>
              )}

              {/* Uploaded Proof Badge & Link */}
              {evidenceFileUrl && (
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 truncate">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <a href={evidenceFileUrl} target="_blank" rel="noreferrer" className="underline truncate font-mono text-[11px]">
                      {evidenceFileUrl}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEvidenceFileUrl('')}
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 shrink-0 cursor-pointer"
                    title="Remove proof URL"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Remarks / Inspection Notes
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Package intact or crushed outer carton..."
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-medium focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={scanSubmitting}
              className="w-full h-10 bg-amber-500 hover:bg-amber-600 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {scanSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  <span>Register Return Inward</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Scan Stream History */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Session Scan Log</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                {scanHistory.length} Scanned
              </span>
              {scanHistory.length > 0 && (
                <button
                  onClick={handleResetLog}
                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  title="Clear session scan history"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {scanHistory.length === 0 ? (
            <div className="flex-1 min-h-[280px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 space-y-2">
              <QrCode className="h-10 w-10 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No return packages scanned yet.</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Scan package barcode using the form on the left.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider dark:bg-slate-800/80 dark:border-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Identifier</th>
                    <th className="p-3">Stock Condition</th>
                    <th className="p-3">Proof Media</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {scanHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                        {isMounted ? formatTime(item.statusDate) : '10:30:00 AM'}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{item.identifier}</td>
                      <td className="p-3">
                        {item.stockStatus === 'AVAILABLE' && (
                          <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full inline-flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Intact (Restocked)
                          </span>
                        )}
                        {item.stockStatus === 'DAMAGED' && (
                          <span className="px-2.5 py-1 text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded-full inline-flex items-center gap-1">
                            <AlertOctagon className="h-3 w-3" /> Damaged (Quarantined)
                          </span>
                        )}
                        {item.stockStatus === 'DEFECTIVE' && (
                          <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full inline-flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Defective
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {item.evidenceFileUrl ? (
                          <a
                            href={item.evidenceFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> View Proof
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300 max-w-[180px] truncate">
                        {item.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* BULK UPLOAD RETURN SHEET MODAL */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-amber-500" />
                Bulk RTO Inward Upload
              </h3>
              <button onClick={() => setShowBulkUploadModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleBulkUploadSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Upload an Excel (`.xlsx`) or `.csv` file containing AWB numbers, status dates, stock conditions (AVAILABLE/DAMAGED), and proof media links.
              </p>

              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 rounded-xl text-center space-y-2 hover:border-amber-500 transition-colors">
                <UploadCloud className="h-8 w-8 text-amber-500 mx-auto" />
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  required
                  onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-white hover:file:bg-amber-600 cursor-pointer"
                />
                {bulkFile && <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2">{bulkFile.name}</p>}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkUploadModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkUploading || !bulkFile}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                >
                  {bulkUploading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Process Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE WEBCAM CAPTURE MODAL */}
      {showWebcamModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="h-4 w-4 text-rose-600" />
                Live Webcam Proof Capture
              </h3>
              <button onClick={closeWebcamModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {webcamError ? (
              <div className="p-4 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl space-y-2 text-xs">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" /> Camera Access Failed
                </p>
                <p>{webcamError}</p>
                <button
                  type="button"
                  onClick={startWebcam}
                  className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 cursor-pointer"
                >
                  Retry Camera Permission
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[260px]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                  />

                  {/* Live Recording Badge */}
                  {isRecordingVideo && (
                    <div className="absolute top-3 left-3 bg-rose-600/90 text-white px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-2 animate-pulse shadow-md">
                      <Circle className="h-2.5 w-2.5 fill-white" />
                      REC {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                    </div>
                  )}

                  {!isWebcamActive && !webcamError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-900">
                      <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
                      <span className="text-xs font-semibold">Initializing camera stream...</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Photo Snapshot Button */}
                  <button
                    type="button"
                    disabled={!isWebcamActive || isRecordingVideo || uploadingMedia}
                    onClick={handleTakeSnapshot}
                    className="py-2.5 px-4 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                  >
                    <Camera className="h-4 w-4 text-rose-500" />
                    <span>Take Snapshot</span>
                  </button>

                  {/* Video Record / Stop Button */}
                  {!isRecordingVideo ? (
                    <button
                      type="button"
                      disabled={!isWebcamActive || uploadingMedia}
                      onClick={handleStartRecording}
                      className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                    >
                      <Video className="h-4 w-4" />
                      <span>Record Video</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 animate-pulse transition-all cursor-pointer shadow-xs"
                    >
                      <Square className="h-4 w-4 fill-white" />
                      <span>Stop & Upload Video</span>
                    </button>
                  )}
                </div>

                {uploadingMedia && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                    Uploading captured media proof to server...
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={closeWebcamModal}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
