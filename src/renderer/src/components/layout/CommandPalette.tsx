import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FolderOpen, Zap, Type, RefreshCw, HardDrive, ShieldCheck, History, Layers } from 'lucide-react';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus input when opened
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  const navigationCommands = [
    { label: 'Dashboard', path: '/', icon: <FolderOpen className="w-4 h-4 text-indigo-500" /> },
    { label: 'Organizer', path: '/organizer', icon: <FolderOpen className="w-4 h-4 text-blue-500" /> },
    { label: 'Automation', path: '/automation', icon: <Zap className="w-4 h-4 text-yellow-500" /> },
    { label: 'Renamer', path: '/renamer', icon: <Type className="w-4 h-4 text-violet-500" /> },
    { label: 'Converter', path: '/converter', icon: <RefreshCw className="w-4 h-4 text-emerald-500" /> },
    { label: 'Advanced Search', path: '/searcher', icon: <Search className="w-4 h-4 text-amber-500" /> },
    { label: 'Storage Analytics', path: '/analytics', icon: <HardDrive className="w-4 h-4 text-teal-500" /> },
    { label: 'MP4 Analyzer', path: '/mp4-analyzer', icon: <ShieldCheck className="w-4 h-4 text-rose-500" /> },
    { label: 'Duplicates', path: '/duplicates', icon: <Layers className="w-4 h-4 text-cyan-500" /> },
    { label: 'History', path: '/history', icon: <History className="w-4 h-4 text-slate-500" /> },
  ];

  useEffect(() => {
    if (!query) {
      setResults(navigationCommands);
      return;
    }

    const lowerQ = query.toLowerCase();
    
    // 1. Filter commands
    const filteredNav = navigationCommands.filter(cmd => 
      cmd.label.toLowerCase().includes(lowerQ)
    );

    // 2. We can also search files async if the query is long enough
    // For now, just show commands. Later we'll integrate window.fileflow.indexer.search
    
    setResults(filteredNav);
  }, [query]);

  const handleSelect = (item: any) => {
    if (item.path) {
      navigate(item.path);
    }
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Palette */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-200"
          >
            <div className="flex items-center px-4 py-3 border-b">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-gray-400"
                placeholder="Type a command or search..."
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <div className="flex gap-1 text-xs text-gray-400 font-mono">
                <span className="px-1.5 py-0.5 rounded bg-gray-100 border">ESC</span>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No results found for "{query}"</div>
              ) : (
                <div className="space-y-1">
                  {results.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center px-4 py-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      {result.icon && <div className="mr-3">{result.icon}</div>}
                      <span className="font-medium text-gray-800">{result.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
