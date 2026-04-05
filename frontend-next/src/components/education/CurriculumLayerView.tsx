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
import { toActionableSurfaceError } from "@/lib/ui/actionableErrors";

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

  const actionableError = useMemo(
    () =>
      error
        ? toActionableSurfaceError({
            area: "Education curriculum",
            rawMessage: error,
            fallbackHref: "/education",
            fallbackLabel: "Back to education hub",
          })
        : null,
    [error],
  );

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      try {
        const programResponse = await educationStackApi.listPrograms();
        setPrograms(programResponse.programs);
        if (programResponse.programs.length > 0) {
          setActiveProgramId((current) => current ?? programResponse.programs[0].program_id);
        } else {
          setActiveProgramId(null);
          setProgramDetail(null);
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
      setProgramDetail(null);
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

  const programTopicIds = useMemo(() => {
    if (!programDetail) {
      return new Set<number>();
    }
    return new Set(programDetail.modules.flatMap((module) => module.topics.map((topic) => topic.topic_id)));
  }, [programDetail]);

  const completedTopicCount = useMemo(() => {
    let count = 0;
    programTopicIds.forEach((topicId) => {
      if ((progressByTopic[topicId]?.completion_percent || 0) >= 100) {
        count += 1;
      }
    });
    return count;
  }, [programTopicIds, progressByTopic]);

  const reflectionCount = useMemo(
    () => reflections.filter((reflection) => programTopicIds.has(reflection.topic_id)).length,
    [programTopicIds, reflections],
  );

  const totalTopics = programTopicIds.size;

  return (
    <div className="space-y-7">
      <header className="edu-card edu-card-highlight p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--edu-accent)]">Curriculum Layer</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--edu-foreground)]" style={{ fontFamily: "var(--font-serif)" }}>
          Progression with practical outcomes
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-[var(--edu-foreground)]/80">
          Follow a clear learning sequence, capture reflections, and bridge completed topics into certification and
          regeneration pathways.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] p-4 text-sm text-[var(--edu-foreground)]/78">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--edu-foreground)]/60">1. Choose pathway</p>
            <p className="mt-2">Select the active program and review module sequence before starting.</p>
          </article>
          <article className="rounded-xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] p-4 text-sm text-[var(--edu-foreground)]/78">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--edu-foreground)]/60">2. Progress + reflect</p>
            <p className="mt-2">Advance topics in steps and store reflection evidence in the same flow.</p>
          </article>
          <article className="rounded-xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.04)] p-4 text-sm text-[var(--edu-foreground)]/78">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--edu-foreground)]/60">3. Apply learning</p>
            <p className="mt-2">Move completed learning into regeneration actions and credential readiness.</p>
          </article>
        </div>
      </header>

      {loading ? (
        <div className="edu-card p-6 text-sm text-[var(--edu-foreground)]/70">Loading curriculum architecture…</div>
      ) : actionableError ? (
        <div className="edu-card border-l-4 border-[var(--edu-accent)] bg-[rgba(246,212,203,0.1)] p-6 text-[var(--edu-foreground)]">
          <p className="text-sm font-semibold text-[#f6d4cb]">{actionableError.headline}</p>
          <p className="mt-2 text-sm text-[var(--edu-foreground)]/80">{actionableError.detail}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={actionableError.fallbackHref} className="btn-pill btn-pill-outline text-xs">
              {actionableError.fallbackLabel}
            </Link>
            <Link href="/education/maps" className="btn-pill btn-pill-outline text-xs">
              Open maps
            </Link>
            <Link href="/education/regeneration" className="btn-pill btn-pill-outline text-xs">
              Open regeneration
            </Link>
          </div>
        </div>
      ) : (
        <>
          <section className="edu-card p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <label className="text-xs uppercase tracking-[0.14em] text-[var(--edu-foreground)]/62">
                Active program
                <select
                  value={activeProgramId ?? ""}
                  onChange={(event) => setActiveProgramId(Number(event.target.value))}
                  className="input-civic mt-2 min-w-[18rem]"
                  disabled={programs.length < 1}
                >
                  {programs.length < 1 ? <option value="">No programs available</option> : null}
                  {programs.map((program) => (
                    <option key={program.program_id} value={program.program_id}>
                      {program.title}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="edu-pill">Topics complete {completedTopicCount}/{totalTopics || 0}</span>
                <span className="edu-pill">Reflections {reflectionCount}</span>
                <span className="edu-pill">Programs {programs.length}</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(30,2,39,0.25)] p-4 text-sm text-[var(--edu-foreground)]/75">
              {authLoading ? (
                <span>Checking learner session…</span>
              ) : isAuthenticated ? (
                <span>Your learner state is active. Progress, reflections, and unlocks persist to your account.</span>
              ) : (
                <span>
                  Anonymous browsing is active. {" "}
                  <Link href={authHref} className="font-medium text-[var(--edu-accent)] hover:underline">
                    Sign in to track progress and submit reflections
                  </Link>
                  .
                </span>
              )}
            </div>

            {message ? <p className="mt-3 text-xs text-[var(--edu-accent)]">{message}</p> : null}
          </section>

          {!programDetail ? (
            <section className="edu-card p-6 text-sm text-[var(--edu-foreground)]/75">
              No curriculum programs are published yet. You can still browse maps, immersive knowledge, and regeneration
              pathways while curriculum content is being prepared.
            </section>
          ) : (
            <section className="space-y-5">
              <article className="edu-card p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-3xl">
                    <h2 className="text-2xl font-semibold text-[var(--edu-foreground)]" style={{ fontFamily: "var(--font-serif)" }}>
                      {programDetail.program.title}
                    </h2>
                    <p className="mt-2 text-sm text-[var(--edu-foreground)]/72">{programDetail.program.description}</p>
                  </div>
                  <div className="rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[color:rgba(246,212,203,0.03)] px-3 py-2 text-xs text-[var(--edu-foreground)]/72 space-y-1 min-w-[14rem]">
                    <p className="uppercase tracking-[0.13em] text-[var(--edu-foreground)]/55">Trust context</p>
                    <p>Region: {programDetail.program.region || "Global"}</p>
                    <p>Language group: {programDetail.program.language_group || "Multilingual"}</p>
                    <p>Accreditation: {programDetail.program.accreditation_code || "In progress"}</p>
                  </div>
                </div>
              </article>

              {programDetail.modules.map((module, moduleIndex) => (
                <article key={module.module_id} className="edu-card p-5 md:p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--edu-foreground)]/60">Module {moduleIndex + 1}</p>
                      <h3 className="mt-1 text-xl font-semibold text-[var(--edu-foreground)]">{module.title}</h3>
                      <p className="mt-1 text-sm text-[var(--edu-foreground)]/72">{module.description}</p>
                    </div>
                    <span className="edu-pill">Depth tier required {module.depth_tier_required}</span>
                  </div>

                  <div className="space-y-4">
                    {module.topics.map((topic) => {
                      const progress = progressByTopic[topic.topic_id];
                      const completion = progress?.completion_percent ?? 0;
                      const latestReflection = reflections.find((row) => row.topic_id === topic.topic_id);

                      return (
                        <div key={topic.topic_id} className="rounded-lg border border-[color:rgba(246,212,203,0.12)] bg-[var(--color-foreground)]/[0.02] p-4">
                          <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[var(--edu-foreground)]">{topic.title}</p>
                              <p className="text-xs text-[var(--edu-foreground)]/58">
                                Depth tier {topic.depth_tier} · Assessment {topic.assessment_type} · Sensitivity {topic.sensitivity_level}
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

                          <div className="mb-3 h-2 overflow-hidden rounded-full bg-[color:rgba(246,212,203,0.2)]">
                            <div
                              className="h-full bg-[var(--edu-accent)] transition-all duration-300 ease-out"
                              style={{ width: `${completion}%` }}
                            />
                          </div>

                          <p className="text-xs text-[var(--edu-foreground)]/60">Interactive experiences: {topic.experiences.length}</p>
                          <ul className="mt-2 space-y-1 text-xs text-[var(--edu-foreground)]/74">
                            {topic.experiences.map((experience) => (
                              <li key={experience.id}>• {experience.title}</li>
                            ))}
                          </ul>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {topic.action_link ? (
                              <Link href={`/actions/${topic.action_link}`} className="btn-pill btn-pill-outline text-xs">
                                Linked action
                              </Link>
                            ) : (
                              <Link href="/education/regeneration" className="btn-pill btn-pill-outline text-xs">
                                Regeneration actions
                              </Link>
                            )}
                            <Link href="/education/certifications" className="btn-pill btn-pill-outline text-xs">
                              Credential pathway
                            </Link>
                          </div>

                          {isAuthenticated ? (
                            <form
                              onSubmit={(event) => submitReflection(event, topic.program_id, topic.module_id, topic.topic_id)}
                              className="mt-3 space-y-2"
                            >
                              <label className="block text-xs font-medium text-[var(--edu-foreground)]/75">
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
                                  className="input-civic mt-1 min-h-[96px]"
                                />
                              </label>
                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  type="submit"
                                  disabled={savingReflectionTopicId === topic.topic_id}
                                  className="btn-pill btn-pill-primary text-xs disabled:opacity-60"
                                >
                                  {savingReflectionTopicId === topic.topic_id ? "Submitting..." : "Submit reflection"}
                                </button>
                                {latestReflection ? (
                                  <span className="text-[11px] text-[var(--edu-foreground)]/58">
                                    Last submitted:{" "}
                                    {latestReflection.submitted_at
                                      ? new Date(latestReflection.submitted_at).toLocaleString()
                                      : "recently"}
                                  </span>
                                ) : null}
                              </div>
                            </form>
                          ) : (
                            <div className="mt-3 rounded-md border border-dashed border-[color:rgba(246,212,203,0.2)] bg-[var(--color-foreground)]/[0.02] p-3 text-xs text-[var(--edu-foreground)]/62">
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
  );
}
