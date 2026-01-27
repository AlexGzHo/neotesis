# Chat PDF Layout Improvement Plan

## Overview
Rediseñar el layout del chat PDF con una estructura de 3 columnas, diseño responsive y lógica de guardado mejorada.

## Layout Specifications

### 3-Column Layout (25% | 35% | 40%)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Chat History    │    Live Chat with AI    │       PDF Viewer              │
│   (25% - 250px)  │     (35% - 350px)       │       (40% - 400px)           │
│                  │                         │                               │
│  ┌─────────────┐ │  ┌───────────────────┐  │  ┌─────────────────────┐     │
│  │ New Chat    │ │  │ Messages Area     │  │  │ PDF Header          │     │
│  │ ─────────── │ │  │                   │  │  │ ─────────────────   │     │
│  │ Chat 1      │ │  │ [User msg]        │  │  │                     │     │
│  │ Chat 2      │ │  │                   │  │  │ [PDF Canvas]        │     │
│  │ Chat 3      │ │  │ [AI msg]          │  │  │                     │     │
│  │ ...         │ │  │                   │  │  │ [Navigation]        │     │
│  │             │ │  │                   │  │  └─────────────────────┘     │
│  │             │ │  │                   │  │                               │
│  └─────────────┘ │  └───────────────────┘  │                               │
│                  │                         │                               │
│                  │  ┌───────────────────┐  │                               │
│                  │  │ Input Area        │  │                               │
│                  │  └───────────────────┘  │                               │
│                  │                         │                               │
└──────────────────┴─────────────────────────┴───────────────────────────────┘
```

### Column Details

1. **Chat History Sidebar (25% - 250px min-width: 200px)**
   - Collapsible button on mobile
   - New chat button at top
   - Scrollable list of saved chats
   - Shows chat title and date
   - Active state indicator
   - Hover effects for better UX

2. **Live Chat Area (35% - 350px)**
   - Messages container with proper scroll
   - Message bubbles with clear distinction
   - PDF reference highlights
   - Input area with send button
   - Character count indicator
   - Quote threshold warning

3. **PDF Viewer (40% - 400px)**
   - PDF header with upload button
   - Canvas for PDF rendering
   - Navigation controls (prev/next page)
   - Zoom controls (100%, +/-, fit to width)
   - Page info display
   - Loading states

## Responsive Breakpoints

### Desktop (>1200px)
- 3-column layout: 25% | 35% | 40%
- All panels visible simultaneously
- Sidebar always expanded

### Laptop (992px - 1200px)
- 3-column layout with adjusted percentages
- 20% | 40% | 40%
- Sidebar collapsible on click

### Tablet (768px - 992px)
- 2-column layout: Sidebar | Main Content
- PDF viewer becomes a modal or toggle
- Chat and PDF share the main area

### Mobile (<768px)
- Single column layout
- Bottom navigation or tabs
- Collapsible sidebar from left
- PDF viewer modal toggle

## Text Size Improvements

### Current vs Improved Sizes

| Element | Current | Improved |
|---------|---------|----------|
| Chat messages | 0.9rem | 1rem (16px) |
| Message content | 0.9rem | 1rem (16px) |
| User message | 0.9rem | 1rem (16px) |
| AI response | 0.9rem | 1rem (16px) |
| PDF references | 0.8rem | 0.9rem (14.4px) |
| Chat input | 0.9rem | 1rem (16px) |
| Chat history items | 0.9rem | 0.95rem (15.2px) |
| Chat dates | 0.75rem | 0.85rem (13.6px) |
| Section headers | 2.5rem | 2rem |
| Quota text | 0.85rem | 0.9rem |

### Typography Hierarchy
- **Headings**: Inter 700, tight letter-spacing
- **Body**: Inter 400, 1.5 line-height
- **Chat messages**: Inter 500 for names, 400 for content
- **Metadata**: Inter 600, smaller sizes

## Chat Saving Logic Improvements

### Current Behavior
- Chat created immediately when "New Chat" clicked
- Messages saved individually after sending
- Empty chats persist in database

### New Behavior
- **Defer chat creation** until first AI response
- **Use temporary storage** for user messages
- **Auto-save** only after successful AI response
- **Auto-delete** or mark as incomplete if no AI response

### Implementation Details

```javascript
// State variables
let pendingUserMessages = [];  // Store user messages temporarily
let hasAIResponded = false;    // Track if AI has responded
let currentChatId = null;      // Current chat ID (null until AI responds)

