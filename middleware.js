import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(req) {
    const res = NextResponse.next();

    // We can't use the standard helper here easily without more deps,
    // but we can do a basic check for the supabase cookie if using SSR.
    // For now, since this is a SPA-style dashboard, we'll handle most auth in layout/useEffect.
    // However, we can block some generic routes if needed.

    return res;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
};
