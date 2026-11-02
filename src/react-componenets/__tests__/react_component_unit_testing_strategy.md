# React Component Unit Testing Plan

This document outlines the testing priorities for React components in the codebase. Tests are ordered by critical path importance, from security-critical access controllers to UI presentation elements.

---

## Priority 1: Security & Authentication (Critical)
These components control authorization, system access, and user authentication state. Tests must pass to guarantee application security.

### 1. `RoleGate.jsx` DONE
- [D] **Role Authorization:** Renders children only when the authenticated user possesses the required role(s).
- [D] **Access Denial:** Hides children and displays fallback UI or redirects unauthorized users.
- [D] **Unauthenticated State:** Handles missing user session by preventing access.
- [D] **Loading State:** Displays loading feedback while auth state and roles are resolving.

### 2. `FirebaseAuth.jsx`
- [ ] **Auth Flow Triggers:** Validates sign-in, sign-up, and sign-out handlers execute properly on user action.
- [ ] **Error Messages:** Displays accurate user feedback upon authentication failures (e.g., wrong password, user not found).
- [ ] **State Synchronization:** Reflects correct UI state transitions when switching between authenticated and unauthenticated states.

---

## Priority 2: Primary Feature Views (High)
Components forming core user workflows including survey rendering, submission, and management.

### 3. `SurveyPage.jsx`
- [ ] **Data Submission:** Invokes correct payload structure and submission callbacks upon completion.
- [ ] **Validation Rules:** Prevents form submission and shows errors when required questions are unanswered.
- [ ] **Dynamic Structure:** Accurately renders different question types based on input survey schema.

### 4. `InstructorSurveys.jsx`
- [ ] **Data Fetching & Rendering:** Displays the list of instructor-owned surveys.
- [ ] **Management Actions:** Validates handlers for creating, editing, publishing, and deleting surveys.
- [ ] **Empty/Error States:** Displays proper fallbacks when no surveys are returned or API calls fail.

### 5. `StudentSurveys.jsx`
- [ ] **Assigned List:** Renders assigned surveys relevant to the current student.
- [ ] **Completion Status:** Accurately indicates pending vs. completed survey statuses.
- [ ] **Navigation Actions:** Triggers correct routing when a student selects an available survey.

---

## Priority 3: Interactive Components (Medium)
Components with stateful user interaction logic.

### 6. `AvailabilityGrid.jsx`
- [ ] **Grid Interaction:** Allows toggling time slot selections via click or drag operations.
- [ ] **State Output:** Correctly exports updated schedule selections to parent components via callbacks.
- [ ] **Disabled States:** Ensures unavailable/booked slots cannot be selected or toggled.

---

## Priority 4: Custom Hooks & Shared UI (Low)
Utility components and custom state hooks supporting higher-level elements.

### 7. `useUserProfile.js` (Custom Hook)
- [ ] **Initial Fetch:** Loads and exposes user profile state on mount.
- [ ] **Mutations:** Correctly updates profile properties and reflects changes in state.

### 8. `ui.js`
- [ ] **UI Primitives:** Verifies shared base UI elements (Buttons, Modals, Inputs) pass props and trigger events as expected.
