"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  CurriculumProgram,
  CurriculumProgramDetail,
  ProgressRecord,
  ReflectionRecord,
  educationStackApi,
} from "@/lib/api/educationStack";
import { buildAuthHref } from "@/lib/auth/returnTo";

type TopicStatusMap = Record<number, ProgressRecord>;

export function CurriculumLayerView() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [programs, setPrograms] = useState<CurriculumProgram[]>([]);
  const [activeProgramId, setActiveProgramId] = useState<number | null>(null);
  const [programDetail, setProgramDetail] = useState<CurriculumProgramDetail | null>(null);
  const [progressRows, setProgressRows] = useState<ProgressRecord[]>([]);
  const [reflections, setReflections] = useState<ReflectionRecord[]>([]);
  const [reflectionDrafts, setReflectionDrafts] = useState<Record<number, string>>({});
  const [savingTopicId, setSavingTopicId] = useState<number | null>(null);
  const [savingReflectionTopicId, setSavingReflectionTopicId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authHref = useMemo(() => buildAuthHref("/education/curriculum"), []);

  const progressByTopic = useMemo<TopicStatusMap>(() => {
    return progressRows.reduce<TopicStatusMap>((acc, row) => {
      acc[row.topic_id] = row;
      return acc;
    }, {});
  }, [progressRows]);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      try {
        const programResponse = await educationStackApi.listPrograms();
        setPrograms(programResponse.programs);
        if (programResponse.programs.length > 0) {
          setActiveProgramId((current) => current ?? programResponse.programs[0].program_id);
        }
      } catch (err) {
        const messageText = err instanceof Error ? err.message : "Unable to load curriculum data.";
        setError(messageText);
      } finally {
        setLoading(false);
      }
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!activeProgramId) {
      return;
    }
    const loadProgram = async () => {
      try {
        const response = await educationStackApi.getProgram(activeProgramId);
        setProgramDetail(response);
      } catch (err) {
        const messageText = err instanceof Error ? err.message : "Unable to load selected program.";
        setError(messageText);
      }
    };
    void loadProgram();
  }, [activeProgramId]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      setProgressRows([]);
      setReflections([]);
      return;
    }
    const loadLearnerState = async () => {
      try {
        const [progressResponse, reflectionsResponse] = await Promise.all([
          educationStackApi.listProgress(),
          educationStackApi.listReflections(),
        ]);
        setProgressRows(progressResponse.progress);
        setReflections(reflectionsResponse.reflections);
      } catch (err) {
        const messageText = err instanceof Error ? err.message : "Unable to load learner progress.";
        setMessage(messageText);
      }
    };
    void loadLearnerState();
  }, [authLoading, isAuthenticated]);

  const advanceTopicProgress = async (programId: number, moduleId: number, topicId: number) => {
    if (!isAuthenticated) {
      setMessage("Sign in to save curriculum progress.");
      return;
    }
    const current = progressByTopic[topicId]?.completion_percent || 0;
    const nextCompletion = Math.min(100, current + 25);
    setSavingTopicId(topicId);
    setMessage(null);
    try {
      const response = await educationStackApi.upsertProgress({
        program_id: programId,
        module_id: moduleId,
        topic_id: topicId,
        completion_percent: nextCompletion,
        depth_tier_unlocked: nextCompletion >= 100 ? 2 : 1,
      });
      const progressResponse = await educationStackApi.listProgress();
      setProgressRows(progressResponse.progress);
      if (response.badge_award?.badge_title) {
        setMessage(`Badge unlocked: ${response.badge_award.badge_title}`);
      } else {
        setMessage(`Topic progress updated to ${response.completion_percent}%`);
      }
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Unable to update topic progress.";
      setMessage(messageText);
    } finally {
      setSavingTopicId(null);
    }
  };

  const submitReflection = async (event: FormEvent, programId: number, moduleId: number, topicId: number) => {
    event.preventDefault();
    if (!isAuthenticated) {
      setMessage("Sign in to submit reflections.");
      return;
    }
    const draft = (reflectionDrafts[topicId] || "").trim();
    if (!draft) {
      setMessage("Reflection response cannot be empty.");
      return;
    }
    setSavingReflectionTopicId(topicId);
    setMessage(null);
    try {
      const response = await educationStackApi.submitReflection({
        program_id: programId,
        module_id: moduleId,
        topic_id: topicId,
        response_text: draft,
      });
      const reflectionsResponse = await educationStackApi.listReflections();
      setReflections(reflectionsResponse.reflections);
      setReflectionDrafts((prev) => ({ ...prev, [topicId]: "" }));
      setMessage(`Reflection submitted at ${new Date(response.submitted_at).toLocaleString()}.`);
    } catch (err) {
      const messageText = err instanceof Error ? err.message : "Unable to submit reflection.";
      setMessage(messageText);
    } finally {
      setSavingReflectionTopicId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-4xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
            Curriculum Layer
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Public program catalog first. Sign in when you want to persist progress, reflections, and learner unlocks.
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">Loading curriculum architecture...</p>
        ) : error ? (
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
        ) : (
          <>
            <section className="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <label className="text-xs text-[var(--color-muted-foreground)]">
                  Program
                  <select
                    value={activeProgramId ?? ""}
                    onChange={(event) => setActiveProgramId(Number(event.target.value))}
                    className="ml-2 rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-foreground)]"
                  >
                    {programs.map((program) => (
                      <option key={program.program_id} value={program.program_id}>
                        {program.title}
                      </option>
                    ))}
                  </select>
                </label>
                {message && <p className="text-xs text-[var(--color-institutional)]">{message}</p>}
              </div>
              <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-4 text-sm text-[var(--color-earth-dark)]">
                {authLoading ? (
                  <span>Checking learner session...</span>
                ) : isAuthenticated ? (
                  <span>Your progress and reflection history are active on this curriculum.</span>
                ) : (
                  <span>
                    Browsing anonymously.{" "}
                    <Link href={authHref} className="font-medium text-[var(--color-institutional)] hover:underline">
                      Sign in to track progress and submit reflections.
                    </Link>
                  </span>
                )}
              </div>
            </section>

            {programDetail && (
              <section className="space-y-5">
                <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4">
                  <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-serif)" }}>
                    {programDetail.program.title}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {programDetail.program.description}
                  </p>
                </article>

                {programDetail.modules.map((module) => (
                  <article
                    key={module.module_id}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4"
                  >
                    <h3 className="text-xl font-semibold">{module.title}</h3>
                    <p className="text-sm text-[var(--color-muted-foreground)]">{module.description}</p>
                    <div className="mt-4 space-y-4">
                      {module.topics.map((topic) => {
                        const progress = progressByTopic[topic.topic_id];
                        const completion = progress?.completion_percent ?? 0;
                        const latestReflection = reflections.find((row) => row.topic_id === topic.topic_id);
                        return (
                          <div
                            key={topic.topic_id}
                            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)] p-4"
                          >
                            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">{topic.title}</p>
                                <p className="text-xs text-[var(--color-muted-foreground)]">
                                  Depth tier {topic.depth_tier} | Assessment {topic.assessment_type}
                                </p>
                              </div>
                              {isAuthenticated ? (
                                <button
                                  type="button"
                                  onClick={() => advanceTopicProgress(topic.program_id, topic.module_id, topic.topic_id)}
                                  disabled={savingTopicId === topic.topic_id}
                                  className="btn-pill btn-pill-outline text-xs disabled:opacity-60"
                                >
                                  {savingTopicId === topic.topic_id ? "Saving..." : `Advance (${completion}%)`}
                                </button>
                              ) : (
                                <Link href={authHref} className="btn-pill btn-pill-outline text-xs">
                                  Sign in to track
                                </Link>
                              )}
                            </div>
                            <div className="mb-3 h-2 overflow-hidden rounded-full bg-white">
                              <div
                                className="h-full bg-[var(--color-sage)] transition-all duration-300 ease-out"
                                style={{ width: `${completion}%` }}
                              />
                            </div>
                            <p className="text-xs text-[var(--color-muted-foreground)]">
                              Interactive experiences: {topic.experiences.length}
                            </p>
                            <ul className="mt-2 space-y-1 text-xs text-[var(--color-earth-dark)]">
                              {topic.experiences.map((experience) => (
                                <li key={experience.id}>- {experience.title}</li>
                              ))}
                            </ul>
                            {isAuthenticated ? (
                              <form
                                onSubmit={(event) =>
                                  submitReflection(event, topic.program_id, topic.module_id, topic.topic_id)
                                }
                                className="mt-3 space-y-2"
                              >
                                <label className="block text-xs font-medium text-[var(--color-earth-dark)]">
                                  Reflection
                                  <textarea
                                    value={reflectionDrafts[topic.topic_id] || ""}
                                    onChange={(event) =>
                                      setReflectionDrafts((prev) => ({
                                        ...prev,
                                        [topic.topic_id]: event.target.value,
                                      }))
                                    }
                                    placeholder={topic.reflection_prompt || "Capture your reflection response..."}
                                    className="mt-1 min-h-[90px] w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-foreground)]"
                                  />
                                </label>
                                <div className="flex flex-wrap items-center gap-3">
                                  <button
                                    type="submit"
                                    disabled={savingReflectionTopicId === topic.topic_id}
                                    className="btn-pill btn-pill-primary text-xs disabled:opacity-60"
                                  >
                                    {savingReflectionTopicId === topic.topic_id ? "Submitting..." : "Submit Reflection"}
                                  </button>
                                  {latestReflection && (
                                    <span className="text-[11px] text-[var(--color-muted-foreground)]">
                                      Last submitted:{" "}
                                      {latestReflection.submitted_at
                                        ? new Date(latestReflection.submitted_at).toLocaleString()
                                        : "recently"}
                                    </span>
                                  )}
                                </div>
                              </form>
                            ) : (
                              <div className="mt-3 rounded-md border border-dashed border-[var(--color-border)] bg-white/60 p-3 text-xs text-[var(--color-muted-foreground)]">
                                Sign in to unlock reflections, badges, and regeneration-linked learner actions.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