// When user sends message
async function sendMessage() {
  const userMessage = document.getElementById('userInput').value;
  
  // Add to pending messages (don't save to DB yet)
  pendingUserMessages.push({ role: 'user', content: userMessage });
  
  // Display user message in UI
  displayUserMessage(userMessage);
  
  try {
    // Call AI API
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: pendingUserMessages })
    });
    
    const aiResponse = await response.json();
    
    // Only NOW create chat and save all messages
    if (!currentChatId) {
      currentChatId = await createChat(aiResponse.title);
    }
    
    // Save all messages (user + AI) to database
    for (const msg of pendingUserMessages) {
      await saveChatMessage(currentChatId, msg.role, msg.content);
    }
    await saveChatMessage(currentChatId, 'assistant', aiResponse.content);
    
    // Clear pending messages
    pendingUserMessages = [];
    hasAIResponded = true;
    
    // Display AI response
    displayAIMessage(aiResponse.content);
    
  } catch (error) {
    // Handle error - messages remain in pending
    console.error('Error:', error);
  }
}
```

### Edge Cases
1. **User refreshes page before AI responds**: Messages lost (acceptable)
2. **AI error**: Messages remain in pending, user can retry
3. **User creates multiple chats without AI response**: Only one pending set

## File Changes Required

### 1. index.html
- Restructure `#ai-chat` section for 3 columns
- Add new sidebar container for chat history
- Reorder: History | Chat | PDF
- Add responsive toggle buttons
- Improve accessibility attributes

### 2. styles.css
- Add `.three-column-layout` class
- Define column widths and flex properties
- Create responsive breakpoints
- Update text sizes throughout
- Add collapsible sidebar styles
- Improve scrollbar styling
- Add loading and error states

### 3. scripts.js
- Modify `createNewChat()` to defer creation
- Update `sendMessage()` to use pending messages
- Change `saveChatMessage()` to only save after AI response
- Add `hasAIResponded` flag tracking
- Update `loadChatList()` for new UI
- Add sidebar toggle functionality
- Implement responsive breakpoint handlers

## Implementation Steps

### Step 1: HTML Structure
```html
<section id="ai-chat" class="page-section">
  <div class="container">
    <div class="section-header">
      <h2>Neotesis IA - Chat con PDF</h2>
      <p>Potenciado por Llama 3.3. Análisis inteligente con referencias visuales.</p>
    </div>

    <div class="pdf-chat-layout three-column">
      <!-- Column 1: Chat History Sidebar -->
      <div class="chat-history-sidebar" id="chatHistorySidebar">
        <div class="sidebar-header">
          <h4><i class="fas fa-history"></i> Mis Chats</h4>
          <button class="btn btn-secondary" onclick="createNewChat()">
            <i class="fas fa-plus"></i> Nuevo
          </button>
        </div>
        <div id="chatList" class="chat-list">
          <!-- Chat items loaded here -->
        </div>
      </div>

      <!-- Column 2: Chat Panel -->
      <div class="chat-panel-main">
        <div class="quota-monitor" id="quotaMonitor">
          <!-- Quota info -->
        </div>

        <div id="authNotification" class="auth-notification">
          <!-- Auth notification -->
        </div>

        <div class="chat-messages" id="chatMessages">
          <!-- Messages loaded here -->
        </div>

        <div class="chat-input-area">
          <div class="input-container">
            <input type="text" id="userInput" class="form-control"
                   placeholder="Escribe tu pregunta sobre el PDF..."
                   onkeypress="handleEnter(event)">
            <button class="send-btn" id="chatSendBtn" onclick="sendMessage()">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
          <div class="input-hint">
            <small>Presiona Enter para enviar</small>
          </div>
        </div>
      </div>

      <!-- Column 3: PDF Viewer -->
      <div class="pdf-viewer-panel">
        <div class="pdf-header">
          <div class="pdf-controls">
            <input type="file" id="pdfInput" accept="application/pdf" style="display: none;"
                   onchange="handlePdfUpload(this)">
            <label for="pdfInput" class="pdf-upload-btn">
              <i class="fas fa-file-pdf"></i> Subir PDF
            </label>
            <div id="pdfStatus" class="pdf-status">
              <i class="fas fa-info-circle"></i> Sube un documento
            </div>
          </div>
        </div>

        <div class="pdf-viewer-container">
          <div id="pdfViewer" class="pdf-viewer">
            <div class="pdf-placeholder">
              <i class="fas fa-file-pdf fa-4x"></i>
              <p>Sube un PDF para visualizarlo</p>
            </div>
          </div>

          <div id="pdfControls" class="pdf-navigation" style="display: none;">
            <button id="prevPage" class="nav-btn" onclick="changePage(-1)">
              <i class="fas fa-chevron-left"></i>
            </button>
            <span id="pageInfo">Página <span id="currentPage">1</span> de <span id="totalPages">1</span></span>
            <button id="nextPage" class="nav-btn" onclick="changePage(1)">
              <i class="fas fa-chevron-right"></i>
            </button>
            <div class="zoom-controls">
              <button class="zoom-btn" onclick="zoomPDF(-0.25)">
                <i class="fas fa-search-minus"></i>
              </button>
              <span id="zoomLevel">100%</span>
              <button class="zoom-btn" onclick="zoomPDF(0.25)">
                <i class="fas fa-search-plus"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
```

