# Requirements Document: Simple Document Table

## Overview
Create a minimal, robust document table that displays only essential information and never gets cut off regardless of sidebar state.

## Table Columns (5 Total)
1. **Select** (8% width) - Checkbox + expand icon
2. **Name** (30% width) - Document filename, truncated
3. **Summary** (35% width) - Document summary, truncated  
4. **Key Topics** (25% width) - Topic tags, truncated
5. **Actions** (2% width) - Overflow menu for future actions

## Design Requirements

### Layout Constraints
- **Container**: Single card with proper padding
- **Table**: `width: 100%`, `max-width: 100%`, `table-layout: fixed`
- **No horizontal scroll** - table must fit any container width
- **No resizable columns** - fixed percentage widths only
- **Minimum container width**: 600px (mobile breakpoint)

### Column Specifications

#### Select Column (8%)
- Checkbox for row selection
- Expand icon (LuExpand) to open detail modal
- Both elements horizontally aligned
- No text truncation needed

#### Name Column (30%)
- Document filename only
- Truncate with ellipsis (`text-overflow: ellipsis`)
- Show full name in tooltip on hover
- Font weight: medium for emphasis

#### Summary Column (35%)
- Document summary text
- Truncate to single line with ellipsis
- Show full summary in tooltip on hover
- Priority content - gets largest width allocation

#### Key Topics Column (25%)
- Display first 2-3 topic tags maximum
- Truncate remaining topics with "+X more" indicator
- Each tag: small rounded pill with background color
- If no topics: show "No topics" in gray

#### Actions Column (2%)
- Reserved for future dropdown menu
- Currently empty but maintains space
- Right-aligned for consistency

### Visual Requirements
- **Row height**: 48px minimum for touch targets
- **Padding**: 12px horizontal, 8px vertical per cell
- **Borders**: Light gray bottom border between rows
- **Hover state**: Light gray background on row hover
- **Selection state**: Blue background tint when selected
- **Loading state**: Skeleton rows with shimmer effect

### Responsive Behavior
- **Desktop**: All columns visible as specified
- **Tablet** (768px+): Same layout, slightly tighter spacing
- **Mobile** (600px+): Same columns but reduced padding
- **Below 600px**: Stack cards instead of table

### Technical Constraints
- **No TanStack Table** - use simple HTML table
- **No ResizablePanel** - causes width conflicts
- **CSS Grid/Flexbox** acceptable for internal cell layout
- **Percentage widths only** - no fixed pixel widths
- **Truncation via CSS** - `overflow: hidden`, `white-space: nowrap`

### Functional Requirements
- **Search**: Filter across name, summary, and topics
- **Sort**: By name, date (dropdown selection)
- **Selection**: Multiple row selection with checkboxes
- **Modal**: Click expand icon opens document detail modal
- **Upload state**: Show uploading rows with spinner
- **Empty state**: "No documents found" message
- **Error state**: Display error message in table area

### Success Criteria
- Table never horizontally overflows container
- Works identically with sidebar open/closed
- All text properly truncated with tooltips
- Maintains usability on mobile devices
- Loading and error states clearly communicated
- Consistent visual hierarchy and spacing