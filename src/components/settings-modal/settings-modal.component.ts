import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OllamaService } from '../../services/ollama.service';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" (click)="close()"></div>

      <div class="relative w-full max-w-sm bg-[#151515] border border-white/10 rounded-2xl shadow-2xl p-6 animate-fade-in-up">
        
        <h2 class="text-xl font-semibold text-white mb-6">Settings</h2>

        <!-- Theme Toggle -->
        <div class="flex items-center justify-between py-3 border-b border-white/5">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-white/5 rounded-lg">
                    <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 text-zinc-300"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                </div>
                <span class="text-white text-[15px]">Dark Mode</span>
            </div>
            
            <button 
                (click)="ollamaService.toggleTheme()"
                class="w-12 h-7 rounded-full transition-colors relative"
                [class.bg-green-500]="ollamaService.isDarkMode()"
                [class.bg-zinc-600]="!ollamaService.isDarkMode()"
            >
                <div class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform"
                     [class.translate-x-5]="ollamaService.isDarkMode()"
                     [class.translate-x-0]="!ollamaService.isDarkMode()"
                ></div>
            </button>
        </div>
        
        <!-- Info -->
        <div class="mt-6 text-center">
            <p class="text-[12px] text-zinc-600">Gen-62 Client v1.0</p>
            <button (click)="close()" class="mt-4 w-full py-2.5 bg-[#222] hover:bg-[#333] text-white rounded-lg text-sm transition-colors">Done</button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in-up {
        animation: fadeInUp 0.3s ease-out both;
    }
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(15px); }
        to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class SettingsModalComponent {
  ollamaService = inject(OllamaService);
  close() { this.ollamaService.isSettingsOpen.set(false); }
}