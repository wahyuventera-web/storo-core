// Auth callback di path konvensional `/auth/callback` — re-export handler
// dari `/api/auth/callback` supaya kedua URL bekerja tanpa duplikasi logic.
// Beberapa caller di codebase dan link reset password lama mengarah ke sini.
export { GET } from "@/app/api/auth/callback/route";
