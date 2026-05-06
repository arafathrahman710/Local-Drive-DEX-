/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ProfilePopover } from './components/ProfilePopover';
import { SettingsModal } from './components/SettingsModal';
import { GlobalModals } from './components/GlobalModals';
import { PageType } from './types';
import { Home, MyDrive, Computers, Shared, Recent, Starred, Spam, Trash, System, About, Customization } from './pages';
import { useDrive } from './contexts/DriveContext';
import { MediaViewer } from './components/MediaViewer';
import { MoveToModal } from './components/MoveToModal';
import { TelegramLoginModal } from './components/TelegramLoginModal';

export default function App() {
  const { currentPage, setCurrentPage, currentFolderId, mediaItem, viewMedia, movingItem, setMovingItem, settings } = useDrive();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Helper to set font variables on :root
    const setFont = (fontFamily: string, fontStyle: string = 'normal') => {
      document.documentElement.style.setProperty('--font-sans', fontFamily);
      document.documentElement.style.setProperty('--font-body', fontFamily);
      document.body.style.fontStyle = fontStyle;
    };

    if (settings.font === 'Default') {
      setFont('"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif');
    } else if (settings.font === 'Italic') {
      setFont('"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif', 'italic');
    } else {
      // Inject link if new font
      const linkId = 'dynamic-font-link';
      let link = document.getElementById(linkId) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }

      const fontConfig: Record<string, { url: string, family: string }> = {
        'Playwrite DE SAS': { 
          url: 'https://fonts.googleapis.com/css2?family=Playwrite+DE+SAS:wght@100..400&display=swap',
          family: '"Playwrite DE SAS", cursive'
        },
        'Felipa': {
          url: 'https://fonts.googleapis.com/css2?family=Felipa&display=swap',
          family: '"Felipa", serif'
        },
        'Nabla': {
          url: 'https://fonts.googleapis.com/css2?family=Nabla&display=swap',
          family: '"Nabla", system-ui'
        },
        'Kablammo': {
          url: 'https://fonts.googleapis.com/css2?family=Kablammo&display=swap',
          family: '"Kablammo", system-ui'
        },
        'Matemasie': {
          url: 'https://fonts.googleapis.com/css2?family=Matemasie&display=swap',
          family: '"Matemasie", sans-serif'
        },
        'Bitcount Prop Double Ink': {
          url: 'https://fonts.googleapis.com/css2?family=Bitcount+Prop+Double+Ink:wght@100..900&display=swap',
          family: '"Bitcount Prop Double Ink", system-ui'
        },
        'Rubik Puddles': {
          url: 'https://fonts.googleapis.com/css2?family=Rubik+Puddles&display=swap',
          family: '"Rubik Puddles", system-ui'
        },
        'Bungee Outline': {
          url: 'https://fonts.googleapis.com/css2?family=Bungee+Outline&display=swap',
          family: '"Bungee Outline", sans-serif'
        },
        'Shadows Into Light': {
          url: 'https://fonts.googleapis.com/css2?family=Shadows+Into+Light&display=swap',
          family: '"Shadows Into Light", cursive'
        },
        'Rubik Burned': {
          url: 'https://fonts.googleapis.com/css2?family=Rubik+Burned&display=swap',
          family: '"Rubik Burned", system-ui'
        },
        'Turret Road': {
          url: 'https://fonts.googleapis.com/css2?family=Turret+Road:wght@200;300;400;500;700;800&display=swap',
          family: '"Turret Road", sans-serif'
        },
        'Hanalei': {
          url: 'https://fonts.googleapis.com/css2?family=Hanalei&display=swap',
          family: '"Hanalei", system-ui'
        },
        'Nosifer': {
          url: 'https://fonts.googleapis.com/css2?family=Nosifer&display=swap',
          family: '"Nosifer", sans-serif'
        },
        'Limelight': {
          url: 'https://fonts.googleapis.com/css2?family=Limelight&display=swap',
          family: '"Limelight", sans-serif'
        }
      };

      const config = fontConfig[settings.font];
      
      if (config) {
        link.href = config.url;
        setFont(config.family);
      } else {
        const formattedFont = settings.font.replace(/\s+/g, '+');
        link.href = `https://fonts.googleapis.com/css2?family=${formattedFont}:wght@400;500;600&display=swap`;
        setFont(`"${settings.font}", sans-serif`);
      }
    }

    // Handle background color and luminance
    document.body.style.transition = 'background 0.5s ease, background-color 0.5s ease, color 0.5s ease';
    
    if (settings.backgroundColor) {
      // Calculate luminance
      const hex = settings.backgroundColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;

      const aC = [r, g, b].map((c) => {
        if (c <= 0.03928) {
          return c / 12.92;
        }
        return Math.pow((c + 0.055) / 1.055, 2.4);
      });
      const luminance = 0.2126 * aC[0] + 0.7152 * aC[1] + 0.0722 * aC[2];
      
      const isLight = luminance > 0.5;
      
      // Apply background only to a specific container or as a variable
      document.documentElement.style.setProperty('--custom-bg', settings.backgroundColor);
      document.body.style.background = `radial-gradient(circle at top right, ${settings.backgroundColor}55, transparent 60%), radial-gradient(circle at bottom left, ${settings.backgroundColor}44, transparent 50%), ${settings.backgroundColor}`;
      document.body.style.backgroundColor = settings.backgroundColor;
      document.body.setAttribute('data-custom-bg', isLight ? 'light' : 'dark');
    } else {
      document.documentElement.style.removeProperty('--custom-bg');
      document.body.style.background = '';
      document.body.style.backgroundColor = '';
      document.body.removeAttribute('data-custom-bg');
    }

    // Apply UI Theme
    document.body.setAttribute('data-ui-theme', settings.uiTheme || 'Standard');
  }, [settings.font, settings.backgroundColor, settings.uiTheme]);

  // Close sidebar on mobile when page changes
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [currentPage, currentFolderId]);

  // Handle mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close profile popover when clicking anywhere else
  const handleMainClick = () => {
    if (isProfileOpen) {
      setIsProfileOpen(false);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'my-drive':
        return <MyDrive />;
      case 'computers':
        return <Computers />;
      case 'shared':
        return <Shared />;
      case 'recent':
        return <Recent />;
      case 'starred':
        return <Starred />;
      case 'spam':
        return <Spam />;
      case 'trash':
        return <Trash />;
      case 'system':
        return <System />;
      case 'about':
        return <About />;
      case 'customization':
        return <Customization />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="flex h-screen bg-transparent overflow-hidden transition-all duration-500 ease-in-out" onClick={handleMainClick}>
      {/* Sidebar Overlay for Mobile */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-[100] transition-transform duration-300 lg:translate-x-0 ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}>
        <Sidebar currentPage={currentPage} onChangePage={setCurrentPage} />
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-500 pt-[72px] ${!isMobile ? 'pl-[280px]' : 'pl-0'} relative z-10`} style={{ backgroundColor: settings.backgroundColor ? 'transparent' : 'var(--main-bg, transparent)' }}>
        <Header 
          onToggleProfile={() => setIsProfileOpen(!isProfileOpen)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          profileOpen={isProfileOpen}
        />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto relative custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentPage}-${currentFolderId || 'root'}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="min-h-full"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
      <GlobalModals />
      
      {/* Media Viewer */}
      <MediaViewer 
        item={mediaItem} 
        onClose={() => viewMedia(null)} 
      />

      {/* Move Modal */}
      <MoveToModal 
        item={movingItem} 
        onClose={() => setMovingItem(null)} 
      />
      <TelegramLoginModal />
    </div>
  );
}
