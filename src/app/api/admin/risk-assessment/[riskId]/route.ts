import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/database/connection';

export async function PUT(
  request: NextRequest,
  { params }: { params: { riskId: string } }
) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!session.roles.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const riskId = decodeURIComponent(params.riskId);
    const body = await request.json();
    
    const db = getDb();
    
    // Build update query dynamically based on provided fields
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    const allowedFields = [
      'risk_item', 'risk_description', 'control_exist', 'unit', 'lob', 'class',
      'risk_owner', 'level_01', 'level_02', 'level_03', 'level_04',
      'input_frequency', 'input_severity', 'input_impact',
      'inherent_frequency', 'inherent_severity', 'inherent_impact', 'inherent_category',
      'no_of_controls',
      'control_01', 'effect_c1', 'control_02', 'effect_c2', 'control_03', 'effect_c3',
      'control_04', 'effect_c4', 'control_05', 'effect_c5',
      'date_of_review', 'control_to_be_implemented', 'due_date',
      'residual_impact', 'residual_category', 'risk_manager_remarks'
    ];
    
    for (const field of allowedFields) {
      if (field in body) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(body[field] === '' ? null : body[field]);
        paramIndex++;
      }
    }
    
    if (fields.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    
    // Add updated_at
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add risk_id for WHERE clause
    values.push(riskId);
    
    const query = `
      UPDATE risk_control_assessments
      SET ${fields.join(', ')}
      WHERE risk_id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Risk assessment not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating risk assessment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { riskId: string } }
) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!session.roles.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const riskId = decodeURIComponent(params.riskId);
    const db = getDb();
    
    const result = await db.query(
      'DELETE FROM risk_control_assessments WHERE risk_id = $1 RETURNING risk_id',
      [riskId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Risk assessment not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting risk assessment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

