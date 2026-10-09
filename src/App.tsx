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
import { MeshRadarView } from './components/MeshRadarView';
import { PhrasebookView } from './components/PhrasebookView';
import { ConversationHistoryView } from './components/ConversationHistoryView';
import { DialectExplainerModal } from './components/DialectExplainerModal';
import { LanguagePackManagerModal } from './components/LanguagePackManagerModal';
import { NeoGlassBackground } from './components/NeoGlassBackground';
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
  const [showDialectGuide, setShowDialectGuide] = useState(false);
  const [showLanguagePacks, setShowLanguagePacks] = useState(false);

  // Conversation history with initial seed
  const [messages, setMessages] = useState<ConversationMessage[]>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('bhashasetu_messages') : null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }

    // Seed realistic interstate conversation
    return [
      {
        id: 'seed_1',
        sender: 'peer',
        senderName: 'HP-Mandi-Relief (Himachal)',
        senderState: 'Himachal Pradesh',
        sourceLang: 'mjl',
        targetLang: 'hi',
        originalText: 'तुसां जो नमस्कार! कुथु जांदे? मां जो रस्ता दस्सा।',
        translatedText: 'आपको नमस्कार! कहाँ जा रहे हैं? मुझे रास्ता बताइए।',
        phoneticText: 'Tusan jo namaskar! Kuthu jaande? Maan jo rasta dassa.',
        timestamp: Date.now() - 1000 * 60 * 8,
        isOffline: true,
        engine: 'rule-morphology',
        channel: 3,
        isStarred: true,
      },
      {
        id: 'seed_2',
        sender: 'peer',
        senderName: 'OD-Coastal-Unit (Odisha)',
        senderState: 'Odisha',
        sourceLang: 'or',
        targetLang: 'en',
        originalText: 'ନମସ୍କାର! ନିକଟତମ ବସ ଷ୍ଟାଣ୍ଡ କିମ୍ବା ରେଳ ଷ୍ଟେସନ କେତେ ଦୂର?',
        translatedText: 'Greetings! How far is the nearest bus stand or railway station?',
        phoneticText: 'Namaskara! Nikatatama bus stand kimba railway station kete doora?',
        timestamp: Date.now() - 1000 * 60 * 3,
        isOffline: true,
        engine: 'offline-lexicon',
        channel: 3,
      },
    ];
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
      {/* Light Mode Neo-Apple Organic Glass Background */}
      {!isDark && <NeoGlassBackground />}

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
        onOpenRadar={() => setCurrentMode('mesh_radar')}
        onOpenSettings={() => setShowLanguagePacks(true)}
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
            onOpenDialectGuide={() => setShowDialectGuide(true)}
            onOpenPackManager={() => setShowLanguagePacks(true)}
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
          />
        )}

        {currentMode === 'mesh_radar' && (
          <MeshRadarView
            currentChannel={currentChannel}
            onSelectChannel={handleSelectChannel}
            onSelectPeerToTalk={handleSelectPeerToTalk}
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

      {/* Dialect Linguistic Guide Modal */}
      <DialectExplainerModal
        isOpen={showDialectGuide}
        onClose={() => setShowDialectGuide(false)}
      />

      {/* Language Pack Manager (Offline TTS & Dialect Speech) Modal */}
      <LanguagePackManagerModal
        isOpen={showLanguagePacks}
        onClose={() => setShowLanguagePacks(false)}
      />
    </div>
  );
}
