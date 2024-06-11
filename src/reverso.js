const axios = require('axios')
const { getRandom } = require('random-useragent')
const { load } = require('cheerio')
const puppeteer = require('puppeteer');

const available = require('./languages/available.js')
const compatibility = require('./languages/compatibility.js')
const SupportedLanguages = require('./entities/languages.js')

axios.interceptors.request.use(
    (config) => {
        config.headers['Accept'] = '*/*'
        config.headers['Connection'] = 'keep-alive'
        config.headers['User-Agent'] = getRandom()

        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

module.exports = class Reverso {
    /** @private */
    CONTEXT_URL = 'https://context.reverso.net/translation/'
    /** @private */
    SPELLCHECK_URL = 'https://orthographe.reverso.net/api/v1/Spelling'
    /** @private */
    SYNONYMS_URL = 'https://synonyms.reverso.net/synonym/'
    /** @private */
    TRANSLATION_URL = 'https://api.reverso.net/translate/v1/translation'
    /** @private */
    VOICE_URL =
        'https://voice.reverso.net/RestPronunciation.svc/v1/output=json/GetVoiceStream/'
    /** @private */
    CONJUGATION_URL = 'https://conjugator.reverso.net/conjugation-'

    /**
     * @private
     * Whether to use the insecure HTTP parser in Axios.
     *
     * This HTTP parser accepts certain headers that do not strictly follow the specification in
     * https://datatracker.ietf.org/doc/html/rfc2616#section-4.1. The Reverso API occasionally
     * returns headers that do not end with CRLF. Enable this to support accept these malformed
     * responses. See https://github.com/axios/axios#request-config
     */
    insecureHTTPParser = false

    /**
     * @public
     * @param {insecureHTTPParser: boolean}
     */
    constructor({ insecureHTTPParser = false } = {}) {
        this.insecureHTTPParser = insecureHTTPParser
    }

    /**
     * Get context examples of the query.
     * @public
     * @param text {string}
     * @param source {'arabic' | 'german' | 'spanish' | 'french' | 'hebrew' | 'italian' | 'japanese' | 'dutch' | 'polish' | 'portuguese' | 'romanian' | 'russian' | 'turkish' | 'chinese' | 'english' | 'swedish'}
     * @param target {'arabic' | 'german' | 'spanish' | 'french' | 'hebrew' | 'italian' | 'japanese' | 'dutch' | 'polish' | 'portuguese' | 'romanian' | 'russian' | 'turkish' | 'chinese' | 'english' | 'swedish'}
     * @param cb {function}
     * @returns {Promise<{ok: boolean, message: string}|{examples: {id: number, source: string, target: string}[], translations: string[], text, source: string, ok: boolean, target: string}>}
     */
    async getContextByTranslation(
        text,
        selectedTranslation,
        source = SupportedLanguages.ENGLISH,
        target = SupportedLanguages.RUSSIAN,
        cb = null
    ) {
        source = source.toLowerCase()
        target = target.toLowerCase()

        if (cb && typeof cb !== 'function') {
            return {
                ok: false,
                message: 'getContext: cb parameter must be type of function',
            }
        }

        if (
            !compatibility.context
                .find((e) => e.name === source)
                ?.compatible_with.includes(target)
        ) {
            const error = {
                ok: false,
                message: 'getContext: invalid language passed to the method',
            }

            if (cb) cb(error)

            return error
        }

        const tst =
            this.CONTEXT_URL +
            [source, target].join('-') +
            '/' +
            encodeURIComponent(text).replace(/%20/g, '+') + '#' + selectedTranslation

        // Launch Puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const url = tst;

        // Set a random user-agent to mimic a real browser
        await page.setUserAgent(getRandom());

        // Navigate to the URL with the fragment
        await page.goto(url);
        await page.waitForSelector('#filtered-entry');
        const content = await page.content();

        // Close the browser
        await browser.close();

        const $$ = load(content)
        const sourceDirection =
            source === SupportedLanguages.ARABIC
                ? `rtl ${SupportedLanguages.ARABIC}`
                : source === SupportedLanguages.HEBREW
                ? 'rtl'
                : 'ltr'
        const targetDirection =
            target === 'arabic'
                ? `rtl ${SupportedLanguages.ARABIC}`
                : target === SupportedLanguages.HEBREW
                ? 'rtl'
                : 'ltr'

        // Function to remove <a> tags but keep their inner content
        function removeOuterATag(html) {
            const $content = load(html);
            $content('a').each((i, el) => {
                const innerHtml = $content(el).html();
                $content(el).replaceWith(innerHtml);
            });
            return $content.html();
        }

        // Function to extract content inside <body> tag
        function extractBodyContent(html) {
            const $content = load(html);
            return $content('body').html();
        }

        const sourceExamples = $$(
            `.example > div.src.${sourceDirection} > span.text`
        )
            .map((i, el) => $$(el).html().trim())
            .get();

        const targetExamples = $$(`.example > div.trg.${targetDirection} > span.text`)
            .map((i, el) => {
                const html = $$(el).html().trim();
                const cleanedHtml = removeOuterATag(html);
                return extractBodyContent(cleanedHtml);
            })
            .get();

        const examples = sourceExamples.map((e, i) => ({
            id: i,
            source: e.trim(),
            target: targetExamples[i].trim(),
        }))

        const result = {
            ok: true,
            text,
            source,
            target,
            examples
        }

        if (cb) cb(null, result)

        return result
    }

        /**
     * Get context examples of the query.
     * @public
     * @param text {string}
     * @param source {'arabic' | 'german' | 'spanish' | 'french' | 'hebrew' | 'italian' | 'japanese' | 'dutch' | 'polish' | 'portuguese' | 'romanian' | 'russian' | 'turkish' | 'chinese' | 'english' | 'swedish'}
     * @param target {'arabic' | 'german' | 'spanish' | 'french' | 'hebrew' | 'italian' | 'japanese' | 'dutch' | 'polish' | 'portuguese' | 'romanian' | 'russian' | 'turkish' | 'chinese' | 'english' | 'swedish'}
     * @param cb {function}
     * @returns {Promise<{ok: boolean, message: string}|{examples: {id: number, source: string, target: string}[], translations: string[], text, source: string, ok: boolean, target: string}>}
     */
        async getContext(
            text,
            source = SupportedLanguages.ENGLISH,
            target = SupportedLanguages.RUSSIAN,
            cb = null
        ) {
            source = source.toLowerCase()
            target = target.toLowerCase()
    
            if (cb && typeof cb !== 'function') {
                return {
                    ok: false,
                    message: 'getContext: cb parameter must be type of function',
                }
            }
    
            if (
                !compatibility.context
                    .find((e) => e.name === source)
                    ?.compatible_with.includes(target)
            ) {
                const error = {
                    ok: false,
                    message: 'getContext: invalid language passed to the method',
                }
    
                if (cb) cb(error)
    
                return error
            }
            const test = this.CONTEXT_URL +
                        [source, target].join('-') +
                        '/' +
                        encodeURIComponent(text).replace(/%20/g, '+') 

            const response = await this.#request({
                method: 'GET',
                url:
                    this.CONTEXT_URL +
                    [source, target].join('-') +
                    '/' +
                    encodeURIComponent(text).replace(/%20/g, '+') 
            })
            if (!response.success) return this.#handleError(response.error, cb)
    
            const $ = load(response.data)
            const sourceDirection =
                source === SupportedLanguages.ARABIC
                    ? `rtl ${SupportedLanguages.ARABIC}`
                    : source === SupportedLanguages.HEBREW
                    ? 'rtl'
                    : 'ltr'
            const targetDirection =
                target === 'arabic'
                    ? `rtl ${SupportedLanguages.ARABIC}`
                    : target === SupportedLanguages.HEBREW
                    ? 'rtl'
                    : 'ltr'
    
            // Function to remove <a> tags but keep their inner content
            function removeOuterATag(html) {
                const $content = load(html);
                $content('a').each((i, el) => {
                    const innerHtml = $content(el).html();
                    $content(el).replaceWith(innerHtml);
                });
                return $content.html();
            }
    
            // Function to extract content inside <body> tag
            function extractBodyContent(html) {
                const $content = load(html);
                return $content('body').html();
            }
    
            const sourceExamples = $(
                `.example > div.src.${sourceDirection} > span.text`
            )
                .map((i, el) => $(el).html().trim())
                .get();
    
            const targetExamples = $(`.example > div.trg.${targetDirection} > span.text`)
                .map((i, el) => {
                    const html = $(el).html().trim();
                    const cleanedHtml = removeOuterATag(html);
                    return extractBodyContent(cleanedHtml);
                })
                .get();
            
            const targetTranslations = $('#translations-content a.translation')
                .map((i, el) => {
                    const term = $(el).find('span.display-term').text()?.trim();
                    const gender = $(el).find('div.pos-mark span').attr('title')?.trim()
                    return {
                        Translation: term,
                        Type: gender
                    };
                })
                .get();
                
    
            const examples = sourceExamples.map((e, i) => ({
                id: i,
                source: e.trim(),
                target: targetExamples[i].trim(),
            }))
            const translations = targetTranslations
    
            const result = {
                ok: true,
                text,
                source,
                target,
                translations,
                examples,
            }
    
            if (cb) cb(null, result)
    
            return result
        }



    /**
     * Get spell check of the query.
     * @public
     * @param text {string}
     * @param source {'english' | 'french' | 'italian' | 'spanish'}
     * @param cb {function}
     * @returns {Promise<{ok: boolean, message: string}|{ ok: boolean, text: string, sentences: any[], stats: any[], corrections: { id: number, text: string, type: string, explanation: string, corrected: string, suggestions: string}[]}>}
     */
    async getSpellCheck(text, source = SupportedLanguages.ENGLISH, cb = null) {
        source = source.toLowerCase()

        if (cb && typeof cb !== 'function') {
            return {
                ok: false,
                message: 'getSpellCheck: cb parameter must be type of function',
            }
        }

        if (!available.spell.find((e) => e === source)) {
            const error = {
                ok: false,
                message: 'getSpellCheck: invalid language passed to the method',
            }

            if (cb) cb(error)

            return error
        }

        const languages = {
            english: 'eng',
            french: 'fra',
            italian: 'ita',
            spanish: 'spa',
        }

        const response = await this.#request({
            method: 'POST',
            url: this.SPELLCHECK_URL,
            headers: {
                'Content-Type': 'application/json',
            },
            data: {
                language: languages[source],
                getCorrectionDetails: true,
                origin: 'interactive',
                text,
            },
        })
        if (!response.success || !Object.keys(response.data).length)
            return this.#handleError(
                {
                    message: 'No result',
                },
                cb
            )

        const result = {
            ok: true,
            text: response.data.text,
            sentences: response.data.sentences,
            stats: response.data.stats,
            corrections: response.data.corrections.map((e, i) => ({
                id: i,
                text,
                type: e.type,
                explanation: e.longDescription,
                corrected: e.correctionText,
                suggestions: e.suggestions,
            })),
        }

        if (cb) cb(null, result)

        return result
    }

    /**
     * Get synonyms of the query.
     * @public
     * @param text {string}
     * @param source {'english' | 'russian' | 'german' | 'spanish' | 'french' | 'polish' | 'italian' | 'arabic' | 'hebrew' | 'japanese' | 'dutch' | 'portugese' | 'romanian'}
     * @param cb {function}
     * @returns {Promise<{ok: boolean, message: string}|{synonyms: { id: number, synonym: string }[], text, source: string}>}
     */
    async getSynonyms(text, source = SupportedLanguages.ENGLISH, cb = null) {
        source = source.toLowerCase()

        if (cb && typeof cb !== 'function') {
            return {
                ok: false,
                message: 'getSynonyms: cb parameter must be type of function',
            }
        }

        if (!available.synonyms.find((e) => e === source)) {
            const error = {
                ok: false,
                message: 'getSynonyms: invalid language passed to the method',
            }

            if (cb) cb(error)

            return error
        }

        const languages = {
            english: 'en',
            french: 'fr',
            german: 'de',
            russian: 'ru',
            italian: 'it',
            polish: 'pl',
            spanish: 'es',
            arabic: 'ar',
            hebrew: 'he',
            japanese: 'ja',
            dutch: 'nl',
            portugese: 'pt',
            romanian: 'ro',
        }

        const response = await this.#request({
            method: 'GET',
            url:
                this.SYNONYMS_URL +
                languages[source] +
                '/' +
                encodeURIComponent(text),
        })
        if (!response.success) return this.#handleError(response.error, cb)

        const $ = load(response.data)

        const synonyms = []

        $('a.synonym.relevant').each((i, e) => {
            synonyms.push({
                id: i,
                synonym: $(e).text(),
            })
        })

        const result = {
            ok: true,
            text,
            source,
            synonyms,
        }

        if (cb) cb(null, result)

        return result
    }

    /**
     * Get translation of the query.
     * @public
     * @param text {string}
     * @param source {'arabic' | 'german' | 'spanish' | 'french' | 'hebrew' | 'italian' | 'japanese' | 'dutch' | 'polish' | 'portuguese' | 'romanian' | 'russian' | 'turkish' | 'chinese' | 'english' | 'ukrainian'}
     * @param target {'arabic' | 'german' | 'spanish' | 'french' | 'hebrew' | 'italian' | 'japanese' | 'dutch' | 'polish' | 'portuguese' | 'romanian' | 'russian' | 'turkish' | 'chinese' | 'english' | 'ukrainian'}
     * @param cb {function}
     * @returns {Promise<{ok: boolean, message: string}|{voice: (string|null), detected_language: string, translations: string[], text: string, source: string, target: string}>}
     */
    async getTranslation(
        text,
        source = SupportedLanguages.ENGLISH,
        target = SupportedLanguages.UKRAINIAN,
        cb = null
    ) {
        source = source.toLowerCase()
        target = target.toLowerCase()

        if (cb && typeof cb !== 'function') {
            return {
                ok: false,
                message:
                    'getTranslation: cb parameter must be type of function',
            }
        }

        if (
            !compatibility.translation
                .find((e) => e.name === source)
                ?.compatible_with.includes(target)
        ) {
            const error = {
                ok: false,
                message:
                    'getTranslation: invalid language passed to the method',
            }

            if (cb) cb(error)

            return error
        }

        const languages = {
            arabic: 'ara',
            german: 'ger',
            spanish: 'spa',
            french: 'fra',
            hebrew: 'heb',
            italian: 'ita',
            japanese: 'jpn',
            dutch: 'dut',
            polish: 'pol',
            portuguese: 'por',
            romanian: 'rum',
            russian: 'rus',
            ukrainian: 'ukr',
            turkish: 'tur',
            chinese: 'chi',
            english: 'eng',
        }

        const voices = {
            arabic: 'Mehdi22k',
            german: 'Claudia22k',
            spanish: 'Ines22k',
            french: 'Alice22k',
            hebrew: 'he-IL-Asaf',
            italian: 'Chiara22k',
            japanese: 'Sakura22k',
            dutch: 'Femke22k',
            polish: 'Ania22k',
            portuguese: 'Celia22k',
            romanian: 'ro-RO-Andrei',
            russian: 'Alyona22k',
            turkish: 'Ipek22k',
            chinese: 'Lulu22k',
            english: 'Heather22k',
        }

        const response = await this.#request({
            method: 'POST',
            url: this.TRANSLATION_URL,
            headers: {
                'Content-Type': 'application/json',
            },
            data: {
                format: 'text',
                from: languages[source],
                input: text,
                options: {
                    contextResults: true,
                    languageDetection: true,
                    origin: 'reversomobile',
                    sentenceSplitter: false,
                },
                to: languages[target],
            },
        })
        if (!response.success) return this.#handleError(response.error, cb)

        const translationEncoded = Buffer.from(
            response.data.translation[0]
        ).toString('base64')

        const result = {
            ok: true,
            text,
            source,
            target,
            translations: [
                ...response.data.translation,
                ...(!response.data.contextResults?.results
                    ? []
                    : response.data.contextResults.results.map(
                          (e) => e.translation
                      )),
            ].filter(Boolean),
            detected_language: response.data.languageDetection.detectedLanguage,
            voice:
                voices[target] && response.data.translation[0].length <= 150
                    ? `${this.VOICE_URL}voiceName=${voices[target]}?inputText=${translationEncoded}`
                    : null,
        }

        if (response.data.contextResults?.results) {
            const { sourceExamples, targetExamples } =
                response.data.contextResults.results[0]

            const matchContextPhrases = (el) => {
                return [...el.matchAll(/<em>(.*?)<\/em>/g)].map((e) => ({
                    phrase: e[1],
                    offset: e.index,
                    length: e[1].length,
                }))
            }

            const contextExamples = sourceExamples.map((e, i) => {
                const sourcePhrases = matchContextPhrases(e)
                const targetPhrases = matchContextPhrases(targetExamples[i])

                return {
                    id: i,
                    source: e.replace(/<[^>]*>/gi, ''),
                    target: targetExamples[i].replace(/<[^>]*>/gi, ''),
                    source_phrases: sourcePhrases ?? [],
                    target_phrases: targetPhrases ?? [],
                }
            })

            result.context = {
                examples: contextExamples,
                rude: response.data.contextResults.results[0].rude,
            }
        }

        if (cb) cb(null, result)

        return result
    }

    async getConjugation(text, source = SupportedLanguages.ENGLISH, cb = null) {
        source = source.toLowerCase()

        if (cb && typeof cb !== 'function') {
            return {
                ok: false,
                message:
                    'getConjugation: cb parameter must be type of function',
            }
        }

        if (!available.conjugation.find((e) => e === source)) {
            const error = {
                ok: false,
                message:
                    'getConjugation: invalid language passed to the method',
            }

            if (cb) cb(error)

            return error
        }

        const response = await this.#request({
            method: 'GET',
            url:
                this.CONJUGATION_URL +
                source +
                '-verb-' +
                encodeURIComponent(text) +
                '.html',
        })
        if (!response.success) return this.#handleError(response.error, cb)

        const $ = load(response.data)

        const verbForms = []

        $('div[class="blue-box-wrap"]').each((i, e) => {
            const header = $(e).attr('mobile-title').trim()
            const data = []

            $(e)
                .find(
                    `i[class="verbtxt${
                        [
                            SupportedLanguages.RUSSIAN,
                            SupportedLanguages.HEBREW,
                        ].includes(source)
                            ? '-term'
                            : ''
                    }"]`
                )
                .each((j, word) => {
                    if (!$(word).parents('.transliteration').attr('class')) {
                        data.push($(word).text())
                    }
                })

            verbForms.push({
                id: i,
                conjugation: header,
                verbs: [...new Set(data)],
            })
        })

        const infinitive = $('#ch_lblVerb').text()

        const result = {
            ok: true,
            infinitive: infinitive,
            verbForms,
        }

        if (cb) cb(null, result)

        return result
    }

    /**
     * @param config
     * @returns {Promise<any>}
     */
    async #request(config) {
        try {
            const { data } = await axios({
                insecureHTTPParser: this.insecureHTTPParser,
                ...config,
            })

            return { success: true, data }
        } catch (error) {
            return { success: false, error }
        }
    }

    /**
     * @param error
     * @param cb
     * @returns {{ok: boolean, message}}
     */
    #handleError(error, cb) {
        error = {
            ok: false,
            message: error.message || 'An error occurred',
        }

        if (cb) cb(error)
        return error
    }
}
