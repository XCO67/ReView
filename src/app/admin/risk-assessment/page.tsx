import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getAllRiskAssessments } from '@/lib/database/queries';
import { initDb } from '@/lib/db';
import RiskAssessmentTable from './RiskAssessmentTable';
import ImportButton from './ImportButton';
import AddNewButton from './AddNewButton';

export default async function RiskAssessmentPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (!session.roles.includes('admin')) {
    redirect('/dashboard');
  }

  await initDb();
  const assessments = await getAllRiskAssessments();

  return (
    <div className="w-full h-full flex flex-col text-white">
      <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Risk & Control Self-Assessment</h1>
          <p className="text-sm text-white/60 mb-4">
            Manage and update risk assessment data. Click on any cell to edit.
          </p>
          <div className="flex items-center gap-3">
            <ImportButton />
            <AddNewButton />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden min-h-0 w-full">
        <RiskAssessmentTable initialData={assessments} />
      </div>
    </div>
  );
}


