import React from 'react';
import { FolderSync as FolderShared, Image as ImageIcon, Lock, ArrowLeft } from 'lucide-react';
import { useDrive } from '../contexts/DriveContext';

export function Home() {
  const { goBack } = useDrive();
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-8 pt-4">
        <button 
          onClick={goBack}
          className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 transition-all active:scale-95"
          title="Go back"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <h1 className="text-2xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100">Welcome back</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20 sm:pb-0">
        <div className="col-span-1 md:col-span-2 bg-white border border-slate-200 shadow-sm dark:bg-slate-900/40 dark:backdrop-blur-[40px] dark:border-white/5 hover:-translate-y-1 hover:shadow-md rounded-2xl p-6 h-52 sm:h-64 flex flex-col justify-end relative overflow-hidden transition-all duration-300 group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent z-0"></div>
          <div className="relative z-10 transform group-hover:-translate-y-1 transition-transform">
            <h3 className="text-xl sm:text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-1 sm:mb-2">Project Alpha Files</h3>
            <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-400">Last edited 2 hours ago</p>
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 shadow-sm dark:bg-slate-900/40 dark:backdrop-blur-[40px] dark:border-white/5 hover:-translate-y-1 hover:shadow-md rounded-2xl p-6 h-64 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer">
          <FolderShared className="w-12 h-12 text-primary mb-4" fill="currentColor" />
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Design Assets</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Shared with 4 people</p>
        </div>
        
        <div className="bg-white border border-slate-200 shadow-sm dark:bg-slate-900/40 dark:backdrop-blur-[40px] dark:border-white/5 hover:-translate-y-1 hover:shadow-md rounded-2xl p-6 h-64 flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer">
          <ImageIcon className="w-12 h-12 text-tertiary dark:text-blue-500 mb-4" fill="currentColor" />
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Q3 Campaign</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">1.2 GB</p>
        </div>
        
        <div className="col-span-1 md:col-span-2 bg-white border border-slate-200 shadow-sm dark:bg-slate-900/40 dark:backdrop-blur-[40px] dark:border-white/5 hover:-translate-y-1 hover:shadow-md rounded-2xl p-6 h-64 flex flex-col justify-end relative overflow-hidden transition-all duration-300 group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-tr from-secondary-container dark:from-blue-500/10 to-surface dark:to-transparent z-0 opacity-50"></div>
          <div className="relative z-10 flex justify-between items-end">
            <div className="transform group-hover:-translate-y-1 transition-transform">
              <h3 className="text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Financial Reports 2023</h3>
              <p className="text-lg text-slate-600 dark:text-slate-400">Confidential</p>
            </div>
            <Lock className="text-secondary dark:text-slate-400 w-10 h-10 mb-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
