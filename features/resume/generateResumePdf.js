/**
 * Mentra Phase 6 Part B — Step 8: Client-Side Resume PDF Generator
 *
 * Generates an academic publication-grade Collegiate Resume PDF directly
 * from the live in-memory editor state (saved or unsaved).
 *
 * Requirements satisfied:
 * 1. Pure client-side PDF document generation using authorized jsPDF text & layout APIs.
 * 2. Reflects current in-memory editor state: edited summary, modified item titles & descriptions.
 * 3. Reflects current item order and inclusion status (omits excluded items).
 * 4. Zero database interaction (does not query or write to resume_drafts, projects, or journey).
 * 5. Handles multi-page overflow with continuous line-by-line pagination, headers, and footers.
 * 6. Sanitizes untrusted text and avoids HTML injection.
 * 7. Clear, deterministic filename based on candidate identity.
 */

import { jsPDF } from 'jspdf';

/**
 * Sanitizes untrusted text strings: converts quotes/dashes/bullets to clean characters,
 * normalizes whitespace, and strips non-printable control characters.
 */
export function sanitizePdfText(str) {
  if (typeof str !== 'string') return '';
  return str
    // Normalize hyphen and dash variants (including non-breaking hyphen U+2011, figure dash, en/em-dash) to standard hyphen
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/\u00AD/g, '') // soft hyphen
    // Normalize single quotes / apostrophes to standard ASCII apostrophe
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u0060\u00B4]/g, "'")
    // Normalize double quotes to standard ASCII double quote
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g, '"')
    // Normalize ellipsis to three dots
    .replace(/\u2026/g, '...')
    // Normalize non-standard bullet characters to standard bullet
    .replace(/[\u2023\u25E6\u2043\u2219]/g, '•')
    // Normalize non-standard whitespace (non-breaking spaces, em/en space, thin space) to standard space
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    // Remove invisible zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Replace common arrows and mathematical symbols with ASCII equivalents
    .replace(/\u2192/g, '->')
    .replace(/\u2190/g, '<-')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u2260/g, '!=')
    .replace(/\u00B1/g, '+/-')
    // Normalize tabs and carriage returns to space
    .replace(/[\r\t]/g, ' ')
    // Decompose any remaining unmapped Unicode characters (> 255) to prevent jsPDF from falling back
    // to UTF-16 BE with null-byte spacing in standard 8-bit WinAnsi fonts
    .replace(/[^\x00-\xFF]/g, (char) => {
      if (char === '•') return char; // Supported by jsPDF WinAnsiEncoding (code 149)
      const decomposed = char.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
      return decomposed || ' ';
    })
    .trim();
}

/**
 * Sanitizes candidate name for filename generation: removes illegal path characters
 * and replaces spaces with underscores.
 */
export function sanitizeFilename(name) {
  const raw = (name || 'Student').trim();
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return `${cleaned || 'Student'}_Collegiate_Resume.pdf`;
}

/**
 * Assembles academic details for resume headers (both preview and PDF export).
 * When `program` and `course` contain the same value, displays that value only once.
 * If the values differ, follows the existing intended display behavior.
 *
 * @param {Object} profile - Candidate profile containing program, course, department, specialization.
 * @param {Object} [options]
 * @param {Function} [options.sanitize] - Optional text sanitizer (e.g. sanitizePdfText).
 * @param {string} [options.fallback] - Fallback when no academic details are present.
 * @param {Function} [options.formatSpec] - Formatter for specialization text.
 * @returns {string[]} Array of formatted academic details parts.
 */
