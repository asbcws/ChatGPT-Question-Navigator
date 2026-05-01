(() => {
  const EXT_ID = "chatgpt-question-navigator-root";

  const SELECTORS = {
    userMessage: '[data-message-author-role="user"]'
  };

  const state = {
    questions: [],
    isOpen: false,
    scanTimer: null,
    observer: null
  };

  function cleanText(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function makeId(text, index) {
    let hash = 5381;

    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) + hash) + text.charCodeAt(i);
      hash |= 0;
    }

    return `cgnav-${index}-${Math.abs(hash).toString(36)}`;
  }

  function previewText(text, maxLength = 90) {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "…";
  }

  function findUserQuestions() {
    const nodes = Array.from(document.querySelectorAll(SELECTORS.userMessage));

    return nodes
      .map((node, index) => {
        // Only read the actual user message bubble.
        // Ignore quoted/referenced ChatGPT text above the bubble.
        const bubble = node.querySelector(".user-message-bubble-color");

        if (!bubble) return null;

        const textBlock =
          bubble.querySelector(".whitespace-pre-wrap") ||
          bubble;

        const text = cleanText(textBlock.innerText || textBlock.textContent || "");

        if (!text) return null;

        const id = makeId(text, index);
        const messageId = node.getAttribute("data-message-id") || id;

        node.dataset.cgnavQuestionId = id;

        return {
          id,
          messageId,
          index: index + 1,
          text,
          preview: previewText(text),
          element: node
        };
      })
      .filter(Boolean);
  }

  function sleep(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  function isDocumentScroller(scroller) {
    return (
      scroller === document.scrollingElement ||
      scroller === document.documentElement ||
      scroller === document.body
    );
  }

  function getScrollerTop(scroller) {
    if (isDocumentScroller(scroller)) {
      return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    }

    return scroller.scrollTop;
  }

  function getScrollerHeight(scroller) {
    if (isDocumentScroller(scroller)) {
      return Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0
      );
    }

    return scroller.scrollHeight;
  }

  function scrollScrollerToTop(scroller) {
    if (isDocumentScroller(scroller)) {
      window.scrollTo({ top: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      return;
    }

    scroller.scrollTo({ top: 0, behavior: "auto" });
  }

  function findChatScroller() {
    const message =
      document.querySelector(SELECTORS.userMessage) ||
      document.querySelector("main") ||
      document.body;

    let parent = message ? message.parentElement : null;

    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;

      const isScrollable =
        /auto|scroll|overlay/.test(overflowY) &&
        parent.scrollHeight > parent.clientHeight + 100;

      if (isScrollable) {
        return parent;
      }

      parent = parent.parentElement;
    }

    const candidates = Array.from(document.querySelectorAll("main, [role='main'], div"))
      .filter(el => el.scrollHeight > el.clientHeight + 300)
      .sort((a, b) => b.scrollHeight - a.scrollHeight);

    return candidates[0] || document.scrollingElement || document.documentElement;
  }

  async function loadConversationFromBeginning() {
    const scroller = findChatScroller();

    let stableRounds = 0;
    let previousHeight = -1;
    let previousQuestionCount = -1;

    const maxAttempts = 40;

    for (let attempt = 0; attempt < maxAttempts && stableRounds < 4; attempt++) {
      scrollScrollerToTop(scroller);

      await sleep(attempt < 5 ? 800 : 500);

      const currentHeight = getScrollerHeight(scroller);
      const currentTop = getScrollerTop(scroller);
      const currentQuestionCount = findUserQuestions().length;

      const appearsStable =
        currentTop <= 5 &&
        currentHeight === previousHeight &&
        currentQuestionCount === previousQuestionCount;

      if (appearsStable) {
        stableRounds += 1;
      } else {
        stableRounds = 0;
      }

      previousHeight = currentHeight;
      previousQuestionCount = currentQuestionCount;
    }

    scanAndRender();
  }

  function cgnavSleep(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }

  function cgnavChatKey() {
    return "cgnav-full-loaded:" + location.origin + location.pathname;
  }

  function cgnavIsCurrentChatMarkedFullyLoaded() {
    return sessionStorage.getItem(cgnavChatKey()) === "1";
  }

  function cgnavMarkCurrentChatFullyLoaded() {
    sessionStorage.setItem(cgnavChatKey(), "1");
  }

  function cgnavIsDocumentScroller(scroller) {
    return (
      scroller === document.scrollingElement ||
      scroller === document.documentElement ||
      scroller === document.body
    );
  }

  function cgnavGetScrollerTop(scroller) {
    if (cgnavIsDocumentScroller(scroller)) {
      return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    }

    return scroller.scrollTop;
  }

  function cgnavGetScrollerHeight(scroller) {
    if (cgnavIsDocumentScroller(scroller)) {
      return Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0
      );
    }

    return scroller.scrollHeight;
  }

  function cgnavGetScrollerClientHeight(scroller) {
    if (cgnavIsDocumentScroller(scroller)) {
      return window.innerHeight;
    }

    return scroller.clientHeight;
  }

  function cgnavScrollScrollerToTop(scroller) {
    if (cgnavIsDocumentScroller(scroller)) {
      window.scrollTo({ top: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      return;
    }

    scroller.scrollTo({ top: 0, behavior: "auto" });
  }

  function cgnavScrollBy(scroller, deltaY) {
    if (cgnavIsDocumentScroller(scroller)) {
      window.scrollBy({ top: deltaY, behavior: "auto" });
      return;
    }

    scroller.scrollTop += deltaY;
  }

  function cgnavFindChatScroller() {
    const message =
      document.querySelector(SELECTORS.userMessage) ||
      document.querySelector("main") ||
      document.body;

    let parent = message ? message.parentElement : null;

    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;

      const isScrollable =
        /auto|scroll|overlay/.test(overflowY) &&
        parent.scrollHeight > parent.clientHeight + 100;

      if (isScrollable) {
        return parent;
      }

      parent = parent.parentElement;
    }

    const candidates = Array.from(document.querySelectorAll("main, [role='main'], div"))
      .filter(el => el.scrollHeight > el.clientHeight + 300)
      .sort((a, b) => b.scrollHeight - a.scrollHeight);

    return candidates[0] || document.scrollingElement || document.documentElement;
  }

  function cgnavRememberViewportAnchor() {
    const x = Math.floor(window.innerWidth / 2);
    const y = Math.floor(window.innerHeight / 2);
    const element = document.elementFromPoint(x, y);

    if (!element) return null;

    return {
      element,
      top: element.getBoundingClientRect().top
    };
  }

  function cgnavRestoreViewportAnchor(anchor, scroller) {
    if (!anchor || !anchor.element || !document.contains(anchor.element)) return;

    const newTop = anchor.element.getBoundingClientRect().top;
    const delta = newTop - anchor.top;

    if (Math.abs(delta) > 1) {
      cgnavScrollBy(scroller, delta);
    }
  }

  async function cgnavLoadFullChatIfNeeded() {
    if (cgnavIsCurrentChatMarkedFullyLoaded()) {
      return false;
    }

    const scroller = cgnavFindChatScroller();

    const scrollerHeight = cgnavGetScrollerHeight(scroller);
    const clientHeight = cgnavGetScrollerClientHeight(scroller);

    // Very short chats are already fully present.
    if (scrollerHeight <= clientHeight + 80) {
      cgnavMarkCurrentChatFullyLoaded();
      scanAndRender();
      return false;
    }

    const anchor = cgnavRememberViewportAnchor();

    let stableRounds = 0;
    let previousHeight = -1;
    let previousQuestionCount = -1;

    const maxAttempts = 40;

    for (let attempt = 0; attempt < maxAttempts && stableRounds < 4; attempt++) {
      cgnavScrollScrollerToTop(scroller);

      await cgnavSleep(attempt < 5 ? 800 : 500);

      const currentTop = cgnavGetScrollerTop(scroller);
      const currentHeight = cgnavGetScrollerHeight(scroller);
      const currentQuestionCount = findUserQuestions().length;

      const stable =
        currentTop <= 5 &&
        currentHeight === previousHeight &&
        currentQuestionCount === previousQuestionCount;

      if (stable) {
        stableRounds += 1;
      } else {
        stableRounds = 0;
      }

      previousHeight = currentHeight;
      previousQuestionCount = currentQuestionCount;
    }

    if (stableRounds >= 4) {
      cgnavMarkCurrentChatFullyLoaded();
    }

    scanAndRender();

    // Try to return the user to approximately where they were before loading.
    cgnavRestoreViewportAnchor(anchor, scroller);

    return true;
  }

  function ensureRoot() {
    let host = document.getElementById(EXT_ID);

    if (host) return host.shadowRoot;

    host = document.createElement("div");
    host.id = EXT_ID;

    const shadow = host.attachShadow({ mode: "open" });

    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .cgnav {
          position: fixed;
          right: 20px;
          bottom: 92px;
          z-index: 2147483647;
        }

        .cgnav-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(32, 33, 35, 0.96);
          color: #f4f4f5;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(10px);
        }

        .cgnav-button:hover {
          background: rgba(52, 53, 65, 0.98);
        }

        .cgnav-count {
          display: inline-flex;
          min-width: 18px;
          height: 18px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.15);
          font-size: 11px;
        }

        .cgnav-panel {
          position: absolute;
          right: 0;
          bottom: 44px;
          width: min(420px, calc(100vw - 40px));
          max-height: min(520px, calc(100vh - 180px));
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(32, 33, 35, 0.98);
          color: #f4f4f5;
          border-radius: 16px;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.38);
          backdrop-filter: blur(12px);
        }

        .cgnav-panel[hidden] {
          display: none;
        }

        .cgnav-header {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.11);
        }

        .cgnav-title {
          font-size: 13px;
          font-weight: 650;
        }

        .cgnav-subtitle {
          font-size: 11px;
          color: rgba(244, 244, 245, 0.66);
          margin-top: 2px;
        }

        .cgnav-list {
          overflow-y: auto;
          max-height: 456px;
          padding: 6px;
        }

        .cgnav-item {
          width: 100%;
          text-align: left;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          border-radius: 10px;
          padding: 9px 10px;
          display: grid;
          grid-template-columns: 28px 1fr;
          gap: 8px;
          align-items: start;
          font: inherit;
        }

        .cgnav-item:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .cgnav-number {
          color: rgba(244, 244, 245, 0.52);
          font-size: 12px;
          padding-top: 1px;
        }

        .cgnav-text {
          font-size: 13px;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .cgnav-empty {
          padding: 18px 14px;
          color: rgba(244, 244, 245, 0.66);
          font-size: 13px;
          line-height: 1.4;
        }
      </style>

      <div class="cgnav">
        <button class="cgnav-button" type="button" aria-expanded="false">
          <span>Questions</span>
          <span class="cgnav-count">0</span>
        </button>

        <section class="cgnav-panel" hidden>
          <div class="cgnav-header">
            <div class="cgnav-title">Conversation questions</div>
            <div class="cgnav-subtitle">Click a prompt to jump to it</div>
          </div>
          <div class="cgnav-list"></div>
        </section>
      </div>
    `;

    document.documentElement.appendChild(host);

    const button = shadow.querySelector(".cgnav-button");
    const panel = shadow.querySelector(".cgnav-panel");

    button.addEventListener("click", async () => {
      if (button.dataset.loading === "true") return;

      const label = Array.from(button.querySelectorAll("span"))
        .find(span => !span.classList.contains("cgnav-count"));

      // Only attempt the expensive full-chat load if this chat has not
      // already been marked as fully loaded in this browser tab.
      if (!state.isOpen && !cgnavIsCurrentChatMarkedFullyLoaded()) {
        button.dataset.loading = "true";
        button.disabled = true;

        const oldLabel = label ? label.textContent : "";

        if (label) label.textContent = "Loading chat";

        try {
          await cgnavLoadFullChatIfNeeded();
        } finally {
          if (label) label.textContent = oldLabel || "Questions";
          button.disabled = false;
          button.dataset.loading = "false";
        }
      }

      state.isOpen = !state.isOpen;
      panel.hidden = !state.isOpen;
      button.setAttribute("aria-expanded", String(state.isOpen));
      render();

      if (state.isOpen) {
        window.setTimeout(() => {
          const list = shadow.querySelector(".cgnav-list");
          if (list) list.scrollTop = list.scrollHeight;
        }, 0);
      }
    });

    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && state.isOpen) {
        state.isOpen = false;
        panel.hidden = true;
        button.setAttribute("aria-expanded", "false");
      }
    });

    return shadow;
  }

  function highlightElement(element) {
    const oldOutline = element.style.outline;
    const oldOutlineOffset = element.style.outlineOffset;
    const oldBorderRadius = element.style.borderRadius;

    element.style.outline = "2px solid rgba(16, 163, 127, 0.95)";
    element.style.outlineOffset = "6px";
    element.style.borderRadius = "12px";

    window.setTimeout(() => {
      element.style.outline = oldOutline;
      element.style.outlineOffset = oldOutlineOffset;
      element.style.borderRadius = oldBorderRadius;
    }, 1600);
  }

  function getScrollParent(element) {
    let parent = element.parentElement;

    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;

      const canScroll =
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        parent.scrollHeight > parent.clientHeight;

      if (canScroll) {
        return parent;
      }

      parent = parent.parentElement;
    }

    return document.scrollingElement || document.documentElement;
  }

  function scrollToQuestion(question) {
    function isDocumentScroller(scroller) {
      return (
        scroller === document.scrollingElement ||
        scroller === document.documentElement ||
        scroller === document.body
      );
    }

    function getScrollParent(element) {
      let parent = element.parentElement;

      while (parent) {
        const style = window.getComputedStyle(parent);
        const overflowY = style.overflowY;

        const canScroll =
          /auto|scroll|overlay/.test(overflowY) &&
          parent.scrollHeight > parent.clientHeight + 80;

        if (canScroll) {
          return parent;
        }

        parent = parent.parentElement;
      }

      return document.scrollingElement || document.documentElement;
    }

    function queryByMessageId(messageId) {
      if (!messageId) return null;

      try {
        return document.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
      } catch {
        return document.querySelector(`[data-message-id="${messageId}"]`);
      }
    }

    const targetTurn =
      queryByMessageId(question.messageId) ||
      document.querySelector(`[data-cgnav-question-id="${question.id}"]`) ||
      question.element;

    if (!targetTurn) return;

    // Scroll to the visible user bubble, not the whole surrounding turn.
    const target =
      targetTurn.querySelector(".user-message-bubble-color") ||
      targetTurn;

    const scroller = getScrollParent(target);
    const offset = 88;

    function align(behavior) {
      const targetRect = target.getBoundingClientRect();

      if (isDocumentScroller(scroller)) {
        const top = targetRect.top + window.scrollY - offset;

        window.scrollTo({
          top: Math.max(0, top),
          behavior
        });

        return;
      }

      const scrollerRect = scroller.getBoundingClientRect();

      const top =
        scroller.scrollTop +
        targetRect.top -
        scrollerRect.top -
        offset;

      scroller.scrollTo({
        top: Math.max(0, top),
        behavior
      });
    }

    align("smooth");

    // ChatGPT often shifts layout just after lazy-loading old messages.
    // These extra alignments pin the chosen question once layout settles.
    window.setTimeout(() => align("auto"), 160);
    window.setTimeout(() => align("auto"), 450);
    window.setTimeout(() => align("auto"), 900);

    highlightElement(target);
  }

  function render() {
    const shadow = ensureRoot();
    const count = shadow.querySelector(".cgnav-count");
    const list = shadow.querySelector(".cgnav-list");

    count.textContent = String(state.questions.length);
    list.innerHTML = "";

    if (!state.questions.length) {
      const empty = document.createElement("div");
      empty.className = "cgnav-empty";
      empty.textContent = "No user questions found in this conversation yet.";
      list.appendChild(empty);
      return;
    }

    for (const question of state.questions) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "cgnav-item";
      item.title = question.text;

      const number = document.createElement("span");
      number.className = "cgnav-number";
      number.textContent = String(question.index);

      const text = document.createElement("span");
      text.className = "cgnav-text";
      text.textContent = question.preview;

      item.append(number, text);

      item.addEventListener("click", () => {
        state.isOpen = false;

        const panel = shadow.querySelector(".cgnav-panel");
        const button = shadow.querySelector(".cgnav-button");

        panel.hidden = true;
        button.setAttribute("aria-expanded", "false");

        scrollToQuestion(question);
      });

      list.appendChild(item);
    }

    if (state.isOpen) {
      window.setTimeout(() => {
        list.scrollTop = list.scrollHeight;
      }, 0);
    }
  }

  function scanAndRender() {
    const nextQuestions = findUserQuestions();

    const oldSignature = state.questions.map(q => q.id).join("|");
    const newSignature = nextQuestions.map(q => q.id).join("|");

    if (oldSignature !== newSignature) {
      state.questions = nextQuestions;
      render();
    }
  }

  function scheduleScan() {
    window.clearTimeout(state.scanTimer);
    state.scanTimer = window.setTimeout(scanAndRender, 250);
  }

  function startObserver() {
    if (state.observer) return;

    state.observer = new MutationObserver(scheduleScan);

    state.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function init() {
    ensureRoot();
    scanAndRender();
    startObserver();

    let lastUrl = location.href;

    window.setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        state.questions = [];
        scheduleScan();
      }
    }, 700);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
