import React, { useState, useRef, useEffect } from 'react';
import { X, Pencil, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDrive } from '../contexts/DriveContext';
import { cn } from '../lib/utils';

interface ManageAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageAccountModal({ isOpen, onClose }: ManageAccountModalProps) {
  const { tgUser, settings } = useDrive();
  const isMaterial3 = settings.uiTheme === 'Material 3';
  const [customPhoto, setCustomPhoto] = useState<string | null>(localStorage.getItem("customProfilePic"));
  const [nickname, setNickname] = useState<string>(localStorage.getItem("customNickname") || "Local User");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        localStorage.setItem("customProfilePic", base64String);
        setCustomPhoto(base64String);
        // Dispatch custom event to sync with ProfilePopover
        window.dispatchEvent(new Event('profilePicUpdated'));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveNickname = () => {
    localStorage.setItem("customNickname", nickname);
    // Dispatch custom event to sync if needed
    window.dispatchEvent(new Event('nicknameUpdated'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={cn(
          "relative w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl overflow-hidden",
          isMaterial3 ? "rounded-[32px] dark:bg-[#1C1B1F]" : "rounded-2xl"
        )}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors z-10"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>

        <div className="p-8 flex flex-col items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-8">Manage Account</h2>
          
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full border-4 border-slate-50 dark:border-white/10 shadow-md overflow-hidden bg-slate-100 dark:bg-white/5 flex items-center justify-center">
              {customPhoto ? (
                <img src={customPhoto} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-slate-400" />
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handlePhotoChange} 
            />
          </div>

          <div className="w-full space-y-6">
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-1">Display Name</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {tgUser ? `${tgUser.firstName} ${tgUser.lastName || ''}` : "Local User"}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Nickname</label>
              {tgUser ? (
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                  <p className="text-slate-900 dark:text-white font-medium">{tgUser.firstName}</p>
                  <p className="text-[10px] text-slate-400 mt-1">(synced from Telegram)</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="flex-1 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button 
                    onClick={handleSaveNickname}
                    className="px-6 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="mt-10 w-full py-4 text-slate-500 dark:text-slate-400 font-bold hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
