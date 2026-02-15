import { Component } from '@angular/core';
import { ChatComponent } from './chat/chat';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ChatComponent],
  template: '<app-chat />',
  styles: [':host { display: block; height: 100vh; }'],
})
export class App { }
