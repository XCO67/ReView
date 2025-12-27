import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { updateUser, deleteUser, getUserWithRoles } from '@/lib/db-queries';
import { initDb } from '@/lib/db';
import type { UpdateUserInput } from '@/lib/db-types';
import { logger } from '@/lib/utils/logger';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || !session.roles.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    await initDb();
    const body: UpdateUserInput = await request.json();

    if (body.username !== undefined) {
      body.username = body.username.trim();
      if (!body.username) {
        return NextResponse.json(
          { error: 'Username cannot be empty' },
          { status: 400 }
        );
      }
    }

    if (body.email !== undefined) {
      body.email = body.email.trim();
      if (!body.email) {
        return NextResponse.json(
          { error: 'Email cannot be empty' },
          { status: 400 }
        );
      }
    }

    if (body.name !== undefined) {
      body.name = body.name.trim();
      if (!body.name) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
    }

    // If password is provided and empty, remove it from update
    if (body.password === '') {
      delete body.password;
    }

    const user = await updateUser(userId, body);
    return NextResponse.json(user);
  } catch (error) {
    logger.error('Failed to update user', error);
    
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
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || !session.roles.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (userId === session.userId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    await initDb();
    await deleteUser(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete user', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

