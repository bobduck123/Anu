'use client';

import { useState, useEffect, useCallback } from 'react';

export const dynamic = 'force-dynamic';
import { motion } from 'framer-motion';
import { api, Article, Comment, Poll, Microcosm, MessageResponse, MemberResponse, StoryPost, TeamSummary } from '@/lib/api';
import { Plus, X, MessageCircle, Send, Sparkles, Heart, HandMetal } from 'lucide-react';
import { LoadingState } from '@/ui-system/states/LoadingState';

type CommunityCategory = 'opinion' | 'news' | 'creative';
type PageTab = 'articles' | 'messages' | 'stories';
type StoryFilter = 'all' | 'featured';
type StoryView = 'list' | 'timeline';
type StoryPeriod = 'weekly' | 'monthly';

export default function CommunityLegacy() {
  const [articles, setArticles] = useState<{ opinion: Article[]; news: Article[]; creative: Article[] }>({ opinion: [], news: [], creative: [] });
  const [selectedCategory, setSelectedCategory] = useState<CommunityCategory>('news');
  const [comments, setComments] = useState<{ [articleId: string]: Comment[] }>({});
  const [polls, setPolls] = useState<Poll[]>([]);
  const [microcosms, setMicrocosms] = useState<Microcosm[]>([]);
  const [microcosmTeams, setMicrocosmTeams] = useState<Record<string, { count: number; names: string[] }>>({});
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState<{ [articleId: string]: string }>({});
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postForm, setPostForm] = useState({ title: '', content: '', category: 'news' as CommunityCategory });
  const [pageTab, setPageTab] = useState<PageTab>('articles');
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [messageForm, setMessageForm] = useState({ receiverId: 0, content: '' });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [stories, setStories] = useState<StoryPost[]>([]);
  const [storyForm, setStoryForm] = useState({ title: '', content: '', media_url: '' });
  const [postingStory, setPostingStory] = useState(false);
  const [contentWarning, setContentWarning] = useState('');
  const [storyFilter, setStoryFilter] = useState<StoryFilter>('all');
  const [storyReactions, setStoryReactions] = useState<Record<number, Record<string, number>>>({});
  const [storyView, setStoryView] = useState<StoryView>('list');
  const [storyPeriod, setStoryPeriod] = useState<StoryPeriod>('weekly');
  const [timeline, setTimeline] = useState<{ points: Array<{ label: string; count: number; cumulative: number; milestone?: number | null }>; milestones: Array<{ threshold: number; label: string }> }>({ points: [], milestones: [] });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash === 'stories') {
        setPageTab('stories');
      } else if (hash === 'microcosms') {
        setPageTab('articles');
      }
      if (hash) {
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [articlesData, pollsData, microcosmsData, teamsData] = await Promise.all([
        api.community.getArticles(),
        api.community.getPolls().catch(() => []),
        api.community.getMicrocosms().catch(() => []),
        api.teams.list().catch(() => []),
      ]);
      setArticles(articlesData);
      setPolls(pollsData);
      setMicrocosms(microcosmsData);
      const teamMap = (teamsData as TeamSummary[]).reduce((acc, team) => {
        const key = team.microcosm_id != null ? String(team.microcosm_id) : 'none';
        if (!acc[key]) acc[key] = { count: 0, names: [] };
        acc[key].count += 1;
        acc[key].names.push(team.name);
        return acc;
      }, {} as Record<string, { count: number; names: string[] }>);
      setMicrocosmTeams(teamMap);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadMessages = useCallback(async () => {
    try {
      const [msgs, mems] = await Promise.all([
        api.messages.getAll(),
        api.members.getAll(),
      ]);
      setMessages(msgs);
      setMembers(mems);
    } catch { /* ignore */ }
  }, []);

  const loadComments = async (articleId: string) => {
    if (!comments[articleId]) {
      try {
        const data = await api.community.getComments(articleId);
        setComments(prev => ({ ...prev, [articleId]: data }));
      } catch { /* ignore */ }
    }
  };

  const hasDestructiveContent = (text: string) => {
    if (!text) return false;
    const banned = ['kill', 'harm', 'threat', 'violence', 'attack', 'abuse'];
    return banned.some(word => text.toLowerCase().includes(word));
  };

  const loadStories = useCallback(async () => {
    try {
      const { items } = await api.stories.getAll(1, 20);
      setStories(items);
    } catch { /* ignore */ }
  }, []);

  const loadTimeline = useCallback(async () => {
    try {
      const data = await api.stories.getTimeline(storyPeriod, 12);
      setTimeline({ points: data.points || [], milestones: data.milestones || [] });
    } catch { /* ignore */ }
  }, [storyPeriod]);

  useEffect(() => {
    if (pageTab === 'messages') void loadMessages();
    if (pageTab === 'stories') {
      void loadStories();
      if (storyView === 'timeline') void loadTimeline();
    }
  }, [pageTab, storyView, loadMessages, loadStories, loadTimeline]);

  const handleCreateStory = async () => {
    if (!storyForm.title.trim() || !storyForm.content.trim()) {
      alert('Please add a title and content.');
      return;
    }
    if (hasDestructiveContent(storyForm.title) || hasDestructiveContent(storyForm.content)) {
      setContentWarning('This looks potentially harmful. Please reconsider. You can edit or confirm to post.');
      if (!confirm('This content may violate community safety guidelines. Post anyway?')) return;
    }
    setPostingStory(true);
    try {
      const created = await api.stories.create(storyForm);
      setStories((prev) => [created, ...prev]);
      setStoryForm({ title: '', content: '', media_url: '' });
      setContentWarning('');
    } catch {
      alert('Failed to create story.');
    } finally {
      setPostingStory(false);
    }
  };

  const handleReaction = async (postId: number, reaction: 'clap' | 'heart' | 'spark') => {
    try {
      setStoryReactions((prev) => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          [reaction]: (prev[postId]?.[reaction] || 0) + 1,
        },
      }));
      const result = await api.stories.react(postId, reaction);
      setStories((prev) => prev.map((story) => (
        story.id === postId ? { ...story, reactions: result.reactions || {} } : story
      )));
      if (result.reactions) {
        setStoryReactions((prev) => ({ ...prev, [postId]: result.reactions }));
      }
    } catch { /* ignore */ }
  };

  const handleAddComment = async (articleId: string) => {
    const content = newComment[articleId];
    if (!content?.trim()) return;
    if (hasDestructiveContent(content)) {
      setContentWarning('This looks potentially harmful. Please reconsider. You can edit or confirm to post.');
      if (!confirm('This content may violate community safety guidelines. Post anyway?')) return;
    }
    try {
      const comment = await api.community.addComment(articleId, content);
      setComments(prev => ({ ...prev, [articleId]: [...(prev[articleId] || []), comment] }));
      setNewComment(prev => ({ ...prev, [articleId]: '' }));
      setContentWarning('');
    } catch { /* ignore */ }
  };

  const handleVotePoll = async (pollId: string, option: string) => {
    try {
      const updated = await api.community.votePoll(pollId, option);
      setPolls(polls.map(p => p.id === pollId ? updated : p));
    } catch { /* ignore */ }
  };

  const handleCreatePost = async () => {
    if (!postForm.title.trim() || !postForm.content.trim()) { alert('Please fill in both title and content'); return; }
    if (hasDestructiveContent(postForm.title) || hasDestructiveContent(postForm.content)) {
      setContentWarning('This looks potentially harmful. Please reconsider. You can edit or confirm to post.');
      if (!confirm('This content may violate community safety guidelines. Post anyway?')) return;
    }
    setIsCreatingPost(true);
    try {
      const newArticle = await api.community.createArticle({ title: postForm.title, content: postForm.content, category: postForm.category });
      setArticles(prev => ({ ...prev, [postForm.category]: [newArticle, ...(prev[postForm.category] || [])] }));
      setPostForm({ title: '', content: '', category: 'news' });
      setShowCreatePost(false);
      setContentWarning('');
    } catch { alert('Failed to create post.'); } finally { setIsCreatingPost(false); }
  };

  const handleSendMessage = async () => {
    if (!messageForm.receiverId || !messageForm.content.trim()) return;
    setSendingMessage(true);
    try {
      await api.messages.send(messageForm.receiverId, messageForm.content);
      setMessageForm({ receiverId: 0, content: '' });
      await loadMessages();
    } catch { alert('Failed to send message.'); } finally { setSendingMessage(false); }
  };

  if (loading) return <LoadingState fullPage message="Loading community..." />;

  const currentArticles = articles[selectedCategory] || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Community</h1>
          <p className="text-xl text-[var(--color-muted-foreground)]">Share ideas, discuss topics, and connect</p>
        </motion.div>

        {contentWarning && (
          <div className="mb-6 p-3 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)] text-sm">
            {contentWarning}
          </div>
        )}

        {/* Page tabs */}
        <div className="flex gap-2 mb-8">
          <button onClick={() => setPageTab('articles')}
            className={`btn-pill text-sm flex items-center gap-1.5 ${pageTab === 'articles' ? 'btn-pill-primary' : 'btn-pill-outline'}`}>
            Articles
          </button>
          <button onClick={() => setPageTab('stories')}
            className={`btn-pill text-sm flex items-center gap-1.5 ${pageTab === 'stories' ? 'btn-pill-primary' : 'btn-pill-outline'}`}>
            <Sparkles className="w-4 h-4" /> Stories
          </button>
          <button onClick={() => setPageTab('messages')}
            className={`btn-pill text-sm flex items-center gap-1.5 ${pageTab === 'messages' ? 'btn-pill-primary' : 'btn-pill-outline'}`}>
            <MessageCircle className="w-4 h-4" /> Messages
          </button>
        </div>

        {/* Messages Tab */}
        {pageTab === 'messages' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Messages</h2>
              {messages.length === 0 ? (
                <div className="card-civic text-center py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-3 text-[var(--color-muted-foreground)] opacity-40" />
                  <p className="text-[var(--color-muted-foreground)]">No messages yet.</p>
                </div>
              ) : (
                messages.map(msg => {
                  const sender = members.find(m => m.id === msg.sender_id);
                  return (
                    <div key={msg.id} className="card-civic">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-[var(--color-institutional)]">
                          {sender?.pseudonym || `User #${msg.sender_id}`}
                        </span>
                        <span className="text-xs text-[var(--color-muted-foreground)]">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  );
                })
              )}
            </div>
            <div className="card-civic h-fit">
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Compose</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">To</label>
                  <select value={messageForm.receiverId} onChange={e => setMessageForm(p => ({ ...p, receiverId: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                    <option value={0}>Select member</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.pseudonym}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Message</label>
                  <textarea rows={4} value={messageForm.content}
                    onChange={e => setMessageForm(p => ({ ...p, content: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" />
                </div>
                <button onClick={handleSendMessage} disabled={sendingMessage || !messageForm.receiverId}
                  className="w-full btn-pill btn-pill-primary text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  <Send className="w-4 h-4" /> {sendingMessage ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stories Tab */}
        {pageTab === 'stories' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="stories">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Storytelling Wall</h2>
                <div className="flex flex-wrap gap-2">
                  {(['list', 'timeline'] as const).map((view) => (
                    <button
                      key={view}
                      onClick={() => setStoryView(view)}
                      className={`btn-pill text-xs ${storyView === view ? 'btn-pill-primary' : 'btn-pill-outline'}`}
                    >
                      {view === 'list' ? 'Stories' : 'Timeline'}
                    </button>
                  ))}
                  {(['all', 'featured'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStoryFilter(filter)}
                      className={`btn-pill text-xs ${storyFilter === filter ? 'btn-pill-sage' : 'btn-pill-outline'}`}
                    >
                      {filter === 'all' ? 'All' : 'Featured'}
                    </button>
                  ))}
                  {(['weekly', 'monthly'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setStoryPeriod(period)}
                      className={`btn-pill text-xs ${storyPeriod === period ? 'btn-pill-accent' : 'btn-pill-outline'}`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              {storyView === 'timeline' ? (
                <div className="card-civic">
                  {timeline.points.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">No timeline data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {timeline.points.map((point, idx) => (
                        <div key={`${point.label}-${idx}`} className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{point.label}</p>
                            <p className="text-xs text-[var(--color-muted-foreground)]">Total {point.cumulative}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono-data">{point.count}</span>
                            {point.milestone && (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[var(--color-institutional-light)] text-[var(--color-institutional)]">
                                {point.milestone} stories
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : stories.length === 0 ? (
                <div className="card-civic text-center py-8">
                  <Sparkles className="w-8 h-8 mx-auto mb-3 text-[var(--color-muted-foreground)] opacity-40" />
                  <p className="text-[var(--color-muted-foreground)]">No stories yet. Be the first to share.</p>
                </div>
              ) : (
                stories
                  .filter((story) => (storyFilter === 'featured' ? story.featured : true))
                  .sort((a, b) => {
                    const aCount = (a.reactions?.clap || 0) + (a.reactions?.heart || 0) + (a.reactions?.spark || 0);
                    const bCount = (b.reactions?.clap || 0) + (b.reactions?.heart || 0) + (b.reactions?.spark || 0);
                    return bCount - aCount;
                  })
                  .map((story) => (
                  <div key={story.id} className="card-civic">
                    {story.featured && (
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-institutional)]">
                        Featured Story
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">{story.title}</h3>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {story.author_pseudonym} · {story.created_at ? new Date(story.created_at).toLocaleString() : ''}
                        </p>
                      </div>
                      {story.featured && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[var(--color-institutional-light)] text-[var(--color-institutional)]">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-muted-foreground)] mb-4">{story.content}</p>
                    {story.media_url && (
                      <div className="mb-3">
                        {story.media_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={story.media_url} alt="Story media" className="w-full rounded-lg border border-[var(--color-border)]" />
                        ) : (
                          <a href={story.media_url} className="text-xs text-[var(--color-institutional)] underline" target="_blank" rel="noreferrer">
                            View media
                          </a>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-4 text-sm">
                      <button onClick={() => handleReaction(story.id, 'clap')}
                        className="btn-pill btn-pill-outline text-xs flex items-center gap-1">
                        <HandMetal className="w-3 h-3" /> {(storyReactions[story.id]?.clap ?? story.reactions?.clap) || 0}
                      </button>
                      <button onClick={() => handleReaction(story.id, 'heart')}
                        className="btn-pill btn-pill-outline text-xs flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {(storyReactions[story.id]?.heart ?? story.reactions?.heart) || 0}
                      </button>
                      <button onClick={() => handleReaction(story.id, 'spark')}
                        className="btn-pill btn-pill-outline text-xs flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> {(storyReactions[story.id]?.spark ?? story.reactions?.spark) || 0}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-6">
              <div className="card-civic">
                <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Top Stories</h3>
                <div className="space-y-3">
                  {stories
                    .slice()
                    .sort((a, b) => {
                      const aCount = (a.reactions?.clap || 0) + (a.reactions?.heart || 0) + (a.reactions?.spark || 0);
                      const bCount = (b.reactions?.clap || 0) + (b.reactions?.heart || 0) + (b.reactions?.spark || 0);
                      return bCount - aCount;
                    })
                    .slice(0, 3)
                    .map((story) => (
                      <div key={story.id} className="p-3 rounded-lg border border-[var(--color-border)]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold line-clamp-1">{story.title}</span>
                          <span className="text-xs text-[var(--color-muted-foreground)]">
                            {(story.reactions?.clap || 0) + (story.reactions?.heart || 0) + (story.reactions?.spark || 0)}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-muted-foreground)] line-clamp-2">{story.content}</p>
                      </div>
                    ))}
                  {stories.length === 0 && (
                    <p className="text-sm text-[var(--color-muted-foreground)]">No stories yet.</p>
                  )}
                </div>
              </div>

              <div className="card-civic h-fit">
                <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Share a Story</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input type="text" value={storyForm.title}
                      onChange={e => setStoryForm(p => ({ ...p, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Story</label>
                    <textarea rows={5} value={storyForm.content}
                      onChange={e => setStoryForm(p => ({ ...p, content: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Media URL (optional)</label>
                    <input type="text" value={storyForm.media_url}
                      onChange={e => setStoryForm(p => ({ ...p, media_url: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" />
                  </div>
                  <button onClick={handleCreateStory} disabled={postingStory}
                    className="w-full btn-pill btn-pill-sage text-sm disabled:opacity-50">
                    {postingStory ? 'Posting...' : 'Post Story'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Articles Tab */}
        {pageTab === 'articles' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <div className="flex justify-between items-center mb-8">
                <div className="flex gap-3">
                  {(['news', 'opinion', 'creative'] as const).map((category) => (
                    <button key={category} onClick={() => setSelectedCategory(category)}
                      className={`btn-pill text-sm ${selectedCategory === category ? 'btn-pill-primary' : 'btn-pill-outline'}`}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowCreatePost(true)}
                  className="btn-pill btn-pill-sage text-sm flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Create Post
                </button>
              </div>

              <div className="space-y-6">
                {currentArticles.map((article, index) => (
                  <motion.article key={article.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }} className="card-civic">
                    {article.featured && (
                      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-forest)]">
                        Featured Article
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>{article.title}</h2>
                      {article.featured && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[var(--color-sage-light)] text-[var(--color-forest)]">
                          Featured
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-sm text-[var(--color-muted-foreground)] mb-4">
                      <span className="font-medium">{article.authorPseudonym}</span>
                      <span className="mx-2">&middot;</span>
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[var(--color-muted-foreground)] line-clamp-3 mb-4">{article.content}</p>

                    <div className="border-t border-[var(--color-border)] pt-4">
                      <button onClick={() => loadComments(article.id)}
                        className="text-[var(--color-institutional)] hover:underline font-medium text-sm mb-3">
                        Comments ({comments[article.id]?.length || 0})
                      </button>
                      {comments[article.id] && (
                        <div className="space-y-3 mb-3">
                          {comments[article.id].map(c => (
                            <div key={c.id} className="bg-[var(--color-muted)] p-3 rounded-lg">
                              <p className="text-sm">{c.content}</p>
                              <span className="text-xs text-[var(--color-muted-foreground)]">
                                {c.authorPseudonym && `${c.authorPseudonym} · `}{new Date(c.timestamp).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input type="text" value={newComment[article.id] || ''}
                          onChange={e => setNewComment(p => ({ ...p, [article.id]: e.target.value }))}
                          placeholder="Add a comment..."
                          className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm" />
                        <button onClick={() => handleAddComment(article.id)}
                          className="btn-pill btn-pill-primary text-sm">Comment</button>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>

              {currentArticles.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[var(--color-muted-foreground)]">No posts yet in this category.</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {polls.map(poll => (
                <div key={poll.id} className="card-civic">
                  <h3 className="font-semibold mb-3" style={{ fontFamily: 'var(--font-serif)' }}>{poll.question}</h3>
                  <div className="space-y-2">
                    {poll.options.map(option => (
                      <button key={option} onClick={() => handleVotePoll(poll.id, option)}
                        className="w-full text-left p-2 rounded hover:bg-[var(--color-muted)] transition-colors text-sm">
                        <div className="flex justify-between">
                          <span>{option}</span>
                          <span className="text-[var(--color-muted-foreground)] font-mono-data">{poll.votes[option] || 0}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="card-civic" id="microcosms">
                <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: 'var(--font-serif)' }}>Microcosms</h3>
                <div className="space-y-3">
                  {microcosms.map(m => (
                    <div key={m.id} className="p-3 bg-[var(--color-muted)] rounded-lg">
                      <h4 className="font-semibold text-sm">{m.name}</h4>
                      <p className="text-xs text-[var(--color-muted-foreground)] line-clamp-2">{m.description}</p>
                      <div className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                        Teams: {microcosmTeams[String(m.id)]?.count || 0}
                      </div>
                      <div className="mt-2">
                        <a href={`/teams?microcosm_id=${m.id}`} className="text-xs text-[var(--color-institutional)] hover:underline">
                          View teams
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Post Modal */}
        {showCreatePost && (
          <div className="fixed inset-0 bg-[color:rgba(30,2,39,0.5)] flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-[var(--color-card)] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-serif)' }}>Create New Post</h2>
                  <button onClick={() => setShowCreatePost(false)}><X className="h-6 w-6 text-[var(--color-muted-foreground)]" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Category</label>
                    <select value={postForm.category}
                      onChange={e => setPostForm(p => ({ ...p, category: e.target.value as CommunityCategory }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg">
                      <option value="news">News</option>
                      <option value="opinion">Opinion</option>
                      <option value="creative">Creative</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input type="text" value={postForm.title}
                      onChange={e => setPostForm(p => ({ ...p, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Content</label>
                    <textarea rows={8} value={postForm.content}
                      onChange={e => setPostForm(p => ({ ...p, content: e.target.value }))}
                      className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setShowCreatePost(false)} className="btn-pill btn-pill-outline">Cancel</button>
                    <button onClick={handleCreatePost} disabled={isCreatingPost}
                      className="btn-pill btn-pill-sage disabled:opacity-50">
                      {isCreatingPost ? 'Creating...' : 'Create Post'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
