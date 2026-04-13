import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MessageCircle, Send, X, Loader2, ImagePlus, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { processImageForUpload } from '@/lib/imageUtils';

const IMAGE_PREFIX = '[image:';
const IMAGE_SUFFIX = ']';
const MAX_INLINE_IMAGE_BYTES = 2 * 1024 * 1024;

function isImageMessage(content: string): boolean {
  return content.startsWith(IMAGE_PREFIX) && content.endsWith(IMAGE_SUFFIX);
}

function extractImageUrl(content: string): string {
  return content.slice(IMAGE_PREFIX.length, -IMAGE_SUFFIX.length);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao converter imagem.'));
    reader.readAsDataURL(file);
  });
}

function triggerBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !("Notification" in window)) return;
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

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

function sortMessagesChronologically(list: Message[]): Message[] {
  return [...list].sort((a, b) => {
    const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });
}

function mergeMessageById(list: Message[], incoming: Message): Message[] {
  if (list.some((msg) => msg.id === incoming.id)) return list;
  return sortMessagesChronologically([...list, incoming]);
}

export function CustomerChat() {
  const { user, isEmailVerified } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationIds, setConversationIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatInitError, setChatInitError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaWrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const hasInitializedScrollRef = useRef(false);

  const getScrollViewport = useCallback(() => {
    return scrollAreaWrapperRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
  }, []);

  // Fetch unread count on mount (even when chat is closed)
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setConversationId(null);
      setConversationIds([]);
      setMessages([]);
      return;
    }

    const fetchUnread = async () => {
      // Find all user conversations to compute unread and restore history.
      const { data: convs } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('customer_id', user.id)
        .limit(200);

      if (!convs || convs.length === 0) return;
      const ids = convs.map((c) => c.id);
      setConversationIds(ids);
      setConversationId(ids[0]);

      // Count unread admin/system messages across all conversations.
      const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', ids)
        .in('sender_role', ['admin', 'system'])
        .eq('is_read', false);

      setUnreadCount(count || 0);
    };

    fetchUnread();
  }, [user]);

  // Keep conversation IDs synced in realtime to avoid missing admin messages.
  useEffect(() => {
    if (!user) return;

    const convChannel = supabase
      .channel(`customer-conversations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
          filter: `customer_id=eq.${user.id}`,
        },
        async () => {
          const { data: convs } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('customer_id', user.id)
            .limit(200);

          const ids = (convs || []).map((c) => c.id);
          setConversationIds(ids);
          if (ids.length > 0) {
            setConversationId((prev) => prev || ids[0]);
            if (isOpen) {
              await fetchMessages(ids);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(convChannel);
    };
  }, [user, isOpen]);

  // Real-time subscription for new messages (works even when chat is closed)
  useEffect(() => {
    if (!user || conversationIds.length === 0) return;

    const channel = supabase
      .channel(`customer-chat-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (!conversationIds.includes(newMsg.conversation_id)) {
            return;
          }

          setMessages((prev) => mergeMessageById(prev, newMsg));

          // If the message is from admin/system and chat is not open, increment unread
          if (newMsg.sender_role !== 'customer' && !isOpen) {
            setUnreadCount((prev) => prev + 1);
            toast.info('Nova mensagem da equipa de suporte.');
          }

          if (newMsg.sender_role !== 'customer' && (document.hidden || !isOpen)) {
            triggerBrowserNotification('Nova mensagem no chat', 'A equipa respondeu no seu chat.');
          }

          // If chat is open, mark immediately as read
          if (isOpen && newMsg.sender_role !== 'customer') {
            supabase
              .from('chat_messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
              .then();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationIds, user, isOpen]);

  useEffect(() => {
    if (!user) return;

    const intervalId = window.setInterval(async () => {
      if (conversationIds.length > 0) {
        await fetchMessages(conversationIds);
      }

      if (!isOpen && conversationIds.length > 0) {
        const { count } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', conversationIds)
          .in('sender_role', ['admin', 'system'])
          .eq('is_read', false);
        setUnreadCount(count || 0);
      }
    }, 4000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [user, conversationIds, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    const viewport = getScrollViewport();
    viewport?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const viewport = getScrollViewport();
    if (!viewport) return;

    const handleScroll = () => {
      const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      shouldAutoScrollRef.current = distanceFromBottom < 80;
    };

    viewport.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [isOpen, getScrollViewport]);

  useEffect(() => {
    if (!isOpen || messages.length === 0) return;

    if (!hasInitializedScrollRef.current) {
      hasInitializedScrollRef.current = true;
      requestAnimationFrame(() => scrollToBottom());
      return;
    }

    if (shouldAutoScrollRef.current) {
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [messages, isOpen]);

  // When chat opens, load conversation and mark messages read
  useEffect(() => {
    if (user && isOpen) {
      hasInitializedScrollRef.current = false;
      shouldAutoScrollRef.current = true;
      fetchOrCreateConversation();
    }
  }, [user, isOpen]);

  // When chat opens, mark all admin messages as read and reset badge
  useEffect(() => {
    if (isOpen && conversationIds.length > 0) {
      markAdminMessagesRead(conversationIds);
      setUnreadCount(0);
    }
  }, [isOpen, conversationIds]);

  const markAdminMessagesRead = async (convIds: string[]) => {
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .in('conversation_id', convIds)
      .in('sender_role', ['admin', 'system'])
      .eq('is_read', false);
  };

  const fetchOrCreateConversation = async (): Promise<{ activeConversationId: string; allConversationIds: string[] } | null> => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Load all user conversations to preserve full history.
      const [bySnake, byCamel] = await Promise.all([
        supabase
          .from('chat_conversations')
          .select('id, status, updated_at, created_at')
          .eq('customer_id', user.id)
          .limit(1000),
        supabase
          .from('chat_conversations')
          .select('id, status, updated_at, created_at')
          .eq('customerId', user.id)
          .limit(1000),
      ]);

      const fetchError = bySnake.error || byCamel.error;
      const existingConvs = [...(bySnake.data || []), ...(byCamel.data || [])]
        .filter((conv, index, arr) => arr.findIndex((c) => c.id === conv.id) === index)
        .sort((a, b) => {
          const aTime = new Date((a as any).updated_at || (a as any).created_at || 0).getTime();
          const bTime = new Date((b as any).updated_at || (b as any).created_at || 0).getTime();
          return bTime - aTime;
        });

      if (fetchError) throw fetchError;

      let convId = existingConvs?.[0]?.id;
      let allIds = (existingConvs || []).map((c) => c.id);

      if (!convId) {
        // Create new conversation (try both field conventions)
        let createResult = await supabase
          .from('chat_conversations')
          .insert({ customer_id: user.id, status: 'active' })
          .select('id')
          .single();

        if (createResult.error) {
          createResult = await supabase
            .from('chat_conversations')
            .insert({ customerId: user.id, status: 'active' })
            .select('id')
            .single();
        }

        if (createResult.error || !createResult.data?.id) {
          throw createResult.error || new Error('Não foi possível criar conversa.');
        }

        convId = createResult.data.id;
        allIds = [convId];
      } else if (existingConvs?.[0]?.status !== 'active' && existingConvs?.[0]?.status !== 'open') {
        // Reopen latest conversation so customer keeps full history in one thread.
        await supabase
          .from('chat_conversations')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', convId);
      }

      setConversationId(convId);
      setConversationIds(allIds);
      setChatInitError(null);
      await fetchMessages(allIds);
      return { activeConversationId: convId, allConversationIds: allIds };
    } catch (error: any) {
      console.error('Error fetching/creating conversation:', error);
      setChatInitError(error?.message || 'Não foi possível iniciar a conversa.');
      toast.error('Erro ao iniciar chat: ' + (error?.message || 'sem detalhes'));
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const ensureConversationReady = useCallback(async (): Promise<string | null> => {
    if (conversationId) return conversationId;

    const result = await fetchOrCreateConversation();
    if (!result) return null;
    return result.activeConversationId;
  }, [conversationId, user]);

  const fetchMessages = async (convIds: string[]) => {
    if (convIds.length === 0) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(sortMessagesChronologically(data || []));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      const activeConversationId = await ensureConversationReady();
      if (!activeConversationId) {
        throw new Error(chatInitError || 'Não foi possível iniciar a conversa.');
      }

      const { data: insertedMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: activeConversationId,
          sender_id: user.id,
          sender_role: 'customer',
          content: newMessage.trim(),
        })
        .select('*')
        .single();

      if (error) throw error;

      if (insertedMessage) {
        setMessages((prev) => mergeMessageById(prev, insertedMessage as Message));
      }

      setNewMessage('');

      // Update conversation timestamp
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString(), status: 'active' })
        .eq('id', activeConversationId);

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem: ' + (error?.message || 'sem detalhes'));
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um ficheiro de imagem');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const activeConversationId = await ensureConversationReady();
      if (!activeConversationId) {
        throw new Error(chatInitError || 'Não foi possível iniciar a conversa.');
      }

      const optimized = await processImageForUpload(file);
      const ext = optimized.name.split('.').pop() || 'webp';
      const path = `${user.id}/${activeConversationId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

      let imageUrl: string | null = null;
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(path, optimized, { cacheControl: '3600', upsert: false });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('chat-images')
          .getPublicUrl(path);
        imageUrl = publicUrl;
      } else {
        // Compatibility fallback for environments where chat-images bucket/policies are missing.
        if (optimized.size > MAX_INLINE_IMAGE_BYTES) {
          throw new Error('Não foi possível enviar por storage e a imagem é grande para modo compatibilidade (máx. 2MB).');
        }
        imageUrl = await fileToDataUrl(optimized);
        toast.info('Storage indisponível. Imagem enviada em modo compatibilidade.');
      }

      // Send the image URL as a chat message
      const { data: insertedMessage, error: msgError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: activeConversationId,
          sender_id: user.id,
          sender_role: 'customer',
          content: `${IMAGE_PREFIX}${imageUrl}${IMAGE_SUFFIX}`,
        })
        .select('*')
        .single();

      if (msgError) throw msgError;

      if (insertedMessage) {
        setMessages((prev) => mergeMessageById(prev, insertedMessage as Message));
      }

      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', activeConversationId);

      toast.success('Imagem enviada!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Erro ao enviar imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const renderMessageContent = (msg: Message) => {
    if (isImageMessage(msg.content)) {
      const url = extractImageUrl(msg.content);
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img
            src={url}
            alt="Imagem enviada"
            className="max-w-full max-h-48 rounded-md object-cover cursor-pointer hover:opacity-90 transition-opacity"
            loading="lazy"
          />
        </a>
      );
    }
    return <p className="text-sm whitespace-pre-line">{msg.content}</p>;
  };

  const handleOpenChat = () => {
    if (!user) {
      toast.info('Faça login para conversar connosco');
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

  const retryChatInitialization = async () => {
    if (!user) return;
    await fetchOrCreateConversation();
  };

  return (
    <>
      {/* Floating chat button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleOpenChat}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 relative"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center animate-in zoom-in-50 shadow-md">
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
                  <div className="mx-4 mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-900">Erro ao iniciar chat</p>
                    <p className="text-xs text-amber-800 mt-1">{chatInitError}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={retryChatInitialization}>
                        Tentar novamente
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)}>
                        Fechar
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div ref={scrollAreaWrapperRef} className="relative flex-1 min-h-0">
                <ScrollArea className="h-full p-4 touch-pan-y overscroll-contain">
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <p>Olá! 👋</p>
                        <p className="text-sm mt-2">
                          Envie uma mensagem e responderemos o mais breve possível.
                        </p>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender_role === 'system'
                            ? 'justify-center'
                            : msg.sender_role === 'customer'
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        {msg.sender_role === 'system' ? (
                          <div className="max-w-[90%] rounded-lg px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-center">
                            <p className="text-sm whitespace-pre-line text-blue-800 dark:text-blue-200">{msg.content}</p>
                            <p className="text-xs mt-1 text-blue-500 dark:text-blue-400">
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </p>
                          </div>
                        ) : (
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              msg.sender_role === 'customer'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${
                              msg.sender_role === 'customer' ? 'text-primary-foreground/80' : 'text-muted-foreground'
                            }`}>
                              {msg.sender_role === 'customer' ? 'Cliente' : 'Admin'}
                            </p>
                            {renderMessageContent(msg)}
                            <p className={`text-xs mt-1 ${
                              msg.sender_role === 'customer' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
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

                <form onSubmit={handleSendMessage} className="shrink-0 p-3 sm:p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex gap-2 sticky bottom-0">
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
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escreva uma mensagem..."
                    disabled={isSending || isUploading}
                    className="flex-1 min-w-0"
                  />
                  <Button type="submit" disabled={isSending || isUploading || !newMessage.trim()} size="icon">
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
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
