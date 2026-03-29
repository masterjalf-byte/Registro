/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AttendanceForm } from './components/AttendanceForm';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { ShieldAlert, LogOut } from 'lucide-react';
import { auth, signOut, onAuthStateChanged } from './firebase';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [view, setView] = useState<'form' | 'login' | 'dashboard'>('form');
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customization, setCustomization] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadCustomization = () => {
      const settings = JSON.parse(localStorage.getItem('customization_settings') || '{}');
      setCustomization(settings);
      
      if (settings.primaryColor) {
        document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
      } else {
        document.documentElement.style.removeProperty('--color-primary');
      }
      
      if (settings.fontFamily) {
        document.documentElement.style.setProperty('--font-primary', settings.fontFamily);
      } else {
        document.documentElement.style.removeProperty('--font-primary');
      }
    };
    
    loadCustomization();
    
    // Listen for changes from AdminDashboard
    window.addEventListener('storage', loadCustomization);
    // Custom event for same-window updates
    window.addEventListener('customization_updated', loadCustomization);
    
    return () => {
      window.removeEventListener('storage', loadCustomization);
      window.removeEventListener('customization_updated', loadCustomization);
    };
  }, []);

  const handleSignOut = async () => {
    if (isAdmin) {
      setIsAdmin(false);
      setView('form');
      return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[var(--color-primary)] py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative transition-colors duration-300"
      style={{ fontFamily: 'var(--font-primary)' }}
    >
      <div className="absolute top-4 left-4 z-10">
        <AnimatePresence>
          {(user || isAdmin) && view === 'dashboard' && (
            <motion.div 
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
              className="flex items-center gap-2 bg-blue-900/40 p-1.5 rounded-lg border border-blue-400/20 shadow-lg backdrop-blur-md"
            >
              <div className="w-7 h-7 rounded-full bg-blue-800 flex items-center justify-center border border-blue-400/50">
                <span className="text-white text-xs font-bold">{isAdmin ? 'A' : user.email?.charAt(0).toUpperCase()}</span>
              </div>
              <span className="text-blue-100 text-[10px] font-bold hidden sm:inline px-1">{isAdmin ? 'Administrador' : user.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center px-2 py-1.5 bg-red-500/90 text-white rounded-md text-[10px] font-bold uppercase shadow-[0_2px_0_#7f1d1d] hover:translate-y-[1px] hover:scale-105 hover:shadow-[0_1px_0_#7f1d1d] active:translate-y-[2px] active:scale-95 active:shadow-none transition-all duration-200 ml-1"
              >
                <LogOut className="w-3 h-3 mr-1" />
                SALIR
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {view === 'form' && (
        <>
          <button
            onClick={() => setView(isAdmin || user ? 'dashboard' : 'login')}
            className="absolute top-4 right-4 flex items-center px-2 py-1 bg-blue-800/80 text-blue-200 rounded-md text-[10px] font-bold uppercase shadow-[0_2px_0_#1e3a8a] hover:translate-y-[1px] hover:scale-105 hover:shadow-[0_1px_0_#1e3a8a] active:translate-y-[2px] active:scale-95 active:shadow-none transition-all duration-200 z-10 backdrop-blur-sm"
          >
            <ShieldAlert className="w-3 h-3 mr-1" />
            ADMIN
          </button>
          <AttendanceForm user={user} />
        </>
      )}
      {view === 'login' && (
        <AdminLogin 
          onLogin={() => {
            setIsAdmin(true);
            setView('dashboard');
          }} 
          onCancel={() => setView('form')} 
        />
      )}
      {view === 'dashboard' && (
        <AdminDashboard 
          onLogout={() => setView('form')} 
          user={isAdmin ? { email: 'admin@local', displayName: 'Admin', uid: 'admin-local' } : user}
        />
      )}
    </div>
  );
}
