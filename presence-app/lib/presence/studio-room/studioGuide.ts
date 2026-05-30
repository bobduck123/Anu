import type { Chamber, Room, StudioRoomTemplateKit } from "./model";

export interface StudioGuideIssue {
  priority: "urgent" | "advisory" | "polish";
  category: string;
  issue: string;
  why: string;
  action: string;
  chamberId?: string;
  objectId?: string;
}

export interface StudioGuideKitHints {
  requiredFields: string[];
  optionalFields: string[];
  copyScaffolds: Array<{ field: string; label: string; placeholder: string; required?: boolean }>;
  ctaStrategy: { label: string; target: string; primaryChamberId: string; appearsEarlyOnMobile?: boolean };
}

export interface StudioGuideResult {
  issues: StudioGuideIssue[];
  urgentCount: number;
  advisoryCount: number;
  polishCount: number;
  completedCount: number;
}

/**
 * Deterministic kit-specific guidance rules. Replaces brittle string-matching
 * on human-readable requiredFields with explicit, stable constants.
 */
const KIT_GUIDANCE_RULES: Record<
  string,
  {
    expectsThreshold?: boolean;
    minGalleryImages?: number;
    expectsProof?: boolean;
    expectsServices?: boolean;
    expectsContact?: boolean;
    expectsPortal?: boolean;
    expectsInvitation?: boolean;
  }
> = {
  "gallery-artist": {
    expectsThreshold: true,
    minGalleryImages: 3,
    expectsProof: true,
    expectsContact: true,
    expectsInvitation: true,
  },
  "cultural-community-artist": {
    expectsThreshold: true,
    minGalleryImages: 3,
    expectsProof: true,
    expectsServices: true,
    expectsContact: true,
    expectsPortal: true,
    expectsInvitation: true,
  },
  "material-tradie-proof-card": {
    expectsThreshold: true,
    expectsProof: true,
    expectsServices: true,
    expectsContact: true,
    expectsPortal: true,
    expectsInvitation: true,
  },
  "healing-practitioner": {
    expectsThreshold: true,
    expectsProof: true,
    expectsServices: true,
    expectsContact: true,
    expectsPortal: true,
    expectsInvitation: true,
  },
  "consultant-contractor": {
    expectsThreshold: true,
    expectsProof: true,
    expectsServices: true,
    expectsContact: true,
    expectsPortal: true,
    expectsInvitation: true,
  },
};

/**
 * Analyze a Studio Room draft against its TemplateKit hints and produce
 * deterministic, plain-language guidance for non-technical owners.
 *
 * No AI/LLM is used. All guidance comes from local rules.
 * This engine does not read editorOnly or internal fields.
 */
