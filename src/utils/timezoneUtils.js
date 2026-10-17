export const TIMEZONE_OPTIONS = [
  {
    id: 'utc-8',
    country: 'US (Pacific)',
    countryCodes: ['us'],
    label: 'US (Pacific)',
    timeZone: 'America/Los_Angeles',
    shortName: 'PT',
    region: 'US Pacific',
  },
  {
    id: 'utc-5',
    country: 'US (Eastern)',
    countryCodes: ['us'],
    label: 'US (Eastern)',
    timeZone: 'America/New_York',
    shortName: 'ET',
    region: 'US Eastern',
  },
  {
    id: 'utc-3',
    country: 'Brazil / Argentina',
    countryCodes: ['br', 'ar'],
    label: 'Brazil / Argentina',
    timeZone: 'America/Sao_Paulo',
    shortName: 'BRT',
    region: 'Brazil / Argentina',
  },
  {
    id: 'utc-0',
    country: 'UK',
    countryCodes: ['gb'],
    label: 'UK',
    timeZone: 'Europe/London',
    shortName: 'GMT/BST',
    region: 'UTC / UK',
  },
  {
    id: 'utc+1',
    country: 'Central Europe',
    countryCodes: ['eu'],
    label: 'Central Europe',
    timeZone: 'Europe/Paris',
    shortName: 'CET',
    region: 'Central Europe',
  },
  {
    id: 'utc+2',
    country: 'South Africa',
    countryCodes: ['za'],
    label: 'South Africa',
    timeZone: 'Africa/Johannesburg',
    shortName: 'SAST',
    region: 'South Africa / Europe',
  },
  {
    id: 'utc+3',
    country: 'Saudi Arabia',
    countryCodes: ['sa'],
    label: 'Saudi Arabia',
    timeZone: 'Asia/Riyadh',
    shortName: 'AST',
    region: 'Saudi Arabia',
  },
  {
    id: 'utc+4',
    country: 'UAE',
    countryCodes: ['ae'],
    label: 'UAE',
    timeZone: 'Asia/Dubai',
    shortName: 'GST',
    region: 'UAE',
  },
  {
    id: 'utc+5:30',
    country: 'India',
    countryCodes: ['in'],
    label: 'India',
    timeZone: 'Asia/Kolkata',
    shortName: 'IST',
    region: 'India',
  },
  {
    id: 'utc+5:45',
    country: 'Nepal',
    countryCodes: ['np'],
    label: 'Nepal',
    timeZone: 'Asia/Kathmandu',
    shortName: 'NPT',
    region: 'Nepal',
  },
  {
    id: 'utc+6',
    country: 'Bangladesh',
    countryCodes: ['bd'],
    label: 'Bangladesh',
    timeZone: 'Asia/Dhaka',
    shortName: 'BST',
    region: 'Bangladesh',
  },
  {
    id: 'utc+7',
    country: 'Thailand / Vietnam',
    countryCodes: ['th', 'vn'],
    label: 'Thailand / Vietnam',
    timeZone: 'Asia/Bangkok',
    shortName: 'ICT',
    region: 'Thailand / Vietnam',
  },
  {
    id: 'utc+8',
    country: 'Singapore / China',
    countryCodes: ['sg', 'cn'],
    label: 'Singapore / China',
    timeZone: 'Asia/Singapore',
    shortName: 'SGT',
    region: 'Singapore / China',
  },
  {
    id: 'utc+9',
    country: 'Japan / South Korea',
    countryCodes: ['jp', 'kr'],
    label: 'Japan / South Korea',
    timeZone: 'Asia/Tokyo',
    shortName: 'JST',
    region: 'Japan / South Korea',
  },
  {
    id: 'utc+10',
    country: 'Australia',
    countryCodes: ['au'],
    label: 'Australia',
    timeZone: 'Australia/Sydney',
    shortName: 'AEST',
    region: 'Australia',
  },
  {
    id: 'utc+12',
    country: 'New Zealand',
    countryCodes: ['nz'],
    label: 'New Zealand',
    timeZone: 'Pacific/Auckland',
    shortName: 'NZST',
    region: 'New Zealand',
  },
];

export const DEFAULT_TIMEZONE_ID = 'utc+5:30';

export function getTimezoneById(id) {
  return TIMEZONE_OPTIONS.find((t) => t.id === id) || TIMEZONE_OPTIONS.find((t) => t.id === DEFAULT_TIMEZONE_ID);
}

export function resolveTimeZone(tzOrId) {
  if (!tzOrId) return 'Asia/Kolkata';
  const match = TIMEZONE_OPTIONS.find((t) => t.id === tzOrId || t.timeZone === tzOrId);
  return match ? match.timeZone : tzOrId;
}

export function formatTimeForZone(date, timeZone) {
  const resolved = resolveTimeZone(timeZone);
  try {
    return date.toLocaleTimeString('en-US', {
      timeZone: resolved,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (_) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }
}

export function formatDateForZone(date, timeZone) {
  const resolved = resolveTimeZone(timeZone);
  try {
    return date.toLocaleDateString('en-US', {
      timeZone: resolved,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      weekday: 'long',
    });
  } catch (_) {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      weekday: 'long',
    });
  }
}

