import {
    Component,
    OnInit,
    OnDestroy,
    ViewChild,
    ElementRef,
    AfterViewChecked,
    ChangeDetectorRef,
    inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { WebSocketService, ChatMessage } from '../websocket.service';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './chat.html',
    styleUrl: './chat.css',
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

    chatForm!: FormGroup;
    messages: (ChatMessage & { pending?: boolean })[] = [];
    users: string[] = [];
    joined = false;
    private shouldScroll = false;
    private chatSub!: Subscription;
    private usersSub!: Subscription;

    private fb = inject(FormBuilder);
    private ws = inject(WebSocketService);
    private cdr = inject(ChangeDetectorRef);

    constructor() { }

    ngOnInit(): void {
        this.chatForm = this.fb.group({
            username: ['', Validators.required],
            message: ['', Validators.required],
        });

        this.ws.connect();

        this.chatSub = this.ws.onChatMessage().subscribe((msg) => {
            // Try to match an optimistic (pending) message
            const pendingIdx = this.messages.findIndex(
                (m) => m.pending && m.username === msg.username && m.message === msg.message
            );
            if (pendingIdx !== -1) {
                // Confirm: replace pending with server-confirmed message
                this.messages[pendingIdx] = { ...msg, pending: false };
            } else {
                // Message from another user
                this.messages.push(msg);
            }
            this.shouldScroll = true;
            this.cdr.detectChanges(); // Force UI update
        });

        this.usersSub = this.ws.onUsers().subscribe((users) => {
            this.users = users;
            this.cdr.detectChanges(); // Force UI update
        });
    }

    ngAfterViewChecked(): void {
        if (this.shouldScroll) {
            this.scrollToBottom();
            this.shouldScroll = false;
        }
    }

    join(): void {
        const username = this.chatForm.get('username')?.value?.trim();
        if (!username) return;
        this.ws.join(username);
        this.joined = true;
    }

    send(): void {
        if (!this.chatForm.valid) return;
        const { username, message } = this.chatForm.value;
        if (!username?.trim() || !message?.trim()) return;

        const trimUser = username.trim();
        const trimMsg = message.trim();

        // Optimistic: show immediately with pending spinner
        this.messages.push({
            id: '__pending_' + Date.now(),
            username: trimUser,
            message: trimMsg,
            timestamp: Date.now(),
            pending: true,
        });
        this.shouldScroll = true;

        this.ws.sendChat(trimUser, trimMsg);
        this.chatForm.patchValue({ message: '' });
    }

    formatTime(ts: number): string {
        const d = new Date(ts);
        return d.toLocaleTimeString('en-GB', { hour12: false });
    }

    private scrollToBottom(): void {
        try {
            const el = this.messagesContainer?.nativeElement;
            if (el) el.scrollTop = el.scrollHeight;
        } catch { }
    }

    ngOnDestroy(): void {
        this.chatSub?.unsubscribe();
        this.usersSub?.unsubscribe();
        this.ws.ngOnDestroy();
    }
}
