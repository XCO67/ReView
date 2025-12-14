import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createRole, getAllRoles } from '@/lib/db-queries';
import { initDb } from '@/lib/db';

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
    const roles = await getAllRoles();

    return NextResponse.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
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
    const { name, description } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    const role = await createRole(name.trim(), description || null);
    return NextResponse.json(role);
  } catch (error) {
    console.error('Create role error:', error);
    
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'Role name already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}

