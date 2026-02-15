import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface ChatMessage {
    id: string;
    username: string;
    message: string;
    timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
    private socket: WebSocket | null = null;
    private chatSubject = new Subject<ChatMessage>();
    private usersSubject = new Subject<string[]>();

    connect(): void {
        if (this.socket) return;

        this.socket = new WebSocket('ws://localhost:3000');

        this.socket.onmessage = (event) => {
            let data: any;
            try {
                data = JSON.parse(event.data);
            } catch {
                return;
            }

            if (data.type === 'chat') {
                this.chatSubject.next({
                    id: data.id,
                    username: data.username,
                    message: data.message,
                    timestamp: data.timestamp,
                });
            }

            if (data.type === 'users') {
                this.usersSubject.next(data.users);
            }
        };

        this.socket.onclose = () => {
            this.socket = null;
        };

        this.socket.onerror = () => {
            this.socket?.close();
        };
    }

    join(username: string): void {
        this.send({ type: 'join', username });
    }

    sendChat(username: string, message: string): void {
        this.send({ type: 'chat', username, message });
    }

    onChatMessage(): Observable<ChatMessage> {
        return this.chatSubject.asObservable();
    }

    onUsers(): Observable<string[]> {
        return this.usersSubject.asObservable();
    }

    private send(data: object): void {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }

    ngOnDestroy(): void {
        this.socket?.close();
        this.chatSubject.complete();
        this.usersSubject.complete();
    }
}
