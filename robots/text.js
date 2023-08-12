const wiki = require('wikijs').default;
const sentenceBoundaryDetection = require('sbd');
const watsonNLUApiKey = require('../credentials/watson-nlu.json').apikey;
const NaturalLanguageUnderstandingV1 = require('ibm-watson/natural-language-understanding/v1');
const { IamAuthenticator } = require('ibm-watson/auth');
const state = require('./state.js');

const nlu = new NaturalLanguageUnderstandingV1({
  authenticator: new IamAuthenticator({ apikey: watsonNLUApiKey }),
  version: '2018-04-05',
  serviceUrl: 'https://api.us-south.natural-language-understanding.watson.cloud.ibm.com'
});



async function robot() {
    const content = state.load();

    await fetchContentFromWikipedia(content);
    breakContentIntoSentences(content);
    limitMaximumSentences(content);
    await fetchKeywordsOfAllSentences(content);

    state.save(content);

    async function fetchContentFromWikipedia(content) {
        const wikiepediaContent = await wiki().page(content.searchTerm)
            .then(page => page.summary())
        const withoutDatesInParentheses = removeDatesInParentheses(wikiepediaContent);

        content.sourceContentOriginal = wikiepediaContent;
        content.sourceContentSanitized = withoutDatesInParentheses;
    }

    function removeDatesInParentheses(text) {
        return text.replace(/\((?:\([^()]*\)|[^()])*\)/gm, '').replace(/  /g, ' ');
    }

    function breakContentIntoSentences(content) {
        content.sentences = [];

        const sentences = sentenceBoundaryDetection.sentences(content.sourceContentSanitized);
        
        sentences.forEach(sentence => {
            content.sentences.push({
                text: sentence,
                keywords: [],
                images: []
            })
        });
    }

    function limitMaximumSentences(content) {
        content.sentences = content.sentences.slice(0, content.maximumSentences);
    }

    async function fetchWatsonAndReturnKeywords(sentence) {
        return new Promise((resolve, reject) => {
            nlu.analyze({
                text: sentence,
                features: {
                    keywords: {}
                }
            })
            .then(response => {
                const keywords = response.result.keywords.map((keyword) => {
                    return keyword.text;
                });

                resolve(keywords);
            }); 
        })
    }

    async function fetchKeywordsOfAllSentences(content) {
        for (const sentence of content.sentences) {
            sentence.keywords = await fetchWatsonAndReturnKeywords(sentence.text);
        }
    }
} 

module.exports = robot;