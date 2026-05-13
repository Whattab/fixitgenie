/**
 * exportTranscript.js
 * Generates and downloads a plain-text conversation transcript.
 */

/**
 * Format a date to "YYYY-MM-DD HH:MM" in the viewer's local timezone.
 * @param {string} iso - ISO timestamp string
 * @returns {string}
 */
function fmtDateTime(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/**
 * Sanitize a string for use as a filename segment.
 * Lowercases, replaces non-alphanumeric runs with a single dash.
 * @param {string} str
 * @returns {string}
 */
function sanitizeForFilename(str) {
  return (str ?? 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Format today's date as YYYYMMDD for the filename.
 * @returns {string}
 */
function todayYYYYMMDD() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/**
 * Render one message as lines of plain text.
 * Returns an array of strings (no trailing newlines).
 *
 * @param {object} msg           - Message row from the DB
 * @param {object} senderNames   - Map of sender_id → display name
 * @returns {string[]}
 */
function renderMessage(msg, senderNames) {
  const ts = fmtDateTime(msg.created_at);
  const isSystem = msg.kind === 'system';
  const isDeleted = !!msg.deleted_at;

  const senderLabel = isSystem
    ? 'System'
    : (senderNames[msg.sender_id] ?? 'Unknown user');

  const header = `[${ts}]  ${senderLabel}:`;

  if (isDeleted) {
    return [header, '[Message deleted]', ''];
  }

  if (isSystem) {
    return [header, msg.body ?? '', ''];
  }

  const lines = [header];

  if (msg.kind === 'image') {
    lines.push('[Photo attached]');
    // Never expose the signed URL or storage path — they expire and could leak.
    if (msg.body) {
      lines.push(msg.body); // optional caption
    }
  } else {
    // kind === 'text'
    lines.push(msg.body ?? '[empty]');
  }

  lines.push(''); // blank line between messages
  return lines;
}

/**
 * downloadTranscript — builds and immediately downloads a .txt file.
 *
 * @param {object} params
 * @param {object} params.conversation    - Full conversation object from MessagingContext
 * @param {object[]} params.messages      - Array of message rows (all messages, unfiltered)
 * @param {string}  params.currentUserName - Display name of the logged-in user
 */
export function downloadTranscript({ conversation, messages, currentUserName }) {
  const sr = conversation.service_request ?? {};
  const homeownerName = conversation.homeowner?.name ?? 'Unknown';
  const proName = conversation.pro?.name ?? 'Unknown';

  // ── Build sender name map for O(1) lookup while rendering ─────────────────
  const senderNames = {};
  senderNames[conversation.homeowner_id] = homeownerName;
  senderNames[conversation.pro_id] = proName;
  // Any other sender_id (edge case: deleted profile) will fall back to
  // 'Unknown user' inside renderMessage().

  // ── Header block ──────────────────────────────────────────────────────────
  const divider = '======================================';
  const shortDivider = '--------------------------------------';

  const header = [
    'Fixit Genie — Conversation Transcript',
    divider,
    '',
    `Category:       ${sr.category ?? 'N/A'}`,
    `Location:       ${sr.city_state ?? 'N/A'}`,
    `Urgency:        ${sr.urgency ?? 'N/A'}`,
    `Request status: ${sr.status ?? 'N/A'}`,
    '',
    `Homeowner:      ${homeownerName}`,
    `Professional:   ${proName}`,
    '',
    `Conversation started: ${messages.length > 0 ? fmtDateTime(messages[0].created_at) : 'N/A'}`,
    `Transcript generated: ${fmtDateTime(new Date().toISOString())}`,
    `Exported by:    ${currentUserName ?? 'Unknown'}`,
    '',
    shortDivider,
    '',
  ];

  // ── Message lines ─────────────────────────────────────────────────────────
  const messageLines = messages.flatMap((msg) => renderMessage(msg, senderNames));

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = [
    divider,
    `End of transcript — ${messages.length} message${messages.length !== 1 ? 's' : ''}`,
  ];

  const fullText = [...header, ...messageLines, ...footer].join('\n');

  // ── Trigger download ──────────────────────────────────────────────────────
  const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
  const category = sanitizeForFilename(sr.category);
  const filename = `fixit-genie-transcript-${category}-${todayYYYYMMDD()}.txt`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