export function analyzeStudioGuide(
  room: Room,
  kitHints: StudioGuideKitHints,
): StudioGuideResult {
  const issues: StudioGuideIssue[] = [];
  const placeholderPhrases = new Set(
    kitHints.copyScaffolds.map((s) => s.placeholder.toLowerCase().trim()),
  );
  const rules = KIT_GUIDANCE_RULES[room.templateKitId ?? ""] ?? {};

  function add(issue: StudioGuideIssue) {
    issues.push(issue);
  }

  // ── Room-level checks ────────────────────────────────────────────────
  const roomTitle = (room.title ?? "").trim();
  if (roomTitle.length === 0) {
    add({
      priority: "urgent",
      category: "Identity",
      issue: "Room has no title.",
      why: "Visitors see the title first. Without one, the room feels incomplete and untrustworthy.",
      action: "Add your name or studio name to the room title.",
    });
  } else if (roomTitle.length < 3 || isPlaceholderLike(roomTitle, placeholderPhrases)) {
    add({
      priority: "advisory",
      category: "Identity",
      issue: `Room title "${roomTitle}" looks like a placeholder.`,
      why: "A generic or placeholder title undermines credibility before anyone scrolls.",
      action: "Replace it with your actual name, practice, or project name.",
    });
  }

  // ── CTA checks ───────────────────────────────────────────────────────
  const ctaObjects = room.chambers.flatMap((chamber) =>
    chamber.objects.filter((object) => object.type === "cta"),
  );
  if (ctaObjects.length === 0) {
    add({
      priority: "urgent",
      category: "Action",
      issue: "No primary call-to-action (CTA) found.",
      why: "Every room needs a clear next step. Without a CTA, visitors read and leave.",
      action: "Add a CTA object in the first chamber or check your template kit defaults.",
    });
  } else {
    for (const cta of ctaObjects) {
      const label = (cta.content.action?.label ?? cta.content.title ?? cta.label ?? "").trim();
      const ctaChamberId = room.chambers.find((c) => c.objects.includes(cta))?.id;
      if (label.length === 0) {
        add({
          priority: "urgent",
          category: "Action",
          issue: "CTA button has no label.",
          why: "An unlabelled button is invisible to visitors.",
          action: "Give the CTA a clear label like 'Get a quote' or 'Book a session'.",
          chamberId: ctaChamberId,
          objectId: cta.id,
        });
      } else if (
        isPlaceholderLike(label, placeholderPhrases) ||
        label.toLowerCase() === kitHints.ctaStrategy.label.toLowerCase()
      ) {
        add({
          priority: "advisory",
          category: "Action",
          issue: `CTA label "${label}" still uses the default text.`,
          why: "Default CTA labels feel generic. A specific label converts better.",
          action: "Rewrite the CTA to match your actual offer (e.g. 'Commission a portrait').",
          chamberId: ctaChamberId,
          objectId: cta.id,
        });
      }
    }
  }

  // ── Chamber-level checks ─────────────────────────────────────────────
  for (const chamber of room.chambers) {
    const chamberTitle = (chamber.title ?? "").trim();

    if (chamberTitle.length === 0) {
      add({
        priority: "advisory",
        category: "Structure",
        issue: `Untitled ${chamber.type} chamber.`,
        why: "Chamber titles act as landmarks. Missing titles make the room hard to navigate.",
        action: "Add a short, descriptive title to this chamber.",
        chamberId: chamber.id,
      });
    }

    if (chamber.objects.length === 0) {
      add({
        priority: "advisory",
        category: "Content",
        issue: `${chamberTitle || chamber.type} chamber is empty.`,
        why: "Empty chambers break the reading flow and suggest the room is unfinished.",
        action: "Add at least one object with real content.",
        chamberId: chamber.id,
      });
      continue;
    }

    // Check if all objects are hidden on mobile
    const allHidden = chamber.objects.every((object) => object.mobile?.hidden === true);
    if (allHidden) {
      add({
        priority: "urgent",
        category: "Visibility",
        issue: `Everything in "${chamberTitle || chamber.type}" is hidden on mobile.`,
        why: "Mobile visitors make up the majority of traffic. A completely hidden chamber vanishes for them.",
        action: "Unhide at least one object in this chamber for mobile viewers.",
        chamberId: chamber.id,
      });
    }

    // ── Object-level checks ────────────────────────────────────────────
    for (const object of chamber.objects) {
      const content = object.content;
      const label = (object.label ?? "").trim();

      // Empty label on non-CTA objects
      if (label.length === 0 && object.type !== "cta") {
        add({
          priority: "polish",
          category: "Identity",
          issue: `Unlabelled ${object.type} object in "${chamberTitle || chamber.type}".`,
          why: "Labels help you navigate the editor. They also appear in some renderer layouts.",
          action: "Give this object a short display label.",
          chamberId: chamber.id,
          objectId: object.id,
        });
      }

      // Body/title placeholder detection
      const body = (content.body ?? "").trim();
      const title = (content.title ?? "").trim();
      const quote = (content.quote ?? "").trim();

      if (body.length > 0 && isPlaceholderLike(body, placeholderPhrases)) {
        add({
          priority: "advisory",
          category: "Content",
          issue: `Body text in "${label || object.type}" looks like placeholder copy.`,
          why: "Placeholder text signals the room is unfinished and damages trust.",
          action: "Replace the placeholder with your own words.",
          chamberId: chamber.id,
          objectId: object.id,
        });
      }

      if (title.length > 0 && isPlaceholderLike(title, placeholderPhrases)) {
        add({
          priority: "advisory",
          category: "Content",
          issue: `Title in "${label || object.type}" looks like placeholder copy.`,
          why: "A placeholder title undermines the authority of the whole section.",
          action: "Write a specific title that describes this item.",
          chamberId: chamber.id,
          objectId: object.id,
        });
      }

      // Thin body content in story/statement chambers
      if (
        (chamber.type === "story" || chamber.type === "threshold") &&
        object.type === "note" &&
        body.length > 0 &&
        body.length < 30 &&
        !isPlaceholderLike(body, placeholderPhrases)
      ) {
        add({
          priority: "polish",
          category: "Content",
          issue: `Story text in "${chamberTitle || chamber.type}" is very short (${body.length} characters).`,
          why: "A threshold or story chamber with only a sentence feels thin. A little more context builds trust.",
          action: "Expand to a short paragraph describing your practice or approach.",
          chamberId: chamber.id,
          objectId: object.id,
        });
      }

      // Proof/testimonial objects without quote
      if ((chamber.type === "proof" || chamber.type === "testimonials") && (object.type === "testimonial" || object.type === "proof" || object.type === "note")) {
        if (quote.length === 0 && body.length === 0 && title.length === 0) {
          add({
            priority: "advisory",
            category: "Trust",
            issue: `Empty proof item in "${chamberTitle || chamber.type}".`,
            why: "Proof chambers exist to build trust. Empty items cancel that benefit.",
            action: "Add a testimonial quote, outcome note, or credential detail.",
            chamberId: chamber.id,
            objectId: object.id,
          });
        }
      }

      // Service objects with empty price/duration
      if (chamber.type === "services" && (object.type === "service" || object.type === "service-card")) {
        const price = (content.priceLabel ?? "").trim();
        const duration = (content.durationLabel ?? "").trim();
        if (price.length === 0 && duration.length === 0 && body.length === 0) {
          add({
            priority: "advisory",
            category: "Offers",
            issue: `Service offer "${label || object.type}" has no details.`,
            why: "Visitors need at least a name and rough price or duration to decide.",
            action: "Add a price, duration, or short description to this offer.",
            chamberId: chamber.id,
            objectId: object.id,
          });
        }
      }

      // Link objects with missing URLs
      if (object.type === "link-card") {
        const url = (content.url ?? "").trim();
        if (url.length === 0) {
          add({
            priority: "advisory",
            category: "Links",
            issue: `Link object "${label || object.type}" has no URL.`,
            why: "A link card without a URL is a dead end.",
            action: "Add the public web address this link should point to.",
            chamberId: chamber.id,
            objectId: object.id,
          });
        }
      }

      // Credential objects with empty detail
      if (object.type === "credential") {
        const issuer = (content.issuer ?? "").trim();
        const detail = (content.detail ?? "").trim();
        if (issuer.length === 0 && detail.length === 0) {
          add({
            priority: "polish",
            category: "Trust",
            issue: `Credential "${label || object.type}" has no issuer or detail.`,
            why: "Empty credentials look accidental rather than intentional omissions.",
            action: "Add the issuing body or a short description of the qualification.",
            chamberId: chamber.id,
            objectId: object.id,
          });
        }
      }
    }
  }

  // ── Kit-semantic chamber checks ──────────────────────────────────────
  const chambersByType = new Map<string, Chamber[]>();
  for (const chamber of room.chambers) {
    const list = chambersByType.get(chamber.type) ?? [];
    list.push(chamber);
    chambersByType.set(chamber.type, list);
  }

  // Threshold presence
  if (rules.expectsThreshold !== false) {
    if (!chambersByType.has("threshold")) {
      add({
        priority: "urgent",
        category: "Structure",
        issue: "No threshold (introduction) chamber found.",
        why: "The threshold is the first thing visitors see. Without it, there is no context.",
        action: "Add a threshold chamber with your name and a short practice line.",
      });
    } else {
      const thresholds = chambersByType.get("threshold")!;
      const hasRealContent = thresholds.some((chamber) =>
        chamber.objects.some((object) => {
          const body = (object.content.body ?? "").trim();
          const title = (object.content.title ?? "").trim();
          return body.length > 10 || title.length > 3;
        }),
      );
      if (!hasRealContent) {
        add({
          priority: "urgent",
          category: "Content",
          issue: "Threshold chamber has no real introduction content.",
          why: "An empty threshold wastes the most important screen real estate.",
          action: "Add a note or title object that says who you are and what you do.",
          chamberId: thresholds[0]?.id,
        });
      }
    }
  }

  // Proof presence
  if (rules.expectsProof) {
    if (!chambersByType.has("proof")) {
      add({
        priority: "advisory",
        category: "Trust",
        issue: "No proof chamber found.",
        why: "This kit expects trust signals. Missing proof makes the room feel unverified.",
        action: "Add a proof chamber with testimonials, outcomes, or credentials.",
      });
    } else {
      const proofs = chambersByType.get("proof")!;
      const hasProofContent = proofs.some((chamber) =>
        chamber.objects.some((object) => {
          const quote = (object.content.quote ?? "").trim();
          const body = (object.content.body ?? "").trim();
          const title = (object.content.title ?? "").trim();
          return quote.length > 0 || body.length > 0 || title.length > 0;
        }),
      );
      if (!hasProofContent) {
        add({
          priority: "advisory",
          category: "Trust",
          issue: "Proof chamber exists but has no testimonials or outcomes.",
          why: "An empty proof chamber is worse than none — it signals you have nothing to show.",
          action: "Add at least one quote, testimonial, or outcome note.",
          chamberId: proofs[0]?.id,
        });
      }
    }
  }

  // Services presence
  if (rules.expectsServices) {
    if (!chambersByType.has("services")) {
      add({
        priority: "advisory",
        category: "Offers",
        issue: "No services chamber found.",
        why: "This kit is built around clear offers. Without them, visitors do not know what to buy or book.",
        action: "Add a services chamber with your offers, packages, or session types.",
      });
    } else {
      const services = chambersByType.get("services")!;
      const hasOffers = services.some((chamber) =>
        chamber.objects.some((object) => object.type === "service" || object.type === "service-card" || object.type === "note"),
      );
      if (!hasOffers) {
        add({
          priority: "advisory",
          category: "Offers",
          issue: "Services chamber exists but contains no offers.",
          why: "A services chamber without offers leaves visitors guessing about scope and price.",
          action: "Add offer or note objects describing what you provide.",
          chamberId: services[0]?.id,
        });
      }
    }
  }

  // Gallery/works count
  const galleries = chambersByType.get("gallery") ?? chambersByType.get("works") ?? [];
  const imageCount = galleries.reduce(
    (sum, chamber) => sum + chamber.objects.filter((o) => o.type === "image" || o.type === "media" || o.type === "work" || o.type === "work-card").length,
    0,
  );
  if (rules.minGalleryImages && imageCount < rules.minGalleryImages) {
    add({
      priority: "advisory",
      category: "Content",
      issue: `Only ${imageCount} image${imageCount === 1 ? "" : "s"} in the gallery. This kit expects at least ${rules.minGalleryImages}.`,
      why: "A thin gallery looks like an abandoned work-in-progress.",
      action: "Add more images or media objects to the gallery or works chamber.",
      chamberId: galleries[0]?.id,
    });
  }

  // Portal/links presence
  if (rules.expectsPortal) {
    if (!chambersByType.has("portal") && !chambersByType.has("links")) {
      add({
        priority: "polish",
        category: "Structure",
        issue: "No portal or links chamber found.",
        why: "This kit expects public links to reviews, resources, or related work.",
        action: "Add a portal chamber with relevant public links.",
      });
    } else {
      const portals = chambersByType.get("portal") ?? chambersByType.get("links") ?? [];
      const hasLinks = portals.some((chamber) =>
        chamber.objects.some((object) => object.type === "link-card" || object.type === "link" || object.type === "portal"),
      );
      if (!hasLinks) {
        add({
          priority: "polish",
          category: "Links",
          issue: "Portal chamber exists but has no link objects.",
          why: "An empty portal chamber misses the chance to connect visitors to your wider practice.",
          action: "Add link-card objects pointing to public reviews, writing, or resources.",
          chamberId: portals[0]?.id,
        });
      }
    }
  }

  // Invitation chamber content
  if (rules.expectsInvitation) {
    const invitations = chambersByType.get("invitation") ?? [];
    for (const invitation of invitations) {
      const hasContent = invitation.objects.some((object) =>
        object.type !== "cta" && ((object.content.body ?? "").trim().length > 0 || (object.content.title ?? "").trim().length > 0),
      );
      if (!hasContent && invitation.objects.length > 0) {
        add({
          priority: "advisory",
          category: "Content",
          issue: `Invitation chamber "${invitation.title || "Untitled"}" has no supporting content beyond the CTA.`,
          why: "An invitation with only a button feels abrupt. A short sentence of context increases conversion.",
          action: "Add a note or text object explaining what happens after someone clicks.",
          chamberId: invitation.id,
        });
      }
    }
  }

  // Contact presence
  if (rules.expectsContact) {
    if (!chambersByType.has("contact")) {
      add({
        priority: "urgent",
        category: "Action",
        issue: "No contact chamber found.",
        why: "Visitors need a way to reach you. A missing contact chamber breaks the conversion path.",
        action: "Add a contact chamber with your public email or enquiry form.",
      });
    } else {
      const contacts = chambersByType.get("contact")!;
      const hasContactInfo = contacts.some((chamber) =>
        chamber.objects.some((object) => {
          const body = (object.content.body ?? "").trim();
          const title = (object.content.title ?? "").trim();
          const url = (object.content.url ?? "").trim();
          const actionHref = (object.content.action?.href ?? "").trim();
          return body.length > 0 || title.length > 0 || url.length > 0 || actionHref.length > 0;
        }),
      );
      if (!hasContactInfo) {
        add({
          priority: "advisory",
          category: "Action",
          issue: "Contact chamber exists but has no contact details.",
          why: "An empty contact chamber frustrates visitors who are ready to reach out.",
          action: "Add a note or link with your public email, phone, or enquiry method.",
          chamberId: contacts[0]?.id,
        });
      }
    }
  }

  // ── Deduplicate by (category + issue + chamberId + objectId) ────────
  const seen = new Set<string>();
  const deduped: StudioGuideIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.priority}|${issue.category}|${issue.issue}|${issue.chamberId ?? ""}|${issue.objectId ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(issue);
    }
  }

  const urgentCount = deduped.filter((i) => i.priority === "urgent").length;
  const advisoryCount = deduped.filter((i) => i.priority === "advisory").length;
  const polishCount = deduped.filter((i) => i.priority === "polish").length;

  // Honest completed count: major structural blocks that are present
  let completedCount = 0;
  if (roomTitle.length >= 3 && !isPlaceholderLike(roomTitle, placeholderPhrases)) completedCount++;
  if (ctaObjects.length > 0 && !deduped.some((i) => i.category === "Action" && i.issue.includes("still uses the default"))) completedCount++;
  if (chambersByType.has("threshold") && !deduped.some((i) => i.issue === "Threshold chamber has no real introduction content.")) completedCount++;
  if (rules.expectsProof && chambersByType.has("proof") && !deduped.some((i) => i.issue.includes("Proof chamber exists but has no"))) completedCount++;
  if (rules.expectsServices && chambersByType.has("services") && !deduped.some((i) => i.issue.includes("Services chamber exists but contains no offers"))) completedCount++;
  if (rules.expectsContact && chambersByType.has("contact") && !deduped.some((i) => i.issue.includes("Contact chamber exists but has no contact details"))) completedCount++;
  if (rules.minGalleryImages && imageCount >= rules.minGalleryImages) completedCount++;
  if (rules.expectsPortal && (chambersByType.has("portal") || chambersByType.has("links")) && !deduped.some((i) => i.issue.includes("Portal chamber exists but has no link objects"))) completedCount++;
  if (!deduped.some((i) => i.category === "Visibility" && i.issue.includes("hidden on mobile"))) completedCount++;

  return {
    issues: deduped.sort(prioritySort),
    urgentCount,
    advisoryCount,
    polishCount,
    completedCount,
  };
}

function isPlaceholderLike(value: string, placeholders: Set<string>): boolean {
  const lower = value.toLowerCase().trim();
  if (placeholders.has(lower)) return true;
  // Also catch scaffold-like language
  if (lower.includes("optional content can be added here")) return true;
  if (lower.includes("your name or studio name")) return true;
  if (lower.includes("your name or practice name")) return true;
  if (lower.includes("your practice, project, or organisation name")) return true;
  if (lower.startsWith("add ") && lower.includes("here")) return true;
  return false;
}

function prioritySort(a: StudioGuideIssue, b: StudioGuideIssue): number {
  const rank = { urgent: 0, advisory: 1, polish: 2 };
  const diff = rank[a.priority] - rank[b.priority];
  if (diff !== 0) return diff;
  return a.category.localeCompare(b.category);
}
