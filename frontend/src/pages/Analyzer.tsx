import React, { useState, useRef, useEffect, useCallback, ChangeEvent, DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { 
  Upload, 
  ArrowLeft, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw,
  Scan,
  Key
} from 'lucide-react';
import { AnalysisData } from '../types/forensics';
import { ApiService } from '../services/apiService';

// Smooth numerical count-up component from 0 to target value
const AnimatedCounter: React.FC<{ value: number; duration?: number; suffix?: string }> = React.memo(({
  value,
  duration = 1100,
  suffix = '%'
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (startTimestamp === null) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(easeOut * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      }
    };

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{displayValue}{suffix}</span>;
});

export const Analyzer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [results, setResults] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyIssue, setApiKeyIssue] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isImageEnlarged, setIsImageEnlarged] = useState<boolean>(false);
  const [barsLoaded, setBarsLoaded] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Trigger progress bar filling animation when results become available
  useEffect(() => {
    if (results) {
      setBarsLoaded(false);
      const timer = setTimeout(() => setBarsLoaded(true), 60);
      return () => clearTimeout(timer);
    }
  }, [results]);

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];

  const handleFileUpload = async (selectedFile: File) => {
    if (!ALLOWED_TYPES.includes(selectedFile.type.toLowerCase())) {
      setError(`Unsupported format (${selectedFile.type || 'unknown'}). Please upload a JPEG, PNG, WebP, or TIFF image.`);
      return;
    }

    setError(null);
    setApiKeyIssue(null);
    setFile(selectedFile);
    setResults(null);

    // Revoke previous blob URL to prevent memory leak (BUG-10)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    setIsLoading(true);

    try {
      const uploadRes = await ApiService.uploadImage(selectedFile);
      if (!uploadRes.success || !uploadRes.imageId) {
        throw new Error(uploadRes.error || 'Upload failed');
      }

      const detectRes = await ApiService.detectImage(
        uploadRes.imageId, 
        'deep_scan', 
        85
      );

      if (!detectRes.success) {
        throw new Error(detectRes.error || 'Detection failed');
      }

      const overallScore = Math.round((detectRes.forensicSignals?.score || 0) * 100);
      
      const mappedData: AnalysisData = {
        id: detectRes.taskId || `FSC-${Date.now().toString(36).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        filename: uploadRes.filename || selectedFile.name,
        filesize: uploadRes.filesize || 'Unknown',
        mimetype: selectedFile.type,
        verdict: detectRes.isAi ? 'Synthetic / Manipulated' : 'Likely Authentic',
        overallProbability: overallScore,
        confidenceGrade: overallScore > 75 ? 'High Confidence' : overallScore > 50 ? 'Moderate Suspicion' : 'Verified Authentic',
        explanation: detectRes.explanation?.gemini || '',
        modules: [
          {
            id: 'gemini',
            name: 'Gemini Multi-Modal Vision Forensics',
            score: Math.round(detectRes.confidence || 0),
            status: detectRes.isAi ? 'Synthetic Artifacts Flagged' : 'Organic Sensor Match',
            description: detectRes.explanation?.gemini || 'Analyzes neural image semantics.'
          },
          {
            id: 'ela',
            name: 'Error Level Analysis (ELA)',
            score: Math.round((detectRes.forensicSignals?.ela?.aiLikelihood || 0) * 100),
            status: (detectRes.forensicSignals?.ela?.aiLikelihood || 0) > 0.5 ? 'Anomaly Detected' : 'Normal Compression',
            description: 'Evaluates error rate disparities between resaved compression passes.'
          },
          {
            id: 'c2pa',
            name: 'Metadata & C2PA Provenance',
            score: Math.round((detectRes.forensicSignals?.synthId?.c2pa?.aiLikelihood || 0) * 100),
            status: detectRes.synthIdStatus || 'UNKNOWN',
            description: 'Validates cryptographic Content Credentials (C2PA).'
          },
          {
            id: 'freq',
            name: 'Frequency & Noise Spectral Analysis',
            score: Math.round((detectRes.forensicSignals?.frequency?.aiLikelihood || 0) * 100),
            status: (detectRes.forensicSignals?.frequency?.aiLikelihood || 0) > 0.5 ? 'Spectral Peaks Detected' : 'Natural Spectral Decay',
            description: 'Fourier transform inspection checking for GAN upsampling artifacts.'
          },
          {
            id: 'noise',
            name: 'Local Noise Consistency',
            score: Math.round((detectRes.forensicSignals?.noise?.aiLikelihood || 0) * 100),
            status: (detectRes.forensicSignals?.noise?.aiLikelihood || 0) > 0.5 ? 'Inconsistent Noise Variance' : 'Uniform Noise Profile',
            description: 'Assesses ISO sensor noise distribution across adjacent image patches.'
          }
        ],
        metadataSummary: {
          c2paStatus: detectRes.forensicSignals?.synthId?.c2pa?.evidence?.status || 'UNKNOWN',
          tamperAssessment: detectRes.forensicSignals?.metadata?.evidence?.status || 'UNKNOWN',
          colorProfile: 'sRGB IEC61966-2.1',
          quantizationTable: 'Standard Quantization Matrix'
        }
      };

      setResults(mappedData);
    } catch (err: any) {
      console.error('Forensic analysis request failed:', err);
      const keyRelatedCodes = ['GEMINI_KEY_MISSING', 'GEMINI_KEY_INVALID', 'GEMINI_QUOTA_EXCEEDED', 'GEMINI_RATE_LIMITED', 'GEMINI_SERVICE_UNAVAILABLE'];
      if (err.code && keyRelatedCodes.includes(err.code)) {
        setApiKeyIssue(err.code);
      } else {
        setError(err.message || 'An error occurred while connecting to the forensics engine.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleTriggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const resetAnalysis = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
    setApiKeyIssue(null);
    setBarsLoaded(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  // Cleanup blob URL on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="bg-[#090A0E] min-h-screen flex flex-col items-center pt-10 sm:pt-16 pb-20 px-4 sm:px-6 md:px-8 text-gray-100 selection:bg-orange-600 selection:text-white">
      {/* Top Navigation Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white bg-[#151824] border border-white/10 px-4 py-2 rounded-full shadow-xl hover:border-white/20 transition-all duration-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Overview</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-gray-400">Forensic Engine v1.0.0 Active</span>
        </div>
      </div>

      {/* Main Dashboard Container */}
      <main className="w-full max-w-5xl">
        {/* Header Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            AI Image Forensics & Deepfake Analyzer
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-2 max-w-xl mx-auto">
            Upload any image to execute multi-domain frequency analysis, ELA compression inspection, and C2PA provenance extraction.
          </p>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/tiff"
          className="hidden"
          onChange={handleInputChange}
        />

        {/* ========================================================================= */}
        {/* 1. UPLOAD ZONE (WHEN NO RESULTS YET & NOT LOADING)                         */}
        {/* ========================================================================= */}
        {!results && !isLoading && (
          <div className="space-y-6">
            <div
              onClick={handleTriggerFileInput}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full bg-[#11141E] rounded-3xl p-10 sm:p-14 border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center shadow-xl ${
                isDragOver
                  ? 'border-orange-500 bg-orange-950/30 scale-[1.01]'
                  : 'border-white/15 hover:border-orange-500/60 hover:bg-[#151826]'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-5 shadow-inner">
                <Upload className="w-8 h-8" />
              </div>

              <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                Drop your image here, or <span className="text-orange-400 hover:underline">browse files</span>
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mb-4">
                Supports JPG, PNG, WEBP up to 25MB. Images are analyzed in-memory and not stored.
              </p>

              <button
                type="button"
                className="mt-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 px-6 py-3 rounded-full transition-all duration-300 hover:shadow-[0_0_15px_rgba(249,115,22,0.3),0_0_25px_rgba(234,88,12,0.15)] hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(234,88,12,0.4)]"
              >
                Select Image from Device
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. LOADING STATE — FULL-WIDTH FORENSIC SCANNER                              */}
        {/* ========================================================================= */}
        {isLoading && (
          <div className="w-full space-y-6">
            {/* Main Scanner Panel */}
            <div className="w-full bg-[#11141E] rounded-3xl p-5 sm:p-8 border border-orange-500/30 shadow-2xl shadow-orange-500/5">
              {/* Scanner Header Bar */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider">
                    Forensic Scan In Progress
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 rounded-full border-[3px] border-orange-900 border-t-orange-500 animate-spin animate-ring-glow" />
                </div>
              </div>

              {/* Image Scanner Container */}
              {previewUrl && (
                <div className="relative w-full aspect-video max-h-[420px] rounded-2xl overflow-hidden border-2 border-orange-500/40 bg-black select-none">
                  {/* The uploaded image */}
                  <img
                    src={previewUrl}
                    alt="Scanning target"
                    className="w-full h-full object-contain opacity-80"
                  />

                  {/* Holographic orange tint overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-transparent to-orange-500/15 pointer-events-none" />

                  {/* Sweeping horizontal laser line */}
                  <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_20px_4px_rgba(249,115,22,0.6),0_0_60px_8px_rgba(249,115,22,0.2)] animate-scan-laser pointer-events-none" />

                  {/* Blueprint grid overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(249,115,22,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(249,115,22,0.08)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none animate-grid-shimmer" />

                  {/* Corner scanner brackets — top-left */}
                  <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-orange-400 pointer-events-none animate-bracket-pulse" />
                  {/* Corner scanner brackets — top-right */}
                  <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-orange-400 pointer-events-none animate-bracket-pulse" style={{ animationDelay: '0.5s' }} />
                  {/* Corner scanner brackets — bottom-left */}
                  <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-orange-400 pointer-events-none animate-bracket-pulse" style={{ animationDelay: '1s' }} />
                  {/* Corner scanner brackets — bottom-right */}
                  <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-orange-400 pointer-events-none animate-bracket-pulse" style={{ animationDelay: '1.5s' }} />

                  {/* Center target reticle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-10 h-10 rounded-full border border-orange-400/40" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-400/80 animate-ping" />
                    {/* Crosshair lines */}
                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-orange-400/20" />
                    <div className="absolute top-0 left-1/2 h-full w-[1px] bg-orange-400/20" />
                  </div>

                  {/* Bottom status bar overlay */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-3 px-4 pointer-events-none">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                        <span className="text-[10px] font-mono font-bold text-orange-300 uppercase tracking-widest">
                          Analyzing Pixel Matrix
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">
                        {file?.name || 'target.img'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Scanning status text */}
              <div className="mt-5 text-center">
                <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                  Executing Multi-Model Forensic Passes...
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. ERROR MESSAGE                                                          */}
        {/* ========================================================================= */}
        {apiKeyIssue && (
          <div className="mt-6 p-5 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center gap-4 text-amber-200">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold tracking-tight text-amber-400 mb-0.5">Analysis Service Unavailable</h4>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                {apiKeyIssue === 'GEMINI_KEY_MISSING' && "The analysis service isn't configured yet (no API key set). This is a setup issue on our end, not your image."}
                {apiKeyIssue === 'GEMINI_KEY_INVALID' && "The analysis service's API key was rejected. Please contact the site owner."}
                {apiKeyIssue === 'GEMINI_QUOTA_EXCEEDED' && "The analysis service has used up its available quota for now. Please try again later."}
                {apiKeyIssue === 'GEMINI_RATE_LIMITED' && "Too many scans right now — please wait a moment and try again."}
                {apiKeyIssue === 'GEMINI_SERVICE_UNAVAILABLE' && "The AI model is currently experiencing unusually high demand. Spikes in demand are temporary. Please try again shortly."}
              </p>
            </div>
            <button
              onClick={() => { setApiKeyIssue(null); if (file) handleFileUpload(file); }}
              className="mt-3 sm:mt-0 whitespace-nowrap bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-4 py-2 rounded-xl text-xs font-semibold transition-colors border border-amber-500/20"
            >
              Try Again
            </button>
          </div>
        )}

        {error && !apiKeyIssue && (
          <div className="mt-6 p-4 rounded-2xl bg-red-950/40 border border-red-500/40 flex items-start gap-3 text-red-200">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">Analysis Failed</h4>
              <p className="text-xs text-red-300 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-400 hover:text-red-300 underline font-medium"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. RESULTS DISPLAY                                                        */}
        {/* ========================================================================= */}
        {results && !isLoading && (
          <div className="space-y-6">
            {/* Top Overview Card */}
            <div className="bg-[#11141E] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
              {/* Full-width image display */}
              {previewUrl && (
                <div 
                  className="relative w-full max-h-[380px] rounded-2xl overflow-hidden border-2 border-orange-500/40 mb-6 bg-black cursor-zoom-in group select-none"
                  onClick={() => setIsImageEnlarged(true)}
                  title="Click to view full image"
                >
                  <img
                    src={previewUrl}
                    alt="Analyzed target"
                    className="w-full h-full max-h-[376px] object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                  />

                  {/* Holographic tint overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-orange-500/10 pointer-events-none" />

                  {/* Scanning laser line */}
                  <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_12px_#FF7700] animate-scan-vertical pointer-events-none" />

                  {/* Blueprint grid */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#FF770010_1px,transparent_1px),linear-gradient(to_bottom,#FF770010_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40" />

                  {/* Corner brackets */}
                  <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-orange-400/70 pointer-events-none" />
                  <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-orange-400/70 pointer-events-none" />
                  <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-orange-400/70 pointer-events-none" />
                  <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-orange-400/70 pointer-events-none" />

                  {/* Status chip */}
                  <div className="absolute bottom-2.5 inset-x-0 flex justify-center pointer-events-none">
                    <span className="text-[9px] font-mono font-bold text-orange-300 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded-md border border-orange-500/30 tracking-wider uppercase">
                      Scan Complete — Click to Enlarge
                    </span>
                  </div>
                </div>
              )}

              {/* File info + verdict row */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {results.filename}
                  </h2>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                        results.overallProbability > 50
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {results.overallProbability > 50 ? (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5" />
                      )}
                      <span>{results.verdict}</span>
                    </span>

                    <span className="text-xs text-gray-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full font-mono font-medium">
                      {results.confidenceGrade}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                  <button
                    onClick={resetAnalysis}
                    className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2.5 rounded-full transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Analyze Another</span>
                  </button>
                </div>
              </div>

              {/* AI Probability Progress Gauge with animated count-up and fill */}
              <div className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <Scan className="w-3.5 h-3.5 text-orange-400" />
                    Probability of AI Generation
                  </span>
                  <span
                    className={`text-2xl font-mono font-extrabold ${
                      results.overallProbability > 50 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    <AnimatedCounter value={results.overallProbability} duration={1200} suffix="%" />
                  </span>
                </div>

                {/* Progress Bar Container with smooth width animation */}
                <div className="w-full bg-[#0D0F16] h-4 rounded-full overflow-hidden p-0.5 border border-white/10">
                  <div
                    className={`h-full rounded-full ${
                      results.overallProbability > 65
                        ? 'bg-gradient-to-r from-amber-500 to-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                        : results.overallProbability > 35
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                        : 'bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                    }`}
                    style={{ 
                      width: `${barsLoaded ? Math.max(results.overallProbability, 4) : 0}%`,
                      transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  />
                </div>

                <div className="flex justify-between text-[11px] font-mono text-gray-400 mt-2">
                  <span>0% Authentic Sensor</span>
                  <span>50% Threshold</span>
                  <span>100% Fully Synthetic</span>
                </div>
              </div>
            </div>

            {/* AI Explanation & Summary */}
            {results.explanation && (
              <div className="bg-[#11141E] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
                <div className="flex items-center gap-2 mb-4 text-white font-bold text-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                  Gemini Vision Analysis
                </div>
                <p className="text-sm text-gray-300 leading-relaxed bg-[#0D0F16] p-4 sm:p-6 rounded-2xl border border-white/5 shadow-inner">
                  {results.explanation}
                </p>
              </div>
            )}

            {/* Forensic Module Scores Breakdown with Animated Count-up and dynamic progress fill */}
            <div className="bg-[#11141E] rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Forensic Module Diagnostic Breakdown
                  </h3>
                  <p className="text-xs text-gray-400">
                    Independent algorithmic test scores from specialized anomaly detectors.
                  </p>
                </div>
                <span className="text-xs font-mono text-gray-400 hidden sm:block">
                  {results.modules.length} passes
                </span>
              </div>

              <div className="space-y-4">
                {results.modules.map((mod) => (
                  <div
                    key={mod.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#0D0F16] border border-white/5 hover:border-white/15 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            mod.score > 50 ? 'bg-red-400' : 'bg-emerald-400'
                          }`}
                        />
                        <h4 className="text-sm font-bold text-white">{mod.name}</h4>
                        <span
                          className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                            mod.score > 50
                              ? 'bg-red-500/15 text-red-400 border-red-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {mod.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">Anomaly Risk:</span>
                        <span
                          className={`text-xs font-mono font-bold ${
                            mod.score > 50 ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          <AnimatedCounter value={mod.score} duration={1100} suffix="%" />
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 mb-4">{mod.description}</p>

                    {/* Small metric progress bar with 0-to-target width animation */}
                    <div className="w-full bg-[#181B26] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          mod.score > 50 ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                        style={{ 
                          width: `${barsLoaded ? Math.max(mod.score, 2) : 0}%`,
                          transition: 'width 1.1s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Full-Screen Image Modal */}
      {isImageEnlarged && previewUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out"
          onClick={() => setIsImageEnlarged(false)}
        >
          <div className="relative max-w-full max-h-full">
            <img 
              src={previewUrl} 
              alt="Enlarged target" 
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-white/10"
            />
            {/* Enlarged Modal Scan Laser Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-transparent to-orange-500/15 pointer-events-none rounded-xl" />
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_15px_#FF7700] animate-scan-vertical pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
};
