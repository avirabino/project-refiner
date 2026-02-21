/**
 * @file messages.ts
 * @description Types for Chrome Extension messaging protocol.
 * Note: Chrome API implementations (sendMessage, onMessage) live in
 * src/background/ and src/content/ — shared/ must remain Chrome-API-free.
 */

import { MessageType } from './types';

/**
 * Base interface for all Chrome extension messages.
 */
export interface ChromeMessage<T = unknown> {
  type: MessageType;
  payload?: T;
  source?: 'popup' | 'content' | 'background';
}

/**
 * Standard response format for Chrome message handlers.
 */
export interface ChromeResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Type for a message handler function.
 * Concrete implementations live in src/background/ or src/content/ —
 * not in shared/, which must remain Chrome-API-free.
 */
export type MessageHandler<T = unknown> = (
  message: ChromeMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ChromeResponse<T>) => void
) => boolean | void;

// TODO (Sprint 01): sendMessage() and onMessage() helper implementations
// move to src/background/messaging.ts and src/content/messaging.ts
// respectively, where chrome.runtime is in scope.
