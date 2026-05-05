import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Smartphone, Key, X, Loader2 } from 'lucide-react';
import { useDrive } from '../contexts/DriveContext';
import { cn } from '../lib/utils';

export function TelegramLoginModal() {
  const { tgAuthStep, setTgAuthStep, sendTgCode, signInTg } = useDrive();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (tgAuthStep === 'none') return null;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await sendTgCode(phone);
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signInTg(code);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setTgAuthStep('none')}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-white/10"
      >
        <button 
          onClick={() => setTgAuthStep('none')}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
            <Send className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {tgAuthStep === 'phone' ? 'Connect Telegram' : 'Enter One-Time Password'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            {tgAuthStep === 'phone' 
              ? 'Enter your phone number to use your Telegram "Saved Messages" as cloud storage.' 
              : `We've sent a code to the Telegram account for ${phone}.`
            }
          </p>

          <form onSubmit={tgAuthStep === 'phone' ? handleSendCode : handleSignIn} className="space-y-4">
            {tgAuthStep === 'phone' ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Smartphone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="tel"
                  placeholder="+8801XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all outline-none"
                  required
                />
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Enter 5-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white transition-all outline-none text-center tracking-[0.5em] font-mono text-xl"
                  maxLength={5}
                  required
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                tgAuthStep === 'phone' ? 'Send Code' : 'Confirm Login'
              )}
            </button>
          </form>

          <p className="mt-8 text-xs text-center text-slate-400">
            By connecting, you agree to store files in your Telegram Saved Messages.
            Your login is handled securely via Telegram MTProto.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
