import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Sparkles,
  Send,
  AlertCircle,
  RefreshCw,
  GraduationCap
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  'What have I built so far?',
  'Summarize my journey.',
  'What should I work on next?',
  'Help me improve this project.'
];

export const AiAdvisorPage = () => {
  const { user, profile } = useAuth();

  // Student context state
  const [projects, setProjects] = useState([]);
  const [journeyEntries, setJourneyEntries] = useState([]);
  const [contextLoading, setContextLoading] = useState(true);

  // Conversation state
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [configNotice, setConfigNotice] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSubmitting]);

  // Load student portfolio context for header summary under RLS
  useEffect(() => {
    let isMounted = true;

    async function loadStudentContext() {
      if (!user) return;
      try {
        setContextLoading(true);

        // Fetch student's own projects
        const { data: projData, error: projErr } = await supabase
          .from('projects')
          .select('id, title, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (projErr) console.error('Error fetching projects for AI:', projErr);

        // Fetch student's own journey entries
        const { data: jData, error: jErr } = await supabase
          .from('journey')
          .select('id, title, description, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (jErr) console.error('Error fetching journey for AI:', jErr);

        if (isMounted) {
          setProjects(projData || []);
          setJourneyEntries(jData || []);
        }
      } catch (err) {
        console.error('Error assembling student context:', err);
      } finally {
        if (isMounted) setContextLoading(false);
      }
    }

    loadStudentContext();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const hasInitializedWelcomeRef = useRef(false);

  // Initialize introductory message once context is loaded
  useEffect(() => {
    if (!contextLoading && !hasInitializedWelcomeRef.current) {
      hasInitializedWelcomeRef.current = true;
      const studentName = profile?.full_name || 'Scholar';
      const deptName = profile?.department ? ` in the Department of ${profile.department}` : '';
      const projCount = projects.length;
      const jCount = journeyEntries.length;

      let introText = `Welcome, ${studentName}. I am your Mentra Academic Advisor.`;
      if (projCount > 0 || jCount > 0) {
        introText += ` I have reviewed your portfolio${deptName} — currently comprising **${projCount} project${projCount === 1 ? '' : 's'}** and **${jCount} journey milestone${jCount === 1 ? '' : 's'}**.\n\nWhether you wish to synthesize what you have built so far, reflect on your learning trajectory, or explore meaningful next initiatives, I am here to assist your academic journey.`;
      } else {
        introText += ` I am connected to your student profile${deptName}.\n\nAs you begin publishing projects and documenting milestones in your Mentra Journey, I will reflect on your progress and suggest tailored scholarly directions. How can I help you today?`;
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
  }, [contextLoading, projects.length, journeyEntries.length, profile]);

  // Handle question submission
  const handleSendMessage = async (textToSend) => {
    const promptText = (textToSend || inputPrompt).trim();
    if (!promptText || isSubmitting) return;

    setErrorMessage(null);

    // Append user message immediately
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
      const requestPayload = {
        message: promptText,
        history: messages
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({ role: m.role, content: m.content }))
      };

      // Invoke Supabase Edge Function `personal-ai` directly
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('personal-ai', {
        body: requestPayload
      });

      if (edgeError) {
        let errorMsg = edgeError.message || 'Supabase Edge Function error';
        if (edgeError.context) {
          try {
            const bodyJson = await edgeError.context.json();
            if (bodyJson?.message) errorMsg = bodyJson.message;
            if (bodyJson?.error === 'CONFIG_REQUIRED') {
              setConfigNotice(bodyJson.message);
            }
          } catch {}
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
      console.error('Personal AI inquiry error:', err);
      setErrorMessage(err.message || 'Unable to connect to the personal-ai Edge Function.');
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

  const handleSelectSuggested = (question) => {
    setInputPrompt(question);
    handleSendMessage(question);
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorMessage(null);
    hasInitializedWelcomeRef.current = false;
    setTimeout(() => {
      setContextLoading(true);
      setTimeout(() => setContextLoading(false), 50);
    }, 50);
  };

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
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
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
                <span>Academic Guidance & Reflection</span>
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
                Personal AI Advisor
              </h1>
              <p
                style={{
                  fontSize: '1rem',
                  color: 'var(--text-secondary)',
                  maxWidth: '650px',
                  lineHeight: 1.55
                }}
              >
                An academic companion grounded in your authentic portfolio. Reflect on what you have built,
                connect milestones across your timeline, and discover next steps.
              </p>
            </div>

            {/* Context summary pill */}
            <div
              style={{
                backgroundColor: 'var(--color-warm-ivory)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                minWidth: '260px'
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
                <GraduationCap size={14} />
                <span>Connected Student Context</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                  <strong>{profile?.department || 'General'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Portfolio Projects:</span>
                  <strong>{contextLoading ? '...' : projects.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Journey Milestones:</span>
                  <strong>{contextLoading ? '...' : journeyEntries.length}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container" style={{ padding: '2rem 1.5rem 3.5rem 1.5rem' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          {/* Edge Function Configuration Notice */}
          {configNotice && (
            <div
              style={{
                backgroundColor: '#FFF9F0',
                border: '1px solid #E6D2B5',
                borderLeft: '4px solid var(--color-warm-gold)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.75rem',
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

          {/* Chat Container */}
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
            {/* Chat Sub-header */}
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
                <span>Mentra Personal AI (Supabase Edge Function · Gemini 1.5 Flash)</span>
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

            {/* Message Dialogue Stream */}
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
                    {/* Message Meta / Author */}
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
                          <span style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>Mentra Advisor</span>
                        </>
                      ) : (
                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>You</span>
                      )}
                      <span>•</span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Message Bubble */}
                    <div
                      style={{
                        maxWidth: '82%',
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

              {/* Thinking / Loading State */}
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
                    <span style={{ fontWeight: 600, color: 'var(--color-primary-dark)' }}>Mentra Advisor</span>
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
                        animation: 'advisor-spin 0.9s linear infinite'
                      }}
                    />
                    <span>Synthesizing your academic context and project milestones...</span>
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
                    gap: '0.75rem'
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Advisor Notice</div>
                    <div>{errorMessage}</div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Inquiry Chips */}
            <div
              style={{
                padding: '0.75rem 1.5rem',
                borderTop: '1px solid var(--border-subtle)',
                backgroundColor: '#FAF7F2'
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem'
                }}
              >
                Suggested Academic Inquiries
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSelectSuggested(q)}
                    disabled={isSubmitting}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-white)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.825rem',
                      color: 'var(--color-primary-dark)',
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
                  placeholder="Ask your advisor about your projects, timeline, or next scholarly initiatives..."
                  rows={2}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--color-warm-ivory)',
                    color: 'var(--color-primary-dark)',
                    fontSize: '0.925rem',
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                    lineHeight: 1.45,
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--color-terracotta)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
                />
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.25rem',
                    textAlign: 'right'
                  }}
                >
                  Press <strong>Enter</strong> to send, <strong>Shift + Enter</strong> for new line
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !inputPrompt.trim()}
                className="btn btn-primary"
                style={{
                  height: '46px',
                  padding: '0 1.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: isSubmitting || !inputPrompt.trim() ? 0.6 : 1,
                  cursor: isSubmitting || !inputPrompt.trim() ? 'not-allowed' : 'pointer'
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
        @keyframes advisor-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
