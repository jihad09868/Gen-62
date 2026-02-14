import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OllamaService } from './services/ollama.service';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ChatInterfaceComponent } from './components/chat-interface/chat-interface.component';
import { UrlConfigComponent } from './components/url-config/url-config.component';
import { LoginComponent } from './components/login/login.component';
import { SearchModalComponent } from './components/search-modal/search-modal.component';
import { GensModalComponent } from './components/gens-modal/gens-modal.component';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule, 
    SidebarComponent, 
    ChatInterfaceComponent, 
    UrlConfigComponent,
    LoginComponent,
    SearchModalComponent,
    GensModalComponent,
    SettingsModalComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: []
})
export class AppComponent {
  public ollamaService = inject(OllamaService);

  isSidebarOpen = signal<boolean>(false);
  hasConfiguredUrl = this.ollamaService.hasConfiguredUrl;
  isLoggedIn = this.ollamaService.isLoggedIn;
  
  isFullscreen = signal(false);

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        this.isFullscreen.set(true);
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
            this.isFullscreen.set(false);
        }
    }
  }
}