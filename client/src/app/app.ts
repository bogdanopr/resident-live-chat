import { Component } from '@angular/core';
import { ChatMessagingComponent } from './chat/chat';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ChatMessagingComponent],
  template: '<app-chat />',
  styles: [':host { display: block; height: 100vh; }'],
})
export class App { }
