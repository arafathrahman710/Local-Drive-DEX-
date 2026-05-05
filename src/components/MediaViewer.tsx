import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, FileText, File as FileIcon } from 'lucide-react';
import { DriveItem, FileType } from '../contexts/DriveContext';

interface MediaViewerProps {
  item: DriveItem | null;
  onClose: () => void;
}

export function MediaViewer({ item, onClose }: MediaViewerProps) {
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!item) return;
    const link = document.createElement('a');
    link.href = '#'; 
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isViewable = (type: FileType) => {
    return ['image', 'video', 'audio'].includes(type);
  };

  const show = item && isViewable(item.type);

  return (
    <AnimatePresence>
      {show && item && (
        <motion.div
          key="media-viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8 bg-slate-950/90 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative max-w-5xl w-full max-h-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Actions */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all active:scale-95 border border-white/10"
                title="Download"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all active:scale-95 border border-white/10"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex items-center justify-center min-h-[300px] sm:min-h-[500px] bg-black/40">
              {item.type === 'image' && (
                <img 
                  src={item.imageUrl || `https://picsum.photos/seed/${item.id}/1200/800`} 
                  alt={item.name}
                  className="max-w-full max-h-[70vh] sm:max-h-[80vh] object-contain select-none"
                />
              )}

              {item.type === 'video' && (
                <div className="w-full aspect-video flex items-center justify-center">
                  <video 
                    controls 
                    autoPlay
                    className="max-w-full max-h-[80vh]"
                    src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
                  />
                </div>
              )}

              {item.type === 'audio' && (
                <div className="flex flex-col items-center gap-8 p-12 w-full">
                  <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-3xl bg-gradient-to-br from-primary/40 to-blue-600/40 flex items-center justify-center shadow-lg border border-white/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/20 animate-pulse" />
                    <FileIcon className="w-16 h-16 sm:w-24 sm:h-24 text-white relative z-10" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{item.name}</h2>
                    <p className="text-slate-400">Audio Recording • {item.size}</p>
                  </div>
                  <audio 
                    controls 
                    autoPlay
                    className="w-full max-w-md invert brightness-200"
                    src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
                  />
                </div>
              )}
            </div>

            {/* Footer Meta */}
            <div className="px-6 py-4 bg-slate-800/50 backdrop-blur-sm border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg">
                  {item.type === 'image' ? <ImageIcon className="w-5 h-5 text-blue-400" /> : 
                   item.type === 'video' ? <Video className="w-5 h-5 text-purple-400" /> : 
                   <FileText className="w-5 h-5 text-emerald-400" />}
                </div>
                <div>
                  <p className="text-white font-medium truncate max-w-[200px] sm:max-w-md">{item.name}</p>
                  <p className="text-xs text-slate-400">Modified {item.modified} • {item.size}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Helper icons that were missing
function ImageIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
      <circle cx="9" cy="9" r="2"/>
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
    </svg>
  );
}

function Video({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m22 8-6 4 6 4V8Z"/>
      <rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
    </svg>
  );
}
