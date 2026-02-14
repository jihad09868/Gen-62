import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OllamaService } from '../../services/ollama.service';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-[#f9f9f9] dark:bg-[#171717] border-r border-zinc-200 dark:border-white/5 relative transition-colors duration-300">
      
      <div class="p-3 pb-2 flex flex-col gap-2">
        
        <!-- Gen-62 Title (Top) -->
        <div class="pl-2 pt-2 pb-2 flex items-center justify-between">
            <h1 class="font-wet tracking-widest text-[20px] text-zinc-800 dark:text-white select-none">Gen-62</h1>
        </div>

        <!-- New Chat Button - Reverted to Square/Pencil -->
        <button 
          (click)="handleNewChat()"
          class="group flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-[#212121] transition-all duration-200"
        >
          <div class="flex items-center gap-3">
             <div class="w-6 h-6 flex items-center justify-center">
                 <!-- Square Edit Icon -->
                 <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-black dark:text-white"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
             </div>
             <span class="text-[14px] font-medium">New chat</span>
          </div>
        </button>

        <!-- Search Chat Button -->
        <button 
            (click)="handleSearch()"
            class="group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-[#212121] transition-all"
        >
             <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
             <span class="text-[14px]">Search</span>
        </button>
        
        <!-- Gen's Button -->
        <button 
            (click)="ollamaService.toggleGens()"
            class="group flex items-center gap-3 w-full px-3 py-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-[#212121] transition-all"
        >
            <div class="w-4 h-4 rounded-[4px] border border-current flex items-center justify-center text-[10px] font-bold">G</div>
            <span class="text-[14px]">Gen's</span>
        </button>

      </div>

      <!-- History Section -->
      <div class="flex-1 overflow-y-auto px-2 pb-4 no-scrollbar">
        <div class="flex flex-col mt-4">
            <div class="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 py-2 px-4">Recent</div>
            
            @for (session of sortedSessions(); track session.id) {
              <div 
                class="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200"
                [class.bg-zinc-200]="currentSessionId() === session.id && !ollamaService.isDarkMode()"
                [class.bg-[#212121]]="currentSessionId() === session.id && ollamaService.isDarkMode()"
                [class.text-black]="currentSessionId() === session.id && !ollamaService.isDarkMode()"
                [class.text-white]="currentSessionId() === session.id && ollamaService.isDarkMode()"
                [class.text-zinc-600]="currentSessionId() !== session.id"
                [class.dark:text-zinc-400]="currentSessionId() !== session.id"
                [class.hover:bg-zinc-100]="currentSessionId() !== session.id && !ollamaService.isDarkMode()"
                [class.hover:bg-[#212121]]="currentSessionId() !== session.id && ollamaService.isDarkMode()"
                (click)="handleSelectSession(session.id)"
              >
                 
                 <!-- INLINE RENAME INPUT -->
                 @if (isRenamingId() === session.id) {
                    <input 
                        type="text" 
                        [ngModel]="renameInputValue()"
                        (ngModelChange)="renameInputValue.set($event)"
                        (keydown.enter)="commitRename(session.id)"
                        (click)="$event.stopPropagation()"
                        class="w-full bg-transparent border border-blue-500 rounded px-1 text-[13px] text-black dark:text-white focus:outline-none"
                        autoFocus
                    />
                    <div class="flex items-center gap-1">
                        <button (click)="commitRename(session.id); $event.stopPropagation()" class="text-green-500 hover:text-green-400"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
                        <button (click)="cancelRename(); $event.stopPropagation()" class="text-red-500 hover:text-red-400"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                    </div>
                 } @else {
                     <!-- Display Mode -->
                     @if(session.pinned) {
                        <!-- Push Pin Icon (Real Pin) -->
                        <svg class="w-3.5 h-3.5 flex-shrink-0 text-black dark:text-white rotate-45" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z"></path></svg>
                     }

                    <div class="flex-1 truncate relative z-0 text-[13px] font-normal leading-tight select-none" title="{{session.title}}">
                      {{ session.title }}
                    </div>
                    
                    <!-- Menu Trigger -->
                    <div class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                         [class.opacity-100]="openMenuId() === session.id">
                         <button 
                            (click)="toggleMenu(session.id, $event)"
                            class="p-1 rounded text-zinc-500 hover:text-black dark:hover:text-white hover:bg-zinc-300 dark:hover:bg-[#424242]"
                         >
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                         </button>
                    </div>
                 }

                <!-- Dropdown Menu (High Contrast, Rounded) -->
                @if (openMenuId() === session.id && isRenamingId() !== session.id) {
                    <div 
                        class="absolute right-0 top-8 mt-1 w-44 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-2xl border border-zinc-200 dark:border-white/10 z-50 flex flex-col py-1 animate-scale-in overflow-hidden"
                        (click)="$event.stopPropagation()"
                    >
                        <!-- Share -->
                        <button (click)="actionShare(session.id)" class="flex items-center gap-3 px-3 py-2.5 text-[13px] text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-[#2A2B32] w-full text-left transition-colors font-medium">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                            Share
                        </button>

                        <!-- Rename -->
                        <button (click)="startRename(session.id, session.title)" class="flex items-center gap-3 px-3 py-2.5 text-[13px] text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-[#2A2B32] w-full text-left transition-colors font-medium">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            Rename
                        </button>
                        
                        <!-- Pin (Fixed Icon) -->
                        <button (click)="actionPin(session.id)" class="flex items-center gap-3 px-3 py-2.5 text-[13px] text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-[#2A2B32] w-full text-left transition-colors font-medium">
                            <!-- Real Pin Icon for Menu -->
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6l1 1 1-1v-6h5v-2l-2-2z"></path></svg>
                            {{ session.pinned ? 'Unpin' : 'Pin' }}
                        </button>
                        
                        <!-- Delete -->
                        <button (click)="actionDelete(session.id)" class="flex items-center gap-3 px-3 py-2.5 text-[13px] text-red-600 hover:bg-zinc-100 dark:hover:bg-[#2A2B32] w-full text-left transition-colors font-medium">
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            Delete chat
                        </button>
                    </div>
                }
              </div>
            }
        </div>
      </div>

      <!-- Bottom Settings Area -->
      <div class="mt-auto p-2 border-t border-zinc-200 dark:border-white/5 bg-[#f9f9f9] dark:bg-[#171717] z-10">
        
        <button 
          (click)="ollamaService.toggleSettings()"
          class="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover:bg-zinc-200 dark:hover:bg-[#2f2f2f] text-zinc-700 dark:text-zinc-300 transition-colors text-[13px] text-left group"
        >
           <div class="w-7 h-7 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-200 dark:border-white/10">
              <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
           </div>
           <div class="flex flex-col">
               <span class="font-medium text-black dark:text-white">Settings</span>
           </div>
        </button>
        
        <!-- Power Off Button (Icon Only) -->
        <button 
            (click)="ollamaService.resetConfig()"
            class="flex items-center justify-center w-full px-3 py-1.5 mt-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-zinc-400 hover:text-red-500 transition-colors"
            title="Disconnect"
        >
             <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
        </button>

      </div>

    </div>
  `,
  styles: [`
    .animate-scale-in {
        animation: scaleIn 0.15s ease-out forwards;
        transform-origin: top right;
    }
    @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
    }
  `]
})
export class SidebarComponent {
  ollamaService = inject(OllamaService);
  sortedSessions = this.ollamaService.sortedSessions;
  currentSessionId = this.ollamaService.currentSessionId;
  openMenuId = signal<string | null>(null);
  
  // Inline Rename Logic
  isRenamingId = signal<string | null>(null);
  renameInputValue = signal<string>('');

  constructor() {
    // Close menu when clicking outside
    document.addEventListener('click', () => {
        this.openMenuId.set(null);
        // If we click outside while renaming, save it if distinct or cancel
        if (this.isRenamingId()) {
            this.cancelRename();
        }
    });
  }

  handleNewChat() {
    this.closeSidebarIfMobile();
    this.ollamaService.startNewChat();
  }

  handleSearch() {
    this.closeSidebarIfMobile();
    this.ollamaService.toggleSearch();
  }
  
  handleSelectSession(id: string) {
    if (this.isRenamingId() === id) return; // Don't select if renaming
    this.closeSidebarIfMobile();
    this.ollamaService.selectSession(id);
  }
  
  toggleMenu(id: string, event: Event) {
    event.stopPropagation();
    if (this.openMenuId() === id) {
        this.openMenuId.set(null);
    } else {
        this.openMenuId.set(id);
        this.isRenamingId.set(null); // Stop renaming if menu opens
    }
  }

  // Start Inline Rename
  startRename(id: string, currentTitle: string) {
    this.openMenuId.set(null); // Close menu
    this.renameInputValue.set(currentTitle);
    this.isRenamingId.set(id);
  }
  
  commitRename(id: string) {
      const val = this.renameInputValue().trim();
      if (val) {
          this.ollamaService.renameSession(id, val);
      }
      this.isRenamingId.set(null);
  }

  cancelRename() {
      this.isRenamingId.set(null);
  }

  actionPin(id: string) {
    this.openMenuId.set(null);
    this.ollamaService.togglePinSession(id);
  }

  actionDelete(id: string) {
    this.openMenuId.set(null);
    this.ollamaService.deleteSession(id);
  }
  
  actionShare(id: string) {
    this.openMenuId.set(null);
    alert(`Link copied to clipboard: https://gen62.ai/s/${id.substring(0,6)}`);
  }

  closeSidebarIfMobile() {
    if (window.innerWidth < 768) {
       // Logic handled by app parent
    }
  }
}