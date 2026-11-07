import { redirect } from 'next/navigation';

// The standalone Workspace page was removed — code practice now happens
// inside classroom interactive scenes and the practice pages.
export default function WorkspaceRedirect() {
  redirect('/courses');
}
