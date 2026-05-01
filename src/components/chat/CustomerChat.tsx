import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MessageCircle, Send, Loader2, ImagePlus, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ensureConversationForUser, listenMessagesByConversation, sendMessage, sendMessageWithImage } from '@/lib/firebase/chatService';
import { uploadImage } from '@/lib/firebase/uploadService';
import { ensureUserDocument, subscribeCurrentUser } from '@/lib/firebase/userService';

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
  conversationId?: string;
  createdAt?: FirestoreTimestampLike | string | number | null;
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

function triggerBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
    return;
  }

  if (Notification.permission === 'default') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, { body });
      }
    });
  }
}

function getSenderRole(msg: ChatMessage, currentUserId: string): 'customer' | 'admin' {
  if (msg.senderRole === 'admin') return 'admin';
  if (msg.senderRole === 'customer') return 'customer';
  return msg.userId === currentUserId ? 'customer' : 'admin';
}

export function CustomerChat() {
  const { user, isEmailVerified } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatInitError, setChatInitError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaWrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());

  const safeMessages = useMemo(() => sortMessages(messages), [messages]);

  useEffect(() => {
    console.log('AUTH USER:', user ? { id: user.id, email: user.email } : null);
  }, [user]);

  useEffect(() => {
    console.log('Messages:', safeMessages);
  }, [safeMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    const viewport = scrollAreaWrapperRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    viewport?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!user) {
      setMessages([]);
      setUnreadCount(0);
      knownMessageIdsRef.current = new Set();
      setIsBlocked(false);
      setConversationId(null);
      return;
    }

    ensureUserDocument(user.raw).catch(() => {
      // ignore bootstrap issues
    });

    const unsubscribeUser = subscribeCurrentUser(
      user.id,
      (profile) => {
        setIsBlocked(Boolean((profile as any)?.isBlocked));
      },
      () => {
        // non-critical
      }
    );

    setIsLoading(true);
    setChatInitError(null);

    let initialized = false;
    let disposed = false;
    let unsubscribeMessages = () => {};

    const boot = async () => {
      try {
        const conversation = await ensureConversationForUser(user.id);
        if (disposed) return;
        if (!conversation?.id) {
          throw new Error('Conversa nao encontrada.');
        }

        setConversationId(conversation.id);
        unsubscribeMessages = listenMessagesByConversation(
          conversation.id,
          (incomingMessages: ChatMessage[]) => {
            const sorted = sortMessages(incomingMessages || []);

            if (!initialized) {
              initialized = true;
              knownMessageIdsRef.current = new Set(sorted.map((msg) => msg.id));
              setMessages(sorted);
              setIsLoading(false);
              return;
            }

            const previousIds = knownMessageIdsRef.current;
            const newAdminMessages = sorted.filter((msg) => {
              if (previousIds.has(msg.id)) return false;
              return getSenderRole(msg, user.id) === 'admin';
            });

            if (newAdminMessages.length > 0 && !isOpen) {
              setUnreadCount((prev) => prev + newAdminMessages.length);
              toast.info('Nova mensagem da equipa de suporte.');
              triggerBrowserNotification('Nova mensagem no chat', 'A equipa respondeu no seu chat.');
            }

            knownMessageIdsRef.current = new Set(sorted.map((msg) => msg.id));
            setMessages(sorted);
            setIsLoading(false);
          },
          (error: unknown) => {
            console.error('Erro no listener do chat:', error);
            setChatInitError('Nao foi possivel carregar o chat neste momento.');
            setIsLoading(false);
          }
        );
      } catch (error) {
        console.error('Erro ao iniciar conversa:', error);
        setChatInitError('Nao foi possivel iniciar o chat neste momento.');
        setIsLoading(false);
      }
    };

    boot();

    return () => {
      disposed = true;
      unsubscribeUser();
      unsubscribeMessages();
    };
  }, [user, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [safeMessages, isOpen]);

  const handleOpenChat = () => {
    if (!user) {
      toast.info('Faca login para conversar connosco');
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (!isEmailVerified) {
      toast.error('Verifique o seu email antes de usar o chat.');
      navigate(`/verify-otp?email=${encodeURIComponent(user.email || '')}&redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setIsOpen(true);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !newMessage.trim()) return;

    if (isBlocked) {
      toast.error('Conta bloqueada. Nao pode enviar mensagens.');
      return;
    }

    setIsSending(true);
    try {
      const resolvedConversationId = conversationId || (await ensureConversationForUser(user.id))?.id;
      if (!resolvedConversationId) {
        throw new Error('Nao foi possivel iniciar a conversa.');
      }

      await sendMessage(newMessage, {
        conversationId: resolvedConversationId,
        senderRole: 'customer',
        targetUserId: 'admin',
      });

      setNewMessage('');
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error(error?.message || 'Erro ao enviar mensagem.');
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (isBlocked) {
      toast.error('Conta bloqueada. Nao pode enviar imagens.');
      return;
    }

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
        folder: `chat-images/${user.id}`,
        onProgress: (progress: number) => setUploadProgress(Math.round(progress)),
      })) as { url: string };

      const resolvedConversationId = conversationId || (await ensureConversationForUser(user.id))?.id;
      if (!resolvedConversationId) {
        throw new Error('Nao foi possivel iniciar a conversa.');
      }

      await sendMessageWithImage({
        imageUrl: uploaded.url,
        conversationId: resolvedConversationId,
        senderRole: 'customer',
        targetUserId: 'admin',
      });

      toast.success('Imagem enviada com sucesso.');
    } catch (error: any) {
      console.error('Erro ao enviar imagem:', error);
      toast.error(error?.message || 'Erro ao enviar imagem.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleOpenChat}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 relative"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col h-[100dvh]">
          <SheetHeader className="p-4 border-b bg-primary text-primary-foreground">
            <SheetTitle className="text-primary-foreground flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Chat com Fio & Alma
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 min-h-0 flex flex-col">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {chatInitError ? (
                  <div className="mx-4 mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                    <p className="text-sm font-medium text-destructive">Erro ao iniciar chat</p>
                    <p className="text-xs mt-1">{chatInitError}</p>
                  </div>
                ) : null}

                {isBlocked ? (
                  <div className="mx-4 mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-900">Conta bloqueada</p>
                    <p className="text-xs mt-1 text-amber-800">O envio de mensagens foi desativado para esta conta.</p>
                  </div>
                ) : null}

                <div ref={scrollAreaWrapperRef} className="relative flex-1 min-h-0">
                  <ScrollArea className="h-full p-4 touch-pan-y overscroll-contain">
                    <div className="space-y-4">
                      {safeMessages.length === 0 && (
                        <div className="text-center text-muted-foreground py-8">
                          <p>Ola! 👋</p>
                          <p className="text-sm mt-2">Envie uma mensagem e responderemos rapidamente.</p>
                        </div>
                      )}

                      {safeMessages.map((msg) => {
                        const senderRole = getSenderRole(msg, user?.id || '');
                        const msgDate = toDateValue(msg.createdAt);
                        return (
                          <div key={msg.id} className={`flex ${senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                senderRole === 'customer' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                              }`}
                            >
                              <p
                                className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${
                                  senderRole === 'customer' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                                }`}
                              >
                                {senderRole === 'customer' ? 'Cliente' : 'Admin'}
                              </p>

                              {msg.imageUrl ? (
                                <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={msg.imageUrl}
                                    alt="Imagem enviada"
                                    className="max-w-full max-h-48 rounded-md object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    loading="lazy"
                                  />
                                </a>
                              ) : (
                                <p className="text-sm whitespace-pre-line">{msg.text || ''}</p>
                              )}

                              <p
                                className={`text-xs mt-1 ${
                                  senderRole === 'customer' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}
                              >
                                {msgDate ? format(msgDate, 'HH:mm') : '--:--'}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full shadow"
                      onClick={scrollToTop}
                      title="Subir conversa"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 rounded-full shadow"
                      onClick={scrollToBottom}
                      title="Descer conversa"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {isUploading && uploadProgress !== null && (
                  <div className="px-4 pb-2 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Uploading {uploadProgress}%</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                  </div>
                )}

                <form
                  onSubmit={handleSendMessage}
                  className="shrink-0 p-3 sm:p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex gap-2 sticky bottom-0"
                >
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
                    disabled={isSending || isUploading || isBlocked}
                    onClick={() => fileInputRef.current?.click()}
                    title="Enviar imagem"
                  >
                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  </Button>

                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escreva uma mensagem..."
                    disabled={isSending || isUploading || isBlocked}
                    className="flex-1 min-w-0"
                  />

                  <Button type="submit" disabled={isSending || isUploading || isBlocked || !newMessage.trim()} size="icon">
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
