const wiki = require('wikijs').default;
const sentenceBoundaryDetection = require('sbd');

async function robot(content) {
    await fetchContentFromWikipedia(content);
    breakContentIntoSentences(content);

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
}

module.exports = robot;