import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, FileText, File as FileIcon, Image as ImageIcon, Video, Play, Pause, Volume2, VolumeX, Settings, Maximize, RotateCcw, RotateCw, MoreVertical, Star, FolderOutput, Info, Music } from 'lucide-react';
import { DriveItem, FileType, useDrive } from '../contexts/DriveContext';
import { cn } from '../lib/utils';

interface MediaViewerProps {
  item: DriveItem | null;
  onClose: () => void;
}

export function MediaViewer({ item, onClose }: MediaViewerProps) {
  const { toggleStarred, setMovingItem, viewItemInfo, downloadItem } = useDrive();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (item && item.type === 'video' && videoRef.current) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(e => {
        if (e instanceof DOMException && e.name === 'AbortError') {
          // ignore abort error caused by unmounting
          return;
        }
        if (e instanceof Error && e.message && e.message.includes("removed from the document")) {
          return;
        }
        console.warn("Auto-play prevented:", e instanceof Error ? e.message : "Unknown error");
        setIsPlaying(false);
      });
    }
  }, [item]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item) downloadItem(item);
  };

  const skip = (amount: number, type: 'video' | 'audio') => {
    const ref = type === 'video' ? videoRef.current : audioRef.current;
    if (ref) {
      ref.currentTime += amount;
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(e => {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          if (e instanceof Error && e.message && e.message.includes("removed from the document")) return;
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const changePlaybackRate = (rate: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
    }
  };

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      await playerContainerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const isViewable = (type: FileType) => {
    return ['image', 'video', 'audio'].includes(type);
  };

  const show = item && isViewable(item.type);
  const tId = item?.id;
  
  // Get session from localStorage for authenticated downloads
  const sessionString = typeof window !== 'undefined' ? localStorage.getItem('tgSession') : null;
  const mediaSrc = tId ? `/api/tg/download/${tId}?inline=true${sessionString ? `&session=${encodeURIComponent(sessionString)}` : ''}` : "";

  const renderVideoPlayer = () => {
    if (!item) return null;
    return (
      <div 
        ref={playerContainerRef}
        className="w-full h-full bg-black flex flex-col group select-none relative overflow-hidden"
        onClick={() => setShowSpeedMenu(false) || setShowSettingsMenu(false)}
      >
        {/* Top Bar Overlay */}
        <div className={cn("absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/80 to-transparent z-50 flex items-start justify-between px-6 pt-6 transition-opacity duration-300", showSettingsMenu ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="text-white font-medium truncate max-w-[200px] sm:max-w-md">{item.name}</span>
          </div>
          
          <div className="flex items-center gap-2 relative">
            <button onClick={handleDownload} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors" title="Download">
              <Download className="w-5 h-5" />
            </button>
            
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(!showSettingsMenu); setShowSpeedMenu(false); }}
                className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              
              <AnimatePresence>
                {showSettingsMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-12 w-48 bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl py-1 z-50"
                  >
                    <button onClick={(e) => { handleDownload(e); setShowSettingsMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3">
                      <Download className="w-4 h-4" /> Download
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleStarred(item.id); setShowSettingsMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3">
                      <Star className="w-4 h-4" /> {item.starred ? 'Remove from starred' : 'Add to starred'}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setMovingItem(item); setShowSettingsMenu(false); onClose(); }} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3">
                      <FolderOutput className="w-4 h-4" /> Move
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); viewItemInfo(item); setShowSettingsMenu(false); onClose(); }} className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 flex items-center gap-3">
                      <Info className="w-4 h-4" /> Details
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Video Element */}
        <div className="flex-1 w-full h-full flex items-center justify-center relative cursor-pointer overflow-hidden" onClick={togglePlay}>
          <video 
            ref={videoRef}
            src={mediaSrc}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            muted={true}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={(e) => {
              console.error("Video loading error:", (e.target as HTMLVideoElement).error);
              // Handle error visually if needed
            }}
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Bottom Control Bar */}
        <div className={cn("absolute bottom-0 left-0 right-0 px-6 pb-6 pt-16 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-50 transition-opacity duration-300 flex flex-col gap-3", showSpeedMenu ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
          
          {/* Progress Bar */}
          <div className="w-full flex items-center group/slider relative h-5" onClick={(e) => e.stopPropagation()}>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute w-full opacity-0 z-20 cursor-pointer h-full"
            />
            <div className="h-1.5 w-full bg-white/30 tracking-tight rounded-full overflow-hidden relative z-10 pointer-events-none group-hover/slider:h-2 transition-all">
              <div 
                className="absolute top-0 left-0 h-full bg-primary"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            {/* Left Controls */}
            <div className="flex items-center gap-4">
              <button onClick={togglePlay} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors">
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); skip(-10, 'video'); }}
                className="p-2 hover:bg-white/20 flex flex-col items-center justify-center rounded-full text-white transition-colors"
                title="Rewind 10s"
              >
                 <div className="relative flex items-center justify-center">
                    <RotateCcw className="w-5 h-5" />
                    <span className="absolute text-[8px] font-bold mt-0.5">10</span>
                 </div>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); skip(10, 'video'); }} 
                className="p-2 hover:bg-white/20 flex flex-col items-center justify-center rounded-full text-white transition-colors"
                title="Forward 10s"
              >
                 <div className="relative flex items-center justify-center">
                    <RotateCw className="w-5 h-5" />
                    <span className="absolute text-[8px] font-bold mt-0.5">10</span>
                 </div>
              </button>

              <span className="text-white text-sm font-medium tabular-nums ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3 relative">
              <div className="relative flex items-center group/volume" onClick={(e) => e.stopPropagation()}>
                <button onClick={toggleMute} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors z-10 relative">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300 ease-in-out flex items-center h-full">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    defaultValue="1"
                    onChange={(e) => {
                      if (videoRef.current) {
                        videoRef.current.volume = Number(e.target.value);
                        if (Number(e.target.value) === 0) {
                          setIsMuted(true);
                          videoRef.current.muted = true;
                        } else {
                          setIsMuted(false);
                          videoRef.current.muted = false;
                        }
                      }
                    }}
                    className="w-20 ml-2 h-1.5 bg-white/30 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                  />
                </div>
              </div>

              <div className="relative">
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); setShowSettingsMenu(false); }}
                  className="p-2 hover:bg-white/20 rounded-xl text-white text-sm font-bold transition-colors min-w-[40px]"
                >
                  {playbackRate}x
                </button>
                
                <AnimatePresence>
                  {showSpeedMenu && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute bottom-12 right-0 bg-slate-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl py-2 flex flex-col z-50 mb-2 min-w-[100px]"
                    >
                      {[1, 1.2, 1.5, 2].map(rate => (
                        <button 
                          key={rate}
                          onClick={(e) => changePlaybackRate(rate, e)}
                          className={cn(
                            "px-4 py-2 text-sm text-left hover:bg-white/10",
                            playbackRate === rate ? "text-primary font-bold bg-white/5" : "text-white"
                          )}
                        >
                          {rate}x
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button onClick={toggleFullscreen} className="p-2 hover:bg-white/20 rounded-full text-white transition-colors">
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (item?.type === 'video') {
    return (
      <AnimatePresence>
        {show && item && (
          <motion.div
            key="media-viewer-video"
            className="fixed inset-0 z-[200]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
             {renderVideoPlayer()}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {show && item && (
        <motion.div
          key="media-viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8 bg-slate-950/95 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="relative max-w-5xl w-full max-h-[90vh] bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl flex flex-col border border-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Actions */}
            <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
              <button
                onClick={handleDownload}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all active:scale-90 border border-white/10"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all active:scale-90 border border-white/10"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex items-center justify-center overflow-auto bg-black/60 relative custom-scrollbar">
              {item.type === 'image' && (
                <img 
                  src={mediaSrc} 
                  alt={item.name}
                  className="max-w-full max-h-full object-contain select-none"
                />
              )}

              {item.type === 'audio' && (
                <div className="flex flex-col items-center gap-10 p-12 w-full max-w-2xl">
                  <div className="w-48 h-48 rounded-[40px] bg-gradient-to-br from-primary/30 to-blue-600/30 flex items-center justify-center shadow-2xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/10 animate-pulse" />
                    <FileIcon className="w-24 h-24 text-white relative z-10" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-3xl font-black text-white mb-3 tracking-tight">{item.name}</h2>
                    <p className="text-slate-400 font-medium">Audio Capture • {item.size}</p>
                  </div>
                  <div className="relative w-full flex flex-col gap-6">
                    <audio 
                      ref={audioRef}
                      controls 
                      autoPlay
                      className="w-full invert brightness-200"
                      src={mediaSrc}
                    />
                    <div className="flex justify-center gap-6">
                      <button onClick={(e) => { e.stopPropagation(); skip(-10, 'audio'); }} className="bg-white/10 hover:bg-white/20 text-white rounded-full px-8 py-3 text-sm font-black backdrop-blur transition-all active:scale-95 border border-white/10">
                        <span className="opacity-50 mr-2">«</span> 10s
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); skip(10, 'audio'); }} className="bg-white/10 hover:bg-white/20 text-white rounded-full px-8 py-3 text-sm font-black backdrop-blur transition-all active:scale-95 border border-white/10">
                        10s <span className="opacity-50 ml-2">»</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Meta */}
            <div className="px-8 py-6 bg-slate-800/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl border border-white/5">
                  {item.type === 'image' ? <ImageIcon className="w-6 h-6 text-blue-400" /> : 
                   item.type === 'audio' ? <Music className="w-6 h-6 text-purple-400" /> : 
                   <FileText className="w-6 h-6 text-emerald-400" />}
                </div>
                <div>
                  <p className="text-white font-bold text-lg truncate max-w-[200px] sm:max-w-md">{item.name}</p>
                  <p className="text-sm text-slate-400 font-medium">Synced {item.modified} • {item.size}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