export function getAcademicDetailsParts(profile, {
  sanitize = (s) => (typeof s === 'string' ? s.trim() : ''),
  fallback = 'Department Scholar',
  formatSpec = (s) => `Specialization: ${s}`
} = {}) {
  const sanitizeStr = (val) => {
    if (typeof val !== 'string') return '';
    const cleaned = sanitize(val);
    return typeof cleaned === 'string' ? cleaned.trim() : '';
  };

  const dept = sanitizeStr(profile?.department);
  const course = sanitizeStr(profile?.course);
  const prog = sanitizeStr(profile?.program);
  const spec = sanitizeStr(profile?.specialization);

  const parts = [];

  const hasCourse = Boolean(course);
  const hasProg = Boolean(prog);
  const hasDept = Boolean(dept);

  // Compare case-insensitively and whitespace-trimmed to detect exact or casing duplicate values
  const courseMatchesProg = hasCourse && hasProg && course.toLowerCase() === prog.toLowerCase();
  const deptMatchesProg = hasDept && hasProg && dept.toLowerCase() === prog.toLowerCase();

  if (courseMatchesProg || deptMatchesProg) {
    // When program and course (or department) contain the same value, display that value only once.
    // If an institutional department exists that differs from program/course, preserve it first.
    if (hasDept && !deptMatchesProg) {
      parts.push(dept);
    } else if (hasCourse && !courseMatchesProg) {
      parts.push(course);
    }
    // Display the program/course value exactly once
    parts.push(prog || course || dept);
  } else {
    // If the values differ, follow the existing intended display behavior:
    const primary = dept || course;
    if (primary) {
      parts.push(primary);
    }
    if (prog && (!primary || prog.toLowerCase() !== primary.toLowerCase())) {
      parts.push(prog);
    }
    if (parts.length === 0 && fallback) {
      parts.push(fallback);
    }
  }

  // Append specialization if present
  if (spec && typeof formatSpec === 'function') {
    const formattedSpec = formatSpec(spec);
    if (formattedSpec) {
      parts.push(formattedSpec);
    }
  }

  return parts;
}

/**
 * Returns the academic details subtitle string joined by standard collegiate bullet ' • '.
 */
export function formatAcademicDetails(profile, options = {}) {
  return getAcademicDetailsParts(profile, options).join(' • ');
}


/**
 * Constructs the jsPDF document instance from current in-memory draft state.
 * Returns the document, filename, page count, and binary blob.
 */
