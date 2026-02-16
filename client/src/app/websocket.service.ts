import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../environments/environment';

/**
 * represents a standard chat message payload received from or sent to the server.
 */
export interface ChatMessage {
    id: string;
    username: string;
    message: string;
    timestamp: number;
}

/**
 * service responsible for managing the low-level websocket connection to the backend application.
 * handles bidirectional communication, message parsing, and state synchronization for active users.
 */
@Injectable({ providedIn: 'root' })
export class WebSocketCommunicationService implements OnDestroy {
    private webSocketInstance: WebSocket | null = null;
    private chatMessageHistoryStream = new Subject<ChatMessage>();
    private activeUserListStream = new Subject<string[]>();

    /**
     * establishes a connection to the primary websocket server.
     * configures event listeners for incoming messages, connection closure, and error handling.
     */
    public initializeConnection(): void {
        if (this.webSocketInstance) {
            return;
        }

        this.webSocketInstance = new WebSocket(environment.websocketUrl);

        this.webSocketInstance.onopen = (): void => {
            console.log('WebSocket connection established.');
            this.flushMessageQueueAfterConnection();
        };

        this.webSocketInstance.onmessage = (messageEvent: MessageEvent): void => {
            this.processIncomingWebSocketMessage(messageEvent);
        };

        this.webSocketInstance.onclose = (): void => {
            this.handleWebSocketConnectionClosure();
        };

        this.webSocketInstance.onerror = (): void => {
            this.handleWebSocketCommunicationError();
        };
    }

    /**
     * sends a join request to the server to register the current user in the active session.
     * @param username - the unique identifier chosen by the resident.
     */
    public registerUserToChatSession(username: string): void {
        this.emitDataToWebSocketServer({
            type: 'join',
            username: username
        });
    }

    /**
     * packages and sends a user message to the broadcast channel.
     * @param username - the sender's identity label.
     * @param messageContent - the raw text content of the message.
     */
    public dispatchChatMessage(username: string, messageContent: string): void {
        this.emitDataToWebSocketServer({
            type: 'chat',
            username: username,
            message: messageContent
        });
    }

    /**
     * provides a cold stream of incoming chat messages for components to subscribe to.
     */
    public observeIncomingChatMessages(): Observable<ChatMessage> {
        return this.chatMessageHistoryStream.asObservable();
    }

    /**
     * provides a cold stream of the current online user list for components to subscribe to.
     */
    public observeActiveUserListUpdates(): Observable<string[]> {
        return this.activeUserListStream.asObservable();
    }

    /**
     * lifecycle hook to ensure resources are released and streams are completed when the service is destroyed.
     */
    public ngOnDestroy(): void {
        this.terminateWebSocketConnection();
        this.chatMessageHistoryStream.complete();
        this.activeUserListStream.complete();
    }

    // internal helper methods

    private processIncomingWebSocketMessage(messageEvent: MessageEvent): void {
        let parsedMessageData: any;

        try {
            parsedMessageData = JSON.parse(messageEvent.data);
        } catch (jsonParsingError) {
            // silently ignore malformed non-json data from the server channel
            return;
        }

        if (parsedMessageData.type === 'chat') {
            this.notifyNewChatMessage(parsedMessageData);
        }

        if (parsedMessageData.type === 'system') {
            this.notifyNewChatMessage({
                ...parsedMessageData,
                username: 'System'
            });
        }

        if (parsedMessageData.type === 'users') {
            this.notifyActiveUserListChange(parsedMessageData.users);
        }
    }

    private notifyNewChatMessage(chatMessagePayload: any): void {
        this.chatMessageHistoryStream.next({
            id: chatMessagePayload.id,
            username: chatMessagePayload.username,
            message: chatMessagePayload.message,
            timestamp: chatMessagePayload.timestamp,
        });
    }

    private notifyActiveUserListChange(updatedUserList: string[]): void {
        this.activeUserListStream.next(updatedUserList);
    }

    private messageQueueBeforeConnectionOpen: string[] = [];

    private emitDataToWebSocketServer(dataObject: object): void {
        const dataStringPayload = JSON.stringify(dataObject);

        if (this.webSocketInstance && this.webSocketInstance.readyState === WebSocket.OPEN) {
            this.webSocketInstance.send(dataStringPayload);
        } else if (this.webSocketInstance && this.webSocketInstance.readyState === WebSocket.CONNECTING) {
            this.messageQueueBeforeConnectionOpen.push(dataStringPayload);
        }
    }

    private flushMessageQueueAfterConnection(): void {
        while (this.messageQueueBeforeConnectionOpen.length > 0) {
            const nextMessage = this.messageQueueBeforeConnectionOpen.shift();
            if (nextMessage && this.webSocketInstance && this.webSocketInstance.readyState === WebSocket.OPEN) {
                this.webSocketInstance.send(nextMessage);
            }
        }
    }

    private handleWebSocketConnectionClosure(): void {
        this.webSocketInstance = null;
    }

    private handleWebSocketCommunicationError(): void {
        this.terminateWebSocketConnection();
    }

    private terminateWebSocketConnection(): void {
        if (this.webSocketInstance) {
            this.webSocketInstance.close();
        }
    }
}
