import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { MessageSquare, Send, Headset } from 'lucide-react';
import { Button, Card, CardBody, Textarea, Spinner } from '@/components/ui';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import { useMarkConversationRead } from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import { cn, formatDate } from '@/lib/utils';

interface ConversationRow {
  id: string;
  client_id: string;
  subject: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

export function MessagesPage() {
  const { i18n } = useTranslation();
  const toast = useToast();
  const { profile } = useAuth();
  const markRead = useMarkConversationRead();
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const dateLocale = locale === 'en' ? 'en-GB' : 'bg-BG';

  const L =
    locale === 'bg'
      ? {
          title: 'Съобщения',
          subtitle: 'Пишете директно на нашия офис — отговаряме бързо.',
          office: 'Доставки Хубенов',
          empty_title: 'Започнете разговор',
          empty_desc: 'Изпратете първото си съобщение и нашият екип ще се свърже с вас.',
          placeholder: 'Напишете съобщение…',
          send: 'Изпрати',
          you: 'Вие',
        }
      : {
          title: 'Messages',
          subtitle: 'Message our office directly — we reply quickly.',
          office: 'Hubenov Deliveries',
          empty_title: 'Start a conversation',
          empty_desc: 'Send your first message and our team will get back to you.',
          placeholder: 'Write a message…',
          send: 'Send',
          you: 'You',
        };

  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const errorMessage = locale === 'en' ? 'Something went wrong. Please try again.' : 'Възникна грешка. Опитайте отново.';

  const loadMessages = useCallback(
    async (conversationId: string): Promise<void> => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('id, conversation_id, sender_id, body, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        setMessages((data ?? []) as MessageRow[]);
      } catch {
        toast.error(errorMessage);
      }
    },
    [toast, errorMessage],
  );

  // Resolve (or create) the single conversation, then load its messages.
  useEffect(() => {
    if (!profile) return;
    let active = true;

    const init = async (): Promise<void> => {
      setLoading(true);
      try {
        // One conversation per client. Upsert is atomic, so React StrictMode's
        // double mount can't create duplicates (which previously broke
        // .maybeSingle() and surfaced as a random error toast).
        const { data: conv, error } = await supabase
          .from('conversations')
          .upsert({ client_id: profile.id, subject: 'Поддръжка' }, { onConflict: 'client_id' })
          .select('*')
          .single();
        if (error) throw error;

        if (!active) return;
        setConversation(conv as ConversationRow);
        await loadMessages((conv as ConversationRow).id);
      } catch {
        if (active) toast.error(errorMessage);
      } finally {
        if (active) setLoading(false);
      }
    };

    void init();
    return () => {
      active = false;
    };
  }, [profile, loadMessages, toast, errorMessage]);

  // Realtime: reload on INSERT into this conversation.
  useEffect(() => {
    if (!conversation) return;
    const channel = supabase
      .channel(`messages-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        () => {
          void loadMessages(conversation.id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversation, loadMessages]);

  // Auto-scroll to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Viewing the thread == caught up → clear the portal unread badge.
  useEffect(() => {
    if (conversation?.id) markRead.mutate({ conversationId: conversation.id, side: 'client' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, messages.length]);

  const send = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !conversation || !profile || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_id: profile.id,
        body,
      });
      if (error) throw error;
      // Best-effort: email the office so the message isn't missed. Never block.
      try {
        await supabase.functions.invoke('message-notify', { body: { conversation_id: conversation.id } });
      } catch {
        /* notification is non-critical */
      }
      setDraft('');
      await loadMessages(conversation.id);
    } catch {
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeading title={L.title} subtitle={L.subtitle} />

      <Card className="flex h-[calc(100vh-16rem)] min-h-[24rem] flex-col overflow-hidden">
        {/* Office header */}
        <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-5 py-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Headset className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{L.office}</p>
            <p className="text-xs text-muted-fg">{L.subtitle}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title={L.empty_title}
                description={L.empty_desc}
                icon={<MessageSquare className="h-7 w-7" />}
              />
            </div>
          ) : (
            messages.map((m, i) => {
              const own = m.sender_id === profile.id;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.16, delay: Math.min(i, 6) * 0.015 }}
                  className={cn('flex', own ? 'justify-end' : 'justify-start')}
                >
                  <div className={cn('max-w-[78%]', own ? 'items-end' : 'items-start')}>
                    <div
                      className={cn(
                        'rounded-2xl px-3.5 py-2.5 text-sm shadow-soft',
                        own
                          ? 'rounded-br-md bg-brand text-brand-fg'
                          : 'rounded-bl-md bg-muted text-foreground',
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                    </div>
                    <p
                      className={cn(
                        'mt-1 px-1 text-[11px] text-muted-fg',
                        own ? 'text-right' : 'text-left',
                      )}
                    >
                      {own ? L.you : L.office} ·{' '}
                      {formatDate(m.created_at, dateLocale, {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <CardBody className="border-t border-border p-3.5">
          <form onSubmit={send} className="flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(e);
                }
              }}
              placeholder={L.placeholder}
              rows={1}
              className="min-h-[44px] flex-1 resize-none"
              disabled={loading || !conversation}
            />
            <Button
              type="submit"
              className="h-11 shrink-0 gap-2"
              loading={sending}
              disabled={!draft.trim() || loading || !conversation}
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{L.send}</span>
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