### Step 2: CSS Styles
```css
/* Three Column Layout */
.three-column-layout {
  display: grid;
  grid-template-columns: 250px 1fr 1fr;
  gap: 0;
  height: 700px;
  background: var(--white);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border);
}

/* Chat History Sidebar */
.chat-history-sidebar {
  background: var(--bg-light);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  min-width: 200px;
  max-width: 300px;
}

.sidebar-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

/* Chat Panel Main */
.chat-panel-main {
  display: flex;
  flex-direction: column;
  background: var(--white);
  border-right: 1px solid var(--border);
  min-width: 0;
}

/* PDF Viewer Panel */
.pdf-viewer-panel {
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  min-width: 0;
}

/* Responsive */
@media (max-width: 1200px) {
  .three-column-layout {
    grid-template-columns: 220px 1fr 1fr;
  }
}

@media (max-width: 992px) {
  .three-column-layout {
    grid-template-columns: 1fr;
    height: auto;
  }

  .chat-history-sidebar {
    max-width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border);
    height: auto;
    max-height: 300px;
  }

  .chat-panel-main,
  .pdf-viewer-panel {
    height: 500px;
  }
}

@media (max-width: 768px) {
  .three-column-layout {
    height: auto;
  }

  .chat-panel-main,
  .pdf-viewer-panel {
    height: 400px;
  }
}

/* Text Size Improvements */
.msg-content {
  font-size: 1rem;
  line-height: 1.6;
  padding: 1rem 1.25rem;
}

.pdf-reference {
  font-size: 0.9rem;
  padding: 0.75rem;
}

.chat-item-title {
  font-size: 0.95rem;
}

.chat-item-date {
  font-size: 0.85rem;
}
```

### Step 3: JavaScript Logic
```javascript
// Modified state
let pendingUserMessages = [];
let hasAIResponded = false;
let currentChatId = null;

// Modified sendMessage function
async function sendMessage() {
  // Validation
  const rawMsg = document.getElementById('userInput').value;
  const validation = validateChatMessage(rawMsg);
  if (!validation.valid) {
    alert(validation.error);
    return;
  }

  const msg = validation.sanitized;
  document.getElementById('userInput').value = "";

  // Add to pending (not saved yet)
  pendingUserMessages.push({ role: "user", content: msg });

  // Display user message
  displayUserMessage(msg);

  try {
    const res = await secureFetch("/api/chat", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        messages: pendingUserMessages,
        pdfContext: pdfContextForAI || pdfText
      })
    });

    const responseData = await res.json();
    const rawReply = responseData.choices[0].message.content;

    // Only NOW create chat and save messages (after AI response)
    if (!currentChatId) {
      currentChatId = await createChat(rawReply.substring(0, 50));
    }

    // Save all pending user messages
    for (const pendingMsg of pendingUserMessages) {
      await saveChatMessage(currentChatId, pendingMsg.role, pendingMsg.content);
    }

    // Save AI response
    await saveChatMessage(currentChatId, 'assistant', rawReply);

    // Clear pending
    pendingUserMessages = [];
    hasAIResponded = true;

    // Display AI response
    displayAIMessage(rawReply);

    // Update quota and reload chat list
    updateQuotaUI();
    await loadChatList();

  } catch (e) {
    console.error("Chat Error:", e);
    displayErrorMessage(e.message);
  }
}

// Auto-generate title from first message
function generateChatTitle(messages) {
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (!firstUserMsg) return 'Nuevo Chat';

  const title = firstUserMsg.content.substring(0, 40);
  return title.length < firstUserMsg.content.length ? title + '...' : title;
}
```

## Testing Checklist

- [ ] 3-column layout displays correctly on desktop
- [ ] Collapsible sidebar works on tablet
- [ ] Single column layout on mobile
- [ ] Chat history loads and displays properly
- [ ] New chat button creates new chat
- [ ] Messages display correctly in chat area
- [ ] PDF viewer renders PDFs correctly
- [ ] PDF navigation works (prev/next page)
- [ ] Zoom controls function properly
- [ ] Text sizes are readable on all devices
- [ ] Chat only saves after AI response
- [ ] Pending messages work correctly
- [ ] Empty chats are not created
- [ ] Responsive breakpoints work
- [ ] Loading states display properly
- [ ] Error handling works correctly

## Estimated Files to Modify

1. **index.html** - ~80 lines changed (restructure layout)
2. **styles.css** - ~150 lines added/updated (new styles + responsive)
3. **scripts.js** - ~60 lines changed (chat saving logic)

## Timeline

This implementation can be completed in approximately 2-3 hours of coding work, depending on testing requirements.
