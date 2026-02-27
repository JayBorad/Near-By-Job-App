import { countries } from 'countries-list';

export const COUNTRY_CODES = Object.entries(countries)
  .map(([countryIso, country]) => {
    const rawPhone = Array.isArray(country.phone) ? country.phone[0] : country.phone;
    const callingCode = String(rawPhone || '').split(',')[0].trim();
    if (!callingCode) return null;

    return {
      iso: countryIso,
      name: country.name,
      code: `+${callingCode}`
    };
  })
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name));
