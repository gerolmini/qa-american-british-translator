const americanOnly = require('./american-only.js');
const americanToBritishSpelling = require('./american-to-british-spelling.js');
const americanToBritishTitles = require("./american-to-british-titles.js")
const britishOnly = require('./british-only.js')

class Translator {

    toBritishEnglish(text) {
        const dict = { ...americanOnly, ...americanToBritishSpelling };
        const titles = americanToBritishTitles;
        const timeRegex = /([1-9]|1[0-2]):[0-5][0-9]/g;
        const translation = this.replaceText(text, dict, titles, timeRegex, 'toBritish');
        return translation;
    }

    toAmericanEnglish(text) {
        const dict = { ...britishOnly, ...this.invertDict(americanToBritishSpelling) };
        const titles = this.invertDict(americanToBritishTitles);
        const timeRegex = /([1-9]|1[0-2])\.[0-5][0-9]/g;
        const translation = this.replaceText(text, dict, titles, timeRegex, 'toAmerican');
        return translation;
    }

    invertDict(obj) {
        return Object.assign({}, ...Object.entries(obj).map(([k, v]) => ({ [v]: k })));
    }

    replaceText(text, dict, titles, timeRegex, mode) {
        const lowerText = text.toLowerCase();
        const matchesMap = [];

        // Titles
        Object.entries(titles).forEach(([k, v]) => {
            if (lowerText.includes(k)) {
                const regex = new RegExp(`(?<=^|[\\s])${k}(?=[\\s.,;?!]|$)`, 'gi');
                let match;
                while ((match = regex.exec(text)) !== null) {
                    matchesMap.push({ index: match.index, length: match[0].length, value: v.charAt(0).toUpperCase() + v.slice(1), original: match[0] });
                }
            }
        });

        // Filter dictionary with spaces first to avoid partial matches
        const dictKeys = Object.keys(dict).sort((a, b) => b.length - a.length);

        dictKeys.forEach(k => {
            const regex = new RegExp(`(?<=^|[\\s.,;?!])${k}(?=[\\s.,;?!]|$)`, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                matchesMap.push({ index: match.index, length: match[0].length, value: dict[k], original: match[0], type: 'word' });
            }
        });

        // Time
        let match;
        while ((match = timeRegex.exec(text)) !== null) {
            let replacement;
            if (mode === 'toBritish') {
                replacement = match[0].replace(':', '.');
            } else {
                replacement = match[0].replace('.', ':');
            }
            matchesMap.push({ index: match.index, length: match[0].length, value: replacement, original: match[0], type: 'time' });
        }

        if (matchesMap.length === 0) return text;

        // Sort matches by index
        matchesMap.sort((a, b) => a.index - b.index);

        // Filter overlaps (keep the longest or first?)
        // Since we sorted dict keys by length, we might have overlaps if we match "favorite color" and "color".
        // But "favorite color" would be a single key if it exists.
        // If we have "favorite" and "favorite color", "favorite color" comes first in dictKeys loop.
        // But here we are collecting ALL matches.
        // We need to remove matches that are inside other matches.

        const validMatches = [];
        let lastIndex = -1;

        for (const m of matchesMap) {
            if (m.index >= lastIndex) {
                validMatches.push(m);
                lastIndex = m.index + m.length;
            }
        }

        // Rebuild string
        let translation = '';
        let currentIndex = 0;

        validMatches.forEach(m => {
            translation += text.slice(currentIndex, m.index);

            let replacement = m.value;
            if (m.type === 'word') {
                // Preserve capitalization
                if (m.original.charAt(0) === m.original.charAt(0).toUpperCase()) {
                    replacement = replacement.charAt(0).toUpperCase() + replacement.slice(1);
                }
            }

            translation += '<span class="highlight">' + replacement + '</span>';
            currentIndex = m.index + m.length;
        });

        translation += text.slice(currentIndex);

        return translation;
    }
}

module.exports = Translator;