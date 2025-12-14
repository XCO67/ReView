import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { deleteRole } from '@/lib/db-queries';
import { initDb } from '@/lib/db';

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
    const roleId = parseInt(id, 10);

    if (isNaN(roleId)) {
      return NextResponse.json(
        { error: 'Invalid role ID' },
        { status: 400 }
      );
    }

    await initDb();
    await deleteRole(roleId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete role error:', error);
    
    if (error instanceof Error && error.message.includes('default')) {
      return NextResponse.json(
        { error: 'Cannot delete default roles' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    );
  }
}

