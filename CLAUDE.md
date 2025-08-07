# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TeleScribe Assist (テレ・スクライブ・アシスト) is a single-page web application that assists in creating telephone call response reports for business communication. The application helps users efficiently compose structured reports by organizing information into variables and segments.

## Architecture

This is a **modular React application** built without a build system, with two deployment options:

### Modular Version (`index.html` + `src/`)
- **Entry Point**: `index.html` loads modular JavaScript files
- Uses React 18 via CDN (production build)
- Babel standalone for JSX transformation
- Tailwind CSS for styling
- SortableJS for drag-and-drop functionality
- Modular file structure with organized components, utilities, and services

### Single-File Version (`telescribe-assist.html`)
- Legacy single-file version with all code inline
- Self-contained HTML file for easy distribution

### Module Organization
- **Components** (`src/components/`): React components (App, SegmentItem, VariableModal, VariableInput)
- **Utilities** (`src/utils/`): Helper functions and date utilities
- **Services** (`src/services/`): Data persistence and management
- **Hooks** (`src/hooks/`): Custom React hooks (localStorage, drag-drop, undo/redo)
- **Data** (`src/data/`): Constants and sample data
- **Styles** (`src/styles/`): CSS styling

## Key Features & State Management

### Core State Structure
- `variables` - Array of variable objects (name, type, value, format, rounding settings)
- `segments` - Array of text segments that compose the report
- `sessionHistory` - Array of saved report sessions
- `undoStack`/`redoStack` - For undo/redo functionality
- `templates` - Template data for segments and blocks
- `inputHistory` - Input history for autocomplete

### Variable System
- **Text Variables**: Simple text input fields
- **Time Variables**: Complex time input with:
  - Custom format strings (YYYY, MM, DD, HH, mm, ss)
  - Rounding settings (floor/ceil/round by minute intervals)
  - Split input fields for each time component

### Segment System
- Draggable text segments using SortableJS
- Real-time preview with variable interpolation
- Template replacement using `{{variableName}}` syntax
- Bidirectional data binding between preview and segments

### Data Persistence
- All data is stored in `localStorage` under key `telescribeAssistData`
- Auto-saves on every state change
- Import/export functionality for JSON backups

## Development Workflow

### Running the Application
For the **modular version** (recommended for development):
```bash
# Serve locally for development
python -m http.server 8000
# Then visit http://localhost:8000/index.html
```

For the **single-file version**:
```bash
# Open in default browser (Windows)
start telescribe-assist.html

# Or serve locally
python -m http.server 8000
# Then visit http://localhost:8000/telescribe-assist.html
```

### Key Development Patterns

#### State Updates
The application uses React hooks extensively:
- `useState` for component state
- `useEffect` for side effects and data persistence
- `useCallback` for memoized event handlers
- `useMemo` and `memo` for performance optimization

#### Performance Optimizations
- Components are memoized where appropriate (`SegmentItem`)
- Event handlers are memoized with `useCallback`
- Debounced input updates (300ms) for text segments
- Limited undo history (50 operations)

#### Data Flow
1. User input → State update → localStorage save
2. Variable changes → Real-time preview update
3. Segment changes → Debounced state update → Preview refresh
4. Preview edits → Segment array reconstruction

## File Structure

```
tele-scribe-assist2/
├── index.html                    # Modular version entry point
├── src/
│   ├── components/
│   │   ├── App.jsx              # Main application container
│   │   ├── SegmentItem.jsx      # Individual text segment component
│   │   ├── VariableInput.jsx    # Variable input component
│   │   └── VariableModal.jsx    # Modal for adding variables
│   ├── hooks/
│   │   ├── useDragDrop.js       # Drag and drop functionality
│   │   ├── useLocalStorage.js   # localStorage persistence
│   │   └── useUndoRedo.js       # Undo/redo state management
│   ├── services/
│   │   └── dataService.js       # Data management service
│   ├── utils/
│   │   ├── dateUtils.js         # Date formatting and manipulation
│   │   └── helpers.js           # General utility functions
│   ├── data/
│   │   └── constants.js         # Application constants and sample data
│   └── styles/
│       └── index.css            # Custom CSS styles
└── docs/
    └── 仕様書.md               # Japanese specification document
```

## Important Implementation Notes

### Variable Interpolation
Variables are replaced in segments using regex pattern: `/{{${variable.name}}}/g`

### Time Handling
Time variables support complex formatting and rounding:
- Format patterns: YYYY, MM, DD, HH, mm, ss
- Rounding: floor/ceil/round operations on minute intervals
- Default time variable: "着信時刻" (Call Time) with HH:mm format, 5-minute floor rounding

### Drag & Drop
Uses SortableJS with specific configuration:
- Handle: `[data-drag-handle]` elements
- Animation: 150ms
- Ghost/drag classes for visual feedback

### Data Backup
Export creates JSON with structure:
```javascript
{
  variables,
  segments,
  templates,
  inputHistory,
  exportDate
}
```

## Debugging & Troubleshooting

### Common Issues
1. **State not persisting**: Check localStorage in browser DevTools
2. **Drag & drop not working**: Ensure SortableJS CDN is loaded
3. **React not rendering**: Check React/ReactDOM CDN links
4. **Variable interpolation failing**: Verify variable names match exactly in segments

### Development Tips
- Use browser DevTools console for debugging state
- localStorage key: `telescribeAssistData`
- All external dependencies loaded via CDN - ensure internet connection
- The app is designed to work offline once loaded
- **Modular development**: Edit files in `src/` directory for the modular version
- **Global objects**: Components, utilities, and services are exposed as global objects (e.g., `Components.App`, `Hooks.useLocalStorage`, `Utils.Helpers`)
- **Japanese specification**: Refer to `docs/仕様書.md` for detailed functional requirements in Japanese

## Future Enhancements (Low Priority)
- Rich text editing with markdown support
- Additional export formats
- Template management UI improvements
- Responsive design optimizations