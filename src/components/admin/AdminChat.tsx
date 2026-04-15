import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Send, MessageCircle, ImagePlus, Ban, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { listenMessages, sendMessage, sendMessageWithImage } from '@/lib/firebase/chatService';
import { uploadImage } from '@/lib/firebase/uploadService';
import { fetchUsersByIds, setUserBlocked } from '@/lib/firebase/userService';

type FirestoreTimestampLike = {
  toDate?: () => Date;
  seconds?: number;
};

interface ChatMessage {
  id: string;
  text?: string;
  imageUrl?: string;
  userId?: string;
  senderRole?: 'customer' | 'admin' | string;
  threadId?: string;
  createdAt?: FirestoreTimestampLike | string | number | null;
}

interface ConversationThread {
  threadId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  lastMessage: string;
  lastAt: number;
  unreadCount: number;
}

function toDateValue(value: ChatMessage['createdAt']): Date | null {
  if (!value) return null;

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const timestamp = value as FirestoreTimestampLike;
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  if (typeof timestamp.seconds === 'number') {
    return new Date(timestamp.seconds * 1000);
  }

  return null;
}

function getMessageTime(msg: ChatMessage): number {
  const date = toDateValue(msg.createdAt);
  return date ? date.getTime() : 0;
}

function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const diff = getMessageTime(a) - getMessageTime(b);
    if (diff !== 0) return diff;
    return String(a.id).localeCompare(String(b.id));
  });
}

function getSenderRole(msg: ChatMessage): 'customer' | 'admin' {
  if (msg.senderRole === 'admin') return 'admin';
  return 'customer';
}

function getThreadId(msg: ChatMessage): string {
  if (msg.threadId) return String(msg.threadId);
  if (getSenderRole(msg) === 'customer' && msg.userId) return String(msg.userId);
  return '';
}

