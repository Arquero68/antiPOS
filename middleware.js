import { NextResponse } from 'next/server';

export async function middleware(req) {
    const res = NextResponse.next();

    return res;
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
};
