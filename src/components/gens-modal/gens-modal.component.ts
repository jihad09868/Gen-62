import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OllamaService } from '../../services/ollama.service';

@Component({
  selector: 'app-gens-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" (click)="close()"></div>

      <div class="relative w-full max-w-lg bg-[#0f0f0f] border border-pink-500/20 rounded-2xl shadow-[0_0_60px_-15px_rgba(236,72,153,0.15)] overflow-hidden animate-pop-up flex flex-col">
        
        <div class="p-6 pb-2 border-b border-white/5">
            <h3 class="text-xl font-bold text-white tracking-wide">Gen's Modes</h3>
            <p class="text-zinc-500 text-sm mt-1">Select an AI personality capability.</p>
        </div>

        <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Mode 1 -->
            <button class="p-4 rounded-xl bg-[#151515] hover:bg-pink-500/10 border border-white/5 hover:border-pink-500/50 transition-all group text-left">
                <div class="w-10 h-10 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                   <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="M12 2a10 10 0 1 0 10 10H12V2z"></path><path d="M12 12 2.1 10.5M22 22l-10-10"></path></svg>
                </div>
                <div class="font-bold text-white text-[15px]">Standard</div>
                <div class="text-[12px] text-zinc-500 mt-1">Balanced helpful assistant.</div>
            </button>

            <!-- Mode 2 -->
            <button class="p-4 rounded-xl bg-[#151515] hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/50 transition-all group text-left">
                <div class="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                   <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                </div>
                <div class="font-bold text-white text-[15px]">Developer</div>
                <div class="text-[12px] text-zinc-500 mt-1">Optimized for code generation.</div>
            </button>

             <!-- Mode 3 -->
            <button class="p-4 rounded-xl bg-[#151515] hover:bg-orange-500/10 border border-white/5 hover:border-orange-500/50 transition-all group text-left">
                <div class="w-10 h-10 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                   <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
                </div>
                <div class="font-bold text-white text-[15px]">Creative</div>
                <div class="text-[12px] text-zinc-500 mt-1">Storytelling and ideas.</div>
            </button>

             <!-- Mode 4 -->
            <button class="p-4 rounded-xl bg-[#151515] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/50 transition-all group text-left">
                <div class="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                   <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-6 w-6"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                </div>
                <div class="font-bold text-white text-[15px]">Analyst</div>
                <div class="text-[12px] text-zinc-500 mt-1">Data and logical reasoning.</div>
            </button>
        </div>
        
        <div class="p-4 border-t border-white/5 bg-[#0a0a0a]">
            <button (click)="close()" class="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors">Close</button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .animate-pop-up {
        animation: popUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
    }
    @keyframes popUp {
        0% { opacity: 0; transform: scale(0.8) translateY(20px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
    }
  `]
})
export class GensModalComponent {
  ollamaService = inject(OllamaService);
  close() { this.ollamaService.isGensOpen.set(false); }
}