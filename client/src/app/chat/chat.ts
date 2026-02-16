import {
    Component,
    OnInit,
    OnDestroy,
    ViewChild,
    ElementRef,
    AfterViewChecked,
    inject,
    ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    ReactiveFormsModule,
    FormBuilder,
    FormGroup,
    Validators,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { WebSocketCommunicationService, ChatMessage } from '../websocket.service';

/**
 * Main UI component for the Resident Live Chat application.
 * Manages the display of message history, the list of online participants, and the chat entry/messaging interface.
 */
@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './chat.html',
    styleUrl: './chat.css',
})
export class ChatMessagingComponent implements OnInit, OnDestroy, AfterViewChecked {
    /** 
     * Reference to the scrollable message viewport to enable automatic scrolling to the latest message.
     */
    @ViewChild('messagesContainer')
    private messagesContainerElementReference!: ElementRef;

    public clientChatFormGroup!: FormGroup;
    public chatMessageHistory: (ChatMessage & { pending?: boolean })[] = [];
    public onlineParticipantNameList: string[] = [];
    public isUserJoinedToConversation = false;

    private isAutomaticScrollRequired = false;
    private incomingChatMessageSubscription!: Subscription;
    private activeParticipantListSubscription!: Subscription;

    private readonly formBuilder = inject(FormBuilder);
    private readonly webSocketCommunicationService = inject(WebSocketCommunicationService);
    private readonly changeDetectorReference = inject(ChangeDetectorRef);

    /**
     * Getter to retrieve the sanitized username from the form group.
     */
    public get currentAuthenticatedUsername(): string {
        return this.clientChatFormGroup?.get('username')?.value?.trim() || '';
    }

    public constructor() { }

    public ngOnInit(): void {
        this.initializeClientChatForm();
        this.establishWebSocketConnectionAndSubscriptions();
    }

    public ngOnDestroy(): void {
        this.terminateAllActiveSubscriptions();
    }

    public ngAfterViewChecked(): void {
        this.performAutomaticScrollToBottomIfRequired();
    }

    /**
     * Registers the user with the WebSocket server and grants access to the chat interface.
     */
    public joinResidentConversationalCircle(): void {
        const trimmedUsername = this.currentAuthenticatedUsername;

        if (trimmedUsername) {
            this.webSocketCommunicationService.registerUserToChatSession(trimmedUsername);
            this.isUserJoinedToConversation = true;
            this.changeDetectorReference.detectChanges();
        }
    }

    /**
     * Packages the current form message, performs an optimistic UI update, and dispatches to the server.
     */
    public dispatchNewChatMessage(): void {
        const trimmedMessageContent = this.clientChatFormGroup.get('message')?.value?.trim();
        const authenticatedUsername = this.currentAuthenticatedUsername;

        if (trimmedMessageContent && authenticatedUsername) {
            this.appendOptimisticMessageToHistory(authenticatedUsername, trimmedMessageContent);
            this.isAutomaticScrollRequired = true;
            this.changeDetectorReference.detectChanges();

            this.webSocketCommunicationService.dispatchChatMessage(authenticatedUsername, trimmedMessageContent);

            // Clear input field after successful dispatch
            this.clientChatFormGroup.get('message')?.reset();
        }
    }

    /**
     * Converts a raw numeric timestamp into a human-readable HH:MM format.
     * @param numericTimestamp - Unix timestamp in milliseconds.
     */
    public formatTimestampForDisplay(numericTimestamp: number): string {
        const dateObject = new Date(numericTimestamp);
        const hoursString = dateObject.getHours().toString().padStart(2, '0');
        const minutesString = dateObject.getMinutes().toString().padStart(2, '0');

        return `${hoursString}:${minutesString}`;
    }

    /**
     * Helper to identify if a specific message was sent by the local authenticated user.
     * @param senderUsername - The username associated with a chat message.
     */
    public isMessageSentByCurrentUser(senderUsername: string): boolean {
        return senderUsername === this.currentAuthenticatedUsername;
    }

    // ── Internal Lifecycle & Setup Helpers ──────────────────────────

    private initializeClientChatForm(): void {
        this.clientChatFormGroup = this.formBuilder.group({
            username: ['', Validators.required],
            message: ['', Validators.required],
        });
    }

    private establishWebSocketConnectionAndSubscriptions(): void {
        this.webSocketCommunicationService.initializeConnection();
        this.subscribeToIncomingChatMessages();
        this.subscribeToActiveParticipantListUpdates();
    }

    private subscribeToIncomingChatMessages(): void {
        this.incomingChatMessageSubscription = this.webSocketCommunicationService
            .observeIncomingChatMessages()
            .subscribe((newIncomingMessage: ChatMessage) => {
                this.handleIncomingChatMessage(newIncomingMessage);
            });
    }

    private subscribeToActiveParticipantListUpdates(): void {
        this.activeParticipantListSubscription = this.webSocketCommunicationService
            .observeActiveUserListUpdates()
            .subscribe((updatedParticipantList: string[]) => {
                this.handleActiveParticipantListSynchronization(updatedParticipantList);
            });
    }

    private handleIncomingChatMessage(newIncomingMessage: ChatMessage): void {
        const isIncomingMessageFromSelf = this.isMessageSentByCurrentUser(newIncomingMessage.username);

        if (isIncomingMessageFromSelf) {
            // Resolve optimistic UI: Remove the oldest pending message that matches the same content
            const indexOfMatchingPendingMessage = this.chatMessageHistory.findIndex(
                (message) => message.pending === true && message.message === newIncomingMessage.message
            );

            if (indexOfMatchingPendingMessage !== -1) {
                this.chatMessageHistory.splice(indexOfMatchingPendingMessage, 1);
            }
        }

        this.chatMessageHistory.push(newIncomingMessage);
        this.isAutomaticScrollRequired = true;
        this.changeDetectorReference.detectChanges();
    }

    private handleActiveParticipantListSynchronization(rawList: string[]): void {
        const ownUsername = this.currentAuthenticatedUsername;

        // Pin current user to the top, then sort others alphabetically
        const otherParticipants = rawList
            .filter((participantName) => participantName !== ownUsername)
            .sort((a, b) => a.localeCompare(b));

        const isLocalUserInServerList = rawList.includes(ownUsername);

        if (isLocalUserInServerList) {
            this.onlineParticipantNameList = [ownUsername, ...otherParticipants];
        } else {
            this.onlineParticipantNameList = otherParticipants;
        }

        this.changeDetectorReference.detectChanges();
    }

    private appendOptimisticMessageToHistory(username: string, content: string): void {
        const temporaryMessageId = `pending-message-${Date.now()}`;

        this.chatMessageHistory.push({
            id: temporaryMessageId,
            username: username,
            message: content,
            timestamp: Date.now(),
            pending: true,
        });
    }

    private performAutomaticScrollToBottomIfRequired(): void {
        if (this.isAutomaticScrollRequired && this.messagesContainerElementReference) {
            const viewport = this.messagesContainerElementReference.nativeElement;
            viewport.scrollTop = viewport.scrollHeight;
            this.isAutomaticScrollRequired = false;
        }
    }

    private terminateAllActiveSubscriptions(): void {
        if (this.incomingChatMessageSubscription) {
            this.incomingChatMessageSubscription.unsubscribe();
        }
        if (this.activeParticipantListSubscription) {
            this.activeParticipantListSubscription.unsubscribe();
        }
    }
}
