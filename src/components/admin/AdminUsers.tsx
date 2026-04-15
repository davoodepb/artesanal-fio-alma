import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Loader2,
  Users,
  Search,
  MoreVertical,
  Ban,
  Unlock,
  Circle,
  Clock,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { setUserBlocked, subscribeUsers } from '@/lib/firebase/userService';

type TimestampLike = { toDate?: () => Date; seconds?: number };

interface UserDoc {
  id: string;
  uid?: string;
  name?: string;
  email?: string;
  role?: string;
  isBlocked?: boolean;
  isOnline?: boolean;
  lastSeen?: TimestampLike | string | number | null;
  updatedAt?: TimestampLike | string | number | null;
}

function toDate(value: UserDoc['lastSeen']): Date | null {
  if (!value) return null;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const ts = value as TimestampLike;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000);
  return null;
}

function safeDateText(value: UserDoc['lastSeen'], fallback = '—') {
  const parsed = toDate(value);
  if (!parsed) return fallback;
  return format(parsed, 'd MMM yyyy', { locale: pt });
}

function safeRelativeText(value: UserDoc['lastSeen'], fallback = 'Nunca') {
  const parsed = toDate(value);
  if (!parsed) return fallback;
  return formatDistanceToNow(parsed, { addSuffix: true, locale: pt });
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'blocked'>('all');
  const [blockTarget, setBlockTarget] = useState<{ userId: string; name: string; block: boolean } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeUsers(
      (rows: UserDoc[]) => {
        const sorted = [...(rows || [])].sort((a, b) => {
          const aTime = toDate(a.updatedAt || a.lastSeen)?.getTime() || 0;
          const bTime = toDate(b.updatedAt || b.lastSeen)?.getTime() || 0;
          return bTime - aTime;
        });

        setUsers(sorted);
        setIsLoading(false);
      },
      (error: unknown) => {
        console.error('Erro ao carregar utilizadores:', error);
        toast.error('Erro ao carregar utilizadores.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredUsers = useMemo(() => {
    let result = users;

    if (filter === 'online') {
      result = result.filter((u) => Boolean(u.isOnline));
    } else if (filter === 'blocked') {
      result = result.filter((u) => Boolean(u.isBlocked));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u) => {
        const name = String(u.name || '').toLowerCase();
        const email = String(u.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    return result;
  }, [users, filter, searchQuery]);

  const onlineCount = users.filter((u) => Boolean(u.isOnline)).length;
  const blockedCount = users.filter((u) => Boolean(u.isBlocked)).length;

  const handleBlockUser = async () => {
    if (!blockTarget) return;

    try {
      await setUserBlocked(blockTarget.userId, blockTarget.block);
      toast.success(blockTarget.block ? 'Utilizador bloqueado' : 'Utilizador desbloqueado');
    } catch (error: any) {
      console.error('Erro ao atualizar bloqueio:', error);
      toast.error(error?.message || 'Erro ao atualizar bloqueio.');
    } finally {
      setBlockTarget(null);
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
        <h1 className="text-2xl font-serif font-bold text-foreground">Gestao de Utilizadores</h1>
        <p className="text-muted-foreground">Ver estado online e bloquear utilizadores abusivos</p>
      </div>

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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'online', 'blocked'] as const).map((f) => (
            <Button key={f} variant={filter === f ? 'default' : 'outline'} size="sm" onClick={() => setFilter(f)}>
              {f === 'all' ? 'Todos' : f === 'online' ? 'Online' : 'Bloqueados'}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilizador</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Ultimo acesso</TableHead>
                  <TableHead>Atualizado em</TableHead>
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
                    const isOnline = Boolean(u.isOnline);
                    const uid = String(u.uid || u.id);
                    const role = String(u.role || 'user').toLowerCase();
                    const name = String(u.name || 'Sem nome');
                    const email = String(u.email || '—');

                    return (
                      <TableRow key={u.id} className={u.isBlocked ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {name.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              {isOnline && (
                                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                              )}
                            </div>
                            <span className="font-medium">{name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{email}</TableCell>
                        <TableCell>
                          {u.isBlocked ? (
                            <Badge variant="destructive" className="gap-1">
                              <Ban className="h-3 w-3" /> Bloqueado
                            </Badge>
                          ) : isOnline ? (
                            <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 gap-1">
                              <Circle className="h-2 w-2 fill-current" /> Online
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" /> Offline
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{safeRelativeText(u.lastSeen, 'Nunca')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{safeDateText(u.updatedAt || u.lastSeen, '—')}</TableCell>
                        <TableCell>
                          <Badge variant={role === 'admin' ? 'default' : 'outline'}>{role === 'admin' ? 'Admin' : 'Utilizador'}</Badge>
                        </TableCell>
                        <TableCell>
                          {role !== 'admin' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {u.isBlocked ? (
                                  <DropdownMenuItem onClick={() => setBlockTarget({ userId: uid, name, block: false })}>
                                    <Unlock className="h-4 w-4 mr-2" /> Desbloquear
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => setBlockTarget({ userId: uid, name, block: true })}>
                                    <Ban className="h-4 w-4 mr-2" /> Bloquear
                                  </DropdownMenuItem>
                                )}
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

      <AlertDialog open={!!blockTarget} onOpenChange={() => setBlockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {blockTarget?.block ? <><Ban className="h-5 w-5 text-destructive" /> Bloquear utilizador</> : <><Unlock className="h-5 w-5 text-green-500" /> Desbloquear utilizador</>}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blockTarget?.block
                ? `Tem a certeza que deseja bloquear "${blockTarget?.name}"?`
                : `Deseja desbloquear "${blockTarget?.name}"?`
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
    </div>
  );
}
