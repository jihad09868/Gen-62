import { Injectable, signal, computed, inject, effect, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Message {
  id: string; 
  role: 'system' | 'user' | 'assistant';
  content: string; 
  
  // Versioning
  versions: string[]; 
  currentVersion: number;

  // UI states
  isTyping?: boolean; 
  displayedContent?: string;
  liked?: boolean;
  disliked?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  pinned?: boolean; 
}

declare const window: any;

@Injectable({
  providedIn: 'root'
})
export class OllamaService {
  private http = inject(HttpClient);

  // -- Configuration State --
  private baseUrl = signal<string>('');
  private currentModel = signal<string>('llama3'); 
  
  // -- Auth State --
  isLoggedIn = signal<boolean>(false);
  username = signal<string>('User');

  // -- Session State --
  sessions = signal<ChatSession[]>([]);
  currentSessionId = signal<string | null>(null);
  
  // -- UI Modal States --
  isSearchOpen = signal(false);
  isGensOpen = signal(false);
  isSettingsOpen = signal(false);
  
  // -- Audio Player State --
  isAudioVisible = signal(false); 
  isAudioPlaying = signal(false); 
  audioPaused = signal(true); 
  
  audioSeconds = signal(0);
  audioTotalSeconds = signal(0); 
  
  private currentAudioFullText = ''; 
  private currentAudioCharIndex = 0; 
  
  private audioUtterance: SpeechSynthesisUtterance | null = null;
  private audioInterval: any;

  // -- Theme State --
  // Default Light Mode
  isDarkMode = signal(false);

  // -- Generation State --
  isGenerating = signal<boolean>(false);
  
  private abortController: AbortController | null = null;
  
  hasConfiguredUrl = computed(() => !!this.baseUrl());
  
  // Computed sorted sessions (Pinned first, then date)
  sortedSessions = computed(() => {
    return [...this.sessions()].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.createdAt - a.createdAt;
    });
  });
  
  currentSession = computed(() => {
    const id = this.currentSessionId();
    if (!id) return null;
    return this.sessions().find(s => s.id === id) || null;
  });

  isNewChat = computed(() => this.currentSessionId() === null);

  constructor() {
    this.loadFromStorage();
    
    // Light/Dark Mode Logic
    effect(() => {
      const root = document.documentElement;
      if (this.isDarkMode()) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    });

    effect(() => {
        this.saveToStorage();
    });
  }

  // -- Modal Toggles --
  toggleSearch() { this.isSearchOpen.update(v => !v); }
  toggleGens() { this.isGensOpen.update(v => !v); }
  toggleSettings() { this.isSettingsOpen.update(v => !v); }
  toggleTheme() { this.isDarkMode.update(v => !v); }

  // -- Auth Logic --
  loginUser(name: string) {
    this.username.set(name);
    this.isLoggedIn.set(true);
    this.saveToStorage();
  }

  configureUrl(url: string) {
    const cleanUrl = url.replace(/\/$/, '');
    this.baseUrl.set(cleanUrl);
    this.saveToStorage();
    this.fetchModels();
  }

  async checkConnection(url: string): Promise<boolean> {
    const cleanUrl = url.replace(/\/$/, '');
    try {
      await firstValueFrom(this.http.get(`${cleanUrl}/api/tags`));
      return true;
    } catch (e) {
      return false;
    }
  }

  resetConfig() {
    this.baseUrl.set('');
    this.isLoggedIn.set(false);
    this.saveToStorage();
  }

  // -- Session Logic --
  startNewChat() {
    this.currentSessionId.set(null);
  }

  selectSession(id: string) {
    this.currentSessionId.set(id);
    this.isSearchOpen.set(false); 
  }

  deleteSession(id: string) {
    this.sessions.update(s => s.filter(session => session.id !== id));
    if (this.currentSessionId() === id) {
       this.startNewChat();
    }
  }

  renameSession(id: string, newTitle: string) {
    this.sessions.update(s => s.map(session => {
        if (session.id === id) return { ...session, title: newTitle };
        return session;
    }));
  }

  togglePinSession(id: string) {
    this.sessions.update(s => s.map(session => {
        if (session.id === id) return { ...session, pinned: !session.pinned };
        return session;
    }));
  }

  stopTask() {
    this.abortRequest();
  }

  abortRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.isGenerating.set(false);
      
      const currentId = this.currentSessionId();
      if(currentId) {
        this.sessions.update(all => all.map(s => {
          if (s.id === currentId && s.messages.length > 0) {
            const msgs = [...s.messages];
            const last = msgs[msgs.length - 1];
            if (last.role === 'assistant') {
              last.isTyping = false;
              last.displayedContent = last.content;
            }
            return { ...s, messages: msgs };
          }
          return s;
        }));
      }
    }
  }

  // -- Chat Logic --
  async sendMessage(content: string) {
    if (!this.baseUrl()) return;

    let sessionId = this.currentSessionId();
    let isFirstMessage = false;

    if (!sessionId) {
      const newSession: ChatSession = {
        id: crypto.randomUUID(),
        title: 'New Chat',
        messages: [],
        createdAt: Date.now(),
        pinned: false
      };
      this.sessions.update(s => [newSession, ...s]);
      this.currentSessionId.set(newSession.id);
      sessionId = newSession.id;
      isFirstMessage = true;
    }

    if (!sessionId) return; 

    this.addMessageToSession(sessionId, { 
        role: 'user', 
        content, 
        versions: [content], 
        currentVersion: 0,
        displayedContent: content 
    });

    if (isFirstMessage) {
      const newTitle = content.length > 30 ? content.substring(0, 30) + '...' : content;
      this.updateSessionTitle(sessionId, newTitle);
    }

    this.triggerAIResponse(sessionId);
  }

  private async triggerAIResponse(sessionId: string, isEdit = false) {
    this.isGenerating.set(true);
    this.abortController = new AbortController();

    if (!isEdit) {
        this.addMessageToSession(sessionId, { 
            role: 'assistant', 
            content: '', 
            versions: [''], 
            currentVersion: 0,
            displayedContent: '', 
            isTyping: true 
        });
    }

    const session = this.sessions().find(s => s.id === sessionId);
    if (!session) return;

    const history = session.messages.map(m => ({
      role: m.role,
      content: m.versions[m.currentVersion] 
    }));

    history.pop(); 

    const url = `${this.baseUrl()}/api/chat`;
    const body = {
      model: this.currentModel(),
      messages: history,
      stream: false 
    };

    try {
      const fetchResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: this.abortController.signal
      });

      if (!fetchResponse.ok) throw new Error('Network response was not ok');
      const response = await fetchResponse.json();

      if (response && response.message) {
        this.finalizeAssistantMessage(sessionId, response.message.content);
      } else {
        this.finalizeAssistantMessage(sessionId, 'Error: Invalid response format.');
      }

    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Generation aborted');
      } else {
        this.finalizeAssistantMessage(sessionId, 'Error: Connection failed.');
      }
    } finally {
      this.isGenerating.set(false);
      this.abortController = null;
    }
  }

  async editUserMessage(sessionId: string, messageIndex: number, newContent: string) {
    if (!this.baseUrl()) return;
    
    this.sessions.update(all => all.map(s => {
        if (s.id === sessionId) {
            const msgs = [...s.messages];
            const msg = { ...msgs[messageIndex] };
            
            msg.versions = [...msg.versions, newContent];
            msg.currentVersion = msg.versions.length - 1;
            msg.content = newContent; 
            msg.displayedContent = newContent;
            
            msgs[messageIndex] = msg;
            
            const nextIdx = messageIndex + 1;
            if (nextIdx < msgs.length && msgs[nextIdx].role === 'assistant') {
                const aiMsg = { ...msgs[nextIdx] };
                aiMsg.versions = [...aiMsg.versions, '']; 
                aiMsg.currentVersion = aiMsg.versions.length - 1;
                aiMsg.content = '';
                aiMsg.displayedContent = '';
                aiMsg.isTyping = true;
                msgs[nextIdx] = aiMsg;
            }

            return { ...s, messages: msgs };
        }
        return s;
    }));

    this.triggerAIResponse(sessionId, true);
  }

  switchMessageVersion(sessionId: string, messageIndex: number, direction: 'prev' | 'next') {
     this.sessions.update(all => all.map(s => {
        if (s.id === sessionId) {
            const msgs = [...s.messages];
            const msg = { ...msgs[messageIndex] };
            
            let newVer = msg.currentVersion + (direction === 'next' ? 1 : -1);
            if (newVer < 0) newVer = 0;
            if (newVer >= msg.versions.length) newVer = msg.versions.length - 1;
            
            if (newVer !== msg.currentVersion) {
                msg.currentVersion = newVer;
                msg.content = msg.versions[newVer];
                msg.displayedContent = msg.versions[newVer];
                msgs[messageIndex] = msg;

                const nextIdx = messageIndex + 1;
                if (nextIdx < msgs.length && msgs[nextIdx].role === 'assistant') {
                    const aiMsg = { ...msgs[nextIdx] };
                    let aiVer = newVer;
                    if (aiVer >= aiMsg.versions.length) aiVer = aiMsg.versions.length - 1;
                    
                    aiMsg.currentVersion = aiVer;
                    aiMsg.content = aiMsg.versions[aiVer];
                    aiMsg.displayedContent = aiMsg.versions[aiVer];
                    aiMsg.isTyping = false; 
                    
                    msgs[nextIdx] = aiMsg;
                }
            }
            return { ...s, messages: msgs };
        }
        return s;
    }));
  }

  private addMessageToSession(id: string, messageBase: Omit<Message, 'id'>) {
     const newMsg: Message = { ...messageBase, id: crypto.randomUUID() };
     this.sessions.update(all => all.map(s => {
       if (s.id === id) {
         return { ...s, messages: [...s.messages, newMsg] };
       }
       return s;
     }));
  }

  private finalizeAssistantMessage(sessionId: string, fullContent: string) {
    this.sessions.update(all => all.map(s => {
      if (s.id === sessionId) {
        const msgs = [...s.messages];
        const typingIdx = msgs.findIndex(m => m.role === 'assistant' && m.isTyping);
        const targetIdx = typingIdx !== -1 ? typingIdx : msgs.length - 1;

        if (targetIdx >= 0 && msgs[targetIdx].role === 'assistant') {
           const msg = { ...msgs[targetIdx] };
           const versions = [...msg.versions];
           versions[msg.currentVersion] = fullContent;
           
           msgs[targetIdx] = {
             ...msg,
             versions,
             content: fullContent,
           };
        }
        return { ...s, messages: msgs };
      }
      return s;
    }));
  }

  markMessageTypingComplete(sessionId: string, messageIndex: number) {
    this.sessions.update(all => all.map(s => {
        if (s.id === sessionId) {
            const msgs = [...s.messages];
            if(msgs[messageIndex]) {
                msgs[messageIndex] = { ...msgs[messageIndex], isTyping: false, displayedContent: msgs[messageIndex].content };
            }
            return { ...s, messages: msgs };
        }
        return s;
    }));
  }

  toggleMessageFeedback(sessionId: string, messageIndex: number, type: 'like' | 'dislike') {
    this.sessions.update(all => all.map(s => {
        if (s.id === sessionId) {
            const msgs = [...s.messages];
            const msg = { ...msgs[messageIndex] };
            
            if (type === 'like') {
                msg.liked = !msg.liked;
                if (msg.liked) msg.disliked = false;
            } else {
                msg.disliked = !msg.disliked;
                if (msg.disliked) msg.liked = false;
            }
            
            msgs[messageIndex] = msg;
            return { ...s, messages: msgs };
        }
        return s;
    }));
  }

  private updateSessionTitle(id: string, title: string) {
    this.sessions.update(all => all.map(s => {
      if (s.id === id) return { ...s, title };
      return s;
    }));
  }

  private async fetchModels() {
    if (!this.baseUrl()) return;
    try {
      const res: any = await firstValueFrom(this.http.get(`${this.baseUrl()}/api/tags`));
      if (res && res.models && res.models.length > 0) {
        this.currentModel.set(res.models[0].name);
      }
    } catch (e) {
      console.warn('Could not fetch models', e);
    }
  }

  // --- AUDIO FEATURES ---

  prepareAudio(text: string) {
    if (!('speechSynthesis' in window)) return;
    
    this.closeAudio(false);
    
    // Advanced Filtering: Strip Markdown and Emojis
    let cleanText = text
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/__(.*?)__/g, '$1') 
        .replace(/##/g, '') 
        .replace(/`{1,3}(.*?)`{1,3}/g, 'code') 
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}]/gu, '');
    
    this.currentAudioFullText = cleanText;
    this.currentAudioCharIndex = 0; 
    
    // Estimate: Bangla characters are dense. 14 chars/sec approx.
    this.audioTotalSeconds.set(Math.max(2, Math.ceil(cleanText.length / 14)));
    this.audioSeconds.set(0);

    this.isAudioVisible.set(true);
    this.audioPaused.set(true);
    this.isAudioPlaying.set(false);
  }

  toggleAudio() {
    if (!this.isAudioVisible()) return;

    if (this.isAudioPlaying()) {
        // Pause
        window.speechSynthesis.cancel();
        this.isAudioPlaying.set(false);
        this.audioPaused.set(true);
        if (this.audioInterval) clearInterval(this.audioInterval);
    } else {
        // Resume from current visual position
        this.speakFromIndex(this.currentAudioCharIndex);
    }
  }

  // Update visual timer without restarting audio (for dragging)
  updateAudioVisual(percentage: number) {
     if (this.audioTotalSeconds() === 0) return;
     const newSec = Math.floor(this.audioTotalSeconds() * (percentage / 100));
     this.audioSeconds.set(newSec);
  }

  // Commit seek (restart audio)
  commitSeekAudio(percentage: number) {
    if (!this.currentAudioFullText) return;

    // Immediately stop current
    window.speechSynthesis.cancel();
    if (this.audioInterval) clearInterval(this.audioInterval);

    const targetChar = Math.floor(this.currentAudioFullText.length * (percentage / 100));
    
    // Snap to space
    let safeStart = this.currentAudioFullText.lastIndexOf(' ', targetChar);
    if (safeStart === -1) safeStart = 0;
    else safeStart += 1; 

    this.currentAudioCharIndex = safeStart;
    
    // Update visual immediately
    const newSec = Math.floor(this.audioTotalSeconds() * (percentage / 100));
    this.audioSeconds.set(newSec);

    // Force Keep Playing state active
    this.isAudioPlaying.set(true);
    this.audioPaused.set(false);

    // Auto Play on seek drop
    this.speakFromIndex(safeStart);
  }

  private speakFromIndex(startIndex: number) {
    if (startIndex >= this.currentAudioFullText.length) {
        this.closeAudio(); 
        return;
    }

    const remainingText = this.currentAudioFullText.substring(startIndex);
    
    const utterance = new SpeechSynthesisUtterance(remainingText);
    utterance.rate = 1.0; 
    // Cute Girl Pitch = 1.4
    utterance.pitch = 1.4; 

    // Native Bengali Force Logic
    const voices = window.speechSynthesis.getVoices();
    
    // Priority: Google Bangla, Microsoft Bangla, then any bn-BD
    let selectedVoice = voices.find(v => v.name.includes('Google Bangla') || v.name.includes('Microsoft Bangla'));
    if (!selectedVoice) selectedVoice = voices.find(v => v.lang === 'bn-BD'); 
    if (!selectedVoice) selectedVoice = voices.find(v => v.lang === 'bn-IN');
    if (!selectedVoice) selectedVoice = voices.find(v => v.name.toLowerCase().includes('bangla') || v.name.toLowerCase().includes('bengali'));

    if (selectedVoice) {
        utterance.voice = selectedVoice;
    } 

    if (this.audioInterval) clearInterval(this.audioInterval);
    
    this.audioInterval = setInterval(() => {
        this.audioSeconds.update(s => {
            if (s >= this.audioTotalSeconds()) {
                return this.audioTotalSeconds(); 
            }
            return s + 1;
        });
        
        // Advance internal char index based on time progress
        const progress = this.audioSeconds() / this.audioTotalSeconds();
        this.currentAudioCharIndex = Math.floor(this.currentAudioFullText.length * progress);

    }, 1000);

    utterance.onend = () => {
        if (this.audioSeconds() >= this.audioTotalSeconds() - 2) {
            this.audioSeconds.set(this.audioTotalSeconds());
            this.isAudioPlaying.set(false);
            this.audioPaused.set(true); 
            if (this.audioInterval) clearInterval(this.audioInterval);
        }
    };

    utterance.onerror = () => {
        this.isAudioPlaying.set(false);
        this.audioPaused.set(true);
        if (this.audioInterval) clearInterval(this.audioInterval);
    };

    // Ensure state reflects playing
    this.isAudioPlaying.set(true);
    this.audioPaused.set(false);
    window.speechSynthesis.speak(utterance);
    this.audioUtterance = utterance;
  }

  closeAudio(animate = true) {
    window.speechSynthesis.cancel();
    if (this.audioInterval) clearInterval(this.audioInterval);
    
    this.isAudioPlaying.set(false);
    this.audioPaused.set(true);
    this.audioSeconds.set(0);
    this.currentAudioFullText = '';
    this.currentAudioCharIndex = 0;
    
    if (!animate) {
        this.isAudioVisible.set(false);
    }
  }

  exportToPdf(content: string) {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) return;

    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(content, 180);
    
    doc.setFont("helvetica", "bold"); 
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0); 
    doc.text("Gen-62", 10, 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    let y = 30;
    
    for (let i = 0; i < splitText.length; i++) {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        doc.text(splitText[i], 10, y);
        y += 7;
    }

    doc.save('Gen-62.pdf');
  }

  private saveToStorage() {
    const data = {
      baseUrl: this.baseUrl(),
      sessions: this.sessions(),
      isDarkMode: this.isDarkMode(),
      username: this.username(),
      isLoggedIn: this.isLoggedIn()
    };
    localStorage.setItem('gen62-data', JSON.stringify(data));
  }

  private loadFromStorage() {
    const raw = localStorage.getItem('gen62-data');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (data.baseUrl) this.baseUrl.set(data.baseUrl);
        if (data.sessions) this.sessions.set(data.sessions);
        if (data.isDarkMode !== undefined) this.isDarkMode.set(data.isDarkMode);
        if (data.username) this.username.set(data.username);
        if (data.isLoggedIn) this.isLoggedIn.set(data.isLoggedIn);
      } catch (e) {
        console.error('Failed to load storage', e);
      }
    }
  }
}