import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * Represents a standard chat message payload received from or sent to the server.
 */
export interface ChatMessage {
    id: string;
    username: string;
    message: string;
    timestamp: number;
}

/**
 * Service responsible for managing the low-level WebSocket connection to the backend application.
 * Handles bidirectional communication, message parsing, and state synchronization for active users.
 */
@Injectable({ providedIn: 'root' })
export class WebSocketCommunicationService implements OnDestroy {
    private webSocketInstance: WebSocket | null = null;
    private chatMessageHistoryStream = new Subject<ChatMessage>();
    private activeUserListStream = new Subject<string[]>();

    /**
     * Establishes a connection to the primary WebSocket server.
     * Configures event listeners for incoming messages, connection closure, and error handling.
     */
    public initializeConnection(): void {
        if (this.webSocketInstance) {
            return;
        }

        // Deployment note: This URL should eventually be derived from environment configuration.
        this.webSocketInstance = new WebSocket('ws://localhost:3000');

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
     * Sends a join request to the server to register the current user in the active session.
     * @param username - The unique identifier chosen by the resident.
     */
    public registerUserToChatSession(username: string): void {
        this.emitDataToWebSocketServer({
            type: 'join',
            username: username
        });
    }

    /**
     * Packages and sends a user message to the broadcast channel.
     * @param username - The sender's identity label.
     * @param messageContent - The raw text content of the message.
     */
    public dispatchChatMessage(username: string, messageContent: string): void {
        this.emitDataToWebSocketServer({
            type: 'chat',
            username: username,
            message: messageContent
        });
    }

    /**
     * Provides a cold stream of incoming chat messages for components to subscribe to.
     */
    public observeIncomingChatMessages(): Observable<ChatMessage> {
        return this.chatMessageHistoryStream.asObservable();
    }

    /**
     * Provides a cold stream of the current online user list for components to subscribe to.
     */
    public observeActiveUserListUpdates(): Observable<string[]> {
        return this.activeUserListStream.asObservable();
    }

    /**
     * Lifecycle hook to ensure resources are released and streams are completed when the service is destroyed.
     */
    public ngOnDestroy(): void {
        this.terminateWebSocketConnection();
        this.chatMessageHistoryStream.complete();
        this.activeUserListStream.complete();
    }

    // ── Internal Helper Methods ─────────────────────────────────────

    private processIncomingWebSocketMessage(messageEvent: MessageEvent): void {
        let parsedMessageData: any;

        try {
            parsedMessageData = JSON.parse(messageEvent.data);
        } catch (jsonParsingError) {
            // Silently ignore malformed non-JSON data from the server channel
            return;
        }

        if (parsedMessageData.type === 'chat') {
            this.notifyNewChatMessage(parsedMessageData);
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

    private emitDataToWebSocketServer(dataObject: object): void {
        const isConnectionEstablished = this.webSocketInstance &&
            this.webSocketInstance.readyState === WebSocket.OPEN;

        if (isConnectionEstablished) {
            const dataStringPayload = JSON.stringify(dataObject);
            this.webSocketInstance!.send(dataStringPayload);
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
