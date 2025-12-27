import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getAuditLogs } from '@/lib/audit-log';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function LogsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (!session.roles.includes('admin')) {
    redirect('/dashboard');
  }

  const logs = await getAuditLogs(200);

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getEventBadgeVariant = (eventType: string) => {
    if (eventType === 'login') {
      return 'default';
    } else if (eventType === 'logout') {
      return 'secondary';
    } else if (eventType === 'login_failed') {
      return 'destructive';
    }
    return 'outline';
  };

  return (
    <div className="space-y-6 text-white">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">Access Logs</h1>
        <p className="text-white/70">
          Track when users sign in or sign out of Kuwait Re portals.
        </p>
      </header>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm uppercase tracking-[0.3em] text-white/60">
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[25%]">User</TableHead>
                  <TableHead className="w-[20%]">Event</TableHead>
                  <TableHead className="w-[20%]">IP Address</TableHead>
                  <TableHead className="w-[35%]">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="px-6 py-12 text-center text-white/60">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm">No login activity recorded yet.</p>
                        <p className="text-xs text-white/40">Activity will appear here once users start logging in.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="border-b hover:bg-muted/30">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white">{log.name || 'Unknown'}</span>
                          <span className="text-xs text-white/60">
                            @{log.username}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getEventBadgeVariant(log.event_type)}
                          className="font-medium"
                        >
                          {log.event_type === 'login' ? 'Login' : 
                           log.event_type === 'logout' ? 'Logout' :
                           log.event_type === 'login_failed' ? 'Failed Login' :
                           log.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-white/70">
                          {log.ip_address || 'unknown'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-white/70">
                          {formatTimestamp(new Date(log.created_at))}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

