import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Loader2, Users, Search, MoreVertical, Ban, Unlock, Trash2,
  AlertTriangle, Circle, Clock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_blocked: boolean;
  blocked_at: string | null;
  last_seen: string | null;
  created_at: string;
  role: string;
}

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'blocked'>('all');

  // Dialog state
  const [blockTarget, setBlockTarget] = useState<{ userId: string; name: string; block: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; name: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch roles for all users
      const userIds = (profiles || []).map(p => p.user_id);
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const roleMap: Record<string, string> = {};
      (roles || []).forEach(r => {
        // If user has admin role, mark as admin; otherwise customer
        if (r.role === 'admin') roleMap[r.user_id] = 'admin';
        else if (!roleMap[r.user_id]) roleMap[r.user_id] = r.role;
      });

      const enriched: UserProfile[] = (profiles || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        full_name: p.full_name,
        email: (p as any).email || null,
        phone: p.phone,
        is_blocked: (p as any).is_blocked || false,
        blocked_at: (p as any).blocked_at || null,
        last_seen: (p as any).last_seen || null,
        created_at: p.created_at,
        role: roleMap[p.user_id] || 'customer',
      }));

      setUsers(enriched);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar utilizadores');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    // Refresh every 30 seconds for presence updates
    const interval = setInterval(fetchUsers, 30_000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  // Filter and search
  useEffect(() => {
    let result = users;

    if (filter === 'online') {
      result = result.filter(u => isOnline(u.last_seen));
    } else if (filter === 'blocked') {
      result = result.filter(u => u.is_blocked);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        (u.full_name?.toLowerCase().includes(q)) ||
        (u.email?.toLowerCase().includes(q)) ||
        (u.phone?.toLowerCase().includes(q))
      );
    }

    setFilteredUsers(result);
  }, [users, filter, searchQuery]);

  const onlineCount = users.filter(u => isOnline(u.last_seen)).length;
  const blockedCount = users.filter(u => u.is_blocked).length;

  // ── Actions ────────────────────────────────────────────

  const handleBlockUser = async () => {
    if (!blockTarget) return;
    try {
      const { error } = await supabase.rpc('admin_block_user', {
        target_user_id: blockTarget.userId,
        block: blockTarget.block,
      });
      if (error) throw error;
      toast.success(blockTarget.block ? 'Utilizador bloqueado' : 'Utilizador desbloqueado');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error blocking user:', error);
      toast.error('Erro: ' + (error.message || ''));
    } finally {
      setBlockTarget(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase.rpc('admin_delete_user', {
        target_user_id: deleteTarget.userId,
      });
      if (error) throw error;
      toast.success('Utilizador eliminado');
      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Erro: ' + (error.message || ''));
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Gestão de Utilizadores</h1>
        <p className="text-muted-foreground">Ver, bloquear ou remover utilizadores registados</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:ring-2 ring-primary/20 transition-all" onClick={() => setFilter('all')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total de utilizadores</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-green-500/20 transition-all" onClick={() => setFilter('online')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Circle className="h-5 w-5 text-green-500 fill-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{onlineCount}</p>
              <p className="text-sm text-muted-foreground">Online agora</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-2 ring-red-500/20 transition-all" onClick={() => setFilter('blocked')}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Ban className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{blockedCount}</p>
              <p className="text-sm text-muted-foreground">Bloqueados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome, email ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'online', 'blocked'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todos' : f === 'online' ? 'Online' : 'Bloqueados'}
            </Button>
          ))}
        </div>
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último acesso</TableHead>
                  <TableHead>Registado em</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum utilizador encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => {
                    const online = isOnline(u.last_seen);
                    return (
                      <TableRow key={u.id} className={u.is_blocked ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              {online && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                              )}
                            </div>
                            <span className="font-medium">{u.full_name || 'Sem nome'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {u.email || '—'}
                        </TableCell>
                        <TableCell>
                          {u.is_blocked ? (
                            <Badge variant="destructive" className="gap-1">
                              <Ban className="h-3 w-3" /> Bloqueado
                            </Badge>
                          ) : online ? (
                            <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 gap-1">
                              <Circle className="h-2 w-2 fill-current" /> Online
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" /> Offline
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.last_seen
                            ? formatDistanceToNow(new Date(u.last_seen), { addSuffix: true, locale: pt })
                            : 'Nunca'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(u.created_at), "d MMM yyyy", { locale: pt })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'default' : 'outline'}>
                            {u.role === 'admin' ? 'Admin' : 'Cliente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {u.role !== 'admin' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {u.is_blocked ? (
                                  <DropdownMenuItem onClick={() => setBlockTarget({ userId: u.user_id, name: u.full_name || u.email || '', block: false })}>
                                    <Unlock className="h-4 w-4 mr-2" /> Desbloquear
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => setBlockTarget({ userId: u.user_id, name: u.full_name || u.email || '', block: true })}>
                                    <Ban className="h-4 w-4 mr-2" /> Bloquear
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteTarget({ userId: u.user_id, name: u.full_name || u.email || '' })}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar conta
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ── Confirmation Dialogs ────────────────────────── */}

      {/* Block / Unblock */}
      <AlertDialog open={!!blockTarget} onOpenChange={() => setBlockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {blockTarget?.block ? (
                <><Ban className="h-5 w-5 text-destructive" /> Bloquear utilizador</>
              ) : (
                <><Unlock className="h-5 w-5 text-green-500" /> Desbloquear utilizador</>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blockTarget?.block
                ? `Tem a certeza que deseja bloquear "${blockTarget?.name}"? O utilizador não poderá aceder ao site.`
                : `Deseja desbloquear "${blockTarget?.name}"? O utilizador poderá voltar a aceder ao site.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              className={blockTarget?.block ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {blockTarget?.block ? 'Bloquear' : 'Desbloquear'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete user */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar conta de utilizador
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar permanentemente a conta de "{deleteTarget?.name}"?
              Todos os dados do utilizador (perfil, conversas, etc.) serão apagados. Esta ação <strong>não pode ser revertida</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
