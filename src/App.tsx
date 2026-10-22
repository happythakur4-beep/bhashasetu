/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  AppViewMode,
  ChannelNumber,
  ConversationMessage,
  LanguageCode,
  MeshNode,
} from './types';
import { HeaderBar } from './components/HeaderBar';
import { BottomNavigation } from './components/BottomNavigation';
import { WalkieTalkieView } from './components/WalkieTalkieView';
import { DualTranslatorView } from './components/DualTranslatorView';
import { PhrasebookView } from './components/PhrasebookView';
import { ConversationHistoryView } from './components/ConversationHistoryView';
import { LanguagePackManagerModal } from './components/LanguagePackManagerModal';
import { WordLearningModal } from './components/WordLearningModal';
import { audioEngine } from './services/audioEngine';
import { translatorService } from './services/translatorService';
import { meshNetwork } from './services/meshNetwork';
import { ThemeProvider, useTheme } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { isDark } = useTheme();
  const [currentMode, setCurrentMode] = useState<AppViewMode>('walkie_talkie');
  const [currentChannel, setCurrentChannel] = useState<ChannelNumber>(3); // Channel 3: Public Intercom
  const [sourceLang, setSourceLang] = useState<LanguageCode>('hi');
  const [targetLang, setTargetLang] = useState<LanguageCode>('mjl'); // Mandali / Mandyali Pahadi default
  const [isMuted, setIsMuted] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasGeminiKey, setHasGeminiKey] = useState(true);
  const [showLanguagePacks, setShowLanguagePacks] = useState(false);
  const [showWordLearning, setShowWordLearning] = useState(false);
  const [wordLearningInitial, setWordLearningInitial] = useState<{ word?: string; translation?: string }>({});

  // Conversation history initialized clean without fake seed bloat
  const [messages, setMessages] = useState<ConversationMessage[]>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('bhashasetu_messages') : null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return [];
  });

  // Check network & server status on mount
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    translatorService.checkServerHealth().then((hasKey) => {
      setHasGeminiKey(hasKey);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('bhashasetu_messages', JSON.stringify(messages.slice(0, 50)));
      } catch {
        // ignore
      }
    }
  }, [messages]);

  // Handle new message from PTT, Dual Translator, or Mesh Packet
  const handleNewMessage = (msg: ConversationMessage) => {
    setMessages((prev) => [msg, ...prev]);
  };

  // Change Channel
  const handleSelectChannel = (ch: ChannelNumber) => {
    audioEngine.triggerHaptic(40);
    audioEngine.playSquelchStatic(90);
    setCurrentChannel(ch);
    meshNetwork.setChannel(ch);
  };

  // Swap Source and Target Languages
  const handleSwapLanguages = () => {
    audioEngine.triggerHaptic(35);
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  // When user clicks "Hail Unit" from Radar
  const handleSelectPeerToTalk = (peer: MeshNode) => {
    setTargetLang(peer.activeLanguage);
    if (peer.channel !== currentChannel) {
      handleSelectChannel(peer.channel);
    }
    setCurrentMode('walkie_talkie');
  };

  return (
    <div
      className={
        isDark
          ? 'flex flex-col h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none antialiased relative'
          : 'flex flex-col h-screen w-full bg-[#f4f6fb] text-slate-800 overflow-hidden font-sans select-none antialiased relative'
      }
    >
      {/* Top Header Bar with Theme Toggle */}
      <HeaderBar
        currentChannel={currentChannel}
        onSelectChannel={handleSelectChannel}
        isOnline={isOnline}
        hasGeminiKey={hasGeminiKey}
        isMuted={isMuted}
        onToggleMute={() => {
          audioEngine.triggerHaptic(30);
          setIsMuted(!isMuted);
          if (!isMuted) audioEngine.stopSpeaking();
        }}
        onOpenSettings={() => setShowLanguagePacks(true)}
        onOpenWordLearning={() => {
          setWordLearningInitial({});
          setShowWordLearning(true);
        }}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {currentMode === 'walkie_talkie' && (
          <WalkieTalkieView
            currentChannel={currentChannel}
            onSelectChannel={handleSelectChannel}
            sourceLang={sourceLang}
            targetLang={targetLang}
            onChangeSourceLang={setSourceLang}
            onChangeTargetLang={setTargetLang}
            onSwapLanguages={handleSwapLanguages}
            onNewMessage={handleNewMessage}
            isMuted={isMuted}
            onOpenPackManager={() => setShowLanguagePacks(true)}
            onOpenWordLearning={(word, translation) => {
              setWordLearningInitial({ word, translation });
              setShowWordLearning(true);
            }}
          />
        )}

        {currentMode === 'dual_translator' && (
          <DualTranslatorView
            sourceLang={sourceLang}
            targetLang={targetLang}
            onChangeSourceLang={setSourceLang}
            onChangeTargetLang={setTargetLang}
            onNewMessage={handleNewMessage}
            isMuted={isMuted}
            onOpenPackManager={() => setShowLanguagePacks(true)}
            onOpenWordLearning={(word, translation) => {
              setWordLearningInitial({ word, translation });
              setShowWordLearning(true);
            }}
          />
        )}

        {currentMode === 'phrasebook' && (
          <PhrasebookView
            currentChannel={currentChannel}
            activeLanguage={sourceLang}
            onNewMessage={handleNewMessage}
            isMuted={isMuted}
            onOpenPackManager={() => setShowLanguagePacks(true)}
          />
        )}

        {currentMode === 'history' && (
          <ConversationHistoryView
            messages={messages}
            onClearHistory={() => setMessages([])}
            onToggleStar={(id) => {
              setMessages((prev) =>
                prev.map((m) => (m.id === id ? { ...m, isStarred: !m.isStarred } : m))
              );
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        unreadCount={0}
      />

      {/* Language Pack Manager (Offline TTS & Dialect Speech) Modal */}
      <LanguagePackManagerModal
        isOpen={showLanguagePacks}
        onClose={() => setShowLanguagePacks(false)}
      />

      {/* Interactive Voice Learning Modal */}
      <WordLearningModal
        isOpen={showWordLearning}
        onClose={() => setShowWordLearning(false)}
        initialSourceWord={wordLearningInitial.word}
        initialTranslation={wordLearningInitial.translation}
        sourceLang={sourceLang}
        targetLang={targetLang}
      />
    </div>
  );
}
