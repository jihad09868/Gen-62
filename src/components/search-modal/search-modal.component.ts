import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OllamaService } from '../../services/ollama.service';

@Component({
  selector: 'app-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      
      <!-- Backdrop with closing animation -->
      <div 
        class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-500" 
        [class.opacity-0]="isClosing()"
        (click)="startClose()"
      ></div>

      <!-- Pop-up Container -->
      <div 
        class="relative w-full max-w-xl bg-white dark:bg-[#202123] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 dark:border-white/5"
        [class.animate-pop-slow-in]="!isClosing()"
        [class.animate-pop-slow-out]="isClosing()"
      >
        
        <!-- Search Bar -->
        <div class="p-3 border-b border-zinc-200 dark:border-white/5 relative flex items-center gap-2">
             <div class="flex items-center justify-center w-8 h-8 text-zinc-400">
                <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
             </div>
             <input 
                type="text" 
                [(ngModel)]="searchQuery" 
                placeholder="Search..." 
                class="flex-1 bg-transparent text-zinc-900 dark:text-white text-[14px] placeholder-zinc-500 focus:outline-none"
                autoFocus
             />
             <div class="px-2">
                 <button (click)="startClose()" class="text-zinc-500 hover:text-black dark:hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-[#343541]">
                    <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                 </button>
             </div>
        </div>

        <!-- Result List -->
        <div class="max-h-[50vh] overflow-y-auto no-scrollbar">
            @if (filteredSessions().length === 0) {
                <div class="p-8 text-center text-zinc-500 text-xs">No results found.</div>
            } @else {
                <div class="flex flex-col">
                    @for (session of filteredSessions(); track session.id) {
                        <button 
                            (click)="selectAndClose(session.id)"
                            class="group flex items-center gap-3 px-4 py-3 hover:bg-zinc-100 dark:hover:bg-[#343541] transition-colors text-left border-b border-zinc-100 dark:border-white/5 last:border-0"
                        >
                            <!-- Remove message icon in list as requested, kept just arrow for nav -->
                            <div class="flex-1 min-w-0">
                                <div class="text-[14px] text-zinc-800 dark:text-zinc-200 font-medium truncate">
                                    {{ session.title }}
                                </div>
                                @if (session.matchPreview) {
                                    <div class="text-[12px] text-zinc-500 truncate mt-0.5 font-mono">
                                        {{ session.matchPreview }}
                                    </div>
                                }
                            </div>
                            <div class="text-zinc-400 dark:text-zinc-600 text-[10px]">
                                {{ formatDate(session.createdAt) }}
                            </div>
                        </button>
                    }
                </div>
            }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .animate-pop-slow-in {
        animation: popSlowIn 0.2s ease-out both;
    }
    .animate-pop-slow-out {
        animation: popSlowOut 0.2s ease-in both;
    }

    @keyframes popSlowIn {
        0% { opacity: 0; transform: scale(0.95); }
        100% { opacity: 1; transform: scale(1); }
    }

    @keyframes popSlowOut {
        0% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(0.95); }
    }
  `]
})
export class SearchModalComponent {
  ollamaService = inject(OllamaService);
  searchQuery = signal('');
  isClosing = signal(false);

  filteredSessions = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const all = this.ollamaService.sessions();
    if (!q) return all;

    return all.map(s => {
        if (s.title.toLowerCase().includes(q)) return { ...s, matchPreview: null };
        const foundMsg = s.messages.find(m => m.content.toLowerCase().includes(q));
        if (foundMsg) {
            const idx = foundMsg.content.toLowerCase().indexOf(q);
            const start = Math.max(0, idx - 15);
            const snippet = '...' + foundMsg.content.substring(start, start + 40) + '...';
            return { ...s, matchPreview: snippet };
        }
        return null;
    }).filter(s => s !== null) as any[];
  });

  formatDate(ts: number) {
      return new Date(ts).toLocaleDateString();
  }

  startClose() {
    this.isClosing.set(true);
    setTimeout(() => {
        this.ollamaService.isSearchOpen.set(false);
    }, 200); 
  }

  selectAndClose(id: string) {
    this.startClose();
    setTimeout(() => {
        this.ollamaService.selectSession(id);
    }, 200);
  }
}