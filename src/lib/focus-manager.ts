/**
 * Focus Manager
 * Centralized focus state management for keyboard navigation
 */

type FocusSubscriber = (focused: boolean) => void;

export class FocusManager {
  private focusStack: HTMLElement[] = [];
  private subscribers: Set<FocusSubscriber> = new Set();

  /**
   * Push a new element onto the focus stack and focus it
   */
  pushFocus(element: HTMLElement): void {
    const currentFocused = document.activeElement as HTMLElement;
    if (currentFocused && currentFocused !== document.body) {
      this.focusStack.push(currentFocused);
    }

    element.focus();
    this.notifySubscribers(true);
  }

  /**
   * Pop the last focused element and restore focus to it
   */
  popFocus(): HTMLElement | null {
    const previousElement = this.focusStack.pop();
    if (previousElement) {
      previousElement.focus();
      this.notifySubscribers(this.focusStack.length > 0);
      return previousElement;
    }
    return null;
  }

  /**
   * Clear the focus stack and blur all elements
   */
  clearFocus(): void {
    this.focusStack = [];
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      activeElement.blur();
    }
    this.notifySubscribers(false);
  }

  /**
   * Check if an input/textarea/contenteditable is currently focused
   */
  isInputActive(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    const isEditable =
      tagName === "input" ||
      tagName === "textarea" ||
      activeElement.getAttribute("contenteditable") === "true";

    return isEditable;
  }

  /**
   * Check if a modal/dialog is currently open
   */
  isModalActive(): boolean {
    const modalSelectors = [
      '[role="dialog"]',
      '[role="alertdialog"]',
      '[data-dialog]',
      '[data-dialog-open="true"]',
      ".dialog-overlay",
      '[data-state="open"]', // Radix UI dialogs
    ];

    return modalSelectors.some(
      (selector) => document.querySelector(selector) !== null
    );
  }

  /**
   * Subscribe to focus state changes
   */
  subscribe(subscriber: FocusSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  /**
   * Notify all subscribers of focus state change
   */
  private notifySubscribers(focused: boolean): void {
    this.subscribers.forEach((subscriber) => subscriber(focused));
  }

  /**
   * Get the current focus stack
   */
  getFocusStack(): readonly HTMLElement[] {
    return [...this.focusStack];
  }
}

// Singleton instance
export const focusManager = new FocusManager();
