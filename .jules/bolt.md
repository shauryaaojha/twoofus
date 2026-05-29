## 2024-05-29 - O(N) Re-render Bottleneck in Zustand Lists
**Learning:** Found a severe performance bottleneck where components in long lists (like chat bubbles) were destructuring the entire Zustand store (e.g., `const { messages } = useChatStore()`). This caused *every* message in the chat history to re-render whenever *one* new message was added.
**Action:** Always use granular selectors for Zustand stores (e.g., `useChatStore(s => s.setReplyToMessage)` and compute values within the selector). Combine with `React.memo()` for list items to prevent O(N) re-render cascades.
