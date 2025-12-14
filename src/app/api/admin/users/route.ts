import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createUser, getAllUsers } from '@/lib/db-queries';
import { initDb } from '@/lib/db';
import type { CreateUserInput } from '@/lib/db-types';

export async function GET() {
  try {
    const session = await getSession();

    if (!session || !session.roles.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await initDb();
    const users = await getAllUsers();

    return NextResponse.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || !session.roles.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await initDb();
    const body: CreateUserInput = await request.json();
    const username = body.username?.trim();
    const email = body.email?.trim();
    const name = body.name?.trim();
    const password = body.password;

    if (!username || !email || !password || !name) {
      return NextResponse.json(
        { error: 'Username, email, password, and name are required' },
        { status: 400 }
      );
    }

    const roleIds = Array.isArray(body.role_ids) ? body.role_ids : [];

    const user = await createUser({
      ...body,
      username,
      email,
      name,
      password,
      role_ids: roleIds,
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error('Create user error:', error);
    
    if (error instanceof Error) {
      // Password validation errors
      if (error.message.includes('Password validation failed')) {
        return NextResponse.json(
          { error: error.message.replace('Password validation failed: ', '') },
          { status: 400 }
        );
      }
      
      // Unique constraint errors
      if (error.message.includes('unique')) {
        return NextResponse.json(
          { error: 'Username or email already exists' },
          { status: 400 }
        );
      }
      
      // Return the error message for other validation errors
      if (error.message.includes('validation') || error.message.includes('Invalid')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

