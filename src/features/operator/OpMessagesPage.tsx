import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { MessageSquare, Send, ArrowLeft, User } from 'lucide-react';
import { Button, Card, Textarea, Spinner } from '@/components/ui';
import { PageHeading, EmptyState } from '@/components/shared/common';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/lib/auth';
import {
  useOpConversations,
  useConversationMessages,
  useSendMessage,
  useMarkConversationRead,
  type OpConversation,
} from '@/lib/queries';
import { cn, formatDate } from '@/lib/utils';

export function OpMessagesPage() {
  const { i18n } = useTranslation();
  const toast = useToast();
  const { profile } = useAuth();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : 'bg';
  const dateLocale = lang === 'en' ? 'en-GB' : 'bg-BG';

  const L =
    lang === 'bg'
      ? {
          title: 'Съобщения',
          subtitle: 'Запитвания от клиенти — отговорете оттук.',
          listEmpty: 'Няма разговори',
          listEmptyDesc: 'Когато клиент ви напише, разговорът се появява тук.',
          pick: 'Изберете разговор',
          pickDesc: 'Изберете клиент отляво, за да видите съобщенията.',
          noMessages: 'Няма съобщения',
          placeholder: 'Напишете отговор…',
          send: 'Изпрати',
          you: 'Вие',
          client: 'Клиент',
          err: 'Възникна грешка. Опитайте отново.',
        }
      : {
          title: 'Messages',
          subtitle: 'Customer enquiries — reply from here.',
          listEmpty: 'No conversations',
          listEmptyDesc: 'When a client messages you, the conversation appears here.',
          pick: 'Select a conversation',
          pickDesc: 'Pick a client on the left to see their messages.',
          noMessages: 'No messages',
          placeholder: 'Write a reply…',
          send: 'Send',
          you: 'You',
          client: 'Client',
          err: 'Something went wrong. Please try again.',
        };

  const { data: conversations, isLoading } = useOpConversations();
  const [selected, setSelected] = useState<OpConversation | null>(null);
  const { data: messages, isLoading: msgsLoading } = useConversationMessages(selected?.id ?? null);
  const send = useSendMessage();
  const markRead = useMarkConversationRead();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Mark read whenever a conversation is opened (or gains new messages while open).
  useEffect(() => {
    if (selected?.id) markRead.mutate({ conversationId: selected.id, side: 'operator' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, messages?.length]);

  // Auto-scroll the thread to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !selected || !profile || send.isPending) return;
    try {
      await send.mutateAsync({ conversationId: selected.id, senderId: profile.id, body });
      setDraft('');
    } catch {
      toast.error(L.err);
    }
  };

  return (
    <div>
      <PageHeading title={L.title} subtitle={L.subtitle} />

      <div className="grid h-[calc(100vh-13rem)] min-h-[26rem] grid-cols-1 gap-4 lg:grid-cols-[20rem_1fr]">
        {/* Conversation list */}
        <Card className={cn('flex flex-col overflow-hidden', selected && 'hidden lg:flex')}>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center py-10">
                <Spinner className="h-6 w-6" />
              </div>
            ) : !conversations || conversations.length === 0 ? (
              <div className="flex h-full items-center justify-center p-6">
                <EmptyState title={L.listEmpty} description={L.listEmptyDesc} icon={<MessageSquare className="h-7 w-7" />} />
              </div>
            ) : (
              conversations.map((c) => {
                const fromStaff = !!c.last_sender_id && c.last_sender_id !== c.client_id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={cn(
                      'flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted',
                      selected?.id === c.id && 'bg-muted',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('truncate text-sm text-foreground', c.unread ? 'font-bold' : 'font-medium')}>
                        {c.client_name || c.client_code || '—'}
                      </span>
                      {c.unread ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="unread" />
                      ) : c.last_at ? (
                        <span className="shrink-0 text-[11px] text-muted-fg">
                          {formatDate(c.last_at, dateLocale, { day: '2-digit', month: 'short' })}
                        </span>
                      ) : null}
                    </div>
                    <span className="truncate text-xs text-muted-fg">
                      {fromStaff && <span className="text-muted-fg/80">{L.you}: </span>}
                      {c.last_body ?? L.noMessages}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Thread */}
        <Card className={cn('flex flex-col overflow-hidden', !selected && 'hidden lg:flex')}>
          {!selected ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState title={L.pick} description={L.pickDesc} icon={<MessageSquare className="h-7 w-7" />} />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-3">
                <button
                  className="rounded-lg p-1.5 text-muted-fg hover:bg-muted hover:text-foreground lg:hidden"
                  onClick={() => setSelected(null)}
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4.5 w-4.5" />
                </button>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <User className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{selected.client_name || L.client}</p>
                  {selected.client_code && <p className="font-mono text-xs text-muted-fg">{selected.client_code}</p>}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {msgsLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Spinner className="h-6 w-6" />
                  </div>
                ) : !messages || messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-fg">{L.noMessages}</p>
                ) : (
                  messages.map((mm, i) => {
                    const own = mm.sender_id !== selected.client_id; // any staff reply
                    return (
                      <motion.div
                        key={mm.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.16, delay: Math.min(i, 6) * 0.015 }}
                        className={cn('flex', own ? 'justify-end' : 'justify-start')}
                      >
                        <div className="max-w-[78%]">
                          <div
                            className={cn(
                              'rounded-2xl px-3.5 py-2.5 text-sm shadow-soft',
                              own ? 'rounded-br-md bg-brand text-brand-fg' : 'rounded-bl-md bg-muted text-foreground',
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{mm.body}</p>
                          </div>
                          <p className={cn('mt-1 px-1 text-[11px] text-muted-fg', own ? 'text-right' : 'text-left')}>
                            {own ? L.you : selected.client_name || L.client} ·{' '}
                            {formatDate(mm.created_at, dateLocale, {
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
              <form onSubmit={onSend} className="flex items-end gap-2 border-t border-border p-3">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void onSend(e);
                    }
                  }}
                  placeholder={L.placeholder}
                  rows={1}
                  className="min-h-[44px] flex-1 resize-none"
                />
                <Button type="submit" className="h-11 shrink-0 gap-2" loading={send.isPending} disabled={!draft.trim()}>
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">{L.send}</span>
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
