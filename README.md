# ChatGPT Question Navigator

A Chrome Extension that adds a DeepSeek-style jump-to-question navigation menu to ChatGPT conversations.

## Features

- **Floating Navigation Menu**: Quickly access all your questions in a conversation from a convenient side menu.
- **DeepSeek-Style UI**: A modern, clean interface that stays out of your way until you need it.
- **Smart Jump-to-Question**: Click any question in the menu to smoothly scroll directly to it.
- **Visual Highlighting**: The target question is briefly highlighted when you jump to it, so you never lose your place.
- **Lazy Loading Support**: Automatically handles long conversations by loading previous messages if they aren't currently in the DOM.
- **Dynamic Scanning**: Real-time updates as you add new questions to the chat.

## Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked** and select the folder containing this extension.

## Usage

Once installed, a "Questions" button will appear in the bottom right corner of your ChatGPT interface (on `chatgpt.com` or `chat.openai.com`).

- **Click "Questions"**: Opens the navigation panel listing all user messages.
- **Click a Question**: Smoothly scrolls the page to that specific message.
- **Loading Chat**: For very long conversations, the extension may need to "Load chat" to find all questions. It will do this automatically when you first open the menu if needed.

## Compatibility

- Works on `https://chatgpt.com/*`
- Works on `https://chat.openai.com/*`

## Technical Details

- **Manifest V3**: Built using the latest Chrome Extension standards.
- **Shadow DOM**: Uses Shadow DOM to ensure the extension's styles don't conflict with ChatGPT's own CSS.
- **MutationObserver**: Efficiently tracks page changes to update the question list in real-time.
