const Reverso = require('../src/reverso.js');

async function main() {
  const reverso = new Reverso();

  try {

    await new Promise((resolve, reject) => {
        reverso.getContext('test', 'english', 'german', (err, response) => {
          if (err) return reject(err);
          console.log(response);
          resolve();
        });
      });

    await new Promise((resolve, reject) => {
      reverso.getContextByTranslation('test', 'testen', 'english', 'german', (err, response) => {
        if (err) return reject(err);
        console.log(response);
        resolve();
      });
    });
      
    await new Promise((resolve, reject) => {
      reverso.getContext('meet me halfway', 'english', 'russian', (err, response) => {
        if (err) return reject(err);
        console.log(response);
        resolve();
      });
    });

    await new Promise((resolve, reject) => {
      reverso.getSpellCheck('helo', 'english', (err, response) => {
        if (err) return reject(err);
        console.log(response);
        resolve();
      });
    });

    await new Promise((resolve, reject) => {
      reverso.getSynonyms('dzień dobry', 'polish', (err, response) => {
        if (err) return reject(err);
        console.log(response);
        resolve();
      });
    });

    await new Promise((resolve, reject) => {
      reverso.getTranslation('how is going?', 'english', 'chinese', (err, response) => {
        if (err) return reject(err);
        console.log(response);
        resolve();
      });
    });

    await new Promise((resolve, reject) => {
      reverso.getConjugation('aller', 'french', (err, response) => {
        if (err) return reject(err);
        console.log(response);
        resolve();
      });
    });

    const reversoInsecureHTTPParser = new Reverso({ insecureHTTPParser: true });
    await new Promise((resolve, reject) => {
      reversoInsecureHTTPParser.getContext('see you later', 'english', 'dutch', (err, response) => {
        if (err) return reject(err);
        console.log(response);
        resolve();
      });
    });

  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Invoke the main function
main();
