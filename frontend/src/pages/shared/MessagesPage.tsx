import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { IConversation, IMessage, IPatient } from '../../types';
import { Avatar, Field, inputCls, Modal, ModalHeader } from '../../components/ui/primitives';
import {
  MessageSquare,
  Send,
  Video,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string>(searchParams.get('conversation') || '');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [newPatientId, setNewPatientId] = useState('');
  const [creating, setCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || null,
    [conversations, selectedId]
  );

  const loadConversations = useCallback(async () => {
    try {
      const res = await apiClient.get('/conversations');
      const list: IConversation[] = res.data.data.conversations || [];
      setConversations(list);
      return list;
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations.');
      return [];
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await apiClient.get(`/conversations/${conversationId}/messages`);
      setMessages(res.data.data.messages || []);
      await apiClient.post(`/conversations/${conversationId}/read`).catch(() => undefined);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await loadConversations();
      const requested = searchParams.get('conversation');
      const nextId =
        (requested && list.some((conversation) => conversation.id === requested) && requested) ||
        list[0]?.id ||
        '';
      if (nextId) setSelectedId(nextId);
      setLoading(false);
    })();
    // Only run on mount; polling handles later updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    loadMessages(selectedId);
    setSearchParams({ conversation: selectedId }, { replace: true });
  }, [selectedId, loadMessages, setSearchParams]);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const list = await loadConversations();
      if (!selectedId && list[0]) setSelectedId(list[0].id);
      if (selectedId) {
        try {
          const res = await apiClient.get(`/conversations/${selectedId}/messages`);
          setMessages(res.data.data.messages || []);
        } catch {
          // Transient polling failure; the next tick retries.
        }
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [selectedId, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const openNewThread = async () => {
    setShowNew(true);
    if (patients.length > 0 || user?.role === 'patient') return;
    try {
      const res = await apiClient.get('/patients');
      const list: IPatient[] = res.data.data.patients || [];
      setPatients(list);
      setNewPatientId(list[0]?.id || '');
    } catch (err: any) {
      setError(err.message || 'Could not load patients.');
    }
  };

  const createThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientId) return;
    setCreating(true);
    setError(null);
    try {
      const res = await apiClient.post('/conversations', { patientId: newPatientId });
      const conversation: IConversation = res.data.data.conversation;
      const list = await loadConversations();
      if (!list.some((item) => item.id === conversation.id)) list.unshift(conversation);
      setConversations([...list]);
      setSelectedId(conversation.id);
      setShowNew(false);
      setToast('Conversation started.');
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Could not start the conversation.');
    } finally {
      setCreating(false);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await apiClient.post(`/conversations/${selectedId}/messages`, {
        body: draft.trim(),
      });
      setMessages((current) => [...current, res.data.data.message]);
      setDraft('');
      const list = await loadConversations();
      setConversations([...list]);
    } catch (err: any) {
      setError(err.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const startVideo = async () => {
    if (!selected) return;
    try {
      const res = await apiClient.post('/teleconsultations', {
        patientId: selected.patientId,
        doctorId: selected.doctorId,
      });
      window.open(res.data.data.teleconsultation.joinUrl, '_blank', 'noopener,noreferrer');
      setToast('Video room opened in a new tab.');
      setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      setError(err.message || 'Could not start the video consultation.');
    }
  };

  return (
    <div className="space-y-5 anim-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Messages
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Persistent care-team conversations with your patients and clinicians
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setError(null);
              loadConversations();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-full text-xs font-bold text-slate-700 shadow-sm"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          {user?.role !== 'patient' && (
            <button
              onClick={openNewThread}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#14532D] hover:bg-[#0B3D20] rounded-full text-xs font-bold text-white shadow-md"
            >
              <Plus size={13} /> New Conversation
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle size={15} /> {toast}
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-start gap-2">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
          {/* Conversation list */}
          <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-100 max-h-[280px] lg:max-h-none overflow-y-auto">
            {loading ? (
              <div className="p-6 text-xs text-slate-400">Loading conversations…</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                <MessageSquare size={26} className="mx-auto mb-2 text-slate-300" />
                No conversations yet.
                {user?.role === 'patient'
                  ? ' Open one from your profile or clinical profile page.'
                  : ' Start one with a patient.'}
              </div>
            ) : (
              conversations.map((conversation) => {
                const active = conversation.id === selectedId;
                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedId(conversation.id)}
                    className={`w-full text-left p-4 border-b border-slate-50 transition-colors ${
                      active ? 'bg-[#EAF9D8]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={conversation.patientName} size="sm" className="w-9 h-9 text-[11px]" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {conversation.patientName}
                          </p>
                          {conversation.lastMessageAt && (
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {formatTime(conversation.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-slate-500 truncate mt-0.5">
                          {conversation.lastMessagePreview || conversation.subject || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </aside>

          {/* Thread */}
          <section className="lg:col-span-8 flex flex-col min-h-[420px]">
            {!selected ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <MessageSquare size={34} className="text-slate-300 mb-2" />
                <p className="text-sm font-semibold">Select a conversation</p>
                <p className="text-xs mt-1">Messages are stored in the hospital database.</p>
              </div>
            ) : (
              <>
                <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {selected.subject || `Care thread: ${selected.patientName}`}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {selected.participantNames.join(' · ') || selected.patientName}
                    </p>
                  </div>
                  <button
                    onClick={startVideo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#14532D] text-white text-[11px] font-bold hover:bg-[#0B3D20] shrink-0"
                  >
                    <Video size={13} /> Video
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
                  {messages.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-10">
                      No messages in this thread yet. Say hello.
                    </p>
                  ) : (
                    messages.map((message) => {
                      const mine = message.senderId === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                              mine
                                ? 'bg-[#14532D] text-white rounded-br-md'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                            }`}
                          >
                            {!mine && (
                              <p className="text-[10px] font-bold mb-1 text-[#14532D]">
                                {message.senderName}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words">{message.body}</p>
                            <p
                              className={`text-[9.5px] mt-1 ${
                                mine ? 'text-[#C7FF75]/80' : 'text-slate-400'
                              }`}
                            >
                              {formatTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={send} className="p-3 border-t border-slate-100 flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    maxLength={4000}
                    placeholder="Write a message…"
                    className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#14532D]/20 focus:border-[#14532D]"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#14532D] text-white text-xs font-bold hover:bg-[#0B3D20] disabled:opacity-50 shrink-0"
                  >
                    <Send size={13} /> {sending ? 'Sending…' : 'Send'}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)}>
        <ModalHeader
          title="Start a Conversation"
          subtitle="Open a persistent care thread with a patient"
          onClose={() => setShowNew(false)}
        />
        <form onSubmit={createThread} className="p-6 space-y-4">
          <Field label="Patient *">
            <select
              required
              value={newPatientId}
              onChange={(e) => setNewPatientId(e.target.value)}
              className={inputCls}
            >
              {patients.length === 0 ? (
                <option value="">No patients available</option>
              ) : (
                patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.fullName} ({patient.patientCode})
                  </option>
                ))
              )}
            </select>
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowNew(false)} className="hc-btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={creating || !newPatientId} className="hc-btn-blue">
              {creating ? 'Opening…' : 'Open Conversation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MessagesPage;
