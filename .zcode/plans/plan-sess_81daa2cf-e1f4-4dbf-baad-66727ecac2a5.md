# Improvement Plan: Fix Learning Loop + Engagement

## Context

Despite 138 enrollments and 97 learners, **zero lessons have ever been marked complete**. Deep code audit found the causes: the completion system has a regression bug (revisiting a lesson downgrades it back to in_progress), the auto-complete code exists but is dead (never called), quiz results never save to the database, and certificates require manual discovery. Email templates are fully built but never triggered. This plan fixes the entire "learn → complete → celebrate" loop and adds retention hooks.

## Part 1: Fix the Broken Completion System (Critical)

### 1a. Stop the completion regression bug
**File:** `app/courses/[id]/lessons/[lessonId]/page.tsx` (lines 50-59)
- The page unconditionally POSTs `status: 'in_progress'` on every visit, overwriting completed lessons
- **Fix:** Only post in_progress if the lesson isn't already completed (check via GET progress first, or post `status: 'in_progress'` only when no progress row exists)

### 1b. Wire up the dead auto-complete
**File:** `app/courses/[id]/lessons/[lessonId]/page.tsx`
- `handleAutoComplete` (line 199) exists but is never called
- **Fix:** Call `attemptAutoComplete()` from the WatchTimer callback when `canComplete` becomes true, and from the practice page when score >= 60%

### 1c. Protect completed status server-side
**File:** `app/api/learning/progress/route.ts`
- **Fix:** If existing row is `completed` and incoming status is `in_progress`, skip the downgrade (only update time_spent)

### 1d. Record quiz completion from classroom player
**File:** `lib/learning/player-completion.ts`
- Currently only fires with auto-play ON at the last scene
- **Fix:** Also fire when user manually navigates past the last scene, or clicks "Next" on final scene. Relax the auto-play requirement.

## Part 2: Auto-Certificates with Student Names

### 2a. Auto-issue at 100% completion
**File:** `app/api/learning/progress/route.ts` (POST handler)
- After recording a `completed` status, check if all lessons in the course are complete
- If yes, auto-call the certificate creation logic (reuse `evaluateCertificateEligibility` from `lib/learning/progression.ts:93` and the insert logic from `app/api/learning/certificates/route.ts:50-156`)

### 2b. Include student name on certificates
**File:** `app/api/learning/progress/route.ts` (or new cert helper)
- When creating a certificate, look up the user's name from `local_users` table (if registered) or accept a name parameter from the client
- **File:** `app/certificates/[id]/page.tsx` line 63 — reads `certificate.metadata?.student_name` which is never set; set it at creation time

### 2c. Celebrate in the UI
**File:** `components/edit/PlaybackChromeRoot.tsx`
- After `markLessonCompletedFromPlayer` succeeds, show a toast: "Lesson complete! 🎉"
- **File:** `app/courses/[id]/page.tsx` — the "Claim Certificate" flow stays but now the certificate may already exist (show "View Certificate" if issued)

## Part 3: Email Notifications (wire existing templates)

**File:** `app/api/learning/enroll/route.ts`
- After successful enrollment, send the `courseEnrollment` email template (exists at `lib/learning/email.ts:252`) if the user has a registered email

**File:** `app/api/learning/progress/route.ts`
- When a course hits 100% and a certificate is issued, send the `courseCompletion` template (exists at `lib/learning/email.ts:169`)
- Email lookup: registered users via `local_users` table join on user_id

**File:** `app/api/auth/signup/route.ts` (or `lib/learning/auth.ts` signUp)
- Send a welcome email on successful signup (create a simple template)

## Part 4: Dashboard Engagement

### 4a. Continue Learning section
**File:** `app/dashboard/page.tsx`
- Add a "Continue Learning" card at top: find the most recent in_progress lesson across enrolled courses, show course name + lesson title + progress %, link directly to the lesson
- Requires fetching lesson data for enrolled courses (use `/api/learning/courses/[id]` per enrolled course, or extend the progress GET to include lesson titles)

### 4b. Per-course progress bars
**File:** `app/dashboard/page.tsx` "My Courses" cards
- Compute completed/total lessons per course from the existing progress data
- Render a progress bar + "X/Y lessons" on each card

## Part 5: Learning Streaks (simple gamification)

### 5a. Track daily activity
**File:** `lib/learning/streaks.ts` (new)
- localStorage-based: store `{lastActiveDate, currentStreak, longestStreak}`
- On each lesson page visit / completion, update: if lastActive was yesterday → streak+1; if today → no change; if older → reset to 1

### 5b. Show streak on dashboard
**File:** `app/dashboard/page.tsx`
- Display "🔥 X-day streak" badge next to the stats
- Sync streak to `learning_progress` activity (server-side dates) for cross-device persistence (optional, v2)

## Implementation Order

1. Part 1 (completion fixes) — highest impact, fixes the core metric
2. Part 2 (certificates) — builds on 1
3. Part 3 (emails) — wires existing code, ~30 min
4. Part 4 (dashboard) — visual win
5. Part 5 (streaks) — simple, self-contained

## Verification

1. **Completion flow:** Open a lesson → play classroom to end (or wait past threshold) → verify `learning_progress` row shows `status: 'completed'` in DB → revisit lesson page → verify status stays `completed` (not downgraded)
2. **Certificate:** Complete all lessons in a small course (e.g. Medicinal Chemistry, 2 lessons) via API → verify certificate auto-created with student name → verify certificate page renders the name
3. **Email:** Enroll with a registered email → verify enrollment email sent (check SMTP logs on VPS)
4. **Dashboard:** With partial progress → verify Continue Learning card + progress bars render
5. **Streaks:** Visit lesson 2 days consecutively → verify streak counter increments

## Files Modified (summary)

- `app/courses/[id]/lessons/[lessonId]/page.tsx` — fix in_progress regression + wire auto-complete
- `app/api/learning/progress/route.ts` — protect completed status + auto-cert check + completion email
- `lib/learning/player-completion.ts` — relax completion trigger conditions
- `app/api/learning/enroll/route.ts` — enrollment email trigger
- `app/api/learning/certificates/route.ts` — extract reusable cert-issue helper with student name
- `app/certificates/[id]/page.tsx` — (no change needed once metadata includes name)
- `app/dashboard/page.tsx` — Continue Learning + progress bars + streak badge
- `lib/learning/streaks.ts` (new) — streak tracking
- `components/edit/PlaybackChromeRoot.tsx` — completion toast