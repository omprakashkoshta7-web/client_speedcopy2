import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ticketService, { type Ticket, type TicketStatus } from '../services/ticket.service';

const statusStyle: Record<TicketStatus, { bg: string; color: string; label: string }> = {
  open:        { bg: '#fef3c7', color: '#92400e', label: 'Open' },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  resolved:    { bg: '#d1fae5', color: '#065f46', label: 'Resolved' },
  closed:      { bg: '#f3f4f6', color: '#6b7280', label: 'Closed' },
};

const priorityStyle: Record<string, { bg: string; color: string }> = {
  low:    { bg: '#f3f4f6', color: '#6b7280' },
  medium: { bg: '#fef3c7', color: '#92400e' },
  high:   { bg: '#fee2e2', color: '#991b1b' },
  urgent: { bg: '#fce7f3', color: '#9d174d' },
};

const categoryLabel: Record<string, string> = {
  order_issue:    'Order Issue',
  payment_issue:  'Payment / Refund',
  delivery_issue: 'Delivery Problem',
  product_issue:  'Print Quality',
  account_issue:  'Account Issue',
  other:          'Other',
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const shortId = (id: string) => `#SC-${id.slice(-6).toUpperCase()}`;

const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) fetchTicket();
  }, [id]);

  useEffect(() => {
    // Scroll to bottom of replies when loaded
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.replies]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const res = await ticketService.getTicketById(id!);
      setTicket(res.data);
    } catch (err) {
      console.error('Failed to fetch ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() && attachments.length === 0) return;
    setReplying(true);
    setReplyError('');
    try {
      // Upload attachments first if any
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        setUploadingAttachments(true);
        try {
          console.log('📤 Uploading attachments:', attachments.map(f => f.name));
          const uploadRes = await ticketService.uploadAttachments(attachments);
          console.log('✅ Upload response:', uploadRes);
          attachmentUrls = uploadRes?.data?.attachments || [];
          console.log('📎 Attachment URLs received:', attachmentUrls);
        } catch (uploadErr) {
          console.error('❌ Attachment upload failed:', uploadErr);
          setReplyError('Failed to upload attachments. Proceeding without them.');
        } finally {
          setUploadingAttachments(false);
        }
      }

      console.log('💬 Sending reply with attachments:', { message: replyText.trim(), attachmentUrls });
      const res = await ticketService.replyToTicket(id!, replyText.trim(), attachmentUrls);
      console.log('✅ Reply response:', res);
      setTicket(res.data);
      setReplyText('');
      setAttachments([]);
    } catch (err: any) {
      console.error('❌ Reply error:', err);
      setReplyError(err?.response?.data?.message || 'Failed to send reply. Try again.');
    } finally {
      setReplying(false);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).filter(file => file.size <= 10 * 1024 * 1024);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).filter(file => file.size <= 10 * 1024 * 1024);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded-xl w-1/3" />
            <div className="h-40 bg-white rounded-2xl" />
            <div className="h-32 bg-white rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
          <p className="text-gray-500 font-medium mb-4">Ticket not found.</p>
          <button
            onClick={() => navigate('/help')}
            className="px-6 py-2.5 text-white font-bold rounded-full text-sm"
            style={{ backgroundColor: '#111111' }}
          >
            Back to Help
          </button>
        </div>
      </div>
    );
  }

  const s = statusStyle[ticket.status] ?? statusStyle.open;
  const p = priorityStyle[ticket.priority] ?? priorityStyle.medium;
  const isClosed = ticket.status === 'resolved' || ticket.status === 'closed';

  return (
    <div style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        {/* Back */}
        <button
          onClick={() => navigate('/help')}
          className="flex items-center gap-2 text-sm font-semibold mb-5 hover:opacity-70 transition"
          style={{ color: '#9ca3af' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Help
        </button>

        {/* Ticket Header Card */}
        <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold mb-1" style={{ color: '#9ca3af' }}>{shortId(ticket._id)}</p>
              <h1 className="font-bold text-gray-900 text-lg leading-snug">{ticket.subject}</h1>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0"
              style={{ backgroundColor: s.bg, color: s.color }}>
              {s.label}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: p.bg, color: p.color }}>
              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
            </span>
            <span className="px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ backgroundColor: '#f3f4f6', color: '#374151' }}>
              {categoryLabel[ticket.category] || ticket.category}
            </span>
            {ticket.orderId && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ backgroundColor: '#eff6ff', color: '#1e40af' }}>
                Order: {ticket.orderId}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="rounded-xl p-4" style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#9ca3af' }}>DESCRIPTION</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
          </div>

          <p className="text-xs mt-3" style={{ color: '#9ca3af' }}>
            Created {formatDate(ticket.createdAt)} · Last updated {formatDate(ticket.updatedAt)}
          </p>
        </div>

        {/* Replies / Conversation */}
        <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <h2 className="font-bold text-gray-900 mb-4" style={{ fontSize: '15px' }}>
            Conversation
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
              {ticket.replies.length}
            </span>
          </h2>

          {ticket.replies.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-10 h-10 mx-auto mb-2" style={{ color: '#d1d5db' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 3H3c-1.1 0-2 .9-2 2v14l4-4h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
              </svg>
              <p className="text-sm text-gray-400">No replies yet. Our team will respond soon.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ticket.replies.map((reply) => {
                const isUser = reply.authorRole === 'user';
                return (
                  <div key={reply._id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{
                        backgroundColor: isUser ? '#111111' : '#6366f1',
                        color: '#fff',
                      }}>
                      {isUser ? 'U' : 'S'}
                    </div>
                    {/* Bubble */}
                    <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className="rounded-2xl px-4 py-3"
                        style={{
                          backgroundColor: isUser ? '#111111' : '#f3f4f6',
                          color: isUser ? '#fff' : '#374151',
                          borderBottomRightRadius: isUser ? '4px' : '16px',
                          borderBottomLeftRadius: isUser ? '16px' : '4px',
                        }}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{reply.message}</p>
                        {reply.attachments?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {reply.attachments.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs underline opacity-80 hover:opacity-100">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                Attachment {i + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs mt-1 px-1" style={{ color: '#9ca3af' }}>
                        {isUser ? 'You' : 'Support'} · {formatDate(reply.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Reply Box */}
        {!isClosed ? (
          <div className="bg-white rounded-2xl p-5" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <h3 className="font-bold text-gray-900 mb-3" style={{ fontSize: '14px' }}>Add Reply</h3>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none resize-none mb-3"
              style={{ border: '1.5px solid #e5e7eb', backgroundColor: '#f9fafb', color: '#374151' }}
            />

            {/* Attachment Upload Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl p-4 mb-3 cursor-pointer transition"
              style={{
                border: dragActive ? '2px solid #111111' : '1.5px dashed #e5e7eb',
                backgroundColor: dragActive ? '#f9fafb' : '#fafafa',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInput}
                accept="image/*,.pdf,.doc,.docx"
                style={{ display: 'none' }}
              />
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" style={{ color: '#9ca3af' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs font-medium" style={{ color: '#9ca3af' }}>
                  Click or drag files here (max 10MB each)
                </span>
              </div>
            </div>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{file.name}</p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <button
                      onClick={() => removeAttachment(idx)}
                      className="flex-shrink-0 p-1 hover:bg-red-50 rounded transition"
                      style={{ color: '#ef4444' }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {replyError && (
              <p className="text-xs font-medium mb-2" style={{ color: '#ef4444' }}>{replyError}</p>
            )}
            <div className="flex justify-end">
              <button
                onClick={handleReply}
                disabled={replying || uploadingAttachments || (!replyText.trim() && attachments.length === 0)}
                className="flex items-center gap-2 px-6 py-2.5 text-white font-bold rounded-full text-sm transition disabled:opacity-50"
                style={{ backgroundColor: '#111111' }}
              >
                {replying || uploadingAttachments ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {uploadingAttachments ? 'Uploading...' : 'Sending...'}
                  </>
                ) : (
                  <>
                    Send Reply
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl px-5 py-4 text-center" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <p className="text-sm font-semibold" style={{ color: '#065f46' }}>
              ✓ This ticket is {ticket.status}. No further replies needed.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};

export default TicketDetailPage;
