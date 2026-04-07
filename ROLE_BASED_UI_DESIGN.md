# Role-Based UI/UX Design Documentation

## Overview

The City Hall Monitoring System features **two distinct user interfaces** tailored to different user roles: **Admin** and **Encoder**. Each interface is designed to be simple, intuitive, and easy to use for non-technical staff.

---

## 🔹 Admin Layout

### Purpose
System management, monitoring, and oversight

### Admin Sidebar Menu
1. **📊 Dashboard** - Complete system overview with statistics
2. **📄 Documents** - View and manage all documents in the system
3. **🏢 Departments** - Manage departments and department codes
4. **👥 Users** - Manage system users and their roles
5. **📈 Reports** - Generate reports and export data
6. **🚪 Logout** - Sign out of the system

### Admin UI/UX Focus
- **High-level overview**: System-wide statistics, counts, and summaries
- **Quick access**: Direct links to reports, filters, and management tools
- **Visibility**: Full system activity and document tracking
- **Clear separation**: Management tasks are distinct from data entry
- **Comprehensive control**: Access to all system features

### Key Features
- View total document counts across the entire system
- Monitor documents by status and department
- Manage user accounts and permissions
- Export data to Excel or PDF
- Track all system activity

---

## 🔹 Encoder Layout

### Purpose
Fast and accurate data entry with minimal distractions

### Encoder Sidebar Menu
1. **📊 Dashboard** - Today's tasks and personal summary
2. **➕ Encode Document** - Create a new document entry
3. **📝 My Documents** - View documents I encoded
4. **⏳ Pending Records** - View documents waiting for action
5. **❓ Help** - Step-by-step guide and instructions
6. **🚪 Logout** - Sign out of the system

### Encoder UI/UX Focus
- **Step-by-step forms**: Clear, sequential data entry process
- **One task per screen**: Focused interface without distractions
- **Auto-fill and dropdowns**: Minimize typing and errors
- **Friendly validation**: Clear, helpful error messages
- **No system settings**: Simplified interface without admin features
- **Quick access**: Fast navigation to common tasks

### Key Features
- Quick action cards for common tasks
- Personal document tracking
- Pending documents list
- Comprehensive help guide
- Simplified dashboard focused on daily work

---

## Design Principles (Both Roles)

### 1. Clean, Uncluttered Interface
- Generous white space
- Clear visual hierarchy
- Minimal distractions
- Focused content areas

### 2. Large, Readable Fonts
- Minimum 16px base font size
- Clear headings (3xl for page titles)
- Improved line height (1.6)
- High contrast text

### 3. Clear Labels and Plain Language
- Simple, non-technical terms
- Required fields marked with red asterisk (*)
- Helpful descriptions under each field
- Tooltips and guidance text

### 4. Consistent Button Styles
- Primary actions: Blue buttons with white text
- Secondary actions: White buttons with borders
- Hover states: Clear visual feedback
- Disabled states: Grayed out with cursor-not-allowed

### 5. Left Side Navigation Menu
- Fixed sidebar (64px width)
- Role-specific menu items
- Active state highlighting
- User info display at top
- Logout button at bottom

### 6. Minimal Steps to Complete Tasks
- Direct navigation to common tasks
- Quick action buttons
- Pre-filled forms where possible
- Clear call-to-action buttons

---

## Behavior Rules

### Automatic Role Detection
- System automatically loads the correct layout based on user role after login
- Role is fetched from the API and stored in component state
- Sidebar menu updates dynamically based on role

### Access Control
- **RoleGuard component** protects admin-only pages
- Encoders cannot access: Users, Reports, Departments management
- Viewers have read-only access to documents
- Unauthorized access redirects to dashboard with error message

### Navigation Labels
- All labels use plain, non-technical language
- Icons accompany text for visual recognition
- Descriptions appear on hover for clarity

### Confirmation Dialogs
- Logout requires confirmation: "Are you sure you want to logout?"
- Prevents accidental actions
- Clear, friendly confirmation messages

---

## Component Structure

### Shared Components
- `MainLayout` - Wrapper with sidebar and main content area
- `Sidebar` - Role-aware navigation menu
- `RoleGuard` - Access control wrapper
- `DocumentForm` - Reusable form component

### Role-Specific Pages

#### Admin Pages
- `/dashboard` - Full system overview
- `/documents` - All documents management
- `/departments` - Department management
- `/users` - User management
- `/reports` - Reports and exports

#### Encoder Pages
- `/dashboard` - Personal task overview
- `/documents/new` - Encode new document
- `/documents/my` - My encoded documents
- `/documents/pending` - Pending documents
- `/help` - Help and guide

---

## UX Flow Examples

### Encoder: Encoding a New Document
1. Click "Encode Document" from sidebar or dashboard
2. Form loads with clear labels and help text
3. Fill required fields (marked with *)
4. Select department from dropdown
5. Enter amount, claimant, and particular
6. Click "Create Document" button
7. Success message appears
8. Redirected to "My Documents" page

### Admin: Viewing System Overview
1. Login → Dashboard loads automatically
2. See three summary cards: Total, By Status, By Department
3. View recent system activity table
4. Click any card or link to drill down
5. Access management features from sidebar

---

## Accessibility Features

- **Focus states**: Clear outline on focused elements
- **Keyboard navigation**: All interactive elements accessible via keyboard
- **Screen reader friendly**: Proper ARIA labels and semantic HTML
- **Color contrast**: WCAG AA compliant color combinations
- **Large touch targets**: Buttons and links are at least 44x44px

---

## Responsive Design

- **Desktop**: Full sidebar and multi-column layouts
- **Tablet**: Sidebar collapses on smaller screens
- **Mobile**: Stacked layouts, full-width buttons
- **Breakpoints**: md (768px), lg (1024px)

---

## Color Scheme

- **Primary**: Blue (#2563eb) - Main actions and navigation
- **Success**: Green (#16a34a) - Success messages and exports
- **Error**: Red (#dc2626) - Errors and warnings
- **Neutral**: Gray scale for text and backgrounds
- **Background**: Light gray (#f9fafb) for main content area

---

## Typography

- **Font Family**: Inter (Google Fonts) with system fallbacks
- **Base Size**: 16px
- **Headings**: 
  - H1: 3xl (30px) - Page titles
  - H2: xl (20px) - Section headers
  - H3: lg (18px) - Subsection headers
- **Body**: Base (16px) with 1.6 line height
- **Small**: sm (14px) for helper text

---

## Future Enhancements

- [ ] Print-friendly layouts
- [ ] Dark mode support
- [ ] Multi-language support
- [ ] Advanced filtering options
- [ ] Customizable dashboard widgets
- [ ] Notification system
- [ ] Keyboard shortcuts

---

## Testing Checklist

- [ ] Admin can access all admin pages
- [ ] Encoder cannot access admin-only pages
- [ ] Sidebar shows correct menu for each role
- [ ] Dashboard shows role-appropriate content
- [ ] Forms validate correctly
- [ ] Error messages are clear and helpful
- [ ] Logout confirmation works
- [ ] Navigation is intuitive
- [ ] All buttons are accessible
- [ ] Mobile responsive design works

---

## Support

For questions or issues with the UI/UX:
1. Check the Help page (Encoders)
2. Contact system administrator (Admins)
3. Review this documentation

---

**Last Updated**: January 2026
**Version**: 1.0
