import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { OllamaService, Message } from '../../services/ollama.service';

declare const JSZip: any;

interface ContentPart {
  type: 'text' | 'code' | 'error' | 'youtube' | 'prompt';
  content: string; // The raw content
  language?: string; // For code blocks
  videoId?: string; // For youtube
  safeUrl?: SafeResourceUrl; // For youtube iframe
  isEditing?: boolean; // For code editor mode
  codeVal?: string; // For editing code
}

@Component({
  selector: 'app-chat-interface',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-interface.component.html',
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    
    input[type=range] {
      -webkit-appearance: none;
      background: transparent;
    }
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      height: 12px;
      width: 12px;
      border-radius: 50%;
      background: #ffffff;
      cursor: pointer;
      margin-top: -4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    input[type=range]::-webkit-slider-runnable-track {
      width: 100%;
      height: 4px;
      cursor: pointer;
      border-radius: 2px;
    }

    /* Custom Scrollbar for Code Editor */
    .code-scroll::-webkit-scrollbar {
        height: 8px;
        width: 8px;
    }
    .code-scroll::-webkit-scrollbar-track {
        background: #1e1e1e;
    }
    .code-scroll::-webkit-scrollbar-thumb {
        background: #444;
        border-radius: 4px;
    }
  `]
})
export class ChatInterfaceComponent implements AfterViewChecked {
  ollamaService = inject(OllamaService);
  sanitizer = inject(DomSanitizer);
  
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('bottomTextarea') private bottomTextarea!: ElementRef;

  currentSession = this.ollamaService.currentSession;
  isGenerating = this.ollamaService.isGenerating;
  inputMessage = signal('');
  isNewChat = this.ollamaService.isNewChat;
  
  // Audio state
  isAudioVisible = this.ollamaService.isAudioVisible;
  isAudioPlaying = this.ollamaService.isAudioPlaying;
  audioPaused = this.ollamaService.audioPaused;
  audioSeconds = this.ollamaService.audioSeconds;
  audioTotalSeconds = this.ollamaService.audioTotalSeconds;
  
  // Audio Animation State
  isAudioClosing = signal(false);
  isDraggingAudio = signal(false);

  // Edit State (Message level)
  editingMessageId = signal<string | null>(null);
  editContent = signal<string>('');
  originalEditContent = signal<string>('');
  
  // Copy Feedback State
  copiedMessageId = signal<string | null>(null);
  copiedCodeId = signal<string | null>(null);
  
  // Scroll State
  private userScrolledUp = false;
  
  messages = computed(() => {
    return this.currentSession()?.messages || [];
  });
  
  audioProgress = computed(() => {
     if (this.audioTotalSeconds() === 0) return 0;
     return (this.audioSeconds() / this.audioTotalSeconds()) * 100;
  });

  // Cached parsed messages to prevent re-parsing on every cycle
  // In a real app we would use a pipe or separate signal, but direct method is fine for this scale if optimized
  // We will rely on Angular's change detection to not call this too often if inputs are stable.

  constructor() {
    effect((onCleanup) => {
        const msgs = this.messages();
        const sessionId = this.currentSession()?.id;
        
        if (!sessionId) return;
        
        // Reset scroll lock when a new user message is added
        if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user') {
            this.userScrolledUp = false;
        }

        const lastMsgIndex = msgs.length - 1;
        if (lastMsgIndex < 0) return;

        const lastMsg = msgs[lastMsgIndex];
        
        if (lastMsg.role === 'assistant' && lastMsg.isTyping && (lastMsg.displayedContent || '').length < lastMsg.content.length) {
            const timeout = setTimeout(() => {
                const currentLen = (lastMsg.displayedContent || '').length;
                const nextChunk = lastMsg.content.substring(currentLen, currentLen + 6); // Faster chunking
                
                this.ollamaService.sessions.update(all => all.map(s => {
                    if (s.id === sessionId) {
                        const m = [...s.messages];
                        m[lastMsgIndex] = { ...m[lastMsgIndex], displayedContent: (m[lastMsgIndex].displayedContent || '') + nextChunk };
                        return { ...s, messages: m };
                    }
                    return s;
                }));

            }, 10);
            
            onCleanup(() => clearTimeout(timeout));
        } else if (lastMsg.role === 'assistant' && lastMsg.isTyping && (lastMsg.displayedContent || '').length >= lastMsg.content.length && !this.isGenerating()) {
             this.ollamaService.markMessageTypingComplete(sessionId, lastMsgIndex);
        }
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  // Handle manual scroll to detect if user wants to stop auto-scroll
  onScroll() {
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement;
    
    // Logic: If user is close to bottom, allow auto-scroll. If far up, lock it.
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    
    if (this.isGenerating()) {
        if (!isAtBottom) {
             this.userScrolledUp = true;
        } else {
             this.userScrolledUp = false;
        }
    }
  }

  scrollToBottom(): void {
    if (this.scrollContainer && !this.isNewChat()) {
      const el = this.scrollContainer.nativeElement;
      // Relaxed condition: Only force scroll if user hasn't scrolled up manually
      if (this.isGenerating() && !this.userScrolledUp) {
         el.scrollTop = el.scrollHeight;
      } else if (!this.isGenerating() && !this.userScrolledUp && this.messages().length > 0) {
          // Check if we are relatively close before snapping
          const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 400;
          if (isNearBottom) {
              el.scrollTop = el.scrollHeight;
          }
      }
    }
  }

  autoResize(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
  }

  handleAction() {
    if (this.isGenerating()) {
      this.ollamaService.stopTask();
    } else {
      this.sendMessage();
    }
  }

  sendMessage() {
    const msg = this.inputMessage().trim();
    if (!msg) return;

    this.inputMessage.set('');
    this.userScrolledUp = false; // Force scroll to bottom on send
    if (this.bottomTextarea) this.bottomTextarea.nativeElement.style.height = 'auto';
    this.ollamaService.sendMessage(msg);
  }

  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  // --- Advanced Parsing Logic ---
  parseMessageContent(content: string): ContentPart[] {
    const parts: ContentPart[] = [];
    
    // 1. Split by Code Blocks
    const codeRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(content)) !== null) {
        // Text before code
        if (match.index > lastIndex) {
            const textSegment = content.substring(lastIndex, match.index);
            this.pushTextOrEmbeds(parts, textSegment);
        }

        // Code Block
        const lang = match[1] || 'plaintext';
        const code = match[2];
        parts.push({
            type: 'code',
            content: code,
            language: lang,
            codeVal: code, // separate value for editing
            isEditing: false
        });

        lastIndex = match.index + match[0].length;
    }

    // Remaining text
    if (lastIndex < content.length) {
        this.pushTextOrEmbeds(parts, content.substring(lastIndex));
    }

    return parts;
  }

  // Helper to parse YouTube links inside text chunks
  private pushTextOrEmbeds(parts: ContentPart[], text: string) {
      // Regex for YouTube URLs (Standard & Shortened)
      const ytRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/g;
      
      let lastIndex = 0;
      let match;

      while ((match = ytRegex.exec(text)) !== null) {
          if (match.index > lastIndex) {
              parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
          }
          
          const videoId = match[1];
          const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`);

          parts.push({
              type: 'youtube',
              content: match[0],
              videoId: videoId,
              safeUrl: safeUrl
          });

          lastIndex = match.index + match[0].length;
      }

      if (lastIndex < text.length) {
          // Detect Prompts ("Prompt: ...")
          const remaining = text.substring(lastIndex);
          if (remaining.toLowerCase().startsWith('prompt:')) {
             parts.push({ type: 'prompt', content: remaining.substring(7).trim() });
          } else {
             parts.push({ type: 'text', content: remaining });
          }
      }
  }
  
  // Helper to make links clickable in text
  linkify(text: string): SafeHtml {
      // Basic Linkify regex
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      // Also format bullets if simple text
      let html = text.replace(urlRegex, '<a href="$1" target="_blank" class="text-blue-500 hover:underline break-all">$1</a>');
      
      // Basic markdown bold/italic
      html = html
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/__(.*?)__/g, '<i>$1</i>');

      // Basic list handling (simple bullet check)
      if (html.includes('\n- ')) {
          html = html.replace(/\n- (.*?)(?=\n|$)/g, '<li class="ml-4 list-disc">$1</li>');
          // Wrap loose lis in ul if needed, but for simplicity we rely on styling
      }
      
      return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  // --- Actions ---
  copyToClipboard(text: string, msgId: string) {
    navigator.clipboard.writeText(text);
    this.copiedMessageId.set(msgId);
    setTimeout(() => this.copiedMessageId.set(null), 1500);
  }

  copyCode(code: string, idPrefix: string) {
      navigator.clipboard.writeText(code);
      this.copiedCodeId.set(idPrefix);
      setTimeout(() => this.copiedCodeId.set(null), 1500);
  }

  toggleCodeEdit(part: ContentPart) {
      part.isEditing = !part.isEditing;
      if (!part.isEditing) {
          // Save (in memory only for this view)
          part.content = part.codeVal || part.content;
      }
  }

  previewCode(code: string, lang: string) {
    if (lang === 'html' || lang === 'xml' || lang === 'svg') {
        const blob = new Blob([code], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    } else {
        alert("Live preview is optimized for HTML/SVG. For other languages, use an external IDE.");
    }
  }

  downloadCode(code: string, lang: string) {
    if (!JSZip) return;
    const zip = new JSZip();
    const ext = lang === 'javascript' ? 'js' : lang === 'typescript' ? 'ts' : lang;
    zip.file(`code.${ext}`, code);
    
    zip.generateAsync({type:"blob"}).then((content: any) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "gen62-code.zip";
        link.click();
    });
  }

  startEdit(msg: Message) {
    this.editingMessageId.set(msg.id);
    this.editContent.set(msg.content);
    this.originalEditContent.set(msg.content);
  }

  cancelEdit() {
    this.editingMessageId.set(null);
    this.editContent.set('');
    this.originalEditContent.set('');
  }

  saveEdit(index: number) {
    const content = this.editContent().trim();
    if (!content || content === this.originalEditContent().trim()) {
        this.cancelEdit();
        return;
    }
    
    if (content) {
        const id = this.currentSession()?.id;
        if(id) {
           this.ollamaService.editUserMessage(id, index, content);
           this.editingMessageId.set(null);
        }
    }
  }

  switchVersion(index: number, direction: 'prev' | 'next') {
    const id = this.currentSession()?.id;
    if(id && !this.isGenerating()) {
        this.ollamaService.switchMessageVersion(id, index, direction);
    }
  }

  exportPdf(content: string) {
    this.ollamaService.exportToPdf(content);
  }

  // Audio Logic
  prepareAudio(content: string) {
    this.isAudioClosing.set(false);
    this.ollamaService.prepareAudio(content);
  }

  toggleAudioPlay() {
    this.ollamaService.toggleAudio();
  }

  seekAudioInput(event: Event) {
    this.isDraggingAudio.set(true);
    const input = event.target as HTMLInputElement;
    const val = parseInt(input.value, 10);
    this.ollamaService.updateAudioVisual(val);
  }

  seekAudioChange(event: Event) {
    this.isDraggingAudio.set(false);
    const input = event.target as HTMLInputElement;
    const val = parseInt(input.value, 10);
    this.ollamaService.commitSeekAudio(val);
  }

  closeAudio() {
    this.isAudioClosing.set(true);
    setTimeout(() => {
        this.ollamaService.closeAudio(false); 
        this.ollamaService.isAudioVisible.set(false); 
        this.isAudioClosing.set(false);
    }, 280); 
  }

  formatTimeSimple(sec: number): string {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (s === 0) return `${m}m`;
    return `${m}m ${s}s`;
  }

  toggleLike(msg: Message, index: number) {
     const id = this.currentSession()?.id;
     if(id) this.ollamaService.toggleMessageFeedback(id, index, 'like');
  }

  toggleDislike(msg: Message, index: number) {
     const id = this.currentSession()?.id;
     if(id) this.ollamaService.toggleMessageFeedback(id, index, 'dislike');
  }
}