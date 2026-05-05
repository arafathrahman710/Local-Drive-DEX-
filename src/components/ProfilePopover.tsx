import React, { useRef, useEffect } from 'react';
import { UserPlus, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useDrive } from '../contexts/DriveContext';

interface ProfilePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export function ProfilePopover({ isOpen, onClose, onOpenSettings }: ProfilePopoverProps) {
  const { settings } = useDrive();
  const popoverRef = useRef<HTMLDivElement>(null);
  const isMaterial3 = settings.uiTheme === 'Material 3';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        if (!target.closest('#profile-menu-button')) {
          onClose();
        }
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          ref={popoverRef}
          initial={isMaterial3 ? { opacity: 0, scale: 0.8, y: -20, originY: 0 } : { opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={isMaterial3 ? { opacity: 0, scale: 0.8, y: -20, originY: 0 } : { opacity: 0, scale: 0.95, y: -10 }}
          transition={isMaterial3 ? { type: "spring", stiffness: 400, damping: 28 } : { duration: 0.2 }}
          className={cn(
            "relative w-[340px] bg-white border border-slate-200 shadow-2xl overflow-hidden",
            isMaterial3 
              ? "dark:bg-[#1C1B1F] rounded-[40px] p-2 shadow-[0_24px_54px_rgba(0,0,0,0.2)] dark:border-white/10" 
              : "dark:bg-slate-900 rounded-2xl dark:border-white/10"
          )}
        >
          <div className={cn("p-8 flex flex-col items-center text-center", !isMaterial3 && "p-6 pb-2")}>
            <div className="relative mb-6">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNrVMv0RJTMndQl2MRAQBrEv37Yd74iBH4Z6297ifcGqVHRzwnEAuRaxXVakQJmKzHQLc84cwyZl_PH7vtsVcAZk1GhjVtX2xcs3_ZXe16nb0S71zYh4vczuGq_OmB8-JqqImhwfNH4yKUSrPxhJK6qFHQrWq2IhiTz0VcIgP4uWABaPDMq-1lAPKKgcXl2UIqnBYu1hdXeVH8boIHdZLD4u8TA6VvMlMuKvnNc9RP1aJxFLd7hyUCIl3P7CiuOzLSdv69pN1rnRkS" 
                alt="Alex Morgan" 
                className={cn(
                  "w-24 h-24 rounded-full border-4 border-slate-50 dark:border-white/10 shadow-md object-cover transition-transform duration-300",
                  isMaterial3 ? "m3-bounce hover:scale-105" : "hover:scale-102"
                )}
              />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Alex Morgan</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">alex.morgan@localdrive.app</p>
            
            <button className={cn(
              "w-full py-4 px-6 font-bold text-sm transition-all active:scale-95 shadow-sm",
              isMaterial3 
                ? "bg-primary-container text-on-primary-container rounded-full font-black hover:opacity-90" 
                : "bg-primary text-white rounded-xl hover:bg-primary/90"
            )}>
              Manage local account
            </button>
          </div>
          
          <div className="h-px w-[calc(100%-48px)] mx-auto bg-slate-100 dark:bg-white/5 my-2"></div>
          
          <div className="p-2 space-y-1">
            <button 
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-200 font-bold text-sm active:scale-95",
                isMaterial3 ? "rounded-[28px]" : "rounded-xl"
              )}
            >
              <SettingsIcon className="w-5 h-5 opacity-60" />
              Drive Settings
            </button>
            <button className={cn(
              "w-full flex items-center gap-4 px-5 py-4 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-200 font-bold text-sm active:scale-95",
              isMaterial3 ? "rounded-[28px]" : "rounded-xl"
            )}>
              <UserPlus className="w-5 h-5 opacity-60" />
              Add hardware profile
            </button>
            <button className={cn(
              "w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all text-red-600 dark:text-red-400 font-bold text-sm active:scale-95",
              isMaterial3 ? "rounded-[28px] font-black" : "rounded-xl"
            )}>
              <LogOut className="w-5 h-5 opacity-60" />
              Sign out session
            </button>
          </div>
          
          <div className="h-px w-full bg-slate-100 dark:bg-white/5"></div>
          
          <div className="p-4 flex justify-center gap-4 text-xs font-medium text-slate-400 dark:text-slate-500">
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Terms of Service</a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
