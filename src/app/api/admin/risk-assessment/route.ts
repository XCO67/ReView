import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/database/connection';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!session.roles.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await request.json();
    
    // Validate required field
    if (!body.risk_id || body.risk_id.trim() === '') {
      return NextResponse.json({ error: 'Risk ID is required' }, { status: 400 });
    }
    
    const db = getDb();
    
    // Check if risk_id already exists
    const existing = await db.query(
      'SELECT risk_id FROM risk_control_assessments WHERE risk_id = $1',
      [body.risk_id]
    );
    
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Risk ID already exists' },
        { status: 400 }
      );
    }
    
    // Define all allowed columns (excluding created_at, updated_at which are auto-managed)
    const allowedColumns = [
      'risk_id', 'risk_item', 'risk_description', 'control_exist', 'unit', 'lob', 'class',
      'risk_owner', 'level_01', 'level_02', 'level_03', 'level_04',
      'input_frequency', 'input_severity', 'input_impact',
      'inherent_frequency', 'inherent_severity', 'inherent_impact', 'inherent_category',
      'no_of_controls',
      'control_01', 'effect_c1', 'control_02', 'effect_c2', 'control_03', 'effect_c3',
      'control_04', 'effect_c4', 'control_05', 'effect_c5',
      'date_of_review', 'control_to_be_implemented', 'due_date',
      'residual_impact', 'residual_category', 'risk_manager_remarks'
    ];

    // Build dynamic INSERT query based on provided fields
    const columns: string[] = [];
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    // Always include risk_id first
    columns.push('risk_id');
    values.push(body.risk_id);
    placeholders.push(`$${paramIndex++}`);

    // Add other provided fields
    for (const col of allowedColumns) {
      if (col !== 'risk_id' && col in body) {
        columns.push(col);
        const value = body[col];
        // Convert empty strings to null, handle dates
        if (value === '' || value === undefined) {
          values.push(null);
        } else if (col.includes('date') || col === 'date_of_review' || col === 'due_date') {
          // Handle date fields
          values.push(value ? new Date(value) : null);
        } else if (col.includes('frequency') || col.includes('severity') || col.includes('impact') || col === 'no_of_controls') {
          // Handle numeric fields
          values.push(value ? parseInt(value) || null : null);
        } else {
          values.push(value);
        }
        placeholders.push(`$${paramIndex++}`);
      }
    }

    // Insert new record with dynamic columns
    const result = await db.query(`
      INSERT INTO risk_control_assessments (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `, values);
    
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating risk assessment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

