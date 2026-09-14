import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../frontend/context/AuthContext';
import { supabase } from '../../frontend/lib/supabase';
import {
  Sparkles,
  Send,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  RotateCcw,
  BookOpen
} from 'lucide-react';

const MENTOR_STARTER_PROMPTS = [
  'Help me prepare for my next mentee meeting.',
  "Review this student's project idea.",
  'Help me create a research roadmap.',
  'Suggest questions for a first mentorship meeting.',
  'Help me structure feedback for a capstone project.',
  'Help me plan guidance for my active mentees.'
];

const MAX_INPUT_CHARS = 2000;

export const MentorAiPage = () => {
  const { user, profile } = useAuth();

  // Mentor context state
  const [mentees, setMentees] = useState([]);
  const [menteeProjectsCount, setMenteeProjectsCount] = useState(0);
  const [contextLoading, setContextLoading] = useState(true);

  // Conversation state
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState(null);
  const [configNotice, setConfigNotice] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const hasInitializedWelcomeRef = useRef(false);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSubmitting]);

  // Load verified mentor context (active mentees and connected projects)
  useEffect(() => {
    let isMounted = true;

    async function loadMentorContext() {
      if (!user) return;
      try {
        setContextLoading(true);

        // Query active mentees under RLS
        const { data: mData, error: mErr } = await supabase
          .from('mentorships')
          .select(`
            id,
            status,
            created_at,
            student:profiles!student_id (
              id,
              full_name,
              department,
              role
            )
          `)
          .eq('mentor_id', user.id)
          .eq('status', 'accepted');

        if (mErr) {
          console.error('Error fetching mentees for Mentor AI:', mErr);
        }

        const activeMentees = mData || [];
        const menteeIds = activeMentees.map((m) => m.student?.id).filter(Boolean);

        let pCount = 0;
        if (menteeIds.length > 0) {
          const { count, error: pErr } = await supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .in('user_id', menteeIds);

          if (pErr) console.error('Error fetching mentee projects count:', pErr);
          pCount = count || 0;
        }

        if (isMounted) {
          setMentees(activeMentees);
          setMenteeProjectsCount(pCount);
        }
      } catch (err) {
        console.error('Error assembling mentor context:', err);
      } finally {
        if (isMounted) setContextLoading(false);
      }
    }

    loadMentorContext();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Initialize introductory welcome message once context is loaded
  useEffect(() => {
    if (!contextLoading && !hasInitializedWelcomeRef.current) {
      hasInitializedWelcomeRef.current = true;
      const mentorName = profile?.full_name || 'Professor';
      const deptName = profile?.department ? ` in the Department of ${profile.department}` : '';
      const menteeCount = mentees.length;

      let introText = `Welcome, ${mentorName}. I am your Mentra Faculty Advisory AI.`;
      if (menteeCount > 0) {
        const scholarNames = mentees.map((m) => m.student?.full_name || 'Scholar').join(', ');
        introText += ` I am synced with your authorized institutional mentorship roster${deptName}.\n\nYou are currently advising **${menteeCount} active scholar${menteeCount === 1 ? '' : 's'}** (${scholarNames}) across **${menteeProjectsCount} recorded project${menteeProjectsCount === 1 ? '' : 's'}**.\n\nI can assist you with meeting agendas, research roadmaps, rubric drafting, and constructive feedback. How may I support your mentorship today?`;
      } else {
        introText += ` You are registered as a verified faculty mentor${deptName}.\n\nAs you accept student mentorship requests in Mentra, your scholars' project portfolios will automatically inform our advisory discussions.\n\nYou can use this space right now to plan curriculum guidance, review research topics, or prepare structured frameworks for incoming scholars. How can I assist you?`;
      }

      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: introText,
          timestamp: new Date()
        }
      ]);
    }
  }, [contextLoading, mentees, menteeProjectsCount, profile]);

  // Handle inquiry submission
  const handleSendMessage = async (textToSend) => {
    const promptText = (textToSend !== undefined ? textToSend : inputPrompt).trim();
    if (!promptText || isSubmitting) return;

    if (promptText.length > MAX_INPUT_CHARS) {
      setErrorMessage(`Inquiry exceeds the maximum limit of ${MAX_INPUT_CHARS} characters.`);
      return;
    }

    setErrorMessage(null);
    setLastFailedPrompt(null);

    // Append user message to conversation
    const userMsg = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: promptText,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsSubmitting(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('personal-ai', {
        body: {
          message: promptText,
          history: historyPayload
        }
      });

      if (edgeError) {
        let errorMsg = edgeError.message || 'Supabase Edge Function communication error';
        if (edgeError.context) {
          try {
            const bodyJson = await edgeError.context.json();
            if (bodyJson?.message) errorMsg = bodyJson.message;
            if (bodyJson?.error === 'CONFIG_REQUIRED') {
              setConfigNotice(bodyJson.message);
            }
          } catch {
            // retain fallback message
          }
        }
        throw new Error(errorMsg);
      }

      if (edgeData?.error) {
        if (edgeData.error === 'CONFIG_REQUIRED') {
          setConfigNotice(edgeData.message);
        }
        throw new Error(edgeData.message || edgeData.error);
      }

      if (!edgeData?.reply) {
        throw new Error('No reply received from personal-ai Edge Function.');
      }

      const assistantMsg = {
        id: 'reply-' + Date.now(),
        role: 'assistant',
        content: edgeData.reply,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Faculty AI inquiry error:', err);
      const msg = err.message || 'Unable to connect to the Faculty AI service.';
      setErrorMessage(msg);
      setLastFailedPrompt(promptText);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectStarter = (prompt) => {
    setInputPrompt(prompt);
    handleSendMessage(prompt);
  };

  const handleRetryLast = () => {
    if (!lastFailedPrompt) return;
    const promptToRetry = lastFailedPrompt;
    setLastFailedPrompt(null);
    setErrorMessage(null);
    handleSendMessage(promptToRetry);
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMessage(null);
    setLastFailedPrompt(null);
    hasInitializedWelcomeRef.current = false;
    setTimeout(() => {
      setContextLoading(true);
      setTimeout(() => setContextLoading(false), 50);
    }, 50);
  };

  const remainingChars = MAX_INPUT_CHARS - inputPrompt.length;
  const isOverLimit = remainingChars < 0;

  return (
    <div style={{ backgroundColor: 'var(--color-warm-ivory)', minHeight: 'calc(100vh - 4.25rem)' }}>
      {/* Header Section */}
      <section
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--color-white)',
          padding: '2.5rem 0 2rem 0'
        }}
      >
        <div className="container">
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.5rem'
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.3rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'rgba(184, 111, 82, 0.08)',
                  border: '1px solid rgba(184, 111, 82, 0.2)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--color-terracotta)',
                  marginBottom: '0.85rem'
                }}
              >
                <Sparkles size={14} />
                <span>Mentor Studio · Faculty Advisory Intelligence</span>
              </div>
              <h1
                className="font-serif"
                style={{
                  fontSize: '2.35rem',
                  color: 'var(--color-primary-dark)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.02em',
                  marginBottom: '0.5rem'
                }}
              >
                Personal AI Mentor
              </h1>
              <p
                style={{
                  fontSize: '1rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '650px',
                  lineHeight: 1.55
                }}
              >
                An intellectual advisory companion designed for verified faculty mentors. Prepare for student check-ins,
                structure research roadmaps, and plan actionable feedback for your active scholars.
              </p>
            </div>

            {/* Context Summary Pill */}
            <div
              style={{
                backgroundColor: 'var(--color-warm-ivory)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                minWidth: '270px'
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 700,
                  color: 'var(--color-terracotta)',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <ShieldCheck size={14} />
                <span>Connected Faculty Context</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                  <strong>{profile?.department || 'Faculty Mentor'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Verification:</span>
                  <strong style={{ color: '#2E7D32' }}>Verified Faculty</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Scholars:</span>
                  <strong>{contextLoading ? '...' : mentees.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mentee Projects:</span>
                  <strong>{contextLoading ? '...' : menteeProjectsCount}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Advisory Content Area */}
      <div className="container" style={{ padding: '2rem 1.5rem 3.5rem 1.5rem' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          {/* Institutional Advisory Disclaimer Banner */}
          <div
            style={{
              backgroundColor: '#FAF7F2',
              border: '1px solid var(--border-subtle)',
              borderLeft: '4px solid var(--color-terracotta)',
              borderRadius: 'var(--radius-md)',
              padding: '0.9rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.825rem',
              color: 'var(--text-secondary)'
            }}
          >
            <BookOpen size={18} style={{ color: 'var(--color-terracotta)', flexShrink: 0 }} />
            <div>
              <strong style={{ color: 'var(--color-primary-dark)' }}>Institutional Advisory Notice: </strong>
              This intelligence companion is designed to support, not replace, faculty judgment. Guidance suggestions should be adapted to your department's specific academic standards and evaluation criteria.
            </div>
          </div>

          {/* Config Notice if secret missing */}
          {configNotice && (
            <div
              style={{
                backgroundColor: '#FFF9F0',
                border: '1px solid #E6D2B5',
                borderLeft: '4px solid var(--color-warm-gold)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '1rem'
              }}
            >
              <AlertCircle size={22} style={{ color: 'var(--color-warm-gold)', flexShrink: 0, marginTop: '0.15rem' }} />
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#664D1B', marginBottom: '0.35rem' }}>
                  Supabase Edge Function Notice
                </div>
                <p style={{ fontSize: '0.875rem', color: '#55421B', lineHeight: 1.55, margin: 0 }}>
                  {configNotice}
                </p>
              </div>
            </div>
          )}

          {/* Chat Container Card */}
          <div
            style={{
              backgroundColor: 'var(--color-white)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '560px',
              boxShadow: '0 4px 20px rgba(23, 21, 19, 0.03)'
            }}
          >
            {/* Sub-header */}
            <div
              style={{
                padding: '0.9rem 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: '#FAF7F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTopLeftRadius: 'var(--radius-lg)',
                borderTopRightRadius: 'var(--radius-lg)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#2E7D32'
                  }}
                />
                <span>Mentra Personal AI · Faculty Advisory Mode</span>
              </div>

              {messages.length > 1 && (
                <button
                  onClick={handleClearChat}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-sm)'
                  }}
                  title="Reset consultation dialogue"
                >
                  <RefreshCw size={13} />
                  <span>Reset dialogue</span>
                </button>
              )}
            </div>

            {/* Message Stream */}
            <div
              style={{
                flex: 1,
                padding: '1.75rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}
            >
              {messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isAssistant ? 'flex-start' : 'flex-end',
                      width: '100%'
                    }}
                  >
                    {/* Author Meta */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginBottom: '0.35rem',
                        padding: '0 0.25rem'
                      }}
                    >
                      {isAssistant ? (
                        <>
                          <Sparkles size={13} style={{ color: 'var(--color-terracotta)' }} />
                          <span style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>Faculty AI Advisor</span>
                        </>
                      ) : (
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>You</span>
                      )}
                      <span>•</span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Bubble */}
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '1rem 1.35rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isAssistant ? 'var(--color-warm-ivory)' : 'var(--color-primary-dark)',
                        color: isAssistant ? 'var(--color-primary-dark)' : 'var(--color-warm-ivory)',
                        border: isAssistant ? '1px solid var(--border-subtle)' : 'none',
                        lineHeight: 1.65,
                        fontSize: '0.95rem',
                        whiteSpace: 'pre-wrap',
                        boxShadow: isAssistant ? 'none' : '0 2px 8px rgba(0,0,0,0.08)'
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}

              {/* Submitting indicator */}
              {isSubmitting && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    width: '100%'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.35rem',
                      padding: '0 0.25rem'
                    }}
                  >
                    <Sparkles size={13} style={{ color: 'var(--color-terracotta)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>Faculty AI Advisor</span>
                  </div>
                  <div
                    style={{
                      padding: '0.85rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-warm-ivory)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <div
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        border: '2px solid var(--color-terracotta)',
                        borderTopColor: 'transparent',
                        animation: 'mentor-ai-spin 0.9s linear infinite'
                      }}
                    />
                    <span>Synthesizing authorized mentee portfolios and academic guidance...</span>
                  </div>
                </div>
              )}

              {/* Error Message Box */}
              {errorMessage && (
                <div
                  style={{
                    backgroundColor: '#FDF3F2',
                    border: '1px solid #F5C6CB',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem 1.25rem',
                    color: '#721C24',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Advisory Notice</div>
                      <div>{errorMessage}</div>
                    </div>
                  </div>

                  {lastFailedPrompt && (
                    <button
                      onClick={handleRetryLast}
                      className="btn btn-secondary btn-sm"
                      style={{
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        padding: '0.3rem 0.65rem'
                      }}
                    >
                      <RotateCcw size={13} />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* 6 Starter Prompt Chips */}
            <div
              style={{
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: '#FAF7F2'
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem'
                }}
              >
                Suggested Faculty Inquiries:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {MENTOR_STARTER_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSelectStarter(q)}
                    disabled={isSubmitting}
                    style={{
                      padding: '0.35rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--color-white)',
                      fontSize: '0.78rem',
                      color: 'var(--text-secondary)',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.borderColor = 'var(--color-terracotta)';
                        e.currentTarget.style.backgroundColor = 'var(--color-warm-ivory)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSubmitting) {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.backgroundColor = 'var(--color-white)';
                      }
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form Area */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{
                padding: '1.25rem 1.5rem',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'flex-end',
                gap: '0.85rem'
              }}
            >
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  ref={inputRef}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask for guidance on mentee check-ins, research roadmaps, or project feedback..."
                  rows={2}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isOverLimit ? '#D32F2F' : 'var(--border-subtle)'}`,
                    backgroundColor: 'var(--color-warm-ivory)',
                    color: 'var(--color-primary-dark)',
                    fontSize: '0.925rem',
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                    lineHeight: 1.45,
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => {
                    if (!isOverLimit) e.target.style.borderColor = 'var(--color-terracotta)';
                  }}
                  onBlur={(e) => {
                    if (!isOverLimit) e.target.style.borderColor = 'var(--border-subtle)';
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.25rem'
                  }}
                >
                  <span>
                    Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line
                  </span>
                  <span style={{ color: isOverLimit ? '#D32F2F' : 'var(--text-muted)', fontWeight: isOverLimit ? 700 : 500 }}>
                    {inputPrompt.length} / {MAX_INPUT_CHARS}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !inputPrompt.trim() || isOverLimit}
                className="btn btn-primary"
                style={{
                  height: '46px',
                  padding: '0 1.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: isSubmitting || !inputPrompt.trim() || isOverLimit ? 0.6 : 1,
                  cursor: isSubmitting || !inputPrompt.trim() || isOverLimit ? 'not-allowed' : 'pointer'
                }}
              >
                <Send size={15} />
                <span>Consult</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mentor-ai-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