export function buildResumePdfDoc({ draft, profile, user }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 45;
  const marginRight = 45;
  const marginTop = 45;
  const marginBottom = 45;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const maxY = pageHeight - marginBottom;

  let currentY = marginTop;

  function ensureSpace(neededHeight) {
    if (currentY + neededHeight > maxY) {
      doc.addPage();
      currentY = marginTop;
      return true;
    }
    return false;
  }

  function renderParagraph(rawText, options = {}) {
    const text = sanitizePdfText(rawText);
    if (!text) return;

    const {
      font = 'helvetica',
      style = 'normal',
      size = 9.5,
      color = [51, 65, 85],
      lineHeight = 13.5,
      maxWidth = contentWidth,
    } = options;

    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);

    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, marginLeft, currentY);
      currentY += lineHeight;
    }
  }

  function renderSectionHeader(title) {
    ensureSpace(38);
    currentY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(154, 52, 18); // Mentra terracotta accent
    doc.text(title.toUpperCase(), marginLeft, currentY);
    currentY += 4;

    doc.setDrawColor(203, 213, 225); // Subtle rule line
    doc.setLineWidth(0.75);
    doc.line(marginLeft, currentY, marginLeft + contentWidth, currentY);
    currentY += 12;
  }

  // =========================================================================
  // 1. Header: Candidate Identity & Enrollment
  // =========================================================================
  const candidateName = sanitizePdfText(profile?.full_name) || 'Student Scholar';
  doc.setFont('times', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59); // Primary dark slate
  doc.text(candidateName, marginLeft, currentY);
  currentY += 16;

  // Subtitle: Department & Academic Program
  const academicDetails = formatAcademicDetails(profile, {
    sanitize: sanitizePdfText,
    fallback: 'Department Scholar',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(academicDetails, marginLeft, currentY);
  currentY += 13;

  // Contact & Enrollment Metadata
  const contactDetails = [
    sanitizePdfText(user?.email),
    (profile?.year || profile?.batch)
      ? `Year ${profile?.year || '—'}, Batch ${profile?.batch || '—'}`
      : null,
    'Mentra Collegiate Scholar',
  ].filter(Boolean).join(' • ');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(contactDetails, marginLeft, currentY);
  currentY += 10;

  // Primary Header Divider Line
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(1.25);
  doc.line(marginLeft, currentY, marginLeft + contentWidth, currentY);
  currentY += 14;

  // =========================================================================
  // 2. Academic Summary / Objective (Current In-Memory Draft Text)
  // =========================================================================
  const summaryText = sanitizePdfText(draft?.summary);
  if (summaryText) {
    renderSectionHeader('Academic Focus & Objective');
    renderParagraph(summaryText, {
      font: 'helvetica',
      style: 'normal',
      size: 9.5,
      lineHeight: 13.5,
      color: [51, 65, 85],
    });
    currentY += 6;
  }

  // =========================================================================
  // 3. Technical & Academic Skills (Included Only, in Current Editor Order)
  // =========================================================================
  const rawSkills = Array.isArray(draft?.skills) ? draft.skills : [];
  const includedSkills = rawSkills.filter((s) => s && s.included !== false);

  if (includedSkills.length > 0) {
    renderSectionHeader('Technical & Academic Skills');
    const skillsList = includedSkills
      .map((s) => sanitizePdfText(s.name || s.title))
      .filter(Boolean)
      .join('  •  ');

    renderParagraph(skillsList, {
      font: 'helvetica',
      style: 'normal',
      size: 9.5,
      lineHeight: 13.5,
      color: [51, 65, 85],
    });
    currentY += 6;
  }

  // =========================================================================
  // 4. Featured Portfolio Projects (Included Only, in Current Editor Order)
  // =========================================================================
  const rawProjects = Array.isArray(draft?.projects) ? draft.projects : [];
  const includedProjects = rawProjects.filter((p) => p && p.included !== false);

  if (includedProjects.length > 0) {
    renderSectionHeader('Featured Portfolio Projects');

    includedProjects.forEach((proj, idx) => {
      ensureSpace(38);

      const title = sanitizePdfText(proj.title) || 'Untitled Project';
      const date = sanitizePdfText(proj.date);
      const tags = Array.isArray(proj.tags)
        ? proj.tags.map((t) => `#${sanitizePdfText(t)}`).filter(Boolean)
        : [];

      // Project Title & Date
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);

      if (date) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const dateWidth = doc.getTextWidth(date);
        doc.setTextColor(100, 116, 139);
        doc.text(date, marginLeft + contentWidth - dateWidth, currentY);

        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        const maxTitleWidth = contentWidth - dateWidth - 10;
        const titleLines = doc.splitTextToSize(title, maxTitleWidth);
        doc.text(titleLines[0], marginLeft, currentY);
        if (titleLines.length > 1) {
          for (let i = 1; i < titleLines.length; i++) {
            currentY += 13;
            ensureSpace(13);
            doc.text(titleLines[i], marginLeft, currentY);
          }
        }
      } else {
        const titleLines = doc.splitTextToSize(title, contentWidth);
        doc.text(titleLines[0], marginLeft, currentY);
        if (titleLines.length > 1) {
          for (let i = 1; i < titleLines.length; i++) {
            currentY += 13;
            ensureSpace(13);
            doc.text(titleLines[i], marginLeft, currentY);
          }
        }
      }
      currentY += 12;

      // Tags line (if present)
      if (tags.length > 0) {
        ensureSpace(11);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(tags.join('  '), marginLeft, currentY);
        currentY += 10;
      }

      // Project Description
      if (proj.description) {
        renderParagraph(proj.description, {
          font: 'helvetica',
          style: 'normal',
          size: 9,
          lineHeight: 12.5,
          color: [71, 85, 105],
        });
      }

      // Spacing between project entries
      if (idx < includedProjects.length - 1) {
        currentY += 7;
      }
    });
    currentY += 8;
  }

  // =========================================================================
  // 4. Collegiate Journey Milestones (Included Only, in Current Editor Order)
  // =========================================================================
  const rawJourney = Array.isArray(draft?.journey) ? draft.journey : [];
  const includedJourney = rawJourney.filter((j) => j && j.included !== false);

  if (includedJourney.length > 0) {
    renderSectionHeader('Collegiate Journey & Milestones');

    includedJourney.forEach((item, idx) => {
      ensureSpace(35);

      const title = sanitizePdfText(item.title) || 'Milestone';
      const date = sanitizePdfText(item.date);

      // Milestone Title & Date
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);

      if (date) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        const dateWidth = doc.getTextWidth(date);
        doc.setTextColor(100, 116, 139);
        doc.text(date, marginLeft + contentWidth - dateWidth, currentY);

        doc.setFont('times', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        const maxTitleWidth = contentWidth - dateWidth - 10;
        const titleLines = doc.splitTextToSize(title, maxTitleWidth);
        doc.text(titleLines[0], marginLeft, currentY);
        if (titleLines.length > 1) {
          for (let i = 1; i < titleLines.length; i++) {
            currentY += 13;
            ensureSpace(13);
            doc.text(titleLines[i], marginLeft, currentY);
          }
        }
      } else {
        const titleLines = doc.splitTextToSize(title, contentWidth);
        doc.text(titleLines[0], marginLeft, currentY);
        if (titleLines.length > 1) {
          for (let i = 1; i < titleLines.length; i++) {
            currentY += 13;
            ensureSpace(13);
            doc.text(titleLines[i], marginLeft, currentY);
          }
        }
      }
      currentY += 12;

      // Milestone Description
      if (item.description) {
        renderParagraph(item.description, {
          font: 'helvetica',
          style: 'normal',
          size: 9,
          lineHeight: 12.5,
          color: [71, 85, 105],
        });
      }

      // Spacing between milestone entries
      if (idx < includedJourney.length - 1) {
        currentY += 7;
      }
    });
  }

  // =========================================================================
  // 6. Honors & Achievements (Included Only, in Current Editor Order)
  // =========================================================================
  const rawAchievements = Array.isArray(draft?.achievements) ? draft.achievements : [];
  const includedAchievements = rawAchievements.filter((a) => a && a.included !== false);

  if (includedAchievements.length > 0) {
    renderSectionHeader('Honors & Achievements');

    includedAchievements.forEach((ach, idx) => {
      ensureSpace(24);

      const title = sanitizePdfText(ach.title || ach.name);
      const date = sanitizePdfText(ach.date);

      if (title) {
        doc.setFont('times', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 41, 59);

        if (date) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          const dateWidth = doc.getTextWidth(date);
          doc.setTextColor(100, 116, 139);
          doc.text(date, marginLeft + contentWidth - dateWidth, currentY);

          doc.setFont('times', 'bold');
          doc.setFontSize(10.5);
          doc.setTextColor(30, 41, 59);
          const maxTitleWidth = contentWidth - dateWidth - 10;
          const titleLines = doc.splitTextToSize(`•  ${title}`, maxTitleWidth);
          doc.text(titleLines[0], marginLeft, currentY);
          if (titleLines.length > 1) {
            for (let i = 1; i < titleLines.length; i++) {
              currentY += 12;
              ensureSpace(12);
              doc.text(titleLines[i], marginLeft + 10, currentY);
            }
          }
        } else {
          const titleLines = doc.splitTextToSize(`•  ${title}`, contentWidth);
          doc.text(titleLines[0], marginLeft, currentY);
          if (titleLines.length > 1) {
            for (let i = 1; i < titleLines.length; i++) {
              currentY += 12;
              ensureSpace(12);
              doc.text(titleLines[i], marginLeft + 10, currentY);
            }
          }
        }
        currentY += 12;
      }

      if (ach.description) {
        renderParagraph(ach.description, {
          font: 'helvetica',
          style: 'normal',
          size: 9,
          lineHeight: 12.5,
          color: [71, 85, 105],
        });
      }

      if (idx < includedAchievements.length - 1) {
        currentY += 5;
      }
    });
    currentY += 6;
  }

  // =========================================================================
  // 7. Running Page Footers Across All Pages
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Subtle footer separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, 804, marginLeft + contentWidth, 804);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    const leftFooter = `${candidateName} • Mentra Collegiate Resume`;
    doc.text(leftFooter, marginLeft, 816);

    const rightFooter = `Page ${p} of ${totalPages}`;
    const rfWidth = doc.getTextWidth(rightFooter);
    doc.text(rightFooter, marginLeft + contentWidth - rfWidth, 816);
  }

  const filename = sanitizeFilename(profile?.full_name);

  return { doc, filename, totalPages };
}

/**
 * High-level download trigger: builds the PDF and triggers client-side file save.
 */
export function generateResumePdf({ draft, profile, user, download = true }) {
  const result = buildResumePdfDoc({ draft, profile, user });

  if (download && typeof result.doc.save === 'function') {
    result.doc.save(result.filename);
  }

  return result;
}
