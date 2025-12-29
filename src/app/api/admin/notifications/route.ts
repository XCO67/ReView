import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/database/connection';
import { initDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!session.roles.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await initDb();
    const body = await request.json();
    const { recipient_id, risk_id, message, message_type } = body;

    if (!recipient_id || !message) {
      return NextResponse.json(
        { error: 'Recipient ID and message are required' },
        { status: 400 }
      );
    }

    // Get sender ID from session
    const db = getDb();
    const senderResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [session.email]
    );

    if (senderResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Sender not found' },
        { status: 404 }
      );
    }

    const senderId = senderResult.rows[0].id;

    // Verify recipient exists
    const recipientResult = await db.query(
      'SELECT id FROM users WHERE id = $1 AND is_active = true',
      [recipient_id]
    );

    if (recipientResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Recipient not found or inactive' },
        { status: 404 }
      );
    }

    // Insert notification
    const result = await db.query(
      `INSERT INTO notifications (recipient_id, sender_id, risk_id, message, message_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [recipient_id, senderId, risk_id || null, message, message_type || 'custom']
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initDb();
    const db = getDb();

    // Get user ID from session
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [session.email]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = userResult.rows[0].id;

    // Get unread count
    const unreadCountResult = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE recipient_id = $1 AND is_read = false',
      [userId]
    );

    // Get recent notifications (last 50)
    const notificationsResult = await db.query(
      `SELECT 
        n.id,
        n.message,
        n.message_type,
        n.risk_id,
        n.is_read,
        n.created_at,
        u.name as sender_name,
        u.email as sender_email
      FROM notifications n
      JOIN users u ON n.sender_id = u.id
      WHERE n.recipient_id = $1
      ORDER BY n.created_at DESC
      LIMIT 50`,
      [userId]
    );

    return NextResponse.json({
      notifications: notificationsResult.rows,
      unreadCount: parseInt(unreadCountResult.rows[0].count) || 0,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