export function AdminChat() {
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [profilesMap, setProfilesMap] = useState<Record<string, { name: string; email: string }>>({});
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());

  const allSortedMessages = useMemo(() => sortMessages(messages), [messages]);

  useEffect(() => {
    console.log('AUTH USER:', user ? { id: user.id, email: user.email } : null);
  }, [user]);

  useEffect(() => {
    console.log('Messages:', allSortedMessages);
  }, [allSortedMessages]);

  const threadMessages = useMemo(() => {
    if (!selectedThreadId) return [];
    return allSortedMessages.filter((msg) => getThreadId(msg) === selectedThreadId);
  }, [allSortedMessages, selectedThreadId]);

  const conversations = useMemo<ConversationThread[]>(() => {
    const grouped = new Map<string, ChatMessage[]>();

    for (const msg of allSortedMessages) {
      const threadId = getThreadId(msg);
      if (!threadId) continue;

      const list = grouped.get(threadId) || [];
      list.push(msg);
      grouped.set(threadId, list);
    }

    const rows: ConversationThread[] = [];

    grouped.forEach((threadMsgs, threadId) => {
      const sorted = sortMessages(threadMsgs);
      const last = sorted[sorted.length - 1];
      const profile = profilesMap[threadId] || { name: 'Cliente', email: '' };

      rows.push({
        threadId,
        customerId: threadId,
        customerName: profile.name || 'Cliente',
        customerEmail: profile.email || '',
        lastMessage: last?.imageUrl ? '📷 Imagem' : String(last?.text || ''),
        lastAt: getMessageTime(last),
        unreadCount: unreadMap[threadId] || 0,
      });
    });

    return rows.sort((a, b) => b.lastAt - a.lastAt);
  }, [allSortedMessages, profilesMap, unreadMap]);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    setLoadError(null);

    let initialized = false;
    const unsubscribe = listenMessages(
      (incoming: ChatMessage[]) => {
        const sorted = sortMessages(incoming || []);

        if (!initialized) {
          initialized = true;
          knownMessageIdsRef.current = new Set(sorted.map((msg) => msg.id));
          setMessages(sorted);
          setIsLoading(false);
          return;
        }

        const known = knownMessageIdsRef.current;
        const newOnes = sorted.filter((msg) => !known.has(msg.id));

        if (newOnes.length > 0) {
          setUnreadMap((prev) => {
            const next = { ...prev };
            for (const msg of newOnes) {
              const threadId = getThreadId(msg);
              if (!threadId) continue;
              if (threadId === selectedThreadId) continue;

              if (getSenderRole(msg) === 'customer') {
                next[threadId] = (next[threadId] || 0) + 1;
                toast.info('Nova mensagem de cliente no chat.');
              }
            }
            return next;
          });
        }

        knownMessageIdsRef.current = new Set(sorted.map((msg) => msg.id));
        setMessages(sorted);
        setIsLoading(false);
      },
      (error: unknown) => {
        console.error('Erro ao carregar mensagens admin:', error);
        setLoadError('Nao foi possivel carregar conversas do chat.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId) return;
    setUnreadMap((prev) => ({ ...prev, [selectedThreadId]: 0 }));
  }, [selectedThreadId]);

  useEffect(() => {
    if (conversations.length === 0) return;
    if (!selectedThreadId) {
      setSelectedThreadId(conversations[0].threadId);
    }
  }, [conversations, selectedThreadId]);

  useEffect(() => {
    if (threadMessages.length > 0) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [threadMessages]);

  useEffect(() => {
    const threadIds = [...new Set(allSortedMessages.map((msg) => getThreadId(msg)).filter(Boolean))];
    if (threadIds.length === 0) {
      setProfilesMap({});
      return;
    }

    const loadProfiles = async () => {
      try {
        const usersMap = await fetchUsersByIds(threadIds);
        const normalized: Record<string, { name: string; email: string }> = {};
        for (const threadId of threadIds) {
          const item = usersMap[threadId] as any;
          normalized[threadId] = {
            name: String(item?.name || 'Cliente').trim() || 'Cliente',
            email: String(item?.email || '').trim(),
          };
        }
        setProfilesMap(normalized);
      } catch {
        setProfilesMap({});
      }
    };

    loadProfiles();
  }, [allSortedMessages]);

  const totalUnread = useMemo(() => Object.values(unreadMap).reduce((sum, v) => sum + Number(v || 0), 0), [unreadMap]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedThreadId || !newMessage.trim()) return;

    setIsSending(true);
    try {
      await sendMessage(newMessage, {
        threadId: selectedThreadId,
        senderRole: 'admin',
        targetUserId: selectedThreadId,
      });
      setNewMessage('');
    } catch (error: any) {
      console.error('Erro ao enviar mensagem admin:', error);
      toast.error(error?.message || 'Erro ao enviar mensagem.');
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedThreadId) return;

    if (fileInputRef.current) fileInputRef.current.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um ficheiro de imagem.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no maximo 10MB.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploaded = (await uploadImage(file, {
        folder: `chat-images/admin/${selectedThreadId}`,
        onProgress: (progress: number) => setUploadProgress(Math.round(progress)),
      })) as { url: string };

      await sendMessageWithImage({
        imageUrl: uploaded.url,
        threadId: selectedThreadId,
        senderRole: 'admin',
        targetUserId: selectedThreadId,
      });

      toast.success('Imagem enviada com sucesso.');
    } catch (error: any) {
      console.error('Erro ao enviar imagem admin:', error);
      toast.error(error?.message || 'Erro ao enviar imagem.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const selectedConversation = conversations.find((c) => c.threadId === selectedThreadId) || null;

  const handleBlockUser = async () => {
    if (!selectedConversation) return;

    try {
      await setUserBlocked(selectedConversation.customerId, true);
      toast.success('Utilizador bloqueado.');
    } catch (error: any) {
      console.error('Erro ao bloquear utilizador:', error);
      toast.error(error?.message || 'Erro ao bloquear utilizador.');
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
        <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
          Chat com Clientes
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs">
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground">Responda aos clientes em tempo real</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Conversas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {loadError ? (
                <div className="p-4 text-sm text-destructive">{loadError}</div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">Nenhuma conversa ainda</div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.threadId}
                    onClick={() => setSelectedThreadId(conv.threadId)}
                    className={`w-full p-4 text-left border-b hover:bg-muted/50 transition-colors flex items-start gap-3 ${
                      selectedThreadId === conv.threadId ? 'bg-muted' : ''
                    }`}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {conv.customerName?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{conv.customerName}</span>
                        {conv.unreadCount > 0 && <Badge className="shrink-0">{conv.unreadCount}</Badge>}
                      </div>
                      {conv.customerEmail && <p className="text-xs text-muted-foreground truncate">{conv.customerEmail}</p>}
                      <p className="text-sm text-muted-foreground truncate">{conv.lastMessage || 'Sem mensagens'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {conv.lastAt ? format(new Date(conv.lastAt), "d 'de' MMM, HH:mm", { locale: pt }) : 'Sem data'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {selectedConversation.customerName?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedConversation.customerName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{selectedConversation.customerEmail || selectedConversation.customerId}</p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleBlockUser} className="text-destructive">
                        <Ban className="h-4 w-4 mr-2" /> Bloquear utilizador
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-0 flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {threadMessages.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">Sem mensagens nesta conversa.</div>
                    ) : (
                      threadMessages.map((msg) => {
                        const senderRole = getSenderRole(msg);
                        const msgDate = toDateValue(msg.createdAt);

                        return (
                          <div key={msg.id} className={`flex ${senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                senderRole === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                              }`}
                            >
                              <p
                                className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${
                                  senderRole === 'admin' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                }`}
                              >
                                {senderRole === 'admin' ? 'Admin' : 'Cliente'}
                              </p>

                              {msg.imageUrl ? (
                                <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={msg.imageUrl}
                                    alt="Imagem enviada"
                                    className="max-w-full max-h-56 rounded-md object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    loading="lazy"
                                  />
                                </a>
                              ) : (
                                <p className="text-sm whitespace-pre-line">{msg.text || ''}</p>
                              )}

                              <p
                                className={`text-xs mt-1 ${
                                  senderRole === 'admin' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}
                              >
                                {msgDate ? format(msgDate, 'HH:mm') : '--:--'}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {isUploading && uploadProgress !== null && (
                  <div className="px-4 pb-2 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Uploading {uploadProgress}%</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    disabled={isSending || isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    title="Enviar imagem"
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  </Button>

                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escreva uma resposta..."
                    disabled={isSending || isUploading}
                    className="flex-1"
                  />

                  <Button type="submit" disabled={isSending || isUploading || !newMessage.trim()} size="icon">
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Selecione uma conversa para responder
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
